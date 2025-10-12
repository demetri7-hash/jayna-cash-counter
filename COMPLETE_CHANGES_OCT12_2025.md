# COMPLETE LINE-BY-LINE DOCUMENTATION OF ALL CHANGES
## October 12, 2025 - From Last Night's Working Version to Current

**CRITICAL CONTEXT:**
User reports system is BLANK/BLOCKED after today's changes.
Need to revert to commit **5318356** (Oct 11, 21:39 - Last working version)
Then re-implement changes ONE BY ONE with testing.

**Current HEAD:** c11c4e3
**Last Working:** 5318356 (Oct 11, 21:39pm)
**Total Changes:** 3,509 lines added, 30 lines removed across 10 files

---

## FILE-BY-FILE BREAKDOWN

### 1. **index.html** (140 lines changed)

#### **LINE 5 - Viewport Meta Tag**
```diff
- <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes, viewport-fit=cover">
+ <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
```
**Change:** Disabled zoom completely (maximum-scale=1.0, user-scalable=no)
**Reason:** Prevent zoom on mobile for Google Sites embedding
**Commit:** a2b3481 - fix(mobile): Disable zoom on mobile devices for Google Sites embedding

---

#### **LINE 36 - Body Background Color**
```diff
- background: var(--gray-100);
+ background: var(--white); /* White background to blend with Google Sites header */
```
**Change:** Changed body background from gray-100 to white
**Reason:** Blend seamlessly with Google Sites iframe header
**Commit:** c627659 - fix(ui): Add top padding to accommodate Google Sites header

---

#### **LINE 38 - Body Padding**
```diff
- padding: 0;
+ padding: 50px 0 0 0; /* Top padding for Google Sites header */
```
**Change:** Added 50px top padding
**Reason:** Account for Google Sites header overlay
**Commit:** c627659 - fix(ui): Add top padding to accommodate Google Sites header

---

#### **LINE 49 - Container Shadow**
```diff
- box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
+ box-shadow: none; /* Remove shadow for seamless Google Sites embed */
```
**Change:** Removed box shadow
**Reason:** Seamless embedding appearance
**Commit:** 64f2b10 - fix(ui): Optimize top padding and remove visual gaps for Google Sites embed

---

#### **LINES 172-176 - Input Font Size Override**
```diff
+
+ input, select, textarea, button {
+   font-size: 16px !important;
+ }
+
```
**Change:** Force all inputs/buttons to 16px font size
**Reason:** Prevent iOS auto-zoom on input focus
**Commit:** dae3bc6 - feat(mobile): Comprehensive zoom prevention - all layers implemented

---

#### **LINE 737 - Catering Button Added**
```diff
+ <button class="menu-btn" onclick="window.location.href='catering.html'" style="background: var(--gray-700) !important; color: white !important; border-color: var(--gray-700) !important;">Catering</button>
```
**Change:** Added new "Catering" button in main menu
**Reason:** Link to new catering.html page
**Commit:** 9475f06 - feat(catering): Add comprehensive catering management system

---

#### **LINES 1380, 1431, 1480, 1521, 1660 - Remove max-height/overflow on Lists**
```diff
- <div id="inventoryList" style="max-height: 600px; overflow-y: auto;">
+ <div id="inventoryList" style="width: 100%;">

- <div id="stockCountList" style="max-height: 600px; overflow-y: auto;">
+ <div id="stockCountList" style="width: 100%;">

- <div id="prepCountList" style="max-height: 600px; overflow-y: auto;">
+ <div id="prepCountList" style="width: 100%;">

- <div id="prepRecommendationsList" style="max-height: 600px; overflow-y: auto;">
+ <div id="prepRecommendationsList" style="width: 100%;">

- <div id="extractedItemsList" style="max-height: 600px; overflow-y: auto;">
+ <div id="extractedItemsList" style="width: 100%;">
```
**Change:** Removed max-height and overflow-y from 5 major list containers
**Reason:** Prevent nested scroll containers for Google Sites embedding
**Commit:** af0a26a - fix(mobile): Remove nested scroll containers for better Google Sites embedding
**⚠️ CRITICAL:** This could be causing the BLANK screen issue!

---

