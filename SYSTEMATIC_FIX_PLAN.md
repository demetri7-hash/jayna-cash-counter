# SYSTEMATIC FIX PLAN - Prep Sheet PDF Cleanup

**Date:** October 15, 2025  
**Starting Point:** Commit `440a4e5` (Oct 14, 2025) - Clean state before PDF changes  
**Current State:** Multiple failed PDF redesign attempts with duplicate functions

---

## 🎯 OBJECTIVE

Fix prep sheet PDF generation with **ONE clean format** by:
1. Resetting to clean commit 440a4e5
2. Reapplying ONLY the good changes
3. Implementing clean PDF format
4. Testing at each step with live deployment

---

## 📊 ANALYSIS OF COMMITS SINCE 440a4e5

### Good Features to Keep:
1. ✅ **b04daaa** - "feat: update prep pdf with sauce summary" (BOTTLED SAUCE CHECK blue card)
2. ✅ **0efef3d** - "fix: align bottled sauce names with inventory" (Auto-include to-go items)
3. ✅ **6c254bb** - "fix: expand prep bottle summary styling" (Blue card improvements)
4. ✅ **ef99ff7** - "fix: compact prep pdf bottled summary" (Final bottled section polish)

### Bad Changes to Skip:
1. ❌ **b64e6da** - "fix(prep-sheet): improve PDF table spacing" (Started the mess)
2. ❌ **bb4c87b** - "fix(prep-sheet): completely redesign PDF table" (Made it worse)
3. ❌ **e999ebb** - "fix(prep-sheet): fix overlapping text" (More failed attempts)
4. ❌ **8161b8d** - "feat(prep-sheet): complete PDF redesign" (Created duplicate function)
5. ❌ **30ba2b2** - "chore: force cache invalidation" (Just cache busting)
6. ❌ **df1af7d** - "debug: add V3.0 version marker" (Debugging marker)

### Unrelated Features (Keep if Working):
- **385d070** - Catering sync workflow
- **f5ef76a, 8aa8987, 8f185fb, 181e198** - Catering order fixes
- **7c1ee3d** - Shrink bottled sauce card (minor styling)
- **6813be3, 5526eb5, 99a9c7d, 40d9862, c7f27f9, 954b20b** - Pending orders/receiving flow
- **bc8b046, ecbacd5, cad14e4, d59c1e2** - Receive orders fixes (reverts)
- **64ecb36** - Safari compatibility
- **2800973** - Pending order init state

---

## 🔧 STEP-BY-STEP EXECUTION PLAN

### ✅ STEP 0: Backup Current State
```bash
git stash  # Save any uncommitted changes
git branch backup-before-reset-$(date +%Y%m%d)  # Create backup branch
```

### ✅ STEP 1: Reset to Clean State (440a4e5)
**Goal:** Get back to working prep sheet without duplicate functions

**Actions:**
```bash
git reset --hard 440a4e5
git push origin main --force  # ⚠️ FORCE PUSH (user approved)
```

**What This Does:**
- Removes ALL commits after 440a4e5
- Returns to clean, working state
- File size: ~20,563 lines

