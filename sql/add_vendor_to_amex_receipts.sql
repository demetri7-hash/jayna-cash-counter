-- ============================================
-- ADD VENDOR COLUMN TO AMEX RECEIPTS
-- ============================================
-- Adds vendor/store name field to receipts
-- ============================================

-- Add vendor column (text, nullable for existing records)
ALTER TABLE amex_receipts
ADD COLUMN IF NOT EXISTS vendor TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN amex_receipts.vendor IS 'Name of the vendor/store where purchase was made (e.g., Office Depot, Amazon, US Foods)';

-- Verify column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'amex_receipts'
  AND column_name = 'vendor';
