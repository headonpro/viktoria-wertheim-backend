/**
 * Liga type definitions
 */

export interface Liga {
  id: number;
  documentId: string;
  name: string;
  kurz_name?: string;
  aktiv: boolean;
  clubs?: Club[];
  spiele?: Spiel[];
  tabellen_eintraege?: TabellenEintrag[];
  createdAt: string;
  updatedAt: string;
}

export interface LigaData {
  name: string;
  kurz_name?: string;
  aktiv?: boolean;
  clubs?: number[];
}

export interface LigaValidationResult {
  isValid: boolean;
  errors: string[];
}

export enum LigaErrorType {
  LIGA_NOT_FOUND = 'liga_not_found',
  LIGA_INACTIVE = 'liga_inactive',
  DUPLICATE_LIGA_NAME = 'duplicate_liga_name'
}

export interface LigaValidationError {
  type: LigaErrorType;
  message: string;
  ligaId?: number;
  ligaName?: string;
  details: any;
}