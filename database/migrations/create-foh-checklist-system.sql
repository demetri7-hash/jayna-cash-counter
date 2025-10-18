-- ============================================
-- FOH CHECKLIST SYSTEM
-- ============================================
-- Created: October 17, 2025
-- Purpose: Track FOH staff checklist completion with timestamps and accountability
--
-- FEATURES:
-- - Staff enters name and completes tasks
-- - Auto-save when each task is checked/unchecked
-- - Manager watchdog view shows historical completion data
-- - Time-based workflow selection
--
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard SQL Editor
-- 2. Copy and paste this entire file
-- 3. Click "Run"
-- ============================================

-- ============================================
-- TABLE 1: foh_checklist_sessions
-- ============================================
-- Tracks each time staff starts a checklist
CREATE TABLE IF NOT EXISTS foh_checklist_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_type TEXT NOT NULL, -- 'am_cleaning', 'foh_opening', 'foh_transition', 'foh_closing', 'bar_closing'
  staff_name TEXT NOT NULL,
  staff_name_2 TEXT, -- Second staff member if applicable
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  session_time TIME NOT NULL DEFAULT CURRENT_TIME,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  is_complete BOOLEAN DEFAULT FALSE,
  notes TEXT, -- Notes left for incoming crew
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_foh_sessions_date ON foh_checklist_sessions(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_foh_sessions_type ON foh_checklist_sessions(checklist_type);
CREATE INDEX IF NOT EXISTS idx_foh_sessions_staff ON foh_checklist_sessions(staff_name);
CREATE INDEX IF NOT EXISTS idx_foh_sessions_complete ON foh_checklist_sessions(is_complete, session_date DESC);

-- Comments
COMMENT ON TABLE foh_checklist_sessions IS 'Tracks FOH staff checklist sessions with staff names and completion status';
COMMENT ON COLUMN foh_checklist_sessions.checklist_type IS 'Type of checklist: am_cleaning, foh_opening, foh_transition, foh_closing, bar_closing';
COMMENT ON COLUMN foh_checklist_sessions.staff_name IS 'Primary staff member completing checklist';
COMMENT ON COLUMN foh_checklist_sessions.staff_name_2 IS 'Secondary staff member (if applicable)';

-- ============================================
-- TABLE 2: foh_checklist_tasks
-- ============================================
-- Tracks individual task completions within a session
CREATE TABLE IF NOT EXISTS foh_checklist_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES foh_checklist_sessions(id) ON DELETE CASCADE,
  checklist_type TEXT NOT NULL,
  section_name TEXT NOT NULL, -- e.g., 'Dining Room & Patio Setup', 'Bathrooms'
  task_text TEXT NOT NULL,
  task_order INTEGER NOT NULL, -- Order within section
  is_completed BOOLEAN DEFAULT FALSE,
  completed_by TEXT, -- Staff name who checked it
  completed_at TIMESTAMPTZ,
  unchecked_by TEXT, -- If someone unchecks it
  unchecked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_foh_tasks_session ON foh_checklist_tasks(session_id);
CREATE INDEX IF NOT EXISTS idx_foh_tasks_completed ON foh_checklist_tasks(is_completed);
CREATE INDEX IF NOT EXISTS idx_foh_tasks_section ON foh_checklist_tasks(checklist_type, section_name);

-- Comments
COMMENT ON TABLE foh_checklist_tasks IS 'Individual task completions within FOH checklist sessions';
COMMENT ON COLUMN foh_checklist_tasks.completed_by IS 'Staff member who checked the task';
COMMENT ON COLUMN foh_checklist_tasks.completed_at IS 'Timestamp when task was completed';

-- ============================================
-- TABLE 3: foh_checklist_ratings
-- ============================================
-- Tracks review ratings (1-5 scale) for checklist quality
CREATE TABLE IF NOT EXISTS foh_checklist_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES foh_checklist_sessions(id) ON DELETE CASCADE,
  checklist_type TEXT NOT NULL,
  category_name TEXT NOT NULL, -- e.g., 'Dining Rooms', 'Bathrooms', 'Bar'
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  rated_by TEXT, -- Staff name who provided rating
  rated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_foh_ratings_session ON foh_checklist_ratings(session_id);
CREATE INDEX IF NOT EXISTS idx_foh_ratings_category ON foh_checklist_ratings(category_name, rated_at DESC);

-- Comments
COMMENT ON TABLE foh_checklist_ratings IS 'Quality ratings (1-5 scale) for checklist review sections';
COMMENT ON COLUMN foh_checklist_ratings.rating IS 'Rating from 1 (Major Issues) to 5 (Guest-Ready)';

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'FOH Checklist System Created Successfully!' AS status;

SELECT
  tablename AS table_name,
  schemaname AS schema
FROM pg_tables
WHERE tablename LIKE 'foh_checklist%'
ORDER BY tablename;

-- Show columns for main tables
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name LIKE 'foh_checklist%'
ORDER BY table_name, ordinal_position;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Next steps:
-- 1. Implement FOH tab in index.html
-- 2. Build time-based workflow selector
-- 3. Create auto-save functionality
-- 4. Build Manager Watchdog view
-- ============================================
