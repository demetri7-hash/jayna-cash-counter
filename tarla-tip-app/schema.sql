-- =====================================================
-- TipShare - Tarla Grill FOH Tip-Out Calculator
-- Supabase Database Schema
-- =====================================================

-- ============================================================================
-- TABLE: Tarla_Employees
-- Master list of all FOH staff (servers, bartenders, support staff)
-- ============================================================================
CREATE TABLE Tarla_Employees (
  tarla_id BIGSERIAL PRIMARY KEY,
  tarla_name TEXT NOT NULL,
  tarla_role TEXT NOT NULL CHECK (tarla_role IN ('Server', 'Bartender', 'Support Staff')),
  tarla_is_active BOOLEAN DEFAULT TRUE,
  tarla_created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast filtering by active status
CREATE INDEX idx_tarla_employees_active ON Tarla_Employees(tarla_is_active);

-- ============================================================================
-- TABLE: Tarla_Shifts
-- Header record for each tip-out report (date, shift, config, totals)
-- ============================================================================
CREATE TABLE Tarla_Shifts (
  tarla_id BIGSERIAL PRIMARY KEY,
  tarla_shift_date DATE NOT NULL,
  tarla_shift_period TEXT NOT NULL CHECK (tarla_shift_period IN ('AM', 'PM')),
  tarla_server_tip_percent NUMERIC(5, 2) NOT NULL,
  tarla_bartender_tip_percent NUMERIC(5, 2) NOT NULL,
  tarla_total_net_sales NUMERIC(10, 2) DEFAULT 0,
  tarla_total_cc_tips NUMERIC(10, 2) DEFAULT 0,
  tarla_total_support_pool NUMERIC(10, 2) DEFAULT 0,
  tarla_created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast date-based queries
CREATE INDEX idx_tarla_shifts_date ON Tarla_Shifts(tarla_shift_date DESC);

-- ============================================================================
-- TABLE: Tarla_Shift_Entries
-- Line items for each report (per-employee sales, tips, and payouts)
-- ============================================================================
CREATE TABLE Tarla_Shift_Entries (
  tarla_id BIGSERIAL PRIMARY KEY,
  tarla_shift_id BIGINT REFERENCES Tarla_Shifts(tarla_id) ON DELETE CASCADE,
  tarla_employee_id BIGINT REFERENCES Tarla_Employees(tarla_id) ON DELETE CASCADE,
  tarla_net_sales NUMERIC(10, 2) DEFAULT 0,
  tarla_cc_tips NUMERIC(10, 2) DEFAULT 0,
  tarla_tip_out NUMERIC(10, 2) DEFAULT 0,
  tarla_tip_in NUMERIC(10, 2) DEFAULT 0,
  tarla_final_payout NUMERIC(10, 2) DEFAULT 0,
  tarla_created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast shift-based queries
CREATE INDEX idx_tarla_shift_entries_shift ON Tarla_Shift_Entries(tarla_shift_id);
CREATE INDEX idx_tarla_shift_entries_employee ON Tarla_Shift_Entries(tarla_employee_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - DISABLED FOR SIMPLICITY
-- Enable this if you need authentication/multi-tenant support
-- ============================================================================
ALTER TABLE Tarla_Employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE Tarla_Shifts DISABLE ROW LEVEL SECURITY;
ALTER TABLE Tarla_Shift_Entries DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================
INSERT INTO Tarla_Employees (tarla_name, tarla_role, tarla_is_active) VALUES
('John D.', 'Server', TRUE),
('Sarah M.', 'Server', TRUE),
('Mike T.', 'Bartender', TRUE),
('Emma L.', 'Support Staff', TRUE),
('Alex R.', 'Support Staff', TRUE);

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ TipShare schema created successfully!';
  RAISE NOTICE '📋 Created 3 tables: Tarla_Employees, Tarla_Shifts, Tarla_Shift_Entries';
  RAISE NOTICE '🔧 Next step: Update supabase-client.js with your credentials';
END $$;
