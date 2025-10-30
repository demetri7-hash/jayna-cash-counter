-- ============================================
-- ADD DEPARTMENT COLUMN TO CHECKLIST DEFINITIONS
-- ============================================
-- Created: 2025-10-30
-- Purpose: Add department filter (FOH/BOH) to checklist system

-- Step 1: Add department column
ALTER TABLE checklist_definitions
ADD COLUMN IF NOT EXISTS department TEXT CHECK (department IN ('FOH', 'BOH'));

-- Step 2: Create index for fast filtering
CREATE INDEX IF NOT EXISTS idx_checklist_department ON checklist_definitions(department);

-- Step 3: Mark all FOH checklists as FOH
UPDATE checklist_definitions
SET department = 'FOH'
WHERE title IN (
  'FOH CLOSING DUTIES',
  'BAR CLOSING DUTIES',
  'FOH REQUIRED DAILY PREP',
  'AM CLEANING CHECKLIST REVIEW',
  'CLOSING REVIEW',
  'FOH TRANSITION DUTIES',
  'TRANSITION REVIEW',
  'FOH OPENING CHECKLIST'
);

-- Verify the update
SELECT
  type,
  title,
  department,
  time_range
FROM checklist_definitions
ORDER BY department NULLS LAST, title;

-- Success message
DO $$
DECLARE
  foh_count INTEGER;
  boh_count INTEGER;
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO foh_count FROM checklist_definitions WHERE department = 'FOH';
  SELECT COUNT(*) INTO boh_count FROM checklist_definitions WHERE department = 'BOH';
  SELECT COUNT(*) INTO null_count FROM checklist_definitions WHERE department IS NULL;

  RAISE NOTICE '✅ Department column added successfully!';
  RAISE NOTICE 'FOH checklists: %', foh_count;
  RAISE NOTICE 'BOH checklists: %', boh_count;
  RAISE NOTICE 'Uncategorized: %', null_count;
END $$;
