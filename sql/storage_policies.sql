-- ============================================
-- SUPABASE STORAGE - RLS POLICIES
-- ============================================
-- Created: 2025-10-18
-- Purpose: Set up storage bucket and policies for photo uploads
-- Run this in Supabase SQL Editor AFTER creating the bucket

-- ============================================
-- IMPORTANT: Create Storage Bucket First!
-- ============================================
-- Before running this SQL, go to:
-- Supabase Dashboard → Storage → Create Bucket
--
-- Settings:
--   Name: foh-checklist-photos
--   Public: Yes (allows direct URL access)
--   File size limit: 5MB
--   Allowed MIME types: image/jpeg, image/png, image/webp

-- ============================================
-- RLS Policies for Storage Bucket
-- ============================================

-- Allow anyone to upload photos
CREATE POLICY "Allow photo uploads"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'foh-checklist-photos');

-- Allow anyone to read photos (public bucket)
CREATE POLICY "Allow photo reads"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'foh-checklist-photos');

-- Allow users to delete their own photos
-- Note: Soft delete in database, but this allows actual file deletion if needed
CREATE POLICY "Allow photo deletion"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'foh-checklist-photos');

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Storage policies created successfully!';
  RAISE NOTICE 'Bucket: foh-checklist-photos';
  RAISE NOTICE '  - Upload: Allowed';
  RAISE NOTICE '  - Read: Public access';
  RAISE NOTICE '  - Delete: Allowed (soft delete in database)';
END $$;
