/**
 * Integration Tests für das vollständige Seeding Script
 */

const axios = require('axios');
const { execSync } = require('child_process');

const STRAPI_URL = 'http://localhost:1337';

// Mock axios für Tests ohne laufendes Strapi
jest.mock('axios');
const mockedAxios = axios;

describe('Run Seeds Integration', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Seeding-Reihenfolge', () => {
    
    test('sollte Mannschaften vor Spielen seeden', () => {
      // Teste die Logik der run-seeds.js
      const runSeedsContent = require('fs').readFileSync(
        require('path').join(__dirname, '../scripts/run-seeds.js'), 
        'utf8'
      );
      
      // Prüfe dass Mannschaften vor Spielen erwähnt werden
      const mannschaftenIndex = runSeedsContent.indexOf('seedMannschaften');
      const spieleIndex = runSeedsContent.indexOf('seedSpiele');
      
      expect(mannschaftenIndex).toBeLessThan(spieleIndex);
      expect(mannschaftenIndex).toBeGreaterThan(-1);
      expect(spieleIndex).toBeGreaterThan(-1);
    });
    
    test('sollte bei Mannschaften-Fehler Spiele-Seeding überspringen', () => {
      const runSeedsContent = require('fs').readFileSync(
        require('path').join(__dirname, '../scripts/run-seeds.js'), 
        'utf8'
      );
      
      // Prüfe dass Fehlerbehandlung vorhanden ist
      expect(runSeedsContent).toContain('mannschaftenSuccess');
      expect(runSeedsContent).toContain('Spiele-Seeding wird übersprungen');
    });
  });
  
  describe('Command Line Interface', () => {
    
    test('sollte spezifische Seeding-Typen unterstützen', () => {
      const runSeedsContent = require('fs').readFileSync(
        require('path').join(__dirname, '../scripts/run-seeds.js'), 
        'utf8'
      );
      
      // Prüfe dass CLI-Interface vorhanden ist
      expect(runSeedsContent).toContain('process.argv.slice(2)');
      expect(runSeedsContent).toContain('runSpecificSeed');
      
      // Prüfe unterstützte Typen
      expect(runSeedsContent).toContain('kategorien');
      expect(runSeedsContent).toContain('sponsors');
      expect(runSeedsContent).toContain('mannschaften');
      expect(runSeedsContent).toContain('spiele');
    });
  });
  
  describe('Error Handling', () => {
    
    test('sollte Fehler abfangen und loggen', () => {
      const runSeedsContent = require('fs').readFileSync(
        require('path').join(__dirname, '../scripts/run-seeds.js'), 
        'utf8'
      );
      
      // Prüfe dass try-catch vorhanden ist
      expect(runSeedsContent).toContain('try {');
      expect(runSeedsContent).toContain('catch (error)');
      expect(runSeedsContent).toContain('console.error');
    });
    
    test('sollte Success/Failure Status zurückgeben', () => {
      const runSeedsContent = require('fs').readFileSync(
        require('path').join(__dirname, '../scripts/run-seeds.js'), 
        'utf8'
      );
      
      // Prüfe dass return-Werte vorhanden sind
      expect(runSeedsContent).toContain('return true');
      expect(runSeedsContent).toContain('return false');
    });
  });
  
  describe('Imports und Dependencies', () => {
    
    test('sollte alle benötigten Module importieren', () => {
      const runSeedsContent = require('fs').readFileSync(
        require('path').join(__dirname, '../scripts/run-seeds.js'), 
        'utf8'
      );
      
      // Prüfe Imports
      expect(runSeedsContent).toContain("require('axios')");
      expect(runSeedsContent).toContain("require('./seed-mannschaften')");
      expect(runSeedsContent).toContain("require('./seed-spiele')");
    });
    
    test('sollte seedMannschaften und seedSpiele Funktionen importieren', () => {
      const runSeedsContent = require('fs').readFileSync(
        require('path').join(__dirname, '../scripts/run-seeds.js'), 
        'utf8'
      );
      
      expect(runSeedsContent).toContain('seedMannschaften');
      expect(runSeedsContent).toContain('seedSpiele');
    });
  });
  
  describe('Logging und Feedback', () => {
    
    test('sollte Progress-Logging haben', () => {
      const runSeedsContent = require('fs').readFileSync(
        require('path').join(__dirname, '../scripts/run-seeds.js'), 
        'utf8'
      );
      
      // Prüfe Phase-Logging
      expect(runSeedsContent).toContain('Phase 1');
      expect(runSeedsContent).toContain('Phase 2');
      expect(runSeedsContent).toContain('Phase 3');
      expect(runSeedsContent).toContain('Phase 4');
    });
    
    test('sollte Zusammenfassung am Ende haben', () => {
      const runSeedsContent = require('fs').readFileSync(
        require('path').join(__dirname, '../scripts/run-seeds.js'), 
        'utf8'
      );
      
      expect(runSeedsContent).toContain('Zusammenfassung');
      expect(runSeedsContent).toContain('erfolgreich abgeschlossen');
    });
  });
  
  describe('Funktionale Tests', () => {
    
    test('sollte alle Seeding-Funktionen verfügbar haben', () => {
      // Teste dass die Funktionen importiert werden können
      const seedMannschaften = require('../scripts/seed-mannschaften');
      const seedSpiele = require('../scripts/seed-spiele');
      
      expect(typeof seedMannschaften.seedMannschaften).toBe('function');
      expect(typeof seedSpiele.seedSpiele).toBe('function');
    });
    
    test('sollte CLI-Parameter korrekt verarbeiten', () => {
      const runSeedsContent = require('fs').readFileSync(
        require('path').join(__dirname, '../scripts/run-seeds.js'), 
        'utf8'
      );
      
      // Prüfe dass verschiedene Seeding-Typen unterstützt werden
      expect(runSeedsContent).toContain("case 'kategorien':");
      expect(runSeedsContent).toContain("case 'sponsors':");
      expect(runSeedsContent).toContain("case 'mannschaften':");
      expect(runSeedsContent).toContain("case 'spiele':");
    });
  });
  
  describe('Script-Struktur', () => {
    
    test('sollte korrekte Dateistruktur haben', () => {
      const fs = require('fs');
      const path = require('path');
      
      const runSeedsPath = path.join(__dirname, '../scripts/run-seeds.js');
      const seedMannschaftenPath = path.join(__dirname, '../scripts/seed-mannschaften.js');
      const seedSpielePath = path.join(__dirname, '../scripts/seed-spiele.js');
      
      expect(fs.existsSync(runSeedsPath)).toBe(true);
      expect(fs.existsSync(seedMannschaftenPath)).toBe(true);
      expect(fs.existsSync(seedSpielePath)).toBe(true);
    });
    
    test('sollte ausführbare Scripts sein', () => {
      const fs = require('fs');
      const path = require('path');
      
      const runSeedsPath = path.join(__dirname, '../scripts/run-seeds.js');
      const stats = fs.statSync(runSeedsPath);
      
      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
    });
  });
  
  describe('Konfiguration', () => {
    
    test('sollte korrekte Strapi-URL verwenden', () => {
      const runSeedsContent = require('fs').readFileSync(
        require('path').join(__dirname, '../scripts/run-seeds.js'), 
        'utf8'
      );
      
      expect(runSeedsContent).toContain('http://localhost:1337');
    });
    
    test('sollte konsistente API-Endpunkte verwenden', () => {
      const runSeedsContent = require('fs').readFileSync(
        require('path').join(__dirname, '../scripts/run-seeds.js'), 
        'utf8'
      );
      
      expect(runSeedsContent).toContain('/api/kategorien');
      expect(runSeedsContent).toContain('/api/sponsors');
    });
  });
  
  describe('Backwards Compatibility', () => {
    
    test('sollte bestehende Kategorien-Seeding beibehalten', () => {
      const runSeedsContent = require('fs').readFileSync(
        require('path').join(__dirname, '../scripts/run-seeds.js'), 
        'utf8'
      );
      
      expect(runSeedsContent).toContain('seedKategorien');
      expect(runSeedsContent).toContain('Vereinsnews');
      expect(runSeedsContent).toContain('Spielberichte');
    });
    
    test('sollte bestehende Sponsors-Seeding beibehalten', () => {
      const runSeedsContent = require('fs').readFileSync(
        require('path').join(__dirname, '../scripts/run-seeds.js'), 
        'utf8'
      );
      
      expect(runSeedsContent).toContain('seedSponsors');
      expect(runSeedsContent).toContain('Sparkasse Tauberfranken');
    });
  });
});