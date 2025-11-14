-- ============================================
-- ADD DISCOUNT AND SERVICE CHARGE FIELDS
-- ============================================
-- Created: November 13, 2025
-- Purpose: Add discount and service charge tracking to catering orders
--
-- New Fields:
--   - discount_amount: Total discounts applied to order
--   - service_charge_amount: Total service charges applied to order

-- Add new columns
ALTER TABLE catering_orders
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_charge_amount DECIMAL(10, 2) DEFAULT 0;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Discount and service charge fields added successfully!';
  RAISE NOTICE 'New fields: discount_amount, service_charge_amount';
END $$;
