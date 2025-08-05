'use client';

import { useState, useCallback } from 'react';
import { useAuthContext } from './AuthProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { EyeIcon, EyeOffIcon, ArrowLeftIcon } from 'lucide-react';

type AuthMode = 'login' | 'register' | 'forgot-password' | 'reset-password';

export function AuthForm() {
  const { auth, login, register, forgotPassword, clearError } = useAuthContext();
  const [mode, setMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Form data for all modes
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
    remember: false,
  });
  
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
  });
  
  const [forgotData, setForgotData] = useState({
    email: '',
  });

  const handleLoginSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginData.email.trim() || !loginData.password.trim()) {
      return;
    }

    await login({
      email: loginData.email.trim(),
      password: loginData.password,
      remember: loginData.remember,
    });
  }, [loginData, login]);

  const handleRegisterSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!registerData.username.trim() || !registerData.email.trim() || 
        !registerData.password.trim() || !registerData.confirm_password.trim()) {
      return;
    }

    try {
      await register({
        username: registerData.username.trim(),
        email: registerData.email.trim(),
        password: registerData.password,
        confirm_password: registerData.confirm_password,
      });

      if (!auth.error) {
        setIsSuccess(true);
        setRegisterData({
          username: '',
          email: '',
          password: '',
          confirm_password: '',
        });
      }
    } catch (error) {
      console.error('Registration failed:', error);
    }
  }, [registerData, register, auth.error]);

  const handleForgotSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!forgotData.email.trim()) {
      return;
    }

    try {
      await forgotPassword({ email: forgotData.email.trim() });
      if (!auth.error) {
        setIsSuccess(true);
      }
    } catch (error) {
      console.error('Forgot password failed:', error);
    }
  }, [forgotData, forgotPassword, auth.error]);

  const handleInputChange = useCallback((
    setter: React.Dispatch<React.SetStateAction<any>>,
    field: string
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter((prev: any) => ({
      ...prev,
      [field]: e.target.value,
    }));
    
    // Clear error when user starts typing
    if (auth.error) {
      clearError();
    }
    
    // Reset success state when user starts typing again
    if (isSuccess) {
      setIsSuccess(false);
    }
  }, [auth.error, clearError, isSuccess]);

  const switchMode = useCallback((newMode: AuthMode) => {
    setMode(newMode);
    clearError();
    setIsSuccess(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [clearError]);

  // Success states
  if (isSuccess && mode === 'register') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">✓</span>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Account Created!
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Your account has been successfully created. You can now sign in with your credentials.
            </p>
            <div className="mt-6">
              <Button
                onClick={() => switchMode('login')}
                className="w-full"
                size="lg"
              >
                Go to Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess && mode === 'forgot-password') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">📧</span>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Check Your Email
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              If an account with that email exists, we've sent you a password reset link.
            </p>
            <div className="mt-6">
              <Button
                onClick={() => switchMode('login')}
                className="w-full"
                size="lg"
              >
                Back to Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Form rendering
  const getFormTitle = () => {
    switch (mode) {
      case 'login': return 'Sign in to your account';
      case 'register': return 'Create your account';
      case 'forgot-password': return 'Reset your password';
      default: return 'Authentication';
    }
  };

  const getFormSubtitle = () => {
    switch (mode) {
      case 'login': return 'Enter your email and password to access your audiobook library';
      case 'register': return 'Join us to start building your audiobook library';
      case 'forgot-password': return 'Enter your email address and we\'ll send you a reset link';
      default: return '';
    }
  };

  const canGoBack = mode !== 'login';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex items-center justify-center">
            {canGoBack && (
              <button
                onClick={() => switchMode('login')}
                className="absolute left-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
            )}
            <div className="mx-auto h-12 w-12 bg-[#129990] rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">A</span>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {getFormTitle()}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {getFormSubtitle()}
          </p>
        </div>

        {/* Login Form */}
        {mode === 'login' && (
          <form className="mt-8 space-y-6" onSubmit={handleLoginSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="sr-only">Email address</label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="Email address"
                  value={loginData.email}
                  onChange={handleInputChange(setLoginData, 'email')}
                  disabled={auth.loading}
                />
              </div>

              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder="Password"
                    value={loginData.password}
                    onChange={handleInputChange(setLoginData, 'password')}
                    disabled={auth.loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOffIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember"
                    name="remember"
                    type="checkbox"
                    checked={loginData.remember}
                    onChange={(e) => setLoginData(prev => ({ ...prev, remember: e.target.checked }))}
                    className="h-4 w-4 text-[#129990] focus:ring-[#129990] border-gray-300 rounded"
                  />
                  <label htmlFor="remember" className="ml-2 block text-sm text-gray-900">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <button
                    type="button"
                    onClick={() => switchMode('forgot-password')}
                    className="font-medium text-[#129990] hover:text-[#096B68]"
                  >
                    Forgot your password?
                  </button>
                </div>
              </div>
            </div>

            {auth.error && (
              <Alert variant="destructive">
                <p>{auth.error.message}</p>
                {auth.error.canRetry && (
                  <p className="text-sm mt-1">Please try again.</p>
                )}
              </Alert>
            )}

            <div>
              <Button
                type="submit"
                disabled={auth.loading || !loginData.email.trim() || !loginData.password.trim()}
                className="w-full"
                size="lg"
              >
                {auth.loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="font-medium text-[#129990] hover:text-[#096B68]"
                >
                  Sign up
                </button>
              </p>
            </div>
          </form>
        )}

        {/* Register Form */}
        {mode === 'register' && (
          <form className="mt-8 space-y-6" onSubmit={handleRegisterSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="sr-only">Username</label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  placeholder="Username"
                  value={registerData.username}
                  onChange={handleInputChange(setRegisterData, 'username')}
                  disabled={auth.loading}
                />
                <p className="mt-1 text-xs text-gray-500">
                  3-50 characters, letters, numbers, underscore, and hyphen only
                </p>
              </div>

              <div>
                <label htmlFor="email" className="sr-only">Email address</label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="Email address"
                  value={registerData.email}
                  onChange={handleInputChange(setRegisterData, 'email')}
                  disabled={auth.loading}
                />
              </div>

              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    placeholder="Password"
                    value={registerData.password}
                    onChange={handleInputChange(setRegisterData, 'password')}
                    disabled={auth.loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOffIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Minimum 8 characters with uppercase, lowercase, number, and special character
                </p>
              </div>

              <div>
                <label htmlFor="confirm_password" className="sr-only">Confirm Password</label>
                <div className="relative">
                  <Input
                    id="confirm_password"
                    name="confirm_password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    placeholder="Confirm Password"
                    value={registerData.confirm_password}
                    onChange={handleInputChange(setRegisterData, 'confirm_password')}
                    disabled={auth.loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOffIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {auth.error && (
              <Alert variant="destructive">
                <p>{auth.error.message}</p>
                {auth.error.canRetry && (
                  <p className="text-sm mt-1">Please try again.</p>
                )}
              </Alert>
            )}

            <div>
              <Button
                type="submit"
                disabled={
                  auth.loading || 
                  !registerData.username.trim() || 
                  !registerData.email.trim() || 
                  !registerData.password.trim() || 
                  !registerData.confirm_password.trim() ||
                  registerData.password !== registerData.confirm_password
                }
                className="w-full"
                size="lg"
              >
                {auth.loading ? 'Creating account...' : 'Create account'}
              </Button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="font-medium text-[#129990] hover:text-[#096B68]"
                >
                  Sign in
                </button>
              </p>
            </div>
          </form>
        )}

        {/* Forgot Password Form */}
        {mode === 'forgot-password' && (
          <form className="mt-8 space-y-6" onSubmit={handleForgotSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="sr-only">Email address</label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="Email address"
                  value={forgotData.email}
                  onChange={handleInputChange(setForgotData, 'email')}
                  disabled={auth.loading}
                />
              </div>
            </div>

            {auth.error && (
              <Alert variant="destructive">
                <p>{auth.error.message}</p>
                {auth.error.canRetry && (
                  <p className="text-sm mt-1">Please try again.</p>
                )}
              </Alert>
            )}

            <div>
              <Button
                type="submit"
                disabled={auth.loading || !forgotData.email.trim()}
                className="w-full"
                size="lg"
              >
                {auth.loading ? 'Sending reset link...' : 'Send reset link'}
              </Button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="font-medium text-[#129990] hover:text-[#096B68]"
                >
                  Sign in
                </button>
              </p>
            </div>
          </form>
        )}

        <div className="text-center text-xs text-gray-500">
          Version 1.0.0
        </div>
      </div>
    </div>
  );
}