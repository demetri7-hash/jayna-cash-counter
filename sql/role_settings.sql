-- Role Settings Table
-- Stores configurable settings for each role (session duration, etc.)

CREATE TABLE IF NOT EXISTS role_settings (
  id SERIAL PRIMARY KEY,
  role TEXT UNIQUE NOT NULL, -- Master, Admin, Manager, Editor
  session_duration_minutes INTEGER NOT NULL DEFAULT 60, -- How long session lasts
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by role
CREATE INDEX idx_role_settings_role ON role_settings(role);

-- Enable Row Level Security
ALTER TABLE role_settings ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now
CREATE POLICY "Allow all operations on role_settings" ON role_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert default role settings
INSERT INTO role_settings (role, session_duration_minutes, description) VALUES
  ('Master', 120, 'Full system access - 2 hour session'),
  ('Admin', 90, 'High-level features - 1.5 hour session'),
  ('Manager', 60, 'Operational features - 1 hour session'),
  ('Editor', 30, 'Basic features - 30 minute session')
ON CONFLICT (role) DO NOTHING;
