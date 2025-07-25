import { NetworkStatus } from '@/types/base';

interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body?: any;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'low' | 'normal' | 'high';
  tags?: string[];
}

interface NetworkState {
  status: NetworkStatus;
  isOnline: boolean;
  effectiveType?: string;
  rtt?: number;
  downlink?: number;
  lastChanged: number;
}

export class OfflineManager {
  private requestQueue: QueuedRequest[] = [];
  private networkState: NetworkState = {
    status: 'unknown',
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : false,
    lastChanged: Date.now(),
  };
  private networkStateListeners: ((state: NetworkState) => void)[] = [];
  private isProcessingQueue = false;
  private maxQueueSize = 100;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeNetworkMonitoring();
      this.loadQueueFromStorage();
    }
  }

  private initializeNetworkMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Basic online/offline detection
    window.addEventListener('online', () => {
      this.updateNetworkState({
        status: 'online',
        isOnline: true,
        lastChanged: Date.now(),
      });
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      this.updateNetworkState({
        status: 'offline',
        isOnline: false,
        lastChanged: Date.now(),
      });
    });

    // Enhanced network information (if available)
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateConnectionInfo = () => {
        this.updateNetworkState({
          status: this.getNetworkStatus(connection),
          isOnline: navigator.onLine,
          effectiveType: connection.effectiveType,
          rtt: connection.rtt,
          downlink: connection.downlink,
          lastChanged: Date.now(),
        });
      };

      connection.addEventListener('change', updateConnectionInfo);
      updateConnectionInfo(); // Initial state
    }
  }

  private getNetworkStatus(connection: any): NetworkStatus {
    if (typeof navigator === 'undefined' || !navigator.onLine) return 'offline';
    
    if (connection.effectiveType === '2g' || connection.rtt > 1000) {
      return 'slow';
    }
    
    return 'online';
  }

  private updateNetworkState(newState: Partial<NetworkState>): void {
    const previousState = { ...this.networkState };
    this.networkState = { ...this.networkState, ...newState };
    
    // Only notify if status changed
    if (previousState.status !== this.networkState.status) {
      this.networkStateListeners.forEach(listener => listener(this.networkState));
    }
  }

  private loadQueueFromStorage(): void {
    try {
      const stored = localStorage.getItem('offline_request_queue');
      if (stored) {
        this.requestQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load offline queue:', error);
      this.requestQueue = [];
    }
  }

  private saveQueueToStorage(): void {
    try {
      localStorage.setItem('offline_request_queue', JSON.stringify(this.requestQueue));
    } catch (error) {
      console.warn('Failed to save offline queue:', error);
    }
  }

  private generateRequestId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add request to offline queue
   */
  enqueueRequest(
    url: string,
    method: string,
    body?: any,
    options?: {
      priority?: 'low' | 'normal' | 'high';
      maxRetries?: number;
      tags?: string[];
    }
  ): string {
    const requestId = this.generateRequestId();
    const queuedRequest: QueuedRequest = {
      id: requestId,
      url,
      method,
      body,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: options?.maxRetries || 3,
      priority: options?.priority || 'normal',
      tags: options?.tags,
    };

    // Insert based on priority
    const insertIndex = this.findInsertionIndex(queuedRequest.priority);
    this.requestQueue.splice(insertIndex, 0, queuedRequest);

    // Limit queue size
    if (this.requestQueue.length > this.maxQueueSize) {
      this.requestQueue = this.requestQueue.slice(-this.maxQueueSize);
    }

    this.saveQueueToStorage();
    
    // Try to process immediately if online
    if (this.networkState.isOnline) {
      this.processQueue();
    }

    return requestId;
  }

  private findInsertionIndex(priority: 'low' | 'normal' | 'high'): number {
    const priorityOrder = { high: 2, normal: 1, low: 0 };
    const targetPriority = priorityOrder[priority];

    for (let i = 0; i < this.requestQueue.length; i++) {
      const currentPriority = priorityOrder[this.requestQueue[i].priority];
      if (currentPriority < targetPriority) {
        return i;
      }
    }

    return this.requestQueue.length;
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || !this.networkState.isOnline) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      const requestsToProcess = [...this.requestQueue];
      
      for (const request of requestsToProcess) {
        try {
          await this.executeRequest(request);
          this.removeFromQueue(request.id);
        } catch (error) {
          console.warn(`Failed to execute queued request ${request.id}:`, error);
          
          request.retryCount++;
          if (request.retryCount >= request.maxRetries) {
            console.error(`Max retries exceeded for request ${request.id}`);
            this.removeFromQueue(request.id);
          }
        }
      }
    } finally {
      this.isProcessingQueue = false;
      this.saveQueueToStorage();
    }
  }

  private async executeRequest(request: QueuedRequest): Promise<any> {
    const response = await fetch(`${request.url}`, {
      method: request.method,
      body: request.body ? JSON.stringify(request.body) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...request.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  private removeFromQueue(requestId: string): void {
    this.requestQueue = this.requestQueue.filter(req => req.id !== requestId);
  }

  /**
   * Cancel queued request
   */
  cancelQueuedRequest(requestId: string): boolean {
    const index = this.requestQueue.findIndex(req => req.id === requestId);
    if (index > -1) {
      this.requestQueue.splice(index, 1);
      this.saveQueueToStorage();
      return true;
    }
    return false;
  }

  /**
   * Get network state
   */
  getNetworkState(): NetworkState {
    return { ...this.networkState };
  }

  /**
   * Subscribe to network state changes
   */
  onNetworkStateChange(listener: (state: NetworkState) => void): () => void {
    this.networkStateListeners.push(listener);
    return () => {
      const index = this.networkStateListeners.indexOf(listener);
      if (index > -1) {
        this.networkStateListeners.splice(index, 1);
      }
    };
  }

  /**
   * Clear the offline queue
   */
  clearQueue(): void {
    this.requestQueue = [];
    this.saveQueueToStorage();
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    size: number;
    maxSize: number;
    pendingRequests: number;
    failedRequests: number;
  } {
    const failed = this.requestQueue.filter(req => req.retryCount >= req.maxRetries);
    
    return {
      size: this.requestQueue.length,
      maxSize: this.maxQueueSize,
      pendingRequests: this.requestQueue.length - failed.length,
      failedRequests: failed.length,
    };
  }

  /**
   * Check if should use cache based on network conditions
   */
  shouldUseCache(): boolean {
    return (
      !this.networkState.isOnline ||
      this.networkState.status === 'slow' ||
      (this.networkState.rtt !== undefined && this.networkState.rtt > 2000)
    );
  }

  /**
   * Get cache strategy based on network conditions
   */
  getCacheStrategy(): 'cache-first' | 'network-first' | 'cache-only' | 'network-only' {
    if (!this.networkState.isOnline) {
      return 'cache-only';
    }
    
    if (this.networkState.status === 'slow') {
      return 'cache-first';
    }
    
    return 'network-first';
  }
}

// Create singleton instance
export const offlineManager = new OfflineManager(); 