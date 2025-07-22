/**
 * Data transformers for complex queries
 * Handles data transformation and serialization for frontend consumption
 */

export interface TransformedLeagueTable {
  id: number;
  position: number;
  club: {
    id: number;
    name: string;
    shortName: string;
    logo?: string;
  };
  stats: {
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
  };
  form: {
    recent: string[];
    points: number;
    trend: 'up' | 'down' | 'stable';
  };
  performance: {
    winPercentage: number;
    pointsPerGame: number;
    goalsPerGame: number;
    goalsConcededPerGame: number;
  };
}

export interface TransformedPlayerStats {
  id: number;
  player: {
    id: number;
    firstName: string;
    lastName: string;
    fullName: string;
    position?: string;
    jerseyNumber?: number;
    photo?: string;
  };
  team: {
    id: number;
    name: string;
    club: string;
  };
  season: {
    id: number;
    name: string;
  };
  stats: {
    appearances: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    minutesPlayed: number;
  };
  performance: {
    goalsPerGame: number;
    minutesPerGoal: number;
    disciplineScore: number;
    rating: number;
  };
}

export interface TransformedMatchEvent {
  id: string;
  minute: number;
  type: 'goal' | 'card' | 'substitution';
  player: {
    id: number;
    name: string;
    jerseyNumber?: number;
  };
  team: 'home' | 'away';
  details: {
    cardType?: 'yellow' | 'red';
    goalType?: 'regular' | 'penalty' | 'own_goal';
    substitution?: {
      playerOut: { id: number; name: string };
      playerIn: { id: number; name: string };
    };
  };
}

export interface TransformedMatch {
  id: number;
  date: string;
  status: 'scheduled' | 'live' | 'finished' | 'cancelled';
  homeTeam: {
    id: number;
    name: string;
    logo?: string;
    score?: number;
  };
  awayTeam: {
    id: number;
    name: string;
    logo?: string;
    score?: number;
  };
  venue?: string;
  referee?: string;
  league: {
    id: number;
    name: string;
  };
  events?: TransformedMatchEvent[];
}

export interface TransformedTeamRoster {
  team: {
    id: number;
    name: string;
    club: string;
    league: string;
    season: string;
  };
  players: {
    goalkeepers: TransformedPlayerStats[];
    defenders: TransformedPlayerStats[];
    midfielders: TransformedPlayerStats[];
    forwards: TransformedPlayerStats[];
    other: TransformedPlayerStats[];
  };
  summary: {
    totalPlayers: number;
    averageAge: number;
    availablePlayers: number;
    injuredPlayers: number;
  };
}

/**
 * Transform league table data for frontend consumption
 */
export function transformLeagueTable(entries: any[]): TransformedLeagueTable[] {
  return entries.map(entry => ({
    id: entry.id,
    position: entry.platz,
    club: {
      id: entry.club.id,
      name: entry.club.name,
      shortName: entry.club.kurz_name || entry.club.name,
      logo: entry.club.logo?.url
    },
    stats: {
      played: entry.spiele,
      won: entry.siege,
      drawn: entry.unentschieden,
      lost: entry.niederlagen,
      goalsFor: entry.tore_fuer,
      goalsAgainst: entry.tore_gegen,
      goalDifference: entry.tordifferenz,
      points: entry.punkte
    },
    form: {
      recent: entry.form_letzte_5 || [],
      points: entry.statistics?.formPoints || 0,
      trend: entry.trend || 'stable'
    },
    performance: {
      winPercentage: entry.statistics?.winPercentage || 0,
      pointsPerGame: entry.statistics?.pointsPerGame || 0,
      goalsPerGame: entry.statistics?.goalsPerGame || 0,
      goalsConcededPerGame: entry.statistics?.goalsConcededPerGame || 0
    }
  }));
}

/**
 * Transform player statistics for frontend consumption
 */
export function transformPlayerStats(stats: any): TransformedPlayerStats {
  const player = stats.spieler || stats.player;
  const member = player?.mitglied;
  
  return {
    id: stats.id,
    player: {
      id: player?.id || 0,
      firstName: member?.vorname || player?.vorname || '',
      lastName: member?.nachname || player?.nachname || '',
      fullName: `${member?.vorname || player?.vorname || ''} ${member?.nachname || player?.nachname || ''}`.trim(),
      position: player?.position,
      jerseyNumber: player?.rueckennummer,
      photo: player?.spielerfoto?.url
    },
    team: {
      id: stats.team?.id || 0,
      name: stats.team?.name || '',
      club: stats.team?.club?.name || ''
    },
    season: {
      id: stats.saison?.id || 0,
      name: stats.saison?.name || ''
    },
    stats: {
      appearances: stats.spiele || 0,
      goals: stats.tore || 0,
      assists: stats.assists || 0,
      yellowCards: stats.gelbe_karten || 0,
      redCards: stats.rote_karten || 0,
      minutesPlayed: stats.minuten_gespielt || 0
    },
    performance: {
      goalsPerGame: stats.performance?.goalsPerGame || 0,
      minutesPerGoal: stats.performance?.minutesPerGoal || 0,
      disciplineScore: stats.performance?.disciplineScore || 10,
      rating: stats.performance?.rating || 0
    }
  };
}

