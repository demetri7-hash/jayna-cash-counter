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
      <img src="jayna-logo-new.png" alt="Jayna Gyro Logo" style="margin-bottom: 12px;">
      <h1 style="margin-bottom: 4px; font-size: 18px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">JAYNA GYRO</h1>
      <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 4px; letter-spacing: 1.5px;">MANAGER PORTAL</h2>
      <p style="font-size: 11px; font-weight: 500; letter-spacing: 1px; margin-bottom: 8px;">FOR AUTHORIZED USE ONLY</p>

      <!-- CURRENTLY CLOCKED IN -->
      <div id="clockedInContainer" style="margin: 8px 0; text-align: center;">
        <div id="clockedInList" style="color: #2e7d32; font-size: 12px; font-weight: 500;">
          Loading...
        </div>
        <!-- LEADERBOARD (inline text below clocked in) -->
        <div id="leaderboardInline" style="margin-top: 8px; font-size: 9px; line-height: 1.4;">
          <!-- Leaderboard will appear here -->
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
        <a href="training.html" class="menu-btn primary" style="text-decoration: none; padding: 16px 12px; border: 2px solid var(--gray-300); border-radius: 0; background: var(--gray-100); font-size: 11px; font-weight: 700; color: var(--gray-900); cursor: pointer; text-align: center; min-height: 50px; display: flex; align-items: center; justify-content: center; text-transform: uppercase; letter-spacing: 1.2px; transition: all 0.15s ease;">Training</a>
        <button onclick="checkCogsPassword()" class="menu-btn" style="padding: 16px 12px; border: 2px solid #dc2626; border-radius: 0; background: #dc2626; font-size: 11px; font-weight: 700; color: white; cursor: pointer; text-align: center; min-height: 50px; display: flex; align-items: center; justify-content: center; text-transform: uppercase; letter-spacing: 1.2px; transition: all 0.15s ease;">COGS</button>
      </div>
    </div>
  `;

  // Initialize clocked-in employees display
  fetchClockedInEmployees();
  setInterval(fetchClockedInEmployees, 5 * 60 * 1000); // Refresh every 5 minutes

  // Initialize tips per hour display
  fetchTipsPerHour();
  setInterval(fetchTipsPerHour, 5 * 60 * 1000); // Refresh every 5 minutes

  // Initialize inline leaderboard display
  fetchInlineLeaderboard();
  setInterval(fetchInlineLeaderboard, 5 * 60 * 1000); // Refresh every 5 minutes

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

  // Display tips per hour with hour-over-hour percentage
  let mainDisplayText = `$${data.tipsPerHour.toFixed(2)}/hr`;

  // Add hour-over-hour percentage and "vs. last hour" if available
  if (data.percentChangeFromLastHour !== null && data.percentChangeFromLastHour !== undefined) {
    mainDisplayText += ` ${data.percentChangeFromLastHour > 0 ? '+' : ''}${data.percentChangeFromLastHour}% vs. last hour`;
  }

  displayDiv.textContent = mainDisplayText;

  // Build trend indicators
  let trendHTML = '';

  // Main tips/hr display color (hour-over-hour trending)
  if (data.trendingUp === true) {
    displayDiv.style.color = '#059669'; // Green (hour-over-hour up)
  } else if (data.trendingUp === false) {
    displayDiv.style.color = '#dc2626'; // Red (hour-over-hour down)
  } else {
    displayDiv.style.color = 'var(--gray-900)';
  }

  // Yesterday comparison (check actual sign of percentChangeFromYesterday)
  if (data.percentChangeFromYesterday !== null && data.percentChangeFromYesterday !== undefined) {
    const color = data.percentChangeFromYesterday >= 0 ? '#059669' : '#dc2626';
    const arrow = data.percentChangeFromYesterday >= 0 ? '↑' : '↓';
    trendHTML += `
      <div style="color: ${color}; margin-bottom: 4px;">
        ${arrow} ${data.percentChangeFromYesterday > 0 ? '+' : ''}${data.percentChangeFromYesterday}% vs yesterday
      </div>
    `;
  }

  // Week comparison (check actual sign of percentChangeFromLastWeek)
  if (data.percentChangeFromLastWeek !== null && data.percentChangeFromLastWeek !== undefined) {
    const color = data.percentChangeFromLastWeek >= 0 ? '#059669' : '#dc2626';
    const arrow = data.percentChangeFromLastWeek >= 0 ? '↑' : '↓';
    trendHTML += `
      <div style="color: ${color}; margin-bottom: 4px;">
        ${arrow} ${data.percentChangeFromLastWeek > 0 ? '+' : ''}${data.percentChangeFromLastWeek}% vs last week
      </div>
    `;
  }

  // Month comparison (check actual sign of percentChangeFromLastMonth)
  if (data.percentChangeFromLastMonth !== null && data.percentChangeFromLastMonth !== undefined) {
    const color = data.percentChangeFromLastMonth >= 0 ? '#059669' : '#dc2626';
    const arrow = data.percentChangeFromLastMonth >= 0 ? '↑' : '↓';
    trendHTML += `
      <div style="color: ${color};">
        ${arrow} ${data.percentChangeFromLastMonth > 0 ? '+' : ''}${data.percentChangeFromLastMonth}% vs last month
      </div>
    `;
  }

  // If no data at all
  if (!trendHTML) {
    trendHTML = '<span style="color: var(--gray-600); font-size: 10px;">Building historical data...</span>';
  }

  trendDiv.innerHTML = trendHTML;
}

async function fetchInlineLeaderboard() {
  try {
    const response = await fetch('/api/toast-employee-performance', {
      method: 'POST'
    });

    if (!response.ok) {
      updateInlineLeaderboard(null);
      return;
    }

    const result = await response.json();

    if (result.success && result.data && result.data.leaderboard) {
      updateInlineLeaderboard(result.data.leaderboard);
    } else {
      updateInlineLeaderboard(null);
    }
  } catch (error) {
    console.error('❌ Error fetching inline leaderboard:', error);
    updateInlineLeaderboard(null);
  }
}

function updateInlineLeaderboard(leaderboard) {
  const displayDiv = document.getElementById('leaderboardInline');
  if (!displayDiv) return;

  if (!leaderboard || leaderboard.length === 0) {
    displayDiv.innerHTML = '';
    return;
  }

  // Show only top 5
  const top5 = leaderboard.slice(0, 5);

  let html = '';
  top5.forEach((emp, index) => {
    // Color based on rank
    let color = '#059669'; // Green for #1
    if (emp.rank === 2) color = '#2563eb'; // Blue for #2
    if (emp.rank === 3) color = '#f59e0b'; // Orange for #3
    if (emp.rank > 3) color = '#6b7280'; // Gray for others

    // Arrow based on performance
    const arrow = emp.tipsPerHour > 15 ? '↑' : emp.tipsPerHour > 10 ? '→' : '↓';

    html += `<div style="color: ${color}; margin-bottom: 2px;">${arrow} ${emp.rank}. ${emp.name}: $${emp.tipsPerHour.toFixed(2)}/hr</div>`;
  });

  displayDiv.innerHTML = html;
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
  showInlineNotification('Manager session ended');
}

function showInlineNotification(message) {
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;';

  // Create modal content
  const modal = document.createElement('div');
  modal.style.cssText = 'background: white; padding: 24px; max-width: 400px; width: 90%; border: 3px solid var(--gray-700); border-radius: 0;';

  const messageText = document.createElement('p');
  messageText.textContent = message;
  messageText.style.cssText = 'margin: 0 0 20px 0; font-size: 14px; color: var(--gray-900); text-align: center;';

  const okBtn = document.createElement('button');
  okBtn.textContent = 'OK';
  okBtn.style.cssText = 'width: 100%; padding: 12px 24px; background: var(--gray-900); border: 2px solid var(--gray-900); color: white; font-size: 13px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 0;';
  okBtn.onclick = () => document.body.removeChild(overlay);

  modal.appendChild(messageText);
  modal.appendChild(okBtn);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
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

function checkCogsPassword() {
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;';

  // Create modal content
  const modal = document.createElement('div');
  modal.style.cssText = 'background: white; padding: 24px; max-width: 400px; width: 90%; border: 3px solid var(--gray-700); border-radius: 0;';

  const title = document.createElement('h3');
  title.textContent = 'COGS ACCESS';
  title.style.cssText = 'margin: 0 0 16px 0; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--gray-900); text-align: center;';

  const label = document.createElement('label');
  label.textContent = 'MASTER PASSWORD';
  label.style.cssText = 'display: block; margin-bottom: 8px; font-size: 11px; font-weight: 700; color: var(--gray-700); text-transform: uppercase; letter-spacing: 0.5px;';

  const input = document.createElement('input');
  input.type = 'password';
  input.placeholder = 'Enter password';
  input.style.cssText = 'width: 100%; padding: 12px; border: 2px solid var(--gray-300); border-radius: 0; font-size: 14px; margin-bottom: 20px; box-sizing: border-box;';

  const errorMsg = document.createElement('div');
  errorMsg.style.cssText = 'display: none; color: #dc2626; font-size: 12px; margin-bottom: 12px; text-align: center; font-weight: 600;';
  errorMsg.textContent = '❌ Incorrect password';

  const buttonGroup = document.createElement('div');
  buttonGroup.style.cssText = 'display: flex; gap: 12px;';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'CANCEL';
  cancelBtn.style.cssText = 'flex: 1; padding: 12px 24px; background: var(--gray-100); border: 2px solid var(--gray-300); color: var(--gray-900); font-size: 13px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 0;';
  cancelBtn.onclick = () => document.body.removeChild(overlay);

  const submitBtn = document.createElement('button');
  submitBtn.textContent = 'ENTER';
  submitBtn.style.cssText = 'flex: 1; padding: 12px 24px; background: #dc2626; border: 2px solid #dc2626; color: white; font-size: 13px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 0;';
  submitBtn.onclick = () => {
    if (input.value === 'JaynaGyro2025!') {
      window.location.href = 'cost.html';
    } else {
      errorMsg.style.display = 'block';
      input.value = '';
      input.focus();
      input.style.borderColor = '#dc2626';
    }
  };

  // Allow Enter key to submit
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      submitBtn.click();
    }
  });

  buttonGroup.appendChild(cancelBtn);
  buttonGroup.appendChild(submitBtn);

  modal.appendChild(title);
  modal.appendChild(label);
  modal.appendChild(input);
  modal.appendChild(errorMsg);
  modal.appendChild(buttonGroup);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Auto-focus password input
  setTimeout(() => input.focus(), 100);
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initializeSharedHeader, supabaseClient };
}
