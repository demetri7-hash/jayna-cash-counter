-- Historical Data Import for Jayna Gyro Cash Counter
-- Generated on 2025-08-29
-- This file contains UPSERT statements for importing historical cash count data
-- Note: AM and PM data are stored in the same row, grouped by date

-- ==================================================
-- AM AND PM COUNTS COMBINED BY DATE
-- ==================================================

-- 2025-08-22 (AM: Demetri, PM: Ahmet)
INSERT INTO cash_counts (
  date, 
  am_counter, am_timestamp, am_total, am_drawer1_total, am_drawer1_skip, am_drawer1_skip_reason, am_drawer1_data, 
  am_drawer2_total, am_drawer2_skip, am_drawer2_skip_reason, am_drawer2_data, am_notes,
  pm_counter, pm_timestamp, pm_total, pm_cash_tips, pm_toast_sales, pm_drawer1_total, pm_drawer1_skip, 
  pm_drawer1_skip_reason, pm_drawer1_data, pm_drawer2_total, pm_drawer2_skip, pm_drawer2_skip_reason, 
  pm_drawer2_data, pm_notes, pm_discrepancy, pm_adjusted_tips, pm_drawer_over_amount, pm_deposit_amount, pm_amount_to_keep
)
VALUES (
  '2025-08-22',
  'Demetri Gregorakis', '2025-08-22T17:59:14.794Z', 277.30, 132.15, false, null, 
  '{"$100":0,"$50":0,"$20":4,"$10":1,"$5":4,"$1":17,"$0.25":8,"$0.10":20,"$0.05":20,"$0.01":15}'::jsonb,
  145.15, false, null, 
  '{"$100":0,"$50":0,"$20":4,"$10":2,"$5":4,"$1":20,"$0.25":8,"$0.10":20,"$0.05":20,"$0.01":15}'::jsonb, 
  null,
  'Ahmet Can Guler', '2025-08-23T18:41:07.761Z', 569.91, 23, 293.00, 252.63, false, null,
  '{"$100":1,"$50":0,"$20":5,"$10":2,"$5":4,"$1":10,"$0.25":0,"$0.10":16,"$0.05":18,"$0.01":13}'::jsonb,
  317.28, false, null,
  '{"$100":1,"$50":0,"$20":9,"$10":1,"$5":4,"$1":4,"$0.25":2,"$0.10":18,"$0.05":18,"$0.01":8}'::jsonb,
  'Resubmitting correct PM for Ahmet - DG', -0.39, 23, 0, 316, 277.30
);

-- 2025-08-21 (AM: Test User, PM: Ahmet - using test data)
INSERT INTO cash_counts (
  date, 
  am_counter, am_timestamp, am_total, am_drawer1_total, am_drawer1_skip, am_drawer1_skip_reason, am_drawer1_data, 
  am_drawer2_total, am_drawer2_skip, am_drawer2_skip_reason, am_drawer2_data, am_notes
)
VALUES (
  '2025-08-21',
  'Test User', '2025-08-29T16:56:11.901Z', 150.00, 100.00, false, null, 
  '{"$20":5}'::jsonb,
  50.00, false, null, 
  '{"$10":5}'::jsonb, 
  'Test AM entry'
);

