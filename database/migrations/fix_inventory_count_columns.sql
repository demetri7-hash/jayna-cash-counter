-- Migration: Fix Inventory Count Columns
-- Date: 2025-12-21
-- Description: Add missing columns for inventory counting system and fix vendor column naming

-- 1. Add counted_by column (track who counted each item)
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS counted_by TEXT;

-- 2. Add vendor column (alias for vendor_name for consistency with prep counting)
-- Note: We keep vendor_name for backwards compatibility and add vendor as computed column
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS vendor TEXT;

-- 3. Update vendor column to match vendor_name (for existing data)
UPDATE inventory_items SET vendor = vendor_name WHERE vendor IS NULL;

-- 4. Add comment explaining dual columns
COMMENT ON COLUMN inventory_items.vendor IS 'Vendor name (synced with vendor_name for consistency with prep counting system)';

-- 5. Verify columns exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items'
    AND column_name = 'current_on_hand'
  ) THEN
    RAISE NOTICE '✅ current_on_hand column exists';
  ELSE
    RAISE EXCEPTION '❌ current_on_hand column missing - run cogs_schema.sql first';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items'
    AND column_name = 'last_counted'
  ) THEN
    RAISE NOTICE '✅ last_counted column exists';
  ELSE
    RAISE EXCEPTION '❌ last_counted column missing - run cogs_schema.sql first';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items'
    AND column_name = 'counted_by'
  ) THEN
    RAISE NOTICE '✅ counted_by column added successfully';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items'
    AND column_name = 'vendor'
  ) THEN
    RAISE NOTICE '✅ vendor column added successfully';
  END IF;
END $$;

-- Verification query
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'inventory_items'
AND column_name IN ('current_on_hand', 'last_counted', 'counted_by', 'vendor', 'vendor_name', 'physical_location')
ORDER BY column_name;
