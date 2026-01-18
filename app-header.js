/**
 * app-header.js - Unified Header System for Jayna Gyro Cash Counter
 * Injects shared header across all pages
 * Created: November 3, 2025
 */

// Render the shared header
function renderSharedHeader() {
  const headerDiv = document.getElementById('appHeader');
  if (!headerDiv) {
    console.error('appHeader div not found');
    return;
  }

  const headerHTML = `
    <!-- Password Modal -->
    <div id="passwordModal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 99999; align-items: center; justify-content: center;">
      <div style="background: white; padding: 24px; max-width: 400px; width: 90%; border: 3px solid var(--gray-700);">
        <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">PASSWORD REQUIRED</h3>
        <p id="passwordModalLabel" style="margin-bottom: 12px; font-size: 13px; color: var(--gray-700);"></p>
        <input type="password" id="passwordInput" style="width: 100%; padding: 12px; border: 2px solid var(--gray-300); font-size: 14px; margin-bottom: 16px; box-sizing: border-box;">
        <div style="display: flex; gap: 12px;">
          <button onclick="window.closePasswordModal()" style="flex: 1; padding: 12px; background: var(--gray-100); border: 2px solid var(--gray-300); color: var(--gray-900); font-size: 13px; font-weight: 700; text-transform: uppercase; cursor: pointer;">CANCEL</button>
          <button onclick="window.submitPassword()" style="flex: 1; padding: 12px; background: var(--gray-900); border: 2px solid var(--gray-900); color: white; font-size: 13px; font-weight: 700; text-transform: uppercase; cursor: pointer;">SUBMIT</button>
        </div>
        <div id="passwordError" style="margin-top: 12px; color: #dc2626; font-size: 12px; font-weight: 600; display: none;"></div>
      </div>
    </div>

    <div class="header" style="padding-top: 20px;">
      <img src="jayna-logo-new.png" alt="Jayna Gyro Logo" class="logo" style="max-width: 576px; width: 100%; height: auto; display: block; margin: 0 auto;">
      <h1>JAYNA GYRO</h1>
      <p style="opacity: 0.7;">FOR AUTHORIZED USE ONLY</p>

      <!-- CURRENTLY CLOCKED IN -->
      <div id="clockedInContainer" style="margin: 8px 0; text-align: center;">
        <div id="clockedInList" style="color: #2e7d32; font-size: 12px; font-weight: 500;">
          Loading...
        </div>

        <!-- COMBINED TIPS/HR & LEADER DISPLAY (JAYNA BLUE GRADIENT) -->
        <div id="tipsPerHourCard" style="margin-top: 12px; padding: 8px 12px; background: linear-gradient(135deg, #00A8E1 0%, #0094D6 100%); border: 2px solid #00A8E1; border-radius: 0; position: relative; box-shadow: 0 3px 5px rgba(0,0,0,0.1); transition: all 0.3s ease; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; align-items: center;">

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

          <!-- CENTER COLUMN: FOOT TRAFFIC (CLICKABLE) -->
          <div onclick="window.location.href='foot-traffic-analytics.html'" style="text-align: center; padding: 4px; border-left: 1px solid rgba(255,255,255,0.3); border-right: 1px solid rgba(255,255,255,0.3); cursor: pointer; transition: all 0.15s ease;">
            <div style="font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: rgba(255,255,255,0.85); margin-bottom: 3px;">
              🚶 FOOT TRAFFIC
            </div>
            <div id="footTrafficLatestHour" style="font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 2px;">
              --
            </div>
            <div style="font-size: 7px; color: rgba(255,255,255,0.6); margin-bottom: 3px;">
              Latest Hour
            </div>
            <div id="footTrafficDailyTotal" style="font-size: 15px; font-weight: 900; color: #fff;">
              --
            </div>
            <div style="font-size: 7px; color: rgba(255,255,255,0.6); font-style: italic;">
              Click for Analytics →
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

      <!-- MAIN MENU NAVIGATION -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 20px; margin-bottom: 20px;">
        <button onclick="window.requirePasswordFor('Cash', window.accessCash, 'jaynacash')" style="text-decoration: none; display: block; padding: 14px; background: var(--gray-900); color: white; border: 2px solid var(--gray-900); text-align: center; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; transition: all 0.15s ease;">CASH</button>
        <a href="orders-prep.html" style="text-decoration: none; display: block; padding: 14px; background: var(--gray-700); color: white; border: 2px solid var(--gray-700); text-align: center; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; transition: all 0.15s ease;">ORDERS & PREP</a>
        <a href="foh-checklists.html" style="text-decoration: none; display: block; padding: 14px; background: var(--gray-900); color: white; border: 2px solid var(--gray-900); text-align: center; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; transition: all 0.15s ease;">FOH</a>
        <a href="boh.html" style="text-decoration: none; display: block; padding: 14px; background: var(--gray-700); color: white; border: 2px solid var(--gray-700); text-align: center; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; transition: all 0.15s ease;">BOH</a>
        <a href="catering.html" style="text-decoration: none; display: block; padding: 14px; background: var(--gray-900); color: white; border: 2px solid var(--gray-900); text-align: center; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; transition: all 0.15s ease;">CATERING</a>
        <a href="foot-traffic-analytics.html" style="text-decoration: none; display: block; padding: 14px; background: var(--gray-700); color: white; border: 2px solid var(--gray-700); text-align: center; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; transition: all 0.15s ease;">ANALYTICS</a>
        <button onclick="window.requirePasswordFor('Manager Portal', window.accessManagerPortal, 'Alonissos325*')" style="display: block; width: 100%; padding: 14px; background: var(--gray-900); color: white; border: 2px solid var(--gray-900); text-align: center; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; transition: all 0.15s ease; grid-column: 1 / -1;">MANAGER</button>
      </div>

      <p style="opacity: 0.7; margin-top: 12px;">APP CREATED BY DEMETRI GREGORAKIS</p>
      <div style="font-size: 12px; color: #666; margin-top: 5px;">
        <span id="sessionStatus"></span>
        <button id="logoutBtn" onclick="logoutManager()" style="
          background: #f44336;
          color: white;
          border: none;
          padding: 2px 8px;
          border-radius: 0;
          font-size: 10px;
          margin-left: 10px;
          cursor: pointer;
          display: none;
        ">Logout Manager</button>
      </div>
    </div>
  `;

  headerDiv.innerHTML = headerHTML;

  // Initialize live stats after header is rendered
  initializeLiveStats();
}

