# Root Directory Inventory

**Last Updated:** December 20, 2024

This document lists all files currently in the root directory of the Jayna Cash Counter application. All files listed here are **actively used** by the live production system.

## Active HTML Pages (17)

| File | Purpose |
|------|---------|
| `index.html` | Main application - Cash counter + Tip pool calculator |
| `manager.html` | Manager analytics dashboard |
| `foh-checklists.html` | FOH digital checklists system |
| `amex-receipts.html` | AMEX receipt management |
| `boh.html` | Back of house operations |
| `cash.html` | Cash management |
| `catering.html` | Catering orders |
| `cogs.html` | Cost of goods sold tracking |
| `cost.html` | Cost analysis |
| `drivers.html` | Driver management |
| `dry-goods.html` | Dry goods inventory |
| `incidents.html` | Incident reporting |
| `managerlogs.html` | Manager log viewer |
| `orders-prep.html` | Orders and prep lists |
| `scheduling.html` | Staff scheduling |
| `teamupdates.html` | Team updates/announcements |
| `tip-pool.html` | Tip pool calculator |

## Teacher Feast Finals (2)

| File | Purpose |
|------|---------|
| `teachers-feast-contest.html` | Public final results page (static) |
| `teachers-feast-google-sites-embed.html` | Google Sites embeddable version |

## Toast Integration (1)

| File | Purpose |
|------|---------|
| `toast-bulk-export.html` | Bulk order export utility |

## Active JavaScript Files (3)

| File | Purpose |
|------|---------|
| `shared-header.js` | Shared navigation header component |
| `app-header.js` | Application header utilities |
| `foh-checklists-data.js` | FOH checklist data/configuration |

## Configuration Files (4)

| File | Purpose |
|------|---------|
| `package.json` | Node.js dependencies |
| `package-lock.json` | Locked dependency versions |
| `vercel.json` | Vercel deployment configuration |
| `prep-list-config.json` | Prep list configuration data |

## Active Data Files (1)

| File | Purpose |
|------|---------|
| `merged-inventory-data.json` | Current inventory data (used by scripts/import-inventory.js) |

## Image Assets (5)

| File | Purpose |
|------|---------|
| `jayna-logo.png` | Primary Jayna Gyro logo |
| `jayna-logo-new.png` | Updated logo version |
| `jayna-logo-loading.png` | Loading screen logo |
| `feed-educators-contest-logo.png` | Teacher Feast contest logo |
| `instagram-qr-code.jpg` | Instagram QR code (Teacher Feast) |

## Active Documentation (5)

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Primary AI assistant instructions |
| `CURRENT_STATUS.md` | Current work status and blockers |
| `CURRENT_PROJECT_DOCUMENTATION.md` | Complete project documentation |
| `PROJECT_MASTER_LOG.md` | Session history log (newest first) |
| `SESSION_END_CHECKLIST.md` | Session end protocol checklist |
| `README.md` | Repository readme |

---

## Archived Files

All archived files have been moved to the `/ARCHIVE` directory with the following structure:

- **ARCHIVE/2024-2025 Teacher Feast Contest/** - Completed contest files
- **ARCHIVE/Test Files (Do Not Use)/** - Old test files
- **ARCHIVE/Backup Files/** - HTML backups and broken files
- **ARCHIVE/SQL Migrations/** - One-time database migrations
- **ARCHIVE/Utility Scripts/** - Standalone utility scripts
- **ARCHIVE/Old Documentation/** - Outdated docs and plans
- **ARCHIVE/Old Data Files/** - Superseded data files

Each archive folder contains a README.md explaining what's archived and why.

---

**Total Active Files in Root:** 38 files
**All files are production-ready and actively used by the live application.**
