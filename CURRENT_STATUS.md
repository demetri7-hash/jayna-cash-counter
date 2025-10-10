# CURRENT STATUS - Jayna Cash Counter
**Last Updated:** 2025-10-09 (Scribe.js Research + OCR Accuracy Analysis)

---

## 🎯 Current Work Status
**Status:** 🔴 **CRITICAL: Tesseract OCR Insufficient - Scribe.js Migration Required**

### Recently Completed (This Session):

- ✅ **OCR Accuracy Analysis Complete**
  - Tested with 11-page multi-vendor PDF (Performance, Greenleaf, Mani, Alsco, Eatopia)
  - Generated debug PDF comparing original vs OCR extraction
  - **CRITICAL FINDINGS:**
    - Invoice numbers: 10% accuracy (extracting fragments like "Co", "OICE")
    - Line item quantities: 20% accuracy (15 → 1606, 2.00 → 6.2)
    - Vendor detection: 60% accuracy (Alsco → "Doe Sep")
    - Page 1 complete failure (Performance invoice rotated 90°)
    - Unit extraction: 30% accuracy (EA/CS/DZ often → "N/A")

- ✅ **Scribe.js Research Complete**
  - Found **40-90% slower BUT significantly more accurate** alternative to Tesseract
  - Built-in table extraction (export to Excel)
  - Better font recognition + PDF text layer support
  - Designed for proofreading workflow (98% → 100% accuracy)
  - AGPL 3.0 license (requires commercial license for proprietary use)

- ✅ **invoice2data Template System Research**
  - Template-based vendor-specific extraction (YAML/JSON)
  - Keyword matching for auto-vendor detection
  - Regex patterns for field locations
  - GitHub: https://github.com/invoice-x/invoice2data

### Recently Completed (Previous Session):

- ✅ **Editable Line Items with Delete Buttons**
  - Replaced read-only table with fully editable input fields (description, qty, price)
  - Added red ✕ delete buttons for each line item with confirmation
  - Added "+ Add Line Item" button to manually insert missing items
  - Users can now correct all OCR extraction errors

- ✅ **Prominent Invoice Date Display**
  - Large blue/red header bar showing date, vendor, invoice number
  - Format: "Sep 4, 2025 • Mani Imports Inc. • #0078866-IN"
  - Makes physical invoice matching easy during bulk upload
  - Enhanced date extraction with 6 different patterns

- ✅ **Page Preview Images**
  - Saved canvas as JPEG data URL (70% quality for low file size)
  - Clickable preview images for each page
  - Click to view full-size in new tab
  - Auto-deleted after save to free memory

- ✅ **Better Line Item Parsing**
  - Skip patterns filter out junk: Lot Number, Salesperson, headers
  - Better validation: price > $0.50, description > 5 chars
  - Prevents invoice headers from being extracted as items

- ✅ **Research-Based OCR Preprocessing** (CRITICAL FIX)
  - Replaced aggressive binarization with gentle Gaussian blur (3x3 kernel)
  - Changed to PSM 4 (single column - optimal for invoice columnar data)
  - Enabled auto-rotation detection (rotate_enabled: true)
  - Added character whitelist for invoice data
  - Gentle 1.2x contrast (no artifacts from hard thresholding)

### In Progress:
- 🔴 **CRITICAL: OCR System Overhaul Required**
  - Current Tesseract.js accuracy too low for production use
  - Need to migrate to Scribe.js for better accuracy
  - Need vendor template system for field extraction

### Next Session TODO (HIGH PRIORITY):
- 🚨 **Implement Scribe.js OCR Engine**
  - Replace Tesseract.js with Scribe.js
  - Integrate table extraction feature
  - Add auto-rotation detection (fix Performance invoices)
  - Test with same multi-vendor PDF

- 📋 **Build Vendor Template System**
  - Create template structure (YAML/JSON)
  - Implement keyword-based vendor auto-detection
  - Build vendor dropdown with "Create New Vendor" option
  - Template wizard for mapping unknown vendors

