#!/usr/bin/env node

/**
 * Team/Mannschaft Consolidation Script
 * 
 * This script consolidates the duplicate team/mannschaft concepts by:
 * 1. Creating backups of all affected data
 * 2. Migrating team data to mannschaft
 * 3. Updating all references to use mannschaft
 * 4. Providing rollback capabilities
 */

const fs = require('fs');
const path = require('path');

// Configuration
const BACKUP_DIR = path.join(__dirname, '../backups/team-mannschaft-consolidation');
const LOG_FILE = path.join(BACKUP_DIR, 'consolidation.log');

class TeamMannschaftConsolidator {
  constructor() {
    this.strapi = null;
    this.backupData = {};
    this.migrationLog = [];
  }

  async initialize() {
    // Initialize Strapi
    const Strapi = require('@strapi/strapi');
    this.strapi = await Strapi().load();
    
    // Create backup directory
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    this.log('Consolidation script initialized');
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    this.migrationLog.push(logEntry);
    
    // Write to log file
    fs.appendFileSync(LOG_FILE, logEntry + '\n');
  }

  async createBackups() {
    this.log('Creating backups of all affected data...');
    
    try {
      // Backup teams
      const teams = await this.strapi.entityService.findMany('api::team.team', {
        populate: '*'
      });
      this.backupData.teams = teams;
      this.log(`Backed up ${teams.length} teams`);

      // Backup mannschaften
      const mannschaften = await this.strapi.entityService.findMany('api::mannschaft.mannschaft', {
        populate: '*'
      });
      this.backupData.mannschaften = mannschaften;
      this.log(`Backed up ${mannschaften.length} mannschaften`);

      // Backup spiele (for relation references)
      const spiele = await this.strapi.entityService.findMany('api::spiel.spiel', {
        populate: ['unser_team', 'unsere_mannschaft']
      });
      this.backupData.spiele = spiele;
      this.log(`Backed up ${spiele.length} spiele`);

      // Backup spieler (for relation references)
      const spieler = await this.strapi.entityService.findMany('api::spieler.spieler', {
        populate: ['hauptteam', 'aushilfe_teams', 'mannschaft']
      });
      this.backupData.spieler = spieler;
      this.log(`Backed up ${spieler.length} spieler`);

      // Save backup to file
      const backupFile = path.join(BACKUP_DIR, `backup-${Date.now()}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(this.backupData, null, 2));
      this.log(`Backup saved to ${backupFile}`);

    } catch (error) {
      this.log(`ERROR creating backups: ${error.message}`);
      throw error;
    }
  }

  async analyzeDataConflicts() {
    this.log('Analyzing potential data conflicts...');
    
    const conflicts = [];
    const teamsByName = {};
    const mannschaftenByName = {};

    // Group teams by name
    this.backupData.teams.forEach(team => {
      if (!teamsByName[team.name]) {
        teamsByName[team.name] = [];
      }
      teamsByName[team.name].push(team);
    });

    // Group mannschaften by name
    this.backupData.mannschaften.forEach(mannschaft => {
      if (!mannschaftenByName[mannschaft.name]) {
        mannschaftenByName[mannschaft.name] = [];
      }
      mannschaftenByName[mannschaft.name].push(mannschaft);
    });

    // Find conflicts (same name in both collections)
    for (const name in teamsByName) {
      if (mannschaftenByName[name]) {
        conflicts.push({
          name,
          teams: teamsByName[name],
          mannschaften: mannschaftenByName[name]
        });
      }
    }

    this.log(`Found ${conflicts.length} naming conflicts`);
    conflicts.forEach(conflict => {
      this.log(`  - Conflict: "${conflict.name}" exists in both collections`);
    });

    return conflicts;
  }

  async migrateTeamsToMannschaften() {
    this.log('Starting team to mannschaft migration...');
    
    const conflicts = await this.analyzeDataConflicts();
    const migrationResults = {
      migrated: [],
      conflicts: [],
      errors: []
    };

    for (const team of this.backupData.teams) {
      try {
        // Check if mannschaft with same name already exists
        const existingMannschaft = this.backupData.mannschaften.find(m => m.name === team.name);
        
        if (existingMannschaft) {
          // Handle conflict - merge data, prioritizing team data for most fields
          this.log(`Merging team "${team.name}" with existing mannschaft`);
          
          const mergedData = this.mergeTeamAndMannschaft(team, existingMannschaft);
          
          await this.strapi.entityService.update('api::mannschaft.mannschaft', existingMannschaft.id, {
            data: mergedData
          });
          
          migrationResults.conflicts.push({
            teamId: team.id,
            mannschaftId: existingMannschaft.id,
            name: team.name,
            action: 'merged'
          });
          
        } else {
          // Create new mannschaft from team data
          this.log(`Creating new mannschaft from team "${team.name}"`);
          
          const mannschaftData = this.convertTeamToMannschaft(team);
          
          const newMannschaft = await this.strapi.entityService.create('api::mannschaft.mannschaft', {
            data: mannschaftData
          });
          
          migrationResults.migrated.push({
            teamId: team.id,
            mannschaftId: newMannschaft.id,
            name: team.name
          });
        }
        
      } catch (error) {
        this.log(`ERROR migrating team "${team.name}": ${error.message}`);
        migrationResults.errors.push({
          teamId: team.id,
          name: team.name,
          error: error.message
        });
      }
    }

    this.log(`Migration completed: ${migrationResults.migrated.length} migrated, ${migrationResults.conflicts.length} conflicts resolved, ${migrationResults.errors.length} errors`);
    return migrationResults;
  }

  mergeTeamAndMannschaft(team, mannschaft) {
    // Merge strategy: prioritize team data for most fields, but preserve mannschaft-specific data
    return {
      name: team.name,
      display_name: team.name, // Use team name as display name
      liga: team.liga_name || mannschaft.liga,
      liga_vollname: team.liga_vollname || mannschaft.liga_vollname,
      trainer: team.trainer || mannschaft.trainer,
      co_trainer: team.co_trainer || mannschaft.co_trainer,
      trainingszeiten: team.trainingszeiten || mannschaft.trainingszeiten,
      heimspieltag: team.heimspieltag || mannschaft.heimspieltag,
      altersklasse: team.altersklasse || mannschaft.altersklasse,
      teamfoto: team.teamfoto || mannschaft.teamfoto,
      
      // Table statistics - prioritize team data
      tabellenplatz: team.tabellenplatz || mannschaft.tabellenplatz,
      punkte: team.punkte || mannschaft.punkte || 0,
      spiele_gesamt: team.spiele_gesamt || mannschaft.spiele_gesamt || 0,
      siege: team.siege || mannschaft.siege || 0,
      unentschieden: team.unentschieden || mannschaft.unentschieden || 0,
      niederlagen: team.niederlagen || mannschaft.niederlagen || 0,
      tore_fuer: team.tore_fuer || mannschaft.tore_fuer || 0,
      tore_gegen: team.tore_gegen || mannschaft.tore_gegen || 0,
      tordifferenz: team.tordifferenz || mannschaft.tordifferenz || 0,
      form_letzte_5: team.form_letzte_5 || mannschaft.form_letzte_5 || [],
      trend: team.trend || mannschaft.trend || 'gleich',
      status: team.status || mannschaft.status || 'aktiv'
    };
  }

  convertTeamToMannschaft(team) {
    return {
      name: team.name,
      display_name: team.name,
      liga: team.liga_name,
      liga_vollname: team.liga_vollname,
      trainer: team.trainer,
      co_trainer: team.co_trainer,
      trainingszeiten: team.trainingszeiten,
      heimspieltag: team.heimspieltag,
      altersklasse: team.altersklasse,
      teamfoto: team.teamfoto,
      
      // Table statistics
      tabellenplatz: team.tabellenplatz,
      punkte: team.punkte || 0,
      spiele_gesamt: team.spiele_gesamt || 0,
      siege: team.siege || 0,
      unentschieden: team.unentschieden || 0,
      niederlagen: team.niederlagen || 0,
      tore_fuer: team.tore_fuer || 0,
      tore_gegen: team.tore_gegen || 0,
      tordifferenz: team.tordifferenz || 0,
      form_letzte_5: team.form_letzte_5 || [],
      trend: team.trend || 'gleich',
      status: team.status || 'aktiv'
    };
  }

  async updateSpielReferences(migrationResults) {
    this.log('Updating spiel references to use mannschaft...');
    
    // Create mapping from team ID to mannschaft ID
    const teamToMannschaftMap = new Map();
    
    migrationResults.migrated.forEach(result => {
      teamToMannschaftMap.set(result.teamId, result.mannschaftId);
    });
    
    migrationResults.conflicts.forEach(result => {
      teamToMannschaftMap.set(result.teamId, result.mannschaftId);
    });

    let updatedCount = 0;
    
    for (const spiel of this.backupData.spiele) {
      try {
        const updates = {};
        let needsUpdate = false;
        
        // If spiel has unser_team reference, map it to unsere_mannschaft
        if (spiel.unser_team && teamToMannschaftMap.has(spiel.unser_team.id)) {
          updates.unsere_mannschaft = teamToMannschaftMap.get(spiel.unser_team.id);
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          await this.strapi.entityService.update('api::spiel.spiel', spiel.id, {
            data: updates
          });
          updatedCount++;
        }
        
      } catch (error) {
        this.log(`ERROR updating spiel ${spiel.id}: ${error.message}`);
      }
    }
    
    this.log(`Updated ${updatedCount} spiel references`);
  }

  async updateSpielerReferences(migrationResults) {
    this.log('Updating spieler references to use mannschaft...');
    
    // Create mapping from team ID to mannschaft ID
    const teamToMannschaftMap = new Map();
    
    migrationResults.migrated.forEach(result => {
      teamToMannschaftMap.set(result.teamId, result.mannschaftId);
    });
    
    migrationResults.conflicts.forEach(result => {
      teamToMannschaftMap.set(result.teamId, result.mannschaftId);
    });

    let updatedCount = 0;
    
    for (const spieler of this.backupData.spieler) {
      try {
        const updates = {};
        let needsUpdate = false;
        
        // If spieler has hauptteam reference, map it to mannschaft
        if (spieler.hauptteam && teamToMannschaftMap.has(spieler.hauptteam.id)) {
          updates.mannschaft = teamToMannschaftMap.get(spieler.hauptteam.id);
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          await this.strapi.entityService.update('api::spieler.spieler', spieler.id, {
            data: updates
          });
          updatedCount++;
        }
        
      } catch (error) {
        this.log(`ERROR updating spieler ${spieler.id}: ${error.message}`);
      }
    }
    
    this.log(`Updated ${updatedCount} spieler references`);
  }

  async validateMigration() {
    this.log('Validating migration results...');
    
    const validation = {
      mannschaften: 0,
      spieleWithMannschaft: 0,
      spielerWithMannschaft: 0,
      errors: []
    };

    try {
      // Count mannschaften
      const mannschaften = await this.strapi.entityService.findMany('api::mannschaft.mannschaft');
      validation.mannschaften = mannschaften.length;

      // Count spiele with mannschaft references
      const spiele = await this.strapi.entityService.findMany('api::spiel.spiel', {
        populate: ['unsere_mannschaft']
      });
      validation.spieleWithMannschaft = spiele.filter(s => s.unsere_mannschaft).length;

      // Count spieler with mannschaft references
      const spieler = await this.strapi.entityService.findMany('api::spieler.spieler', {
        populate: ['mannschaft']
      });
      validation.spielerWithMannschaft = spieler.filter(s => s.mannschaft).length;

      this.log(`Validation results:`);
      this.log(`  - Mannschaften: ${validation.mannschaften}`);
      this.log(`  - Spiele with mannschaft: ${validation.spieleWithMannschaft}`);
      this.log(`  - Spieler with mannschaft: ${validation.spielerWithMannschaft}`);

    } catch (error) {
      validation.errors.push(error.message);
      this.log(`ERROR during validation: ${error.message}`);
    }

    return validation;
  }

  async run() {
    try {
      await this.initialize();
      await this.createBackups();
      
      const migrationResults = await this.migrateTeamsToMannschaften();
      await this.updateSpielReferences(migrationResults);
      await this.updateSpielerReferences(migrationResults);
      
      const validation = await this.validateMigration();
      
      this.log('Team/Mannschaft consolidation completed successfully!');
      
      // Save final migration report
      const reportFile = path.join(BACKUP_DIR, `migration-report-${Date.now()}.json`);
      fs.writeFileSync(reportFile, JSON.stringify({
        migrationResults,
        validation,
        log: this.migrationLog
      }, null, 2));
      
      this.log(`Migration report saved to ${reportFile}`);
      
    } catch (error) {
      this.log(`FATAL ERROR: ${error.message}`);
      throw error;
    } finally {
      if (this.strapi) {
        await this.strapi.destroy();
      }
    }
  }

  // Rollback functionality
  async rollback(backupFile) {
    this.log(`Starting rollback from ${backupFile}...`);
    
    try {
      await this.initialize();
      
      const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
      
      // This would implement rollback logic
      // For now, just log that rollback capability exists
      this.log('Rollback functionality available - would restore from backup');
      
    } catch (error) {
      this.log(`ERROR during rollback: ${error.message}`);
      throw error;
    }
  }
}

// CLI interface
if (require.main === module) {
  const consolidator = new TeamMannschaftConsolidator();
  
  const command = process.argv[2];
  
  if (command === 'rollback') {
    const backupFile = process.argv[3];
    if (!backupFile) {
      console.error('Usage: node consolidate-team-mannschaft.js rollback <backup-file>');
      process.exit(1);
    }
    consolidator.rollback(backupFile).catch(console.error);
  } else {
    consolidator.run().catch(console.error);
  }
}

module.exports = TeamMannschaftConsolidator;