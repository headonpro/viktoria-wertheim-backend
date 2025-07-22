/**
 * complex-queries router
 * Custom API endpoints for complex data queries and aggregations
 */

export default {
  routes: [
    // League table endpoints
    {
      method: 'GET',
      path: '/complex-queries/league-table/:ligaId',
      handler: 'complex-queries.getLeagueTable',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/complex-queries/league-table/:ligaId/standings',
      handler: 'complex-queries.getLeagueStandings',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    
    // Player statistics endpoints
    {
      method: 'GET',
      path: '/complex-queries/player-stats/:playerId',
      handler: 'complex-queries.getPlayerStatistics',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/complex-queries/player-stats/team/:teamId',
      handler: 'complex-queries.getTeamPlayerStatistics',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/complex-queries/player-stats/season/:saisonId',
      handler: 'complex-queries.getSeasonPlayerStatistics',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/complex-queries/top-scorers/:saisonId',
      handler: 'complex-queries.getTopScorers',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    
    // Match timeline and events endpoints
    {
      method: 'GET',
      path: '/complex-queries/match/:matchId/timeline',
      handler: 'complex-queries.getMatchTimeline',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/complex-queries/match/:matchId/events',
      handler: 'complex-queries.getMatchEvents',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/complex-queries/matches/recent/:teamId',
      handler: 'complex-queries.getRecentMatches',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/complex-queries/matches/upcoming/:teamId',
      handler: 'complex-queries.getUpcomingMatches',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    
    // Team roster and formation endpoints
    {
      method: 'GET',
      path: '/complex-queries/team/:teamId/roster',
      handler: 'complex-queries.getTeamRoster',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/complex-queries/team/:teamId/formation',
      handler: 'complex-queries.getTeamFormation',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/complex-queries/team/:teamId/squad-overview',
      handler: 'complex-queries.getSquadOverview',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};