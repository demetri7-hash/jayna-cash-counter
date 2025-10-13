// Vercel Cron Job: Cache Daily Toast Sales Data
// Runs daily at 4am PT (11am UTC) - after business day closes
// Fetches yesterday's sales data from Toast API, saves to Supabase for instant loading

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Verify this is a cron request (Vercel adds special headers)
  if (req.headers['x-vercel-cron'] !== '1') {
    return res.status(401).json({ error: 'Unauthorized - not a cron request' });
  }

  try {
    console.log('🕐 Starting Toast sales caching cron job...');
    const startTime = Date.now();

    // Initialize Supabase client
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );

    // Calculate yesterday's date (business day that just closed)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const targetDate = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log(`📅 Fetching sales data for: ${targetDate}`);

    // Step 1: Authenticate with Toast API
    console.log('🔐 Authenticating with Toast API...');
    const authToken = await authenticateToast();

    if (!authToken) {
      throw new Error('Failed to authenticate with Toast API');
    }

    console.log('✅ Toast authentication successful');

    // Step 2: Fetch sales data for yesterday
    console.log(`📊 Fetching sales data from Toast API...`);
    const salesData = await fetchToastSalesData(targetDate, targetDate, authToken);

    if (!salesData.success) {
      throw new Error(`Failed to fetch sales data: ${salesData.error}`);
    }

    console.log(`✅ Sales data fetched successfully`);
    console.log(`   Net Sales: $${salesData.netSales.toFixed(2)}`);
    console.log(`   Credit Tips: $${salesData.creditTips.toFixed(2)}`);
    console.log(`   Cash Sales: $${salesData.cashSales.toFixed(2)}`);

    // Step 3: Save to database (upsert to handle re-runs)
    console.log('💾 Saving to database...');

    const dbRecord = {
      date: targetDate,
      net_sales: salesData.netSales,
      credit_tips: salesData.creditTips,
      cash_sales: salesData.cashSales,
      credit_amount: salesData.creditAmount,
      credit_count: salesData.creditCount,
      cash_tips: salesData.cashTips,
      other_sales: salesData.otherSales,
      other_tips: salesData.otherTips,
      total_tips: salesData.totalTips,
      imported_at: new Date().toISOString(),
      source: 'toast_api_auto',
      raw_data: salesData // Store full response for debugging (includes gift card data)
    };

    const { data, error } = await supabase
      .from('daily_sales')
      .upsert(dbRecord, { onConflict: 'date' })
      .select();

    if (error) {
      console.error('❌ Database error:', error);
      throw new Error(`Database save failed: ${error.message}`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Data saved successfully to database`);
    console.log(`⏱️  Total execution time: ${duration}s`);

    return res.json({
      success: true,
      message: `Successfully cached sales data for ${targetDate}`,
      date: targetDate,
      duration: `${duration}s`,
      summary: {
        netSales: salesData.netSales,
        creditTips: salesData.creditTips,
        cashSales: salesData.cashSales,
        totalTips: salesData.totalTips
      },
      savedRecord: data ? data[0] : null
    });

  } catch (error) {
    console.error('❌ Cron job error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    });
  }
}

// Authenticate with Toast API
async function authenticateToast() {
  try {
    const TOAST_CONFIG = {
      baseUrl: process.env.TOAST_BASE_URL || 'https://ws-api.toasttab.com',
      clientId: process.env.TOAST_CLIENT_ID,
      clientSecret: process.env.TOAST_CLIENT_SECRET,
      userAccessType: 'TOAST_MACHINE_CLIENT'
    };

    const authResponse = await fetch(`${TOAST_CONFIG.baseUrl}/authentication/v1/authentication/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        clientId: TOAST_CONFIG.clientId,
        clientSecret: TOAST_CONFIG.clientSecret,
        userAccessType: TOAST_CONFIG.userAccessType
      })
    });

    const authData = await authResponse.json();

    if (authResponse.ok && authData.token?.accessToken) {
      return authData.token.accessToken;
    }

    console.error('Toast authentication failed:', authData);
    return null;

  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

// Fetch sales data from Toast API (calls existing toast-sales-summary logic)
async function fetchToastSalesData(startDate, endDate, token) {
  try {
    const TOAST_CONFIG = {
      baseUrl: process.env.TOAST_BASE_URL || 'https://ws-api.toasttab.com',
      restaurantGuid: process.env.TOAST_RESTAURANT_GUID
    };

    // Get business dates for the range
    const targetStartBizDate = parseInt(startDate.replace(/-/g, ''));
    const targetEndBizDate = parseInt(endDate.replace(/-/g, ''));

    const paidBusinessDates = [];
    const targetStart = new Date(startDate);
    const targetEnd = new Date(endDate);

    for (let d = new Date(targetStart); d <= targetEnd; d.setDate(d.getDate() + 1)) {
      paidBusinessDates.push(d.toISOString().split('T')[0].replace(/-/g, ''));
    }

    console.log(`   Fetching ${paidBusinessDates.length} business date(s): ${paidBusinessDates.join(', ')}`);

    let allPaymentGuids = [];

    // Get payment GUIDs for each business date
    for (const paidDate of paidBusinessDates) {
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
      console.log(`   Found ${paymentGuids.length} payments for ${paidDate}`);

      await new Promise(resolve => setTimeout(resolve, 100)); // Rate limit protection
    }

    console.log(`   Total payments to process: ${allPaymentGuids.length}`);

    // Fetch individual payment details
    let creditTips = 0;
    let creditAmount = 0;
    let creditCount = 0;
    let cashSales = 0;
    let cashTips = 0;
    let otherSales = 0;
    let otherTips = 0;
    let giftCardPayments = 0;
    let giftCardAmount = 0;

    for (const paymentGuid of allPaymentGuids) {
      try {
        const paymentResponse = await fetch(`${TOAST_CONFIG.baseUrl}/orders/v2/payments/${paymentGuid}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Toast-Restaurant-External-ID': TOAST_CONFIG.restaurantGuid,
            'Content-Type': 'application/json'
          }
        });

        if (!paymentResponse.ok) continue;

        const payment = await paymentResponse.json();
        const amount = payment.amount || 0;
        const tipAmount = payment.tipAmount || 0;
        const paymentType = payment.type || 'UNKNOWN';
        const paymentStatus = payment.paymentStatus || 'NONE';

        // Exclude DENIED payments
        if (paymentStatus === 'DENIED') continue;

        const isVoided = paymentStatus === 'VOIDED';

        if (paymentType === 'CREDIT') {
          creditCount++;
          creditAmount += amount;
          creditTips += tipAmount;
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

      } catch (error) {
        console.error(`Error fetching payment ${paymentGuid}:`, error.message);
        continue;
      }
    }

    const netSales = creditAmount + cashSales + otherSales;
    const totalTips = creditTips + cashTips + otherTips;

    return {
      success: true,
      netSales,
      creditTips,
      creditAmount,
      creditCount,
      cashSales,
      cashTips,
      otherSales,
      otherTips,
      giftCardPayments,
      giftCardAmount,
      totalTips
    };

  } catch (error) {
    console.error('Error fetching sales data:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
