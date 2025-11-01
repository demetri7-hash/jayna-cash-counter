-- Add color column to shifts table for custom shift colors
-- Created: October 31, 2025

ALTER TABLE shifts
ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT NULL;

COMMENT ON COLUMN shifts.color IS 'Custom hex color for shift block (e.g., #00A8E1). NULL = use default position-based color';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Added color column to shifts table';
  RAISE NOTICE '💡 Use color picker in shift modal to assign custom colors';
END $$;
