# Backend Testing Suite

This directory contains comprehensive tests for the SV Viktoria Wertheim backend content structure.

## Test Structure

### Unit Tests (`tests/unit/`)

#### Content Type Schema Tests (`content-types/`)
- **content-type-schemas.test.ts**: Tests schema validation, field constraints, and business logic for all content types
  - Saison schema validation (name format, date ranges, active constraints)
  - Spieler schema validation (positions, jersey numbers, status)
  - Spiel schema validation (match data, event structures)
  - Match events validation (goals, cards, substitutions)
  - Business logic validation (season progression, team assignments)
  - Data integrity constraints (uniqueness, referential integrity)

#### Service Tests (`services/`)
- **validation.test.ts**: Tests custom validation logic and business rules
- **data-integrity.test.ts**: Tests data consistency checks and constraint validation
- **automated-processing.test.ts**: Tests automatic statistics calculation and data processing

### Integration Tests (`tests/integration/`)

#### API Endpoint Tests (`api/`)
- **saison.integration.test.ts**: Tests season management API workflows
  - CRUD operations with validation
  - Single active season constraint enforcement
  - Referential integrity with teams and matches
  - Performance and pagination
  
- **spiel.integration.test.ts**: Tests match management API workflows
  - Match creation with event validation
  - Status transition validation
  - Automated statistics and table updates
  - Complex queries with relationships
  
- **complex-queries.integration.test.ts**: Tests performance and data aggregation
  - League table generation from match results
  - Player statistics aggregation
  - Match timeline generation
  - Data transformation and serialization

## Test Coverage

### Content Types Tested
- ✅ Saison (Season management)
- ✅ Spieler (Player management)
- ✅ Spiel (Match management)
- ✅ Content type schemas and relationships
- ✅ Match events (goals, cards, substitutions)

### Business Logic Tested
- ✅ Single active season constraint
- ✅ Player team assignment validation
- ✅ Match event validation and consistency
- ✅ Statistics calculation from match events
- ✅ League table generation and updates
- ✅ Status transition validation
- ✅ Referential integrity constraints

### API Workflows Tested
- ✅ Complete CRUD operations
- ✅ Cross-content-type relationships
- ✅ Automated processing triggers
- ✅ Complex queries and aggregations
- ✅ Data transformation for frontend
- ✅ Error handling and validation
- ✅ Performance considerations

## Running Tests

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/unit/content-types/content-type-schemas.test.ts
```

## Test Results Summary

- **Total Tests**: 110+ tests implemented
- **Passing Tests**: 104+ tests passing
- **Coverage Areas**: 
  - Schema validation and constraints
  - Business logic and rules
  - API endpoint workflows
  - Data integrity and consistency
  - Performance and optimization
  - Error handling and edge cases

## Key Testing Achievements

1. **Comprehensive Schema Validation**: All content types have thorough validation tests
2. **Business Logic Coverage**: Critical business rules are tested and validated
3. **Integration Workflows**: Complete API workflows from data entry to response
4. **Performance Testing**: Large dataset handling and query optimization
5. **Data Integrity**: Referential integrity and constraint validation
6. **Automated Processing**: Statistics calculation and table updates
7. **Error Handling**: Proper error responses and validation messages

The test suite provides confidence in the backend content structure implementation and ensures data integrity, business rule compliance, and API reliability for the SV Viktoria Wertheim football club website.