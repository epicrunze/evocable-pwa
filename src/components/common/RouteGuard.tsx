'use client';

import { useAuthContext } from '@/components/features/auth/AuthProvider';
import { LoginForm } from '@/components/features/auth/LoginForm';

interface RouteGuardProps {
  children: React.ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const { auth } = useAuthContext();

  // Show loading state while checking authentication
  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#129990]"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!auth.isAuthenticated) {
    return <LoginForm />;
  }

  // Show protected content if authenticated
  return <>{children}</>;
} 