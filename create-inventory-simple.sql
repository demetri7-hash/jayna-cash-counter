-- ====================================
-- SIMPLE STEP-BY-STEP SQL
-- Run each section separately in Supabase SQL Editor
-- ====================================

-- STEP 1: Create the table
-- Run this first, check for errors
CREATE TABLE inventory_items (
  id BIGSERIAL PRIMARY KEY,
  item_name TEXT NOT NULL,
  vendor TEXT NOT NULL,
  par_level INTEGER NOT NULL DEFAULT 0,
  current_stock INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_counted_date TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- STEP 2: Create indexes (run after Step 1 succeeds)
-- Run this second
CREATE INDEX idx_inventory_vendor ON inventory_items(vendor);
CREATE INDEX idx_inventory_item_name ON inventory_items(item_name);

-- STEP 3: Enable RLS (run after Step 2 succeeds)
-- Run this third
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- STEP 4: Create policy (run after Step 3 succeeds)
-- Run this fourth
CREATE POLICY "Allow all operations for all users"
  ON inventory_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- STEP 5: Insert Greenleaf items (run after Step 4 succeeds)
INSERT INTO inventory_items (item_name, vendor, par_level, current_stock, unit) VALUES
  ('Wild Arugula 4#/CS', 'Greenleaf', 8, 0, 'CS'),
  ('Cucumbers 36ct/CS', 'Greenleaf', 2, 0, 'CS'),
  ('English Cucumbers 12ct/CS', 'Greenleaf', 4, 0, 'CS'),
  ('Globe Eggplant 24ct/CS', 'Greenleaf', 2, 0, 'CS'),
  ('Iceberg Liner Lettuce 24ct/CS', 'Greenleaf', 10, 0, 'CS'),
  ('Jumbo Red Onions 25#/CS', 'Greenleaf', 3, 0, 'CS'),
  ('Jumbo Yellow Onions 50#/CS', 'Greenleaf', 2, 0, 'CS'),
  ('Russet Potatoes 90ct/CS', 'Greenleaf', 10, 0, 'CS'),
  ('Flat Italian Parsley 60ct/CS', 'Greenleaf', 2, 0, 'CS'),
  ('Stock Box Roma Tomatoes 25#/CS', 'Greenleaf', 4, 0, 'CS'),
  ('Baby Peeled Carrots in Bag 1#/EA', 'Greenleaf', 10, 0, 'EA'),
  ('Celery 1/EA', 'Greenleaf', 8, 0, 'EA'),
  ('Limes 1/EA', 'Greenleaf', 30, 0, 'EA'),
  ('Iceless Green Onions 1bunch/EA', 'Greenleaf', 20, 0, 'EA'),
  ('Spearmint 12ct/DZ', 'Greenleaf', 2, 0, 'DZ'),
  ('Whole Milk 1gal/EA', 'Greenleaf', 4, 0, 'EA'),
  ('Lemon Juice 4x1gal/CS', 'Greenleaf', 2, 0, 'CS');

-- STEP 6: Insert Mani Imports items
INSERT INTO inventory_items (item_name, vendor, par_level, current_stock, unit) VALUES
  ('Abali Mediterranean Yogurt Bucket - 4 Gal', 'Mani Imports', 8, 0, 'Buckets'),
  ('Saputo - Kefir Cheese 32lb bucket', 'Mani Imports', 2, 0, 'Buckets'),
  ('Feta Domestic Mani 28lbs', 'Mani Imports', 2, 0, 'Buckets'),
  ('Garbanzo Beans 6#10 Chef''s Quality', 'Mani Imports', 8, 0, 'Cases'),
  ('Olivola Oil blend 75% Canola/25% Evoo (6x1 Gal)', 'Mani Imports', 3, 0, 'Cases');

-- STEP 7: Insert Performance items
INSERT INTO inventory_items (item_name, vendor, par_level, current_stock, unit) VALUES
  ('Atorias Flatbread Lavash 9"X11" FZ', 'Performance', 10, 0, 'Cases'),
  ('Kronos Bread Pita 7" NO PO FZ', 'Performance', 15, 0, 'Cases'),
  ('Rotellas Hamburger Bun 5" SLCD FZ', 'Performance', 10, 0, 'Cases'),
  ('Packer Rice Jasmine 50LB', 'Performance', 3, 0, 'Bags'),
  ('Aussie Premium Lamb Ground FZ', 'Performance', 5, 0, 'Cases'),
  ('Baywinds Octopus Whole 2-4 LB RAW FZ', 'Performance', 2, 0, 'Cases');

-- STEP 8: Insert Eatopia Foods items
INSERT INTO inventory_items (item_name, vendor, par_level, current_stock, unit) VALUES
  ('Baklava with Double Pistachio', 'Eatopia Foods', 10, 0, 'Packs'),
  ('Baklava with Double Walnut', 'Eatopia Foods', 5, 0, 'Packs');

-- STEP 9: Verify all data was inserted
SELECT vendor, COUNT(*) as item_count
FROM inventory_items
GROUP BY vendor
ORDER BY vendor;

-- Should show:
-- Eatopia Foods: 2
-- Greenleaf: 17
-- Mani Imports: 5
-- Performance: 6
-- TOTAL: 30 items
