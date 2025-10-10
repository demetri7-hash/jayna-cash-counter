-- ============================================
-- ADD UPC AND COST TRACKING TO INVENTORY ITEMS
-- ============================================

-- Add new columns to inventory_items table
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS upc TEXT,
ADD COLUMN IF NOT EXISTS current_unit_cost DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS last_cost_update DATE;

-- Create index on UPC for lookups
CREATE INDEX IF NOT EXISTS idx_inventory_items_upc ON inventory_items(upc);

-- ============================================
-- ITEM COST HISTORY TABLE
-- Track price changes over time
-- ============================================

CREATE TABLE IF NOT EXISTS item_cost_history (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  vendor TEXT NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  invoice_date DATE,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for cost history queries
CREATE INDEX IF NOT EXISTS idx_item_cost_history_item_id ON item_cost_history(item_id);
CREATE INDEX IF NOT EXISTS idx_item_cost_history_effective_date ON item_cost_history(effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_item_cost_history_vendor ON item_cost_history(vendor);

-- RLS policies for cost history
ALTER TABLE item_cost_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to item cost history"
  ON item_cost_history FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to item cost history"
  ON item_cost_history FOR INSERT
  WITH CHECK (true);

-- ============================================
-- ITEM ORDER HISTORY TABLE
-- Track every time an item is ordered
-- ============================================

CREATE TABLE IF NOT EXISTS item_order_history (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  order_log_id BIGINT REFERENCES order_log(id) ON DELETE SET NULL,
  order_date DATE NOT NULL,
  vendor TEXT NOT NULL,

  -- Order details
  quantity_ordered INTEGER NOT NULL,
  unit TEXT,

  -- Stock levels at time of order
  stock_at_order INTEGER,
  par_at_order INTEGER,

  -- AI reasoning
  ai_calculation_method TEXT,
  ai_reasoning JSONB,
  consumption_trend TEXT,
  days_until_next_delivery INTEGER,

  -- Order metadata
  was_auto_generated BOOLEAN DEFAULT false,
  was_manually_adjusted BOOLEAN DEFAULT false,
  adjustment_notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for order history queries
CREATE INDEX IF NOT EXISTS idx_item_order_history_item_id ON item_order_history(item_id);
CREATE INDEX IF NOT EXISTS idx_item_order_history_order_date ON item_order_history(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_item_order_history_vendor ON item_order_history(vendor);
CREATE INDEX IF NOT EXISTS idx_item_order_history_order_log_id ON item_order_history(order_log_id);

-- RLS policies for order history
ALTER TABLE item_order_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to item order history"
  ON item_order_history FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to item order history"
  ON item_order_history FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to item order history"
  ON item_order_history FOR UPDATE
  USING (true);

-- ============================================
-- HELPER FUNCTION: Get Latest Cost for Item
-- ============================================

CREATE OR REPLACE FUNCTION get_latest_cost(p_item_id BIGINT)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
AS $$
DECLARE
  v_cost DECIMAL(10,2);
BEGIN
  SELECT unit_cost INTO v_cost
  FROM item_cost_history
  WHERE item_id = p_item_id
  ORDER BY effective_date DESC, created_at DESC
  LIMIT 1;

  RETURN COALESCE(v_cost, 0);
END;
$$;

-- ============================================
-- HELPER FUNCTION: Get Cost Trend for Item
-- ============================================

CREATE OR REPLACE FUNCTION get_cost_trend(p_item_id BIGINT, p_days INTEGER DEFAULT 90)
RETURNS TABLE (
  avg_cost DECIMAL(10,2),
  min_cost DECIMAL(10,2),
  max_cost DECIMAL(10,2),
  cost_change_pct DECIMAL(5,2)
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH cost_data AS (
    SELECT
      unit_cost,
      effective_date,
      ROW_NUMBER() OVER (ORDER BY effective_date DESC) as rn
    FROM item_cost_history
    WHERE item_id = p_item_id
      AND effective_date >= CURRENT_DATE - p_days
  ),
  stats AS (
    SELECT
      AVG(unit_cost) as avg_cost,
      MIN(unit_cost) as min_cost,
      MAX(unit_cost) as max_cost,
      (SELECT unit_cost FROM cost_data WHERE rn = 1) as latest_cost,
      (SELECT unit_cost FROM cost_data ORDER BY rn DESC LIMIT 1) as oldest_cost
    FROM cost_data
  )
  SELECT
    avg_cost::DECIMAL(10,2),
    min_cost::DECIMAL(10,2),
    max_cost::DECIMAL(10,2),
    CASE
      WHEN oldest_cost > 0
      THEN ((latest_cost - oldest_cost) / oldest_cost * 100)::DECIMAL(5,2)
      ELSE 0
    END as cost_change_pct
  FROM stats;
END;
$$;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE item_cost_history IS 'Tracks historical unit costs for inventory items from invoices';
COMMENT ON TABLE item_order_history IS 'Tracks every order placed for each item including AI reasoning and stock levels';
COMMENT ON COLUMN item_order_history.ai_reasoning IS 'JSONB containing AI calculation details (avgDailyConsumption, safetyBuffer, trendAdjustment, etc.)';
COMMENT ON COLUMN item_order_history.was_manually_adjusted IS 'True if manager modified AI-suggested quantity before ordering';
