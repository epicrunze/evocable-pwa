'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { useAudio } from '@/hooks/useAudio';
import { AudioError } from '@/types/audio';
import { 
  PlayIcon, 
  PauseIcon, 
  SkipBackIcon, 
  SkipForwardIcon,
  Volume1Icon,
  Volume2Icon,
  VolumeXIcon,
  BookmarkIcon,
  RotateCcwIcon
} from 'lucide-react';

interface AudioPlayerProps {
  bookId: string;
  autoPlay?: boolean;
  onBookmarkAdd?: (title: string) => void;
  onError?: (error: AudioError) => void;
  className?: string;
}

export function AudioPlayer({ 
  bookId, 
  autoPlay = false, 
  onBookmarkAdd, 
  onError,
  className = ''
}: AudioPlayerProps) {
  const [showBookmarkInput, setShowBookmarkInput] = useState(false);
  const [bookmarkTitle, setBookmarkTitle] = useState('');

  const {
    audioState,
    controls,
    bookmarks,
    isLoading,
    error,
    book,
    addBookmark,
    removeBookmark,
    initialize,
    cleanup,
  } = useAudio({
    bookId,
    autoPlay,
    onError,
  });

  // Initialize on mount
  useEffect(() => {
    if (bookId) {
      initialize(bookId);
    }
    
    return () => {
      cleanup();
    };
  }, [bookId, initialize, cleanup]);

  // Format time helper
  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // Handle seek
  const handleSeek = useCallback((percentage: number) => {
    if (!audioState || !book) return;
    
    const newTime = (percentage / 100) * book.total_duration_s;
    controls.seek(newTime);
  }, [audioState, book, controls]);

  // Handle bookmark creation
  const handleCreateBookmark = useCallback(async () => {
    if (!bookmarkTitle.trim()) return;
    
    try {
      await addBookmark(bookmarkTitle.trim());
      setBookmarkTitle('');
      setShowBookmarkInput(false);
      onBookmarkAdd?.(bookmarkTitle.trim());
    } catch (error) {
      console.error('Failed to create bookmark:', error);
    }
  }, [bookmarkTitle, addBookmark, onBookmarkAdd]);

  // Handle volume change
  const handleVolumeChange = useCallback((volume: number) => {
    controls.setVolume(volume);
  }, [controls]);

  // Handle playback rate change
  const handleRateChange = useCallback((rate: number) => {
    controls.setPlaybackRate(rate);
  }, [controls]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
        <Alert variant="destructive" className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Audio Error</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {error.message}
              </p>
            </div>
            {error.recoverable && (
              <Button
                size="sm"
                onClick={() => initialize(bookId)}
                className="ml-4"
              >
                <RotateCcwIcon size={16} className="mr-1" />
                Retry
              </Button>
            )}
          </div>
        </Alert>
      </div>
    );
  }

  // No audio state
  if (!audioState || !book) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {book?.title || 'Loading...'}
          </h3>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">
              Initializing audio...
            </Badge>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-b-transparent border-blue-600"></div>
        </div>
      </div>
    );
  }

  // Check if book has chunks
  if (!book.chunks || book.chunks.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {book.title}
          </h3>
        </div>
        <Alert variant="warning">
          <div className="text-center">
            <p className="font-medium mb-2">No audio available</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This book doesn't have any audio chunks available for playback.
            </p>
          </div>
        </Alert>
      </div>
    );
  }

  const currentProgress = book.total_duration_s > 0 
    ? (audioState.currentTime / book.total_duration_s) * 100 
    : 0;

  const VolumeIconComponent = audioState.volume === 0 ? VolumeXIcon : 
                             audioState.volume < 0.3 ? Volume1Icon :
                             audioState.volume < 0.7 ? Volume1Icon : Volume2Icon;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
      {/* Book Title */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          {book.title}
        </h3>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">
            Chunk {audioState.currentChunk + 1} of {book.chunks.length}
          </Badge>
          <Badge variant="secondary">
            {formatTime(audioState.currentTime)} / {formatTime(book.total_duration_s)}
          </Badge>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <Progress
          value={currentProgress}
          className="h-2 cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const percentage = ((e.clientX - rect.left) / rect.width) * 100;
            handleSeek(percentage);
          }}
        />
        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mt-1">
          <span>{formatTime(audioState.currentTime)}</span>
          <span>{formatTime(book.total_duration_s)}</span>
        </div>
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-center space-x-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => controls.skipBackward(30)}
          disabled={audioState.isLoading}
        >
          <SkipBackIcon size={20} />
        </Button>

        <Button
          size="lg"
          onClick={audioState.isPlaying ? controls.pause : controls.play}
          disabled={audioState.isLoading}
          className="w-16 h-16"
        >
          {audioState.isLoading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-b-transparent border-white"></div>
          ) : audioState.isPlaying ? (
            <PauseIcon size={24} />
          ) : (
            <PlayIcon size={24} />
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => controls.skipForward(30)}
          disabled={audioState.isLoading}
        >
          <SkipForwardIcon size={20} />
        </Button>
      </div>

      {/* Secondary Controls */}
      <div className="flex items-center justify-between">
        {/* Volume Control */}
        <div className="flex items-center space-x-2">
          <VolumeIconComponent size={20} className="text-gray-500 dark:text-gray-400" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={audioState.volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-sm text-gray-500 dark:text-gray-400 w-8">
            {Math.round(audioState.volume * 100)}%
          </span>
        </div>

        {/* Playback Rate */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Speed:</span>
          <select
            value={audioState.playbackRate}
            onChange={(e) => handleRateChange(parseFloat(e.target.value))}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value={0.5}>0.5x</option>
            <option value={0.75}>0.75x</option>
            <option value={1}>1x</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>
        </div>

        {/* Bookmark Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowBookmarkInput(!showBookmarkInput)}
          disabled={audioState.isLoading}
        >
          <BookmarkIcon size={16} className="mr-1" />
          Bookmark
        </Button>
      </div>

      {/* Bookmark Input */}
      {showBookmarkInput && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={bookmarkTitle}
              onChange={(e) => setBookmarkTitle(e.target.value)}
              placeholder="Enter bookmark title"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCreateBookmark();
                }
              }}
            />
            <Button
              size="sm"
              onClick={handleCreateBookmark}
              disabled={!bookmarkTitle.trim()}
            >
              Add
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowBookmarkInput(false);
                setBookmarkTitle('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Bookmarks List */}
      {bookmarks.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Bookmarks
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {bookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded-lg"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {bookmark.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTime(bookmark.time)}
                  </p>
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => controls.seek(bookmark.time)}
                    className="text-xs px-2 py-1"
                  >
                    Go to
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeBookmark(bookmark.id)}
                    className="text-xs px-2 py-1 text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 