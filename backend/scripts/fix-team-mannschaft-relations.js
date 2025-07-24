/**
 * Script to fix team-mannschaft relation problems
 * This script consolidates data and fixes broken relations
 */

const { execSync } = require('child_process');

async function fixTeamMannschaftRelations() {
  console.log('🔧 Starting team-mannschaft relations fix...');
  
  try {
    // Start Strapi programmatically
    const Strapi = require('@strapi/strapi');
    const strapi = await Strapi().load();
    
    console.log('✅ Strapi loaded successfully');
    
    // Step 1: Analyze current data
    console.log('\n📊 Analyzing current data...');
    
    const teams = await strapi.entityService.findMany('api::team.team', {
      populate: ['spieler', 'spiele', 'club', 'liga', 'saison']
    });
    
    const mannschaften = await strapi.entityService.findMany('api::mannschaft.mannschaft', {
      populate: ['spieler', 'spiele']
    });
    
    const spiele = await strapi.entityService.findMany('api::spiel.spiel', {
      populate: ['unser_team', 'unsere_mannschaft']
    });
    
    console.log(`Found ${teams.length} teams`);
    console.log(`Found ${mannschaften.length} mannschaften`);
    console.log(`Found ${spiele.length} spiele`);
    
    // Step 2: Identify problems
    console.log('\n🔍 Identifying relation problems...');
    
    const problems = {
      spieleWithBothTeamAndMannschaft: [],
      spieleWithOnlyMannschaft: [],
      spieleWithOnlyTeam: [],
      mannschaftenWithoutSpiele: [],
      teamsWithoutSpiele: [],
      orphanedSpiele: []
    };
    
    spiele.forEach(spiel => {
      if (spiel.unser_team && spiel.unsere_mannschaft) {
        problems.spieleWithBothTeamAndMannschaft.push(spiel);
      } else if (spiel.unsere_mannschaft && !spiel.unser_team) {
        problems.spieleWithOnlyMannschaft.push(spiel);
      } else if (spiel.unser_team && !spiel.unsere_mannschaft) {
        problems.spieleWithOnlyTeam.push(spiel);
      } else {
        problems.orphanedSpiele.push(spiel);
      }
    });
    
    console.log(`- Spiele with both team and mannschaft: ${problems.spieleWithBothTeamAndMannschaft.length}`);
    console.log(`- Spiele with only mannschaft: ${problems.spieleWithOnlyMannschaft.length}`);
    console.log(`- Spiele with only team: ${problems.spieleWithOnlyTeam.length}`);
    console.log(`- Orphaned spiele: ${problems.orphanedSpiele.length}`);
    
    // Step 3: Create mapping between teams and mannschaften
    console.log('\n🗺️ Creating team-mannschaft mapping...');
    
    const teamMannschaftMapping = new Map();
    
    // Try to match by name
    teams.forEach(team => {
      const matchingMannschaft = mannschaften.find(m => 
        m.name === team.name || 
        m.display_name === team.name ||
        m.name.includes(team.name) ||
        team.name.includes(m.name)
      );
      
      if (matchingMannschaft) {
        teamMannschaftMapping.set(team.id, matchingMannschaft.id);
        console.log(`✅ Mapped Team "${team.name}" → Mannschaft "${matchingMannschaft.name}"`);
      } else {
        console.log(`⚠️ No matching mannschaft found for team "${team.name}"`);
      }
    });
    
    // Step 4: Fix spiele relations
    console.log('\n🔧 Fixing spiele relations...');
    
    let fixedCount = 0;
    
    // Fix spiele that only have mannschaft but no team
    for (const spiel of problems.spieleWithOnlyMannschaft) {
      // Find corresponding team for this mannschaft
      const teamId = Array.from(teamMannschaftMapping.entries())
        .find(([tId, mId]) => mId === spiel.unsere_mannschaft)?.[0];
      
      if (teamId) {
        await strapi.entityService.update('api::spiel.spiel', spiel.id, {
          data: { unser_team: teamId }
        });
        console.log(`✅ Fixed spiel ${spiel.id}: added team ${teamId}`);
        fixedCount++;
      } else {
        console.log(`⚠️ Could not find team for mannschaft in spiel ${spiel.id}`);
      }
    }
    
    // Fix spiele that only have team but no mannschaft
    for (const spiel of problems.spieleWithOnlyTeam) {
      const mannschaftId = teamMannschaftMapping.get(spiel.unser_team);
      
      if (mannschaftId) {
        await strapi.entityService.update('api::spiel.spiel', spiel.id, {
          data: { unsere_mannschaft: mannschaftId }
        });
        console.log(`✅ Fixed spiel ${spiel.id}: added mannschaft ${mannschaftId}`);
        fixedCount++;
      } else {
        console.log(`⚠️ Could not find mannschaft for team in spiel ${spiel.id}`);
      }
    }
    
    // Step 5: Fix spieler-mannschaft relations
    console.log('\n👥 Fixing spieler-mannschaft relations...');
    
    const spieler = await strapi.entityService.findMany('api::spieler.spieler', {
      populate: ['hauptteam', 'mannschaft']
    });
    
    let spielerFixedCount = 0;
    
    for (const player of spieler) {
      if (player.hauptteam && !player.mannschaft) {
        const mannschaftId = teamMannschaftMapping.get(player.hauptteam.id);
        
        if (mannschaftId) {
          await strapi.entityService.update('api::spieler.spieler', player.id, {
            data: { mannschaft: mannschaftId }
          });
          console.log(`✅ Fixed spieler ${player.vorname} ${player.nachname}: added mannschaft ${mannschaftId}`);
          spielerFixedCount++;
        }
      }
    }
    
    // Step 6: Sync table data between teams and mannschaften
    console.log('\n📊 Syncing table data...');
    
    let syncedCount = 0;
    
    for (const [teamId, mannschaftId] of teamMannschaftMapping.entries()) {
      const team = teams.find(t => t.id === teamId);
      const mannschaft = mannschaften.find(m => m.id === mannschaftId);
      
      if (team && mannschaft) {
        // Use team data as source of truth (it has more complete relations)
        await strapi.entityService.update('api::mannschaft.mannschaft', mannschaftId, {
          data: {
            tabellenplatz: team.tabellenplatz,
            punkte: team.punkte,
            spiele_gesamt: team.spiele_gesamt,
            siege: team.siege,
            unentschieden: team.unentschieden,
            niederlagen: team.niederlagen,
            tore_fuer: team.tore_fuer,
            tore_gegen: team.tore_gegen,
            tordifferenz: team.tordifferenz,
            form_letzte_5: team.form_letzte_5,
            trend: team.trend,
            status: team.status
          }
        });
        console.log(`✅ Synced table data: Team "${team.name}" → Mannschaft "${mannschaft.name}"`);
        syncedCount++;
      }
    }
    
    // Step 7: Summary
    console.log('\n📋 Fix Summary:');
    console.log(`✅ Fixed ${fixedCount} spiele relations`);
    console.log(`✅ Fixed ${spielerFixedCount} spieler-mannschaft relations`);
    console.log(`✅ Synced ${syncedCount} table data entries`);
    console.log(`✅ Created ${teamMannschaftMapping.size} team-mannschaft mappings`);
    
    if (problems.orphanedSpiele.length > 0) {
      console.log(`⚠️ ${problems.orphanedSpiele.length} spiele still need manual attention`);
    }
    
    console.log('\n🎉 Relations fix completed!');
    
    await strapi.destroy();
    
  } catch (error) {
    console.error('❌ Error fixing relations:', error);
    process.exit(1);
  }
}

// Run the fix
if (require.main === module) {
  fixTeamMannschaftRelations();
}

module.exports = { fixTeamMannschaftRelations };