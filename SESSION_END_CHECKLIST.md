# SESSION END CHECKLIST - Jayna Cash Counter
**Purpose:** Ensure zero context loss between Claude Code sessions

---

## 🚨 CRITICAL: When to Run This Checklist

Claude Code MUST run this checklist in these situations:

### 1. **User Signals Session End**
Trigger words/phrases (watch for these):
- "thanks", "thank you", "that's all", "that's it"
- "goodbye", "bye", "see you", "later"
- "done for now", "that's good", "looks good"
- "stop", "pause", "that's enough"
- "I'm finished", "we're done", "all set"
- Any farewell or completion phrase

### 2. **Conversation Getting Long**
- After 50+ messages in conversation
- After 2+ hours of continuous work
- When approaching context window limits
- Proactively after major milestones

### 3. **Before Major Changes**
- Before refactoring large files
- Before deployment to production
- Before making breaking changes
- After completing feature implementation

### 4. **User Asks for Status**
- "what's our progress?"
- "where are we at?"
- "can you summarize what we did?"
- "update the status"

---

## ✅ MANDATORY CHECKLIST (DO NOT SKIP)

### Step 0: Save Chat Session to RTF (DO THIS FIRST!)
```bash
# Create RTF file in /chat sessions/ folder
# Filename: session_YYYY-MM-DD_brief-description.rtf
# Example: session_2025-10-09_vendor-auto-detection.rtf
```

**Required actions:**
- [ ] Create `/chat sessions/` folder if it doesn't exist
- [ ] Generate unique filename with date and brief description
- [ ] Copy entire chat conversation into RTF format
- [ ] Include these sections in RTF:
  - Session date and title
  - Context from previous session (if applicable)
  - Complete conversation transcript (user + assistant messages)
  - All code changes made
  - Git commits with messages
  - Deployment status
  - Files modified list
  - Testing notes
  - Session outcome/results
- [ ] Use proper RTF formatting:
  - Headers with bold/larger font
  - Color coding (blue for user, gray for assistant)
  - Italics for metadata
  - Line breaks for readability
  - Code blocks with monospace font

**Template structure:**
```rtf
{\rtf1\ansi\deff0
{\fonttbl{\f0 Arial;}}
{\colortbl;\red0\green0\blue0;\red0\green128\blue255;\red128\green128\blue128;}

\f0\fs24
{\b\fs32 Chat Session: [Title]}\par
{\i Date: October 9, 2025}\par
\line\par

[Full conversation transcript with formatting]

{\b\fs26 SESSION OUTCOME}\par
Status: Complete/In Progress\par
[Summary]
}
```

### Step 1: Update CURRENT_STATUS.md
```bash
# Update these sections:
- Current Work Status (in_progress tasks)
- Uncommitted Changes (git status)
- Blockers & Issues (any problems encountered)
- Next Session Should Start With (clear action items)
- Last Updated timestamp
```

