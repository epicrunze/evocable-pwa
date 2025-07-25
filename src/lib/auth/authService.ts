import { apiClient } from '@/lib/api/client';
import { AuthError, LoginRequest, LoginResponse, SessionData } from '@/types/auth';

const SESSION_KEY = 'audiobook_session';
const REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry

export class AuthService {
  private sessionData: SessionData | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.loadSession();
  }

  private loadSession(): void {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        try {
          const session = JSON.parse(stored) as SessionData;
          if (this.isValidSession(session)) {
            this.sessionData = session;
            apiClient.setAuthToken(session.token);
            this.scheduleRefresh();
          } else {
            this.clearSession();
          }
        } catch (error) {
          console.error('Failed to load session:', error);
          this.clearSession();
        }
      }
    }
  }

  private saveSession(session: SessionData): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
    this.sessionData = session;
    apiClient.setAuthToken(session.token);
    this.scheduleRefresh();
  }

  private clearSession(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_KEY);
    }
    this.sessionData = null;
    apiClient.setAuthToken(null);
    this.clearRefreshTimer();
  }

  private isValidSession(session: SessionData): boolean {
    const now = new Date().getTime();
    const expiryTime = new Date(session.expiresAt).getTime();
    return expiryTime > now;
  }

  private scheduleRefresh(): void {
    if (!this.sessionData) return;

    this.clearRefreshTimer();
    
    const now = new Date().getTime();
    const expiryTime = new Date(this.sessionData.expiresAt).getTime();
    const refreshTime = expiryTime - REFRESH_THRESHOLD;
    const delay = refreshTime - now;

    if (delay > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshSession();
      }, delay);
    }
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  async login(request: LoginRequest): Promise<{ success: boolean; error?: AuthError }> {
    try {
      console.log('🔐 AuthService.login called with:', request);
      console.log('🌐 Making API call to /auth/login...');
      const response = await apiClient.post<LoginResponse>('/auth/login', request);
      console.log('📬 AuthService received response:', response);

      if (response.error) {
        return {
          success: false,
          error: {
            type: this.mapErrorType(response.error.code),
            message: response.error.message,
            canRetry: response.error.retry || false,
            code: response.error.code,
          },
        };
      }

      if (response.data) {
        const session: SessionData = {
          token: response.data.sessionToken,
          expiresAt: response.data.expiresAt,
          user: response.data.user,
        };

        this.saveSession(session);
        return { success: true };
      }

      return {
        success: false,
        error: {
          type: 'server',
          message: 'Invalid response from server',
          canRetry: false,
        },
      };
    } catch {
      return {
        success: false,
        error: {
          type: 'network',
          message: 'Network error during login',
          canRetry: true,
        },
      };
    }
  }

  async logout(): Promise<void> {
    try {
      // Attempt to notify server of logout
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore server errors during logout
      console.warn('Server logout failed');
    } finally {
      this.clearSession();
    }
  }

  async refreshSession(): Promise<boolean> {
    if (!this.sessionData) return false;

    try {
      const response = await apiClient.post<LoginResponse>('/auth/refresh');

      if (response.error) {
        this.clearSession();
        return false;
      }

      if (response.data) {
        const session: SessionData = {
          token: response.data.sessionToken,
          expiresAt: response.data.expiresAt,
          user: response.data.user,
        };

        this.saveSession(session);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Session refresh failed:', error);
      return false;
    }
  }

  isAuthenticated(): boolean {
    return this.sessionData !== null && this.isValidSession(this.sessionData);
  }

  getSession(): SessionData | null {
    return this.sessionData;
  }

  getToken(): string | null {
    return this.sessionData?.token || null;
  }

  getUser() {
    return this.sessionData?.user || null;
  }

  private mapErrorType(code: string): AuthError['type'] {
    switch (code) {
      case '401':
        return 'invalid_key';
      case '403':
        return 'forbidden';
      case '419':
        return 'expired';
      case '500':
      case '502':
      case '503':
        return 'server';
      default:
        return 'network';
    }
  }
}

// Create singleton instance
export const authService = new AuthService(); 