-- Add customer information fields to catering_photos table
-- Run this in Supabase SQL Editor

ALTER TABLE catering_photos
ADD COLUMN IF NOT EXISTS guest_name TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS delivery_address TEXT,
ADD COLUMN IF NOT EXISTS special_notes TEXT;

-- Add comment to document the new columns
COMMENT ON COLUMN catering_photos.guest_name IS 'Customer/guest name for the catering order';
COMMENT ON COLUMN catering_photos.phone_number IS 'Customer contact phone number';
COMMENT ON COLUMN catering_photos.email IS 'Customer email address';
COMMENT ON COLUMN catering_photos.delivery_address IS 'Delivery address (only for DELIVERY orders)';
COMMENT ON COLUMN catering_photos.special_notes IS 'Special instructions or notes for the order';
