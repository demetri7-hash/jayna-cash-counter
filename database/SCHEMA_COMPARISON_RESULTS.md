# Schema Comparison Results
**Date:** 2025-10-13
**Comparison:** Code expectations vs Actual Supabase database

---

## ✅ PERFECT MATCHES

### 1. cash_counts
**Status:** ✅ **ALL FIELDS PRESENT** (33/33)
- All 32 code fields exist
- Extra fields in DB: `id`, `created_at`, `updated_at` (fine - auto-generated)

### 2. daily_sales
**Status:** ✅ **ALL FIELDS PRESENT** (15/15)
- Includes newly added `gift_card_payments` and `gift_card_amount` ✅
- User already ran the migration - perfect!

### 3. tip_variance
**Status:** ✅ **ALL FIELDS PRESENT** (6/6)
- All expected fields exist
- Extra fields: `id`, `created_at`, `updated_at` (fine)

### 4. weekly_combined_reports
**Status:** ✅ **ALL FIELDS PRESENT** (28/28)
- Every single field the code needs exists!

---

## ❌ MISSING FIELDS DETECTED

### 5. cashbox_counts
**Status:** ⚠️ **1 FIELD MISSING**

**Database has:**
- id, date, counter, denominations, total, timestamp, created_at

**Code expects but MISSING:**
- ❌ **`notes` (TEXT)** - Used at line 2893 in index.html

**Where it's used:**
```javascript
// Line 2893
notes: 'Entered from tip pool calculator'

// Line 2906
notes: 'Updated from tip pool calculator'
```

---

## ⚠️ INCOMPLETE DATA (Output Cut Off)

### 6. weekly_daily_breakdown
**Output shown:**
- id, weekly_report_id, date, night_counter, toast_sales, actual_cash_in

**Code also needs:**
- discrepancy
- excess
- created_at

**Status:** Unknown - output was cut off. Need to check if `discrepancy`, `excess`, `created_at` exist.

### 7. weekly_employee_tips
**Status:** Not included in query output - need to verify this table exists with all 13 fields.

---

## 🔧 REQUIRED FIXES

### Fix #1: Add `notes` column to cashbox_counts

```sql
ALTER TABLE cashbox_counts
ADD COLUMN IF NOT EXISTS notes TEXT;
```

### Fix #2: Verify weekly_daily_breakdown (if missing fields)

Run this query first to check:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'weekly_daily_breakdown'
ORDER BY ordinal_position;
```

If missing `discrepancy` or `excess`:
```sql
ALTER TABLE weekly_daily_breakdown
ADD COLUMN IF NOT EXISTS discrepancy NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS excess NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
```

### Fix #3: Verify weekly_employee_tips exists

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'weekly_employee_tips'
ORDER BY ordinal_position;
```

If table doesn't exist, create it:
```sql
CREATE TABLE weekly_employee_tips (
  id BIGSERIAL PRIMARY KEY,
  weekly_report_id BIGINT REFERENCES weekly_combined_reports(id),
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  employee_first_name TEXT,
  employee_last_name TEXT,
  hours_worked NUMERIC(10, 2),
  regular_hours NUMERIC(10, 2),
  overtime_hours NUMERIC(10, 2),
  equity_percentage NUMERIC(10, 2),
  weighted_hours NUMERIC(10, 2),
  tips_due NUMERIC(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Summary

**Confirmed Working:** 4/7 tables (100% complete)
**Missing Fields:** 1 confirmed (`cashbox_counts.notes`)
**Unknown Status:** 2 tables (output incomplete)

**Next Steps:**
1. Add `notes` to `cashbox_counts` ✅
2. Check `weekly_daily_breakdown` for missing fields
3. Verify `weekly_employee_tips` table exists

