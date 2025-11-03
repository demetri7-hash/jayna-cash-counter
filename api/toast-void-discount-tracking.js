/**
 * Toast Void & Discount Tracking API
 * Fetches voided orders, discounts, refunds, and voided payments for current week (Monday-Sunday)
 * Returns data with Pacific time formatting
 */

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { startDate, endDate, token } = req.query;

    if (!startDate || !endDate || !token) {
      return res.status(400).json({
        error: 'Missing required parameters: startDate, endDate, and token'
      });
    }

    console.log(`📊 Void/Discount Tracking: ${startDate} to ${endDate} (Monday-Sunday week)`);

    const TOAST_CONFIG = {
      baseUrl: process.env.TOAST_BASE_URL || 'https://ws-api.toasttab.com',
      restaurantGuid: process.env.TOAST_RESTAURANT_GUID || 'd3efae34-7c2e-4107-a442-49081e624706'
    };

    // Build list of business dates to fetch
    const businessDates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      businessDates.push(d.toISOString().split('T')[0].replace(/-/g, ''));
    }

    console.log(`Fetching ${businessDates.length} business dates...`);

    // Arrays to collect data
    const voidedOrders = [];
    const discounts = [];
    const refunds = [];
    const voidedPayments = [];

    // Fetch employee list for server name mapping
    const employeesUrl = `${TOAST_CONFIG.baseUrl}/labor/v1/employees?restaurantGuid=${TOAST_CONFIG.restaurantGuid}`;
    const employeesResponse = await fetch(employeesUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const employeeMap = {};
    if (employeesResponse.ok) {
      const employees = await employeesResponse.json();
      employees.forEach(emp => {
        employeeMap[emp.guid] = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
      });
      console.log(`✅ Loaded ${employees.length} employees`);
    }

    // Fetch orders for each business date
    for (const businessDate of businessDates) {
      console.log(`Fetching orders for ${businessDate}...`);

      let page = 1;
      let hasMorePages = true;
      const pageSize = 100;

      while (hasMorePages) {
        const ordersUrl = `${TOAST_CONFIG.baseUrl}/orders/v2/ordersBulk?businessDate=${businessDate}&page=${page}&pageSize=${pageSize}`;

        const ordersResponse = await fetch(ordersUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Toast-Restaurant-External-ID': TOAST_CONFIG.restaurantGuid,
            'Content-Type': 'application/json'
          }
        });

        if (!ordersResponse.ok) {
          console.error(`Failed to fetch orders for ${businessDate}, page ${page}: ${ordersResponse.status}`);
          break;
        }

        const pageOrders = await ordersResponse.json();

        if (Array.isArray(pageOrders) && pageOrders.length > 0) {
          // Process each order
          pageOrders.forEach(order => {
            const serverName = employeeMap[order.server?.guid] || 'Unknown';
            const orderDate = order.openedDate ? new Date(order.openedDate) : null;
            const orderTime = orderDate ? orderDate.toLocaleString('en-US', {
              timeZone: 'America/Los_Angeles',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }) : 'N/A';
            const displayDate = orderDate ? orderDate.toLocaleString('en-US', {
              timeZone: 'America/Los_Angeles',
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            }) : 'N/A';

            // 1. VOIDED ORDERS
            if (order.voided === true || order.deleted === true) {
              const voidReason = order.voidReason?.guid ? 'Voided' : (order.deleted ? 'Deleted' : 'Unknown');

              // Calculate total amount from checks
              let totalAmount = 0;
              const allItems = [];
              if (order.checks && Array.isArray(order.checks)) {
                totalAmount = order.checks.reduce((sum, check) => sum + (check.amount || 0), 0);

                // Collect all items from all checks
                order.checks.forEach(check => {
                  if (check.selections && Array.isArray(check.selections)) {
                    check.selections.forEach(sel => {
                      allItems.push({
                        name: sel.itemDisplayName || sel.item?.name || 'Unknown Item',
                        quantity: sel.quantity || 1,
                        price: sel.price || 0
                      });
                    });
                  }
                });
              }

              voidedOrders.push({
                date: displayDate,
                time: orderTime,
                orderNumber: order.orderNumber || 'N/A',
                orderGuid: order.guid || 'N/A',
                server: serverName,
                tabName: order.checks?.[0]?.tabName || 'N/A',
                reason: voidReason,
                amount: totalAmount,
                diningOption: order.diningOption?.behavior || 'N/A',
                items: allItems,
                openedDate: order.openedDate || null,
                closedDate: order.closedDate || null,
                voidedBy: order.voidedBy || null,
                businessDate: order.businessDate,
                timestamp: orderDate ? orderDate.getTime() : 0
              });
            }

            // 2. DISCOUNTS (check-level and item-level)
            if (order.checks && Array.isArray(order.checks)) {
              order.checks.forEach(check => {
                const tabName = check.tabName || 'N/A';

                // Check-level discounts
                if (check.appliedDiscounts && Array.isArray(check.appliedDiscounts)) {
                  check.appliedDiscounts.forEach(discount => {
                    const discountName = discount.name || 'Unknown Discount';

                    // FILTER: Exclude "REWARD DOLLARS" and "ONLINE ORDER" discounts
                    if (discountName === 'REWARD DOLLARS' || discountName === 'ONLINE ORDER') {
                      return; // Skip this discount
                    }

                    discounts.push({
                      date: displayDate,
                      time: orderTime,
                      orderNumber: order.orderNumber || 'N/A',
                      orderGuid: order.guid || 'N/A',
                      server: serverName,
                      tabName: tabName,
                      discountName: discountName,
                      discountType: discount.type || 'N/A',
                      amount: discount.discountAmount || 0,
                      level: 'Check',
                      diningOption: order.diningOption?.behavior || 'N/A',
                      checkAmount: check.amount || 0,
                      approvedBy: discount.approvalUser || null,
                      businessDate: order.businessDate,
                      timestamp: orderDate ? orderDate.getTime() : 0
                    });
                  });
                }

                // Item-level discounts
                if (check.selections && Array.isArray(check.selections)) {
                  check.selections.forEach(selection => {
                    if (selection.appliedDiscounts && Array.isArray(selection.appliedDiscounts)) {
                      selection.appliedDiscounts.forEach(discount => {
                        const discountName = discount.name || 'Unknown Discount';

                        // FILTER: Exclude "REWARD DOLLARS" and "ONLINE ORDER" discounts
                        if (discountName === 'REWARD DOLLARS' || discountName === 'ONLINE ORDER') {
                          return; // Skip this discount
                        }

                        discounts.push({
                          date: displayDate,
                          time: orderTime,
                          orderNumber: order.orderNumber || 'N/A',
                          orderGuid: order.guid || 'N/A',
                          server: serverName,
                          tabName: tabName,
                          discountName: discountName,
                          discountType: discount.type || 'N/A',
                          amount: discount.discountAmount || 0,
                          level: 'Item',
                          itemName: selection.itemDisplayName || 'Unknown Item',
                          itemPrice: selection.price || 0,
                          itemQuantity: selection.quantity || 1,
                          diningOption: order.diningOption?.behavior || 'N/A',
                          checkAmount: check.amount || 0,
                          approvedBy: discount.approvalUser || null,
                          businessDate: order.businessDate,
                          timestamp: orderDate ? orderDate.getTime() : 0
                        });
                      });
                    }
                  });
                }

                // 3. REFUNDS & 4. VOIDED PAYMENTS
                if (check.payments && Array.isArray(check.payments)) {
                  check.payments.forEach(payment => {
                    // REFUNDS (Full or Partial)
                    if (payment.refundStatus === 'FULL' || payment.refundStatus === 'PARTIAL') {
                      const refundAmount = payment.refund?.refundAmount || payment.amount || 0;
                      const refundType = payment.refundStatus === 'FULL' ? 'Full Refund' : 'Partial Refund';

                      refunds.push({
                        date: displayDate,
                        time: orderTime,
                        orderNumber: order.orderNumber || 'N/A',
                        orderGuid: order.guid || 'N/A',
                        server: serverName,
                        tabName: tabName,
                        refundAmount: refundAmount,
                        originalAmount: payment.amount || 0,
                        refundType: refundType,
                        paymentType: payment.type || 'N/A',
                        cardType: payment.cardType || 'N/A',
                        tipAmount: payment.tipAmount || 0,
                        reason: payment.refund?.reason || 'No reason provided',
                        diningOption: order.diningOption?.behavior || 'N/A',
                        checkAmount: check.amount || 0,
                        refundDate: payment.refund?.refundDate || null,
                        businessDate: order.businessDate,
                        timestamp: orderDate ? orderDate.getTime() : 0
                      });
                    }

                    // VOIDED PAYMENTS
                    if (payment.voided === true || payment.paymentStatus === 'VOIDED') {
                      voidedPayments.push({
                        date: displayDate,
                        time: orderTime,
                        orderNumber: order.orderNumber || 'N/A',
                        orderGuid: order.guid || 'N/A',
                        server: serverName,
                        tabName: tabName,
                        paymentType: payment.type || 'N/A',
                        amount: payment.amount || 0,
                        tipAmount: payment.tipAmount || 0,
                        cardType: payment.cardType || 'N/A',
                        diningOption: order.diningOption?.behavior || 'N/A',
                        checkAmount: check.amount || 0,
                        voidDate: payment.voidDate || null,
                        businessDate: order.businessDate,
                        timestamp: orderDate ? orderDate.getTime() : 0
                      });
                    }
                  });
                }
              });
            }
          });

          console.log(`${businessDate} Page ${page}: ${pageOrders.length} orders`);

          if (pageOrders.length === pageSize) {
            page++;
            await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
          } else {
            hasMorePages = false;
          }
        } else {
          hasMorePages = false;
        }

        if (page > 50) {
          console.warn(`Max pages reached for ${businessDate}`);
          hasMorePages = false;
        }
      }
    }

    // Sort all arrays by timestamp (newest first)
    voidedOrders.sort((a, b) => b.timestamp - a.timestamp);
    discounts.sort((a, b) => b.timestamp - a.timestamp);
    refunds.sort((a, b) => b.timestamp - a.timestamp);
    voidedPayments.sort((a, b) => b.timestamp - a.timestamp);

    // Calculate totals
    const totalVoidedAmount = voidedOrders.reduce((sum, v) => sum + v.amount, 0);
    const totalDiscountAmount = discounts.reduce((sum, d) => sum + d.amount, 0);
    const totalRefundAmount = refunds.reduce((sum, r) => sum + r.refundAmount, 0);
    const totalVoidedPaymentAmount = voidedPayments.reduce((sum, p) => sum + p.amount, 0);

    console.log(`\n=== VOID/DISCOUNT TRACKING RESULTS ===`);
    console.log(`Voided Orders: ${voidedOrders.length} ($${totalVoidedAmount.toFixed(2)})`);
    console.log(`Discounts: ${discounts.length} ($${totalDiscountAmount.toFixed(2)})`);
    console.log(`Refunds: ${refunds.length} ($${totalRefundAmount.toFixed(2)})`);
    console.log(`Voided Payments: ${voidedPayments.length} ($${totalVoidedPaymentAmount.toFixed(2)})`);

    return res.json({
      success: true,
      dateRange: { startDate, endDate },
      voidedOrders: {
        count: voidedOrders.length,
        total: totalVoidedAmount,
        items: voidedOrders
      },
      discounts: {
        count: discounts.length,
        total: totalDiscountAmount,
        items: discounts
      },
      refunds: {
        count: refunds.length,
        total: totalRefundAmount,
        items: refunds
      },
      voidedPayments: {
        count: voidedPayments.length,
        total: totalVoidedPaymentAmount,
        items: voidedPayments
      }
    });

  } catch (error) {
    console.error('Void/Discount Tracking API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
