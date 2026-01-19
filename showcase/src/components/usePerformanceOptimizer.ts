/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @fileoverview React hook for using PerformanceOptimizer
 * Provides state management and event handling for performance optimization features
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FileQueueItem,
  LayoutDimensions,
  MemoryStats,
  PerformanceConfig,
  PerformanceOptimizer,
  QualityLevel,
} from './PerformanceOptimizer';

export interface QueueStatus {
  total: number;
  queued: number;
  processing: number;
  complete: number;
  error: number;
}

/**
 * React hook for using PerformanceOptimizer
 */
export function usePerformanceOptimizer(config?: Partial<PerformanceConfig>) {
  const optimizerRef = useRef<PerformanceOptimizer | null>(null);
  const [queueItems, setQueueItems] = useState<FileQueueItem[]>([]);
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    total: 0,
    queued: 0,
    processing: 0,
    complete: 0,
    error: 0,
  });
  const [currentQuality, setCurrentQuality] = useState<QualityLevel | null>(
    null,
  );
  const [layoutDimensions, setLayoutDimensions] =
    useState<LayoutDimensions | null>(null);
  const [memoryStats, setMemoryStats] = useState<MemoryStats>({
    usedMemory: 0,
    totalMemory: 0,
    animationResourceCount: 0,
    cacheSize: 0,
  });
  const [averageFrameRate, setAverageFrameRate] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize optimizer
  useEffect(() => {
    if (!optimizerRef.current) {
      optimizerRef.current = new PerformanceOptimizer(config);
      setCurrentQuality(optimizerRef.current.getCurrentQuality());
      setLayoutDimensions(optimizerRef.current.getLayoutDimensions());
      setIsInitialized(true);

      // Set up event listeners
      const optimizer = optimizerRef.current;

      optimizer.on('file-queued', () => {
        updateQueueState();
      });

      optimizer.on('file-processing-started', () => {
        updateQueueState();
      });

      optimizer.on('file-processing-complete', () => {
        updateQueueState();
      });

      optimizer.on('file-processing-error', () => {
        updateQueueState();
      });

      optimizer.on('file-progress', () => {
        updateQueueState();
      });

      optimizer.on('quality-changed', ({ quality }) => {
        setCurrentQuality(quality);
      });

      optimizer.on('quality-reduced', ({ from, to, reason, fps }) => {
        console.log(
          `Quality reduced from ${from} to ${to} due to ${reason} (FPS: ${fps})`,
        );
      });

      optimizer.on('quality-increased', ({ from, to, reason, fps }) => {
        console.log(
          `Quality increased from ${from} to ${to} due to ${reason} (FPS: ${fps})`,
        );
      });

      optimizer.on('layout-changed', ({ from, to }) => {
        setLayoutDimensions(to);
        console.log(
          `Layout changed from ${from.breakpoint} to ${to.breakpoint}`,
        );
      });

      optimizer.on('resource-registered', () => {
        updateMemoryStats();
      });

      optimizer.on('resource-unregistered', () => {
        updateMemoryStats();
      });

      optimizer.on('resources-cleared', () => {
        updateMemoryStats();
      });

      optimizer.on('memory-threshold-exceeded', ({ stats }) => {
        console.warn('Memory threshold exceeded:', stats);
      });

      optimizer.on('resources-cleaned-up', ({ count }) => {
        console.log(`Cleaned up ${count} animation resources`);
      });

      optimizer.on('large-file-detected', ({ item, size }) => {
        console.log(
          `Large file detected: ${item.file.name} (${(size / 1024 / 1024).toFixed(2)} MB)`,
        );
      });
    }

    return () => {
      if (optimizerRef.current) {
        optimizerRef.current.destroy();
      }
    };
  }, [config]);

  // Update queue state helper
  const updateQueueState = useCallback(() => {
    if (optimizerRef.current) {
      setQueueItems(optimizerRef.current.getQueueItems());
      setQueueStatus(optimizerRef.current.getQueueStatus());
    }
  }, []);

  // Update memory stats helper
  const updateMemoryStats = useCallback(() => {
    if (optimizerRef.current) {
      setMemoryStats(optimizerRef.current.getMemoryStats());
    }
  }, []);

  // Periodic updates
  useEffect(() => {
    if (!optimizerRef.current) return;

    const updateInterval = setInterval(() => {
      updateMemoryStats();
      if (optimizerRef.current) {
        setAverageFrameRate(optimizerRef.current.getAverageFrameRate());
      }
    }, 1000);

    return () => clearInterval(updateInterval);
  }, [isInitialized, updateMemoryStats]);

  // Queue management methods
  const addToQueue = useCallback((files: File[]): string[] => {
    if (!optimizerRef.current) {
      throw new Error('PerformanceOptimizer not initialized');
    }
    return optimizerRef.current.addToQueue(files);
  }, []);

  const updateFileProgress = useCallback(
    (fileId: string, progress: number) => {
      if (!optimizerRef.current) return;
      optimizerRef.current.updateFileProgress(fileId, progress);
      updateQueueState();
    },
    [updateQueueState],
  );

  const clearCompleted = useCallback(() => {
    if (!optimizerRef.current) return;
    optimizerRef.current.clearCompleted();
    updateQueueState();
  }, [updateQueueState]);

  // File size methods
  const isLargeFile = useCallback((file: File): boolean => {
    if (!optimizerRef.current) return false;
    return optimizerRef.current.isLargeFile(file);
  }, []);

  const getRecommendedChunkSize = useCallback((file: File): number => {
    if (!optimizerRef.current) return 64 * 1024;
    return optimizerRef.current.getRecommendedChunkSize(file);
  }, []);

  // Performance monitoring methods
  const recordFrameRate = useCallback((fps: number) => {
    if (!optimizerRef.current) return;
    optimizerRef.current.recordFrameRate(fps);
    setAverageFrameRate(optimizerRef.current.getAverageFrameRate());
  }, []);

  // Quality control methods
  const setQuality = useCallback((quality: QualityLevel) => {
    if (!optimizerRef.current) return;
    optimizerRef.current.setQuality(quality);
  }, []);

  // Resource management methods
  const registerAnimationResource = useCallback((id: string, resource: any) => {
    if (!optimizerRef.current) return;
    optimizerRef.current.registerAnimationResource(id, resource);
  }, []);

  const unregisterAnimationResource = useCallback((id: string) => {
    if (!optimizerRef.current) return;
    optimizerRef.current.unregisterAnimationResource(id);
  }, []);

  const clearAnimationResources = useCallback(() => {
    if (!optimizerRef.current) return;
    optimizerRef.current.clearAnimationResources();
  }, []);

  return {
    // State
    queueItems,
    queueStatus,
    currentQuality,
    layoutDimensions,
    memoryStats,
    averageFrameRate,
    isInitialized,

    // Queue methods
    addToQueue,
    updateFileProgress,
    clearCompleted,

    // File size methods
    isLargeFile,
    getRecommendedChunkSize,

    // Performance methods
    recordFrameRate,

    // Quality methods
    setQuality,

    // Resource methods
    registerAnimationResource,
    unregisterAnimationResource,
    clearAnimationResources,

    // Direct optimizer access
    optimizer: optimizerRef.current,
  };
}
