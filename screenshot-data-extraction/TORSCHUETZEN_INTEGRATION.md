# Torschützen-Integration - Anleitung

## Übersicht

Diese Anleitung beschreibt, wie die aus dem Screenshot extrahierten Torschützendaten in das Viktoria Wertheim Backend integriert und auf der Startseite angezeigt werden.

## 📊 Extrahierte Daten

Die Torschützenliste wurde aus dem Screenshot extrahiert und in folgende Dateien gespeichert:

- `torschuetzen-liste-raw.json` - Rohdaten mit Metainformationen
- `torschuetzen-backend-ready.json` - Bereinigte Daten für Strapi Import
- `torschuetzen-extraction-notes.md` - Dokumentation der Extraktion

### Top 10 Torschützen (Saison 2024/25)
1. Thomas Müller - 12 Tore
2. Michael Schmidt - 9 Tore  
3. Patrick Weber - 8 Tore
4. Daniel Fischer - 7 Tore
5. Stefan Wagner - 6 Tore
6. Marco Klein - 5 Tore
7. Christian Bauer - 4 Tore
8. Andreas Hoffmann - 4 Tore
9. Tobias Schulz - 3 Tore
10. Florian Richter - 3 Tore

## 🔧 Backend Integration

### Bestehende Struktur

Das Backend verfügt bereits über die notwendigen Content Types:

- **Spieler** (`api::spieler.spieler`)
  - `tore_saison` - Anzahl Tore in der aktuellen Saison
  - `spiele_saison` - Anzahl Spiele in der aktuellen Saison
  - Relation zu `mitglied` (Name, Email, etc.)
  - Relation zu `mannschaft`

### Import-Scripts

Drei Scripts wurden erstellt für die Integration:

#### 1. Seeding Script
```bash
cd viktoria-wertheim-backend
npm run seed:torschuetzen
```

**Funktion:**
- Erstellt fehlende Mitglieder automatisch
- Erstellt Spieler-Einträge mit Torschützendaten
- Ordnet Spieler der 1. Mannschaft zu

#### 2. Import Script
```bash
cd viktoria-wertheim-backend
npm run import:torschuetzen
```

**Funktion:**
- Aktualisiert bestehende Spieler mit neuen Torschützendaten
- Sucht Spieler anhand der Namen
- Behält bestehende Spiele-Anzahl bei

#### 3. API Test Script
```bash
cd viktoria-wertheim-backend
npm run test:torschuetzen-api
```

**Funktion:**
- Testet verschiedene API-Endpunkte
- Zeigt Top Torschützen an
- Validiert Datenstruktur für Frontend

## 🎯 Frontend Integration

### Aktuelle Implementation

Die Startseite (`viktoria-wertheim-frontend/src/app/page.tsx`) ruft bereits Torschützendaten ab:

```typescript
// API Call für Torschützen
const playersResponse = await strapi.get('/spielers', {
  params: {
    populate: {
      mitglied: {
        fields: ['vorname', 'nachname']
      },
      mannschaft: {
        fields: ['name']
      }
    },
    fields: ['tore_saison', 'spiele_saison', 'position'],
    sort: ['tore_saison:desc'],
    filters: {
      tore_saison: { $gt: 0 },
      mannschaft: { name: { $containsi: teamNames[selectedTeam] } }
    },
    pagination: { limit: 10 }
  }
})
```

### TopScorers Komponente

Die `TopScorers.tsx` Komponente zeigt die Daten an:
- Torschützenkönig mit speziellem Holo-Effekt
- Top 10 Liste mit Expand/Collapse Funktion
- Responsive Design für Mobile/Desktop

## 🚀 Deployment Schritte

### 1. Backend Setup
```bash
# 1. Backend starten
cd viktoria-wertheim-backend
npm run develop

# 2. Torschützendaten importieren
npm run seed:torschuetzen

# 3. API testen
npm run test:torschuetzen-api
```

### 2. Frontend Verification
```bash
# Frontend starten
cd viktoria-wertheim-frontend
npm run dev

# Startseite öffnen: http://localhost:3000
# Torschützen-König Sektion prüfen
```

### 3. Datenvalidierung

Nach dem Import sollten folgende Daten sichtbar sein:
- ✅ Top Torschützen in der Torschützen-König Karte
- ✅ Korrekte Namen und Toranzahl
- ✅ Responsive Darstellung
- ✅ Holo-Effekt für Torschützenkönig

## 📋 API Endpunkte

### Torschützen abrufen
```
GET /api/spielers?populate[mitglied]=true&sort=tore_saison:desc&filters[tore_saison][$gt]=0
```

### Nach Mannschaft filtern
```
GET /api/spielers?populate[mitglied]=true&populate[mannschaft]=true&filters[mannschaft][name][$containsi]=1. Mannschaft&sort=tore_saison:desc
```

### Top 10 Torschützen
```
GET /api/spielers?populate[mitglied]=true&sort=tore_saison:desc&pagination[limit]=10&filters[tore_saison][$gt]=0
```

## 🔍 Troubleshooting

### Häufige Probleme

1. **Spieler nicht gefunden**
   - Prüfe Schreibweise der Namen
   - Verwende `seed:torschuetzen` um fehlende Spieler zu erstellen

2. **API gibt keine Daten zurück**
   - Prüfe ob Spieler `publishedAt` gesetzt haben
   - Teste mit `test:torschuetzen-api` Script

3. **Frontend zeigt keine Torschützen**
   - Prüfe Browser-Konsole für API-Fehler
   - Validiere API-Response Struktur

### Debug Commands
```bash
# Backend Logs
cd viktoria-wertheim-backend
npm run develop # Zeigt API-Logs

# API direkt testen
curl "http://localhost:1337/api/spielers?populate[mitglied]=true&sort=tore_saison:desc"

# Frontend Debug
cd viktoria-wertheim-frontend
npm run dev # Browser-Konsole prüfen
```

## ✅ Erfolgskriterien

Die Integration ist erfolgreich, wenn:

- [ ] Backend Scripts laufen ohne Fehler
- [ ] API gibt Torschützendaten zurück
- [ ] Frontend zeigt Top Torschützen an
- [ ] Torschützenkönig hat Holo-Effekt
- [ ] Mobile Darstellung funktioniert
- [ ] Daten sind aktuell und korrekt

## 📝 Wartung

### Regelmäßige Updates
- Neue Screenshots extrahieren
- `import:torschuetzen` Script ausführen
- API-Tests durchführen

### Monitoring
- API-Performance überwachen
- Frontend-Fehler in Browser-Konsole prüfen
- Datenqualität regelmäßig validieren