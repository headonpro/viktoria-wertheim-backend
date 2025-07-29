# End-to-End Testing Documentation

## Overview

This directory contains comprehensive end-to-end tests for the Club Collection Implementation (Task 12.3). These tests validate the complete workflow from game entry to table display, frontend integration, admin panel workflows, and performance under realistic load.

## Test Structure

### Core E2E Test Files

1. **`complete-club-workflow.test.ts`**
   - Tests complete workflow from game entry to table display
   - Validates club data integration throughout the system
   - Tests game result corrections and complex calculations
   - Covers all major user workflows

2. **`performance-load-testing.test.ts`**
   - Tests system performance under realistic load
   - Validates large league handling (20+ teams, 190+ games)
   - Tests concurrent operations and memory usage
   - Includes stress testing and recovery scenarios

3. **`admin-panel-workflows.test.ts`**
   - Tests complete admin panel club management workflows
   - Validates CRUD operations for clubs
   - Tests data validation and error handling
   - Covers bulk operations and data management

4. **`e2e-test-runner.ts`**
   - Orchestrates all E2E tests
   - Provides comprehensive test validation
   - Ensures all requirements are covered
   - Generates test reports and metrics

### Frontend E2E Tests

5. **`../../../frontend/tests/e2e/club-frontend-integration.test.ts`**
   - Tests frontend integration with club data
   - Validates mobile responsiveness and performance
   - Tests accessibility and user experience
   - Covers error handling and edge cases

## Configuration Files

- **`jest.e2e.config.js`** - Jest configuration for E2E tests
- **`global-setup.ts`** - Global test environment setup
- **`global-teardown.ts`** - Global test cleanup
- **`env-setup.js`** - Environment variable configuration

## Requirements Coverage

### Task 12.3 Requirements

✅ **Test complete workflow from game entry to table display**
- Game creation with clubs → automatic table calculation → display results
- Game result corrections and recalculations
- Multiple games and complex table scenarios

✅ **Add frontend integration testing with club data**
- Team selection with club mappings
- League table display with club names and logos
- Mobile responsiveness and performance
- Accessibility and user experience

✅ **Test admin panel club management workflows**
- Complete club CRUD operations
- Data validation and error handling
- Liga-club relationship management
- Bulk operations and data import/export

✅ **Add performance testing under realistic load**
- Large league performance (20 teams, 190 games)
- Concurrent operations and race condition handling
- Memory usage and resource management
- Stress testing and recovery scenarios

### Specification Requirements Coverage

All 10 requirements from the specification are covered:

1. **Requirement 1** - Game entry between real clubs ✅
2. **Requirement 2** - Team/club separation ✅
3. **Requirement 3** - Spiel Collection extensions ✅
4. **Requirement 4** - Tabellen-Eintrag with clubs ✅
5. **Requirement 5** - Enhanced table calculations ✅
6. **Requirement 6** - Frontend team navigation ✅
7. **Requirement 7** - Admin club management ✅
8. **Requirement 8** - Migration compatibility ✅
9. **Requirement 9** - Data validation ✅
10. **Requirement 10** - Performance optimization ✅

## Running E2E Tests

### Prerequisites

1. **Database Setup**
   ```bash
   # Create test database
   createdb viktoria_test_e2e
   
   # Set environment variable
   export DATABASE_URL="postgresql://test:test@localhost:5432/viktoria_test_e2e"
   ```

2. **Frontend Service** (for frontend E2E tests)
   ```bash
   # Start frontend in another terminal
   cd frontend
   npm run dev
   ```

3. **Backend Service**
   ```bash
   # Start backend in test mode
   cd backend
   npm run develop
   ```

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- complete-club-workflow.test.ts

# Run with coverage
npm run test:e2e -- --coverage

# Run with verbose output
npm run test:e2e -- --verbose

# Run frontend E2E tests
cd frontend
npm run test:e2e
```

### Test Scripts

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "test:e2e": "jest --config jest.e2e.config.js",
    "test:e2e:watch": "jest --config jest.e2e.config.js --watch",
    "test:e2e:coverage": "jest --config jest.e2e.config.js --coverage",
    "test:e2e:ci": "jest --config jest.e2e.config.js --ci --coverage --watchAll=false"
  }
}
```

## Test Data Management

### Automatic Cleanup

Tests automatically clean up their data using:
- Transaction rollbacks where possible
- Explicit cleanup in `afterEach` hooks
- Global cleanup in `global-teardown.ts`

