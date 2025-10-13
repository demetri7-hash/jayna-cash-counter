# Actual Database Schemas Used in Code
**Generated from:** index.html + cron jobs analysis
**Date:** 2025-10-13
**Purpose:** Compare what code is trying to save vs actual database schema

---

## 1. cash_counts

### AM Fields (Morning Count)
```sql
date DATE PRIMARY KEY
am_counter TEXT
am_timestamp TIMESTAMPTZ
am_total DECIMAL(10, 2)
am_drawer1_total DECIMAL(10, 2)
am_drawer1_skip BOOLEAN
am_drawer1_skip_reason TEXT
am_drawer1_data JSONB  -- denomination counts
am_drawer2_total DECIMAL(10, 2)
am_drawer2_skip BOOLEAN
am_drawer2_skip_reason TEXT
am_drawer2_data JSONB  -- denomination counts
am_notes TEXT
```

### PM Fields (Evening Close)
```sql
pm_counter TEXT
pm_timestamp TIMESTAMPTZ
pm_total DECIMAL(10, 2)
pm_cash_tips DECIMAL(10, 2)
pm_toast_sales DECIMAL(10, 2)
pm_drawer1_total DECIMAL(10, 2)
pm_drawer1_skip BOOLEAN
pm_drawer1_skip_reason TEXT
pm_drawer1_data JSONB
pm_drawer2_total DECIMAL(10, 2)
pm_drawer2_skip BOOLEAN
pm_drawer2_skip_reason TEXT
pm_drawer2_data JSONB
pm_notes TEXT
pm_discrepancy DECIMAL(10, 2)
pm_adjusted_tips DECIMAL(10, 2)
pm_drawer_over_amount DECIMAL(10, 2)
pm_deposit_amount DECIMAL(10, 2)
pm_amount_to_keep DECIMAL(10, 2)
```

**Source:** Lines 3623-3679 in index.html

---

## 2. cashbox_counts

```sql
date DATE PRIMARY KEY
counter TEXT
total DECIMAL(10, 2)
denominations JSONB  -- {hundreds, fifties, twenties, tens, fives, ones, quarters, dimes, nickels, pennies}
notes TEXT
```

**Source:** Lines 2881-2920 in index.html

---

## 3. weekly_combined_reports

### Report Metadata
```sql
id BIGINT PRIMARY KEY AUTO
week_start_date DATE
week_end_date DATE
generated_by TEXT
generated_at TIMESTAMPTZ
real_envelope_amount DECIMAL(10, 2)
cashbox_total DECIMAL(10, 2)
```

### Tip Pool Summary Data
```sql
total_toast_sales DECIMAL(10, 2)
actual_cash_in DECIMAL(10, 2)
total_discrepancy DECIMAL(10, 2)
envelope_deposits DECIMAL(10, 2)
credit_tips DECIMAL(10, 2)
cash_tips DECIMAL(10, 2)
ezcater_tips DECIMAL(10, 2)
total_tips DECIMAL(10, 2)
tds_driver_tips DECIMAL(10, 2)
tip_pool_total DECIMAL(10, 2)
hourly_rate DECIMAL(10, 2)
cash_needed DECIMAL(10, 2)
calculated_cash_tips DECIMAL(10, 2)
total_weighted_hours DECIMAL(10, 2)
total_hours_worked DECIMAL(10, 2)
```

### Data Storage
```sql
employee_tip_data JSONB  -- Array of employee tip records
daily_cash_breakdown JSONB  -- Array of daily cash data
```

### System Metadata
```sql
report_version TEXT  -- Currently '3.0'
has_attachments BOOLEAN
generated_cash_report_html TEXT
generated_tip_pool_html TEXT
```

**Source:** Lines 9291-9340 in index.html

---

## 4. weekly_employee_tips

```sql
id BIGINT PRIMARY KEY AUTO
weekly_report_id BIGINT  -- FK to weekly_combined_reports
week_start_date DATE
week_end_date DATE
employee_first_name TEXT
employee_last_name TEXT
hours_worked DECIMAL(10, 2)
regular_hours DECIMAL(10, 2)
overtime_hours DECIMAL(10, 2)
equity_percentage DECIMAL(10, 2)
weighted_hours DECIMAL(10, 2)
tips_due DECIMAL(10, 2)
created_at TIMESTAMPTZ
```

**Source:** Lines 9351-9368 in index.html

---

## 5. weekly_daily_breakdown

```sql
id BIGINT PRIMARY KEY AUTO
weekly_report_id BIGINT  -- FK to weekly_combined_reports
date DATE
night_counter TEXT
toast_sales DECIMAL(10, 2)
actual_cash_in DECIMAL(10, 2)
discrepancy DECIMAL(10, 2)
excess DECIMAL(10, 2)
created_at TIMESTAMPTZ
```

**Source:** Lines 9390-9408 in index.html

---

## 6. tip_variance

```sql
week_ending_date DATE PRIMARY KEY
calculated_total DECIMAL(10, 2)
actual_paid_total DECIMAL(10, 2)
variance_amount DECIMAL(10, 2)
previous_variance DECIMAL(10, 2)
carried_from_date DATE
```

**Source:** Lines 7908-7925 in index.html

---

## 7. daily_sales (Used by Cron Job)

```sql
date DATE PRIMARY KEY
net_sales DECIMAL(10, 2)
credit_tips DECIMAL(10, 2)
cash_sales DECIMAL(10, 2)
credit_amount DECIMAL(10, 2)
credit_count INTEGER
cash_tips DECIMAL(10, 2)
other_sales DECIMAL(10, 2)
other_tips DECIMAL(10, 2)
total_tips DECIMAL(10, 2)
gift_card_payments INTEGER
gift_card_amount DECIMAL(10, 2)
imported_at TIMESTAMPTZ
source TEXT  -- 'toast_api_auto' or 'toast_email_auto'
raw_data JSONB
```

**Source:** api/cron/cache-toast-sales.js lines 56-72

---

## Summary

**Total Main Tables:** 7
- cash_counts (32 fields)
- cashbox_counts (5 fields)
- weekly_combined_reports (28 fields)
- weekly_employee_tips (13 fields)
- weekly_daily_breakdown (9 fields)
- tip_variance (6 fields)
- daily_sales (15 fields)

**Total Fields Tracked:** 108 fields across all tables

**Next Step:** Compare this against actual Supabase database schema to find missing columns!

