-- =====================================================
-- JAYNA SCHEDULING SYSTEM - DATABASE TABLES
-- Created: October 30, 2025
-- Phase 1 & 2: Core scheduling tables
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: employees
-- Synced from Toast POS /labor/v1/employees API
-- =====================================================
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  toast_guid VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  chosen_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20),
  external_employee_id VARCHAR(100),
  job_title VARCHAR(100),
  job_guid VARCHAR(255),
  hourly_wage DECIMAL(10, 2),
  employee_code VARCHAR(10), -- Simple 4-digit code for employee login
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_synced_from_toast TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employees_toast_guid ON employees(toast_guid);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(employee_code);

COMMENT ON TABLE employees IS 'Employee records synced from Toast POS';
COMMENT ON COLUMN employees.toast_guid IS 'Unique identifier from Toast POS API';
COMMENT ON COLUMN employees.employee_code IS '4-digit code for simple employee login';

-- =====================================================
-- TABLE: schedules
-- Weekly schedule containers
-- =====================================================
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  created_by VARCHAR(100), -- Manager name
  status VARCHAR(20) DEFAULT 'draft', -- draft, published, archived
  total_labor_cost DECIMAL(10, 2) DEFAULT 0.00,
  total_hours DECIMAL(10, 2) DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_schedules_week_start ON schedules(week_start_date);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON schedules(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedules_week_unique ON schedules(week_start_date, week_end_date);

COMMENT ON TABLE schedules IS 'Weekly schedule containers with totals';
COMMENT ON COLUMN schedules.status IS 'draft = editable, published = visible to employees, archived = historical';

-- =====================================================
-- TABLE: shifts
-- Individual shift records
-- =====================================================
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  position VARCHAR(100), -- 'Server', 'Cook', 'Manager', 'Host', 'Dishwasher', etc.
  break_minutes INTEGER DEFAULT 0,
  total_hours DECIMAL(5, 2), -- Calculated: (end_time - start_time - break_minutes) / 60
  hourly_wage DECIMAL(10, 2), -- Snapshot of employee wage at time of scheduling
  shift_cost DECIMAL(10, 2), -- Calculated: total_hours * hourly_wage
  notes TEXT,
  is_open_shift BOOLEAN DEFAULT false, -- No employee assigned yet
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_shifts_employee ON shifts(employee_id);
CREATE INDEX IF NOT EXISTS idx_shifts_schedule ON shifts(schedule_id);
CREATE INDEX IF NOT EXISTS idx_shifts_position ON shifts(position);

COMMENT ON TABLE shifts IS 'Individual shift records with drag-and-drop support';
COMMENT ON COLUMN shifts.is_open_shift IS 'True if no employee assigned (available for pickup)';
COMMENT ON COLUMN shifts.shift_cost IS 'Labor cost for this shift (hours × wage)';

-- =====================================================
-- TABLE: schedule_settings
-- Global settings for scheduling system
-- =====================================================
CREATE TABLE IF NOT EXISTS schedule_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by VARCHAR(100)
);

-- Insert default settings
INSERT INTO schedule_settings (setting_key, setting_value, description) VALUES
  ('week_start_day', '0', 'Day of week schedule starts (0=Sunday, 1=Monday, etc.)'),
  ('default_break_minutes', '30', 'Default break time for shifts > 6 hours'),
  ('overtime_threshold_hours', '40', 'Weekly hours before overtime warning'),
  ('schedule_grid_start_hour', '6', 'Earliest hour shown on calendar grid (6 AM)'),
  ('schedule_grid_end_hour', '23', 'Latest hour shown on calendar grid (11 PM)')
ON CONFLICT (setting_key) DO NOTHING;

COMMENT ON TABLE schedule_settings IS 'Configurable settings for scheduling system';

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to calculate shift hours and cost
CREATE OR REPLACE FUNCTION calculate_shift_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total hours (end - start - break) in hours
  NEW.total_hours := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600.0
                     - (NEW.break_minutes / 60.0);

  -- Calculate shift cost (hours × wage)
  IF NEW.hourly_wage IS NOT NULL THEN
    NEW.shift_cost := NEW.total_hours * NEW.hourly_wage;
  END IF;

  -- Update timestamp
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate shift totals
DROP TRIGGER IF EXISTS trigger_calculate_shift_totals ON shifts;
CREATE TRIGGER trigger_calculate_shift_totals
  BEFORE INSERT OR UPDATE ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION calculate_shift_totals();

COMMENT ON FUNCTION calculate_shift_totals IS 'Auto-calculates total_hours and shift_cost for shifts';

-- Function to update schedule totals
CREATE OR REPLACE FUNCTION update_schedule_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate schedule totals when shifts change
  UPDATE schedules
  SET
    total_hours = (
      SELECT COALESCE(SUM(total_hours), 0)
      FROM shifts
      WHERE schedule_id = COALESCE(NEW.schedule_id, OLD.schedule_id)
    ),
    total_labor_cost = (
      SELECT COALESCE(SUM(shift_cost), 0)
      FROM shifts
      WHERE schedule_id = COALESCE(NEW.schedule_id, OLD.schedule_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.schedule_id, OLD.schedule_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update schedule totals when shifts change
DROP TRIGGER IF EXISTS trigger_update_schedule_totals ON shifts;
CREATE TRIGGER trigger_update_schedule_totals
  AFTER INSERT OR UPDATE OR DELETE ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_totals();

COMMENT ON FUNCTION update_schedule_totals IS 'Auto-updates schedule total_hours and total_labor_cost when shifts change';

-- =====================================================
-- ROW LEVEL SECURITY (RLS) - Optional for now
-- Can be enabled later for multi-location support
-- =====================================================

-- Enable RLS (commented out for now - single location)
-- ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

-- Sample employees (will be replaced with Toast sync)
-- INSERT INTO employees (toast_guid, first_name, last_name, job_title, hourly_wage, employee_code, is_active) VALUES
--   ('SAMPLE-001', 'John', 'Doe', 'Server', 18.00, '1234', true),
--   ('SAMPLE-002', 'Jane', 'Smith', 'Cook', 22.00, '5678', true),
--   ('SAMPLE-003', 'Mike', 'Johnson', 'Manager', 28.00, '9999', true)
-- ON CONFLICT (toast_guid) DO NOTHING;

-- =====================================================
-- END OF SCHEMA
-- =====================================================

-- Display success message
DO $$
BEGIN
  RAISE NOTICE '✅ Scheduling system tables created successfully!';
  RAISE NOTICE '📋 Tables: employees, schedules, shifts, schedule_settings';
  RAISE NOTICE '⚡ Triggers: Auto-calculate shift hours/cost, Auto-update schedule totals';
  RAISE NOTICE '🔄 Next step: Run Toast employee sync to populate employees table';
END $$;
