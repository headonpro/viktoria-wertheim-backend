/**
 * Cleanup Tool for Orphaned Records
 * 
 * This script identifies and cleans up orphaned records in the club system:
 * - Spiele with invalid club references
 * - Tabellen-Einträge with invalid club references
 * - Clubs with invalid liga references
 * - Unused media files (logos)
 * - Duplicate records
 * 
 * Usage:
 *   node scripts/cleanup-orphaned-records.js [options]
 * 
 * Options:
 *   --dry-run        Show what would be cleaned up without making changes
 *   --force          Skip confirmation prompts
 *   --backup         Create backup before cleanup
 *   --type=TYPE      Clean specific type only (spiele|tabellen|clubs|media|duplicates)
 *   --older-than=N   Clean records older than N days
 */

const { createStrapi } = require('@strapi/strapi');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

class OrphanedRecordsCleaner {
  constructor(strapi) {
    this.strapi = strapi;
    this.cleanupResults = {
      timestamp: new Date().toISOString(),
      summary: {
        totalScanned: 0,
        totalCleaned: 0,
        totalErrors: 0,
        backupCreated: false
      },
      cleanupActions: [],
      errors: []
    };
  }

  /**
   * Run comprehensive cleanup
   */
  async cleanup(options = {}) {
    console.log('🧹 Starting orphaned records cleanup...\n');

    try {
      // Create backup if requested
      if (options.backup) {
        await this.createBackup();
      }

      // Run specific cleanup or all types
      if (options.type) {
        await this.runSpecificCleanup(options.type, options);
      } else {
        await this.runAllCleanups(options);
      }

      // Display results
      this.displayResults(options);

      return this.cleanupResults;

    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Run all cleanup types
   */
  async runAllCleanups(options) {
    await this.cleanupInvalidSpielReferences(options);
    await this.cleanupInvalidTabellenReferences(options);
    await this.cleanupInvalidClubReferences(options);
    await this.cleanupUnusedMedia(options);
    await this.cleanupDuplicateRecords(options);
  }

  /**
   * Run specific cleanup type
   */
  async runSpecificCleanup(type, options) {
    switch (type) {
      case 'spiele':
        await this.cleanupInvalidSpielReferences(options);
        break;
      case 'tabellen':
        await this.cleanupInvalidTabellenReferences(options);
        break;
      case 'clubs':
        await this.cleanupInvalidClubReferences(options);
        break;
      case 'media':
        await this.cleanupUnusedMedia(options);
        break;
      case 'duplicates':
        await this.cleanupDuplicateRecords(options);
        break;
      default:
        throw new Error(`Unknown cleanup type: ${type}`);
    }
  }

  /**
   * Cleanup spiele with invalid club references
   */
  async cleanupInvalidSpielReferences(options) {
    console.log('🏈 Cleaning up spiele with invalid club references...');

    const spiele = await this.strapi.entityService.findMany('api::spiel.spiel', {
      populate: {
        heim_club: true,
        gast_club: true,
        liga: true
      }
    });

    const invalidSpiele = [];
    const cutoffDate = options.olderThan ? new Date(Date.now() - options.olderThan * 24 * 60 * 60 * 1000) : null;

    for (const spiel of spiele) {
      const issues = [];
      const spielDate = new Date(spiel.datum);

      // Skip if not old enough
      if (cutoffDate && spielDate > cutoffDate) {
        continue;
      }

      // Check for inactive clubs
      if (spiel.heim_club && !spiel.heim_club.aktiv) {
        issues.push({
          type: 'INACTIVE_HEIM_CLUB',
          message: `Heim club "${spiel.heim_club.name}" is inactive`,
          action: 'CANCEL_GAME'
        });
      }

      if (spiel.gast_club && !spiel.gast_club.aktiv) {
        issues.push({
          type: 'INACTIVE_GAST_CLUB',
          message: `Gast club "${spiel.gast_club.name}" is inactive`,
          action: 'CANCEL_GAME'
        });
      }

      // Check for null references (broken relations)
      if (spiel.heim_club === null && spiel.gast_club === null && !spiel.heim_team && !spiel.gast_team) {
        issues.push({
          type: 'NO_PARTICIPANTS',
          message: 'Game has no participants (neither teams nor clubs)',
          action: 'DELETE_GAME'
        });
      }

      if (issues.length > 0) {
        invalidSpiele.push({
          spiel,
          issues,
          recommendedAction: this.determineSpielAction(issues)
        });
      }
    }

    this.cleanupResults.summary.totalScanned += spiele.length;

    if (invalidSpiele.length === 0) {
      console.log('✅ No invalid spiel references found');
      return;
    }

    console.log(`Found ${invalidSpiele.length} spiele with issues`);

    if (options.dryRun) {
      console.log('\n🔍 DRY RUN - Would perform these actions:');
      invalidSpiele.forEach((item, index) => {
        console.log(`${index + 1}. Spiel ID ${item.spiel.id} (${item.spiel.datum})`);
        console.log(`   Action: ${item.recommendedAction}`);
        item.issues.forEach(issue => {
          console.log(`   Issue: ${issue.message}`);
        });
        console.log('');
      });
      return;
    }

    // Confirm cleanup
    if (!options.force) {
      const confirmed = await this.confirmAction(
        `Clean up ${invalidSpiele.length} spiele with invalid references?`
      );
      if (!confirmed) {
        console.log('Cleanup cancelled');
        return;
      }
    }

    // Perform cleanup
    for (const item of invalidSpiele) {
      try {
        await this.executeSpielCleanup(item);
        this.cleanupResults.summary.totalCleaned++;
        this.cleanupResults.cleanupActions.push({
          type: 'SPIEL_CLEANUP',
          recordId: item.spiel.id,
          action: item.recommendedAction,
          issues: item.issues.map(i => i.message)
        });
      } catch (error) {
        this.cleanupResults.summary.totalErrors++;
        this.cleanupResults.errors.push({
          type: 'SPIEL_CLEANUP_ERROR',
          recordId: item.spiel.id,
          error: error.message
        });
        console.error(`❌ Failed to clean up spiel ${item.spiel.id}:`, error.message);
      }
    }

    console.log(`✅ Cleaned up ${invalidSpiele.length} spiele`);
  }

  /**
   * Cleanup tabellen-eintraege with invalid club references
   */
  async cleanupInvalidTabellenReferences(options) {
    console.log('📊 Cleaning up tabellen-einträge with invalid club references...');

    const eintraege = await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
      populate: {
        club: true,
        team: true,
        liga: true
      }
    });

    const invalidEintraege = [];

    for (const eintrag of eintraege) {
      const issues = [];

      // Check for inactive club reference
      if (eintrag.club && !eintrag.club.aktiv) {
        issues.push({
          type: 'INACTIVE_CLUB',
          message: `Club "${eintrag.club.name}" is inactive`,
          action: 'REMOVE_CLUB_REFERENCE'
        });
      }

      // Check for missing both club and team
      if (!eintrag.club && !eintrag.team) {
        issues.push({
          type: 'NO_ENTITY_REFERENCE',
          message: 'Entry has neither club nor team reference',
          action: 'DELETE_ENTRY'
        });
      }

      // Check for inconsistent team_name
      if (eintrag.club && eintrag.team_name !== eintrag.club.name) {
        issues.push({
          type: 'INCONSISTENT_TEAM_NAME',
          message: `team_name "${eintrag.team_name}" doesn't match club name "${eintrag.club.name}"`,
          action: 'UPDATE_TEAM_NAME'
        });
      }

      if (issues.length > 0) {
        invalidEintraege.push({
          eintrag,
          issues,
          recommendedAction: this.determineTabellenAction(issues)
        });
      }
    }

    this.cleanupResults.summary.totalScanned += eintraege.length;

    if (invalidEintraege.length === 0) {
      console.log('✅ No invalid tabellen-eintrag references found');
      return;
    }

    console.log(`Found ${invalidEintraege.length} tabellen-einträge with issues`);

    if (options.dryRun) {
      console.log('\n🔍 DRY RUN - Would perform these actions:');
      invalidEintraege.forEach((item, index) => {
        console.log(`${index + 1}. Entry ID ${item.eintrag.id} (${item.eintrag.team_name})`);
        console.log(`   Action: ${item.recommendedAction}`);
        item.issues.forEach(issue => {
          console.log(`   Issue: ${issue.message}`);
        });
        console.log('');
      });
      return;
    }

    // Confirm cleanup
    if (!options.force) {
      const confirmed = await this.confirmAction(
        `Clean up ${invalidEintraege.length} tabellen-einträge with invalid references?`
      );
      if (!confirmed) {
        console.log('Cleanup cancelled');
        return;
      }
    }

    // Perform cleanup
    for (const item of invalidEintraege) {
      try {
        await this.executeTabellenCleanup(item);
        this.cleanupResults.summary.totalCleaned++;
        this.cleanupResults.cleanupActions.push({
          type: 'TABELLEN_CLEANUP',
          recordId: item.eintrag.id,
          action: item.recommendedAction,
          issues: item.issues.map(i => i.message)
        });
      } catch (error) {
        this.cleanupResults.summary.totalErrors++;
        this.cleanupResults.errors.push({
          type: 'TABELLEN_CLEANUP_ERROR',
          recordId: item.eintrag.id,
          error: error.message
        });
        console.error(`❌ Failed to clean up tabellen-eintrag ${item.eintrag.id}:`, error.message);
      }
    }

    console.log(`✅ Cleaned up ${invalidEintraege.length} tabellen-einträge`);
  }

