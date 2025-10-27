-- ============================================
-- FIX AMEX RLS POLICIES FOR ANON ACCESS
-- ============================================
-- The API uses anon key, so policies must allow anon role
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON amex_categories;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON amex_receipts;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON amex_archived_pdfs;

-- Re-enable RLS (for security best practice)
ALTER TABLE amex_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE amex_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE amex_archived_pdfs ENABLE ROW LEVEL SECURITY;

-- Create new policies that explicitly allow anon role
CREATE POLICY "Allow anon all operations" ON amex_categories
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon all operations" ON amex_receipts
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon all operations" ON amex_archived_pdfs
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Also allow authenticated users (for future flexibility)
CREATE POLICY "Allow authenticated all operations" ON amex_categories
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated all operations" ON amex_receipts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated all operations" ON amex_archived_pdfs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- VERIFY POLICIES
-- ============================================
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename IN ('amex_categories', 'amex_receipts', 'amex_archived_pdfs');
