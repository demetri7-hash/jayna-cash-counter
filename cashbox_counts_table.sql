-- Cashbox Counts Table for Weekly Cashbox Reconciliation
-- This table stores weekly cashbox counts with full denomination breakdown

CREATE TABLE IF NOT EXISTS cashbox_counts (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    counter VARCHAR(100) NOT NULL,
    denominations JSONB NOT NULL, -- Store denomination counts as JSON
    total DECIMAL(10,2) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cashbox_counts_date ON cashbox_counts(date);
CREATE INDEX IF NOT EXISTS idx_cashbox_counts_timestamp ON cashbox_counts(timestamp);

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE cashbox_counts ENABLE ROW LEVEL SECURITY;

-- Policy to allow all operations (adjust as needed for your security requirements)
CREATE POLICY "Allow all operations on cashbox_counts" ON cashbox_counts
    FOR ALL USING (true);

-- Sample denominations JSON structure:
-- {
--   "hundreds": 5,
--   "fifties": 10,
--   "twenties": 25,
--   "tens": 30,
--   "fives": 40,
--   "ones": 50,
--   "quarters": 100,
--   "dimes": 75,
--   "nickels": 20,
--   "pennies": 50
-- }

-- Comments explaining the table structure:
COMMENT ON TABLE cashbox_counts IS 'Weekly cashbox counts for reconciliation tracking';
COMMENT ON COLUMN cashbox_counts.date IS 'Date of the cashbox count (usually weekly)';
COMMENT ON COLUMN cashbox_counts.counter IS 'Name of person who performed the count';
COMMENT ON COLUMN cashbox_counts.denominations IS 'JSON object containing count of each denomination';
COMMENT ON COLUMN cashbox_counts.total IS 'Calculated total amount from all denominations';
COMMENT ON COLUMN cashbox_counts.timestamp IS 'Exact timestamp when count was performed';