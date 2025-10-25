-- Create prep_locations table for multi-location inventory tracking
-- This table stores custom prep areas/locations (e.g., Kitchen, Walk-in, Basement)

CREATE TABLE IF NOT EXISTS prep_locations (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_prep_locations_name ON prep_locations(name);

-- Insert default locations
INSERT INTO prep_locations (name) VALUES
  ('Kitchen'),
  ('Walk-in'),
  ('Basement')
ON CONFLICT (name) DO NOTHING;

-- Grant permissions (adjust based on your RLS setup)
ALTER TABLE prep_locations ENABLE ROW LEVEL SECURITY;

-- Allow all operations (since this is an internal management tool)
CREATE POLICY "Allow all operations on prep_locations" ON prep_locations
  FOR ALL
  USING (true)
  WITH CHECK (true);
