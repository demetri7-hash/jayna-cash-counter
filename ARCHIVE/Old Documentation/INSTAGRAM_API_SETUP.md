# Instagram Business API Setup for Contest

## What You Need to Provide

Since you already have an **Instagram Business Account** (@jaynagyrosac), here's what I need to complete the automated Instagram tag tracking:

---

## Step 1: Get Your Instagram Business Account ID

1. Go to: https://www.instagram.com/jaynagyrosac/
2. View page source (Right-click → View Page Source)
3. Search for: `"profilePage_"`
4. Copy the number after it (that's your Instagram Business ID)

**Example:** `profilePage_123456789` → Your ID is `123456789`

**OR use this tool:**
- https://codeofaninja.com/tools/find-instagram-user-id/

---

## Step 2: Create Facebook App (Required for Instagram API)

Instagram Graph API requires a Facebook App:

### 2a. Create Facebook Developer Account
1. Go to: https://developers.facebook.com
2. Click **"Get Started"**
3. Complete registration
4. Verify your account (email/phone)

### 2b. Create New App
1. Go to: https://developers.facebook.com/apps
2. Click **"Create App"**
3. Select **"Business"** type
4. Fill in:
   - **App Name:** "Jayna Gyro Contest Tracker"
   - **Contact Email:** Your email
   - **Business Account:** Select or create one
5. Click **"Create App"**

### 2c. Add Instagram Graph API
1. In your new app dashboard
2. Click **"Add Product"**
3. Find **"Instagram Graph API"**
4. Click **"Set Up"**

---

## Step 3: Link Instagram Business Account

1. Go to **App Settings → Basic** (left sidebar)
2. Note your **App ID** and **App Secret** (you'll need these)
3. Go to **Instagram Graph API → Settings**
4. Click **"Add Instagram Account"**
5. Log in to Facebook account connected to @jaynagyrosac
6. Select **@jaynagyrosac** Instagram Business Account
7. Grant permissions

---

## Step 4: Generate Access Token

### Short-Lived Token (expires in 1 hour - for testing)
1. Go to: https://developers.facebook.com/tools/explorer/
2. Select your app from dropdown
3. Click **"Generate Access Token"**
4. Grant permissions:
   - `instagram_basic`
   - `instagram_manage_comments`
   - `pages_read_engagement`
5. Copy the token

### Long-Lived Token (expires in 60 days - for production)

Run this in terminal (replace placeholders):

```bash
curl -X GET "https://graph.facebook.com/v18.0/oauth/access_token?\
grant_type=fb_exchange_token&\
client_id=YOUR_APP_ID&\
client_secret=YOUR_APP_SECRET&\
fb_exchange_token=YOUR_SHORT_LIVED_TOKEN"
```

**Response:**
```json
{
  "access_token": "LONG_LIVED_TOKEN_HERE",
  "token_type": "bearer",
  "expires_in": 5183999
}
```

Save this **LONG_LIVED_TOKEN** - you'll add it to Vercel.

---

## Step 5: Add Credentials to Vercel

1. Go to: https://vercel.com/dashboard
2. Select **jayna-cash-counter** project
3. Go to **Settings → Environment Variables**
4. Add these variables:

```bash
INSTAGRAM_ACCESS_TOKEN=your_long_lived_token_here
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_instagram_id_here
```

5. Click **"Save"**
6. Redeploy (Settings → Deployments → Redeploy)

---

## Step 6: Test the API

### Create Contest Post (December 1)
1. Create Instagram post on @jaynagyrosac
2. Pin to profile
3. Copy post ID from URL:
   - URL: `https://instagram.com/p/ABC123xyz/`
   - Post ID: `ABC123xyz`

### Update Database with Post ID

```sql
UPDATE teacher_feast_config
SET config_value = 'ABC123xyz'
WHERE config_key = 'instagram_post_id';
```

### Manually Trigger Sync

Visit this URL in browser:
```
https://jayna-cash-counter.vercel.app/api/instagram-contest-sync
```

You should see response:
```json
{
  "success": true,
  "message": "Instagram votes synced successfully",
  "stats": {
    "total_comments_processed": 15,
    "new_votes_added": 8,
    "duplicate_votes_skipped": 0,
    "invalid_tags_skipped": 7,
    "schools_updated": ["School Name 1", "School Name 2"]
  }
}
```

---

## Alternative: No Instagram API (Manual Mode)

If you don't want to set up Instagram API, you can track votes manually:

### Option 1: Manual Database Entry

Check Instagram comments daily and add votes:

```sql
-- Add Instagram vote for a school
INSERT INTO teacher_feast_votes (
  school_name,
  vote_type,
  points,
  instagram_username,
  instagram_comment_id,
  voted_at
) VALUES (
  'Kennedy High School',
  'instagram',
  1,
  'username_from_instagram',
  'comment_' || gen_random_uuid()::text,
  NOW()
);

-- Then increment school total
SELECT increment_school_votes('Kennedy High School', 1);
```

### Option 2: Bulk Import via CSV

1. Export Instagram comments to spreadsheet
2. Prepare CSV:
   ```
   school_name,instagram_username,timestamp
   Kennedy High School,user1,2025-12-05
   Sacramento High,user2,2025-12-05
   ```
3. Import to Supabase (Table Editor → Import Data)

---

## What Happens With API Setup

✅ **Automatic syncing** - No manual work needed
✅ **Duplicate prevention** - Same comment never counted twice
✅ **Invalid tag filtering** - Only schools in your database count
✅ **Real-time updates** - Run sync endpoint anytime
✅ **Fraud detection** - Logs invalid tags for review

### Syncing Options:

**Manual (recommended during contest):**
```bash
# Run this URL in browser daily
https://jayna-cash-counter.vercel.app/api/instagram-contest-sync
```

**Automated (via cron job - optional):**
Use a service like:
- **Vercel Cron** (built-in, free)
- **EasyCron** (free tier: 5 min intervals)
- **Cron-Job.org** (free)

Configure to call your sync endpoint every 15-30 minutes.

---

## Summary: What I Need From You

Please provide:

1. **Instagram Business Account ID**
   (Find via page source or ID lookup tool)

2. **Facebook App ID + App Secret**
   (Create app at developers.facebook.com)

3. **Long-Lived Access Token**
   (Generate via Graph API Explorer → exchange for long-lived)

Once you provide these, I'll add them to Vercel environment variables and the system will automatically track Instagram tags with full validation - zero manual work needed!

---

## Questions?

- **Do I need a Facebook Page?** Yes, Instagram Business requires linked Facebook Page
- **Does my Instagram need to be Business?** Yes (yours already is)
- **Can I use Personal Instagram?** No, must be Business/Creator account
- **How long does setup take?** 15-20 minutes if you have Facebook Page
- **Is this free?** Yes, Instagram Graph API is free for basic usage
- **Token expires?** Yes, every 60 days - need to refresh (I can help)

---

**Created:** November 21, 2025
**Platform:** Instagram Graph API v18.0
**Account:** @jaynagyrosac (Instagram Business)
