-- Create app_settings table for storing application-level settings
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS app_settings (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on key for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- Insert default setting for digital checklists (enabled by default)
INSERT INTO app_settings (key, value, updated_at, created_at)
VALUES ('digital_checklists_enabled', true, NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- Add comment to table
COMMENT ON TABLE app_settings IS 'Application-level settings for Jayna Cash Counter';
COMMENT ON COLUMN app_settings.key IS 'Unique setting identifier (e.g., digital_checklists_enabled)';
COMMENT ON COLUMN app_settings.value IS 'Boolean setting value (true = enabled, false = disabled)';
COMMENT ON COLUMN app_settings.updated_at IS 'Last time this setting was modified';
COMMENT ON COLUMN app_settings.created_at IS 'When this setting was first created';
