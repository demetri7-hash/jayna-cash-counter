# 🚀 RESTAURANT MANAGEMENT PLATFORM (MarginEdge Alternative)
## Comprehensive Buildout Plan - Supabase + Vercel

**Research Completed:** October 18, 2025
**Status:** Ready to Build
**Estimated Build Time:** 22-28 hours (MVP: 10-14 hours)

---

## 📊 EXECUTIVE SUMMARY

**What is MarginEdge?**
MarginEdge is a $330/month restaurant back-office management platform that automates invoice processing, tracks food costs in real-time, manages inventory, calculates recipe costs, and provides daily P&L reports. It integrates with 60+ POS systems and eliminates manual data entry through OCR + human verification.

**Our Goal:** Build a feature-complete alternative using **free/affordable services** that can be built in **~1 day** once we start coding.

**Cost Comparison:**
- **MarginEdge:** $330/month ($3,960/year)
- **Our Platform:** $0-50/month depending on usage (95%+ savings)

---

## 🎯 CORE FEATURES BREAKDOWN

### 1. **INVOICE PROCESSING & OCR**
**What MarginEdge Does:**
- Submit invoices via photo, email, upload, or EDI
- OCR + human verification processes invoices in 24-48 hours
- Automatically codes invoices to accounting categories
- Extracts line-item data (vendor, item, quantity, price, total)
- Stores digital copies
- Syncs to accounting systems (QuickBooks, Xero, etc.)

**How We'll Build It:**
- Tesseract.js for free client-side OCR
- Google Vision API fallback for difficult invoices
- User verification interface for OCR results
- Supabase Storage for PDF/image files
- Email-to-database parser (Parsio/Mailgun)

### 2. **COST MANAGEMENT**
**What MarginEdge Does:**
- Daily P&L tracking (profit & loss statements)
- Real-time cost insights by category
- Price change alerts (track product price fluctuations)
- Budget tracking and variance reporting
- Prime cost calculations (COGS + labor)
- Theoretical vs. actual cost variance analysis

**How We'll Build It:**
- Toast API integration (already have this!)
- Homebase API for labor costs (already have this!)
- Automated price tracking on invoice save
- Database triggers for price change detection
- Email alerts via EmailJS (already using!)

### 3. **INVENTORY MANAGEMENT**
**What MarginEdge Does:**
- Digital inventory counts
- Par level management
- FIFO tracking (first in, first out)
- Waste tracking and reporting
- Purchase vs. sold comparisons
- Automated reorder suggestions based on par levels

**How We'll Build It:**
- Mobile-friendly count interface
- Par level calculations
- Waste entry form with cost calculations
- Reorder alerts dashboard
- Historical trending

### 4. **VENDOR & ORDERING**
**What MarginEdge Does:**
- Centralized vendor management
- Purchase order creation
- Approval workflows by spend/role/location
- Mobile ordering and approvals
- Price comparison across vendors
- Order history tracking

**How We'll Build It:**
- Vendor CRUD interface
- Purchase order builder
- Role-based approval system (Supabase Auth)
- Email notifications for approvals
- PO vs. invoice comparison

### 5. **RECIPE COSTING & ANALYSIS**
**What MarginEdge Does:**
- Recipe database with ingredient costs
- Theoretical cost calculations per menu item
- Menu profitability analysis
- PMIX (product mix) integration with POS
- Automatic cost updates when ingredient prices change
- Theoretical vs. actual usage comparison

**How We'll Build It:**
- Recipe builder with ingredient selection
- Auto-calculation of recipe costs
- Toast POS menu item integration
- Food cost percentage tracking
- Menu engineering matrix (star/dog/puzzle/plow)

### 6. **REPORTING & ANALYTICS**
**What MarginEdge Does:**
- Daily sales reports (auto-pulled from POS)
- Labor summaries
- Controllable P&L
- Price history tracking
- Waste reports
- Budget vs. actual comparisons
- Multi-location dashboards

**How We'll Build It:**
- jsPDF for report generation (already using!)
- Chart.js for visualizations
- Automated email reports via EmailJS
- Vercel cron jobs for nightly syncs
- Export to Excel/CSV functionality

### 7. **INTEGRATIONS**
**What MarginEdge Does:**
- 60+ POS integrations (Toast, Square, Clover, etc.)
- 10+ accounting system integrations (QuickBooks, Xero)
- Labor management systems
- EDI connections with major distributors
- Nightly automated data sync

