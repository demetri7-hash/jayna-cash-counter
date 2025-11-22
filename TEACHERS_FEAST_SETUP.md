# Jayna Gyro's Great Teacher's Feast - Setup Guide

## Overview
Instagram contest landing page with leaderboard tracking and double-points voting form.

**Contest Dates:**
- Start: December 1, 2025
- Voting Closes: December 15, 2025 at 11:59 PM PST
- Winner Announced: December 16, 2025
- Feast Delivery: January 2026 (when teachers return after Winter Break)

---

## Files Created

1. **`teachers-feast-contest.html`** - Main landing page
2. **`teachers-feast-db-schema.sql`** - Supabase database schema
3. **`api/instagram-contest-sync.js`** - Instagram vote syncing API
4. **`feed-educators-contest-logo.png`** - Contest logo
5. **`jayna-logo.png`** - Jayna Gyro logo

---

## Setup Instructions

### Step 1: Set Up Supabase Database

1. **Go to your Supabase project:** https://supabase.com/dashboard
2. **Open SQL Editor** (left sidebar)
3. **Copy and paste the entire contents** of `teachers-feast-db-schema.sql`
4. **Click "Run"** to execute the SQL
5. **Verify tables created:**
   - `teacher_feast_schools` (participating schools)
   - `teacher_feast_votes` (individual votes)
   - `teacher_feast_newsletter` (newsletter subscribers)
   - `teacher_feast_config` (contest configuration)

### Step 2: Add Sacramento Area Schools

Update the sample schools in the SQL with actual Sacramento schools:

```sql
-- Replace sample schools with real schools
INSERT INTO teacher_feast_schools (school_name, total_votes) VALUES
    ('John F. Kennedy High School', 0),
    ('C.K. McClatchy High School', 0),
    ('Sacramento High School', 0),
    ('Luther Burbank High School', 0),
    ('Hiram Johnson High School', 0),
    ('Rosemont High School', 0),
    ('Grant Union High School', 0),
    ('Laguna Creek High School', 0),
    ('Elk Grove High School', 0),
    ('Sheldon High School', 0)
    -- Add more schools as needed
ON CONFLICT (school_name) DO NOTHING;
```

### Step 3: Configure Environment Variables

Add these to your Vercel environment variables:

```bash
# Already exists (from current project)
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key

# NEW - Instagram API (Optional, for automated tracking)
INSTAGRAM_ACCESS_TOKEN=your_instagram_access_token
INSTAGRAM_POST_ID=actual_post_id_when_created
```

### Step 4: Update HTML with Supabase Credentials

Edit `teachers-feast-contest.html` line ~585:

```javascript
// Replace these placeholders
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_KEY = 'your_anon_public_key_here';
```

**Get your Supabase credentials:**
1. Go to Supabase Dashboard → Settings → API
2. Copy "Project URL" → paste as `SUPABASE_URL`
3. Copy "anon public" key → paste as `SUPABASE_KEY`

### Step 5: Create Instagram Contest Post

1. **Create the contest post** on @jaynagyrosac Instagram
2. **Pin the post** to your profile
3. **Copy the post ID** from the URL:
   - Example URL: `https://instagram.com/p/ABC123xyz/`
   - Post ID: `ABC123xyz`
4. **Update Supabase config:**

```sql
UPDATE teacher_feast_config
SET config_value = 'ABC123xyz'
WHERE config_key = 'instagram_post_id';
```

---

## Instagram Vote Tracking Options

You have **3 options** for tracking Instagram tags:

### Option 1: Manual Tracking (Easiest)
- Manually check Instagram comments daily
- Add votes directly in Supabase:

```sql
-- Example: Add Instagram vote for Sacramento High School
INSERT INTO teacher_feast_votes (school_name, vote_type, points, instagram_username, voted_at)
VALUES ('Sacramento High School', 'instagram', 1, 'username_here', NOW());

-- Then increment school total
SELECT increment_school_votes('Sacramento High School', 1);
```

### Option 2: Instagram Graph API (Requires Business Account)
1. Convert @jaynagyrosac to **Business Account**
2. Create **Facebook App**: https://developers.facebook.com
3. Link Instagram account to Facebook App
4. Get **Access Token** with `instagram_basic` permissions
5. Add to environment variables:
   ```bash
   INSTAGRAM_ACCESS_TOKEN=your_token_here
   ```
6. Call sync endpoint: `https://jayna-cash-counter.vercel.app/api/instagram-contest-sync`

### Option 3: Third-Party Service (Paid)
Use services like:
- **Apify** (Instagram scraper)
- **RapidAPI** (Instagram APIs)
- **PhantomBuster** (Instagram automation)

---

## Testing Locally

1. **Start local server:**
   ```bash
   python3 -m http.server 8000
   ```

2. **Open in browser:**
   ```
   http://localhost:8000/teachers-feast-contest.html
   ```

3. **Test voting form:**
   - Select a school
   - Fill in name, email, phone
   - Check newsletter box
   - Submit
   - Verify leaderboard updates

4. **Check Supabase:**
   - Go to Table Editor → `teacher_feast_votes`
   - Verify new row with `vote_type = 'form'` and `points = 2`
   - Check `teacher_feast_schools` → verify `total_votes` incremented by 2

---

## Deploying to Production

