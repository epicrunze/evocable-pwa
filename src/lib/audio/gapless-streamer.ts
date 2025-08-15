import { AudioError } from '@/types/audio';
import { VirtualTimelineManager } from './virtual-timeline';
import { audioApi } from '@/lib/api/audio';
import { booksApi } from '@/lib/api/books';
import { BookWithChunks } from '@/types/book';

// Dynamic import type for Gapless5
type Gapless5Type = any;

export interface GaplessPlaybackCallbacks {
  onError?: (error: AudioError) => void;
  onChunkChange?: (chunkIndex: number) => void;
  onVirtualTimeUpdate?: (virtualTime: number, duration: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
}

export class GaplessAudioStreamer {
  private bookId: string;
  private book: BookWithChunks | null = null;
  private player: Gapless5Type | null = null;
  private virtualTimeline: VirtualTimelineManager;
  private callbacks: GaplessPlaybackCallbacks;
  
  // Caching and URL management
  private chunkUrls = new Map<number, string>(); // Cache for signed URLs
  private signedUrls = new Map<number, string>(); // Cache for signed URLs
  private urlExpirationTime = new Map<number, number>(); // Track URL expiration
  private prefetchSize = 5; // Number of chunks to prefetch URLs for
  private initialBatchSize = 20; // Max chunks to load initially
  private maxBatchSize = 10; // Max chunks per batch request
  private isInitialized = false;
  
  // Playback state
  private currentChunk = 0;
  private isPlaying = false;
  private timeUpdateInterval: NodeJS.Timeout | null = null;

  constructor(bookId: string, callbacks: GaplessPlaybackCallbacks = {}, options: {
    prefetchSize?: number;
    crossfade?: number;
    initialBatchSize?: number;
    maxBatchSize?: number;
  } = {}) {
    this.bookId = bookId;
    this.callbacks = callbacks;
    this.prefetchSize = options.prefetchSize || 5;
    this.initialBatchSize = options.initialBatchSize || 20; // Max chunks to load initially
    this.maxBatchSize = options.maxBatchSize || 10; // Max chunks per batch request
    this.virtualTimeline = new VirtualTimelineManager();
  }

  async initialize(): Promise<void> {
    try {
      console.log('🎵 Initializing Gapless Audio Streamer...');
      
      // Check if we're in the browser before proceeding
      if (typeof window === 'undefined') {
        throw new Error('Gapless Audio Streamer can only be initialized in the browser');
      }
      
      // 1. Get book data with chunks
      const bookResponse = await booksApi.getBookWithChunks(this.bookId);
      this.book = bookResponse.data || null;
      
      if (!this.book || !this.book.chunks.length) {
        throw new Error('Book not ready for streaming');
      }

      console.log(`📚 Book loaded: "${this.book.title}" (${this.book.chunks.length} chunks, ${this.book.total_duration_s.toFixed(2)}s)`);

      // 2. Initialize virtual timeline
      this.virtualTimeline.initialize(this.book.chunks);

      // 3. Generate signed URLs for initial batch (not all chunks for better performance)
      await this.generateInitialSignedUrls();

      // 4. Create initial track URLs array for Gapless5 (only for loaded chunks)
      const trackUrls = this.book.chunks.map((_, index) => {
        const url = this.chunkUrls.get(index);
        return url || ''; // Use empty string for chunks we haven't loaded yet
      });

      // 5. Dynamically import and initialize Gapless5 player
      const { Gapless5 } = await import('@regosen/gapless-5');
      this.player = new Gapless5({
        tracks: trackUrls,
        crossfade: 25, // Reduced to 25ms for tighter transitions
        loadLimit: 5, // Load more tracks for better buffering
        loop: false,
        shuffle: false,
        useWebAudio: true, // Use Web Audio API for better performance
        useHTML5Audio: false, // Disable HTML5 audio to prevent conflicts
      });

      // 6. Set up event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('✅ Gapless Audio Streamer initialized successfully');
      
    } catch (error) {
      console.error('❌ Gapless Audio Streamer initialization failed:', error);
      this.callbacks.onError?.({
        type: 'network',
        message: 'Failed to initialize seamless audio player',
        recoverable: true,
      });
      throw error;
    }
  }

