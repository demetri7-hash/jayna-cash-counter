-- ============================================
-- ALTER CATERING PHOTOS TABLE - ADD CALENDAR SYNC
-- ============================================
-- Created: October 23, 2025
-- Purpose: Add order metadata and Google Calendar sync columns
-- Run this if catering_photos table already exists

-- Add order metadata columns
ALTER TABLE catering_photos
ADD COLUMN IF NOT EXISTS order_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS order_due_date DATE,
ADD COLUMN IF NOT EXISTS time_due TIME,
ADD COLUMN IF NOT EXISTS leave_jayna_at TIME,
ADD COLUMN IF NOT EXISTS calendar_event_id VARCHAR(255);

-- Add index for order_due_date (useful for querying same-day orders)
CREATE INDEX IF NOT EXISTS idx_catering_photos_order_due_date ON catering_photos(order_due_date);

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'catering_photos'
ORDER BY ordinal_position;
