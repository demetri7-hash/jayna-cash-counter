# Automation Updates - October 19, 2025

## New Features

### 1. Auto-Print Prep List (4am Daily)
**File:** `/api/auto-print-prep.js`
**Cron:** 4:00 AM PST (11:00 UTC)

**Logic:**
- Checks if ANY prep item counted between 9pm-4am (8hr window)
- If YES: Generate prep list PDF → send to Epson printer
- If NO: Skip (staff gets red disclaimer on PREP tab)

**Result:** Morning prep cook has fresh list waiting at 4am

---

### 2. Enhanced Order Emails (5am Daily)
**File:** `/api/daily-ordering.js`
**Cron:** 5:00 AM PST (12:00 UTC)

**Enhanced for:** MANI, PERFORMANCE, GREENLEAF

**Each email now includes:**
1. **Email body:** AI-generated suggested order (HTML table)
2. **PDF attachment:** 2-page ordering guide
   - Page 1: Blank ordering guide (35 rows)
   - Page 2: Complete inventory reference (from database)
3. **CC:** Epson printer (auto-prints)

**Recipients:**
- TO: demetri7@gmail.com
- CC: GSS4168CTJJA73@print.epsonconnect.com

---

### 3. Visual Status Disclaimers (PREP Tab)
**File:** `index.html` (lines 1726-1730, 17495-17569)

**GREEN Disclaimer** (auto-print succeeded):
```
✅ PREP LIST AUTO-PRINTED AT 4AM
5 prep items counted overnight. Check the printer for today's prep list.
```

**RED Disclaimer** (no auto-print):
```
⚠️ NO AUTO-PRINT AT 4AM
No prep counts detected. Update counts and click EMAIL TO PRINTER.
```

**Updates when:**
- PREP tab opened
- REFRESH button clicked

---

## Daily Schedule

| Time | Event | Action |
|------|-------|--------|
| 4:00 AM | Auto-Print Prep | If prep counted overnight → PDF to printer |
| 5:00 AM | Send Orders | MANI/PERFORMANCE/GREENLEAF → email + PDF + CC printer |

---

## Environment Variables Required

```bash
GMAIL_APP_PASSWORD=          # Gmail app password for jaynascans@gmail.com
ORDERS_GMAIL_APP_PASSWORD=   # Same as above
CRON_SECRET=                 # Vercel cron authorization
SUPABASE_URL=
SUPABASE_KEY=
```

---

## Database Requirements

**Prep Auto-Print:**
- `inventory_items.is_prep` (boolean)
- `inventory_items.last_counted_at` (timestamp)

**Order PDFs:**
- `inventory_items.vendor` (text: "Mani Imports", "Performance", "Greenleaf")
- `inventory_items.item_name`, `current_stock`, `par_level`, `unit`

---

## Testing

**Test Auto-Print Prep:**
```bash
curl -X POST https://your-domain.vercel.app/api/auto-print-prep \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Test Enhanced Orders:**
```bash
curl -X POST https://your-domain.vercel.app/api/daily-ordering \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Files Modified

1. `/api/auto-print-prep.js` (NEW)
2. `/api/daily-ordering.js` (ENHANCED)
3. `/vercel.json` (added 4am cron)
4. `/index.html` (added status disclaimers)

---

## Next Steps

- Monitor printer at 4am and 5am tomorrow
- Check demetri7@gmail.com inbox at 5am for order emails with PDFs
- Verify prep cook sees appropriate disclaimer (green or red)
