# 🚀 Automated Ordering System - Setup Instructions

## ✅ COMPLETED

### 1. Database Tables Created
All 4 database tables have been successfully created in Supabase:
- ✅ `inventory_history` - Track stock changes over time
- ✅ `order_log` - Track all automated orders
- ✅ `par_level_adjustments` - AI par level suggestions
- ✅ `inventory_alerts` - System-generated alerts

### 2. EmailJS Template ID Received
- ✅ Template ID: `template_nxg1glf`

---

## 📋 NEXT STEPS

### Step 1: Copy Email Template to EmailJS Dashboard

1. **Open the file:** `EMAILJS_TEMPLATE_COPY_PASTE.html`
2. **Log into EmailJS:** https://dashboard.emailjs.com/admin
3. **Navigate to:** Email Templates → Find template `template_nxg1glf`
4. **Click:** Edit Template
5. **Select:** "Content" tab
6. **Delete:** Any existing content
7. **Copy-Paste:** Entire contents of `EMAILJS_TEMPLATE_COPY_PASTE.html`
8. **Click:** Save

**Important EmailJS Template Variables:**
The template uses these variables (passed from edge function):
```
{{vendor}}
{{order_date}}
{{delivery_date}}
{{cutoff_time}}
{{total_items}}
{{generated_time}}
{{generated_timestamp}}
{{special_notes}}
{{items}} - array with: name, qty, unit, stock, par
{{calculation_method}}
{{days_covered}}
{{historical_days}}
{{consumption_trend}}
{{alerts}} - array of alert messages
{{par_suggestions}} - array with: item, current, suggested, reason
```

### Step 2: Set Vercel Environment Variables

1. **Go to:** https://vercel.com/dashboard
2. **Select:** jayna-cash-counter project
3. **Navigate to:** Settings → Environment Variables
4. **Add the following variables:**

```bash
# EmailJS Template Configuration
EMAILJS_TEMPLATE_ID_ORDERS=template_nxg1glf

# Order Email Destination (already set, verify)
ORDER_EMAIL=demetri7@gmail.com

# Cron Job Security (generate a random string)
CRON_SECRET=<GENERATE_RANDOM_STRING>
```

**To generate CRON_SECRET**, run this in terminal:
```bash
openssl rand -base64 32
```

Then copy the output and use it as your CRON_SECRET.

**Existing variables to verify are set:**
```bash
EMAILJS_SERVICE_ID=<your_service_id>
EMAILJS_USER_ID=<your_user_id>
SUPABASE_URL=<already_set>
SUPABASE_KEY=<already_set>
```

### Step 3: Redeploy to Apply Environment Variables

After adding environment variables in Vercel:

1. **Go to:** Deployments tab
2. **Click:** "..." menu on latest deployment
3. **Select:** "Redeploy"
4. **Wait:** 1-2 minutes for deployment to complete

---

## 🧪 TESTING

### Test 1: Manual Trigger (Dry Run)

Once environment variables are set, test the cron job manually:

```bash
# Generate a CRON_SECRET first (if you haven't)
openssl rand -base64 32

# Trigger the endpoint manually
curl -X GET https://jayna-cash-counter.vercel.app/api/daily-ordering \
  -H "Authorization: Bearer YOUR_CRON_SECRET_HERE"
```

**Expected Response:**
```json
{
  "success": true,
  "timestamp": "2025-10-10T...",
  "vendorsProcessed": 2,
  "ordersGenerated": 2,
  "emailResults": [
    {"vendor": "Greenleaf", "success": true, "itemCount": 15},
    {"vendor": "Performance", "success": true, "itemCount": 8}
  ],
  "summary": {
    "totalItems": 23,
    "alerts": 2,
    "parSuggestions": 1
  }
}
```

**Check your email** (demetri7@gmail.com) for the order sheets!

### Test 2: Verify Database Logging

After manual trigger, check Supabase:

```sql
-- Check order log
SELECT * FROM order_log ORDER BY created_at DESC LIMIT 5;

-- Should show orders with email_status = 'sent'
```

### Test 3: Verify Cron Job in Vercel

1. **Go to:** Vercel Dashboard → jayna-cash-counter
2. **Navigate to:** Cron Jobs tab
3. **Verify:** You see `/api/daily-ordering` scheduled at `0 12 * * *`
4. **Check:** Next scheduled run time

