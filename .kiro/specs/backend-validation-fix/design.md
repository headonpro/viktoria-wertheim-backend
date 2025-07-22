# Design Document

## Overview

The validation error "Invalid status" when creating Mannschaft entries through the Strapi admin interface is caused by a discrepancy between the admin panel's validation logic and the API's validation logic. While the API correctly accepts the enum values defined in the schema (`aktiv`, `inaktiv`, `aufgeloest`), the admin interface appears to be using different validation rules or has cached outdated validation information.

The issue manifests specifically in the admin interface while API calls via scripts work perfectly, indicating this is a frontend validation or admin panel configuration issue rather than a core schema problem.

## Architecture

### Current System State
- **Schema Definition**: Correctly defines status enum as `["aktiv", "inaktiv", "aufgeloest"]`
- **API Layer**: Functions correctly, accepts valid enum values
- **Database Layer**: Stores data correctly when created via API
- **Admin Interface**: Fails validation with "Invalid status" error

### Root Cause Analysis
Based on the research conducted, the issue likely stems from one of these causes:
1. **Admin Panel Cache**: Strapi admin panel has cached old validation rules
2. **Schema Compilation**: Admin interface is using outdated compiled schema
3. **Enum Validation Mismatch**: Different validation logic between API and admin
4. **Database Constraint Issues**: Database-level constraints conflicting with schema

## Components and Interfaces

### 1. Schema Validation Component
**Purpose**: Ensure schema consistency across all layers
- Validate that `mannschaft/schema.json` contains correct enum definitions
- Verify that compiled TypeScript types match schema definitions
- Check that database constraints align with schema requirements

### 2. Admin Panel Validation Component  
**Purpose**: Fix admin interface validation logic
- Clear admin panel cache and rebuild validation rules
- Restart Strapi development server to reload schema
- Verify admin interface uses current schema definitions

### 3. Database Integrity Component
**Purpose**: Ensure database layer consistency
- Check existing data for invalid enum values
- Update any records with invalid status values
- Verify database constraints match schema definitions

### 4. API Consistency Component
**Purpose**: Maintain API validation consistency
- Test API endpoints with all valid enum values
- Verify API validation matches schema definitions
- Ensure consistent behavior between create/update operations

## Data Models

### Mannschaft Schema Validation
```json
{
  "status": {
    "type": "enumeration",
    "enum": ["aktiv", "inaktiv", "aufgeloest"]
  },
  "liga": {
    "type": "enumeration", 
    "enum": ["Kreisklasse B", "Kreisklasse A", "Kreisliga", "Landesliga"]
  }
}
```

### Validation Test Cases
- **Valid Status Values**: `aktiv`, `inaktiv`, `aufgeloest`
- **Invalid Status Values**: `active`, `inactive`, `dissolved`, `null`, `undefined`
- **Valid Liga Values**: `Kreisklasse B`, `Kreisklasse A`, `Kreisliga`, `Landesliga`
- **Edge Cases**: Empty strings, case variations, special characters

## Error Handling

### Admin Interface Error Handling
- Provide clear, specific error messages for validation failures
- Display available enum options when validation fails
- Implement client-side validation to prevent invalid submissions
- Show loading states during validation processes

### API Error Handling
- Return consistent error formats for validation failures
- Include field-specific error details in responses
- Maintain error message consistency between admin and API
- Log validation errors for debugging purposes

### Database Error Handling
- Handle constraint violations gracefully
- Provide rollback mechanisms for failed updates
- Validate data integrity before and after operations
- Generate detailed error reports for troubleshooting

## Testing Strategy

### 1. Schema Validation Testing
- Verify schema file syntax and structure
- Test enum value definitions against TypeScript types
- Validate schema compilation process
- Check for schema version mismatches

### 2. Admin Interface Testing
- Test Mannschaft creation through admin panel
- Verify all enum values are accepted
- Test form validation behavior
- Check error message accuracy and clarity

### 3. API Endpoint Testing
- Test POST `/api/mannschaften` with valid data
- Test PUT `/api/mannschaften/:id` with enum updates
- Verify consistent validation across all endpoints
- Test edge cases and invalid data handling

### 4. Database Integration Testing
- Verify data persistence with valid enum values
- Test constraint enforcement at database level
- Check data integrity after updates
- Validate migration and seeding processes

### 5. End-to-End Testing
- Create Mannschaft via admin interface
- Verify data appears correctly in API responses
- Test frontend display of created data
- Validate complete workflow functionality

## Implementation Approach

### Phase 1: Diagnostic Analysis
1. Run comprehensive validation tests on current system
2. Identify specific validation failure points
3. Document discrepancies between admin and API validation
4. Analyze database state and constraints

### Phase 2: Schema Consistency Fix
1. Verify and update schema definitions if needed
2. Rebuild TypeScript types from schema
3. Clear Strapi build cache and restart server
4. Validate schema compilation process

### Phase 3: Data Integrity Repair
1. Scan existing database records for invalid enum values
2. Update any records with invalid status or liga values
3. Verify database constraints match schema requirements
4. Test data integrity after repairs

### Phase 4: Validation Testing
1. Test admin interface with all valid enum combinations
2. Verify API consistency with admin interface behavior
3. Run comprehensive test suite on all validation scenarios
4. Document successful validation workflows

### Phase 5: Preventive Measures
1. Implement automated validation tests
2. Create monitoring for validation consistency
3. Document troubleshooting procedures
4. Establish validation best practices

## Technical Considerations

### Strapi-Specific Issues
- Admin panel caching can cause validation inconsistencies
- Schema changes require server restart to take effect
- TypeScript type generation may lag behind schema updates
- Database migrations can introduce constraint mismatches

### Development Environment Factors
- SQLite vs PostgreSQL validation differences
- Local development vs production environment variations
- Node.js version compatibility with Strapi validation
- Package dependency conflicts affecting validation

### Performance Implications
- Schema validation overhead in admin interface
- Database constraint checking performance
- API response time impact of validation logic
- Frontend validation vs backend validation trade-offs

## Success Criteria

1. **Admin Interface**: Successfully create and edit Mannschaft entries without validation errors
2. **API Consistency**: Admin interface and API produce identical validation results
3. **Data Integrity**: All existing and new Mannschaft records have valid enum values
4. **Error Clarity**: Clear, actionable error messages for any validation failures
5. **Documentation**: Complete troubleshooting guide for future validation issues