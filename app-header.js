/**
 * APP-HEADER.JS - Unified Header Navigation System
 * Used by all HTML pages for consistent header/nav/stats
 * Created: November 3, 2025
 */

async function renderAppHeader(config = {}) {
  const headerDiv = document.getElementById('appHeader');
  if (!headerDiv) {
    console.error('app-header.js: No element with id="appHeader" found!');
    return;
  }

  // Build header HTML
  const headerHTML = `
    <div class="container">
      <div class="header">
        <img src="jayna-logo.png" alt="Jayna Gyro Logo" style="max-width: 300px; height: auto; display: block; margin: 0 auto 8px auto;">
        <h1 style="font-size: 18px; font-weight: 700; margin-bottom: 2px; letter-spacing: 1.5px; text-transform: uppercase;">JAYNA GYRO</h1>
        <p style="opacity: 0.7; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">FOR AUTHORIZED USE ONLY</p>
      </div>

      <!-- CURRENTLY CLOCKED IN -->
      <div id="clockedInContainer" style="margin: 8px 0; text-align: center;">
        <div id="clockedInList" style="color: #2e7d32; font-size: 12px; font-weight: 500;">
          Loading...
        </div>

        <!-- COMBINED TIPS/HR & LEADER DISPLAY (JAYNA BLUE GRADIENT) -->
        <div id="tipsPerHourCard" style="margin-top: 12px; padding: 8px 12px; background: linear-gradient(135deg, #00A8E1 0%, #0094D6 100%); border: 2px solid #00A8E1; border-radius: 0; position: relative; box-shadow: 0 3px 5px rgba(0,0,0,0.1); transition: all 0.3s ease; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: center;">

          <!-- LIVE Badge -->
          <div style="position: absolute; top: -6px; right: 8px; background: #dc2626; color: white; padding: 2px 6px; font-size: 8px; font-weight: 700; letter-spacing: 0.6px; display: flex; align-items: center; gap: 3px; z-index: 10;">
            <span style="display: inline-block; width: 5px; height: 5px; background: #fff; border-radius: 50%; animation: pulse 1.5s ease-in-out infinite;"></span>
            LIVE
          </div>

          <!-- LEFT COLUMN: TIPS PER HOUR -->
          <div style="text-align: left;">
            <div style="font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: rgba(255,255,255,0.85); margin-bottom: 3px;">
              💵 TIPS/HR
            </div>
            <div id="tipsPerHourText" style="font-size: 17px; font-weight: 900; color: #fff; line-height: 1; margin-bottom: 2px;">
              Loading...
            </div>
            <div style="font-size: 7px; color: rgba(255,255,255,0.6); font-style: italic;">
              Does not include Cash Tips.
            </div>
          </div>

          <!-- RIGHT COLUMN: TODAY'S LEADER (CLICKABLE) -->
          <div id="topLeaderDisplay" onclick="window.location.href='teamupdates.html'" style="text-align: right; cursor: pointer; transition: all 0.15s ease; padding: 4px; border-left: 1px solid rgba(255,255,255,0.3);">
            <div style="font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: rgba(255,255,255,0.85); margin-bottom: 3px;">
              🏆 TODAY'S LEADER
            </div>
            <div id="topLeaderText" style="font-size: 13px; font-weight: 700; color: #fff;">
              Loading...
            </div>
            <div style="font-size: 7px; color: rgba(255,255,255,0.6); margin-top: 2px; font-style: italic;">
              Click for Team Updates →
            </div>
          </div>
        </div>

        <style>
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.2); }
          }
          #topLeaderDisplay:hover {
            background: rgba(255,255,255,0.1);
          }
        </style>
      </div>

      <!-- VOID & DISCOUNT TRACKING DISPLAY -->
      <div id="voidDiscountDisplay" style="margin-top: 12px; padding: 8px 12px; background: var(--gray-100); border: 2px solid var(--gray-300); text-align: center; font-size: 10px; font-weight: 600; color: var(--gray-700); letter-spacing: 0.5px;">
        Loading today's data...
      </div>

      <p style="opacity: 0.7; margin-top: 12px;">APP CREATED BY DEMETRI GREGORAKIS</p>
    </div>

    <div class="content">
      <!-- Main Menu -->
      <div class="main-menu" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px;">
        <a href="cash.html" class="menu-btn ${config.currentPage === 'cash' ? '' : 'primary'}">Cash</a>
        <a href="orders-prep.html" class="menu-btn ${config.currentPage === 'orders' ? '' : 'primary'}">Orders & Prep</a>
        <a href="foh-checklists.html" class="menu-btn ${config.currentPage === 'foh' ? '' : 'primary'}">FOH</a>
        <a href="boh.html" class="menu-btn ${config.currentPage === 'boh' ? '' : 'primary'}">BOH</a>
        <a href="catering.html" class="menu-btn ${config.currentPage === 'catering' ? '' : 'primary'}">Catering</a>
        <a href="drivers.html" class="menu-btn ${config.currentPage === 'drivers' ? '' : 'primary'}">Drivers</a>
        <a href="tip-pool.html" class="menu-btn ${config.currentPage === 'tippool' ? '' : 'primary'}">Manager</a>
        <a href="teamupdates.html" class="menu-btn ${config.currentPage === 'teamupdates' ? '' : 'primary'}">Team Updates</a>
        <a href="scheduling.html" class="menu-btn ${config.currentPage === 'scheduling' ? '' : 'primary'}">Scheduling</a>
      </div>

      <!-- Manager Logs Link -->
      <div style="text-align: center; margin: 16px 0 20px 0;">
        <a href="incidents.html" style="font-size: 11px; font-weight: 600; color: var(--gray-700); text-decoration: none; letter-spacing: 0.8px; padding: 6px 12px; border: 2px solid var(--gray-300); background: white; display: inline-block; transition: all 0.15s ease; cursor: pointer;">MANAGER LOGS</a>
      </div>
    </div>
  `;

  headerDiv.innerHTML = headerHTML;

  // Initialize live stats
  if (config.showLiveStats !== false) {
    initializeLiveStats();
  }
}

