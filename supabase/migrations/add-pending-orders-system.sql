-- =====================================================
-- ADD PENDING ORDERS SYSTEM
-- Created: 2025-10-11
-- Purpose: Track orders placed with vendors and reconcile on delivery day
-- =====================================================

-- ============================================
-- PENDING ORDERS TABLE
-- Tracks orders placed with vendors
-- ============================================

CREATE TABLE IF NOT EXISTS pending_orders (
  id BIGSERIAL PRIMARY KEY,
  vendor TEXT NOT NULL,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending, delivered, partial, cancelled

  -- Metadata
  created_by TEXT,
  notes TEXT,
  total_items INTEGER DEFAULT 0,

  -- Reconciliation tracking
  reconciled BOOLEAN DEFAULT false,
  reconciled_at TIMESTAMP WITH TIME ZONE,
  reconciled_by TEXT,
  invoice_id BIGINT,  -- Link to invoice used for reconciliation

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PENDING ORDER ITEMS TABLE
-- Line items for each pending order
-- ============================================

CREATE TABLE IF NOT EXISTS pending_order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES pending_orders(id) ON DELETE CASCADE,
  inventory_item_id BIGINT REFERENCES inventory_items(id) ON DELETE SET NULL,

  -- Ordered quantities
  quantity_ordered NUMERIC(10,2) NOT NULL,
  unit TEXT,

  -- Item details (snapshot at time of order)
  item_name TEXT NOT NULL,
  vendor TEXT,

  -- Reconciliation (filled in on delivery)
  quantity_received NUMERIC(10,2),
  variance NUMERIC(10,2),  -- received - ordered

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_pending_orders_vendor ON pending_orders(vendor);
CREATE INDEX IF NOT EXISTS idx_pending_orders_delivery_date ON pending_orders(expected_delivery_date);
CREATE INDEX IF NOT EXISTS idx_pending_orders_status ON pending_orders(status);
CREATE INDEX IF NOT EXISTS idx_pending_orders_created_at ON pending_orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pending_order_items_order_id ON pending_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_pending_order_items_inventory_id ON pending_order_items(inventory_item_id);

-- ============================================
-- ADD FOREIGN KEY TO INVOICES
-- Link invoices to pending orders for reconciliation
-- ============================================

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS pending_order_id BIGINT REFERENCES pending_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_pending_order_id ON invoices(pending_order_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE pending_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to pending orders"
  ON pending_orders FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to pending orders"
  ON pending_orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to pending orders"
  ON pending_orders FOR UPDATE
  USING (true);

CREATE POLICY "Allow public read access to pending order items"
  ON pending_order_items FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to pending order items"
  ON pending_order_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to pending order items"
  ON pending_order_items FOR UPDATE
  USING (true);

-- ============================================
-- HELPER FUNCTION: Get Orders Due Today
-- ============================================

CREATE OR REPLACE FUNCTION get_orders_due_today()
RETURNS TABLE (
  order_id BIGINT,
  vendor TEXT,
  total_items INTEGER,
  expected_delivery_date DATE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    pending_orders.vendor,
    pending_orders.total_items,
    pending_orders.expected_delivery_date
  FROM pending_orders
  WHERE expected_delivery_date = CURRENT_DATE
    AND status = 'pending'
  ORDER BY vendor;
END;
$$;

-- ============================================
-- HELPER FUNCTION: Get Upcoming Orders
-- ============================================

CREATE OR REPLACE FUNCTION get_upcoming_orders(p_days INTEGER DEFAULT 7)
RETURNS TABLE (
  order_id BIGINT,
  vendor TEXT,
  total_items INTEGER,
  expected_delivery_date DATE,
  days_until_delivery INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    pending_orders.vendor,
    pending_orders.total_items,
    pending_orders.expected_delivery_date,
    (pending_orders.expected_delivery_date - CURRENT_DATE)::INTEGER as days_until_delivery
  FROM pending_orders
  WHERE expected_delivery_date BETWEEN CURRENT_DATE AND CURRENT_DATE + p_days
    AND status = 'pending'
  ORDER BY expected_delivery_date, vendor;
END;
$$;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Pending orders system created successfully!';
  RAISE NOTICE '📦 Tables: pending_orders, pending_order_items';
  RAISE NOTICE '🔗 Added pending_order_id to invoices table';
  RAISE NOTICE '🔍 Helper functions: get_orders_due_today(), get_upcoming_orders()';
END $$;
