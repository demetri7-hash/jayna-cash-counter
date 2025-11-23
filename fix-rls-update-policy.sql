-- FIX: Add UPDATE policies for contest tables
-- Run this in Supabase SQL Editor RIGHT NOW to enable saving Instagram handles

-- Drop existing update policies if they exist
DROP POLICY IF EXISTS "Allow public update to schools" ON teacher_feast_schools;
DROP POLICY IF EXISTS "Allow public update to config" ON teacher_feast_config;

-- Add UPDATE policy for schools table (needed for Instagram handles)
CREATE POLICY "Allow public update to schools" ON teacher_feast_schools
    FOR UPDATE USING (true) WITH CHECK (true);

-- Add UPDATE policy for config table (needed for scraper configuration)
CREATE POLICY "Allow public update to config" ON teacher_feast_config
    FOR UPDATE USING (true) WITH CHECK (true);

-- Verify policies are active
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('teacher_feast_schools', 'teacher_feast_config')
ORDER BY tablename, cmd;

COMMIT;
