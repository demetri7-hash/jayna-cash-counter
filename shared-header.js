/**
 * Shared Header Component
 * Used across all Jayna Gyro management pages for consistent navigation
 *
 * Usage:
 * 1. Include this script in your HTML: <script src="shared-header.js"></script>
 * 2. Add empty div: <div id="sharedHeader"></div>
 * 3. Call: initializeSharedHeader()
 */

// Supabase client (shared across all pages)
const SUPABASE_URL = 'https://gaawtbqpnnbbnsyswqwv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhYXd0YnFwbm5iYm5zeXN3cXd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MDE1NTAsImV4cCI6MjA3MjA3NzU1MH0.F-y7AIQTWaUe7DRT4OnIZVn94mhXxfhpBbng2aJ8nXg';

let supabaseClient = null;

function initializeSharedHeader() {
  const headerContainer = document.getElementById('sharedHeader');
  if (!headerContainer) {
    console.error('❌ No #sharedHeader element found');
    return;
  }

  // Initialize Supabase if not already done
  if (window.supabase && !supabaseClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  headerContainer.innerHTML = `
    <div class="header" style="background: var(--white); color: var(--gray-900); text-align: center; padding: 12px; border-radius: 0; border-bottom: 1px solid var(--gray-300);">
      <img src="jayna-logo.png" alt="Jayna Gyro Logo" style="width: 80px; height: 80px; margin-bottom: 12px;">
      <h1 style="margin-bottom: 4px; font-size: 18px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">JAYNA GYRO</h1>
      <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 4px; letter-spacing: 1.5px;">MANAGER PORTAL</h2>
      <p style="font-size: 11px; font-weight: 500; letter-spacing: 1px; margin-bottom: 8px;">FOR AUTHORIZED USE ONLY</p>

      <!-- CURRENTLY CLOCKED IN -->
      <div id="clockedInContainer" style="margin: 8px 0; text-align: center;">
        <div id="clockedInList" style="color: #2e7d32; font-size: 12px; font-weight: 500;">
          Loading...
        </div>
      </div>

      <!-- TIPS PER HOUR (LIVE) -->
      <div id="tipsPerHourContainer" style="margin: 12px auto 12px auto; max-width: 400px; text-align: center; padding: 12px; background: var(--gray-100); border: 2px solid var(--gray-300);">
        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--gray-600); margin-bottom: 6px; letter-spacing: 0.5px;">
          TODAY'S PERFORMANCE
        </div>
        <div id="tipsPerHourDisplay" style="font-size: 24px; font-weight: 700; color: var(--gray-900);">
          Loading...
        </div>
        <div id="tipsPerHourTrend" style="font-size: 11px; font-weight: 600; margin-top: 6px;">
          <!-- Trend indicator will appear here -->
        </div>
        <div style="font-size: 9px; color: var(--gray-500); margin-top: 8px; font-style: italic;">
          ⚠️ Live estimate - not 100% accurate
        </div>
        <button onclick="showLeaderboard()" style="margin-top: 10px; padding: 8px 16px; background: var(--gray-700); border: 2px solid var(--gray-700); color: white; font-size: 11px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px;">
          🏆 View Leaderboard
        </button>
      </div>

      <!-- LEADERBOARD MODAL (hidden by default) -->
      <div id="leaderboardModal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 10000; overflow-y: auto; padding: 20px;">
        <div style="background: white; padding: 24px; max-width: 600px; margin: 40px auto; border: 3px solid var(--gray-700); position: relative;">
          <button onclick="closeLeaderboard()" style="position: absolute; top: 10px; right: 10px; background: #dc2626; border: none; color: white; font-size: 18px; width: 30px; height: 30px; cursor: pointer; font-weight: 700;">✕</button>

          <h2 style="margin-bottom: 16px; font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; text-align: center;">🏆 TODAY'S LEADERBOARD</h2>

          <div id="leaderboardContent" style="margin-top: 20px;">
            <div style="text-align: center; padding: 40px; color: var(--gray-500);">
              Loading leaderboard...
            </div>
          </div>
        </div>
      </div>

      <p style="opacity: 0.7;">App created by Demetri Gregorakis</p>
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

    <div class="content" style="padding: 12px;">
      <!-- Main Menu -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px;">
        <a href="index.html" class="menu-btn primary" style="text-decoration: none; padding: 16px 12px; border: 2px solid var(--gray-300); border-radius: 0; background: var(--gray-100); font-size: 11px; font-weight: 700; color: var(--gray-900); cursor: pointer; text-align: center; min-height: 50px; display: flex; align-items: center; justify-content: center; text-transform: uppercase; letter-spacing: 1.2px; transition: all 0.15s ease;">Cash</a>
        <a href="index.html" class="menu-btn" style="text-decoration: none; padding: 16px 12px; border: 2px solid var(--gray-700); border-radius: 0; background: var(--gray-700); font-size: 11px; font-weight: 700; color: white; cursor: pointer; text-align: center; min-height: 50px; display: flex; align-items: center; justify-content: center; text-transform: uppercase; letter-spacing: 1.2px; transition: all 0.15s ease;">Orders & Prep</a>
        <a href="foh-checklists.html" class="menu-btn primary" style="text-decoration: none; padding: 16px 12px; border: 2px solid var(--gray-300); border-radius: 0; background: var(--gray-100); font-size: 11px; font-weight: 700; color: var(--gray-900); cursor: pointer; text-align: center; min-height: 50px; display: flex; align-items: center; justify-content: center; text-transform: uppercase; letter-spacing: 1.2px; transition: all 0.15s ease;">FOH</a>
        <a href="boh.html" class="menu-btn" style="text-decoration: none; padding: 16px 12px; border: 2px solid var(--gray-700); border-radius: 0; background: var(--gray-700); font-size: 11px; font-weight: 700; color: white; cursor: pointer; text-align: center; min-height: 50px; display: flex; align-items: center; justify-content: center; text-transform: uppercase; letter-spacing: 1.2px; transition: all 0.15s ease;">BOH</a>
        <a href="catering.html" class="menu-btn primary" style="text-decoration: none; padding: 16px 12px; border: 2px solid var(--gray-300); border-radius: 0; background: var(--gray-100); font-size: 11px; font-weight: 700; color: var(--gray-900); cursor: pointer; text-align: center; min-height: 50px; display: flex; align-items: center; justify-content: center; text-transform: uppercase; letter-spacing: 1.2px; transition: all 0.15s ease;">Catering</a>
        <a href="drivers.html" class="menu-btn" style="text-decoration: none; padding: 16px 12px; border: 2px solid var(--gray-700); border-radius: 0; background: var(--gray-700); font-size: 11px; font-weight: 700; color: white; cursor: pointer; text-align: center; min-height: 50px; display: flex; align-items: center; justify-content: center; text-transform: uppercase; letter-spacing: 1.2px; transition: all 0.15s ease;">Drivers</a>
        <a href="scheduling.html" class="menu-btn primary" style="text-decoration: none; padding: 16px 12px; border: 2px solid var(--gray-300); border-radius: 0; background: var(--gray-100); font-size: 11px; font-weight: 700; color: var(--gray-900); cursor: pointer; text-align: center; min-height: 50px; display: flex; align-items: center; justify-content: center; text-transform: uppercase; letter-spacing: 1.2px; transition: all 0.15s ease;">Scheduling</a>
        <a href="manager.html" class="menu-btn" style="text-decoration: none; padding: 16px 12px; border: 2px solid var(--gray-700); border-radius: 0; background: var(--gray-700); font-size: 11px; font-weight: 700; color: white; cursor: pointer; text-align: center; min-height: 50px; display: flex; align-items: center; justify-content: center; text-transform: uppercase; letter-spacing: 1.2px; transition: all 0.15s ease;">Manager</a>
      </div>
    </div>
  `;

  // Initialize clocked-in employees display
  fetchClockedInEmployees();
  setInterval(fetchClockedInEmployees, 5 * 60 * 1000); // Refresh every 5 minutes

  // Initialize tips per hour display
  fetchTipsPerHour();
  setInterval(fetchTipsPerHour, 5 * 60 * 1000); // Refresh every 5 minutes

  // Initialize session status
  updateSessionStatus();
  setInterval(updateSessionStatus, 60000); // Update every minute
}

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

    // STEP 1: Authenticate with Toast API
    const authResponse = await fetch('/api/toast-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!authResponse.ok) {
      updateClockedInDisplay([]);
      return;
    }

    const authData = await authResponse.json();
    if (!authData.success || !authData.data?.accessToken) {
      updateClockedInDisplay([]);
      return;
    }

    const token = authData.data.accessToken;

    // STEP 2: Fetch clocked-in employees
    const clockedInUrl = `/api/toast-clocked-in?date=${today}&token=${encodeURIComponent(token)}`;
    const response = await fetch(clockedInUrl);

    if (!response.ok) {
      updateClockedInDisplay([]);
      return;
    }

    const result = await response.json();

    if (!result.success) {
      updateClockedInDisplay([]);
      return;
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

    if (result.success) {
      updateTipsPerHourDisplay(result.data);
    } else {
      updateTipsPerHourDisplay(null);
    }
  } catch (error) {
    console.error('❌ Error fetching tips per hour:', error);
    updateTipsPerHourDisplay(null);
  }
}