  /**
   * Cleanup clubs with invalid liga references
   */
  async cleanupInvalidClubReferences(options) {
    console.log('🏆 Cleaning up clubs with invalid liga references...');

    const clubs = await this.strapi.entityService.findMany('api::club.club', {
      populate: {
        ligen: true
      }
    });

    const invalidClubs = [];

    for (const club of clubs) {
      const issues = [];

      if (club.ligen) {
        // Check for inactive ligen
        const inactiveLigen = club.ligen.filter(liga => !liga.aktiv);
        if (inactiveLigen.length > 0) {
          issues.push({
            type: 'INACTIVE_LIGEN',
            message: `Club assigned to ${inactiveLigen.length} inactive ligen`,
            inactiveLigen: inactiveLigen.map(l => ({ id: l.id, name: l.name })),
            action: 'REMOVE_INACTIVE_LIGEN'
          });
        }

        // Check for no active ligen
        const activeLigen = club.ligen.filter(liga => liga.aktiv);
        if (activeLigen.length === 0 && club.aktiv) {
          issues.push({
            type: 'NO_ACTIVE_LIGEN',
            message: 'Active club has no active liga assignments',
            action: 'DEACTIVATE_CLUB'
          });
        }
      } else if (club.aktiv) {
        issues.push({
          type: 'NO_LIGA_ASSIGNMENTS',
          message: 'Active club has no liga assignments',
          action: 'DEACTIVATE_CLUB'
        });
      }

      if (issues.length > 0) {
        invalidClubs.push({
          club,
          issues,
          recommendedAction: this.determineClubAction(issues)
        });
      }
    }

    this.cleanupResults.summary.totalScanned += clubs.length;

    if (invalidClubs.length === 0) {
      console.log('✅ No invalid club references found');
      return;
    }

    console.log(`Found ${invalidClubs.length} clubs with issues`);

    if (options.dryRun) {
      console.log('\n🔍 DRY RUN - Would perform these actions:');
      invalidClubs.forEach((item, index) => {
        console.log(`${index + 1}. Club ID ${item.club.id} (${item.club.name})`);
        console.log(`   Action: ${item.recommendedAction}`);
        item.issues.forEach(issue => {
          console.log(`   Issue: ${issue.message}`);
        });
        console.log('');
      });
      return;
    }

    // Confirm cleanup
    if (!options.force) {
      const confirmed = await this.confirmAction(
        `Clean up ${invalidClubs.length} clubs with invalid references?`
      );
      if (!confirmed) {
        console.log('Cleanup cancelled');
        return;
      }
    }

    // Perform cleanup
    for (const item of invalidClubs) {
      try {
        await this.executeClubCleanup(item);
        this.cleanupResults.summary.totalCleaned++;
        this.cleanupResults.cleanupActions.push({
          type: 'CLUB_CLEANUP',
          recordId: item.club.id,
          action: item.recommendedAction,
          issues: item.issues.map(i => i.message)
        });
      } catch (error) {
        this.cleanupResults.summary.totalErrors++;
        this.cleanupResults.errors.push({
          type: 'CLUB_CLEANUP_ERROR',
          recordId: item.club.id,
          error: error.message
        });
        console.error(`❌ Failed to clean up club ${item.club.id}:`, error.message);
      }
    }

    console.log(`✅ Cleaned up ${invalidClubs.length} clubs`);
  }

