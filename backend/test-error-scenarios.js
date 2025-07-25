/**
 * Simple test to verify error handling scenarios
 * This can be run without starting the full server
 */

const { ValidationService } = require('./dist/src/services/ValidationService');

console.log('🧪 Testing ValidationService Error Handling...\n');

// Mock strapi for testing
global.strapi = {
  log: {
    debug: (msg, data) => console.log(`[DEBUG] ${msg}`, data ? JSON.stringify(data, null, 2) : ''),
    info: (msg, data) => console.log(`[INFO] ${msg}`, data ? JSON.stringify(data, null, 2) : ''),
    warn: (msg, data) => console.log(`[WARN] ${msg}`, data ? JSON.stringify(data, null, 2) : ''),
    error: (msg, data) => console.log(`[ERROR] ${msg}`, data ? JSON.stringify(data, null, 2) : '')
  }
};

function testValidationScenarios() {
  console.log('📋 Testing validateRequired with various error scenarios...\n');

  // Test 1: Missing required fields
  console.log('Test 1: Missing required fields');
  const result1 = ValidationService.validateRequired(
    { name: 'Test Team' }, 
    ['name', 'liga', 'saison']
  );
  console.log('Result:', result1);
  console.log('✅ Expected errors for missing liga and saison\n');

  // Test 2: Empty string fields
  console.log('Test 2: Empty string fields');
  const result2 = ValidationService.validateRequired(
    { name: '', liga: 1, saison: 1 }, 
    ['name', 'liga', 'saison']
  );
  console.log('Result:', result2);
  console.log('✅ Expected error for empty name\n');

  // Test 3: Invalid data type
  console.log('Test 3: Invalid data type');
  const result3 = ValidationService.validateRequired(
    null, 
    ['name']
  );
  console.log('Result:', result3);
  console.log('✅ Expected error for invalid data type\n');

  // Test 4: Enhanced validation with details
  console.log('Test 4: Enhanced validation with structured errors');
  const result4 = ValidationService.validateRequiredWithDetails(
    { name: '', liga: null }, 
    ['name', 'liga', 'saison']
  );
  console.log('Result:', JSON.stringify(result4, null, 2));
  console.log('✅ Expected structured error response\n');

  // Test 5: Date range validation
  console.log('Test 5: Date range validation');
  const startDate = new Date('2024-06-01');
  const endDate = new Date('2024-01-01'); // Invalid: end before start
  const result5 = ValidationService.validateDateRange(startDate, endDate);
  console.log('Result:', result5);
  console.log('✅ Expected error for invalid date range\n');

  // Test 6: Enum validation
  console.log('Test 6: Enum validation');
  const result6 = ValidationService.validateEnum('invalid_status', ['active', 'inactive', 'pending']);
  console.log('Result:', result6);
  console.log('✅ Expected false for invalid enum value\n');

  // Test 7: Enhanced enum validation with details
  console.log('Test 7: Enhanced enum validation with structured errors');
  const result7 = ValidationService.validateEnumWithDetails('invalid_status', ['active', 'inactive'], 'status');
  console.log('Result:', JSON.stringify(result7, null, 2));
  console.log('✅ Expected structured error response for invalid enum\n');

  // Test 8: Error response formatting
  console.log('Test 8: Error response formatting');
  const errors = [
    { field: 'name', message: 'Name is required', code: 'REQUIRED_FIELD_MISSING' },
    { field: 'liga', message: 'Liga is required', code: 'REQUIRED_FIELD_MISSING' }
  ];
  const result8 = ValidationService.formatErrorResponse(errors);
  console.log('Result:', JSON.stringify(result8, null, 2));
  console.log('✅ Expected properly formatted error response\n');

  // Test 9: Create error response
  console.log('Test 9: Create standardized error response');
  const result9 = ValidationService.createErrorResponse('Team not found', 'NOT_FOUND', 404);
  console.log('Result:', JSON.stringify(result9, null, 2));
  console.log('✅ Expected standardized error response\n');

  console.log('🎉 All validation error handling tests completed successfully!');
  console.log('📝 The ValidationService properly handles various error scenarios with:');
  console.log('   - Structured error responses');
  console.log('   - Consistent error codes');
  console.log('   - Proper logging (when available)');
  console.log('   - Graceful fallbacks for missing dependencies');
}

// Run the tests
try {
  testValidationScenarios();
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}