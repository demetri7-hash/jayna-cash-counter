-- Add prep counting tracking fields to inventory_items table
-- This enables tracking WHO counted each prep item and WHEN
-- Supports staff cycling system similar to FOH checklists
-- Created: 2025-10-31

-- Add counted_by column (staff member name who counted the item)
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS counted_by TEXT;

-- Add counted_at column (timestamp when the count was made)
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS counted_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN inventory_items.counted_by IS 'Name of staff member who counted this item (from Toast clocked-in employees)';
COMMENT ON COLUMN inventory_items.counted_at IS 'Timestamp when this item was last counted (ISO 8601 format)';

-- Verify changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'inventory_items'
  AND column_name IN ('counted_by', 'counted_at')
ORDER BY column_name;

-- Sample query to test the new fields
-- SELECT item_name, counted_by, counted_at, last_counted_date
-- FROM inventory_items
-- WHERE vendor = 'PREP'
-- ORDER BY counted_at DESC NULLS LAST;
