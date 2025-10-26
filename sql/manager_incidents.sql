-- Manager Incidents Table
-- Stores incident reports with photos, staff involved, and department tracking

CREATE TABLE IF NOT EXISTS manager_incidents (
  id SERIAL PRIMARY KEY,
  manager_name TEXT NOT NULL,
  incident_date DATE NOT NULL,
  incident_time TIME NOT NULL,
  department TEXT NOT NULL,
  staff_involved JSONB NOT NULL DEFAULT '[]', -- Array of staff names
  incident_report TEXT NOT NULL,
  photo_urls JSONB DEFAULT '[]', -- Array of Supabase storage URLs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast sorting by date (newest first)
CREATE INDEX idx_incidents_date ON manager_incidents(incident_date DESC, created_at DESC);

-- Index for searching by manager
CREATE INDEX idx_incidents_manager ON manager_incidents(manager_name);

-- Index for searching by department
CREATE INDEX idx_incidents_department ON manager_incidents(department);

-- Enable Row Level Security (optional - can add policies later)
ALTER TABLE manager_incidents ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (you can add auth policies later)
CREATE POLICY "Allow all operations on incidents" ON manager_incidents
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Departments lookup table (auto-populated from incidents)
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default departments
INSERT INTO departments (name) VALUES
  ('FOH'),
  ('BOH'),
  ('PREP'),
  ('MANAGEMENT'),
  ('DELIVERY')
ON CONFLICT (name) DO NOTHING;

-- Index for fast department lookups
CREATE INDEX idx_departments_name ON departments(name);

-- Enable RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on departments" ON departments
  FOR ALL
  USING (true)
  WITH CHECK (true);