  /**
   * Cleanup unused media files (logos)
   */
  async cleanupUnusedMedia(options) {
    console.log('🖼️ Cleaning up unused media files...');

    // Get all media files
    const mediaFiles = await this.strapi.entityService.findMany('plugin::upload.file', {
      filters: {
        mime: { $startsWith: 'image/' }
      }
    });

    // Get all club logo references
    const clubs = await this.strapi.entityService.findMany('api::club.club', {
      populate: {
        logo: true
      }
    });

    const usedLogoIds = new Set();
    clubs.forEach(club => {
      if (club.logo) {
        usedLogoIds.add(club.logo.id);
      }
    });

    // Find unused media files (potential club logos)
    const unusedMedia = mediaFiles.filter(file => 
      !usedLogoIds.has(file.id) && 
      (file.name.toLowerCase().includes('logo') || 
       file.name.toLowerCase().includes('club') ||
       file.alternativeText?.toLowerCase().includes('logo'))
    );

    this.cleanupResults.summary.totalScanned += mediaFiles.length;

    if (unusedMedia.length === 0) {
      console.log('✅ No unused media files found');
      return;
    }

    console.log(`Found ${unusedMedia.length} potentially unused media files`);

    if (options.dryRun) {
      console.log('\n🔍 DRY RUN - Would delete these files:');
      unusedMedia.forEach((file, index) => {
        console.log(`${index + 1}. ${file.name} (${file.size} bytes, uploaded: ${file.createdAt})`);
      });
      return;
    }

    // Confirm cleanup
    if (!options.force) {
      const confirmed = await this.confirmAction(
        `Delete ${unusedMedia.length} unused media files? This action cannot be undone.`
      );
      if (!confirmed) {
        console.log('Cleanup cancelled');
        return;
      }
    }

    // Perform cleanup
    for (const file of unusedMedia) {
      try {
        await this.strapi.entityService.delete('plugin::upload.file', file.id);
        this.cleanupResults.summary.totalCleaned++;
        this.cleanupResults.cleanupActions.push({
          type: 'MEDIA_CLEANUP',
          recordId: file.id,
          action: 'DELETE_FILE',
          details: { name: file.name, size: file.size }
        });
      } catch (error) {
        this.cleanupResults.summary.totalErrors++;
        this.cleanupResults.errors.push({
          type: 'MEDIA_CLEANUP_ERROR',
          recordId: file.id,
          error: error.message
        });
        console.error(`❌ Failed to delete media file ${file.id}:`, error.message);
      }
    }

    console.log(`✅ Cleaned up ${unusedMedia.length} media files`);
  }

