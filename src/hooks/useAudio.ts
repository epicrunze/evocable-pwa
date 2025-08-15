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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentChunkRef = useRef<number>(0);
  const isSeekingRef = useRef(false);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
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

    try {
      console.log('initializeAudio: Starting initialization', { bookId, chunksCount: book.chunks?.length });

      // Initialize audio streamer with seamless playback callbacks
      const streamer = new AudioStreamer(bookId, {
        onError: (error: AudioError) => {
          console.error('AudioStreamer error:', error);
          setCurrentError(error);
          onError?.(error);
        },
        onChunkChange: (chunkIndex: number) => {
          console.log('Chunk changed to:', chunkIndex);
          currentChunkRef.current = chunkIndex;
          onChunkChange?.(chunkIndex);
        },
        onVirtualTimeUpdate: (virtualTime: number, duration: number) => {
          // Update virtual timeline state
          setAudioState(prev => {
            if (!prev) return null;
            const activeAudio = streamer.getActiveAudioElement();
            return {
              ...prev,
              virtualCurrentTime: virtualTime,
              virtualDuration: duration,
              currentTime: activeAudio?.currentTime || 0,
              chunkLocalTime: activeAudio?.currentTime || 0,
              duration: duration, // Total virtual duration
            };
          });
          
          // Call the original onTimeUpdate callback with virtual time
          onTimeUpdate?.(virtualTime);
        },
        onSeamlessTransition: (fromChunk: number, toChunk: number) => {
          console.log('Seamless transition:', fromChunk, '->', toChunk);
          setAudioState(prev => prev ? { ...prev, isTransitioning: false } : null);
        },
        onPreloadProgress: (chunkIndex: number, progress: number) => {
          console.log(`Preloading chunk ${chunkIndex}: ${progress}%`);
        },
      }, {
        prefetchSize: 5,
        transitionThreshold: 1.0,
      });

      console.log('initializeAudio: Initializing streamer...');
      await streamer.initialize();
      audioStreamerRef.current = streamer;
      console.log('initializeAudio: Streamer initialized successfully');

      // Initialize virtual timeline state
      const timeline = streamer.getVirtualTimeline();
      const chunkOffsets = timeline.getChunkOffsets();

      // Get active audio element from streamer for minimal event tracking
      const activeAudio = streamer.getActiveAudioElement();
      if (activeAudio) {
        audioRef.current = activeAudio;

        // Set up minimal event listeners for play/pause state tracking
        activeAudio.addEventListener('loadstart', () => {
          console.log('Virtual audio loadstart event');
          setAudioState(prev => prev ? { ...prev, isLoading: true } : null);
        });

        activeAudio.addEventListener('loadedmetadata', () => {
          console.log('Virtual audio loadedmetadata event, duration:', activeAudio.duration);
          // Duration is now managed by virtual timeline, not individual chunks
          setAudioState(prev => prev ? { 
            ...prev, 
            isLoading: false 
          } : null);
        });

        // Time update is now handled by virtual timeline callbacks
        // No need for manual timeupdate listener

        activeAudio.addEventListener('play', () => {
          console.log('Virtual audio play event');
          setAudioState(prev => prev ? { ...prev, isPlaying: true } : null);
          onPlay?.();
        });

        activeAudio.addEventListener('pause', () => {
          console.log('Virtual audio pause event');
          setAudioState(prev => prev ? { ...prev, isPlaying: false } : null);
          onPause?.();
        });

        activeAudio.addEventListener('ended', () => {
          // Ended events are now handled by the streamer's seamless transition logic
          console.log('Virtual audio chunk ended - streamer handling seamless transition');
        });

        activeAudio.addEventListener('error', (event) => {
          console.error('Virtual audio error:', event);
          const error: AudioError = {
            type: 'playback',
            message: 'Audio playback error',
            recoverable: true,
            chunk: currentChunkRef.current,
          };
          setCurrentError(error);
          onError?.(error);
        });
      }
      
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
      console.log('initializeAudio: Virtual audio state initialized successfully');
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
    if (!audioRef.current || !audioStreamerRef.current) {
      console.log('loadChunk: Missing dependencies', { 
        audioRef: !!audioRef.current, 
        streamer: !!audioStreamerRef.current 
      });
      return;
    }

    try {
      const streamer = audioStreamerRef.current;
      const book = streamer.getBook();
      
      if (!book) {
        console.log('loadChunk: Book not available in streamer');
        return;
      }

      const chunk = book.chunks[chunkIndex];
      if (!chunk) {
        console.log('loadChunk: Chunk not found', { chunkIndex, totalChunks: book.chunks.length });
        return;
      }

      console.log('loadChunk: Loading chunk via streamer', { chunkIndex });
      
      // Get cached or download chunk URL
      const chunkUrl = await streamer.loadChunk(chunkIndex);
      
      audioRef.current.src = chunkUrl;
      audioRef.current.load();

      setAudioState(prev => prev ? {
        ...prev,
        currentChunk: chunkIndex,
        duration: chunk.duration_s,
        isLoading: true,
      } : null);

      // onChunkChange is called by the streamer
    } catch (error) {
      console.error('loadChunk: Error loading chunk', error);
      const audioError: AudioError = {
        type: 'network',
        message: 'Failed to load audio chunk',
        recoverable: true,
        chunk: chunkIndex,
      };
      setCurrentError(audioError);
      onError?.(audioError);
    }
  }, [onError]);

  // Update loadChunk ref whenever it changes
  useEffect(() => {
    loadChunkRef.current = loadChunk;
  }, [loadChunk]);



  // Playback controls
  const controls: VirtualPlaybackControls = useMemo(() => ({
    play: async () => {
      if (!audioRef.current) {
        console.log('play: No audio element');
        return;
      }
      
      try {
        console.log('play: Attempting to play audio');
        await audioRef.current.play();
        console.log('play: Audio started successfully');
      } catch (error) {
        console.error('play: Error starting playback', error);
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
      if (!audioRef.current) return;
      audioRef.current.pause();
    },

    seek: async (time: number) => {
      // Legacy seek method - use streamer directly to avoid circular reference
      if (!audioStreamerRef.current) return;
      await audioStreamerRef.current.seekToVirtualTime(time);
    },

    // Virtual timeline seeking methods
    seekToVirtualTime: async (virtualTime: number) => {
      if (!audioStreamerRef.current) return;

      const streamer = audioStreamerRef.current;
      isSeekingRef.current = true;
      
      try {
        console.log('seekToVirtualTime: Seeking to virtual time:', virtualTime);
        await streamer.seekToVirtualTime(virtualTime);
        
        // Update audio state with new virtual position
        const newVirtualTime = streamer.getCurrentVirtualTime();
        const activeAudio = streamer.getActiveAudioElement();
        
        setAudioState(prev => prev ? {
          ...prev,
          virtualCurrentTime: newVirtualTime,
          currentTime: activeAudio?.currentTime || 0,
          chunkLocalTime: activeAudio?.currentTime || 0,
        } : null);

        isSeekingRef.current = false;
        console.log('seekToVirtualTime: Seek completed to:', newVirtualTime);
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
      if (!audioStreamerRef.current) return 0;
      return audioStreamerRef.current.getCurrentVirtualTime();
    },

    getTotalVirtualDuration: () => {
      if (!audioStreamerRef.current) return 0;
      return audioStreamerRef.current.getTotalVirtualDuration();
    },

    setVolume: async (volume: number) => {
      if (!audioRef.current) return;
      
      audioRef.current.volume = Math.max(0, Math.min(1, volume));
      setAudioState(prev => prev ? { ...prev, volume } : null);
    },

    setPlaybackRate: async (rate: number) => {
      if (!audioRef.current) return;
      
      audioRef.current.playbackRate = Math.max(0.25, Math.min(4, rate));
      setAudioState(prev => prev ? { ...prev, playbackRate: rate } : null);
    },

    skipForward: async (seconds: number) => {
      if (!audioStreamerRef.current || !audioState) return;
      
      const currentVirtualTime = audioStreamerRef.current.getCurrentVirtualTime();
      const newVirtualTime = currentVirtualTime + seconds;
      
      await audioStreamerRef.current.seekToVirtualTime(newVirtualTime);
    },

    skipBackward: async (seconds: number) => {
      if (!audioStreamerRef.current || !audioState) return;
      
      const currentVirtualTime = audioStreamerRef.current.getCurrentVirtualTime();
      const newVirtualTime = Math.max(0, currentVirtualTime - seconds);
      
      await audioStreamerRef.current.seekToVirtualTime(newVirtualTime);
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
    if (isInitialized && audioStreamerRef.current && audioRef.current && book && book.chunks?.length > 0) {
      const streamer = audioStreamerRef.current;
      if (streamer.isReady()) {
        console.log('Loading first chunk');
        loadChunk(0);
      }
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
    // Cleanup existing audio and streamer
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeEventListener('loadstart', () => {});
      audioRef.current = null;
    }

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
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeEventListener('loadstart', () => {});
      audioRef.current = null;
    }

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