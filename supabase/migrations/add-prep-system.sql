-- ============================================
-- PREP SYSTEM: Add prep item support + count tracking
-- ============================================

-- Add prep-specific fields to inventory_items
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'ingredient',
ADD COLUMN IF NOT EXISTS prep_time_minutes INTEGER,
ADD COLUMN IF NOT EXISTS batch_lifespan_hours INTEGER,
ADD COLUMN IF NOT EXISTS recipe_url TEXT,
ADD COLUMN IF NOT EXISTS core_ingredients JSONB DEFAULT '[]'::jsonb;

-- Create prep count sessions table for tracking 3x daily counts
CREATE TABLE IF NOT EXISTS prep_count_sessions (
  id SERIAL PRIMARY KEY,
  count_date DATE NOT NULL,
  session_type TEXT NOT NULL, -- 'morning_prep', 'afternoon_prep', 'closing_line'
  counted_by TEXT,
  session_timestamp TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  UNIQUE(count_date, session_type)
);

-- Create prep consumption tracking table
CREATE TABLE IF NOT EXISTS prep_consumption_log (
  id SERIAL PRIMARY KEY,
  item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
  count_date DATE NOT NULL,
  from_session TEXT, -- 'closing_line', 'morning_prep', 'afternoon_prep'
  to_session TEXT,   -- 'morning_prep', 'afternoon_prep', 'closing_line'
  starting_count NUMERIC(10,2),
  ending_count NUMERIC(10,2),
  consumption_amount NUMERIC(10,2),
  waste_amount NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_prep_consumption_item_date ON prep_consumption_log(item_id, count_date DESC);
CREATE INDEX IF NOT EXISTS idx_prep_sessions_date ON prep_count_sessions(count_date DESC);

-- Insert 38 prep items
INSERT INTO inventory_items (item_name, vendor, unit, par_level, current_stock, item_type, prep_time_minutes, batch_lifespan_hours)
VALUES
  ('SALAD MIX', 'PREP', 'Container', 0, 0, 'prep', 30, 24),
  ('BABA GANOUSH', 'PREP', 'Container', 0, 0, 'prep', 45, 72),
  ('SOUP', 'PREP', 'Container', 0, 0, 'prep', 60, 48),
  ('CUCUMBER', 'PREP', 'Container', 0, 0, 'prep', 15, 24),
  ('HUMMUS', 'PREP', 'Container', 0, 0, 'prep', 30, 72),
  ('SPANAKOPITA', 'PREP', 'Tray', 0, 0, 'prep', 90, 48),
  ('ROMAINE', 'PREP', 'Container', 0, 0, 'prep', 20, 24),
  ('TZATZIKI', 'PREP', 'Container', 0, 0, 'prep', 25, 72),
  ('RICE PUDDING', 'PREP', 'Container', 0, 0, 'prep', 45, 72),
  ('TOMATO WEDGED', 'PREP', 'Container', 0, 0, 'prep', 20, 24),
  ('SPICY AIOLI', 'PREP', 'Container', 0, 0, 'prep', 15, 72),
  ('CREOLE MUSTARD', 'PREP', 'Container', 0, 0, 'prep', 10, 168),
  ('TOMATO DICED', 'PREP', 'Container', 0, 0, 'prep', 15, 24),
  ('LEMON DRESSING', 'PREP', 'Container', 0, 0, 'prep', 10, 72),
  ('LAMB BURGER', 'PREP', 'Patty', 0, 0, 'prep', 30, 48),
  ('RED ONION SLICED', 'PREP', 'Container', 0, 0, 'prep', 15, 48),
  ('CHIMMICHURRI', 'PREP', 'Container', 0, 0, 'prep', 20, 72),
  ('VEGAN BURGER', 'PREP', 'Patty', 0, 0, 'prep', 40, 48),
  ('BELL PEPPER', 'PREP', 'Container', 0, 0, 'prep', 15, 48),
  ('OCTOPUS', 'PREP', 'Portion', 0, 0, 'prep', 120, 48),
  ('CELERY', 'PREP', 'Container', 0, 0, 'prep', 10, 48),
  ('KUNEFE', 'PREP', 'Portion', 0, 0, 'prep', 45, 24),
  ('PICKLED RED ONION', 'PREP', 'Container', 0, 0, 'prep', 30, 168),
  ('DUBAI CHOCOLATE LARGE', 'PREP', 'Piece', 0, 0, 'prep', 60, 72),
  ('DUBAI CHOCOLATE SMALL', 'PREP', 'Piece', 0, 0, 'prep', 60, 72),
  ('CARAMELIZED ONION/PEPPER', 'PREP', 'Container', 0, 0, 'prep', 45, 72),
  ('DOLMAS', 'PREP', 'Container', 0, 0, 'prep', 90, 72),
  ('FALAFEL', 'PREP', 'Batch', 0, 0, 'prep', 60, 48),
  ('KATAIFI', 'PREP', 'Portion', 0, 0, 'prep', 30, 24),
  ('CHICKEN JUS', 'PREP', 'Container', 0, 0, 'prep', 120, 72),
  ('BEEF JUS', 'PREP', 'Container', 0, 0, 'prep', 120, 72),
  ('ISKENDER SAUCE', 'PREP', 'Container', 0, 0, 'prep', 30, 72),
  ('CHILI OIL', 'PREP', 'Container', 0, 0, 'prep', 20, 168),
  ('BRIOCHE BUNS', 'PREP', 'Piece', 0, 0, 'prep', 90, 24),
  ('CUBED FETA', 'PREP', 'Container', 0, 0, 'prep', 20, 72),
  ('WASH OLIVES', 'PREP', 'Container', 0, 0, 'prep', 15, 72),
  ('CRUMBLED FETA', 'PREP', 'Container', 0, 0, 'prep', 15, 72)
ON CONFLICT (item_name, vendor) DO UPDATE SET
  item_type = EXCLUDED.item_type,
  prep_time_minutes = EXCLUDED.prep_time_minutes,
  batch_lifespan_hours = EXCLUDED.batch_lifespan_hours;

-- Show results
SELECT
  COUNT(*) as prep_items_added,
  SUM(prep_time_minutes) as total_prep_time_minutes
FROM inventory_items
WHERE item_type = 'prep';

-- Show all prep items
SELECT item_name, unit, prep_time_minutes, batch_lifespan_hours
FROM inventory_items
WHERE item_type = 'prep'
ORDER BY item_name;
