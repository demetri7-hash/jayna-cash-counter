-- ============================================
-- FOH CHECKLIST ENHANCEMENTS - DATABASE SCHEMA
-- ============================================
-- Created: 2025-10-18
-- Features: Required tasks, Photo uploads, Soft delete
-- Run this in Supabase SQL Editor

-- ============================================
-- ALTER TABLE: Add Required Flag to Task Definitions
-- ============================================
ALTER TABLE checklist_section_tasks
ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT false;

-- ============================================
-- ALTER TABLE: Add Required Flag to Task Completions
-- ============================================
-- Stores is_required flag for each session task (copied from definition)
ALTER TABLE foh_checklist_tasks
ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT false;

-- ============================================
-- ALTER TABLE: Add Time Fields to Checklist Definitions
-- ============================================
-- These control when checklists are available (actual time logic, not just display)
ALTER TABLE checklist_definitions
ADD COLUMN IF NOT EXISTS start_hour INTEGER, -- 0-23
ADD COLUMN IF NOT EXISTS start_minute INTEGER DEFAULT 0, -- 0-59
ADD COLUMN IF NOT EXISTS end_hour INTEGER, -- 0-23
ADD COLUMN IF NOT EXISTS end_minute INTEGER DEFAULT 0; -- 0-59

-- ============================================
-- TABLE: Task Completion Photos
-- ============================================
-- Stores photos uploaded during task completion
-- 1 photo per task limit (enforced in UI)
-- Soft delete: deleted photos still visible in Watchdog

CREATE TABLE IF NOT EXISTS foh_checklist_task_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL, -- References foh_checklist_tasks (completed task record)
  session_id UUID NOT NULL, -- References foh_checklist_sessions
  photo_url TEXT NOT NULL, -- Supabase Storage URL
  uploaded_by TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  deleted_by TEXT, -- Who deleted it (soft delete)
  deleted_at TIMESTAMP, -- When deleted (soft delete)
  is_deleted BOOLEAN DEFAULT false
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_task_photos_task ON foh_checklist_task_photos(task_id);
CREATE INDEX IF NOT EXISTS idx_task_photos_session ON foh_checklist_task_photos(session_id);
CREATE INDEX IF NOT EXISTS idx_task_photos_deleted ON foh_checklist_task_photos(is_deleted);

-- ============================================
-- TABLE: Session Photos (Notes Section)
-- ============================================
-- Stores photos uploaded in notes section
-- 5 photos max per session (enforced in UI)
-- Soft delete: deleted photos still visible in Watchdog

CREATE TABLE IF NOT EXISTS foh_checklist_session_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES foh_checklist_sessions(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL, -- Supabase Storage URL
  caption TEXT, -- Optional description
  uploaded_by TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  deleted_by TEXT, -- Who deleted it (soft delete)
  deleted_at TIMESTAMP, -- When deleted (soft delete)
  is_deleted BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0 -- For ordering photos
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_session_photos_session ON foh_checklist_session_photos(session_id);
CREATE INDEX IF NOT EXISTS idx_session_photos_deleted ON foh_checklist_session_photos(is_deleted);
CREATE INDEX IF NOT EXISTS idx_session_photos_order ON foh_checklist_session_photos(session_id, display_order);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ FOH Checklist enhancements schema created successfully!';
  RAISE NOTICE 'Tables created/updated:';
  RAISE NOTICE '  - checklist_section_tasks (added is_required column)';
  RAISE NOTICE '  - foh_checklist_tasks (added is_required column)';
  RAISE NOTICE '  - checklist_definitions (added time fields: start_hour, start_minute, end_hour, end_minute)';
  RAISE NOTICE '  - foh_checklist_task_photos (task photos with soft delete)';
  RAISE NOTICE '  - foh_checklist_session_photos (session photos with soft delete)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ NEXT STEP: Create Supabase Storage bucket named "foh-checklist-photos"';
  RAISE NOTICE 'See CHECKLIST_ENHANCEMENT_PLAN.md for complete setup instructions';
END $$;