/**
 * Transform multiple player statistics
 */
export function transformPlayerStatsList(statsList: any[]): TransformedPlayerStats[] {
  return statsList.map(transformPlayerStats);
}

/**
 * Transform match events for frontend consumption
 */
export function transformMatchEvents(events: any, match: any): TransformedMatchEvent[] {
  const transformedEvents: TransformedMatchEvent[] = [];
  
  // Ensure events is an object, not an array
  const eventsObj = Array.isArray(events) ? {} : events || {};
  
  // Transform goals
  if (eventsObj.goals && Array.isArray(eventsObj.goals)) {
    eventsObj.goals.forEach((goal: any, index: number) => {
      transformedEvents.push({
        id: `goal-${index}`,
        minute: goal.minute || 0,
        type: 'goal',
        player: {
          id: goal.spieler_id || 0,
          name: goal.spieler_name || 'Unknown',
          jerseyNumber: goal.rueckennummer
        },
        team: determineTeamSide(goal.spieler_id, match),
        details: {
          goalType: goal.typ || 'regular'
        }
      });
    });
  }
  
  // Transform cards
  if (eventsObj.cards && Array.isArray(eventsObj.cards)) {
    eventsObj.cards.forEach((card: any, index: number) => {
      transformedEvents.push({
        id: `card-${index}`,
        minute: card.minute || 0,
        type: 'card',
        player: {
          id: card.spieler_id || 0,
          name: card.spieler_name || 'Unknown',
          jerseyNumber: card.rueckennummer
        },
        team: determineTeamSide(card.spieler_id, match),
        details: {
          cardType: card.typ || 'yellow'
        }
      });
    });
  }
  
  // Transform substitutions
  if (eventsObj.substitutions && Array.isArray(eventsObj.substitutions)) {
    eventsObj.substitutions.forEach((sub: any, index: number) => {
      transformedEvents.push({
        id: `sub-${index}`,
        minute: sub.minute || 0,
        type: 'substitution',
        player: {
          id: sub.rein_id || 0,
          name: sub.rein_name || 'Unknown'
        },
        team: determineTeamSide(sub.rein_id, match),
        details: {
          substitution: {
            playerOut: {
              id: sub.raus_id || 0,
              name: sub.raus_name || 'Unknown'
            },
            playerIn: {
              id: sub.rein_id || 0,
              name: sub.rein_name || 'Unknown'
            }
          }
        }
      });
    });
  }
  
  return transformedEvents.sort((a, b) => a.minute - b.minute);
}

/**
 * Transform match data for frontend consumption
 */
export function transformMatch(match: any): TransformedMatch {
  return {
    id: match.id,
    date: match.datum,
    status: transformMatchStatus(match.status),
    homeTeam: {
      id: match.heimclub?.id || 0,
      name: match.heimclub?.name || '',
      logo: match.heimclub?.logo?.url,
      score: match.tore_heim
    },
    awayTeam: {
      id: match.auswaertsclub?.id || 0,
      name: match.auswaertsclub?.name || '',
      logo: match.auswaertsclub?.logo?.url,
      score: match.tore_auswaerts
    },
    venue: match.spielort,
    referee: match.schiedsrichter,
    league: {
      id: match.liga?.id || 0,
      name: match.liga?.name || ''
    }
  };
}

/**
 * Transform team roster for frontend consumption
 */
export function transformTeamRoster(roster: any): TransformedTeamRoster {
  const playersByPosition = groupPlayersByPosition(roster.roster || []);
  
  return {
    team: {
      id: roster.team?.id || 0,
      name: roster.team?.name || '',
      club: roster.team?.club?.name || '',
      league: roster.team?.liga?.name || '',
      season: roster.team?.saison?.name || ''
    },
    players: {
      goalkeepers: playersByPosition.goalkeepers.map(transformPlayerFromRoster),
      defenders: playersByPosition.defenders.map(transformPlayerFromRoster),
      midfielders: playersByPosition.midfielders.map(transformPlayerFromRoster),
      forwards: playersByPosition.forwards.map(transformPlayerFromRoster),
      other: playersByPosition.other.map(transformPlayerFromRoster)
    },
    summary: {
      totalPlayers: roster.summary?.totalPlayers || 0,
      averageAge: roster.summary?.averageAge || 0,
      availablePlayers: roster.summary?.availablePlayers || 0,
      injuredPlayers: (roster.roster || []).filter((p: any) => p.status === 'verletzt').length
    }
  };
}