- 🗺️ **Map Top 3 Vendor Templates** (user to prioritize)
  - Get vendor scanning frequency from user
  - Create templates for Greenleaf, Mani, Performance (or user's top 3)
  - Define field locations, regex patterns, keywords per vendor

- 📊 **Vendor Mapping Questions for User:**
  - Which vendor scanned MOST frequently? (prioritize first)
  - Greenleaf: Always 2 pages? Invoice # location? Total location?
  - Mani: Typical page count? Any multi-page invoices?
  - Performance: Why is page 1 rotated? Scanner issue or normal?
  - Invoice history view
  - Batch processing optimization

- 📊 **COGs Day 3: Daily Counts & Reporting**
  - Camera-assisted inventory counting
  - Manual adjustment workflow
  - COGs calculation engine
  - Food cost % reporting
  - Variance analysis (theoretical vs actual)
  - Timeline: 8-10 hours

---

## 📝 Uncommitted Changes
**Git Status:** Clean - all work committed and pushed

### Recent Commits:
- `f3a9a27` - docs: Save chat session - OCR improvements and editable line items
- `459cea7` - fix(cogs): Replace aggressive binarization with proper OCR preprocessing
- `8ec74b7` - feat(cogs): Prominent date display + page preview images for invoice matching
- `09eae0f` - feat(cogs): Editable line items + image preprocessing for better OCR
- `d2c61d2` - docs: Require reading last 3 RTF chat sessions at session start
- `fa951ce` - docs: Add RTF chat session saving as Step 0 in session end protocol
- `d07a493` - feat(cogs): Complete vendor auto-detection with new vendor creation modal

All commits pushed to main and deployed to Vercel ✅

---

## 🚧 Blockers & Issues
**Current Blockers:** OCR Accuracy Too Low for Production

### CRITICAL Issues Found:
1. **Tesseract OCR Insufficient for Invoice Extraction**
   - ✅ User tested with 11-page multi-vendor PDF
   - ❌ Invoice numbers: 10% accuracy (CRITICAL)
   - ❌ Line item quantities: 20% accuracy (CRITICAL)
   - ❌ Unit extraction: 30% accuracy
   - ❌ Page rotation not detected (Performance invoice failed)
   - **SOLUTION:** Migrate to Scribe.js + vendor template system

### Technical Notes:
- OCR preprocessing changed from aggressive threshold to gentle blur
- PSM 4 (single column) optimal for invoice columnar data
- Auto-rotation detection enabled
- Page images auto-deleted after save to conserve memory
- All edits saved directly to extractedInvoices array (no backend needed)

---

## 🔜 Next Session Should Start With:
1. **Read last 3 RTF chat sessions** from `/chat sessions/` folder
2. **OCR testing COMPLETE - Tesseract FAILED**
   - Accuracy too low for production (10-30% on critical fields)
   - User approved Scribe.js migration
3. **ASK USER: Vendor Priority**
   - Which vendor scanned MOST frequently?
   - Greenleaf, Mani, or Performance first?
   - Get template mapping details (page count, field locations)
4. **IMPLEMENT: Scribe.js Migration**
   - Replace Tesseract.js with Scribe.js
   - Add auto-rotation detection
   - Build vendor template system
5. **CREATE: Top 3 Vendor Templates**
   - Based on user's priority order
   - Test with same multi-vendor PDF

---

## 📊 Production System Health
**Last Deployed:** 2025-10-09 (OCR improvements + editable line items)
**URL:** https://jayna-cash-counter.vercel.app
**Status:** ✅ Operational

### Recent Deployments:
- OCR preprocessing improvements (LIVE - testing phase)
- Editable line items with delete buttons (LIVE)
- Prominent invoice date display (LIVE)
- Page preview images with auto-cleanup (LIVE)
- Vendor auto-detection (LIVE)
- Multi-page PDF invoice scanning (LIVE)

---

## 🔐 Security Notes
**Environment Variables:** All configured (no changes needed)
**Secrets Status:** ✅ No hardcoded secrets in codebase
**Database:** All COGs tables have RLS disabled for app access

---

## 💡 Key Implementation Details

### OCR Preprocessing Pipeline (v6.1 - October 2025):

**WRONG Approach (Removed):**
```javascript
// ❌ Created artifacts in whitespace
value = value > threshold ? 255 : 0;  // Hard binarization
```

**CORRECT Approach (Current):**
```javascript
// ✅ Gentle denoising without artifacts
1. Grayscale conversion
2. Light Gaussian blur (3x3 kernel) - removes noise
3. Gentle contrast enhancement (1.2x) - no hard threshold
4. Auto-rotation detection (rotate_enabled: true)
5. PSM 4: Single column (optimal for invoice columnar data)
6. Character whitelist: alphanumeric + invoice symbols
```

**Why This Matters:**
- Aggressive binarization made accuracy WORSE
- Research showed proper preprocessing = gentle blur, not hard thresholding
- PSM 4 specifically designed for invoice table layouts
- Auto-rotation handles skewed scans without manual deskewing

### Editable Line Items:
- **Input Fields:** Description, quantity, price fully editable
- **Delete Button:** Red ✕ on each row with confirmation dialog
- **Add Button:** "+ Add Line Item" creates blank rows
- **Live Updates:** Changes immediately reflected in extractedInvoices array
- **Purpose:** User can fix ALL OCR extraction errors manually

### COGs System Architecture:

**Database Tables:**
```
inventory_items       - Product master list
vendors              - Supplier information
invoices             - Scanned invoice metadata
invoice_items        - Line items from invoices
inventory_counts     - Daily/weekly snapshots
cogs_reports         - Generated analysis
usage_tracking       - Theoretical vs actual
count_schedules      - Count reminders
```

**Page Structure (cogs.html):**
```
Navigation (persistent)
↓
Dashboard (active by default)
  - Quick Actions (4 buttons)
  - This Week Summary (placeholder)
↓
Hidden Sections (display: none)
  - Manage Items
  - Scan Invoice (Day 2)
  - Daily Count (Day 3)
  - View Reports (Day 3)
  - Item Form
```

**Display Pattern (copied from index.html):**
- Dashboard: `class="active"` in HTML (visible on load)
- Other sections: `style="display: none"` inline
- No data loads on page load (only when user clicks)
- `showSection(id)` hides all, shows selected

### Labor Cost Discrepancy Analysis:
```
Toast Web:      $9,637.82
API Calculated: $9,494.68
Difference:     $143.14

Cause: CA double-time overtime (2x pay for >12hrs/day)
      Toast API only provides total overtimeHours
      Cannot separate 1.5x from 2x overtime

Examples:
Huseyin: 26.9 OT hrs @ avg 1.78x (mix of 1.5x and 2x)
Dilan:   16.4 OT hrs @ avg 1.56x (mostly 1.5x, some 2x)

Solution: Manual input field for accurate Toast web total
```

---

## 📋 COGs Implementation Status

### Day 1: Foundation ✅ COMPLETE
- [x] cogs.html page created
- [x] Persistent navigation (all buttons visible)
- [x] Password protection + session management
- [x] Database schema (8 tables)
- [x] Item master CRUD (add, edit, delete)
- [x] 10 product categories
- [x] Filter by category
- [x] Sample data (12 items)
- [x] Navigation button in main menu

### Day 2: Invoice Scanning 🟡 IN PROGRESS (Testing Phase)
- [x] Tesseract.js OCR integration
- [x] Multi-page PDF scanning
- [x] Invoice text parser (vendor, date, items, prices)
- [x] Review/edit form with editable line items
- [x] Delete line items functionality
- [x] Add line items manually
- [x] Prominent date display for invoice matching
- [x] Page preview images (JPEG 70%, auto-deleted)
- [x] Research-based preprocessing (Gaussian blur, PSM 4)
- [x] Auto-rotation detection
- [x] Vendor auto-detection with new vendor creation
- [x] Save to database (invoices + invoice_items)
- [x] Better line item parsing (skip patterns, validation)
- [ ] 🧪 USER TESTING: OCR accuracy validation with real invoices
- [ ] Invoice history view (pending)
- [ ] Batch processing optimization (pending)

### Day 3: Counts & Reporting 🔜 PENDING
- [ ] Camera-assisted counting UI
- [ ] Manual adjustment workflow
- [ ] Save counts with photos
- [ ] COGs calculation engine
- [ ] Food cost % calculation
- [ ] Variance analysis
- [ ] Report generation
- [ ] Chart/graph display

---

**⚠️ IMPORTANT FOR NEXT CLAUDE:**
- **CRITICAL:** Read last 3 RTF chat sessions from `/chat sessions/` folder first!
- **OCR TESTING COMPLETE - Tesseract.js FAILED** (10-30% accuracy on critical fields)
- **APPROVED:** Scribe.js migration + vendor template system
- User needs to provide vendor priority order (Greenleaf, Mani, or Performance first)
- Ask vendor-specific questions to build templates (page count, field locations, etc.)

**Files to reference:**
- `/chat sessions/session_2025-10-09_scribe-ocr-research-vendor-templates.rtf` - Latest session (OCR analysis + Scribe.js research)
- `/chat sessions/session_2025-10-09_ocr-improvements-editable-items.rtf` - Previous OCR session
- `cogs.html` - Invoice scanning page (lines 1930-1991: preprocessing function - NEEDS REPLACEMENT)
- `/Users/demetrigregorakis/Downloads/Epson_10092025164750.pdf` - Original test invoices (11 pages, multi-vendor)
- `/Users/demetrigregorakis/Downloads/ocr-debug-2025-10-10.pdf` - Tesseract extraction results (for comparison)
- `AI_PROJECT_INSTRUCTIONS.md` - Startup protocol
- `CURRENT_PROJECT_DOCUMENTATION.md` - System overview

**Known Issues:**
- Tesseract.js OCR accuracy insufficient for production (CRITICAL)
- Page rotation not detected (Performance invoices fail completely)
- Invoice numbers extracted as fragments (10% accuracy)
- Line item quantities off by 10x-100x (20% accuracy)

**Next Implementation:**
- Scribe.js: https://github.com/scribeocr/scribe.js/
- invoice2data templates: https://github.com/invoice-x/invoice2data
- Table extraction docs: http://docs.scribeocr.com/tables.html
