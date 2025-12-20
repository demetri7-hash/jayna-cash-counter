# TRAINING SYSTEM TESTING GUIDE
## Complete Testing Protocol for Jayna Gyro Training Center

**Created:** December 20, 2025
**System Version:** v1.0
**Status:** Ready for testing

---

## 🎯 SYSTEM OVERVIEW

The Training System is a comprehensive 30-day Assistant Manager onboarding program with:
- **5 Modules** covering Foundation, Operations, Guest Experience, Bar Program, and Leadership
- **30 Total Units** (6 units per module)
- **Tabbed Content Interface** with Overview, Lesson, Activities, Reflection, and Resources
- **Progress Tracking** via Supabase database
- **Downloadable Materials** (markdown files for offline study)
- **API-driven Content** parsed from 200KB+ of markdown training materials

---

## 📋 PRE-TESTING CHECKLIST

Before starting testing, verify:

- [ ] Vercel deployment is complete (check https://jayna-cash-counter.vercel.app)
- [ ] All markdown files exist in `/training/modules/` directory (11 files)
- [ ] API endpoint `/api/training-get-unit-content.js` is deployed
- [ ] Supabase connection is active
- [ ] Browser console is open (F12) for error monitoring

---

## 🧪 TEST PLAN

### PHASE 1: User Account Creation & Login

#### Test 1.1: Create New Account
1. Navigate to https://jayna-cash-counter.vercel.app/training.html
2. Enter username: `test_user_1` (or any unique username)
3. Enter full name: `Test User One`
4. Click "CREATE ACCOUNT"

**Expected Results:**
- ✅ No error messages appear
- ✅ Login screen disappears
- ✅ Training dashboard appears
- ✅ Welcome message shows: "Welcome back, Test User One!"
- ✅ Progress shows 0/30 units completed
- ✅ All 5 modules appear in collapsed state

**Check Browser Console:**
- No errors should appear
- Should see successful Supabase API calls

#### Test 1.2: Logout and Re-Login
1. Click "LOGOUT" button
2. Login screen should reappear
3. Enter username from Test 1.1
4. Leave "Full Name" field empty
5. Click "LOGIN TO EXISTING ACCOUNT"

**Expected Results:**
- ✅ Successfully logs in
- ✅ Progress is preserved (still 0/30)
- ✅ No errors in console

#### Test 1.3: Duplicate Username Handling
1. Logout
2. Try to create new account with same username from Test 1.1
3. Enter different full name

**Expected Results:**
- ✅ Error message appears (username already exists)
- ✅ User is not created
- ✅ Can still login with original account

---

### PHASE 2: Module Navigation & Content Loading

#### Test 2.1: Expand/Collapse Modules
1. Click on "Module 1: Foundation & Culture" header
2. Units list should expand
3. Click header again

**Expected Results:**
- ✅ Units list toggles open/closed
- ✅ All 6 units are visible when expanded
- ✅ Unit titles match training structure
- ✅ Duration and trainer information appears

#### Test 2.2: Test All 5 Modules
Repeat Test 2.1 for each module:
- Module 1: Foundation & Culture
- Module 2: Operations Mastery
- Module 3: Guest Experience & Service Recovery
- Module 4: Bar Program (101 & 102)
- Module 5: Leadership & Management

**Expected Results:**
- ✅ All modules expand/collapse correctly
- ✅ Each module shows 6 units
- ✅ Total of 30 units across all modules

---

### PHASE 3: Unit Content Viewing (Tabbed Interface)

#### Test 3.1: Open Unit 1.1 (Module 1, Unit 1)
1. Expand Module 1
2. Click on "1.1 — Welcome & Orientation"
3. Modal window should appear with loading indicator
4. Content should load within 2-3 seconds

**Expected Results:**
- ✅ Modal overlay appears (dark background)
- ✅ Modal shows unit title: "Module 1, Unit 1: Welcome & Orientation"
- ✅ Meta information shows duration and trainer
- ✅ 5 tabs appear: OVERVIEW, LESSON, ACTIVITIES, REFLECTION, RESOURCES
- ✅ OVERVIEW tab is active by default
- ✅ Purpose section displays text
- ✅ Module context section shows module info

#### Test 3.2: Test All 5 Tabs
Click through each tab in Unit 1.1:

**OVERVIEW Tab:**
- ✅ Shows "Purpose" section
- ✅ Shows "Module Context" section
- ✅ Text is readable and formatted correctly

**LESSON Tab:**
- ✅ Content sections appear with headings
- ✅ Lists (bullet points) are formatted
- ✅ Paragraphs have proper spacing
- ✅ Content matches MODULE_1_FOUNDATION_AND_CULTURE.md file

**ACTIVITIES Tab:**
- ✅ Shows hands-on activities
- ✅ Activities are numbered and titled
- ✅ Activity instructions are clear
- ✅ If no activities, shows "No hands-on activities for this unit."

**REFLECTION Tab:**
- ✅ Shows reflection questions
- ✅ Questions are numbered
- ✅ Questions match MODULE_1_REFLECTION_WORKBOOK.md file

**RESOURCES Tab:**
- ✅ Shows two download sections (Training Guide + Workbook)
- ✅ Download buttons are visible
- ✅ Tip section appears at bottom

#### Test 3.3: Tab Switching Behavior
1. Click LESSON tab (should turn active/white background)
2. Click ACTIVITIES tab
3. Previous tab should become inactive (gray background)
4. Only one tab content visible at a time

**Expected Results:**
- ✅ Only active tab has white background
- ✅ Inactive tabs have gray background
- ✅ Content switches correctly
- ✅ No flickering or delays

---

### PHASE 4: Download Functionality

#### Test 4.1: Download Training Guide
1. Open any unit (e.g., Unit 1.1)
2. Click RESOURCES tab
3. Click "DOWNLOAD TRAINING GUIDE" button

**Expected Results:**
- ✅ File downloads to browser's download folder
- ✅ Filename format: `MODULE_1_FOUNDATION_AND_CULTURE.md`
- ✅ File opens in text editor successfully
- ✅ Content matches original markdown file
- ✅ No errors in console

#### Test 4.2: Download Reflection Workbook
1. In same unit, click "DOWNLOAD WORKBOOK" button

**Expected Results:**
- ✅ File downloads successfully
- ✅ Filename format: `MODULE_1_REFLECTION_WORKBOOK.md`
- ✅ Content is complete and readable
- ✅ No errors in console

#### Test 4.3: Test Downloads Across All Modules
Download files from at least one unit in each module:
- Module 1: Any unit → Should download MODULE_1_*.md files
- Module 2: Any unit → Should download MODULE_2_*.md files
- Module 3: Any unit → Should download MODULE_3_*.md files
- Module 4: Any unit → Should download MODULE_4_*.md files
- Module 5: Any unit → Should download MODULE_5_*.md files

**Expected Results:**
- ✅ All downloads work correctly
- ✅ Filenames are correct
- ✅ No duplicate downloads
- ✅ Files open successfully

---

### PHASE 5: Progress Tracking

#### Test 5.1: Mark Unit Complete (Checkbox)
1. Expand Module 1
2. Click checkbox next to Unit 1.1

**Expected Results:**
- ✅ Checkbox becomes checked
- ✅ Unit background turns green (success color)
- ✅ Progress stats update immediately:
  - "Completed Units" increases to 1
  - Progress bar shows "1 of 30 Units Completed"
  - Progress bar fill width increases
  - Completion percentage shows 3%

**Check Browser Console:**
- API call to `/api/training-update-progress` succeeds
- No errors

#### Test 5.2: Mark Unit Complete (Modal Button)
1. Click on Unit 1.2 to open modal
2. Review content
3. Click "MARK COMPLETE ✓" button at bottom right

**Expected Results:**
- ✅ Modal closes
- ✅ Unit 1.2 checkbox is checked
- ✅ Unit 1.2 background is green
- ✅ Progress stats update to 2/30 (7%)

#### Test 5.3: Uncheck Unit
1. Click checkbox next to Unit 1.1 again (uncheck it)

**Expected Results:**
- ✅ Checkbox becomes unchecked
- ✅ Green background removes (back to gray)
- ✅ Progress decreases to 1/30 (3%)
- ✅ Stats update correctly

#### Test 5.4: Complete Entire Module
1. Check all 6 units in Module 1

**Expected Results:**
- ✅ All units show green background
- ✅ Module header turns green
- ✅ Module stats show "100% | 6/6 units"
- ✅ Progress shows 6/30 (20%)

#### Test 5.5: Progress Persistence
1. Complete 3-4 random units across different modules
2. Note your progress percentage
3. Logout
4. Login again

**Expected Results:**
- ✅ All checked units remain checked
- ✅ Progress percentage is preserved
- ✅ Green backgrounds appear on completed units
- ✅ Stats match previous session

---

### PHASE 6: API Parsing Verification

#### Test 6.1: Verify Unit Content Parsing (Spot Check 5 Units)
Open these specific units and verify content loads correctly:

**Unit 1.1 (Welcome & Orientation):**
- ✅ Lesson tab shows: "Opening Conversation", "Jayna's Origin Story", "Restaurant Tour"
- ✅ Activities tab shows: "Walk the Guest Journey", "Find Five Things"
- ✅ Reflection tab shows questions about Jayna's mission, Greek hospitality

**Unit 2.5 (Closing + Cash Handling):**
- ✅ Lesson tab shows cash handling procedures
- ✅ Content sections are properly formatted
- ✅ Reflection questions about cash procedures appear

**Unit 3.4 (Complaint Handling — Practice):**
- ✅ Lesson content loads
- ✅ Practice scenarios appear
- ✅ Reflection questions about complaint handling

**Unit 4.4 (Signature Cocktails):**
- ✅ Cocktail recipes appear (if referenced in lesson)
- ✅ Activities show cocktail practice
- ✅ Reflection questions about cocktails

**Unit 5.6 (Independent Shifts — Capstone):**
- ✅ Capstone content loads
- ✅ Final assessment information appears
- ✅ Reflection questions about leadership

#### Test 6.2: Check for Missing Content
1. Open 10 random units across all modules
2. Check each tab in each unit

**Expected Results:**
- ✅ No "Error loading content" messages
- ✅ No completely blank tabs (except if legitimately no content)
- ✅ At least Overview and Lesson tabs have content for every unit
- ✅ Reflection tab has questions for every unit

---

### PHASE 7: Modal Behavior

#### Test 7.1: Close Modal (Overlay Click)
1. Open any unit modal
2. Click outside the modal (on dark overlay area)

**Expected Results:**
- ✅ Modal closes
- ✅ Returns to training dashboard
- ✅ Progress is saved

#### Test 7.2: Close Modal (Button)
1. Open any unit modal
2. Click "CLOSE" button at bottom left

**Expected Results:**
- ✅ Modal closes
- ✅ Same behavior as overlay click

#### Test 7.3: Modal Scrolling (Long Content)
1. Open Unit 1.1 (has lots of content)
2. Click LESSON tab
3. Scroll through content

**Expected Results:**
- ✅ Modal content scrolls smoothly
- ✅ Header remains visible while scrolling
- ✅ Footer buttons remain visible
- ✅ No layout breaking

#### Test 7.4: Multiple Modal Opens
1. Open Unit 1.1
2. Mark complete and close
3. Open Unit 1.2
4. Close
5. Open Unit 1.1 again

**Expected Results:**
- ✅ Each modal opens correctly
- ✅ No duplicate modals
- ✅ Content loads each time
- ✅ "MARK COMPLETE" button changes to "COMPLETED ✓" for Unit 1.1

---

### PHASE 8: Responsive Design (Mobile Testing)

#### Test 8.1: Mobile View (Chrome DevTools)
1. Open Chrome DevTools (F12)
2. Click "Toggle Device Toolbar" (Ctrl+Shift+M)
3. Select "iPhone 12 Pro" or similar

**Expected Results:**
- ✅ Login screen displays correctly
- ✅ Buttons are tappable (min 44px touch targets)
- ✅ Text is readable (font-size ≥ 16px for inputs)
- ✅ No horizontal scrolling

#### Test 8.2: Mobile Module Navigation
1. In mobile view, expand Module 1
2. Scroll through units
3. Open a unit

**Expected Results:**
- ✅ Module accordion works smoothly
- ✅ Units are tappable
- ✅ Modal appears full-width
- ✅ Tabs are horizontally scrollable if needed

#### Test 8.3: Mobile Tab Switching
1. In mobile view, open any unit
2. Switch between tabs

**Expected Results:**
- ✅ Tabs are tappable
- ✅ Content fits screen width
- ✅ No layout overflow
- ✅ Smooth transitions

---

### PHASE 9: Error Handling

#### Test 9.1: Network Error Simulation
1. Open Chrome DevTools → Network tab
2. Set throttling to "Offline"
3. Try to open a unit

**Expected Results:**
- ✅ Error message appears in modal
- ✅ "ERROR LOADING CONTENT" heading shows
- ✅ Error details are displayed
- ✅ CLOSE button works

#### Test 9.2: Invalid Username Login
1. Logout
2. Enter username that doesn't exist: `nonexistent_user_123`
3. Click "LOGIN TO EXISTING ACCOUNT"

**Expected Results:**
- ✅ Error message: "User not found"
- ✅ User stays on login screen
- ✅ Can try again

#### Test 9.3: Empty Form Submission
1. Logout
2. Leave username blank
3. Click "CREATE ACCOUNT"

**Expected Results:**
- ✅ Error message: "Please enter both username and full name"
- ✅ No API call is made
- ✅ User stays on login screen

---

### PHASE 10: Performance Testing

#### Test 10.1: Content Load Speed
1. Open 5 different units in sequence
2. Measure time from click to content appearing

**Expected Results:**
- ✅ Each unit loads in <3 seconds (typical)
- ✅ Loading indicator appears immediately
- ✅ No frozen/stuck loading states

#### Test 10.2: Download Speed
1. Download Training Guide (largest file ~40KB)
2. Measure download time

**Expected Results:**
- ✅ Download starts immediately
- ✅ File appears in Downloads folder within 1-2 seconds
- ✅ No browser errors

#### Test 10.3: Progress Update Speed
1. Check/uncheck 5 units rapidly

**Expected Results:**
- ✅ Each update completes in <1 second
- ✅ UI updates immediately (optimistic UI)
- ✅ No lag or delay

---

## 🐛 KNOWN ISSUES TO WATCH FOR

### Potential Issues:

1. **API Parsing Edge Cases:**
   - Some units may have unique markdown formatting
   - Nested lists might not parse perfectly
   - Watch for missing content sections

2. **Download Filename Mapping:**
   - Module 3 filename: `MODULE_3_GUEST_EXPERIENCE.md` (not "SERVICE_RECOVERY")
   - Ensure all module names match actual files

3. **Reflection Questions:**
   - Some units may have no reflection questions (legitimate)
   - Should show "No reflection questions for this unit."

4. **Mobile Safari:**
   - Input font-size must be ≥16px to prevent zoom
   - Already implemented, but verify

---

## ✅ TESTING COMPLETION CHECKLIST

After completing all test phases, verify:

- [ ] Account creation and login work flawlessly
- [ ] All 30 units open and display content
- [ ] All 5 tabs work in every unit
- [ ] Downloads work for all 5 modules (10 files total)
- [ ] Progress tracking persists across sessions
- [ ] Mobile view is fully functional
- [ ] Error handling is graceful
- [ ] No console errors during normal use
- [ ] Performance is acceptable (<3s load times)

---

## 🚨 CRITICAL TEST SCENARIOS

### Scenario 1: Heming's First Login (Production Simulation)
1. Heming creates account: username `heming`, full name `Heming Huang`
2. Reviews Module 1, Unit 1
3. Reads all 5 tabs
4. Downloads training guide
5. Marks Unit 1.1 complete
6. Logs out
7. Returns next day, logs in
8. Progress is preserved

**This is the most important test!** It simulates real-world usage.

### Scenario 2: Demetri Monitoring Progress
1. Demetri checks Supabase `training_progress` table directly
2. Verifies Heming's completed units are recorded
3. Checks timestamps are accurate

**Database validation is critical for training accountability.**

---

## 📊 SUCCESS CRITERIA

The training system is **PRODUCTION READY** if:

✅ **90%+ of test cases pass** (27/30 required)
✅ **All critical scenarios pass** (100% required)
✅ **No P0/P1 bugs** (system-breaking errors)
✅ **Downloads work** for all modules
✅ **Progress persists** reliably
✅ **Mobile experience** is usable

---

## 📝 BUG REPORTING

If you find issues, document:

1. **Bug Title:** Short description
2. **Steps to Reproduce:** Exact steps
3. **Expected Result:** What should happen
4. **Actual Result:** What actually happened
5. **Browser/Device:** Chrome 120 / iPhone 12 / etc.
6. **Console Errors:** Screenshot or copy error messages
7. **Severity:** P0 (critical) / P1 (major) / P2 (minor)

---

## 🎉 FINAL NOTES

This training system represents **200KB+ of carefully crafted training content** turned into an interactive web application. It's designed for Heming Huang's 30-day Assistant Manager onboarding, but the structure is scalable for future team members.

**Test thoroughly. This is a production system used for real employee training.**

---

**Happy Testing! 🚀**

_Last Updated: December 20, 2025_
