-- ============================================
-- UPDATE EZCATER ORDERS TABLE - ADD DELIVERY FIELDS
-- ============================================
-- Created: October 21, 2025
-- Purpose: Add delivery address fields to support corrected EZCater API schema
-- Safe: Uses ALTER TABLE ADD COLUMN IF NOT EXISTS (won't fail if columns exist)

-- Add delivery address fields (these were missing from original schema)
ALTER TABLE ezcater_orders
ADD COLUMN IF NOT EXISTS delivery_address_street TEXT,
ADD COLUMN IF NOT EXISTS delivery_address_city TEXT,
ADD COLUMN IF NOT EXISTS delivery_address_state TEXT,
ADD COLUMN IF NOT EXISTS delivery_address_zip TEXT,
ADD COLUMN IF NOT EXISTS delivery_instructions TEXT;

-- Verify columns were added
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'ezcater_orders'
  AND column_name LIKE 'delivery%'
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Delivery address fields added successfully!';
  RAISE NOTICE 'Table now supports full address data from EZCater API.';
END $$;
