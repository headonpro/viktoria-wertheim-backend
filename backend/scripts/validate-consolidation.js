#!/usr/bin/env node

/**
 * Validation Script for Team/Mannschaft Consolidation
 * 
 * This script validates that the consolidation was successful by:
 * 1. Checking schema consistency
 * 2. Validating data integrity
 * 3. Testing API endpoints
 * 4. Verifying relation population
 */

const fs = require('fs');
const path = require('path');

class ConsolidationValidator {
  constructor() {
    this.strapi = null;
    this.validationResults = {
      schemas: {},
      data: {},
      relations: {},
      api: {},
      errors: []
    };
  }

  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  async initialize() {
    // Initialize Strapi
    const Strapi = require('@strapi/strapi');
    this.strapi = await Strapi().load();
    this.log('Validation script initialized');
  }

  validateSchemas() {
    this.log('Validating schema consistency...');
    
    const schemasDir = path.join(__dirname, '../src/api');
    
    // Check spiel schema
    const spielSchema = this.loadSchema('spiel');
    this.validationResults.schemas.spiel = {
      hasUnserTeam: !!spielSchema.attributes.unser_team,
      hasUnsereMannschaft: !!spielSchema.attributes.unsere_mannschaft,
      mannschaftRequired: spielSchema.attributes.unsere_mannschaft?.required || false,
      hasGegnerMannschaft: !!spielSchema.attributes.gegner_mannschaft
    };
    
    // Check spieler schema
    const spielerSchema = this.loadSchema('spieler');
    this.validationResults.schemas.spieler = {
      hasHauptteam: !!spielerSchema.attributes.hauptteam,
      hasAushilfeTeams: !!spielerSchema.attributes.aushilfe_teams,
      hasMannschaft: !!spielerSchema.attributes.mannschaft,
      mannschaftRequired: spielerSchema.attributes.mannschaft?.required || false,
      hasAushilfeMannschaften: !!spielerSchema.attributes.aushilfe_mannschaften
    };
    
    // Check mannschaft schema
    const mannschaftSchema = this.loadSchema('mannschaft');
    this.validationResults.schemas.mannschaft = {
      hasAllRequiredFields: this.checkMannschaftFields(mannschaftSchema),
      hasSpielerRelation: !!mannschaftSchema.attributes.spieler,
      hasSpiele: !!mannschaftSchema.attributes.spiele,
      hasClubRelation: !!mannschaftSchema.attributes.club
    };
    
    this.log('Schema validation completed');
  }

  loadSchema(contentType) {
    const schemaPath = path.join(__dirname, `../src/api/${contentType}/content-types/${contentType}/schema.json`);
    if (fs.existsSync(schemaPath)) {
      return JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    }
    return { attributes: {} };
  }

  checkMannschaftFields(schema) {
    const requiredFields = [
      'name', 'liga', 'trainer', 'tabellenplatz', 'punkte', 
      'spiele_gesamt', 'siege', 'unentschieden', 'niederlagen',
      'tore_fuer', 'tore_gegen', 'tordifferenz', 'status'
    ];
    
    return requiredFields.every(field => !!schema.attributes[field]);
  }

  async validateData() {
    this.log('Validating data integrity...');
    
    try {
      // Count mannschaften
      const mannschaften = await this.strapi.entityService.findMany('api::mannschaft.mannschaft');
      this.validationResults.data.mannschaftenCount = mannschaften.length;
      
      // Check for duplicate names
      const nameMap = new Map();
      mannschaften.forEach(m => {
        if (nameMap.has(m.name)) {
          nameMap.get(m.name).push(m.id);
        } else {
          nameMap.set(m.name, [m.id]);
        }
      });
      
      const duplicates = Array.from(nameMap.entries()).filter(([name, ids]) => ids.length > 1);
      this.validationResults.data.duplicateNames = duplicates;
      
      // Check data completeness
      const incompleteData = mannschaften.filter(m => !m.name || !m.liga);
      this.validationResults.data.incompleteRecords = incompleteData.length;
      
      this.log(`Found ${mannschaften.length} mannschaften, ${duplicates.length} duplicates, ${incompleteData.length} incomplete`);
      
    } catch (error) {
      this.validationResults.errors.push(`Data validation error: ${error.message}`);
    }
  }

