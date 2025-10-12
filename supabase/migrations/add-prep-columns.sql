-- Add prep-specific columns to inventory_items table
-- Run this in Supabase SQL Editor

ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS batch_lifespan_hours INTEGER DEFAULT 48,
ADD COLUMN IF NOT EXISTS storage_location TEXT DEFAULT 'Walk-in Cooler';

-- Update existing PREP items to have default values
UPDATE inventory_items
SET batch_lifespan_hours = 48
WHERE vendor = 'PREP' AND batch_lifespan_hours IS NULL;

UPDATE inventory_items
SET storage_location = 'Walk-in Cooler'
WHERE vendor = 'PREP' AND storage_location IS NULL;