**How We'll Build It:**
- Toast API (already integrated!)
- Homebase API (already integrated!)
- QuickBooks export format (CSV)
- Email parser for vendor invoices
- Vercel serverless cron jobs

---

## 🛠️ OUR TECH STACK (FREE/AFFORDABLE)

### **Backend Infrastructure**
| Service | Use Case | Free Tier | Cost After Free |
|---------|----------|-----------|-----------------|
| **Supabase** | PostgreSQL database, Auth, Storage | 500MB DB + 1GB storage, 2 projects | $25/month (Pro) |
| **Vercel** | Serverless functions, hosting | 100GB bandwidth, 150K function calls/month | $20/month (Pro) |
| **Cloudflare R2** | Invoice file storage (optional) | 10GB + 10M reads + 1M writes/month | $0.015/GB after |

### **OCR & Document Processing**
| Service | Use Case | Free Tier | Cost After Free |
|---------|----------|-----------|-----------------|
| **Tesseract.js** | Open-source OCR (client-side) | Unlimited, free forever | $0 |
| **Google Vision API** | High-accuracy OCR (fallback) | 1,000 units/month free | $1.50 per 1,000 units |
| **Mindee Receipt API** | Pre-trained receipt/invoice parser | 25 pages/month | $0.10/page |
| **Parsio** | Email-to-database parser | Free tier available | $29/month for more |

### **PDF & Reporting**
| Library | Use Case | Cost |
|---------|----------|------|
| **jsPDF** | Client-side PDF generation | Free (open-source) |
| **pdfmake** | Advanced PDF layouts | Free (open-source) |
| **html2pdf.js** | HTML to PDF conversion | Free (open-source) |

### **POS Integration**
| Service | Use Case | Cost |
|---------|----------|------|
| **Toast API** | Already integrated! | $50/month (Toast fee) |
| **Square API** | Sales data pull | Free |
| **Direct DB Access** | For other POS systems | Varies |

### **Email & Notifications**
| Service | Use Case | Free Tier |
|---------|----------|-----------|
| **EmailJS** | Already using! | 200 emails/month |
| **Resend** | Transactional emails | 3,000/month |
| **Mailgun** | Email parser webhooks | 5,000/month |

---

## 🗄️ DATABASE SCHEMA (Supabase PostgreSQL)

