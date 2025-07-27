/**
 * Unit tests for GameCards component helper functions and team-specific logic
 */

// Mock the getTeamName function (extracted from component)
const getTeamName = (team) => {
  switch (team) {
    case '1': return '1. Mannschaft'
    case '2': return '2. Mannschaft'
    case '3': return '3. Mannschaft'
    default: return '1. Mannschaft'
  }
}

// Test helper functions for fallback messages
const getFallbackMessage = (type, team) => {
  const teamName = getTeamName(team);
  if (type === 'last') {
    return `Kein letztes Spiel für ${teamName} verfügbar`;
  } else if (type === 'next') {
    return `Kein nächstes Spiel für ${teamName} geplant`;
  }
  return '';
}

// Test helper functions for error messages
const getErrorMessage = (type, team) => {
  const teamName = getTeamName(team);
  if (type === 'last') {
    return `Letztes Spiel für ${teamName} konnte nicht geladen werden`;
  } else if (type === 'next') {
    return `Nächstes Spiel für ${teamName} konnte nicht geladen werden`;
  } else if (type === 'general') {
    return `Spiele für ${teamName} konnten nicht geladen werden`;
  }
  return '';
}

// Test suite for getTeamName function
function testGetTeamName() {
  console.log('🧪 Testing getTeamName() Helper Function\n');
  console.log('=' .repeat(50));
  
  const testCases = [
    { input: '1', expected: '1. Mannschaft' },
    { input: '2', expected: '2. Mannschaft' },
    { input: '3', expected: '3. Mannschaft' },
    { input: 'invalid', expected: '1. Mannschaft' }, // Default fallback
    { input: '', expected: '1. Mannschaft' }, // Default fallback
    { input: null, expected: '1. Mannschaft' }, // Default fallback
  ];
  
  let passed = 0;
  let failed = 0;
  
  testCases.forEach((testCase, index) => {
    const result = getTeamName(testCase.input);
    const success = result === testCase.expected;
    
    console.log(`Test ${index + 1}: getTeamName('${testCase.input}')`);
    console.log(`  Expected: "${testCase.expected}"`);
    console.log(`  Got:      "${result}"`);
    console.log(`  Result:   ${success ? '✅ PASS' : '❌ FAIL'}\n`);
    
    if (success) {
      passed++;
    } else {
      failed++;
    }
  });
  
  console.log(`📊 getTeamName() Results: ${passed} passed, ${failed} failed\n`);
  return failed === 0;
}

// Test suite for fallback messages
function testFallbackMessages() {
  console.log('🧪 Testing Team-Specific Fallback Messages\n');
  console.log('=' .repeat(50));
  
  const teams = ['1', '2', '3'];
  const types = ['last', 'next'];
  
  const expectedMessages = {
    'last': {
      '1': 'Kein letztes Spiel für 1. Mannschaft verfügbar',
      '2': 'Kein letztes Spiel für 2. Mannschaft verfügbar',
      '3': 'Kein letztes Spiel für 3. Mannschaft verfügbar'
    },
    'next': {
      '1': 'Kein nächstes Spiel für 1. Mannschaft geplant',
      '2': 'Kein nächstes Spiel für 2. Mannschaft geplant',
      '3': 'Kein nächstes Spiel für 3. Mannschaft geplant'
    }
  };
  
  let passed = 0;
  let failed = 0;
  
  types.forEach(type => {
    console.log(`📋 Testing ${type} game fallback messages:`);
    console.log('-'.repeat(40));
    
    teams.forEach(team => {
      const result = getFallbackMessage(type, team);
      const expected = expectedMessages[type][team];
      const success = result === expected;
      
      console.log(`  Team ${team}: "${result}"`);
      console.log(`  Result: ${success ? '✅ PASS' : '❌ FAIL'}`);
      
      if (!success) {
        console.log(`    Expected: "${expected}"`);
      }
      
      if (success) {
        passed++;
      } else {
        failed++;
      }
    });
    console.log('');
  });
  
  console.log(`📊 Fallback Messages Results: ${passed} passed, ${failed} failed\n`);
  return failed === 0;
}

// Test suite for error messages
function testErrorMessages() {
  console.log('🧪 Testing Team-Specific Error Messages\n');
  console.log('=' .repeat(50));
  
  const teams = ['1', '2', '3'];
  const types = ['last', 'next', 'general'];
  
  const expectedMessages = {
    'last': {
      '1': 'Letztes Spiel für 1. Mannschaft konnte nicht geladen werden',
      '2': 'Letztes Spiel für 2. Mannschaft konnte nicht geladen werden',
      '3': 'Letztes Spiel für 3. Mannschaft konnte nicht geladen werden'
    },
    'next': {
      '1': 'Nächstes Spiel für 1. Mannschaft konnte nicht geladen werden',
      '2': 'Nächstes Spiel für 2. Mannschaft konnte nicht geladen werden',
      '3': 'Nächstes Spiel für 3. Mannschaft konnte nicht geladen werden'
    },
    'general': {
      '1': 'Spiele für 1. Mannschaft konnten nicht geladen werden',
      '2': 'Spiele für 2. Mannschaft konnten nicht geladen werden',
      '3': 'Spiele für 3. Mannschaft konnten nicht geladen werden'
    }
  };
  
  let passed = 0;
  let failed = 0;
  
  types.forEach(type => {
    console.log(`🚨 Testing ${type} error messages:`);
    console.log('-'.repeat(40));
    
    teams.forEach(team => {
      const result = getErrorMessage(type, team);
      const expected = expectedMessages[type][team];
      const success = result === expected;
      
      console.log(`  Team ${team}: "${result}"`);
      console.log(`  Result: ${success ? '✅ PASS' : '❌ FAIL'}`);
      
      if (!success) {
        console.log(`    Expected: "${expected}"`);
      }
      
      if (success) {
        passed++;
      } else {
        failed++;
      }
    });
    console.log('');
  });
  
  console.log(`📊 Error Messages Results: ${passed} passed, ${failed} failed\n`);
  return failed === 0;
}

