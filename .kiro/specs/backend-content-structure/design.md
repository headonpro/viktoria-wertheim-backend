# Design Document

## Overview

The backend content structure for SV Viktoria Wertheim will be implemented using Strapi 5+ as a headless CMS with PostgreSQL database. The design follows a relational data model that supports the club's three teams, flexible player assignments, comprehensive match management, and future extensibility for live features. The architecture prioritizes data integrity, performance, and maintainability while providing a robust foundation for the Next.js frontend.

## Architecture

### Core Principles
- **Relational Data Model**: Proper foreign key relationships ensure data consistency
- **Season-Based Organization**: All time-sensitive data is organized by seasons for historical tracking
- **Flexible Player Management**: Players can belong to multiple teams with primary/secondary assignments
- **Automated Statistics**: Match events automatically update player statistics
- **Future-Ready Structure**: Design accommodates planned live ticker and chat features

### Technology Stack
- **CMS**: Strapi 5+ with TypeScript
- **Database**: PostgreSQL for all environments
- **API**: RESTful and GraphQL endpoints
- **Authentication**: Strapi's built-in user system with role-based permissions

## Components and Interfaces

### Core Content Types

#### 1. SAISON (Season Management)
```typescript
interface Saison {
  id: number;
  name: string; // "2024/25", "2023/24"
  start_datum: Date;
  end_datum: Date;
  aktiv: boolean; // Only one active season
  beschreibung?: string;
}
```

#### 2. CLUB (Club/Team Organizations)
```typescript
interface Club {
  id: number;
  name: string; // "SV Viktoria Wertheim", "FC Gegner"
  kurz_name: string; // "Viktoria", "Gegner FC"
  logo?: Media;
  vereinsfarben?: string;
  heimstadion?: string;
  adresse?: string;
  website?: string;
  kontakt?: string;
  ist_unser_verein: boolean; // true for Viktoria
}
```

#### 3. LIGA (League Management)
```typescript
interface Liga {
  id: number;
  name: string; // "Kreisliga A Tauberbischofsheim"
  kurz_name: string; // "Kreisliga A"
  saison: Relation<Saison>;
  clubs: Relation<Club[]>; // manyToMany
  spieltage_gesamt: number;
}
```

#### 4. TEAM (Team Management)
```typescript
interface Team {
  id: number;
  name: string; // "1. Team", "2. Team", "3. Team"
  club: Relation<Club>;
  liga: Relation<Liga>;
  saison: Relation<Saison>;
  trainer?: string;
  co_trainer?: string;
  trainingszeiten?: string; // "Dienstag 19:00, Donnerstag 19:00"
  trainingsort?: string; // "Sportplatz Wertheim"
  heimspieltag?: string; // "Sonntag 15:00"
  teamfoto?: Media;
}
```

#### 5. MITGLIED (Member Management)
```typescript
interface Mitglied {
  id: number;
  vorname: string;
  nachname: string;
  mitgliedsnummer: string; // unique
  email?: string;
  telefon?: string;
  adresse?: string;
  geburtsdatum?: Date;
  eintrittsdatum?: Date;
  mitgliedsart: 'Aktiv' | 'Passiv' | 'Jugend' | 'Ehrenmitglied';
  status: 'Aktiv' | 'Inaktiv' | 'Gekündigt';
  website_user?: Relation<User>; // oneToOne
  notizen?: string; // internal only
}
```

#### 6. SPIELER (Player Management)
```typescript
interface Spieler {
  id: number;
  vorname: string;
  nachname: string;
  mitglied: Relation<Mitglied>; // oneToOne
  hauptteam: Relation<Team>; // manyToOne
  aushilfe_teams: Relation<Team[]>; // manyToMany
  position?: string;
  rueckennummer?: number;
  status?: 'aktiv' | 'verletzt' | 'gesperrt';
  kapitaen?: boolean;
  spielerfoto?: Media;
}
```

#### 7. SPIELER_SAISON_STATISTIK (Season Statistics)
```typescript
interface SpielerSaisonStatistik {
  id: number;
  spieler: Relation<Spieler>;
  saison: Relation<Saison>;
  team: Relation<Team>;
  tore: number;
  spiele: number;
  assists: number;
  gelbe_karten: number;
  rote_karten: number;
  minuten_gespielt?: number;
}
```

#### 8. SPIEL (Match Management)
```typescript
interface Spiel {
  id: number;
  datum: Date;
  heimclub: Relation<Club>;
  auswaertsclub: Relation<Club>;
  unser_team: Relation<Team>;
  liga: Relation<Liga>;
  saison: Relation<Saison>;
  ist_heimspiel: boolean;
  tore_heim?: number;
  tore_auswaerts?: number;
  status: 'geplant' | 'laufend' | 'beendet' | 'abgesagt';
  spielort?: string;
  schiedsrichter?: string;
  torschuetzen?: JSON; // Array of {spieler_id, minute, typ}
  karten?: JSON; // Array of {spieler_id, minute, typ: 'gelb'|'rot'}
  wechsel?: JSON; // Array of {raus_id, rein_id, minute}
}
```

