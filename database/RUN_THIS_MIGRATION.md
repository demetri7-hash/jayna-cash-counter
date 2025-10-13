# Database Migration Required: Add detected_price Column

## 🚨 Action Required

The OCR invoice upload flow is trying to save `detected_price` data but the column doesn't exist in your `invoice_items` table.

## Steps to Fix:

### Option 1: Supabase SQL Editor (Recommended - 30 seconds)

1. Go to **Supabase Dashboard** → Your Project
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `migrations/add_detected_price_to_invoice_items.sql`
5. Paste into the SQL editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. You should see: "Success. No rows returned"

### Option 2: Supabase CLI (if you have it installed)

```bash
cd "database/migrations"
supabase db execute -f add_detected_price_to_invoice_items.sql
```

## What This Migration Does:

✅ Adds `detected_price NUMERIC(10,2)` column to `invoice_items` table
✅ Sets default value to 0 for existing rows
✅ Creates index for future performance
✅ Uses `IF NOT EXISTS` - safe to run multiple times

## Why This Is Needed:

The OCR system extracts:
- Item names → `detected_item_name`
- Quantities → `detected_quantity`
- **Prices → `detected_price`** ← **Missing column!**

Without this column, the learning algorithm can't save matched invoice data for future auto-detection improvements.

## After Migration:

The console error will disappear:
```
❌ Failed to save learning data: {code: "PGRST204", message: "Could not find the 'detected_price' column..."}
```

Will become:
```
✅ Saved 5 matches for learning!
```

---

**Date Created:** 2025-10-12
**Related Files:**
- `database/migrations/add_detected_price_to_invoice_items.sql` (migration file)
- `index.html` lines 15975, 16409 (uses detected_price)
