-- Jayna Gyro Training System Database Schema
-- Execute these SQL commands in Supabase SQL Editor

-- Table: training_users
-- Stores trainee account information
CREATE TABLE IF NOT EXISTS training_users (
  username TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'Assistant Manager',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: training_progress
-- Tracks completion status for each unit (30 total: 5 modules × 6 units)
CREATE TABLE IF NOT EXISTS training_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT NOT NULL REFERENCES training_users(username) ON DELETE CASCADE,
  module_number INTEGER NOT NULL CHECK (module_number >= 1 AND module_number <= 5),
  unit_number INTEGER NOT NULL CHECK (unit_number >= 1 AND unit_number <= 6),
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(username, module_number, unit_number)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_training_progress_username ON training_progress(username);
CREATE INDEX IF NOT EXISTS idx_training_progress_module ON training_progress(module_number);

-- Enable Row Level Security (RLS) - Optional, for production
-- ALTER TABLE training_users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE training_progress ENABLE ROW LEVEL SECURITY;

-- Create policies (Optional, for production)
-- For now, we'll use service role key which bypasses RLS

-- Sample data for testing (optional)
-- INSERT INTO training_users (username, full_name, role)
-- VALUES ('heming_huang', 'Heming Huang', 'Assistant Manager');
