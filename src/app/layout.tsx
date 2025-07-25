import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/features/auth/AuthProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Audiobook PWA',
  description: 'Transform your documents into audiobooks',
  manifest: '/manifest.json',
  themeColor: '#129990',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Audiobook PWA',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/icon-192x192.png',
    apple: '/icon-192x192.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>
        {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
