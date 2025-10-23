-- ============================================
-- BOH CHECKLISTS INSERTION - COMPLETE
-- ============================================
-- Created: October 22, 2025
-- Purpose: Insert 3 COMPLETE BOH checklists with ALL tasks/categories
-- Checklists:
--   1. AM CLEANING CHECKLIST (checkbox tasks)
--   2. CLOSER RATING (DUE 10AM) - 11 rating categories
--   3. OPENING/TRANSITION RATING (DUE 5PM) - 9 rating categories
--
-- Run this in Supabase SQL Editor AFTER foh_checklists_schema.sql
-- This will DELETE and RECREATE all BOH checklists to ensure 100% accuracy

-- ============================================
-- CLEAN UP: Delete existing BOH checklists
-- ============================================
DELETE FROM checklist_definitions WHERE type LIKE 'boh_%';

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
);

-- Get the checklist ID for AM CLEANING
DO $$
DECLARE
  am_cleaning_id UUID;
  floors_section_id UUID;
  bathrooms_section_id UUID;
BEGIN
  SELECT id INTO am_cleaning_id FROM checklist_definitions WHERE type = 'boh_am_cleaning';

  -- ============================================
  -- SECTION 1: FLOORS
  -- ============================================
  INSERT INTO checklist_sections (checklist_id, name, section_type, display_order)
  VALUES (am_cleaning_id, 'FLOORS', 'checkbox', 1)
  RETURNING id INTO floors_section_id;

  -- FLOORS TASKS (in order of checklist)
  INSERT INTO checklist_section_tasks (section_id, task_text, display_order) VALUES
  (floors_section_id, 'Sweep all floors (behind bar/expo, main dining, small dining, office, bathrooms)', 1),
  (floors_section_id, 'Mop all floors with fresh mop, hot water and floor cleaner or bleach', 2),
  (floors_section_id, 'Mopping order: 1st Main Dining, 2nd Small Dining, 3rd Bar/Expo, 4th Office, Last Bathrooms', 3),
  (floors_section_id, 'Dump dirty water in planter area outside', 4),
  (floors_section_id, 'Store yellow mop bucket with mop behind backdoor, hidden as much as possible', 5),
  (floors_section_id, 'Take down all chairs', 6),
  (floors_section_id, 'Use the blower to clean entire parking lot', 7),
  (floors_section_id, 'Check all planters around property for trash and remove as needed', 8),
  (floors_section_id, 'Check for cobwebs in front of building and around planter boxes in side patio area, use broom to remove', 9);

  -- ============================================
  -- SECTION 2: BATHROOMS
  -- ============================================
  INSERT INTO checklist_sections (checklist_id, name, section_type, display_order)
  VALUES (am_cleaning_id, 'BATHROOMS', 'checkbox', 2)
  RETURNING id INTO bathrooms_section_id;

  -- BATHROOMS TASKS (in order of checklist)
  INSERT INTO checklist_section_tasks (section_id, task_text, display_order) VALUES
  (bathrooms_section_id, 'After sweeping and mopping, use toilet cleaner and brush to scrub the toilet', 1),
  (bathrooms_section_id, 'With gloves, use Purple HD Degreaser to clean entire toilet from top to bottom, wiping all porcelain', 2),
  (bathrooms_section_id, 'Spray and wipe the floor around the whole toilet, including the back', 3),
  (bathrooms_section_id, 'Make sure to wipe the toilet brush holder as well as the handle', 4),
  (bathrooms_section_id, 'Use Windex to wipe down mirrors with white/green stripe microfiber towel to avoid lint', 5),
  (bathrooms_section_id, 'Wipe down hand dryer machine', 6),
  (bathrooms_section_id, 'Wipe down soap dispenser', 7),
  (bathrooms_section_id, 'Wipe sink and rinse out', 8);

  RAISE NOTICE '✅ AM CLEANING CHECKLIST created with 17 tasks!';
END $$;

-- ============================================
-- 2. CLOSER RATING (DUE 10AM)
-- ============================================
INSERT INTO checklist_definitions (type, title, time_range, description, staff_count, has_ratings, has_notes, rating_scale)
VALUES (
  'boh_closer_rating',
  'CLOSER RATING',
  'DUE AT 10AM',
  'AM/Opening Line Cooks rate how the CLOSING crew left the restaurant (1-5 scale)',
  1,
  true,
  true,
  '1-5 Scale'
);

-- Create section and populate categories
DO $$
DECLARE
  closer_rating_id UUID;
  closer_section_id UUID;
