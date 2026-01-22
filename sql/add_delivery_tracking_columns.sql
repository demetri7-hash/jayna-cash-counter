-- Add delivery tracking columns to catering_orders table
-- Run this in Supabase SQL Editor

ALTER TABLE catering_orders 
ADD COLUMN IF NOT EXISTS delivery_id TEXT,
ADD COLUMN IF NOT EXISTS courier_name TEXT,
ADD COLUMN IF NOT EXISTS courier_phone TEXT,
ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS delivery_tracking_events JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS proof_of_delivery_url TEXT,
ADD COLUMN IF NOT EXISTS auto_tracking_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_auto_update_at TIMESTAMPTZ;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_catering_orders_delivery_id ON catering_orders(delivery_id);
CREATE INDEX IF NOT EXISTS idx_catering_orders_delivery_status ON catering_orders(delivery_status);
CREATE INDEX IF NOT EXISTS idx_catering_orders_auto_tracking ON catering_orders(auto_tracking_enabled) WHERE auto_tracking_enabled = true;

-- Add comment explaining the automation
COMMENT ON COLUMN catering_orders.auto_tracking_enabled IS 'When true, system auto-updates delivery status based on delivery_time';
COMMENT ON COLUMN catering_orders.delivery_status IS 'Status: pending, assigned, picked_up, in_transit, delivered, cancelled';
COMMENT ON COLUMN catering_orders.delivery_tracking_events IS 'Array of tracking events: [{timestamp, status, auto: true/false, courier}]';
