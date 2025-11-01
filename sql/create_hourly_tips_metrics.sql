-- Create hourly_tips_metrics table for hour-over-hour trending
-- Stores snapshots of tips/hour for each hour of the day
-- Used to calculate hour-over-hour trending for main display
-- Created: 2025-10-31

CREATE TABLE IF NOT EXISTS hourly_tips_metrics (
  id BIGSERIAL PRIMARY KEY,

  -- Time tracking
  business_date DATE NOT NULL,                    -- Business date (5am cutoff)
  hour_timestamp TIMESTAMPTZ NOT NULL,            -- Hour this snapshot represents (rounded to hour)
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- When this was calculated

  -- Core metrics
  total_cc_tips DECIMAL(10,2) NOT NULL DEFAULT 0, -- Total CC tips from start of day to this hour
  total_hours_worked DECIMAL(10,2) NOT NULL DEFAULT 0, -- Total hours worked from start of day to this hour
  tips_per_hour DECIMAL(10,2) NOT NULL DEFAULT 0, -- tips_per_hour = total_cc_tips / total_hours_worked

  -- Additional context
  total_orders_count INTEGER DEFAULT 0,
  employees_worked INTEGER DEFAULT 0,
  employees_clocked_in INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure only one record per business_date + hour
  CONSTRAINT unique_business_date_hour UNIQUE (business_date, hour_timestamp)
);

-- Index for fast hour-over-hour lookups
CREATE INDEX IF NOT EXISTS idx_hourly_tips_business_date_hour
ON hourly_tips_metrics (business_date, hour_timestamp DESC);

-- Index for recent data queries
CREATE INDEX IF NOT EXISTS idx_hourly_tips_calculated_at
ON hourly_tips_metrics (calculated_at DESC);

-- Comment for documentation
COMMENT ON TABLE hourly_tips_metrics IS 'Hourly snapshots of tips/hour for hour-over-hour trending display';
COMMENT ON COLUMN hourly_tips_metrics.hour_timestamp IS 'Hour this snapshot represents (e.g., 2025-10-31 14:00:00 for 2-3pm data)';
COMMENT ON COLUMN hourly_tips_metrics.tips_per_hour IS 'Cumulative tips per hour from start of day (5am) to this hour';

-- Sample query to get last 2 hours for comparison
-- SELECT
--   hour_timestamp,
--   tips_per_hour,
--   total_cc_tips,
--   total_hours_worked
-- FROM hourly_tips_metrics
-- WHERE business_date = CURRENT_DATE
-- ORDER BY hour_timestamp DESC
-- LIMIT 2;
