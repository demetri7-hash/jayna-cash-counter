export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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

    const restaurantId = process.env.TOAST_RESTAURANT_GUID || 'd3efae34-7c2e-4107-a442-49081e624706';
    const toastApiUrl = process.env.TOAST_BASE_URL || 'https://ws-api.toasttab.com';

    console.log(`Fetching sales summary for ${startDate} to ${endDate}`);

    // Parse dates to get business date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const businessDates = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      businessDates.push(d.toISOString().split('T')[0]);
    }

    console.log(`Processing ${businessDates.length} business dates`);

    let totalNetSales = 0;
    let totalCreditTips = 0;
    let totalCashSales = 0;
    let totalOrdersProcessed = 0;

    // Process each business date using Orders API (more reliable than Payments API)
    for (const dateStr of businessDates) {
      try {
        // Format date for Toast API (YYYYMMDD without dashes)
        const businessDate = dateStr.replace(/-/g, '');
        console.log(`Fetching orders for ${businessDate}...`);

        let page = 1;
        let hasMorePages = true;
        const pageSize = 100;

        while (hasMorePages) {
          const ordersUrl = `${toastApiUrl}/orders/v2/ordersBulk?businessDate=${businessDate}&page=${page}&pageSize=${pageSize}`;

          const ordersResponse = await fetch(ordersUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Toast-Restaurant-External-ID': restaurantId,
              'Content-Type': 'application/json'
            }
          });

          if (!ordersResponse.ok) {
            console.error(`Failed to fetch orders for ${businessDate}, page ${page}: ${ordersResponse.status}`);
            break;
          }

          const pageOrders = await ordersResponse.json();

          if (Array.isArray(pageOrders) && pageOrders.length > 0) {
            console.log(`${businessDate} Page ${page}: ${pageOrders.length} orders`);

            // Process each order
            for (const order of pageOrders) {
              // Skip voided orders
              if (order.voided || order.voidDate) {
                continue;
              }

              totalOrdersProcessed++;

              // Get net sales from order total
              const orderTotal = order.totalAmount || 0;
              totalNetSales += orderTotal;

              // Process payments for tips and cash
              if (order.checks && Array.isArray(order.checks)) {
                for (const check of order.checks) {
                  if (check.payments && Array.isArray(check.payments)) {
                    for (const payment of check.payments) {
                      // Skip voided payments
                      if (payment.voidInfo || payment.refundStatus === 'REFUNDED') {
                        continue;
                      }

                      const tipAmount = payment.tipAmount || 0;
                      const amount = payment.amount || 0;

                      // Categorize by payment type
                      if (payment.type === 'CASH') {
                        totalCashSales += amount;
                        // Cash tips are NOT counted here - they go in the envelope
                      } else {
                        // All non-cash payment tips (credit, debit, gift cards, etc.)
                        totalCreditTips += tipAmount;
                      }
                    }
                  }
                }
              }
            }

            page++;

            // If less than pageSize, we're done
            if (pageOrders.length < pageSize) {
              hasMorePages = false;
            }
          } else {
            hasMorePages = false;
          }

          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (dateError) {
        console.error(`Error processing date ${dateStr}:`, dateError.message);
      }
    }

    console.log(`Sales Summary Complete:`);
    console.log(`- Orders Processed: ${totalOrdersProcessed}`);
    console.log(`- Net Sales: $${totalNetSales.toFixed(2)}`);
    console.log(`- Credit Tips: $${totalCreditTips.toFixed(2)}`);
    console.log(`- Cash Sales: $${totalCashSales.toFixed(2)}`);

    return res.json({
      success: true,
      dateRange: {
        start: startDate,
        end: endDate
      },
      netSales: totalNetSales,
      creditTips: totalCreditTips,
      cashSales: totalCashSales,
      businessDatesProcessed: businessDates.length,
      ordersProcessed: totalOrdersProcessed
    });

  } catch (error) {
    console.error('Toast sales summary API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
