-- ============================================
-- ADD ORDER METADATA TO CATERING PHOTOS TABLE
-- ============================================
-- Created: October 22, 2025
-- Purpose: Add order type, due date, due time, and departure time fields

-- Add new columns for order metadata
ALTER TABLE catering_photos
ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) CHECK (order_type IN ('PICKUP', 'DELIVERY')),
ADD COLUMN IF NOT EXISTS order_due_date DATE,
ADD COLUMN IF NOT EXISTS time_due TIME,
ADD COLUMN IF NOT EXISTS leave_jayna_at TIME;

-- Create index for date-based queries (grouping/sorting)
CREATE INDEX IF NOT EXISTS idx_catering_photos_order_due_date ON catering_photos(order_due_date);

-- Verify changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'catering_photos'
ORDER BY ordinal_position;
