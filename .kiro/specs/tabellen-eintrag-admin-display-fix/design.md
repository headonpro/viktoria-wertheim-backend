# Design Document

## Overview

This design document outlines the implementation approach for fixing the Strapi Admin Panel display issue in the "Tabellen Eintrag" collection type. The solution involves a simple schema configuration change to use `team_name` as the primary display identifier instead of the `liga` relation.

## Architecture

### Current Architecture Problem

```
Strapi Admin Panel Display Logic:
┌─────────────────────────────────────┐
│ Collection: Tabellen Eintrag        │
├─────────────────────────────────────┤
│ Default Display Field: liga         │ ← Problem: Shows relation
│ Result: "Kreisliga Tauberbischofsheim" │
│ Issue: Multiple teams look identical │
└─────────────────────────────────────┘
```

### Target Architecture Solution

```
Strapi Admin Panel Display Logic:
┌─────────────────────────────────────┐
│ Collection: Tabellen Eintrag        │
├─────────────────────────────────────┤
│ Configured Display Field: team_name │ ← Solution: Use string field
│ Result: "SV Viktoria Wertheim"      │
│ Benefit: Unique team identification │
└─────────────────────────────────────┘
```

## Components and Interfaces

### Schema Configuration Component

**File:** `backend/src/api/tabellen-eintrag/content-types/tabellen-eintrag/schema.json`

**Current Structure:**
```json
{
  "kind": "collectionType",
  "collectionName": "tabellen_eintraege",
  "info": {
    "singularName": "tabellen-eintrag",
    "pluralName": "tabellen-eintraege",
    "displayName": "Tabellen Eintrag",
    "description": "League table entries with automatic position calculations and form tracking"
    // Missing: mainField configuration
  }
}
```

**Target Structure:**
```json
{
  "kind": "collectionType",
  "collectionName": "tabellen_eintraege",
  "info": {
    "singularName": "tabellen-eintrag",
    "pluralName": "tabellen-eintraege",
    "displayName": "Tabellen Eintrag",
    "description": "League table entries with automatic position calculations and form tracking",
    "mainField": "team_name"  // ← Key addition
  }
}
```

### Data Model Analysis

**Existing Attributes (Relevant for Display):**
```json
{
  "attributes": {
    "liga": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::liga.liga",
      "required": true
      // Currently used as default display field
    },
    "team_name": {
      "type": "string",
      "required": true,
      "maxLength": 100
      // Target field for display - optimal choice
    },
    "team": {
      "type": "relation",
      "relation": "manyToOne", 
      "target": "api::team.team",
      "required": false
      // Alternative but optional relation
    }
  }
}
```

**Field Selection Rationale:**
- `team_name`: ✅ Required string field, human-readable, unique per entry
- `liga`: ❌ Relation field, causes duplicate display names
- `team`: ❌ Optional relation, may be null
- `platz`: ❌ Integer, not descriptive without context

## Data Models

### Strapi Schema Info Section

```typescript
interface StrapiSchemaInfo {
  singularName: string;
  pluralName: string;
  displayName: string;
  description?: string;
  mainField?: string;  // ← This property controls admin display
}
```

**Implementation:**
```json
{
  "info": {
    "singularName": "tabellen-eintrag",
    "pluralName": "tabellen-eintraege", 
    "displayName": "Tabellen Eintrag",
    "description": "League table entries with automatic position calculations and form tracking",
    "mainField": "team_name"
  }
}
```

### Display Behavior Model

**Before Change:**
```
Admin Panel List View:
┌─────────────────────────────────┐
│ Tabellen Eintrag                │
├─────────────────────────────────┤
│ • Kreisliga Tauberbischofsheim  │ ← Team A
│ • Kreisliga Tauberbischofsheim  │ ← Team B  
│ • Kreisliga Tauberbischofsheim  │ ← Team C
│ • Bezirksliga Tauberbischofsheim│ ← Team D
└─────────────────────────────────┘
```

**After Change:**
```
Admin Panel List View:
┌─────────────────────────────────┐
│ Tabellen Eintrag                │
├─────────────────────────────────┤
│ • SV Viktoria Wertheim          │ ← Team A
│ • SV Viktoria Wertheim II       │ ← Team B
│ • FC Tauberbischofsheim         │ ← Team C  
│ • TSV Wertheim                  │ ← Team D
└─────────────────────────────────┘
```

## Error Handling

### Pre-Implementation Validation

**Data Quality Checks:**
```sql
-- Check for empty team_name fields
SELECT COUNT(*) FROM tabellen_eintraege WHERE team_name IS NULL OR team_name = '';

-- Check for team_name consistency with team relation
SELECT te.team_name, t.name 
FROM tabellen_eintraege te 
LEFT JOIN teams t ON te.team = t.id 
WHERE te.team IS NOT NULL AND te.team_name != t.name;
```

**Expected Results:**
- Zero empty team_name fields (required field constraint)
- High consistency between team_name and team.name (manual verification)

### Runtime Error Prevention

