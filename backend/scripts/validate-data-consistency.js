#!/usr/bin/env node

/**
 * Data Consistency Validation Script
 * 
 * This script validates that all data relations are working correctly
 * after the team/mannschaft consolidation and relation fixes.
 * 
 * Usage: node scripts/validate-data-consistency.js
 */

const axios = require('axios');

// Configuration
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

class DataConsistencyValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.successes = [];
    
    // Setup axios instance
    this.api = axios.create({
      baseURL: `${STRAPI_URL}/api`,
      headers: API_TOKEN ? {
        'Authorization': `Bearer ${API_TOKEN}`
      } : {}
    });
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colorMap = {
      success: colors.green,
      error: colors.red,
      warning: colors.yellow,
      info: colors.blue
    };
    
    console.log(`${colorMap[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  async validateTeamRelations() {
    this.log('🔍 Validating team relations...', 'info');
    
    try {
      // Get all teams with populated relations
      const response = await this.api.get('/teams?populate=*');
      let teams = response.data;
      
      // Handle different response formats
      if (teams.data) {
        teams = teams.data;
      }
      
      if (!teams || teams.length === 0) {
        this.warnings.push('No teams found in database');
        return;
      }

      for (const team of teams) {
        const teamName = team.name || team.attributes?.name;
        
        // Validate team has required fields
        if (!teamName) {
          this.errors.push(`Team ${team.id} missing required name field`);
        }
        
        // Validate bidirectional relations with spieler
        const teamSpieler = team.spieler || team.attributes?.spieler?.data || [];
        if (teamSpieler.length > 0) {
          for (const spieler of teamSpieler) {
            try {
              // Check if spieler references this team back
              const spielerResponse = await this.api.get(`/spielers/${spieler.id}?populate=hauptteam,aushilfe_teams`);
              let spielerData = spielerResponse.data;
              if (spielerData.data) spielerData = spielerData.data;
              
              const hauptteamId = spielerData.hauptteam?.id || spielerData.attributes?.hauptteam?.data?.id;
              const aushilfeTeamIds = spielerData.aushilfe_teams?.map(t => t.id) || spielerData.attributes?.aushilfe_teams?.data?.map(t => t.id) || [];
              
              if (hauptteamId !== team.id && !aushilfeTeamIds.includes(team.id)) {
                this.errors.push(`Broken bidirectional relation: Team ${teamName} references Spieler ${spieler.id}, but spieler doesn't reference team back`);
              }
            } catch (error) {
              this.warnings.push(`Could not validate spieler ${spieler.id} for team ${teamName}: ${error.message}`);
            }
          }
        }
        
        // Note: Spiel relation validation removed since Spiel content type was removed
        
        this.successes.push(`Team ${teamName} relations validated successfully`);
      }
      
    } catch (error) {
      this.errors.push(`Failed to validate team relations: ${error.message}`);
    }
  }

  async validateSpielRelations() {
    this.log('🔍 Skipping spiel validation - content type removed...', 'info');
    this.warnings.push('Spiel validation skipped - content type was removed');
  }

  async validateSpielerRelations() {
    this.log('🔍 Validating spieler relations...', 'info');
    
    try {
      const response = await this.api.get('/spielers?populate=*');
      let spielers = response.data;
      
      // Handle different response formats
      if (spielers.data) {
        spielers = spielers.data;
      }
      
      if (!spielers || spielers.length === 0) {
        this.warnings.push('No spielers found in database');
        return;
      }

      for (const spieler of spielers) {
        const spielerId = spieler.id;
        const spielerName = `${spieler.attributes.vorname} ${spieler.attributes.nachname}`;
        
        // Validate no mannschaft references exist (should be consolidated)
        const spielerStr = JSON.stringify(spieler);
        if (spielerStr.includes('mannschaft')) {
          this.errors.push(`Spieler ${spielerName} still contains mannschaft references - consolidation incomplete`);
        }
        
        // Validate hauptteam bidirectional relation
        if (spieler.attributes.hauptteam?.data) {
          const teamId = spieler.attributes.hauptteam.data.id;
          const teamResponse = await this.api.get(`/teams/${teamId}?populate=spieler`);
          const teamData = teamResponse.data.data;
          
          const teamSpielerIds = teamData.attributes.spieler?.data?.map(s => s.id) || [];
          if (!teamSpielerIds.includes(parseInt(spielerId))) {
            this.errors.push(`Broken bidirectional relation: Spieler ${spielerName} references Team ${teamId} as hauptteam, but team doesn't reference spieler back`);
          }
        }
        
        // Validate aushilfe_teams bidirectional relations
        if (spieler.attributes.aushilfe_teams?.data) {
          for (const aushilfeTeam of spieler.attributes.aushilfe_teams.data) {
            const teamResponse = await this.api.get(`/teams/${aushilfeTeam.id}?populate=aushilfe_spieler`);
            const teamData = teamResponse.data.data;
            
            const aushilfeSpielerIds = teamData.attributes.aushilfe_spieler?.data?.map(s => s.id) || [];
            if (!aushilfeSpielerIds.includes(parseInt(spielerId))) {
              this.errors.push(`Broken bidirectional relation: Spieler ${spielerName} references Team ${aushilfeTeam.id} as aushilfe, but team doesn't reference spieler back`);
            }
          }
        }
        
        this.successes.push(`Spieler ${spielerName} relations validated successfully`);
      }
      
    } catch (error) {
      this.errors.push(`Failed to validate spieler relations: ${error.message}`);
    }
  }

  async validateNoMannschaftReferences() {
    this.log('🔍 Checking for remaining mannschaft references...', 'info');
    
    try {
      // Check if mannschaft content type still exists
      try {
        await this.api.get('/mannschafts');
        this.errors.push('Mannschaft content type still exists - should be removed after consolidation');
      } catch (error) {
        if (error.response?.status === 404) {
          this.successes.push('Mannschaft content type successfully removed');
        } else {
          this.warnings.push(`Could not verify mannschaft removal: ${error.message}`);
        }
      }
      
    } catch (error) {
      this.errors.push(`Failed to validate mannschaft removal: ${error.message}`);
    }
  }

  async validateDataIntegrity() {
    this.log('🔍 Validating overall data integrity...', 'info');
    
    try {
      // Check for orphaned relations
      const teams = await this.api.get('/teams');
      const spielers = await this.api.get('/spielers');
      
      // Handle different response formats
      let teamCount = 0;
      let spielerCount = 0;
      
      if (Array.isArray(teams.data)) {
        teamCount = teams.data.length;
      } else if (teams.data?.data) {
        teamCount = teams.data.data.length;
      }
      
      if (Array.isArray(spielers.data)) {
        spielerCount = spielers.data.length;
      } else if (spielers.data?.data) {
        spielerCount = spielers.data.data.length;
      }
      
      this.log(`📊 Data counts: ${teamCount} teams, ${spielerCount} spielers`, 'info');
      
      if (teamCount === 0) {
        this.warnings.push('No teams found - this might indicate a data issue');
      }
      
      this.successes.push('Data integrity check completed');
      
    } catch (error) {
      this.errors.push(`Failed to validate data integrity: ${error.message}`);
    }
  }

  async runAllValidations() {
    this.log('🚀 Starting comprehensive data consistency validation...', 'info');
    
    await this.validateTeamRelations();
    await this.validateSpielRelations();
    await this.validateSpielerRelations();
    await this.validateNoMannschaftReferences();
    await this.validateDataIntegrity();
    
    this.printSummary();
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    this.log('📋 VALIDATION SUMMARY', 'info');
    console.log('='.repeat(60));
    
    if (this.successes.length > 0) {
      this.log(`✅ ${this.successes.length} successful validations:`, 'success');
      this.successes.forEach(success => console.log(`   • ${success}`));
    }
    
    if (this.warnings.length > 0) {
      this.log(`⚠️  ${this.warnings.length} warnings:`, 'warning');
      this.warnings.forEach(warning => console.log(`   • ${warning}`));
    }
    
    if (this.errors.length > 0) {
      this.log(`❌ ${this.errors.length} errors found:`, 'error');
      this.errors.forEach(error => console.log(`   • ${error}`));
      process.exit(1);
    } else {
      this.log('🎉 All validations passed successfully!', 'success');
      process.exit(0);
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new DataConsistencyValidator();
  validator.runAllValidations().catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

module.exports = DataConsistencyValidator;