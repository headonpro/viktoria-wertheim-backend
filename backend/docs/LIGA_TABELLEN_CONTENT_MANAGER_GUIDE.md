# Liga-Tabellen Content Manager Guide

## Übersicht

Dieses Handbuch erklärt Content-Managern, wie sie die Liga-Tabellen für alle drei Viktoria Wertheim Mannschaften über das Strapi Admin Panel verwalten.

## System-Architektur

### Neue Struktur (nach Migration)
- **Tabellen-Eintrag Collection**: Verwaltet alle Liga-Tabelleneinträge
- **Team Collection**: Verwaltet nur noch Viktoria-Mannschaften (ohne Tabellenstatistiken)
- **Liga Collection**: Definiert die verschiedenen Ligen

### Wichtige Änderung
Tabellenstatistiken werden **nicht mehr** über das Team Collection Type verwaltet, sondern über das dedizierte **Tabellen-Eintrag** Collection Type.

## Liga-Mannschaft Zuordnung

### Aktuelle Liga-Struktur
| Mannschaft | Liga | Viktoria Team Name |
|------------|------|-------------------|
| 1. Mannschaft | Kreisliga Tauberbischofsheim | SV Viktoria Wertheim |
| 2. Mannschaft | Kreisklasse A Tauberbischofsheim | SV Viktoria Wertheim II |
| 3. Mannschaft | Kreisklasse B Tauberbischofsheim | SpG Vikt. Wertheim 3/Grünenwort |

### Liga-IDs im System
- **Kreisliga Tauberbischofsheim**: Liga-ID 1
- **Kreisklasse A Tauberbischofsheim**: Liga-ID 2  
- **Kreisklasse B Tauberbischofsheim**: Liga-ID 3

## Tabellen-Eintrag Collection Type

### Zugriff
1. Strapi Admin Panel öffnen
2. Navigation: **Content Manager** → **Collection Types** → **Tabellen-Eintrag**

### Felder-Übersicht
| Feld | Typ | Beschreibung | Pflichtfeld |
|------|-----|--------------|-------------|
| **Liga** | Relation | Verknüpfung zur Liga | ✅ |
| **Team Name** | Text | Name des Vereins | ✅ |
| **Team Logo** | Media | Logo des Vereins | ❌ |
| **Platz** | Number | Position in der Tabelle | ✅ |
| **Spiele** | Number | Anzahl gespielter Spiele | ❌ (Standard: 0) |
| **Siege** | Number | Anzahl Siege | ❌ (Standard: 0) |
| **Unentschieden** | Number | Anzahl Unentschieden | ❌ (Standard: 0) |
| **Niederlagen** | Number | Anzahl Niederlagen | ❌ (Standard: 0) |
| **Tore für** | Number | Erzielte Tore | ❌ (Standard: 0) |
| **Tore gegen** | Number | Kassierte Tore | ❌ (Standard: 0) |
| **Tordifferenz** | Number | Differenz (für - gegen) | ❌ (Standard: 0) |
| **Punkte** | Number | Punkte in der Tabelle | ❌ (Standard: 0) |

### Neuen Tabellen-Eintrag erstellen
1. **Create new entry** klicken
2. **Liga** auswählen (Dropdown-Menü)
3. **Team Name** eingeben (z.B. "VfR Gerlachsheim")
4. **Platz** eingeben (Tabellenposition)
5. Optional: **Team Logo** hochladen
6. Statistikfelder ausfüllen (oder bei 0 lassen für Saisonstart)
7. **Save** klicken

### Tabellen-Eintrag bearbeiten
1. Gewünschten Eintrag in der Liste anklicken
2. Felder nach Bedarf anpassen
3. **Save** klicken

## Liga-spezifische Tabellenpflege

### Kreisliga Tauberbischofsheim (1. Mannschaft)
**16 Teams - Aktuelle Reihenfolge:**
1. SV Viktoria Wertheim ⭐ (Viktoria-Team)
2. VfR Gerlachsheim
3. TSV Jahn Kreuzwertheim
4. TSV Assamstadt
5. FV Brehmbachtal
6. FC Hundheim-Steinbach
7. TuS Großrinderfeld
8. Türk Gücü Wertheim
9. SV Pülfringen
10. VfB Reicholzheim
11. FC Rauenberg
12. SV Schönfeld
13. TSG Impfingen II
14. 1. FC Umpfertal
15. Kickers DHK Wertheim
16. TSV Schwabhausen

### Kreisklasse A Tauberbischofsheim (2. Mannschaft)
**14 Teams - Aktuelle Reihenfolge:**
1. TSV Unterschüpf
2. SV Nassig II
3. TSV Dittwar
4. FV Oberlauda e.V.
5. SV Viktoria Wertheim II ⭐ (Viktoria-Team)
6. FC Wertheim-Eichel
7. TSV Assamstadt II
8. FC Grünsfeld II
9. TSV Gerchsheim
10. SV Distelhausen II
11. TSV Wenkheim
12. SV Winzer Beckstein II
13. SV Oberbalbach
14. FSV Tauberhöhe II

### Kreisklasse B Tauberbischofsheim (3. Mannschaft)
**9 Teams - Alle auf Platz 1 (Saisonstart):**
1. FC Hundheim-Steinbach 2
1. FC Wertheim-Eichel 2
1. SG RaMBo 2
1. SV Eintracht Nassig 3
1. SpG Kickers DHK Wertheim 2/Urphar
1. SpG Vikt. Wertheim 3/Grünenwort ⭐ (Viktoria-Team)
1. TSV Kreuzwertheim 2
1. Turkgucu Wertheim 2
1. VfB Reicholzheim 2

