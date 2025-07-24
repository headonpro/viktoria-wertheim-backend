import axios from 'axios';
import { getApiUrl } from './apiConfig';

const API_URL = getApiUrl();
const API_TOKEN = process.env.NEXT_PUBLIC_STRAPI_API_TOKEN;

export const strapi = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
    ...(API_TOKEN && { Authorization: `Bearer ${API_TOKEN}` }),
  },
});

// API-Endpunkte für Content Types
export const API_ENDPOINTS = {
  // Content Types
  mitglieder: '/mitglieder',
  mannschaften: '/mannschaften',
  spielers: '/spielers',
  // spiele: '/spiele', // removed since Spiel content type was removed
  trainings: '/trainings',
  kategorien: '/kategorien',
  newsArtikel: '/news-artikels',
  
  // Custom Endpoints
  mannschaft: {
    withTrainers: '/mannschaften/with-trainers',
    active: '/mannschaften/active',
    byAgeGroup: (altersklasse: string) => `/mannschaften/age-group/${altersklasse}`,
    details: (id: number) => `/mannschaften/${id}/details`
  },
  
  spieler: {
    stats: (id: number) => `/spielers/${id}/stats`,
    byTeam: (teamId: number) => `/spielers/team/${teamId}`,
    topScorers: '/spielers/top-scorers',
    byPosition: (position: string) => `/spielers/position/${position}`,
    injured: '/spielers/injured'
  },
  
  training: {
    create: '/trainings/create-training',
    byTeam: (teamId: number) => `/trainings/by-team/${teamId}`,
    upcoming: '/trainings/upcoming',
    attendance: (id: number) => `/trainings/${id}/attendance`,
    complete: (id: number) => `/trainings/${id}/complete`,
    byTrainer: (trainerId: number) => `/trainings/by-trainer/${trainerId}`
  },

  mitglied: {
    register: '/mitglieder/register',
    profile: '/mitglieder/profile',
    updateProfile: '/mitglieder/update-profile'
  }
} as const;

// Typen für API-Responses
export interface StrapiResponse<T> {
  data: T;
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface StrapiEntity {
  id: number;
  attributes: Record<string, any>;
}

// Erweiterte Hilfsfunktionen für API-Calls
export const apiRequest = {
  get: <T>(endpoint: string, params?: Record<string, any>) =>
    strapi.get<StrapiResponse<T>>(endpoint, { params }),
  
  post: <T>(endpoint: string, data: any) =>
    strapi.post<StrapiResponse<T>>(endpoint, { data }),
  
  put: <T>(endpoint: string, data: any) =>
    strapi.put<StrapiResponse<T>>(endpoint, { data }),
  
  delete: <T>(endpoint: string) =>
    strapi.delete<StrapiResponse<T>>(endpoint),

  // Custom endpoint calls (ohne /data wrapper)
  customGet: <T>(endpoint: string, params?: Record<string, any>) =>
    strapi.get<T>(endpoint, { params }),
  
  customPost: <T>(endpoint: string, data: any) =>
    strapi.post<T>(endpoint, data),
  
  customPut: <T>(endpoint: string, data: any) =>
    strapi.put<T>(endpoint, data),
}; 