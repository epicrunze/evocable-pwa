'use client';

import { Book } from '@/types/book';
import { BookCard } from './BookCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  BookOpenIcon, 
  UploadIcon,
  RefreshCwIcon,
  AlertCircleIcon
} from 'lucide-react';

interface BookGridProps {
  books: Book[];
  loading: boolean;
  error?: string | null;
  onBookPlay: (bookId: string) => void;
  onBookDownload: (bookId: string) => void;
  onBookDelete: (bookId: string) => void;
  onRefresh: () => void;
  downloadedBooks: Set<string>;
  downloadProgress: Map<string, number>;
  className?: string;
}

function BookCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <div className="flex items-start space-x-3">
        <Skeleton className="w-12 h-12 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <div className="flex space-x-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        <Skeleton className="w-8 h-8 rounded" />
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex space-x-4">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-14" />
        </div>
        <Skeleton className="h-4 w-20" />
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
  );
}

function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="text-center py-16">
      <BookOpenIcon className="mx-auto h-16 w-16 text-gray-400 mb-6" />
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        No books yet
      </h3>
      <p className="text-gray-500 mb-8 max-w-md mx-auto">
        Ready to create your first audiobook? Upload a PDF, EPUB, or TXT file to get started.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <Button 
          className="flex items-center space-x-2"
          onClick={() => {/* TODO: Navigate to upload page */}}
        >
          <UploadIcon className="h-5 w-5" />
          <span>Upload Your First Book</span>
        </Button>
        <Button 
          variant="outline" 
          onClick={onRefresh}
          className="flex items-center space-x-2"
        >
          <RefreshCwIcon className="h-4 w-4" />
          <span>Refresh</span>
        </Button>
      </div>
      <div className="mt-4">
        <Badge variant="info" className="text-sm">
          Supported formats: PDF, EPUB, TXT
        </Badge>
      </div>
    </div>
  );
}

function ErrorState({ error, onRefresh }: { error: string; onRefresh: () => void }) {
  return (
    <div className="text-center py-16">
      <AlertCircleIcon className="mx-auto h-16 w-16 text-red-400 mb-6" />
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Something went wrong
      </h3>
      <p className="text-gray-500 mb-8 max-w-md mx-auto">
        {error || 'Failed to load your library. Please try again.'}
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <Button 
          onClick={onRefresh}
          className="flex items-center space-x-2"
        >
          <RefreshCwIcon className="h-5 w-5" />
          <span>Try Again</span>
        </Button>
        <Button 
          variant="outline"
          onClick={() => {/* TODO: Navigate to upload page */}}
          className="flex items-center space-x-2"
        >
          <UploadIcon className="h-4 w-4" />
          <span>Upload New Book</span>
        </Button>
      </div>
    </div>
  );
}

export function BookGrid({
  books,
  loading,
  error,
  onBookPlay,
  onBookDownload,
  onBookDelete,
  onRefresh,
  downloadedBooks,
  downloadProgress,
  className = ''
}: BookGridProps) {
  // Loading state
  if (loading) {
    return (
      <div className={`book-grid ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <BookCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`book-grid ${className}`}>
        <ErrorState error={error} onRefresh={onRefresh} />
      </div>
    );
  }

  // Empty state
  if (books.length === 0) {
    return (
      <div className={`book-grid ${className}`}>
        <EmptyState onRefresh={onRefresh} />
      </div>
    );
  }

  // Books grid
  return (
    <div className={`book-grid ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {books.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            onPlay={onBookPlay}
            onDownload={onBookDownload}
            onDelete={onBookDelete}
            isDownloaded={downloadedBooks.has(book.id)}
            downloadProgress={downloadProgress.get(book.id)}
          />
        ))}
      </div>
    </div>
  );
} 