function initializeLiveStats() {
  // Fetch on page load
  fetchClockedInEmployees();
  fetchTipsPerHour();
  fetchTopLeader();
  fetchVoidDiscountTracking();

  // Auto-refresh
  setInterval(fetchClockedInEmployees, 5 * 60 * 1000); // 5 minutes
  setInterval(fetchTipsPerHour, 30 * 1000); // 30 seconds
  setInterval(fetchTopLeader, 2 * 60 * 1000); // 2 minutes
  setInterval(fetchVoidDiscountTracking, 5 * 60 * 1000); // 5 minutes
}

// ==================== CLOCKED IN EMPLOYEES ====================

async function fetchClockedInEmployees() {
  try {
    // Get TODAY in YYYY-MM-DD format (Pacific time)
    const todayPacific = new Date().toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const [month, day, year] = todayPacific.split(', ')[0].split('/');
    const today = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    console.log('🍞 Fetching clocked-in employees from Toast for:', today);

    // STEP 1: Authenticate with Toast API
    const authResponse = await fetch('/api/toast-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!authResponse.ok) {
      console.error('❌ Failed to authenticate with Toast API');
      updateClockedInDisplay([]);
      return;
    }

    const authData = await authResponse.json();
    if (!authData.success || !authData.data?.accessToken) {
      console.error('❌ Toast authentication failed');
      updateClockedInDisplay([]);
      return;
    }

    const token = authData.data.accessToken;
    console.log('✅ Toast authenticated');

    // STEP 2: Fetch clocked-in employees via serverless function
    const clockedInUrl = `/api/toast-clocked-in?date=${today}&token=${encodeURIComponent(token)}`;

    console.log('🔍 Fetching clocked-in employees from serverless function');

    const response = await fetch(clockedInUrl);

    if (!response.ok) {
      console.error('❌ Failed to fetch clocked-in employees:', response.status);
      updateClockedInDisplay([]);
      return;
    }

    const result = await response.json();

    if (!result.success) {
      console.error('❌ Clocked-in API error:', result.error);
      updateClockedInDisplay([]);
      return;
    }

    console.log(`📊 Total time entries today: ${result.totalTimeEntries}`);
    console.log(`🟢 Currently clocked in: ${result.count} employees`);

    if (result.clockedIn.length > 0) {
      console.log('✅ Clocked in employees:', result.clockedIn);
    }

    // Extract employee names
    const employees = result.clockedIn.map(emp => emp.fullName);

    updateClockedInDisplay(employees);

  } catch (error) {
    console.error('❌ Error fetching clocked in employees:', error);
    updateClockedInDisplay([]);
  }
}

