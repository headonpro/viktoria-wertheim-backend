# Design Document

## Overview

Diese Lösung erweitert das bestehende Backend um drei einfache Datenstrukturen: Form-Daten für Teams, gegnerische Vereine, und Spielerstatistiken. Der Fokus liegt auf Einfachheit und Robustheit ohne komplexe Relations.

## Architecture

### Bestehende Struktur
- `team` Collection Type (wird erweitert)
- `liga` Collection Type (bleibt unverändert)
- Frontend Services (werden erweitert)

### Neue Strukturen
- Erweiterte `team` Collection mit Form-Daten und Team-Typ
- Neue `spieler-statistik` Collection (standalone, keine Relations)
- Erweiterte Frontend Services für neue Daten

## Components and Interfaces

### 1. Team Collection Erweiterung

```json
{
  "form_letzte_5": {
    "type": "string",
    "maxLength": 5,
    "description": "Form der letzten 5 Spiele (S/U/N)"
  },
  "team_typ": {
    "type": "enumeration",
    "enum": ["viktoria_mannschaft", "gegner_verein"],
    "default": "gegner_verein"
  },
  "liga_name": {
    "type": "string",
    "maxLength": 100,
    "description": "Liga-Name für einfache Zuordnung"
  }
}
```

### 2. Spieler-Statistik Collection (Standalone)

```json
{
  "kind": "collectionType",
  "collectionName": "spieler_statistiks",
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "maxLength": 100
    },
    "team_name": {
      "type": "string",
      "required": true,
      "maxLength": 50
    },
    "tore": {
      "type": "integer",
      "min": 0,
      "default": 0
    },
    "spiele": {
      "type": "integer", 
      "min": 0,
      "default": 0
    },
    "ist_viktoria_spieler": {
      "type": "boolean",
      "default": false
    }
  }
}
```

### 3. Frontend Service Erweiterungen

```typescript
// teamService.ts Erweiterung
interface TeamData {
  // ... bestehende Felder
  form_letzte_5?: string
  team_typ?: 'viktoria_mannschaft' | 'gegner_verein'
}

// Neuer topScorersService.ts
interface TopScorer {
  name: string
  team_name: string
  tore: number
  spiele: number
  ist_viktoria_spieler: boolean
}
```

## Data Models

### Team Model (Erweitert)
- Bestehende Felder bleiben unverändert
- `form_letzte_5`: String (max 5 Zeichen, S/U/N)
- `team_typ`: Enum für Unterscheidung Viktoria/Gegner
- `liga_name`: String für einfache Liga-Zuordnung

### Spieler-Statistik Model (Neu)
- `name`: Vollständiger Spielername
- `team_name`: Team-Name als String (keine Relation)
- `tore`: Anzahl Tore
- `spiele`: Anzahl Spiele
- `ist_viktoria_spieler`: Boolean für UI-Hervorhebung

## Error Handling

### Fallback-Strategien
1. **Form-Daten**: Zeige "-" wenn nicht vorhanden
2. **Liga-Tabelle**: Zeige nur Viktoria-Teams wenn keine Gegner
3. **TopScorers**: Verwende bestehende Fallback-Daten

### Validierung
- Minimale Validierung nur für kritische Felder
- Keine komplexen Relations die fehlschlagen können
- Robuste String-basierte Zuordnungen

## Testing Strategy

### Backend Tests
1. Collection Type Schema Validierung
2. CRUD Operations für neue Felder
3. API Endpoint Tests

### Frontend Tests
1. Service Integration Tests
2. Component Rendering mit neuen Daten
3. Fallback-Verhalten Tests

### Integration Tests
1. End-to-End Datenfluss
2. Fehlerbehandlung bei fehlenden Daten
3. Performance mit erweiterten Daten