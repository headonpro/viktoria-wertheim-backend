/**
 * Unit tests for automated processing service
 * Tests automatic statistics calculation and data processing
 */

import AutomatedProcessingService from '../../../src/services/automated-processing';

describe('AutomatedProcessingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processMatchCompletion', () => {
    test('should update player statistics when match is completed', async () => {
      const matchId = 1;
      const match = {
        id: 1,
        status: 'beendet',
        unser_team: { id: 1 },
        saison: { id: 1 },
        torschuetzen: [
          { spieler_id: 1, minute: 15, typ: 'tor' },
          { spieler_id: 2, minute: 30, typ: 'elfmeter' },
          { spieler_id: 1, minute: 45, typ: 'tor' } // Player 1 scores twice
        ],
        karten: [
          { spieler_id: 1, minute: 60, typ: 'gelb' },
          { spieler_id: 3, minute: 75, typ: 'rot' }
        ],
        wechsel: [
          { raus_id: 2, rein_id: 4, minute: 70 }
        ]
      };

      const existingStats = [
        { id: 1, spieler: { id: 1 }, tore: 3, spiele: 2, gelbe_karten: 1, rote_karten: 0 },
        { id: 2, spieler: { id: 2 }, tore: 1, spiele: 1, gelbe_karten: 0, rote_karten: 0 },
        { id: 3, spieler: { id: 3 }, tore: 0, spiele: 1, gelbe_karten: 0, rote_karten: 1 }
      ];

      // Mock match data
      (global.strapi.entityService.findOne as jest.Mock).mockResolvedValue(match);
      
      // Mock existing statistics
      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue(existingStats);
      
      // Mock update calls
      (global.strapi.entityService.update as jest.Mock).mockResolvedValue({});

      const result = await AutomatedProcessingService.processMatchCompletion(matchId);

      expect(result.success).toBe(true);
      
      // Verify statistics updates
      expect(global.strapi.entityService.update).toHaveBeenCalledWith(
        'api::spieler-saison-statistik.spieler-saison-statistik',
        1,
        {
          data: {
            tore: 5, // 3 + 2 new goals
            spiele: 3, // 2 + 1 new match
            gelbe_karten: 2, // 1 + 1 new yellow card
            rote_karten: 0
          }
        }
      );

      expect(global.strapi.entityService.update).toHaveBeenCalledWith(
        'api::spieler-saison-statistik.spieler-saison-statistik',
        2,
        {
          data: {
            tore: 2, // 1 + 1 new goal
            spiele: 2, // 1 + 1 new match
            gelbe_karten: 0,
            rote_karten: 0
          }
        }
      );

      expect(global.strapi.entityService.update).toHaveBeenCalledWith(
        'api::spieler-saison-statistik.spieler-saison-statistik',
        3,
        {
          data: {
            tore: 0,
            spiele: 2, // 1 + 1 new match
            gelbe_karten: 0,
            rote_karten: 2 // 1 + 1 new red card
          }
        }
      );
    });

    test('should create statistics if they do not exist', async () => {
      const matchId = 1;
      const match = {
        id: 1,
        status: 'beendet',
        unser_team: { id: 1 },
        saison: { id: 1 },
        torschuetzen: [
          { spieler_id: 1, minute: 15, typ: 'tor' }
        ],
        karten: [],
        wechsel: []
      };

      // Mock match data
      (global.strapi.entityService.findOne as jest.Mock).mockResolvedValue(match);
      
      // Mock no existing statistics
      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue([]);
      
      // Mock create calls
      (global.strapi.entityService.create as jest.Mock).mockResolvedValue({});

      const result = await AutomatedProcessingService.processMatchCompletion(matchId);

      expect(result.success).toBe(true);
      
      // Verify statistics creation
      expect(global.strapi.entityService.create).toHaveBeenCalledWith(
        'api::spieler-saison-statistik.spieler-saison-statistik',
        {
          data: {
            spieler: 1,
            saison: 1,
            team: 1,
            tore: 1,
            spiele: 1,
            assists: 0,
            gelbe_karten: 0,
            rote_karten: 0,
            minuten_gespielt: 90
          }
        }
      );
    });

    test('should update league table after match completion', async () => {
      const matchId = 1;
      const match = {
        id: 1,
        status: 'beendet',
        heimclub: { id: 1 },
        auswaertsclub: { id: 2 },
        unser_team: { id: 1 },
        liga: { id: 1 },
        ist_heimspiel: true,
        tore_heim: 2,
        tore_auswaerts: 1,
        torschuetzen: [],
        karten: [],
        wechsel: []
      };

      const existingTableEntries = [
        { 
          id: 1, 
          club: { id: 1 }, 
          spiele: 5, 
          siege: 2, 
          unentschieden: 1, 
          niederlagen: 2,
          tore_fuer: 8,
          tore_gegen: 7,
          punkte: 7
        },
        { 
          id: 2, 
          club: { id: 2 }, 
          spiele: 5, 
          siege: 3, 
          unentschieden: 0, 
          niederlagen: 2,
          tore_fuer: 9,
          tore_gegen: 6,
          punkte: 9
        }
      ];

      // Mock match and table data
      (global.strapi.entityService.findOne as jest.Mock).mockResolvedValue(match);
      (global.strapi.entityService.findMany as jest.Mock)
        .mockResolvedValueOnce([]) // No player stats to update
        .mockResolvedValueOnce(existingTableEntries); // Table entries
      
      (global.strapi.entityService.update as jest.Mock).mockResolvedValue({});

      const result = await AutomatedProcessingService.processMatchCompletion(matchId);

      expect(result.success).toBe(true);
      
      // Verify table updates for home team (winner)
      expect(global.strapi.entityService.update).toHaveBeenCalledWith(
        'api::tabellen-eintrag.tabellen-eintrag',
        1,
        {
          data: {
            spiele: 6,
            siege: 3, // +1 win
            unentschieden: 1,
            niederlagen: 2,
            tore_fuer: 10, // +2 goals
            tore_gegen: 8, // +1 goal against
            tordifferenz: 2,
            punkte: 10 // +3 points
          }
        }
      );

      // Verify table updates for away team (loser)
      expect(global.strapi.entityService.update).toHaveBeenCalledWith(
        'api::tabellen-eintrag.tabellen-eintrag',
        2,
        {
          data: {
            spiele: 6,
            siege: 3,
            unentschieden: 0,
            niederlagen: 3, // +1 loss
            tore_fuer: 10, // +1 goal
            tore_gegen: 8, // +2 goals against
            tordifferenz: 2,
            punkte: 9 // No points for loss
          }
        }
      );
    });

    test('should handle draw results correctly', async () => {
      const matchId = 1;
      const match = {
        id: 1,
        status: 'beendet',
        heimclub: { id: 1 },
        auswaertsclub: { id: 2 },
        unser_team: { id: 1 },
        liga: { id: 1 },
        ist_heimspiel: true,
        tore_heim: 1,
        tore_auswaerts: 1, // Draw
        torschuetzen: [],
        karten: [],
        wechsel: []
      };

      const existingTableEntries = [
        { 
          id: 1, 
          club: { id: 1 }, 
          spiele: 5, 
          siege: 2, 
          unentschieden: 1, 
          niederlagen: 2,
          tore_fuer: 8,
          tore_gegen: 7,
          punkte: 7
        },
        { 
          id: 2, 
          club: { id: 2 }, 
          spiele: 5, 
          siege: 3, 
          unentschieden: 0, 
          niederlagen: 2,
          tore_fuer: 9,
          tore_gegen: 6,
          punkte: 9
        }
      ];

      (global.strapi.entityService.findOne as jest.Mock).mockResolvedValue(match);
      (global.strapi.entityService.findMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(existingTableEntries);
      
      (global.strapi.entityService.update as jest.Mock).mockResolvedValue({});

      const result = await AutomatedProcessingService.processMatchCompletion(matchId);

      expect(result.success).toBe(true);
      
      // Both teams should get 1 point for draw
      expect(global.strapi.entityService.update).toHaveBeenCalledWith(
        'api::tabellen-eintrag.tabellen-eintrag',
        1,
        {
          data: {
            spiele: 6,
            siege: 2,
            unentschieden: 2, // +1 draw
            niederlagen: 2,
            tore_fuer: 9,
            tore_gegen: 8,
            tordifferenz: 1,
            punkte: 8 // +1 point
          }
        }
      );

      expect(global.strapi.entityService.update).toHaveBeenCalledWith(
        'api::tabellen-eintrag.tabellen-eintrag',
        2,
        {
          data: {
            spiele: 6,
            siege: 3,
            unentschieden: 1, // +1 draw
            niederlagen: 2,
            tore_fuer: 10,
            tore_gegen: 7,
            tordifferenz: 3,
            punkte: 10 // +1 point
          }
        }
      );
    });

    test('should handle errors gracefully', async () => {
      const matchId = 999; // Non-existent match

      (global.strapi.entityService.findOne as jest.Mock).mockResolvedValue(null);

      const result = await AutomatedProcessingService.processMatchCompletion(matchId);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Match not found');
    });

    test('should skip processing for non-completed matches', async () => {
      const matchId = 1;
      const match = {
        id: 1,
        status: 'geplant' // Not completed
      };

      (global.strapi.entityService.findOne as jest.Mock).mockResolvedValue(match);

      const result = await AutomatedProcessingService.processMatchCompletion(matchId);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Match is not completed');
    });
  });

  describe('calculatePlayerStatistics', () => {
    test('should calculate statistics from match events', () => {
      const events = {
        torschuetzen: [
          { spieler_id: 1, minute: 15, typ: 'tor' },
          { spieler_id: 1, minute: 30, typ: 'elfmeter' },
          { spieler_id: 2, minute: 45, typ: 'tor', assist_spieler_id: 1 }
        ],
        karten: [
          { spieler_id: 1, minute: 60, typ: 'gelb' },
          { spieler_id: 2, minute: 75, typ: 'rot' }
        ],
        wechsel: [
          { raus_id: 1, rein_id: 3, minute: 80 },
          { raus_id: 2, rein_id: 4, minute: 85 }
        ]
      };

      const result = AutomatedProcessingService.calculatePlayerStatistics(events);

      expect(result).toEqual({
        1: { tore: 2, assists: 1, gelbe_karten: 1, rote_karten: 0, minuten_gespielt: 80 },
        2: { tore: 1, assists: 0, gelbe_karten: 0, rote_karten: 1, minuten_gespielt: 85 },
        3: { tore: 0, assists: 0, gelbe_karten: 0, rote_karten: 0, minuten_gespielt: 10 },
        4: { tore: 0, assists: 0, gelbe_karten: 0, rote_karten: 0, minuten_gespielt: 5 }
      });
    });

    test('should handle empty events', () => {
      const events = {
        torschuetzen: [],
        karten: [],
        wechsel: []
      };

      const result = AutomatedProcessingService.calculatePlayerStatistics(events);

      expect(result).toEqual({});
    });

    test('should calculate minutes played correctly', () => {
      const events = {
        torschuetzen: [],
        karten: [],
        wechsel: [
          { raus_id: 1, rein_id: 2, minute: 60 }, // Player 1 plays 60 min, Player 2 plays 30 min
          { raus_id: 3, rein_id: 4, minute: 75 }  // Player 3 plays 75 min, Player 4 plays 15 min
        ]
      };

      const result = AutomatedProcessingService.calculatePlayerStatistics(events);

      expect(result[1].minuten_gespielt).toBe(60);
      expect(result[2].minuten_gespielt).toBe(30);
      expect(result[3].minuten_gespielt).toBe(75);
      expect(result[4].minuten_gespielt).toBe(15);
    });
  });

  describe('updateTablePositions', () => {
    test('should recalculate and update table positions', async () => {
      const ligaId = 1;
      const tableEntries = [
        { id: 1, club: { id: 1 }, punkte: 15, tordifferenz: 5, tore_fuer: 20 },
        { id: 2, club: { id: 2 }, punkte: 18, tordifferenz: 8, tore_fuer: 22 }, // Should be 1st
        { id: 3, club: { id: 3 }, punkte: 12, tordifferenz: 2, tore_fuer: 15 }
      ];

      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue(tableEntries);
      (global.strapi.entityService.update as jest.Mock).mockResolvedValue({});

      await AutomatedProcessingService.updateTablePositions(ligaId);

      // Verify position updates
      expect(global.strapi.entityService.update).toHaveBeenCalledWith(
        'api::tabellen-eintrag.tabellen-eintrag',
        2,
        { data: { platz: 1 } }
      );

      expect(global.strapi.entityService.update).toHaveBeenCalledWith(
        'api::tabellen-eintrag.tabellen-eintrag',
        1,
        { data: { platz: 2 } }
      );

      expect(global.strapi.entityService.update).toHaveBeenCalledWith(
        'api::tabellen-eintrag.tabellen-eintrag',
        3,
        { data: { platz: 3 } }
      );
    });

    test('should handle equal points with goal difference tiebreaker', async () => {
      const ligaId = 1;
      const tableEntries = [
        { id: 1, club: { id: 1 }, punkte: 15, tordifferenz: 3, tore_fuer: 18 },
        { id: 2, club: { id: 2 }, punkte: 15, tordifferenz: 5, tore_fuer: 20 }, // Better goal difference
        { id: 3, club: { id: 3 }, punkte: 15, tordifferenz: 5, tore_fuer: 22 }  // Same goal diff, more goals
      ];

      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue(tableEntries);
      (global.strapi.entityService.update as jest.Mock).mockResolvedValue({});

      await AutomatedProcessingService.updateTablePositions(ligaId);

      // Team 3 should be 1st (more goals scored), Team 2 should be 2nd, Team 1 should be 3rd
      expect(global.strapi.entityService.update).toHaveBeenCalledWith(
        'api::tabellen-eintrag.tabellen-eintrag',
        3,
        { data: { platz: 1 } }
      );

      expect(global.strapi.entityService.update).toHaveBeenCalledWith(
        'api::tabellen-eintrag.tabellen-eintrag',
        2,
        { data: { platz: 2 } }
      );

      expect(global.strapi.entityService.update).toHaveBeenCalledWith(
        'api::tabellen-eintrag.tabellen-eintrag',
        1,
        { data: { platz: 3 } }
      );
    });
  });

  describe('processSeasonTransition', () => {
    test('should initialize new season data', async () => {
      const newSeasonId = 2;
      const previousSeasonId = 1;

      const teams = [
        { id: 1, name: '1. Team', club: { id: 1 }, liga: { id: 1 } },
        { id: 2, name: '2. Team', club: { id: 1 }, liga: { id: 2 } }
      ];

      const players = [
        { id: 1, vorname: 'Max', nachname: 'Mustermann', hauptteam: { id: 1 } },
        { id: 2, vorname: 'John', nachname: 'Doe', hauptteam: { id: 2 } }
      ];

      (global.strapi.entityService.findMany as jest.Mock)
        .mockResolvedValueOnce(teams)
        .mockResolvedValueOnce(players);
      
      (global.strapi.entityService.create as jest.Mock).mockResolvedValue({});

      const result = await AutomatedProcessingService.processSeasonTransition(newSeasonId, previousSeasonId);

      expect(result.success).toBe(true);
      
      // Verify player statistics initialization
      expect(global.strapi.entityService.create).toHaveBeenCalledWith(
        'api::spieler-saison-statistik.spieler-saison-statistik',
        {
          data: {
            spieler: 1,
            saison: 2,
            team: 1,
            tore: 0,
            spiele: 0,
            assists: 0,
            gelbe_karten: 0,
            rote_karten: 0,
            minuten_gespielt: 0
          }
        }
      );

      expect(global.strapi.entityService.create).toHaveBeenCalledWith(
        'api::spieler-saison-statistik.spieler-saison-statistik',
        {
          data: {
            spieler: 2,
            saison: 2,
            team: 2,
            tore: 0,
            spiele: 0,
            assists: 0,
            gelbe_karten: 0,
            rote_karten: 0,
            minuten_gespielt: 0
          }
        }
      );
    });
  });
});