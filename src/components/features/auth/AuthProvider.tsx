'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthContextType } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const authData = useAuth();

  // Listen for storage changes (logout from another tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'audiobook_session' && e.newValue === null) {
        // Session was cleared in another tab
        authData.logout();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [authData]);

  // Auto-refresh session when near expiry
  useEffect(() => {
    if (authData.auth.isAuthenticated && authData.auth.expiresAt) {
      const expiryTime = new Date(authData.auth.expiresAt).getTime();
      const now = new Date().getTime();
      const timeUntilExpiry = expiryTime - now;
      
      // If token expires in less than 5 minutes, refresh it
      if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
        authData.refresh();
      }
    }
  }, [authData.auth.isAuthenticated, authData.auth.expiresAt, authData]);

  return (
    <AuthContext.Provider value={authData}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
} 