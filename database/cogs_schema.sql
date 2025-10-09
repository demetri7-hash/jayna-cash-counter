-- COGs System Database Schema
-- Jayna Cash Counter - Cost of Goods Sold Module
-- Created: 2025-10-09

-- ============================================================================
-- TABLE: inventory_items
-- Master list of all inventory items tracked
-- ============================================================================
CREATE TABLE inventory_items (
  id BIGSERIAL PRIMARY KEY,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'PRODUCE', 'MEAT', 'GYROS', 'BREADS', 'LIQUOR',
    'BEER', 'WINE', 'DAIRY', 'NA DRINKS', 'JUICES'
  )),
  unit TEXT NOT NULL, -- 'lb', 'case', 'each', 'oz', 'gal', etc.
  par_level NUMERIC, -- Ideal stock level
  current_cost NUMERIC, -- Last known cost per unit
  current_on_hand NUMERIC DEFAULT 0, -- Current quantity in stock
  count_frequency TEXT DEFAULT 'weekly' CHECK (count_frequency IN ('daily', 'weekly', 'monthly')),
  vendor_name TEXT, -- Primary vendor for this item
  barcode TEXT, -- UPC/barcode for scanning
  sku TEXT, -- Vendor SKU
  notes TEXT,
  last_counted TIMESTAMP,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT
);

-- Index for fast category filtering
CREATE INDEX idx_inventory_items_category ON inventory_items(category);
CREATE INDEX idx_inventory_items_barcode ON inventory_items(barcode) WHERE barcode IS NOT NULL;

