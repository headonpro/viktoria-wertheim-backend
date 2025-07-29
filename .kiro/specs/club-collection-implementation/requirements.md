# Requirements Document

## Introduction

Die Club Collection Type Implementierung soll das Kernproblem der Tabellen-Automatisierung lösen: Die aktuelle `Team` Collection enthält nur interne Viktoria-Mannschaften ("1. Mannschaft", "2. Mannschaft", "3. Mannschaft"), aber für die Liga-Tabellen werden echte Vereinsnamen benötigt. 

Durch die Einführung einer separaten `Club` Collection können Spiele zwischen echten Vereinen erfasst und automatisch korrekte Ligatabellen generiert werden, während die bestehende Team-Funktionalität für interne Viktoria-Verwaltung erhalten bleibt.

## Requirements

### Requirement 1

**User Story:** Als Moderator möchte ich Spiele zwischen echten Vereinen eintragen können, damit die Tabellen-Automatisierung mit korrekten Vereinsnamen funktioniert.

#### Acceptance Criteria

1. WHEN ein Moderator ein Spiel im Admin Panel einträgt THEN soll er aus einer Liste echter Vereinsnamen (z.B. "SV Viktoria Wertheim", "VfR Gerlachsheim") wählen können
2. WHEN ein Spiel zwischen zwei Clubs eingetragen wird THEN sollen beide Clubs aus der gleichen Liga stammen
3. WHEN ein Club gegen sich selbst spielen würde THEN soll eine Validierungsfehlermeldung erscheinen
4. WHEN ein Spiel mit Club-Daten gespeichert wird THEN soll die Tabellen-Automatisierung korrekt triggern
5. WHEN bestehende Team-basierte Spiele vorhanden sind THEN sollen diese weiterhin funktionieren (Rückwärtskompatibilität)

### Requirement 2

**User Story:** Als System möchte ich eine saubere Trennung zwischen internen Teams und Liga-Clubs haben, damit beide Konzepte parallel existieren können.

#### Acceptance Criteria

1. WHEN die Club Collection erstellt wird THEN soll sie separate Felder für Vereinsname, Kurzname, Logo und Typ haben
2. WHEN ein Club vom Typ "viktoria_verein" ist THEN soll er eine Zuordnung zu einer internen Mannschaft (team_1, team_2, team_3) haben
3. WHEN ein Club vom Typ "gegner_verein" ist THEN soll er keine interne Team-Zuordnung benötigen
4. WHEN die Team Collection abgerufen wird THEN soll sie weiterhin die internen Mannschaften ("1. Mannschaft", etc.) enthalten
5. WHEN Frontend-Komponenten Team-Daten benötigen THEN sollen sie weiterhin über die Team Collection funktionieren

### Requirement 3

**User Story:** Als Entwickler möchte ich die Spiel Collection erweitern können, damit sie sowohl Team- als auch Club-Relationen unterstützt.

#### Acceptance Criteria

1. WHEN die Spiel Collection erweitert wird THEN sollen neue Felder `heim_club` und `gast_club` hinzugefügt werden
2. WHEN bestehende `heim_team` und `gast_team` Felder vorhanden sind THEN sollen sie als deprecated markiert aber funktional bleiben
3. WHEN ein neues Spiel erstellt wird THEN soll es Club-Relationen verwenden
4. WHEN ein altes Spiel bearbeitet wird THEN soll es optional auf Club-Relationen migriert werden können
5. WHEN die Lifecycle Hooks ausgeführt werden THEN sollen sie sowohl Team- als auch Club-basierte Spiele verarbeiten können

### Requirement 4

**User Story:** Als System möchte ich Tabellen-Einträge mit Club-Relationen erstellen können, damit echte Vereinsnamen in den Tabellen erscheinen.

#### Acceptance Criteria

1. WHEN die Tabellen-Eintrag Collection erweitert wird THEN soll ein neues `club` Feld hinzugefügt werden
2. WHEN ein Tabellen-Eintrag erstellt wird THEN soll `team_name` den echten Vereinsnamen aus der Club-Relation enthalten
3. WHEN bestehende Tabellen-Einträge vorhanden sind THEN sollen sie weiterhin funktionieren
4. WHEN die Tabellen-Berechnung läuft THEN soll sie Club-basierte Spiele verarbeiten und Club-Relationen in Einträgen erstellen
5. WHEN ein Club-Logo vorhanden ist THEN soll es in der Tabelle angezeigt werden

### Requirement 5