#### **LINES 1565-1566 - Invoice Upload Section Headers**
```diff
- <h4>Upload Invoice Image</h4>
- <p>Take a photo or select an image from your device</p>
+ <h4>Upload Invoice/Order</h4>
+ <p>Take a photo or upload image/PDF from your device</p>
```
**Change:** Updated text to include PDF support
**Reason:** PDF upload feature added
**Commit:** aa5e89c - feat(receive): Add PDF upload support for invoices and orders

---

#### **LINE 1572 - File Input Accept Types**
```diff
- accept="image/*"
+ accept="image/*,application/pdf"
```
**Change:** Allow PDF files in addition to images
**Reason:** PDF invoice upload support
**Commit:** aa5e89c - feat(receive): Add PDF upload support for invoices and orders

---

#### **LINES 1587, 1594, 1615, 1622 - Button Sizing**
```diff
- style="flex: 1; max-width: 200px; padding: 14px;"
+ style="width: auto; max-width: 200px; min-width: 150px; padding: 14px;"
```
**Change:** Changed button flex to width/min-width
**Reason:** Fix TAKE PHOTO/UPLOAD button sizing inconsistency
**Commit:** 00c4184 - fix(ui): Fix TAKE PHOTO/UPLOAD button sizing in invoice section

---

#### **LINES 2620-2627 - Cashbox Reconciliation Auto-Scroll**
```javascript
+
+    // CRITICAL: Scroll reconciliation section into view
+    setTimeout(() => {
+      if (reconciliationSection) {
+        console.log('Scrolling cashbox reconciliation into view...');
+        reconciliationSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
+      }
+    }, 100);
```
**Change:** Added auto-scroll after cashbox reconciliation displays
**Reason:** Ensure reconciliation results visible to user
**Commit:** c43a285 - fix(ux): Add auto-scroll for all major result sections

---

#### **LINES 3002-3009 - PM Discrepancy Auto-Scroll**
```javascript
+
+    // CRITICAL: Scroll discrepancy section into view after displaying
+    setTimeout(() => {
+      if (discrepancySection) {
+        console.log('Scrolling PM discrepancy section into view...');
+        discrepancySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
+      }
+    }, 100);
```
**Change:** Added auto-scroll after PM discrepancy displays
**Reason:** Ensure validation message visible to user
**Commit:** c43a285 - fix(ux): Add auto-scroll for all major result sections

---

#### **LINES 7459-7467 - Tip Pool Results Auto-Scroll**
```javascript
+
+      // CRITICAL: Scroll tip pool results into view
+      setTimeout(() => {
+        const resultsSection = document.getElementById('tipPoolResults');
+        if (resultsSection) {
+          console.log('Scrolling tip pool results into view...');
+          resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
+        }
+      }, 300);
```
**Change:** Added auto-scroll after tip pool calculation
**Reason:** Ensure results visible after calculation
**Commit:** c43a285 - fix(ux): Add auto-scroll for all major result sections

---

#### **LINE 9738 - Ordering System State**
```diff
+ currentInvoiceType: null, // Store file type (image/* or application/pdf)
```
**Change:** Added currentInvoiceType property to orderingSystemState
**Reason:** Track whether uploaded file is image or PDF
**Commit:** aa5e89c - feat(receive): Add PDF upload support for invoices and orders

---

#### **LINE 10629 - AI Suggestion Button Height**
```diff
- padding: 12px;
+ padding: 14px;
```
**Change:** Increased button padding from 12px to 14px
**Reason:** Standardize button heights to 44px across app
**Commit:** db9430e - fix(ui): Standardize all button heights to 44px across entire app

---

#### **LINES 11646, 11679, 11701, 12244, 12277, 12299 - Button Min-Heights**
```diff
- min-height: 48px;
+ min-height: 44px;
```
**Change:** Changed all button min-heights from 48px to 44px (6 locations)
**Reason:** Standardize button heights across entire app
**Commit:** db9430e - fix(ui): Standardize all button heights to 44px across entire app

---

#### **LINES 14915-14960 - handleInvoiceUpload() Function - PDF Support**
```diff
- // Validate file type
- if (!file.type.startsWith('image/')) {
-   showMessage('Please upload an image file (JPG, PNG, etc.)', 'error');
+ // Validate file type (allow images and PDFs)
+ const isImage = file.type.startsWith('image/');
+ const isPDF = file.type === 'application/pdf';
+
+ if (!isImage && !isPDF) {
+   showMessage('Please upload an image file (JPG, PNG) or PDF', 'error');
```

