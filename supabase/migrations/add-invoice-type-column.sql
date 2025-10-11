-- =====================================================
-- ADD INVOICE_TYPE COLUMN TO INVOICES TABLE
-- Created: 2025-10-11
-- Purpose: Distinguish between 'invoice' (reconciliation) and 'order' (order placement)
-- =====================================================

-- Add invoice_type column
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'invoice';

-- Add index for filtering by type
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(invoice_type);

-- Add check constraint to ensure only valid types
ALTER TABLE invoices
  ADD CONSTRAINT invoice_type_check
  CHECK (invoice_type IN ('invoice', 'order'));

-- Add processed_by column if it doesn't exist (code uses this field)
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS processed_by TEXT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ invoice_type column added to invoices table';
  RAISE NOTICE '📋 Valid values: ''invoice'' (reconciliation) or ''order'' (order placement)';
  RAISE NOTICE '🔧 Also added processed_by column for tracking';
END $$;
