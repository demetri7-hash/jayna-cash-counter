/**
 * Employee Daily Performance Tracker
 * Calculates individual employee tips per hour for leaderboard
 *
 * Process:
 * 1. Fetch time entries to get hours worked per employee
 * 2. Fetch orders and attribute tips to servers
 * 3. Calculate tips/hour per employee
 * 4. Save to database
 * 5. Return leaderboard data
 *
 * Endpoint: POST /api/toast-employee-performance
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
    console.log('📊 Calculating individual employee performance...');

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

    console.log(`📅 Business Date: ${businessDate}`);

    // STEP 3: Fetch time entries
    console.log('⏰ Fetching time entries...');
    const timeEntriesUrl = `${TOAST_BASE_URL}/labor/v1/timeEntries?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;

    const timeEntriesResponse = await fetch(timeEntriesUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Toast-Restaurant-External-ID': TOAST_RESTAURANT_GUID,
        'Content-Type': 'application/json'
      }
    });

    if (!timeEntriesResponse.ok) {
      throw new Error(`Time entries API failed: ${timeEntriesResponse.status}`);
    }

    const timeEntries = await timeEntriesResponse.json();
    console.log(`✅ Fetched ${timeEntries.length} time entries`);

    // STEP 4: Calculate hours per employee
    const employeeHours = calculateEmployeeHours(timeEntries, nowPacific);

    // STEP 5: Fetch employee names from database
    const employeeGuids = Array.from(employeeHours.keys());
    const { data: employeeData } = await supabase
      .from('employees')
      .select('toast_guid, first_name, last_name')
      .in('toast_guid', employeeGuids);

    // Create employee name map
    const employeeNames = new Map();
    if (employeeData) {
      employeeData.forEach(emp => {
        employeeNames.set(emp.toast_guid, `${emp.first_name} ${emp.last_name}`.trim());
      });
    }

    // STEP 6: Fetch orders and attribute tips to servers
    console.log('💳 Fetching orders and attributing tips...');
    const employeeTips = await fetchEmployeeTips(accessToken, TOAST_BASE_URL, TOAST_RESTAURANT_GUID, businessDate);

    // STEP 7: Combine hours + tips to calculate performance
    const performanceData = [];

    for (const [employeeGuid, hours] of employeeHours.entries()) {
      const tips = employeeTips.get(employeeGuid) || { totalTips: 0, orderCount: 0 };
      const tipsPerHour = hours > 0 ? tips.totalTips / hours : 0;

      const employeeName = employeeNames.get(employeeGuid) || 'Unknown Employee';

      performanceData.push({
        employee_guid: employeeGuid,
        employee_name: employeeName,
        business_date: businessDate,
        hours_worked: hours,
        cc_tips_earned: tips.totalTips,
        orders_served: tips.orderCount,
        tips_per_hour: tipsPerHour,
        last_calculated_at: new Date().toISOString(),
        is_end_of_day: false,
        updated_at: new Date().toISOString()
      });

      console.log(`  👤 ${employeeName}: ${hours.toFixed(2)}h, $${tips.totalTips.toFixed(2)} tips, $${tipsPerHour.toFixed(2)}/hr`);
    }

    // STEP 8: Save to database (upsert)
    if (performanceData.length > 0) {
      const { error: upsertError } = await supabase
        .from('employee_daily_performance')
        .upsert(performanceData, {
          onConflict: 'employee_guid,business_date',
          ignoreDuplicates: false
        });

      if (upsertError) {
        console.error('Database save error:', upsertError);
      } else {
        console.log(`✅ Saved ${performanceData.length} employee records to database`);
      }
    }

    // STEP 9: Sort by tips per hour for leaderboard
    // FILTER: Only show FOH employees with sales data (orders/tips > 0)
    const leaderboard = performanceData
      .filter(emp => emp.orders_served > 0 || emp.cc_tips_earned > 0) // Only FOH with sales
      .sort((a, b) => b.tips_per_hour - a.tips_per_hour)
      .map((emp, index) => ({
        rank: index + 1,
        name: emp.employee_name,
        tipsPerHour: parseFloat(emp.tips_per_hour.toFixed(2)),
        hoursWorked: parseFloat(emp.hours_worked.toFixed(2)),
        totalTips: parseFloat(emp.cc_tips_earned.toFixed(2)),
        ordersServed: emp.orders_served
      }));

    // STEP 10: Return response
    return res.status(200).json({
      success: true,
      data: {
        businessDate,
        totalEmployees: performanceData.length,
        leaderboard: leaderboard,
        calculatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Employee performance calculation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate employee performance',
      details: error.message
    });
  }
}

/**
 * Get Pacific Time date range (5am today to now)
 */
