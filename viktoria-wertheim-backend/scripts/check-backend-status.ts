#!/usr/bin/env ts-node

/**
 * Backend Status Checker
 * Checks if Strapi backend is running and provides startup guidance
 */

import axios from 'axios';
import chalk from 'chalk';

const API_BASE_URL = process.env.STRAPI_URL || 'http://localhost:1337';

class BackendStatusChecker {
  private log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      error: chalk.red,
      warning: chalk.yellow
    };
    console.log(colors[type](`[${type.toUpperCase()}] ${message}`));
  }

  async checkBackendStatus(): Promise<boolean> {
    try {
      this.log('🔍 Checking backend status...', 'info');
      
      const response = await axios.get(`${API_BASE_URL}/admin`, {
        timeout: 5000,
        validateStatus: () => true // Accept any status code
      });

      if (response.status === 200 || response.status === 302) {
        this.log('✅ Backend is running!', 'success');
        return true;
      } else {
        this.log(`⚠️ Backend responded with status: ${response.status}`, 'warning');
        return false;
      }
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        this.log('❌ Backend is not running', 'error');
      } else {
        this.log(`❌ Backend check failed: ${error.message}`, 'error');
      }
      return false;
    }
  }

  async checkDatabaseConnection(): Promise<boolean> {
    try {
      // Try to access a simple API endpoint
      const response = await axios.get(`${API_BASE_URL}/api/kategorien`, {
        timeout: 5000
      });

      if (response.status === 200) {
        this.log('✅ Database connection working!', 'success');
        return true;
      }
    } catch (error: any) {
      this.log('❌ Database connection issue', 'error');
      return false;
    }
    return false;
  }

  async runFullCheck(): Promise<void> {
    console.log('🚀 Backend Status Check');
    console.log(`Base URL: ${API_BASE_URL}`);
    console.log('='.repeat(50));

    const isBackendRunning = await this.checkBackendStatus();
    
    if (!isBackendRunning) {
      console.log('\n📋 To start the backend:');
      console.log(chalk.cyan('  cd viktoria-wertheim-backend'));
      console.log(chalk.cyan('  npm run develop'));
      console.log('\n⏳ Wait for "Server started" message, then run API tests again.');
      return;
    }

    // If backend is running, check database
    console.log('');
    const isDatabaseWorking = await this.checkDatabaseConnection();
    
    if (isDatabaseWorking) {
      this.log('🎉 Backend and database are ready for API testing!', 'success');
      console.log('\n📋 Next steps:');
      console.log(chalk.cyan('  ts-node scripts/test-api-endpoints.ts'));
    } else {
      this.log('⚠️ Backend is running but database may have issues', 'warning');
      console.log('\n📋 Check:');
      console.log('  - Database file exists');
      console.log('  - Content types are properly configured');
      console.log('  - Run seeding scripts if needed');
    }
  }
}

// Run the check
async function main() {
  const checker = new BackendStatusChecker();
  
  try {
    await checker.runFullCheck();
  } catch (error) {
    console.error(chalk.red('Failed to check backend status:'), error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { BackendStatusChecker };