```sql
-- VENDORS TABLE
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address JSONB,
  payment_terms TEXT,
  account_number TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INVOICE HEADERS TABLE
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID REFERENCES vendors(id),
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,
  subtotal DECIMAL(10,2),
  tax DECIMAL(10,2),
  delivery_fee DECIMAL(10,2),
  total DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, approved, paid, voided
  file_url TEXT, -- Stored in Supabase Storage or R2
  ocr_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  ocr_confidence DECIMAL(3,2),
  accounting_category TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ
);

-- INVOICE LINE ITEMS TABLE
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  description TEXT NOT NULL,
  quantity DECIMAL(10,3) NOT NULL,
  unit TEXT, -- lbs, cases, each, etc.
  unit_price DECIMAL(10,4) NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,
  category TEXT, -- food, beverage, supplies, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRODUCTS (Master Item Database)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT, -- meat, produce, dairy, etc.
  subcategory TEXT,
  unit TEXT, -- lbs, cases, gallons, etc.
  current_price DECIMAL(10,4),
  last_price DECIMAL(10,4),
  price_changed_at TIMESTAMPTZ,
  par_level DECIMAL(10,2),
  on_hand DECIMAL(10,2) DEFAULT 0,
  vendor_id UUID REFERENCES vendors(id),
  vendor_sku TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRICE HISTORY TABLE
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id),
  vendor_id UUID REFERENCES vendors(id),
  price DECIMAL(10,4) NOT NULL,
  invoice_id UUID REFERENCES invoices(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- RECIPES TABLE
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, -- Menu item name
  category TEXT, -- appetizer, entree, dessert, etc.
  serving_size DECIMAL(10,2),
  current_cost DECIMAL(10,4), -- Calculated from ingredients
  selling_price DECIMAL(10,2),
  food_cost_percentage DECIMAL(5,2), -- (cost/price)*100
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RECIPE INGREDIENTS TABLE
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity DECIMAL(10,4) NOT NULL,
  unit TEXT,
  cost_per_serving DECIMAL(10,4), -- Calculated
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INVENTORY COUNTS TABLE
CREATE TABLE inventory_counts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  count_date DATE NOT NULL,
  product_id UUID REFERENCES products(id),
  counted_quantity DECIMAL(10,2) NOT NULL,
  unit TEXT,
  counted_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- WASTE TRACKING TABLE
CREATE TABLE waste_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id),
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT,
  reason TEXT, -- spoilage, overproduction, error, etc.
  cost DECIMAL(10,2), -- Calculated from current product price
  recorded_by UUID REFERENCES auth.users(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- PURCHASE ORDERS TABLE
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID REFERENCES vendors(id),
  po_number TEXT UNIQUE,
  order_date DATE NOT NULL,
  expected_delivery DATE,
  status TEXT DEFAULT 'draft', -- draft, submitted, approved, received, cancelled
  subtotal DECIMAL(10,2),
  total DECIMAL(10,2),
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PURCHASE ORDER ITEMS TABLE
CREATE TABLE po_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT,
  unit_price DECIMAL(10,4),
  line_total DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DAILY P&L TABLE
CREATE TABLE daily_pl (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_date DATE NOT NULL UNIQUE,
  gross_sales DECIMAL(10,2),
  net_sales DECIMAL(10,2),
  cogs DECIMAL(10,2), -- Cost of Goods Sold
  labor_cost DECIMAL(10,2),
  prime_cost DECIMAL(10,2), -- COGS + Labor
  other_expenses JSONB, -- {supplies: 50.00, utilities: 100.00, etc.}
  total_expenses DECIMAL(10,2),
  net_profit DECIMAL(10,2),
  food_cost_percentage DECIMAL(5,2),
  labor_cost_percentage DECIMAL(5,2),
  prime_cost_percentage DECIMAL(5,2),
  synced_from_pos BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BUDGET TABLE
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL, -- food, labor, supplies, etc.
  budget_period TEXT, -- weekly, monthly, yearly
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budgeted_amount DECIMAL(10,2) NOT NULL,
  actual_amount DECIMAL(10,2) DEFAULT 0,
  variance DECIMAL(10,2), -- budgeted - actual
  variance_percentage DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRICE ALERTS TABLE
CREATE TABLE price_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id),
  alert_type TEXT, -- increase, decrease, threshold
  threshold_percentage DECIMAL(5,2), -- Alert if price changes by X%
  threshold_amount DECIMAL(10,4), -- Or if price exceeds $X
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_invoices_vendor ON invoices(vendor_id);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_product ON invoice_items(product_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_price_history_product ON price_history(product_id);
CREATE INDEX idx_daily_pl_date ON daily_pl(business_date);
CREATE INDEX idx_inventory_counts_date ON inventory_counts(count_date);
CREATE INDEX idx_waste_entries_date ON waste_entries(recorded_at);
```

---

## 🏗️ FEATURE-BY-FEATURE BUILDOUT PLAN

### **PHASE 1: MVP FOUNDATION (4-6 hours)**

#### **1.1 Database Setup** (30 min)
- [ ] Create Supabase project
- [ ] Run SQL schema creation scripts
- [ ] Enable Row Level Security (RLS) policies
- [ ] Create auth.users table extensions

#### **1.2 Authentication** (30 min)
- [ ] Implement Supabase Auth (email/password)
- [ ] Create login/register pages
- [ ] Add password reset functionality
- [ ] Set up user roles (admin, manager, staff)

#### **1.3 Basic UI Framework** (1 hour)
- [ ] Create main navigation using existing design system
- [ ] Build dashboard layout (similar to manager.html)
- [ ] Add responsive grid system
- [ ] Create reusable component library (buttons, forms, tables)

#### **1.4 Invoice Upload & Storage** (2 hours)
- [ ] Create invoice upload interface (drag-drop + camera)
- [ ] Connect to Supabase Storage
- [ ] Implement file validation (PDF, JPG, PNG)
- [ ] Create invoice list view with thumbnails
- [ ] Add basic metadata form (vendor, date, amount)

#### **1.5 Vendor Management** (1 hour)
- [ ] Create vendor CRUD interface
- [ ] Add vendor list view
- [ ] Create vendor detail page
- [ ] Implement vendor search/filter

---

### **PHASE 2: OCR & INVOICE PROCESSING (3-4 hours)**

