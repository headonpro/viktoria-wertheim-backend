/**
 * Team Data Validation Script - Validiert und repariert Mannschaftsdaten
 * 
 * Dieses Script prüft:
 * - Konsistenz zwischen Spielergebnissen und Team-Statistiken
 * - Logische Integrität der Daten (Spiele vs. Statistiken)
 * - Mathematische Korrektheit (Punkte, Tordifferenz, etc.)
 * - Repariert inkonsistente Daten automatisch
 */

const axios = require('axios');
const { 
  calculateTeamStatsFromGames, 
  getAllTeams, 
  getGamesForTeam, 
  updateTeamStats 
} = require('./calculate-team-stats');

const STRAPI_URL = 'http://localhost:1337';

/**
 * Validiert die Konsistenz der Team-Statistiken
 * @param {Object} team - Team-Objekt mit aktuellen Statistiken
 * @param {Array} games - Array aller Spiele des Teams
 * @returns {Object} Validierungsergebnis mit Fehlern und berechneten Werten
 */
function validateTeamStatistics(team, games) {
  const errors = [];
  const warnings = [];
  
  // Berechne erwartete Statistiken aus Spielen
  const calculatedStats = calculateTeamStatsFromGames(games, team.name);
  
  // Validiere Grunddaten
  if (!team.name || team.name.trim() === '') {
    errors.push('Team-Name ist leer oder fehlt');
  }
  
  if (!team.liga || team.liga.trim() === '') {
    errors.push('Liga-Information fehlt');
  }
  
  // Validiere numerische Werte
  const numericFields = [
    'punkte', 'spiele_gesamt', 'siege', 'unentschieden', 'niederlagen',
    'tore_fuer', 'tore_gegen', 'tordifferenz', 'tabellenplatz'
  ];
  
  numericFields.forEach(field => {
    if (team[field] !== null && team[field] !== undefined) {
      if (typeof team[field] !== 'number' || team[field] < 0) {
        errors.push(`${field} muss eine positive Zahl sein (aktuell: ${team[field]})`);
      }
    }
  });
  
  // Validiere Spielstatistiken-Konsistenz
  const totalGames = (team.siege || 0) + (team.unentschieden || 0) + (team.niederlagen || 0);
  if (team.spiele_gesamt !== totalGames) {
    errors.push(`Spiele gesamt (${team.spiele_gesamt}) stimmt nicht mit Siege+Unentschieden+Niederlagen (${totalGames}) überein`);
  }
  
  // Validiere Punkte-Berechnung
  const expectedPoints = (team.siege || 0) * 3 + (team.unentschieden || 0) * 1;
  if (team.punkte !== expectedPoints) {
    errors.push(`Punkte (${team.punkte}) stimmen nicht mit berechneten Punkten (${expectedPoints}) überein`);
  }
  
  // Validiere Tordifferenz
  const expectedGoalDiff = (team.tore_fuer || 0) - (team.tore_gegen || 0);
  if (team.tordifferenz !== expectedGoalDiff) {
    errors.push(`Tordifferenz (${team.tordifferenz}) stimmt nicht mit Tore für (${team.tore_fuer}) - Tore gegen (${team.tore_gegen}) = ${expectedGoalDiff} überein`);
  }
  
  // Validiere Tabellenplatz
  if (team.tabellenplatz && (team.tabellenplatz < 1 || team.tabellenplatz > 20)) {
    warnings.push(`Tabellenplatz (${team.tabellenplatz}) liegt außerhalb des üblichen Bereichs (1-20)`);
  }
  
  // Validiere Form-Array
  if (team.form_letzte_5) {
    if (!Array.isArray(team.form_letzte_5)) {
      errors.push('Form der letzten 5 Spiele muss ein Array sein');
    } else {
      if (team.form_letzte_5.length > 5) {
        warnings.push(`Form-Array hat ${team.form_letzte_5.length} Einträge, sollte maximal 5 haben`);
      }
      
      const validFormValues = ['S', 'U', 'N'];
      team.form_letzte_5.forEach((form, index) => {
        if (!validFormValues.includes(form)) {
          errors.push(`Ungültiger Form-Wert an Position ${index}: "${form}". Erlaubt sind: S, U, N`);
        }
      });
    }
  }
  
  // Validiere Trend
  if (team.trend && !['steigend', 'gleich', 'fallend'].includes(team.trend)) {
    errors.push(`Ungültiger Trend-Wert: "${team.trend}". Erlaubt sind: steigend, gleich, fallend`);
  }
  
  // Vergleiche mit berechneten Statistiken aus Spielen
  const statsComparison = {
    spiele_gesamt: {
      stored: team.spiele_gesamt || 0,
      calculated: calculatedStats.spiele_gesamt,
      match: (team.spiele_gesamt || 0) === calculatedStats.spiele_gesamt
    },
    siege: {
      stored: team.siege || 0,
      calculated: calculatedStats.siege,
      match: (team.siege || 0) === calculatedStats.siege
    },
    unentschieden: {
      stored: team.unentschieden || 0,
      calculated: calculatedStats.unentschieden,
      match: (team.unentschieden || 0) === calculatedStats.unentschieden
    },
    niederlagen: {
      stored: team.niederlagen || 0,
      calculated: calculatedStats.niederlagen,
      match: (team.niederlagen || 0) === calculatedStats.niederlagen
    },
    punkte: {
      stored: team.punkte || 0,
      calculated: calculatedStats.punkte,
      match: (team.punkte || 0) === calculatedStats.punkte
    },
    tore_fuer: {
      stored: team.tore_fuer || 0,
      calculated: calculatedStats.tore_fuer,
      match: (team.tore_fuer || 0) === calculatedStats.tore_fuer
    },
    tore_gegen: {
      stored: team.tore_gegen || 0,
      calculated: calculatedStats.tore_gegen,
      match: (team.tore_gegen || 0) === calculatedStats.tore_gegen
    },
    tordifferenz: {
      stored: team.tordifferenz || 0,
      calculated: calculatedStats.tordifferenz,
      match: (team.tordifferenz || 0) === calculatedStats.tordifferenz
    }
  };
  
  // Füge Inkonsistenzen zu Fehlern hinzu
  Object.entries(statsComparison).forEach(([field, comparison]) => {
    if (!comparison.match) {
      errors.push(`${field}: Gespeichert (${comparison.stored}) ≠ Berechnet aus Spielen (${comparison.calculated})`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    calculatedStats,
    statsComparison,
    team: team
  };
}

/**
 * Validiert alle Teams und sammelt Validierungsergebnisse
 */
async function validateAllTeams() {
  console.log('🔍 Starte Team-Daten-Validierung...');
  
  try {
    // Prüfe Strapi-Verbindung
    await axios.get(`${STRAPI_URL}/api/mannschaften`);
  } catch (error) {
    console.error('❌ Strapi ist nicht erreichbar. Stellen Sie sicher, dass Strapi läuft.');
    return null;
  }
  
  const teams = await getAllTeams();
  if (teams.length === 0) {
    console.error('❌ Keine Mannschaften gefunden');
    return null;
  }
  
  console.log(`📋 Validiere ${teams.length} Mannschaften...`);
  
  const validationResults = [];
  let validCount = 0;
  let invalidCount = 0;
  let warningCount = 0;
  
  for (const teamData of teams) {
    const team = {
      id: teamData.id,
      name: teamData.attributes.name,
      liga: teamData.attributes.liga,
      ...teamData.attributes
    };
    
    console.log(`\n📊 Validiere: ${team.name}`);
    
    // Hole Spiele für dieses Team
    const games = await getGamesForTeam(team.name);
    console.log(`   📋 ${games.length} Spiele gefunden`);
    
    // Validiere Team
    const result = validateTeamStatistics(team, games);
    result.gamesCount = games.length;
    
    if (result.isValid) {
      console.log(`   ✅ Validierung erfolgreich`);
      validCount++;
    } else {
      console.log(`   ❌ ${result.errors.length} Fehler gefunden`);
      result.errors.forEach(error => console.log(`      - ${error}`));
      invalidCount++;
    }
    
    if (result.warnings.length > 0) {
      console.log(`   ⚠️  ${result.warnings.length} Warnungen`);
      result.warnings.forEach(warning => console.log(`      - ${warning}`));
      warningCount++;
    }
    
    validationResults.push(result);
  }
  
  // Zusammenfassung
  console.log('\n📊 Validierungs-Zusammenfassung:');
  console.log(`✅ Gültige Teams: ${validCount}`);
  console.log(`❌ Ungültige Teams: ${invalidCount}`);
  console.log(`⚠️  Teams mit Warnungen: ${warningCount}`);
  console.log(`📋 Gesamt validiert: ${teams.length}`);
  
  return {
    results: validationResults,
    summary: {
      total: teams.length,
      valid: validCount,
      invalid: invalidCount,
      warnings: warningCount
    }
  };
}

/**
 * Repariert inkonsistente Team-Daten automatisch
 */
async function repairTeamData(teamId, validationResult) {
  if (validationResult.isValid) {
    console.log(`✅ Team "${validationResult.team.name}" ist bereits konsistent`);
    return true;
  }
  
  console.log(`🔧 Repariere Team-Daten für: ${validationResult.team.name}`);
  
  try {
    // Verwende berechnete Statistiken als Reparatur
    const repairedStats = {
      ...validationResult.calculatedStats,
      // Behalte nicht-statistische Felder bei
      name: validationResult.team.name,
      liga: validationResult.team.liga,
      liga_vollname: validationResult.team.liga_vollname,
      altersklasse: validationResult.team.altersklasse,
      status: validationResult.team.status,
      saison: validationResult.team.saison,
      spielort: validationResult.team.spielort,
      vereinsfarben: validationResult.team.vereinsfarben,
      gruendungsjahr: validationResult.team.gruendungsjahr,
      beschreibung: validationResult.team.beschreibung,
      trainingszeiten: validationResult.team.trainingszeiten,
      // Tabellenplatz wird separat berechnet
      tabellenplatz: validationResult.team.tabellenplatz
    };
    
    const updated = await updateTeamStats(teamId, repairedStats);
    
    if (updated) {
      console.log(`   ✅ Team-Daten erfolgreich repariert`);
      console.log(`   📊 Neue Statistiken: ${repairedStats.punkte} Punkte, ${repairedStats.tordifferenz} Tordifferenz`);
      return true;
    } else {
      console.error(`   ❌ Fehler beim Reparieren der Team-Daten`);
      return false;
    }
  } catch (error) {
    console.error(`   ❌ Fehler beim Reparieren von "${validationResult.team.name}":`, error.message);
    return false;
  }
}

/**
 * Repariert alle inkonsistenten Teams
 */
async function repairAllTeamData() {
  console.log('🔧 Starte automatische Daten-Reparatur...');
  
  // Erst validieren
  const validationData = await validateAllTeams();
  if (!validationData) {
    return false;
  }
  
  const invalidTeams = validationData.results.filter(result => !result.isValid);
  
  if (invalidTeams.length === 0) {
    console.log('🎉 Alle Team-Daten sind bereits konsistent!');
    return true;
  }
  
  console.log(`\n🔧 Repariere ${invalidTeams.length} inkonsistente Teams...`);
  
  let repairedCount = 0;
  let failedCount = 0;
  
  for (const result of invalidTeams) {
    const success = await repairTeamData(result.team.id, result);
    if (success) {
      repairedCount++;
    } else {
      failedCount++;
    }
  }
  
  console.log('\n📊 Reparatur-Zusammenfassung:');
  console.log(`✅ Erfolgreich repariert: ${repairedCount}`);
  console.log(`❌ Reparatur fehlgeschlagen: ${failedCount}`);
  console.log(`📋 Gesamt versucht: ${invalidTeams.length}`);
  
  if (failedCount === 0) {
    console.log('🎉 Alle Team-Daten erfolgreich repariert!');
    return true;
  } else {
    console.log('⚠️  Einige Team-Daten konnten nicht repariert werden');
    return false;
  }
}

/**
 * Validiert ein einzelnes Team
 */
async function validateSingleTeam(teamName) {
  console.log(`🔍 Validiere Team: ${teamName}`);
  
  try {
    const teams = await getAllTeams();
    const teamData = teams.find(t => t.attributes.name === teamName);
    
    if (!teamData) {
      console.error(`❌ Team "${teamName}" nicht gefunden`);
      return null;
    }
    
    const team = {
      id: teamData.id,
      name: teamData.attributes.name,
      liga: teamData.attributes.liga,
      ...teamData.attributes
    };
    
    const games = await getGamesForTeam(teamName);
    console.log(`📋 ${games.length} Spiele gefunden`);
    
    const result = validateTeamStatistics(team, games);
    result.gamesCount = games.length;
    
    if (result.isValid) {
      console.log('✅ Team-Daten sind konsistent');
    } else {
      console.log(`❌ ${result.errors.length} Fehler gefunden:`);
      result.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    if (result.warnings.length > 0) {
      console.log(`⚠️  ${result.warnings.length} Warnungen:`);
      result.warnings.forEach(warning => console.log(`   - ${warning}`));
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Fehler bei der Validierung von "${teamName}":`, error.message);
    return null;
  }
}

/**
 * Generiert einen detaillierten Validierungsbericht
 */
function generateValidationReport(validationData) {
  if (!validationData) {
    return 'Keine Validierungsdaten verfügbar';
  }
  
  let report = '# Team-Daten Validierungsbericht\n\n';
  report += `**Datum:** ${new Date().toLocaleString('de-DE')}\n\n`;
  
  // Zusammenfassung
  report += '## Zusammenfassung\n\n';
  report += `- **Gesamt Teams:** ${validationData.summary.total}\n`;
  report += `- **Gültige Teams:** ${validationData.summary.valid}\n`;
  report += `- **Ungültige Teams:** ${validationData.summary.invalid}\n`;
  report += `- **Teams mit Warnungen:** ${validationData.summary.warnings}\n\n`;
  
  // Details für ungültige Teams
  const invalidTeams = validationData.results.filter(result => !result.isValid);
  if (invalidTeams.length > 0) {
    report += '## Ungültige Teams\n\n';
    
    invalidTeams.forEach(result => {
      report += `### ${result.team.name}\n\n`;
      report += `**Liga:** ${result.team.liga}\n`;
      report += `**Spiele gefunden:** ${result.gamesCount}\n\n`;
      
      if (result.errors.length > 0) {
        report += '**Fehler:**\n';
        result.errors.forEach(error => {
          report += `- ${error}\n`;
        });
        report += '\n';
      }
      
      if (result.warnings.length > 0) {
        report += '**Warnungen:**\n';
        result.warnings.forEach(warning => {
          report += `- ${warning}\n`;
        });
        report += '\n';
      }
      
      // Statistik-Vergleich
      report += '**Statistik-Vergleich:**\n\n';
      report += '| Feld | Gespeichert | Berechnet | Status |\n';
      report += '|------|-------------|-----------|--------|\n';
      
      Object.entries(result.statsComparison).forEach(([field, comparison]) => {
        const status = comparison.match ? '✅' : '❌';
        report += `| ${field} | ${comparison.stored} | ${comparison.calculated} | ${status} |\n`;
      });
      
      report += '\n';
    });
  }
  
  // Teams mit Warnungen
  const teamsWithWarnings = validationData.results.filter(result => result.warnings.length > 0);
  if (teamsWithWarnings.length > 0) {
    report += '## Teams mit Warnungen\n\n';
    
    teamsWithWarnings.forEach(result => {
      if (result.isValid) { // Nur gültige Teams mit Warnungen
        report += `### ${result.team.name}\n\n`;
        result.warnings.forEach(warning => {
          report += `- ${warning}\n`;
        });
        report += '\n';
      }
    });
  }
  
  return report;
}

// Export für Tests und andere Scripts
module.exports = {
  validateTeamStatistics,
  validateAllTeams,
  validateSingleTeam,
  repairTeamData,
  repairAllTeamData,
  generateValidationReport
};

// Script direkt ausführen, wenn es als Hauptmodul aufgerufen wird
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--repair')) {
    // Reparatur-Modus
    repairAllTeamData();
  } else if (args.includes('--team') && args.length > 1) {
    // Einzelnes Team validieren
    const teamIndex = args.indexOf('--team') + 1;
    const teamName = args.slice(teamIndex).join(' ');
    validateSingleTeam(teamName);
  } else {
    // Standard-Validierung
    validateAllTeams().then(result => {
      if (result && args.includes('--report')) {
        const report = generateValidationReport(result);
        console.log('\n' + report);
      }
    });
  }
}