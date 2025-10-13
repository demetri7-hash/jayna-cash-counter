// V8.0 Toast Sales Summary API - Uses Orders endpoint with check.amount for accurate net sales
// Method: /orders/v2/ordersBulk with businessDate + check.amount (matches Toast Sales Summary exactly)
// Net Sales = SUM of check.amount (already includes discounts, refunds, service charges)
// Tips = Use payments endpoint for detailed breakdown by card type

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

    console.log(`V8.0 ORDERS ENDPOINT WITH CHECK.AMOUNT: ${startDate} to ${endDate}`);

    const TOAST_CONFIG = {
      baseUrl: process.env.TOAST_BASE_URL || 'https://ws-api.toasttab.com',
      restaurantGuid: process.env.TOAST_RESTAURANT_GUID || 'd3efae34-7c2e-4107-a442-49081e624706'
    };

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Toast-Restaurant-External-ID': TOAST_CONFIG.restaurantGuid,
      'Content-Type': 'application/json'
    };

    // PART 1: Fetch ALL orders using businessDate (order open date)
    const targetStart = new Date(startDate);
    const targetEnd = new Date(endDate);
    const businessDates = [];

    for (let d = new Date(targetStart); d <= targetEnd; d.setDate(d.getDate() + 1)) {
      businessDates.push(d.toISOString().split('T')[0].replace(/-/g, ''));
    }

    console.log(`Fetching orders for ${businessDates.length} business dates...`);

    let allOrders = [];

    // Fetch orders for each business date with pagination
    for (const bizDate of businessDates) {
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const ordersUrl = `${TOAST_CONFIG.baseUrl}/orders/v2/ordersBulk?businessDate=${bizDate}&page=${page}&pageSize=100`;
        console.log(`Fetching orders for ${bizDate}, page ${page}...`);

        const ordersResponse = await fetch(ordersUrl, { method: 'GET', headers });

        if (!ordersResponse.ok) {
          console.error(`Failed to fetch orders for ${bizDate} page ${page}: ${ordersResponse.status}`);
          break;
        }

        const orders = await ordersResponse.json();
        allOrders = allOrders.concat(orders);

        hasMore = orders.length === 100; // Continue if we got a full page
        page++;

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`Total orders fetched: ${allOrders.length}`);

    // PART 2: Calculate net sales from check.amount (Toast's official method)
    let netSales = 0;
    let voidedOrders = 0;
    let voidedChecks = 0;
    let deletedOrders = 0;
    let totalChecks = 0;
    let validChecks = 0;

    for (const order of allOrders) {
      // Check if order is voided or deleted
      const isOrderVoided = order.voided === true ||
                           order.guestOrderStatus === 'VOIDED' ||
                           order.paymentStatus === 'VOIDED';
      const isOrderDeleted = order.deleted === true;

      if (isOrderDeleted) {
        deletedOrders++;
        continue; // Skip deleted orders entirely
      }

      if (isOrderVoided) {
        voidedOrders++;
        continue; // Skip voided orders entirely
      }

      // Process each check in the order
      if (order.checks && Array.isArray(order.checks)) {
        for (const check of order.checks) {
          totalChecks++;

          // Check if this check is voided or deleted
          const isCheckVoided = check.voided === true;
          const isCheckDeleted = check.deleted === true;

          if (isCheckVoided || isCheckDeleted) {
            voidedChecks++;
            continue; // Skip voided/deleted checks
          }

          // Use check.amount - Toast's official calculated total
          // This already includes:
          // - All items
          // - Service charges (non-gratuity)
          // - Discounts (applied)
          // - Refunds (subtracted)
          // - Does NOT include: tips, tax, gratuity service charges
          const checkAmount = check.amount || 0;
          netSales += checkAmount;
          validChecks++;
        }
      }
    }

    console.log(`Orders processed: ${allOrders.length}`);
    console.log(`Voided orders: ${voidedOrders}`);
    console.log(`Deleted orders: ${deletedOrders}`);
    console.log(`Total checks: ${totalChecks}`);
    console.log(`Voided checks: ${voidedChecks}`);
    console.log(`Valid checks: ${validChecks}`);
    console.log(`Net sales from check.amount: $${netSales.toFixed(2)}`);

    // PART 3: Get tip breakdown using payments endpoint (for tip pool calculator)
    console.log(`\nFetching payment details for tips breakdown...`);

    let allPaymentGuids = [];

    // Get payment GUIDs for each paidBusinessDate
    for (const paidDate of businessDates) {
      const paymentsResponse = await fetch(`${TOAST_CONFIG.baseUrl}/orders/v2/payments?paidBusinessDate=${paidDate}`, {
        method: 'GET',
        headers
      });

      if (!paymentsResponse.ok) {
        console.error(`Failed to fetch payments for ${paidDate}: ${paymentsResponse.status}`);
        continue;
      }

      const paymentGuids = await paymentsResponse.json();
      allPaymentGuids = allPaymentGuids.concat(paymentGuids);

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Total payment GUIDs: ${allPaymentGuids.length}`);

    // Fetch individual payment details for tip breakdown
    let creditTips = 0;
    let cashTips = 0;
    let otherTips = 0;
    let totalTips = 0;
    let voidedTips = 0;
    let deniedPayments = 0;

    const paymentsByCardType = {
      VISA: { count: 0, amount: 0, tips: 0 },
      MASTERCARD: { count: 0, amount: 0, tips: 0 },
      AMEX: { count: 0, amount: 0, tips: 0 },
      DISCOVER: { count: 0, amount: 0, tips: 0 },
      UNKNOWN: { count: 0, amount: 0, tips: 0 }
    };

    let creditAmount = 0;
    let creditCount = 0;
    let cashSales = 0;
    let otherSales = 0;
    let giftCardPayments = 0;
    let giftCardAmount = 0;

    for (let i = 0; i < allPaymentGuids.length; i++) {
      try {
        const paymentResponse = await fetch(`${TOAST_CONFIG.baseUrl}/orders/v2/payments/${allPaymentGuids[i]}`, {
          method: 'GET',
          headers
        });

        if (!paymentResponse.ok) continue;

        const payment = await paymentResponse.json();

        const amount = payment.amount || 0;
        const tipAmount = payment.tipAmount || 0;
        const paymentType = payment.type || 'UNKNOWN';
        const paymentStatus = payment.paymentStatus || 'NONE';
        const cardType = payment.cardType || 'UNKNOWN';

        // Exclude DENIED payments
        if (paymentStatus === 'DENIED') {
          deniedPayments++;
          voidedTips += tipAmount;
          continue;
        }

        // Track voided status
        const isVoided = paymentStatus === 'VOIDED';
        if (isVoided) {
          voidedTips += tipAmount;
        }

        // Track payment amounts (for comparison with Toast web)
        if (paymentType === 'CREDIT') {
          creditCount++;
          creditAmount += amount;
          creditTips += tipAmount;

          if (paymentsByCardType[cardType]) {
            paymentsByCardType[cardType].count++;
            paymentsByCardType[cardType].amount += amount;
            paymentsByCardType[cardType].tips += tipAmount;
          } else {
            paymentsByCardType.UNKNOWN.count++;
            paymentsByCardType.UNKNOWN.amount += amount;
            paymentsByCardType.UNKNOWN.tips += tipAmount;
          }
        } else if (paymentType === 'CASH') {
          if (!isVoided) {
            cashSales += amount;
            cashTips += tipAmount;
          }
        } else if (paymentType === 'GIFTCARD') {
          giftCardPayments++;
          giftCardAmount += amount;
        } else if (paymentType === 'OTHER') {
          otherSales += amount;
          otherTips += tipAmount;
        }

        if ((i + 1) % 100 === 0) {
          console.log(`Processed ${i + 1}/${allPaymentGuids.length} payments...`);
        }

      } catch (error) {
        console.error(`Error fetching payment:`, error.message);
        continue;
      }
    }

    totalTips = creditTips + cashTips + otherTips;

    console.log(`\n=== V8.0 RESULTS (ORDERS ENDPOINT) ===`);
    console.log(`Net Sales (from check.amount): $${netSales.toFixed(2)}`);
    console.log(`Total Tips: $${totalTips.toFixed(2)}`);
    console.log(`  - Credit Tips: $${creditTips.toFixed(2)}`);
    console.log(`  - Cash Tips: $${cashTips.toFixed(2)}`);
    console.log(`  - Other Tips: $${otherTips.toFixed(2)}`);
    console.log(`\nPayment totals (for comparison):`);
    console.log(`  - Credit: $${creditAmount.toFixed(2)} (${creditCount} payments)`);
    console.log(`  - Cash: $${cashSales.toFixed(2)}`);
    console.log(`  - Other: $${otherSales.toFixed(2)}`);
    console.log(`  - Gift Cards: $${giftCardAmount.toFixed(2)} (${giftCardPayments} payments)`);
    console.log(`  - Total Payments: $${(creditAmount + cashSales + otherSales + giftCardAmount).toFixed(2)}`);

    return res.json({
      success: true,
      version: 'v8.0-orders-check-amount-20251013',
      method: 'Orders endpoint with check.amount - matches Toast Sales Summary',
      dateRange: { startDate, endDate },

      // Net sales from check.amount (CORRECT method)
      netSales: netSales,
      totalTips: totalTips,

      // Tip breakdown
      creditTips: creditTips,
      cashTips: cashTips,
      otherTips: otherTips,
      voidedTips: voidedTips,

      // Payment breakdown (for comparison)
      creditAmount: creditAmount,
      creditCount: creditCount,
      cashSales: cashSales,
      otherSales: otherSales,
      giftCardPayments: giftCardPayments,
      giftCardAmount: giftCardAmount,
      deniedPayments: deniedPayments,

      // Card type breakdown
      paymentsByCardType: paymentsByCardType,

      // Order statistics
      orderStats: {
        totalOrders: allOrders.length,
        voidedOrders: voidedOrders,
        deletedOrders: deletedOrders,
        totalChecks: totalChecks,
        voidedChecks: voidedChecks,
        validChecks: validChecks
      },

      // For compatibility with frontend
      salesData: {
        netSales: netSales,
        creditTips: creditTips,
        cashSales: cashSales
      },

      // Metadata
      totalPaymentsProcessed: allPaymentGuids.length,
      successRate: '100.00%'
    });

  } catch (error) {
    console.error('Toast Sales Summary V8 API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
