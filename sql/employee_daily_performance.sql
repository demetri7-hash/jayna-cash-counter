-- Employee Daily Performance Table
-- Tracks individual employee tips and hours for leaderboard

CREATE TABLE employee_daily_performance (
  id SERIAL PRIMARY KEY,

  -- Employee identification
  employee_guid VARCHAR(255) NOT NULL,
  employee_name VARCHAR(255) NOT NULL,

  -- Date tracking
  business_date DATE NOT NULL,

  -- Performance metrics
  hours_worked DECIMAL(10, 2) NOT NULL DEFAULT 0,
  cc_tips_earned DECIMAL(10, 2) NOT NULL DEFAULT 0,
  orders_served INTEGER DEFAULT 0,
  tips_per_hour DECIMAL(10, 2) NOT NULL DEFAULT 0,

  -- Metadata
  last_calculated_at TIMESTAMPTZ NOT NULL,
  is_end_of_day BOOLEAN DEFAULT FALSE,
  end_of_day_calculated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one record per employee per day
  UNIQUE(employee_guid, business_date)
);

-- Indexes for fast queries
CREATE INDEX idx_employee_perf_date ON employee_daily_performance(business_date DESC);
CREATE INDEX idx_employee_perf_guid ON employee_daily_performance(employee_guid);
CREATE INDEX idx_employee_perf_tips_per_hour ON employee_daily_performance(tips_per_hour DESC);
CREATE INDEX idx_employee_perf_eod ON employee_daily_performance(is_end_of_day, business_date DESC);

-- Composite index for leaderboard queries (date + tips ranking)
CREATE INDEX idx_employee_leaderboard ON employee_daily_performance(business_date DESC, tips_per_hour DESC);

-- RLS Policies (allow anonymous read/write for app functionality)
ALTER TABLE employee_daily_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to employee_daily_performance"
  ON employee_daily_performance FOR SELECT TO anon USING (true);

CREATE POLICY "Allow insert to employee_daily_performance"
  ON employee_daily_performance FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow update to employee_daily_performance"
  ON employee_daily_performance FOR UPDATE TO anon USING (true);
