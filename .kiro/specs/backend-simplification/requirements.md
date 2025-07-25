# Requirements Document

## Introduction

Das Viktoria Wertheim Backend ist durch die Entfernung der Spieler-Collection Types beschädigt worden und benötigt eine komplette Vereinfachung. Ziel ist es, ein ultra-einfaches, wartbares Backend zu schaffen, das sich auf die Kernfunktionen einer Fußballverein-Website konzentriert: Teams, Ligen, News, Spiele und Sponsoren anzeigen.

## Requirements

### Requirement 1: Backend Bereinigung

**User Story:** Als Entwickler möchte ich ein sauberes, funktionsfähiges Backend ohne beschädigte Code-Referenzen, damit die Anwendung wieder startet und wartbar ist.

#### Acceptance Criteria

1. WHEN das Backend gestartet wird THEN soll es ohne TypeScript-Fehler kompilieren
2. WHEN beschädigte Services existieren THEN sollen sie entfernt oder repariert werden
3. WHEN komplexe Validation-Logic existiert THEN soll sie durch einfache Validierung ersetzt werden
4. WHEN User-Management Services beschädigt sind THEN sollen sie komplett entfernt werden

### Requirement 2: Vereinfachte Collection Types

**User Story:** Als Content-Manager möchte ich nur die essentiellen Collection Types verwalten, damit die Datenverwaltung einfach und übersichtlich bleibt.

#### Acceptance Criteria

1. WHEN Team Collection Type definiert wird THEN soll es nur Basis-Felder enthalten (Name, Liga, Trainer, Punkte, Tore)
2. WHEN komplexe Status-Felder existieren THEN sollen sie entfernt werden (status, trend, form_letzte_5)
3. WHEN Liga Collection Type definiert wird THEN soll es nur Name und Teams-Relation enthalten
4. WHEN Saison Collection Type definiert wird THEN soll es nur Name und Zeitraum enthalten
5. WHEN News Collection Type existiert THEN soll es nur Basis-Felder enthalten (Titel, Text, Datum)
6. WHEN Sponsor Collection Type existiert THEN soll es nur Basis-Felder enthalten (Name, Logo, Link)

### Requirement 3: Ultra-Simple Validation Service

**User Story:** Als Entwickler möchte ich eine einfache Validation-Logik, damit Datenvalidierung ohne komplexe Business Rules funktioniert.

#### Acceptance Criteria

1. WHEN Validation Service erstellt wird THEN soll es nur 4 Basis-Funktionen enthalten
2. WHEN validateRequired aufgerufen wird THEN sollen Pflichtfelder geprüft werden
3. WHEN validateUnique aufgerufen wird THEN soll Eindeutigkeit geprüft werden
4. WHEN validateDateRange aufgerufen wird THEN sollen Datumsbereiche validiert werden
5. WHEN validateEnum aufgerufen wird THEN sollen Enum-Werte geprüft werden
6. WHEN komplexe Business Rules existieren THEN sollen sie entfernt werden

### Requirement 4: Vereinfachte Services

**User Story:** Als Entwickler möchte ich einfache Service-Funktionen, damit die API-Logik wartbar und verständlich bleibt.

#### Acceptance Criteria

1. WHEN Team Service definiert wird THEN soll es nur Standard CRUD-Operationen enthalten
2. WHEN komplexe Business Logic existiert THEN soll sie entfernt werden
3. WHEN Service-Funktionen definiert werden THEN sollen sie nur basic populate verwenden
4. WHEN User-Management Services existieren THEN sollen sie komplett entfernt werden
5. WHEN Auth-Controller Extensions existieren THEN sollen sie auf Standard zurückgesetzt werden

### Requirement 5: Saubere API-Struktur

**User Story:** Als Frontend-Entwickler möchte ich einfache, vorhersagbare API-Endpunkte, damit die Integration unkompliziert ist.

#### Acceptance Criteria

1. WHEN API-Endpunkte definiert werden THEN sollen sie Standard Strapi-Endpunkte sein
2. WHEN Custom Controllers existieren THEN sollen sie nur bei absoluter Notwendigkeit verwendet werden
3. WHEN Middlewares existieren THEN sollen komplexe Access-Control Middlewares entfernt werden
4. WHEN Lifecycle Hooks existieren THEN sollen sie entfernt werden, außer bei kritischen Funktionen

### Requirement 6: Funktionsfähiges System

**User Story:** Als Benutzer möchte ich, dass die Website wieder funktioniert, damit ich Teams, Tabellen, News und Spiele sehen kann.

#### Acceptance Criteria

1. WHEN das Backend startet THEN soll es ohne Fehler laufen
2. WHEN Frontend-Komponenten API-Calls machen THEN sollen sie erfolgreich Daten erhalten
3. WHEN Teams abgerufen werden THEN sollen sie mit Liga und Saison-Informationen angezeigt werden
4. WHEN Tabellen abgerufen werden THEN sollen sie korrekte Standings anzeigen
5. WHEN News abgerufen werden THEN sollen sie chronologisch sortiert werden
6. WHEN Game Cards abgerufen werden THEN sollen sie aktuelle Spiel-Informationen anzeigen

### Requirement 7: Wartbarkeit und Erweiterbarkeit

**User Story:** Als Entwickler möchte ich eine einfache Code-Basis, damit zukünftige Erweiterungen problemlos möglich sind.

#### Acceptance Criteria

1. WHEN Code-Struktur definiert wird THEN soll sie dem KISS-Prinzip folgen
2. WHEN neue Features hinzugefügt werden THEN sollen sie auf der einfachen Basis aufbauen können
3. WHEN Dokumentation erstellt wird THEN soll sie die vereinfachte Struktur erklären
4. WHEN Tests geschrieben werden THEN sollen sie die Basis-Funktionalität abdecken