-- Migration: Add Custom Locations Table
-- Date: 2025-12-21
-- Description: Store user-defined custom locations for inventory counting

-- Create custom_locations table
CREATE TABLE IF NOT EXISTS custom_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_custom_locations_active
ON custom_locations(is_active)
WHERE is_active = TRUE;

-- Insert default locations (if not already present)
INSERT INTO custom_locations (location_name, created_by) VALUES
  ('Not Assigned', 'System'),
  ('Walk-in Cooler', 'System'),
  ('Freezer', 'System'),
  ('Dry Storage', 'System'),
  ('Bar', 'System'),
  ('Line Station', 'System'),
  ('Prep Area', 'System'),
  ('Back Office', 'System'),
  ('Reach-in Cooler', 'System'),
  ('Shelf - Top', 'System'),
  ('Shelf - Middle', 'System'),
  ('Shelf - Bottom', 'System')
ON CONFLICT (location_name) DO NOTHING;

-- Verification query
-- SELECT * FROM custom_locations WHERE is_active = TRUE ORDER BY location_name;
