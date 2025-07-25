export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: ApiError;
  loading: boolean;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  retry?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface StorageQuota {
  used: number;
  total: number;
  available: number;
  percentage: number;
}

export type NetworkStatus = 'online' | 'offline' | 'slow' | 'unknown';

export interface AppConfig {
  apiUrl: string;
  environment: 'development' | 'staging' | 'production';
  enableAnalytics: boolean;
  maxUploadSize: number;
  supportedFormats: string[];
} 