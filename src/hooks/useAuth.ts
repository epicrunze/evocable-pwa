import { useState, useEffect, useCallback } from 'react';
import { authService } from '@/lib/auth/authService';
import { 
  AuthState, 
  LoginRequest, 
  RegisterRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  UserProfile
} from '@/types/auth';

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

  const register = useCallback(async (request: RegisterRequest) => {
    setAuthState(prev => ({
      ...prev,
      loading: true,
      error: undefined,
    }));

    try {
      const result = await authService.register(request);

      if (result.success) {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: undefined,
        }));
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
          message: 'Registration failed',
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

  const getProfile = useCallback(async (): Promise<UserProfile | null> => {
    return await authService.getProfile();
  }, []);

  const updateProfile = useCallback(async (request: UpdateProfileRequest) => {
    setAuthState(prev => ({
      ...prev,
      loading: true,
      error: undefined,
    }));

    try {
      const result = await authService.updateProfile(request);

      if (result.success) {
        // Refresh user data in state
        const user = authService.getUser();
        setAuthState(prev => ({
          ...prev,
          user,
          loading: false,
          error: undefined,
        }));
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
          message: 'Profile update failed',
          canRetry: true,
        },
      }));
    }
  }, []);

  const changePassword = useCallback(async (request: ChangePasswordRequest) => {
    setAuthState(prev => ({
      ...prev,
      loading: true,
      error: undefined,
    }));

    try {
      const result = await authService.changePassword(request);

      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: result.success ? undefined : result.error,
      }));
    } catch {
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: {
          type: 'network',
          message: 'Password change failed',
          canRetry: true,
        },
      }));
    }
  }, []);

  const forgotPassword = useCallback(async (request: ForgotPasswordRequest) => {
    setAuthState(prev => ({
      ...prev,
      loading: true,
      error: undefined,
    }));

    try {
      const result = await authService.forgotPassword(request);

      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: result.success ? undefined : result.error,
      }));
    } catch {
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: {
          type: 'network',
          message: 'Password reset request failed',
          canRetry: true,
        },
      }));
    }
  }, []);

  const resetPassword = useCallback(async (request: ResetPasswordRequest) => {
    setAuthState(prev => ({
      ...prev,
      loading: true,
      error: undefined,
    }));

    try {
      const result = await authService.resetPassword(request);

      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: result.success ? undefined : result.error,
      }));
    } catch {
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: {
          type: 'network',
          message: 'Password reset failed',
          canRetry: true,
        },
      }));
    }
  }, []);

  const isTokenValid = useCallback(() => {
    return authService.isAuthenticated();
  }, []);

  return {
    auth: authState,
    login,
    register,
    logout,
    refresh,
    getProfile,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    clearError,
    isTokenValid,
  };
} 