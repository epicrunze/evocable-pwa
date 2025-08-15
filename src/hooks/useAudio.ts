import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AudioError, Bookmark, VirtualAudioState, VirtualPlaybackControls } from '@/types/audio';
import { BookWithChunks } from '@/types/book';
import { audioApi } from '@/lib/api/audio';
import { booksApi } from '@/lib/api/books';
import { AudioStreamer } from '@/lib/audio-streamer';
import { GaplessAudioStreamer } from '@/lib/audio/gapless-streamer';

interface UseAudioOptions {
  bookId?: string;
  autoPlay?: boolean;
  useGaplessPlayer?: boolean; // New option to use Gapless-5
  onPlay?: () => void;
  onPause?: () => void;
  onTimeUpdate?: (time: number) => void;
  onChunkChange?: (chunk: number) => void;
  onEnd?: () => void;
  onError?: (error: AudioError) => void;
}

interface UseAudioReturn {
  audioState: VirtualAudioState | null;
  controls: VirtualPlaybackControls;
  bookmarks: Bookmark[];
  isLoading: boolean;
  error: AudioError | null;
  book: BookWithChunks | null;
  addBookmark: (title: string) => Promise<void>;
  removeBookmark: (id: string) => Promise<void>;
  seekToBookmark: (id: string) => Promise<void>;
  initialize: (bookId: string) => Promise<void>;
  cleanup: () => void;
}

