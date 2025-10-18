# FOH Checklists & Password Management - Database Setup

## Overview

This directory contains SQL scripts for two systems:
1. **Checklist Definitions** - Editable checklist system (EDIT tab)
2. **Manager Passwords** - Password management for EDIT tab access (WATCHDOG tab)

## Files

1. **foh_checklists_schema.sql** - Checklist database schema (4 tables)
2. **foh_checklists_migration.sql** - Checklist data migration (partial pattern)
3. **manager_passwords_schema.sql** - Password management table ⚠️ **RUN THIS FIRST**

## 🔐 MANAGER PASSWORD SYSTEM

### How It Works

1. **WATCHDOG Tab** → 🔐 PASSWORDS section
   - Create manager passwords
   - Set username, full name, role
   - Password strength validation
   - Activate/deactivate passwords
   - Delete passwords

2. **EDIT Tab** → Requires password to access
   - Uses passwords created in WATCHDOG
   - Checks database + fallback to hardcoded password
   - No password management UI in EDIT tab

### Password Flow

```
Manager creates password in WATCHDOG → Password saved to database
↓
Manager tries to access EDIT tab → Enter password
↓
System checks:
  1. Hardcoded ADMIN_PASSWORD (JaynaGyro2025!) - fallback
  2. Database passwords (active only)
↓
If match found → Access granted → Load EDIT tab
```

### ⚠️ CRITICAL: Run Password Schema First

Before using password management, run this in **Supabase SQL Editor**:

```bash
File: manager_passwords_schema.sql
```

This creates the `manager_passwords` table. Without it, you'll see:
- Error: "Could not find the table 'public.manager_passwords' in the schema cache"

After running the SQL:
1. Go to WATCHDOG tab (password: `JaynaGyro2025!`)
2. Click 🔐 PASSWORDS tab
3. Click ➕ ADD NEW PASSWORD
4. Fill in username, password, role
5. Click SAVE
6. Use that password to access EDIT tab!

---

## Setup Instructions

### Step 1: Create Password Table (REQUIRED FIRST)

Run this script FIRST in **Supabase SQL Editor**:

```bash
File: manager_passwords_schema.sql
```

### Step 2: Create Checklist Tables

Run this script in **Supabase SQL Editor**:

```bash
File: foh_checklists_schema.sql
```

This creates 4 tables for editable checklists:
- `checklist_definitions` - Main checklist info (title, description, time range, etc.)
- `checklist_sections` - Sections within each checklist
- `checklist_section_tasks` - Individual tasks for checkbox sections
- `checklist_section_categories` - Categories for rating sections

### Step 3: Migrate Checklist Data (Optional)

You have TWO options for populating the database:

#### Option A: Run Migration Script (Partial)
```bash
File: foh_checklists_migration.sql
```

This script contains:
- ✅ **am_cleaning** - Complete with all sections and categories
- ✅ **foh_opening** - Partial (first section only as example)
- ❌ **foh_transition** - Not included
- ❌ **foh_closing** - Not included
- ❌ **bar_closing** - Not included

**Why partial?** The migration script is very long. Since you now have the EDIT tab with full database editing, you can:
1. Run this partial migration to see the pattern
2. Use the EDIT tab to manually add/edit remaining checklists
3. This ensures database integrity and gives you practice with the new editor

#### Option B: Use EDIT Tab to Create All Checklists
1. Skip the migration script entirely
2. Go to **FOH Checklists → EDIT tab** (requires password: `JaynaGyro2025!`)
3. Click on each checklist type
4. Fill in all fields manually
5. Save to database

**Recommended:** Use Option A (run partial migration) then fill in missing checklists via EDIT tab.

## How The System Works

### Database → UI Flow

1. **Page Load:**
   - System checks if checklist exists in database
   - If YES: Load from database
   - If NO: Fallback to `FOH_CHECKLISTS` object in `foh-checklists-data.js`

2. **EDIT Tab:**
   - Loads ALL checklists from database
   - Shows list of all 5 checklist types
   - Click to edit → Opens full editor with all fields

3. **Saving Changes:**
   - Collects all form data (title, description, sections, tasks, categories)
   - Validates required fields
   - Saves to database using `UPSERT` (updates if exists, inserts if new)
   - Deletes old sections and re-inserts new ones (clean slate approach)

4. **CHECKLISTS Tab (Public):**
   - When staff selects a checklist type
   - System loads definition from database
   - Renders checklist UI based on database data
   - All completions, ratings, notes saved to database

### Database Schema Details