**User Story:** Als Tabellen-Berechnungs-Service möchte ich mit Club-Daten arbeiten können, damit korrekte Vereinsstatistiken berechnet werden.

#### Acceptance Criteria

1. WHEN Spiele für eine Liga abgerufen werden THEN sollen Club-Relationen populiert werden
2. WHEN Team-Statistiken berechnet werden THEN sollen sie auf Club-IDs basieren statt Team-IDs
3. WHEN unique Teams/Clubs gesammelt werden THEN sollen sowohl Team- als auch Club-basierte Spiele berücksichtigt werden
4. WHEN Tabellen-Einträge erstellt werden THEN sollen sie Club-Relationen und echte Vereinsnamen enthalten
5. WHEN die Berechnung fehlschlägt THEN soll ein Fallback auf das bestehende Team-System erfolgen

### Requirement 6

**User Story:** Als Frontend möchte ich weiterhin Team-basierte Navigation haben, aber Club-basierte Tabellendaten anzeigen.

#### Acceptance Criteria

1. WHEN ein Benutzer eine Mannschaft auswählt (1, 2, 3) THEN soll das entsprechende Liga und Club-Mapping verwendet werden
2. WHEN Tabellendaten abgerufen werden THEN sollen Club-Relationen populiert werden
3. WHEN Viktoria-Teams hervorgehoben werden THEN soll die Erkennung über Club-Namen erfolgen
4. WHEN Team-Logos angezeigt werden THEN sollen sie aus der Club-Relation stammen
5. WHEN die API-Aufrufe fehlschlagen THEN soll ein Fallback auf das bestehende System erfolgen

### Requirement 7

**User Story:** Als Administrator möchte ich Club-Daten verwalten können, damit alle Vereine korrekt erfasst sind.

#### Acceptance Criteria

1. WHEN das Admin Panel geöffnet wird THEN soll eine Club-Verwaltung verfügbar sein
2. WHEN ein neuer Club erstellt wird THEN sollen alle Pflichtfelder validiert werden
3. WHEN Clubs einer Liga zugeordnet werden THEN soll eine Many-to-Many Relation verwendet werden
4. WHEN Club-Logos hochgeladen werden THEN sollen sie korrekt gespeichert und angezeigt werden
5. WHEN Clubs deaktiviert werden THEN sollen sie nicht mehr in Spiel-Auswahlen erscheinen

### Requirement 8

**User Story:** Als System möchte ich eine nahtlose Migration zwischen Team- und Club-System haben, damit keine Daten verloren gehen.

#### Acceptance Criteria

1. WHEN bestehende Spiele migriert werden THEN sollen Team-zu-Club Mappings verwendet werden
2. WHEN bestehende Tabellen-Einträge migriert werden THEN sollen sie Club-Relationen erhalten
3. WHEN die Migration fehlschlägt THEN sollen die ursprünglichen Daten unverändert bleiben
4. WHEN beide Systeme parallel laufen THEN sollen keine Konflikte auftreten
5. WHEN die Migration abgeschlossen ist THEN sollen alle Funktionen weiterhin arbeiten

### Requirement 9

**User Story:** Als Entwickler möchte ich umfassende Validierung für Club-Daten haben, damit Datenintegrität gewährleistet ist.

#### Acceptance Criteria

1. WHEN Club-Namen eingegeben werden THEN sollen sie eindeutig sein
2. WHEN Viktoria-Clubs erstellt werden THEN soll die Team-Zuordnung eindeutig sein
3. WHEN Clubs Ligen zugeordnet werden THEN sollen nur aktive Clubs verfügbar sein
4. WHEN Spiele zwischen Clubs erstellt werden THEN sollen beide Clubs in der gleichen Liga sein
5. WHEN ungültige Club-Daten eingegeben werden THEN sollen detaillierte Fehlermeldungen angezeigt werden

### Requirement 10

**User Story:** Als System möchte ich optimale Performance bei Club-Operationen haben, damit die Anwendung schnell bleibt.

#### Acceptance Criteria

1. WHEN Club-Daten abgerufen werden THEN sollen Database-Indizes verwendet werden
2. WHEN häufig verwendete Club-Daten geladen werden THEN sollen sie gecacht werden
3. WHEN Tabellen berechnet werden THEN sollen Club-Queries optimiert sein
4. WHEN viele Clubs in einer Liga sind THEN soll die Performance unter 2 Sekunden bleiben
5. WHEN Club-Logos geladen werden THEN sollen sie effizient übertragen werden