export function useAudio(options: UseAudioOptions = {}): UseAudioReturn {
  const {
    bookId: initialBookId,
    autoPlay = false,
    useGaplessPlayer = true, // Default to true for better experience
    onPlay,
    onPause,
    onTimeUpdate,
    onChunkChange,
    onEnd,
    onError,
  } = options;

  // State
  const [bookId, setBookId] = useState<string | null>(initialBookId || null);
  const [audioState, setAudioState] = useState<VirtualAudioState | null>(null);
  const [currentError, setCurrentError] = useState<AudioError | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Refs
  const currentChunkRef = useRef<number>(0);
  const isSeekingRef = useRef(false);
  const audioStreamerRef = useRef<AudioStreamer | null>(null); // Keep for cleanup during migration
  const gaplessStreamerRef = useRef<GaplessAudioStreamer | null>(null);
  const loadChunkRef = useRef<((chunkIndex: number) => Promise<void>) | null>(null);

  // Fetch book data with chunks
  const { data: book, isLoading: bookLoading, error: bookError } = useQuery({
    queryKey: ['book', bookId],
    queryFn: async () => {
      if (!bookId) return null;
      const response = await booksApi.getBookWithChunks(bookId);
      return response.data;
    },
    enabled: !!bookId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch bookmarks (disabled for now as backend endpoint doesn't exist)
  useQuery({
    queryKey: ['bookmarks', bookId],
    queryFn: async () => {
      if (!bookId) return [];
      try {
        const response = await audioApi.getBookmarks(bookId);
        return response.data || [];
      } catch {
        // Bookmarks endpoint doesn't exist yet, return empty array
        console.log('Bookmarks endpoint not available, using local storage fallback');
        return [];
      }
    },
    enabled: false, // Disable until backend endpoint is implemented
    staleTime: 30 * 1000, // 30 seconds
  });

  // Initialize audio element and streamer
  const initializeAudio = useCallback(async () => {
    if (!bookId || !book) {
      console.log('initializeAudio: Missing bookId or book data');
      return;
    }

    // Check if we're in browser environment for gapless player
    if (typeof window === 'undefined') {
      console.log('initializeAudio: Skipping initialization on server side');
      return;
    }

    try {
      console.log('initializeAudio: Starting Gapless-5 initialization', { bookId, chunksCount: book.chunks?.length });

      // Initialize Gapless-5 streamer for seamless playback
      const gaplessStreamer = new GaplessAudioStreamer(bookId, {
        onError: (error: AudioError) => {
          console.error('GaplessAudioStreamer error:', error);
          setCurrentError(error);
          onError?.(error);
        },
        onChunkChange: (chunkIndex: number) => {
          console.log('Gapless chunk changed to:', chunkIndex);
          currentChunkRef.current = chunkIndex;
          onChunkChange?.(chunkIndex);
          
          // Update state with new chunk
          setAudioState(prev => prev ? { ...prev, currentChunk: chunkIndex } : null);
        },
        onVirtualTimeUpdate: (virtualTime: number, duration: number) => {
          // Simplified state update - avoid redundant calculations
          setAudioState(prev => {
            if (!prev) return null;
            
            // Get pre-calculated values from the streamer
            const currentChunk = gaplessStreamer.getCurrentChunk();
            const chunkOffsets = prev.chunkOffsets; // Use cached offsets
            const chunkStartTime = chunkOffsets[currentChunk] || 0;
            const chunkLocalTime = Math.max(0, virtualTime - chunkStartTime);
            
            return {
              ...prev,
              virtualCurrentTime: virtualTime,
              virtualDuration: duration,
              currentTime: virtualTime,
              chunkLocalTime: chunkLocalTime,
              duration: duration,
              currentChunk: currentChunk,
            };
          });
          
          // Call the original onTimeUpdate callback
          onTimeUpdate?.(virtualTime);
        },
        onPlay: () => {
          console.log('Gapless player started');
          setAudioState(prev => prev ? { ...prev, isPlaying: true } : null);
          onPlay?.();
        },
        onPause: () => {
          console.log('Gapless player paused');
          setAudioState(prev => prev ? { ...prev, isPlaying: false } : null);
          onPause?.();
        },
        onEnd: () => {
          console.log('Gapless player ended');
          setAudioState(prev => prev ? { ...prev, isPlaying: false } : null);
          onEnd?.();
        },
      }, {
        prefetchSize: 5,
        crossfade: 100,
      });

      console.log('initializeAudio: Initializing gapless streamer...');
      await gaplessStreamer.initialize();
      gaplessStreamerRef.current = gaplessStreamer;
      console.log('initializeAudio: Gapless streamer initialized successfully');

            // Initialize virtual timeline state  
      const timeline = gaplessStreamer.getVirtualTimeline();
      const chunkOffsets = timeline.getChunkOffsets();
      
      // Gapless-5 manages its own audio elements - no need for manual event setup
      
      // Initialize virtual audio state
      setAudioState({
        bookId: bookId!,
        currentChunk: 0,
        currentTime: 0,
        duration: timeline.getTotalDuration(),
        isPlaying: false,
        isLoading: false,
        volume: 1,
        playbackRate: 1,
        bufferedRanges: null,
        // Virtual timeline properties
        virtualCurrentTime: 0,
        virtualDuration: timeline.getTotalDuration(),
        chunkLocalTime: 0,
        chunkOffsets: chunkOffsets,
        isTransitioning: false,
      });
      
      setIsInitialized(true);
      console.log('initializeAudio: Gapless audio system initialized successfully');
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      const audioError: AudioError = {
        type: 'network',
        message: error instanceof Error ? error.message : 'Failed to initialize audio system',
        recoverable: true,
      };
      setCurrentError(audioError);
      onError?.(audioError);
    }
  }, [bookId, book, onPlay, onPause, onTimeUpdate, onChunkChange, onError, onEnd]);

  // Load audio chunk using streamer
  const loadChunk = useCallback(async (chunkIndex: number) => {
    if (!gaplessStreamerRef.current) {
      console.log('loadChunk: Missing gapless streamer');
      return;
    }

    // Gapless-5 handles chunk loading automatically - no implementation needed
    console.log('Legacy loadChunk called - Gapless-5 handles this automatically', { chunkIndex });
  }, [onError]);

  // Update loadChunk ref whenever it changes
  useEffect(() => {
    loadChunkRef.current = loadChunk;
  }, [loadChunk]);



  // Playback controls
  const controls: VirtualPlaybackControls = useMemo(() => ({
    play: async () => {
      if (!gaplessStreamerRef.current) {
        console.log('play: No gapless streamer');
        return;
      }
      
      try {
        console.log('play: Attempting to play gapless audio');
        await gaplessStreamerRef.current.play();
        console.log('play: Gapless audio started successfully');
      } catch (error) {
        console.error('play: Error starting gapless playback', error);
        const audioError: AudioError = {
          type: 'playback',
          message: 'Failed to start playback',
          recoverable: true,
        };
        setCurrentError(audioError);
        onError?.(audioError);
      }
    },

    pause: async () => {
      if (!gaplessStreamerRef.current) return;
      await gaplessStreamerRef.current.pause();
    },

    seek: async (time: number) => {
      // Use gapless streamer for seamless seeking
      if (!gaplessStreamerRef.current) return;
      await gaplessStreamerRef.current.seekToVirtualTime(time);
    },

    // Virtual timeline seeking methods
    seekToVirtualTime: async (virtualTime: number) => {
      if (!gaplessStreamerRef.current) return;

      const gaplessStreamer = gaplessStreamerRef.current;
      isSeekingRef.current = true;
      
      try {
        console.log('seekToVirtualTime: Seeking to virtual time:', virtualTime);
        await gaplessStreamer.seekToVirtualTime(virtualTime);
        
        // Gapless streamer handles state updates via callbacks
        isSeekingRef.current = false;
        console.log('seekToVirtualTime: Gapless seek completed');
      } catch (error) {
        console.error('Virtual seek error:', error);
        isSeekingRef.current = false;
        const audioError: AudioError = {
          type: 'playback',
          message: 'Failed to seek to virtual position',
          recoverable: true,
        };
        setCurrentError(audioError);
        onError?.(audioError);
      }
    },

    getCurrentVirtualTime: () => {
      if (!gaplessStreamerRef.current) return 0;
      return gaplessStreamerRef.current.getCurrentVirtualTime();
    },

    getTotalVirtualDuration: () => {
      if (!gaplessStreamerRef.current) return 0;
      return gaplessStreamerRef.current.getTotalVirtualDuration();
    },

    setVolume: async (volume: number) => {
      if (!gaplessStreamerRef.current) return;
      
      gaplessStreamerRef.current.setVolume(Math.max(0, Math.min(1, volume)));
      setAudioState(prev => prev ? { ...prev, volume } : null);
    },

    setPlaybackRate: async (rate: number) => {
      if (!gaplessStreamerRef.current) return;
      
      gaplessStreamerRef.current.setPlaybackRate(Math.max(0.25, Math.min(4, rate)));
      setAudioState(prev => prev ? { ...prev, playbackRate: rate } : null);
    },

    skipForward: async (seconds: number) => {
      if (!gaplessStreamerRef.current || !audioState) return;
      
      const currentVirtualTime = gaplessStreamerRef.current.getCurrentVirtualTime();
      const totalDuration = gaplessStreamerRef.current.getTotalVirtualDuration();
      const newVirtualTime = Math.min(currentVirtualTime + seconds, totalDuration);
      
      await gaplessStreamerRef.current.seekToVirtualTime(newVirtualTime);
    },

    skipBackward: async (seconds: number) => {
      if (!gaplessStreamerRef.current || !audioState) return;
      
      const currentVirtualTime = gaplessStreamerRef.current.getCurrentVirtualTime();
      const newVirtualTime = Math.max(0, currentVirtualTime - seconds);
      
      await gaplessStreamerRef.current.seekToVirtualTime(newVirtualTime);
    },
  }), [audioState, loadChunk, onError]);

  // Initialize audio when book data and bookId are available
  useEffect(() => {
    if (bookId && book && !isInitialized) {
      console.log('Initializing audio system for bookId:', bookId, 'with book data');
      
      // Initialize loading state (full virtual state will be set by initializeAudio)
      setAudioState({
        bookId: bookId!,
        currentChunk: 0,
        currentTime: 0,
        duration: 0,
        isPlaying: false,
        isLoading: true,
        volume: 1,
        playbackRate: 1,
        bufferedRanges: null,
        // Virtual timeline properties (placeholder values)
        virtualCurrentTime: 0,
        virtualDuration: 0,
        chunkLocalTime: 0,
        chunkOffsets: [],
        isTransitioning: false,
      });

      // Then initialize the audio system
      initializeAudio();
    }
  }, [bookId, book, isInitialized, currentError, initializeAudio]);

  // Load first chunk when audio is initialized and streamer is ready
  useEffect(() => {
    if (isInitialized && gaplessStreamerRef.current && book && book.chunks?.length > 0) {
      // Gapless-5 automatically loads and manages chunks - no manual loading needed
      console.log('Gapless-5 audio ready - chunks managed automatically');
    }
  }, [isInitialized, book, loadChunk]);

  // Auto-play if enabled
  useEffect(() => {
    if (autoPlay && audioState && !audioState.isPlaying && !audioState.isLoading) {
      controls.play();
    }
  }, [autoPlay, audioState, controls]);

  // Local bookmark state (since backend endpoints don't exist yet)
  const [localBookmarks, setLocalBookmarks] = useState<Bookmark[]>([]);

  // Bookmark functions (using local state for now)
  const addBookmark = useCallback(async (title: string) => {
    if (!bookId || !audioState) return;

    try {
      const newBookmark: Bookmark = {
        id: `bookmark-${Date.now()}`,
        bookId,
        title,
        time: audioState.currentTime,
        chunk: audioState.currentChunk,
        created_at: new Date().toISOString(),
      };
      
      setLocalBookmarks(prev => [...prev, newBookmark]);
      console.log('Bookmark added locally:', newBookmark);
    } catch (error) {
      console.error('Failed to add bookmark:', error);
    }
  }, [bookId, audioState]);

  const removeBookmark = useCallback(async (id: string) => {
    try {
      setLocalBookmarks(prev => prev.filter(b => b.id !== id));
      console.log('Bookmark removed locally:', id);
    } catch (error) {
      console.error('Failed to remove bookmark:', error);
    }
  }, []);

  const seekToBookmark = useCallback(async (id: string) => {
    const bookmark = localBookmarks.find(b => b.id === id);
    if (!bookmark) return;

    await controls.seek(bookmark.time);
  }, [localBookmarks, controls]);

  // Initialize function
  const initialize = useCallback(async (newBookId: string) => {
    // Cleanup existing streamers

    if (audioStreamerRef.current) {
      audioStreamerRef.current.cleanup();
      audioStreamerRef.current = null;
    }

    setBookId(newBookId);
    setAudioState(null);
    setCurrentError(null);
    setIsInitialized(false);
    currentChunkRef.current = 0;
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (gaplessStreamerRef.current) {
      gaplessStreamerRef.current.cleanup();
      gaplessStreamerRef.current = null;
    }

    // Clean up old streamer ref if it exists (migration cleanup)
    if (audioStreamerRef.current) {
      audioStreamerRef.current.cleanup();
      audioStreamerRef.current = null;
    }

    setAudioState(null);
    setCurrentError(null);
    setIsInitialized(false);
  }, []);

  return {
    audioState,
    controls,
    bookmarks: localBookmarks, // Use local bookmarks for now
    isLoading: bookLoading || Boolean(bookId && !isInitialized),
    error: bookError ? { 
      type: 'network', 
      message: 'Failed to load book', 
      recoverable: true 
    } : currentError,
    book: book || null, // Use the book from the query directly
    addBookmark,
    removeBookmark,
    seekToBookmark,
    initialize,
    cleanup,
  };
} 