  /**
   * Cleanup duplicate records
   */
  async cleanupDuplicateRecords(options) {
    console.log('🔄 Cleaning up duplicate records...');

    // Find duplicate clubs by name
    const clubs = await this.strapi.entityService.findMany('api::club.club', {});
    const clubsByName = new Map();
    
    clubs.forEach(club => {
      const name = club.name.toLowerCase().trim();
      if (!clubsByName.has(name)) {
        clubsByName.set(name, []);
      }
      clubsByName.get(name).push(club);
    });

    const duplicateClubs = [];
    clubsByName.forEach((clubList, name) => {
      if (clubList.length > 1) {
        // Sort by creation date, keep the oldest
        clubList.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const keepClub = clubList[0];
        const duplicates = clubList.slice(1);
        
        duplicateClubs.push({
          name,
          keepClub,
          duplicates
        });
      }
    });

    this.cleanupResults.summary.totalScanned += clubs.length;

    if (duplicateClubs.length === 0) {
      console.log('✅ No duplicate clubs found');
      return;
    }

    console.log(`Found ${duplicateClubs.length} sets of duplicate clubs`);

    if (options.dryRun) {
      console.log('\n🔍 DRY RUN - Would merge these duplicates:');
      duplicateClubs.forEach((item, index) => {
        console.log(`${index + 1}. "${item.name}"`);
        console.log(`   Keep: ID ${item.keepClub.id} (created: ${item.keepClub.createdAt})`);
        console.log(`   Remove: ${item.duplicates.map(d => `ID ${d.id}`).join(', ')}`);
        console.log('');
      });
      return;
    }

    // Confirm cleanup
    if (!options.force) {
      const totalDuplicates = duplicateClubs.reduce((sum, item) => sum + item.duplicates.length, 0);
      const confirmed = await this.confirmAction(
        `Merge ${duplicateClubs.length} sets of duplicate clubs (removing ${totalDuplicates} duplicates)?`
      );
      if (!confirmed) {
        console.log('Cleanup cancelled');
        return;
      }
    }

    // Perform cleanup
    for (const item of duplicateClubs) {
      try {
        await this.mergeDuplicateClubs(item);
        this.cleanupResults.summary.totalCleaned += item.duplicates.length;
        this.cleanupResults.cleanupActions.push({
          type: 'DUPLICATE_CLEANUP',
          recordId: item.keepClub.id,
          action: 'MERGE_DUPLICATES',
          details: {
            name: item.name,
            keptClubId: item.keepClub.id,
            removedClubIds: item.duplicates.map(d => d.id)
          }
        });
      } catch (error) {
        this.cleanupResults.summary.totalErrors++;
        this.cleanupResults.errors.push({
          type: 'DUPLICATE_CLEANUP_ERROR',
          recordId: item.keepClub.id,
          error: error.message
        });
        console.error(`❌ Failed to merge duplicates for "${item.name}":`, error.message);
      }
    }

    console.log(`✅ Cleaned up duplicate clubs`);
  }

