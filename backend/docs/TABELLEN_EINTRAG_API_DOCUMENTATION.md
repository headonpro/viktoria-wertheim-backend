# Tabellen-Eintrag API Documentation

## Overview

The Tabellen-Eintrag API provides endpoints for managing league table entries for all football teams across different leagues. This API replaces the previous table statistics management through the Team collection type.

## Base URL

```
http://localhost:1337/api/tabellen-eintraege
```

## Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Get All Table Entries

**GET** `/api/tabellen-eintraege`

Retrieves all table entries across all leagues.

#### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `sort` | string | Sort order | `platz:asc` |
| `populate` | string | Relations to populate | `liga,team_logo` |
| `filters` | object | Filter criteria | See filtering section |
| `pagination` | object | Pagination options | `[page]=1&[pageSize]=10` |

#### Example Requests

```bash
# Get all entries sorted by position
curl "http://localhost:1337/api/tabellen-eintraege?sort=platz:asc"

# Get entries with league information
curl "http://localhost:1337/api/tabellen-eintraege?populate=liga&sort=platz:asc"

# Get entries with all relations
curl "http://localhost:1337/api/tabellen-eintraege?populate=liga,team_logo&sort=platz:asc"
```

#### Response Format

```json
{
  "data": [
    {
      "id": 1,
      "attributes": {
        "team_name": "SV Viktoria Wertheim",
        "platz": 1,
        "spiele": 0,
        "siege": 0,
        "unentschieden": 0,
        "niederlagen": 0,
        "tore_fuer": 0,
        "tore_gegen": 0,
        "tordifferenz": 0,
        "punkte": 0,
        "createdAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2024-01-15T10:00:00.000Z",
        "publishedAt": "2024-01-15T10:00:00.000Z",
        "liga": {
          "data": {
            "id": 1,
            "attributes": {
              "name": "Kreisliga Tauberbischofsheim",
              "kurz_name": "Kreisliga TB"
            }
          }
        },
        "team_logo": {
          "data": null
        }
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 1,
      "total": 39
    }
  }
}
```

### 2. Get Table Entries by League

**GET** `/api/tabellen-eintraege?filters[liga][name][$eq]=<league-name>`

Retrieves table entries for a specific league.

#### Supported League Names

| League | Filter Value |
|--------|-------------|
| Kreisliga | `Kreisliga Tauberbischofsheim` |
| Kreisklasse A | `Kreisklasse A Tauberbischofsheim` |
| Kreisklasse B | `Kreisklasse B Tauberbischofsheim` |

#### Example Requests

```bash
# Get Kreisliga table
curl "http://localhost:1337/api/tabellen-eintraege?filters[liga][name][\$eq]=Kreisliga%20Tauberbischofsheim&populate=liga&sort=platz:asc"

# Get Kreisklasse A table
curl "http://localhost:1337/api/tabellen-eintraege?filters[liga][name][\$eq]=Kreisklasse%20A%20Tauberbischofsheim&populate=liga&sort=platz:asc"

# Get Kreisklasse B table
curl "http://localhost:1337/api/tabellen-eintraege?filters[liga][name][\$eq]=Kreisklasse%20B%20Tauberbischofsheim&populate=liga&sort=platz:asc"
```

#### TypeScript Service Example