function updateTipsPerHourDisplay(data) {
  const displayDiv = document.getElementById('tipsPerHourDisplay');
  const trendDiv = document.getElementById('tipsPerHourTrend');

  if (!displayDiv || !trendDiv) return;

  if (!data) {
    displayDiv.textContent = 'N/A';
    displayDiv.style.color = 'var(--gray-500)';
    trendDiv.innerHTML = '<span style="color: var(--gray-500); font-size: 10px;">Unable to calculate</span>';
    return;
  }

  // Display tips per hour
  displayDiv.textContent = `$${data.tipsPerHour.toFixed(2)}/hr`;

  // Build trend indicators
  let trendHTML = '';

  // Yesterday comparison
  if (data.trendingUp === true) {
    displayDiv.style.color = '#059669'; // Green
    trendHTML += `
      <div style="color: #059669; margin-bottom: 4px;">
        ↑ ${data.percentChangeFromYesterday > 0 ? '+' : ''}${data.percentChangeFromYesterday}% vs yesterday
      </div>
    `;
  } else if (data.trendingUp === false) {
    displayDiv.style.color = '#dc2626'; // Red
    trendHTML += `
      <div style="color: #dc2626; margin-bottom: 4px;">
        ↓ ${data.percentChangeFromYesterday}% vs yesterday
      </div>
    `;
  } else {
    displayDiv.style.color = 'var(--gray-900)';
  }

  // Week comparison
  if (data.trendingUpWeek === true) {
    trendHTML += `
      <div style="color: #059669; margin-bottom: 4px;">
        ↑ ${data.percentChangeFromLastWeek > 0 ? '+' : ''}${data.percentChangeFromLastWeek}% vs last week
      </div>
    `;
  } else if (data.trendingUpWeek === false) {
    trendHTML += `
      <div style="color: #dc2626; margin-bottom: 4px;">
        ↓ ${data.percentChangeFromLastWeek}% vs last week
      </div>
    `;
  }

  // Month comparison
  if (data.trendingUpMonth === true) {
    trendHTML += `
      <div style="color: #059669;">
        ↑ ${data.percentChangeFromLastMonth > 0 ? '+' : ''}${data.percentChangeFromLastMonth}% vs last month
      </div>
    `;
  } else if (data.trendingUpMonth === false) {
    trendHTML += `
      <div style="color: #dc2626;">
        ↓ ${data.percentChangeFromLastMonth}% vs last month
      </div>
    `;
  }

  // If no data at all
  if (!trendHTML) {
    trendHTML = '<span style="color: var(--gray-600); font-size: 10px;">Building historical data...</span>';
  }

  trendDiv.innerHTML = trendHTML;
}

