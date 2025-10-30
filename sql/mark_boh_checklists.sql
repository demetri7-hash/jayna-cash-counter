-- ============================================
-- MARK BOH CHECKLISTS AS BOH DEPARTMENT
-- ============================================
-- Created: 2025-10-30
-- Purpose: Mark all checklists starting with "boh_" as BOH department

-- Mark all BOH checklists
UPDATE checklist_definitions
SET department = 'BOH'
WHERE type LIKE 'boh_%';

-- Verify the update
SELECT
  type,
  title,
  department,
  time_range
FROM checklist_definitions
WHERE type LIKE 'boh_%'
ORDER BY title;

-- Show all checklists grouped by department
SELECT
  department,
  COUNT(*) as count,
  STRING_AGG(title, ', ' ORDER BY title) as checklists
FROM checklist_definitions
GROUP BY department
ORDER BY department NULLS LAST;

-- Success message
DO $$
DECLARE
  boh_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO boh_count FROM checklist_definitions WHERE department = 'BOH';
  RAISE NOTICE '✅ BOH checklists marked successfully!';
  RAISE NOTICE 'Total BOH checklists: %', boh_count;
END $$;