-- 2025-08-23 (AM: Demetri, PM: Ahmet)
INSERT INTO cash_counts (
  date, 
  am_counter, am_timestamp, am_total, am_drawer1_total, am_drawer1_skip, am_drawer1_skip_reason, am_drawer1_data, 
  am_drawer2_total, am_drawer2_skip, am_drawer2_skip_reason, am_drawer2_data, am_notes,
  pm_counter, pm_timestamp, pm_total, pm_cash_tips, pm_toast_sales, pm_drawer1_total, pm_drawer1_skip, 
  pm_drawer1_skip_reason, pm_drawer1_data, pm_drawer2_total, pm_drawer2_skip, pm_drawer2_skip_reason, 
  pm_drawer2_data, pm_notes, pm_discrepancy, pm_adjusted_tips, pm_drawer_over_amount, pm_deposit_amount, pm_amount_to_keep
)
VALUES (
  '2025-08-23',
  'Demetri Gregorakis', '2025-08-23T18:32:43.871Z', 260.71, 126.32, false, null, 
  '{"$100":0,"$50":0,"$20":4,"$10":1,"$5":4,"$1":12,"$0.25":5,"$0.10":20,"$0.05":20,"$0.01":7}'::jsonb,
  134.39, false, null, 
  '{"$100":0,"$50":0,"$20":4,"$10":1,"$5":4,"$1":20,"$0.25":5,"$0.10":20,"$0.05":20,"$0.01":14}'::jsonb, 
  null,
  'Ahmet Can Guler', '2025-08-24T05:07:41.264Z', 476.75, 32, 216.69, 164.34, false, null,
  '{"$100":0,"$50":0,"$20":6,"$10":1,"$5":4,"$1":9,"$0.25":9,"$0.10":20,"$0.05":20,"$0.01":9}'::jsonb,
  312.41, false, null,
  '{"$100":1,"$50":0,"$20":6,"$10":5,"$5":4,"$1":18,"$0.25":7,"$0.10":16,"$0.05":19,"$0.01":11}'::jsonb,
  null, 216.04, 32, 216.04, 32, 260.71
);

-- 2025-08-24 (AM: Ahmet, PM: Ahmet)
INSERT INTO cash_counts (
  date, 
  am_counter, am_timestamp, am_total, am_drawer1_total, am_drawer1_skip, am_drawer1_skip_reason, am_drawer1_data, 
  am_drawer2_total, am_drawer2_skip, am_drawer2_skip_reason, am_drawer2_data, am_notes,
  pm_counter, pm_timestamp, pm_total, pm_cash_tips, pm_toast_sales, pm_drawer1_total, pm_drawer1_skip, 
  pm_drawer1_skip_reason, pm_drawer1_data, pm_drawer2_total, pm_drawer2_skip, pm_drawer2_skip_reason, 
  pm_drawer2_data, pm_notes, pm_discrepancy, pm_adjusted_tips, pm_drawer_over_amount, pm_deposit_amount, pm_amount_to_keep
)
VALUES (
  '2025-08-24',
  'Ahmet Can Guler', '2025-08-24T19:46:18.394Z', 265.20, 130.10, false, null, 
  '{"$100":0,"$50":0,"$20":3,"$10":3,"$5":4,"$1":15,"$0.25":8,"$0.10":20,"$0.05":20,"$0.01":10}'::jsonb,
  135.10, false, null, 
  '{"$100":0,"$50":0,"$20":3,"$10":3,"$5":4,"$1":20,"$0.25":8,"$0.10":20,"$0.05":20,"$0.01":10}'::jsonb, 
  null,
  'Ahmet Can Guler', '2025-08-25T06:17:25.602Z', 445.65, 50, 178.00, 169.56, false, null,
  '{"$100":0,"$50":0,"$20":4,"$10":4,"$5":6,"$1":15,"$0.25":6,"$0.10":20,"$0.05":20,"$0.01":6}'::jsonb,
  276.09, false, null,
  '{"$100":1,"$50":0,"$20":5,"$10":2,"$5":5,"$1":26,"$0.25":6,"$0.10":23,"$0.05":22,"$0.01":19}'::jsonb,
  null, 2.45, 50, 2.45, 228, 265.20
);

-- 2025-08-25 (AM: Demetri, PM: Bryan)
INSERT INTO cash_counts (
  date, 
  am_counter, am_timestamp, am_total, am_drawer1_total, am_drawer1_skip, am_drawer1_skip_reason, am_drawer1_data, 
  am_drawer2_total, am_drawer2_skip, am_drawer2_skip_reason, am_drawer2_data, am_notes,
  pm_counter, pm_timestamp, pm_total, pm_cash_tips, pm_toast_sales, pm_drawer1_total, pm_drawer1_skip, 
  pm_drawer1_skip_reason, pm_drawer1_data, pm_drawer2_total, pm_drawer2_skip, pm_drawer2_skip_reason, 
  pm_drawer2_data, pm_notes, pm_discrepancy, pm_adjusted_tips, pm_drawer_over_amount, pm_deposit_amount, pm_amount_to_keep
)
VALUES (
  '2025-08-25',
  'Demetri Gregorakis', '2025-08-25T16:38:20.692Z', 249.49, 124.37, false, null, 
  '{"$100":0,"$50":0,"$20":3,"$10":2,"$5":5,"$1":15,"$0.25":5,"$0.10":20,"$0.05":20,"$0.01":12}'::jsonb,
  125.12, false, null, 
  '{"$100":0,"$50":0,"$20":3,"$10":2,"$5":5,"$1":15,"$0.25":8,"$0.10":20,"$0.05":20,"$0.01":12}'::jsonb, 
  null,
  'Bryan Cox', '2025-08-26T05:20:34.407Z', 673.54, 38, 425.00, 187.14, false, null,
  '{"$100":0,"$50":0,"$20":7,"$10":1,"$5":4,"$1":13,"$0.25":8,"$0.10":12,"$0.05":18,"$0.01":4}'::jsonb,
  486.40, false, null,
  '{"$100":2,"$50":1,"$20":11,"$10":0,"$5":3,"$1":0,"$0.25":0,"$0.10":7,"$0.05":14,"$0.01":0}'::jsonb,
  'Not seeing credit card tips in checkout', -0.95, 38, 0, 463, 249.49
);

