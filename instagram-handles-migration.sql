-- Instagram Handles Migration Script
-- Add instagram_handles column to existing teacher_feast_schools table
-- Safe to run multiple times (will not error if column already exists)

-- Add instagram_handles column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'teacher_feast_schools'
        AND column_name = 'instagram_handles'
    ) THEN
        ALTER TABLE teacher_feast_schools
        ADD COLUMN instagram_handles JSONB DEFAULT '[]'::jsonb;

        RAISE NOTICE 'Column instagram_handles added successfully';
    ELSE
        RAISE NOTICE 'Column instagram_handles already exists, skipping';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'teacher_feast_schools'
AND column_name = 'instagram_handles';

-- Example: Add Instagram handles for some known schools
-- Uncomment and update these examples with verified handles

-- UPDATE teacher_feast_schools
-- SET instagram_handles = '["@sacshighschool", "@sacshigh"]'::jsonb
-- WHERE school_name = 'Sacramento High School';

-- UPDATE teacher_feast_schools
-- SET instagram_handles = '["@scusdkennedy", "@jfk.updates"]'::jsonb
-- WHERE school_name = 'John F. Kennedy High School';

-- UPDATE teacher_feast_schools
-- SET instagram_handles = '["@officialckmlion", "@_theclatch"]'::jsonb
-- WHERE school_name = 'C.K. McClatchy High School';

-- UPDATE teacher_feast_schools
-- SET instagram_handles = '["@jesuithighsac"]'::jsonb
-- WHERE school_name = 'Jesuit High School';

COMMIT;
