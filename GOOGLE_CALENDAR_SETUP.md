# Google Calendar Sync Setup

This guide explains how to set up Google Calendar integration for automatic catering order event creation.

## Features

When a catering order photo is uploaded, the system automatically:
- ✅ Creates a Google Calendar event in `jaynascans@gmail.com`
- ✅ Sets event title as "Order #1", "Order #2", etc. (dynamic based on same-day orders)
- ✅ Sets event time to "leave jayna at" (delivery) or "time due" (pickup)
- ✅ Adds 2-hour reminder before the event
- ✅ Embeds order photo in event description
- ✅ Stores calendar event ID for future updates/deletes

---

## Setup Instructions

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: **Jayna Catering Calendar**
4. Click "Create"

### Step 2: Enable Google Calendar API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Google Calendar API"
3. Click on it and press **Enable**

### Step 3: Create Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Fill in details:
   - **Service account name:** `jayna-catering-sync`
   - **Service account ID:** (auto-filled)
   - **Description:** "Service account for syncing catering orders to Google Calendar"
4. Click **Create and Continue**
5. Skip optional role assignment (click **Continue**)
6. Click **Done**

### Step 4: Generate Service Account Key

1. In the **Credentials** page, find your new service account
2. Click on it to open details
3. Go to the **Keys** tab
4. Click **Add Key** → **Create new key**
5. Select **JSON** format
6. Click **Create**
7. A JSON file will download automatically - **SAVE THIS FILE SECURELY**

### Step 5: Share Calendar with Service Account

1. Open your service account JSON file
2. Find the `client_email` field (looks like: `jayna-catering-sync@PROJECT_ID.iam.gserviceaccount.com`)
3. **Copy** this email address
4. Go to [Google Calendar](https://calendar.google.com) and log in as **jaynascans@gmail.com**
5. Find the calendar you want to sync to (or create a new "Catering Orders" calendar)
6. Click the 3 dots next to the calendar → **Settings and sharing**
7. Scroll to **Share with specific people**
8. Click **Add people**
9. Paste the service account email
10. Set permission to **Make changes to events**
11. Click **Send**

### Step 6: Add Credentials to Vercel

1. Open your downloaded JSON key file
2. Copy the **entire contents** of the file
3. Go to [Vercel Dashboard](https://vercel.com/dashboard)
4. Select your project: **jayna-cash-counter**
5. Go to **Settings** → **Environment Variables**
6. Add a new variable:
   - **Name:** `GOOGLE_SERVICE_ACCOUNT_KEY`
   - **Value:** Paste the entire JSON contents
   - **Environments:** Select all (Production, Preview, Development)
7. Click **Save**
8. **Redeploy** your app for changes to take effect

### Step 7: Run Database Migration

1. Go to your Supabase dashboard
2. Open **SQL Editor**
3. Run the migration file:

```sql
-- Copy and paste contents of:
-- sql/alter_catering_photos_add_calendar_sync.sql
```

4. Verify columns were added:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'catering_photos'
ORDER BY ordinal_position;
```

You should see these new columns:
- `order_type`
- `order_due_date`
- `time_due`
- `leave_jayna_at`
- `calendar_event_id`

---

## Testing

### Test Calendar Event Creation

1. Go to **Catering** page on your app
2. Fill out the upload form:
   - Select **PICKUP** or **DELIVERY**
   - Set **ORDER DUE** date (e.g., tomorrow)
   - Set **TIME DUE** (e.g., 2:00 PM)
   - If DELIVERY, set **LEAVE JAYNA AT** (e.g., 1:30 PM)
3. Select a photo and upload
4. Check the console for:
   ```
   📋 Assigned order number: Order #1 for 2025-10-24
   📅 Creating Google Calendar event...
   ✅ Calendar event created: abc123xyz
   ```
5. Log in to Google Calendar as **jaynascans@gmail.com**
6. Navigate to the order date
7. You should see an event titled **"Order #1"**
8. Click the event to verify:
   - Time matches "leave jayna at" or "time due"
   - Description contains order details and photo
   - Reminder is set for 2 hours before

### Test Multiple Orders Same Day

1. Upload a second photo for the same date
2. Verify it's titled **"Order #2"**
3. Upload a third photo → **"Order #3"**, etc.

---

## Troubleshooting

### "Google service account credentials not configured"

**Fix:** Make sure `GOOGLE_SERVICE_ACCOUNT_KEY` is set in Vercel environment variables and redeploy.

### "Calendar event creation failed: Permission denied"

**Fix:**
1. Verify you shared the calendar with the service account email
2. Make sure permission is set to "Make changes to events"
3. Wait a few minutes for permissions to propagate

### "Failed to create calendar event"

**Fix:**
1. Check Vercel logs for detailed error message
2. Verify Google Calendar API is enabled in Google Cloud Console
3. Verify service account JSON key is valid

### Events not appearing in calendar

**Fix:**
1. Verify you're logged in as **jaynascans@gmail.com**
2. Check if the event date is in the future
3. Refresh the calendar page
4. Check if the event was created in a different calendar

---

## Environment Variables Reference

```bash
# Required for Google Calendar sync
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
```

---

## File Structure

```
/api
  └── google-calendar-create-event.js  # Calendar API endpoint
  └── catering-photos-upload.js        # Modified to call calendar API

/sql
  └── create_catering_photos_table.sql # Updated schema
  └── alter_catering_photos_add_calendar_sync.sql # Migration for existing tables
```

---

## Future Enhancements

- [ ] Update calendar event when photo is deleted
- [ ] Update calendar event when order time changes
- [ ] Add customer name to event title if available
- [ ] Send calendar invites to customer email
- [ ] Color-code events by order type (pickup vs delivery)