  /**
   * Determine recommended action for spiel cleanup
   */
  determineSpielAction(issues) {
    const hasNoParticipants = issues.some(i => i.type === 'NO_PARTICIPANTS');
    if (hasNoParticipants) return 'DELETE_GAME';
    
    const hasInactiveClubs = issues.some(i => i.type.includes('INACTIVE'));
    if (hasInactiveClubs) return 'CANCEL_GAME';
    
    return 'UPDATE_GAME';
  }

  /**
   * Determine recommended action for tabellen cleanup
   */
  determineTabellenAction(issues) {
    const hasNoEntity = issues.some(i => i.type === 'NO_ENTITY_REFERENCE');
    if (hasNoEntity) return 'DELETE_ENTRY';
    
    const hasInactiveClub = issues.some(i => i.type === 'INACTIVE_CLUB');
    if (hasInactiveClub) return 'REMOVE_CLUB_REFERENCE';
    
    const hasInconsistentName = issues.some(i => i.type === 'INCONSISTENT_TEAM_NAME');
    if (hasInconsistentName) return 'UPDATE_TEAM_NAME';
    
    return 'UPDATE_ENTRY';
  }

  /**
   * Determine recommended action for club cleanup
   */
  determineClubAction(issues) {
    const hasNoActiveLigen = issues.some(i => i.type === 'NO_ACTIVE_LIGEN' || i.type === 'NO_LIGA_ASSIGNMENTS');
    if (hasNoActiveLigen) return 'DEACTIVATE_CLUB';
    
    const hasInactiveLigen = issues.some(i => i.type === 'INACTIVE_LIGEN');
    if (hasInactiveLigen) return 'REMOVE_INACTIVE_LIGEN';
    
    return 'UPDATE_CLUB';
  }

