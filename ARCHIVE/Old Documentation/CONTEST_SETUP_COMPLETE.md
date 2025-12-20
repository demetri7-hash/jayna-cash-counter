# Contest System - Complete Setup Guide

## ✅ SYSTEM READY - What's Been Built

### 📁 Files Created:

1. **`sacramento-schools.sql`** - 200+ Sacramento schools database
2. **`contest-import.html`** - CSV import tool (drag & drop)
3. **`contest-admin.html`** - Admin dashboard
4. **`api/contest-csv-import.js`** - CSV processing endpoint
5. **`api/contest-apify-webhook.js`** - Apify webhook handler

### 🎯 Two Methods Available:

**Method A: Manual CSV Import** (Recommended - 100% reliable)
**Method B: Apify Automation** (Optional - fully automated)

---

## 🚀 SETUP STEPS (5 Minutes)

### Step 1: Load Schools Database

```bash
# Run this in Supabase SQL Editor:
```

1. Open Supabase: https://supabase.com/dashboard
2. Go to SQL Editor
3. Open file: `sacramento-schools.sql`
4. Copy entire contents
5. Paste into SQL Editor
6. Click "Run"
7. ✅ Verify: Check `teacher_feast_schools` table (should have ~200 schools)

---

### Step 2: Test CSV Import Tool

**Live URL (after deployment):**
```
https://jayna-cash-counter.vercel.app/contest-import.html
```

**Features:**
- Drag & drop CSV files
- Automatic school validation
- Shows results instantly
- Logs invalid tags

---

### Step 3: Access Admin Dashboard

**Live URL (after deployment):**
```
https://jayna-cash-counter.vercel.app/contest-admin.html
```

**Shows:**
- Total votes
- Instagram vs Form breakdown
- Top 10 schools
- Recent activity

---

## 📊 METHOD A: CSV Import (Recommended)

### How to Use:

**Every 1-2 days during contest:**

1. **Export Comments from Instagram:**
   - Use browser or Instagram app
   - Copy comments manually
   - OR use free tool: https://exportcomments.com/

2. **Create CSV:**
   ```csv
   username,text,id
   user1,#KennedyHigh go teachers!,comment1
   user2,@SacramentoHigh best school,comment2
   ```

3. **Upload to Import Tool:**
   - Go to: `/contest-import.html`
   - Drag & drop CSV
   - Click "Process"
   - Done!

**Time:** 5 minutes every 1-2 days

---

## 🤖 METHOD B: Apify Automation (Optional)

### Setup (15 minutes, then automatic):

1. **Create Free Apify Account:**
   - Go to: https://apify.com
   - Sign up (free tier: $5 credit/month)

2. **Create Instagram Comment Scraper:**
   - Go to Apify Console
   - Search: "Instagram Comment Scraper"
   - Click "Try for free"

3. **Configure Scraper:**
   ```json
   {
     "postUrls": ["https://instagram.com/p/YOUR_POST_ID/"],
     "resultsLimit": 1000
   }
   ```

4. **Set Up Webhook:**
   - In Apify scraper settings
   - Add webhook URL:
   ```
   https://jayna-cash-counter.vercel.app/api/contest-apify-webhook
   ```

5. **Schedule:**
   - Run every: 6 hours
   - Or: Manual trigger anytime

6. **Done!**
   - Scraper runs automatically
   - Sends data to webhook
   - Votes added automatically
   - Check admin dashboard

---

## 🔍 How It Works

### Validation Logic:

1. **Extract Tags:**
   - Looks for `@SchoolName` or `#SchoolName`

2. **Validate Against Database:**
   - Exact match: "Kennedy High School" = "Kennedy High School" ✅
   - Fuzzy match: "Kennedy" → "Kennedy High School" ✅
   - Invalid: "RandomSchool" → Rejected ❌

3. **Add Vote:**
   - Only valid schools counted
   - Duplicates prevented
   - Invalid tags logged

### Example:

**Comment:** "Vote for @KennedyHigh and #SacramentoHS!"

**Processing:**
1. Extracts: "KennedyHigh", "SacramentoHS"
2. Fuzzy matches:
   - "KennedyHigh" → "John F. Kennedy High School" ✅
   - "SacramentoHS" → "Sacramento High School" ✅
3. Adds 2 votes

---

## 📱 URLs

**Public Leaderboard:**
```
https://jayna-cash-counter.vercel.app/teachers-feast-contest.html
```

**CSV Import Tool:**
```
https://jayna-cash-counter.vercel.app/contest-import.html
```

**Admin Dashboard:**
```
https://jayna-cash-counter.vercel.app/contest-admin.html
```

**Apify Webhook:**
```
https://jayna-cash-counter.vercel.app/api/contest-apify-webhook
```

---

## 🧪 Testing

### Test CSV Import:

Create file `test.csv`:
```csv
username,text,id
testuser,#KennedyHigh best school!,test1
testuser2,@SacramentoHigh go teachers,test2
```

Upload to import tool → Should add 2 votes

### Test Apify Webhook:

```bash
curl -X POST https://jayna-cash-counter.vercel.app/api/contest-apify-webhook \
  -H "Content-Type: application/json" \
  -d '[{
    "ownerUsername": "testuser",
    "text": "#KennedyHigh",
    "id": "test123"
  }]'
```

Should return:
```json
{
  "success": true,
  "stats": {
    "new_votes": 1,
    "schools_updated": ["John F. Kennedy High School"]
  }
}
```

---

## 📊 Database Queries

### View All Votes:
```sql
SELECT * FROM teacher_feast_votes
ORDER BY voted_at DESC
LIMIT 20;
```

### View Leaderboard:
```sql
SELECT school_name, total_votes, instagram_votes, form_votes
FROM teacher_feast_schools
ORDER BY total_votes DESC
LIMIT 10;
```

### Manual Vote Entry (if needed):
```sql
INSERT INTO teacher_feast_votes (school_name, vote_type, points, instagram_username)
VALUES ('Kennedy High School', 'instagram', 1, 'username_here');

SELECT increment_school_votes('Kennedy High School', 1);
```

---

## 🎯 Recommended Workflow

**Before Contest (Nov 30):**
1. ✅ Run schools SQL
2. ✅ Test CSV import
3. ✅ Decide: CSV or Apify?
4. ✅ If Apify: Set up account + webhook

**During Contest (Dec 1-15):**

**If using CSV:**
- Every 1-2 days: Export comments → Upload CSV → Done (5 min)

**If using Apify:**
- Check admin dashboard daily
- Apify runs automatically
- CSV as backup if Apify fails

**After Contest (Dec 16):**
1. Check admin dashboard
2. Export final results
3. Announce winner!

---

## ✅ Checklist

- [ ] Schools SQL loaded in Supabase (~200 schools)
- [ ] CSV import tool tested
- [ ] Admin dashboard accessible
- [ ] Method chosen (CSV or Apify)
- [ ] If Apify: Account created + webhook configured
- [ ] Test vote added successfully

---

## 🚀 READY TO DEPLOY

All files created. Run:

```bash
git add .
git commit -m "feat(contest): Complete CSV import & Apify automation system"
git push origin main
```

**Live in 2 minutes!**

---

## 💡 Tips

1. **Start with CSV** - It's simpler and 100% reliable
2. **Add Apify later** if you want automation
3. **Check admin dashboard** daily during contest
4. **CSV is backup** even if using Apify
5. **Test before Dec 1!**

---

**System built by Claude with full autonomy ✅**
**Ready for production deployment! 🚀**
