-- Fix Missing Columns in weekly_employee_tips Table
-- These columns are needed for historical overtime/regular hours tracking

-- Add missing columns
ALTER TABLE weekly_employee_tips
ADD COLUMN IF NOT EXISTS regular_hours NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC(10,2) DEFAULT 0;

-- Add helpful comments for documentation
COMMENT ON COLUMN weekly_employee_tips.regular_hours IS 'Regular hours worked (non-overtime) - used for labor cost analysis';
COMMENT ON COLUMN weekly_employee_tips.overtime_hours IS 'Overtime hours worked - critical for compliance and labor cost tracking';

-- Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'weekly_employee_tips'
AND column_name IN ('regular_hours', 'overtime_hours');