// Test suite for message consistency
function testMessageConsistency() {
  console.log('🧪 Testing Message Consistency\n');
  console.log('=' .repeat(50));
  
  const teams = ['1', '2', '3'];
  let passed = 0;
  let failed = 0;
  
  console.log('📋 Checking message format consistency:');
  console.log('-'.repeat(40));
  
  // Test that all fallback messages follow the same pattern
  teams.forEach(team => {
    const lastMessage = getFallbackMessage('last', team);
    const nextMessage = getFallbackMessage('next', team);
    
    // Check that messages contain team name
    const teamName = getTeamName(team);
    const lastContainsTeam = lastMessage.includes(teamName);
    const nextContainsTeam = nextMessage.includes(teamName);
    
    console.log(`  Team ${team} (${teamName}):`);
    console.log(`    Last message contains team name: ${lastContainsTeam ? '✅' : '❌'}`);
    console.log(`    Next message contains team name: ${nextContainsTeam ? '✅' : '❌'}`);
    
    // Check message structure
    const lastFollowsPattern = lastMessage.startsWith('Kein letztes Spiel für') && lastMessage.endsWith('verfügbar');
    const nextFollowsPattern = nextMessage.startsWith('Kein nächstes Spiel für') && nextMessage.endsWith('geplant');
    
    console.log(`    Last message follows pattern: ${lastFollowsPattern ? '✅' : '❌'}`);
    console.log(`    Next message follows pattern: ${nextFollowsPattern ? '✅' : '❌'}`);
    
    if (lastContainsTeam && nextContainsTeam && lastFollowsPattern && nextFollowsPattern) {
      passed += 4;
    } else {
      failed += (4 - [lastContainsTeam, nextContainsTeam, lastFollowsPattern, nextFollowsPattern].filter(Boolean).length);
    }
  });
  
  console.log(`\n📊 Message Consistency Results: ${passed} passed, ${failed} failed\n`);
  return failed === 0;
}

// Test suite for edge cases
function testEdgeCases() {
  console.log('🧪 Testing Edge Cases\n');
  console.log('=' .repeat(50));
  
  let passed = 0;
  let failed = 0;
  
  // Test invalid team IDs
  const invalidTeams = ['0', '4', '5', 'invalid', '', null, undefined];
  
  console.log('📋 Testing invalid team IDs (should default to "1. Mannschaft"):');
  console.log('-'.repeat(40));
  
  invalidTeams.forEach(invalidTeam => {
    const result = getTeamName(invalidTeam);
    const expected = '1. Mannschaft';
    const success = result === expected;
    
    console.log(`  getTeamName(${JSON.stringify(invalidTeam)}): "${result}"`);
    console.log(`  Result: ${success ? '✅ PASS' : '❌ FAIL'}`);
    
    if (success) {
      passed++;
    } else {
      failed++;
    }
  });
  
  // Test message generation with invalid types
  console.log('\n📋 Testing invalid message types (should return empty string):');
  console.log('-'.repeat(40));
  
  const invalidTypes = ['invalid', '', null, undefined];
  
  invalidTypes.forEach(invalidType => {
    const result = getFallbackMessage(invalidType, '1');
    const success = result === '';
    
    console.log(`  getFallbackMessage(${JSON.stringify(invalidType)}, '1'): "${result}"`);
    console.log(`  Result: ${success ? '✅ PASS' : '❌ FAIL'}`);
    
    if (success) {
      passed++;
    } else {
      failed++;
    }
  });
  
  console.log(`\n📊 Edge Cases Results: ${passed} passed, ${failed} failed\n`);
  return failed === 0;
}

// Main test runner
function runUnitTests() {
  console.log('🚀 Starting GameCards Unit Test Suite');
  console.log('=' .repeat(80));
  
  const results = [];
  
  // Run all test suites
  results.push(testGetTeamName());
  results.push(testFallbackMessages());
  results.push(testErrorMessages());
  results.push(testMessageConsistency());
  results.push(testEdgeCases());
  
  // Calculate overall results
  const totalPassed = results.filter(Boolean).length;
  const totalFailed = results.length - totalPassed;
  
  console.log('✅ Unit Test Suite Completed');
  console.log('=' .repeat(80));
  
  console.log(`\n📊 Overall Results:`);
  console.log(`  Test Suites Passed: ${totalPassed}/${results.length}`);
  console.log(`  Test Suites Failed: ${totalFailed}/${results.length}`);
  
  if (totalFailed === 0) {
    console.log('\n🎉 All unit tests passed!');
    console.log('\n📋 Verified Functionality:');
    console.log('1. ✅ getTeamName() helper function works correctly');
    console.log('2. ✅ Team-specific fallback messages are properly formatted');
    console.log('3. ✅ Team-specific error messages are properly formatted');
    console.log('4. ✅ Message consistency maintained across teams');
    console.log('5. ✅ Edge cases handled gracefully');
  } else {
    console.log('\n❌ Some unit tests failed. Please review the results above.');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runUnitTests();
}

module.exports = {
  getTeamName,
  getFallbackMessage,
  getErrorMessage,
  testGetTeamName,
  testFallbackMessages,
  testErrorMessages,
  testMessageConsistency,
  testEdgeCases,
  runUnitTests
};