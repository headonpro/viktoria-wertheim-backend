// Strapi 5 Block Content Type
export interface StrapiBlock {
  type: string;
  children: Array<{
    type: string;
    text: string;
  }>;
}

export interface NewsArtikel {
  id: number;
  documentId?: string;
  titel?: string;
  inhalt?: StrapiBlock[] | string; // Support both formats
  datum?: string;
  autor?: string;
  titelbild?: {
    id: number;
    documentId?: string;
    name: string;
    alternativeText?: string;
    caption?: string;
    width: number;
    height: number;
    formats?: any;
    hash: string;
    ext: string;
    mime: string;
    size: number;
    url: string;
    previewUrl?: string;
    provider: string;
    provider_metadata?: any;
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
    data?: {
      attributes: {
        url: string;
        alternativeText?: string;
        caption?: string;
        width: number;
        height: number;
      };
    };
  };
  kategorie?: {
    id: number;
    documentId?: string;
    name?: string;
    beschreibung?: string;
    farbe?: string;
    reihenfolge?: number;
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
    data?: {
      attributes: {
        name: string;
      };
    };
  };
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  // Legacy format support
  attributes?: {
    titel: string;
    inhalt: StrapiBlock[] | string;
    datum: string;
    autor?: string;
    titelbild?: {
      data?: {
        attributes: {
          url: string;
          alternativeText?: string;
          caption?: string;
          width: number;
          height: number;
        };
      };
    };
    kategorie?: {
      data?: {
        attributes: {
          name: string;
        };
      };
    };
    publishedAt: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface Kategorie {
  id: number;
  documentId?: string;
  name?: string;
  beschreibung?: string;
  farbe?: string;
  reihenfolge?: number;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  // Legacy format support
  attributes?: {
    name: string;
    publishedAt: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface Spieler {
  id: number;
  attributes: {
    position: 'torwart' | 'abwehr' | 'mittelfeld' | 'sturm';
    rueckennummer?: number;
    tore_saison: number;
    spiele_saison: number;
    gelbe_karten?: number;
    rote_karten?: number;
    status?: 'aktiv' | 'verletzt' | 'gesperrt' | 'pausiert' | 'inaktiv';
    hauptposition?: string;
    assists?: number;
    einsatzminuten?: number;
    spielerfoto?: {
      data: {
        id: number;
        attributes: {
          url: string;
          alternativeText?: string;
          caption?: string;
          width: number;
          height: number;
        };
      };
    };
    mitglied?: {
      data: {
        id: number;
        attributes: {
          vorname: string;
          nachname: string;
          email: string;
        };
      };
    };
    mannschaft?: {
      data: {
        id: number;
        attributes: {
          name: string;
        };
      };
    };
    publishedAt: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface Mannschaft {
  id: number;
  attributes: {
    name: string;
    trainer?: string;
    liga?: string;
    // New fields for team management
    tabellenplatz?: number;
    punkte?: number;
    spiele_gesamt?: number;
    siege?: number;
    unentschieden?: number;
    niederlagen?: number;
    tore_fuer?: number;
    tore_gegen?: number;
    tordifferenz?: number;
    form_letzte_5?: ('S' | 'U' | 'N')[];
    trend?: 'steigend' | 'gleich' | 'fallend';
    liga_vollname?: string;
    altersklasse?: string;
    teamfoto?: {
      data: {
        id: number;
        attributes: {
          url: string;
          alternativeText?: string;
          caption?: string;
          width: number;
          height: number;
        };
      };
    };
    spielers?: {
      data: Spieler[];
    };
    spiele?: {
      data: Spiel[];
    };
    publishedAt: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface Spiel {
  id: number;
  attributes: {
    datum: string;
    heimmannschaft?: {
      data: {
        id: number;
        attributes: {
          name: string;
        };
      };
    };
    auswaertsmannschaft?: {
      data: {
        id: number;
        attributes: {
          name: string;
        };
      };
    };
    tore_heim?: number;
    tore_auswaerts?: number;
    spielort?: string;
    liga?: string;
    spieltag?: number;
    saison?: string;
    status: 'geplant' | 'live' | 'beendet' | 'abgesagt' | 'verschoben';
    spielbericht?: string;
    zuschauer?: number;
    wetter?: 'sonnig' | 'bewoelkt' | 'regen' | 'schnee' | 'wind';
    schiedsrichter?: string;
    bemerkungen?: string;
    // New fields for match events
    torschuetzen?: Array<{
      minute: number;
      player: string;
      team: 'home' | 'away';
    }>;
    gelbe_karten?: Array<{
      minute: number;
      player: string;
      team: 'home' | 'away';
    }>;
    rote_karten?: Array<{
      minute: number;
      player: string;
      team: 'home' | 'away';
    }>;
    letztes_aufeinandertreffen?: {
      date: string;
      result: string;
      location: 'heim' | 'auswaerts';
    };
    publishedAt: string;
    createdAt: string;
    updatedAt: string;
  };
}

// Enhanced interfaces for team management system
export interface TeamData {
  id: number;
  name: string;
  liga: string;
  liga_vollname: string;
  tabellenplatz: number;
  punkte: number;
  spiele_gesamt: number;
  siege: number;
  unentschieden: number;
  niederlagen: number;
  tore_fuer: number;
  tore_gegen: number;
  tordifferenz: number;
  form_letzte_5: ('S' | 'U' | 'N')[];
  trend: 'steigend' | 'gleich' | 'fallend';
  status?: 'aktiv' | 'inaktiv' | 'pausiert';
  trainer?: string;
  altersklasse?: string;
}

export interface GameDetails {
  id: number;
  type: 'last' | 'next';
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  date: string;
  time: string;
  isHome: boolean;
  stadium: string;
  referee: string;
  status: 'geplant' | 'live' | 'beendet' | 'abgesagt' | 'verschoben';
  goalScorers: Array<{
    minute: number;
    player: string;
    team: 'home' | 'away';
  }>;
  yellowCards: Array<{
    minute: number;
    player: string;
    team: 'home' | 'away';
  }>;
  redCards: Array<{
    minute: number;
    player: string;
    team: 'home' | 'away';
  }>;
  lastMeeting?: {
    date: string;
    result: string;
    location: 'heim' | 'auswaerts';
  };
}

// Team selection types
export type TeamId = '1' | '2' | '3';

export interface TeamStats {
  punkte: number;
  spiele_gesamt: number;
  siege: number;
  unentschieden: number;
  niederlagen: number;
  tore_fuer: number;
  tore_gegen: number;
  tordifferenz: number;
}