function updateClockedInDisplay(employees) {
  const listDiv = document.getElementById('clockedInList');

  if (!listDiv) return;

  if (employees.length === 0) {
    listDiv.innerHTML = '<span style="color: #999; font-size: 11px; font-style: italic;">No one clocked in</span>';
    return;
  }

  // Display names in green separated by pipes
  const namesText = employees.join(' | ');
  listDiv.innerHTML = `
    <div style="color: #2e7d32; font-size: 12px; font-weight: 500;">
      ${namesText}
    </div>
    <div style="color: #666; font-size: 9px; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.5px;">
      Clocked In
    </div>
  `;
}

// ==================== TIPS PER HOUR DISPLAY ====================

let lastTipsUpdate = null;

async function fetchTipsPerHour() {
  try {
    const response = await fetch('/api/toast-tips-per-hour-today', {
      method: 'POST'
    });

    if (!response.ok) {
      updateTipsPerHourDisplay(null);
      return;
    }

    const result = await response.json();

    if (result.success && result.data) {
      lastTipsUpdate = new Date();
      updateTipsPerHourDisplay(result.data);
      updateLastUpdatedTime();
    } else {
      updateTipsPerHourDisplay(null);
    }
  } catch (error) {
    console.error('Error fetching tips per hour:', error);
    updateTipsPerHourDisplay(null);
  }
}

function updateTipsPerHourDisplay(data) {
  const displayDiv = document.getElementById('tipsPerHourText');
  const cardDiv = document.getElementById('tipsPerHourCard');

  if (!displayDiv) return;

  if (!data) {
    displayDiv.innerHTML = '<div style="font-size: 14px;">-</div>';
    return;
  }

  // Dynamic card color based on trend
  const bgGradient = data.trendingUp
    ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
    : 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)';
  const borderColor = data.trendingUp ? '#059669' : '#dc2626';

  if (cardDiv) {
    cardDiv.style.background = bgGradient;
    cardDiv.style.borderColor = borderColor;
  }

  const arrow = data.trendingUp ? '↑' : '↓';

  // Main number (large and bold)
  let html = `<div style="font-size: 28px; font-weight: 900; color: #fff; line-height: 1;">
    ${arrow} $${data.tipsPerHour.toFixed(2)}/hr
  </div>`;

  // Comparison stats (smaller, below main number)
  html += `<div style="margin-top: 6px; font-size: 10px; color: rgba(255,255,255,0.85); line-height: 1.4;">`;

  if (data.percentChangeFromLastHour !== null && data.percentChangeFromLastHour !== undefined) {
    const hourArrow = data.percentChangeFromLastHour >= 0 ? '↑' : '↓';
    html += `<div>${hourArrow} ${data.percentChangeFromLastHour > 0 ? '+' : ''}${data.percentChangeFromLastHour}% vs last hour</div>`;
  }

  if (data.percentChangeFromYesterday !== null) {
    const dayArrow = data.percentChangeFromYesterday >= 0 ? '↑' : '↓';
    html += `<div>${dayArrow} ${data.percentChangeFromYesterday > 0 ? '+' : ''}${data.percentChangeFromYesterday.toFixed(1)}% vs yesterday</div>`;
  }

  if (data.percentChangeFromLastWeek !== null) {
    const weekArrow = data.percentChangeFromLastWeek >= 0 ? '↑' : '↓';
    html += `<div>${weekArrow} ${data.percentChangeFromLastWeek > 0 ? '+' : ''}${data.percentChangeFromLastWeek.toFixed(1)}% vs last week</div>`;
  }

  html += `</div>`;

  displayDiv.innerHTML = html;
}

