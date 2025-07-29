# Requirements Document

## Introduction

Die Tabellen-Automatisierung für das Viktoria Wertheim Backend soll die manuelle Pflege der Ligatabellen eliminieren. Aktuell müssen Moderatoren nach jedem Spiel sowohl das Spielergebnis in der `spiel` Collection als auch die entsprechenden Tabellenstände in der `tabellen-eintrag` Collection manuell aktualisieren. Dies ist fehleranfällig, zeitaufwändig und führt zu Inkonsistenzen.

Das System soll automatisch aus den eingetragenen Spielergebnissen die kompletten Ligatabellen berechnen und aktualisieren, sodass Moderatoren nur noch Spielergebnisse eintragen müssen.

## Requirements

### Requirement 1

**User Story:** Als Moderator möchte ich nur Spielergebnisse eintragen müssen, damit die Ligatabelle automatisch aktualisiert wird und ich Zeit spare.

#### Acceptance Criteria

1. WHEN ein Moderator ein Spielergebnis in der `spiel` Collection einträgt THEN soll das System automatisch die entsprechenden `tabellen-eintrag` Datensätze aktualisieren
2. WHEN ein Spiel von Status "geplant" auf "beendet" gesetzt wird UND beide Tore-Felder ausgefüllt sind THEN soll die Tabellenberechnung automatisch getriggert werden
3. WHEN ein bereits beendetes Spiel nachträglich korrigiert wird THEN soll die Tabelle automatisch neu berechnet werden
4. WHEN die automatische Berechnung fehlschlägt THEN soll eine Fehlermeldung im Admin-Panel angezeigt werden
5. WHEN ein Spiel gelöscht wird THEN soll die Tabelle automatisch ohne dieses Spiel neu berechnet werden

### Requirement 2

**User Story:** Als System möchte ich korrekte Fußball-Tabellenberechnungen durchführen, damit die angezeigten Tabellenstände den offiziellen Regeln entsprechen.

#### Acceptance Criteria

1. WHEN ein Team ein Spiel gewinnt THEN soll es 3 Punkte erhalten
2. WHEN ein Spiel unentschieden endet THEN sollen beide Teams 1 Punkt erhalten  
3. WHEN ein Team ein Spiel verliert THEN soll es 0 Punkte erhalten
4. WHEN die Tabelle sortiert wird THEN soll zuerst nach Punkten, dann nach Tordifferenz, dann nach erzielten Toren sortiert werden
5. WHEN zwei Teams punktgleich sind UND die gleiche Tordifferenz haben THEN soll das Team mit mehr erzielten Toren höher stehen
6. WHEN alle Kriterien gleich sind THEN soll alphabetisch nach Teamnamen sortiert werden

### Requirement 3

**User Story:** Als Administrator möchte ich die Tabellenberechnung manuell auslösen können, damit ich bei Problemen oder Datenmigrationen die Kontrolle behalte.

#### Acceptance Criteria

1. WHEN ein Administrator im Liga-Admin-Panel ist THEN soll ein "Tabelle neu berechnen" Button verfügbar sein
2. WHEN der Button geklickt wird THEN soll die komplette Tabelle für diese Liga neu berechnet werden
3. WHEN die Neuberechnung läuft THEN soll ein Loading-Indikator angezeigt werden
4. WHEN die Neuberechnung abgeschlossen ist THEN soll eine Erfolgsmeldung angezeigt werden
5. WHEN die Neuberechnung fehlschlägt THEN soll eine detaillierte Fehlermeldung angezeigt werden

### Requirement 4

**User Story:** Als System möchte ich Datenintegrität gewährleisten, damit keine inkonsistenten oder fehlerhaften Tabellenstände entstehen.

#### Acceptance Criteria

1. WHEN ein Spiel beendet wird THEN sollen beide Tore-Felder Pflichtfelder sein
2. WHEN ein Team gegen sich selbst spielen würde THEN soll eine Validierungsfehlermeldung erscheinen
3. WHEN ein Spielergebnis negative Werte enthält THEN soll eine Validierungsfehlermeldung erscheinen
4. WHEN ein Tabelleneintrag fehlt THEN soll er automatisch mit Standardwerten erstellt werden
5. WHEN eine Tabellenberechnung startet THEN soll sie in einer Datenbank-Transaktion ablaufen

### Requirement 5

**User Story:** Als Frontend-Entwickler möchte ich, dass die bestehenden API-Endpunkte weiterhin funktionieren, damit keine Frontend-Änderungen nötig sind.

#### Acceptance Criteria

1. WHEN das Frontend Tabellendaten über `/api/tabellen-eintraege` abruft THEN sollen die automatisch berechneten Daten zurückgegeben werden
2. WHEN das Frontend Spieldaten über `/api/spiele` abruft THEN sollen die eingetragenen Spielergebnisse zurückgegeben werden  
3. WHEN die Automatisierung aktiviert ist THEN sollen alle bestehenden API-Responses das gleiche Format haben
4. WHEN ein API-Aufruf während einer Tabellenberechnung erfolgt THEN soll er nicht blockiert werden
5. WHEN die Automatisierung deaktiviert wird THEN soll das System auf manuelle Pflege zurückfallen

### Requirement 6

**User Story:** Als Administrator möchte ich die Automatisierung überwachen können, damit ich bei Problemen schnell reagieren kann.

#### Acceptance Criteria

1. WHEN eine automatische Tabellenberechnung durchgeführt wird THEN soll ein Log-Eintrag erstellt werden
2. WHEN eine Berechnung fehlschlägt THEN soll der Fehler mit Details geloggt werden
3. WHEN mehrere Berechnungen gleichzeitig laufen THEN sollen sie in einer Queue abgearbeitet werden
4. WHEN eine Berechnung länger als 30 Sekunden dauert THEN soll eine Warnung geloggt werden
5. WHEN das System überlastet ist THEN soll die Automatisierung temporär pausiert werden

### Requirement 7

**User Story:** Als Moderator möchte ich bei Fehlern eine Rollback-Funktion haben, damit ich fehlerhafte Berechnungen rückgängig machen kann.

#### Acceptance Criteria

1. WHEN eine Tabellenberechnung startet THEN soll ein Snapshot der aktuellen Tabelle erstellt werden
2. WHEN ein Administrator einen Rollback auslöst THEN soll die Tabelle auf den letzten Snapshot zurückgesetzt werden
3. WHEN ein Rollback durchgeführt wird THEN soll eine Bestätigungsmeldung angezeigt werden
4. WHEN mehrere Snapshots vorhanden sind THEN soll der Administrator den gewünschten auswählen können
5. WHEN ein Rollback fehlschlägt THEN soll die ursprüngliche Tabelle unverändert bleiben

### Requirement 8

**User Story:** Als System möchte ich performant arbeiten, damit auch bei vielen Spielen die Berechnung schnell erfolgt.

#### Acceptance Criteria

1. WHEN eine Liga weniger als 50 Spiele hat THEN soll die Berechnung unter 5 Sekunden dauern
2. WHEN eine Liga mehr als 100 Spiele hat THEN soll die Berechnung unter 15 Sekunden dauern
3. WHEN mehrere Ligen gleichzeitig berechnet werden THEN sollen sie parallel verarbeitet werden
4. WHEN das System unter Last steht THEN soll die Berechnung in einer Background-Queue laufen
5. WHEN eine Berechnung zu lange dauert THEN soll sie automatisch abgebrochen und neu gestartet werden