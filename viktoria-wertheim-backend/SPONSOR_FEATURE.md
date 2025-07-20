# 🤝 Sponsor Feature Setup Guide

## Problem
The sponsor API endpoint returns 404 because the sponsor content type doesn't have public permissions configured.

## Quick Fix

### 1. Set API Permissions
1. Open Strapi Admin: `http://192.168.178.59:1337/admin`
2. Navigate to: **Settings** → **Users & Permissions Plugin** → **Roles** → **Public**
3. Find **Sponsor** section and enable:
   - ✅ `find` (to read sponsors)
   - ✅ `findOne` (to read individual sponsors)
4. Click **Save**

### 2. Test the API
```bash
curl "http://192.168.178.59:1337/api/sponsors?populate=*"
```

Should return sponsor data instead of 404.

## Current Status
- ✅ Sponsor content type exists (`/src/api/sponsor/`)
- ✅ Frontend component handles fallback to mock data
- ❌ API permissions not configured (causing 404)

## Content Type Schema
The sponsor content type includes:
- `name` (string, required)
- `logo` (media, required)
- `website_url` (string, optional)
- `beschreibung` (text, optional)
- `kategorie` (enum: hauptsponsor, premium, partner)
- `reihenfolge` (integer, for sorting)
- `aktiv` (boolean, default true)

## Seeding Sponsors
Once permissions are set, you can seed sponsors:

```bash
cd viktoria-wertheim-backend
node scripts/seed-sponsors.js
```

## Frontend Behavior
The `SponsorShowcase` component:
- ✅ Tries to fetch from API first
- ✅ Falls back to mock data on error
- ✅ Shows loading state
- ✅ Handles empty states gracefully

## Mock Data Available
The component includes realistic mock sponsors:
- Red Bull (Hauptsponsor)
- Kalinsky, Szabo, Pink (Premium)
- Zippe, Zorbas (Partner)

---

**Next Steps**: Set the API permissions in Strapi admin panel to enable the sponsor API endpoint.