#### **2.1 OCR Integration** (2 hours)
- [ ] Implement Tesseract.js for client-side OCR
- [ ] Create Vercel serverless function for Google Vision API fallback
- [ ] Build OCR processing queue
- [ ] Extract key fields: vendor, date, invoice #, total, line items
- [ ] Display OCR results for user verification

#### **2.2 Invoice Line Item Extraction** (1 hour)
- [ ] Parse line items from OCR text
- [ ] Use regex patterns for common invoice formats
- [ ] Create editable line item table
- [ ] Auto-match products to master database
- [ ] Allow manual corrections

#### **2.3 Product Matching & Learning** (1 hour)
- [ ] Implement fuzzy matching algorithm
- [ ] Create "unmatched items" review queue
- [ ] Build product mapping interface
- [ ] Save mappings for future auto-detection
- [ ] Track vendor-specific SKUs

---

### **PHASE 3: COST TRACKING & ANALYTICS (3-4 hours)**

#### **3.1 Price History Tracking** (1 hour)
- [ ] Automatically log price changes on invoice processing
- [ ] Create price history view per product
- [ ] Build price change alert system
- [ ] Calculate % change over time
- [ ] Send email alerts for significant price changes

#### **3.2 Daily P&L Integration** (1.5 hours)
- [ ] Pull Toast POS sales data (already have API access!)
- [ ] Calculate daily COGS from invoices
- [ ] Pull labor data from Homebase (already integrated!)
- [ ] Calculate prime cost (COGS + Labor)
- [ ] Generate daily P&L report
- [ ] Display P&L dashboard with charts

#### **3.3 Budget Tracking** (1 hour)
- [ ] Create budget setup interface
- [ ] Calculate actual vs. budgeted variance
- [ ] Build budget dashboard with visual indicators
- [ ] Add weekly/monthly/yearly views
- [ ] Color-code over/under budget categories

#### **3.4 Reporting Module** (30 min)
- [ ] Generate PDF reports using jsPDF
- [ ] Create email templates for daily/weekly reports
- [ ] Schedule automated reports via Vercel cron jobs
- [ ] Add export to Excel functionality

---

### **PHASE 4: INVENTORY MANAGEMENT (3-4 hours)**

#### **4.1 Inventory Count Interface** (1.5 hours)
- [ ] Create mobile-friendly count form
- [ ] Build product search/barcode scanner
- [ ] Save inventory counts to database
- [ ] Calculate variance from expected inventory
- [ ] Display inventory history

#### **4.2 Par Level Management** (1 hour)
- [ ] Add par level fields to product management
- [ ] Create reorder suggestions based on par levels
- [ ] Build "low stock" alerts dashboard
- [ ] Calculate days of inventory remaining

#### **4.3 Waste Tracking** (1 hour)
- [ ] Create waste entry form
- [ ] Categorize waste reasons
- [ ] Calculate waste cost from current prices
- [ ] Build waste reports by category/time period
- [ ] Display waste trends and patterns

#### **4.4 Theoretical vs. Actual** (30 min)
- [ ] Calculate theoretical usage from POS sales + recipes
- [ ] Compare to actual inventory depletion
- [ ] Display variance percentage
- [ ] Identify high-variance items for investigation

---

### **PHASE 5: RECIPE COSTING (2-3 hours)**

#### **5.1 Recipe Database** (1 hour)
- [ ] Create recipe CRUD interface
- [ ] Add ingredient selection from products
- [ ] Calculate recipe cost automatically
- [ ] Update costs when ingredient prices change
- [ ] Display food cost percentage

#### **5.2 Menu Analysis** (1 hour)
- [ ] Pull menu items from Toast POS
- [ ] Link POS items to recipes
- [ ] Calculate profitability by menu item
- [ ] Identify high/low margin items
- [ ] Build menu engineering matrix (stars, dogs, puzzles, plowhorses)

#### **5.3 Recipe Reports** (30 min)
- [ ] Generate recipe cost reports
- [ ] Export recipe cards as PDFs
- [ ] Create "what-if" pricing calculator
- [ ] Show impact of price changes on margins

---

### **PHASE 6: VENDOR ORDERING & APPROVAL (2-3 hours)**

#### **6.1 Purchase Order Creation** (1.5 hours)
- [ ] Create PO form with vendor selection
- [ ] Add items from product database
- [ ] Auto-suggest items below par level
- [ ] Calculate PO totals
- [ ] Save as draft or submit

