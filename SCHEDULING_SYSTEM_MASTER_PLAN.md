# JAYNA SCHEDULING SYSTEM - MASTER PLAN
**Goal:** Replace Homebase with custom scheduling + messaging system
**Created:** October 30, 2025
**Status:** 🔵 Planning Phase

---

## 📋 PROJECT OVERVIEW

### Vision
Build a comprehensive employee scheduling and communication platform that:
- Replaces Homebase membership completely
- Integrates with Toast POS for employee data
- Provides drag-and-drop schedule builder
- Enables direct and group messaging
- Optimizes labor costs with data-driven insights

### Target Users
- **Managers:** Create schedules, approve requests, message staff
- **Employees:** View schedules, request time off, swap shifts, communicate

### Success Metrics
- ✅ Zero monthly Homebase subscription cost
- ✅ Schedule creation time reduced by 50%
- ✅ 100% team adoption for messaging
- ✅ Real-time labor cost tracking

---

## 🔬 RESEARCH FINDINGS

### GitHub Open Source Analysis

#### martinmicunda/employee-scheduling ⭐ 1,400+ stars
**Tech Stack:**
- Frontend: Angular.js, HTML5, Bootstrap 3
- Backend: Node.js, Hapi.js
- Database: Couchbase
- DevOps: Docker, Vagrant, Ansible, Nginx

**Key Learnings:**
- Microservices architecture with separate UI/API/DB containers
- Modular project structure with submodules
- Environment-specific configuration
- Mobile-first design approach
- Uses Gulp for task automation

**Applicable Patterns:**
- Containerized development environment (optional for us)
- Modular component architecture
- Semantic versioning approach

---

#### clsavino/react-shift-scheduler
**Tech Stack:**
- Frontend: React
- Backend: Node.js, Express
- Database: MongoDB
- Auth: Passport.js (Google/LinkedIn social login)

**Key Features:**
- Employee management & scheduling
- Manager view (create schedules, manage employees)
- Employee view (view schedules, see announcements)
- Social login authentication

**Key Learnings:**
- Role-based access (Manager vs Employee)
- Separate views for different user types
- Announcement/notification system built-in
- MongoDB collections for Users, Employees, Schedules, Announcements

**Applicable Patterns:**
- Manager/Employee role separation (we need this)
- Announcement system (can use for messaging)
- Express.js API structure

---

#### averude/Scheduler ⭐ 200+ stars
**Tech Stack:**
- Frontend: Angular + Material Design + RxJS
- Backend: Java Spring Boot (Spring Data, Spring Security, EhCache)
- Database: PostgreSQL
- Deployment: Docker, Nginx

**Key Features:**
- **Automated schedule generation with pre-established patterns** ⭐
- Multiple administrative levels (Enterprise, Department, Shift)
- Excel export functionality
- Customizable statistics display

**Key Learnings:**
- Template/pattern-based auto-scheduling
- Multi-level organizational structure
- Built-in reporting & export
- Enterprise-grade architecture

**Applicable Patterns:**
- Template-based schedule generation (Phase 2)
- Pattern recognition for auto-scheduler (Phase 5)
- PostgreSQL database (same as Supabase)

---

#### Other Notable Projects:
- **neuronetio/gantt-schedule-timeline-calendar**: Framework-agnostic drag-and-drop calendar (works with React, Vue, Angular, Svelte)
- **milpan/EasyScheduler**: Vanilla JavaScript drag-and-drop task scheduler (similar to our approach)
- **schedule-x/schedule-x**: Modern alternative to FullCalendar with React/Angular/Vue support

**Key Takeaway from GitHub Research:**
Most successful scheduling apps use:
1. **Role-based access control** (Manager vs Employee)
2. **Template/pattern-based auto-generation** (not AI, just rule-based)
3. **Drag-and-drop with visual feedback**
4. **PostgreSQL/MongoDB for data storage**
5. **Separate frontend/backend architecture**
6. **Excel/PDF export capabilities**

---

### Competitive Analysis

#### HotSchedules (Industry Leader)
**Core Features:**
- Drag-and-drop schedule builder with copy/paste shifts
- Auto-populate schedules based on templates
- AI-based demand forecasting (POS data + weather + events)
- Mobile app for shift swapping (5-star rated)
- Broadcast & direct messaging
- Labor rules configuration for compliance
- Historical data analysis

**Pricing Tiers:**
- Classic: Scheduling + communication (no POS sync)
- Advanced: POS-integrated scheduling
- Advanced IQ: AI forecasting + compliance alerts
- Expert: Labor optimization + consultation

#### 7shifts (Restaurant-Specific)
**Key Features:**
- Staff scheduling with labor targets based on projected sales
- Machine learning auto-scheduler considers guest flow
- Shift offering, trading, and open shift requests
- Manager approval workflow
- Mobile-first design
- Time & attendance tracking

