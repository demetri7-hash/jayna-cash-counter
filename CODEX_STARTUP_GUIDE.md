# CODEX Startup Guide
### Keep this open in every session to stay aligned with Jayna Cash Counter’s conventions.

---

## 1. Session Boot Sequence (follow in order)
1. Skim the **three most recent** RTF transcripts in `/chat sessions/`.
2. Read `CURRENT_STATUS.md` for live state, blockers, and next-step prompts.
3. Glance at the latest entry in `PROJECT_MASTER_LOG.md` for decisions and files touched.
4. Revisit core references (quick scan is enough unless something changed):
   - `AI_PROJECT_INSTRUCTIONS.md`
   - `CLAUDE.md`
   - `instructions for ai.txt`
5. Open the code file(s) relevant to today’s task and confirm current diff with `git status`.
6. Before editing: plan updates in plain text, note any Supabase tables touched, and check for existing helpers to reuse.

---

## 2. Ground Rules (commit these to muscle memory)
- **Re-use existing patterns.** Inspect `index.html` for the closest matching workflow before writing anything new. Prefer pure DOM manipulation (no innerHTML templates).
- **Never delete functionality to “fix” a bug.** Trace root causes and restore expected behavior.
- **Stay production safe.** Validate before deploying, avoid speculative migrations, and don’t touch secrets.
- **Log obsessively.** Record all work in `PROJECT_MASTER_LOG.md` + `CURRENT_STATUS.md` and keep session transcripts per `SESSION_END_CHECKLIST.md`.
- **Prefer clarity over novelty.** Follow established naming, comments, and layout conventions.

---

## 3. Design System Snapshot (grayscale, high-contrast, zero flair)
| Token / Element | Value / Rule | Notes |
| --- | --- | --- |
| Primary background | `#ffffff` | Containers bordered `2px solid #ddd` |
| Light panels | `#f8f9fa` | Section backgrounds |
| Border / Divider | `#ddd` / `#ccc` | No drop shadows unless existing |
| Text (primary / secondary) | `#333` / `#666` | Muted text `#999` |
| Accent text | `#1e3c72` (existing blue) | Use sparingly for headers only |
| Buttons | 44 px tall, uppercase, `border-radius: 0` | Primary dark gray `#111` or theme colors already in use |
| Inputs | 12 px padding, `border-radius: 0`, focus border `#666` | Numeric inputs: `inputmode="numeric"`/`"decimal"` |

**Absolute rules:** no emojis, no yellow/orange callouts, no rounded corners, no box-shadows unless they already exist in the target block.

Typography refreshers (from `CLAUDE.md`):
- Headers uppercase (18–20 px `font-weight: 700`), body copy 13 px, labels 11 px uppercase.
- Tabs: 11 px uppercase, gray palette aligned with existing `.tab-link` styles.

---

## 4. Supabase & API Safety Checklist
- Confirm the table/column exists in `database/ACTUAL_SCHEMAS_USED_IN_CODE.md` before reading/writing; document any additions in the database docs set.
- Read/write via Supabase helpers already implemented in `index.html` wherever possible (e.g., `saveCashboxCountFromTipPool`, `autoFetchOnDateChange`).
- Cron/automation endpoints live under `/api`; keep request shapes and logging consistent when modifying them.
- Avoid schema migrations during feature work unless explicitly approved; if unavoidable, document in `database/*.md` and add SQL migrations.

---

## 5. Documentation & References to Pin
- **Architecture / High-level:** `CURRENT_PROJECT_DOCUMENTATION.md`
- **Tip pool automation:** `TIP_POOL_API_AUTOMATION_PLAN.md`, `TDS_DRIVER_ANALYSIS_DOCUMENTATION.md`
- **Ordering & inventory:** `ORDERING_SYSTEM_REQUIREMENTS.md`, `VENDOR_FORMAT_LEARNING_SYSTEM.md`, `COGs_IMPLEMENTATION_PLAN.md`
- **Process logs:** `PROCESS_LOG.md`, `PROJECT_STATUS_2025-10-06.md` (historic deep dive)
- **Automations:** `SETUP_INSTRUCTIONS.md`, `AUTOMATED_ORDERING_SYSTEM.md`

Keep them open in split view when working on matching areas.

---

## 6. End-of-Session Protocol (no exceptions)
1. Save the conversation to a new `/chat sessions/session_YYYY-MM-DD_<slug>.rtf` using the format in `SESSION_END_CHECKLIST.md`.
2. Update `CURRENT_STATUS.md` (timestamp, status, blockers, next session step).
3. Add a new top entry to `PROJECT_MASTER_LOG.md` (focus, commands, files, decisions, next steps).
4. Double-check `git status` and note any uncommitted changes.
5. Return to the user with a short summary plus “✅ Status files updated” once files are written.

---

## 7. Quick Triage Flow
1. **New feature request?** Locate comparable feature, lift pattern, adapt values.
2. **Bug report?** Reproduce, locate responsible module in `index.html` or API, patch with minimal change, ensure Supabase writes remain consistent.
3. **Style issue?** Compare against design table above and `CLAUDE.md` CSS examples; apply only grayscale adjustments.
4. **Data mismatch?** Check cron/cache status (`CURRENT_STATUS.md`), Supabase data, then Toast/Homebase API logs.

Use this sheet to anchor every session—update it if workflow changes so your future self never has to rediscover institutional knowledge.
