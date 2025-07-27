#!/usr/bin/env node

/**
 * Migration Script for Mannschaft Field
 * 
 * This script migrates existing game-cards and next-game-cards to set the mannschaft field to "m1"
 * for all existing records, ensuring backward compatibility.
 * 
 * Requirements: 4.1, 4.2, 4.3
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:1337/api';

// Simple console colors
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

/**
 * Migration function for game-cards
 * Sets all existing game-cards to mannschaft="m1"
 */
async function migrateGameCards() {
  console.log(colors.blue('Starting migration for game-cards...'));
  
  try {
    // Get all existing game-cards
    const response = await axios.get(`${API_BASE_URL}/game-cards`);
    const existingGameCards = response.data.data || [];

    console.log(`Found ${existingGameCards.length} existing game-cards`);

    if (existingGameCards.length === 0) {
      console.log(colors.yellow('No existing game-cards found. Migration not needed.'));
      return { updated: 0, errors: [] };
    }

    // Filter cards that don't have mannschaft set to "m1" or are null/undefined
    const cardsToUpdate = existingGameCards.filter(card => 
      !card.mannschaft || card.mannschaft !== 'm1'
    );

    console.log(`${cardsToUpdate.length} game-cards need migration to mannschaft="m1"`);

    if (cardsToUpdate.length === 0) {
      console.log(colors.green('All game-cards already have correct mannschaft value.'));
      return { updated: 0, errors: [] };
    }

    // Update cards in batches to avoid overwhelming the database
    const batchSize = 10;
    let updated = 0;
    const errors = [];

    for (let i = 0; i < cardsToUpdate.length; i += batchSize) {
      const batch = cardsToUpdate.slice(i, i + batchSize);
      
      for (const card of batch) {
        try {
          await axios.put(`${API_BASE_URL}/game-cards/${card.documentId}`, {
            data: { mannschaft: 'm1' }
          });
          
          updated++;
          console.log(`✓ Updated game-card ID ${card.id} (${card.gegner}) to mannschaft="m1"`);
        } catch (error) {
          const errorMsg = `Failed to update game-card ID ${card.id}: ${error.response?.data?.error?.message || error.message}`;
          errors.push(errorMsg);
          console.log(colors.red(`✗ ${errorMsg}`));
        }
      }
    }

    console.log(colors.green(`Game-cards migration completed: ${updated} updated, ${errors.length} errors`));
    return { updated, errors };

  } catch (error) {
    const errorMsg = `Game-cards migration failed: ${error.response?.data?.error?.message || error.message}`;
    console.log(colors.red(errorMsg));
    throw new Error(errorMsg);
  }
}

/**
 * Migration function for next-game-cards
 * Sets all existing next-game-cards to mannschaft="m1"
 */
async function migrateNextGameCards() {
  console.log(colors.blue('Starting migration for next-game-cards...'));
  
  try {
    // Get all existing next-game-cards with populated gegner_team
    const response = await axios.get(`${API_BASE_URL}/next-game-cards?populate=gegner_team`);
    const existingNextGameCards = response.data.data || [];

    console.log(`Found ${existingNextGameCards.length} existing next-game-cards`);

    if (existingNextGameCards.length === 0) {
      console.log(colors.yellow('No existing next-game-cards found. Migration not needed.'));
      return { updated: 0, errors: [] };
    }

    // Filter cards that don't have mannschaft set to "m1" or are null/undefined
    const cardsToUpdate = existingNextGameCards.filter(card => 
      !card.mannschaft || card.mannschaft !== 'm1'
    );

    console.log(`${cardsToUpdate.length} next-game-cards need migration to mannschaft="m1"`);

    if (cardsToUpdate.length === 0) {
      console.log(colors.green('All next-game-cards already have correct mannschaft value.'));
      return { updated: 0, errors: [] };
    }

    // Update cards in batches to avoid overwhelming the database
    const batchSize = 10;
    let updated = 0;
    const errors = [];

    for (let i = 0; i < cardsToUpdate.length; i += batchSize) {
      const batch = cardsToUpdate.slice(i, i + batchSize);
      
      for (const card of batch) {
        try {
          await axios.put(`${API_BASE_URL}/next-game-cards/${card.documentId}`, {
            data: { mannschaft: 'm1' }
          });
          
          updated++;
          const teamName = card.gegner_team?.name || 'Unknown Team';
          console.log(`✓ Updated next-game-card ID ${card.id} (vs ${teamName}) to mannschaft="m1"`);
        } catch (error) {
          const errorMsg = `Failed to update next-game-card ID ${card.id}: ${error.response?.data?.error?.message || error.message}`;
          errors.push(errorMsg);
          console.log(colors.red(`✗ ${errorMsg}`));
        }
      }
    }

    console.log(colors.green(`Next-game-cards migration completed: ${updated} updated, ${errors.length} errors`));
    return { updated, errors };

  } catch (error) {
    const errorMsg = `Next-game-cards migration failed: ${error.response?.data?.error?.message || error.message}`;
    console.log(colors.red(errorMsg));
    throw new Error(errorMsg);
  }
}

/**
 * Verification function to check migration results
 */
