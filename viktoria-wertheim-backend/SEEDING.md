# Seeding System Documentation

## Übersicht

Das Seeding-System erstellt automatisch Testdaten für die Viktoria Wertheim Website. Es umfasst vier Hauptbereiche:

1. **Kategorien** - News-Kategorien
2. **Sponsors** - Vereinssponsoren
3. **Mannschaften** - Die drei Hauptmannschaften mit Statistiken
4. **Spiele** - Vergangene und zukünftige Spiele für alle Mannschaften

## Verwendung

### Vollständiges Seeding

Führt alle Seeding-Schritte in der korrekten Reihenfolge aus:

```bash
cd viktoria-wertheim-backend
node scripts/run-seeds.js
```

### Spezifisches Seeding

Führt nur einen bestimmten Bereich aus:

```bash
# Nur Kategorien
node scripts/run-seeds.js kategorien

# Nur Sponsors
node scripts/run-seeds.js sponsors

# Nur Mannschaften
node scripts/run-seeds.js mannschaften
# oder
node scripts/run-seeds.js teams

# Nur Spiele
node scripts/run-seeds.js spiele
# oder
node scripts/run-seeds.js games
```

## Reihenfolge

Das System beachtet automatisch die korrekte Reihenfolge:

1. **Kategorien** - Unabhängig
2. **Sponsors** - Unabhängig
3. **Mannschaften** - Muss vor Spielen ausgeführt werden
4. **Spiele** - Benötigt existierende Mannschaften

## Erstellte Daten

### Mannschaften

- **SV Viktoria Wertheim I** (Kreisliga)
  - Tabellenplatz: 8
  - Punkte: 23
  - Spiele: 16 (7S, 2U, 7N)
  - Tore: 28:31 (-3)

- **SV Viktoria Wertheim II** (Kreisklasse A)
  - Tabellenplatz: 5
  - Punkte: 28
  - Spiele: 15 (9S, 1U, 5N)
  - Tore: 35:22 (+13)

- **SV Viktoria Wertheim III** (Kreisklasse B)
  - Tabellenplatz: 11
  - Punkte: 18
  - Spiele: 14 (5S, 3U, 6N)
  - Tore: 24:28 (-4)

### Spiele

Für jede Mannschaft werden erstellt:
- **5 vergangene Spiele** mit Ergebnissen, Torschützen und Karten
- **3 zukünftige Spiele** mit Informationen zum letzten Aufeinandertreffen

## Funktionen

### Validierung

Alle Daten werden vor dem Erstellen validiert:
- Konsistenz der Spielstatistiken
- Gültige Tabellenplätze (1-20)
- Realistische Punktzahlen
- Korrekte Tordifferenz

### Duplikatsprüfung

Das System prüft automatisch auf bereits vorhandene Daten und überspringt diese.

### Fehlerbehandlung

- Detaillierte Fehlermeldungen
- Graceful Degradation bei API-Fehlern
- Zusammenfassung am Ende

## Tests

### Unit Tests

```bash
# Mannschaften-Seeding Tests
npm test -- --testPathPattern=seed-mannschaften.unit.test.js

# Spiele-Seeding Tests
npm test -- --testPathPattern=seed-spiele.unit.test.js

# Integration Tests
npm test -- --testPathPattern=run-seeds.integration.test.js
```

### Alle Tests

```bash
npm test
```

## Entwicklung

### Neue Mannschaften hinzufügen

Bearbeiten Sie `scripts/seed-mannschaften.js` und erweitern Sie das `mannschaftenData` Array.

### Neue Spiele hinzufügen

Die Spiele werden automatisch basierend auf den Mannschaften generiert. Passen Sie die `createSpieleForMannschaft` Funktion in `scripts/seed-spiele.js` an.

### Neue Seeding-Bereiche

1. Erstellen Sie ein neues Script (z.B. `seed-xyz.js`)
2. Fügen Sie es zu `run-seeds.js` hinzu
3. Erweitern Sie die CLI-Optionen

## Troubleshooting

### Strapi nicht erreichbar

```
❌ Strapi ist nicht erreichbar. Stellen Sie sicher, dass Strapi läuft
```

**Lösung:** Starten Sie Strapi mit `npm run develop`

### Mannschaften nicht gefunden

```
❌ Keine Mannschaften gefunden. Führen Sie zuerst das Mannschaften-Seeding aus.
```

**Lösung:** Führen Sie zuerst `node scripts/run-seeds.js mannschaften` aus

### Validierungsfehler

```
❌ Validierungsfehler für "Mannschaftsname":
   - Siege + Unentschieden + Niederlagen muss gleich Spiele gesamt sein
```

**Lösung:** Überprüfen Sie die Daten in den Seeding-Scripts auf Konsistenz

## API-Endpunkte

Das System verwendet folgende Strapi-Endpunkte:

- `GET/POST /api/kategorien`
- `GET/POST /api/sponsors`
- `GET/POST /api/mannschaften`
- `GET/POST /api/spiele`

## Konfiguration

Die Strapi-URL ist in allen Scripts auf `http://localhost:1337` gesetzt. Für andere Umgebungen passen Sie die `STRAPI_URL` Konstante an.