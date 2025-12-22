-- ============================================
-- MASTER MIGRATION: Inventory Counting System
-- Date: 2025-12-21
-- Description: Complete setup for inventory counting with locations and staff tracking
--
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Copy and paste this ENTIRE file
-- 3. Click "Run"
-- 4. Check console output for success messages
-- ============================================

-- STEP 1: Create custom_locations table
-- ============================================
CREATE TABLE IF NOT EXISTS custom_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_custom_locations_active
ON custom_locations(is_active)
WHERE is_active = TRUE;

-- Insert default locations (if not already present)
INSERT INTO custom_locations (location_name, created_by) VALUES
  ('Not Assigned', 'System'),
  ('Walk-in Cooler', 'System'),
  ('Freezer', 'System'),
  ('Dry Storage', 'System'),
  ('Bar', 'System'),
  ('Line Station', 'System'),
  ('Prep Area', 'System'),
  ('Back Office', 'System'),
  ('Reach-in Cooler', 'System'),
  ('Shelf - Top', 'System'),
  ('Shelf - Middle', 'System'),
  ('Shelf - Bottom', 'System')
ON CONFLICT (location_name) DO NOTHING;

-- STEP 2: Add missing columns to inventory_items
-- ============================================

-- Add physical_location column
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS physical_location TEXT;

-- Add counted_by column (track who counted each item)
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS counted_by TEXT;

-- Add vendor column (alias for vendor_name for prep counting consistency)
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS vendor TEXT;

-- STEP 3: Add indexes for performance
-- ============================================

-- Index for location-based queries
CREATE INDEX IF NOT EXISTS idx_inventory_items_location
ON inventory_items(physical_location)
WHERE physical_location IS NOT NULL;

-- STEP 4: Sync vendor column with vendor_name
-- ============================================
UPDATE inventory_items
SET vendor = vendor_name
WHERE vendor IS NULL AND vendor_name IS NOT NULL;

-- STEP 5: Add helpful comments
-- ============================================
COMMENT ON COLUMN inventory_items.physical_location IS 'Physical storage location: Walk-in Cooler, Dry Storage, Bar, Freezer, Line Station, etc.';
COMMENT ON COLUMN inventory_items.counted_by IS 'Name of staff member who last counted this item';
COMMENT ON COLUMN inventory_items.vendor IS 'Vendor name (synced with vendor_name for prep counting consistency)';
COMMENT ON TABLE custom_locations IS 'User-defined custom storage locations for inventory counting';

-- STEP 6: Disable RLS for custom_locations
-- ============================================
ALTER TABLE custom_locations DISABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Check custom_locations table exists
  SELECT COUNT(*) INTO v_count
  FROM information_schema.tables
  WHERE table_name = 'custom_locations';

  IF v_count > 0 THEN
    RAISE NOTICE '✅ custom_locations table created';
  ELSE
    RAISE WARNING '❌ custom_locations table NOT created';
  END IF;

  -- Check all required columns exist in inventory_items
  SELECT COUNT(*) INTO v_count
  FROM information_schema.columns
  WHERE table_name = 'inventory_items'
  AND column_name IN ('current_on_hand', 'last_counted', 'counted_by', 'vendor', 'physical_location');

  IF v_count = 5 THEN
    RAISE NOTICE '✅ All required columns exist in inventory_items (current_on_hand, last_counted, counted_by, vendor, physical_location)';
  ELSE
    RAISE WARNING '❌ Missing columns in inventory_items. Found % of 5 required columns', v_count;
  END IF;

  -- Check default locations inserted
  SELECT COUNT(*) INTO v_count FROM custom_locations;
  RAISE NOTICE '✅ % default locations loaded in custom_locations table', v_count;
END $$;

-- Show final column structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'inventory_items'
AND column_name IN ('current_on_hand', 'last_counted', 'counted_by', 'vendor', 'vendor_name', 'physical_location')
ORDER BY column_name;

-- Show custom locations
SELECT * FROM custom_locations WHERE is_active = TRUE ORDER BY location_name;

RAISE NOTICE '🎉 MIGRATION COMPLETE! Inventory counting system ready to use.';
