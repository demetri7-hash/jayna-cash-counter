# FOH Checklist Enhancement Plan
**Created:** 2025-10-18
**Features:** Dynamic Checklist Creation, Photo Uploads, Required Tasks

---

## 📋 User Requirements Summary

### 1. Dynamic Checklist Creation
- ✅ Current: Shows 5 hardcoded checklists in EDIT tab
- 🎯 Goal: Create unlimited checklists (6th, 7th, etc.)
- 📍 Location: "➕ CREATE NEW CHECKLIST" button in EDIT tab

### 2. Required Task Toggle
- 🎯 Goal: Mark tasks as required or optional
- 📍 UI: Checkbox toggle in task editor: "Required to submit checklist"
- 💾 Database: `is_required` BOOLEAN column on tasks

### 3. Photo Upload - Individual Tasks
- 🎯 Goal: Upload photos for each task (e.g., photo proof of cleaning)
- 📍 UI: Photo upload button next to each task in checklist completion
- 💾 Storage: Supabase Storage (minimal database space)
- 📸 Multiple photos per task (gallery)

### 4. Photo Upload - Checklist Notes
- 🎯 Goal: Upload multiple photos in notes section
- 📍 UI: Photo upload area after notes textarea
- 💾 Storage: Supabase Storage
- 📸 Multiple photos per session

### 5. CRUD for Individual Tasks
- 🎯 Goal: Add/remove tasks from existing sections
- 📍 UI: "➕ Add Task" button in each section
- 📍 UI: "✕" delete button next to each task

---

## 🗄️ Database Schema Changes

### New Columns for `checklist_section_tasks`

```sql
ALTER TABLE checklist_section_tasks
ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS photo_urls TEXT; -- JSON array of Supabase Storage URLs
```

### New Table: `foh_checklist_task_photos`

```sql
CREATE TABLE foh_checklist_task_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_completion_id UUID NOT NULL, -- References completed task in session
  photo_url TEXT NOT NULL, -- Supabase Storage URL
  uploaded_by TEXT,
  uploaded_at TIMESTAMP DEFAULT NOW()
);
```

**Why separate table?**
- Multiple photos per task completion
- Clean relational structure
- Easy to query all photos for a task
- Doesn't bloat tasks table

### New Table: `foh_checklist_session_photos`

```sql
CREATE TABLE foh_checklist_session_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES foh_checklist_sessions(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL, -- Supabase Storage URL
  caption TEXT, -- Optional description
  uploaded_by TEXT,
  uploaded_at TIMESTAMP DEFAULT NOW()
);
```

**Why?**
- Multiple photos per session
- Attached to session notes
- Cascade delete when session deleted

---

## 📸 Photo Storage Strategy (Minimal Space)

### Option 1: Supabase Storage (RECOMMENDED) ✅

**Pros:**
- Files stored separately from database (ZERO database space)
- Only URL stored in database (~100 bytes)
- Built-in CDN for fast loading
- Can set storage limits per bucket
- Image compression/resizing possible

**Implementation:**
```javascript
// 1. Upload photo to Supabase Storage
const file = inputElement.files[0];
const fileExt = file.name.split('.').pop();
const fileName = `${Math.random()}.${fileExt}`;
const filePath = `task-photos/${fileName}`;

const { data, error } = await supabase.storage
  .from('foh-checklist-photos')
  .upload(filePath, file);

// 2. Get public URL (tiny - just store this)
const { data: { publicUrl } } = supabase.storage
  .from('foh-checklist-photos')
  .getPublicUrl(filePath);

// 3. Save URL to database (minimal space)
await supabase
  .from('foh_checklist_task_photos')
  .insert({ photo_url: publicUrl });
```

**Storage Bucket Structure:**
```
foh-checklist-photos/
  ├── task-photos/
  │   ├── abc123.jpg
  │   └── def456.jpg
  └── session-photos/
      ├── xyz789.jpg
      └── qrs012.jpg
```

**Compression:**
- Client-side resize before upload (max 1920px wide)
- Convert to JPEG with 80% quality
- Typical photo: 500KB → 100KB (80% savings)

### Option 2: Base64 in Database ❌ (NOT RECOMMENDED)

**Cons:**
- 1MB photo = 1.33MB base64 string in database
- Slows down queries
- Expensive database storage
- No CDN

---

## 🎨 UI/UX Design

### EDIT Tab - Create New Checklist

**Location:** Top of checklist list, before existing checklists

```
┌─────────────────────────────────────────────┐
│ ⚙️ CHECKLIST EDITOR                         │
│ Edit checklist definitions, add/remove...  │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ ➕ CREATE NEW CHECKLIST                     │
│ Add a new custom checklist to the system   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ AM CLEANING CHECKLIST REVIEW                │
│ Review of overnight cleaning completed...  │
│ 🕒 9:00 AM - 3:00 PM  👥 1 Staff  📋 1...  │
│                            [✏️ EDIT]         │
└─────────────────────────────────────────────┘
...
```

**Create Flow:**
1. Click "CREATE NEW CHECKLIST"
2. Show empty form with:
   - Checklist Type ID (auto-generated or custom)
   - Title, Description, Time Range, Staff Count
   - Has Ratings, Has Notes checkboxes
   - Empty sections list with "➕ ADD SECTION" button
3. Save creates new checklist in database
4. Returns to list showing new checklist

### Task Editor - Required Toggle

**For each task in checkbox section:**

```
┌──────────────────────────────────────────────────┐
│ Clean toilets thoroughly: bowl, lid, seat...    │
│ ☐ Required to submit checklist                  │
└──────────────────────────────────────────────────┘
```

### Task Completion - Photo Upload

**When completing a task (PUBLIC tab):**

