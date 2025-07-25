'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { UploadFile } from './FileUpload';
import { 
  PlayIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  InfoIcon
} from 'lucide-react';

export interface UploadFormData {
  title: string;
  format: 'pdf' | 'epub' | 'txt';
  language?: string;
  voice?: string;
}

interface UploadFormProps {
  selectedFile: UploadFile | null;
  onSubmit: (data: UploadFormData) => void;
  isUploading?: boolean;
  disabled?: boolean;
  className?: string;
}

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
];

const voiceOptions = [
  { value: 'default', label: 'Default Voice' },
  { value: 'neural', label: 'Neural Voice (Enhanced)' },
  { value: 'standard', label: 'Standard Voice' },
  { value: 'premium', label: 'Premium Voice (Beta)' },
];

function detectFormatFromFile(file: File): 'pdf' | 'epub' | 'txt' {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return 'pdf';
  }
  if (type === 'application/epub+zip' || name.endsWith('.epub')) {
    return 'epub';
  }
  return 'txt';
}

function generateTitleFromFilename(filename: string): string {
  // Remove extension and clean up filename
  return filename
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[-_]/g, ' ') // Replace hyphens and underscores with spaces
    .replace(/\b\w/g, l => l.toUpperCase()) // Title case
    .trim();
}

export function UploadForm({
  selectedFile,
  onSubmit,
  isUploading = false,
  disabled = false,
  className = ''
}: UploadFormProps) {
  const [formData, setFormData] = useState<UploadFormData>(() => {
    if (selectedFile) {
      return {
        title: generateTitleFromFilename(selectedFile.file.name),
        format: detectFormatFromFile(selectedFile.file),
        language: 'en',
        voice: 'default'
      };
    }
    return {
      title: '',
      format: 'pdf',
      language: 'en',
      voice: 'default'
    };
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Update form data when file changes
  const updateFormFromFile = useCallback((file: UploadFile) => {
    setFormData(prev => ({
      ...prev,
      title: prev.title || generateTitleFromFilename(file.file.name),
      format: detectFormatFromFile(file.file)
    }));
    setValidationErrors({});
  }, []);

  // Update form when file changes
  useState(() => {
    if (selectedFile) {
      updateFormFromFile(selectedFile);
    }
  });

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    } else if (formData.title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters long';
    } else if (formData.title.trim().length > 100) {
      errors.title = 'Title must be less than 100 characters';
    }

    if (!selectedFile) {
      errors.file = 'Please select a file to upload';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData.title, selectedFile]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSubmit(formData);
  }, [formData, validateForm, onSubmit]);

  const handleInputChange = useCallback((field: keyof UploadFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [validationErrors]);

  const isFormDisabled = disabled || isUploading;
  const hasErrors = Object.keys(validationErrors).length > 0;

  return (
    <div className={`upload-form ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Info */}
        {selectedFile && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Selected File</h3>
            <div className="flex items-center space-x-3">
              <Badge variant="info" className="text-xs">
                {selectedFile.file.name}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {(selectedFile.file.size / (1024 * 1024)).toFixed(1)} MB
              </Badge>
            </div>
          </div>
        )}

        {/* Title Input */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <Input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Enter a title for your audiobook"
            disabled={isFormDisabled}
            className={validationErrors.title ? 'border-red-500 focus:border-red-500' : ''}
          />
          {validationErrors.title && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.title}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            This will be the title of your audiobook in your library
          </p>
        </div>

        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Format
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'pdf', label: 'PDF', description: 'Portable Document Format' },
              { value: 'epub', label: 'EPUB', description: 'Electronic Publication' },
              { value: 'txt', label: 'TXT', description: 'Plain Text' }
            ].map((option) => (
              <label
                key={option.value}
                className={`
                  relative flex flex-col p-3 border rounded-lg cursor-pointer transition-all
                  ${formData.format === option.value
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                    : 'border-gray-300 hover:border-gray-400'
                  }
                  ${isFormDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <input
                  type="radio"
                  name="format"
                  value={option.value}
                  checked={formData.format === option.value}
                  onChange={(e) => handleInputChange('format', e.target.value)}
                  disabled={isFormDisabled}
                  className="sr-only"
                />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {option.label}
                  </span>
                  {formData.format === option.value && (
                    <CheckCircleIcon className="w-4 h-4 text-blue-500" />
                  )}
                </div>
                <span className="text-xs text-gray-500 mt-1">
                  {option.description}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Language Selection */}
        <div>
          <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
            Language (Optional)
          </label>
          <select
            id="language"
            value={formData.language}
            onChange={(e) => handleInputChange('language', e.target.value)}
            disabled={isFormDisabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Auto-detection will be used if not specified
          </p>
        </div>

        {/* Voice Selection */}
        <div>
          <label htmlFor="voice" className="block text-sm font-medium text-gray-700 mb-2">
            Voice (Optional)
          </label>
          <select
            id="voice"
            value={formData.voice}
            onChange={(e) => handleInputChange('voice', e.target.value)}
            disabled={isFormDisabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {voiceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Choose the voice type for your audiobook
          </p>
        </div>

        {/* Processing Info */}
        <Alert className="border-blue-200 bg-blue-50">
          <InfoIcon className="h-4 w-4 text-blue-600" />
          <div className="ml-2">
            <h4 className="font-medium text-blue-800">What happens next?</h4>
            <ol className="text-sm text-blue-700 mt-1 space-y-1 list-decimal list-inside">
              <li>File upload</li>
              <li>Text extraction</li>
              <li>Audio generation</li>
              <li>Processing completion</li>
            </ol>
            <p className="text-xs text-blue-600 mt-2">
              Processing time depends on file size. You&apos;ll be notified when complete.
            </p>
          </div>
        </Alert>

        {/* Validation Errors */}
        {hasErrors && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircleIcon className="h-4 w-4 text-red-600" />
            <div className="ml-2">
              <h4 className="font-medium text-red-800">Please fix the following errors:</h4>
              <ul className="text-sm text-red-700 mt-1 space-y-1">
                {Object.entries(validationErrors).map(([field, error]) => (
                  <li key={field}>• {error}</li>
                ))}
              </ul>
            </div>
          </Alert>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-end space-x-3">
          <Button
            type="submit"
            disabled={isFormDisabled || !selectedFile}
            className="flex items-center space-x-2 min-w-[140px]"
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <PlayIcon className="w-4 h-4" />
                <span>Start Upload</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
} 