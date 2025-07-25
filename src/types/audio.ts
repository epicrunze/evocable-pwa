export interface AudioState {
  bookId: string;
  currentChunk: number;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isLoading: boolean;
  volume: number;
  playbackRate: number;
  bufferedRanges: TimeRanges | null;
  error?: AudioError;
}

export interface AudioError {
  type: 'network' | 'decode' | 'playback' | 'permission';
  message: string;
  recoverable: boolean;
  chunk?: number;
}

export interface Bookmark {
  id: string;
  bookId: string;
  title: string;
  time: number; // in seconds
  chunk: number;
  created_at: string;
}

export interface PlaybackSession {
  bookId: string;
  startTime: number;
  endTime?: number;
  lastPosition: number;
  completed: boolean;
}

export interface AudioPlayerConfig {
  bufferSize: number;
  prefetchChunks: number;
  maxRetries: number;
  retryDelay: number;
}

export interface AudioQuality {
  bitrate: number;
  codec: string;
  sampleRate: number;
}

export interface PlaybackControls {
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seek: (time: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  setPlaybackRate: (rate: number) => Promise<void>;
  skipForward: (seconds: number) => Promise<void>;
  skipBackward: (seconds: number) => Promise<void>;
} 