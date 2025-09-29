-- Weekly Combined Reports Table
-- Stores comprehensive data from each weekly combined report generation

CREATE TABLE IF NOT EXISTS weekly_combined_reports (
    id BIGSERIAL PRIMARY KEY,
    
    -- Report Metadata
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    generated_by TEXT,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    real_envelope_amount DECIMAL(10,2),
    cashbox_total DECIMAL(10,2),
    
    -- Tip Pool Summary Data
    total_toast_sales DECIMAL(10,2) DEFAULT 0,
    actual_cash_in DECIMAL(10,2) DEFAULT 0,
    total_discrepancy DECIMAL(10,2) DEFAULT 0,
    envelope_deposits DECIMAL(10,2) DEFAULT 0,
    credit_tips DECIMAL(10,2) DEFAULT 0,
    cash_tips DECIMAL(10,2) DEFAULT 0,
    ezcater_tips DECIMAL(10,2) DEFAULT 0,
    total_tips DECIMAL(10,2) DEFAULT 0,
    tds_driver_tips DECIMAL(10,2) DEFAULT 0,
    tip_pool_total DECIMAL(10,2) DEFAULT 0,
    hourly_rate DECIMAL(10,2) DEFAULT 0,
    cash_needed DECIMAL(10,2) DEFAULT 0,
    
    -- Additional Tip Pool Fields
    calculated_cash_tips DECIMAL(10,2) DEFAULT 0,
    total_weighted_hours DECIMAL(10,2) DEFAULT 0,
    total_hours_worked DECIMAL(10,2) DEFAULT 0,
    
    -- JSON Data Storage
    employee_tip_data JSONB,
    daily_cash_breakdown JSONB,
    
    -- System Metadata
    report_version TEXT DEFAULT '3.0',
    has_attachments BOOLEAN DEFAULT FALSE,
    
    -- Constraints
    CONSTRAINT valid_date_range CHECK (week_end_date >= week_start_date),
    CONSTRAINT valid_amounts CHECK (
        total_toast_sales >= 0 AND 
        actual_cash_in >= 0 AND
        total_tips >= 0 AND
        tip_pool_total >= 0
    )
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_weekly_reports_date_range ON weekly_combined_reports(week_start_date, week_end_date);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_generated_by ON weekly_combined_reports(generated_by);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_generated_at ON weekly_combined_reports(generated_at);

-- Comments
COMMENT ON TABLE weekly_combined_reports IS 'Comprehensive storage of weekly combined report data including tip pools, cash reconciliation, and employee distributions';
COMMENT ON COLUMN weekly_combined_reports.employee_tip_data IS 'JSON array of employee tip distribution records';
COMMENT ON COLUMN weekly_combined_reports.daily_cash_breakdown IS 'JSON array of daily cash reconciliation data';