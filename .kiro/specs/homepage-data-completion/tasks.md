# Implementation Plan

- [x] 1. Erweitere Team Collection Type um Form-Daten


  - Füge `form_letzte_5` Feld zum team schema hinzu
  - Füge `team_typ` Enum Feld hinzu  
  - Füge `liga_name` String Feld hinzu
  - _Requirements: 1.1, 2.1, 4.1_

- [x] 2. Erstelle Spieler-Statistik Collection Type


  - Erstelle neue `spieler-statistik` Collection ohne Relations
  - Definiere einfache Felder: name, team_name, tore, spiele, ist_viktoria_spieler
  - Teste CRUD Operations für neue Collection
  - _Requirements: 3.1, 4.2_

- [x] 3. Erweitere Frontend TeamService


  - Erweitere TeamData Interface um neue Felder
  - Implementiere Form-Daten Parsing und Anzeige
  - Teste Fallback-Verhalten bei fehlenden Daten
  - _Requirements: 1.1, 1.3_

- [x] 4. Erstelle TopScorers Service


  - Implementiere neuen topScorersService für Spieler-Statistiken
  - Erstelle API Integration für spieler-statistiks endpoint
  - Implementiere Fallback zu bestehenden Dummy-Daten
  - _Requirements: 3.1, 3.3_

- [x] 5. Erweitere LeagueService für gegnerische Teams


  - Erweitere fetchLeagueStandings um team_typ Filter
  - Implementiere Liga-spezifische Team-Abfragen
  - Teste Viktoria-Team Hervorhebung in Tabelle
  - _Requirements: 2.1, 2.3_

- [x] 6. Aktualisiere TeamStatus Component


  - Integriere Form-Daten Anzeige in TeamStatus Card
  - Implementiere Form-Visualisierung (S-U-N-S-S)
  - Teste Fallback-Anzeige bei fehlenden Form-Daten
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 7. Aktualisiere TopScorers Component



  - Integriere echte Spieler-Daten aus neuem Service
  - Behalte Fallback zu Dummy-Daten bei API-Fehlern
  - Teste Viktoria-Spieler Hervorhebung
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 8. Teste vollständige Integration



  - Teste alle drei Cards mit neuen Daten
  - Verifiziere Fallback-Verhalten bei fehlenden Daten
  - Teste Performance mit erweiterten Datenstrukturen
  - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 9. Füge Beispiel-Daten hinzu



  - Erstelle Beispiel-Teams mit Form-Daten für alle 3 Viktoria-Mannschaften
  - Füge gegnerische Vereine für Ligatabellen hinzu
  - Erstelle Beispiel-Spielerstatistiken für TopScorers
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 10. Dokumentiere neue API Endpoints



  - Erweitere API_REFERENCE_FOR_FRONTEND.md um neue Felder
  - Dokumentiere spieler-statistiks endpoint
  - Füge Beispiele für neue Datenstrukturen hinzu
  - _Requirements: 4.1, 4.2_