# Automated Instagram Scraper Setup Guide

## ✅ SYSTEM READY - What's Been Built

You now have a **100% automated Instagram comment scraper** that:
- ✅ Runs **EVERY HOUR** automatically via Vercel cron job
- ✅ Scrapes up to 500 new comments per run
- ✅ Validates school tags automatically (fuzzy matching)
- ✅ Prevents duplicate votes
- ✅ Tracks last processed comment (only processes NEW comments)
- ✅ **NO AUTHENTICATION NEEDED** - Works with public posts!
- ✅ NO CSV uploads required
- ✅ NO manual work needed once configured

---

## 🚀 QUICK START (5 Minutes)

### Step 1: Update Database Schema

Run this in Supabase SQL Editor to add scraper config fields:

```sql
-- Add new config fields for scraper
INSERT INTO teacher_feast_config (config_key, config_value) VALUES
    ('instagram_post_shortcode', 'PLACEHOLDER'),
    ('last_scraped_comment_id', '')
ON CONFLICT (config_key) DO NOTHING;
```

### Step 2: Get Your Instagram Post Shortcode

When you create your contest post on December 1, 2025:

**Instagram Post URL:**
```
https://www.instagram.com/p/ABC123xyz/
                                ↑
                                This is the shortcode
```

**Example:**
- URL: `https://www.instagram.com/p/C1234567890/`
- Shortcode: `C1234567890`

### Step 3: Configure the Scraper

**Option A: Using Supabase Dashboard**

1. Go to Supabase: https://supabase.com/dashboard
2. Select your project
3. Go to **Table Editor** → `teacher_feast_config`
4. Find row where `config_key` = `instagram_post_shortcode`
5. Update `config_value` to your post shortcode (e.g., `C1234567890`)
6. Click **Save**

**Option B: Using SQL**

```sql
UPDATE teacher_feast_config
SET config_value = 'C1234567890'
WHERE config_key = 'instagram_post_shortcode';
```

Replace `C1234567890` with your actual shortcode.

### Step 4: Add Vercel Environment Variable

Add this to Vercel environment variables for security:

1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   - **Name:** `CRON_SECRET`
   - **Value:** (generate random string, e.g., `randomly-generated-secret-key-12345`)
   - Click **Save**
5. Redeploy your project

### Step 5: Test the Scraper

**Manual Test (Before Cron Goes Live):**

Visit this URL to manually trigger a scrape:
```
https://jayna-cash-counter.vercel.app/api/instagram-scraper-manual
```

Or use curl:
```bash
curl -X POST https://jayna-cash-counter.vercel.app/api/instagram-scraper-manual
```

**Expected Response:**
```json
{
  "success": true,
  "stats": {
    "total_comments_fetched": 150,
    "new_comments_processed": 150,
    "new_votes": 45,
    "duplicates_skipped": 0,
    "invalid_tags": 12,
    "schools_updated": ["Kennedy High School", "Sacramento High School", ...]
  }
}
```

### Step 6: Deploy & Go Live

Once configured, the system automatically:
- **Runs every hour** (on the hour: 1:00, 2:00, 3:00, etc.)
- Scrapes up to 500 new comments per run
- Only processes comments added since last run
- Updates leaderboard in real-time

**That's it! The scraper is now fully automated! 🎉**

---

## 📊 How It Works

### Automatic Hourly Workflow:

