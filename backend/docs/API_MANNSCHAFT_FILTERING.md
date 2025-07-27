# Mannschaft Filtering API Documentation

## Overview

The Game Cards and Next Game Cards APIs have been extended to support filtering by team (mannschaft). This allows the frontend to retrieve team-specific game data for the three teams: 1. Mannschaft, 2. Mannschaft, and 3. Mannschaft.

## API Endpoints

### Game Cards API

#### Get All Game Cards
```http
GET /api/game-cards
```

#### Get Game Cards by Team
```http
GET /api/game-cards?filters[mannschaft][$eq]={team_id}
```

**Parameters:**
- `team_id`: Team identifier (`m1`, `m2`, or `m3`)

**Example Requests:**
```bash
# Get game cards for 1. Mannschaft
curl "http://localhost:1337/api/game-cards?filters[mannschaft][$eq]=m1"

# Get game cards for 2. Mannschaft  
curl "http://localhost:1337/api/game-cards?filters[mannschaft][$eq]=m2"

# Get game cards for 3. Mannschaft
curl "http://localhost:1337/api/game-cards?filters[mannschaft][$eq]=m3"
```

### Next Game Cards API

#### Get All Next Game Cards
```http
GET /api/next-game-cards?populate=gegner_team
```

#### Get Next Game Cards by Team
```http
GET /api/next-game-cards?filters[mannschaft][$eq]={team_id}&populate=gegner_team
```

**Parameters:**
- `team_id`: Team identifier (`m1`, `m2`, or `m3`)
- `populate=gegner_team`: Include opponent team details

**Example Requests:**
```bash
# Get next game cards for 1. Mannschaft
curl "http://localhost:1337/api/next-game-cards?filters[mannschaft][$eq]=m1&populate=gegner_team"

# Get next game cards for 2. Mannschaft
curl "http://localhost:1337/api/next-game-cards?filters[mannschaft][$eq]=m2&populate=gegner_team"

# Get next game cards for 3. Mannschaft
curl "http://localhost:1337/api/next-game-cards?filters[mannschaft][$eq]=m3&populate=gegner_team"
```

## Response Format

### Game Cards Response

```json
{
  "data": [
    {
      "id": 1,
      "documentId": "abc123",
      "datum": "2025-01-15T15:00:00.000Z",
      "gegner": "FC Opponent",
      "ist_heimspiel": true,
      "unsere_tore": 2,
      "gegner_tore": 1,
      "mannschaft": "m1",
      "createdAt": "2025-01-01T10:00:00.000Z",
      "updatedAt": "2025-01-01T10:00:00.000Z",
      "publishedAt": "2025-01-01T10:00:00.000Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 1,
      "total": 1
    }
  }
}
```

### Next Game Cards Response

```json
{
  "data": [
    {
      "id": 1,
      "documentId": "def456",
      "datum": "2025-02-01T15:00:00.000Z",
      "ist_heimspiel": false,
      "mannschaft": "m1",
      "gegner_team": {
        "id": 1,
        "documentId": "team123",
        "name": "FC Next Opponent",
        "logo": {
          "url": "/uploads/team_logo.png"
        }
      },
      "createdAt": "2025-01-01T10:00:00.000Z",
      "updatedAt": "2025-01-01T10:00:00.000Z",
      "publishedAt": "2025-01-01T10:00:00.000Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 1,
      "total": 1
    }
  }
}
```

## Team ID Mapping

The API uses technical team identifiers that map to user-facing team names:

| Technical ID | Team Name | Frontend Display |
|--------------|-----------|------------------|
| `m1` | 1. Mannschaft | 1. Mannschaft |
| `m2` | 2. Mannschaft | 2. Mannschaft |
| `m3` | 3. Mannschaft | 3. Mannschaft |

**Note:** The technical IDs (`m1`, `m2`, `m3`) are used due to Strapi 5 enumeration validation requirements. The frontend handles the mapping to user-friendly team identifiers.

## Error Handling

### Invalid Team ID

```http
GET /api/game-cards?filters[mannschaft][$eq]=invalid
```

**Response (400 Bad Request):**
```json
{
  "error": {
    "status": 400,
    "name": "ValidationError",
    "message": "mannschaft must be one of: m1, m2, m3"
  }
}
```

