# Backend Scripts

This directory contains utility scripts for managing the Viktoria Wertheim backend.

## Liga Management Scripts

### seed-ligas.js
Creates Liga entries with proper kurz_name values for display.

**Usage:**
```bash
cd backend
npm run strapi console
```

Then in the Strapi console:
```javascript
.load scripts/seed-ligas.js
```

**What it does:**
- Creates a default Saison (2024/2025) if none exists
- Creates Liga entries for:
  - Kreisliga Tauberbischofsheim (kurz_name: "Kreisliga")
  - Kreisklasse A Tauberbischofsheim (kurz_name: "Kreisklasse A")
  - Kreisklasse B Tauberbischofsheim (kurz_name: "Kreisklasse B")
- Updates existing Liga entries with kurz_name if missing

### update-liga-kurz-names.js
Updates existing Liga entries with kurz_name values.

**Usage:**
```bash
cd backend
npm run strapi console
```

Then in the Strapi console:
```javascript
.load scripts/update-liga-kurz-names.js
```

**What it does:**
- Finds all existing Liga entries
- Updates them with appropriate kurz_name values based on their full names
- Provides feedback on what was updated

## Running Scripts

1. Make sure the backend is running: `npm run develop`
2. Open a new terminal and navigate to the backend directory
3. Start the Strapi console: `npm run strapi console`
4. Load and run the script: `.load scripts/script-name.js`

## Liga Name Mappings

The scripts use these mappings for kurz_name values:

| Full Name | kurz_name |
|-----------|-----------|
| Kreisliga Tauberbischofsheim | Kreisliga |
| Kreisklasse A Tauberbischofsheim | Kreisklasse A |
| Kreisklasse B Tauberbischofsheim | Kreisklasse B |
| Bezirksliga Tauberbischofsheim | Bezirksliga |
| Landesliga Tauberbischofsheim | Landesliga |

These short names are used in the frontend TeamStatus component for better mobile display.