-- 2025-08-26 (AM: Demetri, PM: Demetri)
INSERT INTO cash_counts (
  date, 
  am_counter, am_timestamp, am_total, am_drawer1_total, am_drawer1_skip, am_drawer1_skip_reason, am_drawer1_data, 
  am_drawer2_total, am_drawer2_skip, am_drawer2_skip_reason, am_drawer2_data, am_notes,
  pm_counter, pm_timestamp, pm_total, pm_cash_tips, pm_toast_sales, pm_drawer1_total, pm_drawer1_skip, 
  pm_drawer1_skip_reason, pm_drawer1_data, pm_drawer2_total, pm_drawer2_skip, pm_drawer2_skip_reason, 
  pm_drawer2_data, pm_notes, pm_discrepancy, pm_adjusted_tips, pm_drawer_over_amount, pm_deposit_amount, pm_amount_to_keep
)
VALUES (
  '2025-08-26',
  'Demetri Gregorakis', '2025-08-26T17:54:34.701Z', 279.66, 144.06, false, null, 
  '{"$100":0,"$50":0,"$20":4,"$10":3,"$5":3,"$1":14,"$0.25":8,"$0.10":20,"$0.05":20,"$0.01":6}'::jsonb,
  135.60, false, null, 
  '{"$100":0,"$50":0,"$20":4,"$10":2,"$5":3,"$1":16,"$0.25":6,"$0.10":20,"$0.05":20,"$0.01":10}'::jsonb, 
  null,
  'Demetri Gregorakis', '2025-08-27T04:42:53.512Z', 589.65, 17, 308.00, 255.80, false, null,
  '{"$100":2,"$50":0,"$20":2,"$10":0,"$5":1,"$1":6,"$0.25":7,"$0.10":20,"$0.05":20,"$0.01":5}'::jsonb,
  333.85, false, null,
  '{"$100":2,"$50":0,"$20":5,"$10":1,"$5":1,"$1":15,"$0.25":3,"$0.10":20,"$0.05":20,"$0.01":10}'::jsonb,
  '308.28 toast cash. Need to fix input to accept change', 1.99, 17, 1.99, 325, 279.66
);

