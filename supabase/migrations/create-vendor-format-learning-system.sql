-- =====================================================
-- VENDOR FORMAT LEARNING SYSTEM
-- Created: 2025-10-12
-- Purpose: Learn vendor invoice formats from user corrections
-- =====================================================

-- ============================================
-- VENDOR_FORMATS TABLE
-- Stores custom vendor invoice formats learned from user corrections
-- ============================================

CREATE TABLE IF NOT EXISTS vendor_formats (
  id BIGSERIAL PRIMARY KEY,
  format_name TEXT NOT NULL UNIQUE, -- e.g., "Greenleaf Order", "Sysco Invoice"
  format_id TEXT NOT NULL UNIQUE,   -- e.g., "greenleaf-order", "sysco-invoice"
  vendor_name TEXT,                  -- Associated vendor (optional)

  -- Pattern learning data
  parsing_rules JSONB,               -- Regex patterns, field positions, delimiters
  sample_corrections JSONB,          -- Array of {original: ..., corrected: ...} examples
  confidence_score NUMERIC(3,2),     -- 0.0-1.0 based on number of successful uses

  -- Usage tracking
  times_used INTEGER DEFAULT 0,
  successful_parses INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_by TEXT,
  notes TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- OCR_CORRECTIONS TABLE
-- Tracks every manual correction for learning
-- ============================================

CREATE TABLE IF NOT EXISTS ocr_corrections (
  id BIGSERIAL PRIMARY KEY,
  format_id BIGINT REFERENCES vendor_formats(id) ON DELETE CASCADE,
  invoice_id BIGINT REFERENCES invoices(id) ON DELETE SET NULL,

  -- OCR extraction vs correction
  original_text TEXT NOT NULL,           -- What OCR extracted
  corrected_item_name TEXT,              -- What user corrected to
  corrected_quantity NUMERIC,            -- Corrected quantity
  corrected_price NUMERIC,               -- Corrected price

  -- Context for pattern learning
  full_line_text TEXT,                   -- Full line from OCR
  line_number INTEGER,                   -- Position in document
  surrounding_lines TEXT,                -- Lines before/after for context

  -- Matching metadata
  matched_inventory_id BIGINT REFERENCES inventory_items(id) ON DELETE SET NULL,
  correction_type TEXT CHECK (correction_type IN ('item_name', 'quantity', 'price', 'all')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_vendor_formats_active ON vendor_formats(active, format_id);
CREATE INDEX IF NOT EXISTS idx_vendor_formats_vendor ON vendor_formats(vendor_name);
CREATE INDEX IF NOT EXISTS idx_vendor_formats_confidence ON vendor_formats(confidence_score DESC);

CREATE INDEX IF NOT EXISTS idx_ocr_corrections_format ON ocr_corrections(format_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ocr_corrections_invoice ON ocr_corrections(invoice_id);
CREATE INDEX IF NOT EXISTS idx_ocr_corrections_type ON ocr_corrections(correction_type);

-- ============================================
-- HELPER FUNCTION: Update format confidence
-- ============================================

CREATE OR REPLACE FUNCTION update_format_confidence(p_format_id BIGINT, p_success BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE vendor_formats
  SET
    times_used = times_used + 1,
    successful_parses = successful_parses + CASE WHEN p_success THEN 1 ELSE 0 END,
    confidence_score = (successful_parses + CASE WHEN p_success THEN 1 ELSE 0 END)::NUMERIC / (times_used + 1),
    last_used_at = NOW(),
    updated_at = NOW()
  WHERE id = p_format_id;
END;
$$;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE vendor_formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to vendor formats"
  ON vendor_formats FOR ALL
  USING (true);

CREATE POLICY "Allow public access to ocr corrections"
  ON ocr_corrections FOR ALL
  USING (true);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Vendor format learning system created!';
  RAISE NOTICE '📊 Tables: vendor_formats, ocr_corrections';
  RAISE NOTICE '🧠 System will learn from every manual correction';
END $$;