function updateLastUpdatedTime() {
  const lastUpdatedDiv = document.getElementById('tipsLastUpdated');
  if (!lastUpdatedDiv || !lastTipsUpdate) return;

  const now = new Date();
  const diffMs = now - lastTipsUpdate;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);

  let timeAgo = '';
  if (diffMin < 1) {
    timeAgo = 'Just now';
  } else if (diffMin === 1) {
    timeAgo = '1 minute ago';
  } else if (diffMin < 60) {
    timeAgo = `${diffMin} minutes ago`;
  } else {
    const diffHour = Math.floor(diffMin / 60);
    timeAgo = diffHour === 1 ? '1 hour ago' : `${diffHour} hours ago`;
  }

  lastUpdatedDiv.textContent = `LAST UPDATED: ${timeAgo}`;
}

// ==================== TOP LEADER DISPLAY ====================

async function fetchTopLeader() {
  try {
    // Get Pacific time start/end of today (STARTING AT 5AM, NOT MIDNIGHT)
    const nowPacific = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const currentHour = nowPacific.getHours();

    // If it's before 5 AM, we're still in "yesterday's" shift
    const todayStart = new Date(nowPacific);
    if (currentHour < 5) {
      // Use yesterday at 5 AM
      todayStart.setDate(todayStart.getDate() - 1);
      todayStart.setHours(5, 0, 0, 0);
    } else {
      // Use today at 5 AM
      todayStart.setHours(5, 0, 0, 0);
    }

    // End time is tomorrow at 4:59:59 AM (covers the full shift)
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    todayEnd.setHours(4, 59, 59, 999);

    const startISO = todayStart.toISOString();
    const endISO = todayEnd.toISOString();

    console.log('🏆 Fetching leaderboard data for range:', startISO, 'to', endISO);

    // Fetch FOH tasks - need supabase from parent page
    if (typeof supabase === 'undefined') {
      console.warn('⚠️ Supabase not initialized - cannot fetch leader data');
      updateTopLeaderDisplay(null);
      return;
    }

    const { data: tasks, error: tasksError } = await supabase
      .from('foh_checklist_tasks')
      .select('completed_by, completed_at, is_completed')
      .eq('is_completed', true)
      .gte('completed_at', startISO)
      .lte('completed_at', endISO);

    console.log(`📋 Found ${tasks?.length || 0} completed FOH tasks`);

    // Fetch prep count actions
    const { data: prepCounts, error: prepError } = await supabase
      .from('prep_count_log')
      .select('counted_by, counted_at')
      .gte('counted_at', startISO)
      .lte('counted_at', endISO);

    console.log(`📦 Found ${prepCounts?.length || 0} prep count actions`);

    // Combine counts
    const leaderboard = {};

    // Count FOH tasks
    if (tasks && tasks.length > 0) {
      tasks.forEach(task => {
        const name = task.completed_by || 'Unknown';
        if (!leaderboard[name]) {
          leaderboard[name] = { name, count: 0, lastActivity: null };
        }
        leaderboard[name].count++;
        const activityTime = new Date(task.completed_at);
        if (!leaderboard[name].lastActivity || activityTime > leaderboard[name].lastActivity) {
          leaderboard[name].lastActivity = activityTime;
        }
      });
    }

    // Count prep actions
    if (prepCounts && prepCounts.length > 0) {
      prepCounts.forEach(prep => {
        const name = prep.counted_by || 'Unknown';
        if (!leaderboard[name]) {
          leaderboard[name] = { name, count: 0, lastActivity: null };
        }
        leaderboard[name].count++;
        const activityTime = new Date(prep.counted_at);
        if (!leaderboard[name].lastActivity || activityTime > leaderboard[name].lastActivity) {
          leaderboard[name].lastActivity = activityTime;
        }
      });
    }

    // Check if we have any data
    if (Object.keys(leaderboard).length === 0) {
      updateTopLeaderDisplay(null);
      return;
    }

    // Sort and get top leader
    const sortedLeaderboard = Object.values(leaderboard)
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return b.lastActivity - a.lastActivity;
      });

    console.log('📊 Full leaderboard breakdown:');
    sortedLeaderboard.forEach((player, index) => {
      console.log(`  ${index + 1}. ${player.name}: ${player.count} points`);
    });
    console.log('🥇 Top leader:', sortedLeaderboard[0].name, 'with', sortedLeaderboard[0].count, 'points');

    updateTopLeaderDisplay(sortedLeaderboard[0]);

  } catch (error) {
    console.error('Error fetching top leader:', error);
    updateTopLeaderDisplay(null);
  }
}

