-- =====================================================
-- CHANGE STOCK COLUMNS TO SUPPORT DECIMAL VALUES
-- Created: 2025-10-11
-- Purpose: Allow fractional inventory counts (0.25, 0.5, 0.75, etc.)
-- =====================================================

-- Change current_stock in inventory_items to NUMERIC(10,2)
-- This allows values like 0.25, 1.5, 12.75, etc.
ALTER TABLE inventory_items
  ALTER COLUMN current_stock TYPE NUMERIC(10,2);

-- Also change par_level to support decimals (for consistency)
ALTER TABLE inventory_items
  ALTER COLUMN par_level TYPE NUMERIC(10,2);

-- Update inventory_history table to support decimal stock values
-- Must drop generated column FIRST before altering columns it depends on
ALTER TABLE inventory_history
  DROP COLUMN IF EXISTS consumption_calculated;

-- Now alter the column types
ALTER TABLE inventory_history
  ALTER COLUMN opening_stock TYPE NUMERIC(10,2);

ALTER TABLE inventory_history
  ALTER COLUMN closing_stock TYPE NUMERIC(10,2);

ALTER TABLE inventory_history
  ALTER COLUMN received TYPE NUMERIC(10,2);

ALTER TABLE inventory_history
  ALTER COLUMN waste TYPE NUMERIC(10,2);

-- Recreate the computed column with NUMERIC type
ALTER TABLE inventory_history
  ADD COLUMN consumption_calculated NUMERIC(10,2) GENERATED ALWAYS AS
    (opening_stock + received - waste - closing_stock) STORED;

-- Update par_level_adjustments to support decimal pars
ALTER TABLE par_level_adjustments
  ALTER COLUMN current_par TYPE NUMERIC(10,2);

ALTER TABLE par_level_adjustments
  ALTER COLUMN suggested_par TYPE NUMERIC(10,2);

-- Update prep_consumption_log if it exists (from prep system)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prep_consumption_log') THEN
    ALTER TABLE prep_consumption_log
      ALTER COLUMN starting_count TYPE NUMERIC(10,2);

    ALTER TABLE prep_consumption_log
      ALTER COLUMN ending_count TYPE NUMERIC(10,2);

    ALTER TABLE prep_consumption_log
      ALTER COLUMN consumption_amount TYPE NUMERIC(10,2);

    ALTER TABLE prep_consumption_log
      ALTER COLUMN waste_amount TYPE NUMERIC(10,2);
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Stock columns changed to NUMERIC(10,2) - now supports decimals!';
  RAISE NOTICE '📊 Tables updated: inventory_items, inventory_history, par_level_adjustments, prep_consumption_log';
  RAISE NOTICE '🔢 Now supports fractional counts: 0.25, 0.5, 0.75, 1.00, etc.';
END $$;
