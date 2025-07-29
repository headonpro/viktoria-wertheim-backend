/**
 * Team-Club Consistency Validation Script
 * 
 * This script validates consistency between team and club data:
 * - Team-to-club mapping accuracy
 * - Spiele consistency (team vs club data)
 * - Tabellen-eintrag consistency
 * - Migration status validation
 * - Cross-reference validation
 * 
 * Usage:
 *   node scripts/validate-team-club-consistency.js [options]
 * 
 * Options:
 *   --detailed       Show detailed validation results
 *   --fix-issues     Automatically fix consistency issues
 *   --export-report  Export validation report to JSON
 *   --team-id=ID     Validate specific team only
 *   --club-id=ID     Validate specific club only
 */

const { createStrapi } = require('@strapi/strapi');
const fs = require('fs');
const path = require('path');

class TeamClubConsistencyValidator {
  constructor(strapi) {
    this.strapi = strapi;
    this.validationResults = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTeams: 0,
        totalClubs: 0,
        totalSpiele: 0,
        totalTabellenEintraege: 0,
        consistencyErrors: 0,
        migrationIssues: 0,
        crossReferenceErrors: 0
      },
      teamClubMapping: {
        expectedMappings: [],
        actualMappings: [],
        missingMappings: [],
        duplicateMappings: [],
        inconsistentMappings: []
      },
      spieleConsistency: {
        teamOnlySpiele: [],
        clubOnlySpiele: [],
        mixedSpiele: [],
        inconsistentSpiele: [],
        orphanedSpiele: []
      },
      tabellenConsistency: {
        teamOnlyEintraege: [],
        clubOnlyEintraege: [],
        inconsistentEintraege: [],
        orphanedEintraege: []
      },
      migrationStatus: {
        fullyMigrated: 0,
        partiallyMigrated: 0,
        notMigrated: 0,
        migrationErrors: []
      },
      recommendations: []
    };

    // Expected team-to-club mappings based on system design
    this.expectedTeamClubMappings = {
      'team_1': {
        expectedClubName: 'SV Viktoria Wertheim',
        expectedTeamName: '1. Mannschaft'
      },
      'team_2': {
        expectedClubName: 'SV Viktoria Wertheim II',
        expectedTeamName: '2. Mannschaft'
      },
      'team_3': {
        expectedClubName: 'SpG Vikt. Wertheim 3/Grünenwort',
        expectedTeamName: '3. Mannschaft'
      }
    };
  }

  /**
   * Run comprehensive team-club consistency validation
   */
  async validateConsistency(options = {}) {
    console.log('🔍 Starting team-club consistency validation...\n');

    try {
      // 1. Validate team-club mappings
      await this.validateTeamClubMappings(options);

      // 2. Validate spiele consistency
      await this.validateSpielConsistency(options);

      // 3. Validate tabellen-eintrag consistency
      await this.validateTabellenConsistency(options);

      // 4. Check migration status
      await this.checkMigrationStatus(options);

      // 5. Validate cross-references
      await this.validateCrossReferences(options);

      // 6. Generate recommendations
      await this.generateRecommendations();

      // 7. Display results
      this.displayResults(options);

      // 8. Export report if requested
      if (options.exportReport) {
        await this.exportReport();
      }

      // 9. Fix issues if requested
      if (options.fixIssues) {
        await this.fixConsistencyIssues();
      }

      return this.validationResults;

    } catch (error) {
      console.error('❌ Validation failed:', error);
      throw error;
    }
  }

  /**
   * Validate team-club mappings
   */
  async validateTeamClubMappings(options) {
    console.log('🔗 Validating team-club mappings...');

    // Get all teams and clubs
    const teams = await this.strapi.entityService.findMany('api::team.team', {});
    const clubs = await this.strapi.entityService.findMany('api::club.club', {
      filters: { club_typ: 'viktoria_verein' }
    });

    this.validationResults.summary.totalTeams = teams.length;
    this.validationResults.summary.totalClubs = clubs.length;

    // Build actual mappings
    const actualMappings = new Map();
    clubs.forEach(club => {
      if (club.viktoria_team_mapping) {
        actualMappings.set(club.viktoria_team_mapping, {
          club,
          clubName: club.name,
          teamMapping: club.viktoria_team_mapping
        });
      }
    });

    // Validate expected mappings
    Object.entries(this.expectedTeamClubMappings).forEach(([teamMapping, expected]) => {
      const actual = actualMappings.get(teamMapping);
      
      this.validationResults.teamClubMapping.expectedMappings.push({
        teamMapping,
        expectedClubName: expected.expectedClubName,
        expectedTeamName: expected.expectedTeamName,
        actualClubName: actual?.clubName || null,
        isValid: actual && actual.clubName === expected.expectedClubName
      });

      if (!actual) {
        this.validationResults.teamClubMapping.missingMappings.push({
          teamMapping,
          expectedClubName: expected.expectedClubName,
          issue: 'No club found with this team mapping'
        });
      } else if (actual.clubName !== expected.expectedClubName) {
        this.validationResults.teamClubMapping.inconsistentMappings.push({
          teamMapping,
          expectedClubName: expected.expectedClubName,
          actualClubName: actual.clubName,
          clubId: actual.club.id,
          issue: 'Club name does not match expected name'
        });
      }
    });

    // Check for duplicate mappings
    const mappingCounts = new Map();
    clubs.forEach(club => {
      if (club.viktoria_team_mapping) {
        if (!mappingCounts.has(club.viktoria_team_mapping)) {
          mappingCounts.set(club.viktoria_team_mapping, []);
        }
        mappingCounts.get(club.viktoria_team_mapping).push(club);
      }
    });

    mappingCounts.forEach((clubList, mapping) => {
      if (clubList.length > 1) {
        this.validationResults.teamClubMapping.duplicateMappings.push({
          teamMapping: mapping,
          clubs: clubList.map(c => ({ id: c.id, name: c.name })),
          issue: `Multiple clubs have the same team mapping: ${mapping}`
        });
      }
    });

    // Store actual mappings for reference
    this.validationResults.teamClubMapping.actualMappings = Array.from(actualMappings.values());

    console.log(`✅ Team-club mapping validation completed`);
  }

  /**
   * Validate spiele consistency
   */
  async validateSpielConsistency(options) {
    console.log('🏈 Validating spiele consistency...');

    const filters = {};
    if (options.teamId) {
      filters.$or = [
        { heim_team: options.teamId },
        { gast_team: options.teamId }
      ];
    }
    if (options.clubId) {
      filters.$or = [
        { heim_club: options.clubId },
        { gast_club: options.clubId }
      ];
    }

    const spiele = await this.strapi.entityService.findMany('api::spiel.spiel', {
      filters,
      populate: {
        heim_team: true,
        gast_team: true,
        heim_club: true,
        gast_club: true,
        liga: true
      }
    });

    this.validationResults.summary.totalSpiele = spiele.length;

    for (const spiel of spiele) {
      const hasTeamData = spiel.heim_team && spiel.gast_team;
      const hasClubData = spiel.heim_club && spiel.gast_club;
      const hasPartialTeamData = spiel.heim_team || spiel.gast_team;
      const hasPartialClubData = spiel.heim_club || spiel.gast_club;

      // Categorize spiele
      if (hasTeamData && !hasClubData) {
        this.validationResults.spieleConsistency.teamOnlySpiele.push({
          spielId: spiel.id,
          datum: spiel.datum,
          heimTeam: spiel.heim_team.name,
          gastTeam: spiel.gast_team.name,
          liga: spiel.liga?.name
        });
      } else if (hasClubData && !hasTeamData) {
        this.validationResults.spieleConsistency.clubOnlySpiele.push({
          spielId: spiel.id,
          datum: spiel.datum,
          heimClub: spiel.heim_club.name,
          gastClub: spiel.gast_club.name,
          liga: spiel.liga?.name
        });
      } else if (hasTeamData && hasClubData) {
        // Mixed data - validate consistency
        const mixedSpiel = {
          spielId: spiel.id,
          datum: spiel.datum,
          heimTeam: spiel.heim_team.name,
          gastTeam: spiel.gast_team.name,
          heimClub: spiel.heim_club.name,
          gastClub: spiel.gast_club.name,
          liga: spiel.liga?.name,
          issues: []
        };

        // Check if team-club mappings are consistent
        const heimConsistent = await this.checkTeamClubConsistency(spiel.heim_team, spiel.heim_club);
        const gastConsistent = await this.checkTeamClubConsistency(spiel.gast_team, spiel.gast_club);

        if (!heimConsistent) {
          mixedSpiel.issues.push('Heim team-club mapping inconsistent');
        }
        if (!gastConsistent) {
          mixedSpiel.issues.push('Gast team-club mapping inconsistent');
        }

        if (mixedSpiel.issues.length > 0) {
          this.validationResults.spieleConsistency.inconsistentSpiele.push(mixedSpiel);
          this.validationResults.summary.consistencyErrors++;
        } else {
          this.validationResults.spieleConsistency.mixedSpiele.push(mixedSpiel);
        }
      } else if (hasPartialTeamData || hasPartialClubData) {
        // Orphaned spiele with incomplete data
        this.validationResults.spieleConsistency.orphanedSpiele.push({
          spielId: spiel.id,
          datum: spiel.datum,
          heimTeam: spiel.heim_team?.name || null,
          gastTeam: spiel.gast_team?.name || null,
          heimClub: spiel.heim_club?.name || null,
          gastClub: spiel.gast_club?.name || null,
          liga: spiel.liga?.name,
          issue: 'Incomplete team or club data'
        });
        this.validationResults.summary.consistencyErrors++;
      }
    }

    console.log(`✅ Spiele consistency validation completed`);
  }

  /**
   * Validate tabellen-eintrag consistency
   */
  async validateTabellenConsistency(options) {
    console.log('📊 Validating tabellen-eintrag consistency...');

    const filters = {};
    if (options.clubId) {
      filters.club = options.clubId;
    }

    const eintraege = await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
      filters,
      populate: {
        team: true,
        club: true,
        liga: true
      }
    });

    this.validationResults.summary.totalTabellenEintraege = eintraege.length;

    for (const eintrag of eintraege) {
      const hasTeamData = eintrag.team;
      const hasClubData = eintrag.club;

      if (hasTeamData && !hasClubData) {
        this.validationResults.tabellenConsistency.teamOnlyEintraege.push({
          eintragId: eintrag.id,
          teamName: eintrag.team_name,
          team: eintrag.team.name,
          liga: eintrag.liga?.name
        });
      } else if (hasClubData && !hasTeamData) {
        this.validationResults.tabellenConsistency.clubOnlyEintraege.push({
          eintragId: eintrag.id,
          teamName: eintrag.team_name,
          club: eintrag.club.name,
          liga: eintrag.liga?.name
        });
      } else if (hasTeamData && hasClubData) {
        // Check consistency between team and club
        const issues = [];

        // Check if team_name matches club name
        if (eintrag.team_name !== eintrag.club.name) {
          issues.push(`team_name "${eintrag.team_name}" doesn't match club name "${eintrag.club.name}"`);
        }

        // Check if team-club mapping is consistent
        const consistent = await this.checkTeamClubConsistency(eintrag.team, eintrag.club);
        if (!consistent) {
          issues.push('Team-club mapping inconsistent');
        }

        if (issues.length > 0) {
          this.validationResults.tabellenConsistency.inconsistentEintraege.push({
            eintragId: eintrag.id,
            teamName: eintrag.team_name,
            team: eintrag.team.name,
            club: eintrag.club.name,
            liga: eintrag.liga?.name,
            issues
          });
          this.validationResults.summary.consistencyErrors++;
        }
      } else {
        // Orphaned entries with no team or club
        this.validationResults.tabellenConsistency.orphanedEintraege.push({
          eintragId: eintrag.id,
          teamName: eintrag.team_name,
          liga: eintrag.liga?.name,
          issue: 'No team or club reference'
        });
        this.validationResults.summary.consistencyErrors++;
      }
    }

    console.log(`✅ Tabellen-eintrag consistency validation completed`);
  }

  /**
   * Check migration status
   */
  async checkMigrationStatus(options) {
    console.log('🔄 Checking migration status...');

    // Count spiele by migration status
    const allSpiele = await this.strapi.entityService.findMany('api::spiel.spiel', {
      populate: {
        heim_team: true,
        gast_team: true,
        heim_club: true,
        gast_club: true
      }
    });

    let fullyMigrated = 0;
    let partiallyMigrated = 0;
    let notMigrated = 0;

    allSpiele.forEach(spiel => {
      const hasTeamData = spiel.heim_team && spiel.gast_team;
      const hasClubData = spiel.heim_club && spiel.gast_club;
      const hasPartialData = (spiel.heim_team || spiel.gast_team || spiel.heim_club || spiel.gast_club);

      if (hasClubData && !hasTeamData) {
        fullyMigrated++;
      } else if (hasClubData && hasTeamData) {
        fullyMigrated++; // Both systems present is considered fully migrated
      } else if (hasPartialData) {
        partiallyMigrated++;
        this.validationResults.migrationStatus.migrationErrors.push({
          spielId: spiel.id,
          issue: 'Partial migration - incomplete data',
          hasTeamData,
          hasClubData
        });
      } else {
        notMigrated++;
        this.validationResults.migrationStatus.migrationErrors.push({
          spielId: spiel.id,
          issue: 'Not migrated - no team or club data'
        });
      }
    });

    this.validationResults.migrationStatus.fullyMigrated = fullyMigrated;
    this.validationResults.migrationStatus.partiallyMigrated = partiallyMigrated;
    this.validationResults.migrationStatus.notMigrated = notMigrated;
    this.validationResults.summary.migrationIssues = partiallyMigrated + notMigrated;

    console.log(`✅ Migration status check completed`);
  }

  /**
   * Validate cross-references between systems
   */
  async validateCrossReferences(options) {
    console.log('🔗 Validating cross-references...');

    // Check if all Viktoria clubs have corresponding teams
    const viktoriaClubs = await this.strapi.entityService.findMany('api::club.club', {
      filters: { club_typ: 'viktoria_verein' }
    });

    const teams = await this.strapi.entityService.findMany('api::team.team', {});

    for (const club of viktoriaClubs) {
      if (club.viktoria_team_mapping) {
        const expectedTeamName = this.expectedTeamClubMappings[club.viktoria_team_mapping]?.expectedTeamName;
        const correspondingTeam = teams.find(team => team.name === expectedTeamName);

        if (!correspondingTeam) {
          this.validationResults.summary.crossReferenceErrors++;
          // Add to recommendations for fixing
        }
      }
    }

    // Check if all teams have corresponding clubs
    for (const team of teams) {
      const expectedMapping = Object.entries(this.expectedTeamClubMappings).find(
        ([mapping, expected]) => expected.expectedTeamName === team.name
      );

      if (expectedMapping) {
        const [teamMapping] = expectedMapping;
        const correspondingClub = viktoriaClubs.find(club => club.viktoria_team_mapping === teamMapping);

        if (!correspondingClub) {
          this.validationResults.summary.crossReferenceErrors++;
          // Add to recommendations for fixing
        }
      }
    }

    console.log(`✅ Cross-reference validation completed`);
  }

  /**
   * Check if team-club mapping is consistent
   */
  async checkTeamClubConsistency(team, club) {
    if (!team || !club) return false;
    if (club.club_typ !== 'viktoria_verein') return true; // Only validate Viktoria clubs

    const expectedMapping = Object.entries(this.expectedTeamClubMappings).find(
      ([mapping, expected]) => expected.expectedTeamName === team.name
    );

    if (!expectedMapping) return true; // Unknown team, can't validate

    const [expectedTeamMapping] = expectedMapping;
    return club.viktoria_team_mapping === expectedTeamMapping;
  }

  /**
   * Generate recommendations based on validation results
   */
  async generateRecommendations() {
    console.log('💡 Generating recommendations...');

    const recommendations = [];

    // Recommendations for missing mappings
    if (this.validationResults.teamClubMapping.missingMappings.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'MISSING_MAPPINGS',
        title: 'Create missing team-club mappings',
        description: `${this.validationResults.teamClubMapping.missingMappings.length} expected team mappings are missing`,
        action: 'Create clubs with proper viktoria_team_mapping values',
        details: this.validationResults.teamClubMapping.missingMappings
      });
    }

    // Recommendations for duplicate mappings
    if (this.validationResults.teamClubMapping.duplicateMappings.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'DUPLICATE_MAPPINGS',
        title: 'Fix duplicate team mappings',
        description: 'Multiple clubs have the same viktoria_team_mapping',
        action: 'Ensure each team mapping is unique',
        details: this.validationResults.teamClubMapping.duplicateMappings
      });
    }

    // Recommendations for inconsistent spiele
    if (this.validationResults.spieleConsistency.inconsistentSpiele.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'SPIELE_CONSISTENCY',
        title: 'Fix inconsistent spiele data',
        description: `${this.validationResults.spieleConsistency.inconsistentSpiele.length} spiele have inconsistent team-club mappings`,
        action: 'Review and correct team-club relationships in spiele',
        details: this.validationResults.spieleConsistency.inconsistentSpiele
      });
    }

    // Recommendations for orphaned spiele
    if (this.validationResults.spieleConsistency.orphanedSpiele.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'ORPHANED_SPIELE',
        title: 'Fix orphaned spiele',
        description: `${this.validationResults.spieleConsistency.orphanedSpiele.length} spiele have incomplete data`,
        action: 'Complete missing team or club data, or remove invalid records',
        details: this.validationResults.spieleConsistency.orphanedSpiele
      });
    }

    // Recommendations for migration issues
    if (this.validationResults.summary.migrationIssues > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'MIGRATION_STATUS',
        title: 'Complete migration process',
        description: `${this.validationResults.summary.migrationIssues} records have migration issues`,
        action: 'Run migration scripts to complete the team-to-club transition',
        details: {
          partiallyMigrated: this.validationResults.migrationStatus.partiallyMigrated,
          notMigrated: this.validationResults.migrationStatus.notMigrated
        }
      });
    }

    // Recommendations for tabellen consistency
    if (this.validationResults.tabellenConsistency.inconsistentEintraege.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'TABELLEN_CONSISTENCY',
        title: 'Fix tabellen-eintrag consistency',
        description: `${this.validationResults.tabellenConsistency.inconsistentEintraege.length} table entries have consistency issues`,
        action: 'Update team_name fields to match club names',
        details: this.validationResults.tabellenConsistency.inconsistentEintraege
      });
    }

    this.validationResults.recommendations = recommendations;

    console.log(`✅ Generated ${recommendations.length} recommendations`);
  }

  /**
   * Fix consistency issues automatically
   */
  async fixConsistencyIssues() {
    console.log('\n🔧 Fixing consistency issues...');

    let fixedCount = 0;

    // Fix inconsistent tabellen-eintraege
    for (const eintrag of this.validationResults.tabellenConsistency.inconsistentEintraege) {
      try {
        // Update team_name to match club name
        await this.strapi.entityService.update('api::tabellen-eintrag.tabellen-eintrag', eintrag.eintragId, {
          data: {
            team_name: eintrag.club
          }
        });
        fixedCount++;
        console.log(`  ✅ Fixed tabellen-eintrag ${eintrag.eintragId} - updated team_name`);
      } catch (error) {
        console.log(`  ❌ Failed to fix tabellen-eintrag ${eintrag.eintragId}: ${error.message}`);
      }
    }

    // Remove orphaned tabellen-eintraege
    for (const eintrag of this.validationResults.tabellenConsistency.orphanedEintraege) {
      try {
        await this.strapi.entityService.delete('api::tabellen-eintrag.tabellen-eintrag', eintrag.eintragId);
        fixedCount++;
        console.log(`  ✅ Removed orphaned tabellen-eintrag ${eintrag.eintragId}`);
      } catch (error) {
        console.log(`  ❌ Failed to remove tabellen-eintrag ${eintrag.eintragId}: ${error.message}`);
      }
    }

    console.log(`\n🎉 Fixed ${fixedCount} consistency issues`);
  }

  /**
   * Display validation results
   */
  displayResults(options) {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 TEAM-CLUB CONSISTENCY VALIDATION RESULTS');
    console.log('='.repeat(60));

    // Summary
    const summary = this.validationResults.summary;
    console.log('\n📈 SUMMARY:');
    console.log(`Total Teams: ${summary.totalTeams}`);
    console.log(`Total Clubs: ${summary.totalClubs}`);
    console.log(`Total Spiele: ${summary.totalSpiele}`);
    console.log(`Total Tabellen-Einträge: ${summary.totalTabellenEintraege}`);
    console.log(`Consistency Errors: ${summary.consistencyErrors}`);
    console.log(`Migration Issues: ${summary.migrationIssues}`);
    console.log(`Cross-Reference Errors: ${summary.crossReferenceErrors}`);

    // Migration status
    const migration = this.validationResults.migrationStatus;
    console.log('\n🔄 MIGRATION STATUS:');
    console.log(`Fully Migrated: ${migration.fullyMigrated}`);
    console.log(`Partially Migrated: ${migration.partiallyMigrated}`);
    console.log(`Not Migrated: ${migration.notMigrated}`);

    // Overall status
    const isHealthy = summary.consistencyErrors === 0 && summary.migrationIssues === 0;
    const status = isHealthy ? '✅ CONSISTENT' : '❌ ISSUES FOUND';
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

    // Team-club mapping issues
    const mapping = this.validationResults.teamClubMapping;
    if (mapping.missingMappings.length > 0) {
      console.log('\n❌ Missing Team Mappings:');
      mapping.missingMappings.forEach(missing => {
        console.log(`  ${missing.teamMapping}: Expected "${missing.expectedClubName}"`);
      });
    }

    if (mapping.inconsistentMappings.length > 0) {
      console.log('\n⚠️ Inconsistent Team Mappings:');
      mapping.inconsistentMappings.forEach(inconsistent => {
        console.log(`  ${inconsistent.teamMapping}: Expected "${inconsistent.expectedClubName}", got "${inconsistent.actualClubName}"`);
      });
    }

    // Spiele consistency issues
    const spiele = this.validationResults.spieleConsistency;
    if (spiele.inconsistentSpiele.length > 0) {
      console.log('\n❌ Inconsistent Spiele:');
      spiele.inconsistentSpiele.slice(0, 5).forEach(spiel => {
        console.log(`  Spiel ${spiel.spielId} (${spiel.datum}): ${spiel.issues.join(', ')}`);
      });
      if (spiele.inconsistentSpiele.length > 5) {
        console.log(`  ... and ${spiele.inconsistentSpiele.length - 5} more`);
      }
    }

    if (spiele.orphanedSpiele.length > 0) {
      console.log('\n🗑️ Orphaned Spiele:');
      spiele.orphanedSpiele.slice(0, 5).forEach(spiel => {
        console.log(`  Spiel ${spiel.spielId} (${spiel.datum}): ${spiel.issue}`);
      });
      if (spiele.orphanedSpiele.length > 5) {
        console.log(`  ... and ${spiele.orphanedSpiele.length - 5} more`);
      }
    }

    // Tabellen consistency issues
    const tabellen = this.validationResults.tabellenConsistency;
    if (tabellen.inconsistentEintraege.length > 0) {
      console.log('\n❌ Inconsistent Tabellen-Einträge:');
      tabellen.inconsistentEintraege.slice(0, 5).forEach(eintrag => {
        console.log(`  Entry ${eintrag.eintragId} (${eintrag.teamName}): ${eintrag.issues.join(', ')}`);
      });
      if (tabellen.inconsistentEintraege.length > 5) {
        console.log(`  ... and ${tabellen.inconsistentEintraege.length - 5} more`);
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
    const filename = `team-club-consistency-report-${timestamp}.json`;
    const filepath = path.join(reportsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(this.validationResults, null, 2));
    console.log(`📄 Consistency report exported to: ${filepath}`);
  }
}

/**
 * Main execution function
 */
async function runValidation() {
  const args = process.argv.slice(2);
  const options = {
    detailed: args.includes('--detailed'),
    fixIssues: args.includes('--fix-issues'),
    exportReport: args.includes('--export-report'),
    teamId: args.find(arg => arg.startsWith('--team-id='))?.split('=')[1],
    clubId: args.find(arg => arg.startsWith('--club-id='))?.split('=')[1]
  };

  console.log('🚀 Starting Team-Club Consistency Validation');
  console.log('Options:', options);
  console.log('='.repeat(60));

  const strapi = await createStrapi();

  try {
    const validator = new TeamClubConsistencyValidator(strapi);
    const results = await validator.validateConsistency(options);

    // Exit with error code if issues found
    const hasIssues = results.summary.consistencyErrors > 0 || results.summary.migrationIssues > 0;
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

module.exports = { TeamClubConsistencyValidator };