---

## 📅 PRODUCTION SCHEDULE

Once testing is complete, the system will automatically run:

**Schedule:** Every day at 4:00 AM PST (12:00 PM UTC)

**Vendor Order Days:**
- **Greenleaf:** Sun, Mon, Tue, Wed, Thu, Fri (delivery next day)
  - *Special:* Friday order covers Sat + Sun (2 days)
- **Performance:** Sun, Wed (delivery next day)
- **Mani Imports:** Tue, Thu (delivery next day)
  - *Special:* Thursday order covers Fri-Tue (5 days)
- **Eatopia Foods:** Wed (delivery Thu)
- **Alsco:** On-demand only (manual orders)

**Algorithm Features:**
- 30-day historical consumption analysis
- Trend detection (increasing/decreasing usage)
- Variability-based safety buffers
- Predictive ordering (days × avg consumption + safety buffer)
- Par level enforcement (never order below par)
- Stockout detection and alerting
- Par level adjustment suggestions

---

## 🔧 TROUBLESHOOTING

### Email not sending?
1. Check Vercel logs: Deployments → Latest → View Function Logs
2. Verify EmailJS credentials are correct
3. Test EmailJS template manually in dashboard
4. Check `order_log` table for `email_status = 'failed'`

### No orders generated?
1. Check vendor schedules match today's day
2. Verify inventory items have vendors assigned
3. Check if stock levels are already at/above par
4. Look at Vercel function logs for calculation details

### Cron job not triggering?
1. Verify cron job appears in Vercel dashboard
2. Check timezone (4am PST = 12pm UTC)
3. Verify `CRON_SECRET` environment variable is set
4. Test manual trigger with curl command

### Database errors?
1. Verify all 4 tables exist in Supabase
2. Check RLS policies are enabled
3. Verify Supabase credentials in environment variables
4. Check Supabase logs for query errors

---

## 📊 MONITORING

### Daily Checks (First Week)

1. **Email Arrival:** Confirm orders arrive at 4am
2. **Order Accuracy:** Verify quantities make sense
3. **Algorithm Insights:** Review consumption trends
4. **Alerts:** Check inventory alerts for issues
5. **Par Suggestions:** Review AI recommendations

### Weekly Reviews

1. **Order Log:** Review all orders in `order_log` table
2. **Email Status:** Check for any `failed` or `bounced` emails
3. **Par Adjustments:** Approve/reject AI suggestions in `par_level_adjustments`
4. **Inventory Alerts:** Resolve outstanding alerts

### Monthly Analysis

1. **Algorithm Performance:** Are predictions accurate?
2. **Stockout Rate:** Has it decreased?
3. **Order Efficiency:** Are we ordering the right amounts?
4. **Cost Optimization:** Any vendor minimum issues?

---

## 💰 COST ESTIMATE

- **Vercel:** $0/month (100 cron invocations free - we use ~30/month)
- **EmailJS:** $0/month (200 emails free - we use ~30/month)
- **Supabase:** $0/month (free tier sufficient)

**TOTAL: $0/month** 🎉

---

## 🎯 SUCCESS CRITERIA

After 30 days of operation, you should see:

- ✅ Zero missed vendor orders
- ✅ Reduced stockout incidents
- ✅ More accurate par levels
- ✅ 15-30 minutes saved per day on ordering
- ✅ Better inventory turnover
- ✅ Trend-based purchasing insights

---

## 📞 SUPPORT

If you encounter issues:

1. Check Vercel function logs
2. Check Supabase database logs
3. Review EmailJS delivery logs
4. Check this documentation
5. Review `AUTOMATED_ORDERING_SYSTEM.md` for detailed specs

**Files for reference:**
- `AUTOMATED_ORDERING_SYSTEM.md` - Complete system specification
- `api/daily-ordering.js` - Edge function code (630 lines)
- `EMAILJS_TEMPLATE_COPY_PASTE.html` - Email template
- `supabase/migrations/create-automated-ordering-tables.sql` - Database schema

---

**System Status:** ✅ Ready for Production Testing
**Last Updated:** 2025-10-10
**Next Step:** Configure EmailJS template + Vercel environment variables
