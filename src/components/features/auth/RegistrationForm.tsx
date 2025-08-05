'use client';

import { useState, useCallback } from 'react';
import { useAuthContext } from './AuthProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { EyeIcon, EyeOffIcon } from 'lucide-react';

export function RegistrationForm() {
  const { auth, register, clearError } = useAuthContext();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username.trim() || !formData.email.trim() || 
        !formData.password.trim() || !formData.confirm_password.trim()) {
      return;
    }

    if (formData.password !== formData.confirm_password) {
      // This could be handled by a local validation state, but for simplicity
      // we'll let the backend handle it since it also validates this
      return;
    }

    try {
      await register({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        confirm_password: formData.confirm_password,
      });

      if (!auth.error) {
        setIsSuccess(true);
        setFormData({
          username: '',
          email: '',
          password: '',
          confirm_password: '',
        });
      }
    } catch (error) {
      console.error('Registration failed:', error);
    }
  }, [formData, register, auth.error]);

  const handleInputChange = useCallback((field: keyof typeof formData) => 
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({
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
    }, [auth.error, clearError, isSuccess]
  );

  if (isSuccess) {
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
              <a
                href="/login"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#129990] hover:bg-[#096B68] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#129990]"
              >
                Go to Sign In
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-[#129990] rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join us to start building your audiobook library
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                placeholder="Username"
                value={formData.username}
                onChange={handleInputChange('username')}
                disabled={auth.loading}
              />
              <p className="mt-1 text-xs text-gray-500">
                3-50 characters, letters, numbers, underscore, and hyphen only
              </p>
            </div>

            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="Email address"
                value={formData.email}
                onChange={handleInputChange('email')}
                disabled={auth.loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleInputChange('password')}
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
              <label htmlFor="confirm_password" className="sr-only">
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  placeholder="Confirm Password"
                  value={formData.confirm_password}
                  onChange={handleInputChange('confirm_password')}
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
                !formData.username.trim() || 
                !formData.email.trim() || 
                !formData.password.trim() || 
                !formData.confirm_password.trim() ||
                formData.password !== formData.confirm_password
              }
              className="w-full"
              size="lg"
            >
              {auth.loading ? 'Creating account...' : 'Create account'}
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <a href="/login" className="font-medium text-[#129990] hover:text-[#096B68]">
              Sign in
            </a>
          </p>
        </div>

        <div className="text-center text-xs text-gray-500">
          Version 1.0.0
        </div>
      </div>
    </div>
  );
}