function isManagerSessionValid() {
  const sessionExpiry = localStorage.getItem('managerSession');
  if (!sessionExpiry) return false;

  const now = new Date().getTime();
  const expiryTime = parseInt(sessionExpiry);

  if (now > expiryTime) {
    localStorage.removeItem('managerSession');
    return false;
  }

  return true;
}

function clearManagerSession() {
  localStorage.removeItem('managerSession');
}

function logoutManager() {
  clearManagerSession();
  updateSessionStatus();
  alert('Manager session ended');
}

function updateSessionStatus() {
  const statusElement = document.getElementById('sessionStatus');
  const logoutBtn = document.getElementById('logoutBtn');

  if (!statusElement || !logoutBtn) return;

  if (isManagerSessionValid()) {
    const sessionExpiry = localStorage.getItem('managerSession');
    const expiryTime = parseInt(sessionExpiry);
    const now = new Date().getTime();
    const remainingMinutes = Math.ceil((expiryTime - now) / (60 * 1000));

    statusElement.textContent = `Manager access: ${remainingMinutes} min remaining`;
    statusElement.style.color = '#28a745';
    logoutBtn.style.display = 'inline-block';
  } else {
    statusElement.textContent = '';
    statusElement.style.color = '#666';
    logoutBtn.style.display = 'none';
  }
}

