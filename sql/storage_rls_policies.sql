-- RLS Policies for Supabase Storage - catering-photos bucket
-- Run this in Supabase SQL Editor

-- CRITICAL: Even PUBLIC buckets require RLS policies for upload/delete/update operations
-- Public bucket setting only bypasses RLS for READING files

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public uploads to catering-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from catering-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates to catering-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes from catering-photos" ON storage.objects;

-- Allow INSERT (upload) to catering-photos bucket
CREATE POLICY "Allow public uploads to catering-photos"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'catering-photos');

-- Allow SELECT (needed for upsert functionality and listing files)
CREATE POLICY "Allow public reads from catering-photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'catering-photos');

-- Allow UPDATE (needed for upsert functionality)
CREATE POLICY "Allow public updates to catering-photos"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'catering-photos')
WITH CHECK (bucket_id = 'catering-photos');

-- Allow DELETE (for future delete functionality)
CREATE POLICY "Allow public deletes from catering-photos"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'catering-photos');

-- Verify policies were created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
ORDER BY policyname;
