#!/usr/bin/env node

/**
 * Schema Update Script for Team/Mannschaft Consolidation
 * 
 * This script updates content type schemas to:
 * 1. Remove team references from spiel and spieler schemas
 * 2. Ensure mannschaft is the single source of truth
 * 3. Update relation mappings consistently
 */

const fs = require('fs');
const path = require('path');

class SchemaUpdater {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups/schema-updates');
    this.schemasDir = path.join(__dirname, '../src/api');
  }

  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  createBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  backupSchema(schemaPath, contentType) {
    const backupPath = path.join(this.backupDir, `${contentType}-schema-backup-${Date.now()}.json`);
    fs.copyFileSync(schemaPath, backupPath);
    this.log(`Backed up ${contentType} schema to ${backupPath}`);
  }

  updateSpielSchema() {
    this.log('Updating spiel schema...');
    
    const schemaPath = path.join(this.schemasDir, 'spiel/content-types/spiel/schema.json');
    this.backupSchema(schemaPath, 'spiel');
    
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    
    // Remove unser_team reference
    if (schema.attributes.unser_team) {
      delete schema.attributes.unser_team;
      this.log('Removed unser_team reference from spiel schema');
    }
    
    // Ensure unsere_mannschaft is properly configured
    if (schema.attributes.unsere_mannschaft) {
      schema.attributes.unsere_mannschaft = {
        "type": "relation",
        "relation": "manyToOne",
        "target": "api::mannschaft.mannschaft",
        "inversedBy": "spiele",
        "required": true
      };
      this.log('Updated unsere_mannschaft reference in spiel schema');
    }
    
    // Add gegner_mannschaft for opponent team reference
    if (!schema.attributes.gegner_mannschaft) {
      schema.attributes.gegner_mannschaft = {
        "type": "relation",
        "relation": "manyToOne",
        "target": "api::mannschaft.mannschaft"
      };
      this.log('Added gegner_mannschaft reference to spiel schema');
    }
    
    fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
    this.log('Spiel schema updated successfully');
  }

  updateSpielerSchema() {
    this.log('Updating spieler schema...');
    
    const schemaPath = path.join(this.schemasDir, 'spieler/content-types/spieler/schema.json');
    this.backupSchema(schemaPath, 'spieler');
    
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    
    // Remove team references
    if (schema.attributes.hauptteam) {
      delete schema.attributes.hauptteam;
      this.log('Removed hauptteam reference from spieler schema');
    }
    
    if (schema.attributes.aushilfe_teams) {
      delete schema.attributes.aushilfe_teams;
      this.log('Removed aushilfe_teams reference from spieler schema');
    }
    
    // Ensure mannschaft reference is properly configured
    if (schema.attributes.mannschaft) {
      schema.attributes.mannschaft = {
        "type": "relation",
        "relation": "manyToOne",
        "target": "api::mannschaft.mannschaft",
        "inversedBy": "spieler",
        "required": true
      };
      this.log('Updated mannschaft reference in spieler schema');
    }
    
    // Add aushilfe_mannschaften for substitute team assignments
    if (!schema.attributes.aushilfe_mannschaften) {
      schema.attributes.aushilfe_mannschaften = {
        "type": "relation",
        "relation": "manyToMany",
        "target": "api::mannschaft.mannschaft"
      };
      this.log('Added aushilfe_mannschaften reference to spieler schema');
    }
    
    fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
    this.log('Spieler schema updated successfully');
  }

  updateMannschaftSchema() {
    this.log('Updating mannschaft schema...');
    
    const schemaPath = path.join(this.schemasDir, 'mannschaft/content-types/mannschaft/schema.json');
    this.backupSchema(schemaPath, 'mannschaft');
    
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    
    // Ensure all necessary fields are present and properly configured
    const requiredFields = {
      name: {
        "type": "string",
        "required": true,
        "unique": true,
        "maxLength": 50
      },
      display_name: {
        "type": "string",
        "maxLength": 100
      },
      liga: {
        "type": "string",
        "required": true,
        "maxLength": 100
      },
      liga_vollname: {
        "type": "string",
        "maxLength": 150
      },
      trainer: {
        "type": "string",
        "maxLength": 100
      },
      co_trainer: {
        "type": "string",
        "maxLength": 100
      },
      trainingszeiten: {
        "type": "text"
      },
      trainingsort: {
        "type": "string",
        "maxLength": 100
      },
      heimspieltag: {
        "type": "string",
        "maxLength": 50
      },
      altersklasse: {
        "type": "string",
        "maxLength": 50
      },
      teamfoto: {
        "type": "media",
        "multiple": false,
        "required": false,
        "allowedTypes": ["images"]
      },
      // Table statistics
      tabellenplatz: {
        "type": "integer",
        "min": 1,
        "default": 1
      },
      punkte: {
        "type": "integer",
        "min": 0,
        "default": 0
      },
      spiele_gesamt: {
        "type": "integer",
        "min": 0,
        "default": 0
      },
      siege: {
        "type": "integer",
        "min": 0,
        "default": 0
      },
      unentschieden: {
        "type": "integer",
        "min": 0,
        "default": 0
      },
      niederlagen: {
        "type": "integer",
        "min": 0,
        "default": 0
      },
      tore_fuer: {
        "type": "integer",
        "min": 0,
        "default": 0
      },
      tore_gegen: {
        "type": "integer",
        "min": 0,
        "default": 0
      },
      tordifferenz: {
        "type": "integer",
        "default": 0
      },
      form_letzte_5: {
        "type": "json",
        "default": []
      },
      trend: {
        "type": "enumeration",
        "enum": ["steigend", "gleich", "fallend"],
        "default": "gleich"
      },
      status: {
        "type": "enumeration",
        "enum": ["aktiv", "inaktiv", "pausiert"],
        "default": "aktiv"
      }
    };
    
    // Update/add required fields
    Object.keys(requiredFields).forEach(fieldName => {
      schema.attributes[fieldName] = requiredFields[fieldName];
    });
    
    // Ensure proper relations
    schema.attributes.spieler = {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::spieler.spieler",
      "mappedBy": "mannschaft"
    };
    
    schema.attributes.spiele = {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::spiel.spiel",
      "mappedBy": "unsere_mannschaft"
    };
    
    // Add relation for club if not present
    if (!schema.attributes.club) {
      schema.attributes.club = {
        "type": "relation",
        "relation": "manyToOne",
        "target": "api::club.club",
        "inversedBy": "mannschaften"
      };
    }
    
    // Add relation for liga if not present
    if (!schema.attributes.liga_relation) {
      schema.attributes.liga_relation = {
        "type": "relation",
        "relation": "manyToOne",
        "target": "api::liga.liga",
        "inversedBy": "mannschaften"
      };
    }
    
    // Add relation for saison if not present
    if (!schema.attributes.saison) {
      schema.attributes.saison = {
        "type": "relation",
        "relation": "manyToOne",
        "target": "api::saison.saison",
        "inversedBy": "mannschaften"
      };
    }
    
    fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
    this.log('Mannschaft schema updated successfully');
  }

  updateClubSchema() {
    this.log('Updating club schema to reference mannschaften...');
    
    const schemaPath = path.join(this.schemasDir, 'club/content-types/club/schema.json');
    
    if (!fs.existsSync(schemaPath)) {
      this.log('Club schema not found, skipping...');
      return;
    }
    
    this.backupSchema(schemaPath, 'club');
    
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    
    // Update teams relation to mannschaften
    if (schema.attributes.teams) {
      schema.attributes.mannschaften = {
        "type": "relation",
        "relation": "oneToMany",
        "target": "api::mannschaft.mannschaft",
        "mappedBy": "club"
      };
      // Keep teams relation for now during transition
      this.log('Added mannschaften relation to club schema');
    }
    
    fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
    this.log('Club schema updated successfully');
  }

  updateLigaSchema() {
    this.log('Updating liga schema to reference mannschaften...');
    
    const schemaPath = path.join(this.schemasDir, 'liga/content-types/liga/schema.json');
    
    if (!fs.existsSync(schemaPath)) {
      this.log('Liga schema not found, skipping...');
      return;
    }
    
    this.backupSchema(schemaPath, 'liga');
    
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    
    // Update teams relation to mannschaften
    if (schema.attributes.teams) {
      schema.attributes.mannschaften = {
        "type": "relation",
        "relation": "oneToMany",
        "target": "api::mannschaft.mannschaft",
        "mappedBy": "liga_relation"
      };
      // Keep teams relation for now during transition
      this.log('Added mannschaften relation to liga schema');
    }
    
    fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
    this.log('Liga schema updated successfully');
  }

  updateSaisonSchema() {
    this.log('Updating saison schema to reference mannschaften...');
    
    const schemaPath = path.join(this.schemasDir, 'saison/content-types/saison/schema.json');
    
    if (!fs.existsSync(schemaPath)) {
      this.log('Saison schema not found, skipping...');
      return;
    }
    
    this.backupSchema(schemaPath, 'saison');
    
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    
    // Update teams relation to mannschaften
    if (schema.attributes.teams) {
      schema.attributes.mannschaften = {
        "type": "relation",
        "relation": "oneToMany",
        "target": "api::mannschaft.mannschaft",
        "mappedBy": "saison"
      };
      // Keep teams relation for now during transition
      this.log('Added mannschaften relation to saison schema');
    }
    
    fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
    this.log('Saison schema updated successfully');
  }

  generateMigrationSummary() {
    const summary = {
      timestamp: new Date().toISOString(),
      changes: [
        'Removed unser_team reference from spiel schema',
        'Made unsere_mannschaft required in spiel schema',
        'Added gegner_mannschaft reference to spiel schema',
        'Removed hauptteam and aushilfe_teams from spieler schema',
        'Made mannschaft required in spieler schema',
        'Added aushilfe_mannschaften to spieler schema',
        'Enhanced mannschaft schema with all team fields',
        'Added club, liga, and saison relations to mannschaft',
        'Updated club, liga, and saison schemas to reference mannschaften'
      ],
      nextSteps: [
        'Run data migration script to consolidate team/mannschaft data',
        'Update service layer to use mannschaft consistently',
        'Update API endpoints to populate mannschaft relations',
        'Run validation tests to ensure all relations work correctly'
      ]
    };
    
    const summaryPath = path.join(this.backupDir, `schema-update-summary-${Date.now()}.json`);
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    this.log(`Migration summary saved to ${summaryPath}`);
    
    return summary;
  }

  async run() {
    try {
      this.log('Starting schema updates for team/mannschaft consolidation...');
      
      this.createBackupDir();
      
      // Update all affected schemas
      this.updateSpielSchema();
      this.updateSpielerSchema();
      this.updateMannschaftSchema();
      this.updateClubSchema();
      this.updateLigaSchema();
      this.updateSaisonSchema();
      
      const summary = this.generateMigrationSummary();
      
      this.log('Schema updates completed successfully!');
      this.log('Next steps:');
      summary.nextSteps.forEach(step => this.log(`  - ${step}`));
      
    } catch (error) {
      this.log(`ERROR: ${error.message}`);
      throw error;
    }
  }
}

// CLI interface
if (require.main === module) {
  const updater = new SchemaUpdater();
  updater.run().catch(console.error);
}

module.exports = SchemaUpdater;