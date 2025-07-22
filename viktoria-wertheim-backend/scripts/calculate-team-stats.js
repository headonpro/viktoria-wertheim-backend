/**
 * Team Statistics Calculator - Berechnet Mannschaftsstatistiken aus Spielergebnissen
 * 
 * Dieses Script berechnet automatisch:
 * - Punkte basierend auf Spielergebnissen
 * - Tordifferenz aus Toren für/gegen
 * - Tabellenposition (relativ zu anderen Teams in der Liga)
 * - Form der letzten 5 Spiele
 * - Trend-Analyse (steigend/fallend/gleich)
 */

const axios = require('axios');

const STRAPI_URL = 'http://localhost:1337';

/**
 * Berechnet Punkte basierend auf Spielergebnissen
 * Sieg = 3 Punkte, Unentschieden = 1 Punkt, Niederlage = 0 Punkte
 */
function calculatePoints(siege, unentschieden, niederlagen) {
  return (siege * 3) + (unentschieden * 1) + (niederlagen * 0);
}

/**
 * Berechnet Tordifferenz
 */
function calculateGoalDifference(toreFuer, toreGegen) {
  return toreFuer - toreGegen;
}

/**
 * Berechnet Form-Array aus den letzten Spielen
 * @param {Array} recentGames - Array der letzten Spiele (neuestes zuerst)
 * @param {string} teamName - Name der Mannschaft
 * @returns {Array} Form-Array mit S/U/N für die letzten 5 Spiele
 */
function calculateForm(recentGames, teamName) {
  const form = [];
  const maxGames = Math.min(5, recentGames.length);
  
  for (let i = 0; i < maxGames; i++) {
    const game = recentGames[i];
    
    // Prüfe ob Team Heim oder Auswärts gespielt hat
    const isHome = game.heimmannschaft === teamName || 
                   (game.heimmannschaft?.attributes?.name === teamName);
    const isAway = game.auswaertsmannschaft === teamName || 
                   (game.auswaertsmannschaft?.attributes?.name === teamName);
    
    if (!isHome && !isAway) {
      continue; // Spiel gehört nicht zu diesem Team
    }
    
    const heimTore = game.tore_heim || 0;
    const auswaertsTore = game.tore_auswaerts || 0;
    
    let result;
    if (isHome) {
      if (heimTore > auswaertsTore) result = 'S'; // Sieg
      else if (heimTore === auswaertsTore) result = 'U'; // Unentschieden
      else result = 'N'; // Niederlage
    } else {
      if (auswaertsTore > heimTore) result = 'S'; // Sieg
      else if (auswaertsTore === heimTore) result = 'U'; // Unentschieden
      else result = 'N'; // Niederlage
    }
    
    form.push(result);
  }
  
  return form;
}

/**
 * Berechnet Trend basierend auf Form und aktueller Position
 * @param {Array} formArray - Form der letzten 5 Spiele
 * @param {number} currentPosition - Aktuelle Tabellenposition
 * @param {number} previousPosition - Vorherige Tabellenposition (optional)
 * @returns {string} 'steigend', 'gleich', oder 'fallend'
 */
function calculateTrend(formArray, currentPosition, previousPosition = null) {
  if (formArray.length === 0) return 'gleich';
  
  // Wenn vorherige Position bekannt ist, nutze diese
  if (previousPosition !== null && previousPosition !== currentPosition) {
    if (currentPosition < previousPosition) return 'steigend'; // Bessere Position = niedrigere Zahl
    if (currentPosition > previousPosition) return 'fallend';
    return 'gleich';
  }
  
  // Sonst basiere Trend auf Form der letzten 3 Spiele
  const recentForm = formArray.slice(0, 3);
  const wins = recentForm.filter(result => result === 'S').length;
  const losses = recentForm.filter(result => result === 'N').length;
  
  if (wins >= 2 && losses === 0) return 'steigend';
  if (losses >= 2 && wins === 0) return 'fallend';
  return 'gleich';
}

/**
 * Berechnet alle Statistiken aus Spielergebnissen
 * @param {Array} games - Array aller Spiele der Mannschaft
 * @param {string} teamName - Name der Mannschaft
 * @returns {Object} Berechnete Statistiken
 */
