-- =====================================================
-- COMPREHENSIVE SCHEMA FIX - Run this once and for all!
-- Created: 2025-10-12
-- Purpose: Fix ALL schema mismatches between code and database
-- =====================================================

-- ============================================
-- PENDING_ORDERS TABLE FIXES
-- ============================================

-- Add received_date column if code needs it (currently removed from code, but adding for flexibility)
ALTER TABLE pending_orders
ADD COLUMN IF NOT EXISTS received_date DATE;

-- Ensure all expected columns exist
ALTER TABLE pending_orders
ADD COLUMN IF NOT EXISTS vendor TEXT,
ADD COLUMN IF NOT EXISTS order_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS expected_delivery_date DATE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS created_by TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS total_items INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reconciled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reconciled_by TEXT,
ADD COLUMN IF NOT EXISTS invoice_id BIGINT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================
-- INVOICE_ITEMS TABLE FIXES
-- ============================================

-- Ensure ALL learning columns exist (some may already exist from previous migration)
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS detected_item_name TEXT,
ADD COLUMN IF NOT EXISTS detected_quantity NUMERIC,
ADD COLUMN IF NOT EXISTS detected_price NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS match_confidence NUMERIC(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS matched_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- PENDING_ORDER_ITEMS TABLE FIXES
-- ============================================

-- Ensure all expected columns exist
ALTER TABLE pending_order_items
ADD COLUMN IF NOT EXISTS order_id BIGINT,
ADD COLUMN IF NOT EXISTS inventory_item_id BIGINT,
ADD COLUMN IF NOT EXISTS quantity_ordered NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS unit TEXT,
ADD COLUMN IF NOT EXISTS item_name TEXT,
ADD COLUMN IF NOT EXISTS vendor TEXT,
ADD COLUMN IF NOT EXISTS quantity_received NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS variance NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================
-- INVENTORY_ITEMS TABLE FIXES
-- ============================================

-- Ensure all columns exist (including prep-related)
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS item_name TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS unit TEXT,
ADD COLUMN IF NOT EXISTS par_level NUMERIC,
ADD COLUMN IF NOT EXISTS current_stock NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS vendor TEXT,
ADD COLUMN IF NOT EXISTS urgent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS line_cooks_prep BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS not_made_daily BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================
-- INVOICES TABLE FIXES
-- ============================================

-- Ensure all columns exist
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS vendor TEXT,
ADD COLUMN IF NOT EXISTS invoice_date DATE,
ADD COLUMN IF NOT EXISTS invoice_type TEXT,
ADD COLUMN IF NOT EXISTS pending_order_id BIGINT,
ADD COLUMN IF NOT EXISTS total_items INTEGER,
ADD COLUMN IF NOT EXISTS processed_by TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================
-- OCR_CORRECTIONS TABLE FIXES
-- ============================================

-- Ensure all columns exist (for vendor format learning)
ALTER TABLE ocr_corrections
ADD COLUMN IF NOT EXISTS format_id BIGINT,
ADD COLUMN IF NOT EXISTS invoice_id BIGINT,
ADD COLUMN IF NOT EXISTS original_text TEXT,
ADD COLUMN IF NOT EXISTS corrected_item_name TEXT,
ADD COLUMN IF NOT EXISTS corrected_quantity NUMERIC,
ADD COLUMN IF NOT EXISTS corrected_price NUMERIC,
ADD COLUMN IF NOT EXISTS full_line_text TEXT,
ADD COLUMN IF NOT EXISTS line_number INTEGER,
ADD COLUMN IF NOT EXISTS surrounding_lines TEXT,
ADD COLUMN IF NOT EXISTS matched_inventory_id BIGINT,
ADD COLUMN IF NOT EXISTS correction_type TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================
-- VENDOR_FORMATS TABLE FIXES
-- ============================================

-- Ensure all columns exist
ALTER TABLE vendor_formats
ADD COLUMN IF NOT EXISTS format_name TEXT,
ADD COLUMN IF NOT EXISTS format_id TEXT,
ADD COLUMN IF NOT EXISTS vendor_name TEXT,
ADD COLUMN IF NOT EXISTS parsing_rules JSONB,
ADD COLUMN IF NOT EXISTS sample_corrections JSONB,
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3,2),
ADD COLUMN IF NOT EXISTS times_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS successful_parses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS created_by TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================
-- INDEXES (Create if not exists)
-- ============================================

-- Pending orders indexes
CREATE INDEX IF NOT EXISTS idx_pending_orders_vendor ON pending_orders(vendor);
CREATE INDEX IF NOT EXISTS idx_pending_orders_delivery_date ON pending_orders(expected_delivery_date);
CREATE INDEX IF NOT EXISTS idx_pending_orders_status ON pending_orders(status);
CREATE INDEX IF NOT EXISTS idx_pending_orders_received_date ON pending_orders(received_date);

-- Invoice items indexes
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_inventory_id ON invoice_items(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_detected_name ON invoice_items(detected_item_name);
CREATE INDEX IF NOT EXISTS idx_invoice_items_checked_in ON invoice_items(checked_in, checked_in_at);

-- Pending order items indexes
CREATE INDEX IF NOT EXISTS idx_pending_order_items_order_id ON pending_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_pending_order_items_inventory_id ON pending_order_items(inventory_item_id);

-- Inventory items indexes
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_vendor ON inventory_items(vendor);
CREATE INDEX IF NOT EXISTS idx_inventory_items_urgent ON inventory_items(urgent) WHERE urgent = TRUE;

-- ============================================
-- FOREIGN KEY CONSTRAINTS (if they don't exist)
-- ============================================

-- Note: ALTER TABLE ADD CONSTRAINT will fail if constraint already exists
-- These are wrapped in DO blocks to handle errors gracefully

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pending_order_items_order_id_fkey') THEN
    ALTER TABLE pending_order_items
      ADD CONSTRAINT pending_order_items_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES pending_orders(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pending_order_items_inventory_item_id_fkey') THEN
    ALTER TABLE pending_order_items
      ADD CONSTRAINT pending_order_items_inventory_item_id_fkey
      FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_items_invoice_id_fkey') THEN
    ALTER TABLE invoice_items
      ADD CONSTRAINT invoice_items_invoice_id_fkey
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_items_inventory_item_id_fkey') THEN
    ALTER TABLE invoice_items
      ADD CONSTRAINT invoice_items_inventory_item_id_fkey
      FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ocr_corrections_format_id_fkey') THEN
    ALTER TABLE ocr_corrections
      ADD CONSTRAINT ocr_corrections_format_id_fkey
      FOREIGN KEY (format_id) REFERENCES vendor_formats(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ocr_corrections_invoice_id_fkey') THEN
    ALTER TABLE ocr_corrections
      ADD CONSTRAINT ocr_corrections_invoice_id_fkey
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ocr_corrections_matched_inventory_id_fkey') THEN
    ALTER TABLE ocr_corrections
      ADD CONSTRAINT ocr_corrections_matched_inventory_id_fkey
      FOREIGN KEY (matched_inventory_id) REFERENCES inventory_items(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ SCHEMA FIX COMPLETE!';
  RAISE NOTICE '📋 All tables updated with missing columns';
  RAISE NOTICE '🔗 All foreign keys ensured';
  RAISE NOTICE '📊 All indexes created';
  RAISE NOTICE '💾 Database is now in sync with code';
END $$;
