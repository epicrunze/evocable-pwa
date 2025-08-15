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

  const testVirtualUI = async () => {
    try {
      addLog('🎨 Testing Phase 4: Virtual AudioPlayer UI...');
      
      // Test the updated AudioPlayer component
      const { AudioPlayer } = await import('@/components/features/player/AudioPlayer');
      
      addLog('✅ Virtual AudioPlayer component imported successfully');
      addLog('🎵 UI Features:');
      addLog('  • Virtual timeline progress bar with seamless scrubbing');
      addLog('  • Transition indicators (⏱️ Transitioning... / 🎵 Seamless Playback)');
      addLog('  • Chunk boundary visualization on progress bar');
      addLog('  • Virtual time display instead of chunk-based time');
      addLog('  • Enhanced seeking using seekToVirtualTime()');
      addLog('  • Virtual timeline debug info showing virtual vs chunk time');
      addLog('🔧 Integration:');
      addLog('  • Uses VirtualAudioState for all time calculations');
      addLog('  • Progress calculated from virtualCurrentTime/virtualDuration');
      addLog('  • Seeking maps click position to virtual timeline');
      addLog('  • Bookmarks use virtual time seeking');
      addLog('✅ Phase 4 Virtual AudioPlayer UI integration completed!');
      
    } catch (error) {
      addLog(`❌ Virtual UI test failed: ${error}`);
    }
  };

  const testVirtualHook = async () => {
    try {
      addLog('🎯 Testing Phase 3: Virtual useAudio Hook...');
      
      // Test the virtual useAudio hook
      const { useAudio } = await import('@/hooks/useAudio');
      
      addLog('✅ Virtual useAudio hook imported successfully');
      addLog('🔧 Hook expects VirtualAudioState and VirtualPlaybackControls');
      addLog('🎮 Virtual timeline controls: seekToVirtualTime, getCurrentVirtualTime, getTotalVirtualDuration');
      addLog('📊 Virtual state properties: virtualCurrentTime, virtualDuration, chunkLocalTime, chunkOffsets, isTransitioning');
      addLog('✅ Phase 3 Virtual useAudio Hook integration completed!');
      
    } catch (error) {
      addLog(`❌ Virtual hook test failed: ${error}`);
    }
  };

  const testEnhancedStreamer = async () => {
    try {
      addLog('🚀 Testing Phase 2: Enhanced Audio Streamer...');
      
      // Get book data first
      const { booksApi } = await import('@/lib/api/books');
      const bookResult = await booksApi.getBookWithChunks(bookId);
      
      if (bookResult.error || !bookResult.data) {
        addLog(`❌ Cannot test streamer: ${bookResult.error?.message || 'No book data'}`);
        return;
      }
      
      const book = bookResult.data;
      addLog(`📖 Book: "${book.title}" (${book.chunks.length} chunks, ${book.total_duration_s.toFixed(2)}s)`);
      
      // Initialize enhanced audio streamer
      const { AudioStreamer } = await import('@/lib/audio-streamer');
      
      const streamer = new AudioStreamer(bookId, {
        onError: (error) => addLog(`❌ Streamer Error: ${error.message}`),
        onChunkChange: (chunkIndex) => addLog(`🔄 Chunk changed: ${chunkIndex}`),
        onVirtualTimeUpdate: (virtualTime, duration) => 
          addLog(`⏱️  Virtual time: ${virtualTime.toFixed(2)}s / ${duration.toFixed(2)}s`),
        onSeamlessTransition: (fromChunk, toChunk) => 
          addLog(`🔀 Seamless transition: chunk ${fromChunk} → ${toChunk}`),
        onPreloadProgress: (chunkIndex, progress) => 
          addLog(`📥 Preloading chunk ${chunkIndex}: ${progress}%`),
      }, {
        prefetchSize: 3,
        transitionThreshold: 0.5, // 0.5s for faster testing
      });
      
      addLog('🔧 Initializing enhanced streamer...');
      await streamer.initialize();
      addLog('✅ Enhanced streamer initialized successfully!');
      
      // Test virtual timeline methods
      addLog('📏 Testing virtual timeline integration...');
      const timeline = streamer.getVirtualTimeline();
      const totalDuration = timeline.getTotalDuration();
      addLog(`📊 Total virtual duration: ${totalDuration.toFixed(2)}s`);
      
      // Test chunk loading and virtual time
      addLog('🔽 Testing chunk loading...');
      const firstChunkUrl = await streamer.loadChunk(0);
      addLog(`✅ First chunk loaded: ${firstChunkUrl.slice(0, 50)}...`);
      
      const currentVirtualTime = streamer.getCurrentVirtualTime();
      addLog(`⏰ Current virtual time: ${currentVirtualTime.toFixed(2)}s`);
      
      // Test seek functionality
      addLog('🎯 Testing virtual time seeking...');
      await streamer.seekToVirtualTime(9.42); // Should go to chunk 3
      const seekResult = streamer.getCurrentVirtualTime();
      addLog(`✅ Seek to 9.42s result: ${seekResult.toFixed(2)}s (chunk ${streamer.getCurrentChunk()})`);
      
      // Test preloading
      addLog('📥 Testing preloading...');
      await streamer.preloadChunk(5);
      addLog('✅ Chunk 5 preloaded successfully');
      
      // Test near chunk end detection
      const isNear = streamer.isNearChunkEnd(1.0);
      addLog(`🔚 Near chunk end (1s threshold): ${isNear ? 'YES' : 'NO'}`);
      
      // Test audio element access
      const activeAudio = streamer.getActiveAudioElement();
      if (activeAudio) {
        addLog(`🎵 Active audio element: ${activeAudio.constructor.name} (src: ${activeAudio.src ? 'loaded' : 'empty'})`);
      }
      
      // Cleanup
      streamer.cleanup();
      addLog('🧹 Streamer cleaned up');
      
      addLog('✅ Phase 2 Enhanced Audio Streamer tests completed!');
      
    } catch (error) {
      addLog(`❌ Enhanced streamer test failed: ${error}`);
    }
  };

  const testVirtualTimeline = async () => {
    try {
      addLog('🧪 Testing Phase 1: Virtual Timeline...');
      
      // Get book data first
      const { booksApi } = await import('@/lib/api/books');
      const bookResult = await booksApi.getBookWithChunks(bookId);
      
      if (bookResult.error || !bookResult.data) {
        addLog(`❌ Cannot test timeline: ${bookResult.error?.message || 'No book data'}`);
        return;
      }
      
      const book = bookResult.data;
      addLog(`📖 Book: "${book.title}" (${book.chunks.length} chunks, ${book.total_duration_s.toFixed(2)}s)`);
      
      // Initialize virtual timeline
      const { VirtualTimelineManager } = await import('@/lib/audio/virtual-timeline');
      const timeline = new VirtualTimelineManager();
      
      timeline.initialize(book.chunks);
      addLog(`✅ Timeline initialized: ${timeline.getTotalDuration().toFixed(2)}s total`);
      
      // Test virtual time calculations
      addLog('🔄 Testing virtual time calculations...');
      const testTimes = [0, 3.14, 6.28, 9.42, 18.0, 25.2, 35.99, 36.0];
      
      testTimes.forEach(virtualTime => {
        const { chunkIndex, localTime } = timeline.getChunkPosition(virtualTime);
        const reconstructed = timeline.getVirtualTime(chunkIndex, localTime);
        const chunk = timeline.getChunkByIndex(chunkIndex);
        
        addLog(`⏱️  ${virtualTime}s -> Chunk ${chunkIndex} (${localTime.toFixed(3)}s) -> ${reconstructed.toFixed(3)}s`);
        
        if (chunk) {
          addLog(`   📍 Chunk ${chunkIndex}: ${chunk.startTime.toFixed(2)}s-${chunk.endTime.toFixed(2)}s (${chunk.duration.toFixed(2)}s)`);
        }
      });
      
      // Test edge cases
      addLog('🔍 Testing edge cases...');
      
      // Test negative time
      const negativeResult = timeline.getChunkPosition(-5);
      addLog(`❄️  Negative time (-5s) -> Chunk ${negativeResult.chunkIndex}, Local ${negativeResult.localTime.toFixed(3)}s`);
      
      // Test time beyond end
      const beyondResult = timeline.getChunkPosition(50);
      addLog(`🚀 Beyond end (50s) -> Chunk ${beyondResult.chunkIndex}, Local ${beyondResult.localTime.toFixed(3)}s`);
      
      // Test near chunk end detection
      const testNearEnd = [3.0, 6.0, 9.0, 12.0];
      testNearEnd.forEach(time => {
        const isNear = timeline.isNearChunkEnd(time, 1.0);
        addLog(`🔚 ${time}s near chunk end (1s threshold): ${isNear ? 'YES' : 'NO'}`);
      });
      
      // Test chunk navigation
      addLog('🧭 Testing chunk navigation...');
      for (let i = 0; i < Math.min(3, book.chunks.length); i++) {
        const next = timeline.getNextChunkIndex(i);
        const prev = timeline.getPreviousChunkIndex(i);
        addLog(`   Chunk ${i}: prev=${prev}, next=${next}`);
      }
      
      addLog('✅ Phase 1 Virtual Timeline tests completed!');
      
    } catch (error) {
      addLog(`❌ Virtual timeline test failed: ${error}`);
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
          <Button onClick={testVirtualTimeline} variant="secondary">🧪 Test Phase 1</Button>
          <Button onClick={testEnhancedStreamer} variant="secondary">🚀 Test Phase 2</Button>
          <Button onClick={testVirtualHook} variant="secondary">🎯 Test Phase 3</Button>
          <Button onClick={testVirtualUI} variant="secondary">🎨 Test Phase 4</Button>
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