  async validateRelations() {
    this.log('Validating relation integrity...');
    
    try {
      // Check spiel relations
      const spiele = await this.strapi.entityService.findMany('api::spiel.spiel', {
        populate: ['unser_team', 'unsere_mannschaft', 'gegner_mannschaft']
      });
      
      this.validationResults.relations.spiele = {
        total: spiele.length,
        withUnserTeam: spiele.filter(s => s.unser_team).length,
        withUnsereMannschaft: spiele.filter(s => s.unsere_mannschaft).length,
        withGegnerMannschaft: spiele.filter(s => s.gegner_mannschaft).length,
        orphaned: spiele.filter(s => !s.unsere_mannschaft).length
      };
      
      // Check spieler relations
      const spieler = await this.strapi.entityService.findMany('api::spieler.spieler', {
        populate: ['hauptteam', 'aushilfe_teams', 'mannschaft', 'aushilfe_mannschaften']
      });
      
      this.validationResults.relations.spieler = {
        total: spieler.length,
        withHauptteam: spieler.filter(s => s.hauptteam).length,
        withMannschaft: spieler.filter(s => s.mannschaft).length,
        withAushilfeTeams: spieler.filter(s => s.aushilfe_teams?.length > 0).length,
        withAushilfeMannschaften: spieler.filter(s => s.aushilfe_mannschaften?.length > 0).length,
        orphaned: spieler.filter(s => !s.mannschaft).length
      };
      
      // Check bidirectional relations
      await this.validateBidirectionalRelations();
      
      this.log('Relation validation completed');
      
    } catch (error) {
      this.validationResults.errors.push(`Relation validation error: ${error.message}`);
    }
  }

  async validateBidirectionalRelations() {
    this.log('Checking bidirectional relation consistency...');
    
    const inconsistencies = [];
    
    // Check mannschaft -> spieler -> mannschaft consistency
    const mannschaften = await this.strapi.entityService.findMany('api::mannschaft.mannschaft', {
      populate: ['spieler']
    });
    
    for (const mannschaft of mannschaften) {
      if (mannschaft.spieler) {
        for (const spieler of mannschaft.spieler) {
          const fullSpieler = await this.strapi.entityService.findOne('api::spieler.spieler', spieler.id, {
            populate: ['mannschaft']
          });
          
          if (!fullSpieler.mannschaft || fullSpieler.mannschaft.id !== mannschaft.id) {
            inconsistencies.push({
              type: 'mannschaft-spieler',
              mannschaftId: mannschaft.id,
              spielerId: spieler.id,
              issue: 'Spieler does not reference back to mannschaft'
            });
          }
        }
      }
    }
    
    // Check mannschaft -> spiele -> mannschaft consistency
    for (const mannschaft of mannschaften) {
      const spiele = await this.strapi.entityService.findMany('api::spiel.spiel', {
        filters: { unsere_mannschaft: mannschaft.id },
        populate: ['unsere_mannschaft']
      });
      
      for (const spiel of spiele) {
        if (!spiel.unsere_mannschaft || spiel.unsere_mannschaft.id !== mannschaft.id) {
          inconsistencies.push({
            type: 'mannschaft-spiel',
            mannschaftId: mannschaft.id,
            spielId: spiel.id,
            issue: 'Spiel does not reference back to mannschaft'
          });
        }
      }
    }
    
    this.validationResults.relations.bidirectionalInconsistencies = inconsistencies;
    this.log(`Found ${inconsistencies.length} bidirectional relation inconsistencies`);
  }

  async validateApiEndpoints() {
    this.log('Validating API endpoint responses...');
    
    try {
      // Test mannschaft endpoints
      const mannschaftResponse = await this.testApiEndpoint('api::mannschaft.mannschaft', {
        populate: ['spieler', 'spiele']
      });
      
      this.validationResults.api.mannschaft = {
        success: mannschaftResponse.success,
        count: mannschaftResponse.data?.length || 0,
        hasPopulatedRelations: mannschaftResponse.data?.some(m => m.spieler || m.spiele) || false
      };
      
      // Test spiel endpoints
      const spielResponse = await this.testApiEndpoint('api::spiel.spiel', {
        populate: ['unsere_mannschaft', 'gegner_mannschaft']
      });
      
      this.validationResults.api.spiel = {
        success: spielResponse.success,
        count: spielResponse.data?.length || 0,
        hasPopulatedMannschaft: spielResponse.data?.some(s => s.unsere_mannschaft) || false
      };
      
      // Test spieler endpoints
      const spielerResponse = await this.testApiEndpoint('api::spieler.spieler', {
        populate: ['mannschaft']
      });
      
      this.validationResults.api.spieler = {
        success: spielerResponse.success,
        count: spielerResponse.data?.length || 0,
        hasPopulatedMannschaft: spielerResponse.data?.some(s => s.mannschaft) || false
      };
      
      this.log('API endpoint validation completed');
      
    } catch (error) {
      this.validationResults.errors.push(`API validation error: ${error.message}`);
    }
  }

