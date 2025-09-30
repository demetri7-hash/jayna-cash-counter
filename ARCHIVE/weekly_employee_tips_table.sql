-- Weekly Employee Tips Table
-- Individual employee tip records for easier querying and analysis

CREATE TABLE IF NOT EXISTS weekly_employee_tips (
    id BIGSERIAL PRIMARY KEY,
    weekly_report_id BIGINT REFERENCES weekly_combined_reports(id) ON DELETE CASCADE,
    
    -- Time Period
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    
    -- Employee Information
    employee_first_name TEXT NOT NULL,
    employee_last_name TEXT NOT NULL,
    
    -- Tip Calculation Data
    hours_worked DECIMAL(10,2) NOT NULL DEFAULT 0,
    equity_percentage DECIMAL(5,2) NOT NULL DEFAULT 100,
    weighted_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
    tips_due DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_hours CHECK (hours_worked >= 0),
    CONSTRAINT valid_equity CHECK (equity_percentage >= 0 AND equity_percentage <= 200),
    CONSTRAINT valid_weighted_hours CHECK (weighted_hours >= 0),
    CONSTRAINT valid_tips_due CHECK (tips_due >= 0)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_employee_tips_report_id ON weekly_employee_tips(weekly_report_id);
CREATE INDEX IF NOT EXISTS idx_employee_tips_employee_name ON weekly_employee_tips(employee_first_name, employee_last_name);
CREATE INDEX IF NOT EXISTS idx_employee_tips_date_range ON weekly_employee_tips(week_start_date, week_end_date);
CREATE INDEX IF NOT EXISTS idx_employee_tips_tips_due ON weekly_employee_tips(tips_due);

-- Comments
COMMENT ON TABLE weekly_employee_tips IS 'Individual employee tip distribution records from weekly reports';
COMMENT ON COLUMN weekly_employee_tips.equity_percentage IS 'Performance multiplier percentage (100 = standard, higher = bonus)';
COMMENT ON COLUMN weekly_employee_tips.weighted_hours IS 'Hours multiplied by equity percentage for proportional distribution';