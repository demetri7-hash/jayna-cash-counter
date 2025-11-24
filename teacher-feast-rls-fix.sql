-- Fix Row-Level Security for Teacher's Feast Contest Tables
-- Run this in Supabase SQL Editor to allow frontend access

-- DISABLE RLS on teacher_feast_config (it's a config table that needs public read/write)
ALTER TABLE teacher_feast_config DISABLE ROW LEVEL SECURITY;

-- DISABLE RLS on teacher_feast_schools (public leaderboard needs read access)
ALTER TABLE teacher_feast_schools DISABLE ROW LEVEL SECURITY;

-- DISABLE RLS on teacher_feast_votes (scraper needs to insert votes)
ALTER TABLE teacher_feast_votes DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'teacher_feast%';

-- Expected output: All teacher_feast tables should show rowsecurity = false
