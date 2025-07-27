# API Reference for Frontend Developers

## Quick Start Guide

This document provides frontend developers with everything needed to integrate with the simplified Viktoria Wertheim backend API.

## Base Configuration

### API Base URL
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
```

### Common Headers
```typescript
const headers = {
  'Content-Type': 'application/json',
  // Add Authorization header if authentication is required
  // 'Authorization': `Bearer ${token}`
};
```

## Collection Types Overview

| Collection | Endpoint | Purpose | Key Relations |
|------------|----------|---------|---------------|
| Teams | `/api/teams` | Viktoria teams only | Liga, Saison |
| Tabellen-Eintraege | `/api/tabellen-eintraege` | League table entries | Liga |
| Ligas | `/api/ligas` | Football leagues | Teams, Saison |
| Saisons | `/api/saisons` | Football seasons | Teams, Ligas |
| News-Artikels | `/api/news-artikels` | News articles | None |
| Game-Cards | `/api/game-cards` | Match information | Teams |
| Next-Game-Cards | `/api/next-game-cards` | Upcoming matches | Teams |
| Sponsors | `/api/sponsors` | Club sponsors | None |

## Tabellen-Eintraege API (League Table Entries)

### Get League Table Entries
```typescript
// Basic request - all table entries
const response = await fetch(`${API_BASE_URL}/api/tabellen-eintraege`);
const { data } = await response.json();

// Filter by league name
const response = await fetch(`${API_BASE_URL}/api/tabellen-eintraege?filters[liga][name][$eq]=Kreisliga Tauberbischofsheim&sort=platz:asc`);
const { data } = await response.json();

// Filter by league with population
const response = await fetch(`${API_BASE_URL}/api/tabellen-eintraege?filters[liga][name][$eq]=Kreisklasse A Tauberbischofsheim&populate=liga&sort=platz:asc`);
const { data } = await response.json();

// Get specific team position
const response = await fetch(`${API_BASE_URL}/api/tabellen-eintraege?filters[team_name][$contains]=Viktoria&populate=liga`);
const { data } = await response.json();
```

### Tabellen-Eintrag Data Structure
```typescript
interface TabellenEintrag {
  id: number;
  attributes: {
    team_name: string;               // Team name (required)
    platz: number;                   // Table position (required, min: 1)
    spiele: number;                  // Games played (default: 0)
    siege: number;                   // Wins (default: 0)
    unentschieden: number;           // Draws (default: 0)
    niederlagen: number;             // Losses (default: 0)
    tore_fuer: number;               // Goals for (default: 0)
    tore_gegen: number;              // Goals against (default: 0)
    tordifferenz: number;            // Goal difference (default: 0)
    punkte: number;                  // Points (default: 0)
    team_logo?: {                    // Team logo
      data?: {
        id: number;
        attributes: {
          url: string;
          alternativeText?: string;
        };
      };
    };
    liga: {                          // League relation (required)
      data: {
        id: number;
        attributes: {
          name: string;
          kurz_name: string;
        };
      };
    };
    createdAt: string;
    updatedAt: string;
  };
}
```

### Liga-Mannschaft Mapping
The system uses the following mapping between teams and leagues:

| Mannschaft | Liga | API Filter |
|------------|------|------------|
| 1. Mannschaft | Kreisliga Tauberbischofsheim | `filters[liga][name][$eq]=Kreisliga Tauberbischofsheim` |
| 2. Mannschaft | Kreisklasse A Tauberbischofsheim | `filters[liga][name][$eq]=Kreisklasse A Tauberbischofsheim` |
| 3. Mannschaft | Kreisklasse B Tauberbischofsheim | `filters[liga][name][$eq]=Kreisklasse B Tauberbischofsheim` |

### Viktoria Team Identification
The following team names are used to identify Viktoria teams in the table:

| Liga | Viktoria Team Name |
|------|-------------------|
| Kreisliga Tauberbischofsheim | `SV Viktoria Wertheim` |
| Kreisklasse A Tauberbischofsheim | `SV Viktoria Wertheim II` |
| Kreisklasse B Tauberbischofsheim | `SpG Vikt. Wertheim 3/Grünenwort` |

### Example League Service Implementation
```typescript
// services/leagueService.ts
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

