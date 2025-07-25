'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuthContext } from '@/components/features/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { 
  BookOpenIcon, 
  UploadIcon, 
  DownloadIcon, 
  LogOutIcon,
  MenuIcon,
  XIcon
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage?: 'library' | 'upload' | 'downloads' | 'player';
}

export function Layout({ children, currentPage = 'library' }: LayoutProps) {
  const { logout } = useAuthContext();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const navigation = [
    { name: 'Library', href: '/library', key: 'library', icon: BookOpenIcon },
    { name: 'Upload', href: '/upload', key: 'upload', icon: UploadIcon },
    { name: 'Downloads', href: '/downloads', key: 'downloads', icon: DownloadIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Desktop Navigation */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-[#129990] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">A</span>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  {navigation.map((item) => (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        currentPage === item.key
                          ? 'bg-[#129990] text-white'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Desktop Status and Actions */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-gray-600">Connected</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700"
              >
                <LogOutIcon className="h-5 w-5" />
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-gray-500 hover:text-gray-700"
              >
                {isMobileMenuOpen ? (
                  <XIcon className="h-6 w-6" />
                ) : (
                  <MenuIcon className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
                      currentPage === item.key
                        ? 'bg-[#129990] text-white'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center px-3 py-2 text-sm text-gray-600">
                  <div className="h-2 w-2 bg-green-400 rounded-full mr-2"></div>
                  Connected
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-3 py-2 text-base font-medium text-gray-500 hover:text-gray-700"
                >
                  <LogOutIcon className="h-5 w-5 mr-3" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {children}
        </div>
      </main>
    </div>
  );
} 