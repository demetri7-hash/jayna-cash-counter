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

    // Process each business date using Payments API (Toast's official recommendation)
    // Per Toast docs: "Poll the /payments endpoint using paidBusinessDate. Sum the tipAmount values."
    for (const businessDate of businessDates) {
      try {
        console.log(`Fetching payments for ${businessDate}...`);

        // Get payment GUIDs for this business date
        const paymentsListUrl = `${toastApiUrl}/orders/v2/payments?paidBusinessDate=${businessDate}`;

        const paymentsListResponse = await fetch(paymentsListUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Toast-Restaurant-External-ID': restaurantId,
            'Content-Type': 'application/json'
          }
        });

        if (!paymentsListResponse.ok) {
          console.error(`Failed to fetch payment list for ${businessDate}: ${paymentsListResponse.status}`);
          continue;
        }

        const paymentGuids = await paymentsListResponse.json();
        console.log(`${businessDate}: Found ${paymentGuids.length} payment GUIDs`);

        // Fetch individual payment details and sum tips
        for (const paymentGuid of paymentGuids) {
          try {
            const paymentDetailUrl = `${toastApiUrl}/orders/v2/payments/${paymentGuid}`;

            const paymentDetailResponse = await fetch(paymentDetailUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Toast-Restaurant-External-ID': restaurantId,
                'Content-Type': 'application/json'
              }
            });

            if (!paymentDetailResponse.ok) {
              console.error(`Failed to fetch payment ${paymentGuid}`);
              continue;
            }

            const payment = await paymentDetailResponse.json();

            // Skip voided/refunded payments
            if (payment.paymentStatus === 'VOIDED' || payment.refundStatus === 'REFUNDED') {
              continue;
            }

            totalOrdersProcessed++;

            const tipAmount = payment.tipAmount || 0;
            const amount = payment.amount || 0;

            // Net sales = sum of all payment amounts (including tips)
            totalNetSales += amount + tipAmount;

            // Categorize by payment type
            if (payment.type === 'CASH') {
              totalCashSales += amount;
              // Cash tips are NOT counted here - they go in the envelope
            } else {
              // All non-cash payment tips (credit, debit, gift cards, etc.)
              // Per Toast docs: "Sum the tipAmount values on each payment"
              totalCreditTips += tipAmount;
            }

          } catch (paymentError) {
            console.error(`Error processing payment ${paymentGuid}:`, paymentError.message);
          }

          // Small delay every 10 payments to avoid rate limits
          if (totalOrdersProcessed % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }

      } catch (dateError) {
        console.error(`Error processing date ${businessDate}:`, dateError.message);
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
