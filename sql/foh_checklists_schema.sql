-- ============================================
-- FOH CHECKLISTS DATABASE SCHEMA
-- ============================================
-- Created: 2025-10-18
-- Purpose: Store editable checklist definitions for FOH system
-- Run this in Supabase SQL Editor

-- ============================================
-- TABLE 1: Checklist Definitions
-- ============================================
CREATE TABLE IF NOT EXISTS checklist_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT UNIQUE NOT NULL, -- 'am_cleaning', 'foh_opening', etc.
  title TEXT NOT NULL,
  time_range TEXT NOT NULL,
  description TEXT,
  staff_count INTEGER DEFAULT 1,
  has_ratings BOOLEAN DEFAULT false,
  has_notes BOOLEAN DEFAULT false,
  rating_scale TEXT, -- nullable, only for checklists with ratings
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by TEXT
);

-- Index for fast lookup by type
CREATE INDEX IF NOT EXISTS idx_checklist_type ON checklist_definitions(type);

-- ============================================
-- TABLE 2: Checklist Sections
-- ============================================
CREATE TABLE IF NOT EXISTS checklist_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_id UUID NOT NULL REFERENCES checklist_definitions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT, -- nullable, some sections have descriptions
  section_type TEXT NOT NULL CHECK (section_type IN ('checkbox', 'rating')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookup by checklist
CREATE INDEX IF NOT EXISTS idx_section_checklist ON checklist_sections(checklist_id);
-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_section_order ON checklist_sections(checklist_id, display_order);

-- ============================================
-- TABLE 3: Section Tasks (for checkbox sections)
-- ============================================
CREATE TABLE IF NOT EXISTS checklist_section_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID NOT NULL REFERENCES checklist_sections(id) ON DELETE CASCADE,
  task_text TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookup by section
CREATE INDEX IF NOT EXISTS idx_task_section ON checklist_section_tasks(section_id);
-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_task_order ON checklist_section_tasks(section_id, display_order);

-- ============================================
-- TABLE 4: Section Categories (for rating sections)
-- ============================================
CREATE TABLE IF NOT EXISTS checklist_section_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID NOT NULL REFERENCES checklist_sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT, -- nullable
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookup by section
CREATE INDEX IF NOT EXISTS idx_category_section ON checklist_section_categories(section_id);
-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_category_order ON checklist_section_categories(section_id, display_order);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ FOH Checklist schema created successfully!';
  RAISE NOTICE 'Tables created: checklist_definitions, checklist_sections, checklist_section_tasks, checklist_section_categories';
  RAISE NOTICE 'Next step: Run foh_checklists_migration.sql to populate with existing data';
END $$;
