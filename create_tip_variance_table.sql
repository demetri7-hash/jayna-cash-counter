-- Tip Variance Tracking Table
-- Purpose: Track rounding variances in tip pool calculations for compliance
-- Each week's unpaid variance carries forward to the next week until fully paid out

CREATE TABLE IF NOT EXISTS tip_variance (
  id SERIAL PRIMARY KEY,
  week_ending_date DATE NOT NULL UNIQUE,
  calculated_total NUMERIC(10,2) NOT NULL,
  actual_paid_total NUMERIC(10,2) NOT NULL,
  variance_amount NUMERIC(10,2) NOT NULL,
  previous_variance NUMERIC(10,2) DEFAULT 0.00,
  carried_from_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups by date
CREATE INDEX IF NOT EXISTS idx_tip_variance_week_ending ON tip_variance(week_ending_date DESC);

-- Add comments for documentation
COMMENT ON TABLE tip_variance IS 'Tracks weekly tip pool rounding variances to ensure full compliance with tip payout regulations';
COMMENT ON COLUMN tip_variance.week_ending_date IS 'The ending date of the tip pool week (typically Sunday)';
COMMENT ON COLUMN tip_variance.calculated_total IS 'The total pool amount after flooring to whole dollars';
COMMENT ON COLUMN tip_variance.actual_paid_total IS 'Sum of all individual tip amounts paid out (floored)';
COMMENT ON COLUMN tip_variance.variance_amount IS 'Difference between calculated_total and actual_paid_total (carries to next week)';
COMMENT ON COLUMN tip_variance.previous_variance IS 'Variance carried over from previous week and added to this week''s pool';
COMMENT ON COLUMN tip_variance.carried_from_date IS 'Date of the previous week that the variance was carried from';

-- Example data flow:
-- Week 1: Pool $481.83 → Floored $481 → Paid $480 → Variance $1.00 carries to Week 2
-- Week 2: New tips $500.75 + Previous $1.00 = $501.75 → Floored $501 → Paid $500 → Variance $1.00 carries to Week 3
-- And so on...
