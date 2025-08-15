import { audioApi } from './api/audio';
import { booksApi } from './api/books';
import { BookWithChunks } from '@/types/book';
import { AudioError } from '@/types/audio';
import { VirtualTimelineManager } from './audio/virtual-timeline';

export interface SeamlessPlaybackCallbacks {
  onError?: (error: AudioError) => void;
  onChunkChange?: (chunkIndex: number) => void;
  onVirtualTimeUpdate?: (virtualTime: number, duration: number) => void;
  onSeamlessTransition?: (fromChunk: number, toChunk: number) => void;
  onPreloadProgress?: (chunkIndex: number, progress: number) => void;
}

export class AudioStreamer {
  private bookId: string;
  private book: BookWithChunks | null = null;
  private currentChunk = 0;
  
  // Dual audio elements for seamless playback
  private primaryAudio: HTMLAudioElement | null = null;
  private secondaryAudio: HTMLAudioElement | null = null;
  private activePrimary = true; // Which audio element is currently active
  
  // Virtual timeline
  private virtualTimeline: VirtualTimelineManager;
  private isTransitioning = false;
  private transitionThreshold = 1.0; // Seconds before chunk end to start transition
  
  // Caching and preloading
  private chunkCache = new Map<number, string>(); // Cache for blob URLs
  private signedUrls = new Map<number, string>(); // Cache for signed URLs
  private urlExpirationTime = new Map<number, number>(); // Track URL expiration
  private prefetchSize = 5; // Number of chunks to prefetch
  private isInitialized = false;
  
  // Preloading state
  private preloadQueue = new Set<number>(); // Chunks currently being preloaded
  private preloadPromises = new Map<number, Promise<string>>(); // Track preload operations
  
  // Event handlers
  private callbacks: SeamlessPlaybackCallbacks;

  constructor(bookId: string, callbacks: SeamlessPlaybackCallbacks = {}, options: {
    prefetchSize?: number;
    transitionThreshold?: number;
  } = {}) {
    this.bookId = bookId;
    this.callbacks = callbacks;
    this.prefetchSize = options.prefetchSize || 5;
    this.transitionThreshold = options.transitionThreshold || 1.0;
    this.virtualTimeline = new VirtualTimelineManager();
  }

