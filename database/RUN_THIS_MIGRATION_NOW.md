# 🚨 URGENT: Run This Migration Now!

## Problem
The learning system is trying to save data to columns that don't exist yet in the `invoice_items` table. This causes the error:

```
Could not find the 'matched_at' column of 'invoice_items' in the schema cache
```

## Solution
Run the migration to add the missing columns.

## Steps

### Option 1: Supabase Dashboard (Easiest)

1. Go to https://supabase.com
2. Open your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the entire contents of `database/migrations/add_learning_columns_to_invoice_items.sql`
6. Click **Run**
7. ✅ Done! The learning system will now work.

### Option 2: Supabase CLI

```bash
cd database/migrations
supabase db push
```

## What This Adds

This migration adds the following columns to `invoice_items`:

- `detected_item_name` - Item name as seen in OCR
- `detected_quantity` - Quantity detected
- `detected_price` - Price detected
- `match_confidence` - How confident the match is (0-1)
- `matched_at` - When the item was matched
- `checked_in` - Whether physically received
- `checked_in_at` - When checked in

These columns let the system **learn** from each order/invoice you process, so it gets smarter over time!

## After Running

Once you run this migration:
1. The error will disappear
2. Learning will work automatically
3. Future Performance orders will auto-match at 100% confidence

---

**Next time you save an order, the matches will be saved and the system will remember them!**
