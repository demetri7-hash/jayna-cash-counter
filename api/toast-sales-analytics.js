// Toast Sales Analytics API - Uses OFFICIAL Toast methods for 100% accuracy
// Method: Analytics API for net sales + Payments endpoint for tips

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://jayna-cash-counter.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { accessToken, startDate, endDate } = req.body;

    if (!accessToken || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Access token, start date, and end date are required'
      });
    }

    console.log(`ANALYTICS APPROACH: ${startDate} to ${endDate}`);

    const TOAST_CONFIG = {
      baseUrl: process.env.TOAST_BASE_URL || 'https://ws-api.toasttab.com',
      restaurantGuid: process.env.TOAST_RESTAURANT_GUID || 'd3efae34-7c2e-4107-a442-49081e624706'
    };

    // STEP 1: Get NET SALES from Analytics API (Toast's pre-calculated values)
    console.log('Step 1: Requesting aggregated sales data from Analytics API...');

    const analyticsRequestBody = {
      restaurantGuids: [TOAST_CONFIG.restaurantGuid],
      startDate: startDate,
      endDate: endDate
    };

    const createReportResponse = await fetch(`${TOAST_CONFIG.baseUrl}/era/v1/metrics`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(analyticsRequestBody)
    });

    if (!createReportResponse.ok) {
      const errorText = await createReportResponse.text();
      console.error('Analytics report creation failed:', createReportResponse.status, errorText);
      return res.status(createReportResponse.status).json({
        success: false,
        error: `Analytics API failed: ${createReportResponse.status}`,
        details: errorText
      });
    }

    const reportRequest = await createReportResponse.json();
    const reportGuid = reportRequest.reportRequestGuid;
    console.log(`Report GUID created: ${reportGuid}`);

    // Poll for report completion (with timeout)
    let reportData = null;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max wait

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      const getReportResponse = await fetch(`${TOAST_CONFIG.baseUrl}/era/v1/metrics/${reportGuid}?fetchRestaurantNames=true`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (getReportResponse.ok) {
        reportData = await getReportResponse.json();
        if (reportData.reportStatus === 'SUCCESS') {
          console.log('Analytics report ready!');
          break;
        }
      }

      attempts++;
    }

    if (!reportData || reportData.reportStatus !== 'SUCCESS') {
      return res.status(500).json({
        success: false,
        error: 'Analytics report generation timed out or failed'
      });
    }

    // Extract net sales from analytics data
    const analyticsData = reportData.results && reportData.results.length > 0 ? reportData.results[0] : null;
    const netSales = analyticsData?.netSalesAmount || 0;
    const grossSales = analyticsData?.grossSalesAmount || 0;
    const discounts = analyticsData?.discountAmount || 0;
    const refunds = analyticsData?.refundAmount || 0;

    console.log(`Analytics Data - Net Sales: $${netSales}, Gross: $${grossSales}, Discounts: $${discounts}`);

    // STEP 2: Get TIPS from Payments endpoint (documented best practice)
    console.log('Step 2: Fetching payment data for tips...');

    // Generate business dates in YYYYMMDD format
    const start = new Date(startDate);
    const end = new Date(endDate);
    const businessDates = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      businessDates.push(d.toISOString().split('T')[0].replace(/-/g, ''));
    }

    let allPaymentGuids = [];

    // Get payment GUIDs for each business date using paidBusinessDate
    for (const businessDate of businessDates) {
      console.log(`Fetching payments for paidBusinessDate: ${businessDate}`);

      const paymentsResponse = await fetch(`${TOAST_CONFIG.baseUrl}/orders/v2/payments?paidBusinessDate=${businessDate}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Toast-Restaurant-External-ID': TOAST_CONFIG.restaurantGuid,
          'Content-Type': 'application/json'
        }
      });

      if (!paymentsResponse.ok) {
        console.error(`Failed to fetch payments for ${businessDate}: ${paymentsResponse.status}`);
        continue;
      }

      const paymentGuids = await paymentsResponse.json();
      allPaymentGuids = allPaymentGuids.concat(paymentGuids);
      console.log(`Found ${paymentGuids.length} payments for ${businessDate} (Total: ${allPaymentGuids.length})`);

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`Total payment GUIDs to fetch: ${allPaymentGuids.length}`);

    // Fetch individual payment details
    let creditTips = 0;
    let creditAmount = 0;
    let creditCount = 0;
    let cashSales = 0;
    let otherSales = 0;
    let otherTips = 0;
    let voidedTips = 0;
    let deniedPayments = 0;

    const paymentsByCardType = {
      VISA: { count: 0, amount: 0, tips: 0 },
      MASTERCARD: { count: 0, amount: 0, tips: 0 },
      AMEX: { count: 0, amount: 0, tips: 0 },
      DISCOVER: { count: 0, amount: 0, tips: 0 },
      UNKNOWN: { count: 0, amount: 0, tips: 0 }
    };

    for (let i = 0; i < allPaymentGuids.length; i++) {
      const paymentGuid = allPaymentGuids[i];

      try {
        const paymentResponse = await fetch(`${TOAST_CONFIG.baseUrl}/orders/v2/payments/${paymentGuid}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Toast-Restaurant-External-ID': TOAST_CONFIG.restaurantGuid,
            'Content-Type': 'application/json'
          }
        });

        if (!paymentResponse.ok) {
          console.error(`Failed to fetch payment ${paymentGuid}: ${paymentResponse.status}`);
          continue;
        }

        const payment = await paymentResponse.json();

        const amount = payment.amount || 0;
        const tipAmount = payment.tipAmount || 0;
        const paymentType = payment.type || 'UNKNOWN';
        const paymentStatus = payment.paymentStatus || 'NONE';
        const cardType = payment.cardType || 'UNKNOWN';

        // Exclude DENIED and VOIDED payments
        if (paymentStatus === 'DENIED' || paymentStatus === 'VOIDED') {
          voidedTips += tipAmount;
          if (paymentStatus === 'DENIED') deniedPayments++;
          continue;
        }

        // Count by payment type
        if (paymentType === 'CREDIT') {
          creditCount++;
          creditAmount += amount;
          creditTips += tipAmount;

          // Track by card type
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
          cashSales += amount;
        } else if (paymentType === 'OTHER') {
          otherSales += amount;
          otherTips += tipAmount;
        }

        // Rate limiting - pause every 50 payments
        if ((i + 1) % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
          console.log(`Processed ${i + 1}/${allPaymentGuids.length} payments...`);
        }

      } catch (error) {
        console.error(`Error fetching payment ${paymentGuid}:`, error.message);
        continue;
      }
    }

    console.log(`\n=== FINAL RESULTS ===`);
    console.log(`Net Sales (Analytics): $${netSales.toFixed(2)}`);
    console.log(`CREDIT Payments: ${creditCount}, Amount: $${creditAmount.toFixed(2)}, Tips: $${creditTips.toFixed(2)}`);
    console.log(`Card Type Breakdown:`);
    console.log(`  VISA: ${paymentsByCardType.VISA.count} payments, $${paymentsByCardType.VISA.amount.toFixed(2)}, $${paymentsByCardType.VISA.tips.toFixed(2)} tips`);
    console.log(`  MASTERCARD: ${paymentsByCardType.MASTERCARD.count} payments, $${paymentsByCardType.MASTERCARD.amount.toFixed(2)}, $${paymentsByCardType.MASTERCARD.tips.toFixed(2)} tips`);
    console.log(`  AMEX: ${paymentsByCardType.AMEX.count} payments, $${paymentsByCardType.AMEX.amount.toFixed(2)}, $${paymentsByCardType.AMEX.tips.toFixed(2)} tips`);
    console.log(`  DISCOVER: ${paymentsByCardType.DISCOVER.count} payments, $${paymentsByCardType.DISCOVER.amount.toFixed(2)}, $${paymentsByCardType.DISCOVER.tips.toFixed(2)} tips`);
    console.log(`Voided Tips: $${voidedTips.toFixed(2)}, DENIED Payments: ${deniedPayments}`);

    return res.json({
      success: true,
      version: 'v1.0-analytics-plus-payments-20251007',
      method: 'Analytics API for net sales + Payments endpoint for tips',
      dateRange: { startDate, endDate },

      // Net sales from Analytics API (100% accurate)
      netSales: netSales,
      grossSales: grossSales,
      discounts: discounts,
      refunds: refunds,

      // Tips from Payments endpoint (best practice)
      creditTips: creditTips,
      creditAmount: creditAmount,
      creditCount: creditCount,
      cashSales: cashSales,
      otherSales: otherSales,
      otherTips: otherTips,
      voidedTips: voidedTips,
      deniedPayments: deniedPayments,

      // Card type breakdown
      paymentsByCardType: paymentsByCardType,

      // Metadata
      totalPaymentsProcessed: allPaymentGuids.length,
      analyticsData: analyticsData
    });

  } catch (error) {
    console.error('Toast Analytics API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
