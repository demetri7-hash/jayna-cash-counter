/**
 * Toast Server Stats API
 * Fetches today's orders and breaks down stats by server
 *
 * Returns:
 * - All-day stats: net sales, tips, tip %, combos sold
 * - Hourly breakdown for each metric
 * - Per-server stats
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

    // STEP 1: Fetch ALL employees (to get server names) - EXACT PATTERN FROM toast-clocked-in.js
    const employeesUrl = `${TOAST_CONFIG.baseUrl}/labor/v1/employees`;
    console.log('Fetching employees list...');

    const employeesResponse = await fetch(employeesUrl, {
      method: 'GET',
      headers
    });

    if (!employeesResponse.ok) {
      console.error(`Failed to fetch employees: ${employeesResponse.status}`);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch employees from Toast'
      });
    }

    const employees = await employeesResponse.json();
    console.log(`✅ Found ${employees.length} employees`);

    // Create employee map by GUID for fast lookup
    const employeeMap = {};
    employees.forEach(emp => {
      employeeMap[emp.guid] = emp;
    });

    // STEP 2: Fetch ALL orders for the business date with pagination
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

    // STEP 2: Process orders and group by server
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

          // Get server name from check using employee map lookup
          const serverGuid = check.server?.guid;

          let serverName = 'Unassigned';
          if (serverGuid && employeeMap[serverGuid]) {
            const employee = employeeMap[serverGuid];
            const firstName = employee.firstName || '';
            const lastName = employee.lastName || '';
            serverName = `${firstName} ${lastName}`.trim() || 'Unassigned';
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

    // STEP 3: Calculate tip percentages
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

    // STEP 4: Sort servers by different metrics for leaderboards
    const serverArray = Object.values(serverStats);

    const topByNetSales = [...serverArray].sort((a, b) => b.netSales - a.netSales);
    const topByTips = [...serverArray].sort((a, b) => b.tips - a.tips);
    const topByTipPercent = [...serverArray].sort((a, b) => b.tipPercent - a.tipPercent);
    const topByCombos = [...serverArray].sort((a, b) => b.combosSold - a.combosSold);

    // STEP 5: Sort hourly stats
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
