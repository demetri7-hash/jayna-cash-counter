# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
# Claude External Memory System

## Core Instructions
You have access to a local file system for persistent memory storage. Maintain an external "brain" using structured JSON files to remember context across conversations.

## Memory Architecture

### Directory Structure
```
/memory/
├── index.json              # Master index of all memory files
├── context/
│   ├── user_profile.json   # User preferences, background, goals
│   ├── ongoing_projects.json
│   └── conversation_history.json
├── knowledge/
│   ├── domain_expertise.json  # Technical knowledge by domain
│   └── learned_facts.json     # New information learned
├── tasks/
│   ├── active_tasks.json
│   ├── completed_tasks.json
│   └── future_tasks.json
└── preferences/
    ├── communication_style.json
    └── tool_usage_patterns.json
```

## Memory Operations Protocol

### 1. Session Start (ALWAYS DO THIS FIRST)
- Read `/memory/index.json` to understand available memory
- Read `/memory/context/user_profile.json` for user context
- Read `/memory/tasks/active_tasks.json` for pending work
- Quickly scan `/memory/context/conversation_history.json` for recent context

### 2. During Conversation
- **Capture Important Information**: Names, preferences, project details, technical decisions
- **Track Tasks**: Any commitments, to-dos, or follow-ups
- **Learn Patterns**: User's communication style, preferred approaches
- **Document Solutions**: Successfully solved problems for future reference

### 3. Session End or Major Updates
- Update relevant JSON files with new information
- Add entry to conversation_history.json with key takeaways
- Update task statuses
- Refresh index.json if structure changed

## JSON File Schemas

### index.json
```json
{
  "last_updated": "ISO_8601_timestamp",
  "memory_version": "1.0",
  "files": {
    "user_profile": {"path": "context/user_profile.json", "priority": "high"},
    "active_tasks": {"path": "tasks/active_tasks.json", "priority": "high"},
    "conversation_history": {"path": "context/conversation_history.json", "priority": "medium"}
  },
  "stats": {
    "total_conversations": 0,
    "total_tasks_completed": 0
  }
}
```

### context/user_profile.json
```json
{
  "name": "",
  "role": "",
  "expertise_areas": [],
  "current_focus": "",
  "working_style": "",
  "communication_preferences": {
    "detail_level": "balanced",
    "format_preference": "",
    "avoid": []
  },
  "active_projects": [],
  "goals": {
    "short_term": [],
    "long_term": []
  },
  "context_notes": []
}
```

### tasks/active_tasks.json
```json
{
  "tasks": [
    {
      "id": "unique_id",
      "title": "",
      "description": "",
      "status": "not_started|in_progress|blocked|completed",
      "priority": "low|medium|high|urgent",
      "created": "ISO_8601_timestamp",
      "due_date": "",
      "related_files": [],
      "dependencies": [],
      "notes": []
    }
  ]
}
```

### context/conversation_history.json
```json
{
  "conversations": [
    {
      "date": "ISO_8601_timestamp",
      "summary": "",
      "key_decisions": [],
      "action_items": [],
      "topics": [],
      "important_details": []
    }
  ],
  "max_entries": 50
}
```

### knowledge/domain_expertise.json
```json
{
  "domains": {
    "domain_name": {
      "concepts_learned": [],
      "tools_used": [],
      "patterns_identified": [],
      "resources": [],
      "notes": []
    }
  }
}
```

## Behavioral Rules

1. **Always Initialize**: Check for memory files at conversation start
2. **Create if Missing**: If memory directory doesn't exist, create it with base structure
3. **Incremental Updates**: Update files as information comes in, don't wait
4. **Relevance Filter**: Only store information that's likely to be useful in future conversations
5. **Avoid Redundancy**: Check existing memory before adding duplicate information
6. **Timestamp Everything**: Use ISO 8601 format for all timestamps
7. **Compression**: Keep conversation_history.json to last 50 entries max (oldest get archived)
8. **Smart Loading**: Only load files relevant to current conversation context

## Optimization Guidelines

