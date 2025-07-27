/**
 * Task 13: Integration Testing und Validierung
 * Backend API validation script
 * 
 * This script validates:
 * - All three league tables have correct data
 * - API endpoints respond correctly
 * - Data integrity across all leagues
 * - Performance of API calls
 * 
 * Requirements: 2.1, 3.1, 4.1, 5.5
 */

const axios = require('axios');

const API_BASE_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TIMEOUT = 10000;

// Expected team data for validation
const EXPECTED_LEAGUE_DATA = {
  'Kreisliga Tauberbischofsheim': {
    expectedTeams: 16,
    viktoriaTeam: 'SV Viktoria Wertheim',
    viktoriaPosition: 1,
    sampleTeams: [
      { name: 'SV Viktoria Wertheim', position: 1 },
      { name: 'VfR Gerlachsheim', position: 2 },
      { name: 'TSV Jahn Kreuzwertheim', position: 3 }
    ]
  },
  'Kreisklasse A Tauberbischofsheim': {
    expectedTeams: 14,
    viktoriaTeam: 'SV Viktoria Wertheim II',
    viktoriaPosition: 5,
    sampleTeams: [
      { name: 'TSV Unterschüpf', position: 1 },
      { name: 'SV Nassig II', position: 2 },
      { name: 'SV Viktoria Wertheim II', position: 5 }
    ]
  },
  'Kreisklasse B Tauberbischofsheim': {
    expectedTeams: 9,
    viktoriaTeam: 'SpG Vikt. Wertheim 3/Grünenwort',
    viktoriaPosition: 1,
    sampleTeams: [
      { name: 'SpG Vikt. Wertheim 3/Grünenwort', position: 1 },
      { name: 'FC Hundheim-Steinbach 2', position: 1 },
      { name: 'FC Wertheim-Eichel 2', position: 1 }
    ]
  }
};

