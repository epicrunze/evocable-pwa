'use client';

import React, { useState } from 'react';
import { AudioPlayer } from '@/components/features/player/AudioPlayer';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { AudioError } from '@/types/audio';

export function AudioPlayerTest() {
  const [bookId, setBookId] = useState('eaf959c5-5378-4e9b-ab34-b92e16812b57');
  const [errors, setErrors] = useState<AudioError[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [email, setEmail] = useState('ryan.zhang@duke.edu');
  const [password, setPassword] = useState('wPUqwjEMANAkgH8!');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [workingToken] = useState('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhOTVmYTA3Mi1kZTlhLTRmZmEtYTBkYi0yMDBkZGNkZjFkZjciLCJ1c2VybmFtZSI6InRlc3R1c2VyeGRkIiwiZXhwIjoxNzU1Mjg2NzAwLjY1MTU1MiwiaWF0IjoxNzU1MjAwMzAwLjY1MTU1NiwianRpIjoiY2M0NWFiZDItMDI0Mi00NjU3LThkNWEtOWEzYmJjZTczMzg2IiwidHlwZSI6InNlc3Npb24ifQ.S5ecWaq9pXjvgaQgkw9w40KX10b96MHRXjdAOjoLq-c');

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

  // Check for existing session on mount
  React.useEffect(() => {
    const session = localStorage.getItem('audiobook_session');
    if (session) {
      try {
        const parsedSession = JSON.parse(session);
        const now = new Date().getTime();
        const expiryTime = new Date(parsedSession.expiresAt).getTime();
        
        if (expiryTime > now) {
          setIsLoggedIn(true);
          addLog('Found existing valid session');
        } else {
          localStorage.removeItem('audiobook_session');
          addLog('Session expired, removed from storage');
        }
      } catch {
        addLog('Invalid session data, cleared');
        localStorage.removeItem('audiobook_session');
      }
    }
  }, []);

  const loginUser = async () => {
    try {
      addLog('Attempting login...');
      const { apiClient } = await import('@/lib/api/client');
      
      const response = await apiClient.post('/api/v1/auth/login', {
        email,
        password
      });
      
      if (response.error) {
        addLog(`Login FAILED: ${response.error.message}`);
        return;
      }
      
      if (response.data && typeof response.data === 'object' && 'token' in response.data) {
        // Store the session
        const session = {
          token: (response.data as any).token,
          user: (response.data as any).user,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        };
        
        localStorage.setItem('audiobook_session', JSON.stringify(session));
        apiClient.setAuthToken((response.data as any).token);
        setIsLoggedIn(true);
        addLog('Login SUCCESS - Token stored');
      } else {
        addLog('Login FAILED - No token received');
      }
    } catch (error) {
      addLog(`Login error: ${error}`);
    }
  };

  const useWorkingToken = async () => {
    try {
      addLog('Using working token...');
      const { apiClient } = await import('@/lib/api/client');
      
      // Store the working session
      const session = {
        token: workingToken,
        user: { email: 'testuser' },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      };
      
      localStorage.setItem('audiobook_session', JSON.stringify(session));
      apiClient.setAuthToken(workingToken);
      setIsLoggedIn(true);
      addLog('Working token set successfully');
    } catch (error) {
      addLog(`Token error: ${error}`);
    }
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
      
      if (bookResult.data) {
        addLog(`Book found: ${bookResult.data.title} (${bookResult.data.chunks?.length || 0} chunks)`);
      }
      
      // Test audio API
      const { audioApi } = await import('@/lib/api/audio');
      const urlResult = await audioApi.generateBatchSignedUrls(bookId, [0, 1, 2, 3, 4]);
      addLog(`Batch URLs: ${urlResult.error ? 'FAILED - ' + urlResult.error.message : 'SUCCESS'}`);
      
    } catch (error) {
      addLog(`Direct test failed: ${error}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Audio Player Test</h2>
        
        {/* Authentication */}
        <div className="space-y-3 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
          <h3 className="font-medium">Authentication</h3>
          <div className="flex flex-wrap gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="flex-1 min-w-40 px-3 py-2 border rounded-md"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="flex-1 min-w-40 px-3 py-2 border rounded-md"
            />
            <Button onClick={loginUser} disabled={isLoggedIn}>
              {isLoggedIn ? 'Logged In ✓' : 'Login'}
            </Button>
            <Button onClick={useWorkingToken} disabled={isLoggedIn} variant="outline">
              Use Working Token
            </Button>
          </div>
        </div>

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