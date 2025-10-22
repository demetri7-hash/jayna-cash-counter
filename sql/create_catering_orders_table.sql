-- ============================================
-- CATERING ORDERS TABLE
-- ============================================
-- Created: October 22, 2025
-- Purpose: Store all catering orders from Toast and EZCater
-- Features:
--   - Unified storage for multiple sources (Toast, EZCater)
--   - Full customer and delivery information
--   - JSONB for complete order data (allows future modal editing)
--   - Automatic timestamps
--   - Unique constraint on source + external order ID

CREATE TABLE IF NOT EXISTS catering_orders (
  -- Primary key
  id BIGSERIAL PRIMARY KEY,

  -- Source identification (Toast or EZCater)
  source_system VARCHAR(50) NOT NULL, -- 'TOAST' or 'EZCATER'
  source_type VARCHAR(100), -- 'Catering', 'Invoice', 'Catering Online Ordering'
  external_order_id VARCHAR(255) NOT NULL, -- Toast GUID or EZCater order ID
  order_number VARCHAR(100), -- Display number

  -- Customer information
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),

  -- Delivery information
  delivery_date DATE,
  delivery_time TIMESTAMP WITH TIME ZONE,
  delivery_address TEXT,
  delivery_notes TEXT,

  -- Order details
  headcount INTEGER,
  total_amount DECIMAL(10, 2),
  business_date INTEGER, -- Toast business date format (yyyymmdd)

  -- Status
  status VARCHAR(50), -- 'pending', 'confirmed', 'in_progress', 'delivered', 'cancelled'

  -- Full order data (JSONB for flexibility)
  order_data JSONB NOT NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: one order per source system + external ID
  CONSTRAINT unique_order_per_source UNIQUE (source_system, external_order_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_catering_orders_delivery_date ON catering_orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_catering_orders_source_system ON catering_orders(source_system);
CREATE INDEX IF NOT EXISTS idx_catering_orders_status ON catering_orders(status);
CREATE INDEX IF NOT EXISTS idx_catering_orders_business_date ON catering_orders(business_date);
CREATE INDEX IF NOT EXISTS idx_catering_orders_external_id ON catering_orders(external_order_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_catering_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_catering_orders_updated_at
  BEFORE UPDATE ON catering_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_catering_orders_updated_at();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Catering orders table created successfully!';
  RAISE NOTICE 'Ready to store orders from Toast and EZCater.';
END $$;
