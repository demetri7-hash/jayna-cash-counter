/**
 * Toast Tips Per Hour - Real-Time Daily Metric
 * Calculates: (Total CC Tips Today) / (Total Hours Worked Today)
 *
 * Features:
 * - Fetches time entries from 5am (Pacific) to now
 * - Calculates hours for currently clocked-in employees
 * - Applies 30-min lunch deduction for shifts >6 hours
 * - Sums credit card tips from today's orders
 * - Compares to yesterday for trending
 * - Saves snapshot to database
 *
 * Endpoint: POST /api/toast-tips-per-hour-today
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🎯 Calculating Tips Per Hour for today...');

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Toast API credentials
    const TOAST_BASE_URL = 'https://ws-api.toasttab.com';
    const TOAST_RESTAURANT_GUID = process.env.TOAST_RESTAURANT_GUID;
    const TOAST_CLIENT_ID = process.env.TOAST_CLIENT_ID;
    const TOAST_CLIENT_SECRET = process.env.TOAST_CLIENT_SECRET;

    if (!TOAST_CLIENT_ID || !TOAST_CLIENT_SECRET || !TOAST_RESTAURANT_GUID) {
      throw new Error('Toast API credentials not configured');
    }

    // STEP 1: Get OAuth token
    console.log('🔐 Authenticating with Toast API...');
    const tokenResponse = await fetch(`${TOAST_BASE_URL}/authentication/v1/authentication/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${TOAST_CLIENT_ID}:${TOAST_CLIENT_SECRET}`).toString('base64')}`
      },
      body: JSON.stringify({
        clientId: TOAST_CLIENT_ID,
        clientSecret: TOAST_CLIENT_SECRET,
        userAccessType: 'TOAST_MACHINE_CLIENT'
      })
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.token?.accessToken;

    if (!accessToken) {
      throw new Error('Failed to get Toast access token');
    }

    // STEP 2: Calculate Pacific Time date range (5am today to now)
    const { startDate, endDate, businessDate, nowPacific } = getPacificTimeRange();

    console.log(`📅 Date Range: ${startDate} to ${endDate}`);
    console.log(`📅 Business Date: ${businessDate}`);

    // STEP 3: Fetch time entries from Toast Labor API (with pagination)
    console.log('⏰ Fetching time entries...');

    let allTimeEntries = [];
    let page = 1;
    let hasMorePages = true;
    const pageSize = 100;

    while (hasMorePages) {
      const timeEntriesUrl = `${TOAST_BASE_URL}/labor/v1/timeEntries?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&page=${page}&pageSize=${pageSize}`;

      const timeEntriesResponse = await fetch(timeEntriesUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Toast-Restaurant-External-ID': TOAST_RESTAURANT_GUID,
          'Content-Type': 'application/json'
        }
      });

      if (!timeEntriesResponse.ok) {
        const errorText = await timeEntriesResponse.text();
        console.error('Toast Time Entries API Error:', errorText);
        throw new Error(`Toast Time Entries API failed: ${timeEntriesResponse.status}`);
      }

      const pageEntries = await timeEntriesResponse.json();

      if (Array.isArray(pageEntries) && pageEntries.length > 0) {
        allTimeEntries = allTimeEntries.concat(pageEntries);
        console.log(`  ⏰ Page ${page}: ${pageEntries.length} entries (Total: ${allTimeEntries.length})`);

        if (pageEntries.length === pageSize) {
          page++;
          await new Promise(resolve => setTimeout(resolve, 300)); // Rate limit protection
        } else {
          hasMorePages = false;
        }
      } else {
        hasMorePages = false;
      }

      // Safety limit
      if (page > 10) {
        console.warn('Max time entries pages reached');
        hasMorePages = false;
      }
    }

    const timeEntries = allTimeEntries;
    console.log(`✅ Fetched ${timeEntries.length} total time entries`);

    // STEP 4: Calculate total hours worked
    const { totalHours, employeeCount, currentlyClockedIn } = calculateTotalHoursWorked(timeEntries, nowPacific);

    console.log(`⏱️  Total Hours Worked: ${totalHours.toFixed(2)}`);
    console.log(`👥 Employees Worked Today: ${employeeCount}`);
    console.log(`🔓 Currently Clocked In: ${currentlyClockedIn}`);

    // STEP 5: Fetch orders and calculate CC tips
    console.log('💳 Fetching orders and calculating tips...');
    const { totalCCTips, orderCount } = await fetchTodaysCCTips(accessToken, TOAST_BASE_URL, TOAST_RESTAURANT_GUID, businessDate);

    console.log(`💰 Total CC Tips: $${totalCCTips.toFixed(2)}`);
    console.log(`📦 Total Orders: ${orderCount}`);

    // STEP 6: Calculate Tips Per Hour
    const tipsPerHour = totalHours > 0 ? totalCCTips / totalHours : 0;
    console.log(`🎯 Tips Per Hour: $${tipsPerHour.toFixed(2)}`);

    // STEP 7: Get comparison data from database (yesterday, last week, last month)
    const yesterday = new Date(businessDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];

    const lastWeek = new Date(businessDate);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastWeekDate = lastWeek.toISOString().split('T')[0];

    const lastMonth = new Date(businessDate);
    lastMonth.setDate(lastMonth.getDate() - 30);
    const lastMonthDate = lastMonth.toISOString().split('T')[0];

    // Fetch yesterday's data
    const { data: yesterdayData } = await supabase
      .from('daily_tips_metrics')
      .select('tips_per_hour')
      .eq('business_date', yesterdayDate)
      .eq('is_end_of_day', true)
      .single();

    // Fetch last week's data
    const { data: lastWeekData } = await supabase
      .from('daily_tips_metrics')
      .select('tips_per_hour')
      .eq('business_date', lastWeekDate)
      .eq('is_end_of_day', true)
      .single();

    // Fetch last month's data
    const { data: lastMonthData } = await supabase
      .from('daily_tips_metrics')
      .select('tips_per_hour')
      .eq('business_date', lastMonthDate)
      .eq('is_end_of_day', true)
      .single();

    // Calculate yesterday comparison
    let previousDayTipsPerHour = null;
    let percentChange = null;
    let trendingUp = null;

    if (yesterdayData && yesterdayData.tips_per_hour) {
      previousDayTipsPerHour = parseFloat(yesterdayData.tips_per_hour);
      percentChange = ((tipsPerHour - previousDayTipsPerHour) / previousDayTipsPerHour) * 100;
      trendingUp = percentChange >= 0;

      console.log(`📊 Yesterday's Tips/Hour: $${previousDayTipsPerHour.toFixed(2)}`);
      console.log(`📈 Change: ${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%`);
    }

    // Calculate last week comparison
    let lastWeekTipsPerHour = null;
    let percentChangeWeek = null;
    let trendingUpWeek = null;

    if (lastWeekData && lastWeekData.tips_per_hour) {
      lastWeekTipsPerHour = parseFloat(lastWeekData.tips_per_hour);
      percentChangeWeek = ((tipsPerHour - lastWeekTipsPerHour) / lastWeekTipsPerHour) * 100;
      trendingUpWeek = percentChangeWeek >= 0;

      console.log(`📊 Last Week's Tips/Hour: $${lastWeekTipsPerHour.toFixed(2)}`);
      console.log(`📈 Week Change: ${percentChangeWeek > 0 ? '+' : ''}${percentChangeWeek.toFixed(1)}%`);
    }

    // Calculate last month comparison
    let lastMonthTipsPerHour = null;
    let percentChangeMonth = null;
    let trendingUpMonth = null;

    if (lastMonthData && lastMonthData.tips_per_hour) {
      lastMonthTipsPerHour = parseFloat(lastMonthData.tips_per_hour);
      percentChangeMonth = ((tipsPerHour - lastMonthTipsPerHour) / lastMonthTipsPerHour) * 100;
      trendingUpMonth = percentChangeMonth >= 0;

      console.log(`📊 Last Month's Tips/Hour: $${lastMonthTipsPerHour.toFixed(2)}`);
      console.log(`📈 Month Change: ${percentChangeMonth > 0 ? '+' : ''}${percentChangeMonth.toFixed(1)}%`);
    }

    // STEP 8: Save to database (upsert)
    const metricsData = {
      business_date: businessDate,
      last_calculated_at: new Date().toISOString(),
      is_end_of_day: false, // Live calculation, not end-of-day snapshot
      total_cc_tips: totalCCTips,
      total_orders_count: orderCount,
      total_hours_worked: totalHours,
      total_employees_worked: employeeCount,
      employees_currently_clocked_in: currentlyClockedIn,
      tips_per_hour: tipsPerHour,
      previous_day_tips_per_hour: previousDayTipsPerHour,
      percent_change_from_yesterday: percentChange,
      trending_up: trendingUp,
      updated_at: new Date().toISOString()
    };

    const { error: upsertError } = await supabase
      .from('daily_tips_metrics')
      .upsert(metricsData, {
        onConflict: 'business_date',
        ignoreDuplicates: false
      });

    if (upsertError) {
      console.error('Error saving to database:', upsertError);
      // Continue anyway - don't fail the request
    } else {
      console.log('✅ Saved to database');
    }

    // STEP 9: Return response
    return res.status(200).json({
      success: true,
      data: {
        businessDate,
        tipsPerHour: parseFloat(tipsPerHour.toFixed(2)),
        totalCCTips: parseFloat(totalCCTips.toFixed(2)),
        totalHoursWorked: parseFloat(totalHours.toFixed(2)),
        totalOrdersCount: orderCount,
        employeesWorkedToday: employeeCount,
        currentlyClockedIn: currentlyClockedIn,

        // Yesterday comparison
        previousDayTipsPerHour: previousDayTipsPerHour ? parseFloat(previousDayTipsPerHour.toFixed(2)) : null,
        percentChangeFromYesterday: percentChange ? parseFloat(percentChange.toFixed(1)) : null,
        trendingUp: trendingUp,

        // Week comparison
        lastWeekTipsPerHour: lastWeekTipsPerHour ? parseFloat(lastWeekTipsPerHour.toFixed(2)) : null,
        percentChangeFromLastWeek: percentChangeWeek ? parseFloat(percentChangeWeek.toFixed(1)) : null,
        trendingUpWeek: trendingUpWeek,

        // Month comparison
        lastMonthTipsPerHour: lastMonthTipsPerHour ? parseFloat(lastMonthTipsPerHour.toFixed(2)) : null,
        percentChangeFromLastMonth: percentChangeMonth ? parseFloat(percentChangeMonth.toFixed(1)) : null,
        trendingUpMonth: trendingUpMonth,

        calculatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Tips Per Hour calculation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate tips per hour',
      details: error.message
    });
  }
}

/**
 * Get Pacific Time date range (5am today to now)
 */
