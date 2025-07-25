'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Book } from '@/types/book';
import { apiClient } from '@/lib/api/client';
import { LibraryQuery } from '@/components/features/library/SearchBar';

export interface UseBookData {
  books: Book[];
  filteredBooks: Book[];
  loading: boolean;
  error: string | null;
  totalBooks: number;
  query: LibraryQuery;
  refetch: () => void;
  updateQuery: (newQuery: LibraryQuery) => void;
  deleteBook: (bookId: string) => Promise<void>;
  refreshBook: (bookId: string) => Promise<void>;
}

// Query keys
export const bookQueryKeys = {
  all: ['books'] as const,
  lists: () => [...bookQueryKeys.all, 'list'] as const,
  list: (query: LibraryQuery) => [...bookQueryKeys.lists(), query] as const,
  details: () => [...bookQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...bookQueryKeys.details(), id] as const,
};

// API functions
async function fetchBooks(query?: LibraryQuery): Promise<Book[]> {
  const response = await apiClient.get<{ books: Book[] }>('/books', {
    search: query?.search,
    status: query?.status?.join(','),
    sort_by: query?.sortBy,
    sort_order: query?.sortOrder,
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data?.books || [];
}

async function deleteBookApi(bookId: string): Promise<void> {
  const response = await apiClient.delete(`/books/${bookId}`);
  
  if (response.error) {
    throw new Error(response.error.message);
  }
}

async function fetchBookDetails(bookId: string): Promise<Book> {
  const response = await apiClient.get<Book>(`/books/${bookId}`);
  
  if (response.error) {
    throw new Error(response.error.message);
  }
  
  if (!response.data) {
    throw new Error('Book not found');
  }
  
  return response.data;
}

// Filtering and sorting utilities
function filterBooks(books: Book[], query: LibraryQuery): Book[] {
  let filtered = books;

  // Filter by search term
  if (query.search) {
    const searchTerm = query.search.toLowerCase();
    filtered = filtered.filter(book =>
      book.title.toLowerCase().includes(searchTerm) ||
      book.format.toLowerCase().includes(searchTerm)
    );
  }

  // Filter by status
  if (query.status && query.status.length > 0) {
    filtered = filtered.filter(book => 
      query.status!.includes(book.status)
    );
  }

  return filtered;
}

function sortBooks(books: Book[], query: LibraryQuery): Book[] {
  const sortBy = query.sortBy || 'created_at';
  const sortOrder = query.sortOrder || 'desc';

  return [...books].sort((a, b) => {
    let aValue: string | number | Date;
    let bValue: string | number | Date;

    switch (sortBy) {
      case 'title':
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
        break;
      case 'created_at':
        aValue = new Date(a.created_at);
        bValue = new Date(b.created_at);
        break;
      case 'updated_at':
        aValue = new Date(a.updated_at);
        bValue = new Date(b.updated_at);
        break;
      default:
        aValue = a.created_at;
        bValue = b.created_at;
    }

    let comparison = 0;
    if (aValue < bValue) comparison = -1;
    if (aValue > bValue) comparison = 1;

    return sortOrder === 'asc' ? comparison : -comparison;
  });
}

export function useBooks(): UseBookData {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState<LibraryQuery>({
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  // Fetch books query
  const {
    data: books = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: bookQueryKeys.list(query),
    queryFn: () => fetchBooks(query),
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 60000, // Refetch every minute to catch processing updates
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Delete book mutation
  const deleteMutation = useMutation({
    mutationFn: deleteBookApi,
    onSuccess: (_, bookId) => {
      // Remove from cache
      queryClient.setQueryData(
        bookQueryKeys.list(query),
        (oldData: Book[] | undefined) => 
          oldData?.filter(book => book.id !== bookId) || []
      );
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: bookQueryKeys.all });
    },
    onError: (error) => {
      console.error('Failed to delete book:', error);
    },
  });

  // Memoized filtered and sorted books
  const filteredBooks = useMemo(() => {
    const filtered = filterBooks(books, query);
    return sortBooks(filtered, query);
  }, [books, query]);

  // Handlers
  const updateQuery = useCallback((newQuery: LibraryQuery) => {
    setQuery(newQuery);
  }, []);

  const deleteBook = useCallback(async (bookId: string) => {
    await deleteMutation.mutateAsync(bookId);
  }, [deleteMutation]);

  const refreshBook = useCallback(async (bookId: string) => {
    // Invalidate specific book cache
    queryClient.invalidateQueries({ queryKey: bookQueryKeys.detail(bookId) });
    
    // Refetch book details and update cache
    try {
      const updatedBook = await fetchBookDetails(bookId);
      queryClient.setQueryData(
        bookQueryKeys.list(query),
        (oldData: Book[] | undefined) => 
          oldData?.map(book => 
            book.id === bookId ? updatedBook : book
          ) || []
      );
    } catch (error) {
      console.error('Failed to refresh book:', error);
    }
  }, [queryClient, query]);

  return {
    books,
    filteredBooks,
    loading,
    error: queryError?.message || deleteMutation.error?.message || null,
    totalBooks: books.length,
    query,
    refetch,
    updateQuery,
    deleteBook,
    refreshBook,
  };
}

// Individual book hook
export function useBook(bookId: string) {
  const queryClient = useQueryClient();

  const {
    data: book,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: bookQueryKeys.detail(bookId),
    queryFn: () => fetchBookDetails(bookId),
    staleTime: 30000,
    gcTime: 300000,
    enabled: !!bookId,
    retry: 3,
  });

  const refreshBook = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    book,
    loading,
    error: queryError?.message || null,
    refetch: refreshBook,
  };
}

// Hook for processing books (those that need status updates)
export function useProcessingBooks() {
  const queryClient = useQueryClient();
  
  const {
    data: processingBooks = [],
    isLoading: loading,
  } = useQuery({
    queryKey: ['books', 'processing'],
    queryFn: async () => {
      const books = await fetchBooks();
      return books.filter(book => 
        ['processing', 'extracting', 'segmenting', 'generating_audio', 'transcoding'].includes(book.status)
      );
    },
    refetchInterval: 5000, // Poll every 5 seconds for processing books
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider stale for real-time updates
  });

  return {
    processingBooks,
    loading,
    hasProcessingBooks: processingBooks.length > 0,
  };
} 