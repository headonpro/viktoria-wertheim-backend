# Requirements Document

## Introduction

Das Strapi Admin Panel für den Collection Type "Tabellen Eintrag" zeigt aktuell die Liga als Hauptidentifikator an, was zu Verwirrung führt, da mehrere Teams derselben Liga identisch erscheinen. Diese Implementierung korrigiert die Anzeige, sodass der Team-Name als primärer Identifier verwendet wird, um eine eindeutige Identifikation jedes Tabellen-Eintrags zu ermöglichen.

## Requirements

### Requirement 1: Schema Configuration Update

**User Story:** Als Content-Manager möchte ich Tabellen-Einträge im Admin Panel eindeutig anhand des Team-Namens identifizieren können, damit ich effizient arbeiten und Verwechslungen vermeiden kann.

#### Acceptance Criteria

1. WHEN ich das Tabellen-Eintrag Schema konfiguriere THEN soll `mainField: "team_name"` in der info-Sektion gesetzt werden
2. WHEN ich das Admin Panel öffne THEN soll der team_name als primärer Display-Identifier verwendet werden
3. WHEN ich die Schema-Änderung implementiere THEN soll keine Datenintegrität beeinträchtigt werden

### Requirement 2: Admin Panel Display Improvement

**User Story:** Als Content-Manager möchte ich in der Listen-Ansicht sofort erkennen können, welches Team zu welchem Tabellen-Eintrag gehört, damit ich nicht jeden Eintrag einzeln öffnen muss.

#### Acceptance Criteria

1. WHEN ich die Tabellen-Eintrag Collection öffne THEN soll der Team-Name (z.B. "SV Viktoria Wertheim") als Hauptidentifikator angezeigt werden
2. WHEN ich mehrere Einträge derselben Liga betrachte THEN soll jeder Eintrag eindeutig durch den Team-Namen identifizierbar sein
3. WHEN ich auf einen Eintrag klicke THEN sollen alle Detail-Informationen inklusive Liga weiterhin verfügbar sein

### Requirement 3: Data Integrity Preservation

**User Story:** Als System-Administrator möchte ich sicherstellen, dass die Schema-Änderung keine bestehenden Daten beschädigt oder Funktionalitäten beeinträchtigt, damit der laufende Betrieb nicht gestört wird.

#### Acceptance Criteria

1. WHEN die Schema-Änderung implementiert wird THEN sollen alle bestehenden team_name Felder korrekt befüllt und angezeigt werden
2. WHEN die Änderung aktiv ist THEN sollen alle CRUD-Operationen weiterhin funktionieren
3. WHEN ich die Datenqualität prüfe THEN sollen Team-Namen konsistent mit den referenzierten Team-Objekten sein

