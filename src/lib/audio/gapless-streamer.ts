import { Gapless5 } from '@regosen/gapless-5';
import { AudioError } from '@/types/audio';
import { VirtualTimelineManager } from './virtual-timeline';
import { audioApi } from '@/lib/api/audio';
import { booksApi } from '@/lib/api/books';
import { BookWithChunks } from '@/types/book';

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
  private player: Gapless5 | null = null;
  private virtualTimeline: VirtualTimelineManager;
  private callbacks: GaplessPlaybackCallbacks;
  
  // Caching and URL management
  private chunkUrls = new Map<number, string>(); // Cache for signed URLs
  private signedUrls = new Map<number, string>(); // Cache for signed URLs
  private urlExpirationTime = new Map<number, number>(); // Track URL expiration
  private prefetchSize = 5; // Number of chunks to prefetch URLs for
  private isInitialized = false;
  
  // Playback state
  private currentChunk = 0;
  private isPlaying = false;
  private timeUpdateInterval: NodeJS.Timeout | null = null;

  constructor(bookId: string, callbacks: GaplessPlaybackCallbacks = {}, options: {
    prefetchSize?: number;
    crossfade?: number;
  } = {}) {
    this.bookId = bookId;
    this.callbacks = callbacks;
    this.prefetchSize = options.prefetchSize || 5;
    this.virtualTimeline = new VirtualTimelineManager();
  }

  async initialize(): Promise<void> {
    try {
      console.log('🎵 Initializing Gapless Audio Streamer...');
      
      // 1. Get book data with chunks
      const bookResponse = await booksApi.getBookWithChunks(this.bookId);
      this.book = bookResponse.data || null;
      
      if (!this.book || !this.book.chunks.length) {
        throw new Error('Book not ready for streaming');
      }

      console.log(`📚 Book loaded: "${this.book.title}" (${this.book.chunks.length} chunks, ${this.book.total_duration_s.toFixed(2)}s)`);

      // 2. Initialize virtual timeline
      this.virtualTimeline.initialize(this.book.chunks);

      // 3. Generate signed URLs for all chunks
      await this.generateAllSignedUrls();

      // 4. Create track URLs array for Gapless5
      const trackUrls = this.book.chunks.map((_, index) => this.chunkUrls.get(index)!);

      // 5. Initialize Gapless5 player
      this.player = new Gapless5({
        tracks: trackUrls,
        crossfade: 100, // 100ms crossfade for smooth transitions
        loadLimit: 3, // Load 3 tracks ahead
        loop: false,
        shuffle: false,
        useWebAudio: true, // Use Web Audio API for better performance
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

  private async generateAllSignedUrls(): Promise<void> {
    if (!this.book) return;
    
    try {
      console.log('🔗 Generating signed URLs for all chunks...');
      
      // Generate URLs for all chunks at once
      const chunkIndices = Array.from({ length: this.book.chunks.length }, (_, i) => i);
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
      
      console.log(`✅ Generated ${Object.keys(response.data.signed_urls).length} signed URLs`);
      
    } catch (error) {
      console.error('❌ Failed to generate signed URLs:', error);
      this.callbacks.onError?.({
        type: 'network',
        message: 'Failed to generate audio URLs',
        recoverable: true,
      });
      throw error;
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
      }
    };

    this.player.onprev = (fromTrack: string, toTrack: string) => {
      console.log(`🔄 Gapless track changed (prev): ${fromTrack} -> ${toTrack}`);
      const tracks = this.player!.getTracks();
      const newIndex = tracks.indexOf(toTrack);
      if (newIndex >= 0) {
        this.currentChunk = newIndex;
        this.callbacks.onChunkChange?.(newIndex);
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
    this.stopTimeUpdates(); // Clear any existing interval
    
    this.timeUpdateInterval = setInterval(() => {
      if (this.player && this.isPlaying) {
        const currentTime = this.player.getPosition();
        const virtualTime = this.virtualTimeline.getVirtualTime(this.currentChunk, currentTime);
        const totalDuration = this.virtualTimeline.getTotalDuration();
        
        this.callbacks.onVirtualTimeUpdate?.(virtualTime, totalDuration);
      }
    }, 100); // Update every 100ms for smooth progress
  }

  private stopTimeUpdates(): void {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
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
