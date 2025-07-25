import { BaseEntity } from './base';

export interface Book extends BaseEntity {
  title: string;
  format: 'pdf' | 'epub' | 'txt';
  status: BookStatus;
  percent_complete: number;
  total_chunks: number | null;
  duration?: number; // in seconds
  file_size?: number; // in bytes
  error_message?: string;
  language?: string;
  voice?: string;
}

export type BookStatus = 
  | 'pending'
  | 'processing'
  | 'extracting'
  | 'segmenting'
  | 'generating_audio'
  | 'transcoding'
  | 'completed'
  | 'failed';

export interface AudioChunk {
  seq: number;
  duration_s: number;
  url: string;
  file_size: number;
  cached?: boolean;
}

export interface BookWithChunks extends Book {
  chunks: AudioChunk[];
  total_duration_s: number;
}

export interface BookUpload {
  file: File;
  title: string;
  format: 'pdf' | 'epub' | 'txt';
  language?: string;
  voice?: string;
}

export interface BookLibraryQuery {
  search?: string;
  status?: BookStatus[];
  sortBy?: 'title' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
} 