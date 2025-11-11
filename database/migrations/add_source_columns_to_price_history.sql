-- Add source tracking columns to price_history table
-- Run this in Supabase SQL Editor

ALTER TABLE price_history
ADD COLUMN IF NOT EXISTS source TEXT,
ADD COLUMN IF NOT EXISTS source_id BIGINT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create index for fast lookups by source
CREATE INDEX IF NOT EXISTS idx_price_history_source ON price_history(source);
CREATE INDEX IF NOT EXISTS idx_price_history_source_id ON price_history(source_id);

-- Add comments
COMMENT ON COLUMN price_history.source IS 'Source of price change (e.g., pending_order, invoice, manual)';
COMMENT ON COLUMN price_history.source_id IS 'ID of the source record (order_id, invoice_id, etc.)';
COMMENT ON COLUMN price_history.updated_at IS 'Last update timestamp';
