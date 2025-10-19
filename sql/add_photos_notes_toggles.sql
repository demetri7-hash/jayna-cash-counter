-- ============================================
-- ADD PHOTOS/NOTES TOGGLE COLUMNS
-- ============================================
-- Created: 2025-10-19
-- Purpose: Allow managers to enable/disable photos and notes per checklist
-- Run this in Supabase SQL Editor

-- Add has_photos column (photos currently have no toggle)
ALTER TABLE checklist_definitions
ADD COLUMN IF NOT EXISTS has_photos BOOLEAN DEFAULT true;

-- Ensure has_notes exists (should already exist from original schema)
-- This is idempotent, will do nothing if column already exists
ALTER TABLE checklist_definitions
ADD COLUMN IF NOT EXISTS has_notes BOOLEAN DEFAULT true;

-- Set all existing checklists to have photos and notes enabled by default
UPDATE checklist_definitions
SET has_photos = true, has_notes = true
WHERE has_photos IS NULL OR has_notes IS NULL;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Photos/Notes toggle columns added successfully!';
  RAISE NOTICE 'Column: has_photos (default: true)';
  RAISE NOTICE 'Column: has_notes (default: true)';
  RAISE NOTICE 'All existing checklists set to enabled';
END $$;
