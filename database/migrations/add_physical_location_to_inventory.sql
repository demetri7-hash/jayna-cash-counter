-- Migration: Add Physical Location Support to Inventory System
-- Date: 2025-12-21
-- Description: Add physical_location field to inventory items for better organization and counting

-- Add physical_location column to inventory_items table
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS physical_location TEXT;

-- Add index for faster location-based queries
CREATE INDEX IF NOT EXISTS idx_inventory_items_location
ON inventory_items(physical_location)
WHERE physical_location IS NOT NULL;

-- Common physical locations in Jayna Gyro's
COMMENT ON COLUMN inventory_items.physical_location IS 'Physical storage location: Walk-in Cooler, Dry Storage, Bar, Freezer, Line Station, etc.';

-- Update inventory_counts table to include counted_by and timestamp
ALTER TABLE inventory_counts
ADD COLUMN IF NOT EXISTS physical_location TEXT,
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for faster count queries by location
CREATE INDEX IF NOT EXISTS idx_inventory_counts_location
ON inventory_counts(physical_location)
WHERE physical_location IS NOT NULL;

-- Update sample data with common locations (OPTIONAL - comment out if not needed)
-- UPDATE inventory_items SET physical_location = 'Walk-in Cooler' WHERE category IN ('PRODUCE', 'MEAT', 'DAIRY');
-- UPDATE inventory_items SET physical_location = 'Dry Storage' WHERE category IN ('BREADS', 'NA DRINKS', 'JUICES');
-- UPDATE inventory_items SET physical_location = 'Bar' WHERE category IN ('LIQUOR', 'BEER', 'WINE');
-- UPDATE inventory_items SET physical_location = 'Freezer' WHERE category = 'GYROS';

-- Verification queries
-- SELECT physical_location, COUNT(*) as item_count FROM inventory_items WHERE physical_location IS NOT NULL GROUP BY physical_location ORDER BY item_count DESC;
-- SELECT category, physical_location, COUNT(*) FROM inventory_items GROUP BY category, physical_location ORDER BY category, physical_location;
