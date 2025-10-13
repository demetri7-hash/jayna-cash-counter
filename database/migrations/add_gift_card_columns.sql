-- Migration: Add gift card columns to daily_sales table
-- Run this in Supabase SQL Editor

ALTER TABLE daily_sales
ADD COLUMN IF NOT EXISTS gift_card_payments INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS gift_card_amount DECIMAL(10, 2) DEFAULT 0.00;

-- Verify the columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'daily_sales'
ORDER BY ordinal_position;
