-- ============================================
-- ADD QTY RECEIVED FIELDS TO OCR TRAINING
-- ============================================
-- Created: October 18, 2025
-- Purpose: Separate QTY ORDERED from QTY RECEIVED in training data
--
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard SQL Editor
-- 2. Copy and paste this entire file
-- 3. Click "Run"
-- ============================================

-- Add new columns to ocr_training_corrections table
ALTER TABLE ocr_training_corrections
ADD COLUMN IF NOT EXISTS detected_quantity_ordered NUMERIC,
ADD COLUMN IF NOT EXISTS detected_quantity_received NUMERIC,
ADD COLUMN IF NOT EXISTS corrected_quantity_ordered NUMERIC,
ADD COLUMN IF NOT EXISTS corrected_quantity_received NUMERIC;

-- Migrate existing data (detected_quantity → detected_quantity_ordered)
UPDATE ocr_training_corrections
SET
  detected_quantity_ordered = detected_quantity,
  detected_quantity_received = COALESCE((metadata->>'qtyShipped')::NUMERIC, detected_quantity)
WHERE detected_quantity_ordered IS NULL;

-- Migrate corrected data
UPDATE ocr_training_corrections
SET
  corrected_quantity_ordered = corrected_quantity,
  corrected_quantity_received = COALESCE((metadata->>'qtyShipped')::NUMERIC, corrected_quantity)
WHERE corrected_quantity_ordered IS NULL;

-- Add helpful comment
COMMENT ON COLUMN ocr_training_corrections.detected_quantity_ordered IS 'Quantity ordered (from invoice/order)';
COMMENT ON COLUMN ocr_training_corrections.detected_quantity_received IS 'Quantity actually received/shipped';
COMMENT ON COLUMN ocr_training_corrections.corrected_quantity_ordered IS 'User-corrected quantity ordered';
COMMENT ON COLUMN ocr_training_corrections.corrected_quantity_received IS 'User-corrected quantity received';

-- ============================================
-- VERIFICATION
-- ============================================
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'ocr_training_corrections'
  AND column_name LIKE '%quantity%'
ORDER BY ordinal_position;

-- Should show:
-- detected_quantity (old - can keep for backward compatibility)
-- detected_quantity_ordered (new)
-- detected_quantity_received (new)
-- corrected_quantity (old)
-- corrected_quantity_ordered (new)
-- corrected_quantity_received (new)
