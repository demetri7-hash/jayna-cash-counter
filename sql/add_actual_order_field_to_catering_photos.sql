-- Add actual_order field to catering_photos table
-- Run this in Supabase SQL Editor

ALTER TABLE catering_photos
ADD COLUMN IF NOT EXISTS actual_order TEXT;

-- Add comment to document the column
COMMENT ON COLUMN catering_photos.actual_order IS 'Optional field for typing in the actual order details';

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'catering_photos'
AND column_name = 'actual_order';
