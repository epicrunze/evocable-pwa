import type { NextConfig } from "next";
import withPWA from 'next-pwa';

const nextConfig: NextConfig = {
  // Enable static exports for better Vercel compatibility
  output: 'standalone',
  
  // Optimize images
  images: {
    unoptimized: true
  },

  // Enable experimental features if needed
  experimental: {
    optimizePackageImports: ['lucide-react', '@tanstack/react-query']
  }
};

// Get API URL from environment variables
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
// Create regex pattern for API caching by escaping the URL
const apiUrlPattern = new RegExp(`^${apiUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/api/.*`, 'i');

const config = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60 // 365 days
        }
      }
    },
    {
      urlPattern: apiUrlPattern,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 16,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    }
  ]
})(nextConfig as any);

export default config;
