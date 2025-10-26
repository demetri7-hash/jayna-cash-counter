-- ============================================
-- ADD BEO FIELDS TO CATERING ORDERS TABLE
-- ============================================
-- Created: October 26, 2025
-- Purpose: Add all missing fields from Toast BEO sheet
--
-- New Fields:
--   - sequential_order_number: Auto-incrementing order # (000001, 000002...)
--   - check_number: Toast check display number
--   - payment_status: OPEN, PAID, CLOSED
--   - paid_date: When payment was received
--   - subtotal: Order subtotal (before tax)
--   - tax: Tax amount
--   - tip: Tip amount
--   - delivery_fee: Delivery/service fee
--   - utensils_required: Boolean for utensils
--   - created_in_toast_at: Toast order creation timestamp

-- Add new columns
ALTER TABLE catering_orders
  ADD COLUMN IF NOT EXISTS sequential_order_number INTEGER,
  ADD COLUMN IF NOT EXISTS check_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS paid_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS tax DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS tip DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS utensils_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_in_toast_at TIMESTAMP WITH TIME ZONE;

-- Create index for sequential order number (for fast lookups)
CREATE INDEX IF NOT EXISTS idx_catering_orders_sequential_number
  ON catering_orders(sequential_order_number);

-- Create sequence for auto-incrementing sequential order numbers
-- Start at 1, will be formatted as 000001, 000002, etc. in the application
CREATE SEQUENCE IF NOT EXISTS catering_order_sequential_seq START 1;

-- Function to auto-assign sequential order number on insert
CREATE OR REPLACE FUNCTION assign_sequential_order_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Only assign if not already set
  IF NEW.sequential_order_number IS NULL THEN
    NEW.sequential_order_number = nextval('catering_order_sequential_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-assign sequential order numbers
DROP TRIGGER IF EXISTS trigger_assign_sequential_order_number ON catering_orders;
CREATE TRIGGER trigger_assign_sequential_order_number
  BEFORE INSERT ON catering_orders
  FOR EACH ROW
  EXECUTE FUNCTION assign_sequential_order_number();

-- Backfill sequential order numbers for existing orders (ordered by created_at)
DO $$
DECLARE
  order_record RECORD;
  seq_num INTEGER := 1;
BEGIN
  FOR order_record IN
    SELECT id FROM catering_orders
    WHERE sequential_order_number IS NULL
    ORDER BY created_at ASC
  LOOP
    UPDATE catering_orders
    SET sequential_order_number = seq_num
    WHERE id = order_record.id;
    seq_num := seq_num + 1;
  END LOOP;

  -- Update sequence to next available number
  PERFORM setval('catering_order_sequential_seq', seq_num);

  RAISE NOTICE '✅ Backfilled % existing orders with sequential numbers', seq_num - 1;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ BEO fields added successfully!';
  RAISE NOTICE 'New fields: sequential_order_number, check_number, payment_status, paid_date, subtotal, tax, tip, delivery_fee, utensils_required, created_in_toast_at';
END $$;
