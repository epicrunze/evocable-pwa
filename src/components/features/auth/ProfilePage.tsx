'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from './AuthProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { UserIcon, EditIcon, KeyIcon, LogOutIcon, CheckIcon, XIcon } from 'lucide-react';
import { UserProfile } from '@/types/auth';

type ProfileMode = 'view' | 'edit-profile' | 'change-password';

interface ProfilePageProps {
  onBack?: () => void;
}

export function ProfilePage({ onBack }: ProfilePageProps) {
  const { auth, logout, getProfile, updateProfile, changePassword, clearError } = useAuthContext();
  const [mode, setMode] = useState<ProfileMode>('view');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Edit profile form data
  const [editData, setEditData] = useState({
    username: '',
    email: '',
  });

  // Change password form data
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  // Load profile data
  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const profileData = await getProfile();
      if (profileData) {
        setProfile(profileData);
        setEditData({
          username: profileData.username,
          email: profileData.email,
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  }, [getProfile]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleEditProfile = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editData.username.trim() || !editData.email.trim()) {
      return;
    }

    try {
      await updateProfile({
        username: editData.username.trim(),
        email: editData.email.trim(),
      });

      if (!auth.error) {
        setSuccessMessage('Profile updated successfully!');
        setMode('view');
        await loadProfile(); // Refresh profile data
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      console.error('Profile update failed:', error);
    }
  }, [editData, updateProfile, auth.error, loadProfile]);

  const handleChangePassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) {
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      return;
    }

    try {
      await changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
        confirm_password: passwordData.confirm_password,
      });

      if (!auth.error) {
        setSuccessMessage('Password changed successfully!');
        setMode('view');
        setPasswordData({
          current_password: '',
          new_password: '',
          confirm_password: '',
        });
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      console.error('Password change failed:', error);
    }
  }, [passwordData, changePassword, auth.error]);

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
    
    // Clear success message when user starts editing again
    if (successMessage) {
      setSuccessMessage('');
    }
  }, [auth.error, clearError, successMessage]);

  const cancelEdit = useCallback(() => {
    if (profile) {
      setEditData({
        username: profile.username,
        email: profile.email,
      });
    }
    setPasswordData({
      current_password: '',
      new_password: '',
      confirm_password: '',
    });
    setMode('view');
    clearError();
  }, [profile, clearError]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#129990]"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Failed to load profile information.</p>
          <Button onClick={loadProfile} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-[#129990] rounded-full flex items-center justify-center">
                  <UserIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Profile Settings</h1>
                  <p className="text-sm text-gray-500">Manage your account information</p>
                </div>
              </div>
              <Button
                onClick={logout}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <LogOutIcon className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="px-6 py-4">
              <Alert variant="default" className="bg-green-50 border-green-200">
                <CheckIcon className="h-4 w-4 text-green-600" />
                <p className="text-green-800">{successMessage}</p>
              </Alert>
            </div>
          )}

          {/* Error Message */}
          {auth.error && (
            <div className="px-6 py-4">
              <Alert variant="destructive">
                <p>{auth.error.message}</p>
                {auth.error.canRetry && (
                  <p className="text-sm mt-1">Please try again.</p>
                )}
              </Alert>
            </div>
          )}

          {/* Profile View Mode */}
          {mode === 'view' && (
            <div className="px-6 py-6">
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Username</label>
                      <p className="mt-1 text-sm text-gray-900">{profile.username}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="mt-1 text-sm text-gray-900">{profile.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Account Status</label>
                      <div className="mt-1 flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          profile.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {profile.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          profile.is_verified 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {profile.is_verified ? 'Verified' : 'Unverified'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Member Since</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => setMode('edit-profile')}
                    className="flex items-center justify-center"
                  >
                    <EditIcon className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                  <Button
                    onClick={() => setMode('change-password')}
                    variant="outline"
                    className="flex items-center justify-center"
                  >
                    <KeyIcon className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Profile Mode */}
          {mode === 'edit-profile' && (
            <div className="px-6 py-6">
              <form onSubmit={handleEditProfile} className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Profile</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                        Username
                      </label>
                      <Input
                        id="username"
                        name="username"
                        type="text"
                        required
                        value={editData.username}
                        onChange={handleInputChange(setEditData, 'username')}
                        disabled={auth.loading}
                        className="mt-1"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        3-50 characters, letters, numbers, underscore, and hyphen only
                      </p>
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={editData.email}
                        onChange={handleInputChange(setEditData, 'email')}
                        disabled={auth.loading}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="submit"
                    disabled={
                      auth.loading || 
                      !editData.username.trim() || 
                      !editData.email.trim()
                    }
                    className="flex items-center justify-center"
                  >
                    <CheckIcon className="h-4 w-4 mr-2" />
                    {auth.loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEdit}
                    className="flex items-center justify-center"
                  >
                    <XIcon className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Change Password Mode */}
          {mode === 'change-password' && (
            <div className="px-6 py-6">
              <form onSubmit={handleChangePassword} className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="current_password" className="block text-sm font-medium text-gray-700">
                        Current Password
                      </label>
                      <Input
                        id="current_password"
                        name="current_password"
                        type="password"
                        required
                        value={passwordData.current_password}
                        onChange={handleInputChange(setPasswordData, 'current_password')}
                        disabled={auth.loading}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label htmlFor="new_password" className="block text-sm font-medium text-gray-700">
                        New Password
                      </label>
                      <Input
                        id="new_password"
                        name="new_password"
                        type="password"
                        required
                        value={passwordData.new_password}
                        onChange={handleInputChange(setPasswordData, 'new_password')}
                        disabled={auth.loading}
                        className="mt-1"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Minimum 8 characters with uppercase, lowercase, number, and special character
                      </p>
                    </div>
                    <div>
                      <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">
                        Confirm New Password
                      </label>
                      <Input
                        id="confirm_password"
                        name="confirm_password"
                        type="password"
                        required
                        value={passwordData.confirm_password}
                        onChange={handleInputChange(setPasswordData, 'confirm_password')}
                        disabled={auth.loading}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="submit"
                    disabled={
                      auth.loading || 
                      !passwordData.current_password || 
                      !passwordData.new_password || 
                      !passwordData.confirm_password ||
                      passwordData.new_password !== passwordData.confirm_password
                    }
                    className="flex items-center justify-center"
                  >
                    <KeyIcon className="h-4 w-4 mr-2" />
                    {auth.loading ? 'Changing...' : 'Change Password'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEdit}
                    className="flex items-center justify-center"
                  >
                    <XIcon className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Back to Dashboard */}
        {onBack && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Want to go back?{' '}
              <button
                onClick={onBack}
                className="font-medium text-[#129990] hover:text-[#096B68]"
              >
                Return to Dashboard
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}