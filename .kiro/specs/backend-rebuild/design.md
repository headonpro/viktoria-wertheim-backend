# Design Document

## Overview

This design outlines the complete rebuild of the Strapi backend for the Viktoria Wertheim football club website. The approach focuses on a clean installation that maintains API compatibility with the existing frontend while resolving all admin panel issues through a fresh start.

## Architecture

### System Architecture
```
Frontend (Next.js) ←→ API Gateway ←→ Strapi Backend ←→ SQLite Database
     (unchanged)         (CORS)        (rebuilt)        (new)
```

### Backend Structure
```
viktoria-wertheim-backend/
├── src/
│   ├── api/                    # Content type definitions
│   │   ├── news/
│   │   ├── mannschaft/
│   │   ├── spieler/
│   │   ├── spiel/
│   │   └── sponsor/
│   ├── components/             # Reusable components
│   └── extensions/             # Custom extensions
├── config/                     # Strapi configuration
│   ├── admin.ts
│   ├── api.ts
│   ├── database.ts
│   ├── middlewares.ts
│   ├── plugins.ts
│   └── server.ts
├── database/                   # SQLite database files
├── public/                     # File uploads
└── types/                      # TypeScript definitions
```

## Components and Interfaces

### Content Type Definitions

#### News Content Type
```typescript
interface News {
  id: number;
  title: string;
  content: string;
  publishedAt: Date;
  slug: string;
  featuredImage?: Media;
  excerpt?: string;
}
```

#### Mannschaft (Team) Content Type
```typescript
interface Mannschaft {
  id: number;
  name: string;
  liga: string;
  description?: string;
  teamPhoto?: Media;
  spieler?: Spieler[];
}
```

#### Spieler (Player) Content Type
```typescript
interface Spieler {
  id: number;
  name: string;
  position: string;
  rueckennummer?: number;
  mannschaft?: Mannschaft;
  photo?: Media;
}
```

#### Spiel (Match) Content Type
```typescript
interface Spiel {
  id: number;
  heimmannschaft: string;
  gastmannschaft: string;
  datum: Date;
  ergebnis?: string;
  spielort?: string;
  mannschaft?: Mannschaft;
}
```

#### Sponsor Content Type
```typescript
interface Sponsor {
  id: number;
  name: string;
  logo: Media;
  website?: string;
  kategorie: 'hauptsponsor' | 'partner' | 'foerderer';
}
```

### API Endpoints

All endpoints will follow RESTful conventions:
- `GET /api/news` - List all news articles
- `GET /api/news/:id` - Get specific news article
- `GET /api/mannschaften` - List all teams
- `GET /api/spieler` - List all players
- `GET /api/spiele` - List all matches
- `GET /api/sponsors` - List all sponsors

### Configuration Components

#### Database Configuration
- SQLite for development environment
- Connection pooling and optimization settings
- Automatic migration handling

#### CORS Configuration
```typescript
{
  origin: [
    'http://localhost:3000',    // Development frontend
    'https://viktoria-wertheim.vercel.app'  // Production frontend
  ],
  credentials: true
}
```

#### Admin Panel Configuration
- Fresh admin user creation
- Role-based permissions
- Content management interface

## Data Models

### Relationships
- Mannschaft → hasMany → Spieler
- Mannschaft → hasMany → Spiel
- Spieler → belongsTo → Mannschaft
- Spiel → belongsTo → Mannschaft

### Field Validations
- Required fields: name, title (where applicable)
- String length limits for performance
- Date format validation for matches
- Enum validation for positions and categories

### Media Handling
- Image upload for team photos, player photos, sponsor logos
- Automatic image optimization
- File size and format restrictions

## Error Handling

### API Error Responses
```typescript
interface ErrorResponse {
  error: {
    status: number;
    name: string;
    message: string;
    details?: any;
  };
}
```

### Common Error Scenarios
- 404: Content not found
- 400: Invalid request parameters
- 500: Server configuration issues
- 403: Permission denied

### Logging Strategy
- Request/response logging
- Error tracking and monitoring
- Performance metrics collection

## Testing Strategy

### Unit Testing
- Content type validation tests
- API endpoint response tests
- Database connection tests

### Integration Testing
- Frontend-backend API communication
- CORS functionality verification
- Admin panel accessibility tests

### Data Validation Testing
- Content creation and retrieval
- Relationship integrity tests
- File upload functionality

### Performance Testing
- API response time benchmarks
- Database query optimization
- Memory usage monitoring

## Migration Strategy

### Cleanup Phase
1. Backup any essential configuration
2. Remove existing Strapi installation
3. Clear database files
4. Preserve frontend-specific configurations

### Installation Phase
1. Fresh Strapi 5+ installation
2. TypeScript configuration setup
3. Database initialization
4. Admin panel setup

### Configuration Phase
1. Content type creation
2. API permissions setup
3. CORS configuration
4. Plugin installation if needed

### Verification Phase
1. Admin panel functionality test
2. API endpoint testing
3. Frontend integration verification
4. Data seeding and validation