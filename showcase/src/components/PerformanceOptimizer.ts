/**
 * @fileoverview Performance optimization system for BrightChain demo
 * Handles multi-file processing queue, large file handling, responsive layout adaptation,
 * automatic quality adjustment, and memory management for animation resources.
 */

export interface FileQueueItem {
  id: string;
  file: File;
  status: 'queued' | 'processing' | 'complete' | 'error';
  progress: number;
  error?: string;
  startTime?: number;
  endTime?: number;
}

export interface PerformanceConfig {
  maxConcurrentFiles: number;
  largeFileThreshold: number; // bytes
  targetFrameRate: number;
  minFrameRate: number;
  qualityLevels: QualityLevel[];
  memoryThreshold: number; // MB
}

export interface QualityLevel {
  name: string;
  animationComplexity: number; // 0-1
  particleCount: number;
  shadowsEnabled: boolean;
  blurEnabled: boolean;
}

export interface LayoutDimensions {
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  breakpoint: 'mobile' | 'tablet' | 'desktop';
}

export interface MemoryStats {
  usedMemory: number; // MB
  totalMemory: number; // MB
  animationResourceCount: number;
  cacheSize: number; // MB
}

/**
 * Performance optimizer for managing multi-file processing, large files,
 * responsive layouts, quality adjustment, and memory management
 */
export class PerformanceOptimizer {
  private config: PerformanceConfig;
  private fileQueue: FileQueueItem[] = [];
  private processingCount = 0;
  private currentQuality: QualityLevel;
  private frameRateHistory: number[] = [];
  private layoutDimensions: LayoutDimensions;
  private animationResources = new Map<string, any>();
  private listeners = new Map<string, Set<(data: any) => void>>();
  private resizeObserver: ResizeObserver | null = null;

  constructor(config?: Partial<PerformanceConfig>) {
    this.config = {
      maxConcurrentFiles: 3,
      largeFileThreshold: 10 * 1024 * 1024, // 10MB
      targetFrameRate: 60,
      minFrameRate: 30,
      qualityLevels: [
        {
          name: 'high',
          animationComplexity: 1.0,
          particleCount: 100,
          shadowsEnabled: true,
          blurEnabled: true,
        },
        {
          name: 'medium',
          animationComplexity: 0.7,
          particleCount: 50,
          shadowsEnabled: true,
          blurEnabled: false,
        },
        {
          name: 'low',
          animationComplexity: 0.4,
          particleCount: 20,
          shadowsEnabled: false,
          blurEnabled: false,
        },
        {
          name: 'minimal',
          animationComplexity: 0.2,
          particleCount: 0,
          shadowsEnabled: false,
          blurEnabled: false,
        },
      ],
      memoryThreshold: 100, // 100MB
      ...config,
    };

    this.currentQuality = this.config.qualityLevels[0]; // Start with high quality
    this.layoutDimensions = this.detectLayoutDimensions();
    this.setupResizeObserver();
  }

  /**
   * Add files to processing queue
   */
  addToQueue(files: File[]): string[] {
    const queueIds: string[] = [];

    for (const file of files) {
      const id = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const queueItem: FileQueueItem = {
        id,
        file,
        status: 'queued',
        progress: 0,
      };

      this.fileQueue.push(queueItem);
      queueIds.push(id);
      this.emit('file-queued', { item: queueItem });
    }

    // Start processing if not at capacity
    this.processQueue();

    return queueIds;
  }

  /**
   * Process queued files respecting concurrency limits
   */
  private async processQueue(): Promise<void> {
    while (
      this.processingCount < this.config.maxConcurrentFiles &&
      this.fileQueue.some((item) => item.status === 'queued')
    ) {
      const nextItem = this.fileQueue.find((item) => item.status === 'queued');
      if (!nextItem) break;

      this.processingCount++;
      nextItem.status = 'processing';
      nextItem.startTime = Date.now();
      this.emit('file-processing-started', { item: nextItem });

      // Process file asynchronously
      this.processFile(nextItem)
        .then(() => {
          nextItem.status = 'complete';
          nextItem.endTime = Date.now();
          nextItem.progress = 100;
          this.emit('file-processing-complete', { item: nextItem });
        })
        .catch((error) => {
          nextItem.status = 'error';
          nextItem.error = error.message;
          nextItem.endTime = Date.now();
          this.emit('file-processing-error', { item: nextItem, error });
        })
        .finally(() => {
          this.processingCount--;
          this.processQueue(); // Continue processing queue
        });
    }
  }

