/**
 * Unit Tests für das Mannschaften-Seeding Script
 */

const { 
  validateMannschaftData, 
  mannschaftenData,
  checkStrapiConnection,
  getAllMannschaften,
  deleteAllMannschaften
} = require('../scripts/seed-mannschaften');

describe('Mannschaften Seeding Script', () => {
  
  describe('validateMannschaftData', () => {
    
    test('sollte gültige Mannschaftsdaten ohne Fehler validieren', () => {
      const validData = {
        name: 'Test Mannschaft',
        liga: 'Test Liga',
        tabellenplatz: 5,
        punkte: 20,
        spiele_gesamt: 10,
        siege: 6,
        unentschieden: 2,
        niederlagen: 2,
        tore_fuer: 25,
        tore_gegen: 15,
        tordifferenz: 10,
        form_letzte_5: ['S', 'U', 'N', 'S', 'S']
      };
      
      const errors = validateMannschaftData(validData);
      expect(errors).toHaveLength(0);
    });
    
    test('sollte Fehler für fehlenden Namen zurückgeben', () => {
      const invalidData = {
        name: '',
        liga: 'Test Liga',
        tabellenplatz: 5,
        punkte: 20,
        spiele_gesamt: 10,
        siege: 6,
        unentschieden: 2,
        niederlagen: 2,
        tore_fuer: 25,
        tore_gegen: 15,
        tordifferenz: 10,
        form_letzte_5: ['S', 'U', 'N']
      };
      
      const errors = validateMannschaftData(invalidData);
      expect(errors).toContain('Name ist erforderlich');
    });
    
    test('sollte Fehler für ungültigen Tabellenplatz zurückgeben', () => {
      const invalidData = {
        name: 'Test Mannschaft',
        liga: 'Test Liga',
        tabellenplatz: 25, // Zu hoch
        punkte: 20,
        spiele_gesamt: 10,
        siege: 6,
        unentschieden: 2,
        niederlagen: 2,
        tore_fuer: 25,
        tore_gegen: 15,
        tordifferenz: 10,
        form_letzte_5: ['S', 'U', 'N']
      };
      
      const errors = validateMannschaftData(invalidData);
      expect(errors).toContain('Tabellenplatz muss zwischen 1 und 20 liegen');
    });
    
    test('sollte Fehler für negative Punkte zurückgeben', () => {
      const invalidData = {
        name: 'Test Mannschaft',
        liga: 'Test Liga',
        tabellenplatz: 5,
        punkte: -5, // Negativ
        spiele_gesamt: 10,
        siege: 6,
        unentschieden: 2,
        niederlagen: 2,
        tore_fuer: 25,
        tore_gegen: 15,
        tordifferenz: 10,
        form_letzte_5: ['S', 'U', 'N']
      };
      
      const errors = validateMannschaftData(invalidData);
      expect(errors).toContain('Punkte können nicht negativ sein');
    });
    
    test('sollte Fehler für inkonsistente Spielstatistiken zurückgeben', () => {
      const invalidData = {
        name: 'Test Mannschaft',
        liga: 'Test Liga',
        tabellenplatz: 5,
        punkte: 20,
        spiele_gesamt: 10,
        siege: 6,
        unentschieden: 2,
        niederlagen: 3, // 6+2+3 = 11, aber spiele_gesamt = 10
        tore_fuer: 25,
        tore_gegen: 15,
        tordifferenz: 10,
        form_letzte_5: ['S', 'U', 'N']
      };
      
      const errors = validateMannschaftData(invalidData);
      expect(errors).toContain('Siege + Unentschieden + Niederlagen muss gleich Spiele gesamt sein');
    });
    
    test('sollte Fehler für falsche Tordifferenz zurückgeben', () => {
      const invalidData = {
        name: 'Test Mannschaft',
        liga: 'Test Liga',
        tabellenplatz: 5,
        punkte: 20,
        spiele_gesamt: 10,
        siege: 6,
        unentschieden: 2,
        niederlagen: 2,
        tore_fuer: 25,
        tore_gegen: 15,
        tordifferenz: 5, // Sollte 10 sein (25-15)
        form_letzte_5: ['S', 'U', 'N']
      };
      
      const errors = validateMannschaftData(invalidData);
      expect(errors).toContain('Tordifferenz stimmt nicht mit Toren überein');
    });
    
    test('sollte Fehler für ungültiges Form-Array zurückgeben', () => {
      const invalidData = {
        name: 'Test Mannschaft',
        liga: 'Test Liga',
        tabellenplatz: 5,
        punkte: 20,
        spiele_gesamt: 10,
        siege: 6,
        unentschieden: 2,
        niederlagen: 2,
        tore_fuer: 25,
        tore_gegen: 15,
        tordifferenz: 10,
        form_letzte_5: ['S', 'U', 'N', 'X', 'Y', 'Z'] // Zu viele und ungültige Werte
      };
      
      const errors = validateMannschaftData(invalidData);
      expect(errors).toContain('Form der letzten 5 Spiele muss ein Array mit maximal 5 Elementen sein');
      expect(errors).toContain('Ungültiger Form-Wert: X. Erlaubt sind: S, U, N');
    });
    
    test('sollte Fehler für nicht-Array Form zurückgeben', () => {
      const invalidData = {
        name: 'Test Mannschaft',
        liga: 'Test Liga',
        tabellenplatz: 5,
        punkte: 20,
        spiele_gesamt: 10,
        siege: 6,
        unentschieden: 2,
        niederlagen: 2,
        tore_fuer: 25,
        tore_gegen: 15,
        tordifferenz: 10,
        form_letzte_5: 'SUNSS' // String statt Array
      };
      
      const errors = validateMannschaftData(invalidData);
      expect(errors).toContain('Form der letzten 5 Spiele muss ein Array mit maximal 5 Elementen sein');
    });
  });
  
  describe('mannschaftenData', () => {
    
    test('sollte drei Mannschaften enthalten', () => {
      expect(mannschaftenData).toHaveLength(3);
    });
    
    test('sollte alle Mannschaften mit gültigen Daten haben', () => {
      mannschaftenData.forEach((mannschaft, index) => {
        const errors = validateMannschaftData(mannschaft);
        expect(errors).toHaveLength(0, 
          `Mannschaft ${index + 1} (${mannschaft.name}) hat Validierungsfehler: ${errors.join(', ')}`);
      });
    });
    
    test('sollte eindeutige Mannschaftsnamen haben', () => {
      const names = mannschaftenData.map(m => m.name);
      const uniqueNames = [...new Set(names)];
      expect(uniqueNames).toHaveLength(names.length);
    });
    
    test('sollte alle drei Hauptmannschaften enthalten', () => {
      const expectedNames = [
        'SV Viktoria Wertheim I',
        'SV Viktoria Wertheim II', 
        'SV Viktoria Wertheim III'
      ];
      
      const actualNames = mannschaftenData.map(m => m.name);
      expectedNames.forEach(name => {
        expect(actualNames).toContain(name);
      });
    });
    
    test('sollte verschiedene Ligen haben', () => {
      const ligen = mannschaftenData.map(m => m.liga);
      expect(ligen).toContain('Kreisliga');
      expect(ligen).toContain('Kreisklasse A');
      expect(ligen).toContain('Kreisklasse B');
    });
    
    test('sollte realistische Tabellenplätze haben', () => {
      mannschaftenData.forEach(mannschaft => {
        expect(mannschaft.tabellenplatz).toBeGreaterThanOrEqual(1);
        expect(mannschaft.tabellenplatz).toBeLessThanOrEqual(20);
      });
    });
    
    test('sollte konsistente Statistiken haben', () => {
      mannschaftenData.forEach(mannschaft => {
        // Spiele-Konsistenz
        const gesamtSpiele = mannschaft.siege + mannschaft.unentschieden + mannschaft.niederlagen;
        expect(gesamtSpiele).toBe(mannschaft.spiele_gesamt);
        
        // Tordifferenz-Konsistenz
        const tordifferenz = mannschaft.tore_fuer - mannschaft.tore_gegen;
        expect(tordifferenz).toBe(mannschaft.tordifferenz);
        
        // Form-Array Länge
        expect(mannschaft.form_letzte_5.length).toBeLessThanOrEqual(5);
        
        // Form-Array Werte
        mannschaft.form_letzte_5.forEach(form => {
          expect(['S', 'U', 'N']).toContain(form);
        });
      });
    });
  });
  
  describe('Hilfsfunktionen', () => {
    
    test('checkStrapiConnection sollte eine Funktion sein', () => {
      expect(typeof checkStrapiConnection).toBe('function');
    });
    
    test('getAllMannschaften sollte eine Funktion sein', () => {
      expect(typeof getAllMannschaften).toBe('function');
    });
    
    test('deleteAllMannschaften sollte eine Funktion sein', () => {
      expect(typeof deleteAllMannschaften).toBe('function');
    });
  });
  
  describe('Datenqualität', () => {
    
    test('sollte realistische Punktzahlen haben', () => {
      mannschaftenData.forEach(mannschaft => {
        // Maximal 3 Punkte pro Spiel
        const maxMoeglichePunkte = mannschaft.spiele_gesamt * 3;
        expect(mannschaft.punkte).toBeLessThanOrEqual(maxMoeglichePunkte);
        
        // Mindestens 0 Punkte pro Spiel bei Niederlagen
        expect(mannschaft.punkte).toBeGreaterThanOrEqual(0);
        
        // Realistische Punkteverteilung (Siege * 3 + Unentschieden * 1)
        const berechneteMinPunkte = mannschaft.siege * 3 + mannschaft.unentschieden * 1;
        expect(mannschaft.punkte).toBeGreaterThanOrEqual(berechneteMinPunkte);
      });
    });
    
    test('sollte realistische Torverhältnisse haben', () => {
      mannschaftenData.forEach(mannschaft => {
        // Mindestens 0 Tore
        expect(mannschaft.tore_fuer).toBeGreaterThanOrEqual(0);
        expect(mannschaft.tore_gegen).toBeGreaterThanOrEqual(0);
        
        // Realistische Tore pro Spiel (nicht mehr als 10 pro Spiel im Durchschnitt)
        if (mannschaft.spiele_gesamt > 0) {
          const toreFuerProSpiel = mannschaft.tore_fuer / mannschaft.spiele_gesamt;
          const toreGegenProSpiel = mannschaft.tore_gegen / mannschaft.spiele_gesamt;
          
          expect(toreFuerProSpiel).toBeLessThanOrEqual(10);
          expect(toreGegenProSpiel).toBeLessThanOrEqual(10);
        }
      });
    });
    
    test('sollte gültige Trend-Werte haben', () => {
      const validTrends = ['steigend', 'gleich', 'fallend'];
      mannschaftenData.forEach(mannschaft => {
        expect(validTrends).toContain(mannschaft.trend);
      });
    });
    
    test('sollte gültige Status-Werte haben', () => {
      const validStatus = ['aktiv', 'inaktiv', 'aufgeloest'];
      mannschaftenData.forEach(mannschaft => {
        expect(validStatus).toContain(mannschaft.status);
      });
    });
  });
});