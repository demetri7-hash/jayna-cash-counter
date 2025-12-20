# 2024-2025 Teacher Feast Contest Archive

This folder contains all files related to the first annual Jayna Gyro's Great Teacher's Feast contest.

## Contest Summary

**Duration:** November 23, 2024 - December 15, 2024

**Winner:** Washington Elementary School (1,506 votes)

**Total Participation:** 2,832 votes across 5 schools

**Prize:** Catered feast delivered by Demetri from Jayna Gyro Catering on January 9th, 2025

## Final Standings

1. **Washington Elementary School** - 1,506 votes 🏆
2. **Taylor Street Elementary** - 1,163 votes
3. **Delta Elementary Charter School** - 91 votes
4. **Ps7oakpark Elementary School** - 42 votes
5. **Language Academy Of Sacramento** - 30 votes

## Archived Files

### HTML Pages
- `teachers-feast-contest.html` - Original dynamic voting page (called database APIs)
- `teachers-feast-contest-google-sites.html` - Google Sites embed version

### API Endpoints (Vercel Serverless Functions)
- `api/teacher-feast-schools.js` - Get list of participating schools
- `api/teacher-feast-leaderboard.js` - Get top 5 schools with vote counts
- `api/teacher-feast-vote.js` - Submit votes (form + Instagram sync)

### Database Files
- `teachers-feast-db-schema.sql` - Supabase table schema
- `teacher-feast-rls-fix.sql` - Row Level Security policy fixes

### Marketing Materials
- `teacher-feast-poster.pdf` - Printable contest poster
- `teacher-feast-poster-preview.png` - Poster preview image

### Documentation
- `TEACHERS_FEAST_QUICKSTART.md` - Quick setup guide
- `TEACHERS_FEAST_SETUP.md` - Detailed setup instructions

## Database Schema

**Table:** `teacher_feast_schools`

```sql
- id (uuid, primary key)
- school_name (text, unique)
- total_votes (integer)
- instagram_votes (integer)
- form_votes (integer)
- instagram_handles (text[])
- created_at (timestamp)
- updated_at (timestamp)
```

## Technologies Used

- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Backend:** Vercel Serverless Functions (Node.js)
- **Database:** Supabase (PostgreSQL)
- **Hosting:** Vercel
- **Integrations:** Instagram mentions tracking (manual sync)

## Notes for Future Years

- Contest ran for 23 days (Nov 23 - Dec 15)
- Dual voting methods: Web form + Instagram mentions
- Instagram sync required manual triggering due to API limitations
- RLS policies needed fixes to allow public voting
- Consider automated Instagram API integration for next year
- Public leaderboard was very popular - keep real-time updates

## Current Public Page

The live contest page has been replaced with a static final results page:
`/teachers-feast-contest.html` (no database calls, purely static)

This saves Supabase resources and preserves the final results permanently.

---

**Archive Date:** December 20, 2024
**Next Contest:** Stay tuned for 2025-2026 school year!
