# Club Collection Implementation

## Overview

The Club Collection has been successfully created to support the club-based league operations as specified in the requirements. This collection provides a clean separation between internal teams and league clubs.

## Schema Structure

### Core Fields
- **name**: Unique club name (required, 2-100 characters)
- **kurz_name**: Short name for tables (optional, 2-20 characters)
- **logo**: Club logo image (optional)
- **club_typ**: Enumeration (viktoria_verein | gegner_verein)
- **viktoria_team_mapping**: Team mapping for Viktoria clubs (team_1 | team_2 | team_3)
- **aktiv**: Active status (boolean, default: true)

### Metadata Fields
- **gruendungsjahr**: Founding year (1800-2030)
- **vereinsfarben**: Club colors
- **heimstadion**: Home stadium
- **adresse**: Club address
- **website**: Website URL

### Relationships
- **ligen**: Many-to-many relationship with Liga collection
- **heim_spiele**: One-to-many relationship with Spiel collection (home games)
- **gast_spiele**: One-to-many relationship with Spiel collection (away games)
- **tabellen_eintraege**: One-to-many relationship with Tabellen-Eintrag collection

## Validation Rules

### Business Logic Validation
1. **Unique Club Names**: No duplicate club names allowed
2. **Viktoria Team Mapping**: 
   - Required for viktoria_verein clubs
   - Must be unique across all Viktoria clubs
   - Not allowed for gegner_verein clubs
3. **Website URL**: Must be valid HTTP/HTTPS URL if provided
4. **Founding Year**: Must be between 1800 and current year + 10

### Data Integrity
- Lifecycle hooks prevent invalid data creation/updates
- Service methods provide validation utilities
- TypeScript types ensure compile-time safety

## Service Methods

### Core CRUD Operations
- `findClubsByLiga(ligaId)`: Get all active clubs in a specific league
- `findViktoriaClubByTeam(teamMapping)`: Find Viktoria club by team mapping
- `validateClubInLiga(clubId, ligaId)`: Validate club belongs to league
- `getClubWithLogo(clubId)`: Get club with populated logo
- `createClubIfNotExists(clubData)`: Create club if it doesn't exist

### Validation Methods
- `validateClubConsistency(clubId)`: Comprehensive club data validation

## Admin Panel Configuration

### List View
- Displays: ID, Name, Short Name, Type, Team Mapping, Leagues, Active Status
- Searchable fields: Name, Short Name, Type, Team Mapping, Active Status
- Sortable by: Name (default), Type, Active Status, Creation Date

### Edit View
- Organized layout with logical field grouping
- Proper field sizing and validation
- Relationship management for leagues

### Search and Filtering
- Full-text search on club names
- Filter by club type (Viktoria vs. Opponent)
- Filter by active status
- Filter by league membership

## Requirements Compliance

### Requirement 1.1 ✅
- Club selection dropdowns available in admin panel
- Liga-based filtering implemented
- Real club names (e.g., "SV Viktoria Wertheim", "VfR Gerlachsheim")

### Requirement 2.1 ✅
- Separate fields for club name, short name, logo, and type
- Clean separation between internal teams and league clubs

### Requirement 2.2 ✅
- viktoria_team_mapping field for Viktoria clubs (team_1, team_2, team_3)
- Validation ensures unique mappings

### Requirement 2.3 ✅
- club_typ enumeration distinguishes Viktoria vs. opponent clubs
- No team mapping required for opponent clubs

### Requirement 7.1 ✅
- Complete admin panel interface for club management
- All required fields properly configured

### Requirement 7.2 ✅
- Comprehensive field validation and constraints
- Business logic validation in lifecycle hooks

## File Structure

```
backend/src/api/club/
├── content-types/club/
│   ├── schema.json          # Collection schema definition
│   ├── lifecycles.ts        # Validation lifecycle hooks
│   └── validation.js        # Additional validation rules
├── controllers/
│   └── club.ts             # API controller with population
├── services/
│   └── club.ts             # Business logic and validation
├── routes/
│   └── club.ts             # API routes
└── README.md               # This documentation
```

## Integration Points

### Liga Collection
- Updated to include many-to-many relationship with clubs
- Supports club-based league operations

### Admin Extensions
- Custom admin panel configuration
- Proper field layout and validation
- Search and filter capabilities

### Type Definitions
- TypeScript interfaces for type safety
- Enum definitions for club types and team mappings
- Validation error types

## Next Steps

This Club Collection is ready for:
1. Data population with initial club data
2. Integration with Spiel collection for club-based games
3. Integration with Tabellen-Eintrag collection for club-based tables
4. Frontend service integration for club-based operations

The implementation provides a solid foundation for the club-based league system while maintaining backward compatibility with the existing team-based system.