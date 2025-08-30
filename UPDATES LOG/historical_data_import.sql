-- Historical Data Import for Jayna Gyro Cash Counter
-- Generated on 2025-08-29
-- This file contains INSERT statements for importing historical cash count data

-- ==================================================
-- AM COUNTS (Morning Shifts)
-- ==================================================

-- 2025-08-22 AM Count
INSERT INTO cash_counts (shift, counter, date, timestamp, total, drawer1, drawer2, notes)
VALUES (
  'am',
  'Demetri Gregorakis',
  '2025-08-22',
  '2025-08-22T17:59:14.794Z',
  277.30,
  '{
    "skipped": false,
    "skipReason": null,
    "total": 132.15,
    "counts": {"$100":0,"$50":0,"$20":4,"$10":1,"$5":4,"$1":17,"$0.25":8,"$0.10":20,"$0.05":20,"$0.01":15}
  }'::jsonb,
  '{
    "skipped": false,
    "skipReason": null,
    "total": 145.15,
    "counts": {"$100":0,"$50":0,"$20":4,"$10":2,"$5":4,"$1":20,"$0.25":8,"$0.10":20,"$0.05":20,"$0.01":15}
  }'::jsonb,
  null
);

-- 2025-08-21 AM Count (Test)
INSERT INTO cash_counts (shift, counter, date, timestamp, total, drawer1, drawer2, notes)
VALUES (
  'am',
  'Test User',
  '2025-08-21',
  '2025-08-29T16:56:11.901Z',
  150.00,
  '{
    "skipped": false,
    "skipReason": null,
    "total": 100.00,
    "counts": {"$20":5}
  }'::jsonb,
  '{
    "skipped": false,
    "skipReason": null,
    "total": 50.00,
    "counts": {"$10":5}
  }'::jsonb,
  'Test AM entry'
);

-- 2025-08-23 AM Count
INSERT INTO cash_counts (shift, counter, date, timestamp, total, drawer1, drawer2, notes)
VALUES (
  'am',
  'Demetri Gregorakis',
  '2025-08-23',
  '2025-08-23T18:32:43.871Z',
  260.71,
  '{
    "skipped": false,
    "skipReason": null,
    "total": 126.32,
    "counts": {"$100":0,"$50":0,"$20":4,"$10":1,"$5":4,"$1":12,"$0.25":5,"$0.10":20,"$0.05":20,"$0.01":7}
  }'::jsonb,
  '{
    "skipped": false,
    "skipReason": null,
    "total": 134.39,
    "counts": {"$100":0,"$50":0,"$20":4,"$10":1,"$5":4,"$1":20,"$0.25":5,"$0.10":20,"$0.05":20,"$0.01":14}
  }'::jsonb,
  null
);

-- 2025-08-24 AM Count
INSERT INTO cash_counts (shift, counter, date, timestamp, total, drawer1, drawer2, notes)
VALUES (
  'am',
  'Ahmet Can Guler',
  '2025-08-24',
  '2025-08-24T19:46:18.394Z',
  265.20,
  '{
    "skipped": false,
    "skipReason": null,
    "total": 130.10,
    "counts": {"$100":0,"$50":0,"$20":3,"$10":3,"$5":4,"$1":15,"$0.25":8,"$0.10":20,"$0.05":20,"$0.01":10}
  }'::jsonb,
  '{
    "skipped": false,
    "skipReason": null,
    "total": 135.10,
    "counts": {"$100":0,"$50":0,"$20":3,"$10":3,"$5":4,"$1":20,"$0.25":8,"$0.10":20,"$0.05":20,"$0.01":10}
  }'::jsonb,
  null
);

-- 2025-08-25 AM Count
INSERT INTO cash_counts (shift, counter, date, timestamp, total, drawer1, drawer2, notes)
VALUES (
  'am',
  'Demetri Gregorakis',
  '2025-08-25',
  '2025-08-25T16:38:20.692Z',
  249.49,
  '{
    "skipped": false,
    "skipReason": null,
    "total": 124.37,
    "counts": {"$100":0,"$50":0,"$20":3,"$10":2,"$5":5,"$1":15,"$0.25":5,"$0.10":20,"$0.05":20,"$0.01":12}
  }'::jsonb,
  '{
    "skipped": false,
    "skipReason": null,
    "total": 125.12,
    "counts": {"$100":0,"$50":0,"$20":3,"$10":2,"$5":5,"$1":15,"$0.25":8,"$0.10":20,"$0.05":20,"$0.01":12}
  }'::jsonb,
  null
);

-- 2025-08-26 AM Count
INSERT INTO cash_counts (shift, counter, date, timestamp, total, drawer1, drawer2, notes)
VALUES (
  'am',
  'Demetri Gregorakis',
  '2025-08-26',
  '2025-08-26T17:54:34.701Z',
  279.66,
  '{
    "skipped": false,
    "skipReason": null,
    "total": 144.06,
    "counts": {"$100":0,"$50":0,"$20":4,"$10":3,"$5":3,"$1":14,"$0.25":8,"$0.10":20,"$0.05":20,"$0.01":6}
  }'::jsonb,
  '{
    "skipped": false,
    "skipReason": null,
    "total": 135.60,
    "counts": {"$100":0,"$50":0,"$20":4,"$10":2,"$5":3,"$1":16,"$0.25":6,"$0.10":20,"$0.05":20,"$0.01":10}
  }'::jsonb,
  null
);