```
☐ Clean toilets thoroughly: bowl, lid, seat...

┌──────────────────────────────────────────────────┐
│ 📸 UPLOAD PHOTO (Optional)                       │
│ [Choose File] or [Take Photo]                   │
│                                                  │
│ Photos uploaded: 2                              │
│ [thumbnail] [thumbnail]                         │
└──────────────────────────────────────────────────┘
```

### Notes Section - Photo Upload

**After notes textarea:**

```
┌──────────────────────────────────────────────────┐
│ Session Notes                                    │
│ ┌──────────────────────────────────────────────┐ │
│ │ Manager notes go here...                     │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ 📸 ATTACH PHOTOS                                 │
│ [➕ Add Photos]                                  │
│                                                  │
│ Uploaded photos: 3                              │
│ [thumbnail] [thumbnail] [thumbnail]             │
└──────────────────────────────────────────────────┘
```

---

## 🔧 Implementation Order

### Phase 1: Database Setup ✅
1. Create SQL schema for:
   - Task required flag
   - Photo tables
   - Supabase Storage bucket configuration

### Phase 2: Photo Upload Core ✅
1. Create Supabase Storage bucket
2. Build photo upload helper functions
3. Add client-side image compression
4. Test upload/retrieve flow

### Phase 3: Required Tasks ✅
1. Update database schema
2. Add required checkbox in EDIT tab
3. Add validation on checklist submit
4. Show "Required" badge on tasks

### Phase 4: Task CRUD ✅
1. Add "➕ Add Task" button in sections
2. Build inline task adding UI
3. Add delete button for tasks
4. Update saveChecklistChanges to handle dynamic tasks

### Phase 5: Create New Checklist ✅
1. Add "CREATE NEW CHECKLIST" button
2. Build empty checklist form
3. Generate unique checklist type IDs
4. Save flow to database

### Phase 6: Task Photo Upload ✅
1. Add photo upload UI to task completion
2. Save photos to Storage
3. Link photos to task completions
4. Display photos in Watchdog

### Phase 7: Session Photo Upload ✅
1. Add photo upload to notes section
2. Save photos to Storage
3. Link photos to sessions
4. Display photos in Watchdog

### Phase 8: Testing & Polish ✅
1. Test create flow
2. Test required task validation
3. Test photo uploads (multiple, deletion)
4. Test mobile photo capture
5. Performance testing with large photo sets

---

## 📊 Storage Estimates

### Photo Storage (Supabase)

**Assumptions:**
- Average task photo: 100KB (compressed)
- Average session photo: 150KB
- 5 tasks with photos per day
- 2 session photos per day
- 30 days per month

**Monthly Storage:**
- Task photos: 5 × 100KB × 30 = 15MB
- Session photos: 2 × 150KB × 30 = 9MB
- **Total: ~24MB/month**

**Annual Storage:** ~288MB/year

**Supabase Free Tier:** 1GB storage (enough for 3+ years)

### Database Space (URLs only)

**Per Photo URL:** ~150 bytes
**Daily URLs:** 7 × 150 bytes = ~1KB
**Monthly:** ~30KB
**Annual:** ~365KB

**Minimal impact on database!**

---

## 🎯 Success Criteria

### Create New Checklist
- [ ] Manager can click "CREATE NEW CHECKLIST"
- [ ] Form loads with all empty fields
- [ ] Can add sections dynamically
- [ ] Can add tasks to sections
- [ ] Save creates checklist in database
- [ ] New checklist appears in list

### Required Tasks
- [ ] Manager can mark tasks as required
- [ ] Required badge shows in task list
- [ ] Cannot submit checklist with incomplete required tasks
- [ ] Clear error message when required tasks missing

### Task Photos
- [ ] Staff can upload photos during task completion
- [ ] Multiple photos per task supported
- [ ] Photos compressed before upload
- [ ] Photos display in Watchdog
- [ ] Manager can view full-size photos

### Session Photos
- [ ] Staff can upload photos in notes section
- [ ] Multiple photos per session
- [ ] Photos display in Watchdog with session
- [ ] Manager can add captions to photos

### Performance
- [ ] Photo upload completes in <3 seconds
- [ ] Page loads quickly even with 50+ photos
- [ ] Mobile photo capture works smoothly
- [ ] Storage stays within free tier limits

---

## 🚨 Important Notes

### Supabase Storage Setup Required

**Before photo uploads work, you must:**

1. Create storage bucket in Supabase:
   - Go to Storage → Create Bucket
   - Name: `foh-checklist-photos`
   - Public: Yes (for easy URL access)
   - File size limit: 5MB per file

2. Set RLS policies:
```sql
-- Allow anyone to upload (authenticated users only if preferred)
CREATE POLICY "Allow uploads" ON storage.objects
FOR INSERT TO public
WITH CHECK (bucket_id = 'foh-checklist-photos');

-- Allow anyone to read
CREATE POLICY "Allow reads" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'foh-checklist-photos');
```

### Migration Path

**Existing Checklists:**
- All 5 existing checklists continue to work
- Can be edited with new features (required tasks, etc.)
- No data loss

**New Checklists:**
- Generate unique type IDs: `custom_checklist_001`, `custom_checklist_002`
- Store in same database tables
- Full feature parity with built-in checklists

---

## 🤔 Questions to Consider

1. **Checklist Type ID:** Auto-generate (`custom_001`) or allow manager to set?
2. **Photo Limits:** Max photos per task? Per session?
3. **Required Tasks:** Show count in checklist header? (e.g., "5 required tasks")
4. **Photo Deletion:** Allow staff to delete photos they uploaded?
5. **Image Preview:** Show thumbnails or full-size in Watchdog?

---

**Ready to implement?** This plan covers all requested features with minimal database space usage and a clean UI. Let me know if you want to adjust anything before I start building!
