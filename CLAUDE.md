# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Jayna Cash Counter** is a production restaurant management platform combining:
1. Cash counting system (AM/PM workflows with dual drawers)
2. Tip pool calculator with Toast POS integration
3. Automated daily reporting via EmailJS
4. Manager analytics dashboard with real-time insights
5. Labor management through Homebase API integration

**Live URL:** https://jayna-cash-counter.vercel.app

## Essential Reading on Session Start

**ALWAYS read these files at the start of every session:**
1. `CURRENT_STATUS.md` - **READ THIS FIRST** - Current work state, blockers, next steps
2. `AI_PROJECT_INSTRUCTIONS.md` - Complete project context and authorization levels
3. `PROJECT_MASTER_LOG.md` - Session history (newest entries first, read last 3 entries)
4. `CURRENT_PROJECT_DOCUMENTATION.md` - System overview (if needed for context)

After reading, ask the user: "What are we working on today?" Then update `CURRENT_STATUS.md` with session start time.

## 🚨 CRITICAL: Session End Protocol

**MANDATORY before ending ANY session:**

### When to Trigger Session End:
Watch for these user phrases (AUTO-TRIGGER checklist):
- "thanks", "thank you", "that's all", "that's it"
- "goodbye", "bye", "see you", "later"
- "done for now", "that's good", "looks good"
- Any farewell or completion phrase

### Required Actions:
When user signals session end, you MUST say:
```
"Before we end, let me save this chat session and update the status files to preserve our progress..."
```

Then follow this EXACT sequence (all steps mandatory):

**STEP 0 (DO THIS FIRST):**
1. ✅ Create unique RTF file in `/chat sessions/` folder
   - Filename format: `session_YYYY-MM-DD_brief-description.rtf`
   - Example: `session_2025-10-09_vendor-auto-detection.rtf`
   - Copy entire chat conversation into RTF format
   - Include: date, session context, user messages, assistant responses, code changes, git commits, outcomes
   - Use proper RTF formatting with headers, bold, colors for readability

**THEN follow `SESSION_END_CHECKLIST.md`:**
2. ✅ Update `CURRENT_STATUS.md` (work status, blockers, next steps)
3. ✅ Update `PROJECT_MASTER_LOG.md` (add new entry at TOP)
4. ✅ Run `git status` and document uncommitted changes
5. ✅ Provide session summary to user
6. ✅ Confirm: "✅ Chat session saved to RTF. Status files updated. See you next session!"

**See `SESSION_END_CHECKLIST.md` for complete protocol.**

### Proactive Status Updates:
Also update status files after:
- Major milestones completed
- 50+ messages in conversation
- Before deployment to production
- Any time context preservation is critical

## Tech Stack

- **Frontend:** Vanilla JavaScript, HTML5, CSS3 (8,759-line index.html, 3,004-line manager.html)
- **Backend:** Vercel Serverless Functions (Node.js) in `/api` folder
- **Database:** Supabase (PostgreSQL)
- **External APIs:** Toast POS (orders/payments/labor), Homebase (labor management)
- **Services:** EmailJS (automated reports), jsPDF/html2pdf.js (PDF generation)
- **Deployment:** Vercel (auto-deploys from `main` branch)

## Key Commands

```bash
# Local development
python3 -m http.server 8000
# Visit: http://localhost:8000

# Deployment (auto via git push)
git add .
git commit -m "feat(component): description"
git push origin main
# Wait 1-2 minutes, verify at https://jayna-cash-counter.vercel.app

# Check recent changes
git log --oneline -10

# Emergency rollback
git revert HEAD && git push origin main
# Or restore from: ARCHIVE/WORKING v2.84 DO NOT EDIT/
```

## Architecture