  private async generateInitialSignedUrls(): Promise<void> {
    if (!this.book) return;
    
    try {
      console.log('🔗 Generating initial signed URLs...');
      
      // Generate URLs for initial batch only (not all chunks)
      const maxInitialChunks = Math.min(this.initialBatchSize, this.book.chunks.length);
      const chunkIndices = Array.from({ length: maxInitialChunks }, (_, i) => i);
      
      await this.generateSignedUrlsForChunks(chunkIndices);
      
      console.log(`✅ Generated ${chunkIndices.length} initial signed URLs`);
      
    } catch (error) {
      console.error('❌ Failed to generate initial signed URLs:', error);
      this.callbacks.onError?.({
        type: 'network',
        message: 'Failed to generate initial audio URLs',
        recoverable: true,
      });
      throw error;
    }
  }

  private async generateSignedUrlsForChunks(chunkIndices: number[]): Promise<void> {
    if (chunkIndices.length === 0) return;
    
    try {
      const response = await audioApi.generateBatchSignedUrls(this.bookId, chunkIndices);
      
      if (!response.data?.signed_urls) {
        throw new Error('Invalid batch signed URLs response');
      }

      const expirationTime = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 minute buffer
      
      // Store signed URLs
      Object.entries(response.data.signed_urls).forEach(([chunkIndex, url]) => {
        const index = parseInt(chunkIndex);
        this.signedUrls.set(index, url);
        this.chunkUrls.set(index, url);
        this.urlExpirationTime.set(index, expirationTime);
      });
      
    } catch (error) {
      console.error('❌ Failed to generate signed URLs for chunks:', chunkIndices, error);
      throw error;
    }
  }

  private async ensureSignedUrl(chunkIndex: number): Promise<string> {
    // Check if we already have a valid URL
    const existingUrl = this.signedUrls.get(chunkIndex);
    const expirationTime = this.urlExpirationTime.get(chunkIndex);
    
    if (existingUrl && expirationTime && Date.now() < expirationTime) {
      return existingUrl;
    }
    
    // Generate URLs for this chunk and nearby chunks in a batch
    const chunksToGenerate: number[] = [];
    const batchSize = Math.min(this.prefetchSize, this.maxBatchSize);
    const startChunk = Math.max(0, chunkIndex - Math.floor(batchSize / 2));
    const endChunk = Math.min(this.book?.chunks.length || 0, startChunk + batchSize);
    
    for (let i = startChunk; i < endChunk; i++) {
      const hasValidUrl = this.signedUrls.has(i) && 
                         this.urlExpirationTime.has(i) && 
                         Date.now() < (this.urlExpirationTime.get(i) || 0);
      if (!hasValidUrl) {
        chunksToGenerate.push(i);
      }
    }
    
    if (chunksToGenerate.length > 0) {
      await this.generateSignedUrlsForChunks(chunksToGenerate);
      // Update the player tracks with new URLs
      await this.updatePlayerTracks();
    }
    
    const newUrl = this.signedUrls.get(chunkIndex);
    if (!newUrl) {
      throw new Error(`Failed to get signed URL for chunk ${chunkIndex}`);
    }
    
    return newUrl;
  }

  private async updatePlayerTracks(): Promise<void> {
    if (!this.player || !this.book) return;
    
    try {
      // Create updated track URLs array
      const trackUrls = this.book.chunks.map((_, index) => {
        const url = this.chunkUrls.get(index);
        return url || ''; // Use empty string for chunks we haven't loaded yet
      });

      // Check if Gapless5 has a method to update tracks
      if (typeof this.player.replacePlaylist === 'function') {
        this.player.replacePlaylist(trackUrls);
      } else if (typeof this.player.updateTracks === 'function') {
        this.player.updateTracks(trackUrls);
      } else {
        // If no update method exists, we might need to recreate the player
        console.log('🔄 Updating player tracks (no direct update method available)');
        // For now, just update our internal mapping
        // The player might handle empty URLs gracefully or we may need another approach
      }
    } catch (error) {
      console.error('❌ Failed to update player tracks:', error);
    }
  }

