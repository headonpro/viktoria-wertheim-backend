/**
 * Comprehensive Club Data Integrity Validation Script
 * 
 * This script validates all aspects of club data integrity including:
 * - Club data consistency
 * - Team-to-club mapping validation
 * - Liga-club relationship validation
 * - Orphaned record detection
 * - Data quality checks
 * 
 * Usage:
 *   node scripts/validate-club-data-integrity.js [options]
 * 
 * Options:
 *   --fix-orphans    Automatically fix orphaned records
 *   --detailed       Show detailed validation results
 *   --export-report  Export validation report to JSON
 *   --club-id=ID     Validate specific club only
 *   --liga-id=ID     Validate specific liga only
 */

const { createStrapi } = require('@strapi/strapi');
const fs = require('fs');
const path = require('path');

class ClubDataValidator {
  constructor(strapi) {
    this.strapi = strapi;
    this.validationResults = {
      timestamp: new Date().toISOString(),
      summary: {
        totalClubs: 0,
        totalValidationErrors: 0,
        totalWarnings: 0,
        orphanedRecords: 0,
        inconsistentMappings: 0
      },
      clubValidation: [],
      teamMappingValidation: [],
      ligaRelationshipValidation: [],
      orphanedRecords: [],
      dataQualityIssues: [],
      recommendations: []
    };
  }

  /**
   * Run comprehensive club data validation
   */
  async validateAll(options = {}) {
    console.log('🔍 Starting comprehensive club data validation...\n');

    try {
      // 1. Validate club data consistency
      await this.validateClubDataConsistency(options);

      // 2. Validate team-to-club mappings
      await this.validateTeamClubMappings(options);

      // 3. Validate liga-club relationships
      await this.validateLigaClubRelationships(options);

      // 4. Detect orphaned records
      await this.detectOrphanedRecords(options);

      // 5. Check data quality issues
      await this.checkDataQuality(options);

      // 6. Generate recommendations
      await this.generateRecommendations();

      // 7. Display results
      this.displayResults(options);

      // 8. Export report if requested
      if (options.exportReport) {
        await this.exportReport();
      }

      // 9. Fix orphans if requested
      if (options.fixOrphans) {
        await this.fixOrphanedRecords();
      }

      return this.validationResults;

    } catch (error) {
      console.error('❌ Validation failed:', error);
      throw error;
    }
  }

  /**
   * Validate club data consistency
   */
  async validateClubDataConsistency(options) {
    console.log('📋 Validating club data consistency...');

    const filters = {};
    if (options.clubId) {
      filters.id = options.clubId;
    }

    const clubs = await this.strapi.entityService.findMany('api::club.club', {
      filters,
      populate: {
        ligen: true,
        logo: true
      }
    });

    this.validationResults.summary.totalClubs = clubs.length;

    for (const club of clubs) {
      const clubValidation = {
        clubId: club.id,
        clubName: club.name,
        errors: [],
        warnings: [],
        isValid: true
      };

      // Validate required fields
      if (!club.name || club.name.trim().length < 2) {
        clubValidation.errors.push({
          type: 'MISSING_REQUIRED_FIELD',
          field: 'name',
          message: 'Club name is missing or too short'
        });
      }

      if (!club.club_typ || !['viktoria_verein', 'gegner_verein'].includes(club.club_typ)) {
        clubValidation.errors.push({
          type: 'INVALID_CLUB_TYPE',
          field: 'club_typ',
          message: 'Invalid or missing club type'
        });
      }

      // Validate Viktoria-specific requirements
      if (club.club_typ === 'viktoria_verein') {
        if (!club.viktoria_team_mapping) {
          clubValidation.errors.push({
            type: 'MISSING_VIKTORIA_MAPPING',
            field: 'viktoria_team_mapping',
            message: 'Viktoria clubs must have team mapping'
          });
        } else if (!['team_1', 'team_2', 'team_3'].includes(club.viktoria_team_mapping)) {
          clubValidation.errors.push({
            type: 'INVALID_VIKTORIA_MAPPING',
            field: 'viktoria_team_mapping',
            message: 'Invalid team mapping value'
          });
        }
      }

      // Validate liga assignments
      if (!club.ligen || club.ligen.length === 0) {
        clubValidation.errors.push({
          type: 'MISSING_LIGA_ASSIGNMENT',
          field: 'ligen',
          message: 'Club must be assigned to at least one liga'
        });
      }

      // Validate optional fields
      if (club.kurz_name && club.kurz_name.length > 20) {
        clubValidation.warnings.push({
          type: 'FIELD_TOO_LONG',
          field: 'kurz_name',
          message: 'Short name exceeds recommended length'
        });
      }

      if (club.gruendungsjahr && (club.gruendungsjahr < 1800 || club.gruendungsjahr > 2030)) {
        clubValidation.warnings.push({
          type: 'INVALID_YEAR',
          field: 'gruendungsjahr',
          message: 'Founding year seems unrealistic'
        });
      }

      // Check for duplicate names
      const duplicateNames = await this.strapi.entityService.findMany('api::club.club', {
        filters: {
          name: club.name,
          id: { $ne: club.id }
        }
      });

      if (duplicateNames.length > 0) {
        clubValidation.errors.push({
          type: 'DUPLICATE_CLUB_NAME',
          field: 'name',
          message: `Club name "${club.name}" is used by other clubs: ${duplicateNames.map(c => c.id).join(', ')}`
        });
      }

      // Update validation status
      clubValidation.isValid = clubValidation.errors.length === 0;
      if (!clubValidation.isValid) {
        this.validationResults.summary.totalValidationErrors += clubValidation.errors.length;
      }
      this.validationResults.summary.totalWarnings += clubValidation.warnings.length;

      this.validationResults.clubValidation.push(clubValidation);
    }

    console.log(`✅ Club data consistency validation completed (${clubs.length} clubs checked)`);
  }

