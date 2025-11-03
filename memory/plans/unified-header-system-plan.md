# Unified Header System & Tab Extraction Plan
**Created:** November 2, 2025
**Status:** Awaiting User Approval
**Priority:** High - Fixes maintenance nightmare of duplicate header code

---

## 🔴 CRITICAL DISCOVERY

**shared-header.js EXISTS BUT IS NEVER USED**
- File exists in repo but NO page actually includes it
- Was editing it thinking it would update all pages - **IT DOES NOT**
- All pages have their OWN duplicate header code
- Changes must be made 11 times manually across all pages

---

## 📊 Current State Analysis

### Production HTML Pages (11 total):

1. **index.html** - Cash Counter
   - **Has 3 dynamic "tabs":** Cash Counter, Orders & Prep, Tip Pool
   - Uses CSS show/hide to switch between tabs
   - Password protection on Tip Pool tab

2. **boh.html** - Back of House

3. **catering.html** - Catering Orders

4. **cogs.html** - Cost of Goods

5. **drivers.html** - Driver Management

6. **foh-checklists.html** - FOH Checklists

7. **manager.html** - Manager Dashboard

8. **managerlogs.html** - Manager Logs
   - **Has 2 dynamic "tabs":** Incident Reports, Void & Discount Tracking
   - Uses CSS show/hide to switch between tabs
   - Password protected page

9. **scheduling.html** - Scheduling

10. **teamupdates.html** - Team Updates/Leaderboard (NO password)

11. **amex-receipts.html** - AMEX Receipts

### Critical Problems:

❌ **Problem 1:** Each page has its OWN copy of header/nav code (duplicate code x11)
- Any change to logo, navigation, or header requires editing 11 files
- High risk of inconsistency
- Maintenance nightmare

❌ **Problem 2:** shared-header.js is dead code
- Exists in repo but no page includes it
- Misleading - looks like it should work but doesn't

