-- Weekly Daily Breakdown Table
-- Daily cash reconciliation data from weekly reports

CREATE TABLE IF NOT EXISTS weekly_daily_breakdown (
    id BIGSERIAL PRIMARY KEY,
    weekly_report_id BIGINT REFERENCES weekly_combined_reports(id) ON DELETE CASCADE,
    
    -- Daily Data
    date DATE NOT NULL,
    night_counter TEXT,
    
    -- Cash Reconciliation
    toast_sales DECIMAL(10,2) NOT NULL DEFAULT 0,
    actual_cash_in DECIMAL(10,2) NOT NULL DEFAULT 0,
    discrepancy DECIMAL(10,2) NOT NULL DEFAULT 0,
    excess DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_cash_amounts CHECK (
        toast_sales >= 0 AND 
        actual_cash_in >= 0 AND
        excess >= 0
    )
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_daily_breakdown_report_id ON weekly_daily_breakdown(weekly_report_id);
CREATE INDEX IF NOT EXISTS idx_daily_breakdown_date ON weekly_daily_breakdown(date);
CREATE INDEX IF NOT EXISTS idx_daily_breakdown_night_counter ON weekly_daily_breakdown(night_counter);
CREATE INDEX IF NOT EXISTS idx_daily_breakdown_discrepancy ON weekly_daily_breakdown(discrepancy);

-- Comments
COMMENT ON TABLE weekly_daily_breakdown IS 'Daily cash reconciliation data from weekly combined reports';
COMMENT ON COLUMN weekly_daily_breakdown.discrepancy IS 'Actual cash in minus expected toast sales (negative = short, positive = over)';
COMMENT ON COLUMN weekly_daily_breakdown.excess IS 'Cash taken from tips to balance operations and account for discrepancies';