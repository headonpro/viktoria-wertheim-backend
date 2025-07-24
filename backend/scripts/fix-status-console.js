/**
 * Simple script to fix status values - run via Strapi console
 * Usage: npm run console
 * Then paste this code in the console
 */

// Fix Team status values
console.log('=== Fixing Team status values ===');
const teams = await strapi.entityService.findMany('api::team.team');

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
      await strapi.entityService.update('api::team.team', team.id, {
        data: updateData
      });
      console.log(`✓ Team "${team.name}" updated`);
    }
  }
}

// Fix Spiel status values
console.log('=== Fixing Spiel status values ===');
const spiele = await strapi.entityService.findMany('api::spiel.spiel');

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
      await strapi.entityService.update('api::spiel.spiel', spiel.id, {
        data: updateData
      });
      console.log(`✓ Spiel ID ${spiel.id} updated`);
    }
  }
}

console.log('✓ Status values fixed!');