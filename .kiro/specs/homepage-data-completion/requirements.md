# Requirements Document

## Introduction

Die Startseite der Viktoria Wertheim Website zeigt derzeit unvollständige Daten aufgrund fehlender Backend Collection Types. Hauptprobleme sind: fehlende Form-Daten für TeamStatus, keine gegnerischen Vereine für die Ligatabelle, und keine Spielerstatistiken für TopScorers. Diese Erweiterung soll die fehlenden Datenstrukturen mit minimaler Komplexität hinzufügen.

## Requirements

### Requirement 1

**User Story:** Als Besucher der Website möchte ich die Form der letzten 5 Spiele für jede Viktoria-Mannschaft sehen, damit ich die aktuelle Leistung einschätzen kann.

#### Acceptance Criteria

1. WHEN ich die TeamStatus Card betrachte THEN soll die Form der letzten 5 Spiele angezeigt werden (z.B. "S-U-N-S-S")
2. WHEN ich zwischen den Mannschaften wechsle THEN soll die entsprechende Form angezeigt werden
3. WHEN keine Form-Daten vorhanden sind THEN soll ein Fallback angezeigt werden

### Requirement 2

**User Story:** Als Besucher möchte ich eine vollständige Ligatabelle mit allen Vereinen sehen, damit ich die Position von Viktoria im Kontext der Liga verstehe.

#### Acceptance Criteria

1. WHEN ich die LeagueTable Card betrachte THEN sollen alle Vereine der Liga angezeigt werden
2. WHEN ich zwischen Mannschaften wechsle THEN soll die entsprechende Liga-Tabelle angezeigt werden
3. WHEN Viktoria-Teams in der Tabelle sind THEN sollen sie visuell hervorgehoben werden

### Requirement 3

**User Story:** Als Besucher möchte ich echte Torschützendaten sehen, damit ich die besten Spieler des Vereins kenne.

#### Acceptance Criteria

1. WHEN ich die TopScorers Card betrachte THEN sollen echte Spielerdaten angezeigt werden
2. WHEN ein Spieler von Viktoria ist THEN soll er als eigener Spieler markiert werden
3. WHEN keine Daten vorhanden sind THEN soll ein Fallback angezeigt werden

### Requirement 4

**User Story:** Als Administrator möchte ich einfache Collection Types ohne komplexe Relations verwalten, damit Validierungsprobleme vermieden werden.

#### Acceptance Criteria

1. WHEN ich neue Collection Types erstelle THEN sollen sie minimal und einfach strukturiert sein
2. WHEN ich Daten eingebe THEN sollen keine komplexen Validierungsregeln erforderlich sein
3. WHEN ich Relations verwende THEN sollen sie optional und robust sein