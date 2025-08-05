import { apiClient } from '@/lib/api/client';
import { RequestInterceptor } from '@/lib/api/client';

export interface RequestLog {
  timestamp: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  response?: {
    status: number;
    statusText: string;
    data?: any;
    error?: any;
  };
  duration?: number;
}

class RequestLogger {
  private logs: RequestLog[] = [];
  private isEnabled = false;

  enable() {
    if (this.isEnabled) return;
    
    this.isEnabled = true;
    
    const interceptor: RequestInterceptor = {
      onRequest: async (url: string, options: RequestInit) => {
        const startTime = Date.now();
        
        const log: RequestLog = {
          timestamp: new Date().toISOString(),
          url,
          method: options.method || 'GET',
          headers: options.headers as Record<string, string>,
          body: options.body ? JSON.parse(options.body as string) : undefined,
        };
        
        this.logs.push(log);
        
        // Store start time for duration calculation
        (options as any)._startTime = startTime;
        (options as any)._logIndex = this.logs.length - 1;
        
        console.group(`🚀 API Request: ${options.method} ${url}`);
        console.log('Headers:', options.headers);
        console.log('Body:', log.body);
        console.groupEnd();
        
        return options;
      },
      
      onResponse: async (response: Response, url: string) => {
        const options = (response as any)._requestOptions;
        const startTime = options?._startTime;
        const logIndex = options?._logIndex;
        
        if (typeof logIndex === 'number' && this.logs[logIndex]) {
          this.logs[logIndex].duration = startTime ? Date.now() - startTime : undefined;
          
          try {
            const responseClone = response.clone();
            const data = await responseClone.json();
            
            this.logs[logIndex].response = {
              status: response.status,
              statusText: response.statusText,
              data,
            };
            
            console.group(`📥 API Response: ${response.status} ${url}`);
            console.log('Duration:', this.logs[logIndex].duration + 'ms');
            console.log('Data:', data);
            console.groupEnd();
            
          } catch (error) {
            this.logs[logIndex].response = {
              status: response.status,
              statusText: response.statusText,
              error: 'Failed to parse response',
            };
            
            console.group(`❌ API Response Error: ${response.status} ${url}`);
            console.log('Parse error:', error);
            console.groupEnd();
          }
        }
        
        return response;
      },
      
      onError: (error, url) => {
        console.group(`💥 API Error: ${url}`);
        console.error('Error details:', error);
        console.groupEnd();
      }
    };
    
    apiClient.addInterceptor(interceptor);
    console.log('🔍 Request interceptor enabled');
  }

  disable() {
    this.isEnabled = false;
    // Note: No way to remove interceptor currently, would need to restart
    console.log('⏹️ Request interceptor disabled (restart to fully remove)');
  }

  getLogs(): RequestLog[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    console.log('🧹 Request logs cleared');
  }

  getAudioRequests(): RequestLog[] {
    return this.logs.filter(log => 
      log.url.includes('/chunks') || 
      log.url.includes('/status') || 
      log.url.includes('/batch-signed-urls')
    );
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const requestLogger = new RequestLogger();

// Global access for testing
if (typeof window !== 'undefined') {
  (window as any).audioDebug = {
    enableRequestLogging: () => requestLogger.enable(),
    disableRequestLogging: () => requestLogger.disable(),
    getRequestLogs: () => requestLogger.getLogs(),
    getAudioRequests: () => requestLogger.getAudioRequests(),
    clearLogs: () => requestLogger.clearLogs(),
    exportLogs: () => requestLogger.exportLogs(),
  };
}