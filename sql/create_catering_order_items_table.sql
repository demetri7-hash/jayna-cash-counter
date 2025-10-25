/**
 * Database Migration: Create catering_order_items table
 * Stores individual line items (menu items) from Toast catering orders
 *
 * Run this in Supabase SQL Editor
 */

-- Drop table if it exists (clean start)
DROP TABLE IF EXISTS catering_order_items CASCADE;

-- Create table for storing order line items
CREATE TABLE catering_order_items (
  id BIGSERIAL PRIMARY KEY,C

  -- Link to parent order
  order_id BIGINT NOT NULL,
  external_order_id TEXT NOT NULL, -- Toast order GUID

  -- Item details from Toast selections
  item_guid TEXT, -- Toast menu item GUID
  item_name TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2), -- Price per item (in dollars)
  total_price DECIMAL(10, 2), -- Quantity * unit_price

  -- Item metadata
  selection_type TEXT, -- 'ITEM', 'MODIFIER', etc.
  modifiers JSONB, -- Array of modifiers applied to this item
  special_requests TEXT, -- Special instructions for this item

  -- Item categorization
  menu_group TEXT, -- Appetizers, Entrees, Desserts, etc.
  tax_included BOOLEAN DEFAULT false,

  -- Raw Toast data
  item_data JSONB, -- Full Toast selection object

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_catering_order_items_order_id
  ON catering_order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_catering_order_items_external_order_id
  ON catering_order_items(external_order_id);

-- Foreign key to catering_orders table (optional, can add if needed)
-- ALTER TABLE catering_order_items
--   ADD CONSTRAINT fk_catering_order_items_order
--   FOREIGN KEY (order_id) REFERENCES catering_orders(id) ON DELETE CASCADE;

-- Comments for documentation
COMMENT ON TABLE catering_order_items IS 'Individual line items (menu items) from Toast catering orders';
COMMENT ON COLUMN catering_order_items.order_id IS 'Reference to catering_orders.id';
COMMENT ON COLUMN catering_order_items.external_order_id IS 'Toast order GUID for direct lookup';
COMMENT ON COLUMN catering_order_items.item_name IS 'Menu item name (e.g., "Caesar Salad", "Grilled Chicken")';
COMMENT ON COLUMN catering_order_items.quantity IS 'Number of this item ordered';
COMMENT ON COLUMN catering_order_items.unit_price IS 'Price per single item in dollars';
COMMENT ON COLUMN catering_order_items.total_price IS 'Total price for this line (quantity * unit_price)';
COMMENT ON COLUMN catering_order_items.modifiers IS 'JSON array of modifiers (extra cheese, no onions, etc.)';
COMMENT ON COLUMN catering_order_items.item_data IS 'Full Toast selection object for reference';