```javascript
+ orderingSystemState.currentInvoiceType = file.type; // Store file type
+
+ if (isPDF) {
+   // For PDFs, show a message instead of image preview
+   document.getElementById('invoicePreviewImage').style.display = 'none';
+   const pdfMessage = document.getElementById('pdfPreviewMessage');
+   if (!pdfMessage) {
+     const msg = document.createElement('div');
+     msg.id = 'pdfPreviewMessage';
+     msg.style.cssText = 'padding: 40px; text-align: center; background: var(--gray-100); border: 2px dashed var(--gray-400); color: var(--gray-700);';
+     msg.innerHTML = '<strong>📄 PDF Uploaded</strong><br><span style="font-size: 12px;">' + file.name + '</span><br><small style="color: var(--gray-500);">OCR not available for PDFs</small>';
+     document.getElementById('invoicePreviewImage').parentElement.insertBefore(msg, document.getElementById('invoicePreviewImage'));
+   } else {
+     pdfMessage.style.display = 'block';
+     pdfMessage.innerHTML = '<strong>📄 PDF Uploaded</strong><br><span style="font-size: 12px;">' + file.name + '</span><br><small style="color: var(--gray-500);">OCR not available for PDFs</small>';
+   }
+   // Disable OCR button for PDFs
+   document.getElementById('processOCRButton').disabled = true;
+   document.getElementById('processOCRButton').style.opacity = '0.5';
+ } else {
+   // For images, show preview normally
+   document.getElementById('invoicePreviewImage').style.display = 'block';
+   document.getElementById('invoicePreviewImage').src = e.target.result;
+   const pdfMessage = document.getElementById('pdfPreviewMessage');
+   if (pdfMessage) pdfMessage.style.display = 'none';
+   // Enable OCR button for images
+   document.getElementById('processOCRButton').disabled = false;
+   document.getElementById('processOCRButton').style.opacity = '1';
+ }
```
**Change:** Complete PDF upload handling logic
**Reason:** Allow PDF invoices, show message instead of preview, disable OCR for PDFs
**Commit:** 4f14040 - fix(receive): Enable PDF upload and handle properly

---

#### **LINES 14973-14989 - clearInvoiceUpload() Function Enhancement**
```javascript
+ orderingSystemState.currentInvoiceType = null;
+
+ // Reset image preview and PDF message
+ document.getElementById('invoicePreviewImage').style.display = 'block';
+ const pdfMessage = document.getElementById('pdfPreviewMessage');
+ if (pdfMessage) pdfMessage.style.display = 'none';
+
+ // Re-enable OCR button
+ document.getElementById('processOCRButton').disabled = false;
+ document.getElementById('processOCRButton').style.opacity = '1';
```
**Change:** Clear PDF-related state and UI elements
**Reason:** Complete cleanup when clearing upload
**Commit:** 4f14040 - fix(receive): Enable PDF upload and handle properly

---

#### **LINES 15079-15087 - OCR Extracted Items Auto-Scroll**
```javascript
+ // CRITICAL FIX: Scroll the extracted items section into view
+ // Without this, the section is below the fold and user can't see it!
+ setTimeout(() => {
+   const extractedSection = document.getElementById('extractedItemsSection');
+   if (extractedSection) {
+     console.log('Scrolling extracted items into view...');
+     extractedSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
+   }
+ }, 100);
+
```
**Change:** Added auto-scroll after OCR completes
**Reason:** Extracted items section is below fold, user can't see results
**Commit:** 82f0fa9 - fix(ocr): Auto-scroll extracted items section into view after OCR completes

---

### 2. **CLAUDE.md** (279 lines changed)

**Major Additions:**
- Documented catering system overview
- Added complete prep mappings reference
- Documented Toast API dining options integration
- Added session end protocol
- Documented invoice system status

**Commits:**
- 9475f06 - feat(catering): Add comprehensive catering management system
- ccadf12 - feat(catering): Add complete unified prep mappings from real orders

---

