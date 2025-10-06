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

    // Process each business date
    for (const businessDate of businessDates) {
      try {
        // Get payment GUIDs for this business date
        const paymentsUrl = `${toastApiUrl}/orders/v2/payments?paidBusinessDate=${businessDate}`;

        const paymentsResponse = await fetch(paymentsUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Toast-Restaurant-External-ID': restaurantId,
            'Content-Type': 'application/json'
          }
        });

        if (!paymentsResponse.ok) {
          console.error(`Failed to fetch payments for ${businessDate}: ${paymentsResponse.status}`);
          continue;
        }

        const paymentGuids = await paymentsResponse.json();
        console.log(`${businessDate}: Found ${paymentGuids.length} payment GUIDs`);

        // Fetch individual payment details
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
              console.error(`Failed to fetch payment detail ${paymentGuid}`);
              continue;
            }

            const paymentDetail = await paymentDetailResponse.json();

            // Skip voided payments
            if (paymentDetail.paymentStatus === 'VOIDED') {
              continue;
            }

            const amount = paymentDetail.amount || 0;
            const tipAmount = paymentDetail.tipAmount || 0;

            // Categorize by payment type
            if (paymentDetail.type === 'CASH') {
              totalCashSales += amount; // Cash sales (not including cash tips)
            } else if (paymentDetail.type === 'CREDIT' || paymentDetail.type === 'CREDIT_CARD') {
              totalCreditTips += tipAmount; // Credit card tips
            }

            // Add to net sales (all payment amounts)
            totalNetSales += amount + tipAmount;

          } catch (paymentError) {
            console.error(`Error processing payment ${paymentGuid}:`, paymentError.message);
          }
        }

        // Small delay to avoid rate limits
        if (businessDates.indexOf(businessDate) % 3 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (dateError) {
        console.error(`Error processing date ${businessDate}:`, dateError.message);
      }
    }

    console.log(`Sales Summary Complete:`);
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
      businessDatesProcessed: businessDates.length
    });

  } catch (error) {
    console.error('Toast sales summary API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