-- ============================================================================
-- TABLE: vendors
-- Vendor/supplier information
-- ============================================================================
CREATE TABLE vendors (
  id BIGSERIAL PRIMARY KEY,
  vendor_name TEXT NOT NULL UNIQUE,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  address TEXT,
  notes TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- TABLE: invoices
-- Scanned/uploaded invoices from vendors
-- ============================================================================
CREATE TABLE invoices (
  id BIGSERIAL PRIMARY KEY,
  vendor_id BIGINT REFERENCES vendors(id),
  vendor_name TEXT NOT NULL, -- Denormalized for quick access
  invoice_number TEXT,
  invoice_date DATE NOT NULL,
  total_amount NUMERIC,
  image_url TEXT, -- URL to stored invoice photo/PDF in Supabase storage
  extracted_data JSONB, -- Raw OCR/extraction data
  processed BOOLEAN DEFAULT FALSE,
  entered_by TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for date-based queries
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_vendor ON invoices(vendor_id);

-- ============================================================================
-- TABLE: invoice_items
-- Line items from each invoice (purchases)
-- ============================================================================
CREATE TABLE invoice_items (
  id BIGSERIAL PRIMARY KEY,
  invoice_id BIGINT REFERENCES invoices(id) ON DELETE CASCADE,
  inventory_item_id BIGINT REFERENCES inventory_items(id),
  item_description TEXT NOT NULL, -- As appears on invoice
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  matched BOOLEAN DEFAULT FALSE, -- TRUE if matched to inventory_items
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_inventory ON invoice_items(inventory_item_id);

-- ============================================================================
-- TABLE: inventory_counts
-- Physical inventory counts (daily/weekly snapshots)
-- ============================================================================
CREATE TABLE inventory_counts (
  id BIGSERIAL PRIMARY KEY,
  count_date DATE NOT NULL,
  inventory_item_id BIGINT REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity_counted NUMERIC NOT NULL,
  quantity_adjusted NUMERIC, -- Final quantity after manual adjustment
  adjustment_reason TEXT,
  waste_quantity NUMERIC DEFAULT 0, -- Items lost to spoilage/waste
  waste_reason TEXT,
  counted_by TEXT NOT NULL,
  image_url TEXT, -- Photo of counted items
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_inventory_counts_date ON inventory_counts(count_date);
CREATE INDEX idx_inventory_counts_item ON inventory_counts(inventory_item_id);

-- ============================================================================
-- TABLE: cogs_reports
-- Generated COGs reports for analysis
-- ============================================================================
CREATE TABLE cogs_reports (
  id BIGSERIAL PRIMARY KEY,
  report_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- COGs Calculation
  opening_inventory NUMERIC NOT NULL, -- Beginning inventory value
  purchases NUMERIC NOT NULL, -- Total purchases (from invoices)
  closing_inventory NUMERIC NOT NULL, -- Ending inventory value
  cogs_total NUMERIC NOT NULL, -- Opening + Purchases - Closing

  -- Sales Data (from Toast API)
  sales_total NUMERIC, -- Net sales from Toast
  food_cost_percentage NUMERIC, -- (COGs / Sales) * 100

  -- Variance Analysis
  theoretical_usage NUMERIC, -- Expected usage based on sales
  actual_usage NUMERIC, -- COGs total
  variance NUMERIC, -- Difference (actual - theoretical)
  variance_percentage NUMERIC, -- (variance / theoretical) * 100

  -- Breakdown by category (JSONB for flexibility)
  category_breakdown JSONB, -- {PRODUCE: {...}, MEAT: {...}, etc.}

  -- Alerts
  high_cost_items JSONB, -- Items with unusual cost increases
  high_variance_items JSONB, -- Items with high usage variance
  low_stock_items JSONB, -- Items below par level

  notes TEXT,
  generated_by TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cogs_reports_period ON cogs_reports(period_start, period_end);

-- ============================================================================
-- TABLE: usage_tracking
-- Theoretical usage based on Toast sales (for variance analysis)
-- ============================================================================
CREATE TABLE usage_tracking (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  inventory_item_id BIGINT REFERENCES inventory_items(id),
  theoretical_usage NUMERIC NOT NULL, -- Expected usage based on sales
  actual_usage NUMERIC, -- From inventory counts
  variance NUMERIC, -- Difference
  sales_data JSONB, -- Related Toast sales data
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_usage_tracking_date ON usage_tracking(date);
CREATE INDEX idx_usage_tracking_item ON usage_tracking(inventory_item_id);

-- ============================================================================
-- TABLE: count_schedules
-- Schedule/reminders for inventory counts
-- ============================================================================
CREATE TABLE count_schedules (
  id BIGSERIAL PRIMARY KEY,
  inventory_item_id BIGINT REFERENCES inventory_items(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  last_count_date DATE,
  next_count_date DATE,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_count_schedules_next_date ON count_schedules(next_count_date) WHERE active = TRUE;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Current inventory value by category
CREATE VIEW current_inventory_value AS
SELECT
  category,
  COUNT(*) as item_count,
  SUM(current_on_hand * current_cost) as total_value,
  SUM(current_on_hand) as total_units
FROM inventory_items
GROUP BY category;

-- Items due for counting today
CREATE VIEW items_due_for_count AS
SELECT
  i.*,
  cs.next_count_date,
  cs.priority
FROM inventory_items i
JOIN count_schedules cs ON i.id = cs.inventory_item_id
WHERE cs.active = TRUE
  AND cs.next_count_date <= CURRENT_DATE
ORDER BY cs.priority DESC, cs.next_count_date ASC;

-- Recent purchase history (last 30 days)
CREATE VIEW recent_purchases AS
SELECT
  ii.item_description,
  i.vendor_name,
  i.invoice_date,
  ii.quantity,
  ii.unit,
  ii.unit_price,
  ii.total_price,
  inv.item_name,
  inv.category
FROM invoice_items ii
JOIN invoices i ON ii.invoice_id = i.id
LEFT JOIN inventory_items inv ON ii.inventory_item_id = inv.id
WHERE i.invoice_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY i.invoice_date DESC;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Disable RLS for app access (similar to other tables)
-- ============================================================================
ALTER TABLE inventory_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE vendors DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_counts DISABLE ROW LEVEL SECURITY;
ALTER TABLE cogs_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking DISABLE ROW LEVEL SECURITY;
ALTER TABLE count_schedules DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================

-- Insert sample vendors
INSERT INTO vendors (vendor_name, contact_phone, active) VALUES
('Sysco Sacramento', '916-555-0100', TRUE),
('US Foods', '916-555-0200', TRUE),
('Shamshiri Market', '916-555-0300', TRUE),
('Smart & Final', '916-555-0400', TRUE),
('Beverage Depot', '916-555-0500', TRUE);

-- Insert sample inventory items
INSERT INTO inventory_items (item_name, category, unit, par_level, current_cost, count_frequency, vendor_name) VALUES
('Ground Beef 80/20', 'MEAT', 'lb', 40, 5.99, 'daily', 'Sysco Sacramento'),
('Chicken Breast', 'MEAT', 'lb', 30, 4.49, 'daily', 'Sysco Sacramento'),
('Gyro Meat Loaf', 'GYROS', 'loaf', 10, 45.00, 'daily', 'Shamshiri Market'),
('Tomatoes', 'PRODUCE', 'case', 5, 28.00, 'daily', 'Sysco Sacramento'),
('Onions Yellow', 'PRODUCE', 'lb', 50, 0.89, 'weekly', 'Sysco Sacramento'),
('Pita Bread', 'BREADS', 'pack', 20, 4.50, 'daily', 'Shamshiri Market'),
('Feta Cheese', 'DAIRY', 'lb', 15, 6.99, 'weekly', 'Sysco Sacramento'),
('Coors Light', 'BEER', 'case', 10, 18.99, 'weekly', 'Beverage Depot'),
('Cabernet Wine', 'WINE', 'bottle', 12, 9.99, 'monthly', 'Beverage Depot'),
('Ouzo', 'LIQUOR', 'bottle', 6, 22.99, 'monthly', 'Beverage Depot'),
('Coca Cola', 'NA DRINKS', 'case', 15, 12.99, 'weekly', 'Smart & Final'),
('Orange Juice', 'JUICES', 'gal', 8, 7.99, 'weekly', 'Sysco Sacramento');

-- ============================================================================
-- NOTES FOR IMPLEMENTATION
-- ============================================================================

-- 1. Run this entire file in Supabase SQL Editor to create all tables
-- 2. Verify tables created: Check Supabase Table Editor
-- 3. Test sample data: SELECT * FROM inventory_items;
-- 4. Verify RLS disabled: Should be able to query from app without auth issues
-- 5. Set up Supabase Storage bucket for invoice images:
--    - Bucket name: "cogs-invoices"
--    - Public access: FALSE (authenticated only)
--    - File size limit: 10MB per file
