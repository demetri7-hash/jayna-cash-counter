# Jayna Gyro's Great Teacher's Feast - Quick Start

## 🚀 Quick Setup (5 Steps)

### 1️⃣ Set Up Database
```sql
-- Go to Supabase SQL Editor and run:
-- Copy entire contents of teachers-feast-db-schema.sql and click "Run"
```

### 2️⃣ Add Your Schools
```sql
-- Replace sample schools with Sacramento schools
INSERT INTO teacher_feast_schools (school_name, total_votes) VALUES
    ('Your School Name 1', 0),
    ('Your School Name 2', 0),
    ('Your School Name 3', 0)
    -- Add more...
ON CONFLICT (school_name) DO NOTHING;
```

### 3️⃣ Update HTML with Supabase Credentials
Edit `teachers-feast-contest.html` line ~585:
```javascript
const SUPABASE_URL = 'https://kcvepnjzlckcdwqfvdmm.supabase.co'; // Your Supabase URL
const SUPABASE_KEY = 'your_anon_key_here'; // Your anon key
```

Find your credentials:
- Supabase Dashboard → Settings → API
- Copy "Project URL" and "anon public" key

### 4️⃣ Create Instagram Post
1. Post contest on @jaynagyrosac
2. Pin to profile
3. Copy post ID from URL: `instagram.com/p/POST_ID/`
4. Update in database:
```sql
UPDATE teacher_feast_config
SET config_value = 'YOUR_POST_ID'
WHERE config_key = 'instagram_post_id';
```

### 5️⃣ Deploy
```bash
git add .
git commit -m "feat(contest): Add Great Teacher's Feast contest"
git push origin main
```

**Live URL:** `https://jayna-cash-counter.vercel.app/teachers-feast-contest.html`

---

## 📊 Tracking Instagram Votes

### Option A: Manual (Easiest)
Check Instagram daily and add votes in Supabase:
```sql
INSERT INTO teacher_feast_votes (school_name, vote_type, points, instagram_username)
VALUES ('School Name', 'instagram', 1, 'username_here');

SELECT increment_school_votes('School Name', 1);
```

### Option B: Automated (Requires Instagram Business Account)
1. Convert to Business Account
2. Create Facebook App
3. Get Access Token
4. Add to Vercel environment variables:
   ```
   INSTAGRAM_ACCESS_TOKEN=your_token
   ```
5. Call: `/api/instagram-contest-sync`

---

## 🎯 Contest Rules

- **Dates:** Dec 1-15, 2025
- **Instagram tags:** 1 point each
- **Form votes:** 2 points each (requires email signup)
- **Leaderboard:** Top 5 schools shown
- **Winner:** Announced Dec 16, 2025
- **Prize:** Catering feast for all teachers (January 2026)

---

## 📱 Sharing

**Direct Link:**
```
https://jayna-cash-counter.vercel.app/teachers-feast-contest.html
```

**Social Media Copy:**
```
🎉 Vote for Jayna Gyro's Great Teacher's Feast!

Help your Sacramento school WIN a catering feast for all teachers!

Vote 2 ways:
✅ Tag on Instagram (1 pt)
✅ Vote on website (2 pts!)

Dec 1-15 | Winner announced Dec 16

🔗 [LINK]
```

---

## ✅ Testing Checklist

- [ ] Database tables created
- [ ] Schools added to database
- [ ] Supabase credentials updated in HTML
- [ ] Page loads locally (http://localhost:8000/teachers-feast-contest.html)
- [ ] Test form submission (check database)
- [ ] Leaderboard displays correctly
- [ ] Countdown timer working
- [ ] Instagram post created and ID updated
- [ ] Deployed to production
- [ ] Production page tested

---

## 📞 Support

**Full Guide:** See `TEACHERS_FEAST_SETUP.md`

**Database Queries:**
```sql
-- View leaderboard
SELECT * FROM get_leaderboard(5);

-- View recent votes
SELECT * FROM teacher_feast_votes ORDER BY voted_at DESC LIMIT 20;

-- Export newsletter list
SELECT * FROM teacher_feast_newsletter WHERE is_active = true;
```

**Local Testing:**
```bash
python3 -m http.server 8000
# Visit: http://localhost:8000/teachers-feast-contest.html
```
