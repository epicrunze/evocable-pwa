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
  username: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  autoDownload: boolean;
  defaultPlaybackRate: number;
  defaultVolume: number;
}

export interface AuthError {
  type: 'invalid_credentials' | 'validation' | 'expired' | 'network' | 'server' | 'forbidden' | 'rate_limit';
  message: string;
  canRetry: boolean;
  code?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  reset_token: string;
  new_password: string;
  confirm_password: string;
}

export interface UpdateProfileRequest {
  username?: string;
  email?: string;
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
  register: (request: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  getProfile: () => Promise<UserProfile | null>;
  updateProfile: (request: UpdateProfileRequest) => Promise<void>;
  changePassword: (request: ChangePasswordRequest) => Promise<void>;
  forgotPassword: (request: ForgotPasswordRequest) => Promise<void>;
  resetPassword: (request: ResetPasswordRequest) => Promise<void>;
  clearError: () => void;
  isTokenValid: () => boolean;
} 