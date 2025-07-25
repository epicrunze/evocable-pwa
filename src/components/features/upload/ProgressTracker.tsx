'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { 
  PauseIcon, 
  PlayIcon, 
  XIcon, 
  CheckCircleIcon, 
  AlertCircleIcon,
  ClockIcon,
  UploadIcon,
  FileTextIcon
} from 'lucide-react';

export interface UploadProgress {
  id: string;
  filename: string;
  status: 'uploading' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  bytesUploaded: number;
  totalBytes: number;
  speed?: number; // bytes per second
  timeRemaining?: number; // seconds
  error?: string;
  stage?: 'upload' | 'processing' | 'complete';
}

interface ProgressTrackerProps {
  uploads: UploadProgress[];
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onClearCompleted: () => void;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

function formatSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}

interface ProgressBarProps {
  progress: number;
  status: UploadProgress['status'];
  animated?: boolean;
}

function ProgressBar({ progress, status, animated = true }: ProgressBarProps) {
  const getProgressColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-gray-500';
      case 'paused':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <div
        className={`h-full transition-all duration-300 ${getProgressColor()} ${
          animated && status === 'uploading' ? 'animate-pulse' : ''
        }`}
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  );
}

interface UploadItemProps {
  upload: UploadProgress;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onRetry: () => void;
}

function UploadItem({ upload, onPause, onResume, onCancel, onRetry }: UploadItemProps) {
  const {
    filename,
    status,
    progress,
    bytesUploaded,
    totalBytes,
    speed,
    timeRemaining,
    error,
    stage
  } = upload;

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircleIcon className="w-5 h-5 text-red-500" />;
      case 'cancelled':
        return <XIcon className="w-5 h-5 text-gray-500" />;
      case 'paused':
        return <PauseIcon className="w-5 h-5 text-yellow-500" />;
      default:
        return <UploadIcon className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      case 'paused':
        return 'Paused';
      case 'uploading':
        return stage === 'processing' ? 'Processing...' : 'Uploading...';
      default:
        return 'Preparing...';
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'completed':
        return <Badge variant="success" className="text-xs">Completed</Badge>;
      case 'failed':
        return <Badge variant="error" className="text-xs">Failed</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="text-xs">Cancelled</Badge>;
      case 'paused':
        return <Badge variant="warning" className="text-xs">Paused</Badge>;
      default:
        return <Badge variant="info" className="text-xs">
          {stage === 'processing' ? 'Processing' : 'Uploading'}
        </Badge>;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <FileTextIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {filename}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              {getStatusIcon()}
              <span className="text-xs text-gray-500">
                {getStatusText()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge()}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <ProgressBar progress={progress} status={status} />
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {formatBytes(bytesUploaded)} / {formatBytes(totalBytes)} ({progress.toFixed(1)}%)
          </span>
          <div className="flex items-center space-x-2">
            {speed && status === 'uploading' && (
              <span>{formatSpeed(speed)}</span>
            )}
            {timeRemaining && status === 'uploading' && timeRemaining > 0 && (
              <span className="flex items-center space-x-1">
                <ClockIcon className="w-3 h-3" />
                <span>{formatTime(timeRemaining)}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {status === 'failed' && error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircleIcon className="h-4 w-4 text-red-600" />
          <div className="ml-2">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-2">
        {status === 'uploading' && (
          <Button
            variant="outline"
            size="sm"
            onClick={onPause}
            className="flex items-center space-x-1"
          >
            <PauseIcon className="w-3 h-3" />
            <span>Pause</span>
          </Button>
        )}
        
        {status === 'paused' && (
          <Button
            variant="outline"
            size="sm"
            onClick={onResume}
            className="flex items-center space-x-1"
          >
            <PlayIcon className="w-3 h-3" />
            <span>Resume</span>
          </Button>
        )}
        
        {status === 'failed' && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="flex items-center space-x-1"
          >
            <UploadIcon className="w-3 h-3" />
            <span>Retry</span>
          </Button>
        )}
        
        {(['uploading', 'paused', 'failed'].includes(status)) && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="flex items-center space-x-1 text-red-600 hover:text-red-700 hover:border-red-300"
          >
            <XIcon className="w-3 h-3" />
            <span>Cancel</span>
          </Button>
        )}
      </div>
    </div>
  );
}

export function ProgressTracker({
  uploads,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onClearCompleted,
  className = ''
}: ProgressTrackerProps) {
  const [overallProgress, setOverallProgress] = useState(0);

  // Calculate overall progress
  useEffect(() => {
    if (uploads.length === 0) {
      setOverallProgress(0);
      return;
    }

    const totalProgress = uploads.reduce((sum, upload) => sum + upload.progress, 0);
    setOverallProgress(totalProgress / uploads.length);
  }, [uploads]);

  const getStatusCounts = useCallback(() => {
    const counts = {
      uploading: 0,
      paused: 0,
      completed: 0,
      failed: 0,
      cancelled: 0
    };

    uploads.forEach(upload => {
      counts[upload.status]++;
    });

    return counts;
  }, [uploads]);

  const statusCounts = getStatusCounts();
  const hasActiveUploads = statusCounts.uploading > 0;
  const hasCompletedUploads = statusCounts.completed > 0;
  const hasPausedUploads = statusCounts.paused > 0;
  const hasFailedUploads = statusCounts.failed > 0;

  if (uploads.length === 0) {
    return (
      <div className={`progress-tracker ${className}`}>
        <div className="text-center text-gray-500 py-8">
          <UploadIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No uploads in progress</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`progress-tracker ${className}`}>
      <div className="space-y-4">
        {/* Overall Progress Header */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">
              Upload Progress
            </h3>
            <div className="flex items-center space-x-2">
              {hasActiveUploads && (
                <Badge variant="info" className="text-xs">
                  {statusCounts.uploading} active
                </Badge>
              )}
              {hasPausedUploads && (
                <Badge variant="warning" className="text-xs">
                  {statusCounts.paused} paused
                </Badge>
              )}
              {hasFailedUploads && (
                <Badge variant="error" className="text-xs">
                  {statusCounts.failed} failed
                </Badge>
              )}
              {hasCompletedUploads && (
                <Badge variant="success" className="text-xs">
                  {statusCounts.completed} completed
                </Badge>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <ProgressBar 
              progress={overallProgress} 
              status={hasActiveUploads ? 'uploading' : 'paused'} 
            />
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Overall Progress: {overallProgress.toFixed(1)}%</span>
              <span>{uploads.length} file{uploads.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* Clear Completed Button */}
        {hasCompletedUploads && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onClearCompleted}
              className="text-gray-600"
            >
              Clear Completed
            </Button>
          </div>
        )}

        {/* Upload Items */}
        <div className="space-y-3">
          {uploads.map((upload) => (
            <UploadItem
              key={upload.id}
              upload={upload}
              onPause={() => onPause(upload.id)}
              onResume={() => onResume(upload.id)}
              onCancel={() => onCancel(upload.id)}
              onRetry={() => onRetry(upload.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
} 