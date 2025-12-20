-- Add payment_type column to amex_receipts table
-- Run this in Supabase SQL Editor

-- Add payment_type column with default value
ALTER TABLE amex_receipts
ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'AMEX CARD 1100';

-- Set default for existing rows
UPDATE amex_receipts
SET payment_type = 'AMEX CARD 1100'
WHERE payment_type IS NULL;

-- Add check constraint to only allow specific values
ALTER TABLE amex_receipts
DROP CONSTRAINT IF EXISTS amex_receipts_payment_type_check;

ALTER TABLE amex_receipts
ADD CONSTRAINT amex_receipts_payment_type_check
CHECK (payment_type IN ('AMEX CARD 1100', 'CASH', 'PERSONAL/REIMBURSE'));

-- Verify the column was added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'amex_receipts'
AND column_name = 'payment_type';

-- View sample data
SELECT id, vendor, amount, category, payment_type, purchase_date
FROM amex_receipts
ORDER BY purchase_date DESC
LIMIT 5;

COMMIT;
