-- ============================================
-- EZCATER ORDERS CACHE TABLE
-- ============================================
-- Created: October 21, 2025
-- Purpose: Cache EZCater orders locally for querying by date range
-- Why: EZCater API is webhook-driven, no bulk query by date

-- ============================================
-- DROP EXISTING (if recreating)
-- ============================================
-- DROP TABLE IF EXISTS ezcater_orders CASCADE;

-- ============================================
-- CREATE ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ezcater_orders (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- EZCater IDs
  ezcater_order_id TEXT UNIQUE NOT NULL,  -- EZCater's order ID
  order_number TEXT,                       -- Display order number

  -- Customer Information
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_company TEXT,

  -- Delivery Information
  delivery_date DATE NOT NULL,
  delivery_time TIME,
  delivery_address_street TEXT,
  delivery_address_city TEXT,
  delivery_address_state TEXT,
  delivery_address_zip TEXT,
  delivery_instructions TEXT,

  -- Order Details
  headcount INTEGER,
  event_type TEXT,                         -- e.g., "Meeting", "Lunch", etc.
  special_instructions TEXT,

  -- Financial Information
  subtotal DECIMAL(10,2),
  tax DECIMAL(10,2),
  tip DECIMAL(10,2),
  delivery_fee DECIMAL(10,2),
  service_fee DECIMAL(10,2),
  total DECIMAL(10,2) NOT NULL,

  -- Status
  status TEXT DEFAULT 'pending',           -- pending, confirmed, in_progress, delivered, cancelled

  -- Full Order Data (for details view)
  order_data JSONB,                        -- Full order object from EZCater API

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_synced_at TIMESTAMP,                -- Last time we fetched from EZCater API

  -- Indexes for fast querying
  CONSTRAINT valid_delivery_date CHECK (delivery_date >= CURRENT_DATE - INTERVAL '1 year')
);

-- ============================================
-- CREATE INDEXES
-- ============================================
-- Index for date range queries (most common query)
CREATE INDEX IF NOT EXISTS idx_ezcater_orders_delivery_date
ON ezcater_orders(delivery_date DESC);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_ezcater_orders_status
ON ezcater_orders(status);

-- Index for EZCater order ID lookups
CREATE INDEX IF NOT EXISTS idx_ezcater_orders_ezcater_id
ON ezcater_orders(ezcater_order_id);

-- Index for customer searches
CREATE INDEX IF NOT EXISTS idx_ezcater_orders_customer_name
ON ezcater_orders(customer_name);

-- Composite index for upcoming orders query
-- Note: Can't use CURRENT_DATE in predicate (not immutable)
CREATE INDEX IF NOT EXISTS idx_ezcater_orders_upcoming
ON ezcater_orders(delivery_date, status);

-- ============================================
-- CREATE UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_ezcater_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ezcater_orders_updated_at
BEFORE UPDATE ON ezcater_orders
FOR EACH ROW
EXECUTE FUNCTION update_ezcater_orders_updated_at();

-- ============================================
-- ENABLE ROW LEVEL SECURITY (Optional)
-- ============================================
-- Uncomment if you want to restrict access
-- ALTER TABLE ezcater_orders ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Allow all operations for authenticated users"
-- ON ezcater_orders
-- FOR ALL
-- TO authenticated
-- USING (true)
-- WITH CHECK (true);

-- ============================================
-- VERIFICATION QUERY
-- ============================================
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'ezcater_orders'
ORDER BY ordinal_position;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ ezcater_orders table created successfully!';
  RAISE NOTICE 'Table stores cached orders from EZCater webhooks.';
  RAISE NOTICE 'Indexed for fast date range and status queries.';
END $$;