function getPacificTimeRange() {
  const now = new Date();
  const pacificTimeString = now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
  const nowPacific = new Date(pacificTimeString);

  const todayAt5AM = new Date(nowPacific);
  todayAt5AM.setHours(5, 0, 0, 0);

  let startTime;
  if (nowPacific < todayAt5AM) {
    todayAt5AM.setDate(todayAt5AM.getDate() - 1);
    startTime = todayAt5AM;
  } else {
    startTime = todayAt5AM;
  }

  const businessDate = startTime.toISOString().split('T')[0];
  const startDate = startTime.toISOString();
  const endDate = nowPacific.toISOString();

  return { startDate, endDate, businessDate, nowPacific };
}

/**
 * Calculate hours worked per employee (including currently clocked-in)
 */
function calculateEmployeeHours(timeEntries, nowPacific) {
  const employeeHours = new Map();

  timeEntries.forEach(entry => {
    const employeeGuid = entry.employeeReference?.guid;
    if (!employeeGuid) return;

    let hours = 0;

    if (entry.outDate) {
      // Already clocked out - use Toast's calculated hours
      const regularHours = entry.regularHours || 0;
      const overtimeHours = entry.overtimeHours || 0;
      hours = regularHours + overtimeHours;
    } else {
      // Still clocked in - calculate manually
      const clockInTime = new Date(entry.inDate);
      const diffMs = nowPacific - clockInTime;
      hours = diffMs / (1000 * 60 * 60);

      // Apply 30-minute lunch deduction if >6 hours
      if (hours > 6) {
        hours -= 0.5;
      }
    }

    // Add to employee's total hours
    const currentHours = employeeHours.get(employeeGuid) || 0;
    employeeHours.set(employeeGuid, currentHours + hours);
  });

  return employeeHours;
}

/**
 * Fetch orders and attribute tips to servers
 */
async function fetchEmployeeTips(accessToken, baseUrl, restaurantGuid, businessDate) {
  const formattedBusinessDate = businessDate.replace(/-/g, '');
  const employeeTips = new Map();

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
      console.error(`Failed to fetch orders page ${page}`);
      break;
    }

    const pageOrders = await ordersResponse.json();

    if (Array.isArray(pageOrders) && pageOrders.length > 0) {
      allOrders = allOrders.concat(pageOrders);

      if (pageOrders.length === pageSize) {
        page++;
        await new Promise(resolve => setTimeout(resolve, 300));
      } else {
        hasMorePages = false;
      }
    } else {
      hasMorePages = false;
    }

    if (page > 50) {
      hasMorePages = false;
    }
  }

  console.log(`  📦 Fetched ${allOrders.length} orders`);

  // Attribute tips to servers
  allOrders.forEach(order => {
    if (order.voided || order.deleted) return;

    if (order.checks && Array.isArray(order.checks)) {
      order.checks.forEach(check => {
        if (check.voided || check.deleted) return;

        // Get server from check
        const serverGuid = check.server?.guid;
        if (!serverGuid) return; // Skip checks with no server assigned

        // Calculate tips for this check
        let checkTips = 0;

        if (check.payments && Array.isArray(check.payments)) {
          check.payments.forEach(payment => {
            if (payment.type === 'CREDIT') {
              const tipAmount = payment.tipAmount || 0;

              // Exclude voided or fully refunded
              if (payment.voided || payment.paymentStatus === 'VOIDED') return;
              if (payment.refundStatus === 'FULL') return;

              // Handle partial refunds
              if (payment.refundStatus === 'PARTIAL' && payment.refund?.refundAmount) {
                const refundedTip = payment.refund.refundAmount || 0;
                checkTips += (tipAmount - refundedTip);
              } else {
                checkTips += tipAmount;
              }
            }
          });
        }

        // Add to server's total
        if (checkTips > 0) {
          const current = employeeTips.get(serverGuid) || { totalTips: 0, orderCount: 0 };
          employeeTips.set(serverGuid, {
            totalTips: current.totalTips + checkTips,
            orderCount: current.orderCount + 1
          });
        }
      });
    }
  });

  return employeeTips;
}