## Häufige Aufgaben

### Spieltag-Update durchführen
1. **Tabellen-Eintrag** Collection öffnen
2. Nach Liga filtern (Filter-Button → Liga auswählen)
3. Betroffene Teams einzeln bearbeiten:
   - **Spiele** um 1 erhöhen
   - **Siege/Unentschieden/Niederlagen** entsprechend anpassen
   - **Tore für/gegen** aktualisieren
   - **Tordifferenz** wird automatisch berechnet
   - **Punkte** entsprechend anpassen (Sieg = 3, Unentschieden = 1)
4. **Platz** bei Tabellenänderungen anpassen

### Tabellenplätze neu sortieren
1. Alle Einträge einer Liga öffnen
2. **Platz**-Felder entsprechend der neuen Reihenfolge anpassen
3. Jeden Eintrag einzeln speichern

### Saisonstart vorbereiten
1. Alle Tabellen-Einträge einer Liga öffnen
2. Statistikfelder auf 0 setzen:
   - Spiele: 0
   - Siege: 0
   - Unentschieden: 0
   - Niederlagen: 0
   - Tore für: 0
   - Tore gegen: 0
   - Tordifferenz: 0
   - Punkte: 0
3. **Platz** entsprechend Vorsaison oder alphabetisch setzen

## Viktoria-Teams Hervorhebung

### Wichtige Team-Namen (exakt verwenden!)
- **Kreisliga**: `SV Viktoria Wertheim`
- **Kreisklasse A**: `SV Viktoria Wertheim II`
- **Kreisklasse B**: `SpG Vikt. Wertheim 3/Grünenwort`

⚠️ **Wichtig**: Diese Namen müssen exakt so geschrieben werden, damit die Frontend-Hervorhebung funktioniert!

### Team-Namen Variationen (werden erkannt)
Das Frontend erkennt auch diese Variationen:
- `Viktoria Wertheim` (für 1. Mannschaft)
- `Viktoria Wertheim II` (für 2. Mannschaft)
- `Viktoria Wertheim III` (für 3. Mannschaft)

## Bulk-Operationen

### Mehrere Einträge gleichzeitig bearbeiten
1. **Tabellen-Eintrag** Collection öffnen
2. Checkboxen der gewünschten Einträge aktivieren
3. **Bulk actions** Dropdown verwenden
4. **Delete** oder **Publish/Unpublish** auswählen

### Filter verwenden
1. **Filters** Button klicken
2. **Liga** Filter setzen
3. Gewünschte Liga auswählen
4. Nur Einträge dieser Liga werden angezeigt

## Fehlerbehebung

### Problem: Tabelle wird nicht angezeigt
**Lösung:**
1. Prüfen ob Liga-Zuordnung korrekt ist
2. Prüfen ob Tabellen-Einträge **published** sind
3. Prüfen ob mindestens ein Eintrag existiert

### Problem: Viktoria-Team wird nicht hervorgehoben
**Lösung:**
1. Team-Namen exakt prüfen (siehe oben)
2. Keine zusätzlichen Leerzeichen
3. Groß-/Kleinschreibung beachten

### Problem: Falsche Tabellenreihenfolge
**Lösung:**
1. **Platz**-Felder aller Teams prüfen
2. Doppelte Plätze vermeiden
3. Lücken in der Nummerierung vermeiden

### Problem: Statistiken stimmen nicht
**Lösung:**
1. **Tordifferenz** manuell berechnen: Tore für - Tore gegen
2. **Punkte** prüfen: Siege × 3 + Unentschieden × 1
3. **Spiele** prüfen: Siege + Unentschieden + Niederlagen

## Best Practices

### Datenpflege
- ✅ Regelmäßige Backups vor größeren Änderungen
- ✅ Änderungen immer sofort speichern
- ✅ Team-Namen konsistent verwenden
- ✅ Plätze lückenlos nummerieren (1, 2, 3, ...)

### Workflow-Empfehlung
1. **Vor Spieltag**: Tabelle prüfen und ggf. korrigieren
2. **Nach Spieltag**: Ergebnisse zeitnah eintragen
3. **Wöchentlich**: Vollständige Tabellen-Kontrolle
4. **Saisonende**: Archivierung vorbereiten

## Support

### Bei Problemen
1. **Strapi Logs** prüfen (Developer Tools)
2. **Browser Cache** leeren
3. **Andere Browser** testen
4. **Admin-Rechte** prüfen

### Kontakt
Bei technischen Problemen wenden Sie sich an das Entwicklungsteam mit:
- Beschreibung des Problems
- Screenshots der Fehlermeldung
- Betroffene Liga/Team
- Zeitpunkt des Auftretens

## Changelog

### Version 2.0 (Liga-Tabellen-System)
- ✅ Tabellen-Eintrag Collection Type implementiert
- ✅ Team Collection Type bereinigt (nur noch Viktoria-Teams)
- ✅ Automatische Liga-Zuordnung im Frontend
- ✅ Viktoria-Team Hervorhebung optimiert
- ✅ Performance-Optimierungen

### Migration von Version 1.0
- ❌ **Nicht mehr verwenden**: Team Collection für Tabellenstatistiken
- ✅ **Neu verwenden**: Tabellen-Eintrag Collection für alle Liga-Daten
- ✅ **Automatisch migriert**: Bestehende Tabellendaten