/**
 * Migration script to fix invalid status values in existing data
 * Run this script to clean up any existing records with invalid enum values
 */

async function fixInvalidStatusValues() {
  // Import Strapi dynamically for Strapi 5
  const { default: strapi } = await import('@strapi/strapi');
  
  let app;
  try {
    console.log('Starting Strapi...');
    app = await strapi().load();
    
    console.log('Fixing invalid status values...');
    
    // Fix Team status values
    console.log('\n=== Fixing Team status values ===');
    const teams = await app.entityService.findMany('api::team.team');
    
    if (teams && teams.length > 0) {
      for (const team of teams) {
        let needsUpdate = false;
        const updateData = {};
        
        // Fix status field
        if (!team.status || !['aktiv', 'inaktiv', 'pausiert'].includes(team.status)) {
          updateData.status = 'aktiv';
          needsUpdate = true;
          console.log(`Team "${team.name}": Status "${team.status}" → "aktiv"`);
        }
        
        // Fix trend field
        if (!team.trend || !['steigend', 'gleich', 'fallend'].includes(team.trend)) {
          updateData.trend = 'gleich';
          needsUpdate = true;
          console.log(`Team "${team.name}": Trend "${team.trend}" → "gleich"`);
        }
        
        if (needsUpdate) {
          await app.entityService.update('api::team.team', team.id, {
            data: updateData
          });
          console.log(`✓ Team "${team.name}" updated`);
        }
      }
    }
    
    // Fix Spiel status values
    console.log('\n=== Fixing Spiel status values ===');
    const spiele = await app.entityService.findMany('api::spiel.spiel');
    
    if (spiele && spiele.length > 0) {
      for (const spiel of spiele) {
        let needsUpdate = false;
        const updateData = {};
        
        // Fix status field
        if (!spiel.status || !['geplant', 'laufend', 'beendet', 'abgesagt'].includes(spiel.status)) {
          updateData.status = 'geplant';
          needsUpdate = true;
          console.log(`Spiel ID ${spiel.id}: Status "${spiel.status}" → "geplant"`);
        }
        
        if (needsUpdate) {
          await app.entityService.update('api::spiel.spiel', spiel.id, {
            data: updateData
          });
          console.log(`✓ Spiel ID ${spiel.id} updated`);
        }
      }
    }
    
    // Check for missing required relations
    console.log('\n=== Checking for missing required relations ===');
    
    // Check Teams without Club
    const teamsWithoutClub = await app.entityService.findMany('api::team.team', {
      filters: {
        club: {
          $null: true
        }
      }
    });
    
    if (teamsWithoutClub && teamsWithoutClub.length > 0) {
      console.log(`⚠️  Found ${teamsWithoutClub.length} teams without club assignment:`);
      teamsWithoutClub.forEach(team => {
        console.log(`   - Team: "${team.name}" (ID: ${team.id})`);
      });
      console.log('   → These teams need manual club assignment');
    }
    
    // Check Spiele without required relations
    const spieleWithMissingData = await app.entityService.findMany('api::spiel.spiel', {
      populate: ['heimclub', 'auswaertsclub', 'unser_team', 'liga', 'saison']
    });
    
    if (spieleWithMissingData && spieleWithMissingData.length > 0) {
      const problematicSpiele = spieleWithMissingData.filter(spiel => 
        !spiel.heimclub || !spiel.auswaertsclub || !spiel.unser_team || !spiel.liga || !spiel.saison
      );
      
      if (problematicSpiele.length > 0) {
        console.log(`⚠️  Found ${problematicSpiele.length} spiele with missing required relations:`);
        problematicSpiele.forEach(spiel => {
          const missing = [];
          if (!spiel.heimclub) missing.push('heimclub');
          if (!spiel.auswaertsclub) missing.push('auswaertsclub');
          if (!spiel.unser_team) missing.push('unser_team');
          if (!spiel.liga) missing.push('liga');
          if (!spiel.saison) missing.push('saison');
          
          console.log(`   - Spiel ID ${spiel.id}: Missing ${missing.join(', ')}`);
        });
        console.log('   → These spiele need manual relation assignment');
      }
    }
    
    console.log('\n=== Migration completed ===');
    console.log('✓ All invalid status values have been fixed');
    console.log('✓ Check warnings above for manual fixes needed');
    
    await app.destroy();
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
fixInvalidStatusValues();