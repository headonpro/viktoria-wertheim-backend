# Game Cards Mannschaften-Analyse

## Zusammenfassung

**Status:** ❌ **PROBLEM BESTÄTIGT** - Die Game Cards unterstützen aktuell KEINE mannschaftsspezifischen Daten für die 2. und 3. Mannschaft.

## Aktuelle Implementierung

### Frontend (GameCards.tsx)
- Die `GameCards` Komponente erhält einen `selectedTeam` Parameter ('1', '2', '3')
- Der `teamService.fetchLastAndNextGame()` wird mit der `teamId` aufgerufen
- **ABER:** Die API-Abfrage ignoriert die `teamId` komplett

### Backend API-Struktur

#### Last Game Cards (`/api/game-cards`)
```json
{
  "datum": "datetime",
  "gegner": "string", 
  "ist_heimspiel": "boolean",
  "unsere_tore": "integer",
  "gegner_tore": "integer"
}
```

#### Next Game Cards (`/api/next-game-cards`)
```json
{
  "datum": "datetime",
  "gegner_team": "relation zu Team",
  "ist_heimspiel": "boolean"
}
```

### Aktueller API-Aufruf im teamService
```typescript
// Ignoriert teamId komplett!
const [lastResponse, nextResponse] = await Promise.all([
  axios.get(`${API_BASE_URL}/api/game-cards`),
  axios.get(`${API_BASE_URL}/api/next-game-cards?populate=gegner_team`)
])
```

## Identifizierte Probleme

### 1. Fehlende Mannschafts-Zuordnung in Schemas
- **Game Cards**: Kein Feld für Mannschafts-ID oder -typ
- **Next Game Cards**: Kein Feld für Mannschafts-ID oder -typ
- Beide Content Types haben keine Relation zu spezifischen Viktoria-Mannschaften

### 2. API-Endpunkte sind nicht mannschaftsspezifisch
- `/api/game-cards` gibt ALLE Last Games zurück (aktuell nur 1 Eintrag)
- `/api/next-game-cards` gibt ALLE Next Games zurück (aktuell nur 1 Eintrag)
- Keine Filter-Parameter für Mannschaften

### 3. Frontend-Logic funktioniert nur für 1. Mannschaft
- Alle drei Team-Buttons (1, 2, 3) zeigen dieselben Spieldaten
- `selectedTeam` Parameter wird nicht an die API weitergegeben

## Aktuelle Daten im System

### Last Game Cards
```json
{
  "id": 1,
  "datum": "2025-06-01T15:00:00.000Z",
  "ist_heimspiel": true,
  "gegner": "TBA",
  "unsere_tore": 0,
  "gegner_tore": 0
}
```

### Next Game Cards  
```json
{
  "id": 1,
  "datum": "2025-08-15T22:00:00.000Z",
  "ist_heimspiel": false,
  "gegner_team": null
}
```

## Lösungsansätze

### Option 1: Schema-Erweiterung (Empfohlen)
**Backend-Änderungen:**
1. Erweitere `game-card` Schema um `mannschaft` Feld:
   ```json
   "mannschaft": {
     "type": "enumeration",
     "enum": ["1", "2", "3"],
     "required": true,
     "default": "1"
   }
   ```

2. Erweitere `next-game-card` Schema um `mannschaft` Feld:
   ```json
   "mannschaft": {
     "type": "enumeration", 
     "enum": ["1", "2", "3"],
     "required": true,
     "default": "1"
   }
   ```

**Frontend-Änderungen:**
3. Erweitere API-Aufrufe um Filter:
   ```typescript
   const [lastResponse, nextResponse] = await Promise.all([
     axios.get(`${API_BASE_URL}/api/game-cards?filters[mannschaft][$eq]=${teamId}`),
     axios.get(`${API_BASE_URL}/api/next-game-cards?filters[mannschaft][$eq]=${teamId}&populate=gegner_team`)
   ])
   ```

### Option 2: Separate Content Types
- `game-card-team-1`, `game-card-team-2`, `game-card-team-3`
- `next-game-card-team-1`, `next-game-card-team-2`, `next-game-card-team-3`
- **Nachteil:** Mehr Komplexität, schwerer zu verwalten

### Option 3: Relation zu Team Content Type
- Füge Relation zu `api::team.team` hinzu
- Filter über Team-Namen ("1. Mannschaft", "2. Mannschaft", "3. Mannschaft")

## Empfohlene Umsetzung

### Schritt 1: Backend Schema Update
```bash
# Erweitere beide Schemas um mannschaft Feld
# Migriere bestehende Daten (setze mannschaft = "1")
```

### Schritt 2: Testdaten erstellen
```bash
# Erstelle Game Cards für 2. und 3. Mannschaft
# Teste API-Filter funktionalität
```

### Schritt 3: Frontend Update
```typescript
// Erweitere teamService.fetchLastAndNextGame()
// Teste alle drei Mannschafts-Buttons
```

## Zeitaufwand Schätzung
- **Backend Schema + Migration:** 2-3 Stunden
- **Testdaten erstellen:** 1 Stunde  
- **Frontend Integration:** 1-2 Stunden
- **Testing:** 1 Stunde
- **Gesamt:** 5-7 Stunden

## Fazit

Die Game Cards sind aktuell nur für die 1. Mannschaft implementiert. Für eine vollständige Lösung müssen sowohl Backend-Schemas als auch Frontend-Logic erweitert werden, um mannschaftsspezifische Spieldaten zu unterstützen.