-- 2025-08-27 AM Count
INSERT INTO cash_counts (shift, counter, date, timestamp, total, drawer1, drawer2, notes)
VALUES (
  'am',
  'Demetri Gregorakis',
  '2025-08-27',
  '2025-08-27T17:41:13.249Z',
  221.66,
  '{
    "skipped": false,
    "skipReason": null,
    "total": 105.06,
    "counts": {"$100":0,"$50":0,"$20":4,"$10":0,"$5":2,"$1":11,"$0.25":4,"$0.10":20,"$0.05":20,"$0.01":6}
  }'::jsonb,
  '{
    "skipped": false,
    "skipReason": null,
    "total": 116.60,
    "counts": {"$100":0,"$50":0,"$20":4,"$10":1,"$5":2,"$1":12,"$0.25":6,"$0.10":20,"$0.05":20,"$0.01":10}
  }'::jsonb,
  null
);

-- 2025-08-28 AM Count
INSERT INTO cash_counts (shift, counter, date, timestamp, total, drawer1, drawer2, notes)
VALUES (
  'am',
  'Demetri Gregorakis',
  '2025-08-28',
  '2025-08-28T19:30:53.823Z',
  239.39,
  '{
    "skipped": false,
    "skipReason": null,
    "total": 108.27,
    "counts": {"$100":0,"$50":0,"$20":3,"$10":0,"$5":6,"$1":15,"$0.25":2,"$0.10":17,"$0.05":20,"$0.01":7}
  }'::jsonb,
  '{
    "skipped": false,
    "skipReason": null,
    "total": 131.12,
    "counts": {"$100":0,"$50":0,"$20":3,"$10":2,"$5":6,"$1":16,"$0.25":8,"$0.10":20,"$0.05":20,"$0.01":12}
  }'::jsonb,
  'Had to go to bank to get change before I counted drawers. As of now the count is accurate but toast is showing $16.87 in cash sales so we may need to account for that in the PM close. Keep an eye out when you count tonight. Thank you.'
);

-- 2025-08-29 AM Count
INSERT INTO cash_counts (shift, counter, date, timestamp, total, drawer1, drawer2, notes)
VALUES (
  'am',
  'Demetri Gregorakis',
  '2025-08-29',
  '2025-08-29T17:47:06.834Z',
  300.40,
  '{
    "skipped": false,
    "skipReason": null,
    "total": 150.20,
    "counts": {"$100":0,"$50":0,"$20":4,"$10":1,"$5":7,"$1":20,"$0.25":8,"$0.10":20,"$0.05":20,"$0.01":20}
  }'::jsonb,
  '{
    "skipped": false,
    "skipReason": null,
    "total": 150.20,
    "counts": {"$100":0,"$50":0,"$20":4,"$10":1,"$5":7,"$1":20,"$0.25":8,"$0.10":20,"$0.05":20,"$0.01":20}
  }'::jsonb,
  null
);

-- ==================================================
-- PM COUNTS (Evening Shifts)
-- ==================================================

-- 2025-08-22 PM Count
INSERT INTO cash_counts (shift, counter, date, timestamp, total, drawer1, drawer2, notes, toastSales, cashTips, amTotal)
VALUES (
  'pm',
  'Ahmet Can Guler',
  '2025-08-22',
  '2025-08-23T18:41:07.761Z',
  569.91,
  '{
    "skipped": false,
    "skipReason": null,
    "total": 252.63,
    "counts": {"$100":1,"$50":0,"$20":5,"$10":2,"$5":4,"$1":10,"$0.25":0,"$0.10":16,"$0.05":18,"$0.01":13}
  }'::jsonb,
  '{
    "skipped": false,
    "skipReason": null,
    "total": 317.28,
    "counts": {"$100":1,"$50":0,"$20":9,"$10":1,"$5":4,"$1":4,"$0.25":2,"$0.10":18,"$0.05":18,"$0.01":8}
  }'::jsonb,
  'Resubmitting correct PM for Ahmet - DG',
  293.00,
  23,
  277.30
);

-- 2025-08-23 PM Count
INSERT INTO cash_counts (shift, counter, date, timestamp, total, drawer1, drawer2, notes, toastSales, cashTips, amTotal)
VALUES (
  'pm',
  'Ahmet Can Guler',
  '2025-08-23',
  '2025-08-24T05:07:41.264Z',
  476.75,
  '{
    "skipped": false,
    "skipReason": null,
    "total": 164.34,
    "counts": {"$100":0,"$50":0,"$20":6,"$10":1,"$5":4,"$1":9,"$0.25":9,"$0.10":20,"$0.05":20,"$0.01":9}
  }'::jsonb,
  '{
    "skipped": false,
    "skipReason": null,
    "total": 312.41,
    "counts": {"$100":1,"$50":0,"$20":6,"$10":5,"$5":4,"$1":18,"$0.25":7,"$0.10":16,"$0.05":19,"$0.01":11}
  }'::jsonb,
  null,
  216.69,
  32,
  260.71
);