function getPacificTimeRange() {
  // Use the SAME pattern as shared-header.js and everywhere else in the codebase
  const now = new Date();
  const pacificTimeString = now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
  const nowPacific = new Date(pacificTimeString);

  // Get today at 5am Pacific
  const todayAt5AM = new Date(nowPacific);
  todayAt5AM.setHours(5, 0, 0, 0);

  // If current time is before 5am, use yesterday's 5am
  let startTime;
  if (nowPacific < todayAt5AM) {
    todayAt5AM.setDate(todayAt5AM.getDate() - 1);
    startTime = todayAt5AM;
  } else {
    startTime = todayAt5AM;
  }

  // Business date is the date of the 5am start time
  const businessDate = startTime.toISOString().split('T')[0];

  // Format for Toast API (ISO 8601 with timezone)
  const startDate = startTime.toISOString();
  const endDate = now.toISOString(); // Use UTC "now" for end date

  return {
    startDate,
    endDate,
    businessDate,
    nowPacific
  };
}

/**
 * Calculate total hours worked (including currently clocked-in employees)
 */
function calculateTotalHoursWorked(timeEntries, nowPacific) {
  let totalHours = 0;
  const employeesWorked = new Set();
  let currentlyClockedIn = 0;

  timeEntries.forEach(entry => {
    // Track unique employees
    if (entry.employeeReference?.guid) {
      employeesWorked.add(entry.employeeReference.guid);
    }

    if (entry.outDate) {
      // Already clocked out - use Toast's calculated hours
      const regularHours = entry.regularHours || 0;
      const overtimeHours = entry.overtimeHours || 0;
      totalHours += regularHours + overtimeHours;
    } else {
      // Still clocked in - calculate hours manually
      currentlyClockedIn++;

      const clockInTime = new Date(entry.inDate);
      const diffMs = nowPacific - clockInTime;
      let hoursWorked = diffMs / (1000 * 60 * 60);

      // Apply 30-minute lunch break deduction if >6 hours
      if (hoursWorked > 6) {
        hoursWorked -= 0.5;
        console.log(`  ⏱️  Employee clocked in ${hoursWorked.toFixed(2)}h (with 30min lunch deduction)`);
      }

      totalHours += hoursWorked;
    }
  });

  return {
    totalHours,
    employeeCount: employeesWorked.size,
    currentlyClockedIn
  };
}