### Test Isolation

- Each test creates its own test data
- Tests run sequentially to avoid conflicts
- Database transactions ensure isolation
- Temporary files are cleaned up automatically

### Data Consistency

Tests validate:
- Goals for = goals against across all table entries
- Points calculated correctly (wins=3, draws=1, losses=0)
- Game counts match (wins + draws + losses = games played)
- Goal difference = goals for - goals against

## Performance Benchmarks

### Backend Performance

- **Small league calculation**: < 5 seconds
- **Large league calculation**: < 30 seconds
- **Concurrent updates**: < 10 seconds
- **Complex queries**: < 5 seconds
- **Memory usage**: < 100MB increase during intensive operations

### Frontend Performance

- **Page load time**: < 3 seconds on mobile
- **API response time**: < 2 seconds
- **Rendering performance**: 60fps on mobile devices
- **Bundle size**: Optimized for mobile networks

## Error Scenarios Tested

### Data Validation Errors
- Duplicate club names
- Invalid team mappings
- Missing required fields
- Invalid data types

### System Errors
- Database connection failures
- API timeouts
- Network failures
- Memory exhaustion

### User Errors
- Invalid form inputs
- Unauthorized access
- Concurrent modifications
- Offline scenarios

## Monitoring and Reporting

### Test Reports

Tests generate comprehensive reports:
- HTML test report in `coverage/e2e/e2e-report.html`
- JUnit XML for CI/CD in `coverage/e2e/e2e-results.xml`
- Test summary JSON in `coverage/e2e/test-summary.json`

### Performance Metrics

Tests collect and report:
- Execution times for all operations
- Memory usage patterns
- Database query performance
- API response times

### Coverage Analysis

- Code coverage for all tested components
- Requirement coverage validation
- Test scenario completeness
- Integration point validation

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check database is running
   pg_isready -h localhost -p 5432
   
   # Verify connection string
   echo $DATABASE_URL
   ```

2. **Frontend Service Not Available**
   ```bash
   # Check frontend is running
   curl http://localhost:3000
   
   # Start frontend if needed
   cd frontend && npm run dev
   ```

3. **Test Timeouts**
   - Increase timeout in `jest.e2e.config.js`
   - Check system resources
   - Verify database performance

4. **Memory Issues**
   - Run tests with `--maxWorkers=1`
   - Enable garbage collection with `--expose-gc`
   - Monitor memory usage during tests

### Debug Mode

Run tests in debug mode:

```bash
# Enable debug logging
DEBUG=* npm run test:e2e

# Run single test with debugging
npm run test:e2e -- --testNamePattern="should complete full workflow" --verbose
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_USER: test
          POSTGRES_DB: viktoria_test_e2e
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          cd backend && npm ci
          cd ../frontend && npm ci
          
      - name: Run E2E tests
        run: |
          cd backend
          npm run test:e2e:ci
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/viktoria_test_e2e
          
      - name: Upload test results
        uses: actions/upload-artifact@v2
        if: always()
        with:
          name: e2e-test-results
          path: backend/coverage/e2e/
```

## Best Practices

### Test Design

1. **Test Independence** - Each test should be able to run in isolation
2. **Data Cleanup** - Always clean up test data to avoid side effects
3. **Realistic Scenarios** - Use realistic data volumes and user workflows
4. **Error Coverage** - Test both happy path and error scenarios

### Performance Testing

1. **Baseline Metrics** - Establish performance baselines
2. **Load Simulation** - Use realistic load patterns
3. **Resource Monitoring** - Monitor CPU, memory, and database usage
4. **Bottleneck Identification** - Identify and document performance bottlenecks

### Maintenance

1. **Regular Updates** - Keep tests updated with system changes
2. **Documentation** - Document test scenarios and expected outcomes
3. **Review Process** - Include E2E tests in code review process
4. **Monitoring** - Monitor test execution times and failure rates

## Contributing

When adding new E2E tests:

1. Follow the existing test structure and naming conventions
2. Include proper cleanup in `afterEach` hooks
3. Add performance benchmarks for new features
4. Update this documentation with new test scenarios
5. Ensure tests are deterministic and repeatable

## Support

For issues with E2E tests:

1. Check the troubleshooting section above
2. Review test logs in `coverage/e2e/`
3. Verify system requirements and dependencies
4. Contact the development team for assistance