**checklist_definitions**
```sql
- id (UUID, primary key)
- type (TEXT, unique) - 'am_cleaning', 'foh_opening', etc.
- title (TEXT)
- time_range (TEXT) - Display string like "9:00 AM - 3:00 PM"
- description (TEXT)
- staff_count (INTEGER)
- has_ratings (BOOLEAN)
- has_notes (BOOLEAN)
- rating_scale (TEXT, nullable)
- created_at, updated_at, updated_by
```

**checklist_sections**
```sql
- id (UUID, primary key)
- checklist_id (UUID, foreign key)
- name (TEXT)
- description (TEXT, nullable)
- section_type (TEXT) - 'checkbox' or 'rating'
- display_order (INTEGER) - For ordering sections
- created_at, updated_at
```

**checklist_section_tasks** (for checkbox sections)
```sql
- id (UUID, primary key)
- section_id (UUID, foreign key)
- task_text (TEXT)
- display_order (INTEGER)
- created_at, updated_at
```

**checklist_section_categories** (for rating sections)
```sql
- id (UUID, primary key)
- section_id (UUID, foreign key)
- name (TEXT)
- description (TEXT, nullable)
- display_order (INTEGER)
- created_at, updated_at
```

## Testing Instructions

### Test 1: Database Schema
1. Run `foh_checklists_schema.sql` in Supabase SQL Editor
2. Check "Tables" tab in Supabase dashboard
3. Verify 4 tables created: `checklist_definitions`, `checklist_sections`, `checklist_section_tasks`, `checklist_section_categories`

### Test 2: Data Migration (if running migration script)
1. Run `foh_checklists_migration.sql` in Supabase SQL Editor
2. Query `SELECT * FROM checklist_definitions;`
3. Should see 2 rows: `am_cleaning`, `foh_opening`
4. Query `SELECT * FROM checklist_sections WHERE checklist_id = (SELECT id FROM checklist_definitions WHERE type = 'am_cleaning');`
5. Should see 1 section: "Quality Review"
6. Query `SELECT * FROM checklist_section_categories WHERE section_id = ...;`
7. Should see 8 categories (Sweeping, Chairs, etc.)

### Test 3: EDIT Tab Functionality
1. Go to https://jayna-cash-counter.vercel.app/foh-checklists.html
2. Click **EDIT** tab
3. Enter password: `JaynaGyro2025!`
4. Click on any checklist (e.g., "AM CLEANING CHECKLIST REVIEW")
5. Edit the title, add/remove tasks
6. Click **SAVE CHANGES**
7. Should see: "✅ Checklist saved successfully to database!"
8. Refresh page and verify changes persisted

### Test 4: Public Checklist Uses Database
1. Go to **CHECKLISTS** tab (public)
2. Select a checklist type you edited (e.g., AM Cleaning)
3. Enter your name
4. Verify checklist loads with your edited data
5. Complete some tasks
6. Go to **WATCHDOG** tab
7. Verify completions saved and visible

## Troubleshooting

### Error: "relation 'checklist_definitions' does not exist"
**Fix:** Run `foh_checklists_schema.sql` first to create tables

### Error: "duplicate key value violates unique constraint"
**Fix:** You're trying to insert data that already exists. Either:
- Delete existing data: `DELETE FROM checklist_definitions WHERE type = 'am_cleaning';`
- Or modify migration script to use `ON CONFLICT (type) DO UPDATE ...`

### Checklists not showing in EDIT tab
**Check:**
1. Database tables created? Run schema script
2. Data migrated? Either run migration OR create manually via EDIT tab
3. Browser console for errors (F12 → Console)

### Changes not saving
**Check:**
1. Browser console for Supabase errors
2. Supabase → Table Editor → Check if data appeared
3. Check internet connection
4. Verify Supabase credentials in environment variables

## Fallback System

**Important:** The system has built-in fallbacks!

- If database is empty → Loads from `FOH_CHECKLISTS` object in `foh-checklists-data.js`
- If database query fails → Falls back to static JavaScript
- If network is down → Uses cached JavaScript definitions

This means:
- ✅ System will NEVER break even if database is empty
- ✅ You can migrate gradually (one checklist at a time)
- ✅ No downtime during migration

## Next Steps After Migration

1. **Test thoroughly:**
   - Edit each checklist via EDIT tab
   - Verify changes appear in public CHECKLISTS tab
   - Complete tasks and verify Watchdog shows correct data

2. **Optional: Remove JavaScript fallback**
   - Once ALL checklists are in database
   - You can delete `foh-checklists-data.js` (or keep as backup)
   - System will load 100% from database

3. **Ongoing management:**
   - Use EDIT tab to modify checklists anytime
   - No need to edit code or redeploy
   - All changes live immediately after save

## Questions?

See main project documentation:
- `CURRENT_STATUS.md` - Current work status
- `PROJECT_MASTER_LOG.md` - Session history
- `AI_PROJECT_INSTRUCTIONS.md` - Full project context