**Required fields to update:**
- [ ] Last Updated date/time
- [ ] Current Work Status (what's in progress?)
- [ ] Uncommitted Changes (run git status)
- [ ] Blockers (any issues preventing progress?)
- [ ] Next Session instructions (specific next steps)
- [ ] Production System Health (if deployed/tested)

### Step 2: Update PROJECT_MASTER_LOG.md
```bash
# Add new entry at TOP with:
- Session date/time
- Focus (what did we work on?)
- Commands Run (key terminal commands)
- Files Modified (all changed files)
- Decisions Made (architectural choices, why?)
- Status (Completed | In Progress | Blocked)
- Next Steps (clear action items)
```

**Required sections:**
- [ ] Session date/time header at TOP of file
- [ ] Focus/Context (what was this session about?)
- [ ] Commands Run (git commits, deployments, tests)
- [ ] Files Modified (complete list)
- [ ] Decisions Made (why certain choices were made)
- [ ] Status (current state)
- [ ] Next Steps (actionable items for next session)

### Step 3: Git Status Check
```bash
# Run these commands and document results:
git status
git log --oneline -5
```

**Actions:**
- [ ] Run git status
- [ ] If uncommitted changes exist, document in CURRENT_STATUS.md
- [ ] If work is complete, commit with proper message
- [ ] If work is incomplete, explain why in status files

### Step 4: Production Verification (if deployed)
```bash
# If changes were deployed:
- Visit https://jayna-cash-counter.vercel.app
- Test changed functionality
- Check browser console for errors
- Document results in CURRENT_STATUS.md
```

**Actions:**
- [ ] Verify production site if deployed
- [ ] Document deployment status
- [ ] Note any issues found
- [ ] Update "Production System Health" section

### Step 5: Create Session Summary
Provide user with clear summary:
```markdown
## Session Summary:
**Duration:** [time]
**Focus:** [what we worked on]
**Completed:** [list of completed tasks]
**In Progress:** [what's still ongoing]
**Files Changed:** [list]
**Deployed:** [yes/no + URL if yes]
**Next Session:** [clear next steps]

✅ Status files updated (CURRENT_STATUS.md, PROJECT_MASTER_LOG.md)
```

---

## 🤖 AUTO-RESPONSE TEMPLATES

### When User Says "Thanks" / "That's All":
```
Before we end, let me save this chat session and update the status files to preserve our progress...

[Run checklist Steps 0-3]

✅ Session complete! Chat saved to RTF and status files updated.

Summary:
- [brief summary]
- Chat session saved to: /chat sessions/session_YYYY-MM-DD_description.rtf
- Files updated: CURRENT_STATUS.md, PROJECT_MASTER_LOG.md
- Next session will start with: [clear instruction]
```

### When Conversation is Long (50+ messages):
```
I notice we've had a long conversation. Let me proactively update
the status files to ensure we don't lose context...

[Run checklist Steps 1-3]

✅ Status preserved. We can continue working, or if you're ready
to end the session, all progress has been documented.
```

### When User Asks for Status:
```
Let me check our current status and update the files...

[Run checklist Steps 1-4]

[Provide detailed summary from CURRENT_STATUS.md]
```

---

## 📋 QUICK REFERENCE: Session End Flow

```
User says goodbye
    ↓
Trigger: "I'll save the chat session and update status files first..."
    ↓
Step 0: Save chat to RTF file in /chat sessions/
    ↓
Step 1: Update CURRENT_STATUS.md
    ↓
Step 2: Update PROJECT_MASTER_LOG.md
    ↓
Step 3: Check git status
    ↓
Step 4: Verify production (if applicable)
    ↓
Step 5: Provide session summary
    ↓
Confirm: "✅ Chat session saved to RTF. Status files updated. See you next session!"
```

---

## ⚠️ WHAT NOT TO DO

**❌ DON'T:**
- Say goodbye without updating status files
- Skip checklist items because "it's just a small session"
- Assume next Claude will remember context
- Leave uncommitted changes undocumented
- End session without clear next steps
- Update only one file (must update both CURRENT_STATUS + MASTER_LOG)

**✅ DO:**
- Run checklist every single time, no exceptions
- Document even small changes
- Be specific about next steps
- Note all blockers and questions
- Update timestamps accurately
- Commit completed work before ending

---

## 🎯 SUCCESS CRITERIA

Session end is successful when:
- ✅ Chat session saved to RTF file in /chat sessions/ folder
- ✅ RTF file contains complete conversation with proper formatting
- ✅ CURRENT_STATUS.md shows accurate current state
- ✅ PROJECT_MASTER_LOG.md has new entry at TOP
- ✅ Uncommitted changes are documented (or committed)
- ✅ Next steps are crystal clear
- ✅ User received session summary
- ✅ No context will be lost for next Claude instance

---

## 💡 PRO TIPS

1. **Be Proactive:** Don't wait for user to say goodbye - update status after major milestones
2. **Be Specific:** "Fix bug" is bad; "Fix Toast API pagination to fetch all 500+ orders" is good
3. **Link Files:** Reference specific files and line numbers
4. **Document Decisions:** Future Claude needs to know WHY, not just WHAT
5. **Test First:** Never say "done" without testing
6. **Commit Often:** Small, frequent commits with clear messages

---

**Remember:** Next Claude Code instance starts fresh with ZERO memory of this session.
These status files are the ONLY way to maintain continuity. Treat them as critical.

---

*Created: October 8, 2025*
*Purpose: Prevent context loss between sessions*
*Enforcement: Mandatory before every session end*