**Hour 1: 1:00 PM**
1. Cron job triggers `/api/instagram-scraper-cron`
2. Fetches latest 500 comments from Instagram post
3. Finds comments added since last run
4. Extracts school tags (@KennedyHigh, #SacramentoHS)
5. Validates each tag against Sacramento schools database
6. Adds valid votes to leaderboard
7. Stores last processed comment ID
8. Waits until next hour

**Hour 2: 2:00 PM**
1. Cron triggers again
2. Fetches comments
3. Only processes NEW comments since 1:00 PM
4. Repeats validation & vote counting
5. Updates leaderboard
6. Waits until 3:00 PM

**Continues every hour until contest ends December 15, 2025**

### Duplicate Prevention:

- Uses `last_scraped_comment_id` to track last processed comment
- Only processes comments NEWER than last ID
- Checks database for existing votes before inserting
- Prevents same comment from being counted twice

### School Validation (Fuzzy Matching):

**Example Tags:**
- `@KennedyHigh` → Matches **"John F. Kennedy High School"** ✅
- `#SacramentoHS` → Matches **"Sacramento High School"** ✅
- `@RandomSchool` → No match, skipped ❌

**Validation Logic:**
1. Exact match: "Kennedy High School" = "Kennedy High School"
2. Partial match: "Kennedy" → "Kennedy High School"
3. Removes common words (High, School, Middle, Elementary)
4. Compares core names for similarity

---

## 🔧 Advanced Configuration

### Change Scraping Frequency

Edit `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/instagram-scraper-cron",
      "schedule": "0 * * * *"  // Every hour (default)
    }
  ]
}
```

**Other Options:**
- Every 30 minutes: `"*/30 * * * *"`
- Every 2 hours: `"0 */2 * * *"`
- Every 15 minutes: `"*/15 * * * *"`
- Daily at 9 AM: `"0 9 * * *"`

After changing, commit and push to deploy.

### Increase Comment Limit Per Run

Edit `api/instagram-scraper-cron.js` (line 72):

```javascript
const maxPages = 5; // 5 pages x 100 = 500 comments

// Change to:
const maxPages = 10; // 10 pages x 100 = 1000 comments
```

**Warning:** Higher limits = longer execution time. Vercel serverless functions timeout at 10 seconds (free tier) or 60 seconds (pro tier).

### Monitor Scraper Activity

**View Logs:**
1. Go to Vercel Dashboard
2. Select your project
3. Go to **Deployments** → Latest deployment
4. Click **View Function Logs**
5. Filter by `/api/instagram-scraper-cron`

**Look for:**
- `🤖 Instagram scraper cron started`
- `📥 Fetched X comments total`
- `✅ +1 vote for [School Name]`
- `✅ Scraper complete: X new votes added`

### Pause Scraper

**Temporarily disable:**

Update config in Supabase:
```sql
UPDATE teacher_feast_config
SET config_value = 'PAUSED'
WHERE config_key = 'instagram_post_shortcode';
```

Scraper will skip execution until you restore the real shortcode.

**Permanently disable:**

Remove from `vercel.json`:
```json
{
  "crons": [
    // Comment out or delete this entry:
    // {
    //   "path": "/api/instagram-scraper-cron",
    //   "schedule": "0 * * * *"
    // }
  ]
}
```

Commit and push to deploy.

---

## 🧪 Testing

### Test Manual Trigger

```bash
curl -X POST https://jayna-cash-counter.vercel.app/api/instagram-scraper-manual
```

### Test with Sample Post

Before contest goes live, test with a different Instagram post:

1. Find any public Instagram post
2. Get its shortcode from URL
3. Update config temporarily:
   ```sql
   UPDATE teacher_feast_config
   SET config_value = 'TEST_SHORTCODE_HERE'
   WHERE config_key = 'instagram_post_shortcode';
   ```
4. Trigger manual scrape
5. Check if comments are processed
6. Restore to 'PLACEHOLDER' until contest starts

### Verify Votes in Database

```sql
-- View recent votes
SELECT * FROM teacher_feast_votes
WHERE vote_type = 'instagram'
ORDER BY voted_at DESC
LIMIT 20;

-- View leaderboard
SELECT school_name, total_votes, instagram_votes
FROM teacher_feast_schools
ORDER BY total_votes DESC
LIMIT 10;
```

---

## 📱 URLs

**Manual Trigger (for testing anytime):**
```
https://jayna-cash-counter.vercel.app/api/instagram-scraper-manual
```

**Cron Endpoint (runs automatically):**
```
https://jayna-cash-counter.vercel.app/api/instagram-scraper-cron
```

**Public Leaderboard:**
```
https://jayna-cash-counter.vercel.app/teachers-feast-contest.html
```

**Admin Dashboard:**
```
https://jayna-cash-counter.vercel.app/contest-admin.html
```

**CSV Import (backup method):**
```
https://jayna-cash-counter.vercel.app/contest-import.html
```

---

## 🚨 Troubleshooting

### Scraper Not Running

**Check 1: Verify Cron is Configured**
- Go to Vercel Dashboard → Settings → Cron Jobs
- Verify `/api/instagram-scraper-cron` is listed
- Check "Last Run" timestamp

**Check 2: Verify Environment Variables**
- Ensure `SUPABASE_URL` and `SUPABASE_KEY` are set
- Ensure `CRON_SECRET` is set (for cron endpoint)

**Check 3: Check Function Logs**
- Go to Vercel → Deployments → Function Logs
- Look for errors or exceptions

### "No post shortcode configured" Error

Update the shortcode in Supabase:
```sql
UPDATE teacher_feast_config
SET config_value = 'YOUR_SHORTCODE_HERE'
WHERE config_key = 'instagram_post_shortcode';
```

### No New Comments Being Processed

**Possible causes:**
1. All comments already processed (check `last_scraped_comment_id`)
2. No new comments on Instagram post
3. Comments don't contain valid school tags

**Reset last scraped ID to reprocess all comments:**
```sql
UPDATE teacher_feast_config
SET config_value = ''
WHERE config_key = 'last_scraped_comment_id';
```

**Warning:** This will reprocess ALL comments, may create duplicates if duplicate prevention fails.

### Votes Not Showing on Leaderboard

**Check 1: Verify votes were inserted**
```sql
SELECT COUNT(*) FROM teacher_feast_votes
WHERE vote_type = 'instagram';
```

**Check 2: Verify schools table was updated**
```sql
SELECT school_name, instagram_votes
FROM teacher_feast_schools
WHERE instagram_votes > 0
ORDER BY instagram_votes DESC;
```

**Check 3: Check for validation errors**
- Look at manual trigger response
- Check `invalid_tags` count
- May need to add more schools to database

### Instagram Changed Their API

If scraper stops working due to Instagram changes:

**Fallback Option:** Use CSV import method
1. Export comments manually (browser or tool)
2. Upload to `/contest-import.html`
3. Works 100% reliably without API

---

## 💡 Tips

1. **Test before December 1** - Use a different Instagram post to verify everything works
2. **Monitor daily** - Check admin dashboard to ensure scraper is running
3. **Keep CSV as backup** - If scraper fails, you can always use CSV import
4. **Set up alerts** - Configure Vercel to email you if cron fails
5. **Check logs weekly** - Ensure no errors or rate limiting issues

---

## 🎯 Contest Timeline

**November 30, 2025:**
- ✅ Run `sacramento-schools.sql` to load schools
- ✅ Test manual scraper with sample post
- ✅ Verify cron job is configured

**December 1, 2025 (Contest Starts):**
1. Create Instagram contest post
2. Get post shortcode from URL
3. Update `instagram_post_shortcode` in Supabase
4. Trigger manual scrape to test
5. Verify first votes appear on leaderboard
6. ✅ Scraper now runs every hour automatically!

**December 1-15, 2025 (Contest Running):**
- Check admin dashboard daily
- Monitor scraper logs for errors
- CSV import as backup if needed

**December 16, 2025 (Winner Announcement):**
1. Check final leaderboard
2. Export winner from database
3. Announce winner!
4. Optional: Pause scraper

---

## ✅ Checklist

**Before Contest (Nov 30):**
- [ ] Schools SQL loaded in Supabase (~200 schools)
- [ ] Database schema updated with scraper config fields
- [ ] `CRON_SECRET` environment variable added to Vercel
- [ ] Manual scraper tested successfully
- [ ] Cron job verified in Vercel dashboard

**Contest Launch (Dec 1):**
- [ ] Instagram post created
- [ ] Post shortcode added to database config
- [ ] Manual scraper triggered and verified working
- [ ] First votes showing on leaderboard
- [ ] Cron running automatically (check logs)

**During Contest (Dec 1-15):**
- [ ] Daily admin dashboard check
- [ ] Weekly log review for errors
- [ ] CSV backup ready if scraper fails

---

## 🚀 READY TO DEPLOY

All files created and configured:
- ✅ `api/instagram-scraper-cron.js` - Hourly cron job
- ✅ `api/instagram-scraper-manual.js` - Manual trigger
- ✅ `vercel.json` - Cron schedule configured (every hour)
- ✅ `package.json` - Dependencies added
- ✅ `teachers-feast-db-schema.sql` - Config fields added

**Deploy now:**
```bash
git add .
git commit -m "feat(contest): Add automated Instagram comment scraper (hourly)"
git push origin main
```

**Live in 2 minutes!**

---

**System built by Claude with full autonomy ✅**
**Fully automated - runs every hour! ⏰**
**Zero manual work required! 🚀**
