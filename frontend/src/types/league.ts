// League/Team related types

export interface Team {
  position: number
  name: string
  logo?: string
  games: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

export interface LeagueStandingsState {
  teams: Team[]
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

// API Response types (Strapi specific)
export interface StrapiLeaderboardEntry {
  id: number
  attributes: {
    position: number
    teamname: string
    spiele: number
    siege: number
    unentschieden: number
    niederlagen: number
    tore: number
    gegentore: number
    tordifferenz: number
    punkte: number
    logo?: {
      data?: {
        attributes: {
          url: string
          name: string
          alternativeText?: string
        }
      }
    }
    createdAt: string
    updatedAt: string
    publishedAt: string
  }
}

export interface StrapiResponse<T> {
  data: T[]
  meta: {
    pagination: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}