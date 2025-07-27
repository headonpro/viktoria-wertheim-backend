/**
 * Simple test script to verify team lifecycle hooks functionality
 * Run with: node test-team-hooks.js
 */

// Mock Strapi environment for testing
const mockStrapi = {
  log: {
    info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
    warn: (msg, data) => console.log(`[WARN] ${msg}`, data || ''),
    error: (msg, data) => console.log(`[ERROR] ${msg}`, data || ''),
    debug: (msg, data) => console.log(`[DEBUG] ${msg}`, data || '')
  }
};

// Set global strapi for the hooks
global.strapi = mockStrapi;

// Test data
const testTeamData = {
  name: 'Test Team',
  gruendungsjahr: 2020,
  liga: { id: 1 },
  saison: { id: 1 }
};

const invalidTeamData = {
  name: '', // Invalid: empty name
  gruendungsjahr: 'invalid', // Invalid: not a number
};

async function testTeamHooks() {
  console.log('=== Testing Team Lifecycle Hooks ===\n');

  try {
    // Test 1: Valid team creation with strict validation disabled
    console.log('Test 1: Creating team with strict validation disabled');
    process.env.TEAM_STRICT_VALIDATION = 'false';
    
    // Import hooks after setting environment
    delete require.cache[require.resolve('./lifecycles.ts')];
    const hooks = require('./lifecycles.ts').default;
    
    const createEvent = {
      params: { data: testTeamData }
    };
    
    await hooks.beforeCreate(createEvent);
    await hooks.afterCreate({ result: { id: 1, ...testTeamData } });
    console.log('✅ Test 1 passed: Team created successfully with validation disabled\n');

    // Test 2: Valid team creation with strict validation enabled
    console.log('Test 2: Creating team with strict validation enabled');
    process.env.TEAM_STRICT_VALIDATION = 'true';
    
    // Re-import hooks with new environment
    delete require.cache[require.resolve('./lifecycles.ts')];
    const strictHooks = require('./lifecycles.ts').default;
    
    await strictHooks.beforeCreate(createEvent);
    await strictHooks.afterCreate({ result: { id: 2, ...testTeamData } });
    console.log('✅ Test 2 passed: Team created successfully with validation enabled\n');

    // Test 3: Invalid team creation with strict validation enabled
    console.log('Test 3: Creating invalid team with strict validation enabled');
    const invalidCreateEvent = {
      params: { data: invalidTeamData }
    };
    
    try {
      await strictHooks.beforeCreate(invalidCreateEvent);
      console.log('❌ Test 3 failed: Should have thrown validation error');
    } catch (error) {
      console.log('✅ Test 3 passed: Validation error caught:', error.message);
    }
    console.log();

    // Test 4: Team update operations
    console.log('Test 4: Testing team update operations');
    const updateEvent = {
      params: { 
        data: { name: 'Updated Team Name' },
        where: { id: 1 }
      }
    };
    
    await strictHooks.beforeUpdate(updateEvent);
    await strictHooks.afterUpdate({ result: { id: 1, name: 'Updated Team Name' } });
    console.log('✅ Test 4 passed: Team updated successfully\n');

    console.log('=== All Tests Completed Successfully ===');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error(error.stack);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testTeamHooks();
}

module.exports = { testTeamHooks };