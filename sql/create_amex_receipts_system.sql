-- ============================================
-- AMEX RECEIPTS SYSTEM - DATABASE SETUP
-- ============================================
-- Purpose: Track AMEX card purchases with receipt photos
-- Card: 1100, Demetri Gregorakis, Jayna One Inc
-- ============================================

-- STEP 1: Create amex_categories table
CREATE TABLE IF NOT EXISTS amex_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories (ALL CAPS)
INSERT INTO amex_categories (name) VALUES
  ('FOH'),
  ('BOH'),
  ('FOOD'),
  ('REPAIRS/MAINTENANCE'),
  ('MISC')
ON CONFLICT (name) DO NOTHING;

-- STEP 2: Create amex_receipts table (individual entries before approval)
CREATE TABLE IF NOT EXISTS amex_receipts (
  id SERIAL PRIMARY KEY,
  purchase_date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category TEXT NOT NULL,
  details TEXT,
  image_urls TEXT[], -- Array of image URLs from Supabase Storage
  date_added TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT DEFAULT 'Demetri Gregorakis',
  card_last_four TEXT DEFAULT '1100',
  is_approved BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by TEXT
);

-- STEP 3: Create amex_archived_pdfs table (PDFs after Yusuf approves)
CREATE TABLE IF NOT EXISTS amex_archived_pdfs (
  id SERIAL PRIMARY KEY,
  archive_date DATE NOT NULL,
  pdf_url TEXT NOT NULL, -- URL to PDF in Supabase Storage
  entry_count INTEGER NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  date_range_start DATE,
  date_range_end DATE,
  approved_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  emailed_at TIMESTAMP WITH TIME ZONE,
  receipt_ids INTEGER[] -- Array of original receipt IDs that were archived
);

-- STEP 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_amex_receipts_purchase_date ON amex_receipts(purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_amex_receipts_category ON amex_receipts(category);
CREATE INDEX IF NOT EXISTS idx_amex_receipts_is_approved ON amex_receipts(is_approved);
CREATE INDEX IF NOT EXISTS idx_amex_archived_pdfs_archive_date ON amex_archived_pdfs(archive_date DESC);

-- STEP 5: Enable Row Level Security (RLS)
ALTER TABLE amex_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE amex_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE amex_archived_pdfs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write (adjust based on your auth setup)
CREATE POLICY "Allow all operations for authenticated users" ON amex_categories
  FOR ALL USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON amex_receipts
  FOR ALL USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON amex_archived_pdfs
  FOR ALL USING (true);

-- ============================================
-- SUPABASE STORAGE BUCKETS
-- ============================================
-- Create these buckets in Supabase Dashboard → Storage:
-- 1. amex-receipt-images (public, 1MB max file size)
-- 2. amex-archived-pdfs (public, 10MB max file size)
-- ============================================

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'AMEX Receipts System tables created successfully!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Create Supabase Storage buckets: amex-receipt-images, amex-archived-pdfs';
  RAISE NOTICE '2. Deploy API endpoints for image processing and PDF generation';
  RAISE NOTICE '3. Add AMEX Receipts tab to manager.html';
END $$;
