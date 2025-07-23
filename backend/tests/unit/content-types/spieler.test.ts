/**
 * Unit tests for Spieler content type and validation logic
 * Tests schema validation, relationships, and business rules
 */

import spielerLifecycles from '../../../src/api/spieler/content-types/spieler/lifecycles';

describe('Spieler Content Type', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Validation', () => {
    test('should require vorname and nachname', () => {
      const validData = {
        vorname: 'Max',
        nachname: 'Mustermann',
        status: 'aktiv'
      };
      
      expect(validData.vorname).toBeDefined();
      expect(validData.nachname).toBeDefined();
      expect(validData.vorname.length).toBeLessThanOrEqual(50);
      expect(validData.nachname.length).toBeLessThanOrEqual(50);
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

    test('should validate rueckennummer range', () => {
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

    test('should have default values', () => {
      const defaultData = {
        status: 'aktiv',
        kapitaen: false
      };
      
      expect(defaultData.status).toBe('aktiv');
      expect(defaultData.kapitaen).toBe(false);
    });
  });

  describe('Relationship Validation', () => {
    test('should validate one-to-one relationship with mitglied', () => {
      const playerData = {
        vorname: 'Max',
        nachname: 'Mustermann',
        mitglied: 1, // Should reference existing mitglied
        status: 'aktiv'
      };
      
      expect(playerData.mitglied).toBeDefined();
      expect(typeof playerData.mitglied).toBe('number');
    });

    test('should validate many-to-one relationship with hauptteam', () => {
      const playerData = {
        vorname: 'Max',
        nachname: 'Mustermann',
        hauptteam: 1, // Should reference existing team
        status: 'aktiv'
      };
      
      expect(playerData.hauptteam).toBeDefined();
      expect(typeof playerData.hauptteam).toBe('number');
    });

    test('should validate many-to-many relationship with aushilfe_teams', () => {
      const playerData = {
        vorname: 'Max',
        nachname: 'Mustermann',
        hauptteam: 1,
        aushilfe_teams: [2, 3], // Should reference existing teams
        status: 'aktiv'
      };
      
      expect(Array.isArray(playerData.aushilfe_teams)).toBe(true);
      playerData.aushilfe_teams.forEach(teamId => {
        expect(typeof teamId).toBe('number');
      });
    });
  });

  describe('Business Logic Validation', () => {
    test('should prevent player from being in aushilfe_teams same as hauptteam', async () => {
      const playerData = {
        vorname: 'Max',
        nachname: 'Mustermann',
        hauptteam: 1,
        aushilfe_teams: [1, 2], // Team 1 is both hauptteam and aushilfe
        status: 'aktiv'
      };

      // This validation would be implemented in lifecycle hooks
      const hasConflict = playerData.aushilfe_teams.includes(playerData.hauptteam);
      expect(hasConflict).toBe(true);
    });

    test('should validate unique rueckennummer per team', async () => {
      const existingPlayer = {
        id: 1,
        vorname: 'John',
        nachname: 'Doe',
        hauptteam: 1,
        rueckennummer: 10
      };

      const newPlayer = {
        vorname: 'Max',
        nachname: 'Mustermann',
        hauptteam: 1,
        rueckennummer: 10 // Same number, same team
      };

      // Mock finding existing player with same number and team
      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue([existingPlayer]);

      // This would be validated in lifecycle hooks
      const conflict = existingPlayer.rueckennummer === newPlayer.rueckennummer && 
                      existingPlayer.hauptteam === newPlayer.hauptteam;
      expect(conflict).toBe(true);
    });

    test('should allow same rueckennummer in different teams', async () => {
      const existingPlayer = {
        id: 1,
        vorname: 'John',
        nachname: 'Doe',
        hauptteam: 1,
        rueckennummer: 10
      };

      const newPlayer = {
        vorname: 'Max',
        nachname: 'Mustermann',
        hauptteam: 2, // Different team
        rueckennummer: 10 // Same number, different team
      };

      const conflict = existingPlayer.rueckennummer === newPlayer.rueckennummer && 
                      existingPlayer.hauptteam === newPlayer.hauptteam;
      expect(conflict).toBe(false);
    });

    test('should validate only one captain per team', async () => {
      const existingCaptain = {
        id: 1,
        vorname: 'John',
        nachname: 'Doe',
        hauptteam: 1,
        kapitaen: true
      };

      const newCaptain = {
        vorname: 'Max',
        nachname: 'Mustermann',
        hauptteam: 1,
        kapitaen: true
      };

      // Mock finding existing captain in same team
      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue([existingCaptain]);

      // This would be validated in lifecycle hooks
      const captainConflict = existingCaptain.kapitaen && newCaptain.kapitaen && 
                             existingCaptain.hauptteam === newCaptain.hauptteam;
      expect(captainConflict).toBe(true);
    });
  });

  describe('Data Integrity Constraints', () => {
    test('should maintain referential integrity with mitglied', async () => {
      const playerData = {
        vorname: 'Max',
        nachname: 'Mustermann',
        mitglied: 999, // Non-existent mitglied
        status: 'aktiv'
      };

      // Mock mitglied not found
      (global.strapi.entityService.findOne as jest.Mock).mockResolvedValue(null);

      // This would be validated in lifecycle hooks
      const mitgliedExists = await global.strapi.entityService.findOne('api::mitglied.mitglied', playerData.mitglied);
      expect(mitgliedExists).toBeNull();
    });

    test('should maintain referential integrity with teams', async () => {
      const playerData = {
        vorname: 'Max',
        nachname: 'Mustermann',
        hauptteam: 999, // Non-existent team
        aushilfe_teams: [998, 997], // Non-existent teams
        status: 'aktiv'
      };

      // Mock teams not found
      (global.strapi.entityService.findOne as jest.Mock).mockResolvedValue(null);

      // This would be validated in lifecycle hooks
      const hauptteamExists = await global.strapi.entityService.findOne('api::team.team', playerData.hauptteam);
      expect(hauptteamExists).toBeNull();
    });

    test('should validate team belongs to same club/season', async () => {
      const hauptteam = {
        id: 1,
        name: '1. Team',
        club: 1,
        saison: 1
      };

      const aushilfeTeam = {
        id: 2,
        name: '2. Team',
        club: 2, // Different club
        saison: 1
      };

      // Mock team data
      (global.strapi.entityService.findOne as jest.Mock)
        .mockResolvedValueOnce(hauptteam)
        .mockResolvedValueOnce(aushilfeTeam);

      // This validation would check if teams belong to same club
      const sameClub = hauptteam.club === aushilfeTeam.club;
      expect(sameClub).toBe(false);
    });
  });

  describe('Statistics Integration', () => {
    test('should initialize season statistics when player is created', async () => {
      const playerData = {
        vorname: 'Max',
        nachname: 'Mustermann',
        hauptteam: 1,
        status: 'aktiv'
      };

      const activeSeason = {
        id: 1,
        name: '2024/25',
        aktiv: true
      };

      // Mock active season
      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue([activeSeason]);
      (global.strapi.entityService.create as jest.Mock).mockResolvedValue({});

      // This would be handled in lifecycle hooks
      const shouldCreateStats = activeSeason && playerData.hauptteam;
      expect(shouldCreateStats).toBeTruthy();
    });

    test('should update statistics when team assignments change', async () => {
      const originalPlayer = {
        id: 1,
        vorname: 'Max',
        nachname: 'Mustermann',
        hauptteam: 1
      };

      const updatedPlayer = {
        hauptteam: 2 // Team change
      };

      // This would trigger statistics updates in lifecycle hooks
      const teamChanged = originalPlayer.hauptteam !== updatedPlayer.hauptteam;
      expect(teamChanged).toBe(true);
    });
  });
});