  private async prefetchUpcomingChunks(currentChunk: number): Promise<void> {
    if (!this.book) return;
    
    const chunksToLoad: number[] = [];
    const maxChunk = this.book.chunks.length - 1;
    
    // Load next few chunks
    for (let i = 1; i <= this.prefetchSize; i++) {
      const nextChunk = currentChunk + i;
      if (nextChunk <= maxChunk) {
        const hasValidUrl = this.signedUrls.has(nextChunk) && 
                           this.urlExpirationTime.has(nextChunk) && 
                           Date.now() < (this.urlExpirationTime.get(nextChunk) || 0);
        if (!hasValidUrl) {
          chunksToLoad.push(nextChunk);
        }
      }
    }
    
    if (chunksToLoad.length > 0) {
      try {
        console.log(`🔄 Prefetching ${chunksToLoad.length} upcoming chunks: ${chunksToLoad.join(', ')}`);
        await this.generateSignedUrlsForChunks(chunksToLoad);
        await this.updatePlayerTracks();
      } catch (error) {
        console.error('❌ Failed to prefetch upcoming chunks:', error);
        // Don't throw - this is just prefetching
      }
    }
  }

  private setupEventListeners(): void {
    if (!this.player) return;

    // Track change events (next/prev)
    this.player.onnext = (fromTrack: string, toTrack: string) => {
      console.log(`🔄 Gapless track changed: ${fromTrack} -> ${toTrack}`);
      // Find the new track index
      const tracks = this.player!.getTracks();
      const newIndex = tracks.indexOf(toTrack);
      if (newIndex >= 0) {
        this.currentChunk = newIndex;
        this.callbacks.onChunkChange?.(newIndex);
        // Proactively load upcoming chunks
        this.prefetchUpcomingChunks(newIndex);
      }
    };

    this.player.onprev = (fromTrack: string, toTrack: string) => {
      console.log(`🔄 Gapless track changed (prev): ${fromTrack} -> ${toTrack}`);
      const tracks = this.player!.getTracks();
      const newIndex = tracks.indexOf(toTrack);
      if (newIndex >= 0) {
        this.currentChunk = newIndex;
        this.callbacks.onChunkChange?.(newIndex);
        // Proactively load upcoming chunks
        this.prefetchUpcomingChunks(newIndex);
      }
    };

    // Play event
    this.player.onplay = (trackPath: string) => {
      console.log('▶️ Gapless player started:', trackPath);
      this.isPlaying = true;
      this.startTimeUpdates();
      this.callbacks.onPlay?.();
    };

    // Pause event  
    this.player.onpause = (trackPath: string) => {
      console.log('⏸️ Gapless player paused:', trackPath);
      this.isPlaying = false;
      this.stopTimeUpdates();
      this.callbacks.onPause?.();
    };

    // Stop event
    this.player.onstop = (trackPath: string) => {
      console.log('⏹️ Gapless player stopped:', trackPath);
      this.isPlaying = false;
      this.stopTimeUpdates();
      this.callbacks.onPause?.();
    };

    // Finished track event
    this.player.onfinishedtrack = (trackPath: string) => {
      console.log('🏁 Gapless track finished:', trackPath);
      // Track change will be handled by onnext
    };

    // Finished all tracks event
    this.player.onfinishedall = () => {
      console.log('🏁 Gapless player finished all tracks');
      this.isPlaying = false;
      this.stopTimeUpdates();
      this.callbacks.onEnd?.();
    };

    // Time update event
    this.player.ontimeupdate = (currentTrackTime: number, currentTrackIndex: number) => {
      if (currentTrackIndex !== this.currentChunk) {
        this.currentChunk = currentTrackIndex;
        this.callbacks.onChunkChange?.(currentTrackIndex);
      }
      
      // Update virtual time
      const virtualTime = this.virtualTimeline.getVirtualTime(currentTrackIndex, currentTrackTime / 1000); // Convert ms to seconds
      const totalDuration = this.virtualTimeline.getTotalDuration();
      this.callbacks.onVirtualTimeUpdate?.(virtualTime, totalDuration);
    };

    // Error event
    this.player.onerror = (trackPath: string, error?: Error | string) => {
      console.error('❌ Gapless player error:', trackPath, error);
      this.callbacks.onError?.({
        type: 'playback',
        message: typeof error === 'string' ? error : (error?.message || 'Audio playback error'),
        recoverable: true,
      });
    };
  }