  /**
   * Validate team-to-club mappings
   */
  async validateTeamClubMappings(options) {
    console.log('🔗 Validating team-to-club mappings...');

    // Get all Viktoria clubs
    const viktoriaClubs = await this.strapi.entityService.findMany('api::club.club', {
      filters: {
        club_typ: 'viktoria_verein',
        aktiv: true
      }
    });

    // Check for duplicate mappings
    const mappingCounts = new Map();
    const mappingValidation = {
      duplicateMappings: [],
      missingMappings: [],
      invalidMappings: [],
      isValid: true
    };

    viktoriaClubs.forEach(club => {
      if (club.viktoria_team_mapping) {
        if (!mappingCounts.has(club.viktoria_team_mapping)) {
          mappingCounts.set(club.viktoria_team_mapping, []);
        }
        mappingCounts.get(club.viktoria_team_mapping).push(club);
      } else {
        mappingValidation.missingMappings.push({
          clubId: club.id,
          clubName: club.name,
          message: 'Viktoria club missing team mapping'
        });
      }
    });

    // Check for duplicates
    mappingCounts.forEach((clubs, mapping) => {
      if (clubs.length > 1) {
        mappingValidation.duplicateMappings.push({
          mapping,
          clubs: clubs.map(c => ({ id: c.id, name: c.name })),
          message: `Team mapping "${mapping}" used by multiple clubs`
        });
        this.validationResults.summary.inconsistentMappings++;
      }
    });

    // Check for missing standard mappings
    const expectedMappings = ['team_1', 'team_2', 'team_3'];
    expectedMappings.forEach(expectedMapping => {
      if (!mappingCounts.has(expectedMapping)) {
        mappingValidation.missingMappings.push({
          mapping: expectedMapping,
          message: `No club found for team mapping "${expectedMapping}"`
        });
      }
    });

    mappingValidation.isValid = 
      mappingValidation.duplicateMappings.length === 0 &&
      mappingValidation.missingMappings.length === 0 &&
      mappingValidation.invalidMappings.length === 0;

    this.validationResults.teamMappingValidation = mappingValidation;

    console.log(`✅ Team-to-club mapping validation completed`);
  }