// Auto-run when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderSharedHeader);
} else {
  renderSharedHeader();
}

// Password protection system (USES OLD WORKING METHOD)
window.managerPasswordCallback = null;
let currentPasswordRequired = null;
let currentPasswordLabel = null;

window.requirePasswordFor = function(label, callback, password) {
  window.managerPasswordCallback = callback;
  currentPasswordRequired = password;
  currentPasswordLabel = label;

  const modal = document.getElementById('passwordModal');
  const labelEl = document.getElementById('passwordModalLabel');
  const inputEl = document.getElementById('passwordInput');
  const errorEl = document.getElementById('passwordError');

  if (modal && labelEl && inputEl) {
    labelEl.textContent = `Enter password to access ${label}:`;
    inputEl.value = '';
    errorEl.style.display = 'none';
    modal.style.display = 'flex';

    // Allow Enter key to submit
    inputEl.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        window.submitPassword();
      }
    });
  }
};

window.submitPassword = async function() {
  const inputEl = document.getElementById('passwordInput');
  const errorEl = document.getElementById('passwordError');
  const modal = document.getElementById('passwordModal');

  if (!inputEl || !errorEl) return;

  const enteredPassword = inputEl.value;

  // Check hardcoded password
  if (enteredPassword === currentPasswordRequired) {
    // Correct password! Close modal and execute callback
    if (modal) modal.style.display = 'none';
    if (window.managerPasswordCallback) {
      window.managerPasswordCallback();
    }
    return;
  }

  // Wrong password
  errorEl.textContent = '❌ Incorrect password. Please try again.';
  errorEl.style.display = 'block';
  inputEl.value = '';
};

