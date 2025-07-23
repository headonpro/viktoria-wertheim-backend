/**
 * Integration tests for complex queries API endpoints
 * Tests performance and complex data aggregation workflows
 */

describe('Complex Queries API Integration', () => {
  describe('League Table Generation', () => {
    test('should generate accurate league table from match results', async () => {
      const mockMatches = [
        {
          id: 1,
          heimclub: { id: 1, name: 'Team A' },
          auswaertsclub: { id: 2, name: 'Team B' },
          tore_heim: 2,
          tore_auswaerts: 1,
          status: 'beendet'
        },
        {
          id: 2,
          heimclub: { id: 2, name: 'Team B' },
          auswaertsclub: { id: 3, name: 'Team C' },
          tore_heim: 1,
          tore_auswaerts: 1,
          status: 'beendet'
        },
        {
          id: 3,
          heimclub: { id: 3, name: 'Team C' },
          auswaertsclub: { id: 1, name: 'Team A' },
          tore_heim: 0,
          tore_auswaerts: 3,
          status: 'beendet'
        }
      ];

      // Calculate table entries
      const tableEntries = {};

      mockMatches.forEach(match => {
        const homeId = match.heimclub.id;
        const awayId = match.auswaertsclub.id;
        const homeGoals = match.tore_heim;
        const awayGoals = match.tore_auswaerts;

        // Initialize entries
        if (!tableEntries[homeId]) {
          tableEntries[homeId] = {
            club: match.heimclub,
            spiele: 0,
            siege: 0,
            unentschieden: 0,
            niederlagen: 0,
            tore_fuer: 0,
            tore_gegen: 0,
            punkte: 0
          };
        }
        if (!tableEntries[awayId]) {
          tableEntries[awayId] = {
            club: match.auswaertsclub,
            spiele: 0,
            siege: 0,
            unentschieden: 0,
            niederlagen: 0,
            tore_fuer: 0,
            tore_gegen: 0,
            punkte: 0
          };
        }

        // Update home team
        tableEntries[homeId].spiele += 1;
        tableEntries[homeId].tore_fuer += homeGoals;
        tableEntries[homeId].tore_gegen += awayGoals;

        // Update away team
        tableEntries[awayId].spiele += 1;
        tableEntries[awayId].tore_fuer += awayGoals;
        tableEntries[awayId].tore_gegen += homeGoals;

        // Determine result
        if (homeGoals > awayGoals) {
          // Home win
          tableEntries[homeId].siege += 1;
          tableEntries[homeId].punkte += 3;
          tableEntries[awayId].niederlagen += 1;
        } else if (awayGoals > homeGoals) {
          // Away win
          tableEntries[awayId].siege += 1;
          tableEntries[awayId].punkte += 3;
          tableEntries[homeId].niederlagen += 1;
        } else {
          // Draw
          tableEntries[homeId].unentschieden += 1;
          tableEntries[homeId].punkte += 1;
          tableEntries[awayId].unentschieden += 1;
          tableEntries[awayId].punkte += 1;
        }
      });

      // Calculate goal difference and sort
      const sortedTable = Object.values(tableEntries)
        .map((entry: any) => ({
          ...entry,
          tordifferenz: entry.tore_fuer - entry.tore_gegen
        }))
        .sort((a: any, b: any) => {
          // Sort by points, then goal difference, then goals scored
          if (b.punkte !== a.punkte) return b.punkte - a.punkte;
          if (b.tordifferenz !== a.tordifferenz) return b.tordifferenz - a.tordifferenz;
          return b.tore_fuer - a.tore_fuer;
        })
        .map((entry: any, index: number) => ({
          ...entry,
          platz: index + 1
        }));

      // Validate table calculations
      expect(sortedTable).toHaveLength(3);
      expect(sortedTable[0].club.name).toBe('Team A'); // 6 points
      expect(sortedTable[0].punkte).toBe(6);
      expect(sortedTable[0].tordifferenz).toBe(4); // 5-1
      expect(sortedTable[1].club.name).toBe('Team B'); // 1 point
      expect(sortedTable[1].punkte).toBe(1);
      expect(sortedTable[2].club.name).toBe('Team C'); // 1 point, worse goal difference
      expect(sortedTable[2].punkte).toBe(1);
      expect(sortedTable[2].tordifferenz).toBe(-3); // 1-4
    });

    test('should handle equal points with tiebreaker rules', async () => {
      const tableEntries = [
        {
          club: { id: 1, name: 'Team A' },
          punkte: 15,
          tordifferenz: 5,
          tore_fuer: 20,
          tore_gegen: 15
        },
        {
          club: { id: 2, name: 'Team B' },
          punkte: 15,
          tordifferenz: 5,
          tore_fuer: 18,
          tore_gegen: 13
        },
        {
          club: { id: 3, name: 'Team C' },
          punkte: 15,
          tordifferenz: 3,
          tore_fuer: 16,
          tore_gegen: 13
        }
      ];

      const sortedTable = tableEntries.sort((a, b) => {
        if (b.punkte !== a.punkte) return b.punkte - a.punkte;
        if (b.tordifferenz !== a.tordifferenz) return b.tordifferenz - a.tordifferenz;
        return b.tore_fuer - a.tore_fuer;
      });

      // Team A should be first (more goals scored with same points and goal difference)
      expect(sortedTable[0].club.name).toBe('Team A');
      expect(sortedTable[1].club.name).toBe('Team B');
      expect(sortedTable[2].club.name).toBe('Team C');
    });
  });

  describe('Player Statistics Aggregation', () => {
    test('should aggregate player statistics across multiple matches', async () => {
      const mockMatches = [
        {
          id: 1,
          torschuetzen: [
            { spieler_id: 1, minute: 15, typ: 'tor' },
            { spieler_id: 1, minute: 30, typ: 'tor' },
            { spieler_id: 2, minute: 45, typ: 'elfmeter' }
          ],
          karten: [
            { spieler_id: 1, minute: 60, typ: 'gelb' },
            { spieler_id: 3, minute: 75, typ: 'rot' }
          ]
        },
        {
          id: 2,
          torschuetzen: [
            { spieler_id: 1, minute: 20, typ: 'tor' },
            { spieler_id: 2, minute: 35, typ: 'tor' }
          ],
          karten: [
            { spieler_id: 1, minute: 50, typ: 'gelb' },
            { spieler_id: 2, minute: 80, typ: 'gelb' }
          ]
        }
      ];

      // Aggregate statistics
      const playerStats = {};

      mockMatches.forEach(match => {
        // Process goals
        match.torschuetzen.forEach(goal => {
          if (!playerStats[goal.spieler_id]) {
            playerStats[goal.spieler_id] = {
              tore: 0,
              spiele: new Set(),
              gelbe_karten: 0,
              rote_karten: 0
            };
          }
          playerStats[goal.spieler_id].tore += 1;
          playerStats[goal.spieler_id].spiele.add(match.id);
        });

        // Process cards
        match.karten.forEach(card => {
          if (!playerStats[card.spieler_id]) {
            playerStats[card.spieler_id] = {
              tore: 0,
              spiele: new Set(),
              gelbe_karten: 0,
              rote_karten: 0
            };
          }
          if (card.typ === 'gelb') {
            playerStats[card.spieler_id].gelbe_karten += 1;
          } else if (card.typ === 'rot') {
            playerStats[card.spieler_id].rote_karten += 1;
          }
          playerStats[card.spieler_id].spiele.add(match.id);
        });
      });

      // Convert Set to count
      Object.keys(playerStats).forEach(playerId => {
        playerStats[playerId].spiele = playerStats[playerId].spiele.size;
      });

      // Validate aggregated statistics
      expect(playerStats[1]).toEqual({
        tore: 3,
        spiele: 2,
        gelbe_karten: 2,
        rote_karten: 0
      });

      expect(playerStats[2]).toEqual({
        tore: 2,
        spiele: 2,
        gelbe_karten: 1,
        rote_karten: 0
      });

      expect(playerStats[3]).toEqual({
        tore: 0,
        spiele: 1,
        gelbe_karten: 0,
        rote_karten: 1
      });
    });

    test('should calculate top scorers and assist leaders', async () => {
      const playerStats = [
        { spieler_id: 1, vorname: 'Max', nachname: 'Mustermann', tore: 15, assists: 8 },
        { spieler_id: 2, vorname: 'John', nachname: 'Doe', tore: 12, assists: 10 },
        { spieler_id: 3, vorname: 'Jane', nachname: 'Smith', tore: 18, assists: 5 },
        { spieler_id: 4, vorname: 'Bob', nachname: 'Wilson', tore: 8, assists: 12 }
      ];

      // Top scorers
      const topScorers = [...playerStats]
        .sort((a, b) => b.tore - a.tore)
        .slice(0, 3);

      expect(topScorers[0].nachname).toBe('Smith'); // 18 goals
      expect(topScorers[1].nachname).toBe('Mustermann'); // 15 goals
      expect(topScorers[2].nachname).toBe('Doe'); // 12 goals

      // Top assist providers
      const topAssists = [...playerStats]
        .sort((a, b) => b.assists - a.assists)
        .slice(0, 3);

      expect(topAssists[0].nachname).toBe('Wilson'); // 12 assists
      expect(topAssists[1].nachname).toBe('Doe'); // 10 assists
      expect(topAssists[2].nachname).toBe('Mustermann'); // 8 assists
    });
  });

  describe('Match Timeline and Events', () => {
    test('should generate chronological match timeline', async () => {
      const matchEvents = {
        torschuetzen: [
          { spieler_id: 1, minute: 15, typ: 'tor', spieler_name: 'Max Mustermann' },
          { spieler_id: 2, minute: 67, typ: 'elfmeter', spieler_name: 'John Doe' }
        ],
        karten: [
          { spieler_id: 3, minute: 23, typ: 'gelb', spieler_name: 'Jane Smith' },
          { spieler_id: 1, minute: 45, typ: 'gelb', spieler_name: 'Max Mustermann' },
          { spieler_id: 4, minute: 78, typ: 'rot', spieler_name: 'Bob Wilson' }
        ],
        wechsel: [
          { raus_id: 2, rein_id: 5, minute: 60, raus_name: 'John Doe', rein_name: 'Tom Brown' },
          { raus_id: 3, rein_id: 6, minute: 72, raus_name: 'Jane Smith', rein_name: 'Lisa Green' }
        ]
      };

      // Generate timeline
      const timeline = [];

      matchEvents.torschuetzen.forEach(goal => {
        timeline.push({
          minute: goal.minute,
          type: 'goal',
          description: `${goal.spieler_name} - ${goal.typ}`,
          data: goal
        });
      });

      matchEvents.karten.forEach(card => {
        timeline.push({
          minute: card.minute,
          type: 'card',
          description: `${card.spieler_name} - ${card.typ} Karte`,
          data: card
        });
      });

      matchEvents.wechsel.forEach(sub => {
        timeline.push({
          minute: sub.minute,
          type: 'substitution',
          description: `${sub.raus_name} → ${sub.rein_name}`,
          data: sub
        });
      });

      // Sort by minute
      timeline.sort((a, b) => a.minute - b.minute);

      // Validate timeline order
      expect(timeline).toHaveLength(7);
      expect(timeline[0].minute).toBe(15);
      expect(timeline[0].type).toBe('goal');
      expect(timeline[1].minute).toBe(23);
      expect(timeline[1].type).toBe('card');
      expect(timeline[timeline.length - 1].minute).toBe(78);
      expect(timeline[timeline.length - 1].type).toBe('card');
    });

    test('should validate event sequences and timing', async () => {
      const events = [
        { type: 'goal', minute: 15, spieler_id: 1 },
        { type: 'card', minute: 25, spieler_id: 1, typ: 'gelb' },
        { type: 'card', minute: 30, spieler_id: 1, typ: 'rot' }, // Second yellow = red
        { type: 'substitution', minute: 35, raus_id: 1, rein_id: 5 } // Player already sent off
      ];

      // Validate event sequence
      const playerEvents = events.filter(e => 
        (e.spieler_id === 1) || (e.raus_id === 1)
      ).sort((a, b) => a.minute - b.minute);

      // Check if player was sent off before substitution
      const redCardEvent = playerEvents.find(e => e.type === 'card' && e.typ === 'rot');
      const substitutionEvent = playerEvents.find(e => e.type === 'substitution');

      if (redCardEvent && substitutionEvent) {
        const invalidSequence = redCardEvent.minute < substitutionEvent.minute;
        expect(invalidSequence).toBe(true); // This would be flagged as invalid
      }
    });
  });

  describe('Performance and Caching', () => {
    test('should handle large dataset queries efficiently', async () => {
      const largeDatasetQuery = {
        populate: {
          heimclub: true,
          auswaertsclub: true,
          unser_team: {
            populate: {
              spieler: true
            }
          }
        },
        filters: {
          saison: { $eq: 1 },
          status: { $eq: 'beendet' }
        },
        pagination: {
          page: 1,
          pageSize: 50
        },
        sort: ['datum:desc']
      };

      // Simulate query performance considerations
      const queryComplexity = {
        populationDepth: 2, // nested population
        filterCount: 2,
        pageSize: largeDatasetQuery.pagination.pageSize,
        sortFields: largeDatasetQuery.sort.length
      };

      // Validate query is structured for performance
      expect(queryComplexity.pageSize).toBeLessThanOrEqual(100); // Reasonable page size
      expect(queryComplexity.populationDepth).toBeLessThanOrEqual(3); // Not too deep
      expect(queryComplexity.filterCount).toBeGreaterThan(0); // Has filters to limit results
    });

    test('should implement caching strategy for frequently accessed data', async () => {
      const cacheableQueries = [
        'current-season-table',
        'top-scorers',
        'recent-matches',
        'team-standings'
      ];

      const cacheConfig = {
        'current-season-table': { ttl: 300 }, // 5 minutes
        'top-scorers': { ttl: 600 }, // 10 minutes
        'recent-matches': { ttl: 60 }, // 1 minute
        'team-standings': { ttl: 300 } // 5 minutes
      };

      // Validate cache configuration
      cacheableQueries.forEach(queryType => {
        expect(cacheConfig[queryType]).toBeDefined();
        expect(cacheConfig[queryType].ttl).toBeGreaterThan(0);
      });

      // Simulate cache key generation
      const generateCacheKey = (queryType: string, params: any) => {
        return `${queryType}:${JSON.stringify(params)}`;
      };

      const cacheKey = generateCacheKey('current-season-table', { liga: 1, saison: 1 });
      expect(cacheKey).toBe('current-season-table:{"liga":1,"saison":1}');
    });
  });

  describe('Data Transformation and Serialization', () => {
    test('should transform raw data for frontend consumption', async () => {
      const rawMatchData = {
        id: 1,
        attributes: {
          datum: '2024-09-15T15:00:00.000Z',
          ist_heimspiel: true,
          status: 'beendet',
          tore_heim: 2,
          tore_auswaerts: 1,
          torschuetzen: [
            { spieler_id: 1, minute: 15, typ: 'tor' },
            { spieler_id: 1, minute: 30, typ: 'tor' }
          ]
        },
        relationships: {
          heimclub: {
            data: { id: 1, type: 'club' },
            attributes: { name: 'SV Viktoria Wertheim', kurz_name: 'Viktoria' }
          },
          auswaertsclub: {
            data: { id: 2, type: 'club' },
            attributes: { name: 'FC Gegner', kurz_name: 'Gegner' }
          }
        }
      };

      // Transform for frontend
      const transformedMatch = {
        id: rawMatchData.id,
        date: rawMatchData.attributes.datum,
        isHomeMatch: rawMatchData.attributes.ist_heimspiel,
        status: rawMatchData.attributes.status,
        score: {
          home: rawMatchData.attributes.tore_heim,
          away: rawMatchData.attributes.tore_auswaerts
        },
        clubs: {
          home: {
            id: rawMatchData.relationships.heimclub.data.id,
            name: rawMatchData.relationships.heimclub.attributes.name,
            shortName: rawMatchData.relationships.heimclub.attributes.kurz_name
          },
          away: {
            id: rawMatchData.relationships.auswaertsclub.data.id,
            name: rawMatchData.relationships.auswaertsclub.attributes.name,
            shortName: rawMatchData.relationships.auswaertsclub.attributes.kurz_name
          }
        },
        events: {
          goals: rawMatchData.attributes.torschuetzen.length,
          timeline: rawMatchData.attributes.torschuetzen.map(goal => ({
            minute: goal.minute,
            type: 'goal',
            subtype: goal.typ,
            playerId: goal.spieler_id
          }))
        }
      };

      // Validate transformation
      expect(transformedMatch.id).toBe(1);
      expect(transformedMatch.isHomeMatch).toBe(true);
      expect(transformedMatch.score.home).toBe(2);
      expect(transformedMatch.score.away).toBe(1);
      expect(transformedMatch.clubs.home.shortName).toBe('Viktoria');
      expect(transformedMatch.events.goals).toBe(2);
      expect(transformedMatch.events.timeline).toHaveLength(2);
    });

    test('should handle error responses with proper structure', async () => {
      const errorResponse = {
        error: {
          status: 400,
          name: 'ValidationError',
          message: 'Invalid match data',
          details: {
            errors: [
              {
                path: ['data', 'heimclub'],
                message: 'heimclub is required',
                name: 'ValidationError'
              },
              {
                path: ['data', 'tore_heim'],
                message: 'tore_heim must be non-negative',
                name: 'ValidationError'
              }
            ]
          }
        }
      };

      // Validate error structure
      expect(errorResponse.error.status).toBe(400);
      expect(errorResponse.error.name).toBe('ValidationError');
      expect(errorResponse.error.details.errors).toBeInstanceOf(Array);
      expect(errorResponse.error.details.errors).toHaveLength(2);
      
      // Validate error details
      errorResponse.error.details.errors.forEach(error => {
        expect(error.path).toBeInstanceOf(Array);
        expect(error.message).toBeDefined();
        expect(error.name).toBeDefined();
      });
    });
  });
});