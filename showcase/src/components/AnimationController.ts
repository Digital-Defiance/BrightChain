import { FileReceipt } from '@brightchain/brightchain-lib';

/**
 * Animation state management interface
 */
export interface AnimationState {
  isPlaying: boolean;
  currentFrame: number;
  totalFrames: number;
  speed: number;
  direction: 'forward' | 'reverse';
}

/**
 * Process animation step interface
 */
export interface ProcessStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  duration: number;
  visualComponent?: React.ComponentType<any>;
}

/**
 * Animation sequence interface
 */
export interface AnimationSequence {
  id: string;
  type: 'encoding' | 'reconstruction' | 'storage' | 'retrieval';
  steps: ProcessStep[];
  totalDuration: number;
  onStepStart?: (step: ProcessStep) => void;
  onStepComplete?: (step: ProcessStep) => void;
  onSequenceComplete?: () => void;
}

/**
 * Animation timing configuration
 */
export interface AnimationTiming {
  duration: number;
  delay: number;
  easing: string;
  iterations?: number;
}

/**
 * Central AnimationController class for orchestrating all animations
 * Provides play/pause/reset functionality and timing management
 */
export class AnimationController {
  private animationState: AnimationState;
  private currentSequence: AnimationSequence | null = null;
  private animationFrameId: number | null = null;
  private stepTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private performanceMonitor: PerformanceMonitor;

  constructor() {
    this.animationState = {
      isPlaying: false,
      currentFrame: 0,
      totalFrames: 0,
      speed: 1.0,
      direction: 'forward',
    };
    this.performanceMonitor = new PerformanceMonitor();
  }

  /**
   * Play encoding animation sequence
   */
  async playEncodingAnimation(_file: File): Promise<FileReceipt> {
    const sequence: AnimationSequence = {
      id: `encoding-${Date.now()}`,
      type: 'encoding',
      totalDuration: 6000, // 6 seconds total
      steps: [
        {
          id: 'file-read',
          name: 'Reading File',
          description: 'Loading file data into memory',
          status: 'pending',
          duration: 800,
        },
        {
          id: 'chunking',
          name: 'Breaking into Chunks',
          description: 'Dividing file into fixed-size segments',
          status: 'pending',
          duration: 1000,
        },
        {
          id: 'padding',
          name: 'Adding Padding',
          description: 'Adding random data to reach block size',
          status: 'pending',
          duration: 800,
        },
        {
          id: 'checksum',
          name: 'Calculating Checksums',
          description: 'Computing SHA-512 hashes for each block',
          status: 'pending',
          duration: 1200,
        },
        {
          id: 'storage',
          name: 'Storing Blocks',
          description: 'Adding blocks to the soup storage',
          status: 'pending',
          duration: 1000,
        },
        {
          id: 'cbl-creation',
          name: 'Creating CBL',
          description: 'Generating Constituent Block List metadata',
          status: 'pending',
          duration: 800,
        },
        {
          id: 'magnet-url',
          name: 'Generating Magnet URL',
          description: 'Creating shareable magnet link',
          status: 'pending',
          duration: 400,
        },
      ],
    };

    return this.executeSequence(sequence);
  }

  /**
   * Play reconstruction animation sequence
   */
  async playReconstructionAnimation(
    _receipt: FileReceipt,
  ): Promise<Uint8Array> {
    const sequence: AnimationSequence = {
      id: `reconstruction-${Date.now()}`,
      type: 'reconstruction',
      totalDuration: 4000, // 4 seconds total
      steps: [
        {
          id: 'cbl-processing',
          name: 'Processing CBL',
          description: 'Reading Constituent Block List metadata',
          status: 'pending',
          duration: 600,
        },
        {
          id: 'block-selection',
          name: 'Selecting Blocks',
          description: 'Identifying required blocks from soup',
          status: 'pending',
          duration: 1000,
        },
        {
          id: 'block-retrieval',
          name: 'Retrieving Blocks',
          description: 'Collecting blocks from storage',
          status: 'pending',
          duration: 800,
        },
        {
          id: 'validation',
          name: 'Validating Checksums',
          description: 'Verifying block integrity',
          status: 'pending',
          duration: 800,
        },
        {
          id: 'reassembly',
          name: 'Reassembling File',
          description: 'Combining blocks and removing padding',
          status: 'pending',
          duration: 800,
        },
      ],
    };

    return this.executeSequence(sequence);
  }

  /**
   * Set animation speed multiplier
   */
  setSpeed(multiplier: number): void {
    if (multiplier <= 0) {
      throw new Error('Speed multiplier must be positive');
    }

    this.animationState.speed = multiplier;
    this.emit('speed-changed', { speed: multiplier });

    // Adjust current sequence timing if playing
    if (this.currentSequence && this.animationState.isPlaying) {
      this.adjustSequenceTiming(multiplier);
    }
  }

  /**
   * Pause current animation
   */
  pause(): void {
    if (!this.animationState.isPlaying) return;

    this.animationState.isPlaying = false;

    // Cancel animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Pause all step timeouts
    this.stepTimeouts.forEach((timeout) => clearTimeout(timeout));

    this.emit('animation-paused', { sequence: this.currentSequence });
  }

  /**
   * Resume paused animation
   */
  resume(): void {
    if (this.animationState.isPlaying || !this.currentSequence) return;

    this.animationState.isPlaying = true;
    this.continueSequence();
    this.emit('animation-resumed', { sequence: this.currentSequence });
  }

  /**
   * Reset animation to beginning
   */
  reset(): void {
    this.pause();

    this.animationState.currentFrame = 0;
    this.stepTimeouts.clear();

    if (this.currentSequence) {
      this.currentSequence.steps.forEach((step) => {
        step.status = 'pending';
      });
    }

    this.emit('animation-reset', { sequence: this.currentSequence });
  }

