-- ============================================
-- OCR LEARNING SYSTEM - DATABASE MIGRATION
-- ============================================
-- Created: October 17, 2025
-- Purpose: Enable intelligent OCR training with user corrections
--
-- INSTRUCTIONS FOR USER:
-- 1. Open Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire file
-- 4. Click "Run" to execute
-- 5. Verify all 4 tables created successfully
-- ============================================

-- 1. TRAINING SESSIONS TABLE
-- Stores metadata about each training upload
CREATE TABLE IF NOT EXISTS ocr_training_sessions (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Vendor and document info
  vendor TEXT,
  document_type TEXT, -- 'invoice' or 'order'
  document_date DATE,

  -- OCR metadata
  image_metadata JSONB, -- {width: X, height: Y, quality: Z, fileSize: N}
  raw_ocr_text TEXT,    -- Full OCR output for reference
  ocr_confidence NUMERIC, -- Average Tesseract confidence

  -- Processing stats
  items_detected INTEGER DEFAULT 0,
  items_corrected INTEGER DEFAULT 0,
  processing_time_ms INTEGER,

  -- User tracking
  user_email TEXT,
  notes TEXT,

  -- Status
  status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned'
  completed_at TIMESTAMPTZ
);

-- Add index for quick vendor lookups
CREATE INDEX IF NOT EXISTS idx_training_sessions_vendor ON ocr_training_sessions(vendor);
CREATE INDEX IF NOT EXISTS idx_training_sessions_created ON ocr_training_sessions(created_at DESC);


-- 2. TRAINING CORRECTIONS TABLE
-- Stores each user correction for learning
CREATE TABLE IF NOT EXISTS ocr_training_corrections (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES ocr_training_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- What OCR detected (original)
  detected_name TEXT,
  detected_quantity NUMERIC,
  detected_price NUMERIC,
  detected_unit TEXT,
  detected_line_number INTEGER,
  detected_confidence NUMERIC,

  -- What user corrected to (truth)
  corrected_name TEXT,
  corrected_quantity NUMERIC,
  corrected_price NUMERIC,
  corrected_unit TEXT,
  matched_inventory_id INTEGER, -- Links to inventory_items table

  -- Learning context
  correction_type TEXT, -- 'name_only', 'quantity_only', 'price_only', 'unit_only', 'full_match', 'new_item'
  vendor TEXT,

  -- OCR line context (for pattern learning)
  raw_ocr_line TEXT,      -- The actual line from OCR
  context_before TEXT,    -- 2-3 lines before
  context_after TEXT,     -- 2-3 lines after
  line_position NUMERIC,  -- Relative position in document (0.0 - 1.0)

  -- Additional metadata
  was_auto_matched BOOLEAN DEFAULT FALSE, -- Was it auto-matched or manual?
  user_time_spent_ms INTEGER,            -- Time user spent on this correction
  metadata JSONB                          -- Any additional context
);

-- Indexes for pattern analysis
CREATE INDEX IF NOT EXISTS idx_corrections_session ON ocr_training_corrections(session_id);
CREATE INDEX IF NOT EXISTS idx_corrections_vendor ON ocr_training_corrections(vendor);
CREATE INDEX IF NOT EXISTS idx_corrections_inventory ON ocr_training_corrections(matched_inventory_id);
CREATE INDEX IF NOT EXISTS idx_corrections_type ON ocr_training_corrections(correction_type);


-- 3. LEARNED PATTERNS TABLE
-- Extracted knowledge from corrections
CREATE TABLE IF NOT EXISTS ocr_learned_patterns (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Pattern classification
  vendor TEXT,
  pattern_type TEXT, -- 'item_alias', 'quantity_format', 'price_format', 'unit_location', 'line_structure'

  -- The pattern itself
  pattern_text TEXT,        -- Human-readable pattern description
  pattern_regex TEXT,       -- Regex pattern (if applicable)
  pattern_example TEXT,     -- Example text that matches this pattern

  -- Pattern specifics (for item aliases)
  ocr_variation TEXT,       -- How OCR reads it: "Arugula 4#"
  canonical_name TEXT,      -- What it should be: "Wild Arugula 4# Case"
  inventory_item_id INTEGER, -- Links to inventory_items

  -- Statistical confidence
  times_seen INTEGER DEFAULT 1,
  times_successful INTEGER DEFAULT 1,
  times_failed INTEGER DEFAULT 0,
  confidence_score NUMERIC GENERATED ALWAYS AS (
    CASE
      WHEN times_seen > 0 THEN ROUND((times_successful::NUMERIC / times_seen::NUMERIC), 3)
      ELSE 0
    END
  ) STORED,

  -- Applicability
  applies_to_category TEXT, -- 'produce', 'dry_goods', 'meat', etc.
  requires_vendor_match BOOLEAN DEFAULT TRUE,

  -- Additional metadata
  metadata JSONB, -- {position_hints: [...], typical_context: [...], etc.}

  -- Active status
  is_active BOOLEAN DEFAULT TRUE,
  deactivated_reason TEXT,

  -- Source tracking
  learned_from_corrections INTEGER[], -- Array of correction IDs that contributed
  last_verified_at TIMESTAMPTZ
);

