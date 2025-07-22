/**
 * Unit Tests für das Spiele-Seeding Script
 */

const { 
  validateSpielData,
  alleSpiele,
  createSpieleForMannschaft,
  generateTorschuetzen,
  generateKarten,
  generateLetztesAufeinandertreffen,
  checkStrapiConnection,
  getMannschaftIds
} = require('../scripts/seed-spiele');

describe('Spiele Seeding Script', () => {
  
  describe('validateSpielData', () => {
    
    test('sollte gültige Spieldaten ohne Fehler validieren', () => {
      const validData = {
        datum: '2024-03-15T15:00:00.000Z',
        heimmannschaft: 'SV Viktoria Wertheim I',
        auswaertsmannschaft: 'FC Tauberbischofsheim',
        tore_heim: 2,
        tore_auswaerts: 1,
        status: 'beendet'
      };
      
      const errors = validateSpielData(validData);
      expect(errors).toHaveLength(0);
    });
    
    test('sollte Fehler für fehlendes Datum zurückgeben', () => {
      const invalidData = {
        heimmannschaft: 'SV Viktoria Wertheim I',
        auswaertsmannschaft: 'FC Tauberbischofsheim',
        status: 'geplant'
      };
      
      const errors = validateSpielData(invalidData);
      expect(errors).toContain('Datum ist erforderlich');
    });
    
    test('sollte Fehler für fehlende Mannschaften zurückgeben', () => {
      const invalidData = {
        datum: '2024-03-15T15:00:00.000Z',
        status: 'geplant'
      };
      
      const errors = validateSpielData(invalidData);
      expect(errors).toContain('Heim- und Auswärtsmannschaft sind erforderlich');
    });
    
    test('sollte Fehler für identische Mannschaften zurückgeben', () => {
      const invalidData = {
        datum: '2024-03-15T15:00:00.000Z',
        heimmannschaft: 'SV Viktoria Wertheim I',
        auswaertsmannschaft: 'SV Viktoria Wertheim I',
        status: 'geplant'
      };
      
      const errors = validateSpielData(invalidData);
      expect(errors).toContain('Heim- und Auswärtsmannschaft können nicht identisch sein');
    });
    
    test('sollte Fehler für beendetes Spiel ohne Ergebnis zurückgeben', () => {
      const invalidData = {
        datum: '2024-03-15T15:00:00.000Z',
        heimmannschaft: 'SV Viktoria Wertheim I',
        auswaertsmannschaft: 'FC Tauberbischofsheim',
        tore_heim: null,
        tore_auswaerts: null,
        status: 'beendet'
      };
      
      const errors = validateSpielData(invalidData);
      expect(errors).toContain('Beendete Spiele müssen ein Ergebnis haben');
    });
    
    test('sollte Fehler für negative Tore zurückgeben', () => {
      const invalidData = {
        datum: '2024-03-15T15:00:00.000Z',
        heimmannschaft: 'SV Viktoria Wertheim I',
        auswaertsmannschaft: 'FC Tauberbischofsheim',
        tore_heim: -1,
        tore_auswaerts: 2,
        status: 'beendet'
      };
      
      const errors = validateSpielData(invalidData);
      expect(errors).toContain('Heim-Tore können nicht negativ sein');
    });
  });
  
  describe('generateTorschuetzen', () => {
    
    test('sollte korrekte Anzahl Torschützen generieren', () => {
      const torschuetzen = generateTorschuetzen(2, 1, 'SV Viktoria Wertheim I', 'FC Tauberbischofsheim');
      expect(torschuetzen).toHaveLength(3); // 2 + 1
    });
    
    test('sollte Torschützen mit korrekten Teams zuordnen', () => {
      const torschuetzen = generateTorschuetzen(1, 1, 'SV Viktoria Wertheim I', 'FC Tauberbischofsheim');
      
      const heimTore = torschuetzen.filter(t => t.team === 'home');
      const auswaertsTore = torschuetzen.filter(t => t.team === 'away');
      
      expect(heimTore).toHaveLength(1);
      expect(auswaertsTore).toHaveLength(1);
    });
    
    test('sollte Torschützen nach Minute sortieren', () => {
      const torschuetzen = generateTorschuetzen(3, 2, 'SV Viktoria Wertheim I', 'FC Tauberbischofsheim');
      
      for (let i = 1; i < torschuetzen.length; i++) {
        expect(torschuetzen[i].minute).toBeGreaterThanOrEqual(torschuetzen[i-1].minute);
      }
    });
    
    test('sollte gültige Minuten generieren (1-90)', () => {
      const torschuetzen = generateTorschuetzen(5, 3, 'SV Viktoria Wertheim I', 'FC Tauberbischofsheim');
      
      torschuetzen.forEach(tor => {
        expect(tor.minute).toBeGreaterThanOrEqual(1);
        expect(tor.minute).toBeLessThanOrEqual(90);
      });
    });
    
    test('sollte Spielernamen enthalten', () => {
      const torschuetzen = generateTorschuetzen(1, 1, 'SV Viktoria Wertheim I', 'FC Tauberbischofsheim');
      
      torschuetzen.forEach(tor => {
        expect(tor.player).toBeDefined();
        expect(typeof tor.player).toBe('string');
        expect(tor.player.length).toBeGreaterThan(0);
      });
    });
  });
  
  describe('generateKarten', () => {
    
    test('sollte Karten-Objekt mit korrekter Struktur zurückgeben', () => {
      const karten = generateKarten('SV Viktoria Wertheim I', 'FC Tauberbischofsheim');
      
      expect(karten).toHaveProperty('gelbe_karten');
      expect(karten).toHaveProperty('rote_karten');
      expect(Array.isArray(karten.gelbe_karten)).toBe(true);
      expect(Array.isArray(karten.rote_karten)).toBe(true);
    });
    
    test('sollte realistische Anzahl gelber Karten generieren', () => {
      const karten = generateKarten('SV Viktoria Wertheim I', 'FC Tauberbischofsheim');
      
      expect(karten.gelbe_karten.length).toBeLessThanOrEqual(4);
      expect(karten.gelbe_karten.length).toBeGreaterThanOrEqual(0);
    });
    
    test('sollte maximal eine rote Karte generieren', () => {
      const karten = generateKarten('SV Viktoria Wertheim I', 'FC Tauberbischofsheim');
      
      expect(karten.rote_karten.length).toBeLessThanOrEqual(1);
    });
    
    test('sollte Karten nach Minute sortieren', () => {
      // Mehrfach testen wegen Zufälligkeit
      for (let i = 0; i < 10; i++) {
        const karten = generateKarten('SV Viktoria Wertheim I', 'FC Tauberbischofsheim');
        
        // Gelbe Karten sortiert
        for (let j = 1; j < karten.gelbe_karten.length; j++) {
          expect(karten.gelbe_karten[j].minute).toBeGreaterThanOrEqual(karten.gelbe_karten[j-1].minute);
        }
        
        // Rote Karten sortiert
        for (let j = 1; j < karten.rote_karten.length; j++) {
          expect(karten.rote_karten[j].minute).toBeGreaterThanOrEqual(karten.rote_karten[j-1].minute);
        }
      }
    });
    
    test('sollte gültige Karten-Datenstruktur haben', () => {
      const karten = generateKarten('SV Viktoria Wertheim I', 'FC Tauberbischofsheim');
      
      [...karten.gelbe_karten, ...karten.rote_karten].forEach(karte => {
        expect(karte).toHaveProperty('minute');
        expect(karte).toHaveProperty('player');
        expect(karte).toHaveProperty('team');
        
        expect(typeof karte.minute).toBe('number');
        expect(typeof karte.player).toBe('string');
        expect(['home', 'away']).toContain(karte.team);
        
        expect(karte.minute).toBeGreaterThanOrEqual(1);
        expect(karte.minute).toBeLessThanOrEqual(90);
      });
    });
  });
  
  describe('generateLetztesAufeinandertreffen', () => {
    
    test('sollte korrektes Aufeinandertreffen-Objekt zurückgeben', () => {
      const aufeinandertreffen = generateLetztesAufeinandertreffen('SV Viktoria Wertheim I', 'FC Tauberbischofsheim');
      
      expect(aufeinandertreffen).toHaveProperty('date');
      expect(aufeinandertreffen).toHaveProperty('result');
      expect(aufeinandertreffen).toHaveProperty('location');
    });
    
    test('sollte gültiges Datum in der Vergangenheit haben', () => {
      const aufeinandertreffen = generateLetztesAufeinandertreffen('SV Viktoria Wertheim I', 'FC Tauberbischofsheim');
      
      const datum = new Date(aufeinandertreffen.date);
      const heute = new Date();
      
      expect(datum).toBeInstanceOf(Date);
      expect(datum.getTime()).toBeLessThan(heute.getTime());
    });
    
    test('sollte gültiges Ergebnis haben', () => {
      const aufeinandertreffen = generateLetztesAufeinandertreffen('SV Viktoria Wertheim I', 'FC Tauberbischofsheim');
      
      expect(typeof aufeinandertreffen.result).toBe('string');
      expect(aufeinandertreffen.result).toMatch(/^\d+:\d+$/); // Format "X:Y"
    });
    
    test('sollte gültigen Ort haben', () => {
      const aufeinandertreffen = generateLetztesAufeinandertreffen('SV Viktoria Wertheim I', 'FC Tauberbischofsheim');
      
      expect(['heim', 'auswaerts']).toContain(aufeinandertreffen.location);
    });
  });
  
  describe('createSpieleForMannschaft', () => {
    
    test('sollte 8 Spiele pro Mannschaft erstellen (5 vergangen + 3 zukünftig)', () => {
      const spiele = createSpieleForMannschaft('SV Viktoria Wertheim I', 'Kreisliga');
      expect(spiele).toHaveLength(8);
    });
    
    test('sollte vergangene Spiele als beendet markieren', () => {
      const spiele = createSpieleForMannschaft('SV Viktoria Wertheim I', 'Kreisliga');
      const vergangeneSpiele = spiele.filter(s => s.status === 'beendet');
      
      expect(vergangeneSpiele).toHaveLength(5);
      
      vergangeneSpiele.forEach(spiel => {
        expect(spiel.tore_heim).not.toBeNull();
        expect(spiel.tore_auswaerts).not.toBeNull();
        expect(spiel.torschuetzen.length).toBeGreaterThanOrEqual(0);
      });
    });
    
    test('sollte zukünftige Spiele als geplant markieren', () => {
      const spiele = createSpieleForMannschaft('SV Viktoria Wertheim I', 'Kreisliga');
      const zukuenftigeSpiele = spiele.filter(s => s.status === 'geplant');
      
      expect(zukuenftigeSpiele).toHaveLength(3);
      
      zukuenftigeSpiele.forEach(spiel => {
        expect(spiel.tore_heim).toBeNull();
        expect(spiel.tore_auswaerts).toBeNull();
        expect(spiel.letztes_aufeinandertreffen).toBeDefined();
      });
    });
    
    test('sollte Viktoria-Mannschaft in allen Spielen haben', () => {
      const spiele = createSpieleForMannschaft('SV Viktoria Wertheim I', 'Kreisliga');
      
      spiele.forEach(spiel => {
        const hatViktoria = spiel.heimmannschaft.includes('Viktoria') || 
                           spiel.auswaertsmannschaft.includes('Viktoria');
        expect(hatViktoria).toBe(true);
      });
    });
    
    test('sollte korrekte Liga zuweisen', () => {
      const spiele = createSpieleForMannschaft('SV Viktoria Wertheim II', 'Kreisklasse A');
      
      spiele.forEach(spiel => {
        expect(spiel.liga).toBe('Kreisklasse A');
      });
    });
    
    test('sollte aufsteigende Spieltage haben', () => {
      const spiele = createSpieleForMannschaft('SV Viktoria Wertheim I', 'Kreisliga', 10);
      
      for (let i = 1; i < spiele.length; i++) {
        expect(spiele[i].spieltag).toBeGreaterThan(spiele[i-1].spieltag);
      }
    });
  });
  
  describe('alleSpiele', () => {
    
    test('sollte Spiele für alle drei Mannschaften enthalten', () => {
      expect(alleSpiele.length).toBe(24); // 3 Mannschaften × 8 Spiele
    });
    
    test('sollte alle Spiele mit gültigen Daten haben', () => {
      alleSpiele.forEach((spiel, index) => {
        const errors = validateSpielData(spiel);
        expect(errors).toHaveLength(0, 
          `Spiel ${index + 1} hat Validierungsfehler: ${errors.join(', ')}`);
      });
    });
    
    test('sollte Spiele für alle drei Ligen haben', () => {
      const ligen = [...new Set(alleSpiele.map(s => s.liga))];
      expect(ligen).toContain('Kreisliga');
      expect(ligen).toContain('Kreisklasse A');
      expect(ligen).toContain('Kreisklasse B');
    });
    
    test('sollte beendete und geplante Spiele haben', () => {
      const beendet = alleSpiele.filter(s => s.status === 'beendet');
      const geplant = alleSpiele.filter(s => s.status === 'geplant');
      
      expect(beendet.length).toBe(15); // 3 Mannschaften × 5 vergangene Spiele
      expect(geplant.length).toBe(9);  // 3 Mannschaften × 3 zukünftige Spiele
    });
  });
  
  describe('Hilfsfunktionen', () => {
    
    test('checkStrapiConnection sollte eine Funktion sein', () => {
      expect(typeof checkStrapiConnection).toBe('function');
    });
    
    test('getMannschaftIds sollte eine Funktion sein', () => {
      expect(typeof getMannschaftIds).toBe('function');
    });
  });
  
  describe('Datenqualität', () => {
    
    test('sollte realistische Ergebnisse haben', () => {
      const beendeteSpiele = alleSpiele.filter(s => s.status === 'beendet');
      
      beendeteSpiele.forEach(spiel => {
        expect(spiel.tore_heim).toBeGreaterThanOrEqual(0);
        expect(spiel.tore_auswaerts).toBeGreaterThanOrEqual(0);
        expect(spiel.tore_heim).toBeLessThanOrEqual(10); // Realistische Obergrenze
        expect(spiel.tore_auswaerts).toBeLessThanOrEqual(10);
      });
    });
    
    test('sollte gültige Schiedsrichter haben', () => {
      alleSpiele.forEach(spiel => {
        expect(spiel.schiedsrichter).toBeDefined();
        expect(typeof spiel.schiedsrichter).toBe('string');
        expect(spiel.schiedsrichter.length).toBeGreaterThan(0);
      });
    });
    
    test('sollte gültige Saison haben', () => {
      alleSpiele.forEach(spiel => {
        expect(spiel.saison).toBe('2024/25');
      });
    });
    
    test('sollte chronologische Reihenfolge der Daten haben', () => {
      // Teste für jede Mannschaft separat
      const mannschaften = ['SV Viktoria Wertheim I', 'SV Viktoria Wertheim II', 'SV Viktoria Wertheim III'];
      
      mannschaften.forEach(mannschaft => {
        const mannschaftSpiele = alleSpiele.filter(s => 
          s.heimmannschaft === mannschaft || s.auswaertsmannschaft === mannschaft
        );
        
        for (let i = 1; i < mannschaftSpiele.length; i++) {
          const vorheriges = new Date(mannschaftSpiele[i-1].datum);
          const aktuelles = new Date(mannschaftSpiele[i].datum);
          expect(aktuelles.getTime()).toBeGreaterThan(vorheriges.getTime());
        }
      });
    });
  });
});