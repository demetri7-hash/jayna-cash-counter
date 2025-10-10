-- OCR Corrections Tracking Table
-- Tracks user corrections to OCR extractions for machine learning
-- Created: 2025-10-09

CREATE TABLE ocr_corrections (
  id BIGSERIAL PRIMARY KEY,
  invoice_id BIGINT REFERENCES invoices(id) ON DELETE CASCADE,

  -- Which field was corrected
  field_name TEXT NOT NULL CHECK (field_name IN (
    'vendor_name', 'invoice_number', 'invoice_date', 'total_amount',
    'line_item_description', 'line_item_quantity', 'line_item_unit',
    'line_item_unit_price', 'line_item_total'
  )),

  -- Line item reference (NULL for invoice-level fields)
  line_item_index INTEGER,

  -- What OCR extracted vs what user corrected to
  ocr_value TEXT,           -- Raw OCR extraction
  corrected_value TEXT,     -- User's correction

  -- Context for learning
  vendor_name TEXT,         -- Which vendor's invoice
  page_text TEXT,           -- Surrounding OCR text for context
  confidence_score NUMERIC, -- OCR confidence (0-1) if available

  -- Metadata
  corrected_by TEXT,
  correction_type TEXT CHECK (correction_type IN (
    'wrong_extraction',     -- OCR extracted wrong text
    'missing_extraction',   -- OCR missed the field entirely
    'format_issue',         -- Extracted but wrong format
    'math_correction'       -- User fixed qty/price math
  )),

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for analysis
CREATE INDEX idx_ocr_corrections_invoice ON ocr_corrections(invoice_id);
CREATE INDEX idx_ocr_corrections_field ON ocr_corrections(field_name);
CREATE INDEX idx_ocr_corrections_vendor ON ocr_corrections(vendor_name);
CREATE INDEX idx_ocr_corrections_date ON ocr_corrections(created_at);

-- Disable RLS for app access
ALTER TABLE ocr_corrections DISABLE ROW LEVEL SECURITY;

-- View for analyzing common OCR issues by vendor
CREATE VIEW ocr_accuracy_by_vendor AS
SELECT
  vendor_name,
  field_name,
  correction_type,
  COUNT(*) as correction_count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY vendor_name) as percentage
FROM ocr_corrections
GROUP BY vendor_name, field_name, correction_type
ORDER BY vendor_name, correction_count DESC;

-- View for recent corrections (learning queue)
CREATE VIEW recent_ocr_corrections AS
SELECT
  oc.*,
  i.invoice_date,
  i.invoice_number
FROM ocr_corrections oc
JOIN invoices i ON oc.invoice_id = i.id
WHERE oc.created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY oc.created_at DESC;

-- ============================================================================
-- NOTES FOR IMPLEMENTATION
-- ============================================================================

-- Usage: Track corrections when user edits extracted data
-- Example: User changes qty from 10 to 4 on Greenleaf invoice
-- INSERT INTO ocr_corrections (
--   invoice_id, field_name, line_item_index, ocr_value, corrected_value,
--   vendor_name, correction_type
-- ) VALUES (
--   123, 'line_item_quantity', 0, '10', '4',
--   'Greenleaf', 'wrong_extraction'
-- );

-- Future: Use this data to:
-- 1. Train custom OCR models per vendor
-- 2. Auto-apply corrections for known patterns
-- 3. Alert when low confidence on frequently corrected fields
-- 4. Generate vendor-specific extraction rules