function calculateTeamStatsFromGames(games, teamName) {
  let siege = 0;
  let unentschieden = 0;
  let niederlagen = 0;
  let toreFuer = 0;
  let toreGegen = 0;
  
  // Nur beendete Spiele berücksichtigen
  const completedGames = games.filter(game => 
    game.status === 'beendet' && 
    game.tore_heim !== null && 
    game.tore_auswaerts !== null
  );
  
  completedGames.forEach(game => {
    const isHome = game.heimmannschaft === teamName || 
                   (game.heimmannschaft?.attributes?.name === teamName);
    const isAway = game.auswaertsmannschaft === teamName || 
                   (game.auswaertsmannschaft?.attributes?.name === teamName);
    
    if (!isHome && !isAway) return;
    
    const heimTore = game.tore_heim || 0;
    const auswaertsTore = game.tore_auswaerts || 0;
    
    if (isHome) {
      toreFuer += heimTore;
      toreGegen += auswaertsTore;
      
      if (heimTore > auswaertsTore) siege++;
      else if (heimTore === auswaertsTore) unentschieden++;
      else niederlagen++;
    } else {
      toreFuer += auswaertsTore;
      toreGegen += heimTore;
      
      if (auswaertsTore > heimTore) siege++;
      else if (auswaertsTore === heimTore) unentschieden++;
      else niederlagen++;
    }
  });
  
  const spieleGesamt = siege + unentschieden + niederlagen;
  const punkte = calculatePoints(siege, unentschieden, niederlagen);
  const tordifferenz = calculateGoalDifference(toreFuer, toreGegen);
  
  // Form aus den letzten Spielen (neueste zuerst sortiert)
  const sortedGames = completedGames.sort((a, b) => new Date(b.datum) - new Date(a.datum));
  const formArray = calculateForm(sortedGames, teamName);
  const trend = calculateTrend(formArray);
  
  return {
    spiele_gesamt: spieleGesamt,
    siege,
    unentschieden,
    niederlagen,
    punkte,
    tore_fuer: toreFuer,
    tore_gegen: toreGegen,
    tordifferenz,
    form_letzte_5: formArray,
    trend
  };
}

/**
 * Berechnet Tabellenpositionen für alle Teams einer Liga
 * @param {Array} teams - Array aller Teams mit ihren Statistiken
 * @returns {Array} Teams sortiert nach Tabellenposition
 */
function calculateTablePositions(teams) {
  // Sortiere Teams nach Fußball-Tabellenregeln:
  // 1. Punkte (absteigend)
  // 2. Tordifferenz (absteigend)
  // 3. Tore für (absteigend)
  // 4. Direkter Vergleich (vereinfacht: alphabetisch)
  
  const sortedTeams = teams.sort((a, b) => {
    // Punkte
    if (b.punkte !== a.punkte) {
      return b.punkte - a.punkte;
    }
    
    // Tordifferenz
    if (b.tordifferenz !== a.tordifferenz) {
      return b.tordifferenz - a.tordifferenz;
    }
    
    // Tore für
    if (b.tore_fuer !== a.tore_fuer) {
      return b.tore_fuer - a.tore_fuer;
    }
    
    // Alphabetisch als Fallback
    return a.name.localeCompare(b.name);
  });
  
  // Weise Positionen zu
  sortedTeams.forEach((team, index) => {
    team.tabellenplatz = index + 1;
  });
  
  return sortedTeams;
}

/**
 * Holt alle Mannschaften aus Strapi
 */
async function getAllTeams() {
  try {
    const response = await axios.get(`${STRAPI_URL}/api/mannschaften`);
    return response.data.data;
  } catch (error) {
    console.error('Fehler beim Abrufen der Mannschaften:', error.message);
    return [];
  }
}

/**
 * Holt alle Spiele für eine Mannschaft
 */