-- Indexes for pattern matching
CREATE INDEX IF NOT EXISTS idx_patterns_vendor ON ocr_learned_patterns(vendor) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_patterns_type ON ocr_learned_patterns(pattern_type) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_patterns_inventory ON ocr_learned_patterns(inventory_item_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON ocr_learned_patterns(confidence_score DESC) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_patterns_ocr_variation ON ocr_learned_patterns(ocr_variation) WHERE is_active = TRUE;


-- 4. VENDOR FIELD TEMPLATES TABLE
-- Learns where fields appear in vendor-specific invoices
CREATE TABLE IF NOT EXISTS ocr_vendor_templates (
  id SERIAL PRIMARY KEY,
  vendor TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Field location patterns (stored as JSONB arrays)
  quantity_patterns JSONB,
  -- Example: [{"regex": "^\\d+\\.?\\d*\\s+", "position": "before_name", "confidence": 0.85, "examples": ["12 Arugula", "2.5 Tomatoes"]}]

  price_patterns JSONB,
  -- Example: [{"regex": "\\d+\\.\\d{2}$", "position": "end_of_line", "confidence": 0.92, "examples": ["Arugula 12.50", "Tomatoes 8.99"]}]

  unit_patterns JSONB,
  -- Example: [{"regex": "\\b(CS|EA|LB)\\b", "position": "after_name", "confidence": 0.78, "examples": ["Arugula CS", "Tomatoes EA"]}]

  item_name_patterns JSONB,
  -- Example: [{"position": "center", "typical_length": [10, 40], "exclude_chars": "[]", "confidence": 0.88}]

  -- Layout characteristics
  typical_line_format TEXT, -- "QTY NAME UNIT PRICE" or "NAME QTY PRICE" etc.
  separator_characters TEXT, -- Common separators: "\t", "  ", "|", etc.
  uses_sku BOOLEAN DEFAULT FALSE,
  sku_format TEXT, -- "ALPHANUMERIC-6" or "NUMERIC-5" etc.
  sku_position TEXT, -- "before_name", "after_name", "separate_column"

  -- Multi-line item detection
  multi_line_items BOOLEAN DEFAULT FALSE,
  continuation_line_pattern TEXT, -- How to detect if a line continues the previous item

  -- Header/footer patterns
  header_keywords TEXT[], -- ["INVOICE", "ACCOUNT", "SOLD TO"]
  footer_keywords TEXT[], -- ["TOTAL", "SUBTOTAL", "THANK YOU"]

  -- Confidence metrics
  training_samples INTEGER DEFAULT 0,
  success_rate NUMERIC DEFAULT 0.0,
  last_training_date TIMESTAMPTZ,

  -- Metadata
  notes TEXT,
  example_invoice_session_id INTEGER REFERENCES ocr_training_sessions(id)
);

-- Index for vendor lookups
CREATE INDEX IF NOT EXISTS idx_vendor_templates_vendor ON ocr_vendor_templates(vendor);


-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update pattern statistics
CREATE OR REPLACE FUNCTION update_pattern_stats(
  p_pattern_id INTEGER,
  p_was_successful BOOLEAN
) RETURNS VOID AS $$
BEGIN
  UPDATE ocr_learned_patterns
  SET
    times_seen = times_seen + 1,
    times_successful = times_successful + CASE WHEN p_was_successful THEN 1 ELSE 0 END,
    times_failed = times_failed + CASE WHEN NOT p_was_successful THEN 1 ELSE 0 END,
    updated_at = NOW()
  WHERE id = p_pattern_id;
END;
$$ LANGUAGE plpgsql;


-- Function to get active patterns for a vendor
CREATE OR REPLACE FUNCTION get_vendor_patterns(p_vendor TEXT)
RETURNS TABLE (
  pattern_id INTEGER,
  pattern_type TEXT,
  pattern_regex TEXT,
  ocr_variation TEXT,
  canonical_name TEXT,
  inventory_item_id INTEGER,
  confidence NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    ocr_learned_patterns.pattern_type,
    pattern_regex,
    ocr_variation,
    canonical_name,
    inventory_item_id,
    confidence_score
  FROM ocr_learned_patterns
  WHERE
    vendor = p_vendor
    AND is_active = TRUE
    AND confidence_score >= 0.5
  ORDER BY confidence_score DESC, times_seen DESC;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- GRANTS (adjust as needed for your setup)
-- ============================================
-- These grants allow the authenticated user to access these tables
-- Adjust based on your Supabase RLS policies

-- Allow authenticated users to read/write training data
GRANT ALL ON ocr_training_sessions TO authenticated;
GRANT ALL ON ocr_training_corrections TO authenticated;
GRANT ALL ON ocr_learned_patterns TO authenticated;
GRANT ALL ON ocr_vendor_templates TO authenticated;

-- Allow the sequences to work
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;


-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify tables were created successfully:

-- Check all 4 tables exist:
SELECT
  tablename,
  schemaname
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'ocr_%'
ORDER BY tablename;

-- Should show:
-- ocr_learned_patterns
-- ocr_training_corrections
-- ocr_training_sessions
-- ocr_vendor_templates

-- Check row counts (should all be 0 initially):
SELECT
  'ocr_training_sessions' as table_name, COUNT(*) as rows FROM ocr_training_sessions
UNION ALL
SELECT
  'ocr_training_corrections', COUNT(*) FROM ocr_training_corrections
UNION ALL
SELECT
  'ocr_learned_patterns', COUNT(*) FROM ocr_learned_patterns
UNION ALL
SELECT
  'ocr_vendor_templates', COUNT(*) FROM ocr_vendor_templates;


-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Next steps:
-- 1. Verify all 4 tables created
-- 2. Test with ocr-training.html
-- 3. Upload a sample invoice
-- 4. Make corrections and verify data is stored
-- ============================================
