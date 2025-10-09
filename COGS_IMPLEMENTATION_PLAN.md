# COGs System Implementation Plan
**Project:** Jayna Cash Counter - Cost of Goods Sold Module
**Timeline:** 3 Days Maximum
**Created:** 2025-10-09

---

## 🎯 Project Overview

Build a comprehensive COGs (Cost of Goods Sold) tracking system with camera-based inventory counting and invoice data extraction. The system will integrate seamlessly with the existing Jayna Cash Counter platform while maintaining consistent UX.

---

## 📋 Core Requirements

### 1. Navigation & Access
- ✅ New "COGs" button in main menu (darker grey color)
- ✅ Password-protected (same flow as Manager Dashboard)
- ✅ Session persistence across pages (60-minute manager login)
- ✅ New HTML page (cogs.html) to reduce index.html size

### 2. Visual Consistency
- ✅ Identical header with all navigation buttons
- ✅ Same CSS styling and color scheme
- ✅ Seamless page transition (user shouldn't notice they left index.html)
- ✅ Responsive mobile-first design

### 3. Camera Features
- 📸 **Shelf Scanning:** Point camera at shelf → auto-count inventory
- 📄 **Invoice Scanning:** Point camera at invoice → extract all data
- 📊 **Daily Counts:** Camera-assisted on-hand counts with manual adjustment

### 4. Data Management
- 📦 Item master list (products, units, par levels, costs)
- 📝 Invoice history (vendor, date, items, prices)
- 📈 Daily inventory snapshots (on-hand counts, adjustments, notes)
- 💰 COGs calculations and variance tracking

### 5. Reporting
- 📊 Food cost % by period
- 📉 Usage trends and forecasting
- ⚠️ Variance alerts (theoretical vs actual)
- 📋 Comprehensive COGs reports

---

## 🏗️ Technical Architecture

### File Structure
```
/
├── index.html                    # Main app (existing)
├── manager.html                  # Manager dashboard (existing)
├── cogs.html                     # NEW - COGs module
├── comprehensive-analysis.html   # Analysis tool (existing)
├── api/
│   ├── cogs-save-invoice.js      # NEW - Save invoice data
│   ├── cogs-save-count.js        # NEW - Save inventory count
│   ├── cogs-get-items.js         # NEW - Get item master
│   └── cogs-reports.js           # NEW - Generate reports
├── COGS_IMPLEMENTATION_PLAN.md   # This file
└── database/
    └── cogs_schema.sql           # NEW - Database schema
```

### Database Schema (Supabase)

#### Table: `inventory_items`
```sql
CREATE TABLE inventory_items (
  id BIGSERIAL PRIMARY KEY,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'meat', 'produce', 'dry_goods', etc.
  unit TEXT NOT NULL, -- 'lb', 'case', 'each', etc.
  par_level NUMERIC,
  current_cost NUMERIC,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Table: `invoices`
```sql
CREATE TABLE invoices (
  id BIGSERIAL PRIMARY KEY,
  vendor_name TEXT NOT NULL,
  invoice_number TEXT,
  invoice_date DATE NOT NULL,
  total_amount NUMERIC,
  image_url TEXT, -- Stored invoice photo
  extracted_data JSONB, -- Raw OCR data
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Table: `invoice_items`
```sql
CREATE TABLE invoice_items (
  id BIGSERIAL PRIMARY KEY,
  invoice_id BIGINT REFERENCES invoices(id),
  inventory_item_id BIGINT REFERENCES inventory_items(id),
  item_description TEXT,
  quantity NUMERIC,
  unit_price NUMERIC,
  total_price NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Table: `inventory_counts`
```sql
CREATE TABLE inventory_counts (
  id BIGSERIAL PRIMARY KEY,
  count_date DATE NOT NULL,
  inventory_item_id BIGINT REFERENCES inventory_items(id),
  quantity_counted NUMERIC NOT NULL,
  quantity_adjusted NUMERIC, -- Manual adjustment
  adjustment_reason TEXT,
  counted_by TEXT,
  image_url TEXT, -- Photo of counted items
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Table: `cogs_reports`
```sql
CREATE TABLE cogs_reports (
  id BIGSERIAL PRIMARY KEY,
  report_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  opening_inventory NUMERIC,
  purchases NUMERIC,
  closing_inventory NUMERIC,
  cogs_total NUMERIC, -- Opening + Purchases - Closing
  sales_total NUMERIC, -- From Toast API
  food_cost_percentage NUMERIC, -- COGs / Sales
  theoretical_usage NUMERIC,
  actual_usage NUMERIC,
  variance NUMERIC,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎥 Camera Technology Options

### Option 1: OCR (Text Recognition) - **RECOMMENDED FOR MVP**
**Best for:** Invoice scanning, label reading
**Technology:** Tesseract.js (browser-based OCR)
**Pros:**
- Works entirely in browser (no server costs)
- Good for structured text (invoices, receipts)
- Open source and well-documented

**Cons:**
- Requires good lighting and clear text
- May need user correction for accuracy

**Implementation:**
```javascript
// Example: Scan invoice with Tesseract.js
import Tesseract from 'tesseract.js';

async function scanInvoice(imageFile) {
  const result = await Tesseract.recognize(imageFile, 'eng');
  const text = result.data.text;

  // Parse invoice data (vendor, date, items, prices)
  const parsed = parseInvoiceText(text);
  return parsed;
}
```

### Option 2: Computer Vision (Object Detection)
**Best for:** Counting items on shelves
**Technology:** TensorFlow.js + pre-trained models
**Pros:**
- Can identify and count objects automatically
- Works for unlabeled items

**Cons:**
- Requires training data for your specific products
- More complex implementation
- May need server-side processing

**Recommendation:** Start with OCR for invoices (Phase 1), add computer vision for shelf counting (Phase 2+)

---

## 📅 3-Day Implementation Timeline

### **DAY 1: Foundation & Navigation** (6-8 hours)

#### Morning (3-4 hours)
- ✅ Create `cogs.html` page with shared header/styling
- ✅ Add "COGs" button to main menu (index.html, manager.html)
- ✅ Implement password protection + session persistence
- ✅ Test navigation flow and styling consistency

#### Afternoon (3-4 hours)
- ✅ Design and create Supabase database schema
- ✅ Build item master list UI (add/edit/delete items)
- ✅ Create API endpoint: `cogs-get-items.js`
- ✅ Test basic CRUD operations for inventory items

**End of Day 1 Deliverable:** Working COGs page with item management

---

### **DAY 2: Invoice Scanning & Data Entry** (8-10 hours)

#### Morning (4-5 hours)
- 📸 Implement camera access and photo capture UI
- 📄 Integrate Tesseract.js for OCR invoice scanning
- 🧩 Build invoice parser (extract vendor, date, items, prices)
- 💾 Create API endpoint: `cogs-save-invoice.js`

#### Afternoon (4-5 hours)
- ✅ Build invoice review/edit UI (user corrects OCR errors)
- ✅ Auto-match invoice items to item master list
- ✅ Save invoice data to database with line items
- ✅ Create invoice history view (past invoices, search, filter)

**End of Day 2 Deliverable:** Functional invoice scanning with OCR

---

### **DAY 3: Daily Counts & Reporting** (8-10 hours)

#### Morning (4-5 hours)
- 📊 Build daily inventory count UI
- 📸 Camera-assisted counting with manual adjustment
- 💾 Create API endpoint: `cogs-save-count.js`
- ✅ Save daily counts to database with photos

#### Afternoon (4-5 hours)
- 📈 Build COGs calculation engine
  - Opening inventory (last count)
  - + Purchases (invoices for period)
  - - Closing inventory (current count)
  - = COGs
- 📊 Create comprehensive COGs report
  - Food cost % (COGs / Sales from Toast)
  - Variance analysis (theoretical vs actual)
  - Usage trends
- 🎨 Build report display with charts
- ✅ Final testing and bug fixes

**End of Day 3 Deliverable:** Complete COGs system with reporting

---

## 🎨 UI/UX Design Mockup

### COGs Main Dashboard
```
┌─────────────────────────────────────────────────┐
│  [HOME] [CASH COUNT] [TIP POOL] [MANAGER] [COGS]│ ← Navigation
└─────────────────────────────────────────────────┘

╔═════════════════════════════════════════════════╗
║       COST OF GOODS SOLD MANAGEMENT             ║
╚═════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────┐
│  Quick Actions                                   │
├─────────────────────────────────────────────────┤
│  [📸 Scan Invoice]  [📦 Daily Count]            │
│  [📋 View Reports]  [🏷️ Manage Items]           │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  This Week Summary                               │
├─────────────────────────────────────────────────┤
│  Food Cost %:    28.5%  ✅                       │
│  COGs Total:     $12,450.00                      │
│  Variance:       -$127.00  ⚠️                    │
└─────────────────────────────────────────────────┘
```

### Invoice Scanning Flow
```
1. Click "Scan Invoice" button
2. Camera opens → Take photo of invoice
3. OCR processes image (loading spinner)
4. Review extracted data:
   ┌────────────────────────────────┐
   │ Vendor: Sysco Sacramento       │ [Edit]
   │ Date:   10/09/2025             │ [Edit]
   │ Invoice#: 12345678             │ [Edit]
   │                                │
   │ Items Found:                   │
   │ ☑ Ground Beef 40lb  $120.00   │ → Auto-matched
   │ ☐ Tomatoes Case     $45.00    │ → Needs review
   │ ☑ Onions 50lb       $28.00    │ → Auto-matched
   │                                │
   │ [Save Invoice]  [Retake Photo] │
   └────────────────────────────────┘
5. Data saved to database
```

### Daily Count Flow
```
1. Click "Daily Count" button
2. Select category (Meat, Produce, Dry Goods, etc.)
3. Camera opens → Take photo of shelf
4. OCR/CV attempts to read labels and count
5. User reviews and adjusts:
   ┌────────────────────────────────┐
   │ Ground Beef (40lb case)        │
   │ Camera detected: 3 cases       │
   │ Adjust:  [-]  [3]  [+]        │
   │                                │
   │ Chicken Breast (5lb bag)       │
   │ Camera detected: Unable to read│
   │ Manual count: [___]            │
   │                                │
   │ [Save Count]  [Next Category]  │
   └────────────────────────────────┘
6. Counts saved with timestamp and photo
```

---

## 🔐 Security & Session Management

### Password Protection
```javascript
// COGs button in main menu (index.html)
<button onclick="accessCOGs()">COGs</button>

function accessCOGs() {
  // Check if manager session is active
  const managerSession = localStorage.getItem('managerLoginTimestamp');
  const now = Date.now();

  if (managerSession && (now - managerSession < 60 * 60 * 1000)) {
    // Session valid - go to COGs
    window.location.href = 'cogs.html';
  } else {
    // Prompt for password
    const password = prompt('Enter manager password:');
    if (password === 'your_password') {
      localStorage.setItem('managerLoginTimestamp', now);
      window.location.href = 'cogs.html';
    } else {
      alert('Incorrect password');
    }
  }
}
```

### Session Persistence (cogs.html)
```javascript
// On page load, check if manager session is valid
window.addEventListener('DOMContentLoaded', () => {
  const managerSession = localStorage.getItem('managerLoginTimestamp');
  const now = Date.now();

  if (!managerSession || (now - managerSession > 60 * 60 * 1000)) {
    // Session expired - redirect to home
    alert('Session expired. Please log in again.');
    window.location.href = 'index.html';
  }
});
```

---

## 🧪 Testing Strategy

### Day 1 Tests
- ✅ Navigation buttons work from all pages
- ✅ Password protection blocks unauthorized access
- ✅ Session persists for 60 minutes
- ✅ Styling matches across pages
- ✅ Item CRUD operations work correctly

### Day 2 Tests
- ✅ Camera access works on mobile devices
- ✅ OCR extracts text from invoice photos
- ✅ Parser correctly identifies vendor, date, items, prices
- ✅ User can correct OCR errors before saving
- ✅ Invoice data saves to database correctly

### Day 3 Tests
- ✅ Daily count workflow is intuitive
- ✅ Manual adjustments save correctly
- ✅ COGs calculation is accurate
- ✅ Food cost % matches manual calculations
- ✅ Reports display correctly on mobile and desktop

---

## 📦 Dependencies & Libraries

### New NPM Packages (if using build system)
```json
{
  "tesseract.js": "^5.0.0",      // OCR for invoice scanning
  "chart.js": "^4.0.0",          // Charts for reporting
  "date-fns": "^2.30.0"          // Date manipulation
}
```

### CDN Imports (for vanilla HTML)
```html
<!-- Tesseract.js for OCR -->
<script src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'></script>

<!-- Chart.js for reports -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.0.0/dist/chart.umd.js"></script>
```

---

## 🚀 Future Enhancements (Beyond 3 Days)

### Phase 2 (Week 2)
- 🤖 AI-powered item matching (fuzzy search for invoice items)
- 📊 Advanced reporting (trend analysis, forecasting)
- 📱 PWA features (offline mode, push notifications)
- 🔔 Automated alerts (low stock, high variance, cost spikes)

### Phase 3 (Month 2)
- 🎯 Computer vision for shelf counting (TensorFlow.js)
- 📦 Barcode/QR code scanning support
- 🔗 Direct vendor integrations (auto-import invoices)
- 📈 Predictive ordering suggestions

### Phase 4 (Month 3+)
- 🧠 Machine learning for waste prediction
- 📊 Integration with Toast recipe management
- 💰 Profitability analysis by menu item
- 🌐 Multi-location support

---

## ✅ Requirements Confirmed

1. **Inventory Categories:**
   - PRODUCE, MEAT, GYROS (separate from meat), BREADS, LIQUOR, BEER, WINE, DAIRY, NA DRINKS, JUICES
   - Have example lists but not complete - will build as we go

2. **Invoice Processing:**
   - Vendors: Dynamic assignment (create/assign as items come in)
   - Format: Both PDF and paper receipts
   - Data: ALL (item, price, quantity, date, vendor) - show/hide columns

3. **Daily Counts:**
   - Frequency: Variable (daily for some, weekly for others - user selects)
   - Suggestions: YES - based on usage patterns and real data
   - Waste/spoilage: YES - optional tracking

4. **Reporting:**
   - Metrics: ALL (food cost %, usage trends, variance from theoretical)
   - Toast integration: YES for theoretical usage calculations
   - Alerts: YES for high-cost items and unusual variances

5. **Camera Tech:**
   - Tech: BOTH OCR and computer vision
   - Connectivity: Online (better quality)
   - Barcode/QR: YES - especially important for beer and drinks

---

## 🎯 Success Criteria

By end of Day 3, the system should:
- ✅ Allow users to scan invoices and extract data
- ✅ Save invoice data to database
- ✅ Enable daily inventory counts with camera
- ✅ Calculate COGs and food cost %
- ✅ Generate comprehensive reports
- ✅ Work seamlessly on mobile devices
- ✅ Match existing app's look and feel

---

## 📝 Notes & Considerations

1. **OCR Accuracy:** Expect 80-90% accuracy initially. User review/correction is critical.

2. **Camera Permissions:** Mobile browsers require HTTPS for camera access (Vercel provides this).

3. **Data Entry Fallback:** Always provide manual entry option if camera/OCR fails.

4. **Performance:** Process images on device when possible to avoid API costs.

5. **Storage:** Consider Supabase storage for invoice photos (free tier: 1GB).

6. **Backup:** Export data as CSV/Excel for accounting software integration.

---

**Ready to start implementation? Please answer the Open Questions above, then we'll begin Day 1!**
