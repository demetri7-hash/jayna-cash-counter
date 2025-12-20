# How to Get Your Instagram Session Cookie

Instagram is blocking unauthenticated API requests. To allow the contest scraper to access post comments, you need to provide your Instagram session cookie.

## What is a Session Cookie?

A session cookie is a temporary authentication token that proves you're logged into Instagram. It allows the scraper to make authenticated requests on your behalf (read-only, safe).

**Security Note:** Your session cookie is like a temporary password. Only add it to trusted databases (your own Supabase instance).

---

## Step-by-Step Instructions

### 1. Log into Instagram in Your Browser

1. Open Google Chrome (or any browser)
2. Go to https://www.instagram.com
3. Log in with your Instagram account
4. Navigate to the contest post: https://www.instagram.com/p/DRamJE-kg41/

### 2. Open Browser Developer Tools

**Chrome/Edge:**
- Press `F12` or `Ctrl+Shift+I` (Windows/Linux)
- Or `Cmd+Option+I` (Mac)
- Or right-click anywhere → "Inspect"

**Firefox:**
- Press `F12` or `Ctrl+Shift+I`

**Safari:**
- Enable Developer Menu: Safari → Preferences → Advanced → Show Develop menu
- Press `Cmd+Option+I`

### 3. Find Your Session Cookie

1. In Developer Tools, click the **"Application"** tab (Chrome/Edge) or **"Storage"** tab (Firefox)
2. In the left sidebar, expand **"Cookies"**
3. Click on **"https://www.instagram.com"**
4. Look for a cookie named **`sessionid`**
5. Click on it to select the row
6. Copy the **Value** (long string of letters and numbers)

**Example value format:**
```
1234567890%3ABCDEFG%3A28%3AHijklmnop%3AqrstuvWXYZ
```

### 4. Add Session Cookie to Contest Config

1. Go to: https://jayna-cash-counter.vercel.app/contest-scraper-config.html
2. Scroll to **"Instagram Session Cookie"** field
3. Paste the session cookie value
4. Click **"Save Config"**

### 5. Test the Scraper

1. Click **"TEST SCRAPER"** button
2. Check browser console (F12 → Console tab)
3. You should see: `🔐 Using authenticated session cookie`
4. Followed by: `✅ Success with [endpoint name]!`

---

## Troubleshooting

### "Your session cookie may be expired"

**Session cookies expire after ~90 days or when you log out.**

**Solution:** Repeat steps 1-4 to get a fresh session cookie.

### "Instagram returned error 1357055"

This means Instagram is blocking the request (rate limit or suspicious activity).

**Solutions:**
1. Wait 10-15 minutes before trying again (rate limit cooldown)
2. Make sure you're using the correct session cookie
3. Try logging out and back into Instagram, then get a new cookie
4. Use the CSV Import method as backup

### "Failed to save config: RLS error"

You need to disable Row-Level Security on the database tables.

**Solution:** Run the SQL script in Supabase:
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Open `teacher-feast-rls-fix.sql`
4. Click "Run"

---

## Security Best Practices

### ✅ Safe:
- Using your own Instagram account's session cookie
- Storing it in your private Supabase database
- Using it for read-only operations (fetching comments)

### ❌ Never:
- Share your session cookie with others
- Commit it to git repositories
- Use someone else's session cookie without permission
- Store it in plain text files on your computer

### Session Cookie Expiration:
- Instagram session cookies typically last **60-90 days**
- They expire when you log out of Instagram
- They expire if Instagram detects suspicious activity
- You'll need to refresh it periodically

---

## Alternative: CSV Import Method

If you prefer not to use session cookies, you can manually import comments:

1. Go to the Instagram post on your phone
2. Screenshot all comments (scroll through all pages)
3. Use the CSV Import feature in the contest config page
4. Upload a CSV with columns: `instagram_username, school_tagged`

**CSV Format Example:**
```csv
instagram_username,school_tagged
user123,Lincoln High School
user456,Washington Middle School
```

---

## How Long Will This Work?

Instagram frequently changes their API to block scrapers. This solution should work for several months, but may require updates if Instagram changes their authentication system.

**Backup Plan:** The CSV import method will ALWAYS work as a manual fallback.

---

## Questions?

If you're stuck, check the browser console (F12 → Console) for detailed error messages. The scraper logs every step it takes, which helps diagnose issues.
