import { useState, useEffect, useCallback } from 'react';
import { authService } from '@/lib/auth/authService';
import { AuthState, LoginRequest } from '@/types/auth';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    expiresAt: null,
    loading: true,
    error: undefined,
  });

  // Initialize auth state
  useEffect(() => {
    const initAuth = () => {
      const isAuthenticated = authService.isAuthenticated();
      const user = authService.getUser();
      const token = authService.getToken();
      const session = authService.getSession();

      setAuthState({
        isAuthenticated,
        user,
        token,
        expiresAt: session?.expiresAt || null,
        loading: false,
        error: undefined,
      });
    };

    initAuth();
  }, []);

  const login = useCallback(async (request: LoginRequest) => {
    setAuthState(prev => ({
      ...prev,
      loading: true,
      error: undefined,
    }));

    try {
      const result = await authService.login(request);

      if (result.success) {
        const user = authService.getUser();
        const token = authService.getToken();
        const session = authService.getSession();

        setAuthState({
          isAuthenticated: true,
          user,
          token,
          expiresAt: session?.expiresAt || null,
          loading: false,
          error: undefined,
        });
      } else {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: result.error,
        }));
      }
    } catch {
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: {
          type: 'network',
          message: 'Login failed',
          canRetry: true,
        },
      }));
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthState(prev => ({
      ...prev,
      loading: true,
    }));

    try {
      await authService.logout();
      setAuthState({
        isAuthenticated: false,
        user: null,
        token: null,
        expiresAt: null,
        loading: false,
        error: undefined,
      });
    } catch {
      // Always clear local state even if server logout fails
      setAuthState({
        isAuthenticated: false,
        user: null,
        token: null,
        expiresAt: null,
        loading: false,
        error: undefined,
      });
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!authState.isAuthenticated) return;

    const success = await authService.refreshSession();
    
    if (success) {
      const user = authService.getUser();
      const token = authService.getToken();
      const session = authService.getSession();

      setAuthState(prev => ({
        ...prev,
        user,
        token,
        expiresAt: session?.expiresAt || null,
        error: undefined,
      }));
    } else {
      setAuthState({
        isAuthenticated: false,
        user: null,
        token: null,
        expiresAt: null,
        loading: false,
        error: {
          type: 'expired',
          message: 'Session expired',
          canRetry: true,
        },
      });
    }
  }, [authState.isAuthenticated]);

  const clearError = useCallback(() => {
    setAuthState(prev => ({
      ...prev,
      error: undefined,
    }));
  }, []);

  const isTokenValid = useCallback(() => {
    return authService.isAuthenticated();
  }, []);

  return {
    auth: authState,
    login,
    logout,
    refresh,
    clearError,
    isTokenValid,
  };
} 