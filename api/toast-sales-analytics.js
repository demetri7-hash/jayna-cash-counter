// Toast Sales Analytics API - Uses Payments endpoint for 100% accuracy
// Method: Payments endpoint with businessDate (matches Toast Sales Summary)
// NOTE: Uses businessDate (order fulfillment) NOT paidBusinessDate (payment date)

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://jayna-cash-counter.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Support both POST (body) and GET (query params)
    const accessToken = req.method === 'POST' ? req.body.accessToken : req.query.token;
    const startDate = req.method === 'POST' ? req.body.startDate : req.query.startDate;
    const endDate = req.method === 'POST' ? req.body.endDate : req.query.endDate;

    if (!accessToken || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Access token, start date, and end date are required'
      });
    }

    console.log(`PAYMENTS ENDPOINT APPROACH: ${startDate} to ${endDate}`);

    const TOAST_CONFIG = {
      baseUrl: process.env.TOAST_BASE_URL || 'https://ws-api.toasttab.com',
      restaurantGuid: process.env.TOAST_RESTAURANT_GUID || 'd3efae34-7c2e-4107-a442-49081e624706'
    };

    // Get payment data using Payments endpoint (Homebase's documented method)
    console.log('Fetching all payment data via Payments endpoint...');

    // Generate business dates in YYYYMMDD format
    const start = new Date(startDate);
    const end = new Date(endDate);
    const businessDates = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      businessDates.push(d.toISOString().split('T')[0].replace(/-/g, ''));
    }

    let allPaymentGuids = [];

    // Get payment GUIDs for each business date using businessDate (NOT paidBusinessDate)
    // businessDate = when order was fulfilled (matches Toast Sales Summary)
    // paidBusinessDate = when payment was made (excludes pre-paid orders from fulfillment date)
    for (const businessDate of businessDates) {
      console.log(`Fetching payments for businessDate: ${businessDate}`);

      const paymentsResponse = await fetch(`${TOAST_CONFIG.baseUrl}/orders/v2/payments?businessDate=${businessDate}`, {
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

    // Fetch individual payment details and calculate totals
    let creditTips = 0;
    let creditAmount = 0;
    let creditCount = 0;
    let cashSales = 0;
    let cashTips = 0;
    let otherSales = 0;
    let otherTips = 0;
    let voidedTips = 0;
    let deniedPayments = 0;
    let giftCardPayments = 0;
    let giftCardAmount = 0;

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
          cashTips += tipAmount;
        } else if (paymentType === 'GIFTCARD') {
          giftCardPayments++;
          giftCardAmount += amount;
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

    // Calculate net sales from payments (credit + cash + other)
    const netSales = creditAmount + cashSales + otherSales;
    const totalTips = creditTips + cashTips + otherTips;

    console.log(`\n=== PAYMENTS ENDPOINT RESULTS ===`);
    console.log(`Net Sales (from payments): $${netSales.toFixed(2)}`);
    console.log(`CREDIT: ${creditCount} payments, $${creditAmount.toFixed(2)}, $${creditTips.toFixed(2)} tips`);
    console.log(`CASH: $${cashSales.toFixed(2)}, $${cashTips.toFixed(2)} tips`);
    console.log(`OTHER: $${otherSales.toFixed(2)}, $${otherTips.toFixed(2)} tips`);
    console.log(`GIFTCARD payments: ${giftCardPayments}, $${giftCardAmount.toFixed(2)}`);
    console.log(`Card Type Breakdown:`);
    console.log(`  VISA: ${paymentsByCardType.VISA.count} payments, $${paymentsByCardType.VISA.amount.toFixed(2)}, $${paymentsByCardType.VISA.tips.toFixed(2)} tips`);
    console.log(`  MASTERCARD: ${paymentsByCardType.MASTERCARD.count} payments, $${paymentsByCardType.MASTERCARD.amount.toFixed(2)}, $${paymentsByCardType.MASTERCARD.tips.toFixed(2)} tips`);
    console.log(`  AMEX: ${paymentsByCardType.AMEX.count} payments, $${paymentsByCardType.AMEX.amount.toFixed(2)}, $${paymentsByCardType.AMEX.tips.toFixed(2)} tips`);
    console.log(`  DISCOVER: ${paymentsByCardType.DISCOVER.count} payments, $${paymentsByCardType.DISCOVER.amount.toFixed(2)}, $${paymentsByCardType.DISCOVER.tips.toFixed(2)} tips`);
    console.log(`Voided/Denied: $${voidedTips.toFixed(2)} tips, ${deniedPayments} DENIED payments`);

    return res.json({
      success: true,
      version: 'v3.0-payments-businessDate-20251007',
      method: 'Payments endpoint with businessDate (matches Toast Sales Summary)',
      dateRange: { startDate, endDate },

      // Sales calculated from payments
      netSales: netSales,
      totalTips: totalTips,

      // Payment breakdown
      creditTips: creditTips,
      creditAmount: creditAmount,
      creditCount: creditCount,
      cashSales: cashSales,
      cashTips: cashTips,
      otherSales: otherSales,
      otherTips: otherTips,
      giftCardPayments: giftCardPayments,
      giftCardAmount: giftCardAmount,
      voidedTips: voidedTips,
      deniedPayments: deniedPayments,

      // Card type breakdown
      paymentsByCardType: paymentsByCardType,

      // Metadata
      totalPaymentsProcessed: allPaymentGuids.length
    });

  } catch (error) {
    console.error('Toast Analytics API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