export const fetchLeagueStandingsByTeam = async (teamId: '1' | '2' | '3'): Promise<TabellenEintrag[]> => {
  const ligaMapping = {
    '1': 'Kreisliga Tauberbischofsheim',
    '2': 'Kreisklasse A Tauberbischofsheim',
    '3': 'Kreisklasse B Tauberbischofsheim'
  };
  
  const ligaName = ligaMapping[teamId];
  return fetchLeagueStandingsByLiga(ligaName);
};

// Transform to frontend Team format for compatibility
export const transformTabellenEintragToTeam = (entry: TabellenEintrag): Team => {
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
};
```

### Example Component Usage
```typescript
const LeagueTable = ({ selectedTeam }: { selectedTeam: '1' | '2' | '3' }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [leagueName, setLeagueName] = useState<string>('');
  
  useEffect(() => {
    const fetchLeagueData = async () => {
      try {
        const tabellenEintraege = await fetchLeagueStandingsByTeam(selectedTeam);
        const transformedTeams = tabellenEintraege.map(transformTabellenEintragToTeam);
        
        setTeams(transformedTeams);
        if (tabellenEintraege.length > 0) {
          setLeagueName(tabellenEintraege[0].attributes.liga.data.attributes.name);
        }
      } catch (error) {
        console.error('Failed to fetch league data:', error);
      }
    };
    
    fetchLeagueData();
  }, [selectedTeam]);
  
  const isViktoriaTeam = (teamName: string, teamId: string): boolean => {
    const viktoriaPatterns = {
      '1': ['SV Viktoria Wertheim', 'Viktoria Wertheim'],
      '2': ['SV Viktoria Wertheim II', 'Viktoria Wertheim II'],
      '3': ['SpG Vikt. Wertheim 3/Grünenwort', 'Viktoria Wertheim III']
    };
    
    return viktoriaPatterns[teamId as keyof typeof viktoriaPatterns]?.some(pattern => 
      teamName.includes(pattern)
    ) || false;
  };
  
  return (
    <div>
      <h2>{leagueName}</h2>
      <table>
        <thead>
          <tr>
            <th>Platz</th>
            <th>Team</th>
            <th>Spiele</th>
            <th>Punkte</th>
            <th>Tore</th>
          </tr>
        </thead>
        <tbody>
          {teams.map(team => (
            <tr 
              key={team.id}
              className={isViktoriaTeam(team.attributes.name, selectedTeam) ? 'viktoria-highlight' : ''}
            >
              <td>{team.attributes.tabellenplatz}</td>
              <td>{team.attributes.name}</td>
              <td>{team.attributes.spiele_gesamt}</td>
              <td>{team.attributes.punkte}</td>
              <td>{team.attributes.tore_fuer}:{team.attributes.tore_gegen}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

## Teams API (Viktoria Teams Only)

### Get All Teams
```typescript
// Basic request
const response = await fetch(`${API_BASE_URL}/api/teams`);
const { data } = await response.json();

// With relations
const response = await fetch(`${API_BASE_URL}/api/teams?populate=liga,saison`);
const { data } = await response.json();

// With filters
const response = await fetch(`${API_BASE_URL}/api/teams?filters[liga][id][$eq]=1&sort=tabellenplatz:asc`);
const { data } = await response.json();

// Filter by team type
const response = await fetch(`${API_BASE_URL}/api/teams?filters[team_typ][$eq]=viktoria_mannschaft`);
const { data } = await response.json();

// Filter by league name
const response = await fetch(`${API_BASE_URL}/api/teams?filters[liga_name][$eq]=Kreisliga Tauberbischofsheim`);
const { data } = await response.json();
```

### Team Data Structure (Viktoria Teams Only)
```typescript
interface Team {
  id: number;
  attributes: {
    name: string;                    // Team name (required, unique)
    trainer?: string;                // Coach name
    form_letzte_5?: string;          // Form of last 5 games (S/U/N, max 5 chars)
    team_typ?: 'viktoria_mannschaft' | 'gegner_verein'; // Team type (default: viktoria_mannschaft)
    trend?: 'up' | 'down' | 'stable'; // Team trend indicator
    teamfoto?: {                     // Team photo
      data?: {
        id: number;
        attributes: {
          url: string;
          alternativeText?: string;
        };
      };
    };
    liga?: {                         // League relation
      data?: {
        id: number;
        attributes: {
          name: string;
          kurz_name: string;
        };
      };
    };
    saison?: {                       // Season relation
      data?: {
        id: number;
        attributes: {
          name: string;
          aktiv: boolean;
        };
      };
    };
    createdAt: string;
    updatedAt: string;
  };
}

// Note: Table statistics (punkte, spiele_gesamt, siege, etc.) have been moved to Tabellen-Eintraege
// Teams now only contain Viktoria-specific information like trainer, form, and trend
```
```

### Example Usage in React
```typescript
// TeamService.ts
export const getTeamsByLeague = async (ligaId: number): Promise<Team[]> => {
  const response = await fetch(
    `${API_BASE_URL}/api/teams?filters[liga][id][$eq]=${ligaId}&populate=liga,saison&sort=tabellenplatz:asc`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch teams');
  }
  
  const { data } = await response.json();
  return data;
};

// Component usage
const LeagueTable = ({ ligaId }: { ligaId: number }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  
  useEffect(() => {
    getTeamsByLeague(ligaId)
      .then(setTeams)
      .catch(console.error);
  }, [ligaId]);
  
  return (
    <div>
      {teams.map(team => (
        <div key={team.id}>
          <h3>{team.attributes.name}</h3>
          <p>Position: {team.attributes.tabellenplatz}</p>
          <p>Points: {team.attributes.punkte}</p>
          <p>Goals: {team.attributes.tore_fuer}:{team.attributes.tore_gegen}</p>
        </div>
      ))}
    </div>
  );
};
```

## Ligas API

### Get All Leagues
```typescript
// Basic request
const response = await fetch(`${API_BASE_URL}/api/ligas`);

// With teams
const response = await fetch(`${API_BASE_URL}/api/ligas?populate=teams,saison`);
```

### Liga Data Structure
```typescript
interface Liga {
  id: number;
  attributes: {
    name: string;                    // League name (required)
    kurz_name: string;               // Short name (required)
    saison?: {                       // Season relation
      data?: {
        id: number;
        attributes: {
          name: string;
          aktiv: boolean;
        };
      };
    };
    teams?: {                        // Teams relation
      data?: Array<{
        id: number;
        attributes: {
          name: string;
          tabellenplatz: number;
        };
      }>;
    };
    createdAt: string;
    updatedAt: string;
  };
}
```

## Saisons API

### Get Current Season
```typescript
// Get active season
const response = await fetch(`${API_BASE_URL}/api/saisons?filters[aktiv][$eq]=true&populate=ligas,teams`);
const { data } = await response.json();
const currentSeason = data[0]; // Should be only one active season
```

### Saison Data Structure
```typescript
interface Saison {
  id: number;
  attributes: {
    name: string;                    // Season name (required, unique)
    start_datum: string;             // Start date (required)
    end_datum: string;               // End date (required)
    aktiv: boolean;                  // Active status (required, default: false)
    ligas?: {                        // Leagues relation
      data?: Array<{
        id: number;
        attributes: {
          name: string;
          kurz_name: string;
        };
      }>;
    };
    teams?: {                        // Teams relation
      data?: Array<{
        id: number;
        attributes: {
          name: string;
        };
      }>;
    };
    createdAt: string;
    updatedAt: string;
  };
}
```

## News API

### Get Latest News
```typescript
// Get recent news
const response = await fetch(`${API_BASE_URL}/api/news-artikels?sort=datum:desc&pagination[limit]=10`);

// Get featured news
const response = await fetch(`${API_BASE_URL}/api/news-artikels?filters[featured][$eq]=true&sort=datum:desc`);
```

### News Data Structure
```typescript
interface NewsArtikel {
  id: number;
  attributes: {
    titel: string;                   // Title (required)
    inhalt: string;                  // Rich text content (required)
    datum: string;                   // Publication date (required)
    autor: string;                   // Author (required)
    featured: boolean;               // Featured flag (default: false)
    slug: string;                    // URL slug (auto-generated)
    titelbild?: {                    // Title image
      data?: {
        id: number;
        attributes: {
          url: string;
          alternativeText?: string;
        };
      };
    };
    publishedAt?: string;            // Published date (if draft/publish enabled)
    createdAt: string;
    updatedAt: string;
  };
}
```

### Example News Component
```typescript
const NewsList = () => {
  const [news, setNews] = useState<NewsArtikel[]>([]);
  
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/news-artikels?sort=datum:desc&pagination[limit]=5`)
      .then(res => res.json())
      .then(({ data }) => setNews(data))
      .catch(console.error);
  }, []);
  
  return (
    <div>
      {news.map(article => (
        <article key={article.id}>
          <h2>{article.attributes.titel}</h2>
          <p>By {article.attributes.autor} on {new Date(article.attributes.datum).toLocaleDateString()}</p>
          {article.attributes.titelbild?.data && (
            <img 
              src={`${API_BASE_URL}${article.attributes.titelbild.data.attributes.url}`}
              alt={article.attributes.titelbild.data.attributes.alternativeText || article.attributes.titel}
            />
          )}
          <div dangerouslySetInnerHTML={{ __html: article.attributes.inhalt }} />
        </article>
      ))}
    </div>
  );
};
```

## Common Query Parameters

### Filtering
```typescript
// Filter by field value
?filters[field][$eq]=value

// Filter by relation
?filters[liga][id][$eq]=1

// Multiple filters
?filters[aktiv][$eq]=true&filters[featured][$eq]=true

// Date filters
?filters[datum][$gte]=2024-01-01
?filters[datum][$lte]=2024-12-31
```

### Sorting
```typescript
// Single field ascending
?sort=name:asc

// Single field descending  
?sort=datum:desc

// Multiple fields
?sort=tabellenplatz:asc,punkte:desc
```

### Pagination
```typescript
// Page-based pagination
?pagination[page]=1&pagination[pageSize]=10

// Offset-based pagination
?pagination[start]=0&pagination[limit]=10
```

### Population (Relations)
```typescript
// Single relation
?populate=liga

// Multiple relations
?populate=liga,saison

// Nested population
?populate[liga][populate]=saison

// All relations (use carefully)
?populate=*
```

### Field Selection
```typescript
// Select specific fields
?fields=name,punkte,tabellenplatz

// Select fields from relations
?fields=name&populate[liga][fields]=name,kurz_name
```

## Error Handling

### Standard Error Response
```typescript
interface StrapiError {
  error: {
    status: number;
    name: string;
    message: string;
    details?: any;
  };
}
```

### Example Error Handling
```typescript
const fetchWithErrorHandling = async (url: string) => {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData: StrapiError = await response.json();
      throw new Error(`API Error: ${errorData.error.message}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};
```

## Image Handling

### Image URLs
```typescript
// Full image URL
const imageUrl = `${API_BASE_URL}${image.data.attributes.url}`;

// With responsive formats (if enabled)
const formats = image.data.attributes.formats;
const thumbnailUrl = formats?.thumbnail?.url ? `${API_BASE_URL}${formats.thumbnail.url}` : imageUrl;
```

### Example Image Component
```typescript
interface StrapiImage {
  data?: {
    id: number;
    attributes: {
      url: string;
      alternativeText?: string;
      formats?: {
        thumbnail?: { url: string };
        small?: { url: string };
        medium?: { url: string };
        large?: { url: string };
      };
    };
  };
}

const StrapiImageComponent = ({ image, alt, className }: {
  image: StrapiImage;
  alt?: string;
  className?: string;
}) => {
  if (!image.data) return null;
  
  const { url, alternativeText, formats } = image.data.attributes;
  const imageUrl = `${API_BASE_URL}${url}`;
  
  return (
    <img
      src={imageUrl}
      alt={alt || alternativeText || ''}
      className={className}
      loading="lazy"
    />
  );
};
```

## TypeScript Service Example

### Complete Service Implementation
```typescript
// services/strapiService.ts
class StrapiService {
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
      const error: StrapiError = await response.json();
      throw new Error(`API Error: ${error.error.message}`);
    }
    
    return response.json();
  }
  
  // Teams
  async getTeams(params?: string): Promise<{ data: Team[] }> {
    return this.request(`/api/teams${params ? `?${params}` : ''}`);
  }
  
  async getTeam(id: number, params?: string): Promise<{ data: Team }> {
    return this.request(`/api/teams/${id}${params ? `?${params}` : ''}`);
  }
  
  async getTeamsByLeague(ligaId: number): Promise<{ data: Team[] }> {
    return this.request(`/api/teams?filters[liga][id][$eq]=${ligaId}&populate=liga,saison&sort=tabellenplatz:asc`);
  }
  
  // Leagues
  async getLeagues(params?: string): Promise<{ data: Liga[] }> {
    return this.request(`/api/ligas${params ? `?${params}` : ''}`);
  }
  
  // Seasons
  async getCurrentSeason(): Promise<{ data: Saison[] }> {
    return this.request('/api/saisons?filters[aktiv][$eq]=true&populate=ligas,teams');
  }
  
  // News
  async getNews(params?: string): Promise<{ data: NewsArtikel[] }> {
    return this.request(`/api/news-artikels${params ? `?${params}` : ''}`);
  }
  
  async getLatestNews(limit: number = 5): Promise<{ data: NewsArtikel[] }> {
    return this.request(`/api/news-artikels?sort=datum:desc&pagination[limit]=${limit}`);
  }
  
  async getFeaturedNews(): Promise<{ data: NewsArtikel[] }> {
    return this.request('/api/news-artikels?filters[featured][$eq]=true&sort=datum:desc');
  }
}

export const strapiService = new StrapiService();
```

## Best Practices

### 1. Error Handling
- Always handle API errors gracefully
- Provide user-friendly error messages
- Log errors for debugging

### 2. Loading States
- Show loading indicators during API calls
- Handle empty states appropriately
- Implement proper error boundaries

### 3. Caching
- Use React Query or SWR for data fetching
- Implement appropriate cache invalidation
- Consider using Strapi's built-in caching

### 4. Performance
- Use pagination for large datasets
- Implement lazy loading for images
- Only populate relations when needed

### 5. Type Safety
- Use TypeScript interfaces for all API responses
- Validate API responses at runtime if needed
- Keep types in sync with backend schema

## Game Cards API

### Get All Game Cards
```typescript
// Basic request
const response = await fetch(`${API_BASE_URL}/api/game-cards`);
const { data } = await response.json();

// Filter by team (mannschaft) - NEW FEATURE
const response = await fetch(`${API_BASE_URL}/api/game-cards?filters[mannschaft][$eq]=m1`);
const { data } = await response.json();

// Filter by different teams
const response = await fetch(`${API_BASE_URL}/api/game-cards?filters[mannschaft][$eq]=m2`);
const response = await fetch(`${API_BASE_URL}/api/game-cards?filters[mannschaft][$eq]=m3`);
```

### Game Card Data Structure
```typescript
interface GameCard {
  id: number;
  attributes: {
    datum: string;                   // Match date (required)
    gegner: string;                  // Opponent name (required)
    ist_heimspiel: boolean;          // Home game flag (required, default: true)
    unsere_tore?: number;            // Our goals (optional)
    gegner_tore?: number;            // Opponent goals (optional)
    mannschaft: 'm1' | 'm2' | 'm3'; // Team identifier (required, default: 'm1')
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
  };
}
```

### Next Game Cards API

```typescript
// Basic request with population
const response = await fetch(`${API_BASE_URL}/api/next-game-cards?populate=gegner_team`);
const { data } = await response.json();

// Filter by team (mannschaft) - NEW FEATURE
const response = await fetch(`${API_BASE_URL}/api/next-game-cards?filters[mannschaft][$eq]=m1&populate=gegner_team`);
const { data } = await response.json();

// Filter by different teams
const response = await fetch(`${API_BASE_URL}/api/next-game-cards?filters[mannschaft][$eq]=m2&populate=gegner_team`);
const response = await fetch(`${API_BASE_URL}/api/next-game-cards?filters[mannschaft][$eq]=m3&populate=gegner_team`);
```

### Next Game Card Data Structure
```typescript
interface NextGameCard {
  id: number;
  attributes: {
    datum: string;                   // Match date (required)
    ist_heimspiel: boolean;          // Home game flag (required, default: true)
    mannschaft: 'm1' | 'm2' | 'm3'; // Team identifier (required, default: 'm1')
    gegner_team?: {                  // Opponent team relation
      data?: {
        id: number;
        attributes: {
          name: string;
          logo?: {
            data?: {
              id: number;
              attributes: {
                url: string;
                alternativeText?: string;
              };
            };
          };
        };
      };
    };
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
  };
}
```

### Team ID Mapping
The API uses technical team identifiers that map to user-facing team names:

| Technical ID | Team Name | Frontend Display |
|--------------|-----------|------------------|
| `m1` | 1. Mannschaft | 1. Mannschaft |
| `m2` | 2. Mannschaft | 2. Mannschaft |
| `m3` | 3. Mannschaft | 3. Mannschaft |

### Example Game Cards Service
```typescript
// services/gameCardsService.ts
export const getGameCardsByTeam = async (teamId: 'm1' | 'm2' | 'm3'): Promise<GameCard[]> => {
  const response = await fetch(
    `${API_BASE_URL}/api/game-cards?filters[mannschaft][$eq]=${teamId}&sort=datum:desc`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch game cards');
  }
  
  const { data } = await response.json();
  return data;
};

export const getNextGameByTeam = async (teamId: 'm1' | 'm2' | 'm3'): Promise<NextGameCard | null> => {
  const response = await fetch(
    `${API_BASE_URL}/api/next-game-cards?filters[mannschaft][$eq]=${teamId}&populate=gegner_team&sort=datum:asc&pagination[limit]=1`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch next game');
  }
  
  const { data } = await response.json();
  return data[0] || null;
};

// Combined service for frontend components
export const getLastAndNextGame = async (teamId: 'm1' | 'm2' | 'm3') => {
  const [lastGames, nextGames] = await Promise.all([
    getGameCardsByTeam(teamId),
    getNextGameByTeam(teamId)
  ]);
  
  return {
    lastGame: lastGames[0] || null,
    nextGame: nextGames
  };
};
```

### Example Component Usage
```typescript
const GameCards = ({ selectedTeam }: { selectedTeam: 'm1' | 'm2' | 'm3' }) => {
  const [gameData, setGameData] = useState<{
    lastGame: GameCard | null;
    nextGame: NextGameCard | null;
  }>({ lastGame: null, nextGame: null });
  
  useEffect(() => {
    getLastAndNextGame(selectedTeam)
      .then(setGameData)
      .catch(console.error);
  }, [selectedTeam]);
  
  return (
    <div>
      {gameData.lastGame && (
        <div>
          <h3>Last Game</h3>
          <p>{gameData.lastGame.attributes.gegner}</p>
          <p>{gameData.lastGame.attributes.unsere_tore}:{gameData.lastGame.attributes.gegner_tore}</p>
        </div>
      )}
      
      {gameData.nextGame && (
        <div>
          <h3>Next Game</h3>
          <p>{gameData.nextGame.attributes.gegner_team?.data?.attributes.name}</p>
          <p>{new Date(gameData.nextGame.attributes.datum).toLocaleDateString()}</p>
        </div>
      )}
    </div>
  );
};
```

## Spieler-Statistiks API

### Get Top Scorers
```typescript
// Get all player statistics
const response = await fetch(`${API_BASE_URL}/api/spieler-statistiks?sort=tore:desc`);
const { data } = await response.json();

// Get top 10 scorers
const response = await fetch(`${API_BASE_URL}/api/spieler-statistiks?sort=tore:desc&pagination[limit]=10`);
const { data } = await response.json();

// Get only Viktoria players
const response = await fetch(`${API_BASE_URL}/api/spieler-statistiks?filters[ist_viktoria_spieler][$eq]=true&sort=tore:desc`);
const { data } = await response.json();
```

### Spieler-Statistik Data Structure
```typescript
interface SpielerStatistik {
  id: number;
  attributes: {
    name: string;                    // Player full name (required)
    team_name: string;               // Team name as string (required)
    tore: number;                    // Goals scored (default: 0)
    spiele: number;                  // Games played (default: 0)
    ist_viktoria_spieler: boolean;   // Is Viktoria player (default: false)
    createdAt: string;
    updatedAt: string;
  };
}
```

### Example Usage
```typescript
// TopScorersService.ts
export const getTopScorers = async (limit: number = 10): Promise<SpielerStatistik[]> => {
  const response = await fetch(
    `${API_BASE_URL}/api/spieler-statistiks?sort=tore:desc&pagination[limit]=${limit}`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch top scorers');
  }
  
  const { data } = await response.json();
  return data;
};

// Component usage
const TopScorers = () => {
  const [topScorers, setTopScorers] = useState<SpielerStatistik[]>([]);
  
  useEffect(() => {
    getTopScorers(10)
      .then(setTopScorers)
      .catch(console.error);
  }, []);
  
  return (
    <div>
      {topScorers.map(player => (
        <div key={player.id} className={player.attributes.ist_viktoria_spieler ? 'viktoria-player' : ''}>
          <h3>{player.attributes.name}</h3>
          <p>Team: {player.attributes.team_name}</p>
          <p>Goals: {player.attributes.tore} in {player.attributes.spiele} games</p>
        </div>
      ))}
    </div>
  );
};
```

## Additional Documentation

### Detailed API Documentation
- **[Tabellen-Eintrag API Documentation](./docs/TABELLEN_EINTRAG_API_DOCUMENTATION.md)** - Comprehensive guide for the new league table endpoints
- **[Liga-Tabellen Content Manager Guide](./docs/LIGA_TABELLEN_CONTENT_MANAGER_GUIDE.md)** - Guide for content managers using Strapi Admin
- **[Liga-Tabellen Strapi Admin Guide](./docs/LIGA_TABELLEN_STRAPI_ADMIN_GUIDE.md)** - Technical implementation guide for Strapi admin interface

### Migration Notes
The Liga-Tabellen-System has been migrated from Team-based table statistics to a dedicated Tabellen-Eintrag collection type:

- ✅ **Use**: `/api/tabellen-eintraege` for all league table data
- ❌ **Deprecated**: Table statistics fields in `/api/teams` (removed)
- ✅ **Teams API**: Now only contains Viktoria-specific data (trainer, form, trend)

### Liga-Mannschaft Quick Reference
| Team | League | API Filter |
|------|--------|------------|
| 1. Mannschaft | Kreisliga Tauberbischofsheim | `filters[liga][name][$eq]=Kreisliga Tauberbischofsheim` |
| 2. Mannschaft | Kreisklasse A Tauberbischofsheim | `filters[liga][name][$eq]=Kreisklasse A Tauberbischofsheim` |
| 3. Mannschaft | Kreisklasse B Tauberbischofsheim | `filters[liga][name][$eq]=Kreisklasse B Tauberbischofsheim` |

This API reference provides everything needed to integrate with the simplified Viktoria Wertheim backend. The API follows standard REST conventions and provides predictable, well-structured responses for all frontend needs.