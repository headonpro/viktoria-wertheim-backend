# API Endpoints Documentation

## Overview

This document describes all API endpoints available in the Viktoria Wertheim backend, with special focus on maintaining backward compatibility for frontend integration.

## Core Endpoints

### Tabellen-Einträge (League Table Entries)

#### GET /api/tabellen-eintraege

Retrieves league table entries with automatic calculation support.

**Query Parameters:**
- `filters[liga][id][$eq]={ligaId}` - Filter by league ID
- `filters[team][id][$eq]={teamId}` - Filter by team ID
- `populate=liga,team,team_logo` - Include related data
- `sort=platz:asc` - Sort by position (ascending)
- `pagination[page]={page}&pagination[pageSize]={size}` - Pagination

**Response Format:**
```json
{
  "data": [
    {
      "id": 1,
      "attributes": {
        "team_name": "FC Viktoria Wertheim",
        "platz": 1,
        "spiele": 10,
        "siege": 7,
        "unentschieden": 2,
        "niederlagen": 1,
        "tore_fuer": 25,
        "tore_gegen": 8,
        "tordifferenz": 17,
        "punkte": 23,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z",
        "liga": {
          "data": {
            "id": 1,
            "attributes": {
              "name": "Bezirksliga"
            }
          }
        },
        "team": {
          "data": {
            "id": 1,
            "attributes": {
              "name": "FC Viktoria Wertheim",
              "kurz_name": "FCV"
            }
          }
        }
      }
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

#### GET /api/tabellen-eintraege/:id

Retrieves a single table entry by ID.

**Response Format:**
```json
{
  "data": {
    "id": 1,
    "attributes": {
      "team_name": "FC Viktoria Wertheim",
      "platz": 1,
      "spiele": 10,
      "siege": 7,
      "unentschieden": 2,
      "niederlagen": 1,
      "tore_fuer": 25,
      "tore_gegen": 8,
      "tordifferenz": 17,
      "punkte": 23
    }
  },
  "meta": {}
}
```

### Spiele (Games/Matches)

#### GET /api/spiele

Retrieves game/match data with support for various filters.

**Query Parameters:**
- `filters[liga][id][$eq]={ligaId}` - Filter by league ID
- `filters[saison][id][$eq]={saisonId}` - Filter by season ID
- `filters[status][$eq]={status}` - Filter by status (geplant, beendet, abgesagt, verschoben)
- `filters[heim_team][id][$eq]={teamId}` - Filter by home team
- `filters[gast_team][id][$eq]={teamId}` - Filter by away team
- `filters[$or][0][heim_team][id][$eq]={teamId}&filters[$or][1][gast_team][id][$eq]={teamId}` - Filter by either team
- `populate=liga,saison,heim_team,gast_team` - Include related data
- `sort=datum:desc` - Sort by date (descending for recent games)
- `sort=datum:asc` - Sort by date (ascending for upcoming games)

**Response Format:**
```json
{
  "data": [
    {
      "id": 1,
      "attributes": {
        "datum": "2024-09-15T15:00:00.000Z",
        "heim_tore": 2,
        "gast_tore": 1,
        "spieltag": 5,
        "status": "beendet",
        "notizen": "Spannendes Spiel",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z",
        "liga": {
          "data": {
            "id": 1,
            "attributes": {
              "name": "Bezirksliga"
            }
          }
        },
        "heim_team": {
          "data": {
            "id": 1,
            "attributes": {
              "name": "FC Viktoria Wertheim",
              "kurz_name": "FCV"
            }
          }
        },
        "gast_team": {
          "data": {
            "id": 2,
            "attributes": {
              "name": "SV Wertheim",
              "kurz_name": "SVW"
            }
          }
        }
      }
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

#### GET /api/spiele/:id

Retrieves a single game by ID.

**Response Format:**
```json
{
  "data": {
    "id": 1,
    "attributes": {
      "datum": "2024-09-15T15:00:00.000Z",
      "heim_tore": 2,
      "gast_tore": 1,
      "spieltag": 5,
      "status": "beendet",
      "notizen": "Spannendes Spiel"
    }
  },
  "meta": {}
}
```

## Admin Endpoints (New)

### Table Calculation Management

#### POST /api/tabellen-eintraege/admin/recalculate

Manually triggers table recalculation for a specific league.

**Request Body:**
```json
{
  "ligaId": 1,
  "saisonId": 1
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "calc_123456",
  "message": "Calculation job queued successfully"
}
```

#### GET /api/tabellen-eintraege/admin/queue-status

Retrieves current queue status and processing information.

**Response:**
```json
{
  "queueLength": 2,
  "activeJobs": 1,
  "completedJobs": 15,
  "failedJobs": 0,
  "isPaused": false,
  "jobs": [
    {
      "id": "calc_123456",
      "ligaId": 1,
      "saisonId": 1,
      "status": "processing",
      "priority": "NORMAL",
      "createdAt": "2024-01-01T10:00:00.000Z",
      "startedAt": "2024-01-01T10:00:05.000Z"
    }
  ]
}
```

#### POST /api/tabellen-eintraege/admin/pause-automation

Pauses the automation system.

**Response:**
```json
{
  "success": true,
  "message": "Automation paused successfully"
}
```

#### POST /api/tabellen-eintraege/admin/resume-automation

Resumes the automation system.

**Response:**
```json
{
  "success": true,
  "message": "Automation resumed successfully"
}
```

### Snapshot Management

#### GET /api/tabellen-eintraege/admin/snapshots

Lists available snapshots for rollback.

**Query Parameters:**
- `ligaId={ligaId}` - Filter by league ID
- `saisonId={saisonId}` - Filter by season ID

**Response:**
```json
{
  "snapshots": [
    {
      "id": "snap_123456",
      "ligaId": 1,
      "saisonId": 1,
      "description": "Before game update",
      "createdAt": "2024-01-01T10:00:00.000Z",
      "entryCount": 16
    }
  ]
}
```

#### POST /api/tabellen-eintraege/admin/rollback

Rolls back table to a specific snapshot.

**Request Body:**
```json
{
  "snapshotId": "snap_123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Rollback completed successfully",
  "restoredEntries": 16
}
```

## Monitoring Endpoints (New)

#### GET /api/tabellen-eintraege/monitoring/health

Health check endpoint for system monitoring.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T10:00:00.000Z",
  "services": {
    "database": "healthy",
    "queue": "healthy",
    "calculations": "healthy"
  },
  "metrics": {
    "uptime": 86400,
    "totalCalculations": 150,
    "averageCalculationTime": 2.5,
    "errorRate": 0.02
  }
}
```

#### GET /api/tabellen-eintraege/monitoring/metrics

Prometheus-compatible metrics endpoint.

**Response:** (Prometheus format)
```
# HELP calculation_duration_seconds Time spent calculating tables
# TYPE calculation_duration_seconds histogram
calculation_duration_seconds_bucket{le="1"} 45
calculation_duration_seconds_bucket{le="5"} 98
calculation_duration_seconds_bucket{le="10"} 100
calculation_duration_seconds_count 100
calculation_duration_seconds_sum 250.5

# HELP queue_length Current number of jobs in queue
# TYPE queue_length gauge
queue_length 2

# HELP calculation_errors_total Total number of calculation errors
# TYPE calculation_errors_total counter
calculation_errors_total 3
```

## Backward Compatibility

### Guaranteed Compatibility

The following endpoints and response formats are guaranteed to remain unchanged:

1. **GET /api/tabellen-eintraege** - Core table data structure
2. **GET /api/tabellen-eintraege/:id** - Single entry format
3. **GET /api/spiele** - Core game data structure
4. **GET /api/spiele/:id** - Single game format

### Response Format Stability

- All existing fields in response objects will remain unchanged
- New fields may be added but will not break existing frontend code
- Error response format follows Strapi standards
- Pagination format remains consistent

### Query Parameter Compatibility

- All existing query parameters continue to work
- New optional parameters may be added
- Filter syntax remains unchanged
- Sort and populate parameters maintain same behavior

## Error Handling

### Standard Error Format

All endpoints return errors in the following format:

```json
{
  "error": {
    "status": 400,
    "name": "ValidationError",
    "message": "Invalid request parameters",
    "details": {
      "field": "liga",
      "code": "required"
    }
  }
}
```

### Common HTTP Status Codes

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (admin endpoints)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (invalid ID)
- `500` - Internal Server Error

## Performance Considerations

### Response Times

- Table data queries: < 2 seconds for leagues with < 20 teams
- Game data queries: < 1 second for typical filters
- Admin operations: < 5 seconds for manual calculations

### Caching

- Table data is cached for 5 minutes
- Game data is cached for 10 minutes
- Cache is automatically invalidated on data updates

### Rate Limiting

- Public endpoints: 100 requests per minute per IP
- Admin endpoints: 20 requests per minute per user
- Monitoring endpoints: 200 requests per minute per IP

## Migration Notes

### From Manual to Automatic Calculation

When migrating from manual table management to automatic calculation:

1. Existing table data is preserved
2. Automatic calculation can be enabled gradually per league
3. Manual override capabilities remain available
4. Rollback functionality provides safety net

### Feature Flag Support

The system supports feature flags for gradual rollout:

- `ENABLE_AUTO_CALCULATION` - Enable/disable automatic calculation
- `ENABLE_QUEUE_PROCESSING` - Enable/disable background processing
- `ENABLE_ADMIN_EXTENSIONS` - Enable/disable admin panel features

## Support and Troubleshooting

### Common Issues

1. **Table not updating** - Check queue status via admin panel
2. **Calculation errors** - Review error logs in monitoring dashboard
3. **Performance issues** - Monitor metrics endpoint for bottlenecks

### Debug Information

- All calculation operations are logged with context
- Queue status provides real-time processing information
- Health check endpoint shows system status
- Metrics endpoint provides performance data