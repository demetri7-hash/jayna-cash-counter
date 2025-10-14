# Gemini Project Overview: Jayna Cash Counter

**Last Updated:** 2025-10-13

---

## 1. 🚀 Project Overview & My Mandate

**Jayna Cash Counter** is a production restaurant management platform for Jayna Gyro. It is a mission-critical tool used daily by staff and management.

**My Mandate is FULL AUTONOMY.** I am authorized to make technical decisions, write and deploy code to production, fix bugs, refactor, and manage the system independently. My primary goal is to ship working, reliable code that adheres to existing patterns.

**Live URL:** https://jayna-cash-counter.vercel.app

### Core Functionality:
1.  **Cash Counting:** AM/PM dual-drawer cash counting and reconciliation.
2.  **Tip Pool Calculator:** Automated tip distribution using Toast & Homebase API data.
3.  **Automated Reporting:** Daily email reports via EmailJS.
4.  **Manager Dashboard:** Real-time analytics and labor management.
5.  **Ordering & Inventory:** Smart prep sheets, automated ordering, and invoice scanning (COGs).
6.  **Automated Data Pipelines:** Cron jobs for caching sales data and parsing emails.

---

## 2. 📜 My Core Directives (from CLAUDE.md)

1.  **🔴 USE EXISTING PATTERNS FIRST:** Before writing any new code, I must search the codebase for similar functionality and copy the established pattern. This is the most critical rule.
2.  **🔴 NEVER REMOVE CODE TO FIX ERRORS:** If code is broken, I must fix the root cause (e.g., add a missing database column), not delete the code.
3.  **🎯 OUTCOME-DRIVEN PROBLEM SOLVING:** If I'm stuck debugging a broken approach for more than 15 minutes, I must stop and rebuild it the right way using a known, reliable method (e.g., `createElement` over `innerHTML`).
4.  **🚨 NO POPUP WINDOWS:** Never use `alert()`, `confirm()`, or `prompt()`. Use inline status indicators (green for success, red for error) and the existing `showMessage()` function for modals.
5.  **🔒 SECURITY FIRST:** Never commit secrets. All API keys, GUIDs, and credentials **MUST** be in Vercel environment variables. Frontend code should call backend proxies for secure operations.

---

## 3. 🛠️ Technical Stack & Architecture

-   **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3. The main application is a large, single `index.html` file (8,700+ lines).
-   **Backend:** Vercel Serverless Functions (Node.js) located in the `/api` directory.
-   **Database:** Supabase (PostgreSQL). I have the schema documentation.
-   **Deployment:** Vercel, with auto-deploys from the `main` branch.
-   **Dependencies (`package.json`):**
    -   `@emailjs/nodejs`: Sending emails.
    -   `@supabase/supabase-js`: Database interaction.
    -   `imap` & `mailparser`: For the Gmail email parsing cron job.
    -   `nodemailer`: Another email library (potential legacy).

### Scheduled Tasks (`vercel.json`):
-   **`0 11 * * *` (`/api/cron/cache-toast-sales`):** Caches yesterday's Toast sales data at 4 AM PST to speed up the Tip Pool calculator.
-   **`0 12 * * *` (`/api/daily-ordering`):** Runs the automated ordering system at 4 AM PST.
-   **`0 17 * * *` (`/api/cron/parse-toast-emails`):** Parses Toast Performance Summary emails from Gmail at 9 AM PST.

---

## 4. 📂 Key Files & Directories

-   **`index.html`**: The heart of the application. Contains UI and logic for Cash Counting, Tip Pool, Ordering System, and more.
-   **`manager.html`**: The manager-facing analytics dashboard.
-   **`cogs.html`**: The Cost of Goods Sold module for inventory and invoice scanning.
-   **`api/`**: All backend serverless functions. This is where secure operations and API integrations happen.
-   **`database/`**: SQL schema files and migrations. `ACTUAL_SCHEMAS_USED_IN_CODE.md` is a key reference.
-   **`CLAUDE.md` & `AI_PROJECT_INSTRUCTIONS.md`**: My core rulebooks.
-   **`CURRENT_STATUS.md` & `PROJECT_MASTER_LOG.md`**: Project state and history. I must read these at the start of every session and update them at the end.
-   **`chat sessions/`**: Contains RTF files of previous work sessions for context.

---

## 5. 🎨 Design System & UI/UX Principles

-   **NO ROUNDED CORNERS:** `border-radius: 0` everywhere.
-   **HEAVY BORDERS:** Use 2px borders for definition.
-   **ALL CAPS HEADERS:** Headers and labels are uppercase with letter-spacing.
-   **MINIMAL COLOR PALETTE:** Primarily grayscale with accent colors for status only (green for success, red for error, yellow for warning, blue for info).
-   **TOUCH-FRIENDLY:** Minimum 44px touch targets on mobile.
-   **GRID-BASED LAYOUTS:** Use CSS Grid for primary page structure.
-   **PURE DOM MANIPULATION:** Use `createElement()` and `appendChild()` for creating dynamic elements, not `innerHTML` string templates, which have proven to be a source of bugs.

---

## 6. 🔄 Session & Git Workflow

### Session Start:
1.  Read the last 3 RTF files from `/chat sessions/`.
2.  Read `CURRENT_STATUS.md`.
3.  Read `AI_PROJECT_INSTRUCTIONS.md`.
4.  Read the last 3 entries in `PROJECT_MASTER_LOG.md`.
5.  Ask the user: "What are we working on today?"
6.  Update `CURRENT_STATUS.md` with the session start time.

### Session End (MANDATORY):
1.  **Trigger:** User says "thanks," "bye," "that's all," etc.
2.  **Announce:** "Before we end, let me save this chat session and update the status files..."
3.  **Step 0:** Save the entire chat to a new RTF file in `/chat sessions/`.
4.  **Step 1:** Update `CURRENT_STATUS.md`.
5.  **Step 2:** Add a new entry to the TOP of `PROJECT_MASTER_LOG.md`.
6.  **Step 3:** Run `git status` and document uncommitted changes.
7.  **Step 4:** Provide a session summary to the user.
8.  **Confirm:** "✅ Chat session saved to RTF. Status files updated."

### Git Commits:
-   Use Conventional Commits format: `feat(scope): description`, `fix(scope): description`.
-   Test all changes locally (`python3 -m http.server 8000`) before committing.
-   Pushing to `main` auto-deploys to production. Verify on the live URL after deployment.

---

## 7. 💡 Key Project-Specific Logic

-   **Toast Void Detection:** Voids can happen at the Order, Check, Selection, or Payment level. The code must check all levels to be accurate.
-   **Toast Net Sales Calculation:** Use `check.amount`, not the sum of payments, to avoid inflation.
-   **Toast API Pagination:** Always paginate fully to get all orders. Do not assume a `pageSize` of 100 is enough.
-   **TDS Driver GUID:** `5ffaae6f-4238-477d-979b-3da88d45b8e2`. This is critical for filtering tips correctly.
-   **CA Labor Laws:** The Toast Labor API is inaccurate for California due to complex double-time rules. A manual override field for labor cost has been implemented and should be maintained.
-   **Date/Timezone:** Dates from the database (`YYYY-MM-DD`) should be parsed as `new Date("YYYY-MM-DDTHH:mm:ss")` to avoid timezone-related "off-by-one-day" errors.

This document provides me with a comprehensive, actionable guide to effectively and autonomously manage the Jayna Cash Counter project. I will refer to it to ensure consistency, quality, and adherence to the established standards.
