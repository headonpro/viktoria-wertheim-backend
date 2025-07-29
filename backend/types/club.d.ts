/**
 * Club type definitions
 */

export interface Club {
  id: number;
  documentId: string;
  name: string;
  kurz_name?: string;
  logo?: {
    id: number;
    url: string;
    alternativeText?: string;
  };
  gruendungsjahr?: number;
  vereinsfarben?: string;
  heimstadion?: string;
  adresse?: string;
  website?: string;
  club_typ: 'viktoria_verein' | 'gegner_verein';
  viktoria_team_mapping?: 'team_1' | 'team_2' | 'team_3';
  ligen: Liga[];
  aktiv: boolean;
  heim_spiele?: Spiel[];
  gast_spiele?: Spiel[];
  tabellen_eintraege?: TabellenEintrag[];
  createdAt: string;
  updatedAt: string;
}

export interface ClubData {
  name: string;
  kurz_name?: string;
  logo?: number;
  gruendungsjahr?: number;
  vereinsfarben?: string;
  heimstadion?: string;
  adresse?: string;
  website?: string;
  club_typ: 'viktoria_verein' | 'gegner_verein';
  viktoria_team_mapping?: 'team_1' | 'team_2' | 'team_3';
  ligen?: number[];
  aktiv?: boolean;
}

export interface ClubValidationResult {
  isValid: boolean;
  errors: string[];
}

export enum ClubType {
  VIKTORIA_VEREIN = 'viktoria_verein',
  GEGNER_VEREIN = 'gegner_verein'
}

export enum TeamMapping {
  TEAM_1 = 'team_1',
  TEAM_2 = 'team_2',
  TEAM_3 = 'team_3'
}

export enum ClubErrorType {
  CLUB_NOT_FOUND = 'club_not_found',
  CLUB_NOT_IN_LIGA = 'club_not_in_liga',
  DUPLICATE_CLUB_NAME = 'duplicate_club_name',
  INVALID_VIKTORIA_MAPPING = 'invalid_viktoria_mapping',
  CLUB_INACTIVE = 'club_inactive'
}

export interface ClubValidationError {
  type: ClubErrorType;
  message: string;
  clubId?: number;
  clubName?: string;
  ligaId?: number;
  details: any;
}