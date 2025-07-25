'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/common/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { SearchBar } from './SearchBar';
import { BookGrid } from './BookGrid';
import { useBooks, useProcessingBooks } from '@/hooks/useBooks';
import { 
  BookOpenIcon, 
  HardDriveIcon,
  WifiIcon,
  WifiOffIcon,
  RefreshCwIcon,
  AlertCircleIcon,
  TrendingUpIcon
} from 'lucide-react';

// Mock data for downloaded books - this would come from offline storage
const mockDownloadedBooks = new Set<string>();
const mockDownloadProgress = new Map<string, number>();

function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState<string>('');

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    const updateConnectionType = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        setConnectionType(connection?.effectiveType || connection?.type || '');
      }
    };

    updateOnlineStatus();
    updateConnectionType();

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    if ('connection' in navigator) {
      (navigator as any).connection.addEventListener('change', updateConnectionType);
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      if ('connection' in navigator) {
        (navigator as any).connection.removeEventListener('change', updateConnectionType);
      }
    };
  }, []);

  return (
    <div className="flex items-center space-x-2 text-sm">
      {isOnline ? (
        <>
          <WifiIcon className="w-4 h-4 text-green-500" />
          <span className="text-green-600">
            Connected {connectionType && `(${connectionType})`}
          </span>
        </>
      ) : (
        <>
          <WifiOffIcon className="w-4 h-4 text-red-500" />
          <span className="text-red-600">Offline</span>
        </>
      )}
    </div>
  );
}

function LibraryStats({ 
  totalBooks, 
  processingBooks, 
  downloadedBooks,
  onRefresh 
}: { 
  totalBooks: number;
  processingBooks: number;
  downloadedBooks: number;
  onRefresh: () => void;
}) {
  const completedBooks = totalBooks - processingBooks;
  // TODO: Calculate from books
  // const totalDuration = 0;
  // TODO: Calculate from downloaded books  
  // const storageUsed = 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Books</CardTitle>
          <BookOpenIcon className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalBooks}</div>
          <p className="text-xs text-gray-500">
            {completedBooks} completed, {processingBooks} processing
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Processing</CardTitle>
          <TrendingUpIcon className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{processingBooks}</div>
          <p className="text-xs text-gray-500">
            {processingBooks > 0 ? 'In progress' : 'All up to date'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Downloaded</CardTitle>
          <HardDriveIcon className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{downloadedBooks}</div>
          <p className="text-xs text-gray-500">
            Available offline
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          <RefreshCwIcon className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRefresh}
            className="w-full"
          >
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ProcessingAlert({ processingBooks }: { processingBooks: number }) {
  if (processingBooks === 0) return null;

  return (
    <Alert className="mb-6 border-orange-200 bg-orange-50">
      <AlertCircleIcon className="h-4 w-4 text-orange-600" />
      <div className="ml-2">
        <h4 className="font-medium text-orange-800">
          {processingBooks} book{processingBooks > 1 ? 's' : ''} processing
        </h4>
        <p className="text-sm text-orange-700">
          Your audiobook{processingBooks > 1 ? 's are' : ' is'} being generated. 
          This may take a few minutes depending on the size.
        </p>
      </div>
    </Alert>
  );
}

export function Library() {
  const router = useRouter();
  
  const { 
    filteredBooks, 
    loading, 
    error, 
    totalBooks,
    query,
    refetch,
    updateQuery,
    deleteBook
  } = useBooks();

  const { 
    processingBooks, 
    hasProcessingBooks 
  } = useProcessingBooks();

  // Handlers
  const handleBookPlay = useCallback((bookId: string) => {
    // Navigate to player page
    router.push(`/books/${bookId}`);
  }, [router]);

  const handleBookDownload = useCallback((bookId: string) => {
    // TODO: Start download
    console.log('Download book:', bookId);
  }, []);

  const handleBookDelete = useCallback(async (bookId: string) => {
    if (window.confirm('Are you sure you want to delete this book?')) {
      try {
        await deleteBook(bookId);
      } catch (error) {
        console.error('Failed to delete book:', error);
      }
    }
  }, [deleteBook]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <Layout currentPage="library">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Library</h1>
            <p className="text-gray-500">Manage your audiobook collection</p>
          </div>
          <ConnectionStatus />
        </div>

        {/* Stats */}
        <LibraryStats 
          totalBooks={totalBooks}
          processingBooks={processingBooks.length}
          downloadedBooks={mockDownloadedBooks.size}
          onRefresh={handleRefresh}
        />

        {/* Processing Alert */}
        {hasProcessingBooks && (
          <ProcessingAlert processingBooks={processingBooks.length} />
        )}

        {/* Search and Filter */}
        <SearchBar 
          query={query}
          onQueryChange={updateQuery}
          totalBooks={totalBooks}
          filteredBooks={filteredBooks.length}
        />

        {/* Books Grid */}
        <BookGrid 
          books={filteredBooks}
          loading={loading}
          error={error}
          onBookPlay={handleBookPlay}
          onBookDownload={handleBookDownload}
          onBookDelete={handleBookDelete}
          onRefresh={handleRefresh}
          downloadedBooks={mockDownloadedBooks}
          downloadProgress={mockDownloadProgress}
        />
      </div>
    </Layout>
  );
} 