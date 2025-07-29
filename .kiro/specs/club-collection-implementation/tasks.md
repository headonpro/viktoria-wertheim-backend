# Implementation Plan

- [x] 1. Create Club Collection Type and Schema

  - Create new Club collection type in Strapi admin
  - Define schema with all required fields (name, kurz_name, logo, club_typ, etc.)
  - Set up proper field validations and constraints
  - Configure admin panel display and search fields
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 7.1, 7.2_

- [x] 2. Populate Club Collection with initial data

  - [ ] 2.1 Create Viktoria clubs with team mappings

    - Add "SV Viktoria Wertheim" with team_1 mapping
    - Add "SV Viktoria Wertheim II" with team_2 mapping

    - Add "SpG Vikt. Wertheim 3/Grünenwort" with team_3 mapping
    - Set club_typ to "viktoria_verein" for all Viktoria clubs
    - _Requirements: 2.2, 2.3_

  - [ ] 2.2 Add all opponent clubs for each league

    - Import ~16 clubs for Kreisliga Tauberbischofsheim

    - Import ~14 clubs for Kreisklasse A Tauberbischofsheim
    - Import ~12 clubs for Kreisklasse B Tauberbischofsheim
    - Set club_typ to "gegner_verein" for all opponent clubs
    - _Requirements: 1.1, 7.3_

  - [ ] 2.3 Configure club-liga relationships

    - Set up many-to-many relations between clubs and leagues
    - Assign each club to appropriate league(s)
    - Validate that all clubs have correct league assignments
    - _Requirements: 7.3, 9.4_

- [ ] 3. Extend Spiel Collection schema

  - [ ] 3.1 Add club relation fields

    - Add heim_club relation field to Club collection
    - Add gast_club relation field to Club collection
    - Set both fields as required for new games
    - Configure admin panel to show club selection dropdowns
    - _Requirements: 3.1, 3.3_

  - [ ] 3.2 Maintain backward compatibility

    - Keep existing heim_team and gast_team fields
    - Mark old fields as deprecated in schema description
    - Ensure old games continue to work without modification
    - Add validation to require either team OR club fields

    - _Requirements: 3.2, 3.4, 8.4_

  - [ ] 3.3 Update admin panel interface

    - Create custom admin components for club selection
    - Add league-based filtering for club dropdowns

    - Implement autocomplete for club names
    - Add validation messages for club selection
    - _Requirements: 1.1, 1.2, 7.4_

- [x] 4. Extend Tabellen-Eintrag Collection schema

  - [ ] 4.1 Add club relation field

    - Add club relation field to Club collection
    - Configure population of club data including logo
    - Set up proper indexing for performance

    - Update admin panel to show club information
    - _Requirements: 4.1, 4.4_

  - [ ] 4.2 Ensure team_name uses club data

    - Modify creation logic to use club.name for team_name

    - Add validation that team_name matches club.name
    - Update existing entries to use club names where possible
    - Maintain fallback to team.name for compatibility
    - _Requirements: 4.2, 4.3_

  - [ ] 4.3 Handle logo display from clubs

    - Configure logo population from club relation
    - Update API responses to include club logos
    - Add fallback logic for entries without club logos
    - Test logo display in frontend components
    - _Requirements: 4.5_

- [ ] 5. Create Club Service

  - [ ] 5.1 Implement basic CRUD operations

    - Create ClubService with findClubsByLiga method
    - Add findViktoriaClubByTeam method for team mapping
    - Implement validateClubInLiga for game validation
    - Add getClubWithLogo method for frontend data
    - _Requirements: 1.2, 2.2, 9.4_

  - [ ] 5.2 Add club validation logic

    - Implement validateClubConsistency method
    - Add validation for viktoria_team_mapping uniqueness
    - Create validation for club-liga relationships
    - Add comprehensive error handling and messages
    - _Requirements: 1.3, 9.1, 9.2, 9.3, 9.5_

  - [ ] 5.3 Implement club caching

    - Add caching for frequently accessed club data
    - Implement cache invalidation on club updates
    - Create preloading for club-liga relationships
    - Add cache warming strategies for performance
    - _Requirements: 10.2, 10.3_