- **Read**: Load only what's needed (index → profile → task-specific files)
- **Write**: Batch updates when possible, write after significant new information
- **Size Management**: Keep individual JSON files under 100KB for performance
- **Archive Old Data**: Move completed tasks/old conversations to archive files monthly
- **Index Efficiency**: Keep index.json lightweight as it's loaded every session

## Example Workflow

**User**: "I'm working on a React project with authentication"

**Claude Actions**:
1. Check `/memory/context/ongoing_projects.json` for existing React projects
2. Create/update project entry with authentication requirement
3. Reference any previous React + auth solutions from `/memory/knowledge/domain_expertise.json`
4. Add task to implement authentication in `/memory/tasks/active_tasks.json`

## Error Handling

- If a memory file is corrupted, log error but continue
- Create backup before major structural changes
- Validate JSON before writing
- Gracefully handle missing files by creating defaults

---

**REMEMBER**: This memory system makes you more helpful by maintaining context. Use it proactively, not just when asked. The goal is seamless continuity across all our interactions.
---

## 🔴 CRITICAL RULE #0: USE EXISTING PATTERNS FIRST

**ALWAYS cross-reference existing code before creating new functions or patterns!**

### The Principle:
**Don't reinvent the wheel. If it works elsewhere in the codebase, use that pattern.**