❌ **Problem 3:** Some pages use dynamic tabs instead of separate pages
- index.html: Cash/Orders/TipPool are tabs, not pages
- managerlogs.html: Incidents/Tracking are tabs, not pages
- Makes it harder to share specific features (can't link directly to "Orders & Prep")

❌ **Problem 4:** Void/Discount tracking is password-protected
- User wants it accessible without password on Team Updates page
- Currently buried in managerlogs.html behind password

---

## 🎯 PROPOSED SOLUTIONS (3 Options)

### Option A: JavaScript Include Pattern

**Strategy:** Create a REAL working shared header using JavaScript DOM injection

**Implementation:**
```html
<!-- In each HTML page, replace existing header with: -->
<div id="appHeader"></div>
<script src="app-header.js"></script>
<script>
  renderSharedHeader({
    currentPage: 'foh-checklists',
    showTipsPerHour: true,
    showVoidStats: true
  });
</script>
```

**app-header.js would:**
- Inject logo, navigation buttons, tips/hr display, void stats
- Highlight current page button
- Fetch and display live stats (tips/hr, void/discount counts)
- Handle password protection where needed

**Pros:**
- ✅ Single source of truth for header/nav
- ✅ Updates apply to all pages instantly
- ✅ Can dynamically highlight current page
- ✅ Maintains all existing pages as-is
- ✅ Works with dynamic tabs on index.html and managerlogs.html
- ✅ Low risk - can implement incrementally
- ✅ Easy to roll back if issues arise

**Cons:**
- ⚠️ Slight delay on page load (header renders via JS)
- ⚠️ SEO impact (header not in initial HTML) - not a concern for internal tools
- ⚠️ Requires JavaScript (no fallback for disabled JS) - acceptable for this app
- ⚠️ Browser cache might show old header briefly

**Risk Level:** 🟢 LOW

---

### Option B: Extract Tabs + Server-Side Includes

**Strategy:** Extract dynamic tabs into real pages + use PHP/server-side includes for header

**Required Changes:**

**1. Extract index.html tabs into separate pages:**
- Create `cash.html` (Cash Counter - currently tab 1)
- Create `orders-prep.html` (Orders & Prep - currently tab 2)
- Create `tip-pool.html` (Tip Pool Calculator - currently tab 3)
- Redirect `index.html` → `cash.html`
- Update all internal links

**2. Extract managerlogs.html tabs:**
- Create `incidents.html` (Incident Reports)
- Create `void-tracking.html` (Void & Discount Tracking)
- Delete `managerlogs.html` after extraction
- Update navigation to point to new pages

**3. Move void tracking to teamupdates:**
- Add "Void Tracking" as new tab in `teamupdates.html` OR
- Create `teamupdates-tracking.html` as separate page
- Remove password requirement

**4. Create header include:**
- Create `header.php` or use build process to inject `header.html`
- Add `<?php include 'header.php'; ?>` to all pages
- Requires PHP support on Vercel (available via runtime)

**Pros:**
- ✅ Clean separation of concerns (1 page = 1 feature)
- ✅ Better for SEO (not critical for internal tool)
- ✅ Faster page loads (no dynamic tab switching)
- ✅ Cleaner URLs (`/cash.html` vs `index.html#cash`)
- ✅ Header truly shared via includes
- ✅ Can link directly to specific features

**Cons:**
- ⚠️ Requires server-side processing (PHP) or build step
- ⚠️ Vercel supports PHP via runtime, but adds complexity
- ⚠️ Major restructuring (HIGH RISK)
- ⚠️ Need to update all internal links/redirects
- ⚠️ More testing required
- ⚠️ Harder to roll back

**Risk Level:** 🔴 HIGH

---

### Option C: Hybrid Approach (⭐ RECOMMENDED)

**Strategy:** JavaScript injection for header + extract ONLY managerlogs tabs


**Phase 1 - Unified Header (Low Risk):**
1. Create `app-header.js` (new file, properly tested)
2. Test on ONE page first (`teamupdates.html` - simplest page)
3. Add `<script src="app-header.js"></script>` to all 11 pages incrementally
4. Remove duplicate header code from each page after testing
5. Commit after each successful page conversion
6. **Estimated Time:** 2-3 hours

**Phase 2 - Add Void/Discount Stats to Header (Low Risk):**
1. Fetch TODAY's stats from `/api/toast-void-discount-tracking`
2. Display compact line in header: "DISCOUNTS: 5 | VOIDED: 3 | REFUNDS: 2 | PAYMENTS: 1"
3. Add timestamp below: "AS OF 3:45 PM | 11/02/25"
4. Keep compact (10px font, gray text, minimal height increase)
5. Auto-refresh every 5 minutes
6. **Estimated Time:** 1 hour

**Phase 3 - Move Void Tracking to Team Updates (Medium Risk):**
1. Copy entire tracking tab HTML from managerlogs.html
2. Copy all JavaScript functions for tracking (loadTrackingData, renderTrackingData, etc.)
3. Add as new tab in teamupdates.html (accessible to all, NO password)
4. Keep tracking tab in managerlogs.html too (for managers)
5. Test thoroughly
6. **Estimated Time:** 30-45 minutes

**Phase 4 - Extract managerlogs tabs (Optional, Medium Risk):**
1. Create `incidents.html` (Incident Reports page)
2. Create `void-tracking.html` (Void & Discount Tracking page)
3. Update navigation to point to new pages
4. Delete managerlogs.html OR keep as redirect
5. **Estimated Time:** 1-2 hours

**Phase 5 - Keep index.html tabs AS-IS (No Risk):**
- Cash/Orders/TipPool tabs remain dynamic
- Already works well, no user confusion
- Password protection already in place
- **No changes needed**

**Why This is Best:**
- ✅ Solves header duplication immediately (Phase 1)
- ✅ Adds void/discount stats to all pages (Phase 2)
- ✅ Makes void tracking accessible without password (Phase 3)
- ✅ Can extract managerlogs later if needed (Phase 4)
- ✅ Preserves working index.html structure (Phase 5)
- ✅ Low risk, incremental approach
- ✅ Can roll back each phase independently
- ✅ Delivers value quickly (phases are independent)

**Risk Level:** 🟢 LOW (Phase 1-3), 🟡 MEDIUM (Phase 4)

---

## 📝 DETAILED IMPLEMENTATION PLAN (Option C)

### Phase 1: Create Unified Header System

**Step 1.1: Create app-header.js**
```javascript
// app-header.js
function renderSharedHeader(config) {
  const headerDiv = document.getElementById('appHeader');

  // Build header HTML
  const headerHTML = `
    <div class="header">
      <img src="jayna-logo.png" alt="Jayna Gyro Logo">
      <h1>JAYNA GYRO</h1>
      <p>FOR AUTHORIZED USE ONLY</p>

      <!-- Tips/Hr Display -->
      <div id="tipsPerHourCard">...</div>

      <!-- Void/Discount Stats (Phase 2) -->
      <div id="voidDiscountStats">...</div>

      <p>APP CREATED BY DEMETRI GREGORAKIS</p>
    </div>

    <div class="navigation">
      <a href="index.html" class="menu-btn ${config.currentPage === 'index' ? '' : 'primary'}">Cash</a>
      <a href="index.html" class="menu-btn ${config.currentPage === 'orders' ? '' : 'primary'}">Orders & Prep</a>
      <a href="foh-checklists.html" class="menu-btn ${config.currentPage === 'foh' ? '' : 'primary'}">FOH</a>
      <a href="boh.html" class="menu-btn ${config.currentPage === 'boh' ? '' : 'primary'}">BOH</a>
      <a href="catering.html" class="menu-btn ${config.currentPage === 'catering' ? '' : 'primary'}">Catering</a>
      <a href="drivers.html" class="menu-btn ${config.currentPage === 'drivers' ? '' : 'primary'}">Drivers</a>
      <a href="scheduling.html" class="menu-btn ${config.currentPage === 'scheduling' ? '' : 'primary'}">Scheduling</a>
      <a href="manager.html" class="menu-btn ${config.currentPage === 'manager' ? '' : 'primary'}">Manager</a>
      <a href="teamupdates.html" class="menu-btn ${config.currentPage === 'teamupdates' ? '' : 'primary'}">Team Updates</a>
    </div>
  `;

  headerDiv.innerHTML = headerHTML;

  // Initialize live stats
  if (config.showTipsPerHour) {
    fetchTipsPerHour();
  }
  if (config.showVoidStats) {
    fetchVoidDiscountStats();
  }
}
```

**Step 1.2: Test on teamupdates.html**
- Add `<div id="appHeader"></div>` at top
- Add `<script src="app-header.js"></script>`
- Add `<script>renderSharedHeader({currentPage: 'teamupdates', showTipsPerHour: true, showVoidStats: true});</script>`
- Test all navigation buttons work
- Test tips/hr display works
- Commit if successful

**Step 1.3: Roll out to remaining pages**
- Convert one page at a time
- Test each page thoroughly
- Commit after each successful conversion
- Order: teamupdates → drivers → boh → foh → catering → scheduling → manager → managerlogs → index → cogs → amex

**Step 1.4: Remove old shared-header.js**
- Delete `shared-header.js` (dead code)
- Commit deletion

---

### Phase 2: Add Void/Discount Stats to Header

**Step 2.1: Create fetchVoidDiscountStats() function**
```javascript
async function fetchVoidDiscountStats() {
  try {
    // Get today's date range (5AM-5AM Pacific)
    const today = getTodayDateRange();

    // Authenticate with Toast
    const authResponse = await fetch('/api/toast-auth', { method: 'POST' });
    const authData = await authResponse.json();
    const token = authData.data.accessToken;

    // Fetch void/discount data for TODAY only
    const response = await fetch(`/api/toast-void-discount-tracking?startDate=${today.start}&endDate=${today.end}&token=${token}`);
    const data = await response.json();

    // Update display
    updateVoidDiscountDisplay(data);
  } catch (error) {
    console.error('Error fetching void/discount stats:', error);
    updateVoidDiscountDisplay(null);
  }
}

function updateVoidDiscountDisplay(data) {
  const statsDiv = document.getElementById('voidDiscountStats');
  const timestampDiv = document.getElementById('voidDiscountTimestamp');

  if (!data || !data.success) {
    statsDiv.textContent = 'DISCOUNTS: - | VOIDED ORDERS: - | VOIDED PAYMENTS: - | REFUNDS: -';
    timestampDiv.textContent = '';
    return;
  }

  // Format stats line
  statsDiv.textContent = `DISCOUNTS: ${data.discounts.count} | VOIDED ORDERS: ${data.voidedOrders.count} | VOIDED PAYMENTS: ${data.voidedPayments.count} | REFUNDS: ${data.refunds.count}`;

  // Format timestamp
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  const date = now.toLocaleDateString('en-US', {
    timeZone: 'America/Los_Angeles',
    month: '2-digit',
    day: '2-digit',
    year: '2-digit'
  });
  timestampDiv.textContent = `AS OF ${time} | ${date}`;
}
```

**Step 2.2: Add to app-header.js**
- Include function in app-header.js
- Auto-refresh every 5 minutes
- Test on all pages

---

### Phase 3: Move Void Tracking to Team Updates

**Step 3.1: Copy tracking tab to teamupdates.html**
- Copy HTML from managerlogs.html lines 726-868
- Copy CSS styles for tracking tables
- Copy JavaScript functions (loadTrackingData, renderTrackingData, etc.)
- Add new "Void Tracking" tab button

**Step 3.2: Test functionality**
- Verify week selector works
- Verify all 4 tables display correctly
- Verify sorting works
- Verify CSV export works
- Verify "Today" toggle works

**Step 3.3: Keep in managerlogs.html too**
- Don't remove from managerlogs.html
- Managers can still access it there
- Provides redundancy

---

## ❓ QUESTIONS FOR USER

### Question 1: Which option do you prefer?
- **Option A:** JavaScript include only
- **Option B:** Full extraction + server includes
- **Option C:** Hybrid (recommended) ⭐

### Question 2: For index.html tabs (Cash/Orders/TipPool):
- **Keep as dynamic tabs** (recommended) ⭐
- Extract into 3 separate pages

### Question 3: For managerlogs.html tabs (Incidents/Tracking):
- **Extract into separate pages** (incidents.html, void-tracking.html)
- Keep as dynamic tabs

### Question 4: Priority order:
- **Start with unified header first** (recommended) ⭐
- Start with void tracking move first

### Question 5: Void stats in header:
- Show counts only (DISCOUNTS: 5 | VOIDED: 3 | REFUNDS: 2 | PAYMENTS: 1)
- Show counts + totals (DISCOUNTS: 5 ($45.00) | VOIDED: 3 ($120.00) ...)
- **Show counts only** (recommended - more compact) ⭐

---

## 🎯 MY RECOMMENDATION

**Go with Option C - Hybrid Approach**

**Phase Order:**
1. ✅ **Phase 1:** Unified header (solves maintenance nightmare)
2. ✅ **Phase 2:** Add void/discount stats to header (quick win)
3. ✅ **Phase 3:** Copy void tracking to teamupdates (user's original request)
4. ⏸️ **Phase 4:** Extract managerlogs tabs (optional, do later if needed)
5. ⏸️ **Phase 5:** Keep index.html tabs as-is (no changes needed)

**Why this order:**
- Delivers maximum value with minimum risk
- Each phase is independent
- Can stop after any phase if issues arise
- Addresses your immediate needs (void tracking accessibility)
- Solves long-term maintenance problem (duplicate headers)

---

## 📅 ESTIMATED TIMELINE

**Phase 1:** 2-3 hours (create app-header.js, convert all 11 pages)
**Phase 2:** 1 hour (add void/discount stats)
**Phase 3:** 30-45 minutes (copy tracking to teamupdates)
**Phase 4:** 1-2 hours (extract managerlogs tabs - optional)

**Total for Phases 1-3:** ~4 hours
**Total including Phase 4:** ~6 hours

---

## 🚀 READY TO START

I'm ready to implement Option C (Hybrid) as soon as you approve. We'll go phase by phase, committing and testing after each step.

**What would you like me to do?**
