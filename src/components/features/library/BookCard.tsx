'use client';

import { memo } from 'react';
import { Book } from '@/types/book';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  PlayIcon, 
  DownloadIcon, 
  MoreVerticalIcon,
  BookOpenIcon,
  ClockIcon,
  AlertCircleIcon,
  CheckCircleIcon
} from 'lucide-react';

interface BookCardProps {
  book: Book;
  onPlay: (bookId: string) => void;
  onDownload: (bookId: string) => void;
  onDelete: (bookId: string) => void;
  isDownloaded: boolean;
  downloadProgress?: number;
  className?: string;
}

const statusConfig = {
  pending: {
    label: 'Pending',
    variant: 'secondary' as const,
    icon: ClockIcon,
    color: 'text-gray-500',
  },
  processing: {
    label: 'Processing',
    variant: 'warning' as const,
    icon: ClockIcon,
    color: 'text-orange-500',
  },
  extracting: {
    label: 'Extracting',
    variant: 'warning' as const,
    icon: ClockIcon,
    color: 'text-orange-500',
  },
  segmenting: {
    label: 'Segmenting',
    variant: 'warning' as const,
    icon: ClockIcon,
    color: 'text-orange-500',
  },
  generating_audio: {
    label: 'Generating Audio',
    variant: 'warning' as const,
    icon: ClockIcon,
    color: 'text-orange-500',
  },
  transcoding: {
    label: 'Transcoding',
    variant: 'warning' as const,
    icon: ClockIcon,
    color: 'text-orange-500',
  },
  completed: {
    label: 'Completed',
    variant: 'success' as const,
    icon: CheckCircleIcon,
    color: 'text-green-500',
  },
  failed: {
    label: 'Failed',
    variant: 'error' as const,
    icon: AlertCircleIcon,
    color: 'text-red-500',
  },
};

function formatDuration(seconds?: number): string {
  if (!seconds) return '--:--';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export const BookCard = memo<BookCardProps>(({
  book,
  onPlay,
  onDownload,
  onDelete: _onDelete,
  isDownloaded,
  downloadProgress,
  className = ''
}) => {
  const config = statusConfig[book.status];
  const StatusIcon = config.icon;
  
  const canPlay = book.status === 'completed';
  const isProcessing = ['processing', 'extracting', 'segmenting', 'generating_audio', 'transcoding'].includes(book.status);
  const hasFailed = book.status === 'failed';

  return (
    <Card className={`book-card transition-all duration-200 hover:shadow-lg ${className}`} data-testid="book-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <BookOpenIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold truncate" title={book.title}>
                {book.title}
              </CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant={config.variant} className="text-xs">
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {config.label}
                </Badge>
                {isDownloaded && (
                  <Badge variant="info" className="text-xs">
                    📱 Downloaded
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="flex-shrink-0"
            onClick={() => {/* TODO: Implement dropdown menu */}}
          >
            <MoreVerticalIcon className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Book Metadata */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center space-x-4">
            <span className="capitalize">{book.format}</span>
            <span>{formatDuration(book.duration)}</span>
            <span>{formatFileSize(book.file_size)}</span>
          </div>
          <time dateTime={book.created_at} className="text-xs">
            {new Date(book.created_at).toLocaleDateString()}
          </time>
        </div>

        {/* Progress Bar for Processing */}
        {isProcessing && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Processing...</span>
              <span className="text-sm font-medium">{book.percent_complete}%</span>
            </div>
            <Progress value={book.percent_complete} className="h-2" />
          </div>
        )}

        {/* Download Progress */}
        {downloadProgress !== undefined && downloadProgress < 100 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Downloading...</span>
              <span className="text-sm font-medium">{downloadProgress}%</span>
            </div>
            <Progress value={downloadProgress} className="h-2" />
          </div>
        )}

        {/* Error Message */}
        {hasFailed && book.error_message && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircleIcon className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700">{book.error_message}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant={canPlay ? "default" : "secondary"}
              size="sm"
              onClick={() => onPlay(book.id)}
              disabled={!canPlay}
              className="flex items-center space-x-1"
            >
              <PlayIcon className="w-4 h-4" />
              <span>Play</span>
            </Button>
            
            {canPlay && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownload(book.id)}
                disabled={isDownloaded}
                className="flex items-center space-x-1"
              >
                <DownloadIcon className="w-4 h-4" />
                <span>{isDownloaded ? 'Downloaded' : 'Download'}</span>
              </Button>
            )}
          </div>
          
          {/* Book Stats */}
          <div className="text-xs text-gray-500">
            {book.total_chunks && (
              <span>{book.total_chunks} chunks</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

BookCard.displayName = 'BookCard'; 