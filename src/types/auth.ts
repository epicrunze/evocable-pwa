export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  expiresAt: string | null;
  loading: boolean;
  error?: AuthError;
}

export interface User {
  id: string;
  permissions: string[];
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  autoDownload: boolean;
  defaultPlaybackRate: number;
  defaultVolume: number;
}

export interface AuthError {
  type: 'invalid_key' | 'expired' | 'network' | 'server' | 'forbidden';
  message: string;
  canRetry: boolean;
  code?: string;
}

export interface LoginRequest {
  apiKey: string;
  remember?: boolean;
}

export interface LoginResponse {
  sessionToken: string;
  expiresAt: string;
  user: User;
}

export interface SessionData {
  token: string;
  expiresAt: string;
  user: User;
}

export interface AuthContextType {
  auth: AuthState;
  login: (request: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
  isTokenValid: () => boolean;
} 