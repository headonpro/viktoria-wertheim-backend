# Validation Error Solutions

## Problem: "Invalid status" Fehler

### Ursachen
1. **Ungültige Enum-Werte** in Status-Feldern
2. **Fehlende Default-Werte** bei der Erstellung
3. **Inkonsistente Datenbeziehungen** zwischen Content Types

### Sofortige Lösungen

#### 1. Team Status Fehler
**Erlaubte Werte:** `aktiv`, `inaktiv`, `pausiert`

```javascript
// Korrekte Werte setzen
data.status = 'aktiv';  // ✓ Korrekt
data.status = 'Choose here';  // ✗ Falsch
```

#### 2. Spiel Status Fehler
**Erlaubte Werte:** `geplant`, `laufend`, `beendet`, `abgesagt`

```javascript
// Korrekte Werte setzen
data.status = 'geplant';  // ✓ Korrekt
data.status = 'Choose here';  // ✗ Falsch
```

#### 3. Team-Club Konsistenz
- Bei **Heimspiel**: Team muss zum **Heimclub** gehören
- Bei **Auswärtsspiel**: Team muss zum **Auswärtsclub** gehören

#### 4. Liga-Saison Konsistenz
- Liga muss zur ausgewählten Saison gehören
- Team muss zur Liga UND Saison gehören

### Langfristige Lösungen (Implementiert)

#### 1. Verbesserte Lifecycle Hooks
- **Automatische Default-Werte** für Status-Felder
- **Bessere Fehlermeldungen** auf Deutsch
- **Fallback-Mechanismen** bei ungültigen Werten

#### 2. Enhanced Error Handler Middleware
- **Benutzerfreundliche Fehlermeldungen**
- **Detailliertes Logging** für Debugging
- **Spezifische Hilfestellungen** je Content Type

#### 3. Erweiterte Validation Services
- **Enum-Validierung** mit automatischer Korrektur
- **Konsistenz-Prüfungen** für Relationen
- **Mathematische Validierungen** (z.B. Tordifferenz)

#### 4. Migration Script
```bash
# Bestehende Daten reparieren
cd backend
node scripts/fix-invalid-status-values.js
```

### Debugging-Tipps

#### 1. Browser Developer Tools
```javascript
// Network Tab → POST Request → Response
// Zeigt genaue Fehlermeldung
```

#### 2. Strapi Logs
```bash
# Backend Terminal zeigt detaillierte Logs
# Suche nach "Validation Error" oder "Invalid status"
```

#### 3. Häufige Probleme

**Problem:** Team kann nicht gespeichert werden
**Lösung:** 
1. Status auf "aktiv" setzen
2. Club zuordnen
3. Liga und Saison konsistent wählen

**Problem:** Spiel kann nicht erstellt werden
**Lösung:**
1. Status auf "geplant" setzen
2. Alle Pflichtfelder ausfüllen
3. Team-Club Zuordnung prüfen

### Best Practices

#### 1. Datenreihenfolge beim Erstellen
1. **Saison** erstellen/auswählen
2. **Liga** zur Saison zuordnen
3. **Club** erstellen
4. **Team** mit Club, Liga, Saison erstellen
5. **Spiel** mit allen Relationen erstellen

#### 2. Status-Felder immer explizit setzen
```javascript
// Immer explizite Werte verwenden
team.status = 'aktiv';
spiel.status = 'geplant';

// Niemals "Choose here" oder undefined lassen
```

#### 3. Relationen vor Speichern prüfen
- Team gehört zu Club?
- Liga gehört zu Saison?
- Alle Pflichtfelder ausgefüllt?

### Monitoring

#### 1. Error Logs überwachen
```bash
# Suche nach wiederkehrenden Validation Errors
grep "Invalid status" logs/strapi.log
```

#### 2. Datenintegrität prüfen
```bash
# Migration Script regelmäßig laufen lassen
node scripts/fix-invalid-status-values.js
```

### Support

Bei anhaltenden Problemen:
1. **Logs sammeln** (Browser + Backend)
2. **Genaue Schritte** dokumentieren
3. **Datenbestand** prüfen (Migration Script)
4. **Lifecycle Hooks** überprüfen

---

**Letzte Aktualisierung:** $(date)
**Version:** 1.0