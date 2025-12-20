# Instagram Contest - Revised Implementation Plan

## 🎯 What You Need
Track ONE Instagram post's comments, extract school tags, validate against Sacramento schools database, count as votes.

---

## 📊 Research Findings (November 2025)

### Instagram Scraping Options

**Option 1: Serverless Instagram Scraper (Easiest)**
- Library: `senthilsweb/instagram-scraper` (Node.js)
- Works on Vercel/serverless platforms
- **Problem:** Vercel free tier has 10-second timeout (may not be enough for many comments)
- **Risk:** Instagram may block serverless IPs

**Option 2: Manual CSV Export + Import (Most Reliable)**
- Use browser extension: "IG Exporter & Scraper" (free Chrome extension)
- Export comments to CSV
- Import CSV to our system
- **Pro:** No API, no blocking, works 100%
- **Con:** Manual process (5 minutes per day)

**Option 3: Third-Party Service (Apify)**
- Apify Instagram Comment Scraper
- Free tier: $5 credit/month (enough for daily scraping)
- Webhook integration available
- **Pro:** Fully automated, reliable
- **Con:** Requires Apify account

---

## 🏫 Sacramento Schools Database

**Source:** California Department of Education (CDE)
- Official database: https://www.cde.ca.gov/schooldirectory/
- **58 public charter schools** in Sacramento County
- Plus all public elementary, middle, high schools
- Plus private schools

**Data Available:**
- School names
- Addresses
- Districts
- Grade levels

**Our Approach:**
1. Download full Sacramento County schools list from CDE
2. Load into `teacher_feast_schools` table
3. Use fuzzy matching for validation

---

## ✅ Recommended Solution (Hybrid Approach)

### **Phase 1: Populate Schools Database (Do Once)**

```sql
-- Load all Sacramento schools into database
INSERT INTO teacher_feast_schools (school_name) VALUES
  -- Elementary Schools
  ('Abraham Lincoln Elementary School'),
  ('Albert Einstein Elementary School'),
  -- ... (full list from CDE database)

  -- Middle Schools
  ('California Middle School'),
  ('Sutter Middle School'),
  -- ... (full list)

  -- High Schools
  ('C.K. McClatchy High School'),
  ('John F. Kennedy High School'),
  ('Sacramento High School'),
  -- ... (full list)

  -- Charter Schools
  ('Capital College & Career Academy'),
  ('Sacramento Charter High'),
  -- ... (full list - 58 charter schools)

  -- Private Schools
  ('Christian Brothers High School'),
  ('Jesuit High School'),
  -- ... (full list)
ON CONFLICT (school_name) DO NOTHING;
```

### **Phase 2: Comment Collection (Choose One)**

#### **Method A: Manual CSV Import (Recommended for Reliability)**

**Every 1-2 days during contest:**

1. Install Chrome extension: **IG Exporter & Scraper**
   - https://chromewebstore.google.com/detail/ig-exporter-scraper/

2. Visit your contest post on Instagram

3. Click extension icon → Export Comments → Download CSV

4. Upload CSV to our import tool (we'll build this)

5. System automatically:
   - Parses comments
   - Extracts school tags
   - Validates against database
   - Adds valid votes
   - Logs invalid tags

**Time:** 5 minutes every 1-2 days

---

#### **Method B: Apify Automated Scraper (Recommended for Automation)**

**Setup (one time):**

1. Create Apify account (free): https://apify.com
2. Use "Instagram Comment Scraper" actor
3. Configure:
   - Input: Your Instagram post URL
   - Schedule: Run every 6 hours
   - Webhook: Call our Vercel endpoint with results

**Our API endpoint:**
- `/api/instagram-apify-webhook`
- Receives comment data from Apify
- Validates against schools database
- Adds votes automatically

**Cost:** Free tier ($5/month credit) is enough for daily scraping

---

### **Phase 3: Validation Logic (Already Built!)**

We already have this in `api/instagram-contest-sync.js`:
- ✅ Fuzzy matching (handles variations)
- ✅ Exact matching
- ✅ Duplicate prevention
- ✅ Invalid tag logging

Just needs slight modification to work with CSV import or Apify webhook.

---

## 🔨 Implementation Tasks

### Task 1: Get Sacramento Schools List

**I'll do this:**
1. Scrape CDE school directory for Sacramento County
2. Create SQL file with all schools
3. You run it in Supabase

**Result:** Database populated with ~300-500 schools

---

### Task 2: Build CSV Import Tool

**I'll create:**
- Web page: `/contest-import.html`
- Upload CSV from Instagram
- Parse comments
- Validate schools
- Show results (X valid votes, Y invalid tags)
- Add to database

**You use it:**
- Every 1-2 days during contest
- Takes 5 minutes

---

### Task 3: OR Build Apify Integration

**I'll create:**
- `/api/instagram-apify-webhook.js`
- Receives data from Apify
- Same validation logic
- Fully automated

**You set up:**
- Apify account (free)
- Schedule scraper
- Point webhook to our API

**Result:** 100% automated, runs every 6 hours

---

## 💰 Cost Comparison

| Method | Cost | Manual Work | Reliability |
|--------|------|-------------|-------------|
| **CSV Import** | $0 | 5 min every 1-2 days | 100% |
| **Apify Free Tier** | $0 (free credits) | 10 min setup, then automatic | 95% |
| **Apify Paid** | $49/month | 10 min setup, then automatic | 99% |

---

## 🎯 My Recommendation

**Start with CSV Import Method:**
- Zero cost
- 100% reliable
- Works immediately
- 5 minutes every 1-2 days is reasonable for 2-week contest

**If you want automation:**
- Set up Apify free tier
- Takes 15 minutes
- Then it's fully automatic

---

## 📅 Timeline

**Today:**
1. I scrape Sacramento schools list → SQL file
2. You run SQL in Supabase (2 minutes)
3. Database populated

**Tomorrow:**
1. I build CSV import tool
2. You test with sample CSV
3. Ready for Dec 1!

**Alternative (if you want Apify):**
1. I build Apify webhook endpoint
2. You create Apify account
3. Configure scraper
4. Done!

---

## ❓ Your Decision

**Which method do you prefer?**

**A) CSV Import** (manual, free, reliable)
- I build import tool today
- You export/import every 1-2 days
- Takes 5 minutes each time

**B) Apify Automation** (automated, free tier, mostly reliable)
- I build webhook endpoint today
- You set up Apify account
- 100% automatic after setup

**C) Both** (best of both worlds)
- I build both tools
- Use Apify for automation
- CSV import as backup if Apify fails

Which sounds best to you?
