# CLAUDE CODE PROJECT CONTINUITY - JAYNA CASH COUNTER
## AI Assistant Instructions for Restaurant Management System

---

## ⚡ READ THIS FIRST - EVERY SESSION

When starting ANY Claude Code session in this project (IN THIS ORDER):

1. ✅ **Read last 3 RTF chat sessions** from `/chat sessions/` folder
   - Sort files by name (newest first)
   - Read the 3 most recent `session_YYYY-MM-DD_*.rtf` files
   - These contain complete conversation history with full context
   - Pay attention to: what was built, decisions made, blockers, user preferences

2. ✅ **Read CURRENT_STATUS.md** - Current work state, blockers, next steps

3. ✅ **Read this file (AI_PROJECT_INSTRUCTIONS.md) completely**

4. ✅ **Read PROJECT_MASTER_LOG.md for full history** (last 3 entries minimum)

5. ✅ **Read CURRENT_PROJECT_DOCUMENTATION.md** for system overview

6. ✅ **Ask: "What are we working on today?"**

7. ✅ **Update CURRENT_STATUS.md with session start time**

---

## 🎯 YOUR AUTONOMOUS MANDATE - **FULL AUTHORIZATION**

**USER AUTHORIZATION LEVEL: MAXIMUM** ✅
**Date Authorized:** October 6, 2025
**Authorization:** Full access to all files, actions, and decisions

### 1. You Can Make ALL Technical Decisions
- ✅ Choose appropriate frameworks, libraries, architectures
- ✅ Decide file structures and naming conventions
- ✅ Select optimal algorithms and data structures
- ✅ Implement best practices without asking permission
- ✅ Refactor code for performance and maintainability
- ✅ **Make architectural decisions independently**
- ✅ **Choose and implement new technologies**
- ✅ **Optimize performance without approval**

### 2. You Can Write and Deploy Code - FULL ACCESS
- ✅ Create all necessary files and directories
- ✅ Write complete, production-ready code
- ✅ Add proper error handling and logging
- ✅ Include comprehensive comments
- ✅ Build test suites
- ✅ Deploy to Vercel environment
- ✅ **Commit and push to GitHub autonomously**
- ✅ **Run all tests autonomously**
- ✅ **Fix bugs immediately without asking**
- ✅ **Deploy to production when ready**

### 3. You Can Solve Problems Independently - FULL TRUST
- ✅ Debug errors without constant check-ins
- ✅ Research solutions to technical challenges
- ✅ Try multiple approaches if first attempt fails
- ✅ Optimize and improve existing code
- ✅ Handle edge cases and error scenarios
- ✅ **Make security decisions**
- ✅ **Implement best practices automatically**
- ✅ **Refactor entire systems if needed**

### 4. Work Autonomously - NO APPROVALS NEEDED
- ✅ **Work through entire phases without check-ins**
- ✅ **Test code yourself and verify it works**
- ✅ **Commit frequently with good messages**
- ✅ **Push to production when tests pass**
- ✅ **Document as you go**
- ✅ **Fix issues immediately when found**

### 5. When to Inform (Not Ask)
- 💬 After completing major milestones
- 💬 When phase is complete and tested
- 💬 When encountering genuine blockers
- 💬 When making business logic assumptions (inform what you decided)
- 💬 Summary updates after significant work

### 6. Make Progress Over Perfection
- ✅ Ship working code, iterate later
- ✅ Don't get stuck on edge cases initially
- ✅ MVP first, optimization second
- ✅ Comment "TODO" for future improvements

### 7. When Stuck (Max 30 Minutes Rule)
If you can't solve something after 30 min:
- Document what you tried
- Note the error messages
- State what you need to continue
- Ask user for input
- Meanwhile, move to a different task

---

## 📁 PROJECT STRUCTURE - JAYNA CASH COUNTER