async function getGamesForTeam(teamName) {
  try {
    const response = await axios.get(`${STRAPI_URL}/api/spiele?populate=*`);
    const allGames = response.data.data;
    
    // Filtere Spiele für diese Mannschaft
    const teamGames = allGames.filter(game => {
      const heimName = game.attributes.heimmannschaft?.data?.attributes?.name || game.attributes.heimmannschaft;
      const auswaertsName = game.attributes.auswaertsmannschaft?.data?.attributes?.name || game.attributes.auswaertsmannschaft;
      
      return heimName === teamName || auswaertsName === teamName;
    });
    
    // Konvertiere zu einheitlichem Format
    return teamGames.map(game => ({
      ...game.attributes,
      id: game.id,
      heimmannschaft: game.attributes.heimmannschaft?.data?.attributes?.name || game.attributes.heimmannschaft,
      auswaertsmannschaft: game.attributes.auswaertsmannschaft?.data?.attributes?.name || game.attributes.auswaertsmannschaft
    }));
  } catch (error) {
    console.error(`Fehler beim Abrufen der Spiele für ${teamName}:`, error.message);
    return [];
  }
}

/**
 * Aktualisiert die Statistiken einer Mannschaft in Strapi
 */
async function updateTeamStats(teamId, stats) {
  try {
    const response = await axios.put(`${STRAPI_URL}/api/mannschaften/${teamId}`, {
      data: stats
    });
    
    if (response.data && response.data.data) {
      return response.data.data;
    } else {
      throw new Error('Unerwartete API-Antwort');
    }
  } catch (error) {
    console.error(`Fehler beim Aktualisieren der Team-Statistiken:`, error.response?.data?.error?.message || error.message);
    return null;
  }
}

/**
 * Berechnet und aktualisiert Statistiken für eine einzelne Mannschaft
 */
async function calculateAndUpdateTeamStats(teamId, teamName) {
  console.log(`📊 Berechne Statistiken für: ${teamName}`);
  
  try {
    // Hole alle Spiele für diese Mannschaft
    const games = await getGamesForTeam(teamName);
    console.log(`   📋 ${games.length} Spiele gefunden`);
    
    // Berechne Statistiken
    const stats = calculateTeamStatsFromGames(games, teamName);
    console.log(`   ✅ Statistiken berechnet: ${stats.punkte} Punkte, ${stats.tordifferenz} Tordifferenz`);
    
    // Aktualisiere in Strapi
    const updated = await updateTeamStats(teamId, stats);
    
    if (updated) {
      console.log(`   💾 Statistiken erfolgreich aktualisiert`);
      return { ...stats, id: teamId, name: teamName };
    } else {
      console.error(`   ❌ Fehler beim Aktualisieren der Statistiken`);
      return null;
    }
  } catch (error) {
    console.error(`   ❌ Fehler bei der Statistik-Berechnung für ${teamName}:`, error.message);
    return null;
  }
}

/**
 * Berechnet Tabellenpositionen für alle Teams einer Liga und aktualisiert sie
 */
async function calculateAndUpdateTablePositions(liga) {
  console.log(`🏆 Berechne Tabellenpositionen für Liga: ${liga}`);
  
  try {
    // Hole alle Teams der Liga
    const allTeams = await getAllTeams();
    const leagueTeams = allTeams.filter(team => 
      team.attributes.liga === liga || team.attributes.liga_vollname?.includes(liga)
    );
    
    if (leagueTeams.length === 0) {
      console.log(`   ⚠️  Keine Teams in Liga "${liga}" gefunden`);
      return [];
    }
    
    console.log(`   📋 ${leagueTeams.length} Teams in Liga gefunden`);
    
    // Sammle aktuelle Statistiken
    const teamsWithStats = leagueTeams.map(team => ({
      id: team.id,
      name: team.attributes.name,
      punkte: team.attributes.punkte || 0,
      tordifferenz: team.attributes.tordifferenz || 0,
      tore_fuer: team.attributes.tore_fuer || 0,
      tore_gegen: team.attributes.tore_gegen || 0,
      spiele_gesamt: team.attributes.spiele_gesamt || 0
    }));
    
    // Berechne neue Positionen
    const sortedTeams = calculateTablePositions(teamsWithStats);
    
    // Aktualisiere Positionen in Strapi
    const updatePromises = sortedTeams.map(async (team, index) => {
      const newPosition = index + 1;
      const oldPosition = leagueTeams.find(t => t.id === team.id)?.attributes?.tabellenplatz;
      
      if (oldPosition !== newPosition) {
        console.log(`   📈 ${team.name}: Position ${oldPosition || '?'} → ${newPosition}`);
        
        const updated = await updateTeamStats(team.id, { 
          tabellenplatz: newPosition 
        });
        
        return updated ? { ...team, tabellenplatz: newPosition } : null;
      } else {
        console.log(`   ➡️  ${team.name}: Position ${newPosition} (unverändert)`);
        return { ...team, tabellenplatz: newPosition };
      }
    });
    
    const results = await Promise.all(updatePromises);
    const successCount = results.filter(r => r !== null).length;
    
    console.log(`   ✅ ${successCount}/${sortedTeams.length} Positionen aktualisiert`);
    return results.filter(r => r !== null);
    
  } catch (error) {
    console.error(`   ❌ Fehler bei der Positions-Berechnung für Liga "${liga}":`, error.message);
    return [];
  }
}

