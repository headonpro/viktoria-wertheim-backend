#!/usr/bin/env node

/**
 * Rollback Script for Team/Mannschaft Consolidation
 * 
 * This script provides rollback capabilities for the team/mannschaft consolidation:
 * 1. Restores schema files from backups
 * 2. Restores data from backups
 * 3. Validates rollback success
 */

const fs = require('fs');
const path = require('path');

class ConsolidationRollback {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    this.schemasDir = path.join(__dirname, '../src/api');
    this.strapi = null;
  }

  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  async initialize() {
    // Initialize Strapi
    const Strapi = require('@strapi/strapi');
    this.strapi = await Strapi().load();
    this.log('Strapi initialized for rollback');
  }

  listAvailableBackups() {
    this.log('Scanning for available backups...');
    
    const backups = {
      schemas: [],
      data: []
    };

    // Find schema backups
    const schemaBackupDir = path.join(this.backupDir, 'schema-updates');
    if (fs.existsSync(schemaBackupDir)) {
      const schemaFiles = fs.readdirSync(schemaBackupDir)
        .filter(file => file.endsWith('-schema-backup.json'))
        .map(file => ({
          file,
          path: path.join(schemaBackupDir, file),
          timestamp: fs.statSync(path.join(schemaBackupDir, file)).mtime
        }))
        .sort((a, b) => b.timestamp - a.timestamp);
      
      backups.schemas = schemaFiles;
    }

    // Find data backups
    const dataBackupDir = path.join(this.backupDir, 'team-mannschaft-consolidation');
    if (fs.existsSync(dataBackupDir)) {
      const dataFiles = fs.readdirSync(dataBackupDir)
        .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
        .map(file => ({
          file,
          path: path.join(dataBackupDir, file),
          timestamp: fs.statSync(path.join(dataBackupDir, file)).mtime
        }))
        .sort((a, b) => b.timestamp - a.timestamp);
      
      backups.data = dataFiles;
    }

    this.log(`Found ${backups.schemas.length} schema backups and ${backups.data.length} data backups`);
    return backups;
  }

  async restoreSchemas(schemaBackupTimestamp) {
    this.log(`Restoring schemas from timestamp: ${schemaBackupTimestamp}`);
    
    const schemaBackupDir = path.join(this.backupDir, 'schema-updates');
    const schemaTypes = ['spiel', 'spieler', 'mannschaft', 'club', 'liga', 'saison'];
    
    let restoredCount = 0;
    
    for (const schemaType of schemaTypes) {
      const backupPattern = `${schemaType}-schema-backup-${schemaBackupTimestamp}.json`;
      const backupFiles = fs.readdirSync(schemaBackupDir)
        .filter(file => file.includes(schemaType) && file.includes('schema-backup'));
      
      if (backupFiles.length > 0) {
        // Use the most recent backup for this schema type
        const backupFile = backupFiles.sort().pop();
        const backupPath = path.join(schemaBackupDir, backupFile);
        const targetPath = path.join(this.schemasDir, `${schemaType}/content-types/${schemaType}/schema.json`);
        
        if (fs.existsSync(backupPath) && fs.existsSync(path.dirname(targetPath))) {
          fs.copyFileSync(backupPath, targetPath);
          this.log(`Restored ${schemaType} schema from ${backupFile}`);
          restoredCount++;
        }
      }
    }
    
    this.log(`Restored ${restoredCount} schema files`);
  }

  async restoreData(dataBackupFile) {
    this.log(`Restoring data from backup: ${dataBackupFile}`);
    
    const backupPath = path.join(this.backupDir, 'team-mannschaft-consolidation', dataBackupFile);
    
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }
    
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    
    // Restore teams
    if (backupData.teams) {
      this.log(`Restoring ${backupData.teams.length} teams...`);
      
      for (const team of backupData.teams) {
        try {
          // Check if team still exists
          const existingTeam = await this.strapi.entityService.findOne('api::team.team', team.id);
          
          if (existingTeam) {
            // Update existing team
            await this.strapi.entityService.update('api::team.team', team.id, {
              data: this.cleanDataForRestore(team)
            });
          } else {
            // Recreate team
            await this.strapi.entityService.create('api::team.team', {
              data: { ...this.cleanDataForRestore(team), id: team.id }
            });
          }
        } catch (error) {
          this.log(`Error restoring team ${team.id}: ${error.message}`);
        }
      }
    }

    // Restore mannschaften to original state
    if (backupData.mannschaften) {
      this.log(`Restoring ${backupData.mannschaften.length} mannschaften...`);
      
      for (const mannschaft of backupData.mannschaften) {
        try {
          const existingMannschaft = await this.strapi.entityService.findOne('api::mannschaft.mannschaft', mannschaft.id);
          
          if (existingMannschaft) {
            await this.strapi.entityService.update('api::mannschaft.mannschaft', mannschaft.id, {
              data: this.cleanDataForRestore(mannschaft)
            });
          } else {
            await this.strapi.entityService.create('api::mannschaft.mannschaft', {
              data: { ...this.cleanDataForRestore(mannschaft), id: mannschaft.id }
            });
          }
        } catch (error) {
          this.log(`Error restoring mannschaft ${mannschaft.id}: ${error.message}`);
        }
      }
    }

    // Restore spiele relations
    if (backupData.spiele) {
      this.log(`Restoring ${backupData.spiele.length} spiele relations...`);
      
      for (const spiel of backupData.spiele) {
        try {
          const updates = {};
          
          if (spiel.unser_team) {
            updates.unser_team = spiel.unser_team.id || spiel.unser_team;
          }
          
          if (spiel.unsere_mannschaft) {
            updates.unsere_mannschaft = spiel.unsere_mannschaft.id || spiel.unsere_mannschaft;
          }
          
          if (Object.keys(updates).length > 0) {
            await this.strapi.entityService.update('api::spiel.spiel', spiel.id, {
              data: updates
            });
          }
        } catch (error) {
          this.log(`Error restoring spiel ${spiel.id}: ${error.message}`);
        }
      }
    }

    // Restore spieler relations
    if (backupData.spieler) {
      this.log(`Restoring ${backupData.spieler.length} spieler relations...`);
      
      for (const spieler of backupData.spieler) {
        try {
          const updates = {};
          
          if (spieler.hauptteam) {
            updates.hauptteam = spieler.hauptteam.id || spieler.hauptteam;
          }
          
          if (spieler.aushilfe_teams && Array.isArray(spieler.aushilfe_teams)) {
            updates.aushilfe_teams = spieler.aushilfe_teams.map(team => team.id || team);
          }
          
          if (spieler.mannschaft) {
            updates.mannschaft = spieler.mannschaft.id || spieler.mannschaft;
          }
          
          if (Object.keys(updates).length > 0) {
            await this.strapi.entityService.update('api::spieler.spieler', spieler.id, {
              data: updates
            });
          }
        } catch (error) {
          this.log(`Error restoring spieler ${spieler.id}: ${error.message}`);
        }
      }
    }
    
    this.log('Data restoration completed');
  }

  cleanDataForRestore(data) {
    // Remove metadata fields that shouldn't be restored
    const cleaned = { ...data };
    delete cleaned.id;
    delete cleaned.createdAt;
    delete cleaned.updatedAt;
    delete cleaned.publishedAt;
    
    // Clean up relation fields to only include IDs
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] && typeof cleaned[key] === 'object') {
        if (Array.isArray(cleaned[key])) {
          // Handle array relations
          cleaned[key] = cleaned[key].map(item => 
            typeof item === 'object' && item.id ? item.id : item
          );
        } else if (cleaned[key].id) {
          // Handle single relations
          cleaned[key] = cleaned[key].id;
        }
      }
    });
    
    return cleaned;
  }

  async validateRollback() {
    this.log('Validating rollback results...');
    
    const validation = {
      teams: 0,
      mannschaften: 0,
      spieleWithTeam: 0,
      spieleWithMannschaft: 0,
      spielerWithTeam: 0,
      spielerWithMannschaft: 0,
      errors: []
    };

    try {
      // Count teams
      const teams = await this.strapi.entityService.findMany('api::team.team');
      validation.teams = teams.length;

      // Count mannschaften
      const mannschaften = await this.strapi.entityService.findMany('api::mannschaft.mannschaft');
      validation.mannschaften = mannschaften.length;

      // Count spiele relations
      const spiele = await this.strapi.entityService.findMany('api::spiel.spiel', {
        populate: ['unser_team', 'unsere_mannschaft']
      });
      validation.spieleWithTeam = spiele.filter(s => s.unser_team).length;
      validation.spieleWithMannschaft = spiele.filter(s => s.unsere_mannschaft).length;

      // Count spieler relations
      const spieler = await this.strapi.entityService.findMany('api::spieler.spieler', {
        populate: ['hauptteam', 'mannschaft']
      });
      validation.spielerWithTeam = spieler.filter(s => s.hauptteam).length;
      validation.spielerWithMannschaft = spieler.filter(s => s.mannschaft).length;

      this.log('Rollback validation results:');
      this.log(`  - Teams: ${validation.teams}`);
      this.log(`  - Mannschaften: ${validation.mannschaften}`);
      this.log(`  - Spiele with team: ${validation.spieleWithTeam}`);
      this.log(`  - Spiele with mannschaft: ${validation.spieleWithMannschaft}`);
      this.log(`  - Spieler with team: ${validation.spielerWithTeam}`);
      this.log(`  - Spieler with mannschaft: ${validation.spielerWithMannschaft}`);

    } catch (error) {
      validation.errors.push(error.message);
      this.log(`ERROR during validation: ${error.message}`);
    }

    return validation;
  }

  async run(options = {}) {
    try {
      await this.initialize();
      
      const backups = this.listAvailableBackups();
      
      if (backups.schemas.length === 0 && backups.data.length === 0) {
        throw new Error('No backups found to restore from');
      }

      // Restore schemas if requested
      if (options.restoreSchemas !== false && backups.schemas.length > 0) {
        const latestSchemaBackup = backups.schemas[0];
        await this.restoreSchemas(latestSchemaBackup.timestamp);
      }

      // Restore data if requested
      if (options.restoreData !== false && backups.data.length > 0) {
        const latestDataBackup = backups.data[0];
        await this.restoreData(latestDataBackup.file);
      }

      // Validate rollback
      const validation = await this.validateRollback();
      
      this.log('Rollback completed successfully!');
      
      // Save rollback report
      const reportFile = path.join(this.backupDir, `rollback-report-${Date.now()}.json`);
      fs.writeFileSync(reportFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        validation,
        options
      }, null, 2));
      
      this.log(`Rollback report saved to ${reportFile}`);
      
    } catch (error) {
      this.log(`FATAL ERROR during rollback: ${error.message}`);
      throw error;
    } finally {
      if (this.strapi) {
        await this.strapi.destroy();
      }
    }
  }
}

// CLI interface
if (require.main === module) {
  const rollback = new ConsolidationRollback();
  
  const options = {};
  
  // Parse command line arguments
  process.argv.slice(2).forEach(arg => {
    if (arg === '--schemas-only') {
      options.restoreData = false;
    } else if (arg === '--data-only') {
      options.restoreSchemas = false;
    }
  });
  
  rollback.run(options).catch(console.error);
}

module.exports = ConsolidationRollback;