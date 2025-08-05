'use client';

import React, { useState } from 'react';
import { AudioPlayer } from '@/components/features/player/AudioPlayer';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { AudioError } from '@/types/audio';

export function AudioPlayerTest() {
  const [bookId, setBookId] = useState('cc371e58-504f-4b54-a6de-277a93c9e3e0');
  const [errors, setErrors] = useState<AudioError[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleAudioError = (error: AudioError) => {
    setErrors(prev => [...prev, error]);
    addLog(`ERROR: ${error.message} (${error.type})`);
  };

  const clearLogs = () => {
    setErrors([]);
    setLogs([]);
  };

  const testApiDirectly = async () => {
    try {
      addLog('Testing API directly...');
      
      // Test auth token
      const session = localStorage.getItem('audiobook_session');
      addLog(`Auth session: ${session ? 'Found' : 'Missing'}`);
      
      // Test book API
      const { booksApi } = await import('@/lib/api/books');
      const bookResult = await booksApi.getBookWithChunks(bookId);
      addLog(`Book API: ${bookResult.error ? 'FAILED - ' + bookResult.error.message : 'SUCCESS'}`);
      
      // Test audio API
      const { audioApi } = await import('@/lib/api/audio');
      const urlResult = await audioApi.generateBatchSignedUrls(bookId, [0, 1, 2]);
      addLog(`Batch URLs: ${urlResult.error ? 'FAILED - ' + urlResult.error.message : 'SUCCESS'}`);
      
    } catch (error) {
      addLog(`Direct test failed: ${error}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Audio Player Test</h2>
        
        {/* Controls */}
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            type="text"
            value={bookId}
            onChange={(e) => setBookId(e.target.value)}
            placeholder="Book ID"
            className="flex-1 min-w-64 px-3 py-2 border rounded-md"
          />
          <Button onClick={testApiDirectly}>Test API Directly</Button>
          <Button onClick={clearLogs} variant="outline">Clear Logs</Button>
        </div>

        {/* Error Display */}
        {errors.length > 0 && (
          <div className="mb-4 space-y-2">
            {errors.map((error, i) => (
              <Alert key={i} variant="destructive">
                <strong>{error.type}</strong>: {error.message}
                {error.recoverable && <span className="text-sm"> (Recoverable)</span>}
              </Alert>
            ))}
          </div>
        )}

        {/* Logs */}
        <div className="mb-4">
          <h3 className="font-medium mb-2">Debug Logs:</h3>
          <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md text-sm font-mono max-h-40 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet...</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="py-1">{log}</div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Audio Player */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Audio Player Component</h3>
        <AudioPlayer
          bookId={bookId}
          onError={handleAudioError}
          autoPlay={false}
        />
      </div>
    </div>
  );
}