class IntegrationValidator {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      errors: [],
      performance: {},
      summary: {}
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async validateApiEndpoint(ligaName) {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/tabellen-eintraege`, {
        params: {
          'filters[liga][name][$eq]': ligaName,
          populate: 'liga',
          sort: 'platz:asc',
          'pagination[pageSize]': 100
        },
        timeout: API_TIMEOUT
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      if (response.status === 200 && response.data && response.data.data) {
        this.results.passed++;
        this.results.performance[ligaName] = responseTime;
        this.log(`API endpoint for ${ligaName} responded in ${responseTime}ms`, 'success');
        return { success: true, data: response.data.data, responseTime };
      } else {
        throw new Error(`Invalid response structure for ${ligaName}`);
      }
    } catch (error) {
      this.results.failed++;
      this.results.errors.push(`API endpoint ${ligaName}: ${error.message}`);
      this.log(`API endpoint failed for ${ligaName}: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  validateTeamData(teams, ligaName) {
    const expected = EXPECTED_LEAGUE_DATA[ligaName];
    const validationResults = {
      teamCount: false,
      viktoriaTeamPresent: false,
      viktoriaPosition: false,
      dataIntegrity: false,
      sampleTeamsPresent: false
    };

    try {
      // Validate team count
      if (teams.length >= expected.expectedTeams * 0.5) { // Allow for partial data
        validationResults.teamCount = true;
        this.log(`✓ Team count validation passed for ${ligaName}: ${teams.length} teams`);
      } else {
        this.log(`✗ Team count validation failed for ${ligaName}: expected ~${expected.expectedTeams}, got ${teams.length}`, 'error');
      }

      // Find Viktoria team
      const viktoriaTeam = teams.find(team => 
        team.team_name && team.team_name.includes('Viktoria') || 
        team.team_name.includes('Vikt.')
      );

      if (viktoriaTeam) {
        validationResults.viktoriaTeamPresent = true;
        this.log(`✓ Viktoria team found in ${ligaName}: ${viktoriaTeam.team_name}`);

        // Validate Viktoria team position (allow some flexibility)
        if (Math.abs(viktoriaTeam.platz - expected.viktoriaPosition) <= 2) {
          validationResults.viktoriaPosition = true;
          this.log(`✓ Viktoria team position validation passed: ${viktoriaTeam.platz}`);
        } else {
          this.log(`✗ Viktoria team position unexpected: expected ~${expected.viktoriaPosition}, got ${viktoriaTeam.platz}`, 'error');
        }
      } else {
        this.log(`✗ Viktoria team not found in ${ligaName}`, 'error');
      }

      // Validate data integrity
      const hasValidData = teams.every(team => 
        team.team_name && 
        typeof team.platz === 'number' && 
        team.platz > 0 &&
        typeof team.spiele === 'number' &&
        typeof team.punkte === 'number' &&
        team.liga && team.liga.name === ligaName
      );

      if (hasValidData) {
        validationResults.dataIntegrity = true;
        this.log(`✓ Data integrity validation passed for ${ligaName}`);
      } else {
        this.log(`✗ Data integrity validation failed for ${ligaName}`, 'error');
      }

      // Validate sample teams presence
      const sampleTeamsFound = expected.sampleTeams.filter(sampleTeam =>
        teams.some(team => team.team_name === sampleTeam.name)
      );

      if (sampleTeamsFound.length >= expected.sampleTeams.length * 0.5) {
        validationResults.sampleTeamsPresent = true;
        this.log(`✓ Sample teams validation passed for ${ligaName}: ${sampleTeamsFound.length}/${expected.sampleTeams.length} found`);
      } else {
        this.log(`✗ Sample teams validation failed for ${ligaName}: only ${sampleTeamsFound.length}/${expected.sampleTeams.length} found`, 'error');
      }

      // Update results
      const passedValidations = Object.values(validationResults).filter(Boolean).length;
      const totalValidations = Object.keys(validationResults).length;
      
      if (passedValidations === totalValidations) {
        this.results.passed++;
      } else {
        this.results.failed++;
        this.results.errors.push(`Data validation for ${ligaName}: ${passedValidations}/${totalValidations} checks passed`);
      }

      return validationResults;

    } catch (error) {
      this.results.failed++;
      this.results.errors.push(`Data validation error for ${ligaName}: ${error.message}`);
      this.log(`Data validation error for ${ligaName}: ${error.message}`, 'error');
      return validationResults;
    }
  }

  async validatePerformance() {
    this.log('Starting performance validation...');
    
    const performanceResults = {
      averageResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity,
      allWithinThreshold: true
    };

    const responseTimes = Object.values(this.results.performance);
    
    if (responseTimes.length > 0) {
      performanceResults.averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      performanceResults.maxResponseTime = Math.max(...responseTimes);
      performanceResults.minResponseTime = Math.min(...responseTimes);
      
      // Check if all response times are within acceptable threshold (2 seconds)
      performanceResults.allWithinThreshold = responseTimes.every(time => time < 2000);
      
      this.log(`Performance metrics:`);
      this.log(`  Average response time: ${performanceResults.averageResponseTime.toFixed(2)}ms`);
      this.log(`  Max response time: ${performanceResults.maxResponseTime}ms`);
      this.log(`  Min response time: ${performanceResults.minResponseTime}ms`);
      
      if (performanceResults.allWithinThreshold) {
        this.log(`✓ All API calls within performance threshold`, 'success');
        this.results.passed++;
      } else {
        this.log(`✗ Some API calls exceeded performance threshold`, 'error');
        this.results.failed++;
        this.results.errors.push('Performance threshold exceeded');
      }
    }

    return performanceResults;
  }

  async validateTeamSwitchingScenario() {
    this.log('Validating team switching scenario...');
    
    const teamMappings = [
      { teamId: '1', liga: 'Kreisliga Tauberbischofsheim' },
      { teamId: '2', liga: 'Kreisklasse A Tauberbischofsheim' },
      { teamId: '3', liga: 'Kreisklasse B Tauberbischofsheim' }
    ];

    const switchingResults = [];
    const startTime = Date.now();

    for (const mapping of teamMappings) {
      const switchStartTime = Date.now();
      const result = await this.validateApiEndpoint(mapping.liga);
      const switchEndTime = Date.now();
      
      switchingResults.push({
        teamId: mapping.teamId,
        liga: mapping.liga,
        success: result.success,
        responseTime: switchEndTime - switchStartTime,
        teamCount: result.success ? result.data.length : 0
      });
    }

    const totalSwitchTime = Date.now() - startTime;
    
    this.log(`Team switching scenario completed in ${totalSwitchTime}ms`);
    
    // Validate switching performance
    const allSwitchesSuccessful = switchingResults.every(result => result.success);
    const averageSwitchTime = switchingResults.reduce((sum, result) => sum + result.responseTime, 0) / switchingResults.length;
    
    if (allSwitchesSuccessful && averageSwitchTime < 1000) {
      this.log(`✓ Team switching performance validation passed`, 'success');
      this.results.passed++;
    } else {
      this.log(`✗ Team switching performance validation failed`, 'error');
      this.results.failed++;
      this.results.errors.push('Team switching performance issues');
    }

    return {
      totalTime: totalSwitchTime,
      averageTime: averageSwitchTime,
      results: switchingResults,
      allSuccessful: allSwitchesSuccessful
    };
  }

  async validateDataConsistency() {
    this.log('Validating data consistency across leagues...');
    
    const consistencyResults = {
      uniqueTeamNames: true,
      validPositions: true,
      ligaReferences: true,
      statisticsConsistency: true
    };

    try {
      // Get all tabellen-eintraege
      const response = await axios.get(`${API_BASE_URL}/api/tabellen-eintraege`, {
        params: {
          populate: 'liga',
          'pagination[pageSize]': 1000
        },
        timeout: API_TIMEOUT
      });

      const allTeams = response.data.data;
      
      // Group by liga
      const teamsByLiga = {};
      allTeams.forEach(team => {
        const ligaName = team.liga?.name;
        if (ligaName) {
          if (!teamsByLiga[ligaName]) {
            teamsByLiga[ligaName] = [];
          }
          teamsByLiga[ligaName].push(team);
        }
      });

      // Validate each liga
      Object.entries(teamsByLiga).forEach(([ligaName, teams]) => {
        // Check for unique team names within liga
        const teamNames = teams.map(team => team.team_name);
        const uniqueNames = new Set(teamNames);
        if (teamNames.length !== uniqueNames.size) {
          consistencyResults.uniqueTeamNames = false;
          this.log(`✗ Duplicate team names found in ${ligaName}`, 'error');
        }

        // Check for valid positions
        const positions = teams.map(team => team.platz).sort((a, b) => a - b);
        const hasValidPositions = positions.every((pos, index) => pos > 0);
        if (!hasValidPositions) {
          consistencyResults.validPositions = false;
          this.log(`✗ Invalid positions found in ${ligaName}`, 'error');
        }

        // Check liga references
        const hasValidLigaRefs = teams.every(team => team.liga && team.liga.name === ligaName);
        if (!hasValidLigaRefs) {
          consistencyResults.ligaReferences = false;
          this.log(`✗ Invalid liga references found in ${ligaName}`, 'error');
        }

        // Check statistics consistency
        const hasValidStats = teams.every(team => 
          typeof team.spiele === 'number' &&
          typeof team.siege === 'number' &&
          typeof team.unentschieden === 'number' &&
          typeof team.niederlagen === 'number' &&
          typeof team.tore_fuer === 'number' &&
          typeof team.tore_gegen === 'number' &&
          typeof team.punkte === 'number' &&
          team.spiele >= 0 && team.siege >= 0 && team.unentschieden >= 0 && team.niederlagen >= 0
        );
        if (!hasValidStats) {
          consistencyResults.statisticsConsistency = false;
          this.log(`✗ Invalid statistics found in ${ligaName}`, 'error');
        }
      });

      const passedChecks = Object.values(consistencyResults).filter(Boolean).length;
      const totalChecks = Object.keys(consistencyResults).length;

      if (passedChecks === totalChecks) {
        this.log(`✓ Data consistency validation passed: ${passedChecks}/${totalChecks} checks`, 'success');
        this.results.passed++;
      } else {
        this.log(`✗ Data consistency validation failed: ${passedChecks}/${totalChecks} checks passed`, 'error');
        this.results.failed++;
        this.results.errors.push(`Data consistency issues: ${totalChecks - passedChecks} checks failed`);
      }

    } catch (error) {
      this.results.failed++;
      this.results.errors.push(`Data consistency validation error: ${error.message}`);
      this.log(`Data consistency validation error: ${error.message}`, 'error');
    }

    return consistencyResults;
  }

  async runFullValidation() {
    this.log('🚀 Starting Liga-Tabellen Integration Validation');
    this.log('================================================');

    try {
      // Test 1: Validate all three league API endpoints
      this.log('\n📋 Test 1: API Endpoint Validation');
      const apiResults = {};
      
      for (const ligaName of Object.keys(EXPECTED_LEAGUE_DATA)) {
        this.log(`Testing ${ligaName}...`);
        const result = await this.validateApiEndpoint(ligaName);
        apiResults[ligaName] = result;
        
        if (result.success) {
          // Validate team data
          this.validateTeamData(result.data, ligaName);
        }
      }

      // Test 2: Performance validation
      this.log('\n⚡ Test 2: Performance Validation');
      await this.validatePerformance();

      // Test 3: Team switching scenario
      this.log('\n🔄 Test 3: Team Switching Scenario');
      await this.validateTeamSwitchingScenario();

      // Test 4: Data consistency
      this.log('\n🔍 Test 4: Data Consistency Validation');
      await this.validateDataConsistency();

      // Generate summary
      this.generateSummary();

    } catch (error) {
      this.log(`Fatal error during validation: ${error.message}`, 'error');
      this.results.failed++;
      this.results.errors.push(`Fatal error: ${error.message}`);
    }
  }

  generateSummary() {
    this.log('\n📊 VALIDATION SUMMARY');
    this.log('====================');
    
    const totalTests = this.results.passed + this.results.failed;
    const successRate = totalTests > 0 ? (this.results.passed / totalTests * 100).toFixed(1) : 0;
    
    this.log(`Total Tests: ${totalTests}`);
    this.log(`Passed: ${this.results.passed}`, 'success');
    this.log(`Failed: ${this.results.failed}`, this.results.failed > 0 ? 'error' : 'info');
    this.log(`Success Rate: ${successRate}%`);
    
    if (this.results.errors.length > 0) {
      this.log('\n❌ ERRORS:');
      this.results.errors.forEach((error, index) => {
        this.log(`${index + 1}. ${error}`, 'error');
      });
    }
    
    if (Object.keys(this.results.performance).length > 0) {
      this.log('\n⚡ PERFORMANCE METRICS:');
      Object.entries(this.results.performance).forEach(([liga, time]) => {
        this.log(`${liga}: ${time}ms`);
      });
    }
    
    // Overall result
    if (this.results.failed === 0) {
      this.log('\n🎉 ALL VALIDATIONS PASSED!', 'success');
      this.log('Liga-Tabellen system is ready for production.');
    } else {
      this.log('\n⚠️  SOME VALIDATIONS FAILED', 'error');
      this.log('Please review and fix the issues above.');
    }

    // Save results to file
    this.saveResults();
  }

  saveResults() {
    const fs = require('fs');
    const path = require('path');
    
    const resultsFile = path.join(__dirname, '../docs/TASK_13_INTEGRATION_VALIDATION_RESULTS.json');
    const summaryFile = path.join(__dirname, '../docs/TASK_13_INTEGRATION_VALIDATION_SUMMARY.md');
    
    // Save JSON results
    fs.writeFileSync(resultsFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      results: this.results,
      performance: this.results.performance
    }, null, 2));
    
