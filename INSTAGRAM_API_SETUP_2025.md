# Instagram Graph API Setup - Updated 2025 Guide

## ✅ What You Have
- Instagram Business Account: **@jaynagyrosac**
- Instagram Profile ID: **553648130**

---

## 🎯 Complete Setup Steps (Current 2025 Process)

### **Step 1: Create Meta Developer App**

1. Go to: **https://developers.facebook.com/**
2. Click **"My Apps"** (top right)
3. Click **"Create App"**
4. Select **"Business"** as app type
5. Fill in:
   - **App Name:** "Jayna Contest Tracker" (Don't use "Instagram" or "Facebook" in name)
   - **Contact Email:** Your email
   - **Business Portfolio:** Create new or select existing
6. Click **"Create App"**
7. **Save your App ID** (you'll see it on dashboard)

---

### **Step 2: Add Facebook Login Product**

1. In your app dashboard, find **"Add Products"** section
2. Find **"Facebook Login"**
3. Click **"Set Up"**
4. Select **"Web"** platform
5. No need to complete all steps - just add the product

---

### **Step 3: Link Instagram to Facebook Page**

Your Instagram Business account MUST be linked to a Facebook Page:

1. Go to your **Facebook Page** for Jayna Gyro
2. Click **Settings** → **Instagram**
3. Click **"Connect Account"**
4. Log in with @jaynagyrosac credentials
5. Authorize the connection

**Don't have a Facebook Page?**
- Create one: https://www.facebook.com/pages/create
- Name it "Jayna Gyro Sacramento"
- Then follow steps above

---

### **Step 4: Get Facebook Page ID**

1. Go to your Facebook Page
2. Click **"About"** tab
3. Scroll down to **"Page transparency"** → **"See More"**
4. Copy the **Page ID** (numbers only)

**OR use this tool:**
- https://lookup-id.com/

---

### **Step 5: Generate Access Token**

#### **5a. Get Short-Lived Token (1 hour)**

1. Go to: **https://developers.facebook.com/tools/explorer/**
2. Select **your app** from dropdown (top right)
3. Click **"Generate Access Token"**
4. Check these permissions:
   - ✅ `instagram_basic`
   - ✅ `pages_show_list`
   - ✅ `instagram_manage_comments`
   - ✅ `pages_read_engagement`
5. Click **"Generate Access Token"**
6. **Copy the token** (save it temporarily)

#### **5b. Exchange for Long-Lived Token (60 days)**

Run this command in terminal (replace placeholders):

```bash
curl -X GET "https://graph.facebook.com/v22.0/oauth/access_token?\
grant_type=fb_exchange_token&\
client_id=YOUR_APP_ID&\
client_secret=YOUR_APP_SECRET&\
fb_exchange_token=YOUR_SHORT_LIVED_TOKEN"
```

**Where to find:**
- `YOUR_APP_ID`: App Dashboard → Settings → Basic → App ID
- `YOUR_APP_SECRET`: App Dashboard → Settings → Basic → App Secret (click "Show")
- `YOUR_SHORT_LIVED_TOKEN`: Token you just generated

**Response:**
```json
{
  "access_token": "EAAxxxxxxxxxxxx",
  "token_type": "bearer",
  "expires_in": 5183999
}
```

**Copy this `access_token`** - this is your **Long-Lived Token** (valid 60 days)!

---

### **Step 6: Get Instagram Business Account ID**

Your Instagram Profile ID (553648130) might work, but you also need the **Instagram Business Account ID**:

Run this in terminal (replace `YOUR_LONG_LIVED_TOKEN` and `YOUR_FACEBOOK_PAGE_ID`):

```bash
curl -X GET "https://graph.facebook.com/v22.0/YOUR_FACEBOOK_PAGE_ID?\
fields=instagram_business_account&\
access_token=YOUR_LONG_LIVED_TOKEN"
```

**Response:**
```json
{
  "instagram_business_account": {
    "id": "17841XXXXXXXXX"
  },
  "id": "YOUR_PAGE_ID"
}
```

**Copy the `instagram_business_account.id`** - this is your **Instagram Business Account ID**!

---

### **Step 7: Add to Vercel Environment Variables**

1. Go to: **https://vercel.com/dashboard**
2. Select **jayna-cash-counter** project
3. Go to **Settings → Environment Variables**
4. Add these:

```bash
INSTAGRAM_ACCESS_TOKEN=EAAxxxxxxxxxxxx
INSTAGRAM_BUSINESS_ACCOUNT_ID=17841XXXXXXXXX
```

5. Click **"Save"**
6. Go to **Deployments** tab
7. Click **"Redeploy"** on latest deployment

---

### **Step 8: Update Instagram Post ID (December 1)**

When you create the contest post:

1. Create post on @jaynagyrosac
2. Pin to profile
3. Copy post ID from URL:
   - URL: `https://instagram.com/p/ABC123xyz/`
   - Post ID: `ABC123xyz`

4. Run in Supabase SQL Editor:
```sql
UPDATE teacher_feast_config
SET config_value = 'ABC123xyz'
WHERE config_key = 'instagram_post_id';
```

---

### **Step 9: Test the Sync**

Visit this URL to trigger Instagram sync:
```
https://jayna-cash-counter.vercel.app/api/instagram-contest-sync
```

**Expected response:**
```json
{
  "success": true,
  "message": "Instagram votes synced successfully",
  "stats": {
    "total_comments_processed": 25,
    "new_votes_added": 15,
    "duplicate_votes_skipped": 3,
    "invalid_tags_skipped": 7,
    "schools_updated": ["School 1", "School 2"]
  }
}
```

---

## 🔄 Token Refresh (Every 60 Days)

Long-lived tokens expire after 60 days. To refresh:

1. Go to: https://developers.facebook.com/tools/explorer/
2. Select your app
3. Generate new token with same permissions
4. Exchange for long-lived token (Step 5b)
5. Update Vercel environment variable
6. Redeploy

**Set a calendar reminder for 50 days from now!**

---

## 🚨 Troubleshooting

### "Invalid OAuth access token"
- Token expired → Generate new one
- Wrong permissions → Re-generate with all 4 permissions

### "Instagram account not found"
- Verify Instagram is linked to Facebook Page
- Check Instagram Business Account ID is correct

### "No comments returned"
- Post ID might be wrong
- Post might not have comments yet
- Account permissions not granted

### "Permission denied"
- App might still be in Development Mode
- For production, may need App Review (but not for your own account)

---

## 📋 Checklist

- [ ] Meta Developer App created
- [ ] Facebook Login product added
- [ ] Instagram linked to Facebook Page
- [ ] Facebook Page ID obtained
- [ ] Short-lived token generated with permissions
- [ ] Long-lived token obtained (60 days)
- [ ] Instagram Business Account ID obtained
- [ ] Environment variables added to Vercel
- [ ] Vercel redeployed
- [ ] Test sync endpoint successful

---

## 🎯 Summary: What I Need

Once you complete the steps above, provide me:

1. **App ID** (from Meta Developer dashboard)
2. **Long-Lived Access Token** (from Step 5b)
3. **Instagram Business Account ID** (from Step 6)

I'll add them to Vercel and the system will be fully automatic!

---

## 📞 Need Help?

If you get stuck on any step, let me know:
- Which step number?
- What error message you see?
- Screenshot if needed

I'll guide you through it!

---

**Updated:** November 21, 2025
**API Version:** Graph API v22.0 (latest 2025)
**Token Validity:** 60 days (must refresh)