- [x] 6. Enhance Tabellen-Berechnungs-Service for clubs

  - [x] 6.1 Add club-based calculation methods

    - Create calculateClubStats method using club IDs
    - Implement getClubsInLiga method for unique club collection
    - Add createMissingClubEntries for automatic entry creation
    - Update calculateTableForLiga to handle club-based games
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 6.2 Support mixed team/club game processing

    - Modify game processing to handle both team and club relations
    - Create unified entity collection for teams and clubs
    - Implement fallback logic when club data is missing
    - Add validation for data consistency between systems
    - _Requirements: 5.3, 5.5, 8.4_

  - [x] 6.3 Update table entry creation logic

    - Modify entry creation to use club relations
    - Ensure team_name field uses club.name
    - Add club_id population in table entries
    - Implement migration logic for existing entries
    - _Requirements: 4.1, 4.2, 8.1, 8.2_

- [x] 7. Update Lifecycle Hooks for club support

  - [x] 7.1 Enhance spiel lifecycle hooks

    - Update afterCreate hook to handle club-based games
    - Modify afterUpdate hook to detect club field changes
    - Add afterDelete hook support for club-based games
    - Implement validation for club data before triggering
    - _Requirements: 1.4, 3.1, 5.4_

  - [x] 7.2 Add club-specific trigger conditions

    - Create trigger conditions for club field changes

    - Add validation that both clubs exist and are active
    - Implement liga consistency checks for club games
    - Add comprehensive error handling for club validation
    - _Requirements: 1.2, 1.3, 9.4_

  - [x] 7.3 Maintain backward compatibility

    - Keep existing team-based trigger logic
    - Add fallback processing for team-only games
    - Implement gradual migration triggers
    - Ensure no breaking changes to existing workflows
    - _Requirements: 8.4, 8.5_

- [x] 8. Enhance Frontend League Service

  - [x] 8.1 Add club mapping functions

    - Create MANNSCHAFT_CLUB_MAPPING constant
    - Implement getClubNameByTeam method
    - Add isViktoriaClub method with club name matching
    - Update VIKTORIA_CLUB_PATTERNS for accurate detection
    - _Requirements: 6.1, 6.3_

  - [x] 8.2 Update API calls for club data

    - Modify fetchLeagueStandingsByTeam to populate club relations
    - Update API parameters to include club logo population
    - Add club-based caching with appropriate cache keys
    - Implement error handling for missing club data
    - _Requirements: 6.2, 6.4, 6.5_

  - [x] 8.3 Enhance Viktoria team detection

    - Update isViktoriaTeam to use club names instead of team names
    - Add team-specific club pattern matching

    - Implement fallback to team-based detection

    - Add comprehensive testing for all team variations

    - _Requirements: 6.3, 6.5_

- [ ] 9. Create data migration utilities

  - [x] 9.1 Build team-to-club mapping migration

    - Create migration script for existing spiele records
    - Map team relations to appropriate club relations
    - Add validation for successful migration
    - Implement rollback capability for failed migrations
    - _Requirements: 8.1, 8.3_

  - [x] 9.2 Migrate existing tabellen-eintrag records

        - Update existing table entries with club relati

    ons - Ensure team*name fields use correct club names - Add club_id population for all migrated entries - Validate data consistency after migration - \_Requirements: 8.2, 8.3*

  - [x] 9.3 Create validation and cleanup tools

    - Build data integrity validation scripts
    - Create cleanup tools for orphaned records

    - Add consistency checks between team and club data

    - Implement automated data quality reports
    - _Requirements: 8.5, 9.5_

- [x] 10. Implement comprehensive validation

  - [x] 10.1 Add club data validation

    - Implement unique club name validation
    - Add viktoria_team_mapping uniqueness validation
    - Create liga-club relationship validation

    - Add comprehensive input sanitization
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 10.2 Create game validation for clubs

    - Validate that both clubs exist and are active
    - Check that clubs belong to the same league
    - Prevent clubs from playing against themselves
    - Add detailed validation error messages
    - _Requirements: 1.2, 1.3, 9.4, 9.5_