  /**
   * Execute spiel cleanup action
   */
  async executeSpielCleanup(item) {
    const { spiel, recommendedAction } = item;
    
    switch (recommendedAction) {
      case 'DELETE_GAME':
        await this.strapi.entityService.delete('api::spiel.spiel', spiel.id);
        console.log(`  ✅ Deleted spiel ${spiel.id}`);
        break;
        
      case 'CANCEL_GAME':
        await this.strapi.entityService.update('api::spiel.spiel', spiel.id, {
          data: {
            status: 'abgesagt',
            notizen: (spiel.notizen || '') + ' [Auto-cancelled due to inactive club]'
          }
        });
        console.log(`  ✅ Cancelled spiel ${spiel.id}`);
        break;
        
      default:
        console.log(`  ⚠️ Unknown action for spiel ${spiel.id}: ${recommendedAction}`);
    }
  }

  /**
   * Execute tabellen cleanup action
   */
  async executeTabellenCleanup(item) {
    const { eintrag, recommendedAction } = item;
    
    switch (recommendedAction) {
      case 'DELETE_ENTRY':
        await this.strapi.entityService.delete('api::tabellen-eintrag.tabellen-eintrag', eintrag.id);
        console.log(`  ✅ Deleted tabellen-eintrag ${eintrag.id}`);
        break;
        
      case 'REMOVE_CLUB_REFERENCE':
        await this.strapi.entityService.update('api::tabellen-eintrag.tabellen-eintrag', eintrag.id, {
          data: { club: null }
        });
        console.log(`  ✅ Removed club reference from tabellen-eintrag ${eintrag.id}`);
        break;
        
      case 'UPDATE_TEAM_NAME':
        await this.strapi.entityService.update('api::tabellen-eintrag.tabellen-eintrag', eintrag.id, {
          data: { team_name: eintrag.club.name }
        });
        console.log(`  ✅ Updated team_name for tabellen-eintrag ${eintrag.id}`);
        break;
        
      default:
        console.log(`  ⚠️ Unknown action for tabellen-eintrag ${eintrag.id}: ${recommendedAction}`);
    }
  }

  /**
   * Execute club cleanup action
   */
  async executeClubCleanup(item) {
    const { club, recommendedAction, issues } = item;
    
    switch (recommendedAction) {
      case 'DEACTIVATE_CLUB':
        await this.strapi.entityService.update('api::club.club', club.id, {
          data: { aktiv: false }
        });
        console.log(`  ✅ Deactivated club ${club.id}`);
        break;
        
      case 'REMOVE_INACTIVE_LIGEN':
        const currentClub = await this.strapi.entityService.findOne('api::club.club', club.id, {
          populate: { ligen: true }
        });
        const activeLigen = currentClub.ligen.filter(liga => liga.aktiv);
        
        await this.strapi.entityService.update('api::club.club', club.id, {
          data: { ligen: activeLigen.map(liga => liga.id) }
        });
        console.log(`  ✅ Removed inactive ligen from club ${club.id}`);
        break;
        
      default:
        console.log(`  ⚠️ Unknown action for club ${club.id}: ${recommendedAction}`);
    }
  }