window.closePasswordModal = function() {
  const modal = document.getElementById('passwordModal');
  const inputEl = document.getElementById('passwordInput');
  const errorEl = document.getElementById('passwordError');

  if (modal) {
    modal.style.display = 'none';
  }
  if (inputEl) {
    inputEl.value = '';
  }
  if (errorEl) {
    errorEl.style.display = 'none';
  }

  window.managerPasswordCallback = null;
  currentPasswordRequired = null;
  currentPasswordLabel = null;
};

// Navigation callback functions (called AFTER password validation)
window.accessCash = function() {
  window.location.href = 'cash.html';
};

window.accessManager = function() {
  window.location.href = 'tip-pool.html';
};

window.accessManagerPortal = function() {
  window.location.href = 'manager-portal.html';
};

window.accessIncidents = function() {
  window.location.href = 'incidents.html';
};

// ============================================
// LIVE STATS SYSTEM (Clocked In, Tips/HR, Leader, Void Tracking)
// ============================================

let lastTipsUpdate = null;

// Initialize all live stats
function initializeLiveStats() {
  console.log('🔄 Initializing live stats for header...');

  // Initial fetch for all stats
  fetchClockedInEmployees();
  fetchTipsPerHour();
  fetchTopLeader();
  fetchVoidDiscountTracking();
  fetchFootTraffic();

  // Set up refresh intervals
  setInterval(fetchClockedInEmployees, 5 * 60 * 1000); // Every 5 minutes
  setInterval(fetchTipsPerHour, 30 * 1000); // Every 30 seconds
  setInterval(fetchTopLeader, 2 * 60 * 1000); // Every 2 minutes
  setInterval(fetchVoidDiscountTracking, 5 * 60 * 1000); // Every 5 minutes
  setInterval(fetchFootTraffic, 30 * 1000); // Every 30 seconds
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

// ==================== TIPS PER HOUR ====================

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

  if (!displayDiv) return;

  if (!data) {
    displayDiv.innerHTML = '<div style="font-size: 14px;">-</div>';
    return;
  }

  const arrow = data.trendingUp ? '↑' : '↓';

  // Main number (large and bold)
  displayDiv.innerHTML = `<div style="font-size: 17px; font-weight: 900; color: #fff; line-height: 1;">
    ${arrow} $${data.tipsPerHour.toFixed(2)}/hr
  </div>`;
}

// ==================== TOP LEADER ====================

async function fetchTopLeader() {
  try {
    // Check if Supabase client is available (look for global supabase variable with .from method)
    if (typeof window.supabase === 'undefined' || !window.supabase.from) {
      // Check if page has initialized a global supabase client
      if (typeof supabase === 'undefined' || !supabase || typeof supabase.from !== 'function') {
        console.error('❌ Supabase client not available for leaderboard (may still be initializing)');
        updateTopLeaderDisplay(null);
        return;
      }
      // Use page-level supabase client
      var supabaseClient = supabase;
    } else {
      // Use window.supabase if it has .from method
      var supabaseClient = window.supabase;
    }

    // Get Pacific time start/end of today (STARTING AT 5AM)
    const nowPacific = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const currentHour = nowPacific.getHours();

    // If it's before 5 AM, we're still in "yesterday's" shift
    const todayStart = new Date(nowPacific);
    if (currentHour < 5) {
      todayStart.setDate(todayStart.getDate() - 1);
      todayStart.setHours(5, 0, 0, 0);
    } else {
      todayStart.setHours(5, 0, 0, 0);
    }

    // End time is tomorrow at 4:59:59 AM
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    todayEnd.setHours(4, 59, 59, 999);

    const startISO = todayStart.toISOString();
    const endISO = todayEnd.toISOString();

    console.log('🏆 Fetching leaderboard data for range:', startISO, 'to', endISO);

    // Fetch FOH tasks
    const { data: tasks, error: tasksError } = await supabaseClient
      .from('foh_checklist_tasks')
      .select('completed_by, completed_at, is_completed')
      .eq('is_completed', true)
      .gte('completed_at', startISO)
      .lte('completed_at', endISO);

    console.log(`📋 Found ${tasks?.length || 0} completed FOH tasks`);

    // Fetch prep count actions
    const { data: prepCounts, error: prepError } = await supabaseClient
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
    displayDiv.textContent = 'No activity yet! 🎯';
    return;
  }

  displayDiv.textContent = `${leader.name} (${leader.count} action${leader.count !== 1 ? 's' : ''}) 🔥`;
}