#### **6.2 Approval Workflow** (1 hour)
- [ ] Implement role-based permissions
- [ ] Set approval thresholds by amount
- [ ] Send email notifications to approvers
- [ ] Build approval queue interface
- [ ] Track approval history

#### **6.3 Order History & Tracking** (30 min)
- [ ] Display all POs by status
- [ ] Mark POs as received
- [ ] Compare PO to actual invoice
- [ ] Flag discrepancies for review

---

### **PHASE 7: INTEGRATIONS & AUTOMATION (2-3 hours)**

#### **7.1 Email-to-Invoice Parser** (1.5 hours)
- [ ] Set up Parsio or Mailgun email parser
- [ ] Create unique email address for invoice forwarding
- [ ] Extract PDF attachments automatically
- [ ] Trigger OCR processing on new emails
- [ ] Store in pending invoice queue

#### **7.2 Toast POS Deep Integration** (1 hour)
- [ ] Expand existing Toast API integration
- [ ] Pull daily sales by category
- [ ] Pull item-level sales for theoretical usage
- [ ] Sync menu items and prices
- [ ] Schedule nightly data sync via Vercel cron

#### **7.3 Accounting Export** (30 min)
- [ ] Generate CSV export in QuickBooks format
- [ ] Include invoice headers and line items
- [ ] Map categories to GL accounts
- [ ] Create export schedule (daily/weekly)

---

### **PHASE 8: POLISH & OPTIMIZATION (2 hours)**

#### **8.1 Mobile Optimization** (1 hour)
- [ ] Test all interfaces on mobile devices
- [ ] Optimize forms for touch input
- [ ] Add camera access for invoice photos
- [ ] Ensure responsive tables and charts

#### **8.2 Performance** (30 min)
- [ ] Add loading states and skeletons
- [ ] Implement pagination for large tables
- [ ] Optimize database queries with indexes
- [ ] Add caching for frequently accessed data

#### **8.3 Error Handling** (30 min)
- [ ] Add try/catch blocks to all async functions
- [ ] Display user-friendly error messages
- [ ] Log errors to Supabase table for debugging
- [ ] Add retry logic for failed API calls

---

## ⏱️ TOTAL TIME ESTIMATE: **22-28 HOURS**

**Aggressive 1-Day Build:**
If we focus on MVP features only (Phases 1-3), we can build a functional system in **10-14 hours** - which is achievable in a single focused workday.

**Full Feature Build:**
With all features (Phases 1-8), we're looking at **3-4 focused work sessions** or **1-2 weeks** at a normal pace.

---

## 🎯 MVP PRIORITY RANKING

### **MUST-HAVE (Day 1)**
1. ✅ Invoice upload & storage
2. ✅ Basic OCR (Tesseract.js)
3. ✅ Vendor management
4. ✅ Invoice approval workflow
5. ✅ Price tracking
6. ✅ Daily P&L (Toast integration)

### **SHOULD-HAVE (Week 1)**
7. ⭐ Recipe costing
8. ⭐ Inventory counts
9. ⭐ Budget tracking
10. ⭐ Email-to-invoice parser
11. ⭐ Purchase orders

### **NICE-TO-HAVE (Week 2+)**
12. 💡 Advanced OCR (Google Vision fallback)
13. 💡 Waste tracking
14. 💡 Theoretical vs. actual
15. 💡 Menu engineering analysis
16. 💡 Multi-location support

---

## 💰 COST ANALYSIS

### **Estimated Monthly Costs (Small Restaurant)**

**Scenario: 100 invoices/month, 5 users, 10GB storage**

| Service | Cost | Notes |
|---------|------|-------|
| Supabase Free Tier | $0 | Sufficient for single location |
| Vercel Free Tier | $0 | 150K function calls covers usage |
| Tesseract.js OCR | $0 | Client-side, unlimited |
| EmailJS | $0 | 200 emails/month free |
| **TOTAL** | **$0/month** | 🎉 |

### **Scenario: Medium Restaurant (250 invoices/month)**

| Service | Cost | Notes |
|---------|------|-------|
| Supabase Pro | $25 | Need more storage/DB space |
| Vercel Free Tier | $0 | Still within limits |
| Google Vision (backup) | $0-5 | 1,000 free + overflow |
| Resend (emails) | $0 | 3,000 emails/month free |
| **TOTAL** | **$25-30/month** | vs. MarginEdge $330/month |

### **ROI: 91%+ cost savings compared to MarginEdge**