```
/project-root/
├── AI_PROJECT_INSTRUCTIONS.md          ← THIS FILE
├── PROJECT_MASTER_LOG.md               ← Complete project history
├── CURRENT_PROJECT_DOCUMENTATION.md    ← System overview
├── START_POINT_[DATE].md               ← Session-specific context
│
├── index.html (8000+ lines)            ← Main cash counter app
├── manager.html (100KB)                ← Analytics dashboard
├── comprehensive-analysis.html         ← Debug tool
├── height-calculator.html              ← Utility
├── toast-orders-testing.html           ← Testing tool
│
├── api/                                ← Vercel serverless functions
│   ├── toast-auth.js
│   ├── toast-comprehensive-analysis.js
│   ├── toast-delivery-analysis.js
│   ├── toast-tds-driver-tips.js
│   ├── toast-orders-flexible.js
│   ├── toast-orders.js
│   ├── toast-payments.js
│   ├── toast-menus.js
│   ├── toast-restaurant.js
│   └── homebase-proxy.js
│
├── ARCHIVE/                            ← Version backups
│   ├── WORKING v2.0 DO NOT EDIT/
│   ├── WORKING v2.52 DO NOT EDIT/
│   ├── WORKING v2.84 DO NOT EDIT/
│   └── WORKING v2.85 DO NOT EDIT/
│
├── Documentation Files:
│   ├── README.md
│   ├── PROJECT_SUMMARY.md
│   ├── PROCESS_LOG.md
│   ├── QUICK_START.md
│   ├── COMPREHENSIVE_SYSTEM_DOCUMENTATION.md
│   └── HOMEBASE_API_COMPREHENSIVE_DOCUMENTATION.md
│
├── .env (NEVER COMMIT)
├── .gitignore
└── vercel.json
```

---

## 🚀 SESSION STARTUP PROTOCOL

### 1. Context Loading
```bash
# First, understand where we are
- Read AI_PROJECT_INSTRUCTIONS.md (this file)
- Read PROJECT_MASTER_LOG.md (newest entries first, if exists)
- Review CURRENT_PROJECT_DOCUMENTATION.md for system overview
- Review most recent START_POINT file
- Check PROCESS_LOG.md for recent changes
- Scan recent commits: git log --oneline -10
```

### 2. Status Summary
Tell user what I found:
- Last session date and focus
- Current project state
- Pending tasks or blockers
- Recent changes or decisions

### 3. Session Initialization
After user confirms today's focus:
1. **Create START_POINT_[YYYY-MM-DD].md** with:
   - Today's date/time
   - Stated goal for this session
   - Relevant context from previous work
   - Files we'll be working with

2. **Update PROJECT_MASTER_LOG.md** (add new entry at TOP)

---

## 📋 PROJECT_MASTER_LOG.md FORMAT

**File Location:** ./PROJECT_MASTER_LOG.md

**Structure (NEWEST FIRST):**
```markdown
# PROJECT MASTER LOG - JAYNA CASH COUNTER
Last Updated: [Auto-update with each entry]

---

## [YYYY-MM-DD HH:MM] - Session Title
**Worked on by:** Claude Code CLI
**Focus:** What we're building/fixing
**Context:** Relevant background
**Commands Run:** Key terminal commands executed
**Files Modified:** List of changed files
**Decisions Made:** Key choices and rationale
**Status:** In Progress | Completed | Blocked
**Next Steps:** Clear action items

---

[Previous sessions below...]
```

---

## ⚙️ JAYNA CASH COUNTER - SPECIFIC CONTEXT

### **What This System Does**
Jayna Cash Counter is a **comprehensive restaurant management platform** that combines:
1. **Cash counting system** (AM/PM workflows with dual drawers)
2. **Tip pool calculator** with Toast POS integration
3. **Automated daily reporting** via EmailJS
4. **Manager analytics dashboard** with real-time insights
5. **Labor management** through Homebase API integration