```typescript
export const fetchLeagueStandingsByLiga = async (ligaName: string): Promise<TabellenEintrag[]> => {
  const response = await fetch(
    `${API_BASE_URL}/api/tabellen-eintraege?filters[liga][name][$eq]=${encodeURIComponent(ligaName)}&populate=liga&sort=platz:asc`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch league standings for ${ligaName}`);
  }
  
  const { data } = await response.json();
  return data;
};
```

### 3. Get Specific Table Entry

**GET** `/api/tabellen-eintraege/:id`

Retrieves a specific table entry by ID.

#### Example Request

```bash
curl "http://localhost:1337/api/tabellen-eintraege/1?populate=liga,team_logo"
```

#### Response Format

```json
{
  "data": {
    "id": 1,
    "attributes": {
      "team_name": "SV Viktoria Wertheim",
      "platz": 1,
      "spiele": 10,
      "siege": 8,
      "unentschieden": 1,
      "niederlagen": 1,
      "tore_fuer": 25,
      "tore_gegen": 8,
      "tordifferenz": 17,
      "punkte": 25,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-20T15:30:00.000Z",
      "publishedAt": "2024-01-15T10:00:00.000Z",
      "liga": {
        "data": {
          "id": 1,
          "attributes": {
            "name": "Kreisliga Tauberbischofsheim",
            "kurz_name": "Kreisliga TB"
          }
        }
      },
      "team_logo": {
        "data": {
          "id": 5,
          "attributes": {
            "url": "/uploads/viktoria_logo_123456.png",
            "alternativeText": "SV Viktoria Wertheim Logo"
          }
        }
      }
    }
  },
  "meta": {}
}
```

### 4. Create Table Entry

**POST** `/api/tabellen-eintraege`

Creates a new table entry.

#### Required Headers

```
Content-Type: application/json
Authorization: Bearer <your-jwt-token>
```

#### Request Body

```json
{
  "data": {
    "team_name": "VfR Gerlachsheim",
    "liga": 1,
    "platz": 2,
    "spiele": 0,
    "siege": 0,
    "unentschieden": 0,
    "niederlagen": 0,
    "tore_fuer": 0,
    "tore_gegen": 0,
    "tordifferenz": 0,
    "punkte": 0
  }
}
```

#### Example Request

```bash
curl -X POST "http://localhost:1337/api/tabellen-eintraege" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "data": {
      "team_name": "VfR Gerlachsheim",
      "liga": 1,
      "platz": 2,
      "spiele": 0,
      "siege": 0,
      "unentschieden": 0,
      "niederlagen": 0,
      "tore_fuer": 0,
      "tore_gegen": 0,
      "tordifferenz": 0,
      "punkte": 0
    }
  }'
```

### 5. Update Table Entry

**PUT** `/api/tabellen-eintraege/:id`

Updates an existing table entry.

#### Request Body

```json
{
  "data": {
    "spiele": 1,
    "siege": 1,
    "tore_fuer": 3,
    "tore_gegen": 1,
    "tordifferenz": 2,
    "punkte": 3
  }
}
```

#### Example Request

```bash
curl -X PUT "http://localhost:1337/api/tabellen-eintraege/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "data": {
      "spiele": 1,
      "siege": 1,
      "tore_fuer": 3,
      "tore_gegen": 1,
      "tordifferenz": 2,
      "punkte": 3
    }
  }'
```

### 6. Delete Table Entry

**DELETE** `/api/tabellen-eintraege/:id`

Deletes a table entry.

#### Example Request

```bash
curl -X DELETE "http://localhost:1337/api/tabellen-eintraege/1" \
  -H "Authorization: Bearer <your-jwt-token>"
```

## Advanced Filtering

### Filter by Team Name

```bash
# Exact match
curl "http://localhost:1337/api/tabellen-eintraege?filters[team_name][\$eq]=SV%20Viktoria%20Wertheim"

# Contains
curl "http://localhost:1337/api/tabellen-eintraege?filters[team_name][\$contains]=Viktoria"

# Case insensitive contains
curl "http://localhost:1337/api/tabellen-eintraege?filters[team_name][\$containsi]=viktoria"
```

### Filter by Position Range

```bash
# Top 3 positions
curl "http://localhost:1337/api/tabellen-eintraege?filters[platz][\$lte]=3&sort=platz:asc"

# Bottom positions (assuming 16 teams)
curl "http://localhost:1337/api/tabellen-eintraege?filters[platz][\$gte]=14&sort=platz:asc"
```

### Filter by Points

```bash
# Teams with more than 20 points
curl "http://localhost:1337/api/tabellen-eintraege?filters[punkte][\$gt]=20&sort=punkte:desc"