// Leaderboard functions
async function showLeaderboard() {
  const modal = document.getElementById('leaderboardModal');
  const content = document.getElementById('leaderboardContent');

  if (!modal || !content) return;

  modal.style.display = 'block';
  content.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--gray-500);">Loading leaderboard...</div>';

  try {
    const response = await fetch('/api/toast-employee-performance', {
      method: 'POST'
    });

    if (!response.ok) {
      content.innerHTML = '<div style="text-align: center; padding: 40px; color: #dc2626;">Failed to load leaderboard</div>';
      return;
    }

    const result = await response.json();

    if (!result.success || !result.data || !result.data.leaderboard) {
      content.innerHTML = '<div style="text-align: center; padding: 40px; color: #dc2626;">No leaderboard data available</div>';
      return;
    }

    displayLeaderboard(result.data.leaderboard);

  } catch (error) {
    console.error('❌ Error loading leaderboard:', error);
    content.innerHTML = '<div style="text-align: center; padding: 40px; color: #dc2626;">Error loading leaderboard</div>';
  }
}

function closeLeaderboard() {
  const modal = document.getElementById('leaderboardModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function displayLeaderboard(leaderboard) {
  const content = document.getElementById('leaderboardContent');
  if (!content) return;

  if (leaderboard.length === 0) {
    content.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--gray-500);">No employees with tips today</div>';
    return;
  }

  let html = '';

  leaderboard.forEach((emp, index) => {
    // Medal emojis for top 3
    let rankDisplay = `#${emp.rank}`;
    if (emp.rank === 1) rankDisplay = '🥇';
    if (emp.rank === 2) rankDisplay = '🥈';
    if (emp.rank === 3) rankDisplay = '🥉';

    // Color code based on performance
    let tipsColor = '#059669'; // Green for top performers
    if (emp.rank > 3) tipsColor = 'var(--gray-700)';

    html += `
      <div style="padding: 16px; border-bottom: 1px solid var(--gray-300); display: grid; grid-template-columns: 50px 1fr auto; gap: 12px; align-items: center;">
        <div style="font-size: 24px; font-weight: 700; text-align: center;">
          ${rankDisplay}
        </div>
        <div>
          <div style="font-size: 14px; font-weight: 700; color: var(--gray-900); margin-bottom: 4px;">
            ${emp.name}
          </div>
          <div style="font-size: 11px; color: var(--gray-600);">
            ${emp.hoursWorked.toFixed(1)}h worked • ${emp.ordersServed} orders
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 18px; font-weight: 700; color: ${tipsColor};">
            $${emp.tipsPerHour.toFixed(2)}/hr
          </div>
          <div style="font-size: 11px; color: var(--gray-600);">
            $${emp.totalTips.toFixed(2)} total
          </div>
        </div>
      </div>
    `;
  });

  content.innerHTML = html;
}

// Close modal on outside click
document.addEventListener('click', function(e) {
  const modal = document.getElementById('leaderboardModal');
  if (modal && e.target === modal) {
    closeLeaderboard();
  }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initializeSharedHeader, supabaseClient };
}
