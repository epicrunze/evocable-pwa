'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { AudioPlayer } from '@/components/features/player/AudioPlayer';
import { useBooks } from '@/hooks/useBooks';
import { AudioError } from '@/types/audio';
import { 
  ArrowLeftIcon, 
  DownloadIcon, 
  ShareIcon, 
  BookOpenIcon,
  ClockIcon,
  FileAudioIcon
} from 'lucide-react';

export default function BookPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.id as string;
  
  const [audioError, setAudioError] = useState<AudioError | null>(null);
  const [showBookmarkSuccess, setShowBookmarkSuccess] = useState(false);

  const { books, loading: booksLoading, error: booksError } = useBooks();
  const book = books.find(b => b.id === bookId);

  // Handle audio errors
  const handleAudioError = (error: AudioError) => {
    setAudioError(error);
  };

  // Handle bookmark creation
  const handleBookmarkAdd = () => {
    setShowBookmarkSuccess(true);
    setTimeout(() => setShowBookmarkSuccess(false), 3000);
  };

  // Handle back navigation
  const handleBack = () => {
    router.push('/');
  };

  // Handle download
  const handleDownload = () => {
    // TODO: Implement download functionality
    console.log('Download book:', bookId);
  };

  // Handle share
  const handleShare = () => {
    if (navigator.share && book) {
      navigator.share({
        title: book.title,
        text: `Listen to "${book.title}" - Generated audiobook`,
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Loading state
  if (booksLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header Skeleton */}
          <div className="mb-8">
            <Skeleton className="h-8 w-20 mb-4" />
            <Skeleton className="h-10 w-3/4 mb-2" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
          
          {/* Player Skeleton */}
          <Skeleton className="h-64 w-full mb-8" />
          
          {/* Book Info Skeleton */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (booksError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <Button
              variant="outline"
              onClick={handleBack}
              className="mb-4"
            >
              <ArrowLeftIcon size={16} className="mr-2" />
              Back to Library
            </Button>
          </div>
          
          <Alert variant="destructive">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Failed to load book</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {booksError}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => window.location.reload()}
                className="ml-4"
              >
                Retry
              </Button>
            </div>
          </Alert>
        </div>
      </div>
    );
  }

  // Book not found
  if (!book) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <Button
              variant="outline"
              onClick={handleBack}
              className="mb-4"
            >
              <ArrowLeftIcon size={16} className="mr-2" />
              Back to Library
            </Button>
          </div>
          
          <Alert variant="warning">
            <div className="text-center">
              <BookOpenIcon size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="font-medium mb-2">Book not found</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                                 The book you&apos;re looking for doesn&apos;t exist or has been removed.
              </p>
            </div>
          </Alert>
        </div>
      </div>
    );
  }

  // Book not ready for playback
  if (book.status !== 'completed') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <Button
              variant="outline"
              onClick={handleBack}
              className="mb-4"
            >
              <ArrowLeftIcon size={16} className="mr-2" />
              Back to Library
            </Button>
          </div>
          
          <Alert variant="info">
            <div className="text-center">
              <FileAudioIcon size={48} className="mx-auto mb-4 text-blue-400" />
              <p className="font-medium mb-2">Book not ready</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                This book is still being processed. Current status: {book.status}
              </p>
              {book.percent_complete && (
                <div className="mb-4">
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${book.percent_complete}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {book.percent_complete}% complete
                  </p>
                </div>
              )}
              <Button onClick={handleBack}>
                Return to Library
              </Button>
            </div>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={handleBack}
            className="mb-4"
          >
            <ArrowLeftIcon size={16} className="mr-2" />
            Back to Library
          </Button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {book.title}
              </h1>
              <div className="flex items-center space-x-3">
                <Badge variant="success">
                  {book.status}
                </Badge>
                <Badge variant="secondary">
                  {book.format?.toUpperCase()}
                </Badge>
                {book.duration && (
                  <Badge variant="secondary">
                    <ClockIcon size={14} className="mr-1" />
                    {formatDuration(book.duration)}
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
              >
                <ShareIcon size={16} className="mr-1" />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <DownloadIcon size={16} className="mr-1" />
                Download
              </Button>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {showBookmarkSuccess && (
          <Alert variant="success" className="mb-4">
            <p className="font-medium">Bookmark added successfully!</p>
          </Alert>
        )}

        {/* Audio Error */}
        {audioError && (
          <Alert variant="destructive" className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Audio Error</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {audioError.message}
                </p>
              </div>
              {audioError.recoverable && (
                <Button
                  size="sm"
                  onClick={() => setAudioError(null)}
                  className="ml-4"
                >
                  Dismiss
                </Button>
              )}
            </div>
          </Alert>
        )}

        {/* Audio Player */}
        <div className="mb-8">
          <AudioPlayer
            bookId={bookId}
            onBookmarkAdd={handleBookmarkAdd}
            onError={handleAudioError}
          />
        </div>

        {/* Book Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Book Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                Details
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Format:</dt>
                  <dd className="text-gray-900 dark:text-white">{book.format?.toUpperCase()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Status:</dt>
                  <dd className="text-gray-900 dark:text-white">{book.status}</dd>
                </div>
                {book.duration && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Duration:</dt>
                    <dd className="text-gray-900 dark:text-white">{formatDuration(book.duration)}</dd>
                  </div>
                )}
                {book.file_size && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">File Size:</dt>
                    <dd className="text-gray-900 dark:text-white">{formatFileSize(book.file_size)}</dd>
                  </div>
                )}
              </dl>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                Processing
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Progress:</dt>
                  <dd className="text-gray-900 dark:text-white">
                    {book.percent_complete || 0}% complete
                  </dd>
                </div>
                {book.total_chunks && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Audio Chunks:</dt>
                    <dd className="text-gray-900 dark:text-white">{book.total_chunks}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Created:</dt>
                  <dd className="text-gray-900 dark:text-white">
                    {new Date(book.created_at).toLocaleDateString()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Updated:</dt>
                  <dd className="text-gray-900 dark:text-white">
                    {new Date(book.updated_at).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 