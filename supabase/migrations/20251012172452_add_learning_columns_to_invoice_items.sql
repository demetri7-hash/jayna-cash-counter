-- Migration: Add learning/matching columns to invoice_items table
-- Purpose: Store OCR detection data for machine learning and auto-matching
-- Date: 2025-10-12

-- Add detected item name (as seen in OCR before matching)
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS detected_item_name TEXT;

-- Add detected quantity (as seen in OCR)
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS detected_quantity NUMERIC;

-- Add detected price (already has migration, but include for completeness)
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS detected_price NUMERIC(10,2) DEFAULT 0;

-- Add match confidence score (0.0 to 1.0)
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS match_confidence NUMERIC(3,2) DEFAULT 0;

-- Add timestamp when item was matched
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS matched_at TIMESTAMP;

-- Add flag for whether item has been physically checked in
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT FALSE;

-- Add timestamp when item was checked in
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP;

-- Add comments for documentation
COMMENT ON COLUMN invoice_items.detected_item_name IS 'Item name as detected by OCR before matching to inventory';
COMMENT ON COLUMN invoice_items.detected_quantity IS 'Quantity as detected by OCR';
COMMENT ON COLUMN invoice_items.detected_price IS 'Price detected from OCR scanning';
COMMENT ON COLUMN invoice_items.match_confidence IS 'Confidence score (0-1) of OCR match to inventory item';
COMMENT ON COLUMN invoice_items.matched_at IS 'Timestamp when OCR item was matched to inventory';
COMMENT ON COLUMN invoice_items.checked_in IS 'Whether this item has been physically checked in upon delivery';
COMMENT ON COLUMN invoice_items.checked_in_at IS 'Timestamp when item was checked in';

-- Create index for learning queries (find past matches by detected name)
CREATE INDEX IF NOT EXISTS idx_invoice_items_detected_name ON invoice_items(detected_item_name);

-- Create index for match confidence queries
CREATE INDEX IF NOT EXISTS idx_invoice_items_match_confidence ON invoice_items(match_confidence) WHERE match_confidence > 0;

-- Create index for checked-in status queries
CREATE INDEX IF NOT EXISTS idx_invoice_items_checked_in ON invoice_items(checked_in, checked_in_at);
