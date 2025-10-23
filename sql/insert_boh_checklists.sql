-- ============================================
-- BOH CHECKLISTS INSERTION
-- ============================================
-- Created: October 22, 2025
-- Purpose: Insert 3 BOH checklists into database
-- Checklists:
--   1. AM CLEANING CHECKLIST
--   2. CLOSER RATING (DUE 10AM)
--   3. OPENING/TRANSITION RATING (DUE 5PM)
--
-- Run this in Supabase SQL Editor AFTER foh_checklists_schema.sql

-- Note: These will use the same schema as FOH checklists
-- The checklist_definitions table supports both FOH and BOH types

-- ============================================
-- 1. AM CLEANING CHECKLIST
-- ============================================
INSERT INTO checklist_definitions (type, title, time_range, description, staff_count, has_ratings, has_notes)
VALUES (
  'boh_am_cleaning',
  'AM CLEANING CHECKLIST',
  'AM Opening',
  'Cleaning and opening duties for BOH - includes floors, bathrooms, and outdoor areas',
  1,
  false,
  true
)
ON CONFLICT (type) DO UPDATE SET
  title = EXCLUDED.title,
  time_range = EXCLUDED.time_range,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Get the checklist ID for AM CLEANING
DO $$
DECLARE
  am_cleaning_id UUID;
BEGIN
  SELECT id INTO am_cleaning_id FROM checklist_definitions WHERE type = 'boh_am_cleaning';

  -- Section 1: FLOORS
  INSERT INTO checklist_sections (checklist_id, name, section_type, display_order)
  VALUES (am_cleaning_id, 'FLOORS', 'checkbox', 1);

  -- Section 2: BATHROOMS
  INSERT INTO checklist_sections (checklist_id, name, section_type, display_order)
  VALUES (am_cleaning_id, 'BATHROOMS', 'checkbox', 2);

  RAISE NOTICE '✅ AM CLEANING CHECKLIST structure created!';
END $$;

-- ============================================
-- 2. CLOSER RATING (DUE 10AM)
-- ============================================
INSERT INTO checklist_definitions (type, title, time_range, description, staff_count, has_ratings, has_notes, rating_scale)
VALUES (
  'boh_closer_rating',
  'CLOSER RATING',
  'DUE AT 10AM',
  'AM/Opening Line Cooks rate how the CLOSING crew left the restaurant',
  1,
  true,
  true,
  '1-5 Scale'
)
ON CONFLICT (type) DO UPDATE SET
  title = EXCLUDED.title,
  time_range = EXCLUDED.time_range,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================
-- 3. OPENING/TRANSITION RATING (DUE 5PM)
-- ============================================
INSERT INTO checklist_definitions (type, title, time_range, description, staff_count, has_ratings, has_notes, rating_scale)
VALUES (
  'boh_opening_rating',
  'OPENING/TRANSITION RATING',
  'DUE AT 5PM',
  'PM/Closers rate how the OPENING/TRANSITION crew left the restaurant',
  1,
  true,
  true,
  '1-5 Scale'
)
ON CONFLICT (type) DO UPDATE SET
  title = EXCLUDED.title,
  time_range = EXCLUDED.time_range,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ BOH Checklists inserted successfully!';
  RAISE NOTICE 'Created 3 checklists:';
  RAISE NOTICE '  1. AM CLEANING CHECKLIST';
  RAISE NOTICE '  2. CLOSER RATING (DUE 10AM)';
  RAISE NOTICE '  3. OPENING/TRANSITION RATING (DUE 5PM)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  NEXT STEPS:';
  RAISE NOTICE '  - Access boh.html to see the checklists';
  RAISE NOTICE '  - Checklists support notes and photo uploads (like FOH)';
  RAISE NOTICE '  - Language toggle will be added in future update';
END $$;
