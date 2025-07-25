'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { BookStatus } from '@/types/book';
import { 
  SearchIcon, 
  FilterIcon, 
  SortAscIcon, 
  SortDescIcon,
  XIcon
} from 'lucide-react';

export interface LibraryQuery {
  search?: string;
  status?: BookStatus[];
  sortBy?: 'title' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

interface SearchBarProps {
  query: LibraryQuery;
  onQueryChange: (query: LibraryQuery) => void;
  totalBooks: number;
  filteredBooks: number;
  className?: string;
}

const statusOptions: { value: BookStatus; label: string; color: string }[] = [
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'processing', label: 'Processing', color: 'bg-orange-100 text-orange-800' },
  { value: 'pending', label: 'Pending', color: 'bg-gray-100 text-gray-800' },
  { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-800' },
  { value: 'extracting', label: 'Extracting', color: 'bg-blue-100 text-blue-800' },
  { value: 'segmenting', label: 'Segmenting', color: 'bg-purple-100 text-purple-800' },
  { value: 'generating_audio', label: 'Generating Audio', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'transcoding', label: 'Transcoding', color: 'bg-pink-100 text-pink-800' },
];

const sortOptions = [
  { value: 'title', label: 'Title' },
  { value: 'created_at', label: 'Date Created' },
  { value: 'updated_at', label: 'Last Updated' },
];

export function SearchBar({ 
  query, 
  onQueryChange, 
  totalBooks, 
  filteredBooks, 
  className = '' 
}: SearchBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [searchValue, setSearchValue] = useState(query.search || '');

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
    onQueryChange({ ...query, search: value || undefined });
  }, [query, onQueryChange]);

  const handleStatusFilter = useCallback((status: BookStatus) => {
    const currentStatuses = query.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];
    
    onQueryChange({ 
      ...query, 
      status: newStatuses.length > 0 ? newStatuses : undefined 
    });
  }, [query, onQueryChange]);

  const handleSortChange = useCallback((sortBy: 'title' | 'created_at' | 'updated_at') => {
    onQueryChange({ ...query, sortBy });
  }, [query, onQueryChange]);

  const handleSortOrderToggle = useCallback(() => {
    onQueryChange({ 
      ...query, 
      sortOrder: query.sortOrder === 'asc' ? 'desc' : 'asc' 
    });
  }, [query, onQueryChange]);

  const clearAllFilters = useCallback(() => {
    setSearchValue('');
    onQueryChange({ 
      sortBy: 'created_at', 
      sortOrder: 'desc' 
    });
  }, [onQueryChange]);

  const hasActiveFilters = query.search || (query.status && query.status.length > 0);

  return (
    <div className={`search-bar ${className}`}>
      {/* Search Input and Controls */}
      <div className="flex items-center space-x-4 mb-4">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search books..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-2"
        >
          <FilterIcon className="w-4 h-4" />
          <span>Filter</span>
          {hasActiveFilters && (
            <Badge variant="info" className="ml-1 text-xs">
              {(query.status?.length || 0) + (query.search ? 1 : 0)}
            </Badge>
          )}
        </Button>

        <div className="flex items-center space-x-2">
          <select
            value={query.sortBy || 'created_at'}
            onChange={(e) => handleSortChange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleSortOrderToggle}
            className="p-2"
          >
            {query.sortOrder === 'asc' ? (
              <SortAscIcon className="w-4 h-4" />
            ) : (
              <SortDescIcon className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">
          {filteredBooks === totalBooks ? (
            <span>Total: {totalBooks} books</span>
          ) : (
            <span>Showing {filteredBooks} of {totalBooks} books</span>
          )}
        </div>
        
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="flex items-center space-x-1 text-gray-500"
          >
            <XIcon className="w-4 h-4" />
            <span>Clear filters</span>
          </Button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <div className="space-y-4">
            {/* Status Filters */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Status</h3>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map(option => {
                  const isSelected = query.status?.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleStatusFilter(option.value)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        isSelected 
                          ? `${option.color} ring-2 ring-offset-1 ring-gray-400` 
                          : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
          {query.search && (
            <Badge variant="info" className="flex items-center space-x-1">
              <span>Search: &quot;{query.search}&quot;</span>
              <button 
                onClick={() => handleSearchChange('')}
                className="ml-1 hover:text-gray-600"
              >
                <XIcon className="w-3 h-3" />
              </button>
            </Badge>
          )}
          
          {query.status?.map(status => {
            const statusOption = statusOptions.find(opt => opt.value === status);
            return (
              <Badge key={status} variant="secondary" className="flex items-center space-x-1">
                <span>{statusOption?.label || status}</span>
                <button 
                  onClick={() => handleStatusFilter(status)}
                  className="ml-1 hover:text-gray-600"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
} 