  /**
   * Validate liga-club relationships
   */
  async validateLigaClubRelationships(options) {
    console.log('🏆 Validating liga-club relationships...');

    const filters = {};
    if (options.ligaId) {
      filters.id = options.ligaId;
    }

    const ligen = await this.strapi.entityService.findMany('api::liga.liga', {
      filters,
      populate: {
        clubs: true
      }
    });

    const relationshipValidation = {
      ligaIssues: [],
      clubIssues: [],
      isValid: true
    };

    for (const liga of ligen) {
      const ligaIssue = {
        ligaId: liga.id,
        ligaName: liga.name,
        errors: [],
        warnings: []
      };

      // Check if liga has clubs
      if (!liga.clubs || liga.clubs.length === 0) {
        ligaIssue.warnings.push({
          type: 'NO_CLUBS_ASSIGNED',
          message: 'Liga has no clubs assigned'
        });
      }

      // Check for inactive clubs in active liga
      if (liga.aktiv && liga.clubs) {
        const inactiveClubs = liga.clubs.filter(club => !club.aktiv);
        if (inactiveClubs.length > 0) {
          ligaIssue.warnings.push({
            type: 'INACTIVE_CLUBS_IN_ACTIVE_LIGA',
            message: `Liga contains ${inactiveClubs.length} inactive clubs`,
            clubs: inactiveClubs.map(c => ({ id: c.id, name: c.name }))
          });
        }
      }

      if (ligaIssue.errors.length > 0 || ligaIssue.warnings.length > 0) {
        relationshipValidation.ligaIssues.push(ligaIssue);
      }
    }

    // Check clubs without liga assignments
    const clubsWithoutLiga = await this.strapi.entityService.findMany('api::club.club', {
      filters: {
        aktiv: true
      },
      populate: {
        ligen: true
      }
    });

    clubsWithoutLiga.forEach(club => {
      if (!club.ligen || club.ligen.length === 0) {
        relationshipValidation.clubIssues.push({
          clubId: club.id,
          clubName: club.name,
          error: {
            type: 'NO_LIGA_ASSIGNMENT',
            message: 'Active club not assigned to any liga'
          }
        });
      }
    });

    relationshipValidation.isValid = 
      relationshipValidation.ligaIssues.length === 0 &&
      relationshipValidation.clubIssues.length === 0;

    this.validationResults.ligaRelationshipValidation = relationshipValidation;

    console.log(`✅ Liga-club relationship validation completed`);
  }

