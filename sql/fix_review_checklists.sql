-- ============================================
-- FIX REVIEW CHECKLISTS - Clean up and rebuild
-- ============================================
-- This script cleans up any partial/orphaned data and rebuilds the review checklists properly

-- ============================================
-- STEP 1: Clean up any orphaned categories
-- ============================================
DELETE FROM checklist_section_categories
WHERE NOT EXISTS (
  SELECT 1 FROM checklist_sections WHERE id = checklist_section_categories.section_id
);

-- ============================================
-- STEP 2: Delete existing sections for review checklists (will cascade to categories)
-- ============================================
DELETE FROM checklist_sections
WHERE checklist_id IN (
  SELECT id FROM checklist_definitions
  WHERE type IN ('am_cleaning', 'closing_review', 'transition_review')
);

-- ============================================
-- STEP 3: Rebuild AM CLEANING REVIEW
-- ============================================
-- Section
INSERT INTO checklist_sections (checklist_id, name, description, section_type, display_order)
SELECT id, 'Quality Review', NULL, 'rating', 0
FROM checklist_definitions WHERE type = 'am_cleaning';

-- Categories
INSERT INTO checklist_section_categories (section_id, name, description, display_order)
SELECT s.id, 'Dining Rooms', 'Chairs clean, mirrors, windows, décor, lights', 0
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'am_cleaning' AND s.name = 'Quality Review';

INSERT INTO checklist_section_categories (section_id, name, description, display_order)
SELECT s.id, 'Expo & Water Station', 'Stocked, clean, organized', 1
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'am_cleaning' AND s.name = 'Quality Review';

INSERT INTO checklist_section_categories (section_id, name, description, display_order)
SELECT s.id, 'Bathrooms', 'Checked and restocked', 2
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'am_cleaning' AND s.name = 'Quality Review';

INSERT INTO checklist_section_categories (section_id, name, description, display_order)
SELECT s.id, 'Bar', 'Restocked, garnishes prepped, glassware ready', 3
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'am_cleaning' AND s.name = 'Quality Review';

-- ============================================
-- STEP 4: Rebuild CLOSING REVIEW
-- ============================================
-- Section
INSERT INTO checklist_sections (checklist_id, name, description, section_type, display_order)
SELECT id, 'Quality Review', NULL, 'rating', 0
FROM checklist_definitions WHERE type = 'closing_review';

-- Categories
INSERT INTO checklist_section_categories (section_id, name, description, display_order)
SELECT s.id, 'Dining Rooms', 'Chairs clean, mirrors, windows, décor, lights', 0
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'closing_review' AND s.name = 'Quality Review';

INSERT INTO checklist_section_categories (section_id, name, description, display_order)
SELECT s.id, 'Expo & Water Station', 'Stocked, clean, organized', 1
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'closing_review' AND s.name = 'Quality Review';

INSERT INTO checklist_section_categories (section_id, name, description, display_order)
SELECT s.id, 'Sauces + Baklava Prep + Beverage Fridge', '', 2
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'closing_review' AND s.name = 'Quality Review';

INSERT INTO checklist_section_categories (section_id, name, description, display_order)
SELECT s.id, 'Cashier & Retail', 'Baklava at POS, menus wiped, retail shelves, Turkish delights', 3
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'closing_review' AND s.name = 'Quality Review';

INSERT INTO checklist_section_categories (section_id, name, description, display_order)
SELECT s.id, 'Silver', 'Rollies, prefold linens, leftover washed silver', 4
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'closing_review' AND s.name = 'Quality Review';

INSERT INTO checklist_section_categories (section_id, name, description, display_order)
SELECT s.id, 'Fro-Yo', 'Backups, cleanliness, turned off?', 5
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'closing_review' AND s.name = 'Quality Review';

INSERT INTO checklist_section_categories (section_id, name, description, display_order)
SELECT s.id, 'Office', 'Trash, clean and organized', 6
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'closing_review' AND s.name = 'Quality Review';

INSERT INTO checklist_section_categories (section_id, name, description, display_order)
SELECT s.id, 'Bar', 'To go cups and lids, stickiness, lemonades, batch cocktails, garnishes, glassware, floors, front of fridge', 7
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'closing_review' AND s.name = 'Quality Review';

-- ============================================
-- STEP 5: Rebuild TRANSITION REVIEW
-- ============================================
-- Section
INSERT INTO checklist_sections (checklist_id, name, description, section_type, display_order)
SELECT id, 'Quality Review', NULL, 'rating', 0
FROM checklist_definitions WHERE type = 'transition_review';

-- Categories
INSERT INTO checklist_section_categories (section_id, name, description, display_order)
SELECT s.id, 'Dining Rooms', 'Tables bussed, chairs clean, overall cleanliness', 0
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'transition_review' AND s.name = 'Quality Review';

INSERT INTO checklist_section_categories (section_id, name, description, display_order)
SELECT s.id, 'Expo & Water Station', 'Restocked, clean, organized for dinner rush', 1
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'transition_review' AND s.name = 'Quality Review';

INSERT INTO checklist_section_categories (section_id, name, description, display_order)
SELECT s.id, 'Bathrooms', 'Checked and restocked for dinner service', 2
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'transition_review' AND s.name = 'Quality Review';

INSERT INTO checklist_section_categories (section_id, name, description, display_order)
SELECT s.id, 'Bar', 'Restocked, garnishes prepped, glassware ready', 3
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'transition_review' AND s.name = 'Quality Review';

INSERT INTO checklist_section_categories (section_id, name, description, display_order)
SELECT s.id, 'Cashier & POS', 'Organized, supplies stocked', 4
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'transition_review' AND s.name = 'Quality Review';

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'REVIEW CHECKLISTS:' as info;
SELECT
  d.type,
  d.title,
  d.time_range,
  d.staff_count,
  COUNT(DISTINCT s.id) as section_count,
  COUNT(c.id) as category_count
FROM checklist_definitions d
LEFT JOIN checklist_sections s ON d.id = s.checklist_id
LEFT JOIN checklist_section_categories c ON s.id = c.section_id
WHERE d.type IN ('am_cleaning', 'closing_review', 'transition_review')
GROUP BY d.type, d.title, d.time_range, d.staff_count
ORDER BY d.start_hour;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Review checklists fixed and rebuilt!';
  RAISE NOTICE 'All sections and categories recreated properly.';
END $$;
