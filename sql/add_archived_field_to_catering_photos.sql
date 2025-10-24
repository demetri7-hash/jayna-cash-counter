-- Add archived field to catering_photos table
-- Run this in Supabase SQL Editor

ALTER TABLE catering_photos
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Add index for faster queries filtering by archived status
CREATE INDEX IF NOT EXISTS idx_catering_photos_archived ON catering_photos(archived);

-- Add index for queries filtering by archived AND order_due_date
CREATE INDEX IF NOT EXISTS idx_catering_photos_archived_date ON catering_photos(archived, order_due_date);

-- Add comment to document the column
COMMENT ON COLUMN catering_photos.archived IS 'Whether the order has been completed and archived (removed from main view but kept for historical records)';

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'catering_photos'
AND column_name = 'archived';