### **Core Technology Stack**
- **Frontend**: Vanilla JavaScript, HTML5, CSS3 (mobile-first)
- **Backend**: Vercel Serverless Functions (Node.js)
- **Database**: Supabase (PostgreSQL)
- **APIs**: Toast POS, Homebase
- **Services**: EmailJS, PDF generation (jsPDF, html2pdf.js)
- **Deployment**: Vercel (https://jayna-cash-counter.vercel.app)

### **Critical System Components**

#### **1. Cash Counting Workflows**
- **AM Count**: Morning cash baseline (dual drawers)
- **PM Close**: Evening reconciliation with sophisticated deposit rounding (V2.84)
- **Database**: Supabase `cash_counts` table with JSONB denomination data
- **Email**: Automated reports to management via EmailJS

#### **2. Tip Pool Calculator**
- **TDS Driver GUID**: `5ffaae6f-4238-477d-979b-3da88d45b8e2`
- **Expected Weekly Tips**: $481.83 (537 orders)
- **Calculation**: Net Tips = Gross Tips - Voided - Refunded
- **API**: `/api/toast-tds-driver-tips` (comprehensive analysis method)

#### **3. Manager Dashboard**
- **Live Metrics**: Real-time Toast POS data
- **Labor Analytics**: Homebase API integration
- **Revenue Analytics**: Complete order pagination (ALL orders, not just 100)
- **Recent Orders**: Order tracking and analysis

#### **4. Security Configuration**
- **Admin Password**: `JaynaGyro2025!` (for historical date access)
- **Environment Variables**: All secrets in .env (NEVER COMMIT)
- **CORS**: Restricted to Vercel domain
- **API Security**: No hardcoded secrets in frontend code

### **Recent Major Fixes & Features**

#### **October 1, 2025 - Toast Orders Pagination Fix**
- **Problem**: Revenue Analytics showing $31.18 instead of $240
- **Fix**: Removed pageSize=100 limit, implemented full pagination
- **Result**: Now fetches ALL orders for accurate analytics

#### **October 1, 2025 - Homebase API Security**
- **Fix**: Removed hardcoded HOMEBASE_LOCATION_UUID from frontend
- **Enhancement**: Backend UUID injection from environment variables
- **Result**: No hardcoded secrets in client code

#### **September 30, 2025 - TDS Driver Fix**
- **Problem**: Auto-fetch returned $509.30 instead of $481.83
- **Fix**: Comprehensive analysis method (fetch ALL orders, filter by server GUID)
- **Result**: Accurate $481.83 calculation

#### **September 1, 2025 - V2.84 Deposit Rounding**
- **Feature**: Sophisticated whole-dollar deposit rounding
- **Logic**: Tips absorb rounding, excess returns to cashbox
- **Result**: Staff simplicity + perfect mathematical balance

---

## 💻 CODE QUALITY & STANDARDS

### **Code Quality Rules**
- **JavaScript**: Clean ES6+, avoid unnecessary dependencies
- **Error Handling**: Try-catch everywhere, never silent fails
- **Logging**: Console.log for debugging, clear error messages
- **Testing**: Manual testing required before commits
- **Comments**: Explain "why" not "what"
- **Security**: Always validate input, never hardcode secrets

### **File Naming Conventions**
- **HTML Files**: lowercase-with-dashes.html
- **API Files**: kebab-case.js (in /api folder)
- **Documentation**: UPPERCASE_WITH_UNDERSCORES.md
- **Backups**: Use ARCHIVE folder with version folders

### **Git Commit Standards**
Use conventional commits format:
```bash
feat(cash-counter): add real-time calculation updates
fix(toast-api): handle pagination for ALL orders
refactor(manager): improve dashboard performance
docs(readme): update deployment instructions
security(homebase): remove hardcoded UUIDs
```

### **Definition of Done (For Each Feature)**
- ✅ Code written and tested locally
- ✅ Manual testing completed (no automated tests yet)
- ✅ Error handling implemented
- ✅ Console logging added for debugging
- ✅ Code self-reviewed
- ✅ Documentation updated if needed
- ✅ Committed with clear message
- ✅ Pushed to GitHub (auto-deploys to Vercel)
- ✅ Verified on production URL

---

## 🚨 CRITICAL PROJECT-SPECIFIC RULES

### **ALWAYS DO:**
✅ Read AI_PROJECT_INSTRUCTIONS.md at start of EVERY session
✅ Read PROJECT_MASTER_LOG.md to understand history (if exists)
✅ Read CURRENT_PROJECT_DOCUMENTATION.md for system overview
✅ Create START_POINT_[DATE].md after confirming focus
✅ Update PROJECT_MASTER_LOG.md with new entry at TOP
✅ Test code changes locally before committing
✅ Log all significant decisions and file changes
✅ **NEVER commit .env file or hardcode secrets**
✅ **Use environment variables for ALL API keys and UUIDs**
✅ **Preserve working backups in ARCHIVE folder**
✅ **Test Toast API endpoints manually before committing**
✅ **Verify Vercel deployment after pushing**

### **NEVER DO:**
❌ Start work without reading context files
❌ Make breaking changes without explicit confirmation
❌ Overwrite files without reading them first
❌ Hardcode API keys, secrets, or UUIDs in frontend code
❌ Commit .env file to git
❌ Leave session without updating PROJECT_MASTER_LOG.md
❌ Skip testing after changes
❌ Delete ARCHIVE backup folders
❌ Add old entries at top of log (newest always first!)
❌ Use mock data - always connect to real APIs

### **Security & Secrets Management**
🔐 **ALL secrets must be in environment variables:**
- Toast API credentials (TOAST_CLIENT_ID, TOAST_CLIENT_SECRET)
- Homebase API key and location UUID
- Supabase URL and key
- EmailJS credentials
- Restaurant GUIDs

🔐 **Frontend code must NEVER contain:**
- API keys
- Client secrets
- Location UUIDs
- Database credentials
- Email service credentials

🔐 **Backend API proxies must:**
- Inject secrets from environment variables
- Validate all inputs
- Handle errors gracefully
- Use proper CORS restrictions

---

## 🎯 WORKING WITH TOAST POS API

### **Critical Configuration**
```javascript
// Server GUID for TDS Driver (used in tip calculations)
const TDS_DRIVER_GUID = '5ffaae6f-4238-477d-979b-3da88d45b8e2';

// Restaurant GUID (from environment)
const TOAST_RESTAURANT_GUID = process.env.TOAST_RESTAURANT_GUID;
// Value: 'd3efae34-7c2e-4107-a442-49081e624706'

// Base URL
const TOAST_BASE_URL = 'https://ws-api.toasttab.com';
```

### **Pagination Best Practices**
```javascript
// ❌ WRONG - Limits to 100 orders
const pageSize = 100;
fetch(`/orders/v2/ordersBulk?businessDate=${date}&pageSize=${pageSize}`);

// ✅ RIGHT - Full pagination to get ALL orders
// Method 1: No pageSize parameter (backend handles pagination)
fetch(`/orders/v2/ordersBulk?businessDate=${date}`);

// Method 2: Manual pagination loop
let page = 1;
let hasMore = true;
while (hasMore) {
  const response = await fetch(`/orders/v2/ordersBulk?businessDate=${date}&page=${page}&pageSize=100`);
  const orders = await response.json();
  allOrders = allOrders.concat(orders);
  hasMore = orders.length === 100;
  page++;
}
```

### **TDS Driver Tip Calculation Method**
```javascript
// ✅ CORRECT METHOD (Fixed September 30, 2025)
// Use comprehensive analysis - fetch ALL orders, filter by server GUID

POST /api/toast-tds-driver-tips
{
  "accessToken": "...",
  "startDate": "2025-09-22",
  "endDate": "2025-09-28"
}

// Expected result: $481.83 gross, $478.36 net (537 orders)
```

---

## 🏗️ WORKING WITH HOMEBASE API

### **Security Requirements**
```javascript
// ❌ WRONG - Hardcoded in frontend
const HOMEBASE_LOCATION_UUID = 'abc-123-def-456';
fetch(`https://api.joinhomebase.com/locations/${HOMEBASE_LOCATION_UUID}/timesheets`);

// ✅ RIGHT - Use placeholder, backend injects from environment
fetch('/api/homebase-proxy', {
  method: 'POST',
  body: JSON.stringify({
    endpoint: '/locations/LOCATION_UUID/timesheets',
    method: 'GET'
  })
});

// Backend (homebase-proxy.js) replaces LOCATION_UUID with environment variable
```

### **Error Handling**
```javascript
// Handle specific Homebase API errors:
// 400 - Bad Request (invalid parameters)
// 401 - Unauthorized (invalid API key)
// 403 - Forbidden (insufficient permissions)
// 404 - Not Found (invalid endpoint or location)
// 429 - Rate Limit (too many requests)
// 500 - Server Error (Homebase internal error)
```

---

## 📊 WORKING WITH SUPABASE DATABASE

### **Connection Pattern**
```javascript
// Client-side Supabase connection
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Standard query pattern
const { data, error } = await supabase
  .from('cash_counts')
  .select('*')
  .eq('date', selectedDate)
  .single();

if (error) {
  console.error('Supabase error:', error);
  // Handle error
}
```

### **Cash Counts Table Structure**
```javascript
// Data structure for AM count
{
  date: '2025-10-06',
  am_counter: 'Staff Name',
  am_timestamp: '2025-10-06T08:30:00Z',
  am_total: 1250.75,
  am_drawer1_data: {
    hundreds: 0, fifties: 0, twenties: 4,
    tens: 10, fives: 8, ones: 25,
    quarters: 12, dimes: 8, nickels: 5, pennies: 15
  },
  am_drawer2_data: { ... },
  am_notes: 'Optional notes for PM shift'
}

// V2.84 PM close includes:
pm_deposit_amount: 500.00,  // Rounded to whole dollars
pm_adjusted_tips: 75.00,    // Whole dollar tips
pm_amount_to_keep: 1250.00, // Return to cashbox
pm_discrepancy: -2.50       // Over/under amount
```

---

## 📧 EMAILJS INTEGRATION

### **Template Structure**
```javascript
// EmailJS configuration
const emailParams = {
  to_email: 'management@email.com',
  date: '2025-10-06',
  am_counter: 'Staff Name',
  am_total: '$1,250.75',
  pm_counter: 'Staff Name',
  pm_total: '$1,555.25',
  deposit_amount: '$500.00',
  adjusted_tips: '$75.00',
  return_amount: '$1,250.00',

  // V2.84 Conditional deposit breakdown (if rounding occurred)
  show_deposit_breakdown: true,
  raw_deposit_amount: '$500.47',
  deposit_rounding_adjustment: '$0.47'
};

// Send email
emailjs.send(SERVICE_ID, TEMPLATE_ID, emailParams, USER_ID);
```

---

## 🧪 TESTING CHECKLIST

### **Before Every Commit**
- [ ] Code compiles/runs without errors
- [ ] Tested locally (Python server: `python3 -m http.server 8000`)
- [ ] All console errors resolved
- [ ] Input validation working
- [ ] Error handling tested (try invalid inputs)
- [ ] Mobile responsive (test on tablet size)
- [ ] No hardcoded secrets in code
- [ ] Comments added for complex logic
- [ ] Console.log statements cleaned up (or kept for debugging)

### **After Vercel Deployment**
- [ ] Visit production URL: https://jayna-cash-counter.vercel.app
- [ ] Test main workflows (AM count, PM close)
- [ ] Test API endpoints (Toast, Homebase)
- [ ] Verify calculations accurate
- [ ] Check email delivery (if applicable)
- [ ] Test on mobile device/tablet
- [ ] Check browser console for errors

---

## 📞 CONTACT PROTOCOL

### **When to Reach Out:**
- ❓ Business Logic Questions: "Should tips absorb the rounding?"
- ❓ Major Architecture Decisions: "Should we switch to React?"
- ❓ Security Concerns: "Is this authentication approach secure?"
- ❓ Genuine Blockers: "Can't access Toast API credentials"
- ❓ Milestone Approvals: "Cash counter v3.0 complete, ready for review"

### **What NOT to Ask:**
- ❌ "Should I add error handling?" (Yes, always)
- ❌ "Can I refactor this function?" (Yes, if it improves code)
- ❌ "Should I fix this bug?" (Yes, immediately)
- ❌ "Is this variable name okay?" (Use best judgment)
- ❌ "Should I write comments?" (Yes, for complex logic)

---

## 🎬 EXAMPLE SESSION STARTUP

```bash
$ claude code

Claude Code: Let me read the project context...

[Reading AI_PROJECT_INSTRUCTIONS.md]
[Reading PROJECT_MASTER_LOG.md]
[Reading CURRENT_PROJECT_DOCUMENTATION.md]

I can see this is the Jayna Cash Counter - a restaurant management
platform with cash counting, tip pool calculator, and manager dashboard.

Last session (2025-10-01): Fixed Toast API pagination to fetch ALL
orders instead of just 100. Revenue Analytics now showing accurate
$240+ instead of $31.18. Status: Completed.

Current production version: 2.84+ on Vercel
Key systems: Cash counting (AM/PM), Toast POS integration, Homebase API

What would you like to work on today?

User: Let's add a weekly summary report feature

Claude Code: Perfect! I'll create today's START_POINT and update
the Master Log, then we'll implement a weekly summary report that
aggregates cash counts and tip pool data for the week.

[Creates START_POINT_2025-10-06.md]
[Updates PROJECT_MASTER_LOG.md]

Looking at the existing report generation code in index.html,
I'll add a new weekly summary section that queries Supabase for
the date range and aggregates the data. Should we include:
- Total cash handled
- Total deposits
- Total tips distributed
- Average daily discrepancies
- Staff accountability summary
```

---

## ✅ SUCCESS METRICS

You're doing this right when:
✅ Every session starts with full project context
✅ No repeated work or confusion about project state
✅ Clear continuity across sessions
✅ Master Log tells complete project story
✅ Code changes are intentional and tested
✅ User never has to re-explain project context
✅ Build on previous work instead of starting over
✅ Production deployments are smooth and error-free
✅ No secrets committed to git
✅ All API integrations working with real data

---

## 📚 ESSENTIAL DOCUMENTATION REFERENCE

**Always Available Documentation:**
1. `AI_PROJECT_INSTRUCTIONS.md` - This file (start here every session)
2. `CURRENT_PROJECT_DOCUMENTATION.md` - Comprehensive system overview
3. `PROJECT_MASTER_LOG.md` - Complete session history (create if doesn't exist)
4. `PROCESS_LOG.md` - Detailed change log with technical context
5. `PROJECT_SUMMARY.md` - Executive summary
6. `QUICK_START.md` - Toast API setup guide
7. `README.md` - Basic project information

**Backup Documentation (in ARCHIVE folder):**
- `COMPREHENSIVE_SYSTEM_DOCUMENTATION.md` - V2.84 system details
- `HOMEBASE_API_COMPREHENSIVE_DOCUMENTATION.md` - Homebase integration
- Version-specific backups in WORKING v*.* folders

---

## 🎯 PROJECT-SPECIFIC PRIORITIES

### **High Priority - Always Maintain**
1. **Cash counting accuracy** (mathematical precision)
2. **API reliability** (Toast, Homebase connections)
3. **Security** (no secrets in code, environment variables only)
4. **Mobile experience** (tablet optimization)
5. **Email delivery** (automated reports must work)

### **Medium Priority - Improve When Possible**
1. **Performance optimization** (page load, API calls)
2. **Error handling** (user-friendly error messages)
3. **Code organization** (refactor large functions)
4. **Documentation** (keep docs up to date)
5. **Testing** (manual testing, consider automated tests)

### **Low Priority - Nice to Have**
1. **UI enhancements** (visual polish)
2. **Additional features** (beyond core functionality)
3. **Code comments** (for simple, self-explanatory code)
4. **Performance metrics** (beyond basic monitoring)

---

## 🔄 CONTINUOUS IMPROVEMENT

### **After Every Session:**
Update PROJECT_MASTER_LOG.md with:
- What worked well
- What was challenging
- Improvements for next time
- New patterns or learnings

### **Suggest Optimizations:**
If I notice patterns, proactively suggest:
- API call optimization
- Better code organization
- Additional documentation
- Testing strategies
- Security improvements

---

## 🚀 DEPLOYMENT & GIT WORKFLOW

### **Standard Git Workflow**
```bash
# After making changes and testing locally:
git add .
git commit -m "feat(component): clear description of changes"
git push origin main

# Vercel auto-deploys from main branch
# Wait ~1 minute, then test: https://jayna-cash-counter.vercel.app
```

### **Emergency Rollback**
```bash
# If production breaks, immediately rollback:
git revert HEAD
git push origin main

# Or restore from ARCHIVE backup:
cp -r "ARCHIVE/WORKING v2.84 DO NOT EDIT"/* .
git add .
git commit -m "emergency: restore from v2.84 backup"
git push origin main
```

---

**REMEMBER**: This is a **production system used daily by restaurant staff**.
Changes must be tested thoroughly before deployment. When in doubt, create
a backup in ARCHIVE folder before making major changes.

---

*Instructions Created: October 6, 2025*
*Project: Jayna Cash Counter*
*Version: 2.84+ (Production Active)*
*User: jaynasac*
*Authorization: Full autonomous operation*
