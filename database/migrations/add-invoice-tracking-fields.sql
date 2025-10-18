-- ============================================
-- ADD INVOICE TRACKING FIELDS
-- ============================================
-- Created: October 18, 2025
-- Purpose: Track when inventory was added via invoice receiving
--
-- USER REQUIREMENT:
-- "When I receive an invoice through OCR, show in COUNTS tab:
--  '6 ADDED VIA INVOICE ON Oct 18, 2025 3:30 PM'
--  Update last_counted timestamp when inventory updated via invoice"
--
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard SQL Editor
-- 2. Copy and paste this entire file
-- 3. Click "Run"
-- ============================================

-- Add invoice tracking fields to inventory_items table
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS last_invoice_qty NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_invoice_date TIMESTAMPTZ DEFAULT NULL;

-- Add helpful comments
COMMENT ON COLUMN inventory_items.last_invoice_qty IS 'Quantity added from the most recent invoice receiving';
COMMENT ON COLUMN inventory_items.last_invoice_date IS 'Timestamp when the most recent invoice was received via OCR';

-- ============================================
-- VERIFICATION
-- ============================================
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'inventory_items'
  AND column_name IN ('current_stock', 'last_counted_date', 'last_invoice_qty', 'last_invoice_date')
ORDER BY column_name;

-- Should show:
-- current_stock        | numeric | YES | 0.00
-- last_counted_date    | timestamptz | YES | NULL
-- last_invoice_date    | timestamptz | YES | NULL (NEW)
-- last_invoice_qty     | numeric | YES | NULL (NEW)

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Next steps:
-- 1. Update RECEIVE tab to set these fields when processing invoices
-- 2. Update COUNTS tab to display: "X ADDED VIA INVOICE ON [DATE]"
-- ============================================