  private startTimeUpdates(): void {
    // Gapless-5 handles its own time updates via ontimeupdate
    // No need for additional setInterval - this prevents double updates
    console.log('⏱️ Time updates managed by Gapless-5 ontimeupdate event');
  }

  private stopTimeUpdates(): void {
    // No manual interval to stop - Gapless-5 manages time updates
    console.log('⏹️ Time updates stopped (managed by Gapless-5)');
  }

  // ===== PUBLIC API =====

  async play(): Promise<void> {
    if (!this.player) throw new Error('Player not initialized');
    await this.player.play();
  }

  async pause(): Promise<void> {
    if (!this.player) return;
    this.player.pause();
  }

  async seekToVirtualTime(virtualTime: number): Promise<void> {
    if (!this.player || !this.isInitialized) {
      throw new Error('Player not initialized');
    }

    const { chunkIndex, localTime } = this.virtualTimeline.getChunkPosition(virtualTime);
    
    console.log(`🎯 Seeking to virtual time ${virtualTime.toFixed(2)}s -> chunk ${chunkIndex}, local ${localTime.toFixed(2)}s`);
    
    // Ensure we have the signed URL for the target chunk
    try {
      await this.ensureSignedUrl(chunkIndex);
    } catch (error) {
      console.error(`❌ Failed to get signed URL for chunk ${chunkIndex}:`, error);
      this.callbacks.onError?.({
        type: 'network',
        message: `Failed to load audio chunk ${chunkIndex}`,
        recoverable: true,
      });
      return;
    }
    
    // If we need to switch to a different chunk
    if (chunkIndex !== this.currentChunk) {
      this.player.gotoTrack(chunkIndex, true); // true = start playing
      this.currentChunk = chunkIndex;
    }
    
    // Seek to the local time within the chunk (convert seconds to milliseconds)
    this.player.setPosition(localTime * 1000);
  }

  getCurrentVirtualTime(): number {
    if (!this.player || !this.isInitialized) return 0;
    
    const currentTime = this.player.getPosition() / 1000; // Convert ms to seconds
    return this.virtualTimeline.getVirtualTime(this.currentChunk, currentTime);
  }

  getTotalVirtualDuration(): number {
    return this.virtualTimeline.getTotalDuration();
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
    return this.isInitialized && this.player !== null;
  }

  getVirtualTimeline(): VirtualTimelineManager {
    return this.virtualTimeline;
  }

  // Volume and playback rate controls
  setVolume(volume: number): void {
    if (this.player) {
      this.player.setVolume(Math.max(0, Math.min(1, volume)));
    }
  }

  setPlaybackRate(rate: number): void {
    if (this.player) {
      this.player.setPlaybackRate(Math.max(0.25, Math.min(4, rate)));
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  cleanup(): void {
    console.log('🧹 Cleaning up Gapless Audio Streamer...');
    
    this.stopTimeUpdates();
    
    if (this.player) {
      this.player.pause();
      // Note: Gapless5 doesn't have an explicit cleanup method
      this.player = null;
    }
    
    // Clear all caches
    this.chunkUrls.clear();
    this.signedUrls.clear();
    this.urlExpirationTime.clear();
    
    this.book = null;
    this.isInitialized = false;
    this.isPlaying = false;
    this.currentChunk = 0;
  }
}
