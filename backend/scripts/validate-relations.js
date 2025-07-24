/**
 * Script to validate all relations in the system
 * This helps identify broken or inconsistent relations
 */

async function validateRelations() {
  console.log('🔍 Starting relations validation...');
  
  try {
    const strapi = require('@strapi/strapi');
    const app = await strapi().load();
    
    console.log('✅ Strapi loaded successfully');
    
    const errors = [];
    const warnings = [];
    
    // Test 1: Validate spieler-mannschaft bidirectional relation
    console.log('\n1️⃣ Validating spieler ↔ mannschaft relations...');
    
    const spieler = await strapi.entityService.findMany('api::spieler.spieler', {
      populate: ['mannschaft']
    });
    
    for (const player of spieler) {
      if (player.mannschaft) {
        try {
          const mannschaft = await strapi.entityService.findOne('api::mannschaft.mannschaft', player.mannschaft.id, {
            populate: ['spieler']
          });
          
          if (!mannschaft) {
            errors.push(`Spieler ${player.id} references non-existent mannschaft ${player.mannschaft.id}`);
          } else {
            const isInMannschaftSpieler = mannschaft.spieler?.some(s => s.id === player.id);
            if (!isInMannschaftSpieler) {
              errors.push(`Spieler ${player.id} references mannschaft ${mannschaft.id}, but mannschaft doesn't reference back`);
            }
          }
        } catch (error) {
          errors.push(`Error validating spieler ${player.id} mannschaft relation: ${error.message}`);
        }
      }
    }
    
    // Test 2: Validate mannschaft-spieler reverse relation
    console.log('\n2️⃣ Validating mannschaft ↔ spieler reverse relations...');
    
    const mannschaften = await strapi.entityService.findMany('api::mannschaft.mannschaft', {
      populate: ['spieler']
    });
    
    for (const mannschaft of mannschaften) {
      if (mannschaft.spieler && mannschaft.spieler.length > 0) {
        for (const player of mannschaft.spieler) {
          try {
            const fullPlayer = await strapi.entityService.findOne('api::spieler.spieler', player.id, {
              populate: ['mannschaft']
            });
            
            if (!fullPlayer) {
              errors.push(`Mannschaft ${mannschaft.id} references non-existent spieler ${player.id}`);
            } else if (!fullPlayer.mannschaft || fullPlayer.mannschaft.id !== mannschaft.id) {
              errors.push(`Mannschaft ${mannschaft.id} references spieler ${player.id}, but spieler doesn't reference back`);
            }
          } catch (error) {
            errors.push(`Error validating mannschaft ${mannschaft.id} spieler relation: ${error.message}`);
          }
        }
      }
    }
    
    // Test 3: Validate spiel relations
    console.log('\n3️⃣ Validating spiel relations...');
    
    const spiele = await strapi.entityService.findMany('api::spiel.spiel', {
      populate: ['unser_team', 'unsere_mannschaft', 'heimclub', 'auswaertsclub', 'liga', 'saison']
    });
    
    for (const spiel of spiele) {
      // Check required relations exist
      if (!spiel.heimclub) {
        errors.push(`Spiel ${spiel.id} missing heimclub relation`);
      }
      if (!spiel.auswaertsclub) {
        errors.push(`Spiel ${spiel.id} missing auswaertsclub relation`);
      }
      if (!spiel.liga) {
        errors.push(`Spiel ${spiel.id} missing liga relation`);
      }
      if (!spiel.saison) {
        errors.push(`Spiel ${spiel.id} missing saison relation`);
      }
      
      // Check team consistency
      if (!spiel.unser_team && !spiel.unsere_mannschaft) {
        warnings.push(`Spiel ${spiel.id} has neither unser_team nor unsere_mannschaft`);
      }
      
      if (spiel.unser_team && spiel.unsere_mannschaft) {
        // Both exist - check if they're consistent
        try {
          const team = await strapi.entityService.findOne('api::team.team', spiel.unser_team.id);
          const mannschaft = await strapi.entityService.findOne('api::mannschaft.mannschaft', spiel.unsere_mannschaft.id);
          
          if (team && mannschaft) {
            if (team.name !== mannschaft.name && team.name !== mannschaft.display_name) {
              warnings.push(`Spiel ${spiel.id}: team "${team.name}" and mannschaft "${mannschaft.name}" names don't match`);
            }
          }
        } catch (error) {
          errors.push(`Error validating spiel ${spiel.id} team/mannschaft consistency: ${error.message}`);
        }
      }
    }
    
    // Test 4: Validate team relations
    console.log('\n4️⃣ Validating team relations...');
    
    const teams = await strapi.entityService.findMany('api::team.team', {
      populate: ['club', 'liga', 'saison', 'spieler', 'spiele']
    });
    
    for (const team of teams) {
      // Check required relations
      if (!team.club) {
        warnings.push(`Team ${team.id} "${team.name}" missing club relation`);
      }
      if (!team.liga) {
        warnings.push(`Team ${team.id} "${team.name}" missing liga relation`);
      }
      if (!team.saison) {
        warnings.push(`Team ${team.id} "${team.name}" missing saison relation`);
      }
      
      // Check spieler bidirectional relations
      if (team.spieler && team.spieler.length > 0) {
        for (const player of team.spieler) {
          try {
            const fullPlayer = await strapi.entityService.findOne('api::spieler.spieler', player.id, {
              populate: ['hauptteam']
            });
            
            if (fullPlayer && (!fullPlayer.hauptteam || fullPlayer.hauptteam.id !== team.id)) {
              errors.push(`Team ${team.id} references spieler ${player.id}, but spieler's hauptteam doesn't match`);
            }
          } catch (error) {
            errors.push(`Error validating team ${team.id} spieler relation: ${error.message}`);
          }
        }
      }
    }
    
    // Test 5: Validate liga-saison consistency
    console.log('\n5️⃣ Validating liga-saison consistency...');
    
    const ligas = await strapi.entityService.findMany('api::liga.liga', {
      populate: ['saison', 'teams']
    });
    
    for (const liga of ligas) {
      if (liga.teams && liga.teams.length > 0) {
        for (const team of liga.teams) {
          try {
            const fullTeam = await strapi.entityService.findOne('api::team.team', team.id, {
              populate: ['saison', 'liga']
            });
            
            if (fullTeam) {
              if (fullTeam.liga && fullTeam.liga.id !== liga.id) {
                errors.push(`Liga ${liga.id} references team ${team.id}, but team's liga doesn't match`);
              }
              if (liga.saison && fullTeam.saison && fullTeam.saison.id !== liga.saison.id) {
                errors.push(`Liga ${liga.id} and team ${team.id} have different saisons`);
              }
            }
          } catch (error) {
            errors.push(`Error validating liga ${liga.id} team relation: ${error.message}`);
          }
        }
      }
    }
    
    // Summary
    console.log('\n📋 Validation Summary:');
    console.log(`❌ Errors found: ${errors.length}`);
    console.log(`⚠️ Warnings found: ${warnings.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ ERRORS:');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning}`);
      });
    }
    
    if (errors.length === 0 && warnings.length === 0) {
      console.log('🎉 All relations are valid!');
    }
    
    await strapi.destroy();
    
    return { errors, warnings };
    
  } catch (error) {
    console.error('❌ Error during validation:', error);
    process.exit(1);
  }
}

// Run validation
if (require.main === module) {
  validateRelations();
}

module.exports = { validateRelations };