#### 9. TABELLEN_EINTRAG (League Table)
```typescript
interface TabellenEintrag {
  id: number;
  liga: Relation<Liga>;
  club: Relation<Club>;
  platz: number;
  spiele: number;
  siege: number;
  unentschieden: number;
  niederlagen: number;
  tore_fuer: number;
  tore_gegen: number;
  tordifferenz: number;
  punkte: number;
  form_letzte_5?: JSON; // ['S', 'U', 'N', 'S', 'S']
}
```

### Content Management Types

#### 10. KATEGORIE (News Categories)
```typescript
interface Kategorie {
  id: number;
  name: string; // "Vereinsnews", "Spielberichte", "Transfers", "Veranstaltungen"
  farbe?: string; // Hex color for UI
  reihenfolge?: number;
}
```

#### 11. NEWS_ARTIKEL (News Management)
```typescript
interface NewsArtikel {
  id: number;
  titel: string;
  inhalt: RichText;
  datum: Date;
  autor: string;
  kategorie: Relation<Kategorie>;
  titelbild?: Media;
  featured: boolean;
  published: boolean;
}
```

#### 12. SPONSOR (Sponsor Management)
```typescript
interface Sponsor {
  id: number;
  name: string;
  logo?: Media;
  website?: string;
  kategorie: 'Hauptsponsor' | 'Premium' | 'Partner';
  beschreibung?: string;
  kontakt?: string;
  aktiv: boolean;
  reihenfolge?: number;
}
```

#### 13. VERANSTALTUNG (Event Management)
```typescript
interface Veranstaltung {
  id: number;
  titel: string;
  beschreibung?: RichText;
  datum: Date;
  uhrzeit?: string;
  ort?: string;
  kategorie: 'Vereinsfeier' | 'Mitgliederversammlung' | 'Turnier' | 'Training';
  titelbild?: Media;
  oeffentlich: boolean; // visible on website
}
```

## Data Models

### Key Relationships

1. **Season-Based Organization**
   - All time-sensitive data links to SAISON
   - Enables historical data tracking
   - Supports season transitions

2. **Player-Team Flexibility**
   - Primary team assignment (hauptmannschaft)
   - Multiple secondary assignments (aushilfe_mannschaften)
   - Season-specific statistics per team

3. **Match Event Integration**
   - JSON events with player references
   - Automatic statistics updates via hooks
   - Flexible event types (goals, cards, substitutions)

4. **Member-User Integration**
   - Club members can have website accounts
   - Role-based permissions for future features
   - Separation of internal/public data

### Database Schema Considerations

- **Indexes**: Primary keys, foreign keys, and frequently queried fields (saison.aktiv, spieler.hauptmannschaft)
- **Constraints**: Unique constraints on mitglied.mitgliedsnummer, one active season
- **Cascading**: Proper cascade rules for data integrity
- **Performance**: Optimized queries for league tables and player statistics

## Error Handling

### Data Validation
- Required field validation at Strapi level
- Custom validators for business rules (one active season, valid team assignments)
- JSON schema validation for match events
- Email format validation for member contacts

### Relationship Integrity
- Foreign key constraints prevent orphaned records
- Cascade delete rules for dependent data
- Validation hooks for complex relationships (player-team assignments)

### API Error Responses
- Standardized error formats following Strapi conventions
- Detailed validation error messages
- Proper HTTP status codes (400, 404, 422, 500)

## Testing Strategy

### Unit Testing
- Model validation tests
- Relationship constraint tests
- Custom hook functionality
- JSON event processing

### Integration Testing
- API endpoint testing
- Database transaction testing
- Cross-model relationship testing
- Statistics calculation accuracy

### Data Migration Testing
- Season transition procedures
- Historical data preservation
- Bulk import/export functionality

### Performance Testing
- League table generation performance
- Player statistics aggregation
- Large dataset handling
- Query optimization validation

## Future Extensibility

### Planned Features (Phase 2)
```typescript
// Live Ticker Support
interface LiveTicker {
  id: number;
  spiel: Relation<Spiel>;
  aktiv: boolean;
  nachrichten: Relation<TickerNachricht[]>;
}

interface TickerNachricht {
  id: number;
  live_ticker: Relation<LiveTicker>;
  autor: Relation<User>;
  nachricht: string;
  minute?: number;
  typ: 'tor' | 'karte' | 'wechsel' | 'kommentar';
  timestamp: Date;
}

// Chat System Support
interface ChatNachricht {
  id: number;
  spiel?: Relation<Spiel>; // optional - for match chat
  autor: Relation<User>;
  nachricht: string;
  timestamp: Date;
  antwort_auf?: Relation<ChatNachricht>; // for threads
}
```

### Scalability Considerations
- Modular content type structure allows easy additions
- JSON fields provide flexibility for evolving requirements
- User role system supports expanding permission needs
- API structure accommodates real-time features