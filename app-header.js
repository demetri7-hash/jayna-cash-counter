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
      <img src="jayna-logo.png" alt="Jayna Gyro Logo" class="logo">
      <h1>JAYNA GYRO</h1>
      <p style="opacity: 0.7;">FOR AUTHORIZED USE ONLY</p>

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

      <!-- MAIN MENU NAVIGATION -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 20px; margin-bottom: 20px;">
        <a onclick="window.requirePasswordFor('CASH', accessCash, 'jaynacash')" class="menu-btn primary" style="text-decoration: none; display: block; padding: 14px; background: var(--gray-900); color: white; border: 2px solid var(--gray-900); text-align: center; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; transition: all 0.15s ease;">CASH</a>
        <a href="orders-prep.html" class="menu-btn" style="text-decoration: none; display: block; padding: 14px; background: var(--gray-700); color: white; border: 2px solid var(--gray-700); text-align: center; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; transition: all 0.15s ease;">ORDERS & PREP</a>
        <a href="foh-checklists.html" class="menu-btn primary" style="text-decoration: none; display: block; padding: 14px; background: var(--gray-900); color: white; border: 2px solid var(--gray-900); text-align: center; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; transition: all 0.15s ease;">FOH</a>
        <a href="boh.html" class="menu-btn" style="text-decoration: none; display: block; padding: 14px; background: var(--gray-700); color: white; border: 2px solid var(--gray-700); text-align: center; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; transition: all 0.15s ease;">BOH</a>
        <a href="catering.html" class="menu-btn primary" style="text-decoration: none; display: block; padding: 14px; background: var(--gray-900); color: white; border: 2px solid var(--gray-900); text-align: center; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; transition: all 0.15s ease;">CATERING</a>
        <a href="drivers.html" class="menu-btn" style="text-decoration: none; display: block; padding: 14px; background: var(--gray-700); color: white; border: 2px solid var(--gray-700); text-align: center; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; transition: all 0.15s ease;">DRIVERS</a>
        <a onclick="window.requirePasswordFor('MANAGER', accessManager, 'JaynaGyro2025!')" class="menu-btn primary" style="text-decoration: none; display: block; padding: 14px; background: var(--gray-900); color: white; border: 2px solid var(--gray-900); text-align: center; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; transition: all 0.15s ease;">MANAGER</a>
        <a href="teamupdates.html" class="menu-btn" style="text-decoration: none; display: block; padding: 14px; background: var(--gray-700); color: white; border: 2px solid var(--gray-700); text-align: center; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; transition: all 0.15s ease;">TEAM UPDATES</a>
        <a href="incidents.html" class="menu-btn primary" style="text-decoration: none; display: block; padding: 14px; background: var(--gray-900); color: white; border: 2px solid var(--gray-900); text-align: center; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; transition: all 0.15s ease;">INCIDENTS</a>
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
  if (typeof initializeLiveStats === 'function') {
    initializeLiveStats();
  }
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

  // Check hardcoded password first
  if (enteredPassword === currentPasswordRequired) {
    // Correct password! Close modal and execute callback
    if (modal) modal.style.display = 'none';
    if (window.managerPasswordCallback) {
      window.managerPasswordCallback();
    }
    return;
  }

  // Also check against watchdog passwords from database
  if (typeof supabase !== 'undefined') {
    try {
      const { data, error } = await supabase
        .from('foh_watchdog_passwords')
        .select('password')
        .eq('is_active', true);

      if (!error && data) {
        const watchdogPasswords = data.map(row => row.password);

        if (watchdogPasswords.includes(enteredPassword)) {
          // Valid watchdog password! Close modal and execute callback
          if (modal) modal.style.display = 'none';
          if (window.managerPasswordCallback) {
            window.managerPasswordCallback();
          }
          return;
        }
      }
    } catch (err) {
      console.error('Error checking watchdog passwords:', err);
    }
  }

  // Wrong password (not hardcoded and not in database)
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