  /**
   * Get current animation state
   */
  getState(): AnimationState {
    return { ...this.animationState };
  }

  /**
   * Get current sequence
   */
  getCurrentSequence(): AnimationSequence | null {
    return this.currentSequence;
  }

  /**
   * Add event listener
   */
  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: (data: any) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return this.performanceMonitor.getMetrics();
  }

  /**
   * Record a frame for performance monitoring (public method for testing)
   */
  recordFrame(): void {
    this.performanceMonitor.recordFramePublic();
  }

  /**
   * Execute animation sequence
   */
  private async executeSequence(sequence: AnimationSequence): Promise<any> {
    this.currentSequence = sequence;
    this.animationState.isPlaying = true;
    this.animationState.totalFrames = sequence.totalDuration / 16; // Assuming 60fps
    this.animationState.currentFrame = 0;

    this.performanceMonitor.startSequence(sequence.id);
    this.emit('sequence-started', { sequence });

    try {
      for (const step of sequence.steps) {
        if (!this.animationState.isPlaying) {
          throw new Error('Animation was paused or stopped');
        }

        await this.executeStep(step);
      }

      this.performanceMonitor.endSequence(sequence.id);
      this.emit('sequence-completed', { sequence });

      // Return mock data for now - will be replaced with actual BrightChain integration
      return sequence.type === 'encoding'
        ? { id: 'mock-receipt', fileName: 'mock-file', blocks: [] }
        : new Uint8Array();
    } catch (error) {
      this.performanceMonitor.recordError(sequence.id, error as Error);
      this.emit('sequence-error', { sequence, error });
      throw error;
    } finally {
      this.animationState.isPlaying = false;
      this.currentSequence = null;
    }
  }

  /**
   * Execute individual animation step
   */
  private async executeStep(step: ProcessStep): Promise<void> {
    step.status = 'active';
    this.emit('step-started', { step });

    const adjustedDuration = step.duration / this.animationState.speed;

    // In test environment, use much shorter durations
    const isTestEnvironment =
      typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
    const actualDuration = isTestEnvironment
      ? Math.min(adjustedDuration, 10)
      : adjustedDuration;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!this.animationState.isPlaying) {
          reject(new Error('Animation stopped during step execution'));
          return;
        }

        step.status = 'complete';
        this.emit('step-completed', { step });
        this.stepTimeouts.delete(step.id);
        resolve();
      }, actualDuration);

      this.stepTimeouts.set(step.id, timeout);
    });
  }

  /**
   * Continue sequence after pause
   */
  private continueSequence(): void {
    if (!this.currentSequence) return;

    const activeStep = this.currentSequence.steps.find(
      (step) => step.status === 'active',
    );
    if (activeStep) {
      // Resume from active step
      this.executeStep(activeStep);
    }
  }

  /**
   * Adjust sequence timing for speed changes
   */
  private adjustSequenceTiming(_speedMultiplier: number): void {
    // Clear existing timeouts and restart with new timing
    this.stepTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.stepTimeouts.clear();

    if (this.currentSequence) {
      const activeStep = this.currentSequence.steps.find(
        (step) => step.status === 'active',
      );
      if (activeStep) {
        this.executeStep(activeStep);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(
            `Error in animation event listener for ${event}:`,
            error,
          );
        }
      });
    }
  }
}

/**
 * Performance monitoring for animations
 */
export interface PerformanceMetrics {
  frameRate: number;
  averageFrameTime: number;
  droppedFrames: number;
  memoryUsage: number;
  sequenceCount: number;
  errorCount: number;
}

class PerformanceMonitor {
  private frameCount = 0;
  private lastFrameTime = 0;
  private frameTimes: number[] = [];
  private droppedFrames = 0;
  private sequenceCount = 0;
  private errorCount = 0;
  private activeSequences = new Set<string>();

  startSequence(sequenceId: string): void {
    this.activeSequences.add(sequenceId);
    this.sequenceCount++;
  }

  endSequence(sequenceId: string): void {
    this.activeSequences.delete(sequenceId);
  }

  recordError(sequenceId: string, error: Error): void {
    this.errorCount++;
    console.error(`Animation error in sequence ${sequenceId}:`, error);
  }

  recordFrame(): void {
    const now = performance.now();
    if (this.lastFrameTime > 0) {
      const frameTime = now - this.lastFrameTime;
      this.frameTimes.push(frameTime);

      // Keep only last 60 frame times for rolling average
      if (this.frameTimes.length > 60) {
        this.frameTimes.shift();
      }

      // Detect dropped frames (> 20ms = below 50fps)
      if (frameTime > 20) {
        this.droppedFrames++;
      }
    }

    this.lastFrameTime = now;
    this.frameCount++;
  }

  // Public method to manually record frames (useful for testing)
  public recordFramePublic(): void {
    this.recordFrame();
  }

  getMetrics(): PerformanceMetrics {
    const averageFrameTime =
      this.frameTimes.length > 0
        ? this.frameTimes.reduce((sum, time) => sum + time, 0) /
          this.frameTimes.length
        : 0;

    const frameRate = averageFrameTime > 0 ? 1000 / averageFrameTime : 0;

    return {
      frameRate: Math.round(frameRate),
      averageFrameTime: Math.round(averageFrameTime * 100) / 100,
      droppedFrames: this.droppedFrames,
      memoryUsage: this.getMemoryUsage(),
      sequenceCount: this.sequenceCount,
      errorCount: this.errorCount,
    };
  }

  private getMemoryUsage(): number {
    // Use performance.memory if available (Chrome)
    if ('memory' in performance) {
      return Math.round(
        (performance as any).memory.usedJSHeapSize / 1024 / 1024,
      );
    }
    return 0;
  }
}