# Teams with 0 points
curl "http://localhost:1337/api/tabellen-eintraege?filters[punkte][\$eq]=0"
```

### Complex Filters

```bash
# Viktoria teams across all leagues
curl "http://localhost:1337/api/tabellen-eintraege?filters[team_name][\$containsi]=viktoria&populate=liga&sort=platz:asc"

# Teams in top 5 of Kreisliga
curl "http://localhost:1337/api/tabellen-eintraege?filters[liga][name][\$eq]=Kreisliga%20Tauberbischofsheim&filters[platz][\$lte]=5&populate=liga&sort=platz:asc"
```

## Sorting Options

### Single Field Sorting

```bash
# By position (ascending)
?sort=platz:asc

# By points (descending)
?sort=punkte:desc

# By team name (alphabetical)
?sort=team_name:asc
```

### Multi-Field Sorting

```bash
# By points desc, then goal difference desc, then goals for desc
?sort=punkte:desc,tordifferenz:desc,tore_fuer:desc

# Standard football table sorting
?sort=platz:asc
```

## Pagination

### Page-based Pagination

```bash
# First page, 10 entries per page
?pagination[page]=1&pagination[pageSize]=10

# Second page
?pagination[page]=2&pagination[pageSize]=10
```

### Offset-based Pagination

```bash
# Skip first 10, take next 10
?pagination[start]=10&pagination[limit]=10
```

## Population (Relations)

### Basic Population

```bash
# Populate liga relation
?populate=liga

# Populate team logo
?populate=team_logo

# Populate both
?populate=liga,team_logo
```

### Advanced Population

```bash
# Populate with specific fields
?populate[liga][fields]=name,kurz_name&populate[team_logo][fields]=url,alternativeText

# Deep population (if needed)
?populate[liga][populate]=saison
```

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "error": {
    "status": 400,
    "name": "ValidationError",
    "message": "team_name must be defined.",
    "details": {
      "errors": [
        {
          "path": ["team_name"],
          "message": "team_name must be defined.",
          "name": "ValidationError"
        }
      ]
    }
  }
}
```

#### 404 Not Found
```json
{
  "error": {
    "status": 404,
    "name": "NotFoundError",
    "message": "Not Found",
    "details": {}
  }
}
```

#### 403 Forbidden
```json
{
  "error": {
    "status": 403,
    "name": "ForbiddenError",
    "message": "Forbidden",
    "details": {}
  }
}
```

## TypeScript Interfaces

### TabellenEintrag Interface

```typescript
interface TabellenEintrag {
  id: number;
  attributes: {
    team_name: string;
    platz: number;
    spiele: number;
    siege: number;
    unentschieden: number;
    niederlagen: number;
    tore_fuer: number;
    tore_gegen: number;
    tordifferenz: number;
    punkte: number;
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
    liga: {
      data: {
        id: number;
        attributes: {
          name: string;
          kurz_name: string;
        };
      };
    };
    team_logo?: {
      data?: {
        id: number;
        attributes: {
          url: string;
          alternativeText?: string;
        };
      };
    };
  };
}
```

### API Response Interface

```typescript
interface TabellenEintragResponse {
  data: TabellenEintrag[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

interface SingleTabellenEintragResponse {
  data: TabellenEintrag;
  meta: {};
}
```

## Service Implementation Examples

### Complete Service Class

