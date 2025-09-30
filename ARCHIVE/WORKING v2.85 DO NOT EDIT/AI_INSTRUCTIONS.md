# AI CODING ASSISTANT INSTRUCTIONS

## CORE PRINCIPLES

### 1. NEVER CUT CORNERS OR DISABLE FEATURES
- NEVER disable, remove, or simplify features just because they're not working
- ALWAYS fix the root cause of issues instead of working around them
- If a technology isn't working, troubleshoot and fix it - don't replace it
- The goal is to get EVERYTHING working, not to scale back functionality
- Debug thoroughly and resolve all issues before moving forward
- When encountering build errors, dependency issues, or configuration problems, FIX THEM completely

### 2. REAL DATA ONLY - NO PLACEHOLDERS
- NEVER use placeholder data, mock data, or hardcoded fallbacks
- Always connect to real APIs, databases, and services
- If real data is unavailable, STOP and request access/credentials
- Test with actual production or staging environments
- Use environment variables for sensitive data, but connect to real services

### 3. LIVE DEPLOYMENT WORKFLOW
- ALWAYS commit and push changes after each significant modification
- Deploy to staging/development environment after each push
- Wait for human feedback on live deployment before proceeding
- Never simulate or mock deployment - always use real deployment pipeline
- Include deployment commands in commit workflow

### 4. CONTINUOUS DOCUMENTATION
- Maintain PROJECT_SUMMARY.md with current state of the project
- Update PROCESS_LOG.md after each successful change
- Keep TODO.md with prioritized task list
- Reference these files before making any decisions
- Update documentation BEFORE making changes, not after

### 5. AUTONOMOUS OPERATION GUIDELINES
- Work through TODO list systematically
- Make one change at a time, commit, deploy, document
- Continue working until explicitly told to stop
- Handle errors by troubleshooting, not by reverting to placeholders
- Keep detailed logs of all actions taken

## REQUIRED FILES TO MAINTAIN

### PROJECT_SUMMARY.md
```markdown
# Project Summary
## Current State
- [Detailed description of what exists]
## Architecture
- [System architecture and components]
## Technologies Used
- [Complete tech stack]
## Current Deployment
- [Where it's deployed and how to access]
## Next Steps
- [Immediate priorities]
```

### PROCESS_LOG.md
```markdown
# Process Log
## [Date] - [Change Description]
- What was changed
- Why it was changed
- Commands executed
- Deployment result
- Testing outcomes
```

### TODO.md
```markdown
# TODO List
## High Priority
- [ ] [Task with specific acceptance criteria]
## Medium Priority
- [ ] [Task with specific acceptance criteria]
## Completed
- [x] [Completed task with date]
```

## WORKFLOW PROCESS

### Before Each Session
1. Read PROJECT_SUMMARY.md
2. Read PROCESS_LOG.md (last 10 entries)
3. Read TODO.md
4. Understand current state completely

### For Each Change
1. Select highest priority TODO item
2. Plan the implementation approach
3. Update PROJECT_SUMMARY.md if architecture changes
4. Implement the change with real data/connections
5. Test locally with real services
6. Commit with descriptive message
7. Push to repository
8. Deploy to staging/development
9. Update PROCESS_LOG.md with results
10. Mark TODO item as complete
11. Wait for human feedback on deployment
12. Move to next TODO item

### Error Handling
- If API/database connection fails, troubleshoot the connection
- If deployment fails, fix the deployment issue
- NEVER use mock data as a workaround
- Document all troubleshooting steps in PROCESS_LOG.md
- Ask for help only if stuck for more than 30 minutes

### Commit Message Format
```
[FEATURE/FIX/UPDATE]: Brief description

- Specific changes made
- APIs/services connected
- Deployment status
- Testing completed

Closes: TODO item #
```

### Deployment Commands Template
```bash
# Add your specific deployment commands
git add .
git commit -m "[TYPE]: Description"
git push origin main
# Add your deployment script here
npm run deploy  # or your deployment command
```

## COMMUNICATION PROTOCOL

### Status Updates
Provide updates in this format:
```
## Current Status
- Working on: [TODO item]
- Progress: [X%]
- Last deployment: [URL/status]
- Next step: [Specific action]

## Files Updated
- [List of modified files]

## Testing Status
- [Results of real data testing]
```

### When Waiting for Feedback
```
## Deployment Ready for Review
- Changes: [Summary]
- Deployed to: [URL]
- Testing instructions: [How to test]
- Expected behavior: [What should work]

Waiting for feedback to continue...
```

## RESTRICTIONS

### NEVER DO
- Use placeholder or mock data
- Skip deployment steps
- Work without updating documentation
- Continue without feedback after deployment
- Use hardcoded values instead of real connections
- Assume APIs work without testing
- **DISABLE OR REMOVE FEATURES TO AVOID FIXING ISSUES**
- **SIMPLIFY OR SCALE BACK FUNCTIONALITY WHEN ENCOUNTERING PROBLEMS**
- **CUT CORNERS OR USE WORKAROUNDS INSTEAD OF PROPER FIXES**

### ALWAYS DO
- Connect to real services
- Commit and push every change
- Update documentation files
- Test with live data
- Wait for deployment feedback
- Keep detailed logs

## TROUBLESHOOTING APPROACH

1. Check real service connections first
2. Verify credentials and permissions
3. Test API endpoints manually
4. Check deployment logs
5. Review recent changes in PROCESS_LOG.md
6. Document troubleshooting steps
7. If stuck, provide detailed error info and ask for help

## FILE REFERENCES

Before making ANY decision:
1. Check PROJECT_SUMMARY.md for current state
2. Review TODO.md for priorities
3. Check PROCESS_LOG.md for recent changes
4. Understand the full context before proceeding

These files are the source of truth - always reference them!