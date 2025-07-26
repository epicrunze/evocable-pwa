import { apiClient } from './client';
import { Bookmark, PlaybackSession } from '@/types/audio';
import { ApiResponse } from '@/types/base';

export class AudioApi {
  /**
   * Get bookmarks for a specific book
   */
  async getBookmarks(bookId: string): Promise<ApiResponse<Bookmark[]>> {
    return apiClient.get<Bookmark[]>(`/audio/bookmarks`, { bookId });
  }

  /**
   * Create a new bookmark
   */
  async createBookmark(bookmark: Omit<Bookmark, 'id' | 'created_at'>): Promise<ApiResponse<Bookmark>> {
    return apiClient.post<Bookmark>('/audio/bookmarks', bookmark);
  }

  /**
   * Update an existing bookmark
   */
  async updateBookmark(id: string, updates: Partial<Pick<Bookmark, 'title' | 'time' | 'chunk'>>): Promise<ApiResponse<Bookmark>> {
    return apiClient.put<Bookmark>(`/audio/bookmarks/${id}`, updates);
  }

  /**
   * Delete a bookmark
   */
  async deleteBookmark(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/audio/bookmarks/${id}`);
  }

  /**
   * Save playback session
   */
  async savePlaybackSession(session: PlaybackSession): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/audio/sessions', session);
  }

  /**
   * Get playback session for a book
   */
  async getPlaybackSession(bookId: string): Promise<ApiResponse<PlaybackSession | null>> {
    return apiClient.get<PlaybackSession | null>(`/audio/sessions/${bookId}`);
  }

  /**
   * Get user's listening statistics
   */
  async getListeningStats(): Promise<ApiResponse<{
    totalListeningTime: number;
    booksCompleted: number;
    averageSessionLength: number;
    streakDays: number;
  }>> {
    return apiClient.get('/audio/stats');
  }

  /**
   * Report playback error
   */
  async reportPlaybackError(error: {
    bookId: string;
    chunkIndex?: number;
    errorType: string;
    errorMessage: string;
    userAgent: string;
    timestamp: string;
  }): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/audio/errors', error);
  }

  /**
   * Generate a signed URL for accessing an audio chunk
   */
  async generateSignedUrl(bookId: string, chunkIndex: number, expiresIn: number = 3600): Promise<ApiResponse<{ signed_url: string; expires_in: number }>> {
    const url = `/api/v1/books/${bookId}/chunks/${chunkIndex}/signed-url?expires_in=${expiresIn}`;
    return apiClient.post<{ signed_url: string; expires_in: number }>(url, {});
  }

  /**
   * Generate batch signed URLs for multiple audio chunks
   */
  async generateBatchSignedUrls(bookId: string, chunkIndices: number[], expiresIn: number = 3600): Promise<ApiResponse<{ 
    signed_urls: Record<number, string>; 
    expires_in: number 
  }>> {
    const url = `/api/v1/books/${bookId}/chunks/batch-signed-urls`;
    return apiClient.post<{ signed_urls: Record<number, string>; expires_in: number }>(url, {
      chunks: chunkIndices,
      expires_in: expiresIn
    });
  }

  /**
   * Get audio chunk stream URL with authentication
   * Uses signed URLs for secure access without exposing tokens
   */
  async getAuthenticatedChunkUrl(bookId: string, chunkIndex: number): Promise<string> {
    try {
      // Generate a signed URL for secure access
      const response = await this.generateSignedUrl(bookId, chunkIndex);
      if (response.data?.signed_url) {
        return response.data.signed_url;
      }
    } catch (error) {
      console.warn('Failed to generate signed URL:', error);
      throw new Error('Unable to generate secure audio URL');
    }

    // No fallback to query parameter method for security reasons
    throw new Error('Signed URL generation failed');
  }

  /**
   * Check chunk availability
   */
  async checkChunkAvailability(bookId: string, chunkIndices: number[]): Promise<ApiResponse<{
    available: number[];
    unavailable: number[];
  }>> {
    return apiClient.post(`/audio/check-availability`, {
      bookId,
      chunks: chunkIndices,
    });
  }

  /**
   * Request chunk transcoding to different quality
   */
  async requestTranscoding(bookId: string, quality: 'low' | 'medium' | 'high'): Promise<ApiResponse<{
    jobId: string;
    estimatedDuration: number;
  }>> {
    return apiClient.post(`/audio/transcode`, {
      bookId,
      quality,
    });
  }

  /**
   * Get transcoding job status
   */
  async getTranscodingStatus(jobId: string): Promise<ApiResponse<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    estimatedTimeRemaining?: number;
  }>> {
    return apiClient.get(`/audio/transcode/${jobId}/status`);
  }
}

// Create singleton instance
export const audioApi = new AudioApi(); 