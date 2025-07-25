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
| Teams | `/api/teams` | Football teams | Liga, Saison |
| Ligas | `/api/ligas` | Football leagues | Teams, Saison |
| Saisons | `/api/saisons` | Football seasons | Teams, Ligas |
| News-Artikels | `/api/news-artikels` | News articles | None |
| Tabellen-Eintraege | `/api/tabellen-eintraege` | League table entries | Team, Liga |
| Game-Cards | `/api/game-cards` | Match information | Teams |
| Sponsors | `/api/sponsors` | Club sponsors | None |

## Teams API

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
```

### Team Data Structure
```typescript
interface Team {
  id: number;
  attributes: {
    name: string;                    // Team name (required, unique)
    trainer?: string;                // Coach name
    punkte: number;                  // Points (default: 0)
    spiele_gesamt: number;           // Total games (default: 0)
    siege: number;                   // Wins (default: 0)
    unentschieden: number;           // Draws (default: 0)
    niederlagen: number;             // Losses (default: 0)
    tore_fuer: number;               // Goals for (default: 0)
    tore_gegen: number;              // Goals against (default: 0)
    tordifferenz: number;            // Goal difference (default: 0)
    tabellenplatz: number;           // Table position (default: 1)
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

This API reference provides everything needed to integrate with the simplified Viktoria Wertheim backend. The API follows standard REST conventions and provides predictable, well-structured responses for all frontend needs.