### File Structure
```
/
├── index.html (8,759 lines)       # Main cash counter + tip pool
├── manager.html (3,004 lines)     # Analytics dashboard
├── comprehensive-analysis.html    # Debug/testing tool
├── toast-orders-testing.html      # API testing utility
├── height-calculator.html         # Utility
│
├── api/                           # Vercel serverless functions
│   ├── toast-sales-summary.js     # Core sales data (462 lines)
│   ├── toast-tds-driver-tips.js   # TDS driver tip calculation (262 lines)
│   ├── toast-comprehensive-analysis.js
│   ├── toast-delivery-analysis.js
│   ├── toast-labor-summary.js
│   ├── toast-orders-flexible.js
│   ├── toast-orders.js
│   ├── toast-payments.js
│   ├── toast-auth.js
│   ├── toast-menus.js
│   ├── toast-restaurant.js
│   └── homebase-proxy.js          # Homebase API proxy
│
├── ARCHIVE/                       # Version backups (DO NOT DELETE)
│   ├── WORKING v2.0 DO NOT EDIT/
│   ├── WORKING v2.52 DO NOT EDIT/
│   ├── WORKING v2.84 DO NOT EDIT/
│   └── WORKING v2.85 DO NOT EDIT/
│
└── Documentation Files:
    ├── CURRENT_STATUS.md           # READ FIRST - current work state
    ├── SESSION_END_CHECKLIST.md    # Mandatory before ending session
    ├── AI_PROJECT_INSTRUCTIONS.md  # Complete project context
    ├── CLAUDE.md                   # This file
    ├── PROJECT_MASTER_LOG.md       # Session history (newest first)
    ├── CURRENT_PROJECT_DOCUMENTATION.md
    ├── PROCESS_LOG.md
    ├── PROJECT_SUMMARY.md
    └── README.md
```

### Critical System Components

#### 1. Cash Counting (index.html)
- **AM Count:** Morning baseline, dual drawer system
- **PM Close:** Evening reconciliation with sophisticated whole-dollar deposit rounding
- **V2.84 Feature:** Tips absorb rounding adjustments, excess returns to cashbox
- **Database:** Supabase `cash_counts` table with JSONB denomination data

#### 2. Tip Pool Calculator (index.html)
- Integrates Toast POS sales data + labor hours
- **TDS Driver GUID:** `5ffaae6f-4238-477d-979b-3da88d45b8e2`
- **Expected Weekly Tips:** $481.83 gross / $478.36 net (537 orders)
- Equity-based distribution system

#### 3. Manager Dashboard (manager.html)
- Real-time Toast POS metrics
- Revenue analytics with full order pagination
- Labor cost analysis via Homebase API
- Recent order tracking

## Toast POS API - Critical Patterns

### Configuration
```javascript
const TDS_DRIVER_GUID = '5ffaae6f-4238-477d-979b-3da88d45b8e2';
const TOAST_RESTAURANT_GUID = process.env.TOAST_RESTAURANT_GUID; // 'd3efae34-7c2e-4107-a442-49081e624706'
const TOAST_BASE_URL = 'https://ws-api.toasttab.com';
```

### Void Detection - CRITICAL (v6.1 - Oct 2025)

**Toast allows voiding at FOUR LEVELS independently:**

1. **Order-level:** `order.voided`, `order.guestOrderStatus === 'VOIDED'`, `order.paymentStatus === 'VOIDED'`
2. **Check-level:** `check.voided` (CRITICAL: can be voided even if order is not!)
3. **Selection-level:** `selection.voided` (individual menu items)
4. **Payment-level:** `payment.voided`, `payment.paymentStatus === 'VOIDED'`, `payment.refundStatus === 'FULL'`

**Common mistake:** Only checking `order.voided` will miss check-level voids!

```javascript
// ✅ CORRECT - Check both levels
const isOrderVoided = order.voided === true ||
                     order.guestOrderStatus === 'VOIDED' ||
                     order.paymentStatus === 'VOIDED';
const isOrderDeleted = order.deleted === true;

// CRITICAL: Also check EACH check independently
for (const check of order.checks) {
  const isCheckVoided = check.voided === true;
  const isCheckDeleted = check.deleted === true;

  // If check is voided but order is NOT, count separately
  if ((isCheckVoided || isCheckDeleted) && !isOrderVoided && !isOrderDeleted) {
    totalVoidedChecks++;
  }
}
```

**Why this matters:** Toast Sales Summary counts voided checks as separate "voided orders" even if the parent order is not voided. Missing this causes net sales and tip discrepancies.

### Net Sales Calculation - Use check.amount (v6.0)

```javascript
// ✅ CORRECT - Toast's official calculated total
const netSales = check.amount; // Already includes discounts & service charges

// ❌ WRONG - Summing payments (inflated 3.4x in testing)
const netSales = payments.reduce((sum, p) => sum + p.amount, 0);
```

### Pagination - Fetch ALL Orders