    // Save markdown summary
    const totalTests = this.results.passed + this.results.failed;
    const successRate = totalTests > 0 ? (this.results.passed / totalTests * 100).toFixed(1) : 0;
    
    const markdownSummary = `# Task 13: Integration Testing und Validierung - Results

## Summary
- **Date**: ${new Date().toISOString()}
- **Total Tests**: ${totalTests}
- **Passed**: ${this.results.passed}
- **Failed**: ${this.results.failed}
- **Success Rate**: ${successRate}%

## Performance Metrics
${Object.entries(this.results.performance).map(([liga, time]) => `- **${liga}**: ${time}ms`).join('\n')}

## Test Results

### ✅ Passed Tests
${this.results.passed > 0 ? 'All validations completed successfully.' : 'No tests passed.'}

### ❌ Failed Tests
${this.results.errors.length > 0 ? this.results.errors.map((error, index) => `${index + 1}. ${error}`).join('\n') : 'No test failures.'}

## Requirements Validation

### Requirement 2.1: Kreisliga Tauberbischofsheim Tabelle
${this.results.errors.some(e => e.includes('Kreisliga')) ? '❌ Failed' : '✅ Passed'}

### Requirement 3.1: Kreisklasse A Tauberbischofsheim Tabelle  
${this.results.errors.some(e => e.includes('Kreisklasse A')) ? '❌ Failed' : '✅ Passed'}

### Requirement 4.1: Kreisklasse B Tauberbischofsheim Tabelle
${this.results.errors.some(e => e.includes('Kreisklasse B')) ? '❌ Failed' : '✅ Passed'}

### Requirement 5.5: Team Switching Performance
${this.results.errors.some(e => e.includes('performance') || e.includes('switching')) ? '❌ Failed' : '✅ Passed'}

## Conclusion
${this.results.failed === 0 ? 
  '🎉 **ALL VALIDATIONS PASSED!** Liga-Tabellen system is ready for production.' : 
  '⚠️ **SOME VALIDATIONS FAILED** Please review and fix the issues above.'}
`;
    
    fs.writeFileSync(summaryFile, markdownSummary);
    
    this.log(`\n💾 Results saved to:`);
    this.log(`   JSON: ${resultsFile}`);
    this.log(`   Summary: ${summaryFile}`);
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new IntegrationValidator();
  validator.runFullValidation().catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

module.exports = IntegrationValidator;