// ==================== VOID & DISCOUNT TRACKING ====================

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

    // Fetch void/discount tracking data
    const trackingUrl = `/api/toast-void-discount-tracking?startDate=${today}&endDate=${today}&token=${encodeURIComponent(token)}`;

    const response = await fetch(trackingUrl);

    if (!response.ok) {
      updateVoidDiscountDisplay(null);
      return;
    }

    const result = await response.json();

    if (result.success) {
      // API returns data at root level (voidedOrders, discounts, refunds, voidedPayments)
      updateVoidDiscountDisplay(result);
    } else {
      updateVoidDiscountDisplay(null);
    }
  } catch (error) {
    console.error('Error fetching void/discount tracking:', error);
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

  // Extract counts from API response structure
  const voidCount = data.voidedOrders?.count || 0;
  const discountCount = data.discounts?.count || 0;
  const refundCount = data.refunds?.count || 0;
  const voidedPaymentCount = data.voidedPayments?.count || 0;

  displayDiv.textContent = `VOIDED ORDERS: ${voidCount} | DISCOUNTS: ${discountCount} | REFUNDS: ${refundCount} | VOIDED PAYMENTS: ${voidedPaymentCount}`;
}

// ==================== FOOT TRAFFIC ====================

// Initialize Supabase for foot traffic (DIY Tracker database)
const footTrafficSupabase = window.supabase?.createClient ? window.supabase.createClient(
  'https://gaawtbqpnnbbnsyswqwv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhYXd0YnFwbm5iYm5zeXN3cXd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MDE1NTAsImV4cCI6MjA3MjA3NzU1MH0.F-y7AIQTWaUe7DRT4OnIZVn94mhXxfhpBbng2aJ8nXg'
) : null;

// Get today's date in YYYY-MM-DD format (Pacific timezone)
function getTodayDatePacific() {
  const today = new Date();
  const pacificDate = new Date(today.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const year = pacificDate.getFullYear();
  const month = String(pacificDate.getMonth() + 1).padStart(2, '0');
  const day = String(pacificDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function fetchFootTraffic() {
  if (!footTrafficSupabase) {
    console.warn('⚠️ Foot traffic Supabase client not initialized');
    updateFootTrafficDisplay(null, null);
    return;
  }

  try {
    const today = getTodayDatePacific();

    // Query foot_traffic table for today's entries
    const { data, error } = await footTrafficSupabase
      .from('foot_traffic')
      .select('hour, entries')
      .eq('date', today)
      .order('hour', { ascending: false });

    if (error) {
      console.error('Error fetching foot traffic:', error);
      updateFootTrafficDisplay(null, null);
      return;
    }

    // Calculate daily total (sum all entries)
    const dailyTotal = data.reduce((sum, row) => sum + (row.entries || 0), 0);

    // Get latest hour (most recent entry)
    const latestHourData = data.length > 0 ? data[0] : null;
    const latestHourCount = latestHourData ? latestHourData.entries : 0;

    updateFootTrafficDisplay(latestHourCount, dailyTotal);

  } catch (err) {
    console.error('Error updating foot traffic:', err);
    updateFootTrafficDisplay(null, null);
  }
}

function updateFootTrafficDisplay(latestHour, dailyTotal) {
  const latestHourDiv = document.getElementById('footTrafficLatestHour');
  const dailyTotalDiv = document.getElementById('footTrafficDailyTotal');

  if (!latestHourDiv || !dailyTotalDiv) return;

  if (latestHour === null || dailyTotal === null) {
    latestHourDiv.textContent = '--';
    dailyTotalDiv.textContent = '--';
    return;
  }

  latestHourDiv.textContent = latestHour.toLocaleString();
  dailyTotalDiv.textContent = dailyTotal.toLocaleString();
}
