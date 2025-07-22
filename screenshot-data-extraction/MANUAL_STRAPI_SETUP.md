# Manuelle Strapi-Einrichtung für Torschützen

## Problem
Die API-Permissions verhindern automatische Updates. Daher müssen die Torschützen manuell im Strapi Admin erstellt werden.

## Lösung: Manuelle Erstellung im Admin-Panel

### 1. Strapi Admin öffnen
- Gehe zu: http://localhost:1337/admin
- Logge dich ein

### 2. Spieler-Schema prüfen
- Gehe zu: **Content-Type Builder** > **Spieler**
- Stelle sicher, dass folgende Felder existieren:
  - `vorname` (Text)
  - `nachname` (Text)
  - `tore_saison` (Number)
  - `spiele_saison` (Number)
  - `position` (Enumeration)

### 3. Torschützen erstellen
Gehe zu: **Content Manager** > **Spieler** > **Create new entry**

Erstelle folgende 10 Spieler:

#### 1. Thomas Müller (Torschützenkönig)
- **Vorname**: Thomas
- **Nachname**: Müller
- **Tore Saison**: 12
- **Spiele Saison**: 18
- **Position**: sturm
- **Status**: aktiv
- **Publish**: ✅

#### 2. Michael Schmidt
- **Vorname**: Michael
- **Nachname**: Schmidt
- **Tore Saison**: 9
- **Spiele Saison**: 18
- **Position**: sturm
- **Status**: aktiv
- **Publish**: ✅

#### 3. Patrick Weber
- **Vorname**: Patrick
- **Nachname**: Weber
- **Tore Saison**: 8
- **Spiele Saison**: 17
- **Position**: sturm
- **Status**: aktiv
- **Publish**: ✅

#### 4. Daniel Fischer
- **Vorname**: Daniel
- **Nachname**: Fischer
- **Tore Saison**: 7
- **Spiele Saison**: 18
- **Position**: sturm
- **Status**: aktiv
- **Publish**: ✅

#### 5. Stefan Wagner
- **Vorname**: Stefan
- **Nachname**: Wagner
- **Tore Saison**: 6
- **Spiele Saison**: 16
- **Position**: sturm
- **Status**: aktiv
- **Publish**: ✅

#### 6. Marco Klein
- **Vorname**: Marco
- **Nachname**: Klein
- **Tore Saison**: 5
- **Spiele Saison**: 18
- **Position**: sturm
- **Status**: aktiv
- **Publish**: ✅

#### 7. Christian Bauer
- **Vorname**: Christian
- **Nachname**: Bauer
- **Tore Saison**: 4
- **Spiele Saison**: 17
- **Position**: sturm
- **Status**: aktiv
- **Publish**: ✅

#### 8. Andreas Hoffmann
- **Vorname**: Andreas
- **Nachname**: Hoffmann
- **Tore Saison**: 4
- **Spiele Saison**: 18
- **Position**: sturm
- **Status**: aktiv
- **Publish**: ✅

#### 9. Tobias Schulz
- **Vorname**: Tobias
- **Nachname**: Schulz
- **Tore Saison**: 3
- **Spiele Saison**: 16
- **Position**: sturm
- **Status**: aktiv
- **Publish**: ✅

#### 10. Florian Richter
- **Vorname**: Florian
- **Nachname**: Richter
- **Tore Saison**: 3
- **Spiele Saison**: 18
- **Position**: sturm
- **Status**: aktiv
- **Publish**: ✅

### 4. API-Test nach Erstellung
Nach der Erstellung teste die API:

```bash
curl "http://localhost:1337/api/spielers?sort=tore_saison:desc&pagination[limit]=5&filters[tore_saison][\$gt]=0"
```

### 5. Frontend-Integration
Das Frontend auf der Startseite sollte dann automatisch die echten API-Daten anzeigen:

```typescript
// In viktoria-wertheim-frontend/src/app/page.tsx
const playersResponse = await strapi.get('/spielers', {
  params: {
    fields: ['vorname', 'nachname', 'tore_saison', 'spiele_saison', 'position'],
    sort: ['tore_saison:desc'],
    filters: {
      tore_saison: { $gt: 0 }
    },
    pagination: { limit: 10 }
  }
})
```

### 6. Erfolgskriterien
- ✅ 10 Spieler mit Namen und Torschützendaten erstellt
- ✅ API gibt Spieler mit `vorname`, `nachname` und `tore_saison` zurück
- ✅ Frontend zeigt echte Daten statt Mock-Daten an
- ✅ Torschützenkönig (Thomas Müller) wird korrekt angezeigt

## Alternative: API-Permissions konfigurieren

Falls du die API-Permissions konfigurieren möchtest:

1. Gehe zu: **Settings** > **Users & Permissions Plugin** > **Roles** > **Public**
2. Aktiviere für **Spieler**:
   - `find` ✅
   - `findOne` ✅
   - `create` ✅ (für Scripts)
   - `update` ✅ (für Scripts)
3. Speichern

Dann können die Scripts ausgeführt werden:
```bash
npm run update:spieler-names
```