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
    let totalCreditTipsGross = 0; // Before voiding
    let totalCashSales = 0;
    let totalOrdersProcessed = 0;
    let totalVoidedTips = 0;

    // Use ordersBulk endpoint (more efficient - gets all payment data in bulk)
    // Toast docs recommend /payments endpoint, but it's too slow (1 API call per payment)
    // ordersBulk gives us all payment data in paginated batches
    for (const dateStr of businessDates) {
      try {
        // Format date for Toast API (YYYYMMDD without dashes)
        const businessDate = dateStr.replace(/-/g, '');
        console.log(`Fetching orders for ${businessDate} (${dateStr})...`);

        let page = 1;
        let hasMorePages = true;
        let retryCount = 0;
        const maxRetries = 3;

        while (hasMorePages) {
          const ordersUrl = `${toastApiUrl}/orders/v2/ordersBulk?businessDate=${businessDate}&page=${page}&pageSize=100`;

          try {
            const ordersResponse = await fetch(ordersUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Toast-Restaurant-External-ID': restaurantId,
                'Content-Type': 'application/json'
              }
            });

            if (!ordersResponse.ok) {
              // If rate limited, retry with exponential backoff
              if (ordersResponse.status === 429 && retryCount < maxRetries) {
                const backoffDelay = 1000 * Math.pow(2, retryCount);
                console.log(`Rate limited on ${businessDate} page ${page}, retrying in ${backoffDelay}ms (attempt ${retryCount + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, backoffDelay));
                retryCount++;
                continue; // Retry same page
              }

              console.error(`Failed to fetch orders for ${businessDate}, page ${page}: ${ordersResponse.status}`);
              break;
            }

            const orders = await ordersResponse.json();
            retryCount = 0; // Reset retry count on success

            if (Array.isArray(orders) && orders.length > 0) {
              console.log(`${businessDate} Page ${page}: ${orders.length} orders (total processed: ${totalOrdersProcessed})`);

              // Process each order (INCLUDING voided orders to get gross tips)
              for (const order of orders) {
                const isVoided = order.voided || order.voidDate;

                if (!isVoided) {
                  totalOrdersProcessed++;
                }

                // Process payments within checks
                if (order.checks && Array.isArray(order.checks)) {
                  for (const check of order.checks) {
                    if (check.payments && Array.isArray(check.payments)) {
                      for (const payment of check.payments) {
                        const tipAmount = payment.tipAmount || 0;
                        const amount = payment.amount || 0;

                        // Check if payment itself is voided
                        const isPaymentVoided = payment.refundStatus === 'FULL' ||
                                               payment.refundStatus === 'PARTIAL' ||
                                               payment.refundStatus === 'REFUNDED' ||
                                               payment.voided ||
                                               payment.paymentStatus === 'VOIDED' ||
                                               payment.voidInfo;

                        // Categorize by payment type (not cash, not delivery platforms)
                        const isCreditCardTip = payment.type !== 'CASH' &&
                                               payment.type !== 'OTHER' &&
                                               payment.type !== 'HOUSE_ACCOUNT' &&
                                               payment.type !== 'UNDECLARED_CASH';

                        // Add payment amount to net sales (excluding tips)
                        if (!isVoided && !isPaymentVoided) {
                          totalNetSales += amount;
                        }

                        // Handle tips separately
                        if (isCreditCardTip && tipAmount > 0) {
                          // Add to gross tips (all tips before voiding)
                          totalCreditTipsGross += tipAmount;

                          // If voided (order or payment level), add to voided total
                          if (isVoided || isPaymentVoided) {
                            totalVoidedTips += tipAmount;
                          } else {
                            // Only add to net tips if NOT voided
                            totalCreditTips += tipAmount;
                          }
                        }

                        // Track cash sales separately
                        if (payment.type === 'CASH' && !isVoided && !isPaymentVoided) {
                          totalCashSales += amount;
                        }
                      }
                    }
                  }
                }
              }

              page++;

              // If less than 100 orders, we're done with this date
              if (orders.length < 100) {
                hasMorePages = false;
              }
            } else {
              hasMorePages = false;
            }

            // Longer delay between pages to avoid rate limits (increased from 100ms to 300ms)
            await new Promise(resolve => setTimeout(resolve, 300));

          } catch (fetchError) {
            console.error(`Error fetching page ${page} for ${businessDate}:`, fetchError.message);
            // Retry logic for network errors
            if (retryCount < maxRetries) {
              const backoffDelay = 1000 * Math.pow(2, retryCount);
              console.log(`Retrying in ${backoffDelay}ms (attempt ${retryCount + 1}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, backoffDelay));
              retryCount++;
              continue;
            }
            break;
          }
        }

        // Delay between dates to further avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (dateError) {
        console.error(`Error processing date ${dateStr}:`, dateError.message);
      }
    }

    console.log(`Sales Summary Complete:`);
    console.log(`- Orders Processed: ${totalOrdersProcessed}`);
    console.log(`- Net Sales: $${totalNetSales.toFixed(2)}`);
    console.log(`- Credit Tips (Gross): $${totalCreditTipsGross.toFixed(2)}`);
    console.log(`- Voided Tips: $${totalVoidedTips.toFixed(2)}`);
    console.log(`- Credit Tips (Net): $${totalCreditTips.toFixed(2)}`);
    console.log(`- Cash Sales: $${totalCashSales.toFixed(2)}`);

    return res.json({
      success: true,
      dateRange: {
        start: startDate,
        end: endDate
      },
      netSales: totalNetSales,
      creditTips: totalCreditTips,
      creditTipsGross: totalCreditTipsGross,
      voidedTips: totalVoidedTips,
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
