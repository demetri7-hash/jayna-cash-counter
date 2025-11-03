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

// Placeholder functions - will be defined by Supabase connection in each page
async function fetchClockedInEmployees() {
  console.log('fetchClockedInEmployees called - implement in page');
}

async function fetchTipsPerHour() {
  console.log('fetchTipsPerHour called - implement in page');
}

async function fetchTopLeader() {
  console.log('fetchTopLeader called - implement in page');
}

async function fetchVoidDiscountTracking() {
  console.log('fetchVoidDiscountTracking called - implement in page');
}