async function verifyMigration() {
  console.log(colors.blue('Verifying migration results...'));
  
  try {
    // Verify game-cards
    const gameCardsResponse = await axios.get(`${API_BASE_URL}/game-cards`);
    const gameCards = gameCardsResponse.data.data || [];

    const gameCardsWithoutM1 = gameCards.filter(card => card.mannschaft !== 'm1');
    
    // Verify next-game-cards
    const nextGameCardsResponse = await axios.get(`${API_BASE_URL}/next-game-cards`);
    const nextGameCards = nextGameCardsResponse.data.data || [];

    const nextGameCardsWithoutM1 = nextGameCards.filter(card => card.mannschaft !== 'm1');

    console.log('\n' + colors.bold('Migration Verification Results:'));
    console.log('================================');
    console.log(`Game Cards Total: ${gameCards.length}`);
    console.log(`Game Cards with mannschaft="m1": ${gameCards.length - gameCardsWithoutM1.length}`);
    console.log(`Game Cards with other values: ${gameCardsWithoutM1.length}`);
    console.log(`Next Game Cards Total: ${nextGameCards.length}`);
    console.log(`Next Game Cards with mannschaft="m1": ${nextGameCards.length - nextGameCardsWithoutM1.length}`);
    console.log(`Next Game Cards with other values: ${nextGameCardsWithoutM1.length}`);

    const isSuccessful = gameCardsWithoutM1.length === 0 && nextGameCardsWithoutM1.length === 0;
    
    if (isSuccessful) {
      console.log(colors.green('\n✓ Migration verification PASSED: All records have mannschaft="m1"'));
    } else {
      console.log(colors.red('\n✗ Migration verification FAILED: Some records do not have mannschaft="m1"'));
      
      if (gameCardsWithoutM1.length > 0) {
        console.log(colors.yellow('Game Cards with incorrect mannschaft values:'));
        gameCardsWithoutM1.forEach(card => {
          console.log(`  - ID ${card.id} (${card.gegner}): mannschaft="${card.mannschaft}"`);
        });
      }
      
      if (nextGameCardsWithoutM1.length > 0) {
        console.log(colors.yellow('Next Game Cards with incorrect mannschaft values:'));
        nextGameCardsWithoutM1.forEach(card => {
          console.log(`  - ID ${card.id}: mannschaft="${card.mannschaft}"`);
        });
      }
    }

    return {
      success: isSuccessful,
      gameCards: {
        total: gameCards.length,
        correct: gameCards.length - gameCardsWithoutM1.length,
        incorrect: gameCardsWithoutM1.length
      },
      nextGameCards: {
        total: nextGameCards.length,
        correct: nextGameCards.length - nextGameCardsWithoutM1.length,
        incorrect: nextGameCardsWithoutM1.length
      }
    };

  } catch (error) {
    console.log(colors.red(`Verification failed: ${error.response?.data?.error?.message || error.message}`));
    throw error;
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log(colors.bold(colors.blue('\nMannschaft Field Migration Script')));
  console.log('==================================');
  console.log('This script will set all existing game-cards and next-game-cards to mannschaft="m1"');
  console.log('Requirements: 4.1, 4.2, 4.3\n');

  try {
    // Check if Strapi is running
    console.log(colors.cyan('Checking Strapi connection...'));
    
    try {
      await axios.get(`${API_BASE_URL}/game-cards?pagination[limit]=1`);
      console.log(colors.green('✓ Strapi API is accessible'));
    } catch (error) {
      console.log(colors.red('✗ Strapi API is not accessible. Please start Strapi first:'));
      console.log(colors.yellow('  cd backend && npm run develop'));
      process.exit(1);
    }

    // Run migrations
    const gameCardResults = await migrateGameCards();
    const nextGameCardResults = await migrateNextGameCards();

    // Verify migration
    const verificationResults = await verifyMigration();

    // Summary
    console.log('\n' + colors.bold('Migration Summary:'));
    console.log('==================');
    console.log(`Game Cards Updated: ${gameCardResults.updated}`);
    console.log(`Next Game Cards Updated: ${nextGameCardResults.updated}`);
    console.log(`Total Errors: ${gameCardResults.errors.length + nextGameCardResults.errors.length}`);
    console.log(`Verification: ${verificationResults.success ? colors.green('PASSED') : colors.red('FAILED')}`);

    // Log errors if any
    const allErrors = [...gameCardResults.errors, ...nextGameCardResults.errors];
    if (allErrors.length > 0) {
      console.log('\n' + colors.red('Errors encountered:'));
      allErrors.forEach(error => console.log(`  - ${error}`));
    }

    if (verificationResults.success && allErrors.length === 0) {
      console.log(colors.green('\n🎉 Migration completed successfully!'));
      process.exit(0);
    } else {
      console.log(colors.red('\n❌ Migration completed with errors. Please review and fix issues.'));
      process.exit(1);
    }

  } catch (error) {
    console.log(colors.red(`\nMigration failed: ${error.message}`));
    console.log(colors.red('Stack trace:'), error.stack);
    process.exit(1);
  }
}

// Run migration if script is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = {
  migrateGameCards,
  migrateNextGameCards,
  verifyMigration,
  runMigration
};