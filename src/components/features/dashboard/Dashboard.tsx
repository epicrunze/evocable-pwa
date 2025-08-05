'use client';

import { useState } from 'react';
import { Library } from '@/components/features/library/Library';
import { ProfilePage } from '@/components/features/auth/ProfilePage';

export function Dashboard() {
  const [currentView, setCurrentView] = useState<'library' | 'profile'>('library');

  const showProfile = () => setCurrentView('profile');
  const showLibrary = () => setCurrentView('library');

  if (currentView === 'profile') {
    return <ProfilePage onBack={showLibrary} />;
  }

  return <Library onShowProfile={showProfile} />;
} 