function updateTopLeaderDisplay(leader) {
  const displayDiv = document.getElementById('topLeaderText');
  if (!displayDiv) return;

  if (!leader) {
    displayDiv.textContent = 'No activity yet today! 🎯';
    return;
  }

  displayDiv.textContent = `${leader.name} is crushing it with ${leader.count} action${leader.count !== 1 ? 's' : ''}! 🔥`;
}

// ==================== VOID & DISCOUNT TRACKING DISPLAY ====================

async function fetchVoidDiscountTracking() {
  try {
    // Get TODAY in YYYY-MM-DD format (Pacific time)
    const todayPacific = new Date().toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const [month, day, year] = todayPacific.split(', ')[0].split('/');
    const today = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    // Authenticate with Toast API
    const authResponse = await fetch('/api/toast-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!authResponse.ok) {
      updateVoidDiscountDisplay(null);
      return;
    }

    const authData = await authResponse.json();
    if (!authData.success || !authData.data?.accessToken) {
      updateVoidDiscountDisplay(null);
      return;
    }

    const token = authData.data.accessToken;

    // Fetch tracking data
    const trackingUrl = `/api/toast-void-discount-tracking?startDate=${today}&endDate=${today}&token=${encodeURIComponent(token)}`;
    const response = await fetch(trackingUrl);

    if (!response.ok) {
      updateVoidDiscountDisplay(null);
      return;
    }

    const trackingData = await response.json();

    if (trackingData.success) {
      updateVoidDiscountDisplay(trackingData);
    } else {
      updateVoidDiscountDisplay(null);
    }
  } catch (error) {
    console.error('❌ Error fetching void/discount tracking:', error);
    updateVoidDiscountDisplay(null);
  }
}

function updateVoidDiscountDisplay(data) {
  const displayDiv = document.getElementById('voidDiscountDisplay');
  if (!displayDiv) return;

  if (!data) {
    displayDiv.innerHTML = '<span style="color: var(--gray-500); font-style: italic;">Unable to load data</span>';
    return;
  }

  // Display counts with | separator
  const voidCount = data.voidedOrders?.count || 0;
  const discountCount = data.discounts?.count || 0;
  const refundCount = data.refunds?.count || 0;
  const voidedPaymentCount = data.voidedPayments?.count || 0;

  displayDiv.innerHTML = `VOIDED ORDERS: ${voidCount} | DISCOUNTS: ${discountCount} | REFUNDS: ${refundCount} | VOIDED PAYMENTS: ${voidedPaymentCount}`;
}