  /**
   * Process individual file with progress tracking
   */
  private async processFile(item: FileQueueItem): Promise<void> {
    const isLargeFile = item.file.size > this.config.largeFileThreshold;

    if (isLargeFile) {
      this.emit('large-file-detected', { item, size: item.file.size });
    }

    // Simulate processing with progress updates
    const steps = isLargeFile ? 20 : 10;
    for (let i = 0; i <= steps; i++) {
      item.progress = (i / steps) * 100;
      this.emit('file-progress', { item, progress: item.progress });

      // Simulate processing time
      await new Promise((resolve) =>
        setTimeout(resolve, isLargeFile ? 100 : 50),
      );

      // Check if we need to adjust quality during processing
      this.checkPerformanceAndAdjustQuality();
    }
  }

  /**
   * Update progress for a specific file
   */
  updateFileProgress(fileId: string, progress: number): void {
    const item = this.fileQueue.find((f) => f.id === fileId);
    if (item) {
      item.progress = Math.min(100, Math.max(0, progress));
      this.emit('file-progress', { item, progress: item.progress });
    }
  }

  /**
   * Get current queue status
   */
  getQueueStatus(): {
    total: number;
    queued: number;
    processing: number;
    complete: number;
    error: number;
  } {
    return {
      total: this.fileQueue.length,
      queued: this.fileQueue.filter((f) => f.status === 'queued').length,
      processing: this.fileQueue.filter((f) => f.status === 'processing')
        .length,
      complete: this.fileQueue.filter((f) => f.status === 'complete').length,
      error: this.fileQueue.filter((f) => f.status === 'error').length,
    };
  }

  /**
   * Get all queue items
   */
  getQueueItems(): FileQueueItem[] {
    return [...this.fileQueue];
  }

  /**
   * Clear completed items from queue
   */
  clearCompleted(): void {
    const beforeCount = this.fileQueue.length;
    this.fileQueue = this.fileQueue.filter(
      (item) => item.status !== 'complete',
    );
    const removedCount = beforeCount - this.fileQueue.length;
    if (removedCount > 0) {
      this.emit('queue-cleared', { removedCount });
    }
  }

  /**
   * Check if file is large
   */
  isLargeFile(file: File): boolean {
    return file.size > this.config.largeFileThreshold;
  }

  /**
   * Get recommended chunk size for file
   */
  getRecommendedChunkSize(file: File): number {
    if (this.isLargeFile(file)) {
      // For large files, use larger chunks to reduce overhead
      return Math.min(1024 * 1024, file.size / 100); // 1MB or 1% of file size
    }
    return 64 * 1024; // 64KB for normal files
  }

  /**
   * Record frame rate for performance monitoring
   */
  recordFrameRate(fps: number): void {
    this.frameRateHistory.push(fps);

    // Keep only last 60 samples (1 second at 60fps)
    if (this.frameRateHistory.length > 60) {
      this.frameRateHistory.shift();
    }

    this.checkPerformanceAndAdjustQuality();
  }

  /**
   * Get average frame rate
   */
  getAverageFrameRate(): number {
    if (this.frameRateHistory.length === 0) return 0;
    const sum = this.frameRateHistory.reduce((a, b) => a + b, 0);
    return sum / this.frameRateHistory.length;
  }

  /**
   * Check performance and adjust quality if needed
   */
  private checkPerformanceAndAdjustQuality(): void {
    const avgFps = this.getAverageFrameRate();

    if (avgFps === 0) return; // No data yet

    const currentQualityIndex = this.config.qualityLevels.indexOf(
      this.currentQuality,
    );

    // If FPS is below minimum, reduce quality
    if (
      avgFps < this.config.minFrameRate &&
      currentQualityIndex < this.config.qualityLevels.length - 1
    ) {
      const newQuality = this.config.qualityLevels[currentQualityIndex + 1];
      this.setQuality(newQuality);
      this.emit('quality-reduced', {
        from: this.currentQuality.name,
        to: newQuality.name,
        reason: 'low-fps',
        fps: avgFps,
      });
    }
    // If FPS is consistently high, try increasing quality
    else if (
      avgFps > this.config.targetFrameRate * 0.9 &&
      currentQualityIndex > 0
    ) {
      const newQuality = this.config.qualityLevels[currentQualityIndex - 1];
      this.setQuality(newQuality);
      this.emit('quality-increased', {
        from: this.currentQuality.name,
        to: newQuality.name,
        reason: 'high-fps',
        fps: avgFps,
      });
    }
  }

