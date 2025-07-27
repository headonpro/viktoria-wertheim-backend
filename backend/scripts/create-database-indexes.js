/**
 * Database Index Creation Script for Mannschaft Performance Optimization
 * 
 * This script creates indexes on the mannschaft columns in both game_cards 
 * and next_game_cards tables to optimize filtering performance.
 */

const createDatabaseIndexes = async () => {
  console.log('🚀 Starting database index creation for mannschaft columns...');
  
  try {
    // Get database connection
    const knex = strapi.db.connection;
    
    // Check if indexes already exist
    const gameCardsIndexExists = await knex.schema.hasIndex('game_cards', 'idx_game_cards_mannschaft');
    const nextGameCardsIndexExists = await knex.schema.hasIndex('next_game_cards', 'idx_next_game_cards_mannschaft');
    
    // Create index for game_cards table
    if (!gameCardsIndexExists) {
      console.log('📊 Creating index for game_cards.mannschaft...');
      await knex.schema.alterTable('game_cards', (table) => {
        table.index('mannschaft', 'idx_game_cards_mannschaft');
      });
      console.log('✅ Index idx_game_cards_mannschaft created successfully');
    } else {
      console.log('ℹ️  Index idx_game_cards_mannschaft already exists');
    }
    
    // Create index for next_game_cards table
    if (!nextGameCardsIndexExists) {
      console.log('📊 Creating index for next_game_cards.mannschaft...');
      await knex.schema.alterTable('next_game_cards', (table) => {
        table.index('mannschaft', 'idx_next_game_cards_mannschaft');
      });
      console.log('✅ Index idx_next_game_cards_mannschaft created successfully');
    } else {
      console.log('ℹ️  Index idx_next_game_cards_mannschaft already exists');
    }
    
    // Create composite indexes for better performance on filtered queries
    const gameCardsCompositeExists = await knex.schema.hasIndex('game_cards', 'idx_game_cards_mannschaft_datum');
    const nextGameCardsCompositeExists = await knex.schema.hasIndex('next_game_cards', 'idx_next_game_cards_mannschaft_datum');
    
    if (!gameCardsCompositeExists) {
      console.log('📊 Creating composite index for game_cards (mannschaft, datum)...');
      await knex.schema.alterTable('game_cards', (table) => {
        table.index(['mannschaft', 'datum'], 'idx_game_cards_mannschaft_datum');
      });
      console.log('✅ Composite index idx_game_cards_mannschaft_datum created successfully');
    } else {
      console.log('ℹ️  Composite index idx_game_cards_mannschaft_datum already exists');
    }
    
    if (!nextGameCardsCompositeExists) {
      console.log('📊 Creating composite index for next_game_cards (mannschaft, datum)...');
      await knex.schema.alterTable('next_game_cards', (table) => {
        table.index(['mannschaft', 'datum'], 'idx_next_game_cards_mannschaft_datum');
      });
      console.log('✅ Composite index idx_next_game_cards_mannschaft_datum created successfully');
    } else {
      console.log('ℹ️  Composite index idx_next_game_cards_mannschaft_datum already exists');
    }
    
    console.log('🎉 Database index creation completed successfully!');
    
    // Verify indexes were created
    console.log('\n📋 Verifying created indexes...');
    const indexes = await knex.raw(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename IN ('game_cards', 'next_game_cards') 
        AND indexname LIKE '%mannschaft%'
      ORDER BY tablename, indexname;
    `);
    
    if (indexes.rows.length > 0) {
      console.log('✅ Created indexes:');
      indexes.rows.forEach(index => {
        console.log(`  - ${index.indexname} on ${index.tablename}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error creating database indexes:', error);
    throw error;
  }
};

// Export for use in other scripts
module.exports = { createDatabaseIndexes };

// Run directly if called from command line
if (require.main === module) {
  (async () => {
    try {
      // Initialize Strapi
      const strapi = require('@strapi/strapi')();
      await strapi.load();
      
      await createDatabaseIndexes();
      
      await strapi.destroy();
      process.exit(0);
    } catch (error) {
      console.error('Script failed:', error);
      process.exit(1);
    }
  })();
}