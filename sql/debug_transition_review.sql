-- ============================================
-- DEBUG TRANSITION REVIEW
-- ============================================
-- Check if transition_review exists and has proper structure

-- 1. Check checklist_definitions
SELECT 'CHECKLIST DEFINITION:' as info;
SELECT * FROM checklist_definitions WHERE type = 'transition_review';

-- 2. Check sections
SELECT 'SECTIONS:' as info;
SELECT s.*
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'transition_review';

-- 3. Check categories
SELECT 'CATEGORIES:' as info;
SELECT c.*
FROM checklist_section_categories c
JOIN checklist_sections s ON c.section_id = s.id
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'transition_review';

-- 4. Check if there are orphaned categories (categories with invalid section_id)
SELECT 'ORPHANED CATEGORIES (if any):' as info;
SELECT c.*
FROM checklist_section_categories c
WHERE NOT EXISTS (
  SELECT 1 FROM checklist_sections s WHERE s.id = c.section_id
);