  async initialize(): Promise<void> {
    try {
      // 1. Get book data with chunks
      const bookResponse = await booksApi.getBookWithChunks(this.bookId);
      this.book = bookResponse.data || null;
      
      if (!this.book || !this.book.chunks.length) {
        throw new Error('Book not ready for streaming');
      }

      // 2. Initialize virtual timeline
      this.virtualTimeline.initialize(this.book.chunks);

      // 3. Create dual audio elements
      this.createAudioElements();

      // 4. Generate initial batch of signed URLs (first few chunks)
      const initialChunks = Array.from({ length: Math.min(this.prefetchSize, this.book.chunks.length) }, (_, i) => i);
      await this.generateSignedUrls(initialChunks);

      // 5. Start prefetching first few chunks
      const prefetchChunks = initialChunks.slice(0, Math.min(3, this.book.chunks.length));
      this.prefetchChunks(prefetchChunks);

      this.isInitialized = true;
    } catch (error) {
      console.error('AudioStreamer initialization failed:', error);
      this.callbacks.onError?.({
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
      this.callbacks.onError?.({
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
        const response = await fetch(chunkUrl, {
          credentials: 'include' // Important for CORS with credentials
        });
        
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
        const response = await fetch(signedUrl, {
          credentials: 'include' // Important for CORS with credentials
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const audioBlob = await response.blob();
        chunkUrl = URL.createObjectURL(audioBlob);
        this.chunkCache.set(chunkIndex, chunkUrl);
      }

      this.currentChunk = chunkIndex;
      this.callbacks.onChunkChange?.(chunkIndex);

      // Prefetch upcoming chunks
      this.prefetchUpcoming(chunkIndex);

      return chunkUrl;
    } catch (error) {
      console.error(`Failed to load chunk ${chunkIndex}:`, error);
      this.callbacks.onError?.({
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

  // ===== SEAMLESS PLAYBACK METHODS =====

  private createAudioElements(): void {
    this.primaryAudio = new Audio();
    this.secondaryAudio = new Audio();
    
    // Configure both audio elements
    [this.primaryAudio, this.secondaryAudio].forEach((audio) => {
      audio.preload = 'auto';
      audio.crossOrigin = 'use-credentials';
      
      // Add time update listener for virtual time tracking
      audio.addEventListener('timeupdate', () => {
        if (this.isActiveAudio(audio)) {
          this.handleTimeUpdate(audio);
        }
      });
      
      // Add ended listener for automatic transitions
      audio.addEventListener('ended', () => {
        if (this.isActiveAudio(audio)) {
          this.handleChunkEnd();
        }
      });
    });
  }

  private isActiveAudio(audio: HTMLAudioElement): boolean {
    return (this.activePrimary && audio === this.primaryAudio) ||
           (!this.activePrimary && audio === this.secondaryAudio);
  }

  private getActiveAudio(): HTMLAudioElement | null {
    return this.activePrimary ? this.primaryAudio : this.secondaryAudio;
  }

  private getInactiveAudio(): HTMLAudioElement | null {
    return this.activePrimary ? this.secondaryAudio : this.primaryAudio;
  }

  private handleTimeUpdate(audio: HTMLAudioElement): void {
    if (!this.isInitialized || this.isTransitioning) return;
    
    const currentTime = audio.currentTime;
    const virtualTime = this.virtualTimeline.getVirtualTime(this.currentChunk, currentTime);
    const totalDuration = this.virtualTimeline.getTotalDuration();
    
    // Notify about virtual time update
    this.callbacks.onVirtualTimeUpdate?.(virtualTime, totalDuration);
    
    // Check if we need to prepare for seamless transition
    const chunkInfo = this.virtualTimeline.getChunkByIndex(this.currentChunk);
    if (chunkInfo) {
      const timeUntilEnd = chunkInfo.duration - currentTime;
      
      if (timeUntilEnd <= this.transitionThreshold && !this.isTransitioning) {
        this.prepareSeamlessTransition();
      }
    }
  }

  private async prepareSeamlessTransition(): Promise<void> {
    if (this.isTransitioning || this.currentChunk >= this.getTotalChunks() - 1) {
      return; // Already transitioning or at last chunk
    }

    this.isTransitioning = true;
    const nextChunkIndex = this.currentChunk + 1;

    try {
      // Preload next chunk if not already cached
      await this.preloadChunk(nextChunkIndex);
      
      // Load next chunk into inactive audio element
      const inactiveAudio = this.getInactiveAudio();
      const nextChunkUrl = this.chunkCache.get(nextChunkIndex);
      
      if (inactiveAudio && nextChunkUrl) {
        inactiveAudio.src = nextChunkUrl;
        inactiveAudio.currentTime = 0;
        
        // Preload the audio
        await new Promise<void>((resolve, reject) => {
          const onCanPlay = () => {
            inactiveAudio.removeEventListener('canplay', onCanPlay);
            inactiveAudio.removeEventListener('error', onError);
            resolve();
          };
          
          const onError = () => {
            inactiveAudio.removeEventListener('canplay', onCanPlay);
            inactiveAudio.removeEventListener('error', onError);
            reject(new Error('Failed to load next chunk for seamless transition'));
          };
          
          inactiveAudio.addEventListener('canplay', onCanPlay);
          inactiveAudio.addEventListener('error', onError);
        });
      }
    } catch (error) {
      console.error('Failed to prepare seamless transition:', error);
      this.isTransitioning = false;
    }
  }

  private handleChunkEnd(): void {
    if (this.currentChunk >= this.getTotalChunks() - 1) {
      // End of audiobook
      this.isTransitioning = false;
      return;
    }

    const nextChunkIndex = this.currentChunk + 1;
    
    if (this.isTransitioning) {
      // Seamless transition
      this.performSeamlessTransition(nextChunkIndex);
    } else {
      // Fallback: load next chunk normally
      this.loadChunk(nextChunkIndex).catch(error => {
        console.error('Failed to load next chunk:', error);
      });
    }
  }

  private performSeamlessTransition(nextChunkIndex: number): void {
    const activeAudio = this.getActiveAudio();
    const inactiveAudio = this.getInactiveAudio();
    
    if (!activeAudio || !inactiveAudio) {
      this.isTransitioning = false;
      return;
    }

    // Pause current audio
    activeAudio.pause();
    
    // Switch to inactive audio (which should have next chunk loaded)
    this.activePrimary = !this.activePrimary;
    this.currentChunk = nextChunkIndex;
    
    // Start playing next chunk
    const newActiveAudio = this.getActiveAudio();
    if (newActiveAudio && newActiveAudio.src) {
      newActiveAudio.play().catch(error => {
        console.error('Failed to start seamless transition:', error);
      });
    }
    
    // Notify about transition
    this.callbacks.onSeamlessTransition?.(this.currentChunk - 1, this.currentChunk);
    this.callbacks.onChunkChange?.(this.currentChunk);
    
    this.isTransitioning = false;
    
    // Prefetch upcoming chunks
    this.prefetchUpcoming(this.currentChunk);
  }

  async preloadChunk(chunkIndex: number): Promise<string> {
    // Check if chunk is already cached
    if (this.chunkCache.has(chunkIndex)) {
      return this.chunkCache.get(chunkIndex)!;
    }

    // Check if preload is already in progress
    if (this.preloadPromises.has(chunkIndex)) {
      return this.preloadPromises.get(chunkIndex)!;
    }

    // Start new preload operation
    const preloadPromise = this.performPreload(chunkIndex);
    this.preloadPromises.set(chunkIndex, preloadPromise);
    this.preloadQueue.add(chunkIndex);

    try {
      const result = await preloadPromise;
      this.preloadQueue.delete(chunkIndex);
      this.preloadPromises.delete(chunkIndex);
      return result;
    } catch (error) {
      this.preloadQueue.delete(chunkIndex);
      this.preloadPromises.delete(chunkIndex);
      throw error;
    }
  }

  private async performPreload(chunkIndex: number): Promise<string> {
    try {
      const chunkUrl = await this.getChunkUrl(chunkIndex);
      
      // Report preload progress
      this.callbacks.onPreloadProgress?.(chunkIndex, 0);
      
      const response = await fetch(chunkUrl, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      this.callbacks.onPreloadProgress?.(chunkIndex, 50);
      
      const audioBlob = await response.blob();
      const blobUrl = URL.createObjectURL(audioBlob);
      
      this.chunkCache.set(chunkIndex, blobUrl);
      this.callbacks.onPreloadProgress?.(chunkIndex, 100);
      
      return blobUrl;
    } catch (error) {
      console.error(`Failed to preload chunk ${chunkIndex}:`, error);
      throw error;
    }
  }

  // Enhanced seeking with virtual timeline
  async seekToVirtualTime(virtualTime: number): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('AudioStreamer not initialized');
    }

    const { chunkIndex, localTime } = this.virtualTimeline.getChunkPosition(virtualTime);
    
    if (chunkIndex !== this.currentChunk) {
      // Need to load different chunk
      await this.loadChunk(chunkIndex);
    }
    
    const activeAudio = this.getActiveAudio();
    if (activeAudio) {
      activeAudio.currentTime = localTime;
    }
  }

  getCurrentVirtualTime(): number {
    const activeAudio = this.getActiveAudio();
    if (!activeAudio || !this.isInitialized) {
      return 0;
    }
    
    return this.virtualTimeline.getVirtualTime(this.currentChunk, activeAudio.currentTime);
  }

  getTotalVirtualDuration(): number {
    return this.virtualTimeline.getTotalDuration();
  }

  getVirtualTimeline(): VirtualTimelineManager {
    return this.virtualTimeline;
  }

  isNearChunkEnd(threshold: number = this.transitionThreshold): boolean {
    const activeAudio = this.getActiveAudio();
    if (!activeAudio) return false;
    
    const chunkInfo = this.virtualTimeline.getChunkByIndex(this.currentChunk);
    if (!chunkInfo) return false;
    
    const timeUntilEnd = chunkInfo.duration - activeAudio.currentTime;
    return timeUntilEnd <= threshold;
  }

  // ===== EXISTING METHODS (ENHANCED) =====

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

  getActiveAudioElement(): HTMLAudioElement | null {
    return this.getActiveAudio();
  }

  cleanup(): void {
    // Cleanup audio elements
    if (this.primaryAudio) {
      this.primaryAudio.pause();
      this.primaryAudio.src = '';
      this.primaryAudio = null;
    }
    
    if (this.secondaryAudio) {
      this.secondaryAudio.pause();
      this.secondaryAudio.src = '';
      this.secondaryAudio = null;
    }
    
    // Revoke all blob URLs to free memory
    this.chunkCache.forEach((blobUrl) => {
      URL.revokeObjectURL(blobUrl);
    });
    
    // Clear all caches and state
    this.chunkCache.clear();
    this.signedUrls.clear();
    this.urlExpirationTime.clear();
    this.preloadQueue.clear();
    this.preloadPromises.clear();
    
    this.book = null;
    this.isInitialized = false;
    this.isTransitioning = false;
    this.currentChunk = 0;
    this.activePrimary = true;
  }
} 