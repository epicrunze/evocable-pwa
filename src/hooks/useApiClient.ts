import { useEffect, useState, useCallback, useMemo } from 'react';
import { apiClient, RequestOptions, RequestInterceptor, ErrorSeverity } from '@/lib/api/client';
import { apiCache } from '@/lib/api/cache';
import { offlineManager } from '@/lib/api/offline';
import { ApiResponse } from '@/types/base';

interface NetworkState {
  status: 'online' | 'offline' | 'slow' | 'unknown';
  isOnline: boolean;
  effectiveType?: string;
  rtt?: number;
  downlink?: number;
  lastChanged: number;
}

interface CacheStats {
  size: number;
  maxSize: number;
  storage: 'memory' | 'localStorage' | 'indexedDB' | undefined;
  hitRate?: number;
}

interface QueueStats {
  size: number;
  maxSize: number;
  pendingRequests: number;
  failedRequests: number;
}

interface UseApiClientOptions {
  enableNetworkTracking?: boolean;
  enableErrorTracking?: boolean;
  logLevel?: 'none' | 'errors' | 'all';
}

export function useApiClient(options: UseApiClientOptions = {}) {
  const [networkState, setNetworkState] = useState<NetworkState>(() => 
    offlineManager.getNetworkState()
  );
  const [errorLog, setErrorLog] = useState<Array<{
    timestamp: string;
    url: string;
    error: any;
    severity: ErrorSeverity;
  }>>([]);

  // Network state tracking
  useEffect(() => {
    if (!options.enableNetworkTracking) return;

    const unsubscribe = offlineManager.onNetworkStateChange(setNetworkState);
    return unsubscribe;
  }, [options.enableNetworkTracking]);

  // Error tracking interceptor
  useEffect(() => {
    if (!options.enableErrorTracking) return;

    const errorInterceptor: RequestInterceptor = {
      onError: (error, url) => {
        if (options.logLevel === 'all' || options.logLevel === 'errors') {
          console.error('API Error:', { url, error });
        }

        setErrorLog(prev => [...prev.slice(-49), { // Keep last 50 errors
          timestamp: new Date().toISOString(),
          url,
          error,
          severity: error.severity,
        }]);
      },
    };

    const removeInterceptor = apiClient.addInterceptor(errorInterceptor);
    return removeInterceptor;
  }, [options.enableErrorTracking, options.logLevel]);

  // Enhanced request methods
  const get = useCallback(<T>(
    url: string,
    params?: Record<string, any>,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<ApiResponse<T>> => {
    return apiClient.get<T>(url, params, options);
  }, []);

  const post = useCallback(<T>(
    url: string,
    body?: any,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<ApiResponse<T>> => {
    return apiClient.post<T>(url, body, options);
  }, []);

  const put = useCallback(<T>(
    url: string,
    body?: any,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<ApiResponse<T>> => {
    return apiClient.put<T>(url, body, options);
  }, []);

  const del = useCallback(<T>(
    url: string,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<ApiResponse<T>> => {
    return apiClient.delete<T>(url, options);
  }, []);

  const upload = useCallback(<T>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void,
    options?: { timeout?: number; tags?: string[] }
  ): Promise<ApiResponse<T>> => {
    return apiClient.upload<T>(url, file, onProgress, options);
  }, []);

  // Cache management
  const cache = useMemo(() => ({
    get: <T>(url: string, params?: Record<string, any>) => apiCache.get<T>(url, params),
    set: <T>(url: string, data: T, params?: Record<string, any>, options?: { ttl?: number }) => 
      apiCache.set(url, data, params, options),
    remove: (url: string, params?: Record<string, any>) => apiCache.remove(url, params),
    clear: () => apiCache.clear(),
    has: (url: string, params?: Record<string, any>) => apiCache.has(url, params),
    getStats: (): CacheStats => apiCache.getStats(),
  }), []);

  // Offline queue management
  const offlineQueue = useMemo(() => ({
    enqueue: (
      url: string,
      method: string,
      body?: any,
      options?: { priority?: 'low' | 'normal' | 'high'; maxRetries?: number; tags?: string[] }
    ) => offlineManager.enqueueRequest(url, method, body, options),
    cancel: (requestId: string) => offlineManager.cancelQueuedRequest(requestId),
    clear: () => offlineManager.clearQueue(),
    getStats: (): QueueStats => offlineManager.getQueueStats(),
  }), []);

  // Request cancellation
  const cancelRequest = useCallback((requestId: string) => {
    apiClient.cancelRequest(requestId);
  }, []);

  const cancelAllRequests = useCallback(() => {
    apiClient.cancelAllRequests();
  }, []);

  // Add interceptor
  const addInterceptor = useCallback((interceptor: RequestInterceptor) => {
    return apiClient.addInterceptor(interceptor);
  }, []);

  // Helper functions
  const isOnline = networkState.isOnline;
  const isSlowConnection = networkState.status === 'slow';
  const shouldUseCache = offlineManager.shouldUseCache();
  const getCacheStrategy = offlineManager.getCacheStrategy();

  // Clear error log
  const clearErrorLog = useCallback(() => {
    setErrorLog([]);
  }, []);

  // Get recent errors by severity
  const getErrorsBySeverity = useCallback((severity: ErrorSeverity) => {
    return errorLog.filter(error => error.severity === severity);
  }, [errorLog]);

  return {
    // HTTP methods
    get,
    post,
    put,
    delete: del,
    upload,

    // Network state
    networkState,
    isOnline,
    isSlowConnection,
    shouldUseCache,
    getCacheStrategy,

    // Cache management
    cache,

    // Offline queue
    offlineQueue,

    // Request management
    cancelRequest,
    cancelAllRequests,
    addInterceptor,

    // Error tracking
    errorLog,
    clearErrorLog,
    getErrorsBySeverity,

    // Stats
    stats: {
      cache: cache.getStats(),
      queue: offlineQueue.getStats(),
      network: networkState,
    },
  };
}

// Hook for network state only
export function useNetworkState() {
  const [networkState, setNetworkState] = useState<NetworkState>(() => 
    offlineManager.getNetworkState()
  );

  useEffect(() => {
    const unsubscribe = offlineManager.onNetworkStateChange(setNetworkState);
    return unsubscribe;
  }, []);

  return {
    networkState,
    isOnline: networkState.isOnline,
    isSlowConnection: networkState.status === 'slow',
    shouldUseCache: offlineManager.shouldUseCache(),
    getCacheStrategy: offlineManager.getCacheStrategy(),
  };
}

// Hook for offline queue management
export function useOfflineQueue() {
  const [stats, setStats] = useState<QueueStats>(() => 
    offlineManager.getQueueStats()
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(offlineManager.getQueueStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    stats,
    enqueue: (
      url: string,
      method: string,
      body?: any,
      options?: { priority?: 'low' | 'normal' | 'high'; maxRetries?: number; tags?: string[] }
    ) => offlineManager.enqueueRequest(url, method, body, options),
    cancel: (requestId: string) => offlineManager.cancelQueuedRequest(requestId),
    clear: () => offlineManager.clearQueue(),
  };
} 