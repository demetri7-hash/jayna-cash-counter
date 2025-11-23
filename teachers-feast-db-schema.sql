-- Jayna Gyro's Great Teacher's Feast Contest Database Schema
-- Run this in your Supabase SQL Editor to create the necessary tables

-- Table: Schools participating in the contest
CREATE TABLE IF NOT EXISTS teacher_feast_schools (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_name TEXT NOT NULL UNIQUE,
    total_votes INTEGER DEFAULT 0,
    instagram_votes INTEGER DEFAULT 0,
    form_votes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: Individual votes (both Instagram tags and form submissions)
CREATE TABLE IF NOT EXISTS teacher_feast_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_name TEXT NOT NULL,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('instagram', 'form')),
    points INTEGER NOT NULL DEFAULT 1,

    -- Form submission fields (NULL for Instagram votes)
    full_name TEXT,
    email TEXT,
    phone TEXT,
    newsletter_signup BOOLEAN DEFAULT FALSE,

    -- Instagram tag fields (NULL for form votes)
    instagram_username TEXT,
    instagram_comment_id TEXT,

    voted_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT,

    FOREIGN KEY (school_name) REFERENCES teacher_feast_schools(school_name) ON UPDATE CASCADE
);

-- Table: Newsletter subscribers (for those who vote via form)
CREATE TABLE IF NOT EXISTS teacher_feast_newsletter (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    school_name TEXT,
    subscribed_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Table: Contest configuration (start/end dates, Instagram post ID, etc.)
CREATE TABLE IF NOT EXISTS teacher_feast_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    config_key TEXT NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default configuration
INSERT INTO teacher_feast_config (config_key, config_value) VALUES
    ('contest_start', '2025-12-01T00:00:00-08:00'),
    ('contest_end', '2025-12-15T23:59:59-08:00'),
    ('winner_announcement', '2025-12-16T12:00:00-08:00'),
    ('instagram_post_id', 'PLACEHOLDER_POST_ID'),
    ('instagram_account', 'jaynagyro'),
    ('instagram_post_shortcode', 'PLACEHOLDER'),
    ('last_scraped_comment_id', '')
ON CONFLICT (config_key) DO NOTHING;

-- Function: Increment school vote count
CREATE OR REPLACE FUNCTION increment_school_votes(
    school_name_param TEXT,
    points_param INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
    -- Update total votes
    UPDATE teacher_feast_schools
    SET
        total_votes = total_votes + points_param,
        form_votes = form_votes + CASE WHEN points_param = 2 THEN 1 ELSE 0 END,
        instagram_votes = instagram_votes + CASE WHEN points_param = 1 THEN 1 ELSE 0 END,
        updated_at = NOW()
    WHERE school_name = school_name_param;

    -- If school doesn't exist, create it
    IF NOT FOUND THEN
        INSERT INTO teacher_feast_schools (school_name, total_votes, form_votes, instagram_votes)
        VALUES (
            school_name_param,
            points_param,
            CASE WHEN points_param = 2 THEN 1 ELSE 0 END,
            CASE WHEN points_param = 1 THEN 1 ELSE 0 END
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: Get current leaderboard (top 10 schools)
CREATE OR REPLACE FUNCTION get_leaderboard(limit_count INTEGER DEFAULT 5)
RETURNS TABLE (
    rank INTEGER,
    school_name TEXT,
    total_votes INTEGER,
    instagram_votes INTEGER,
    form_votes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ROW_NUMBER() OVER (ORDER BY s.total_votes DESC, s.updated_at ASC)::INTEGER as rank,
        s.school_name,
        s.total_votes,
        s.instagram_votes,
        s.form_votes
    FROM teacher_feast_schools s
    ORDER BY s.total_votes DESC, s.updated_at ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Check if vote is duplicate (prevent spam)
CREATE OR REPLACE FUNCTION is_duplicate_vote(
    email_param TEXT DEFAULT NULL,
    instagram_comment_id_param TEXT DEFAULT NULL,
    hours_window INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM teacher_feast_votes
    WHERE
        (email = email_param OR instagram_comment_id = instagram_comment_id_param)
        AND voted_at > NOW() - (hours_window || ' hours')::INTERVAL;

    RETURN duplicate_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_votes_school_name ON teacher_feast_votes(school_name);
CREATE INDEX IF NOT EXISTS idx_votes_vote_type ON teacher_feast_votes(vote_type);
CREATE INDEX IF NOT EXISTS idx_votes_voted_at ON teacher_feast_votes(voted_at DESC);
CREATE INDEX IF NOT EXISTS idx_votes_email ON teacher_feast_votes(email);
CREATE INDEX IF NOT EXISTS idx_votes_instagram_comment ON teacher_feast_votes(instagram_comment_id);
CREATE INDEX IF NOT EXISTS idx_schools_total_votes ON teacher_feast_schools(total_votes DESC);

-- Add your Sacramento area schools here
-- Example:
-- INSERT INTO teacher_feast_schools (school_name, total_votes) VALUES
--     ('John F. Kennedy High School', 0),
--     ('C.K. McClatchy High School', 0),
--     ('Sacramento High School', 0)
-- ON CONFLICT (school_name) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE teacher_feast_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_feast_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_feast_newsletter ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_feast_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (allows re-running script)
DROP POLICY IF EXISTS "Allow public read access to schools" ON teacher_feast_schools;
DROP POLICY IF EXISTS "Allow public read access to config" ON teacher_feast_config;
DROP POLICY IF EXISTS "Allow public insert to votes" ON teacher_feast_votes;
DROP POLICY IF EXISTS "Allow public read access to votes" ON teacher_feast_votes;
DROP POLICY IF EXISTS "Allow public insert to newsletter" ON teacher_feast_newsletter;

-- RLS Policies: Allow public read access
CREATE POLICY "Allow public read access to schools" ON teacher_feast_schools
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to config" ON teacher_feast_config
    FOR SELECT USING (true);

-- RLS Policies: Allow public insert for votes (with validation in application)
CREATE POLICY "Allow public insert to votes" ON teacher_feast_votes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access to votes" ON teacher_feast_votes
    FOR SELECT USING (true);

-- RLS Policies: Allow public insert for newsletter
CREATE POLICY "Allow public insert to newsletter" ON teacher_feast_newsletter
    FOR INSERT WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE teacher_feast_schools IS 'Schools participating in Jayna Gyros Great Teachers Feast contest';
COMMENT ON TABLE teacher_feast_votes IS 'Individual votes from both Instagram tags and form submissions';
COMMENT ON TABLE teacher_feast_newsletter IS 'Newsletter subscribers from contest form submissions';
COMMENT ON TABLE teacher_feast_config IS 'Contest configuration (dates, Instagram post ID, etc.)';
COMMENT ON FUNCTION increment_school_votes IS 'Increments vote count for a school (1 point for Instagram, 2 for form)';
COMMENT ON FUNCTION get_leaderboard IS 'Returns top N schools by total votes';
COMMENT ON FUNCTION is_duplicate_vote IS 'Checks if a vote is duplicate within specified time window';