  /**
   * Detect orphaned records
   */
  async detectOrphanedRecords(options) {
    console.log('🔍 Detecting orphaned records...');

    const orphanedRecords = {
      spieleWithInvalidClubs: [],
      tabellenEintraegeWithInvalidClubs: [],
      clubsWithInvalidLigen: [],
      total: 0
    };

    // Check spiele with invalid club references
    const spiele = await this.strapi.entityService.findMany('api::spiel.spiel', {
      populate: {
        heim_club: true,
        gast_club: true
      }
    });

    for (const spiel of spiele) {
      const spielIssues = [];

      if (spiel.heim_club && !spiel.heim_club.aktiv) {
        spielIssues.push({
          type: 'INACTIVE_HEIM_CLUB',
          message: `Spiel references inactive heim club: ${spiel.heim_club.name}`
        });
      }

      if (spiel.gast_club && !spiel.gast_club.aktiv) {
        spielIssues.push({
          type: 'INACTIVE_GAST_CLUB',
          message: `Spiel references inactive gast club: ${spiel.gast_club.name}`
        });
      }

      if (spielIssues.length > 0) {
        orphanedRecords.spieleWithInvalidClubs.push({
          spielId: spiel.id,
          datum: spiel.datum,
          issues: spielIssues
        });
      }
    }

    // Check tabellen-eintraege with invalid club references
    const tabellenEintraege = await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
      populate: {
        club: true
      }
    });

    for (const eintrag of tabellenEintraege) {
      if (eintrag.club && !eintrag.club.aktiv) {
        orphanedRecords.tabellenEintraegeWithInvalidClubs.push({
          eintragId: eintrag.id,
          teamName: eintrag.team_name,
          clubName: eintrag.club.name,
          issue: 'References inactive club'
        });
      }
    }

    // Check clubs with invalid liga references
    const clubs = await this.strapi.entityService.findMany('api::club.club', {
      populate: {
        ligen: true
      }
    });

    for (const club of clubs) {
      if (club.ligen) {
        const inactiveLigen = club.ligen.filter(liga => !liga.aktiv);
        if (inactiveLigen.length > 0) {
          orphanedRecords.clubsWithInvalidLigen.push({
            clubId: club.id,
            clubName: club.name,
            inactiveLigen: inactiveLigen.map(l => ({ id: l.id, name: l.name }))
          });
        }
      }
    }

    orphanedRecords.total = 
      orphanedRecords.spieleWithInvalidClubs.length +
      orphanedRecords.tabellenEintraegeWithInvalidClubs.length +
      orphanedRecords.clubsWithInvalidLigen.length;

    this.validationResults.summary.orphanedRecords = orphanedRecords.total;
    this.validationResults.orphanedRecords = orphanedRecords;

    console.log(`✅ Orphaned records detection completed (${orphanedRecords.total} issues found)`);
  }

  /**
   * Check data quality issues
   */
  async checkDataQuality(options) {
    console.log('📊 Checking data quality issues...');

    const dataQualityIssues = {
      missingLogos: [],
      incompleteClubData: [],
      inconsistentNaming: [],
      performanceIssues: []
    };

    const clubs = await this.strapi.entityService.findMany('api::club.club', {
      populate: {
        logo: true,
        ligen: true
      }
    });

    for (const club of clubs) {
      // Check for missing logos
      if (!club.logo) {
        dataQualityIssues.missingLogos.push({
          clubId: club.id,
          clubName: club.name,
          clubType: club.club_typ
        });
      }

      // Check for incomplete club data
      const missingFields = [];
      if (!club.kurz_name) missingFields.push('kurz_name');
      if (!club.gruendungsjahr) missingFields.push('gruendungsjahr');
      if (!club.vereinsfarben) missingFields.push('vereinsfarben');
      if (!club.heimstadion) missingFields.push('heimstadion');

      if (missingFields.length > 0) {
        dataQualityIssues.incompleteClubData.push({
          clubId: club.id,
          clubName: club.name,
          missingFields
        });
      }

      // Check for inconsistent naming
      if (club.name && club.kurz_name) {
        const nameWords = club.name.toLowerCase().split(' ');
        const shortNameWords = club.kurz_name.toLowerCase().split(' ');
        
        // Simple heuristic: short name should contain some words from full name
        const hasCommonWords = shortNameWords.some(word => 
          nameWords.some(nameWord => nameWord.includes(word) || word.includes(nameWord))
        );

        if (!hasCommonWords && club.kurz_name.length > 3) {
          dataQualityIssues.inconsistentNaming.push({
            clubId: club.id,
            clubName: club.name,
            kurzName: club.kurz_name,
            issue: 'Short name seems unrelated to full name'
          });
        }
      }
    }

    // Check for performance issues (clubs with too many liga assignments)
    const clubsWithManyLigen = clubs.filter(club => club.ligen && club.ligen.length > 3);
    clubsWithManyLigen.forEach(club => {
      dataQualityIssues.performanceIssues.push({
        clubId: club.id,
        clubName: club.name,
        ligaCount: club.ligen.length,
        issue: 'Club assigned to unusually many ligen'
      });
    });

    this.validationResults.dataQualityIssues = dataQualityIssues;

    console.log(`✅ Data quality check completed`);
  }

  /**
   * Generate recommendations based on validation results
   */
  async generateRecommendations() {
    console.log('💡 Generating recommendations...');

    const recommendations = [];

    // Recommendations based on validation errors
    if (this.validationResults.summary.totalValidationErrors > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'DATA_INTEGRITY',
        title: 'Fix validation errors',
        description: `${this.validationResults.summary.totalValidationErrors} validation errors found that need immediate attention`,
        action: 'Review and fix all validation errors in club data'
      });
    }

    // Recommendations based on orphaned records
    if (this.validationResults.summary.orphanedRecords > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'ORPHANED_RECORDS',
        title: 'Clean up orphaned records',
        description: `${this.validationResults.summary.orphanedRecords} orphaned records found`,
        action: 'Run cleanup script with --fix-orphans option'
      });
    }

    // Recommendations based on team mapping issues
    if (this.validationResults.teamMappingValidation.duplicateMappings.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'TEAM_MAPPING',
        title: 'Fix duplicate team mappings',
        description: 'Multiple clubs have the same viktoria_team_mapping',
        action: 'Ensure each team mapping is unique across Viktoria clubs'
      });
    }

    // Recommendations based on data quality
    const missingLogos = this.validationResults.dataQualityIssues.missingLogos.length;
    if (missingLogos > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'DATA_QUALITY',
        title: 'Add missing club logos',
        description: `${missingLogos} clubs are missing logos`,
        action: 'Upload logos for clubs to improve visual presentation'
      });
    }

    const incompleteData = this.validationResults.dataQualityIssues.incompleteClubData.length;
    if (incompleteData > 0) {
      recommendations.push({
        priority: 'LOW',
        category: 'DATA_COMPLETENESS',
        title: 'Complete club information',
        description: `${incompleteData} clubs have incomplete data`,
        action: 'Add missing fields like founding year, colors, stadium info'
      });
    }

    // Performance recommendations
    if (this.validationResults.summary.totalClubs > 100) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'PERFORMANCE',
        title: 'Consider database optimization',
        description: 'Large number of clubs may impact performance',
        action: 'Review database indexes and caching strategies'
      });
    }

    this.validationResults.recommendations = recommendations;

    console.log(`✅ Generated ${recommendations.length} recommendations`);
  }

  /**
   * Display validation results
   */
  displayResults(options) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CLUB DATA VALIDATION RESULTS');
    console.log('='.repeat(60));

    // Summary
    const summary = this.validationResults.summary;
    console.log('\n📈 SUMMARY:');
    console.log(`Total Clubs: ${summary.totalClubs}`);
    console.log(`Validation Errors: ${summary.totalValidationErrors}`);
    console.log(`Warnings: ${summary.totalWarnings}`);
    console.log(`Orphaned Records: ${summary.orphanedRecords}`);
    console.log(`Inconsistent Mappings: ${summary.inconsistentMappings}`);

    // Overall status
    const isHealthy = summary.totalValidationErrors === 0 && summary.orphanedRecords === 0;
    const status = isHealthy ? '✅ HEALTHY' : '❌ ISSUES FOUND';
    console.log(`\nOverall Status: ${status}`);

    if (options.detailed) {
      this.displayDetailedResults();
    }

    // Recommendations
    if (this.validationResults.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      this.validationResults.recommendations.forEach((rec, index) => {
        const priority = rec.priority === 'HIGH' ? '🔴' : rec.priority === 'MEDIUM' ? '🟡' : '🟢';
        console.log(`${index + 1}. ${priority} ${rec.title}`);
        console.log(`   ${rec.description}`);
        console.log(`   Action: ${rec.action}\n`);
      });
    }

    console.log('='.repeat(60));
  }

  /**
   * Display detailed validation results
   */
  displayDetailedResults() {
    console.log('\n🔍 DETAILED RESULTS:');

    // Club validation errors
    const clubErrors = this.validationResults.clubValidation.filter(c => !c.isValid);
    if (clubErrors.length > 0) {
      console.log('\n❌ Club Validation Errors:');
      clubErrors.forEach(club => {
        console.log(`  Club: ${club.clubName} (ID: ${club.clubId})`);
        club.errors.forEach(error => {
          console.log(`    - ${error.type}: ${error.message}`);
        });
      });
    }

    // Team mapping issues
    const mappingIssues = this.validationResults.teamMappingValidation;
    if (mappingIssues.duplicateMappings.length > 0) {
      console.log('\n🔗 Team Mapping Issues:');
      mappingIssues.duplicateMappings.forEach(issue => {
        console.log(`  Duplicate mapping "${issue.mapping}":`);
        issue.clubs.forEach(club => {
          console.log(`    - ${club.name} (ID: ${club.id})`);
        });
      });
    }

    // Orphaned records
    const orphaned = this.validationResults.orphanedRecords;
    if (orphaned.total > 0) {
      console.log('\n🗑️ Orphaned Records:');
      
      if (orphaned.spieleWithInvalidClubs.length > 0) {
        console.log('  Spiele with invalid clubs:');
        orphaned.spieleWithInvalidClubs.slice(0, 5).forEach(spiel => {
          console.log(`    - Spiel ID: ${spiel.spielId}, Date: ${spiel.datum}`);
          spiel.issues.forEach(issue => {
            console.log(`      ${issue.type}: ${issue.message}`);
          });
        });
        if (orphaned.spieleWithInvalidClubs.length > 5) {
          console.log(`    ... and ${orphaned.spieleWithInvalidClubs.length - 5} more`);
        }
      }

      if (orphaned.tabellenEintraegeWithInvalidClubs.length > 0) {
        console.log('  Tabellen-Einträge with invalid clubs:');
        orphaned.tabellenEintraegeWithInvalidClubs.slice(0, 5).forEach(eintrag => {
          console.log(`    - Entry ID: ${eintrag.eintragId}, Team: ${eintrag.teamName}`);
        });
      }
    }
  }

  /**
   * Export validation report to JSON file
   */
  async exportReport() {
    const reportsDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `club-validation-report-${timestamp}.json`;
    const filepath = path.join(reportsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(this.validationResults, null, 2));
    console.log(`📄 Validation report exported to: ${filepath}`);
  }

  /**
   * Fix orphaned records automatically
   */
  async fixOrphanedRecords() {
    console.log('\n🔧 Fixing orphaned records...');

    const orphaned = this.validationResults.orphanedRecords;
    let fixedCount = 0;

    // Fix spiele with inactive clubs by deactivating them
    for (const spiel of orphaned.spieleWithInvalidClubs) {
      try {
        await this.strapi.entityService.update('api::spiel.spiel', spiel.spielId, {
          data: {
            status: 'abgesagt',
            notizen: (spiel.notizen || '') + ' [Auto-deactivated due to inactive club reference]'
          }
        });
        fixedCount++;
        console.log(`  ✅ Fixed spiel ${spiel.spielId} - marked as cancelled`);
      } catch (error) {
        console.log(`  ❌ Failed to fix spiel ${spiel.spielId}: ${error.message}`);
      }
    }

    // Fix tabellen-eintraege by removing club reference
    for (const eintrag of orphaned.tabellenEintraegeWithInvalidClubs) {
      try {
        await this.strapi.entityService.update('api::tabellen-eintrag.tabellen-eintrag', eintrag.eintragId, {
          data: {
            club: null
          }
        });
        fixedCount++;
        console.log(`  ✅ Fixed tabellen-eintrag ${eintrag.eintragId} - removed club reference`);
      } catch (error) {
        console.log(`  ❌ Failed to fix tabellen-eintrag ${eintrag.eintragId}: ${error.message}`);
      }
    }

    // Fix clubs with inactive ligen by removing the relationships
    for (const club of orphaned.clubsWithInvalidLigen) {
      try {
        // Get current active ligen for this club
        const currentClub = await this.strapi.entityService.findOne('api::club.club', club.clubId, {
          populate: { ligen: true }
        });

        const activeLigen = currentClub.ligen.filter(liga => liga.aktiv);
        
        await this.strapi.entityService.update('api::club.club', club.clubId, {
          data: {
            ligen: activeLigen.map(liga => liga.id)
          }
        });
        fixedCount++;
        console.log(`  ✅ Fixed club ${club.clubId} - removed inactive liga references`);
      } catch (error) {
        console.log(`  ❌ Failed to fix club ${club.clubId}: ${error.message}`);
      }
    }

    console.log(`\n🎉 Fixed ${fixedCount} orphaned records`);
  }
}

/**
 * Main execution function
 */
async function runValidation() {
  const args = process.argv.slice(2);
  const options = {
    fixOrphans: args.includes('--fix-orphans'),
    detailed: args.includes('--detailed'),
    exportReport: args.includes('--export-report'),
    clubId: args.find(arg => arg.startsWith('--club-id='))?.split('=')[1],
    ligaId: args.find(arg => arg.startsWith('--liga-id='))?.split('=')[1]
  };

  console.log('🚀 Starting Club Data Integrity Validation');
  console.log('Options:', options);
  console.log('='.repeat(60));

  const strapi = await createStrapi();

  try {
    const validator = new ClubDataValidator(strapi);
    const results = await validator.validateAll(options);

    // Exit with error code if issues found
    const hasIssues = results.summary.totalValidationErrors > 0 || results.summary.orphanedRecords > 0;
    process.exit(hasIssues ? 1 : 0);

  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  } finally {
    await strapi.destroy();
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  runValidation().catch(console.error);
}

module.exports = { ClubDataValidator };