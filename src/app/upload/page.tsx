'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { FileUpload, UploadFile } from '@/components/features/upload/FileUpload';
import { UploadForm, UploadFormData } from '@/components/features/upload/UploadForm';
import { ProgressTracker } from '@/components/features/upload/ProgressTracker';
import { useUpload } from '@/hooks/useUpload';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { 
  ArrowLeftIcon, 
  CheckCircleIcon, 
  InfoIcon,
  WifiOffIcon,
  BookOpenIcon
} from 'lucide-react';

export default function UploadPage() {
  const router = useRouter();
  const { isOnline } = useConnectionStatus();
  const [selectedFile, setSelectedFile] = useState<UploadFile | null>(null);
  const [currentStep, setCurrentStep] = useState<'file' | 'form' | 'progress'>('file');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    uploads,
    isUploading,
    startUpload,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    retryUpload,
    clearCompleted,
    getUploadStats
  } = useUpload({
    onSuccess: () => {
      setSuccessMessage(`Book uploaded successfully! It's now being processed.`);
      setCurrentStep('progress');
      
      // Auto-clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    },
    onError: (error) => {
      console.error('Upload failed:', error);
      setCurrentStep('progress');
    }
  });

  const uploadStats = getUploadStats();

  const handleFileSelect = useCallback((file: UploadFile) => {
    setSelectedFile(file);
    setCurrentStep('form');
  }, []);

  const handleFileRemove = useCallback(() => {
    setSelectedFile(null);
    setCurrentStep('file');
  }, []);

  const handleFormSubmit = useCallback((formData: UploadFormData) => {
    if (selectedFile) {
      startUpload(selectedFile, formData);
      setCurrentStep('progress');
    }
  }, [selectedFile, startUpload]);

  const handleBackToLibrary = useCallback(() => {
    router.push('/library');
  }, [router]);

  const handleNewUpload = useCallback(() => {
    setSelectedFile(null);
    setCurrentStep('file');
    setSuccessMessage(null);
  }, []);

  const handleViewLibrary = useCallback(() => {
    router.push('/library');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={handleBackToLibrary}
                className="flex items-center space-x-2"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                <span>Back to Library</span>
              </Button>
              
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Upload Book</h1>
                <p className="text-gray-600 mt-1">
                  Upload your PDF, EPUB, or TXT file to create an audiobook
                </p>
              </div>
            </div>

            {/* Upload Stats */}
            {uploadStats.total > 0 && (
              <div className="flex items-center space-x-2">
                <Badge variant="info" className="text-sm">
                  {uploadStats.total} upload{uploadStats.total !== 1 ? 's' : ''}
                </Badge>
                {uploadStats.uploading > 0 && (
                  <Badge variant="success" className="text-sm">
                    {uploadStats.uploading} active
                  </Badge>
                )}
                {uploadStats.failed > 0 && (
                  <Badge variant="error" className="text-sm">
                    {uploadStats.failed} failed
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Connection Status */}
        {!isOnline && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <WifiOffIcon className="h-4 w-4 text-red-600" />
            <div className="ml-2">
              <h4 className="font-medium text-red-800">No Internet Connection</h4>
              <p className="text-sm text-red-700">
                Please check your internet connection before uploading files.
              </p>
            </div>
          </Alert>
        )}

        {/* Success Message */}
        {successMessage && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircleIcon className="h-4 w-4 text-green-600" />
            <div className="ml-2">
              <h4 className="font-medium text-green-800">Upload Successful!</h4>
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          </Alert>
        )}

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[
              { id: 'file', label: 'Select File', icon: '📁' },
              { id: 'form', label: 'Enter Details', icon: '📝' },
              { id: 'progress', label: 'Upload Progress', icon: '📊' }
            ].map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium
                  ${currentStep === step.id 
                    ? 'bg-blue-500 text-white' 
                    : ['file', 'form', 'progress'].indexOf(currentStep) > index
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }
                `}>
                  {['file', 'form', 'progress'].indexOf(currentStep) > index ? '✓' : step.icon}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  currentStep === step.id ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {step.label}
                </span>
                {index < 2 && (
                  <div className={`w-8 h-0.5 mx-4 ${
                    ['file', 'form', 'progress'].indexOf(currentStep) > index 
                      ? 'bg-green-500' 
                      : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {currentStep === 'file' && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Select Your Book File
              </h2>
              <FileUpload
                onFileSelect={handleFileSelect}
                onFileRemove={handleFileRemove}
                selectedFile={selectedFile}
                disabled={!isOnline}
              />
              
              {/* File Format Info */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start space-x-3">
                  <InfoIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-blue-900">Supported Formats</h3>
                    <ul className="text-sm text-blue-700 mt-1 space-y-1">
                      <li>• <strong>PDF:</strong> Documents, books, articles</li>
                      <li>• <strong>EPUB:</strong> E-books with formatted text</li>
                      <li>• <strong>TXT:</strong> Plain text files</li>
                    </ul>
                    <p className="text-xs text-blue-600 mt-2">
                      Maximum file size: 50MB. Processing time varies by file size and complexity.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'form' && selectedFile && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Book Details
              </h2>
              <UploadForm
                selectedFile={selectedFile}
                onSubmit={handleFormSubmit}
                isUploading={isUploading}
                disabled={!isOnline}
              />
            </div>
          )}

          {currentStep === 'progress' && (
            <div className="space-y-6">
              {/* Progress Tracker */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <ProgressTracker
                  uploads={uploads}
                  onPause={pauseUpload}
                  onResume={resumeUpload}
                  onCancel={cancelUpload}
                  onRetry={retryUpload}
                  onClearCompleted={clearCompleted}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={handleNewUpload}
                  disabled={isUploading}
                  className="flex items-center space-x-2"
                >
                  <span>Upload Another Book</span>
                </Button>

                <Button
                  onClick={handleViewLibrary}
                  className="flex items-center space-x-2"
                >
                  <BookOpenIcon className="w-4 h-4" />
                  <span>View Library</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Processing Info */}
        {currentStep === 'progress' && uploads.length > 0 && (
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-3">
              <InfoIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-blue-900">Processing Information</h3>
                <div className="text-sm text-blue-700 mt-1 space-y-1">
                  <p>Your book is being processed in the following stages:</p>
                  <ol className="list-decimal list-inside ml-4 space-y-1">
                    <li>File upload and validation</li>
                    <li>Text extraction and cleaning</li>
                    <li>Audio generation with AI voice</li>
                    <li>Final processing and optimization</li>
                  </ol>
                  <p className="text-xs text-blue-600 mt-2">
                    You&apos;ll receive a notification when processing is complete. 
                    Books typically take 5-15 minutes to process, depending on length.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 