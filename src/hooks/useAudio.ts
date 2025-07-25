import { useState, useEffect, useRef, useCallback } from 'react';
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
    if (!bookId) return;

    try {
      // Initialize audio streamer
      const streamer = new AudioStreamer(bookId, {
        onError: (error: AudioError) => {
          setCurrentError(error);
          onError?.(error);
        },
        onChunkChange: (chunkIndex: number) => {
          currentChunkRef.current = chunkIndex;
          onChunkChange?.(chunkIndex);
        },
        prefetchSize: 5,
      });

      await streamer.initialize();
      audioStreamerRef.current = streamer;

      // Initialize audio element
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.crossOrigin = 'anonymous';

      // Set up event listeners
      audio.addEventListener('loadstart', () => {
        setAudioState(prev => prev ? { ...prev, isLoading: true } : null);
      });

      audio.addEventListener('loadedmetadata', () => {
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
        setAudioState(prev => prev ? { ...prev, isPlaying: true } : null);
        onPlay?.();
      });

      audio.addEventListener('pause', () => {
        setAudioState(prev => prev ? { ...prev, isPlaying: false } : null);
        onPause?.();
      });

      audio.addEventListener('ended', () => {
        handleChunkEnd();
      });

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
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      const audioError: AudioError = {
        type: 'network',
        message: 'Failed to initialize audio system',
        recoverable: true,
      };
      setCurrentError(audioError);
      onError?.(audioError);
    }
  }, [bookId, onPlay, onPause, onTimeUpdate, onChunkChange, onError]);

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

  // Handle chunk end
  const handleChunkEnd = useCallback(() => {
    if (!audioStreamerRef.current) return;

    const streamer = audioStreamerRef.current;
    const nextChunkIndex = currentChunkRef.current + 1;
    
    if (nextChunkIndex < streamer.getTotalChunks()) {
      loadChunk(nextChunkIndex);
    } else {
      setAudioState(prev => prev ? { ...prev, isPlaying: false } : null);
      onEnd?.();
    }
  }, [loadChunk, onEnd]);

  // Playback controls
  const controls: PlaybackControls = {
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
      if (!audioRef.current || !audioState) return;
      
      const newTime = audioState.currentTime + seconds;
      await controls.seek(newTime);
    },

    skipBackward: async (seconds: number) => {
      if (!audioRef.current || !audioState) return;
      
      const newTime = Math.max(0, audioState.currentTime - seconds);
      await controls.seek(newTime);
    },
  };

  // Initialize audio state
  useEffect(() => {
    if (bookId && !audioState) {
      console.log('Initializing audio state for bookId:', bookId);
      setAudioState({
        bookId,
        currentChunk: 0,
        currentTime: 0,
        duration: 0,
        isPlaying: false,
        isLoading: false,
        volume: 1,
        playbackRate: 1,
        bufferedRanges: null,
        error: currentError || undefined,
      });
    }
  }, [bookId, audioState, currentError]);

  // Initialize audio when bookId changes
  useEffect(() => {
    if (bookId && !isInitialized) {
      console.log('Initializing audio system for bookId:', bookId);
      initializeAudio();
    }
  }, [bookId, isInitialized, initializeAudio]);

  // Load first chunk when audio is initialized
  useEffect(() => {
    if (isInitialized && audioStreamerRef.current && audioRef.current) {
      const streamer = audioStreamerRef.current;
      if (streamer.isReady()) {
        console.log('Loading first chunk');
        loadChunk(0);
      }
    }
  }, [isInitialized, loadChunk]);

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
    isLoading: bookLoading || !isInitialized,
    error: bookError ? { 
      type: 'network', 
      message: 'Failed to load book', 
      recoverable: true 
    } : currentError,
    book: audioStreamerRef.current?.getBook() || book || null,
    addBookmark,
    removeBookmark,
    seekToBookmark,
    initialize,
    cleanup,
  };
} 