-- Protected Features Table
-- Stores all password-protected features with configurable access levels
-- Allows dynamic role assignment without recoding

CREATE TABLE IF NOT EXISTS protected_features (
  id SERIAL PRIMARY KEY,
  feature_id TEXT UNIQUE NOT NULL, -- Unique identifier (e.g., "manager_logs", "tip_pool")
  feature_name TEXT NOT NULL, -- Display name
  description TEXT,
  page TEXT NOT NULL, -- Which page it's on (index, manager, foh-checklists, etc.)
  required_role TEXT NOT NULL DEFAULT 'Manager', -- Master, Admin, Manager, or Editor
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by feature_id
CREATE INDEX idx_protected_features_id ON protected_features(feature_id);

-- Enable Row Level Security
ALTER TABLE protected_features ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (you can add auth policies later)
CREATE POLICY "Allow all operations on protected_features" ON protected_features
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert default protected features
INSERT INTO protected_features (feature_id, feature_name, description, page, required_role) VALUES
  -- Manager Logs
  ('manager_logs', 'Manager Logs', 'Incident reporting and manager notes', 'all', 'Admin'),

  -- Tip Pool Calculator
  ('tip_pool', 'Tip Pool Calculator', 'Calculate and distribute tips', 'index', 'Manager'),

  -- Cash Counter Features
  ('cash_counter_pm', 'PM Cash Close', 'Evening cash reconciliation', 'index', 'Manager'),
  ('cash_history', 'Cash Count History', 'View historical cash counts', 'index', 'Manager'),

  -- Manager Analytics
  ('manager_analytics', 'Manager Analytics Dashboard', 'Revenue and labor analytics', 'manager', 'Manager'),
  ('revenue_reports', 'Revenue Reports', 'Detailed revenue breakdowns', 'manager', 'Admin'),

  -- Checklist Management
  ('edit_checklists', 'Edit Checklists', 'Modify checklist templates', 'foh-checklists/boh', 'Manager'),
  ('delete_checklist_data', 'Delete Checklist Data', 'Remove checklist entries', 'foh-checklists/boh', 'Admin'),

  -- Password Management
  ('password_management', 'Password Management', 'Create and manage user passwords', 'foh-checklists', 'Master'),
  ('change_master_password', 'Change Master Password', 'Modify the master password', 'foh-checklists', 'Master'),
  ('access_control_panel', 'Access Control Panel', 'Configure feature access levels', 'foh-checklists', 'Master'),

  -- Catering
  ('catering_orders', 'Catering Orders', 'View and manage catering orders', 'catering', 'Manager'),
  ('print_prep_lists', 'Print Prep Lists', 'Generate prep lists for catering', 'catering', 'Manager'),

  -- Advanced Features
  ('system_settings', 'System Settings', 'Modify system configurations', 'all', 'Master'),
  ('email_reports', 'Email Reports', 'Send automated email reports', 'foh-checklists', 'Admin')
ON CONFLICT (feature_id) DO NOTHING;
