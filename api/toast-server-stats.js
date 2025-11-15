/**
 * Toast Server Stats API
 * Fetches ALL employees from Toast API and matches to orders
 *
 * FINAL APPROACH:
 * 1. Fetch time entries (for reference - who worked today)
 * 2. Fetch ALL employees from Toast API (CRITICAL - direct GUID match!)
 * 3. Match orders to employees by GUID
 *
 * Returns:
 * - All-day stats: net sales, tips, tip %, combos sold
 * - Hourly breakdown for each metric
 * - Per-server stats with REAL NAMES from Toast API
 */

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
    const { date, token } = req.query;

    if (!token) {
      return res.status(400).json({
        error: 'Missing required parameter: token'
      });
    }

    // Use today's date if not specified
    const targetDate = date || new Date().toISOString().split('T')[0];
    const businessDate = targetDate.replace(/-/g, ''); // Format: YYYYMMDD

    console.log(`📊 Fetching server stats for ${businessDate}...`);

    const TOAST_CONFIG = {
      baseUrl: process.env.TOAST_BASE_URL || 'https://ws-api.toasttab.com',
      restaurantGuid: process.env.TOAST_RESTAURANT_GUID || 'd3efae34-7c2e-4107-a442-49081e624706'
    };

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Toast-Restaurant-External-ID': TOAST_CONFIG.restaurantGuid,
      'Content-Type': 'application/json'
    };

    // STEP 1: Fetch time entries to get who ACTUALLY WORKED today
    console.log('⏰ Fetching time entries for employees who worked today...');

    const { startDate, endDate } = getPacificTimeRange(targetDate);
    const timeEntriesUrl = `${TOAST_CONFIG.baseUrl}/labor/v1/timeEntries?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;

    const timeEntriesResponse = await fetch(timeEntriesUrl, { method: 'GET', headers });

    if (!timeEntriesResponse.ok) {
      throw new Error(`Time entries API failed: ${timeEntriesResponse.status}`);
    }

    const timeEntries = await timeEntriesResponse.json();
    console.log(`✅ Found ${timeEntries.length} time entries (clocked-in employees)`);

    // Extract unique employee GUIDs from time entries
    const employeeGuidsSet = new Set();
    timeEntries.forEach(entry => {
      const guid = entry.employeeReference?.guid;
      if (guid) employeeGuidsSet.add(guid);
    });

    const employeeGuids = Array.from(employeeGuidsSet);
    console.log(`👥 Found ${employeeGuids.length} unique employees who worked today`);

    // STEP 2: Fetch ALL EMPLOYEES from TOAST API (not database!)
    console.log('👥 Fetching ALL employees from Toast API...');
    const employeesUrl = `${TOAST_CONFIG.baseUrl}/labor/v1/employees?restaurantGuid=${TOAST_CONFIG.restaurantGuid}`;

    const employeesResponse = await fetch(employeesUrl, { method: 'GET', headers });

    if (!employeesResponse.ok) {
      throw new Error(`Employees API failed: ${employeesResponse.status}`);
    }

    const allToastEmployees = await employeesResponse.json();
    console.log(`✅ Fetched ${allToastEmployees.length} employees from Toast API`);

    // Create employee name map from Toast API data
    const employeeNames = new Map();
    allToastEmployees.forEach(emp => {
      const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
      if (fullName && emp.guid) {
        employeeNames.set(emp.guid, fullName);
      }
    });

    console.log(`📋 Employee map created with ${employeeNames.size} employees`);

    // DEBUG: Show first few employees
    if (employeeNames.size > 0) {
      const firstThree = Array.from(employeeNames.entries()).slice(0, 3);
      console.log('👤 First 3 employees from Toast API:', firstThree);
    } else {
      console.warn('⚠️ WARNING: No employee names found from Toast API!');
    }

    // STEP 3: Fetch ALL orders for the business date with pagination
    console.log('📦 Fetching orders...');
    let allOrders = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const ordersUrl = `${TOAST_CONFIG.baseUrl}/orders/v2/ordersBulk?businessDate=${businessDate}&page=${page}&pageSize=100`;
      console.log(`Fetching orders page ${page}...`);

      const ordersResponse = await fetch(ordersUrl, { method: 'GET', headers });

      if (!ordersResponse.ok) {
        console.error(`Failed to fetch orders page ${page}: ${ordersResponse.status}`);
        break;
      }

      const orders = await ordersResponse.json();
      allOrders = allOrders.concat(orders);

      hasMore = orders.length === 100; // Continue if we got a full page
      page++;

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ Total orders fetched: ${allOrders.length}`);

    // STEP 4: Process orders and group by server
    const serverStats = {};
    const hourlyStats = {}; // Track stats by hour
    let totalNetSales = 0;
    let totalTips = 0;
    let totalCombosSold = 0;

    for (const order of allOrders) {
      // Skip voided/deleted orders
      const isOrderVoided = order.voided === true ||
                           order.guestOrderStatus === 'VOIDED' ||
                           order.paymentStatus === 'VOIDED';
      const isOrderDeleted = order.deleted === true;

      if (isOrderVoided || isOrderDeleted) continue;

      // Process each check in the order
      if (order.checks && Array.isArray(order.checks)) {
        for (const check of order.checks) {
          // Skip voided/deleted checks
          if (check.voided === true || check.deleted === true) continue;

          // Get server name from check using employee map lookup (EXACT PATTERN FROM toast-employee-performance.js)
          const serverGuid = check.server?.guid;

          let serverName = 'Unassigned';
          if (serverGuid) {
            serverName = employeeNames.get(serverGuid) || 'Unassigned';
          }

          // Initialize server stats if needed
          if (!serverStats[serverName]) {
            serverStats[serverName] = {
              name: serverName,
              guid: serverGuid,
              netSales: 0,
              tips: 0,
              tipPercent: 0,
              combosSold: 0,
              transactions: 0,
              hourlyBreakdown: {}
            };
          }

          // Get check amount (net sales)
          const checkAmount = check.amount || 0;
          serverStats[serverName].netSales += checkAmount;
          serverStats[serverName].transactions++;
          totalNetSales += checkAmount;

          // Get tip amount from payments
          if (check.payments && Array.isArray(check.payments)) {
            for (const payment of check.payments) {
              if (payment.voided !== true && payment.paymentStatus !== 'VOIDED') {
                const tipAmount = payment.tipAmount || 0;
                serverStats[serverName].tips += tipAmount;
                totalTips += tipAmount;
              }
            }
          }

          // Count combo items
          if (check.selections && Array.isArray(check.selections)) {
            for (const selection of check.selections) {
              if (selection.voided === true || selection.deleted === true) continue;

              const itemName = (selection.itemGroup?.name || selection.item?.name || '').toUpperCase();
              if (itemName.includes('COMBO')) {
                const quantity = selection.quantity || 1;
                serverStats[serverName].combosSold += quantity;
                totalCombosSold += quantity;
              }
            }
          }

          // Track hourly stats
          if (order.openedDate) {
            const orderDate = new Date(order.openedDate);
            const hour = orderDate.getHours();
            const hourKey = `${hour.toString().padStart(2, '0')}:00`;

            if (!hourlyStats[hourKey]) {
              hourlyStats[hourKey] = {
                hour: hourKey,
                netSales: 0,
                tips: 0,
                tipPercent: 0,
                transactions: 0
              };
            }

            hourlyStats[hourKey].netSales += checkAmount;
            hourlyStats[hourKey].transactions++;

            // Add server hourly breakdown
            if (!serverStats[serverName].hourlyBreakdown[hourKey]) {
              serverStats[serverName].hourlyBreakdown[hourKey] = {
                netSales: 0,
                tips: 0,
                tipPercent: 0,
                transactions: 0
              };
            }
            serverStats[serverName].hourlyBreakdown[hourKey].netSales += checkAmount;
            serverStats[serverName].hourlyBreakdown[hourKey].transactions++;

            // Add tips to hourly
            if (check.payments && Array.isArray(check.payments)) {
              for (const payment of check.payments) {
                if (payment.voided !== true && payment.paymentStatus !== 'VOIDED') {
                  const tipAmount = payment.tipAmount || 0;
                  hourlyStats[hourKey].tips += tipAmount;
                  serverStats[serverName].hourlyBreakdown[hourKey].tips += tipAmount;
                }
              }
            }
          }
        }
      }
    }

    // STEP 5: Calculate tip percentages
    Object.values(serverStats).forEach(server => {
      if (server.netSales > 0) {
        server.tipPercent = (server.tips / server.netSales) * 100;
      }

      // Calculate tip % for hourly breakdown
      Object.values(server.hourlyBreakdown).forEach(hour => {
        if (hour.netSales > 0) {
          hour.tipPercent = (hour.tips / hour.netSales) * 100;
        }
      });
    });

    // Calculate hourly tip percentages
    Object.values(hourlyStats).forEach(hour => {
      if (hour.netSales > 0) {
        hour.tipPercent = (hour.tips / hour.netSales) * 100;
      }
    });

    // STEP 6: Sort servers by different metrics for leaderboards
    const serverArray = Object.values(serverStats);

    const topByNetSales = [...serverArray].sort((a, b) => b.netSales - a.netSales);
    const topByTips = [...serverArray].sort((a, b) => b.tips - a.tips);
    const topByTipPercent = [...serverArray].sort((a, b) => b.tipPercent - a.tipPercent);
    const topByCombos = [...serverArray].sort((a, b) => b.combosSold - a.combosSold);

    // STEP 7: Sort hourly stats
    const hourlyArray = Object.values(hourlyStats).sort((a, b) => {
      return a.hour.localeCompare(b.hour);
    });

    console.log(`📊 Server stats calculated for ${serverArray.length} servers`);
    console.log(`💰 Total net sales: $${totalNetSales.toFixed(2)}`);
    console.log(`💵 Total tips: $${totalTips.toFixed(2)}`);
    console.log(`🍔 Total combos: ${totalCombosSold}`);

    return res.json({
      success: true,
      date: targetDate,
      businessDate: businessDate,

      // Overall stats
      overall: {
        netSales: totalNetSales,
        tips: totalTips,
        tipPercent: totalNetSales > 0 ? (totalTips / totalNetSales) * 100 : 0,
        combosSold: totalCombosSold,
        totalOrders: allOrders.length,
        serversWorking: serverArray.length
      },

      // Server leaderboards
      leaderboards: {
        byNetSales: topByNetSales.map((s, i) => ({ rank: i + 1, ...s })),
        byTips: topByTips.map((s, i) => ({ rank: i + 1, ...s })),
        byTipPercent: topByTipPercent.map((s, i) => ({ rank: i + 1, ...s })),
        byCombos: topByCombos.map((s, i) => ({ rank: i + 1, ...s }))
      },

      // All server stats
      servers: serverArray,

      // Hourly breakdown
      hourly: hourlyArray
    });

  } catch (error) {
    console.error('❌ Toast Server Stats API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get Pacific Time date range (5am today to now)
 * Copied from toast-employee-performance.js
 */
function getPacificTimeRange(targetDate) {
  // Parse the target date (YYYY-MM-DD format)
  const dateParts = targetDate.split('-');
  const year = parseInt(dateParts[0]);
  const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
  const day = parseInt(dateParts[2]);

  // Create Pacific time date at 5am
  const pacificDate = new Date();
  const pacificTimeString = pacificDate.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
  const nowPacific = new Date(pacificTimeString);

  // Set to 5am on target date
  const startOfDay = new Date(year, month, day, 5, 0, 0, 0);

  // End is now (or end of day if querying past date)
  const endOfDay = new Date(year, month, day, 23, 59, 59, 999);
  const endTime = nowPacific > endOfDay ? endOfDay : nowPacific;

  return {
    startDate: startOfDay.toISOString(),
    endDate: endTime.toISOString()
  };
}