  /**
   * Manually set quality level
   */
  setQuality(quality: QualityLevel): void {
    const previousQuality = this.currentQuality;
    this.currentQuality = quality;
    this.emit('quality-changed', {
      from: previousQuality.name,
      to: quality.name,
      quality,
    });
  }

  /**
   * Get current quality level
   */
  getCurrentQuality(): QualityLevel {
    return { ...this.currentQuality };
  }

  /**
   * Detect current layout dimensions
   */
  private detectLayoutDimensions(): LayoutDimensions {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const orientation = width > height ? 'landscape' : 'portrait';

    let breakpoint: 'mobile' | 'tablet' | 'desktop';
    if (width < 768) {
      breakpoint = 'mobile';
    } else if (width < 1024) {
      breakpoint = 'tablet';
    } else {
      breakpoint = 'desktop';
    }

    return { width, height, orientation, breakpoint };
  }

  /**
   * Setup resize observer for responsive layout adaptation
   */
  private setupResizeObserver(): void {
    if (
      typeof window === 'undefined' ||
      typeof ResizeObserver === 'undefined'
    ) {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      const newDimensions = this.detectLayoutDimensions();
      const dimensionsChanged =
        newDimensions.width !== this.layoutDimensions.width ||
        newDimensions.height !== this.layoutDimensions.height ||
        newDimensions.breakpoint !== this.layoutDimensions.breakpoint;

      if (dimensionsChanged) {
        const previousDimensions = this.layoutDimensions;
        this.layoutDimensions = newDimensions;
        this.emit('layout-changed', {
          from: previousDimensions,
          to: newDimensions,
        });
      }
    });

    this.resizeObserver.observe(document.body);
  }

  /**
   * Get current layout dimensions
   */
  getLayoutDimensions(): LayoutDimensions {
    return { ...this.layoutDimensions };
  }

  /**
   * Register animation resource for memory management
   */
  registerAnimationResource(id: string, resource: any): void {
    this.animationResources.set(id, resource);
    this.emit('resource-registered', {
      id,
      resourceCount: this.animationResources.size,
    });
    this.checkMemoryUsage();
  }

  /**
   * Unregister animation resource
   */
  unregisterAnimationResource(id: string): void {
    const resource = this.animationResources.get(id);
    if (resource) {
      // Cleanup resource if it has a cleanup method
      if (typeof resource.cleanup === 'function') {
        resource.cleanup();
      }
      this.animationResources.delete(id);
      this.emit('resource-unregistered', {
        id,
        resourceCount: this.animationResources.size,
      });
    }
  }

  /**
   * Clear all animation resources
   */
  clearAnimationResources(): void {
    const count = this.animationResources.size;
    this.animationResources.forEach((resource, id) => {
      if (typeof resource.cleanup === 'function') {
        resource.cleanup();
      }
    });
    this.animationResources.clear();
    this.emit('resources-cleared', { count });
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): MemoryStats {
    let usedMemory = 0;
    let totalMemory = 0;

    // Use performance.memory if available (Chrome)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      usedMemory = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      totalMemory = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
    }

    return {
      usedMemory,
      totalMemory,
      animationResourceCount: this.animationResources.size,
      cacheSize: 0, // Could be calculated based on resource sizes
    };
  }

  /**
   * Check memory usage and cleanup if needed
   */
  private checkMemoryUsage(): void {
    const stats = this.getMemoryStats();

    if (stats.usedMemory > this.config.memoryThreshold) {
      this.emit('memory-threshold-exceeded', { stats });
      // Trigger cleanup of oldest resources
      this.cleanupOldestResources(
        Math.floor(this.animationResources.size * 0.3),
      );
    }
  }

  /**
   * Cleanup oldest animation resources
   */
  private cleanupOldestResources(count: number): void {
    const resourceIds = Array.from(this.animationResources.keys());
    const toRemove = resourceIds.slice(0, count);

    for (const id of toRemove) {
      this.unregisterAnimationResource(id);
    }

    if (toRemove.length > 0) {
      this.emit('resources-cleaned-up', { count: toRemove.length });
    }
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
            `Error in performance optimizer event listener for ${event}:`,
            error,
          );
        }
      });
    }
  }

  /**
   * Cleanup and destroy optimizer
   */
  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.clearAnimationResources();
    this.listeners.clear();
    this.fileQueue = [];
    this.processingCount = 0;
    this.frameRateHistory = [];
  }
}
