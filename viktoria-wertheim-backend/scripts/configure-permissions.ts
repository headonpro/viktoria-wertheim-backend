#!/usr/bin/env ts-node

/**
 * Configure API Permissions Script
 * Sets up public read permissions for all content types
 */

import axios from 'axios';
import chalk from 'chalk';

const API_BASE_URL = process.env.STRAPI_URL || 'http://localhost:1337';

interface PermissionConfig {
  contentType: string;
  actions: string[];
}

class PermissionConfigurator {
  private log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      error: chalk.red,
      warning: chalk.yellow
    };
    console.log(colors[type](`[${type.toUpperCase()}] ${message}`));
  }

  async configurePublicPermissions(): Promise<void> {
    this.log('🔧 Configuring Public API Permissions', 'info');
    this.log(`Base URL: ${API_BASE_URL}`, 'info');
    console.log('');

    // Content types that need public read access
    const contentTypes: PermissionConfig[] = [
      { contentType: 'api::sponsor.sponsor', actions: ['find', 'findOne'] },
      { contentType: 'api::news-artikel.news-artikel', actions: ['find', 'findOne'] },
      { contentType: 'api::mannschaft.mannschaft', actions: ['find', 'findOne'] },
      { contentType: 'api::spieler.spieler', actions: ['find', 'findOne'] },
      { contentType: 'api::spiel.spiel', actions: ['find', 'findOne'] },
      { contentType: 'api::training.training', actions: ['find', 'findOne'] },
      { contentType: 'api::mitglied.mitglied', actions: ['find', 'findOne'] },
      { contentType: 'api::kategorie.kategorie', actions: ['find', 'findOne'] },
      { contentType: 'api::leaderboard-entry.leaderboard-entry', actions: ['find', 'findOne'] }
    ];

    this.log('⚠️ MANUAL CONFIGURATION REQUIRED', 'warning');
    console.log('');
    console.log('To configure API permissions, please follow these steps:');
    console.log('');
    console.log('1. Open Strapi Admin Panel:');
    console.log(`   ${API_BASE_URL}/admin`);
    console.log('');
    console.log('2. Navigate to: Settings → Users & Permissions Plugin → Roles');
    console.log('');
    console.log('3. Click on "Public" role');
    console.log('');
    console.log('4. For each content type, enable the following permissions:');
    console.log('');

    contentTypes.forEach(({ contentType, actions }) => {
      const displayName = contentType.split('::')[1].replace('.', ' → ');
      console.log(`   📋 ${displayName}:`);
      actions.forEach(action => {
        console.log(`      ✅ ${action}`);
      });
      console.log('');
    });

    console.log('5. Click "Save" to apply the permissions');
    console.log('');
    console.log('6. Run the API test again:');
    console.log('   npx ts-node scripts/test-api-endpoints.ts');
    console.log('');

    // Try to detect if permissions are already configured
    try {
      const response = await axios.get(`${API_BASE_URL}/api/kategorien`, {
        timeout: 5000
      });
      
      if (response.status === 200) {
        this.log('✅ Some permissions appear to be already configured!', 'success');
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        this.log('❌ Permissions need to be configured (403 Forbidden)', 'error');
      } else if (error.response?.status === 404) {
        this.log('❌ Content type not found (404)', 'error');
      } else {
        this.log(`❌ Connection error: ${error.message}`, 'error');
      }
    }
  }
}

// Run the configurator
async function main() {
  const configurator = new PermissionConfigurator();
  
  try {
    await configurator.configurePublicPermissions();
  } catch (error) {
    console.error(chalk.red('Failed to configure permissions:'), error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { PermissionConfigurator };