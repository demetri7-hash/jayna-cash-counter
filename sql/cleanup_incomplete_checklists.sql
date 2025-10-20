-- ============================================
-- CLEANUP INCOMPLETE CHECKLIST DEFINITIONS
-- ============================================
-- Created: 2025-10-19
-- Purpose: Remove incomplete checklist definitions that only have 1 section
-- These checklists are broken and should be re-created properly via EDIT tab
-- Run this in Supabase SQL Editor

-- Delete incomplete checklists (only 1 section = incomplete)
-- This will CASCADE delete all sections, tasks, and categories

DELETE FROM checklist_definitions
WHERE type IN ('am_cleaning', 'foh_opening', 'custom_1760849581');

-- ============================================
-- RESULT
-- ============================================
-- After running this:
-- - Only complete checklists remain (foh_closing, bar_closing, foh_transition)
-- - Incomplete checklists removed from database
-- - Managers can re-create them properly using EDIT tab
-- - System will only show checklists with complete data

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Incomplete checklists deleted!';
  RAISE NOTICE 'Deleted: am_cleaning, foh_opening, custom_1760849581';
  RAISE NOTICE 'Managers can re-create these checklists via EDIT tab';
  RAISE NOTICE 'System now shows only complete checklists with proper time ranges';
END $$;
