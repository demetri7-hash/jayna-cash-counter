-- Add PFG tracking columns to inventory_items
-- Run this in Supabase SQL Editor

-- Add item numbers and tracking columns
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS item_number TEXT,
ADD COLUMN IF NOT EXISTS manufacturer_item_number TEXT,
ADD COLUMN IF NOT EXISTS gtin TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS brand TEXT,
ADD COLUMN IF NOT EXISTS manufacturer_name TEXT;

-- Create price_history table
CREATE TABLE IF NOT EXISTS price_history (
  id BIGSERIAL PRIMARY KEY,
  inventory_item_id BIGINT REFERENCES inventory_items(id) ON DELETE CASCADE,
  item_number TEXT,
  old_price NUMERIC(10, 2),
  new_price NUMERIC(10, 2),
  price_change NUMERIC(10, 2),
  price_change_percent NUMERIC(5, 2),
  invoice_number TEXT,
  invoice_date DATE,
  vendor TEXT,
  changed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_inventory_items_item_number ON inventory_items(item_number);
CREATE INDEX IF NOT EXISTS idx_inventory_items_manufacturer_item_number ON inventory_items(manufacturer_item_number);
CREATE INDEX IF NOT EXISTS idx_inventory_items_gtin ON inventory_items(gtin);
CREATE INDEX IF NOT EXISTS idx_price_history_item_id ON price_history(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_price_history_item_number ON price_history(item_number);
CREATE INDEX IF NOT EXISTS idx_price_history_changed_at ON price_history(changed_at DESC);

-- Add comments
COMMENT ON COLUMN inventory_items.item_number IS 'PFG Product # (e.g., 2204, 26383)';
COMMENT ON COLUMN inventory_items.manufacturer_item_number IS 'Manufacturer Product # (e.g., 09560010)';
COMMENT ON COLUMN inventory_items.gtin IS 'Global Trade Item Number (barcode)';
COMMENT ON COLUMN inventory_items.category IS 'PFG Category (e.g., BEVERAGE, GROCERY DRY)';
COMMENT ON COLUMN inventory_items.brand IS 'Brand name (e.g., SPRITE, KRONOS)';
COMMENT ON COLUMN inventory_items.manufacturer_name IS 'Manufacturer name (e.g., COCA COLA NORTH AMERICA)';

COMMENT ON TABLE price_history IS 'Tracks all price changes for inventory items';
COMMENT ON COLUMN price_history.price_change IS 'Difference: new_price - old_price';
COMMENT ON COLUMN price_history.price_change_percent IS 'Percentage change: (new - old) / old * 100';
