-- Create prep_count_log table to track individual counting actions for leaderboard
-- Each time someone counts/updates a prep item, log it here
-- This allows us to count ACTIONS (not just unique items) on the leaderboard

CREATE TABLE IF NOT EXISTS prep_count_log (
  id BIGSERIAL PRIMARY KEY,

  -- What was counted
  item_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,

  -- Who counted it
  counted_by TEXT NOT NULL,
  counted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- What they counted (for reference)
  new_count DECIMAL(10,2),
  previous_count DECIMAL(10,2),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast leaderboard queries (by date and person)
CREATE INDEX IF NOT EXISTS idx_prep_count_log_counted_at
ON prep_count_log (counted_at DESC);

CREATE INDEX IF NOT EXISTS idx_prep_count_log_counted_by
ON prep_count_log (counted_by, counted_at DESC);

COMMENT ON TABLE prep_count_log IS 'Logs every prep item counting action for leaderboard and activity tracking';
COMMENT ON COLUMN prep_count_log.counted_by IS 'First name of person who counted this item';
COMMENT ON COLUMN prep_count_log.counted_at IS 'Timestamp when count was updated';