---

## 🚧 IMPLEMENTATION STRATEGY

### **Leverage Existing Codebase**
✅ **Already have:**
- Toast POS integration (sales data)
- Homebase API (labor data)
- EmailJS (automated reports)
- Supabase database
- Vercel deployment
- jsPDF (PDF generation)

✅ **Can reuse from existing code:**
- Authentication patterns
- Database query patterns
- API proxy structure
- Toast API pagination logic
- Email templates
- PDF report generation
- Design system (standardized CSS)

### **Build Strategy**
1. **Copy existing index.html structure** - reuse working patterns
2. **Expand Supabase schema** - add new tables for invoices, inventory, etc.
3. **Create new sections** - invoice management, vendor management, etc.
4. **Integrate OCR** - add Tesseract.js library
5. **Expand Toast integration** - pull more data points
6. **Add automation** - Vercel cron jobs for nightly syncs

---

## 🔧 TECHNICAL IMPLEMENTATION NOTES

### **OCR Workflow**
```javascript
// Client-side OCR with Tesseract.js
async function processInvoice(imageFile) {
  const { data: { text } } = await Tesseract.recognize(imageFile, 'eng');

  // Extract key fields using regex
  const invoiceData = {
    vendor: extractVendor(text),
    invoiceNumber: extractInvoiceNumber(text),
    date: extractDate(text),
    total: extractTotal(text),
    lineItems: extractLineItems(text)
  };

  // Save to Supabase
  await supabase.from('invoices').insert(invoiceData);
}
```

### **Price Change Detection**
```javascript
// Automatically track price changes
async function saveInvoiceItem(item) {
  const { data: product } = await supabase
    .from('products')
    .select('current_price')
    .eq('id', item.product_id)
    .single();

  if (product.current_price !== item.unit_price) {
    // Log price change
    await supabase.from('price_history').insert({
      product_id: item.product_id,
      old_price: product.current_price,
      new_price: item.unit_price,
      changed_at: new Date()
    });

    // Update current price
    await supabase.from('products').update({
      last_price: product.current_price,
      current_price: item.unit_price,
      price_changed_at: new Date()
    }).eq('id', item.product_id);

    // Send price alert if threshold exceeded
    checkPriceAlerts(item.product_id);
  }
}
```

### **Daily P&L Automation**
```javascript
// Vercel cron job - runs at 2 AM daily
export async function POST(request) {
  const businessDate = getYesterdayDate();

  // Pull Toast sales data (already have this!)
  const sales = await fetchToastSales(businessDate);

  // Calculate COGS from invoices
  const cogs = await calculateDailyCOGS(businessDate);

  // Pull labor from Homebase (already have this!)
  const labor = await fetchHomebaseLaborCost(businessDate);

  // Calculate prime cost
  const primeCost = cogs + labor;

  // Save to database
  await supabase.from('daily_pl').upsert({
    business_date: businessDate,
    gross_sales: sales.gross,
    net_sales: sales.net,
    cogs: cogs,
    labor_cost: labor,
    prime_cost: primeCost,
    food_cost_percentage: (cogs / sales.net) * 100,
    labor_cost_percentage: (labor / sales.net) * 100
  });

  // Send email report
  await sendDailyPLReport(businessDate);
}
```

### **Email-to-Invoice Parser**
```javascript
// Mailgun webhook endpoint
export async function POST(request) {
  const email = await request.json();

  // Extract PDF attachment
  const pdfAttachment = email.attachments.find(a =>
    a.contentType === 'application/pdf'
  );

  if (pdfAttachment) {
    // Upload to Supabase Storage
    const { data } = await supabase.storage
      .from('invoices')
      .upload(`pending/${Date.now()}.pdf`, pdfAttachment.data);

    // Create pending invoice record
    await supabase.from('invoices').insert({
      file_url: data.path,
      status: 'pending',
      ocr_status: 'pending',
      received_via_email: true
    });

    // Trigger OCR processing (async)
    await triggerOCRProcessing(data.path);
  }
}
```

---

## 🎨 UI/UX DESIGN APPROACH

**Leverage Existing Design System:**
- Reuse standardized CSS from current project
- Gray-scale color palette with status colors
- NO rounded corners (sharp, professional aesthetic)
- Heavy 2px borders
- ALL CAPS headers
- Touch-friendly mobile interface

