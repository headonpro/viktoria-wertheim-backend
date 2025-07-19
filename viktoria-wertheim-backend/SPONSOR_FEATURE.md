# 🏆 Sponsor Feature Documentation

## Übersicht

Das neue Sponsor-Feature bietet eine moderne, interaktive Darstellung der Vereinssponsoren mit kategorisierten Ansichten und responsivem Design.

## Features

### 🎨 **Design & UX**
- **Kategorisierte Darstellung**: Hauptsponsoren, Premium Partner, Partner
- **Responsive Design**: Optimiert für Mobile, Tablet und Desktop
- **Animationen**: Smooth Framer Motion Übergänge
- **Hover-Effekte**: Interaktive Sponsor-Cards mit Details
- **Mobile Karussell**: Touch-friendly Navigation auf kleinen Bildschirmen

### 🔧 **Technische Features**
- **Strapi CMS Integration**: Vollständige Verwaltung über Admin-Panel
- **Image Optimization**: Next.js optimierte Bilder
- **Fallback System**: Mock-Daten wenn API nicht verfügbar
- **Auto-Play Karussell**: Automatische Rotation auf Mobile
- **Click-to-Visit**: Direkte Links zu Sponsor-Websites

## Content-Type: Sponsor

### Felder
```json
{
  "name": "string (required, max: 100)",
  "logo": "media (required, images only)",
  "website_url": "string (optional, max: 255)",
  "beschreibung": "text (optional, max: 500)",
  "kategorie": "enum (hauptsponsor|premium|partner)",
  "reihenfolge": "integer (1-999)",
  "aktiv": "boolean (default: true)"
}
```

### Kategorien
- **Hauptsponsor**: Prominente Darstellung, größere Cards
- **Premium**: Mittlere Größe, Premium-Badge
- **Partner**: Standard-Größe, Grid-Layout

## Komponenten-Struktur

```
SponsorShowcase.tsx (Hauptkomponente)
├── SponsorCard.tsx (Einzelne Sponsor-Karte)
├── SponsorCarousel.tsx (Mobile Karussell)
└── Mock Data (Fallback-Daten)
```

## Installation & Setup

### 1. Backend Setup
```bash
cd viktoria-wertheim-backend
npm run develop
```

### 2. Seeding ausführen
```bash
cd viktoria-wertheim-backend
node scripts/run-seeds.js
```

### 3. Frontend starten
```bash
cd viktoria-wertheim-frontend
npm run dev
```

## Strapi Admin

### Sponsor erstellen
1. Gehe zu **Content Manager > Sponsor**
2. Klicke **Create new entry**
3. Fülle die Felder aus:
   - **Name**: Sponsor-Name
   - **Logo**: Lade das Logo hoch
   - **Website URL**: Optional, Link zur Website
   - **Beschreibung**: Kurze Beschreibung
   - **Kategorie**: hauptsponsor/premium/partner
   - **Reihenfolge**: Sortierung (1 = erste Position)
   - **Aktiv**: Ein/Ausschalten

### Logo-Empfehlungen
- **Format**: PNG oder JPG
- **Größe**: Mindestens 200x100px
- **Hintergrund**: Transparent (PNG) empfohlen
- **Qualität**: Hochauflösend für Retina-Displays

## API Endpoints

### GET /api/sponsors
```javascript
// Alle aktiven Sponsoren abrufen
const response = await fetch('/api/sponsors?populate=*&sort=reihenfolge:asc');
```

### Beispiel Response
```json
{
  "data": [
    {
      "id": 1,
      "attributes": {
        "name": "Sparkasse Tauberfranken",
        "website_url": "https://www.sparkasse-tauberfranken.de",
        "beschreibung": "Unser Hauptsponsor...",
        "kategorie": "hauptsponsor",
        "reihenfolge": 1,
        "aktiv": true,
        "logo": {
          "data": {
            "attributes": {
              "url": "/uploads/sparkasse_logo.png"
            }
          }
        }
      }
    }
  ]
}
```

## Customization

### Farben anpassen
In `SponsorCard.tsx`:
```typescript
// Hauptsponsor Farben
className="bg-gradient-to-br from-viktoria-yellow/20 to-viktoria-blue/20"

// Premium Badge
className="bg-viktoria-blue text-white"
```

### Animationen anpassen
In `SponsorShowcase.tsx`:
```typescript
// Delay zwischen Animationen
transition={{ duration: 0.6, delay: index * 0.1 }}
```

### Karussell-Timing
In `SponsorCarousel.tsx`:
```typescript
// Auto-play Intervall (4 Sekunden)
const interval = setInterval(() => {
  setCurrentIndex((prev) => (prev + 1) % sponsors.length)
}, 4000)
```

## Troubleshooting

### Logos werden nicht angezeigt
1. Prüfe STRAPI_URL in `.env.local`
2. Stelle sicher, dass Strapi läuft
3. Überprüfe Upload-Permissions in Strapi

### API-Fehler
1. Prüfe Strapi Backend Status
2. Überprüfe Content-Type Permissions
3. Fallback auf Mock-Daten wird automatisch aktiviert

### Performance
- Bilder werden automatisch von Next.js optimiert
- Lazy Loading für bessere Performance
- Responsive Images für verschiedene Bildschirmgrößen

## Zukünftige Erweiterungen

- **Sponsor-Detail-Modal**: Erweiterte Informationen
- **Sponsor-Statistiken**: Klick-Tracking
- **Saisonale Sponsoren**: Zeitbasierte Anzeige
- **Sponsor-Kategorien**: Weitere Unterteilungen
- **Social Media Integration**: Links zu Social Profiles