```typescript
class TabellenEintragService {
  private baseURL: string;

  constructor(baseURL: string = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337') {
    this.baseURL = baseURL;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error: ${error.error.message}`);
    }

    return response.json();
  }

  // Get all table entries
  async getAll(params?: string): Promise<TabellenEintragResponse> {
    return this.request(`/api/tabellen-eintraege${params ? `?${params}` : ''}`);
  }

  // Get table entries by league
  async getByLiga(ligaName: string): Promise<TabellenEintragResponse> {
    const params = new URLSearchParams({
      'filters[liga][name][$eq]': ligaName,
      'populate': 'liga,team_logo',
      'sort': 'platz:asc'
    });
    
    return this.request(`/api/tabellen-eintraege?${params}`);
  }

  // Get table entries by team ID (1, 2, 3)
  async getByTeam(teamId: '1' | '2' | '3'): Promise<TabellenEintragResponse> {
    const ligaMapping = {
      '1': 'Kreisliga Tauberbischofsheim',
      '2': 'Kreisklasse A Tauberbischofsheim',
      '3': 'Kreisklasse B Tauberbischofsheim'
    };
    
    return this.getByLiga(ligaMapping[teamId]);
  }

  // Get single entry
  async getById(id: number): Promise<SingleTabellenEintragResponse> {
    return this.request(`/api/tabellen-eintraege/${id}?populate=liga,team_logo`);
  }

  // Create entry
  async create(data: Partial<TabellenEintrag['attributes']>): Promise<SingleTabellenEintragResponse> {
    return this.request('/api/tabellen-eintraege', {
      method: 'POST',
      body: JSON.stringify({ data })
    });
  }

  // Update entry
  async update(id: number, data: Partial<TabellenEintrag['attributes']>): Promise<SingleTabellenEintragResponse> {
    return this.request(`/api/tabellen-eintraege/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ data })
    });
  }

  // Delete entry
  async delete(id: number): Promise<SingleTabellenEintragResponse> {
    return this.request(`/api/tabellen-eintraege/${id}`, {
      method: 'DELETE'
    });
  }

  // Transform to legacy Team format for compatibility
  transformToTeam(entry: TabellenEintrag): Team {
    return {
      id: entry.id,
      attributes: {
        name: entry.attributes.team_name,
        tabellenplatz: entry.attributes.platz,
        punkte: entry.attributes.punkte,
        spiele_gesamt: entry.attributes.spiele,
        siege: entry.attributes.siege,
        unentschieden: entry.attributes.unentschieden,
        niederlagen: entry.attributes.niederlagen,
        tore_fuer: entry.attributes.tore_fuer,
        tore_gegen: entry.attributes.tore_gegen,
        tordifferenz: entry.attributes.tordifferenz,
        teamfoto: entry.attributes.team_logo,
        liga: entry.attributes.liga,
        createdAt: entry.attributes.createdAt,
        updatedAt: entry.attributes.updatedAt
      }
    };
  }
}

export const tabellenEintragService = new TabellenEintragService();
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Authenticated requests**: 1000 requests per hour
- **Unauthenticated requests**: 100 requests per hour

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642694400
```

## Caching

The API supports HTTP caching headers:

```
Cache-Control: public, max-age=300
ETag: "abc123"
Last-Modified: Mon, 20 Jan 2024 15:30:00 GMT
```

Use conditional requests to optimize performance:

```bash
curl -H "If-None-Match: abc123" "http://localhost:1337/api/tabellen-eintraege"
```

## Best Practices

### 1. Always Use Sorting
```bash
# Good: Explicit sorting
?sort=platz:asc

# Avoid: No sorting (unpredictable order)
```

### 2. Populate Only What You Need
```bash
# Good: Specific population
?populate=liga

# Avoid: Over-population
?populate=*
```

### 3. Use Appropriate Pagination
```bash
# Good: Reasonable page size
?pagination[pageSize]=25

# Avoid: Too large page size
?pagination[pageSize]=1000
```

### 4. Handle Errors Gracefully
```typescript
try {
  const response = await tabellenEintragService.getByLiga('Kreisliga Tauberbischofsheim');
  return response.data;
} catch (error) {
  console.error('Failed to fetch league table:', error);
  return [];
}
```

### 5. Use TypeScript for Type Safety
```typescript
// Good: Typed response
const response: TabellenEintragResponse = await tabellenEintragService.getAll();

// Avoid: Untyped response
const response = await fetch('/api/tabellen-eintraege');
```

This documentation provides comprehensive coverage of the Tabellen-Eintrag API endpoints and their usage patterns.