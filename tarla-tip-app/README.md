# TipShare - FOH Tip-Out Calculator for Tarla Grill

A complete, multi-page web application to automate FOH tip-out calculations with persistent storage via Supabase.

## 📁 Files Included

- `schema.sql` - Database schema (run in Supabase SQL Editor)
- `supabase-client.js` - Supabase client initialization
- `index.html` - Main tip calculator
- `roster.html` - Employee roster management
- `history.html` - View past reports
- `README.md` - This file

## 🚀 Setup Instructions

### Step 1: Create Database Tables

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New query**
4. Open `schema.sql` and copy its entire contents
5. Paste into the SQL Editor
6. Click **RUN**
7. You should see: ✅ TipShare schema created successfully!

This creates 3 tables:
- `Tarla_Employees` - Employee roster
- `Tarla_Shifts` - Shift report headers
- `Tarla_Shift_Entries` - Individual employee payouts

### Step 2: Configure Supabase Client

1. In Vercel Dashboard, go to **Settings → Environment Variables**
2. Find these two values:
   - `SUPABASE_URL` (e.g., https://xxxxx.supabase.co)
   - `SUPABASE_ANON_KEY` (your public anon key)
3. Open `supabase-client.js`
4. Replace the placeholder values:
   ```javascript
   const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
   const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';
   ```
5. Paste your actual credentials

### Step 3: Deploy to Vercel

1. Commit all files to your GitHub repository:
   ```bash
   git add tarla-tip-app/
   git commit -m "Add TipShare FOH tip calculator"
   git push origin main
   ```

2. Vercel will automatically deploy the new files

3. Your app will be live at:
   - Main calculator: `https://yourapp.com/tarla-tip-app/`
   - Roster: `https://yourapp.com/tarla-tip-app/roster.html`
   - History: `https://yourapp.com/tarla-tip-app/history.html`

## 📖 How to Use

### 1. Manage Roster (roster.html)

**First Time Setup:**
1. Go to `roster.html`
2. Add all your FOH employees
3. Select their roles: Server, Bartender, or Support Staff
4. You can Archive/Delete employees as needed

**Roles Explained:**
- **Server**: Contributes to Support Pool based on their sales
- **Bartender**: Independent - pays their own tip-out
- **Support Staff**: Receives equal share of Support Pool (Host, Busser, Food Runner)

### 2. Calculate New Report (index.html)

**Creating a Shift Report:**
1. Enter date and shift (AM/PM)
2. Set tip-out percentages:
   - Server Tip-Out % (e.g., 3.00)
   - Bartender Tip-Out % (e.g., 1.00)
3. Check the "Working?" box for each employee working this shift
4. Enter their Net Sales and CC Tips
5. Click **Save & Calculate Report**
6. Review the results and **Print Report** if needed

### 3. View History (history.html)

**Viewing Past Reports:**
1. Go to `history.html`
2. See all past shift reports sorted by date
3. Click **View Details** to see individual payouts
4. Print any report for your records

## 🧮 Calculation Logic

### The Three Roles:

**1. Servers (Contributors)**
- Contribute to Support Pool: `Net Sales × Server Tip-Out %`
- Final Payout: `CC Tips - Contribution`

**2. Support Staff (Receivers)**
- Receive equal share of Support Pool
- Final Payout: `Total Support Pool ÷ Number of Support Staff`

**3. Bartenders (Independents)**
- Pay their own tip-out: `Net Sales × Bartender Tip-Out %`
- Final Payout: `CC Tips - Tip-Out`

### Example Calculation:

**Configuration:**
- Server Tip-Out: 3%
- Bartender Tip-Out: 1%

**Working Today:**
- Server A: $1,000 sales, $200 tips
- Server B: $800 sales, $150 tips
- Bartender: $500 sales, $80 tips
- Host (Support): No sales, no tips
- Busser (Support): No sales, no tips

**Calculations:**
1. Support Pool = ($1,000 × 0.03) + ($800 × 0.03) = $54
2. Each Support Staff gets = $54 ÷ 2 = $27

**Final Payouts:**
- Server A: $200 - $30 = $170
- Server B: $150 - $24 = $126
- Bartender: $80 - $5 = $75
- Host: $27
- Busser: $27

## 🔒 Security

- All sensitive credentials are in `supabase-client.js` (not committed to git)
- Database uses Row Level Security (RLS) disabled for simplicity
- ANON_KEY is safe for client-side use (it's public by design)
- All database queries are parameterized (SQL injection protected)

## 🎨 Design

- **Framework**: Tailwind CSS (CDN)
- **Font**: Inter
- **Colors**: Slate gray with blue accents
- **Mobile**: Fully responsive
- **Print**: Optimized print styles for reports

## 🛠️ Troubleshooting

**"Supabase client not initialized" error:**
- Check that you pasted your credentials correctly in `supabase-client.js`
- Make sure the URLs don't have extra quotes or spaces

**"No employees found" in calculator:**
- Make sure you added employees in `roster.html`
- Check that employees are marked as "Active" (not Archived)

**Reports not saving:**
- Open browser console (F12) and check for errors
- Verify database tables exist (run schema.sql again if needed)
- Check Supabase dashboard for any RLS policy errors

**Database errors:**
- Go to Supabase → SQL Editor
- Run: `SELECT * FROM Tarla_Employees;`
- If it fails, tables weren't created - re-run schema.sql

## 📊 Database Schema

### Tarla_Employees
- `tarla_id` - Primary key
- `tarla_name` - Employee name
- `tarla_role` - Server | Bartender | Support Staff
- `tarla_is_active` - Active/Archived status
- `tarla_created_at` - Created timestamp

### Tarla_Shifts
- `tarla_id` - Primary key
- `tarla_shift_date` - Report date
- `tarla_shift_period` - AM | PM
- `tarla_server_tip_percent` - Server tip-out rate
- `tarla_bartender_tip_percent` - Bartender tip-out rate
- `tarla_total_net_sales` - Sum of all net sales
- `tarla_total_cc_tips` - Sum of all CC tips
- `tarla_total_support_pool` - Calculated support pool
- `tarla_created_at` - Created timestamp

### Tarla_Shift_Entries
- `tarla_id` - Primary key
- `tarla_shift_id` - FK to Tarla_Shifts
- `tarla_employee_id` - FK to Tarla_Employees
- `tarla_net_sales` - Employee's net sales
- `tarla_cc_tips` - Employee's CC tips
- `tarla_tip_out` - Amount paid out (negative)
- `tarla_tip_in` - Amount received (positive)
- `tarla_final_payout` - Net payout amount
- `tarla_created_at` - Created timestamp

## 📝 Notes

- This app is completely independent from your main Jayna Gyro system
- All data is stored in the same Supabase database but in separate tables (Tarla_ prefix)
- You can run both systems side-by-side without any conflicts
- The calculator validates all inputs before saving
- Reports are stored permanently and can be viewed/printed anytime

## 🎯 Next Steps

1. ✅ Run schema.sql in Supabase
2. ✅ Update supabase-client.js with your credentials
3. ✅ Commit and push to deploy
4. ✅ Add your employees in roster.html
5. ✅ Calculate your first shift report!

---

**Created for Tarla Grill by Demetri Gregorakis**