- - [x] 10.3 Add admin panel validation

    - Create real-time validation in club selection dropdowns
    - Add league-based filtering for club options
    - Implement form validation with helpful error messages
    - Add confirmation dialogs for critical operations
    - _Requirements: 7.4, 9.5_

- [x] 11. Optimize performance for club operations

  - [x] 11.1 Add database optimizations

    - Create indexes for club-related queries
    - Add materialized views for club-liga statistics
    - Implement query optimization for club lookups
    - Add connection pooling for club operations
    - _Requirements: 10.1, 10.4_

  - [x] 11.2 Implement club-specific caching

    - Add Redis caching for club data
    - Implement cache warming for frequently accessed clubs
    - Create cache invalidation strategies for club updates
    - Add cache monitoring and performance metrics
    - _Requirements: 10.2, 10.3_

  - [x] 11.3 Add performance monitoring

    - Create metrics for club operation performance
    - Add monitoring for club-based table calculations
    - Implement alerting for performance degradation
    - Add performance benchmarks and testing
    - _Requirements: 10.4, 10.5_

- [-] 12. Create comprehensive test suite

  - [x] 12.1 Write unit tests for club services

    - Test ClubService CRUD operations
    - Add validation testing for club data
    - Test club-liga relationship operations
    - Add comprehensive error handling tests
    - _Requirements: All requirements need test coverage_

  - [x] 12.2 Add integration tests for club workflows

    - Test complete game creation with clubs
    - Add table calculation testing with club data
    - Test migration workflows and data consistency
    - Add API endpoint testing for club operations
    - _Requirements: All requirements need integration testing_

  - [x] 12.3 Implement end-to-end testing

    - Test complete workflow from game entry to table display
    - Add frontend integration testing with club data
    - Test admin panel club management workflows
    - Add performance testing under realistic load
    - _Requirements: All requirements need E2E validation_

- [-] 13. Update admin panel interfaces

  - [x] 13.1 Create club management interface

    - Build comprehensive club CRUD interface
    - Add bulk import/export functionality for clubs
    - Create liga assignment management interface
    - Add club logo upload and management
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 13.2 Enhance game creation interface

    - Update game form to use club selection dropdowns
    - Add league-based filtering for club selection
    - Implement autocomplete for club names
    - Add validation feedback for club selections
    - _Requirements: 1.1, 7.4_

  - [x] 13.3 Add migration management tools

    - Create interface for monitoring migration progress
    - Add tools for manual data migration and validation
    - Implement rollback capabilities for failed migrations
    - Add data quality reporting and cleanup tools
    - _Requirements: 8.1, 8.2, 8.5_

- [-] 14. Implement monitoring and observability

  - [x] 14.1 Add club-specific metrics

    - Create metrics for club operations and performance
    - Add monitoring for club-based table calculations
    - Implement alerting for club validation errors
    - Add dashboard for club system health monitoring
    - _Requirements: 10.4, 10.5_

  - [x] 14.2 Create operational tooling

    - Build maintenance scripts for club data cleanup
    - Add backup and restore procedures for club data
    - Create diagnostic tools for club system issues
    - Implement automated health checks for club operations
    - _Requirements: 8.5, 10.1_

- [x] 15. Prepare deployment and rollout


  - [x] 15.1 Create deployment configuration

    - Set up feature flags for gradual club system rollout
    - Create environment-specific club data configurations
    - Add deployment scripts for club schema migrations

    - Implement zero-downtime deployment strategy
    - _Requirements: All requirements for production readiness_

  - [x] 15.2 Plan gradual rollout strategy

    - Create rollout plan for club collection activation
    - Plan migration schedule for existing data
    - Add monitoring and rollback procedures
    - Create user training materials for club system
    - _Requirements: Production readiness and user adoption_

  - [x] 15.3 Final integration testing and validation

    - Conduct comprehensive system testing with club data
    - Validate all error scenarios and recovery procedures
    - Test admin panel functionality with real user workflows
    - Validate performance under realistic production load
    - _Requirements: All requirements final validation_