-- 2025-08-27 (AM: Demetri, PM: Ahmet)
INSERT INTO cash_counts (
  date, 
  am_counter, am_timestamp, am_total, am_drawer1_total, am_drawer1_skip, am_drawer1_skip_reason, am_drawer1_data, 
  am_drawer2_total, am_drawer2_skip, am_drawer2_skip_reason, am_drawer2_data, am_notes,
  pm_counter, pm_timestamp, pm_total, pm_cash_tips, pm_toast_sales, pm_drawer1_total, pm_drawer1_skip, 
  pm_drawer1_skip_reason, pm_drawer1_data, pm_drawer2_total, pm_drawer2_skip, pm_drawer2_skip_reason, 
  pm_drawer2_data, pm_notes, pm_discrepancy, pm_adjusted_tips, pm_drawer_over_amount, pm_deposit_amount, pm_amount_to_keep
)
VALUES (
  '2025-08-27',
  'Demetri Gregorakis', '2025-08-27T17:41:13.249Z', 221.66, 105.06, false, null, 
  '{"$100":0,"$50":0,"$20":4,"$10":0,"$5":2,"$1":11,"$0.25":4,"$0.10":20,"$0.05":20,"$0.01":6}'::jsonb,
  116.60, false, null, 
  '{"$100":0,"$50":0,"$20":4,"$10":1,"$5":2,"$1":12,"$0.25":6,"$0.10":20,"$0.05":20,"$0.01":10}'::jsonb, 
  null,
  'Ahmet Can Guler', '2025-08-28T05:24:08.440Z', 587.82, 4, 366.00, 183.20, false, null,
  '{"$100":0,"$50":0,"$20":9,"$10":0,"$5":0,"$1":0,"$0.25":1,"$0.10":19,"$0.05":20,"$0.01":5}'::jsonb,
  404.62, false, null,
  '{"$100":0,"$50":3,"$20":12,"$10":0,"$5":0,"$1":12,"$0.25":0,"$0.10":16,"$0.05":18,"$0.01":12}'::jsonb,
  '-1 Gemma for tip', 0.16, 4, 0.16, 370, 221.66
);

-- 2025-08-28 (AM only: Demetri - no PM data available)
INSERT INTO cash_counts (
  date, 
  am_counter, am_timestamp, am_total, am_drawer1_total, am_drawer1_skip, am_drawer1_skip_reason, am_drawer1_data, 
  am_drawer2_total, am_drawer2_skip, am_drawer2_skip_reason, am_drawer2_data, am_notes
)
VALUES (
  '2025-08-28',
  'Demetri Gregorakis', '2025-08-28T19:30:53.823Z', 239.39, 108.27, false, null, 
  '{"$100":0,"$50":0,"$20":3,"$10":0,"$5":6,"$1":15,"$0.25":2,"$0.10":17,"$0.05":20,"$0.01":7}'::jsonb,
  131.12, false, null, 
  '{"$100":0,"$50":0,"$20":3,"$10":2,"$5":6,"$1":16,"$0.25":8,"$0.10":20,"$0.05":20,"$0.01":12}'::jsonb, 
  'Had to go to bank to get change before I counted drawers. As of now the count is accurate but toast is showing $16.87 in cash sales so we may need to account for that in the PM close. Keep an eye out when you count tonight. Thank you.'
);

-- 2025-08-29 (AM only: Demetri - no PM data available)
INSERT INTO cash_counts (
  date, 
  am_counter, am_timestamp, am_total, am_drawer1_total, am_drawer1_skip, am_drawer1_skip_reason, am_drawer1_data, 
  am_drawer2_total, am_drawer2_skip, am_drawer2_skip_reason, am_drawer2_data, am_notes
)
VALUES (
  '2025-08-29',
  'Demetri Gregorakis', '2025-08-29T17:47:06.834Z', 300.40, 150.20, false, null, 
  '{"$100":0,"$50":0,"$20":4,"$10":1,"$5":7,"$1":20,"$0.25":8,"$0.10":20,"$0.05":20,"$0.01":20}'::jsonb,
  150.20, false, null, 
  '{"$100":0,"$50":0,"$20":4,"$10":1,"$5":7,"$1":20,"$0.25":8,"$0.10":20,"$0.05":20,"$0.01":20}'::jsonb, 
  null
);

-- ==================================================
-- VERIFICATION QUERIES
-- ==================================================

-- Run these queries after import to verify data:

-- Check total records imported
-- SELECT COUNT(*) as total_days FROM cash_counts;

-- Verify date range
-- SELECT MIN(date) as earliest_date, MAX(date) as latest_date FROM cash_counts;

-- Check AM vs PM data coverage
-- SELECT 
--   date,
--   CASE WHEN am_counter IS NOT NULL THEN 'YES' ELSE 'NO' END as has_am_data,
--   CASE WHEN pm_counter IS NOT NULL THEN 'YES' ELSE 'NO' END as has_pm_data,
--   am_counter, pm_counter, am_total, pm_total
-- FROM cash_counts ORDER BY date;

-- Verify JSON structure
-- SELECT date, am_drawer1_data->'$20' as am_d1_twenties, pm_drawer1_data->'$100' as pm_d1_hundreds FROM cash_counts WHERE pm_counter IS NOT NULL LIMIT 3;