### Before creating ANY new function:
1. **Search** the codebase for similar functionality
2. **Find** how existing features implement the same behavior
3. **Copy** the working pattern (don't create a new approach)
4. **Adapt** the existing pattern to your specific use case

### Examples:

**❌ WRONG Approach:**
```javascript
// Creating a new delete button pattern from scratch
const deleteBtn = document.createElement('button');
deleteBtn.onclick = () => deleteItem(id);  // Inventing new pattern
```

**✅ RIGHT Approach:**
```javascript
// First: Search for existing delete buttons in codebase
// Found: deleteInventoryItem uses event delegation with data attributes
// Use THAT pattern:

const deleteBtn = document.createElement('button');
deleteBtn.classList.add('delete-item-btn');  // Existing class
deleteBtn.setAttribute('data-delete-item', id);  // Existing data attribute
deleteBtn.textContent = '✕';
// Event listener already exists in main script using delegation
```

### How to Search for Existing Patterns:

1. **Grep for similar function names:**
   ```bash
   grep -n "function delete" index.html
   grep -n "onclick=" index.html
   grep -n "addEventListener" index.html
   ```

2. **Look for working examples:**
   - Find features that already work
   - Read how they implement onclick handlers
   - Copy their exact pattern

3. **Check event listeners:**
   - Search for `document.addEventListener('click'`
   - Look for event delegation patterns
   - Use the same classes and data attributes

### Why This Matters:

- **Consistency:** All buttons work the same way
- **Reliability:** Existing patterns are already tested and working
- **Speed:** No need to debug new approaches
- **Maintainability:** One pattern throughout codebase

### When User Says "Use Existing Methods":

**STOP creating new patterns. Search the codebase, find the working approach, copy it exactly.**

---

## 🔴 CRITICAL RULE #1: NEVER REMOVE CODE TO FIX ERRORS

**WE NEVER CUT CORNERS OR REDUCE CODE JUST TO MAKE SOMETHING ERROR-FREE!**

### ❌ NEVER DO THIS:
- Remove a column reference because it doesn't exist in the database
- Delete a function call because it's causing an error
- Comment out code to make errors go away
- Simplify logic to avoid complexity
- Remove features to avoid bugs

### ✅ ALWAYS DO THIS:
- **ADD** the missing column to the database
- **FIX** the function that's broken
- **DEBUG** the error and fix the root cause
- **SOLVE** the complexity properly
- **BUILD** the feature correctly

### Core Principle:
**Code exists for a reason. If it doesn't work, we FIX it - we don't delete it!**

When you encounter an error:
1. **Understand WHY** the code is there
2. **Find the root cause** of the error
3. **Fix the database/system** to support the code
4. **NEVER** take the "easy way out" by removing functionality

**This is a production system. Everything must work correctly, not just "work without errors."**

---

## 🎯 CRITICAL RULE #2: OUTCOME-DRIVEN PROBLEM SOLVING

**When you know the desired outcome, STOP debugging and BUILD it the right way!**

### The Manage Orders Fix (Oct 12, 2025):

**Problem:** Edit/delete links not showing in table (spent 30+ minutes debugging)

**What I was doing WRONG:**
- Debugging CSS variables in innerHTML
- Trying different button styles
- Adding console logs to trace the issue
- Iterating on the same broken approach
- Getting lost in the debugging weeds

**What I should have done from the START:**
User said: *"you know exactly what we want and you probably know how to achieve it, so just achieve it"*

**The Fix (2 minutes):**
```javascript
// ❌ WRONG: innerHTML with template literals
row.innerHTML = `<td>...</td>`;  // onclick handlers don't always work

// ✅ RIGHT: Pure DOM manipulation
const cell = document.createElement('td');
cell.onclick = () => myFunction();
row.appendChild(cell);
```

**Why it worked instantly:**
- `createElement()` + direct property assignment = always works
- No innerHTML parsing issues
- No CSS variable resolution problems
- onclick handlers attached directly to DOM elements
- Simple, reliable, predictable

### The Principle:

**When the user says "just make it work" - they're telling you to stop debugging the broken approach and rebuild it correctly.**

1. **Know the desired outcome** (edit/delete links in a table)
2. **Know the right way to do it** (createElement, not innerHTML)
3. **STOP debugging the wrong approach**
4. **JUST BUILD IT THE RIGHT WAY**

### When to apply this:

- User says "you know what to do"
- You've been debugging the same issue for >15 minutes
- You keep trying variations of the same broken approach
- There's a simpler, more reliable way you haven't tried yet
- The fundamental approach is wrong (not just the details)

### Red Flags You're Going Down the Wrong Path:

- "Let me try adding more console logs..."
- "Maybe if I change this CSS variable..."
- "Let me try a different button style..."
- "Let me check the DOM one more time..."

**STOP. Rebuild it the right way.**

### The Right Mindset:

**"I know what the user wants. I know how to build it properly. Stop iterating on broken code - build it correctly from scratch."**

---

## Project Overview

**Jayna Cash Counter** is a production restaurant management platform combining:
1. Cash counting system (AM/PM workflows with dual drawers)
2. Tip pool calculator with Toast POS integration
3. Automated daily reporting via EmailJS
4. Manager analytics dashboard with real-time insights
5. Labor management through Homebase API integration

**Live URL:** https://jayna-cash-counter.vercel.app

---

## 🚨 CRITICAL: NO POPUP WINDOWS RULE

**NEVER use popup windows for notifications, confirmations, or alerts!**

### ❌ BANNED Functions:
- `window.alert()` - NEVER USE
- `window.confirm()` - NEVER USE
- `window.prompt()` - NEVER USE

**Why:** These functions are blocked in sandboxed iframes (Vercel preview environments) and create poor UX.

### ✅ ESTABLISHED PATTERNS:

**For Success/Save Notifications:**
- Text or box turns GREEN and displays "✓ Saved!"
- NO save/submit buttons for majority of updates
- Save automatically on blur/focus out
- Use inline status indicators

```javascript
// ✅ CORRECT - Inline success feedback
const statusDiv = document.getElementById('status');
statusDiv.textContent = '✓ Saved!';
statusDiv.style.color = '#065f46';
statusDiv.style.background = '#d1fae5';

// Or highlight the entire row
row.style.background = '#d1fae5'; // Success green background
```

**For Delete Confirmations:**
- Use prominent button styling (red danger button already signals intent)
- Button click itself is intentional action - NO confirmation needed
- Show success feedback after deletion completes

```javascript
// ✅ CORRECT - No confirmation dialog
async function deleteItem(id) {
  showLoading('Deleting', 'Removing item...');

  // Perform deletion
  await supabase.from('table').delete().eq('id', id);

  // Show success feedback
  showMessage('✅ Item deleted successfully!', 'success');
}
```

**For Errors:**
- Use existing `showMessage(text, 'error')` function
- Displays modal only for errors (not for success/info)
- Red error container with clear message

---

## Essential Reading on Session Start

**ALWAYS read these files at the start of every session (IN THIS ORDER):**

1. **Last 3 RTF Chat Sessions** (most recent conversation context)
   - Go to `/chat sessions/` folder
   - Sort by filename (newest first)
   - Read the 3 most recent `session_YYYY-MM-DD_*.rtf` files
   - These contain complete conversation history with full context
   - Pay attention to: what was built, decisions made, blockers encountered

2. `CURRENT_STATUS.md` - **READ SECOND** - Current work state, blockers, next steps
   - Shows what's in progress
   - Lists uncommitted changes
   - Documents blockers
   - Provides clear next steps

3. `AI_PROJECT_INSTRUCTIONS.md` - Complete project context and authorization levels

4. `PROJECT_MASTER_LOG.md` - Session history (newest entries first, read last 3 entries)

5. `CURRENT_PROJECT_DOCUMENTATION.md` - System overview (if needed for context)

**After reading, ask the user:** "What are we working on today?" Then update `CURRENT_STATUS.md` with session start time.

---

## 🎨 DESIGN SYSTEM - STANDARDIZED STYLING

**CRITICAL:** All new features MUST follow these design standards for consistency.

### Color Palette (CSS Variables)

```css
/* Primary Colors */
--white: #ffffff
--gray-900: #1a1a1a        /* Primary text, headers */
--gray-700: #4a4a4a        /* Secondary text, buttons */
--gray-600: #6b6b6b        /* Tertiary text */
--gray-500: #9ca3af        /* Muted text, placeholders */
--gray-400: #d1d5db        /* Borders */
--gray-300: #e5e7eb        /* Light borders, dividers */
--gray-200: #f3f4f6        /* Subtle backgrounds */
--gray-100: #f9fafb        /* Section backgrounds */

/* Status Colors */
--success-bg: #d1fae5      /* Green backgrounds */
--success-text: #065f46    /* Success green text */
--success-border: #059669  /* Success green borders */

--warning-bg: #fef3c7      /* Yellow/orange backgrounds */
--warning-text: #92400e    /* Warning brown text */
--warning-border: #f59e0b  /* Warning orange borders */

--error-bg: #fee2e2        /* Red backgrounds */
--error-text: #991b1b      /* Error red text */
--error-border: #dc2626    /* Error red borders */

/* Accent Colors */
--blue-bg: #dbeafe
--blue-text: #1e40af
```

### Typography

```css
/* Headers */
h1, h2:           font-size: 18-20px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--gray-900);
h3:               font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--gray-900);
h4:               font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--gray-900);

/* Body Text */
Regular:          font-size: 13px; font-weight: 400; color: var(--gray-700);
Emphasized:       font-size: 13px; font-weight: 600; color: var(--gray-900);
Muted:            font-size: 12px; font-weight: 400; color: var(--gray-500);

/* Labels */
Form Labels:      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--gray-700);
Small Labels:     font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--gray-600);

/* Tab Buttons */
Tab Text:         font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;
```

### Buttons

```css
/* Primary Button (Submit/Save/Confirm) */
background: var(--gray-900);
color: white;
border: 2px solid var(--gray-900);
padding: 12px 24px;
font-size: 13px;
font-weight: 700;
text-transform: uppercase;
letter-spacing: 0.5px;
cursor: pointer;
border-radius: 0;              /* NO rounded corners! */
transition: all 0.15s ease;

/* Secondary Button (Cancel/Back) */
background: var(--gray-100);
color: var(--gray-900);
border: 2px solid var(--gray-300);
/* Same sizing/typography as primary */

/* Danger Button (Delete/Remove) */
background: #dc2626;
color: white;
border: 2px solid #dc2626;
/* Same sizing/typography as primary */

/* Success Button (Confirm/Complete) */
background: #059669;
color: white;
border: 2px solid #059669;
/* Same sizing/typography as primary */

/* Tab Button (Active) */
background: var(--gray-700);
color: var(--white);
padding: 12px 10px;
min-width: 80px;
font-size: 11px;
font-weight: 700;
text-transform: uppercase;
letter-spacing: 0.8px;

/* Tab Button (Inactive) */
background: var(--gray-100);
color: var(--gray-700);
/* Same sizing as active */
```

### Form Inputs

```css
/* Text Inputs */
input[type="text"],
input[type="number"],
input[type="date"],
select:
  width: 100%;
  padding: 12px;
  border: 2px solid var(--gray-300);
  border-radius: 0;              /* NO rounded corners! */
  font-size: 14px;
  font-weight: 400;
  background: white;
  box-sizing: border-box;

/* Input Focus State */
input:focus,
select:focus:
  border-color: var(--gray-700);
  outline: none;

/* Input Error State */
input.error:
  border-color: #dc2626;
  background: #fef2f2;

/* Input Success State */
input.success:
  border-color: #059669;
  background: #f0fdf4;
```

### Containers & Sections

```css
/* Main Section Container */
background: var(--white);
border: 2px solid var(--gray-300);
padding: 20px;
margin-bottom: 20px;
border-radius: 0;              /* NO rounded corners! */

/* Subsection Container */
background: var(--gray-100);
border: 2px solid var(--gray-300);
padding: 16px;
margin-bottom: 16px;
border-radius: 0;

/* Alert/Notice Container */
background: var(--warning-bg);
border: 2px solid var(--warning-border);
padding: 12px 16px;
margin-bottom: 16px;
border-radius: 0;

/* Success Container */
background: var(--success-bg);
border: 2px solid var(--success-border);
padding: 12px 16px;
border-radius: 0;

/* Error Container */
background: var(--error-bg);
border: 2px solid var(--error-border);
padding: 12px 16px;
border-radius: 0;
```

### Tables

```css
/* Table Container */
border: 2px solid var(--gray-300);
overflow-x: auto;
background: white;

/* Table Structure */
table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

/* Table Header */
thead tr {
  background: var(--gray-100);
  border-bottom: 2px solid var(--gray-300);
}

thead th {
  padding: 12px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  color: var(--gray-700);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Table Body */
tbody tr {
  border-bottom: 1px solid var(--gray-200);
}

tbody td {
  padding: 12px;
  font-size: 13px;
  color: var(--gray-700);
}

/* Table Row Hover */
tbody tr:hover {
  background: var(--gray-50);
}
```

### Cards & Grid Layouts

```css
/* Card (Mobile-Optimized Lists) */
background: white;
border: 2px solid var(--gray-300);
padding: 12px;
margin-bottom: 12px;
border-radius: 0;
transition: all 0.15s ease;

/* Card Hover */
card:hover {
  border-color: var(--gray-400);
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

/* Responsive Grid */
display: grid;
grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
gap: 12px;

/* Two-Column Layout */
display: grid;
grid-template-columns: 1fr 1fr;
gap: 16px;

/* Three-Column Layout */
display: grid;
grid-template-columns: 1fr 1fr 1fr;
gap: 12px;
```

### Modals

```css
/* Modal Overlay */
position: fixed;
top: 0;
left: 0;
right: 0;
bottom: 0;
background: rgba(0,0,0,0.7);
display: flex;
align-items: center;
justify-content: center;
z-index: 10000;
overflow-y: auto;
padding: 20px;

/* Modal Content */
background: white;
padding: 24px;
max-width: 800px;             /* Adjust based on content */
width: 100%;
max-height: 90vh;
overflow-y: auto;
border: 3px solid var(--gray-700);
border-radius: 0;             /* NO rounded corners! */
```

### Status Badges

```css
/* Pending Status */
display: inline-block;
padding: 4px 10px;
background: var(--warning-bg);
color: var(--warning-text);
border-radius: 0;
font-weight: 600;
font-size: 12px;
text-transform: uppercase;
letter-spacing: 0.5px;

/* Complete Status */
background: var(--success-bg);
color: var(--success-text);
/* Same structure as pending */

/* Error/Failed Status */
background: var(--error-bg);
color: var(--error-text);
/* Same structure as pending */

/* Info Status */
background: var(--blue-bg);
color: var(--blue-text);
/* Same structure as pending */
```

### Loading Indicators

```css
/* Spinner */
.spinner {
  border: 3px solid var(--gray-300);
  border-top: 3px solid var(--gray-500);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Loading Container */
background: var(--gray-100);
padding: 40px;
text-align: center;
border: 2px solid var(--gray-300);
border-radius: 0;
```

### Spacing System

```css
/* Padding/Margin Scale */
--spacing-4: 4px;
--spacing-8: 8px;
--spacing-12: 12px;
--spacing-16: 16px;
--spacing-20: 20px;
--spacing-24: 24px;
--spacing-40: 40px;

/* Common Patterns */
Section margin-bottom: 20px;
Subsection margin-bottom: 16px;
Element margin-bottom: 12px;
Inline gap: 8px;
```

### Responsive Breakpoints

```css
/* Mobile First Approach */
Base: < 600px (1 column, stacked)
Tablet: 600-900px (2 columns)
Desktop: > 900px (2-3 columns)

/* Touch Targets (Mobile) */
Minimum: 44px height (iOS/Android guideline)
Preferred: 48px height
Button padding: 14px vertical minimum
```

---

### Design Principles

1. **NO ROUNDED CORNERS** - `border-radius: 0` everywhere (sharp, professional aesthetic)
2. **Heavy Borders** - Use 2px borders (not 1px) for definition
3. **ALL CAPS HEADERS** - Headers and labels in uppercase with letter-spacing
4. **Consistent Weights** - 400 (regular), 600 (emphasis), 700 (headers/buttons)
5. **Minimal Color Palette** - Primarily grayscale with accent colors for status only
6. **Touch-Friendly** - 48px minimum touch targets on mobile
7. **Grid-Based Layouts** - Use CSS Grid (not floats or flexbox for primary layouts)
8. **Pure DOM Manipulation** - Use `createElement()` and `appendChild()`, not template literals
9. **No External CSS Frameworks** - All styling inline or in `<style>` tags

---

### Code Examples

#### Button Group
```javascript
const buttonGroup = document.createElement('div');
buttonGroup.style.cssText = 'display: flex; gap: 12px; justify-content: flex-end;';

const cancelBtn = document.createElement('button');
cancelBtn.textContent = 'CANCEL';
cancelBtn.style.cssText = 'padding: 12px 24px; background: var(--gray-100); border: 2px solid var(--gray-300); color: var(--gray-900); font-size: 13px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px;';
buttonGroup.appendChild(cancelBtn);

const saveBtn = document.createElement('button');
saveBtn.textContent = 'SAVE';
saveBtn.style.cssText = 'padding: 12px 24px; background: var(--gray-900); border: 2px solid var(--gray-900); color: white; font-size: 13px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px;';
buttonGroup.appendChild(saveBtn);
```

#### Form Field
```javascript
const label = document.createElement('label');
label.textContent = 'DELIVERY DATE';
label.style.cssText = 'display: block; margin-bottom: 8px; font-size: 11px; font-weight: 700; color: var(--gray-700); text-transform: uppercase; letter-spacing: 0.5px;';

const input = document.createElement('input');
input.type = 'date';
input.style.cssText = 'width: 100%; padding: 12px; border: 2px solid var(--gray-300); border-radius: 0; font-size: 14px; margin-bottom: 20px; box-sizing: border-box;';
```

#### Status Badge
```javascript
const badge = document.createElement('span');
badge.textContent = 'PENDING';
badge.style.cssText = 'display: inline-block; padding: 4px 10px; background: #fef3c7; color: #92400e; border-radius: 0; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;';
```

---

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
