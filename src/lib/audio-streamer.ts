import { audioApi } from './api/audio';
import { booksApi } from './api/books';
import { BookWithChunks } from '@/types/book';
import { AudioError } from '@/types/audio';

export class AudioStreamer {
  private bookId: string;
  private book: BookWithChunks | null = null;
  private currentChunk = 0;
  private audioElement: HTMLAudioElement | null = null;
  private chunkCache = new Map<number, string>(); // Cache for blob URLs
  private signedUrls = new Map<number, string>(); // Cache for signed URLs
  private urlExpirationTime = new Map<number, number>(); // Track URL expiration
  private prefetchSize = 5; // Number of chunks to prefetch
  private isInitialized = false;
  
  // Event handlers
  private onError?: (error: AudioError) => void;
  private onChunkChange?: (chunkIndex: number) => void;

  constructor(bookId: string, options: {
    onError?: (error: AudioError) => void;
    onChunkChange?: (chunkIndex: number) => void;
    prefetchSize?: number;
  } = {}) {
    this.bookId = bookId;
    this.onError = options.onError;
    this.onChunkChange = options.onChunkChange;
    this.prefetchSize = options.prefetchSize || 5;
  }

  async initialize(): Promise<void> {
    try {
      // 1. Get book data with chunks
      const bookResponse = await booksApi.getBookWithChunks(this.bookId);
      this.book = bookResponse.data || null;
      
      if (!this.book || !this.book.chunks.length) {
        throw new Error('Book not ready for streaming');
      }

      // 2. Generate initial batch of signed URLs (first few chunks)
      const initialChunks = Array.from({ length: Math.min(this.prefetchSize, this.book.chunks.length) }, (_, i) => i);
      await this.generateSignedUrls(initialChunks);

      // 3. Start prefetching first few chunks
      const prefetchChunks = initialChunks.slice(0, Math.min(3, this.book.chunks.length));
      this.prefetchChunks(prefetchChunks);

      this.isInitialized = true;
    } catch (error) {
      console.error('AudioStreamer initialization failed:', error);
      this.onError?.({
        type: 'network',
        message: 'Failed to initialize audio streamer',
        recoverable: true,
      });
      throw error;
    }
  }

  async generateSignedUrls(chunkIndices: number[]): Promise<void> {
    try {
      const response = await audioApi.generateBatchSignedUrls(this.bookId, chunkIndices);
      
      if (!response.data?.signed_urls) {
        throw new Error('Invalid batch signed URLs response');
      }

      const expirationTime = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 minute buffer
      
      // Store signed URLs with expiration tracking
      Object.entries(response.data.signed_urls).forEach(([chunkIndex, url]) => {
        const index = parseInt(chunkIndex);
        this.signedUrls.set(index, url);
        this.urlExpirationTime.set(index, expirationTime);
      });
    } catch (error) {
      console.error('Failed to generate batch signed URLs:', error);
      this.onError?.({
        type: 'network',
        message: 'Failed to generate signed URLs',
        recoverable: true,
      });
      throw error;
    }
  }

