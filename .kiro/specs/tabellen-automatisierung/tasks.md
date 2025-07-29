# Implementation Plan

- [x] 1. Setup project structure and core interfaces

  - Create directory structure for automation services
  - Define TypeScript interfaces for all services
  - Set up error handling types and enums
  - Create configuration files for queue and caching
  - _Requirements: 1.1, 4.4, 6.1_

- [x] 2. Implement validation service

  - [x] 2.1 Create validation service with input sanitization

    - Write ValidationService class with validateSpielResult method
    - Implement score validation (non-negative integers)

    - Add team consistency validation (team cannot play against itself)

    - Create ValidationError and ValidationResult interfaces
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 2.2 Add comprehensive validation rules

    - Implement status transition validation (geplant -> beendet)
    - Add required field validation for completed games
    - Create validation for spieltag ranges (1-34)
    - Write unit tests for all validation scenarios
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 3. Create tabellen-berechnungs-service

  - [x] 3.1 Implement core calculation logic

    - Write calculateTeamStats method for individual team statistics
    - Implement point calculation (3 for win, 1 for draw, 0 for loss)
    - Calculate goals for, goals against, and goal difference
    - Create comprehensive unit tests for calculation accuracy
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.2 Implement table sorting algorithm

    - Write sortTableEntries method with official football rules
    - Sort by points (descending), then goal difference (descending)
    - Add tiebreaker by goals scored, then alphabetical by team name
    - Create unit tests for all sorting scenarios including edge cases
    - _Requirements: 2.4, 2.5, 2.6_

  - [x] 3.3 Add database transaction management

    - Implement calculateTableForLiga method with transaction support
    - Add createMissingEntries method for automatic entry creation
    - Implement bulk update operations for performance
    - Write integration tests for database operations
    - _Requirements: 4.4, 4.5, 8.1_

-

- [x] 4. Build queue management system

  - [x] 4.1 Create queue manager with job processing

    - Implement QueueManager class with job queue functionality
    - Add priority-based job scheduling (LOW, NORMAL, HIGH, CRITICAL)
    - Create job status tracking (PENDING, PROCESSING, COMPLETED, FAILED)
    - Write unit tests for queue operations and priority handling
    - _Requirements: 6.3, 8.4_

  - [x] 4.2 Add retry logic and error handling

    - Implement exponential backoff for failed jobs
    - Add maximum retry limits and dead letter queue
    - Create job timeout handling and automatic restart
    - Write integration tests for retry scenarios
    - _Requirements: 6.2, 8.5_

  - [x] 4.3 Implement parallel processing capabilities

    - Add configurable concurrency limits for queue processing
    - Implement job locking to prevent duplicate processing
    - Create queue monitoring and health check endpoints
    - Write performance tests for concurrent job processing
    - _Requirements: 8.3, 8.4_

- [x] 5. Create lifecycle hooks for automatic triggering

  - [x] 5.1 Implement spiel lifecycle hooks

    - Create afterUpdate hook in backend/src/api/spiel/lifecycles.js
    - Add trigger logic for status changes (geplant -> beendet)
    - Implement change detection for heim_tore and gast_tore fields
    - Write unit tests for hook triggering conditions
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 5.2 Add afterCreate and afterDelete hooks

    - Implement afterCreate hook for new game entries
    - Add afterDelete hook for game removal with table recalculation
    - Create error handling and logging for hook failures
    - Write integration tests for complete lifecycle scenarios
    - _Requirements: 1.5, 6.1, 6.2_

- [x] 6. Implement snapshot and rollback system

  - [x] 6.1 Create snapshot service

    - Write SnapshotService class with createSnapshot method
    - Implement JSON serialization of table data
    - Add file storage for snapshot persistence
    - Create unit tests for snapshot creation and storage
    - _Requirements: 7.1, 7.2_

  - [x] 6.2 Add rollback functionality

    - Implement restoreSnapshot method with data validation
    - Add snapshot listing and selection capabilities
    - Create rollback confirmation and logging
    - Write integration tests for complete rollback scenarios
    - _Requirements: 7.3, 7.4, 7.5_

- [x] 7. Build admin panel extensions

  - [x] 7.1 Create manual recalculation interface

    - Add "Tabelle neu berechnen" button to Liga admin panel
    - Implement triggerRecalculation API endpoint
    - Add loading indicators and progress feedback
    - Create success/error message display
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 7.2 Add queue monitoring dashboard

    - Create queue status display with real-time updates
    - Add job history and error log viewing
    - Implement pause/resume automation controls
    - Write admin panel integration tests
    - _Requirements: 6.1, 6.2, 6.4_

  - [x] 7.3 Implement snapshot management interface

    - Add snapshot listing with creation dates and descriptions
    - Create rollback selection interface with confirmation dialogs
    - Implement snapshot cleanup and maintenance tools
    - Write end-to-end tests for admin workflows
    - _Requirements: 7.2, 7.4_