-- 2025-08-24 PM Count
INSERT INTO cash_counts (shift, counter, date, timestamp, total, drawer1, drawer2, notes, toastSales, cashTips, amTotal)
VALUES (
  'pm',
  'Ahmet Can Guler',
  '2025-08-24',
  '2025-08-25T06:17:25.602Z',
  445.65,
  '{
    "skipped": false,
    "skipReason": null,
    "total": 169.56,
    "counts": {"$100":0,"$50":0,"$20":4,"$10":4,"$5":6,"$1":15,"$0.25":6,"$0.10":20,"$0.05":20,"$0.01":6}
  }'::jsonb,
  '{
    "skipped": false,
    "skipReason": null,
    "total": 276.09,
    "counts": {"$100":1,"$50":0,"$20":5,"$10":2,"$5":5,"$1":26,"$0.25":6,"$0.10":23,"$0.05":22,"$0.01":19}
  }'::jsonb,
  null,
  178.00,
  50,
  265.20
);

-- 2025-08-25 PM Count
INSERT INTO cash_counts (shift, counter, date, timestamp, total, drawer1, drawer2, notes, toastSales, cashTips, amTotal)
VALUES (
  'pm',
  'Bryan Cox',
  '2025-08-25',
  '2025-08-26T05:20:34.407Z',
  673.54,
  '{
    "skipped": false,
    "skipReason": null,
    "total": 187.14,
    "counts": {"$100":0,"$50":0,"$20":7,"$10":1,"$5":4,"$1":13,"$0.25":8,"$0.10":12,"$0.05":18,"$0.01":4}
  }'::jsonb,
  '{
    "skipped": false,
    "skipReason": null,
    "total": 486.40,
    "counts": {"$100":2,"$50":1,"$20":11,"$10":0,"$5":3,"$1":0,"$0.25":0,"$0.10":7,"$0.05":14,"$0.01":0}
  }'::jsonb,
  'Not seeing credit card tips in checkout',
  425.00,
  38,
  249.49
);

-- 2025-08-26 PM Count
INSERT INTO cash_counts (shift, counter, date, timestamp, total, drawer1, drawer2, notes, toastSales, cashTips, amTotal)
VALUES (
  'pm',
  'Demetri Gregorakis',
  '2025-08-26',
  '2025-08-27T04:42:53.512Z',
  589.65,
  '{
    "skipped": false,
    "skipReason": null,
    "total": 255.80,
    "counts": {"$100":2,"$50":0,"$20":2,"$10":0,"$5":1,"$1":6,"$0.25":7,"$0.10":20,"$0.05":20,"$0.01":5}
  }'::jsonb,
  '{
    "skipped": false,
    "skipReason": null,
    "total": 333.85,
    "counts": {"$100":2,"$50":0,"$20":5,"$10":1,"$5":1,"$1":15,"$0.25":3,"$0.10":20,"$0.05":20,"$0.01":10}
  }'::jsonb,
  '308.28 toast cash. Need to fix input to accept change',
  308.00,
  17,
  279.66
);

-- 2025-08-27 PM Count
INSERT INTO cash_counts (shift, counter, date, timestamp, total, drawer1, drawer2, notes, toastSales, cashTips, amTotal)
VALUES (
  'pm',
  'Ahmet Can Guler',
  '2025-08-27',
  '2025-08-28T05:24:08.440Z',
  587.82,
  '{
    "skipped": false,
    "skipReason": null,
    "total": 183.20,
    "counts": {"$100":0,"$50":0,"$20":9,"$10":0,"$5":0,"$1":0,"$0.25":1,"$0.10":19,"$0.05":20,"$0.01":5}
  }'::jsonb,
  '{
    "skipped": false,
    "skipReason": null,
    "total": 404.62,
    "counts": {"$100":0,"$50":3,"$20":12,"$10":0,"$5":0,"$1":12,"$0.25":0,"$0.10":16,"$0.05":18,"$0.01":12}
  }'::jsonb,
  '-1 Gemma for tip',
  366.00,
  4,
  221.66
);

-- ==================================================
-- VERIFICATION QUERIES
-- ==================================================

-- Run these queries after import to verify data:

-- Check total records imported
-- SELECT shift, COUNT(*) as count FROM cash_counts GROUP BY shift;

-- Verify date range
-- SELECT MIN(date) as earliest_date, MAX(date) as latest_date FROM cash_counts;

-- Check for any missing data
-- SELECT date, shift, counter, total FROM cash_counts ORDER BY date, shift;

-- Verify JSON structure
-- SELECT date, shift, drawer1->'total' as d1_total, drawer2->'total' as d2_total FROM cash_counts WHERE shift = 'am' LIMIT 3;
