import { AuthService } from './auth';
import { strapi, API_ENDPOINTS } from './strapi';
import { getApiUrl } from './apiConfig';

const API_URL = getApiUrl();

interface CreateMemberData {
  // User-Daten
  username: string;
  email: string;
  password: string;
  // Mitglied-Daten
  vorname: string;
  nachname: string;
  telefon?: string;
  geburtsdatum?: string;
  mitgliedstyp: 'spieler' | 'trainer' | 'fan' | 'familie' | 'ehrenmitglied' | 'funktionaer';
  benutzerrolle?: 'mitglied' | 'spieler' | 'trainer' | 'admin' | 'vorstand';
  mitgliedsnummer?: string;
  beitrittsdatum?: string;
  adresse?: {
    strasse: string;
    hausnummer: string;
    plz: string;
    ort: string;
    land: string;
  };
  notfallkontakt?: {
    name: string;
    telefon: string;
    beziehung: string;
  };
  bemerkungen?: string;
}

interface MemberWithUser {
  id: number;
  mitgliedsnummer: string;
  vorname: string;
  nachname: string;
  email: string;
  telefon?: string;
  geburtsdatum?: string;
  mitgliedstyp: string;
  benutzerrolle: string;
  mitgliedsstatus: string;
  beitrittsdatum: string;
  adresse?: any;
  notfallkontakt?: any;
  user?: {
    id: number;
    username: string;
    email: string;
    confirmed: boolean;
    blocked: boolean;
    role: {
      id: number;
      name: string;
      type: string;
    };
  };
}

interface TeamData {
  name: string;
  liga?: string;
  altersgruppe?: string;
  status: 'aktiv' | 'inaktiv' | 'aufgeloest';
  beschreibung?: string;
  gruendungsjahr?: number;
  maxMitglieder?: number;
}

interface PlayerData {
  vorname: string;
  nachname: string;
  position: string;
  rueckennummer?: number;
  mannschaft: number;
  mitglied?: number;
  status: 'aktiv' | 'verletzt' | 'gesperrt' | 'inaktiv';
  foto?: any;
}

