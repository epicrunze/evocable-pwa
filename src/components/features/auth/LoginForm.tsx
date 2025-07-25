'use client';

import { useState, useCallback } from 'react';
import { useAuthContext } from './AuthProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { EyeIcon, EyeOffIcon } from 'lucide-react';

export function LoginForm() {
  const { auth, login, clearError } = useAuthContext();
  const [formData, setFormData] = useState({
    apiKey: '',
    remember: false,
  });
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 Form Submit Debug:', {
      apiKey: formData.apiKey.trim(),
      remember: formData.remember,
      event: e.type,
    });
    
    if (!formData.apiKey.trim()) {
      console.log('❌ Empty API key, stopping submission');
      return;
    }

    console.log('📞 Calling login function...');
    await login({
      apiKey: formData.apiKey.trim(),
      remember: formData.remember,
    });
  }, [formData, login]);

  const handleApiKeyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      apiKey: e.target.value,
    }));
    
    // Clear error when user starts typing
    if (auth.error) {
      clearError();
    }
  }, [auth.error, clearError]);

  const handleRememberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      remember: e.target.checked,
    }));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-[#129990] rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your API key to access your audiobook library
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="apiKey" className="sr-only">
                API Key
              </label>
              <div className="relative">
                <Input
                  id="apiKey"
                  name="apiKey"
                  type={showApiKey ? 'text' : 'password'}
                  required
                  placeholder="Enter your API key"
                  value={formData.apiKey}
                  onChange={handleApiKeyChange}
                  disabled={auth.loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
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
                  checked={formData.remember}
                  onChange={handleRememberChange}
                  className="h-4 w-4 text-[#129990] focus:ring-[#129990] border-gray-300 rounded"
                />
                <label htmlFor="remember" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-[#129990] hover:text-[#096B68]">
                  Forgot your API key?
                </a>
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
              disabled={auth.loading || !formData.apiKey.trim()}
              className="w-full"
              size="lg"
            >
              {auth.loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>
        </form>

        <div className="text-center text-xs text-gray-500">
          Version 1.0.0
        </div>
      </div>
    </div>
  );
} 