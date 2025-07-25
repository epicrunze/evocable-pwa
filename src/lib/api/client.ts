import { ApiResponse, ApiError, AppConfig } from '@/types/base';
import { apiCache } from './cache';
import { offlineManager } from './offline';

// Enhanced error types
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface EnhancedApiError extends ApiError {
  severity: ErrorSeverity;
  timestamp: string;
  requestId?: string;
  retryAfter?: number;
  context?: Record<string, any>;
}

// Request/Response interceptors
export interface RequestInterceptor {
  onRequest?: (url: string, options: RequestInit) => RequestInit | Promise<RequestInit>;
  onResponse?: (response: Response, url: string) => Response | Promise<Response>;
  onError?: (error: EnhancedApiError, url: string) => void;
}

export interface RequestOptions extends Omit<RequestInit, 'priority'> {
  timeout?: number;
  skipRetry?: boolean;
  priority?: 'low' | 'normal' | 'high';
  tags?: string[];
  cacheStrategy?: 'cache-first' | 'network-first' | 'cache-only' | 'network-only';
  cacheTtl?: number;
  skipCache?: boolean;
}

export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private retryCount: number = 3;
  private retryDelay: number = 1000;
  private requestInterceptors: RequestInterceptor[] = [];
  private abortControllers: Map<string, AbortController> = new Map();
  private requestCounter = 0;

  constructor(config: Pick<AppConfig, 'apiUrl'>) {
    this.baseUrl = config.apiUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Add request interceptor
   */
  addInterceptor(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    return () => {
      const index = this.requestInterceptors.indexOf(interceptor);
      if (index > -1) {
        this.requestInterceptors.splice(index, 1);
      }
    };
  }

  /**
   * Cancel request by ID
   */
  cancelRequest(requestId: string): void {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
    }
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
  }

  setAuthToken(token: string | null) {
    if (token) {
      this.defaultHeaders['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.defaultHeaders['Authorization'];
    }
  }

  getAuthToken(): string | null {
    const authHeader = this.defaultHeaders['Authorization'];
    return authHeader ? authHeader.replace('Bearer ', '') : null;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestCounter}`;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getErrorSeverity(statusCode: number): ErrorSeverity {
    if (statusCode >= 500) return ErrorSeverity.HIGH;
    if (statusCode >= 400) return ErrorSeverity.MEDIUM;
    return ErrorSeverity.LOW;
  }

  private calculateRetryDelay(attempt: number, retryAfter?: number): number {
    if (retryAfter) return retryAfter * 1000; // Convert to milliseconds
    return Math.min(this.retryDelay * Math.pow(2, attempt - 1), 30000); // Exponential backoff with max 30s
  }

  private async runInterceptors<T>(
    interceptors: RequestInterceptor[],
    method: keyof RequestInterceptor,
    ...args: any[]
  ): Promise<T> {
    // For onRequest, we want to return the options object (second argument)
    // For onResponse, we want to return the response object (first argument)
    let result = method === 'onRequest' ? args[1] : args[0];
    
    for (const interceptor of interceptors) {
      const handler = interceptor[method];
      if (handler) {
        result = await (handler as any)(...args);
      }
    }
    return result;
  }

  private async makeRequest<T>(
    url: string,
    options: RequestOptions,
    attempt: number = 1
  ): Promise<ApiResponse<T>> {
    const requestId = this.generateRequestId();
    const controller = new AbortController();
    this.abortControllers.set(requestId, controller);

    const fullUrl = `${this.baseUrl}${url}`;
    
    // Determine cache strategy
    const cacheStrategy = options.cacheStrategy || offlineManager.getCacheStrategy();
    const shouldSkipCache = options.skipCache || options.method !== 'GET';
    
    // Check cache first for GET requests
    if (!shouldSkipCache && (cacheStrategy === 'cache-first' || cacheStrategy === 'cache-only')) {
      const cachedData = await apiCache.get<T>(url);
      if (cachedData) {
        this.abortControllers.delete(requestId);
        return {
          data: cachedData,
          error: undefined,
          loading: false,
          timestamp: new Date().toISOString(),
        };
      }
      
      // If cache-only and no cache, return error
      if (cacheStrategy === 'cache-only') {
        this.abortControllers.delete(requestId);
        const error: EnhancedApiError = {
          code: 'CACHE_MISS',
          message: 'Data not available in cache',
          details: null,
          retry: false,
          severity: ErrorSeverity.LOW,
          timestamp: new Date().toISOString(),
          requestId,
          context: { url, attempt, method: options.method },
        };
        
        return {
          data: undefined,
          error,
          loading: false,
          timestamp: new Date().toISOString(),
        };
      }
    }

    // Skip network request if cache-only
    if (cacheStrategy === 'cache-only') {
      this.abortControllers.delete(requestId);
      const error: EnhancedApiError = {
        code: 'CACHE_MISS',
        message: 'Data not available in cache',
        details: null,
        retry: false,
        severity: ErrorSeverity.LOW,
        timestamp: new Date().toISOString(),
        requestId,
        context: { url, attempt, method: options.method },
      };
      
      return {
        data: undefined,
        error,
        loading: false,
        timestamp: new Date().toISOString(),
      };
    }

    // Check if we should queue the request for offline processing
    const networkState = offlineManager.getNetworkState();
    if (!networkState.isOnline && options.method !== 'GET') {
      const queueId = offlineManager.enqueueRequest(
        fullUrl,
        options.method || 'GET',
        options.body,
        {
          priority: options.priority,
          tags: options.tags,
        }
      );

      this.abortControllers.delete(requestId);
      const error: EnhancedApiError = {
        code: 'QUEUED_OFFLINE',
        message: 'Request queued for offline processing',
        details: { queueId },
        retry: false,
        severity: ErrorSeverity.LOW,
        timestamp: new Date().toISOString(),
        requestId,
        context: { url, attempt, method: options.method },
      };
      
      return {
        data: undefined,
        error,
        loading: false,
        timestamp: new Date().toISOString(),
      };
    }
    
    try {
      // Apply request interceptors
      const interceptedOptions = await this.runInterceptors<RequestInit>(
        this.requestInterceptors,
        'onRequest',
        url,
        options
      );

      // Setup request with timeout and cancellation
      const timeoutId = options.timeout ? setTimeout(() => {
        controller.abort();
      }, options.timeout) : null;

      const requestOptions: RequestInit = {
        ...interceptedOptions,
        signal: controller.signal,
        headers: {
          ...this.defaultHeaders,
          ...interceptedOptions.headers,
          'X-Request-ID': requestId,
        },
      };

      // Debug logging
      console.log('🔍 API Request Debug:', {
        url: fullUrl,
        method: requestOptions.method,
        headers: requestOptions.headers,
        body: requestOptions.body,
      });

      const response = await fetch(fullUrl, requestOptions);

      // Clear timeout
      if (timeoutId) clearTimeout(timeoutId);

      // Apply response interceptors
      const interceptedResponse = await this.runInterceptors<Response>(
        this.requestInterceptors,
        'onResponse',
        response,
        url
      );

      const data = await interceptedResponse.json();

      if (!interceptedResponse.ok) {
        const retryAfter = interceptedResponse.headers.get('Retry-After');
        const error: EnhancedApiError = {
          code: interceptedResponse.status.toString(),
          message: data.message || interceptedResponse.statusText,
          details: data,
          retry: interceptedResponse.status >= 500 && attempt < this.retryCount && !options.skipRetry,
          severity: this.getErrorSeverity(interceptedResponse.status),
          timestamp: new Date().toISOString(),
          requestId,
          retryAfter: retryAfter ? parseInt(retryAfter) : undefined,
          context: { url, attempt, method: options.method },
        };

        // Run error interceptors
        this.runInterceptors(this.requestInterceptors, 'onError', error, url);

        if (error.retry) {
          const delay = this.calculateRetryDelay(attempt, error.retryAfter);
          await this.delay(delay);
          return this.makeRequest<T>(url, options, attempt + 1);
        }

        // Try to return cached data if available and network failed
        if (!shouldSkipCache && (cacheStrategy === 'network-first' || cacheStrategy === 'cache-first')) {
          const cachedData = await apiCache.get<T>(url);
          if (cachedData) {
            this.abortControllers.delete(requestId);
            return {
              data: cachedData,
              error: undefined,
              loading: false,
              timestamp: new Date().toISOString(),
            };
          }
        }

        this.abortControllers.delete(requestId);
        return {
          data: undefined,
          error,
          loading: false,
          timestamp: new Date().toISOString(),
        };
      }

      // Cache successful GET responses
      if (!shouldSkipCache && options.method === 'GET') {
        const etag = interceptedResponse.headers.get('ETag');
        const lastModified = interceptedResponse.headers.get('Last-Modified');
        await apiCache.set(url, data, undefined, {
          ttl: options.cacheTtl,
          etag: etag || undefined,
          lastModified: lastModified || undefined,
        });
      }

      this.abortControllers.delete(requestId);
      return {
        data,
        error: undefined,
        loading: false,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.abortControllers.delete(requestId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        const cancelledError: EnhancedApiError = {
          code: 'CANCELLED',
          message: 'Request was cancelled',
          details: error,
          retry: false,
          severity: ErrorSeverity.LOW,
          timestamp: new Date().toISOString(),
          requestId,
          context: { url, attempt, method: options.method },
        };

        return {
          data: undefined,
          error: cancelledError,
          loading: false,
          timestamp: new Date().toISOString(),
        };
      }

      const isNetworkError = error instanceof TypeError || (error as any).code === 'NETWORK_ERROR';
      const apiError: EnhancedApiError = {
        code: isNetworkError ? 'NETWORK_ERROR' : 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'Request failed',
        details: error,
        retry: isNetworkError && attempt < this.retryCount && !options.skipRetry,
        severity: isNetworkError ? ErrorSeverity.MEDIUM : ErrorSeverity.HIGH,
        timestamp: new Date().toISOString(),
        requestId,
        context: { url, attempt, method: options.method },
      };

      // Run error interceptors
      this.runInterceptors(this.requestInterceptors, 'onError', apiError, url);

      if (apiError.retry) {
        const delay = this.calculateRetryDelay(attempt);
        await this.delay(delay);
        return this.makeRequest<T>(url, options, attempt + 1);
      }

      // Try to return cached data if network failed
      if (!shouldSkipCache && isNetworkError) {
        const cachedData = await apiCache.get<T>(url);
        if (cachedData) {
          return {
            data: cachedData,
            error: undefined,
            loading: false,
            timestamp: new Date().toISOString(),
          };
        }
      }

      return {
        data: undefined,
        error: apiError,
        loading: false,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async get<T>(url: string, params?: Record<string, any>, options?: Omit<RequestOptions, 'body' | 'method'>): Promise<ApiResponse<T>> {
    const searchParams = params 
      ? '?' + new URLSearchParams(
          Object.entries(params).filter(([_, value]) => value !== undefined)
        ).toString()
      : '';
    
    return this.makeRequest<T>(url + searchParams, {
      method: 'GET',
      ...options,
    });
  }

  async post<T>(url: string, body?: any, options?: Omit<RequestOptions, 'body' | 'method'>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  }

  async put<T>(url: string, body?: any, options?: Omit<RequestOptions, 'body' | 'method'>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  }

  async delete<T>(url: string, options?: Omit<RequestOptions, 'body' | 'method'>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, {
      method: 'DELETE',
      ...options,
    });
  }

  async upload<T>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void,
    options?: { timeout?: number; tags?: string[] }
  ): Promise<ApiResponse<T>> {
    const requestId = this.generateRequestId();
    
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      // Set timeout if provided
      if (options?.timeout) {
        xhr.timeout = options.timeout;
      }

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress((e.loaded / e.total) * 100);
        }
      };

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({
              data,
              error: undefined,
              loading: false,
              timestamp: new Date().toISOString(),
            });
          } else {
            const error: EnhancedApiError = {
              code: xhr.status.toString(),
              message: data.message || 'Upload failed',
              details: data,
              retry: false,
              severity: this.getErrorSeverity(xhr.status),
              timestamp: new Date().toISOString(),
              requestId,
              context: { url, method: 'POST' },
            };

            resolve({
              data: undefined,
              error,
              loading: false,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (error) {
          const apiError: EnhancedApiError = {
            code: 'PARSE_ERROR',
            message: 'Failed to parse response',
            details: error,
            retry: false,
            severity: ErrorSeverity.HIGH,
            timestamp: new Date().toISOString(),
            requestId,
            context: { url, method: 'POST' },
          };

          resolve({
            data: undefined,
            error: apiError,
            loading: false,
            timestamp: new Date().toISOString(),
          });
        }
      };

      xhr.onerror = () => {
        const error: EnhancedApiError = {
          code: 'NETWORK_ERROR',
          message: 'Upload failed',
          details: null,
          retry: false,
          severity: ErrorSeverity.HIGH,
          timestamp: new Date().toISOString(),
          requestId,
          context: { url, method: 'POST' },
        };

        resolve({
          data: undefined,
          error,
          loading: false,
          timestamp: new Date().toISOString(),
        });
      };

      xhr.ontimeout = () => {
        const error: EnhancedApiError = {
          code: 'TIMEOUT',
          message: 'Upload timed out',
          details: null,
          retry: false,
          severity: ErrorSeverity.MEDIUM,
          timestamp: new Date().toISOString(),
          requestId,
          context: { url, method: 'POST' },
        };

        resolve({
          data: undefined,
          error,
          loading: false,
          timestamp: new Date().toISOString(),
        });
      };

      xhr.open('POST', `${this.baseUrl}${url}`);
      
      // Set auth header if available
      if (this.defaultHeaders['Authorization']) {
        xhr.setRequestHeader('Authorization', this.defaultHeaders['Authorization']);
      }
      
      xhr.setRequestHeader('X-Request-ID', requestId);
      xhr.send(formData);
    });
  }
}

// Create singleton instance
export const apiClient = new ApiClient({
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
});

// Debug logging for API client configuration
console.log('🔧 API Client Configuration:', {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  env: process.env.NODE_ENV,
}); 