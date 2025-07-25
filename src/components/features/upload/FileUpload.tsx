'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { 
  UploadIcon, 
  FileIcon, 
  XIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  FileTextIcon,
  BookOpenIcon
} from 'lucide-react';

export interface UploadFile {
  file: File;
  id: string;
  preview?: {
    name: string;
    size: number;
    type: string;
    lastModified: number;
  };
}

interface FileUploadProps {
  onFileSelect: (file: UploadFile) => void;
  onFileRemove: () => void;
  selectedFile: UploadFile | null;
  maxSize?: number; // in bytes
  acceptedTypes?: string[];
  disabled?: boolean;
  className?: string;
}

const DEFAULT_MAX_SIZE = 50 * 1024 * 1024; // 50MB
const DEFAULT_ACCEPTED_TYPES = ['.pdf', '.epub', '.txt'];
const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/epub+zip',
  'text/plain',
  'text/markdown'
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(file: File) {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return <FileIcon className="w-8 h-8 text-red-500" />;
  }
  if (type === 'application/epub+zip' || name.endsWith('.epub')) {
    return <BookOpenIcon className="w-8 h-8 text-blue-500" />;
  }
  if (type === 'text/plain' || name.endsWith('.txt') || name.endsWith('.md')) {
    return <FileTextIcon className="w-8 h-8 text-green-500" />;
  }
  return <FileIcon className="w-8 h-8 text-gray-500" />;
}

function validateFile(file: File, maxSize: number): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(maxSize)})`
    };
  }

  // Check file type
  const isValidMimeType = ACCEPTED_MIME_TYPES.includes(file.type.toLowerCase());
  const isValidExtension = DEFAULT_ACCEPTED_TYPES.some(ext => 
    file.name.toLowerCase().endsWith(ext)
  );

  if (!isValidMimeType && !isValidExtension) {
    return {
      valid: false,
      error: `File type not supported. Please upload PDF, EPUB, or TXT files.`
    };
  }

  return { valid: true };
}

export function FileUpload({
  onFileSelect,
  onFileRemove,
  selectedFile,
  maxSize = DEFAULT_MAX_SIZE,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  disabled = false,
  className = ''
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const handleFileSelection = useCallback((file: File) => {
    setValidationError(null);
    
    const validation = validateFile(file, maxSize);
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid file');
      return;
    }

    const uploadFile: UploadFile = {
      file,
      id: `${Date.now()}-${file.name}`,
      preview: {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      }
    };

    onFileSelect(uploadFile);
  }, [maxSize, onFileSelect]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    dragCounterRef.current += 1;
    
    if (dragCounterRef.current === 1) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if we have files being dragged
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    dragCounterRef.current -= 1;
    
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, [disabled]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounterRef.current = 0;
    setIsDragOver(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelection(files[0]); // Only take the first file
    }
  }, [disabled, handleFileSelection]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  }, [handleFileSelection]);

  const handleBrowseClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const handleRemoveFile = useCallback(() => {
    setValidationError(null);
    dragCounterRef.current = 0; // Reset drag counter
    setIsDragOver(false); // Reset drag state
    onFileRemove();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFileRemove]);

  // If file is selected, show file preview
  if (selectedFile) {
    return (
      <div className={`file-upload ${className}`}>
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                {getFileIcon(selectedFile.file)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-gray-900 truncate">
                  {selectedFile.file.name}
                </h3>
                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                  <span>{formatFileSize(selectedFile.file.size)}</span>
                  <span>Modified: {new Date(selectedFile.file.lastModified).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant="success" className="text-xs">
                    <CheckCircleIcon className="w-3 h-3 mr-1" />
                    Valid file
                  </Badge>
                  <Badge variant="info" className="text-xs">
                    {selectedFile.file.type || 'Unknown type'}
                  </Badge>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemoveFile}
              disabled={disabled}
              className="flex-shrink-0"
            >
              <XIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Default drag-and-drop interface
  return (
    <div className={`file-upload ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Drag and drop zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}
        `}
        onClick={handleBrowseClick}
      >
        <div className="space-y-4">
          {/* Upload icon */}
          <div className="flex justify-center">
            <UploadIcon className={`w-12 h-12 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
          </div>

          {/* Main text */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isDragOver ? 'Drop your file here' : 'Drop PDF/EPUB/TXT here or click to browse'}
            </h3>
            <p className="text-gray-500">
              Maximum file size: {formatFileSize(maxSize)}
            </p>
          </div>

          {/* Browse button */}
          {!isDragOver && (
            <Button
              variant="outline"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                handleBrowseClick();
              }}
            >
              <UploadIcon className="w-4 h-4 mr-2" />
              Choose File
            </Button>
          )}

          {/* Supported formats */}
          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant="secondary" className="text-xs">PDF</Badge>
            <Badge variant="secondary" className="text-xs">EPUB</Badge>
            <Badge variant="secondary" className="text-xs">TXT</Badge>
          </div>
        </div>

        {/* Drag overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-500 bg-opacity-10 rounded-lg flex items-center justify-center">
            <div className="text-blue-700 font-medium">
              Release to upload
            </div>
          </div>
        )}
      </div>

      {/* Validation error */}
      {validationError && (
        <Alert className="mt-4 border-red-200 bg-red-50">
          <AlertCircleIcon className="h-4 w-4 text-red-600" />
          <div className="ml-2">
            <h4 className="font-medium text-red-800">Upload Error</h4>
            <p className="text-sm text-red-700">{validationError}</p>
          </div>
        </Alert>
      )}
    </div>
  );
} 