#### When I Work (Broad Features)
**Advantages:**
- 110+ features (more than 7shifts)
- Advanced reporting & analytics
- Predictive staffing needs
- Robust payroll integrations
- Works across industries (not just restaurants)

### Must-Have Features (2025 Industry Standards)

#### 1. Auto-Scheduling ⭐ CRITICAL
- Generate optimized shifts based on:
  - Employee availability
  - Labor laws & compliance
  - Forecasted customer demand (from Toast sales data)
  - Labor budget constraints

#### 2. Drag-and-Drop UI ⭐ CRITICAL
- Intuitive visual schedule builder
- Quick shift assignment
- Copy/paste shifts across days/weeks
- Templates for recurring schedules

#### 3. Mobile Optimization ⭐ CRITICAL
- Employees check schedules on mobile
- Shift swapping via mobile
- Push notifications for schedule changes
- Real-time updates

#### 4. Employee Self-Service ⭐ CRITICAL
- Set availability preferences
- Request time off
- Offer shifts to others
- Pick up open shifts
- Manager approval workflow

#### 5. Time & Labor Management
- Real-time labor cost tracking as schedule is built
- Overtime alerts (before exceeding limits)
- Break compliance notifications
- Integration with Toast time entries

#### 6. Communication ⭐ CRITICAL
- Direct messaging (1-on-1)
- Group messaging (all staff, by role, by shift)
- Broadcast announcements
- Schedule change notifications
- Read receipts

#### 7. POS Integration ⭐ CRITICAL
- Sync employee data from Toast
- Pull sales forecasts for smart scheduling
- Track time entries
- Calculate labor cost %

#### 8. Reporting & Analytics
- Labor cost reports
- Schedule efficiency metrics
- Employee performance tracking
- Overtime tracking
- Compliance reports

---

## 🏗️ TECHNICAL ARCHITECTURE

### Frontend
- **Platform:** Single HTML file (`scheduling.html`)
- **Framework:** Vanilla JavaScript (consistent with existing codebase)
- **UI Library:** Custom CSS matching Jayna design system
- **Mobile:** Responsive design, touch-optimized

### Backend (Vercel Serverless Functions)
- `/api/toast-employees.js` - Fetch all employees from Toast
- `/api/schedule-save.js` - Save schedule to database
- `/api/schedule-load.js` - Load schedules by date range
- `/api/schedule-swap-request.js` - Handle shift swap requests
- `/api/schedule-timeoff-request.js` - Handle time off requests
- `/api/schedule-notify.js` - Send schedule notifications
- `/api/messaging-send.js` - Send direct/group messages
- `/api/messaging-load.js` - Load message history

### Database (Supabase)
New tables required:
1. `employees` - Synced from Toast
2. `schedules` - Weekly/daily schedules
3. `shifts` - Individual shift records
4. `shift_swaps` - Swap requests & approvals
5. `time_off_requests` - PTO requests
6. `availability` - Employee availability preferences
7. `messages` - Direct & group messages
8. `message_threads` - Conversation grouping
9. `labor_forecasts` - Sales-based staffing predictions

### External APIs
1. **Toast Labor API**
   - Endpoint: `/labor/v1/employees`
   - Auth: Bearer token
   - Fetches: Employee data (name, email, job, GUID)

2. **Toast Time Entries API** (Optional Phase 2)
   - Track actual hours worked
   - Compare scheduled vs actual

3. **Twilio SMS API** (Optional Phase 3)
   - Send SMS notifications for urgent schedule changes
   - Alternative to in-app messaging

---

## 🎨 UI/UX DESIGN GUIDELINES

### Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  JAYNA SCHEDULING              [Manager View ▼]     │
├─────────────────────────────────────────────────────┤
│  [MY SCHEDULE] [CREATE SCHEDULE] [REQUESTS] [MESSAGES] │
├─────────────────────────────────────────────────────┤
│  Week: Oct 28 - Nov 3, 2025    [< Today >] [+New]  │
├────┬────┬────┬────┬────┬────┬────┬────────────────┤
│    │ SUN│ MON│ TUE│ WED│ THU│ FRI│ SAT│ Labor $    │
├────┼────┼────┼────┼────┼────┼────┼────┼────────────┤
│ AM │    │    │    │    │    │    │    │            │
│ 8AM│ [John] [Mary] [John] [Mary]     │ $450/day   │
│ 9AM│    │    │    │    │    │    │    │            │
├────┼────┼────┼────┼────┼────┼────┼────┼────────────┤
│ PM │    │    │    │    │    │    │    │            │
│ 5PM│ [Tom] [Sarah]              │ $550/day   │
│ 6PM│    │    │    │    │    │    │    │            │
└────┴────┴────┴────┴────┴────┴────┴────┴────────────┘
```

### Color Coding (Existing Jayna Palette)
- **Management:** `var(--gray-900)` - Dark gray
- **FOH Staff:** `var(--primary-blue)` - Sky blue
- **BOH Staff:** `var(--warning)` - Yellow/orange
- **Open Shifts:** `var(--gray-300)` - Light gray (dashed border)
- **Requested Shifts:** `var(--success)` - Green
- **Pending Swaps:** `var(--warning-bg)` - Yellow background

### Drag-and-Drop Behavior
1. **Shift Block:** Colored rectangle with employee name + time
2. **Drag Start:** Block lifts with shadow, cursor changes
3. **Drag Over:** Valid drop zones highlight (green border)
4. **Drop:** Shift moves to new day/time, database updates
5. **Invalid Drop:** Red X cursor, block returns to origin

### Mobile View (< 600px)
- Day-by-day view (not full week)
- Swipe left/right to change days
- List view instead of grid
- Large touch targets (48px minimum)

---

## 💾 DATABASE SCHEMA

### Table: `employees`
```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  toast_guid VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  chosen_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20),
  external_employee_id VARCHAR(100),
  job_title VARCHAR(100),
  job_guid VARCHAR(255),
  hourly_wage DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_synced_from_toast TIMESTAMP
);
```

### Table: `schedules`
```sql
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  created_by VARCHAR(100), -- Manager name
  status VARCHAR(20) DEFAULT 'draft', -- draft, published, archived
  total_labor_cost DECIMAL(10, 2),
  total_hours DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP
);
```

### Table: `shifts`
```sql
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id),
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  position VARCHAR(100), -- 'Server', 'Cook', 'Manager', etc.
  break_minutes INTEGER DEFAULT 0,
  notes TEXT,
  is_open_shift BOOLEAN DEFAULT false, -- No employee assigned yet
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_shifts_date ON shifts(shift_date);
CREATE INDEX idx_shifts_employee ON shifts(employee_id);
```

### Table: `shift_swaps`
```sql
CREATE TABLE shift_swaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE,
  requesting_employee_id UUID REFERENCES employees(id),
  accepting_employee_id UUID REFERENCES employees(id),
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, cancelled
  request_reason TEXT,
  manager_notes TEXT,
  requested_at TIMESTAMP DEFAULT NOW(),
  responded_at TIMESTAMP,
  responded_by VARCHAR(100) -- Manager name
);
```

### Table: `time_off_requests`
```sql
CREATE TABLE time_off_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  manager_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  responded_at TIMESTAMP,
  responded_by VARCHAR(100)
);
```

### Table: `availability`
```sql
CREATE TABLE availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id),
  day_of_week INTEGER, -- 0=Sunday, 6=Saturday
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Table: `messages`
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID,
  sender_id UUID REFERENCES employees(id),
  recipient_id UUID REFERENCES employees(id), -- NULL for group messages
  message_text TEXT NOT NULL,
  is_group_message BOOLEAN DEFAULT false,
  group_name VARCHAR(100), -- 'All Staff', 'FOH Team', etc.
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_thread ON messages(thread_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
```

### Table: `labor_forecasts` (Phase 2)
```sql
CREATE TABLE labor_forecasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  forecast_date DATE NOT NULL,
  predicted_sales DECIMAL(10, 2),
  recommended_staff_count INTEGER,
  recommended_labor_cost DECIMAL(10, 2),
  based_on_historical_data JSONB, -- Last 4 weeks same day
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🚀 IMPLEMENTATION PHASES

### ✅ PHASE 0: RESEARCH & PLANNING
**Timeline:** Oct 30, 2025 (COMPLETED)
**Status:** ✅ COMPLETE

- [x] Research HotSchedules features
- [x] Research 7shifts features
- [x] Research When I Work features
- [x] Research Toast Labor API
- [x] Research messaging solutions (Twilio)
- [x] Research drag-and-drop best practices
- [x] Research GitHub open-source examples
- [x] Create master planning document
- [x] **User review and approval of plan**

**Completion Notes:**
- ✅ Completed comprehensive research on Oct 30, 2025 at 10:15 AM PST
- ✅ Identified key features from industry leaders (HotSchedules, 7shifts, When I Work)
- ✅ Analyzed 3 major GitHub open-source projects (1,400+ stars)
- ✅ Toast API `/labor/v1/employees` confirmed as data source
- ✅ Twilio SMS identified as optional Phase 7 enhancement
- ✅ Created 1,220-line master plan document
- ✅ Committed to git: e066314
- ✅ User approved plan and requested Phase 1-2 completion today
- 📝 User requested break after master plan update - will resume Phase 1-2 when ready

**GitHub Projects Analyzed:**
- martinmicunda/employee-scheduling (1,400+ stars) - Angular + Node.js
- clsavino/react-shift-scheduler - React + MongoDB
- averude/Scheduler (200+ stars) - Angular + Spring Boot + PostgreSQL

**Next Action:** Resume Phase 1 (Foundation) when user is ready

---

### 🔵 PHASE 1: FOUNDATION (Week 1)
**Timeline:** TBD after plan approval
**Goal:** Basic infrastructure + employee data sync

#### Tasks:

**1.1: Create Database Tables**
- [ ] Create `employees` table in Supabase
- [ ] Create `schedules` table
- [ ] Create `shifts` table
- [ ] Set up Row Level Security (RLS) policies
- [ ] Create indexes for performance

**Completion Checklist:**
- [ ] Tables created
- [ ] RLS policies tested
- [ ] Indexes verified
- [ ] Seed data inserted for testing

**Notes:** _[To be filled during implementation]_

---

**1.2: Toast Employee Sync API**
- [ ] Create `/api/toast-employees.js` serverless function
- [ ] Implement GET request to Toast `/labor/v1/employees`
- [ ] Parse employee data (name, email, job, GUID, wage)
- [ ] Upsert employees to Supabase `employees` table
- [ ] Handle deleted/inactive employees
- [ ] Add last_synced_from_toast timestamp

**Completion Checklist:**
- [ ] API endpoint functional
- [ ] Successfully fetches all employees
- [ ] Data correctly maps to database schema
- [ ] Handles errors gracefully
- [ ] Tested with production Toast data

**Notes:** _[To be filled during implementation]_

---

**1.3: Basic HTML Page Structure**
- [ ] Create `scheduling.html` in root directory
- [ ] Copy base CSS from `foh-checklists.html` (Jayna design system)
- [ ] Add Supabase client initialization
- [ ] Create header with navigation tabs
- [ ] Create loading overlay (match existing pattern)
- [ ] Create success/error overlays

**Completion Checklist:**
- [ ] File created and accessible locally
- [ ] CSS matches Jayna brand (Aptos font, sky blue accent)
- [ ] Supabase connection verified
- [ ] Responsive on mobile
- [ ] No console errors

**Notes:** _[To be filled during implementation]_

---

**1.4: Employee List View**
- [ ] Create "STAFF" tab
- [ ] Display employee table (name, email, job, status)
- [ ] Add "SYNC FROM TOAST" button
- [ ] Show last sync timestamp
- [ ] Add loading state during sync
- [ ] Display success message after sync

**Completion Checklist:**
- [ ] Employee list displays correctly
- [ ] Sync button functional
- [ ] Loading state shows during API call
- [ ] Success/error messages display
- [ ] Table sortable by name/job

**Notes:** _[To be filled during implementation]_

---

### 🟡 PHASE 2: SCHEDULE BUILDER (Week 2)
**Goal:** Create and save schedules manually

#### Tasks:

**2.1: Weekly Calendar View**
- [ ] Create week grid layout (7 days)
- [ ] Display date headers (Sun-Sat)
- [ ] Add time slots (hourly rows 6 AM - 12 AM)
- [ ] Add week navigation (prev/next arrows)
- [ ] Add "Jump to Today" button
- [ ] Show current week highlight

**Completion Checklist:**
- [ ] Calendar displays correctly
- [ ] Week navigation functional
- [ ] Time slots properly aligned
- [ ] Mobile responsive (switches to day view)

**Notes:** _[To be filled during implementation]_

---

**2.2: Create Shift Modal**
- [ ] Create "Add Shift" button
- [ ] Modal with form: Employee dropdown, Date, Start time, End time, Position, Notes
- [ ] Load employees from database
- [ ] Validate time ranges (end > start)
- [ ] Calculate shift hours
- [ ] Show estimated labor cost (hours × wage)
- [ ] Save shift to database

**Completion Checklist:**
- [ ] Modal opens/closes correctly
- [ ] Form validation working
- [ ] Employee dropdown populated
- [ ] Labor cost calculates correctly
- [ ] Shifts save to `shifts` table

**Notes:** _[To be filled during implementation]_

---

**2.3: Display Shifts on Calendar**
- [ ] Query shifts for selected week
- [ ] Render shift blocks on calendar grid
- [ ] Color code by position (FOH/BOH/Manager)
- [ ] Show employee name + time range
- [ ] Make shift blocks clickable (edit modal)
- [ ] Show labor cost summary per day

**Completion Checklist:**
- [ ] Shifts display in correct date/time slots
- [ ] Color coding works
- [ ] Click to edit functional
- [ ] Labor cost totals accurate

**Notes:** _[To be filled during implementation]_

---

**2.4: Drag-and-Drop Functionality**
- [ ] Make shift blocks draggable
- [ ] Highlight valid drop zones on drag start
- [ ] Update database on successful drop
- [ ] Show visual feedback (shadow, cursor)
- [ ] Prevent invalid drops (e.g., overlapping shifts)
- [ ] Update labor cost totals after drop

**Completion Checklist:**
- [ ] Drag starts correctly
- [ ] Drop zones highlight
- [ ] Database updates on drop
- [ ] Invalid drops prevented with error message
- [ ] Works on touch devices (mobile)

**Notes:** _[To be filled during implementation]_

---

**2.5: Copy/Paste & Templates**
- [ ] Add "Copy Week" button
- [ ] Select previous week to copy from
- [ ] Paste all shifts to current week (adjust dates)
- [ ] Create "Save as Template" feature
- [ ] Load template to quickly populate week

**Completion Checklist:**
- [ ] Copy week functional
- [ ] Date adjustment works correctly
- [ ] Templates save to database
- [ ] Templates load correctly

**Notes:** _[To be filled during implementation]_

---

### 🟢 PHASE 3: EMPLOYEE FEATURES (Week 3)
**Goal:** Self-service for employees

#### Tasks:

**3.1: My Schedule View (Employee Mode)**
- [ ] Create "MY SCHEDULE" tab
- [ ] Display only shifts for logged-in employee
- [ ] Show upcoming shifts (next 2 weeks)
- [ ] Print/export schedule (PDF)
- [ ] Mobile-optimized list view

**Completion Checklist:**
- [ ] Employee can view their shifts
- [ ] Only their shifts displayed (security)
- [ ] PDF export works
- [ ] Mobile view functional

**Notes:** _[To be filled during implementation]_

---

**3.2: Availability Settings**
- [ ] Create "AVAILABILITY" tab
- [ ] Grid: Days of week × time ranges
- [ ] Employee marks available/unavailable times
- [ ] Save to `availability` table
- [ ] Manager can view availability when creating shifts

**Completion Checklist:**
- [ ] Availability grid functional
- [ ] Saves correctly to database
- [ ] Manager sees availability indicators

**Notes:** _[To be filled during implementation]_

---

**3.3: Time Off Requests**
- [ ] Create "REQUEST TIME OFF" button
- [ ] Form: Start date, End date, Reason
- [ ] Save to `time_off_requests` table (status: pending)
- [ ] Manager notification (in-app + optional email)
- [ ] Manager approve/reject interface
- [ ] Employee sees request status

**Completion Checklist:**
- [ ] Request form works
- [ ] Manager receives notification
- [ ] Approve/reject functional
- [ ] Status updates display correctly

**Notes:** _[To be filled during implementation]_

---

**3.4: Shift Swap Requests**
- [ ] "Offer Shift" button on each shift
- [ ] Select coworker to offer to
- [ ] Save to `shift_swaps` table (status: pending)
- [ ] Receiving employee sees offer
- [ ] Accept/decline buttons
- [ ] Manager final approval required
- [ ] Update shift assignment after approval

**Completion Checklist:**
- [ ] Swap request flow works end-to-end
- [ ] Notifications sent to all parties
- [ ] Manager approval enforced
- [ ] Shift assignment updates correctly

**Notes:** _[To be filled during implementation]_

---

### 🟣 PHASE 4: MESSAGING SYSTEM (Week 4)
**Goal:** Replace Homebase messaging

#### Tasks:

**4.1: Direct Messaging (1-on-1)**
- [ ] Create "MESSAGES" tab
- [ ] List of conversations (threads)
- [ ] Click to open conversation
- [ ] Message input + send button
- [ ] Save to `messages` table
- [ ] Real-time updates (poll every 5 seconds)
- [ ] Mark as read functionality

**Completion Checklist:**
- [ ] Conversation list displays
- [ ] Can send/receive messages
- [ ] Messages persist in database
- [ ] Read receipts work
- [ ] Real-time polling functional

**Notes:** _[To be filled during implementation]_

---

**4.2: Group Messaging**
- [ ] "New Group Message" button
- [ ] Select recipients (checkboxes for all staff)
- [ ] Pre-defined groups: "All Staff", "FOH Team", "BOH Team", "Managers"
- [ ] Send message to all selected
- [ ] Group conversation thread
- [ ] Show all participants in header

**Completion Checklist:**
- [ ] Group selection works
- [ ] Message sends to all recipients
- [ ] Group threads display correctly
- [ ] Participants list visible

**Notes:** _[To be filled during implementation]_

---

**4.3: Schedule Change Notifications**
- [ ] Trigger notification when shift added/edited/deleted
- [ ] Create in-app notification badge (unread count)
- [ ] Show notification in messages tab
- [ ] Click notification to view schedule change
- [ ] Mark notification as read

**Completion Checklist:**
- [ ] Notifications trigger correctly
- [ ] Badge shows unread count
- [ ] Click to view works
- [ ] Mark as read functional

**Notes:** _[To be filled during implementation]_

---

**4.4: Push Notifications (Optional Enhancement)**
- [ ] Integrate browser push notifications API
- [ ] Request permission on first load
- [ ] Send push when schedule published
- [ ] Send push for new messages
- [ ] User can enable/disable in settings

**Completion Checklist:**
- [ ] Permission request works
- [ ] Notifications send successfully
- [ ] Works in background (PWA)
- [ ] Settings toggle functional

**Notes:** _[To be filled during implementation]_

---

### 🔴 PHASE 5: SMART FEATURES (Week 5)
**Goal:** Labor optimization & automation

#### Tasks:

**5.1: Labor Cost Tracking**
- [ ] Calculate total labor cost per shift
- [ ] Display running total as schedule is built
- [ ] Show labor cost % (labor cost / projected sales)
- [ ] Highlight when over budget (red warning)
- [ ] Daily and weekly summaries

**Completion Checklist:**
- [ ] Labor cost calculates correctly
- [ ] Real-time updates as shifts added
- [ ] Budget warnings display
- [ ] Summary reports accurate

**Notes:** _[To be filled during implementation]_

---

**5.2: Sales Forecasting (Toast Integration)**
- [ ] Create `/api/toast-sales-forecast.js`
- [ ] Fetch sales data from Toast for same day last 4 weeks
- [ ] Calculate average sales per day/hour
- [ ] Display forecast on schedule builder
- [ ] Recommend staff count based on sales

**Completion Checklist:**
- [ ] API fetches Toast sales data
- [ ] Forecast calculation accurate
- [ ] Displays on schedule builder
- [ ] Staff recommendations useful

**Notes:** _[To be filled during implementation]_

---

**5.3: Auto-Scheduler (Simple Version)**
- [ ] "AUTO-GENERATE WEEK" button
- [ ] Input: Required staff per shift
- [ ] Algorithm:
  - Check employee availability
  - Check time off requests
  - Distribute shifts evenly
  - Avoid back-to-back closing/opening shifts
  - Respect max hours per week
- [ ] Generate draft schedule
- [ ] Manager can edit before publishing

**Completion Checklist:**
- [ ] Auto-generation works
- [ ] Respects all constraints
- [ ] Produces reasonable schedule
- [ ] Manager can edit output

**Notes:** _[To be filled during implementation]_

---

**5.4: Overtime Alerts**
- [ ] Calculate hours per employee per week
- [ ] Show warning when approaching 40 hours
- [ ] Show error when exceeding 40 hours
- [ ] Prevent scheduling over limit (configurable)

**Completion Checklist:**
- [ ] Hour tracking accurate
- [ ] Warnings display correctly
- [ ] Hard limit enforced (if enabled)

**Notes:** _[To be filled during implementation]_

---

**5.5: Compliance Rules (Break Reminders)**
- [ ] Detect shifts > 6 hours
- [ ] Require break_minutes field populated
- [ ] Show warning if break not scheduled
- [ ] Display break time on shift block

**Completion Checklist:**
- [ ] Break detection works
- [ ] Warnings display
- [ ] Break time visible on schedule

**Notes:** _[To be filled during implementation]_

---

### 🎯 PHASE 6: POLISH & LAUNCH (Week 6)
**Goal:** Production-ready system

#### Tasks:

**6.1: Manager vs Employee Permissions**
- [ ] Implement session-based authentication (use existing pattern)
- [ ] Manager password protection for editing schedules
- [ ] Employees can only view + request changes
- [ ] Hide admin features from employee view

**Completion Checklist:**
- [ ] Password protection works
- [ ] Permissions enforced correctly
- [ ] Employee view restricted appropriately

**Notes:** _[To be filled during implementation]_

---

**6.2: Mobile PWA Optimization**
- [ ] Add web app manifest
- [ ] Add service worker for offline access
- [ ] Add home screen icon
- [ ] Test on iOS Safari
- [ ] Test on Android Chrome

**Completion Checklist:**
- [ ] PWA installable on mobile
- [ ] Works offline (cached schedules)
- [ ] Icon displays correctly
- [ ] No console errors on mobile

**Notes:** _[To be filled during implementation]_

---

**6.3: Reporting Dashboard**
- [ ] Create "REPORTS" tab (manager only)
- [ ] Labor cost summary (by week/month)
- [ ] Employee hours worked (by week/month)
- [ ] Overtime report
- [ ] Export to CSV

**Completion Checklist:**
- [ ] Reports generate correctly
- [ ] Data accurate
- [ ] CSV export works
- [ ] Manager-only access enforced

**Notes:** _[To be filled during implementation]_

---

**6.4: User Testing**
- [ ] Test with 2-3 managers
- [ ] Test with 5-10 employees
- [ ] Collect feedback on UI/UX
- [ ] Fix reported bugs
- [ ] Make requested improvements

**Completion Checklist:**
- [ ] Feedback collected
- [ ] Critical bugs fixed
- [ ] UI improvements made
- [ ] Re-tested after changes

**Notes:** _[To be filled during implementation]_

---

**6.5: Add to Navigation**
- [ ] Add "SCHEDULING" button to `shared-header.js`
- [ ] Link to `scheduling.html`
- [ ] Test from all pages (index, FOH, BOH, manager)
- [ ] Ensure consistent styling

**Completion Checklist:**
- [ ] Button appears on all pages
- [ ] Link works correctly
- [ ] Styling matches other nav buttons

**Notes:** _[To be filled during implementation]_

---

**6.6: Cancel Homebase Subscription**
- [ ] Verify all Homebase features replicated
- [ ] Export any historical data from Homebase
- [ ] Cancel subscription
- [ ] Notify team of new system
- [ ] Provide training/documentation

**Completion Checklist:**
- [ ] Feature parity confirmed
- [ ] Data exported and backed up
- [ ] Subscription cancelled
- [ ] Team trained on new system
- [ ] 🎉 **HOMEBASE FULLY REPLACED**

**Notes:** _[To be filled during implementation]_

---

## 📱 OPTIONAL PHASE 7: SMS INTEGRATION (Future Enhancement)
**Goal:** SMS notifications for urgent changes

#### Tasks:

**7.1: Twilio Setup**
- [ ] Create Twilio account
- [ ] Get phone number
- [ ] Add API credentials to environment variables
- [ ] Create `/api/sms-send.js` serverless function

**7.2: SMS Triggers**
- [ ] Send SMS when shift added within 24 hours
- [ ] Send SMS for urgent schedule changes
- [ ] Send SMS for manager-to-employee direct messages
- [ ] Rate limit to prevent spam
- [ ] User opt-in/opt-out settings

**7.3: Cost Management**
- [ ] Track SMS usage in database
- [ ] Set monthly budget limit
- [ ] Alert when approaching limit
- [ ] Manager approval for bulk SMS

**Completion Checklist:**
- [ ] Twilio integration works
- [ ] SMS sent successfully
- [ ] Cost tracking functional
- [ ] Opt-in/opt-out works

**Notes:** _SMS is optional - in-app notifications may be sufficient for MVP_

---

## 🔧 DEVELOPMENT GUIDELINES

### Code Standards
1. **Follow existing patterns:** Copy from `foh-checklists.html`, `catering.html`
2. **Use pure DOM manipulation:** `createElement()` + `appendChild()` (not innerHTML)
3. **CSS Variables:** Use Jayna design system colors (`var(--primary-blue)`, etc.)
4. **No external libraries:** Vanilla JS only (no jQuery, React, etc.)
5. **Mobile-first:** Design for mobile, enhance for desktop
6. **Accessibility:** ARIA labels, keyboard navigation, screen reader support

### Testing Checklist (Every Feature)
- [ ] Works on Chrome desktop
- [ ] Works on Safari desktop
- [ ] Works on iOS Safari (iPhone)
- [ ] Works on Android Chrome
- [ ] Works with manager session
- [ ] Works with employee session
- [ ] No console errors
- [ ] Database updates correctly
- [ ] Error handling functional
- [ ] Loading states display

### Git Commit Standards
```bash
feat(scheduling): Add drag-and-drop shift builder
fix(scheduling): Handle overlapping shift validation
refactor(scheduling): Improve calendar grid layout
docs(scheduling): Update master plan with Phase 2 completion
```

---

## 📊 SUCCESS CRITERIA

### MVP Launch Requirements (Phase 1-3)
- [x] Sync employees from Toast
- [ ] Create weekly schedules manually
- [ ] Drag-and-drop shift assignment
- [ ] Employee view of their schedule
- [ ] Time off requests
- [ ] Shift swap requests

### Full Feature Parity with Homebase (Phase 4-5)
- [ ] Direct messaging
- [ ] Group messaging
- [ ] Labor cost tracking
- [ ] Auto-scheduler
- [ ] Overtime alerts
- [ ] Compliance rules

### Production Ready (Phase 6)
- [ ] Manager permissions enforced
- [ ] Mobile PWA optimized
- [ ] User tested and approved
- [ ] Added to main navigation
- [ ] Homebase cancelled

---

## 🚨 KNOWN CHALLENGES & SOLUTIONS

### Challenge 1: Real-Time Updates
**Problem:** Multiple managers editing same schedule simultaneously
**Solution:**
- Lock editing to one manager at a time
- Show "Currently editing: [Name]" indicator
- Auto-save every 30 seconds
- Conflict resolution: Last save wins + notification

### Challenge 2: Mobile Drag-and-Drop
**Problem:** Touch events differ from mouse events
**Solution:**
- Use HTML5 Drag and Drop API with touch polyfill
- Test on actual devices (not just browser DevTools)
- Large touch targets (48px minimum)
- Haptic feedback on drag start (if supported)

### Challenge 3: Toast API Rate Limits
**Problem:** Toast may limit API requests
**Solution:**
- Cache employee data in Supabase
- Sync from Toast max once per hour
- Use webhooks if Toast supports them
- Show "last synced" timestamp to users

### Challenge 4: Data Migration from Homebase
**Problem:** Historical schedules in Homebase
**Solution:**
- Export CSV from Homebase before cancelling
- Create one-time import script
- Manual entry for recent schedules
- Start fresh if migration too complex

---

## 📝 NEXT STEPS

### Immediate Actions (After Plan Approval)
1. ✅ User reviews this plan
2. ✅ User approves to proceed
3. Create Supabase database tables (Phase 1.1)
4. Build Toast employee sync API (Phase 1.2)
5. Create basic `scheduling.html` page (Phase 1.3)

### Questions for User - ✅ ANSWERED (Oct 30, 2025)
1. **Manager Access:** ✅ YES - Use existing manager password system (30-min/60-min sessions)
2. **Employee Login:** ✅ Whichever is easiest to develop AND easiest for staff to use (Decision: Simple 4-digit code per employee)
3. **Week Start:** ✅ Sundays (but make it configurable in settings for future flexibility)
4. **Hourly Wages:** ✅ ALWAYS sync from Toast - most up-to-date accurate data
5. **Priority Features:** ✅ **MOST IMPORTANT: Drag-and-drop 7-day schedule view** - Get this working first, then iterate based on live testing feedback

**Development Priority:** Visual schedule builder FIRST → then features incrementally based on production testing.

---

## 📞 SUPPORT & MAINTENANCE

### Post-Launch
- Monitor error logs daily (first week)
- Weekly check-ins with managers (first month)
- Quarterly feature reviews
- Annual cost analysis vs Homebase

### Documentation Needed
- [ ] Manager quick start guide
- [ ] Employee user guide
- [ ] Video tutorial for schedule creation
- [ ] Troubleshooting FAQ
- [ ] API documentation for future developers

---

## 💰 COST SAVINGS ANALYSIS

### Homebase Monthly Cost: ~$XX/month
*(User: Please provide current Homebase cost)*

### New System Costs:
- Supabase: Included in existing plan ($0 additional)
- Vercel: Included in existing plan ($0 additional)
- Toast API: Free (already paying for Toast POS)
- Twilio SMS (optional): ~$0.0075/SMS (only if implemented Phase 7)

### **Estimated Annual Savings: $XXX - $XXX**
*(Homebase cost × 12 months)*

### **ROI Timeline: Immediate**
*(Zero additional monthly costs)*

---

## 🎉 PROJECT COMPLETION TRACKER

**Overall Progress: 15% (Research Complete, Ready to Start Phase 1-2)**

- ✅ Phase 0: Research & Planning (100%) - COMPLETED Oct 30, 2025
- 🔵 Phase 1: Foundation (0%) - READY TO START (paused at user request)
- ⬜ Phase 2: Schedule Builder (0%) - Planned for today
- ⬜ Phase 3: Employee Features (0%)
- ⬜ Phase 4: Messaging System (0%)
- ⬜ Phase 5: Smart Features (0%)
- ⬜ Phase 6: Polish & Launch (0%)
- ⬜ Phase 7: SMS Integration (Optional)

---

**Last Updated:** October 30, 2025, 10:30 AM PST
**Next Review Date:** Oct 30, 2025 (resume Phase 1-2 after break)
**Estimated Completion:** 6 weeks from start date

**Current Status:**
- ✅ Master plan created and approved
- 📝 User requested break before starting Phase 1
- 🎯 Goal: Complete Phase 1-2 today when resuming
- 💡 All research and planning complete, ready to build

---

## 🔗 REFERENCE LINKS

### Toast API Documentation
- [Getting All Employees](https://doc.toasttab.com/doc/devguide/api_get_all_employees.html)
- [Employee Management Integration](https://doc.toasttab.com/doc/cookbook/apiIntegrationChecklistEmployee.html)
- [API Reference](https://toastintegrations.redoc.ly/)

### Competitive Analysis
- [HotSchedules Review](https://connecteam.com/reviews/hotschedules/)
- [7shifts vs When I Work](https://wheniwork.com/blog/7shifts-vs-wheniwork)
- [Restaurant Scheduling Best Practices](https://www.7shifts.com/blog/best-practices-for-restaurant-scheduling/)

### Technical Resources
- [Twilio SMS API](https://www.twilio.com/docs/messaging/api)
- [HTML5 Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)
- [Web Push Notifications](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)

---

**END OF MASTER PLAN**

*This document will be updated as each task is completed. All changes should be committed to git with descriptive commit messages.*
