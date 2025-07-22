// Address component type
export interface Adresse {
  id: number;
  strasse: string;
  hausnummer: string;
  plz: string;
  ort: string;
  land?: string;
}

// Emergency contact component type
export interface Notfallkontakt {
  id: number;
  name: string;
  beziehung: string;
  telefon: string;
  email?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  confirmed: boolean;
  blocked: boolean;
  createdAt: string;
  updatedAt: string;
  mitglied?: {
    id: number;
    attributes: {
      mitgliedsnummer: string;
      vorname: string;
      nachname: string;
      email: string;
      telefon?: string;
      geburtsdatum?: string;
      adresse?: {
        data: Adresse;
      };
      notfallkontakt?: {
        data: Notfallkontakt;
      };
      mitgliedsstatus: 'aktiv' | 'inaktiv' | 'pausiert' | 'gekuendigt';
      mitgliedstyp: 'spieler' | 'trainer' | 'fan' | 'familie' | 'ehrenmitglied' | 'funktionaer';
      beitrittsdatum: string;
      austrittsdatum?: string;
      benutzerrolle: 'mitglied' | 'spieler' | 'trainer' | 'admin' | 'vorstand';
      zahlungsstatus: 'aktuell' | 'ueberfaellig' | 'mahnung_1' | 'mahnung_2' | 'inkasso';
      letzter_beitrag?: string;
      datenschutz_akzeptiert: boolean;
      newsletter_aktiv: boolean;
      bemerkungen?: string;
      profilfoto?: {
        data: {
          id: number;
          attributes: {
            url: string;
            alternativeText?: string;
            name: string;
            size: number;
            width?: number;
            height?: number;
          };
        };
      };
    };
  };
}

export interface AuthResponse {
  jwt: string;
  user: User;
}

export interface LoginCredentials {
  identifier: string; // email or username
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  // Mitgliedsdaten
  vorname: string;
  nachname: string;
  telefon?: string;
  geburtsdatum?: string;
  mitgliedstyp: 'spieler' | 'trainer' | 'fan' | 'familie' | 'ehrenmitglied' | 'funktionaer';
  datenschutz_akzeptiert: boolean;
  newsletter_aktiv?: boolean;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: ProfileUpdateData) => Promise<void>;
  updateMemberProfile: (data: MemberProfileUpdateData) => Promise<void>;
  uploadProfilePhoto: (file: File) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (role: string | string[]) => boolean;
  isMemberType: (type: string | string[]) => boolean;
}

export interface AuthError {
  message: string;
  details?: any;
}

// Protected Route Types
export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  requiredMemberType?: string | string[];
  fallback?: React.ReactNode;
}

// Profile Update Types
export interface ProfileUpdateData {
  username?: string;
  email?: string;
}

export interface MemberProfileUpdateData {
  vorname?: string;
  nachname?: string;
  email?: string;
  telefon?: string;
  geburtsdatum?: string;
  newsletter_aktiv?: boolean;
  adresse?: Partial<Adresse>;
  notfallkontakt?: Partial<Notfallkontakt>;
  bemerkungen?: string;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

// Profile form validation schemas
export interface ProfileFormData extends MemberProfileUpdateData {
  username?: string;
  email?: string;
}

// Profile tabs type
export type ProfileTab = 'personal' | 'contact' | 'membership' | 'security' | 'preferences';

// Form state types
export interface FormState {
  loading: boolean;
  error: string | null;
  success: string | null;
} 