### 3. **INVOICE_SYSTEM_DOCUMENTATION.md** (NEW FILE - 390 lines)

**Content:**
- Complete invoice/OCR system documentation
- Full workflow explanation
- All functions cataloged with line numbers
- Database schema reference
- UI component structure
- Technical decisions explained
- Known issues and history

**Commit:** 0f4eeb5 - fix(invoice): Add missing addManualInvoiceItem() function

---

### 4. **catering.html** (NEW FILE - 1,579 lines)

**Purpose:** Complete catering management system
**Features:**
- Toast bulk orders API integration (14 days future)
- EZCater orders integration (webhook + polling)
- Combined order list sorted by delivery date
- Intelligent prep list generation
- Line item → prep mapping system
- Print/email 2-page orders (details + prep list)
- Serving utensil logic (complex rules)

**Database Tables:**
- catering_orders
- prep_mappings

**Commits:**
- 9475f06 - feat(catering): Add comprehensive catering management system
- ccadf12 - feat(catering): Add complete unified prep mappings from real orders
- b3731a2 - feat(catering): Complete overhaul - filter by dining option GUIDs

---

### 5. **api/toast-catering-analysis.js** (NEW FILE - 367 lines)

**Purpose:** Analyze Toast historical orders to identify catering
**Endpoint:** `/api/toast-catering-analysis`
**Query Params:** `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

**Features:**
- Fetches all orders in date range with full pagination
- Analyzes dining options (CATERING, CARRYOUT, etc.)
- Filters by dining option GUIDs
- Returns complete customer data
- Includes line items with modifiers

**Commit:** 15e1ef9 - feat(catering): Add Toast historical catering analysis endpoint

---

### 6. **api/toast-catering-orders.js** (NEW FILE - 261 lines)

**Purpose:** Fetch future catering orders from Toast
**Endpoint:** `/api/toast-catering-orders`
**Query Params:** `?daysAhead=14`

**Features:**
- Fetches orders up to 14 days in future
- Filters by catering dining option GUIDs
- Returns formatted order data
- Customer info + line items
- Delivery date/time

**Commit:** b3a1efd - feat(catering): Add Toast catering order analysis endpoint

---

### 7. **api/toast-dining-options.js** (NEW FILE - 76 lines)

**Purpose:** Fetch restaurant's dining option configuration
**Endpoint:** `/api/toast-dining-options`

**Returns:**
- All dining options with GUIDs
- Names (CATERING, CARRYOUT, DINE IN, etc.)
- Used to filter orders correctly

**Commit:** 4982a0d - feat(catering): Add endpoint to fetch dining options config from Toast

---

### 8. **api/toast-single-order-debug.js** (NEW FILE - 99 lines)

**Purpose:** Debug endpoint to fetch single order with full structure
**Endpoint:** `/api/toast-single-order-debug?orderGuid=xxx`

**Features:**
- Returns complete order object
- Shows all dining options in order
- Includes selections, modifiers
- For debugging Toast data structure

**Commit:** f76fe28 - debug(toast): Add endpoint to fetch single order with complete structure

---

### 9. **supabase/migrations/add-catering-system.sql** (NEW FILE - 123 lines)

**Tables Created:**
1. **catering_orders**
   - Stores orders from Toast/EZCater
   - Fields: source, external_id, order_data (JSONB), delivery_date, customer_name, headcount, total_amount, custom_notes
   - Indexes on delivery_date and source

2. **prep_mappings**
   - Maps menu items to prep ingredients
   - Fields: menu_item_name (UNIQUE), ingredients (JSONB array)
   - Each ingredient: {name, perPortion, unit}

**Commit:** 9475f06 - feat(catering): Add comprehensive catering management system

---

### 10. **supabase/migrations/add-complete-catering-mappings.sql** (NEW FILE - 225 lines)

**Content:**
- 23 complete menu item prep mappings
- Real data extracted from actual Toast orders
- Examples:
  - Beef and Lamb Make Your Own → 7 ingredients
  - Chicken Gyro Make Your Own → 7 ingredients
  - Greek Salad → 9 ingredients
  - Baba Ganoush → 2 ingredients
  - etc.

**Format:**
```sql
INSERT INTO prep_mappings (menu_item_name, ingredients) VALUES
('Beef and Lamb Make Your Own', '[
  {"name": "Diced Tomatoes", "perPortion": 1, "unit": "oz"},
  {"name": "Mixed Greens", "perPortion": 1.5, "unit": "oz"},
  ...
]'::jsonb);
```

**Commit:** ccadf12 - feat(catering): Add complete unified prep mappings from real orders

---

## COMMIT TIMELINE (Chronological Order)

| Time | Commit | Description | Files Changed |
|------|--------|-------------|---------------|
| 12:27 | a2b3481 | Disable zoom on mobile | index.html (viewport) |
| 12:39 | af0a26a | **⚠️ Remove nested scroll containers** | index.html (5 lists) |
| 12:46 | db9430e | Standardize button heights to 44px | index.html (6 buttons) |
| 12:51 | 00c4184 | Fix button sizing in invoice section | index.html (4 buttons) |
| 12:59 | dae3bc6 | Comprehensive zoom prevention | index.html (font-size) |
| 13:04 | c627659 | Add top padding for Google Sites | index.html (padding) |
| 13:06 | 64f2b10 | Optimize padding, remove shadows | index.html (shadow) |
| 13:16 | a1689fa | Add help system | (reverted next commit) |
| 13:22 | 46e599f | **Revert help system** | - |
| 14:08 | 9475f06 | **Add catering system** | catering.html, CLAUDE.md, SQL |
| 14:13 | ccadf12 | Add complete prep mappings | CLAUDE.md, SQL |
| 14:18 | b3a1efd | Add Toast catering orders API | api/toast-catering-orders.js |
| 14:28 | 15e1ef9 | Add historical catering analysis API | api/toast-catering-analysis.js |
| 14:33 | df24736 | Add dining options logging | api files |
| 14:37 | 5b60420 | Return full sample order | api files |
| 14:43 | f76fe28 | Add single order debug endpoint | api/toast-single-order-debug.js |
| 14:46 | 4982a0d | Add dining options endpoint | api/toast-dining-options.js |
| 14:49 | aa5e89c | **Add PDF upload support** | index.html |
| 15:03 | b3731a2 | Catering overhaul - GUID filtering | catering.html |
| 15:07 | 4f14040 | **Enable PDF upload properly** | index.html |
| 15:10 | 82f0fa9 | **Auto-scroll extracted items** | index.html |
| 15:13 | c43a285 | **Auto-scroll all major sections** | index.html |
| 15:29 | 3861e85 | **Remove ALL zoom restrictions** | index.html |
| 15:35 | bd5458c | **Add debug console logging** | index.html |
| 15:47 | 0f4eeb5 | **❌ Add broken addManualInvoiceItem()** | index.html, INVOICE_SYSTEM_DOCUMENTATION.md |
| 15:53 | c11c4e3 | **Revert broken function** | index.html |

---

## 🚨 CRITICAL FINDINGS - WHAT'S BLOCKING THE SYSTEM

### **Most Likely Culprit: af0a26a (Line 1380, etc.)**

**Commit:** af0a26a - fix(mobile): Remove nested scroll containers for better Google Sites embedding

**What Changed:**
Removed `max-height: 600px; overflow-y: auto;` from 5 major list containers:
1. `inventoryList`
2. `stockCountList`
3. `prepCountList`
4. `prepRecommendationsList`
5. `extractedItemsList`

**Why This Could Cause BLANK Screen:**
- If JavaScript expects these containers to have specific height/overflow properties
- If auto-scroll code targets elements that no longer have proper positioning context
- If content becomes infinitely tall and breaks layout
- If parent containers don't handle unlimited child heights

---

### **Secondary Suspects:**

#### **1. Viewport Zoom Disable (a2b3481)**
- Changed `user-scalable=yes` → `user-scalable=no`
- Added `maximum-scale=1.0`
- **Could block:** User interaction, form inputs, page rendering on some devices

#### **2. Font Size Override (dae3bc6)**
```css
input, select, textarea, button {
  font-size: 16px !important;
}
```
- Global override with `!important`
- **Could block:** Existing styles, button rendering, form display

#### **3. Body Padding Change (c627659)**
- Added 50px top padding
- **Could block:** If scripts measure viewport/body heights incorrectly

#### **4. PDF Upload Logic (4f14040)**
- Complex new branching logic in `handleInvoiceUpload()`
- DOM manipulation for PDF messages
- **Could block:** If PDF upload path has errors, breaks upload flow entirely

#### **5. Auto-Scroll Addition (82f0fa9, c43a285)**
- Multiple `setTimeout` + `scrollIntoView()` calls
- **Could block:** If elements don't exist, infinite loops, scroll conflicts

---

## 🔧 RECOMMENDED REVERT & RE-IMPLEMENTATION PLAN

### **Phase 1: Complete Revert (IMMEDIATE)**
```bash
git reset --hard 5318356
git push origin main --force
```

**Result:** Back to Oct 11, 21:39 - Last known working version

---

### **Phase 2: Re-implement ONE BY ONE (Test After Each)**

#### **✅ Safe to Re-implement (Low Risk):**
1. **db9430e** - Button heights 48px→44px (cosmetic)
2. **00c4184** - Invoice button sizing (cosmetic)
3. **c627659** - Top padding 50px (cosmetic, may need adjustment)
4. **64f2b10** - Remove box-shadow (cosmetic)

#### **⚠️ Test Carefully (Medium Risk):**
5. **aa5e89c + 4f14040** - PDF upload support (test upload flow thoroughly)
6. **82f0fa9** - OCR auto-scroll (test OCR workflow)
7. **c43a285** - All auto-scrolls (test each section separately)

#### **🚨 High Risk - Test Extensively:**
8. **af0a26a** - Remove nested scroll containers
   - **TEST:** Scroll behavior on all 5 affected sections
   - **TEST:** Content overflow handling
   - **TEST:** Mobile vs desktop rendering
   - **FALLBACK:** If broken, keep `max-height: 600px; overflow-y: auto;`

9. **a2b3481** - Disable zoom
   - **TEST:** Form inputs on iOS
   - **TEST:** User interaction on all devices
   - **ALTERNATIVE:** Use only `font-size: 16px` instead of disabling zoom

10. **dae3bc6** - Font size override with !important
    - **TEST:** All buttons and inputs render correctly
    - **TEST:** No style conflicts
    - **ALTERNATIVE:** Use more specific selectors instead of global override

#### **📋 Add Separately (No Risk):**
11. New catering system files (separate feature, doesn't affect main app)
    - catering.html
    - API files
    - SQL migrations

---

## 📝 TESTING CHECKLIST (For Each Re-Implementation)

### **After Every Change:**
- [ ] Hard refresh page (Cmd+Shift+R)
- [ ] Check browser console for errors
- [ ] Test on mobile device (iOS + Android if possible)
- [ ] Test all major workflows:
  - [ ] AM Count
  - [ ] PM Close
  - [ ] Tip Pool
  - [ ] Invoice Upload/OCR
  - [ ] Ordering System tabs
  - [ ] Prep Sheet

### **Specific Tests for Problem Areas:**

**Scroll Container Changes (af0a26a):**
- [ ] Inventory list scrolls properly
- [ ] Stock count list scrolls properly
- [ ] Prep list scrolls properly
- [ ] Prep recommendations scroll properly
- [ ] Extracted items list scrolls properly
- [ ] No infinite heights breaking layout

**Zoom Disable (a2b3481):**
- [ ] Can still tap buttons
- [ ] Can still fill forms
- [ ] Page loads properly
- [ ] No white screen

**PDF Upload (4f14040):**
- [ ] Image upload still works
- [ ] PDF upload shows message
- [ ] OCR button disabled for PDF
- [ ] Clear button resets state
- [ ] No JavaScript errors

---

## 🎯 SUMMARY

**Total Changes Made Today:** 3,509 lines across 10 files
**Most Likely Culprit:** af0a26a removing scroll container constraints
**Secondary Suspects:** Zoom disable, font override, PDF logic
**Safe Changes:** Button sizes, colors, shadows, top padding
**Risky Changes:** Scroll containers, viewport settings, global CSS overrides

**Recommendation:**
1. Revert to 5318356 immediately
2. Re-add safe changes first
3. Test risky changes one at a time
4. Keep catering system separate (doesn't affect main app)

---

**Last Updated:** 2025-10-12 15:58
**Status:** Ready for revert and systematic re-implementation
