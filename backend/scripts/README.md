# Backend Scripts

This directory contains utility scripts for managing data in the Strapi backend.

## Available Scripts

### add-opposing-clubs.js
Adds all opposing clubs from the league table via HTTP API.

**Usage:**
```bash
# Make sure the backend is running first
cd backend
npm run develop

# In another terminal, run the script
node scripts/add-opposing-clubs.js
```

### add-clubs-strapi.js
Adds all opposing clubs using HTTP API (recommended).

**Usage:**
```bash
cd backend
node scripts/add-clubs-strapi.js
```

### create-league-table.js
Creates the league and table entries for all clubs (run after adding clubs).

**Usage:**
```bash
cd backend
node scripts/create-league-table.js
```

### create-mannschaften.js
Creates the three Mannschaften (teams) for SV Viktoria Wertheim with sample data including league positions, form, and statistics.

**Usage:**
```bash
# Make sure the backend is running first
cd backend
npm run develop

# In another terminal, run the script
node scripts/create-mannschaften.js
```

## Clubs Added

The scripts add the following clubs from the league table:

1. **SV Viktoria Wertheim** (our club)
2. VfR Gerlachsheim
3. TSV Jahn Kreuzwertheim
4. TSV Assamstadt
5. FV Brehmbachtal
6. FC Hundheim-Steinbach
7. VfL Großrinderfeld
8. Türk Gücü Wertheim
9. SV Pülfringen
10. VfB Reicholzheim
11. FC Rauenberg
12. SV Schönfeld
13. TSG Impfingen II
14. 1. FC Umpfertal
15. Kickers DHK Wertheim
16. TSV Schwabhausen 1946

## Notes

- The scripts check for existing clubs to avoid duplicates
- SV Viktoria Wertheim is marked as `ist_unser_verein: true`
- All other clubs are marked as opposing clubs (`ist_unser_verein: false`)
- Short names are provided for better display in tables and mobile views