The page will automatically deploy to Vercel when you push to GitHub:

```bash
git add teachers-feast-contest.html teachers-feast-db-schema.sql TEACHERS_FEAST_SETUP.md api/instagram-contest-sync.js feed-educators-contest-logo.png jayna-logo.png
git commit -m "feat(contest): Add Great Teacher's Feast landing page with voting system"
git push origin main
```

**Live URL (after deploy):**
```
https://jayna-cash-counter.vercel.app/teachers-feast-contest.html
```

---

## Custom Domain Setup (Optional)

To use a custom domain like `teachersfeast.jaynagyro.com`:

1. **Go to Vercel Dashboard** → Your Project → Settings → Domains
2. **Add domain:** `teachersfeast.jaynagyro.com`
3. **Add DNS records** in your domain registrar:
   ```
   Type: CNAME
   Name: teachersfeast
   Value: cname.vercel-dns.com
   ```
4. **Wait for DNS propagation** (5-30 minutes)

---

## Monitoring & Maintenance

### Daily Tasks (During Contest)
1. **Check leaderboard** is updating
2. **Monitor for spam votes** in Supabase
3. **Track Instagram tags** (manual or automated)
4. **Respond to Instagram comments**

### Checking Votes in Database

```sql
-- View current leaderboard
SELECT * FROM get_leaderboard(10);

-- View recent votes
SELECT * FROM teacher_feast_votes
ORDER BY voted_at DESC
LIMIT 20;

-- View votes by school
SELECT school_name, COUNT(*), SUM(points)
FROM teacher_feast_votes
GROUP BY school_name
ORDER BY SUM(points) DESC;

-- View newsletter signups
SELECT * FROM teacher_feast_newsletter
ORDER BY subscribed_at DESC;
```

### Preventing Fraud

The system has built-in fraud prevention:
- **Duplicate detection:** `is_duplicate_vote()` function (1-hour window)
- **Email tracking:** Each email can vote once per hour
- **Instagram comment ID:** Each comment processed only once
- **Manual review:** Check `teacher_feast_votes` table for suspicious patterns

To delete fraudulent votes:

```sql
-- Delete specific vote
DELETE FROM teacher_feast_votes WHERE id = 'uuid_here';

-- Recalculate school totals
UPDATE teacher_feast_schools
SET total_votes = (
    SELECT COALESCE(SUM(points), 0)
    FROM teacher_feast_votes
    WHERE school_name = teacher_feast_schools.school_name
);
```

---

## Winner Selection (December 16, 2025)

1. **Run final leaderboard query:**
   ```sql
   SELECT * FROM get_leaderboard(1); -- Get winner
   ```

2. **Export winner data:**
   ```sql
   SELECT
       s.school_name,
       s.total_votes,
       s.form_votes,
       s.instagram_votes,
       COUNT(DISTINCT v.email) as unique_voters
   FROM teacher_feast_schools s
   LEFT JOIN teacher_feast_votes v ON s.school_name = v.school_name
   WHERE s.school_name = 'WINNING_SCHOOL_NAME'
   GROUP BY s.school_name, s.total_votes, s.form_votes, s.instagram_votes;
   ```

3. **Export newsletter list:**
   ```sql
   SELECT email, full_name, phone, school_name
   FROM teacher_feast_newsletter
   WHERE is_active = true
   ORDER BY subscribed_at;
   ```

---

## Troubleshooting

### Leaderboard Not Showing
- Check browser console for errors
- Verify Supabase URL and key in HTML
- Check Supabase Row Level Security policies are enabled
- Verify schools exist in `teacher_feast_schools` table

### Votes Not Counting
- Check `teacher_feast_votes` table for error messages
- Verify `increment_school_votes()` function exists
- Check for duplicate votes (email/comment ID already used)
- Ensure school name matches exactly in database

### Form Not Submitting
- Check browser console for JavaScript errors
- Verify all required fields filled
- Check network tab for API errors
- Ensure newsletter checkbox is checked

### Instagram Sync Not Working
- Verify Instagram post ID is correct
- Check Instagram Access Token is valid
- Ensure Instagram account is Business Account
- Check API endpoint logs in Vercel dashboard

---

## Contest Marketing

### Share Links
- Direct link: `https://jayna-cash-counter.vercel.app/teachers-feast-contest.html`
- QR Code: Generate at https://qr-code-generator.com

### Social Media Copy
```
🎉 VOTE NOW for Jayna Gyro's Great Teacher's Feast! 🍽️

Help your favorite Sacramento school WIN a catering feast for all teachers!

🗳️ Vote 2 ways:
1️⃣ Tag your school on our Instagram post (1 point)
2️⃣ Vote on our website (2 POINTS!)

Contest runs Dec 1-15. Winner announced Dec 16!

🔗 Vote now: [YOUR_LINK_HERE]

#SacramentoTeachers #GreatTeachersFeast #JaynaGyro
```

---

## Support

For technical issues:
- Check this guide first
- Review Supabase logs
- Check Vercel deployment logs
- Test in browser console

---

**Created:** November 21, 2025
**Contest Platform:** Supabase + Vercel
**Voting Methods:** Instagram tags (1 pt) + Web form (2 pts)
**Winner Prize:** Catering feast for all teachers (donated by Jayna Gyro Sacramento)
