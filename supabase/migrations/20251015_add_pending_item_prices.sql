ALTER TABLE pending_order_items
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS receiving_notes TEXT;