**Testing After Step 1:**
- ✅ Visit https://jayna-cash-counter.vercel.app
- ✅ Navigate to PREP tab
- ✅ Generate prep sheet PDF
- ✅ Verify PDF generates without errors
- ✅ Check format (should be old 5-column format - that's OK for now)

**Expected Outcome:** Working prep sheet with old format

---

### ✅ STEP 2: Add "BOTTLED & TO-GO PREP CHECK" Section
**Goal:** Create new blue card section with bottled sauces + items marked "Show in Bottle Count"

**User Requirements:**
1. ✅ New section titled "BOTTLED & TO-GO PREP CHECK"
2. ✅ Auto-include ALL items with "BOTTLED" in name
3. ✅ Auto-include ALL items with "TO GO" or "TO-GO" in name  
4. ✅ Add checkbox in Inventory UI: "Show in Bottle Count"
5. ✅ Items with checkbox checked appear in this section
6. ✅ Items in this section do NOT appear in main priority sections
7. ✅ Blue card styling (like reference PDF)

**Database Changes:**
```sql
-- Add new column to prep_items table
ALTER TABLE prep_items 
ADD COLUMN show_in_bottle_count BOOLEAN DEFAULT FALSE;
```

**Code Changes:**

**A. Add Checkbox to Inventory UI:**
```javascript
// In renderInventoryItemCard() function
const showInBottleCheckbox = document.createElement('input');
showInBottleCheckbox.type = 'checkbox';
showInBottleCheckbox.id = `showBottle-${item.id}`;
showInBottleCheckbox.checked = item.show_in_bottle_count || false;
showInBottleCheckbox.onchange = async () => {
  await updateInventoryItem(item.id, { 
    show_in_bottle_count: showInBottleCheckbox.checked 
  });
};

const label = document.createElement('label');
label.htmlFor = `showBottle-${item.id}`;
label.textContent = 'Show in Bottle Count';
label.style.cssText = 'font-size: 11px; color: var(--gray-700); margin-left: 8px;';
```

**B. Create Filter Function:**
```javascript
function isBottledOrToGoItem(itemName) {
  const name = (itemName || '').toLowerCase();
  return name.includes('bottled') || 
         name.includes('to go') || 
         name.includes('to-go');
}

function shouldShowInBottleSection(item) {
  // Show if checkbox checked OR name matches pattern
  return item.show_in_bottle_count === true || 
         isBottledOrToGoItem(item.item_name);
}
```

**C. Build Bottled Summary:**
```javascript
function buildBottledSauceSummary(allPrepItems) {
  const summary = [];
  
  allPrepItems.forEach((item) => {
    if (shouldShowInBottleSection(item)) {
      summary.push({
        label: item.item_name,
        quantity: item.current_stock || '—',
        lastCounted: formatLastCountedDetail(item.last_counted_date)
      });
    }
  });
  
  // Sort alphabetically
  summary.sort((a, b) => a.label.localeCompare(b.label));
  
  return summary;
}
```

**D. Render Blue Card in PDF:**
```javascript
function renderSauceSummaryCard(doc, summary, startY) {
  if (!summary.length) return startY;
  
  // Blue header
  doc.setFillColor(33, 150, 243); // Jayna blue
  doc.rect(0.5, startY, 7.5, 0.25, 'F');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('BOTTLED & TO-GO PREP CHECK', 0.6, startY + 0.17);
  
  // Table with items
  doc.autoTable({
    startY: startY + 0.25,
    head: [['ITEM NAME', 'CURRENT', 'LAST COUNTED']],
    body: summary.map(item => [item.label, item.quantity, item.lastCounted]),
    theme: 'grid',
    headStyles: { fillColor: [219, 234, 254] }, // Light blue
    margin: { left: 0.5, right: 0.5 }
  });
  
  return doc.lastAutoTable.finalY + 0.2;
}
```

**E. Update PDF Generation:**
```javascript
// In generatePrepSheetPDF()
const allPrepItems = orderingSystemState.prepRecommendations;

// Build bottled section
const bottledSummary = buildBottledSauceSummary(allPrepItems);

// Filter OUT bottled items from main sections
const mainPrepItems = allPrepItems.filter(item => 
  !shouldShowInBottleSection(item)
);

// Render bottled section first (after header)
let yPos = 1.1;
if (bottledSummary.length > 0) {
  yPos = renderSauceSummaryCard(doc, bottledSummary, yPos);
}

// Then render main priority sections
const urgent = mainPrepItems.filter(r => r.priority === 'urgent');
const high = mainPrepItems.filter(r => r.priority === 'high');
// etc...
```

**Testing After Step 2:**
- ✅ Check database: `show_in_bottle_count` column exists
- ✅ Navigate to Inventory tab
- ✅ Verify "Show in Bottle Count" checkbox appears on each item
- ✅ Check a few boxes, verify they save
- ✅ Navigate to PREP tab
- ✅ Generate prep sheet PDF
- ✅ Verify "BOTTLED & TO-GO PREP CHECK" blue section appears
- ✅ Verify bottled items appear in section
- ✅ Verify "TO GO" items appear in section
- ✅ Verify items with checkbox checked appear in section
- ✅ Verify these items do NOT appear in main priority sections

**Commit After Step 2:**
```bash
git add index.html
git commit -m "feat(prep-sheet): add bottled sauce summary section with auto to-go filtering"
git push origin main
```

**WAIT FOR USER FEEDBACK** ⏸️

---

### ✅ STEP 3: Remove Old Duplicate Functions
**Goal:** Clean up WITHOUT breaking anything

**Actions:**
1. Verify only ONE `renderPrepPDFSection` exists at this point
2. Remove the old `printPrepSheet()` HTML-based function
3. Replace with simple 3-liner that calls `emailPrepSheetToPrinter()`
4. Remove `renderPrintPriorityGroup()` helper (no longer needed)

**Code Changes:**
```javascript
// BEFORE: 200+ lines of HTML generation
function printPrepSheet() {
  // Massive HTML template...
}

// AFTER: 3 lines
function printPrepSheet() {
  emailPrepSheetToPrinter();
}
```

**Why This Works:**
- Print button now emails PDF to printer
- Uses same PDF format as Download button
- One format to maintain going forward

**Testing After Step 3:**
- ✅ Click "Download PDF" button → verify PDF downloads
- ✅ Click "Email to Printer" button → verify email sends
- ✅ Click "Print" button → verify email sends (same as email button)
- ✅ Check printer receives PDF

**Commit After Step 3:**
```bash
git add index.html
git commit -m "refactor(prep-sheet): unify PDF format - print button now emails PDF"
git push origin main
```

**WAIT FOR USER FEEDBACK** ⏸️

---

### ✅ STEP 4: Remove Cache Bust Comment
**Goal:** Clean up debugging artifacts

**Actions:**
```bash
grep -n "Cache bust:" index.html  # Find the comment
# Remove the line: // Cache bust: Wed Oct 15 18:29:36 PDT 2025
```

**Testing After Step 4:**
- ✅ Quick verification that app still loads

**Commit After Step 4:**
```bash
git add index.html
git commit -m "chore: remove cache bust debug comment"
git push origin main
```

---

### ✅ STEP 5: Verify Final State
**Goal:** Confirm everything works perfectly

**Full System Test:**
1. ✅ Navigate to PREP tab
2. ✅ Verify prep items display correctly
3. ✅ Click "Download PDF"
   - Verify PDF downloads
   - Verify BOTTLED SAUCE CHECK section appears
   - Verify all priority sections render
4. ✅ Click "Email to Printer"
   - Verify success message
   - Check printer receives PDF
5. ✅ Click "Print" button
   - Verify it behaves same as Email button
6. ✅ Test on different data scenarios
   - Empty prep list
   - Only urgent items
   - Many items (pagination)

**Success Criteria:**
- ✅ Single PDF format used everywhere
- ✅ No duplicate functions
- ✅ Bottled sauce section working
- ✅ All buttons functional
- ✅ File size reduced (~20,563 lines vs 20,871)

---

## 📝 NOTES FOR EXECUTION

### Important Commands:
```bash
# Check current state
git log --oneline -5
git status

# View specific commit changes
git show COMMIT_HASH --stat
git show COMMIT_HASH index.html | grep -A 10 "function name"

# Test after each change
# 1. git add index.html
# 2. git commit -m "message"
# 3. git push origin main
# 4. Wait 1-2 minutes for Vercel deployment
# 5. Test at https://jayna-cash-counter.vercel.app
# 6. WAIT FOR USER FEEDBACK before proceeding
```

### Rollback if Needed:
```bash
# If something breaks, rollback immediately
git reset --hard HEAD~1  # Go back one commit
git push origin main --force
```

---

## 🚦 CURRENT STATUS

**Status:** ❌ PLAN CREATED - AWAITING USER APPROVAL TO START

**Ready to Execute:** STEP 1 (Reset to 440a4e5)

**User Approval Required:** YES - Force push will remove commits

---

## ✅ USER INSTRUCTIONS

**To begin execution, reply with:**
- "START STEP 1" → I'll reset to commit 440a4e5
- "HOLD" → I'll wait for your review
- "MODIFY PLAN" → Tell me what to change

**After each step completes:**
- I'll deploy to Vercel
- I'll wait for your test results
- You reply "CONTINUE" or "FIX ISSUE"