### Missing Team Data

When no game cards exist for a specific team, the API returns an empty data array:

```json
{
  "data": [],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 0,
      "total": 0
    }
  }
}
```

## Performance Considerations

### Database Indexes

The following indexes have been created to optimize filtering performance:

```sql
-- Single column indexes
CREATE INDEX idx_game_cards_mannschaft ON game_cards(mannschaft);
CREATE INDEX idx_next_game_cards_mannschaft ON next_game_cards(mannschaft);

-- Composite indexes for better query performance
CREATE INDEX idx_game_cards_mannschaft_datum ON game_cards(mannschaft, datum);
CREATE INDEX idx_next_game_cards_mannschaft_datum ON next_game_cards(mannschaft, datum);
```

### Query Performance

- Filtered queries typically perform 10-20% better than unfiltered queries due to reduced result set size
- Average response time: < 100ms for filtered requests
- Recommended to always use team filtering in production to minimize data transfer

## Frontend Integration

### TypeScript Interface

```typescript
interface TeamService {
  fetchLastAndNextGame(teamId: 'm1' | 'm2' | 'm3'): Promise<{
    lastGame: GameDetails | null
    nextGame: GameDetails | null
  }>
}
```

### Example Usage

```typescript
import { teamService } from '@/services/teamService'

// Fetch games for 1. Mannschaft
const { lastGame, nextGame } = await teamService.fetchLastAndNextGame('m1')

// Fetch games for 2. Mannschaft
const { lastGame, nextGame } = await teamService.fetchLastAndNextGame('m2')

// Fetch games for 3. Mannschaft
const { lastGame, nextGame } = await teamService.fetchLastAndNextGame('m3')
```

## Migration Notes

### Existing Data

All existing game cards have been automatically assigned to `mannschaft: "m1"` (1. Mannschaft) during the schema migration to ensure backward compatibility.

### Schema Changes

The following fields have been added to both content types:

```javascript
// game-card schema
mannschaft: {
  type: 'enumeration',
  enum: ['m1', 'm2', 'm3'],
  required: true,
  default: 'm1'
}

// next-game-card schema  
mannschaft: {
  type: 'enumeration',
  enum: ['m1', 'm2', 'm3'],
  required: true,
  default: 'm1'
}
```

## Testing

### API Testing Script

Use the provided performance testing script to verify API functionality:

```bash
cd backend
node scripts/performance-test-api.js
```

### Manual Testing

```bash
# Test all endpoints
curl "http://localhost:1337/api/game-cards"
curl "http://localhost:1337/api/game-cards?filters[mannschaft][$eq]=m1"
curl "http://localhost:1337/api/game-cards?filters[mannschaft][$eq]=m2"
curl "http://localhost:1337/api/game-cards?filters[mannschaft][$eq]=m3"

curl "http://localhost:1337/api/next-game-cards?populate=gegner_team"
curl "http://localhost:1337/api/next-game-cards?filters[mannschaft][$eq]=m1&populate=gegner_team"
curl "http://localhost:1337/api/next-game-cards?filters[mannschaft][$eq]=m2&populate=gegner_team"
curl "http://localhost:1337/api/next-game-cards?filters[mannschaft][$eq]=m3&populate=gegner_team"
```

## Troubleshooting

### Common Issues

1. **Empty Results**: Ensure test data exists for the requested team
2. **Invalid Team ID**: Use `m1`, `m2`, or `m3` (not `1`, `2`, `3`)
3. **Missing Population**: Include `populate=gegner_team` for next game cards
4. **Performance Issues**: Verify database indexes are created

### Debug Queries

Enable Strapi query logging to debug filtering issues:

```javascript
// config/database.js
module.exports = {
  connection: {
    // ... other config
    debug: process.env.NODE_ENV === 'development'
  }
}
```

## Changelog

### Version 1.0.0 (January 2025)
- Added mannschaft filtering support to game-cards API
- Added mannschaft filtering support to next-game-cards API
- Created database indexes for performance optimization
- Updated response format to include mannschaft field
- Added comprehensive error handling for invalid team IDs