export const adminApi = {
  // === MITGLIEDER-MANAGEMENT ===
  
  // Erstelle neues Mitglied mit User-Account
  async createMemberWithUser(data: CreateMemberData) {
    const token = AuthService.getToken();
    
    try {
      const response = await strapi.post(`${API_ENDPOINTS.mitglieder}/register`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Fehler beim Erstellen des Mitglieds';
      throw new Error(errorMessage);
    }
  },

  // Hole alle Mitglieder mit User-Informationen
  async getAllMembersWithUsers(): Promise<{ success: boolean; members: MemberWithUser[] }> {
    const token = AuthService.getToken();
    
    try {
      const response = await strapi.get(API_ENDPOINTS.mitglieder, {
        params: {
          populate: {
            user: {
              populate: ['role']
            },
            adresse: true,
            notfallkontakt: true
          }
        },
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      return {
        success: true,
        members: response.data?.data || []
      };
    } catch (error) {
      throw new Error('Fehler beim Abrufen der Mitglieder');
    }
  },

  // Aktualisiere Mitglied
  async updateMember(id: number, data: Partial<CreateMemberData>) {
    const token = AuthService.getToken();
    
    try {
      const response = await strapi.put(`${API_ENDPOINTS.mitglieder}/${id}`, {
        data: data
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Fehler beim Aktualisieren des Mitglieds';
      throw new Error(errorMessage);
    }
  },

  // Lösche Mitglied mit User-Account
  async deleteMemberWithUser(id: number) {
    const token = AuthService.getToken();
    
    try {
      const response = await strapi.delete(`${API_ENDPOINTS.mitglieder}/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Fehler beim Löschen des Mitglieds';
      throw new Error(errorMessage);
    }
  },

  // === MANNSCHAFTEN-MANAGEMENT ===

  // Erstelle neue Mannschaft
  async createTeam(data: TeamData) {
    const token = AuthService.getToken();
    
    try {
      const response = await strapi.post(API_ENDPOINTS.mannschaften, {
        data: data
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Fehler beim Erstellen der Mannschaft';
      throw new Error(errorMessage);
    }
  },

  // Hole alle Mannschaften
  async getAllTeams() {
    const token = AuthService.getToken();
    
    try {
      const response = await strapi.get(API_ENDPOINTS.mannschaften, {
        params: {
          populate: {
            trainer_mannschaften: {
              populate: ['mitglied']
            },
            spieler: {
              populate: ['mitglied']
            },
            teamfoto: true
          }
        },
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      return response.data?.data || [];
    } catch (error) {
      throw new Error('Fehler beim Abrufen der Mannschaften');
    }
  },

  // Aktualisiere Mannschaft
  async updateTeam(id: number, data: Partial<TeamData>) {
    const token = AuthService.getToken();
    
    try {
      const response = await strapi.put(`${API_ENDPOINTS.mannschaften}/${id}`, {
        data: data
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Fehler beim Aktualisieren der Mannschaft';
      throw new Error(errorMessage);
    }
  },

  // Lösche Mannschaft
  async deleteTeam(id: number) {
    const token = AuthService.getToken();
    
    try {
      const response = await strapi.delete(`${API_ENDPOINTS.mannschaften}/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Fehler beim Löschen der Mannschaft';
      throw new Error(errorMessage);
    }
  },

  // === SPIELER-MANAGEMENT ===

  // Erstelle neuen Spieler
  async createPlayer(data: PlayerData) {
    const token = AuthService.getToken();
    
    try {
      const response = await strapi.post('/spielers', {
        data: data
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Fehler beim Erstellen des Spielers';
      throw new Error(errorMessage);
    }
  },

  // Hole alle Spieler
  async getAllPlayers() {
    const token = AuthService.getToken();
    
    try {
      const response = await strapi.get('/spielers', {
        params: {
          populate: {
            mannschaft: true,
            mitglied: true,
            foto: true
          }
        },
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      return response.data?.data || [];
    } catch (error) {
      throw new Error('Fehler beim Abrufen der Spieler');
    }
  },

  // Aktualisiere Spieler
  async updatePlayer(id: number, data: Partial<PlayerData>) {
    const token = AuthService.getToken();
    
    try {
      const response = await strapi.put(`${API_ENDPOINTS.spieler}/${id}`, {
        data: data
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Fehler beim Aktualisieren des Spielers';
      throw new Error(errorMessage);
    }
  },

  // Lösche Spieler
  async deletePlayer(id: number) {
    const token = AuthService.getToken();
    
    try {
      const response = await strapi.delete(`${API_ENDPOINTS.spieler}/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Fehler beim Löschen des Spielers';
      throw new Error(errorMessage);
    }
  },

  // === STATISTIKEN ===

  // Hole Dashboard-Statistiken
  async getDashboardStats() {
    const token = AuthService.getToken();
    
    try {
      const [membersRes, teamsRes, playersRes, trainingsRes] = await Promise.all([
        strapi.get(API_ENDPOINTS.mitglieder, { 
          params: { pagination: { pageSize: 1 } },
          headers: { Authorization: `Bearer ${token}` }
        }),
        strapi.get(API_ENDPOINTS.mannschaften, { 
          params: { pagination: { pageSize: 1 } },
          headers: { Authorization: `Bearer ${token}` }
        }),
        strapi.get('/spielers', { 
          params: { pagination: { pageSize: 1 } },
          headers: { Authorization: `Bearer ${token}` }
        }),
        strapi.get(API_ENDPOINTS.trainings, { 
          params: { pagination: { pageSize: 1 } },
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      return {
        totalMembers: membersRes.data?.meta?.pagination?.total || 0,
        totalTeams: teamsRes.data?.meta?.pagination?.total || 0,
        totalPlayers: playersRes.data?.meta?.pagination?.total || 0,
        totalTrainings: trainingsRes.data?.meta?.pagination?.total || 0
      };
    } catch (error) {
      throw new Error('Fehler beim Abrufen der Statistiken');
    }
  }
};

export type { CreateMemberData, MemberWithUser, TeamData, PlayerData }; 