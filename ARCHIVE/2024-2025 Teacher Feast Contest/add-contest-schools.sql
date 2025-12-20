-- Add missing schools and configure Instagram handles for Teacher's Feast Contest
-- Run this in Supabase SQL Editor

-- Add Delta Elementary Charter School (missing)
INSERT INTO teacher_feast_schools (school_name, instagram_handles, total_votes, instagram_votes, form_votes)
VALUES (
    'Delta Elementary Charter School',
    '["@deltaelementarycharterschool"]'::jsonb,
    0, 0, 0
)
ON CONFLICT (school_name) DO UPDATE SET
    instagram_handles = EXCLUDED.instagram_handles;

-- Add Taylor Street Elementary (missing)
INSERT INTO teacher_feast_schools (school_name, instagram_handles, total_votes, instagram_votes, form_votes)
VALUES (
    'Taylor Street Elementary',
    '["@taylorstreetschool"]'::jsonb,
    0, 0, 0
)
ON CONFLICT (school_name) DO UPDATE SET
    instagram_handles = EXCLUDED.instagram_handles;

-- Update Instagram handles for existing schools
UPDATE teacher_feast_schools
SET instagram_handles = '["@washingtonlocomotives"]'::jsonb
WHERE school_name = 'Washington Elementary School';

UPDATE teacher_feast_schools
SET instagram_handles = '["@calmiddleschoolsac"]'::jsonb
WHERE school_name = 'California Middle School';

UPDATE teacher_feast_schools
SET instagram_handles = '["@robla.glenwood"]'::jsonb
WHERE school_name = 'Glenwood Elementary School';

-- Verify
SELECT school_name, instagram_handles, total_votes
FROM teacher_feast_schools
WHERE school_name IN (
    'Delta Elementary Charter School',
    'Taylor Street Elementary',
    'Washington Elementary School',
    'California Middle School',
    'Glenwood Elementary School'
)
ORDER BY school_name;
