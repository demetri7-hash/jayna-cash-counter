-- ============================================
-- FOH REVIEW CHECKLISTS MIGRATION
-- ============================================
-- Created: October 20, 2025
-- Purpose: Extract review sections into standalone checklists with multi-user support
--
-- CHANGES:
-- 1. Add start_hour/end_hour columns to checklist_definitions if not exists
-- 2. Update AM CLEANING REVIEW to 9AM-11AM with 4 users
-- 3. Create CLOSING REVIEW (extracted from FOH Opening) - 9AM-11AM, 4 users
-- 4. Create TRANSITION REVIEW (new) - 3PM-6PM, 4 users
-- 5. Remove "Closing Review From Previous Night" section from foh_opening
--
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: Add time window columns and multi-user support
-- ============================================
ALTER TABLE checklist_definitions
ADD COLUMN IF NOT EXISTS start_hour INTEGER,
ADD COLUMN IF NOT EXISTS start_minute INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS end_hour INTEGER,
ADD COLUMN IF NOT EXISTS end_minute INTEGER DEFAULT 0;

-- Add staff_name_3 and staff_name_4 to sessions table for multi-user reviews
ALTER TABLE foh_checklist_sessions
ADD COLUMN IF NOT EXISTS staff_name_3 TEXT,
ADD COLUMN IF NOT EXISTS staff_name_4 TEXT;

-- ============================================
-- STEP 2: Update AM CLEANING REVIEW
-- ============================================
-- Change to 9AM-11AM (was 9AM-3PM) and support 4 users
UPDATE checklist_definitions
SET
  time_range = '9:00 AM - 11:00 AM',
  start_hour = 9,
  start_minute = 0,
  end_hour = 11,
  end_minute = 0,
  staff_count = 4,  -- Multi-user support
  updated_at = NOW()
WHERE type = 'am_cleaning';

-- ============================================
-- STEP 3: Create CLOSING REVIEW
-- ============================================
-- Extract from FOH Opening, 9AM-11AM, 4 users
INSERT INTO checklist_definitions (type, title, time_range, description, staff_count, has_ratings, has_notes, rating_scale, start_hour, start_minute, end_hour, end_minute)
VALUES (
  'closing_review',
  'CLOSING REVIEW',
  '9:00 AM - 11:00 AM',
  'Review of closing procedures from the night before',
  4,  -- Multi-user support
  true,
  true,
  '1 – MAJOR ISSUES | 3 – ACCEPTABLE | 5 – GUEST-READY',
  9,
  0,
  11,
  0
)
ON CONFLICT (type) DO UPDATE SET
  title = EXCLUDED.title,
  time_range = EXCLUDED.time_range,
  description = EXCLUDED.description,
  staff_count = EXCLUDED.staff_count,
  has_ratings = EXCLUDED.has_ratings,
  has_notes = EXCLUDED.has_notes,
  rating_scale = EXCLUDED.rating_scale,
  start_hour = EXCLUDED.start_hour,
  start_minute = EXCLUDED.start_minute,
  end_hour = EXCLUDED.end_hour,
  end_minute = EXCLUDED.end_minute,
  updated_at = NOW();

-- CLOSING REVIEW: Quality Review section (rating)
INSERT INTO checklist_sections (checklist_id, name, description, section_type, display_order)
SELECT id, 'Quality Review', NULL, 'rating', 0
FROM checklist_definitions WHERE type = 'closing_review'
ON CONFLICT DO NOTHING;

