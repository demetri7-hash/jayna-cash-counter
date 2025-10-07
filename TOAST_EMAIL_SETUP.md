# Toast Automated Email Parsing Setup Guide

## Overview
This system automatically fetches Toast Performance Summary emails from Gmail, parses the data, and stores it in Supabase for instant retrieval.

## Setup Steps

### 1. Create Gmail App Password

1. Go to Google Account settings: https://myaccount.google.com/
2. Navigate to Security → 2-Step Verification (enable if not already)
3. Scroll down to "App passwords"
4. Click "App passwords"
5. Select "Mail" and "Other (Custom name)"
6. Name it "Jayna Cash Counter Toast Parser"
7. Click "Generate"
8. **COPY THE 16-CHARACTER PASSWORD** (you'll need this in step 3)

### 2. Add Email to Toast Settings

1. Log in to Toast Central
2. Go to Settings → Email Lists
3. Find the "WEEKLY TIPS REPORT" list
4. Click "Add External Email"
5. Enter: `jaynascans@gmail.com`
6. Save

**Toast will now send daily and weekly performance summaries to this email!**

### 3. Add Environment Variable to Vercel

1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Select your project: `jayna-cash-counter`
3. Go to Settings → Environment Variables
4. Add new variable:
   - **Name:** `GMAIL_APP_PASSWORD`
   - **Value:** [Paste the 16-character password from step 1]
   - **Environment:** Production, Preview, Development (select all)
5. Click "Save"

### 4. Create Database Table in Supabase

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to SQL Editor
4. Copy and paste the contents of `database/daily_sales_schema.sql`
5. Click "Run"

### 5. Deploy to Vercel

```bash
git add .
git commit -m "Add automated Toast email parsing system"
git push
```

Vercel will automatically deploy the cron job.

## How It Works

1. **Daily at 9am PT (5pm UTC)**, Vercel cron job runs
2. Connects to `jaynascans@gmail.com` via IMAP
3. Fetches unread emails from `noreply@toasttab.com`
4. Parses Performance Summary data:
   - Net Sales
   - Credit Tips
   - Cash Sales
   - Other metrics
5. Saves to Supabase `daily_sales` table
6. Marks emails as read

## Testing

### Manual Trigger (for testing)
You can manually trigger the cron job:
```bash
curl https://jayna-cash-counter.vercel.app/api/cron/parse-toast-emails \
  -H "x-vercel-cron: 1"
```

### Check Logs
View cron execution logs in Vercel Dashboard → Deployments → Functions

## Troubleshooting

### No emails being fetched
- Verify `jaynascans@gmail.com` is added to Toast email list
- Check that emails are arriving in Gmail inbox
- Verify Gmail App Password is correct in Vercel env vars

### Database errors
- Check Supabase table was created correctly
- Verify RLS policies allow inserts
- Check Supabase environment variables are set

### Cron not running
- Verify `vercel.json` cron configuration exists
- Check Vercel logs for cron execution
- Ensure project is deployed to Production (crons only run in production)

## Next Steps

Once data is populating in `daily_sales` table:
1. Update Tip Pool Calculator to read from database instead of API
2. Remove slow Toast API calls
3. Enjoy instant tip pool calculations! 🎉
