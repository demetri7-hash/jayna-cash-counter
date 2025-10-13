-- Migration: Add detected_price column to invoice_items table
-- Date: 2025-10-12
-- Purpose: Support OCR price detection in invoice/order upload flow
-- Related: Invoice check-in system learning algorithm

-- Add detected_price column to store OCR-extracted prices
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS detected_price NUMERIC(10,2) DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN invoice_items.detected_price IS 'Price detected from OCR scanning of invoice, used for learning and matching confidence';

-- Update any existing rows to have default value
UPDATE invoice_items
SET detected_price = 0
WHERE detected_price IS NULL;

-- Create index for performance (if querying by price range in future)
CREATE INDEX IF NOT EXISTS idx_invoice_items_detected_price ON invoice_items(detected_price) WHERE detected_price > 0;