/**
 * Hauptfunktion: Berechnet alle Statistiken für alle Mannschaften
 */
async function calculateAllTeamStats() {
  console.log('🚀 Starte Team-Statistik-Berechnung...');
  
  try {
    // Prüfe Strapi-Verbindung
    await axios.get(`${STRAPI_URL}/api/mannschaften`);
  } catch (error) {
    console.error('❌ Strapi ist nicht erreichbar. Stellen Sie sicher, dass Strapi läuft.');
    return false;
  }
  
  // Hole alle Teams
  const teams = await getAllTeams();
  if (teams.length === 0) {
    console.error('❌ Keine Mannschaften gefunden');
    return false;
  }
  
  console.log(`📋 ${teams.length} Mannschaften gefunden`);
  
  // Berechne Statistiken für jedes Team
  const updatedTeams = [];
  for (const team of teams) {
    const result = await calculateAndUpdateTeamStats(team.id, team.attributes.name);
    if (result) {
      updatedTeams.push(result);
    }
  }
  
  console.log(`\n✅ ${updatedTeams.length}/${teams.length} Teams erfolgreich aktualisiert`);
  
  // Berechne Tabellenpositionen für jede Liga
  const ligas = [...new Set(teams.map(team => team.attributes.liga))];
  console.log(`\n🏆 Berechne Tabellenpositionen für ${ligas.length} Ligen...`);
  
  for (const liga of ligas) {
    if (liga) {
      await calculateAndUpdateTablePositions(liga);
    }
  }
  
  console.log('\n🎉 Team-Statistik-Berechnung abgeschlossen!');
  return true;
}

/**
 * Berechnet Statistiken für ein einzelnes Team (für automatische Updates)
 */
async function updateSingleTeamStats(teamName) {
  console.log(`🔄 Aktualisiere Statistiken für: ${teamName}`);
  
  try {
    // Finde Team
    const teams = await getAllTeams();
    const team = teams.find(t => t.attributes.name === teamName);
    
    if (!team) {
      console.error(`❌ Team "${teamName}" nicht gefunden`);
      return false;
    }
    
    // Berechne und aktualisiere Statistiken
    const result = await calculateAndUpdateTeamStats(team.id, teamName);
    
    if (result) {
      // Aktualisiere auch Tabellenpositionen für die Liga
      await calculateAndUpdateTablePositions(team.attributes.liga);
      console.log(`✅ Statistiken für "${teamName}" erfolgreich aktualisiert`);
      return true;
    } else {
      console.error(`❌ Fehler beim Aktualisieren der Statistiken für "${teamName}"`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Fehler beim Aktualisieren von "${teamName}":`, error.message);
    return false;
  }
}

// Export für Tests und andere Scripts
module.exports = {
  calculatePoints,
  calculateGoalDifference,
  calculateForm,
  calculateTrend,
  calculateTeamStatsFromGames,
  calculateTablePositions,
  calculateAllTeamStats,
  updateSingleTeamStats,
  calculateAndUpdateTeamStats,
  calculateAndUpdateTablePositions,
  getAllTeams,
  getGamesForTeam,
  updateTeamStats
};

// Script direkt ausführen, wenn es als Hauptmodul aufgerufen wird
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length > 0 && args[0] !== '--all') {
    // Einzelnes Team aktualisieren
    const teamName = args.join(' ');
    updateSingleTeamStats(teamName);
  } else {
    // Alle Teams aktualisieren
    calculateAllTeamStats();
  }
}