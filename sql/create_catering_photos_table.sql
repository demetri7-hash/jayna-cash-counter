-- ============================================
-- CATERING PHOTOS TABLE
-- ============================================
-- Created: October 22, 2025
-- Purpose: Store uploaded photos of catering orders
-- Features:
--   - Drag-and-drop reordering
--   - Delete with password protection
--   - Display order persists for all users

-- Drop table if exists
DROP TABLE IF EXISTS catering_photos CASCADE;

-- Create the table
CREATE TABLE catering_photos (
  -- Primary key
  id BIGSERIAL PRIMARY KEY,

  -- Image data
  image_url TEXT NOT NULL,
  image_data TEXT, -- Base64 encoded image or storage URL

  -- Display order (lower numbers show first)
  display_order INTEGER NOT NULL DEFAULT 0,

  -- Optional metadata
  caption TEXT,
  uploaded_by VARCHAR(100),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_catering_photos_display_order ON catering_photos(display_order);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_catering_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_catering_photos_updated_at
  BEFORE UPDATE ON catering_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_catering_photos_updated_at();

-- Verify
SELECT COUNT(*) FROM catering_photos;