**Page Structure:**
```
/login - Authentication
/dashboard - Main overview (P&L, alerts, quick actions)
/invoices - Invoice list, upload, processing queue
/invoices/:id - Invoice detail with line items
/vendors - Vendor management
/products - Product master database
/inventory - Inventory counts, par levels, waste
/recipes - Recipe costing and menu analysis
/orders - Purchase orders and approval queue
/reports - Reporting dashboard
/settings - User settings, integrations, budgets
```

---

## 📈 SUCCESS METRICS

### **System Performance Goals**
- Invoice OCR accuracy: 85%+ (with manual review)
- Processing time: <2 minutes per invoice (client-side)
- Daily P&L sync: 100% automated
- Price change detection: Real-time
- Mobile usability: All features accessible on phone

### **Business Impact**
- Time saved: 10-15 hours/week on invoice entry
- Cost savings: $330/month ($3,960/year) vs. MarginEdge
- Data accuracy: Eliminate manual entry errors
- Visibility: Real-time cost insights vs. weekly/monthly
- Decision speed: Same-day reporting vs. 24-48hr lag

---

## 🚀 NEXT STEPS TO START BUILD

1. ✅ **Research Complete** - This document!
2. **Create Supabase Project** - Set up database
3. **Run Schema Scripts** - Create all tables
4. **Copy index.html** - Use as template for new UI
5. **Build Invoice Upload** - Phase 1.4
6. **Integrate Tesseract.js** - Phase 2.1
7. **Connect Toast API** - Expand existing integration
8. **Iterate & Test** - Build feature by feature

---

## 💡 KEY INSIGHTS

### **Why This Is Achievable in 1 Day:**
1. ✅ **Already have infrastructure** - Supabase + Vercel deployed
2. ✅ **Already have POS integration** - Toast API working
3. ✅ **Already have design system** - Reuse existing CSS
4. ✅ **Clear data model** - Database schema defined
5. ✅ **Proven patterns** - Copy from working cash counter code
6. ✅ **Free OCR** - Tesseract.js requires no API keys
7. ✅ **Modular build** - Can launch MVP, iterate later

### **The MarginEdge "Secret Sauce" We're Replicating:**
- **OCR + Human Review** → We use OCR + manual correction interface
- **POS Integration** → We already have Toast API!
- **Automated Syncing** → Vercel cron jobs
- **Price Tracking** → Database triggers on invoice save
- **Daily P&L** → Toast sales + invoice COGS + Homebase labor
- **Recipe Costing** → Simple multiplication of ingredient costs

**The difference:** MarginEdge charges $330/month for human verification. We provide the interface for users to self-verify OCR results in 30 seconds per invoice.

---

## 🔍 RESEARCH SOURCES

### **Platforms Analyzed:**
- MarginEdge (primary target)
- xtraCHEF (Toast-owned competitor)
- Restaurant365 (enterprise alternative)
- Plate IQ / Ottimate
- BlueCart

### **OCR Solutions Researched:**
- Tesseract.js (open-source, client-side)
- Google Vision API (high accuracy)
- Mindee Receipt API (pre-trained)
- Nanonets (customizable)
- Veryfi (speed leader)

### **Key Findings:**
- MarginEdge pricing: $330/month per location
- 24-48 hour invoice processing time
- OCR + human verification model
- 60+ POS integrations
- QuickBooks/Xero accounting sync
- Mobile app for invoice photos
- Theoretical vs. actual cost analysis
- Recipe costing with auto-updates
- Par level management
- Approval workflows

---

## 🎯 FINAL RECOMMENDATION

**Build Approach: MVP-First, 3-Phase Rollout**

**Phase 1 (Day 1):** Invoice processing + price tracking + daily P&L
- Immediate value: Eliminate manual invoice entry
- Leverage existing Toast/Homebase integrations
- Get price visibility instantly

**Phase 2 (Week 1):** Inventory + recipe costing + purchase orders
- Add operational tools
- Enable proactive ordering
- Calculate true menu costs

**Phase 3 (Week 2+):** Advanced features + multi-location + mobile app
- Polish and optimize
- Add "nice-to-have" features
- Scale for growth

**Total Investment:**
- Development: 22-28 hours (can be spread over 2-3 weeks)
- Ongoing cost: $0-30/month vs. $330/month MarginEdge
- **ROI: Positive after 1 month of use**

---

**Status:** Ready to build whenever you are!

**Next Action:** Review this plan, then proceed to Phase 1 database setup.
