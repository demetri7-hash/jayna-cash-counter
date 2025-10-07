-- Daily Sales Table Schema
-- Stores automated Toast Performance Summary data

CREATE TABLE IF NOT EXISTS daily_sales (
  date DATE PRIMARY KEY,
  net_sales DECIMAL(10, 2),
  credit_tips DECIMAL(10, 2),
  cash_sales DECIMAL(10, 2),
  credit_amount DECIMAL(10, 2),
  credit_count INTEGER,
  cash_tips DECIMAL(10, 2),
  other_sales DECIMAL(10, 2),
  other_tips DECIMAL(10, 2),
  total_tips DECIMAL(10, 2),
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'toast_email_auto',
  raw_data JSONB -- Store full parsed data for debugging
);

-- Index for quick date range queries
CREATE INDEX IF NOT EXISTS idx_daily_sales_date ON daily_sales(date DESC);

-- RLS Policies (if using Row Level Security)
ALTER TABLE daily_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON daily_sales
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for service role" ON daily_sales
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for service role" ON daily_sales
  FOR UPDATE USING (true);
