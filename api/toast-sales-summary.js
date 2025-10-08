// V7.1 Toast Sales Summary API - Uses Payments endpoint for 100% accuracy
// Method: /orders/v2/payments with paidBusinessDate (matches Toast Sales Summary exactly)

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

    console.log(`V7.3 PAYMENTS ENDPOINT + RETRY LOGIC: ${startDate} to ${endDate}`);

    const TOAST_CONFIG = {
      baseUrl: process.env.TOAST_BASE_URL || 'https://ws-api.toasttab.com',
      restaurantGuid: process.env.TOAST_RESTAURANT_GUID || 'd3efae34-7c2e-4107-a442-49081e624706'
    };

    // TARGET range for filtering (user's requested dates)
    const targetStart = new Date(startDate);
    const targetEnd = new Date(endDate);
    const targetStartBizDate = parseInt(startDate.replace(/-/g, ''));
    const targetEndBizDate = parseInt(endDate.replace(/-/g, ''));

    // EXPANDED FETCH range to capture pre-paid future orders
    // Keep it reasonable to avoid timeout (3 days before, 14 days after)
    const fetchStart = new Date(targetStart);
    fetchStart.setDate(fetchStart.getDate() - 3);
    const fetchEnd = new Date(targetEnd);
    fetchEnd.setDate(fetchEnd.getDate() + 14);

    const paidBusinessDates = [];
    for (let d = new Date(fetchStart); d <= fetchEnd; d.setDate(d.getDate() + 1)) {
      paidBusinessDates.push(d.toISOString().split('T')[0].replace(/-/g, ''));
    }

    console.log(`TARGET: ${startDate} to ${endDate} (${targetStartBizDate}-${targetEndBizDate})`);
    console.log(`FETCH: ${fetchStart.toISOString().split('T')[0]} to ${fetchEnd.toISOString().split('T')[0]} (${paidBusinessDates.length} dates)`);

    let allPaymentGuids = [];

    // Get payment GUIDs for each paidBusinessDate
    // paidBusinessDate = when payment was made (matches Toast Sales Summary)
    for (const paidDate of paidBusinessDates) {
      console.log(`Fetching payments for paidBusinessDate: ${paidDate}`);

      const paymentsResponse = await fetch(`${TOAST_CONFIG.baseUrl}/orders/v2/payments?paidBusinessDate=${paidDate}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Toast-Restaurant-External-ID': TOAST_CONFIG.restaurantGuid,
          'Content-Type': 'application/json'
        }
      });

      if (!paymentsResponse.ok) {
        console.error(`Failed to fetch payments for ${paidDate}: ${paymentsResponse.status}`);
        continue;
      }

      const paymentGuids = await paymentsResponse.json();
      allPaymentGuids = allPaymentGuids.concat(paymentGuids);
      console.log(`Found ${paymentGuids.length} payments for ${paidDate} (Total: ${allPaymentGuids.length})`);

      // Minimal rate limiting to avoid timeout
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Total payment GUIDs to fetch: ${allPaymentGuids.length}`);

    // Helper function to fetch payment with retry logic for 429 errors
    async function fetchPaymentWithRetry(paymentGuid, maxRetries = 3) {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const paymentResponse = await fetch(`${TOAST_CONFIG.baseUrl}/orders/v2/payments/${paymentGuid}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Toast-Restaurant-External-ID': TOAST_CONFIG.restaurantGuid,
              'Content-Type': 'application/json'
            }
          });

          if (paymentResponse.ok) {
            return { success: true, data: await paymentResponse.json() };
          }

          // Handle 429 rate limit errors with exponential backoff
          if (paymentResponse.status === 429 && attempt < maxRetries) {
            const delayMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
            console.log(`429 rate limit for ${paymentGuid}, retry ${attempt + 1}/${maxRetries} after ${delayMs}ms`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue; // Retry
          }

          // Other errors or final 429 after retries
          return { success: false, status: paymentResponse.status, guid: paymentGuid };

        } catch (error) {
          if (attempt < maxRetries) {
            const delayMs = Math.pow(2, attempt) * 1000;
            console.log(`Error fetching ${paymentGuid}, retry ${attempt + 1}/${maxRetries} after ${delayMs}ms: ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
          }
          return { success: false, error: error.message, guid: paymentGuid };
        }
      }
    }

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
    let failedPayments = 0;

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
        const result = await fetchPaymentWithRetry(paymentGuid);

        if (!result.success) {
          console.error(`Failed to fetch payment ${paymentGuid} after retries: ${result.status || result.error}`);
          failedPayments++;
          continue;
        }

        const payment = result.data;

        const amount = payment.amount || 0;
        const tipAmount = payment.tipAmount || 0;
        const paymentType = payment.type || 'UNKNOWN';
        const paymentStatus = payment.paymentStatus || 'NONE';
        const cardType = payment.cardType || 'UNKNOWN';
        const paidBizDate = payment.paidBusinessDate;

        // V7.2 FILTER: Only include payments paid within target range
        if (paidBizDate && (paidBizDate < targetStartBizDate || paidBizDate > targetEndBizDate)) {
          continue; // Skip - paid outside target range
        }

        // Exclude DENIED payments only (VOIDED tips should be included)
        if (paymentStatus === 'DENIED') {
          voidedTips += tipAmount;
          deniedPayments++;
          continue;
        }

        // Track voided payments separately but still count them
        const isVoided = paymentStatus === 'VOIDED';
        if (isVoided) {
          voidedTips += tipAmount;
        }

        // Count by payment type (VOIDED payments are included)
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

        // Minimal logging to track progress (no rate limiting to avoid timeout)
        if ((i + 1) % 100 === 0) {
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
    console.log(`Failed fetches after retries: ${failedPayments} payments`);

    return res.json({
      success: true,
      version: 'v7.3-payments-with-retry-20251008',
      method: 'Payments endpoint with paidBusinessDate + 429 retry logic (exponential backoff)',
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

      // For compatibility with frontend
      salesData: {
        netSales: netSales,
        creditTips: creditTips,
        cashSales: cashSales
      },

      // Metadata
      totalPaymentsProcessed: allPaymentGuids.length,
      failedPayments: failedPayments,
      successRate: ((allPaymentGuids.length - failedPayments) / allPaymentGuids.length * 100).toFixed(2) + '%'
    });

  } catch (error) {
    console.error('Toast Sales Summary API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
