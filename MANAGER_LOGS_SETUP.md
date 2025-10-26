# MANAGER LOGS SETUP INSTRUCTIONS

## 🚀 QUICK START - What You Need To Do RIGHT NOW

### STEP 1: Run SQL to Create Database Tables

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Copy the SQL from this file: `sql/manager_incidents.sql`
5. Paste it into the SQL editor
6. Click **RUN**
7. You should see: "Success. No rows returned"

###  STEP 2: Create Supabase Storage Bucket for Photos

1. Still in Supabase dashboard
2. Go to **Storage** (left sidebar)
3. Click **New Bucket**
4. Name: `incident-photos`
5. **Public bucket**: YES (check the box)
6. Click **Create bucket**

### STEP 3: Update Supabase Credentials in managerlogs.html

1. Open `managerlogs.html`
2. Find line ~524-528:
   ```javascript
   const supabase = window.supabase.createClient(
     'https://your-project.supabase.co',  // ← Replace this
     'your-anon-key'                       // ← Replace this
   );
   ```
3. Get your credentials:
   - **URL**: Supabase dashboard → Settings → API → Project URL
   - **Anon Key**: Supabase dashboard → Settings → API → Project API keys → anon/public
4. Replace the placeholders with your actual values

### STEP 4: Deploy to Vercel

Run these commands:

```bash
cd "/Users/demetrigregorakis/new jayna cash counter/jayna-cash-counter"
git add .
git commit -m "feat(manager-logs): Add incident reporting system"
git push origin main
```

Vercel will auto-deploy in 1-2 minutes.

---

## ✅ THAT'S IT! You can now use the system

### How to Access:

**Desktop/Main:**
1. Go to https://jayna-cash-counter.vercel.app
2. Scroll to bottom
3. Click **"Manager Logs"** link
4. Click **"+ NEW INCIDENT REPORT"**
5. Fill out the form and submit!

---

## 📋 What The System Does

### Incident Report Form:
- **Manager Name**: Who is reporting
- **Date & Time**: When it happened (auto-populated with current date/time)
- **Department**: FOH, BOH, PREP, etc. (can add custom departments)
- **Staff Involved**: Auto-complete from Toast employee list (can add multiple)
- **Incident Report**: Detailed description (instructions provided)
- **Photos**: Upload up to 5 photos (auto-compressed to <2MB each)
- **Submit**: Saves to database, shows confirmation

### Incident List View:
- Shows all incidents sorted by newest first
- Displays: Date, Time, Manager Name, Department, Staff Count, Preview
- Click any incident to view full details

### Full Incident View (Modal):
- Complete incident details
- All photos
- **Download PDF** button
- **Send to Printer** button (same as catering orders)

### Staff Autocomplete:
- Automatically loads all active employees from Toast POS
- Shows job titles in dropdown
- You can still type custom names if needed

---

## 🔧 Database Tables Created

### `manager_incidents`
- Stores all incident reports
- Fields: manager_name, incident_date, incident_time, department, staff_involved (array), incident_report, photo_urls (array)
- Indexed for fast sorting and searching

### `departments`
- Stores department names (FOH, BOH, PREP, etc.)
- Auto-populated with defaults
- New departments added when you create custom ones

---

## 📸 Photo Storage

Photos are stored in Supabase Storage:
- Bucket: `incident-photos`
- Auto-compressed to max 1200px width/height
- JPEG quality: 85%
- Max 2MB per photo
- Public URLs for easy viewing

---

## 🖨️ PDF & Print

### PDF Format:
- Professional incident report layout
- All incident details
- Note about photos (photos viewable in online version)
- Filename: `Incident_Report_YYYY-MM-DD_[ID].pdf`

### Print Flow:
- Same as catering orders
- Gmail → Epson printer
- Success modal confirmation

---

## 🚀 Future Enhancements (NOT IMPLEMENTED YET)

The system is designed to expand:
- Manager daily logs (shift notes, tasks, reminders)
- Staff performance tracking
- Equipment maintenance logs
- Customer complaint tracking
- Filter incidents by department/staff/date range
- Export reports to Excel
- Manager dashboard with metrics

---

## ❓ Troubleshooting

### "Error loading employees"
- Check Toast API credentials in Vercel environment variables
- Verify `/api/toast-employees.js` is deployed

### "Error saving incident"
- Check Supabase credentials in `managerlogs.html`
- Verify SQL tables were created successfully
- Check Supabase dashboard → Table Editor → manager_incidents

### Photos not uploading
- Verify `incident-photos` bucket exists in Supabase Storage
- Verify bucket is set to **Public**
- Check photo size (must be <2MB before upload)

### Print button not working
- Check `GMAIL_APP_PASSWORD` environment variable in Vercel
- Verify Gmail credentials are correct
- Check Vercel function logs for errors

---

## 📞 Need Help?

1. Check Vercel function logs: https://vercel.com/dashboard → your-project → Functions
2. Check Supabase logs: Supabase dashboard → Logs
3. Check browser console: F12 → Console tab
4. Ask Claude for help!

---

**Created:** October 26, 2025
**Version:** 1.0 - Initial Incident Reporting System