```javascript
// ❌ WRONG - Limits to 100 orders
fetch(`/orders/v2/ordersBulk?businessDate=${date}&pageSize=100`);

// ✅ RIGHT - Full pagination
let page = 1, hasMore = true, allOrders = [];
while (hasMore) {
  const url = `/orders/v2/ordersBulk?businessDate=${date}&page=${page}&pageSize=100`;
  const orders = await (await fetch(url, { headers })).json();
  allOrders = allOrders.concat(orders);
  hasMore = orders.length === 100;
  page++;
  await new Promise(r => setTimeout(r, 300)); // Rate limit protection
}
```

### Partial Refunds

```javascript
// Handle PARTIAL refunds (not the same as voids!)
const isFullyVoided = payment.voided === true ||
                     payment.refundStatus === 'FULL' ||
                     payment.paymentStatus === 'VOIDED';

const isPartiallyRefunded = payment.refundStatus === 'PARTIAL';
const refundAmount = isPartiallyRefunded ? (payment.refund?.refundAmount || 0) : 0;

// For partial refunds, subtract only the refunded amount
const netPaymentAmount = isPartiallyRefunded ? (amount - refundAmount) : amount;
```

### Service Charges

```javascript
// ONLY include NON-GRATUITY service charges in net sales
if (serviceCharge.gratuity === true) {
  // Gratuity service charge → goes to staff, NOT net sales
  totalGratuityServiceCharges += chargeAmount;
} else {
  // Non-gratuity → goes to restaurant, add to net sales
  totalServiceCharges += chargeAmount;
}
```

## Security - CRITICAL RULES

### ❌ NEVER commit or hardcode:
- API keys
- Client secrets
- Location UUIDs
- Database credentials
- Email service credentials
- Restaurant GUIDs

### ✅ ALWAYS use environment variables:
```javascript
// Backend API (Vercel serverless functions)
const apiKey = process.env.HOMEBASE_API_KEY;
const locationUuid = process.env.HOMEBASE_LOCATION_UUID;
const toastClientId = process.env.TOAST_CLIENT_ID;
const supabaseUrl = process.env.SUPABASE_URL;

// Frontend: Call backend proxy instead
fetch('/api/homebase-proxy', {
  method: 'POST',
  body: JSON.stringify({
    endpoint: '/locations/LOCATION_UUID/timesheets', // Placeholder
    method: 'GET'
  })
});

// Backend replaces LOCATION_UUID with environment variable
```

### Environment Variables (.env - NEVER COMMIT)
```bash
# Toast POS
TOAST_CLIENT_ID=
TOAST_CLIENT_SECRET=
TOAST_RESTAURANT_GUID=

# Homebase
HOMEBASE_API_KEY=
HOMEBASE_LOCATION_UUID=

# Supabase
SUPABASE_URL=
SUPABASE_KEY=

# EmailJS
EMAILJS_SERVICE_ID=
EMAILJS_TEMPLATE_ID=
EMAILJS_USER_ID=
```

## Supabase Database Patterns

### Connection
```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Standard query
const { data, error } = await supabase
  .from('cash_counts')
  .select('*')
  .eq('date', selectedDate)
  .single();

if (error) {
  console.error('Supabase error:', error);
  // Handle gracefully
}
```

### Cash Counts Table Structure
```javascript
{
  date: '2025-10-06',
  am_counter: 'Staff Name',
  am_timestamp: '2025-10-06T08:30:00Z',
  am_total: 1250.75,
  am_drawer1_data: { // JSONB
    hundreds: 0, fifties: 0, twenties: 4,
    tens: 10, fives: 8, ones: 25,
    quarters: 12, dimes: 8, nickels: 5, pennies: 15
  },
  am_drawer2_data: { /* same structure */ },
  am_notes: 'Optional notes',

  // PM fields (V2.84+)
  pm_deposit_amount: 500.00,    // Rounded to whole dollars
  pm_adjusted_tips: 75.00,      // Whole dollar tips
  pm_amount_to_keep: 1250.00,   // Return to cashbox
  pm_discrepancy: -2.50         // Over/under
}
```

## Git & Deployment Workflow

### Commit Standards (Conventional Commits)
```bash
feat(cash-counter): add real-time calculation updates
fix(toast-api): handle pagination for ALL orders
refactor(manager): improve dashboard performance
security(homebase): remove hardcoded UUIDs
docs(readme): update deployment instructions

# Emoji prefixes (optional, used in recent commits)
🎯 v6.0 - Use check.amount for 100% accuracy!
🔍 v6.1 - Detect check-level voids to match Toast count
🚨 CRITICAL FIX: Add deleted order detection
```

