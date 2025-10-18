-- ============================================
-- MANAGER PASSWORDS TABLE
-- ============================================
-- Created: 2025-10-18
-- Purpose: Store manager passwords for FOH EDIT tab access
-- Run this in Supabase SQL Editor

-- ============================================
-- TABLE: Manager Passwords
-- ============================================
CREATE TABLE IF NOT EXISTS manager_passwords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  password_hash TEXT NOT NULL,
  role TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_by TEXT,
  updated_at TIMESTAMP
);

-- Index for fast username lookup
CREATE INDEX IF NOT EXISTS idx_manager_username ON manager_passwords(username);

-- Index for active passwords only
CREATE INDEX IF NOT EXISTS idx_manager_active ON manager_passwords(is_active) WHERE is_active = true;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Manager passwords table created successfully!';
  RAISE NOTICE 'Table: manager_passwords';
  RAISE NOTICE 'You can now create passwords in WATCHDOG tab → PASSWORDS section';
  RAISE NOTICE 'These passwords will work for accessing the EDIT tab';
END $$;