  async testApiEndpoint(uid, options = {}) {
    try {
      const data = await this.strapi.entityService.findMany(uid, options);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testCrudOperations() {
    this.log('Testing CRUD operations...');
    
    const crudResults = {
      mannschaft: { create: false, read: false, update: false, delete: false },
      spiel: { create: false, read: false, update: false, delete: false },
      spieler: { create: false, read: false, update: false, delete: false }
    };
    
    try {
      // Test mannschaft CRUD
      const testMannschaft = await this.strapi.entityService.create('api::mannschaft.mannschaft', {
        data: {
          name: 'Test Mannschaft Validation',
          liga: 'Test Liga',
          status: 'aktiv'
        }
      });
      crudResults.mannschaft.create = true;
      
      const readMannschaft = await this.strapi.entityService.findOne('api::mannschaft.mannschaft', testMannschaft.id);
      crudResults.mannschaft.read = !!readMannschaft;
      
      const updatedMannschaft = await this.strapi.entityService.update('api::mannschaft.mannschaft', testMannschaft.id, {
        data: { liga: 'Updated Test Liga' }
      });
      crudResults.mannschaft.update = updatedMannschaft.liga === 'Updated Test Liga';
      
      await this.strapi.entityService.delete('api::mannschaft.mannschaft', testMannschaft.id);
      crudResults.mannschaft.delete = true;
      
      this.log('CRUD operations test completed');
      
    } catch (error) {
      this.validationResults.errors.push(`CRUD test error: ${error.message}`);
    }
    
    this.validationResults.crud = crudResults;
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        schemasValid: this.isSchemasValid(),
        dataIntegrityGood: this.isDataIntegrityGood(),
        relationsConsistent: this.isRelationsConsistent(),
        apiEndpointsWorking: this.isApiEndpointsWorking(),
        overallSuccess: this.isOverallSuccess()
      },
      details: this.validationResults,
      recommendations: this.generateRecommendations()
    };
    
    return report;
  }

  isSchemasValid() {
    const spiel = this.validationResults.schemas.spiel;
    const spieler = this.validationResults.schemas.spieler;
    const mannschaft = this.validationResults.schemas.mannschaft;
    
    return !spiel?.hasUnserTeam && 
           spiel?.hasUnsereMannschaft && 
           !spieler?.hasHauptteam && 
           spieler?.hasMannschaft && 
           mannschaft?.hasAllRequiredFields;
  }

  isDataIntegrityGood() {
    return this.validationResults.data.duplicateNames?.length === 0 &&
           this.validationResults.data.incompleteRecords === 0;
  }

  isRelationsConsistent() {
    return this.validationResults.relations.spiele?.orphaned === 0 &&
           this.validationResults.relations.spieler?.orphaned === 0 &&
           this.validationResults.relations.bidirectionalInconsistencies?.length === 0;
  }

  isApiEndpointsWorking() {
    return this.validationResults.api.mannschaft?.success &&
           this.validationResults.api.spiel?.success &&
           this.validationResults.api.spieler?.success;
  }

  isOverallSuccess() {
    return this.isSchemasValid() && 
           this.isDataIntegrityGood() && 
           this.isRelationsConsistent() && 
           this.isApiEndpointsWorking() &&
           this.validationResults.errors.length === 0;
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (!this.isSchemasValid()) {
      recommendations.push('Schema validation failed - check schema updates');
    }
    
    if (!this.isDataIntegrityGood()) {
      recommendations.push('Data integrity issues found - run data cleanup');
    }
    
    if (!this.isRelationsConsistent()) {
      recommendations.push('Relation inconsistencies found - run relation repair');
    }
    
    if (!this.isApiEndpointsWorking()) {
      recommendations.push('API endpoint issues found - check service layer');
    }
    
    if (this.validationResults.errors.length > 0) {
      recommendations.push('Errors encountered during validation - check logs');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('All validations passed - consolidation successful');
    }
    
    return recommendations;
  }

  async run() {
    try {
      await this.initialize();
      
      this.validateSchemas();
      await this.validateData();
      await this.validateRelations();
      await this.validateApiEndpoints();
      await this.testCrudOperations();
      
      const report = this.generateReport();
      
      // Save validation report
      const reportFile = path.join(__dirname, '../backups', `validation-report-${Date.now()}.json`);
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
      
      this.log(`Validation report saved to ${reportFile}`);
      
      // Print summary
      this.log('\n=== VALIDATION SUMMARY ===');
      this.log(`Overall Success: ${report.summary.overallSuccess ? 'YES' : 'NO'}`);
      this.log(`Schemas Valid: ${report.summary.schemasValid ? 'YES' : 'NO'}`);
      this.log(`Data Integrity: ${report.summary.dataIntegrityGood ? 'GOOD' : 'ISSUES'}`);
      this.log(`Relations Consistent: ${report.summary.relationsConsistent ? 'YES' : 'NO'}`);
      this.log(`API Endpoints Working: ${report.summary.apiEndpointsWorking ? 'YES' : 'NO'}`);
      
      if (report.recommendations.length > 0) {
        this.log('\n=== RECOMMENDATIONS ===');
        report.recommendations.forEach(rec => this.log(`- ${rec}`));
      }
      
      return report;
      
    } catch (error) {
      this.log(`FATAL ERROR: ${error.message}`);
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
  const validator = new ConsolidationValidator();
  validator.run().catch(console.error);
}

module.exports = ConsolidationValidator;