  private async prefetchChunks(chunkIndices: number[]): Promise<void> {
    // Download chunks in parallel
    const prefetchPromises = chunkIndices.map(async (chunkIndex) => {
      if (this.chunkCache.has(chunkIndex)) return; // Already cached

      try {
        const chunkUrl = await this.getChunkUrl(chunkIndex);
        const response = await fetch(chunkUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const audioBlob = await response.blob();
        const blobUrl = URL.createObjectURL(audioBlob);
        this.chunkCache.set(chunkIndex, blobUrl);
      } catch (error) {
        console.error(`Failed to prefetch chunk ${chunkIndex}:`, error);
        // Don't throw - prefetching failures shouldn't stop playback
      }
    });

    await Promise.allSettled(prefetchPromises);
  }

  private async getChunkUrl(chunkIndex: number): Promise<string> {
    // Check if we have a valid signed URL
    const signedUrl = this.signedUrls.get(chunkIndex);
    const expirationTime = this.urlExpirationTime.get(chunkIndex);
    
    if (signedUrl && expirationTime && Date.now() < expirationTime) {
      return signedUrl;
    }

    // URL expired or doesn't exist, generate new ones
    const chunksToGenerate = [chunkIndex];
    
    // Also generate URLs for upcoming chunks if they're missing/expired
    for (let i = 1; i <= this.prefetchSize; i++) {
      const nextChunk = chunkIndex + i;
      if (this.book && nextChunk < this.book.chunks.length) {
        const nextUrl = this.signedUrls.get(nextChunk);
        const nextExpiration = this.urlExpirationTime.get(nextChunk);
        
        if (!nextUrl || !nextExpiration || Date.now() >= nextExpiration - 300000) { // 5 minutes buffer
          chunksToGenerate.push(nextChunk);
        }
      }
    }

    await this.generateSignedUrls(chunksToGenerate);
    
    const newSignedUrl = this.signedUrls.get(chunkIndex);
    if (!newSignedUrl) {
      throw new Error(`Failed to get signed URL for chunk ${chunkIndex}`);
    }
    
    return newSignedUrl;
  }

  async loadChunk(chunkIndex: number): Promise<string> {
    if (!this.book || !this.isInitialized) {
      throw new Error('AudioStreamer not initialized');
    }

    if (chunkIndex < 0 || chunkIndex >= this.book.chunks.length) {
      throw new Error(`Invalid chunk index: ${chunkIndex}`);
    }

    try {
      // Check if chunk is cached
      let chunkUrl = this.chunkCache.get(chunkIndex);
      
      if (!chunkUrl) {
        // Not cached, need to download
        const signedUrl = await this.getChunkUrl(chunkIndex);
        const response = await fetch(signedUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const audioBlob = await response.blob();
        chunkUrl = URL.createObjectURL(audioBlob);
        this.chunkCache.set(chunkIndex, chunkUrl);
      }

      this.currentChunk = chunkIndex;
      this.onChunkChange?.(chunkIndex);

      // Prefetch upcoming chunks
      this.prefetchUpcoming(chunkIndex);

      return chunkUrl;
    } catch (error) {
      console.error(`Failed to load chunk ${chunkIndex}:`, error);
      this.onError?.({
        type: 'network',
        message: `Failed to load audio chunk ${chunkIndex}`,
        recoverable: true,
        chunk: chunkIndex,
      });
      throw error;
    }
  }

  private prefetchUpcoming(currentChunk: number): void {
    if (!this.book) return;

    const upcomingChunks: number[] = [];
    const signedUrlsNeeded: number[] = [];

    // Generate list of chunks to prefetch
    for (let i = 1; i <= this.prefetchSize; i++) {
      const nextChunk = currentChunk + i;
      if (nextChunk < this.book.chunks.length) {
        upcomingChunks.push(nextChunk);
        
        // Check if we need to generate signed URLs
        const signedUrl = this.signedUrls.get(nextChunk);
        const expirationTime = this.urlExpirationTime.get(nextChunk);
        
        if (!signedUrl || !expirationTime || Date.now() >= expirationTime - 300000) { // 5 minutes buffer
          signedUrlsNeeded.push(nextChunk);
        }
      }
    }

    // Generate signed URLs for chunks we don't have URLs for
    if (signedUrlsNeeded.length > 0) {
      this.generateSignedUrls(signedUrlsNeeded)
        .then(() => {
          this.prefetchChunks(upcomingChunks);
        })
        .catch((error) => {
          console.error('Failed to generate signed URLs for prefetch:', error);
          // Continue with prefetching existing chunks
          this.prefetchChunks(upcomingChunks.filter(chunk => this.signedUrls.has(chunk)));
        });
    } else {
      this.prefetchChunks(upcomingChunks);
    }
  }

  getCurrentChunk(): number {
    return this.currentChunk;
  }

  getTotalChunks(): number {
    return this.book?.chunks.length || 0;
  }

  getBook(): BookWithChunks | null {
    return this.book;
  }

  isReady(): boolean {
    return this.isInitialized && this.book !== null;
  }

  cleanup(): void {
    // Revoke all blob URLs to free memory
    this.chunkCache.forEach((blobUrl) => {
      URL.revokeObjectURL(blobUrl);
    });
    
    this.chunkCache.clear();
    this.signedUrls.clear();
    this.urlExpirationTime.clear();
    this.book = null;
    this.isInitialized = false;
  }
} 