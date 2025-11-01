-- Add display_order column to employees table for drag-and-drop reordering
-- Created: October 31, 2025

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Create index for sorting
CREATE INDEX IF NOT EXISTS idx_employees_display_order ON employees(display_order);

-- Set initial display_order based on current alphabetical order (last_name, first_name)
WITH ordered_employees AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY last_name, first_name) AS row_num
  FROM employees
  WHERE is_active = true
)
UPDATE employees e
SET display_order = oe.row_num
FROM ordered_employees oe
WHERE e.id = oe.id;

-- Set display_order for inactive employees to come after active employees
UPDATE employees
SET display_order = 9999
WHERE is_active = false AND display_order = 0;

COMMENT ON COLUMN employees.display_order IS 'Order for displaying employees in scheduling grid (lower = higher in list)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Added display_order column to employees table';
  RAISE NOTICE '✅ Initialized display_order based on alphabetical sorting';
END $$;
