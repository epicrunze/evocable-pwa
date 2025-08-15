import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AudioState, AudioError, Bookmark, PlaybackControls } from '@/types/audio';
import { BookWithChunks } from '@/types/book';
import { audioApi } from '@/lib/api/audio';
import { booksApi } from '@/lib/api/books';
import { AudioStreamer } from '@/lib/audio-streamer';

interface UseAudioOptions {
  bookId?: string;
  autoPlay?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onTimeUpdate?: (time: number) => void;
  onChunkChange?: (chunk: number) => void;
  onEnd?: () => void;
  onError?: (error: AudioError) => void;
}

interface UseAudioReturn {
  audioState: AudioState | null;
  controls: PlaybackControls;
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
    onPlay,
    onPause,
    onTimeUpdate,
    onChunkChange,
    onEnd,
    onError,
  } = options;

  // State
  const [bookId, setBookId] = useState<string | null>(initialBookId || null);
  const [audioState, setAudioState] = useState<AudioState | null>(null);
  const [currentError, setCurrentError] = useState<AudioError | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentChunkRef = useRef<number>(0);
  const isSeekingRef = useRef(false);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
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
          // This will be used later when we integrate with virtual timeline
          console.log('Virtual time update:', virtualTime, '/', duration);
        },
        onSeamlessTransition: (fromChunk: number, toChunk: number) => {
          console.log('Seamless transition:', fromChunk, '->', toChunk);
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

      // Initialize audio element
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.crossOrigin = 'anonymous';

      // Set up event listeners
      audio.addEventListener('loadstart', () => {
        console.log('Audio loadstart event');
        setAudioState(prev => prev ? { ...prev, isLoading: true } : null);
      });

      audio.addEventListener('loadedmetadata', () => {
        console.log('Audio loadedmetadata event, duration:', audio.duration);
        setAudioState(prev => prev ? { 
          ...prev, 
          duration: audio.duration,
          isLoading: false 
        } : null);
      });

      audio.addEventListener('timeupdate', () => {
        if (isSeekingRef.current) return;
        
        setAudioState(prev => prev ? {
          ...prev,
          currentTime: audio.currentTime,
          bufferedRanges: audio.buffered,
        } : null);
        
        onTimeUpdate?.(audio.currentTime);
      });

      audio.addEventListener('play', () => {
        console.log('Audio play event');
        setAudioState(prev => prev ? { ...prev, isPlaying: true } : null);
        onPlay?.();
      });

      audio.addEventListener('pause', () => {
        console.log('Audio pause event');
        setAudioState(prev => prev ? { ...prev, isPlaying: false } : null);
        onPause?.();
      });

      const endedHandler = () => {
        console.log('Audio ended event');
        // Handle chunk end inline to avoid circular dependency
        if (!audioStreamerRef.current || !loadChunkRef.current) return;

        const streamer = audioStreamerRef.current;
        const nextChunkIndex = currentChunkRef.current + 1;
        
        if (nextChunkIndex < streamer.getTotalChunks()) {
          console.log('Loading next chunk:', nextChunkIndex);
          // Call loadChunk async via ref
          loadChunkRef.current(nextChunkIndex).catch(error => {
            console.error('Failed to load next chunk:', error);
            setAudioState(prev => prev ? { ...prev, isPlaying: false } : null);
          });
        } else {
          console.log('Reached end of book');
          setAudioState(prev => prev ? { ...prev, isPlaying: false } : null);
          onEnd?.();
        }
      };

      audio.addEventListener('ended', endedHandler);

      audio.addEventListener('error', (event) => {
        console.error('Audio element error:', event);
        const error: AudioError = {
          type: 'playback',
          message: 'Audio playback error',
          recoverable: true,
          chunk: currentChunkRef.current,
        };
        setCurrentError(error);
        onError?.(error);
      });

      audioRef.current = audio;
      setIsInitialized(true);
      console.log('initializeAudio: Audio element initialized successfully');
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
  const controls: PlaybackControls = useMemo(() => ({
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
      if (!audioRef.current || !audioStreamerRef.current) return;

      const streamer = audioStreamerRef.current;
      const book = streamer.getBook();
      if (!book) return;

      isSeekingRef.current = true;
      
      try {
        // Calculate which chunk contains the target time
        let targetChunk = 0;
        let cumulativeTime = 0;
        
        for (let i = 0; i < book.chunks.length; i++) {
          if (cumulativeTime + book.chunks[i].duration_s > time) {
            targetChunk = i;
            break;
          }
          cumulativeTime += book.chunks[i].duration_s;
        }

        const chunkStartTime = cumulativeTime;
        const localTime = time - chunkStartTime;

        // Load chunk if different from current
        if (targetChunk !== currentChunkRef.current) {
          await loadChunk(targetChunk);
        }

        // Seek to local time in chunk
        audioRef.current.currentTime = localTime;
        
        setAudioState(prev => prev ? {
          ...prev,
          currentTime: localTime,
          currentChunk: targetChunk,
        } : null);

        isSeekingRef.current = false;
      } catch (error) {
        console.error('Seek error:', error);
        isSeekingRef.current = false;
        const audioError: AudioError = {
          type: 'playback',
          message: 'Failed to seek to position',
          recoverable: true,
        };
        setCurrentError(audioError);
        onError?.(audioError);
      }
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
      if (!audioRef.current || !audioState || !audioStreamerRef.current) return;
      
      const newTime = audioState.currentTime + seconds;
      // Call seek method directly to avoid circular reference
      const streamer = audioStreamerRef.current;
      const book = streamer.getBook();
      if (!book) return;

      isSeekingRef.current = true;
      
      try {
        // Calculate which chunk contains the target time
        let targetChunk = 0;
        let cumulativeTime = 0;
        
        for (let i = 0; i < book.chunks.length; i++) {
          if (cumulativeTime + book.chunks[i].duration_s > newTime) {
            targetChunk = i;
            break;
          }
          cumulativeTime += book.chunks[i].duration_s;
        }

        const chunkStartTime = cumulativeTime;
        const localTime = newTime - chunkStartTime;

        // Load chunk if different from current
        if (targetChunk !== currentChunkRef.current) {
          await loadChunk(targetChunk);
        }

        // Seek to local time in chunk
        audioRef.current.currentTime = localTime;
        
        setAudioState(prev => prev ? {
          ...prev,
          currentTime: localTime,
          currentChunk: targetChunk,
        } : null);

        isSeekingRef.current = false;
      } catch (error) {
        console.error('Skip forward error:', error);
        isSeekingRef.current = false;
      }
    },

    skipBackward: async (seconds: number) => {
      if (!audioRef.current || !audioState || !audioStreamerRef.current) return;
      
      const newTime = Math.max(0, audioState.currentTime - seconds);
      // Call seek method directly to avoid circular reference
      const streamer = audioStreamerRef.current;
      const book = streamer.getBook();
      if (!book) return;

      isSeekingRef.current = true;
      
      try {
        // Calculate which chunk contains the target time
        let targetChunk = 0;
        let cumulativeTime = 0;
        
        for (let i = 0; i < book.chunks.length; i++) {
          if (cumulativeTime + book.chunks[i].duration_s > newTime) {
            targetChunk = i;
            break;
          }
          cumulativeTime += book.chunks[i].duration_s;
        }

        const chunkStartTime = cumulativeTime;
        const localTime = newTime - chunkStartTime;

        // Load chunk if different from current
        if (targetChunk !== currentChunkRef.current) {
          await loadChunk(targetChunk);
        }

        // Seek to local time in chunk
        audioRef.current.currentTime = localTime;
        
        setAudioState(prev => prev ? {
          ...prev,
          currentTime: localTime,
          currentChunk: targetChunk,
        } : null);

        isSeekingRef.current = false;
      } catch (error) {
        console.error('Skip backward error:', error);
        isSeekingRef.current = false;
      }
    },
  }), [audioState, loadChunk, onError]);

  // Initialize audio when book data and bookId are available
  useEffect(() => {
    if (bookId && book && !isInitialized) {
      console.log('Initializing audio system for bookId:', bookId, 'with book data');
      
      // Initialize audio state first
      setAudioState({
        bookId,
        currentChunk: 0,
        currentTime: 0,
        duration: 0,
        isPlaying: false,
        isLoading: true, // Set loading true during initialization
        volume: 1,
        playbackRate: 1,
        bufferedRanges: null,
        error: currentError || undefined,
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