/**
 * Fetch today's orders and calculate CC tips
 */
async function fetchTodaysCCTips(accessToken, baseUrl, restaurantGuid, businessDate) {
  // Format business date for Toast API (YYYYMMDD)
  const formattedBusinessDate = businessDate.replace(/-/g, '');

  let allOrders = [];
  let page = 1;
  let hasMorePages = true;
  const pageSize = 100;

  // Paginate through all orders
  while (hasMorePages) {
    const ordersUrl = `${baseUrl}/orders/v2/ordersBulk?businessDate=${formattedBusinessDate}&page=${page}&pageSize=${pageSize}`;

    const ordersResponse = await fetch(ordersUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Toast-Restaurant-External-ID': restaurantGuid,
        'Content-Type': 'application/json'
      }
    });

    if (!ordersResponse.ok) {
      console.error(`Failed to fetch orders page ${page}: ${ordersResponse.status}`);
      break;
    }

    const pageOrders = await ordersResponse.json();

    if (Array.isArray(pageOrders) && pageOrders.length > 0) {
      allOrders = allOrders.concat(pageOrders);
      console.log(`  📦 Page ${page}: ${pageOrders.length} orders (Total: ${allOrders.length})`);

      if (pageOrders.length === pageSize) {
        page++;
        await new Promise(resolve => setTimeout(resolve, 300)); // Rate limit protection
      } else {
        hasMorePages = false;
      }
    } else {
      hasMorePages = false;
    }

    // Safety limit
    if (page > 50) {
      console.warn('Max pages reached');
      hasMorePages = false;
    }
  }

  // Calculate CC tips from orders
  let totalCCTips = 0;

  allOrders.forEach(order => {
    // Skip voided/deleted orders
    if (order.voided || order.deleted) {
      return;
    }

    if (order.checks && Array.isArray(order.checks)) {
      order.checks.forEach(check => {
        // Skip voided/deleted checks
        if (check.voided || check.deleted) {
          return;
        }

        if (check.payments && Array.isArray(check.payments)) {
          check.payments.forEach(payment => {
            // Only count CREDIT card payments
            if (payment.type === 'CREDIT') {
              const tipAmount = payment.tipAmount || 0;

              // Exclude voided or fully refunded tips
              if (payment.voided || payment.paymentStatus === 'VOIDED') {
                return;
              }

              if (payment.refundStatus === 'FULL') {
                return;
              }

              // Subtract partial refunds
              if (payment.refundStatus === 'PARTIAL' && payment.refund?.refundAmount) {
                const refundedTip = payment.refund.refundAmount || 0;
                totalCCTips += (tipAmount - refundedTip);
              } else {
                totalCCTips += tipAmount;
              }
            }
          });
        }
      });
    }
  });

  return {
    totalCCTips,
    orderCount: allOrders.length
  };
}
