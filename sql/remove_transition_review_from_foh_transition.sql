-- ============================================
-- REMOVE TRANSITION REVIEW FROM FOH TRANSITION CHECKLIST
-- ============================================
-- Purpose: Remove review sections from foh_transition checklist
-- The standalone transition_review checklist should be used instead
-- ============================================

-- STEP 1: See what's currently in foh_transition
SELECT '==== CURRENT FOH_TRANSITION SECTIONS ====' as info;
SELECT
  s.id,
  s.name,
  s.section_type,
  s.display_order
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'foh_transition'
ORDER BY s.display_order;

-- STEP 2: Check if there are any rating sections (review sections)
SELECT '==== RATING SECTIONS IN FOH_TRANSITION ====' as info;
SELECT
  s.id,
  s.name,
  s.section_type,
  s.display_order
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'foh_transition' AND s.section_type = 'rating';

-- STEP 3: Delete all rating sections from foh_transition
-- This will cascade delete the categories too
DELETE FROM checklist_sections
WHERE id IN (
  SELECT s.id
  FROM checklist_sections s
  JOIN checklist_definitions d ON s.checklist_id = d.id
  WHERE d.type = 'foh_transition' AND s.section_type = 'rating'
);

-- STEP 4: Verify removal
SELECT '==== FOH_TRANSITION SECTIONS AFTER CLEANUP ====' as info;
SELECT
  s.id,
  s.name,
  s.section_type,
  s.display_order
FROM checklist_sections s
JOIN checklist_definitions d ON s.checklist_id = d.id
WHERE d.type = 'foh_transition'
ORDER BY s.display_order;

-- STEP 5: Verify transition_review still exists standalone
SELECT '==== STANDALONE TRANSITION_REVIEW CHECKLIST ====' as info;
SELECT
  d.type,
  d.title,
  d.time_range,
  COUNT(s.id) as section_count
FROM checklist_definitions d
LEFT JOIN checklist_sections s ON s.checklist_id = d.id
WHERE d.type = 'transition_review'
GROUP BY d.type, d.title, d.time_range;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Removed review sections from foh_transition checklist!';
  RAISE NOTICE 'The standalone transition_review checklist remains intact.';
  RAISE NOTICE 'Refresh your page to see the changes.';
END $$;
