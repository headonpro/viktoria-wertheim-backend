#!/usr/bin/env ts-node

/**
 * API Endpoint Testing Script
 * Tests all Strapi API endpoints to ensure they're working before migration
 */

import axios from 'axios';
import chalk from 'chalk';

const API_BASE_URL = process.env.STRAPI_URL || 'http://localhost:1337';

interface TestResult {
  endpoint: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  data?: any;
}

class APITester {
  private results: TestResult[] = [];

  private log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      error: chalk.red,
      warning: chalk.yellow
    };
    console.log(colors[type](`[${type.toUpperCase()}] ${message}`));
  }

  private async testEndpoint(endpoint: string, description: string): Promise<TestResult> {
    try {
      this.log(`Testing ${description}...`, 'info');
      
      const response = await axios.get(`${API_BASE_URL}/api/${endpoint}`, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.status === 200) {
        const dataCount = response.data?.data?.length || 0;
        const message = `✅ ${description} - ${dataCount} records found`;
        this.log(message, 'success');
        
        return {
          endpoint,
          status: 'success',
          message,
          data: {
            count: dataCount,
            sampleData: response.data?.data?.[0] || null
          }
        };
      } else {
        const message = `⚠️ ${description} - Unexpected status: ${response.status}`;
        this.log(message, 'warning');
        
        return {
          endpoint,
          status: 'warning',
          message
        };
      }
    } catch (error: any) {
      const message = `❌ ${description} - Error: ${error.message}`;
      this.log(message, 'error');
      
      return {
        endpoint,
        status: 'error',
        message
      };
    }
  }

  async runAllTests(): Promise<void> {
    this.log('🚀 Starting API Endpoint Tests', 'info');
    this.log(`Base URL: ${API_BASE_URL}`, 'info');
    console.log('');

    // Test all main content types (using correct plural API names from schemas)
    const endpoints = [
      { endpoint: 'sponsors', description: 'Sponsors' },
      { endpoint: 'news-artikels', description: 'News Articles' },
      { endpoint: 'mannschaften', description: 'Teams' },
      { endpoint: 'spielers', description: 'Players' },
      { endpoint: 'spiele', description: 'Matches' },
      { endpoint: 'trainings', description: 'Training Sessions' },
      { endpoint: 'mitglieder', description: 'Members' },
      { endpoint: 'kategorien', description: 'Categories' },
      { endpoint: 'leaderboard-entries', description: 'Leaderboard Entries' }
    ];

    // Run tests sequentially to avoid overwhelming the server
    for (const { endpoint, description } of endpoints) {
      const result = await this.testEndpoint(endpoint, description);
      this.results.push(result);
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    this.generateReport();
  }

  private generateReport(): void {
    console.log('\n' + '='.repeat(60));
    this.log('📊 API ENDPOINT TEST REPORT', 'info');
    console.log('='.repeat(60));

    const successful = this.results.filter(r => r.status === 'success');
    const warnings = this.results.filter(r => r.status === 'warning');
    const errors = this.results.filter(r => r.status === 'error');

    this.log(`✅ Successful: ${successful.length}`, 'success');
    this.log(`⚠️ Warnings: ${warnings.length}`, 'warning');
    this.log(`❌ Errors: ${errors.length}`, 'error');

    console.log('\n📋 Detailed Results:');
    this.results.forEach(result => {
      console.log(`  ${result.message}`);
      if (result.data?.sampleData) {
        console.log(`    Sample: ${JSON.stringify(result.data.sampleData, null, 2).substring(0, 100)}...`);
      }
    });

    console.log('\n🎯 Recommendations:');
    
    if (errors.length > 0) {
      this.log('❌ CRITICAL: Some endpoints are not working. Migration should be postponed.', 'error');
      errors.forEach(error => {
        console.log(`   - Fix: ${error.endpoint}`);
      });
    } else if (warnings.length > 0) {
      this.log('⚠️ WARNING: Some endpoints have issues but may be acceptable.', 'warning');
    } else {
      this.log('🎉 SUCCESS: All endpoints are working! Ready for migration.', 'success');
    }

    // Check for empty content types
    const emptyEndpoints = successful.filter(r => r.data?.count === 0);
    if (emptyEndpoints.length > 0) {
      console.log('\n📝 Empty Content Types (consider seeding):');
      emptyEndpoints.forEach(empty => {
        console.log(`   - ${empty.endpoint}: No data found`);
      });
    }
  }
}

// Run the tests
async function main() {
  const tester = new APITester();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error(chalk.red('Failed to run API tests:'), error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { APITester };