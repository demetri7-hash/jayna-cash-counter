-- =====================================================
-- AUTOMATED ORDERING SYSTEM - DATABASE TABLES
-- Created: 2025-10-10
-- Purpose: Enable intelligent automated ordering with historical analysis
-- =====================================================

-- 1. INVENTORY_HISTORY - Track stock count changes over time
-- Purpose: Historical consumption analysis for predictive algorithms
CREATE TABLE IF NOT EXISTS inventory_history (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  opening_stock INTEGER NOT NULL,
  closing_stock INTEGER NOT NULL,
  received INTEGER DEFAULT 0,
  waste INTEGER DEFAULT 0,
  consumption_calculated INTEGER GENERATED ALWAYS AS
    (opening_stock + received - waste - closing_stock) STORED,
  counted_by TEXT,
  counted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  UNIQUE(item_id, date)
);

CREATE INDEX idx_inventory_history_item_date ON inventory_history(item_id, date DESC);
CREATE INDEX idx_inventory_history_date ON inventory_history(date DESC);

-- 2. ORDER_LOG - Track all automated orders
-- Purpose: Audit trail, vendor performance tracking, order confirmation
CREATE TABLE IF NOT EXISTS order_log (
  id BIGSERIAL PRIMARY KEY,
  order_date DATE NOT NULL,
  vendor TEXT NOT NULL,
  order_items JSONB NOT NULL,
  total_items INTEGER NOT NULL,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  email_status TEXT CHECK (email_status IN ('pending', 'sent', 'failed', 'bounced')),
  delivery_date DATE,
  delivery_confirmed BOOLEAN DEFAULT FALSE,
  delivery_confirmed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_order_log_vendor ON order_log(vendor, order_date DESC);
CREATE INDEX idx_order_log_date ON order_log(order_date DESC);
CREATE INDEX idx_order_log_delivery ON order_log(delivery_date);

-- 3. PAR_LEVEL_ADJUSTMENTS - Track AI-suggested par changes
-- Purpose: Manager review and approval of AI suggestions
CREATE TABLE IF NOT EXISTS par_level_adjustments (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  suggested_date DATE NOT NULL,
  current_par INTEGER NOT NULL,
  suggested_par INTEGER NOT NULL,
  reason TEXT NOT NULL,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_par_adjustments_item ON par_level_adjustments(item_id, suggested_date DESC);
CREATE INDEX idx_par_adjustments_status ON par_level_adjustments(status, suggested_date DESC);

-- 4. INVENTORY_ALERTS - System-generated alerts
-- Purpose: Dashboard for reviewing inventory issues
CREATE TABLE IF NOT EXISTS inventory_alerts (
  id BIGSERIAL PRIMARY KEY,
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'stockout', 'low_stock', 'high_variability', 'unused_item',
    'missing_data', 'overstock', 'vendor_issue', 'cost_anomaly'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  item_id BIGINT REFERENCES inventory_items(id) ON DELETE CASCADE,
  vendor TEXT,
  message TEXT NOT NULL,
  details JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_inventory_alerts_unresolved ON inventory_alerts(resolved, severity, created_at DESC);
CREATE INDEX idx_inventory_alerts_item ON inventory_alerts(item_id, created_at DESC);
CREATE INDEX idx_inventory_alerts_type ON inventory_alerts(alert_type, created_at DESC);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE inventory_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE par_level_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Allow authenticated users to read/write)
CREATE POLICY "Enable all access for authenticated users" ON inventory_history
  FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable all access for authenticated users" ON order_log
  FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable all access for authenticated users" ON par_level_adjustments
  FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable all access for authenticated users" ON inventory_alerts
  FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- =====================================================
-- SEED DATA (Optional - for testing)
-- =====================================================

-- Insert comment for reference
COMMENT ON TABLE inventory_history IS 'Tracks daily stock counts for consumption analysis and predictive ordering';
COMMENT ON TABLE order_log IS 'Audit trail of all automated orders sent to vendors';
COMMENT ON TABLE par_level_adjustments IS 'AI-suggested par level changes awaiting manager approval';
COMMENT ON TABLE inventory_alerts IS 'System-generated alerts for inventory issues';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Automated ordering tables created successfully!';
  RAISE NOTICE '📊 Tables: inventory_history, order_log, par_level_adjustments, inventory_alerts';
  RAISE NOTICE '🔐 RLS enabled on all tables';
END $$;
