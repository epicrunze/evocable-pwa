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
  RotateCcwIcon,
  Loader2Icon
} from 'lucide-react';

interface AudioPlayerProps {
  bookId: string;
  autoPlay?: boolean;
  onError?: (error: AudioError) => void;
  className?: string;
}

export function AudioPlayer({ 
  bookId, 
  autoPlay = false, 
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

  // Handle seek with virtual timeline
  const handleSeek = useCallback((percentage: number) => {
    if (!audioState) return;
    
    const newVirtualTime = (percentage / 100) * audioState.virtualDuration;
    controls.seekToVirtualTime(newVirtualTime);
  }, [audioState, controls]);

  // Handle bookmark creation
  const handleCreateBookmark = useCallback(async () => {
    if (!bookmarkTitle.trim()) return;
    
    try {
      await addBookmark(bookmarkTitle.trim());
      setBookmarkTitle('');
      setShowBookmarkInput(false);
    } catch (error) {
      console.error('Failed to create bookmark:', error);
    }
  }, [bookmarkTitle, addBookmark]);

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
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {book?.title || 'Loading...'}
          </h3>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">
              <Loader2Icon className="w-4 h-4 mr-1 animate-spin" />
              Loading audio...
            </Badge>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-b-transparent border-blue-600"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {book?.title || 'Audio Player'}
          </h3>
        </div>
        <Alert variant="destructive">
          <div className="text-center">
            <p className="font-medium">Audio Error</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {error.message}
            </p>
            {error.recoverable && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => window.location.reload()}
              >
                <RotateCcwIcon className="w-4 h-4 mr-2" />
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
              This book doesn&apos;t have any audio chunks available for playback.
            </p>
          </div>
        </Alert>
      </div>
    );
  }

  // Calculate progress using virtual timeline
  const currentProgress = audioState.virtualDuration > 0 
    ? (audioState.virtualCurrentTime / audioState.virtualDuration) * 100 
    : 0;

  const VolumeIconComponent = audioState.volume === 0 ? VolumeXIcon : 
                             audioState.volume < 0.3 ? Volume1Icon :
                             audioState.volume < 0.7 ? Volume1Icon : Volume2Icon;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-6 pb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          {book.title}
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">
              🎵 Gapless Audio
            </Badge>
          </div>
          <span className="text-sm text-gray-500">
            {formatTime(audioState.virtualCurrentTime)} / {formatTime(audioState.virtualDuration)}
          </span>
        </div>
      </div>

      {/* Main Progress Bar */}
      <div className="px-6 pb-4">
        <div className="relative">
          {/* Enhanced progress bar with transition indicator */}
          <div className="relative">
            <Progress 
              value={currentProgress} 
              className="h-3 cursor-pointer transition-all duration-100"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percentage = ((e.clientX - rect.left) / rect.width) * 100;
                handleSeek(percentage);
              }}
            />
            
            {/* Chunk boundaries visualization */}
            {audioState.chunkOffsets && audioState.virtualDuration > 0 && (
              <div className="absolute top-0 h-3 w-full pointer-events-none">
                {audioState.chunkOffsets.slice(1).map((offset, index) => {
                  const position = (offset / audioState.virtualDuration) * 100;
                  return (
                    <div
                      key={index}
                      className="absolute top-0 w-px h-full bg-gray-300 dark:bg-gray-600 opacity-50"
                      style={{ left: `${position}%` }}
                    />
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>{formatTime(audioState.virtualCurrentTime)}</span>
            <span>{formatTime(audioState.virtualDuration)}</span>
          </div>
          
          {/* Simplified status indicator */}
          <div className="flex justify-center text-xs text-gray-400 mt-1">
            <span>Seamless Playback • {audioState.chunkOffsets.length} segments</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="px-6 pb-6">
        <div className="flex items-center justify-center space-x-4 mb-4">
          {/* Skip Back */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => controls.skipBackward(30)}
            disabled={audioState.isLoading}
            className="h-10 w-10 p-0"
          >
            <SkipBackIcon className="w-4 h-4" />
          </Button>

          {/* Play/Pause */}
          <Button
            onClick={audioState.isPlaying ? controls.pause : controls.play}
            disabled={audioState.isLoading}
            size="lg"
            className="h-14 w-14 rounded-full"
          >
            {audioState.isLoading ? (
              <Loader2Icon className="w-6 h-6 animate-spin" />
            ) : audioState.isPlaying ? (
              <PauseIcon className="w-6 h-6" />
            ) : (
              <PlayIcon className="w-6 h-6" />
            )}
          </Button>

          {/* Skip Forward */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => controls.skipForward(30)}
            disabled={audioState.isLoading}
            className="h-10 w-10 p-0"
          >
            <SkipForwardIcon className="w-4 h-4" />
          </Button>
        </div>

        {/* Secondary Controls */}
        <div className="flex items-center justify-between">
          {/* Volume Control */}
          <div className="flex items-center space-x-2">
            <VolumeIconComponent className="w-4 h-4 text-gray-500" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={audioState.volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 slider"
            />
            <span className="text-xs text-gray-500 w-8">
              {Math.round(audioState.volume * 100)}%
            </span>
          </div>

          {/* Playback Rate */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">Speed:</span>
            <select
              value={audioState.playbackRate}
              onChange={(e) => handleRateChange(parseFloat(e.target.value))}
              className="text-xs bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
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
            onClick={() => setShowBookmarkInput(true)}
            disabled={audioState.isLoading}
          >
            <BookmarkIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Bookmark Input */}
      {showBookmarkInput && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Bookmark title"
              value={bookmarkTitle}
              onChange={(e) => setBookmarkTitle(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCreateBookmark();
                }
              }}
              autoFocus
            />
            <Button
              onClick={handleCreateBookmark}
              disabled={!bookmarkTitle.trim()}
              size="sm"
            >
              Add
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowBookmarkInput(false);
                setBookmarkTitle('');
              }}
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Bookmarks List */}
      {bookmarks.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Bookmarks</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {bookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <button
                  onClick={() => controls.seekToVirtualTime(bookmark.time)}
                  className="flex-1 text-left text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {bookmark.title}
                </button>
                <span className="text-xs text-gray-500 mx-2">
                  {formatTime(bookmark.time)}
                </span>
                <button
                  onClick={() => removeBookmark(bookmark.id)}
                  className="text-red-600 dark:text-red-400 hover:underline text-xs"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}