BEGIN
  SELECT id INTO closer_rating_id FROM checklist_definitions WHERE type = 'boh_closer_rating';

  -- Create rating section
  INSERT INTO checklist_sections (checklist_id, name, section_type, display_order)
  VALUES (closer_rating_id, 'Quality Review', 'rating', 0)
  RETURNING id INTO closer_section_id;

  -- Insert rating categories
  INSERT INTO checklist_section_categories (section_id, name, description, display_order) VALUES
  (closer_section_id, 'STATIONS STOCKED (Appetizer/Salad/Meat/Fry/Grill)', 'All pars met, backups wrapped, no empty pans', 1),
  (closer_section_id, 'CONTAINERS CHANGED & CLEAN', 'Fresh, correct-size pans; no crusted edges; lids clean', 2),
  (closer_section_id, 'FIFO, DATING & LABELING', 'All items labeled/dated; oldest on top/front', 3),
  (closer_section_id, 'GYRO COOKER', 'Trays emptied/washed; shields clean; machine off safely', 4),
  (closer_section_id, 'BLANCHED POTATOES FOR AM', 'Required containers present, labeled, chilled', 5),
  (closer_section_id, 'FRYER OIL CONDITION', 'Oil skimmed/filtered; change schedule followed', 6),
  (closer_section_id, 'SURFACES & TOOLS', 'Stations wiped/sanitized; tools clean and staged', 7),
  (closer_section_id, 'FLOORS & MATS', 'Swept & mopped; mats washed/placed; no debris', 8),
  (closer_section_id, 'STAINLESS, HOOD & WALLS', 'Fronts smudge-free; hood/walls cleaned per schedule', 9),
  (closer_section_id, 'TO-GO, BOWLS & TRAYS STOCKED', 'Ample supply at open; no scrambling first hour', 10),
  (closer_section_id, 'TRASH & DRAINS', 'Handwash trash emptied; drains bleached; no odors', 11);

  RAISE NOTICE '✅ CLOSER RATING created with 11 categories!';
END $$;

-- ============================================
-- 3. OPENING/TRANSITION RATING (DUE 5PM)
-- ============================================
INSERT INTO checklist_definitions (type, title, time_range, description, staff_count, has_ratings, has_notes, rating_scale)
VALUES (
  'boh_opening_rating',
  'OPENING/TRANSITION RATING',
  'DUE AT 5PM',
  'PM/Closers rate how the OPENING/TRANSITION crew left the restaurant (1-5 scale)',
  1,
  true,
  true,
  '1-5 Scale'
);

-- Create section and populate categories
DO $$
DECLARE
  opening_rating_id UUID;
  opening_section_id UUID;
BEGIN
  SELECT id INTO opening_rating_id FROM checklist_definitions WHERE type = 'boh_opening_rating';

  -- Create rating section
  INSERT INTO checklist_sections (checklist_id, name, section_type, display_order)
  VALUES (opening_rating_id, 'Quality Review', 'rating', 0)
  RETURNING id INTO opening_section_id;

  -- Insert rating categories
  INSERT INTO checklist_section_categories (section_id, name, description, display_order) VALUES
  (opening_section_id, 'APPETIZER/SALAD STATION REFILLED', 'PM pars met; clean containers; backups wrapped', 1),
  (opening_section_id, 'MAIN FRIDGE REFILLED', 'Greens/veggies rotated; sauces topped & dated', 2),
  (opening_section_id, 'MEAT/GYRO STATION CLEAN & STOCKED', 'Cutting area clean; meat/garbanzo pans topped', 3),
  (opening_section_id, 'RICE & POTATOES', 'Fresh rice timed for PM; blanched potatoes at par', 4),
  (opening_section_id, 'SURFACES & ORGANIZATION', 'Stations wiped/sanitized; clutter-free', 5),
  (opening_section_id, 'PITA & TO-GO', 'Pita counts set; to-go supplies stocked', 6),
  (opening_section_id, 'GYRO READINESS', 'New gyros loaded if needed; drip trays not overfull', 7),
  (opening_section_id, 'FLOORS & SPOT-MOPPING', 'No debris; safe, dry work zones', 8),
  (opening_section_id, 'HANDOFF NOTES QUALITY', 'Clear 86 risks, low stock, equipment issues flagged', 9);

  RAISE NOTICE '✅ OPENING/TRANSITION RATING created with 9 categories!';
END $$;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ BOH CHECKLISTS INSERTED SUCCESSFULLY!';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Created 3 complete checklists:';
  RAISE NOTICE '';
  RAISE NOTICE '1. AM CLEANING CHECKLIST';
  RAISE NOTICE '   - FLOORS section: 9 tasks';
  RAISE NOTICE '   - BATHROOMS section: 8 tasks';
  RAISE NOTICE '   - Total: 17 checkbox tasks';
  RAISE NOTICE '';
  RAISE NOTICE '2. CLOSER RATING (DUE 10AM)';
  RAISE NOTICE '   - Quality Review section: 11 rating categories';
  RAISE NOTICE '   - AM/Opening Line Cooks rate closers (1-5 scale)';
  RAISE NOTICE '';
  RAISE NOTICE '3. OPENING/TRANSITION RATING (DUE 5PM)';
  RAISE NOTICE '   - Quality Review section: 9 rating categories';
  RAISE NOTICE '   - PM/Closers rate opening crew (1-5 scale)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  NEXT STEPS:';
  RAISE NOTICE '   - Access boh.html to see the checklists';
  RAISE NOTICE '   - Checklists support notes and photo uploads';
  RAISE NOTICE '   - Language toggle (EN/ES/TR) will be added in future update';
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
END $$;