### Pre-Commit Checklist
- [ ] Code tested locally (`python3 -m http.server 8000`)
- [ ] No console errors
- [ ] Input validation working
- [ ] Error handling tested
- [ ] Mobile responsive
- [ ] No hardcoded secrets
- [ ] Comments for complex logic

### Post-Deploy Checklist
- [ ] Visit https://jayna-cash-counter.vercel.app
- [ ] Test main workflows (AM count, PM close, Tip Pool)
- [ ] Verify API endpoints (Toast, Homebase)
- [ ] Check browser console
- [ ] Test on mobile/tablet

## Autonomous Operation Authorization

**User has granted FULL AUTHORIZATION for autonomous work:**

### ✅ You Can (Without Asking):
- Make technical decisions (frameworks, patterns, architectures)
- Write and deploy production code
- Fix bugs immediately
- Refactor for performance
- Add error handling and logging
- Commit and push to GitHub
- Run tests
- Deploy to production when ready
- Make security decisions
- Implement best practices

### 💬 Inform (Don't Ask) When:
- Completing major milestones
- Encountering genuine blockers (after 30min max)
- Making business logic assumptions
- Providing summary updates

### Work Pattern:
- **Ship working code, iterate later**
- **MVP first, optimization second**
- Use `// TODO:` comments for future improvements
- Build on previous work (check PROJECT_MASTER_LOG.md)
- Test thoroughly before deploying (this is production!)

## Common Pitfalls to Avoid

1. **Session End:** Forgetting to update status files before ending session → complete context loss
2. **Session Start:** Not reading CURRENT_STATUS.md first → repeating work or missing blockers
3. **Toast API:** Only checking `order.voided` → missing check-level voids → wrong totals
4. **Toast API:** Summing payment amounts instead of using `check.amount` → inflated net sales
5. **Toast API:** Not paginating fully → missing orders → incorrect analytics
6. **Security:** Hardcoding UUIDs/keys in frontend → security vulnerability
7. **Git:** Committing .env file → exposed secrets
8. **Deployment:** Not testing after Vercel deploy → broken production

## Recent Critical Fixes

### October 7, 2025 - v6.1: Check-Level Void Detection
- **Problem:** Toast shows 10 voided orders, API detected only 4
- **Root Cause:** Code only checked `order.voided`, missed `check.voided`
- **Fix:** Added check-level void detection in non-voided orders
- **Result:** Now correctly counts 4 order-level + 6 check-level = 10 total voids

### October 7, 2025 - v6.0: Use check.amount for Net Sales
- **Problem:** Net sales 3.4x inflated when summing payments
- **Root Cause:** Multiple payment methods per check counted multiple times
- **Fix:** Use `check.amount` (Toast's official calculated total)
- **Result:** 100% accurate net sales matching Toast Sales Summary

### October 1, 2025 - Full Order Pagination
- **Problem:** Revenue showing $31 instead of $240
- **Root Cause:** Limited to first 100 orders
- **Fix:** Implemented full pagination loop to fetch ALL orders
- **Result:** Accurate revenue analytics

## Testing Workflows

### Test Toast API Endpoints
Use `toast-orders-testing.html` for manual API testing

### Test Comprehensive Analysis
Use `comprehensive-analysis.html` for void/refund debugging

### Local Development Server
```bash
python3 -m http.server 8000
# Visit http://localhost:8000
```

## Contact Protocol

**This is a production system used daily by restaurant staff.**

When in doubt:
1. Create backup in ARCHIVE folder before major changes
2. Test thoroughly locally before deploying
3. Check PROJECT_MASTER_LOG.md for similar past work
4. Read CURRENT_PROJECT_DOCUMENTATION.md for system details
5. If stuck >30min, document attempts and ask user

---

## 🔴 FINAL REMINDER: Session End Protocol

**Before ending this session or when user says goodbye:**

1. **Stop immediately** when you detect farewell phrases
2. **Say:** "Before we end, let me update the status files..."
3. **Follow:** `SESSION_END_CHECKLIST.md` (all 5 steps)
4. **Update:** `CURRENT_STATUS.md` + `PROJECT_MASTER_LOG.md`
5. **Confirm:** Provide session summary and "✅ Status files updated"

**This is MANDATORY - not optional. Next Claude instance has ZERO memory of this session.**

---

**Current Version:** v6.1+ (Production Active)
**Last Updated:** October 8, 2025
**Authorization:** Full autonomous operation granted
