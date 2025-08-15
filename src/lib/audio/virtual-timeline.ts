import { AudioChunkInfo } from '@/types/audio';

export interface ChunkPosition {
  chunkIndex: number;
  localTime: number;
}

export class VirtualTimelineManager {
  private chunkDurations: number[] = [];
  private chunkOffsets: number[] = [];
  private totalDuration: number = 0;
  private chunks: AudioChunkInfo[] = [];

  /**
   * Initialize the virtual timeline with chunk data from the API
   */
  initialize(chunks: { seq: number; duration_s: number; url: string }[]): void {
    // Sort chunks by sequence to ensure proper order
    const sortedChunks = [...chunks].sort((a, b) => a.seq - b.seq);
    
    // Extract durations and calculate offsets
    this.chunkDurations = sortedChunks.map(chunk => chunk.duration_s);
    this.chunkOffsets = this.calculateCumulativeOffsets();
    this.totalDuration = this.chunkOffsets[this.chunkOffsets.length - 1] + 
                        this.chunkDurations[this.chunkDurations.length - 1];
    
    // Create AudioChunkInfo objects
    this.chunks = sortedChunks.map((chunk, index) => ({
      index,
      duration: chunk.duration_s,
      startTime: this.chunkOffsets[index],
      endTime: this.chunkOffsets[index] + chunk.duration_s,
      url: chunk.url,
      isPreloaded: false,
    }));

    console.log('🎵 Virtual timeline initialized:', {
      totalChunks: this.chunks.length,
      totalDuration: this.totalDuration,
      chunkOffsets: this.chunkOffsets,
      chunkDurations: this.chunkDurations,
    });
  }

  /**
   * Convert virtual time (0-36s) to chunk index + local position within that chunk
   */
  getChunkPosition(virtualTime: number): ChunkPosition {
    // Clamp virtual time to valid range
    const clampedTime = Math.max(0, Math.min(virtualTime, this.totalDuration));
    
    // Find the chunk that contains this virtual time
    for (let i = 0; i < this.chunkOffsets.length; i++) {
      const chunkStart = this.chunkOffsets[i];
      const chunkEnd = chunkStart + this.chunkDurations[i];
      
      if (clampedTime >= chunkStart && clampedTime < chunkEnd) {
        return {
          chunkIndex: i,
          localTime: clampedTime - chunkStart,
        };
      }
    }
    
    // If we reach here, time is at the very end
    const lastChunkIndex = this.chunkDurations.length - 1;
    return {
      chunkIndex: lastChunkIndex,
      localTime: this.chunkDurations[lastChunkIndex],
    };
  }

  /**
   * Convert chunk position to virtual time (0-36s)
   */
  getVirtualTime(chunkIndex: number, localTime: number): number {
    if (chunkIndex < 0 || chunkIndex >= this.chunkOffsets.length) {
      console.warn('Invalid chunk index:', chunkIndex);
      return 0;
    }
    
    // Clamp local time to valid range for this chunk
    const clampedLocalTime = Math.max(0, Math.min(localTime, this.chunkDurations[chunkIndex]));
    
    return this.chunkOffsets[chunkIndex] + clampedLocalTime;
  }

  /**
   * Get chunk info that contains the specified virtual time
   */
  getChunkForTime(virtualTime: number): AudioChunkInfo | null {
    const { chunkIndex } = this.getChunkPosition(virtualTime);
    return this.chunks[chunkIndex] || null;
  }

  /**
   * Get chunk info by index
   */
  getChunkByIndex(index: number): AudioChunkInfo | null {
    return this.chunks[index] || null;
  }

  /**
   * Get all chunks
   */
  getAllChunks(): AudioChunkInfo[] {
    return [...this.chunks];
  }

  /**
   * Get total duration of the virtual timeline
   */
  getTotalDuration(): number {
    return this.totalDuration;
  }

  /**
   * Get chunk offsets (cumulative start times)
   */
  getChunkOffsets(): number[] {
    return [...this.chunkOffsets];
  }

  /**
   * Get chunk durations
   */
  getChunkDurations(): number[] {
    return [...this.chunkDurations];
  }

  /**
   * Check if a virtual time is near the end of its chunk
   */
  isNearChunkEnd(virtualTime: number, thresholdSeconds: number = 1.0): boolean {
    const { chunkIndex, localTime } = this.getChunkPosition(virtualTime);
    const chunkDuration = this.chunkDurations[chunkIndex];
    const timeToEnd = chunkDuration - localTime;
    
    return timeToEnd <= thresholdSeconds;
  }

  /**
   * Get the next chunk index, or null if at end
   */
  getNextChunkIndex(currentChunkIndex: number): number | null {
    const nextIndex = currentChunkIndex + 1;
    return nextIndex < this.chunks.length ? nextIndex : null;
  }

  /**
   * Get the previous chunk index, or null if at beginning
   */
  getPreviousChunkIndex(currentChunkIndex: number): number | null {
    const prevIndex = currentChunkIndex - 1;
    return prevIndex >= 0 ? prevIndex : null;
  }

  /**
   * Calculate cumulative time offsets for each chunk
   * [0, 3.14, 6.28, 9.42, ...]
   */
  private calculateCumulativeOffsets(): number[] {
    const offsets = [0]; // First chunk starts at 0
    
    for (let i = 0; i < this.chunkDurations.length - 1; i++) {
      offsets.push(offsets[i] + this.chunkDurations[i]);
    }
    
    return offsets;
  }

  /**
   * Debug: Log current timeline state
   */
  debugTimeline(): void {
    console.log('🎵 Virtual Timeline Debug:', {
      totalDuration: this.totalDuration,
      totalChunks: this.chunks.length,
      chunkOffsets: this.chunkOffsets,
      chunkDurations: this.chunkDurations,
      chunks: this.chunks,
    });
  }

  /**
   * Test virtual timeline calculations
   */
  test(): void {
    console.log('🧪 Testing Virtual Timeline...');
    
    const testTimes = [0, 1.57, 3.14, 6.28, 18.5, 35.99, 36.0];
    
    testTimes.forEach(virtualTime => {
      const { chunkIndex, localTime } = this.getChunkPosition(virtualTime);
      const reconstructedTime = this.getVirtualTime(chunkIndex, localTime);
      
      console.log(`Virtual ${virtualTime}s -> Chunk ${chunkIndex}, Local ${localTime.toFixed(3)}s -> Reconstructed ${reconstructedTime.toFixed(3)}s`);
    });
    
    console.log('✅ Virtual Timeline test complete');
  }
}