-- CLOSING REVIEW: Rating categories (from FOH Opening's "Closing Review From Previous Night")
INSERT INTO checklist_section_categories (section_id, name, description, display_order)
SELECT s.id, 'Dining Rooms', 'Chairs clean, mirrors, windows, décor, lights', 0
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'closing_review' AND s.name = 'Quality Review'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_section_categories (section_id, name, description, display_order)
SELECT s.id, 'Expo & Water Station', 'Stocked, clean, organized', 1
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'closing_review' AND s.name = 'Quality Review'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_section_categories (section_id, name, description, display_order)
SELECT s.id, 'Sauces + Baklava Prep + Beverage Fridge', '', 2
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'closing_review' AND s.name = 'Quality Review'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_section_categories (section_id, name, description, display_order)
SELECT s.id, 'Cashier & Retail', 'Baklava at POS, menus wiped, retail shelves, Turkish delights', 3
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'closing_review' AND s.name = 'Quality Review'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_section_categories (section_id, name, description, display_order)
SELECT s.id, 'Silver', 'Rollies, prefold linens, leftover washed silver', 4
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'closing_review' AND s.name = 'Quality Review'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_section_categories (section_id, name, description, display_order)
SELECT s.id, 'Fro-Yo', 'Backups, cleanliness, turned off?', 5
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'closing_review' AND s.name = 'Quality Review'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_section_categories (section_id, name, description, display_order)
SELECT s.id, 'Office', 'Trash, clean and organized', 6
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'closing_review' AND s.name = 'Quality Review'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_section_categories (section_id, name, description, display_order)
SELECT s.id, 'Bar', 'To go cups and lids, stickiness, lemonades, batch cocktails, garnishes, glassware, floors, front of fridge', 7
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'closing_review' AND s.name = 'Quality Review'
ON CONFLICT DO NOTHING;

-- ============================================
-- STEP 4: Create TRANSITION REVIEW
-- ============================================
-- New review type, 3PM-6PM, 4 users
INSERT INTO checklist_definitions (type, title, time_range, description, staff_count, has_ratings, has_notes, rating_scale, start_hour, start_minute, end_hour, end_minute)
VALUES (
  'transition_review',
  'TRANSITION REVIEW',
  '3:00 PM - 6:00 PM',
  'Review of lunch service and transition to dinner',
  4,  -- Multi-user support
  true,
  true,
  '1 – MAJOR ISSUES | 3 – ACCEPTABLE | 5 – GUEST-READY',
  15,  -- 3PM in 24-hour format
  0,
  18,  -- 6PM in 24-hour format
  0
)
ON CONFLICT (type) DO UPDATE SET
  title = EXCLUDED.title,
  time_range = EXCLUDED.time_range,
  description = EXCLUDED.description,
  staff_count = EXCLUDED.staff_count,
  has_ratings = EXCLUDED.has_ratings,
  has_notes = EXCLUDED.has_notes,
  rating_scale = EXCLUDED.rating_scale,
  start_hour = EXCLUDED.start_hour,
  start_minute = EXCLUDED.start_minute,
  end_hour = EXCLUDED.end_hour,
  end_minute = EXCLUDED.end_minute,
  updated_at = NOW();

-- TRANSITION REVIEW: Quality Review section (rating)
INSERT INTO checklist_sections (checklist_id, name, description, section_type, display_order)
SELECT id, 'Quality Review', NULL, 'rating', 0
FROM checklist_definitions WHERE type = 'transition_review'
ON CONFLICT DO NOTHING;

-- TRANSITION REVIEW: Rating categories
INSERT INTO checklist_section_categories (section_id, name, description, display_order)
SELECT s.id, 'Dining Rooms', 'Tables bussed, chairs clean, overall cleanliness', 0
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'transition_review' AND s.name = 'Quality Review'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_section_categories (section_id, name, description, display_order)
SELECT s.id, 'Expo & Water Station', 'Restocked, clean, organized for dinner rush', 1
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'transition_review' AND s.name = 'Quality Review'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_section_categories (section_id, name, description, display_order)
SELECT s.id, 'Bathrooms', 'Checked and restocked for dinner service', 2
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'transition_review' AND s.name = 'Quality Review'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_section_categories (section_id, name, description, display_order)
SELECT s.id, 'Bar', 'Restocked, garnishes prepped, glassware ready', 3
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'transition_review' AND s.name = 'Quality Review'
ON CONFLICT DO NOTHING;

INSERT INTO checklist_section_categories (section_id, name, description, display_order)
SELECT s.id, 'Cashier & POS', 'Organized, supplies stocked', 4
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'transition_review' AND s.name = 'Quality Review'
ON CONFLICT DO NOTHING;

-- ============================================
-- STEP 5: Remove "Closing Review" section from FOH Opening
-- ============================================
-- Delete the old review section from foh_opening (cascade will delete categories)
DELETE FROM checklist_sections
WHERE id IN (
  SELECT s.id
  FROM checklist_sections s
  JOIN checklist_definitions d ON s.checklist_id = d.id
  WHERE d.type = 'foh_opening' AND s.name = 'Closing Review From Previous Night'
);

-- ============================================
-- VERIFICATION
-- ============================================
SELECT
  type,
  title,
  time_range,
  staff_count,
  start_hour,
  end_hour
FROM checklist_definitions
WHERE type IN ('am_cleaning', 'closing_review', 'transition_review')
ORDER BY start_hour;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Review checklists migration complete!';
  RAISE NOTICE 'Updated: am_cleaning (9AM-11AM, 4 users)';
  RAISE NOTICE 'Created: closing_review (9AM-11AM, 4 users)';
  RAISE NOTICE 'Created: transition_review (3PM-6PM, 4 users)';
  RAISE NOTICE 'Removed: Closing Review section from foh_opening';
END $$;
