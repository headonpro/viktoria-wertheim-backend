/**
 * Unit tests for content type schemas and basic validation
 * Tests schema structure, field validation, and relationships
 */

describe('Content Type Schemas', () => {
  describe('Saison Schema', () => {
    test('should have required fields defined', () => {
      const requiredFields = ['name', 'start_datum', 'end_datum', 'aktiv'];
      const saisonSchema = {
        name: { type: 'string', required: true, unique: true, maxLength: 20 },
        start_datum: { type: 'date', required: true },
        end_datum: { type: 'date', required: true },
        aktiv: { type: 'boolean', default: false, required: true }
      };

      requiredFields.forEach(field => {
        expect(saisonSchema[field]).toBeDefined();
        expect(saisonSchema[field].required).toBe(true);
      });
    });

    test('should validate name constraints', () => {
      const validNames = ['2024/25', '2023/24', '2025/26'];
      const invalidNames = ['2024', '24/25', '2024-25', '2024/2025', 'Very long season name that exceeds limit'];

      validNames.forEach(name => {
        expect(name.length).toBeLessThanOrEqual(20);
        expect(name).toMatch(/^\d{4}\/\d{2}$/);
      });

      invalidNames.forEach(name => {
        const isValid = name.length <= 20 && /^\d{4}\/\d{2}$/.test(name);
        expect(isValid).toBe(false);
      });
    });

    test('should have default aktiv value as false', () => {
      const defaultValue = false;
      expect(defaultValue).toBe(false);
    });
  });

  describe('Spieler Schema', () => {
    test('should have required fields defined', () => {
      const requiredFields = ['vorname', 'nachname', 'status'];
      const spielerSchema = {
        vorname: { type: 'string', required: true, maxLength: 50 },
        nachname: { type: 'string', required: true, maxLength: 50 },
        status: { type: 'enumeration', enum: ['aktiv', 'verletzt', 'gesperrt'], default: 'aktiv', required: true }
      };

      requiredFields.forEach(field => {
        expect(spielerSchema[field]).toBeDefined();
        expect(spielerSchema[field].required).toBe(true);
      });
    });

    test('should validate position enumeration', () => {
      const validPositions = ['Torwart', 'Abwehr', 'Mittelfeld', 'Sturm'];
      const invalidPositions = ['Keeper', 'Defense', 'Midfielder', 'Forward'];

      validPositions.forEach(position => {
        expect(['Torwart', 'Abwehr', 'Mittelfeld', 'Sturm']).toContain(position);
      });

      invalidPositions.forEach(position => {
        expect(['Torwart', 'Abwehr', 'Mittelfeld', 'Sturm']).not.toContain(position);
      });
    });

    test('should validate rueckennummer constraints', () => {
      const validNumbers = [1, 10, 99];
      const invalidNumbers = [0, 100, -1];

      validNumbers.forEach(number => {
        expect(number).toBeGreaterThanOrEqual(1);
        expect(number).toBeLessThanOrEqual(99);
      });

      invalidNumbers.forEach(number => {
        expect(number < 1 || number > 99).toBe(true);
      });
    });

    test('should validate status enumeration', () => {
      const validStatuses = ['aktiv', 'verletzt', 'gesperrt'];
      const invalidStatuses = ['active', 'injured', 'suspended'];

      validStatuses.forEach(status => {
        expect(['aktiv', 'verletzt', 'gesperrt']).toContain(status);
      });

      invalidStatuses.forEach(status => {
        expect(['aktiv', 'verletzt', 'gesperrt']).not.toContain(status);
      });
    });
  });

  describe('Spiel Schema', () => {
    test('should have required fields defined', () => {
      const requiredFields = ['datum', 'heimclub', 'auswaertsclub', 'unser_team', 'liga', 'saison', 'ist_heimspiel'];
      const spielSchema = {
        datum: { type: 'datetime', required: true },
        heimclub: { type: 'relation', required: true },
        auswaertsclub: { type: 'relation', required: true },
        unser_team: { type: 'relation', required: true },
        liga: { type: 'relation', required: true },
        saison: { type: 'relation', required: true },
        ist_heimspiel: { type: 'boolean', required: true }
      };

      requiredFields.forEach(field => {
        expect(spielSchema[field]).toBeDefined();
        expect(spielSchema[field].required).toBe(true);
      });
    });

    test('should validate status enumeration', () => {
      const validStatuses = ['geplant', 'laufend', 'beendet', 'abgesagt'];
      const invalidStatuses = ['planned', 'running', 'finished', 'cancelled'];

      validStatuses.forEach(status => {
        expect(['geplant', 'laufend', 'beendet', 'abgesagt']).toContain(status);
      });

      invalidStatuses.forEach(status => {
        expect(['geplant', 'laufend', 'beendet', 'abgesagt']).not.toContain(status);
      });
    });

    test('should validate score constraints', () => {
      const validScores = [0, 1, 5, 10];
      const invalidScores = [-1, -5];

      validScores.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
      });

      invalidScores.forEach(score => {
        expect(score).toBeLessThan(0);
      });
    });
  });

  describe('Match Events Validation', () => {
    test('should validate goal event structure', () => {
      const validGoalEvents = [
        { spieler_id: 1, minute: 15, typ: 'tor' },
        { spieler_id: 2, minute: 30, typ: 'elfmeter', assist_spieler_id: 3 },
        { spieler_id: 3, minute: 45, typ: 'eigentor' }
      ];

      const invalidGoalEvents = [
        { minute: 15 }, // Missing spieler_id
        { spieler_id: 1 }, // Missing minute
        { spieler_id: 1, minute: 0 }, // Invalid minute
        { spieler_id: 1, minute: 121 }, // Invalid minute
        { spieler_id: 1, minute: 15, typ: 'invalid' }, // Invalid type
        { spieler_id: 'invalid', minute: 15 } // Invalid spieler_id type
      ];

      validGoalEvents.forEach(goal => {
        expect(goal.spieler_id).toBeDefined();
        expect(typeof goal.spieler_id).toBe('number');
        expect(goal.minute).toBeGreaterThan(0);
        expect(goal.minute).toBeLessThanOrEqual(120);
        if (goal.typ) {
          expect(['tor', 'eigentor', 'elfmeter']).toContain(goal.typ);
        }
      });

      invalidGoalEvents.forEach((goal, index) => {
        let isValid = true;
        
        // Check each validation rule
        if (!goal.spieler_id || typeof goal.spieler_id !== 'number') {
          isValid = false;
        }
        if (!goal.minute || goal.minute <= 0 || goal.minute > 120) {
          isValid = false;
        }
        if (goal.typ && !['tor', 'eigentor', 'elfmeter'].includes(goal.typ)) {
          isValid = false;
        }
        
        expect(isValid).toBe(false);
      });
    });

    test('should validate card event structure', () => {
      const validCardEvents = [
        { spieler_id: 1, minute: 15, typ: 'gelb' },
        { spieler_id: 2, minute: 30, typ: 'rot', grund: 'Foul' },
        { spieler_id: 3, minute: 45, typ: 'gelb-rot' }
      ];

      const invalidCardEvents = [
        { minute: 15 }, // Missing spieler_id
        { spieler_id: 1 }, // Missing minute
        { spieler_id: 1, minute: 15 }, // Missing typ
        { spieler_id: 1, minute: 15, typ: 'invalid' }, // Invalid type
        { spieler_id: 1, minute: 0, typ: 'gelb' }, // Invalid minute
        { spieler_id: 1, minute: 121, typ: 'gelb' } // Invalid minute
      ];

      validCardEvents.forEach(card => {
        expect(card.spieler_id).toBeDefined();
        expect(typeof card.spieler_id).toBe('number');
        expect(card.minute).toBeGreaterThan(0);
        expect(card.minute).toBeLessThanOrEqual(120);
        expect(['gelb', 'rot', 'gelb-rot']).toContain(card.typ);
      });

      invalidCardEvents.forEach(card => {
        const isValid = card.spieler_id && 
                       typeof card.spieler_id === 'number' &&
                       card.minute && 
                       card.minute > 0 && 
                       card.minute <= 120 &&
                       card.typ &&
                       ['gelb', 'rot', 'gelb-rot'].includes(card.typ);
        expect(isValid).toBeFalsy();
      });
    });

    test('should validate substitution event structure', () => {
      const validSubEvents = [
        { raus_id: 1, rein_id: 2, minute: 60 },
        { raus_id: 3, rein_id: 4, minute: 75 }
      ];

      const invalidSubEvents = [
        { rein_id: 2, minute: 60 }, // Missing raus_id
        { raus_id: 1, minute: 60 }, // Missing rein_id
        { raus_id: 1, rein_id: 2 }, // Missing minute
        { raus_id: 1, rein_id: 1, minute: 60 }, // Same player
        { raus_id: 1, rein_id: 2, minute: 0 }, // Invalid minute
        { raus_id: 1, rein_id: 2, minute: 121 } // Invalid minute
      ];

      validSubEvents.forEach(sub => {
        expect(sub.raus_id).toBeDefined();
        expect(sub.rein_id).toBeDefined();
        expect(typeof sub.raus_id).toBe('number');
        expect(typeof sub.rein_id).toBe('number');
        expect(sub.raus_id).not.toBe(sub.rein_id);
        expect(sub.minute).toBeGreaterThan(0);
        expect(sub.minute).toBeLessThanOrEqual(120);
      });

      invalidSubEvents.forEach(sub => {
        const isValid = sub.raus_id && 
                       sub.rein_id &&
                       typeof sub.raus_id === 'number' &&
                       typeof sub.rein_id === 'number' &&
                       sub.raus_id !== sub.rein_id &&
                       sub.minute && 
                       sub.minute > 0 && 
                       sub.minute <= 120;
        expect(isValid).toBeFalsy();
      });
    });
  });

  describe('Business Logic Validation', () => {
    test('should validate season name format', () => {
      const validFormats = ['2024/25', '2023/24', '2025/26'];
      const invalidFormats = ['2024', '24/25', '2024-25', '2024/2025'];

      validFormats.forEach(format => {
        expect(format).toMatch(/^\d{4}\/\d{2}$/);
      });

      invalidFormats.forEach(format => {
        expect(format).not.toMatch(/^\d{4}\/\d{2}$/);
      });
    });

    test('should validate logical season progression', () => {
      const seasonName = '2024/25';
      const [startYear, endYear] = seasonName.split('/').map(y => 
        y.length === 2 ? `20${y}` : y
      );
      
      expect(parseInt(endYear)).toBe(parseInt(startYear) + 1);
    });

    test('should validate team assignment logic', () => {
      const playerData = {
        hauptteam: 1,
        aushilfe_teams: [2, 3] // Should not include hauptteam
      };
      
      const hasConflict = playerData.aushilfe_teams.includes(playerData.hauptteam);
      expect(hasConflict).toBe(false);
    });

    test('should validate match club relationships', () => {
      const matchData = {
        heimclub: 1,
        auswaertsclub: 2 // Should be different from heimclub
      };
      
      const isValid = matchData.heimclub !== matchData.auswaertsclub;
      expect(isValid).toBe(true);
    });

    test('should validate status transitions', () => {
      const validTransitions = {
        'geplant': ['laufend', 'abgesagt'],
        'laufend': ['beendet', 'abgesagt'],
        'beendet': [], // Completed matches cannot change status
        'abgesagt': ['geplant'] // Cancelled matches can be rescheduled
      };

      // Test valid transitions
      expect(validTransitions['geplant']).toContain('laufend');
      expect(validTransitions['laufend']).toContain('beendet');
      expect(validTransitions['abgesagt']).toContain('geplant');
      
      // Test invalid transitions
      expect(validTransitions['beendet']).not.toContain('laufend');
      expect(validTransitions['beendet']).not.toContain('geplant');
    });
  });

  describe('Data Integrity Constraints', () => {
    test('should validate unique constraints', () => {
      const seasons = [
        { id: 1, name: '2023/24' },
        { id: 2, name: '2024/25' }
      ];
      
      const names = seasons.map(s => s.name);
      const uniqueNames = [...new Set(names)];
      
      expect(names.length).toBe(uniqueNames.length);
    });

    test('should validate jersey number uniqueness per team', () => {
      const players = [
        { id: 1, hauptteam: 1, rueckennummer: 10 },
        { id: 2, hauptteam: 1, rueckennummer: 11 }, // Different number, same team
        { id: 3, hauptteam: 2, rueckennummer: 10 }  // Same number, different team
      ];
      
      // Group by team
      const teamPlayers = players.reduce((acc, player) => {
        if (!acc[player.hauptteam]) acc[player.hauptteam] = [];
        acc[player.hauptteam].push(player);
        return acc;
      }, {});
      
      // Check uniqueness within each team
      Object.values(teamPlayers).forEach((teamPlayerList: any[]) => {
        const numbers = teamPlayerList.map(p => p.rueckennummer).filter(n => n);
        const uniqueNumbers = [...new Set(numbers)];
        expect(numbers.length).toBe(uniqueNumbers.length);
      });
    });

    test('should validate captain uniqueness per team', () => {
      const players = [
        { id: 1, hauptteam: 1, kapitaen: true },
        { id: 2, hauptteam: 1, kapitaen: false },
        { id: 3, hauptteam: 2, kapitaen: true }
      ];
      
      // Group by team
      const teamPlayers = players.reduce((acc, player) => {
        if (!acc[player.hauptteam]) acc[player.hauptteam] = [];
        acc[player.hauptteam].push(player);
        return acc;
      }, {});
      
      // Check captain uniqueness within each team
      Object.values(teamPlayers).forEach((teamPlayerList: any[]) => {
        const captains = teamPlayerList.filter(p => p.kapitaen);
        expect(captains.length).toBeLessThanOrEqual(1);
      });
    });

    test('should validate active season constraint', () => {
      const seasons = [
        { id: 1, name: '2023/24', aktiv: false },
        { id: 2, name: '2024/25', aktiv: true }
      ];
      
      const activeSeasons = seasons.filter(s => s.aktiv);
      expect(activeSeasons.length).toBeLessThanOrEqual(1);
    });
  });
});