  /**
   * Merge duplicate clubs
   */
  async mergeDuplicateClubs(item) {
    const { keepClub, duplicates } = item;
    
    // Update all references to point to the kept club
    for (const duplicate of duplicates) {
      // Update spiele references
      await this.strapi.db.query('api::spiel.spiel').updateMany({
        where: { heim_club: duplicate.id },
        data: { heim_club: keepClub.id }
      });
      
      await this.strapi.db.query('api::spiel.spiel').updateMany({
        where: { gast_club: duplicate.id },
        data: { gast_club: keepClub.id }
      });
      
      // Update tabellen-eintrag references
      await this.strapi.db.query('api::tabellen-eintrag.tabellen-eintrag').updateMany({
        where: { club: duplicate.id },
        data: { club: keepClub.id }
      });
      
      // Delete the duplicate
      await this.strapi.entityService.delete('api::club.club', duplicate.id);
      console.log(`  ✅ Merged duplicate club ${duplicate.id} into ${keepClub.id}`);
    }
  }

  /**
   * Create backup before cleanup
   */
  async createBackup() {
    console.log('💾 Creating backup before cleanup...');
    
    const backupDir = path.join(__dirname, '../backups/cleanup');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupData = {
      timestamp,
      clubs: await this.strapi.entityService.findMany('api::club.club', { populate: '*' }),
      spiele: await this.strapi.entityService.findMany('api::spiel.spiel', { populate: '*' }),
      tabellenEintraege: await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', { populate: '*' })
    };
    
    const backupPath = path.join(backupDir, `cleanup-backup-${timestamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    
    this.cleanupResults.summary.backupCreated = true;
    console.log(`✅ Backup created: ${backupPath}`);
  }

  /**
   * Confirm action with user
   */
  async confirmAction(message) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise((resolve) => {
      rl.question(`${message} (y/N): `, (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }

  /**
   * Display cleanup results
   */
  displayResults(options) {
    console.log('\n' + '='.repeat(60));
    console.log('🧹 CLEANUP RESULTS');
    console.log('='.repeat(60));

    const summary = this.cleanupResults.summary;
    console.log('\n📊 SUMMARY:');
    console.log(`Records Scanned: ${summary.totalScanned}`);
    console.log(`Records Cleaned: ${summary.totalCleaned}`);
    console.log(`Errors: ${summary.totalErrors}`);
    console.log(`Backup Created: ${summary.backupCreated ? 'Yes' : 'No'}`);

    if (this.cleanupResults.cleanupActions.length > 0) {
      console.log('\n✅ CLEANUP ACTIONS:');
      this.cleanupResults.cleanupActions.forEach((action, index) => {
        console.log(`${index + 1}. ${action.type} - Record ${action.recordId}`);
        console.log(`   Action: ${action.action}`);
        if (action.issues) {
          console.log(`   Issues: ${action.issues.join(', ')}`);
        }
      });
    }

    if (this.cleanupResults.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.cleanupResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.type} - Record ${error.recordId}`);
        console.log(`   Error: ${error.error}`);
      });
    }

    console.log('='.repeat(60));
  }
}

/**
 * Main execution function
 */
async function runCleanup() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    backup: args.includes('--backup'),
    type: args.find(arg => arg.startsWith('--type='))?.split('=')[1],
    olderThan: parseInt(args.find(arg => arg.startsWith('--older-than='))?.split('=')[1]) || null
  };

  console.log('🚀 Starting Orphaned Records Cleanup');
  console.log('Options:', options);
  console.log('='.repeat(60));

  const strapi = await createStrapi();

  try {
    const cleaner = new OrphanedRecordsCleaner(strapi);
    await cleaner.cleanup(options);

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await strapi.destroy();
  }
}

// Run cleanup if this script is executed directly
if (require.main === module) {
  runCleanup().catch(console.error);
}

module.exports = { OrphanedRecordsCleaner };