**Schema Validation:**
- `team_name` is marked as required in schema
- maxLength constraint prevents display overflow
- No additional validation needed for mainField

**Fallback Behavior:**
- If team_name is somehow empty, Strapi falls back to next available field
- Admin panel gracefully handles missing mainField configuration

### Post-Implementation Verification

**Verification Steps:**
1. Admin panel loads without errors
2. All tabellen-eintrag entries display team names
3. CRUD operations function normally
4. No performance degradation

**Error Scenarios & Handling:**
- **Browser Cache:** Clear cache if old display persists
- **Server Restart Required:** Strapi needs restart to apply schema changes
- **Invalid mainField:** Strapi ignores invalid field names gracefully

## Testing Strategy

### Pre-Implementation Testing

**Data Validation Tests:**
```javascript
// Test 1: Verify all team_name fields are populated
const emptyTeamNames = await strapi.entityService.findMany(
  'api::tabellen-eintrag.tabellen-eintrag',
  { filters: { team_name: { $null: true } } }
);
expect(emptyTeamNames).toHaveLength(0);

// Test 2: Verify team_name format consistency
const allEntries = await strapi.entityService.findMany(
  'api::tabellen-eintrag.tabellen-eintrag'
);
allEntries.forEach(entry => {
  expect(entry.team_name).toMatch(/^[A-Za-z0-9\s\-\.]+$/);
  expect(entry.team_name.length).toBeLessThanOrEqual(100);
});
```

### Implementation Testing

**Schema Change Tests:**
1. **Backup Verification:** Confirm original schema is backed up
2. **Syntax Validation:** JSON schema validates correctly
3. **Server Restart:** Strapi starts without errors after change

### Post-Implementation Testing

**Admin Panel Tests:**
```javascript
// Manual Test Cases
describe('Admin Panel Display', () => {
  test('List view shows team names', () => {
    // Navigate to Tabellen Eintrag collection
    // Verify each entry shows team name (e.g., "SV Viktoria Wertheim")
    // Verify no entries show liga names (e.g., "Kreisliga...")
  });
  
  test('Detail view maintains functionality', () => {
    // Click on any tabellen-eintrag entry
    // Verify all fields are editable
    // Verify liga information is still accessible
    // Verify save/update operations work
  });
  
  test('Search and filter work with team names', () => {
    // Use admin panel search with team name
    // Verify filtering by team_name works
    // Verify sorting by display field works
  });
});
```

**Data Integrity Tests:**
```javascript
// Automated Test Cases
describe('Data Integrity', () => {
  test('No data loss after schema change', () => {
    // Compare record counts before/after
    // Verify all fields retain their values
    // Confirm no corruption in related data
  });
  
  test('CRUD operations function normally', () => {
    // Create new tabellen-eintrag
    // Read existing entries
    // Update team statistics
    // Delete test entries
  });
});
```

### Performance Testing

**Baseline Measurements:**
- Admin panel load time for tabellen-eintrag collection
- Memory usage during list view rendering
- Database query performance for display field

**Post-Change Verification:**
- No significant increase in load times
- Memory usage remains stable
- String field display is faster than relation resolution

## Implementation Approach

### Phase 1: Preparation & Backup

**Steps:**
1. Create backup of current schema file
2. Document current admin panel behavior (screenshots)
3. Run data quality validation queries
4. Notify team of planned maintenance window

**Backup Command:**
```bash
cp backend/src/api/tabellen-eintrag/content-types/tabellen-eintrag/schema.json \
   backend/src/api/tabellen-eintrag/content-types/tabellen-eintrag/schema.json.backup
```

### Phase 2: Schema Modification

**File Change:**
```json
// Add this line to the "info" section:
"mainField": "team_name"
```

**Complete Target Configuration:**
```json
{
  "kind": "collectionType",
  "collectionName": "tabellen_eintraege",
  "info": {
    "singularName": "tabellen-eintrag",
    "pluralName": "tabellen-eintraege",
    "displayName": "Tabellen Eintrag", 
    "description": "League table entries with automatic position calculations and form tracking",
    "mainField": "team_name"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {},
  "attributes": {
    // ... existing attributes remain unchanged
  }
}
```

### Phase 3: Server Restart & Verification

**Restart Process:**
```bash
# Stop Strapi development server
# Restart with: npm run develop
# Or for production: npm run start
```

**Verification Checklist:**
- [ ] Server starts without errors
- [ ] Admin panel loads successfully
- [ ] Tabellen-eintrag collection shows team names
- [ ] All CRUD operations work
- [ ] No performance issues detected

### Rollback Plan

**If Issues Occur:**
1. Stop Strapi server
2. Restore backup schema file:
   ```bash
   cp backend/src/api/tabellen-eintrag/content-types/tabellen-eintrag/schema.json.backup \
      backend/src/api/tabellen-eintrag/content-types/tabellen-eintrag/schema.json
   ```
3. Restart server
4. Verify original behavior restored

**Risk Mitigation:**
- Change is non-destructive (no data modification)
- Rollback is immediate (file replacement + restart)
- No database migration required
- No API contract changes