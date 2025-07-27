/**
 * Script to create test data for all three Mannschaften (teams)
 * Creates realistic Last Game Cards and Next Game Cards for teams m1, m2, m3
 */

const { createStrapi } = require('@strapi/strapi');

async function createTestData() {
  const strapi = await createStrapi();
  await strapi.load();

  console.log('🚀 Starting test data creation for all three Mannschaften...');

  try {
    // First, create some opponent teams if they don't exist
    const opponentTeams = [
      { name: 'SV Würzburg 05', team_typ: 'gegner_verein' },
      { name: 'FC Schweinfurt 05', team_typ: 'gegner_verein' },
      { name: 'TSV 1860 Rostock', team_typ: 'gegner_verein' },
      { name: 'SpVgg Greuther Fürth II', team_typ: 'gegner_verein' },
      { name: 'FC Augsburg II', team_typ: 'gegner_verein' },
      { name: 'TSV 1860 München II', team_typ: 'gegner_verein' },
      { name: 'SV Darmstadt 98 II', team_typ: 'gegner_verein' },
      { name: 'FC Nürnberg II', team_typ: 'gegner_verein' },
      { name: 'SV Sandhausen II', team_typ: 'gegner_verein' }
    ];

    console.log('📝 Creating opponent teams...');
    const createdTeams = [];
    
    for (const teamData of opponentTeams) {
      // Check if team already exists
      const existingTeam = await strapi.db.query('api::team.team').findOne({
        where: { name: teamData.name }
      });

      if (!existingTeam) {
        const team = await strapi.db.query('api::team.team').create({
          data: teamData
        });
        createdTeams.push(team);
        console.log(`✅ Created team: ${team.name}`);
      } else {
        createdTeams.push(existingTeam);
        console.log(`ℹ️  Team already exists: ${existingTeam.name}`);
      }
    }

    // Clear existing test data to avoid duplicates
    console.log('🧹 Clearing existing test data...');
    await strapi.db.query('api::game-card.game-card').deleteMany({});
    await strapi.db.query('api::next-game-card.next-game-card').deleteMany({});

    // Create Last Game Cards for all three teams
    console.log('🏆 Creating Last Game Cards...');
    
    const lastGameCards = [
      // 1. Mannschaft (m1) - Recent victory
      {
        datum: new Date('2025-01-20T15:00:00.000Z'),
        gegner: 'SV Würzburg 05',
        ist_heimspiel: true,
        unsere_tore: 3,
        gegner_tore: 1,
        mannschaft: 'm1'
      },
      // 2. Mannschaft (m2) - Close defeat
      {
        datum: new Date('2025-01-19T14:00:00.000Z'),
        gegner: 'FC Schweinfurt 05',
        ist_heimspiel: false,
        unsere_tore: 1,
        gegner_tore: 2,
        mannschaft: 'm2'
      },
      // 3. Mannschaft (m3) - Draw
      {
        datum: new Date('2025-01-18T13:30:00.000Z'),
        gegner: 'TSV 1860 Rostock',
        ist_heimspiel: true,
        unsere_tore: 2,
        gegner_tore: 2,
        mannschaft: 'm3'
      }
    ];

    for (const gameData of lastGameCards) {
      const gameCard = await strapi.db.query('api::game-card.game-card').create({
        data: gameData
      });
      console.log(`✅ Created Last Game Card for ${gameData.mannschaft}: ${gameData.gegner} (${gameData.unsere_tore}:${gameData.gegner_tore})`);
    }

    // Create Next Game Cards for all three teams
    console.log('⏭️  Creating Next Game Cards...');
    
    const nextGameCards = [
      // 1. Mannschaft (m1) - Home game
      {
        datum: new Date('2025-01-27T15:00:00.000Z'),
        gegner_team: createdTeams.find(t => t.name === 'SpVgg Greuther Fürth II')?.id,
        ist_heimspiel: true,
        mannschaft: 'm1'
      },
      // 2. Mannschaft (m2) - Away game
      {
        datum: new Date('2025-01-26T14:00:00.000Z'),
        gegner_team: createdTeams.find(t => t.name === 'FC Augsburg II')?.id,
        ist_heimspiel: false,
        mannschaft: 'm2'
      },
      // 3. Mannschaft (m3) - Home game
      {
        datum: new Date('2025-01-25T13:30:00.000Z'),
        gegner_team: createdTeams.find(t => t.name === 'TSV 1860 München II')?.id,
        ist_heimspiel: true,
        mannschaft: 'm3'
      }
    ];

    for (const gameData of nextGameCards) {
      if (gameData.gegner_team) {
        const nextGameCard = await strapi.db.query('api::next-game-card.next-game-card').create({
          data: gameData
        });
        const teamName = createdTeams.find(t => t.id === gameData.gegner_team)?.name;
        console.log(`✅ Created Next Game Card for ${gameData.mannschaft}: vs ${teamName} (${gameData.ist_heimspiel ? 'Home' : 'Away'})`);
      }
    }

    console.log('🎉 Test data creation completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Created ${lastGameCards.length} Last Game Cards`);
    console.log(`- Created ${nextGameCards.length} Next Game Cards`);
    console.log(`- Created/verified ${createdTeams.length} opponent teams`);

    // Verify the data by querying each team
    console.log('\n🔍 Verifying created data...');
    
    for (const team of ['m1', 'm2', 'm3']) {
      const lastGame = await strapi.db.query('api::game-card.game-card').findOne({
        where: { mannschaft: team }
      });
      
      const nextGame = await strapi.db.query('api::next-game-card.next-game-card').findOne({
        where: { mannschaft: team },
        populate: ['gegner_team']
      });

      console.log(`\n${team.toUpperCase()}:`);
      if (lastGame) {
        console.log(`  Last Game: ${lastGame.gegner} (${lastGame.unsere_tore}:${lastGame.gegner_tore}) - ${lastGame.ist_heimspiel ? 'Home' : 'Away'}`);
      }
      if (nextGame) {
        console.log(`  Next Game: vs ${nextGame.gegner_team?.name} - ${nextGame.ist_heimspiel ? 'Home' : 'Away'}`);
      }
    }

  } catch (error) {
    console.error('❌ Error creating test data:', error);
    throw error;
  } finally {
    await strapi.destroy();
  }
}

// Run the script
if (require.main === module) {
  createTestData()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createTestData };