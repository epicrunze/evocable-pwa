interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  etag?: string;
  lastModified?: string;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  storage?: 'memory' | 'localStorage' | 'indexedDB';
  strategy?: 'cache-first' | 'network-first' | 'cache-only' | 'network-only';
}

export class ApiCache {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private maxSize: number;
  private defaultTtl: number;
  private storage: CacheOptions['storage'];

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 100;
    this.defaultTtl = options.ttl || 5 * 60 * 1000; // 5 minutes default
    this.storage = options.storage || 'memory';
  }

  private generateKey(url: string, params?: Record<string, any>): string {
    const baseKey = url;
    if (params) {
      const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&');
      return `${baseKey}?${sortedParams}`;
    }
    return baseKey;
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() > entry.timestamp + entry.ttl;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.memoryCache.delete(key);
      }
    }
  }

  private evictLRU(): void {
    if (this.memoryCache.size >= this.maxSize) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }
  }

  private async getFromStorage<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      switch (this.storage) {
        case 'localStorage':
          if (typeof window !== 'undefined' && window.localStorage) {
            const item = localStorage.getItem(`api_cache_${key}`);
            return item ? JSON.parse(item) : null;
          }
          break;
        case 'indexedDB':
          // Implementation for IndexedDB would go here
          // For now, fall back to memory cache
          break;
        case 'memory':
        default:
          return this.memoryCache.get(key) || null;
      }
    } catch (error) {
      console.warn('Failed to get from storage:', error);
      return null;
    }
    return null;
  }

  private async setToStorage<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    try {
      switch (this.storage) {
        case 'localStorage':
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(`api_cache_${key}`, JSON.stringify(entry));
          }
          break;
        case 'indexedDB':
          // Implementation for IndexedDB would go here
          // For now, fall back to memory cache
          break;
        case 'memory':
        default:
          this.evictExpired();
          this.evictLRU();
          this.memoryCache.set(key, entry);
          break;
      }
    } catch (error) {
      console.warn('Failed to set to storage:', error);
      // Fall back to memory cache
      this.evictExpired();
      this.evictLRU();
      this.memoryCache.set(key, entry);
    }
  }

  async get<T>(url: string, params?: Record<string, any>): Promise<T | null> {
    const key = this.generateKey(url, params);
    const entry = await this.getFromStorage<T>(key);
    
    if (entry && !this.isExpired(entry)) {
      return entry.data;
    }
    
    // Remove expired entry
    if (entry) {
      await this.remove(url, params);
    }
    
    return null;
  }

  async set<T>(
    url: string,
    data: T,
    params?: Record<string, any>,
    options?: { ttl?: number; etag?: string; lastModified?: string }
  ): Promise<void> {
    const key = this.generateKey(url, params);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: options?.ttl || this.defaultTtl,
      etag: options?.etag,
      lastModified: options?.lastModified,
    };
    
    await this.setToStorage(key, entry);
  }

  async remove(url: string, params?: Record<string, any>): Promise<void> {
    const key = this.generateKey(url, params);
    
    try {
      switch (this.storage) {
        case 'localStorage':
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.removeItem(`api_cache_${key}`);
          }
          break;
        case 'indexedDB':
          // Implementation for IndexedDB would go here
          break;
        case 'memory':
        default:
          this.memoryCache.delete(key);
          break;
      }
    } catch (error) {
      console.warn('Failed to remove from storage:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      switch (this.storage) {
        case 'localStorage':
          if (typeof window !== 'undefined' && window.localStorage) {
            const keys = Object.keys(localStorage).filter(key => key.startsWith('api_cache_'));
            keys.forEach(key => localStorage.removeItem(key));
          }
          break;
        case 'indexedDB':
          // Implementation for IndexedDB would go here
          break;
        case 'memory':
        default:
          this.memoryCache.clear();
          break;
      }
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  async has(url: string, params?: Record<string, any>): Promise<boolean> {
    const cached = await this.get(url, params);
    return cached !== null;
  }

  async getMetadata(url: string, params?: Record<string, any>): Promise<{
    etag?: string;
    lastModified?: string;
    cached: boolean;
  }> {
    const key = this.generateKey(url, params);
    const entry = await this.getFromStorage(key);
    
    if (entry && !this.isExpired(entry)) {
      return {
        etag: entry.etag,
        lastModified: entry.lastModified,
        cached: true,
      };
    }
    
    return { cached: false };
  }

  // Get cache statistics
  getStats(): {
    size: number;
    maxSize: number;
    storage: CacheOptions['storage'];
    hitRate?: number;
  } {
    return {
      size: this.memoryCache.size,
      maxSize: this.maxSize,
      storage: this.storage,
    };
  }
}

// Create singleton instance
export const apiCache = new ApiCache({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 100,
  storage: 'localStorage', // Use localStorage for persistence
}); 