/**
 * Create paginated response structure
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number = 1,
  limit: number = 25,
  total?: number
) {
  const actualTotal = total || data.length;
  const totalPages = Math.ceil(actualTotal / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  return {
    data,
    pagination: {
      page,
      limit,
      total: actualTotal,
      totalPages,
      hasNextPage,
      hasPrevPage
    }
  };
}

/**
 * Create cached response with metadata
 */
export function createCachedResponse<T>(
  data: T,
  cacheKey: string,
  ttl: number = 300 // 5 minutes default
) {
  return {
    data,
    meta: {
      cached: true,
      cacheKey,
      ttl,
      generatedAt: new Date().toISOString()
    }
  };
}

/**
 * Optimize query response by removing unnecessary fields
 */
export function optimizeQueryResponse(data: any, fields?: string[]): any {
  if (!fields || fields.length === 0) {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => pickFields(item, fields));
  }
  
  return pickFields(data, fields);
}

/**
 * Add performance metrics to response
 */
export function addPerformanceMetrics<T>(
  data: T,
  startTime: number,
  queryCount: number = 0
) {
  const executionTime = Date.now() - startTime;
  
  return {
    data,
    performance: {
      executionTime: `${executionTime}ms`,
      queryCount,
      timestamp: new Date().toISOString()
    }
  };
}

// Helper functions

function determineTeamSide(playerId: number, match: any): 'home' | 'away' {
  // This would need to be implemented based on team roster data
  // For now, return 'home' as default
  return 'home';
}

function transformMatchStatus(status: string): 'scheduled' | 'live' | 'finished' | 'cancelled' {
  switch (status) {
    case 'geplant': return 'scheduled';
    case 'laufend': return 'live';
    case 'beendet': return 'finished';
    case 'abgesagt': return 'cancelled';
    default: return 'scheduled';
  }
}

function groupPlayersByPosition(players: any[]) {
  return {
    goalkeepers: players.filter(p => p.position?.toLowerCase().includes('tor')),
    defenders: players.filter(p => p.position?.toLowerCase().includes('verteidiger')),
    midfielders: players.filter(p => p.position?.toLowerCase().includes('mittelfeld')),
    forwards: players.filter(p => p.position?.toLowerCase().includes('sturm')),
    other: players.filter(p => !p.position || p.position === '')
  };
}

function transformPlayerFromRoster(player: any): TransformedPlayerStats {
  const member = player.mitglied;
  
  return {
    id: player.id,
    player: {
      id: player.id,
      firstName: member?.vorname || '',
      lastName: member?.nachname || '',
      fullName: `${member?.vorname || ''} ${member?.nachname || ''}`.trim(),
      position: player.position,
      jerseyNumber: player.rueckennummer,
      photo: player.spielerfoto?.url
    },
    team: {
      id: player.hauptteam?.id || 0,
      name: player.hauptteam?.name || '',
      club: player.hauptteam?.club?.name || ''
    },
    season: {
      id: 0,
      name: ''
    },
    stats: {
      appearances: player.statistics?.spiele || 0,
      goals: player.statistics?.tore || 0,
      assists: player.statistics?.assists || 0,
      yellowCards: player.statistics?.gelbe_karten || 0,
      redCards: player.statistics?.rote_karten || 0,
      minutesPlayed: player.statistics?.minuten_gespielt || 0
    },
    performance: {
      goalsPerGame: 0,
      minutesPerGoal: 0,
      disciplineScore: 10,
      rating: 0
    }
  };
}

function pickFields(obj: any, fields: string[]): any {
  const result: any = {};
  
  fields.forEach(field => {
    if (field.includes('.')) {
      // Handle nested fields
      const [parent, ...nested] = field.split('.');
      if (obj[parent]) {
        if (!result[parent]) result[parent] = {};
        result[parent] = { ...result[parent], ...pickFields(obj[parent], [nested.join('.')]) };
      }
    } else {
      if (obj.hasOwnProperty(field)) {
        result[field] = obj[field];
      }
    }
  });
  
  return result;
}