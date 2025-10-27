-- ============================================
-- ADD 9 TEST ENTRIES TO AMEX RECEIPTS
-- ============================================
-- Run this after creating the amex_receipts table
-- ============================================

INSERT INTO amex_receipts (purchase_date, amount, category, details, image_urls) VALUES
  ('2025-10-26', 245.67, 'FOH', 'Restaurant Depot - Paper supplies, takeout containers, napkins', '{}'),
  ('2025-10-25', 89.32, 'BOH', 'Chef Store - Kitchen towels, gloves, cleaning supplies', '{}'),
  ('2025-10-24', 1250.00, 'FOOD', 'Sysco delivery - Gyro meat, chicken, pita bread, vegetables', '{}'),
  ('2025-10-23', 45.99, 'FOH', 'Office Depot - Receipt paper, printer ink, pens', '{}'),
  ('2025-10-22', 487.50, 'REPAIRS/MAINTENANCE', 'ABC Plumbing - Fixed kitchen sink leak, replaced drain', '{}'),
  ('2025-10-21', 125.00, 'MISC', 'Costco - Bulk paper towels, cleaning chemicals, trash bags', '{}'),
  ('2025-10-20', 67.84, 'FOH', 'Amazon - Credit card terminal paper rolls, stylus pens for iPad', '{}'),
  ('2025-10-19', 892.35, 'FOOD', 'US Foods - Feta cheese, olives, tzatziki ingredients, fries', '{}'),
  ('2025-10-18', 320.00, 'REPAIRS/MAINTENANCE', 'HVAC Tech - AC filter replacement and maintenance check', '{}');

-- ============================================
-- VERIFY ENTRIES
-- ============================================
SELECT
  purchase_date,
  amount,
  category,
  details
FROM amex_receipts
ORDER BY purchase_date DESC;

-- ============================================
-- SUMMARY
-- ============================================
SELECT
  category,
  COUNT(*) as entry_count,
  SUM(amount) as total_amount
FROM amex_receipts
GROUP BY category
ORDER BY category;
