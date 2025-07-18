# 🏆 Leaderboard Seeding Guide

## Übersicht
Dieses Script erstellt automatisch alle 16 Teams der Kreisliga Tauberbischofsheim in der Strapi-Datenbank.

## Voraussetzungen
1. **Strapi Backend läuft** auf `http://localhost:1337`
2. **Leaderboard-Entry Content-Type** ist erstellt (bereits vorhanden)
3. **API-Permissions** sind konfiguriert (Public Read/Write für Development)

## Verwendung

### 🚀 Teams erstellen (Standard)
```bash
cd viktoria-wertheim-backend
npm run seed:leaderboard
```

### 🧹 Alte Teams löschen + neue erstellen
```bash
cd viktoria-wertheim-backend
npm run seed:leaderboard:clear
```

### 📖 Hilfe anzeigen
```bash
node scripts/seed-leaderboard.js --help
```

## Was wird erstellt?

Das Script erstellt **16 Teams** mit folgenden Daten:

| Position | Team | Spiele | Punkte | Status |
|----------|------|--------|--------|--------|
| 1 | FC Umpfertal | 0 | 0 | Saisonstart |
| 2 | FC Hundheim-Steinbach | 0 | 0 | Saisonstart |
| 3 | FV Brehmbachtal | 0 | 0 | Saisonstart |
| 4 | Kickers DHK Wertheim | 0 | 0 | Saisonstart |
| 5 | SG RaMBo | 0 | 0 | Saisonstart |
| 6 | SV Pülfringen | 0 | 0 | Saisonstart |
| 7 | SV Schönfeld | 0 | 0 | Saisonstart |
| **8** | **SV Viktoria Wertheim** | **0** | **0** | **Unser Verein** |
| 9 | SpG Impfingen/Tauberbischofsheim 2 | 0 | 0 | Saisonstart |
| 10 | SpG Schwabhausen/Windischbuch | 0 | 0 | Saisonstart |
| 11 | TSV Assamstadt | 0 | 0 | Saisonstart |
| 12 | TSV Kreuzwertheim | 0 | 0 | Saisonstart |
| 13 | TuS Großrinderfeld | 0 | 0 | Saisonstart |
| 14 | Türkgücü Wertheim | 0 | 0 | Saisonstart |
| 15 | VfB Reicholzheim | 0 | 0 | Saisonstart |
| 16 | VfR Gerlachsheim | 0 | 0 | Saisonstart |

**Alle Werte auf 0** = Saisonstart (noch keine Spiele gespielt)

## Fehlerbehebung

### ❌ "Connection refused" Fehler
```bash
# Strapi Backend starten
npm run develop
```

### ❌ "Permission denied" Fehler
1. Strapi Admin öffnen: `http://localhost:1337/admin`
2. Settings → Users & Permissions Plugin → Roles → Public
3. Leaderboard-entry: `find` und `create` aktivieren
4. Save

### ❌ "Duplicate entry" Fehler
```bash
# Alte Einträge löschen und neu erstellen
npm run seed:leaderboard:clear
```

## Nach dem Seeding

1. **Frontend testen**: `http://localhost:3000` - Tabelle sollte echte Daten anzeigen
2. **Strapi Admin prüfen**: `http://localhost:1337/admin` → Content Manager → Leaderboard entries
3. **API testen**: `http://localhost:1337/api/leaderboard-entries`

## Daten aktualisieren

Später in der Saison können die Werte über das Strapi Admin Panel aktualisiert werden:
- Spiele, Siege, Unentschieden, Niederlagen
- Tore, Gegentore (Tordifferenz wird automatisch berechnet)
- Punkte
- Position (für Tabellenplatz-Änderungen)

## Environment Variables (Optional)

```bash
# .env Datei
STRAPI_URL=http://localhost:1337
STRAPI_API_TOKEN=your_production_token_here  # Nur für Production
```

---

**🎯 Ziel erreicht**: Echte Tabellendaten statt Mock-Daten! 🏆