- [x] 8. Add comprehensive error handling and logging

  - [x] 8.1 Implement structured error handling

    - Create CalculationError types and error classification
    - Add error recovery strategies for different error types
    - Implement graceful degradation for system failures
    - Write unit tests for error handling scenarios
    - _Requirements: 1.4, 6.2, 6.5_

  - [x] 8.2 Add comprehensive logging system

    - Implement structured logging with context information
    - Add performance metrics collection and monitoring
    - Create audit trail for all calculation operations
    - Write log analysis and alerting capabilities
    - _Requirements: 6.1, 6.2, 6.4_

- [ ] 9. Implement performance optimizations

  - [x] 9.1 Add database optimizations

    - Create database indexes for frequently queried fields
    - Implement query optimization for large datasets
    - Add connection pooling and transaction optimization
    - Write performance tests for database operations
    - _Requirements: 8.1, 8.2_

  - [x] 9.2 Add caching layer

    - Implement Redis caching for calculated table data
    - Add cache invalidation on data updates
    - Create cache warming strategies for frequently accessed data
    - Write performance tests for cached vs uncached operations
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 10. Create comprehensive test suite

  - [x] 10.1 Write unit tests for all services

    - Create test suites for ValidationService with edge cases
    - Add comprehensive tests for TabellenBerechnungsService
    - Write QueueManager tests with concurrency scenarios
    - Implement SnapshotService tests with file operations
    - _Requirements: All requirements need test coverage_

  - [x] 10.2 Add integration tests

    - Create end-to-end tests for complete automation workflow
    - Add API endpoint tests for all new functionality
    - Write database integration tests with real data
    - Implement admin panel integration tests
    - _Requirements: All requirements need integration testing_

  - [x] 10.3 Implement performance and load tests

    - Create load tests for concurrent game updates
    - Add performance benchmarks for calculation speed
    - Write stress tests for queue system under load
    - Implement memory and resource usage monitoring
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

-

- [x] 11. Add monitoring and observability

  - [x] 11.1 Implement health checks and metrics

    - Create health check endpoints for all services
    - Add Prometheus metrics for calculation performance
    - Implement alerting for system failures and performance issues
    - Write monitoring dashboard for system status
    - _Requirements: 6.4, 6.5_

  - [x] 11.2 Add operational tooling

    - Create maintenance scripts for data cleanup
    - Add backup and restore procedures for snapshots
    - Implement system status reporting and diagnostics
    - Write operational runbooks for common issues
    - _Requirements: 6.1, 6.2, 7.1_

-

- [x] 12. Ensure API compatibility and frontend integration

  - [x] 12.1 Maintain existing API contracts

    - Verify all existing /api/tabellen-eintraege endpoints work unchanged
    - Ensure /api/spiele endpoints return expected data formats
    - Add backward compatibility tests for frontend integration
    - Create API documentation for any new endpoints
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 12.2 Add feature flag support

    - Implement feature toggles for gradual rollout
    - Add fallback to manual mode when automation is disabled
    - Create configuration management for different environments
    - Write tests for feature flag scenarios
    - _Requirements: 5.5, 6.5_

- [x] 13. Deployment and migration preparation

  - [x] 13.1 Create deployment scripts and configuration

    - Write database migration scripts for new tables
    - Create environment-specific configuration files
    - Add deployment verification and rollback procedures
    - Implement zero-downtime deployment strategy
    - _Requirements: All requirements for production readiness_

  - [x] 13.2 Add data migration and validation tools

    - Create scripts to validate existing table data
    - Implement data consistency checks and repair tools
    - Add migration from manual to automatic calculation
    - Write validation reports for data integrity
    - _Requirements: 4.4, 4.5_

- [-] 14. Final integration and system testing

  - [x] 14.1 Conduct end-to-end system testing


        - Test complete workflow from game entry to table display
        - Verify all error scenarios and recovery procedures
        - Test admin panel functionality with real user workfl

    ows - Validate performance under realistic load conditions - _Requirements: All requirements final validation_

  - [ ] 14.2 Prepare production deployment
    - Create production deployment checklist
    - Add monitoring and alerting configuration
    - Implement backup and disaster recovery procedures
    - Write user documentation and training materials
    - _Requirements: Production readiness for all features_
