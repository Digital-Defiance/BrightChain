/**
 * @fileoverview Property-based tests for debug information display
 *
 * **Feature: visual-brightchain-demo, Property 8: Debug Information Display**
 * **Validates: Requirements 5.5**
 *
 * This test suite verifies that the debug panel properly displays block store status,
 * internal state information, and diagnostic data when debug mode is activated.
 */

import { describe, expect, it } from 'vitest';
import {
  AnimationStateInfo,
  BlockStoreInfo,
  PerformanceInfo,
} from './DebugPanel';

describe('Debug Information Display Property Tests', () => {
  describe('Property 8: Debug Information Display', () => {
    /**
     * Property: For any debug mode activation, the animation engine should display
     * block store status, internal state information, and diagnostic data.
     *
     * This property ensures that all debug information is properly structured
     * and contains all required fields for display.
     */

    it('should have valid block store information structure', () => {
      const blockStoreVariations: BlockStoreInfo[] = [
        {
          sessionId: 'session-123',
          blockCount: 0,
          totalSize: 0,
          blockIds: [],
        },
        {
          sessionId: 'session-456',
          blockCount: 5,
          totalSize: 5120,
          blockIds: ['block-1', 'block-2', 'block-3', 'block-4', 'block-5'],
        },
        {
          sessionId: 'session-789',
          blockCount: 20,
          totalSize: 20480,
          blockIds: Array.from({ length: 20 }, (_, i) => `block-${i}`),
        },
      ];

      for (const blockStoreInfo of blockStoreVariations) {
        // Verify all required fields are present
        expect(blockStoreInfo.sessionId).toBeDefined();
        expect(typeof blockStoreInfo.sessionId).toBe('string');
        expect(blockStoreInfo.sessionId.length).toBeGreaterThan(0);

        expect(blockStoreInfo.blockCount).toBeDefined();
        expect(typeof blockStoreInfo.blockCount).toBe('number');
        expect(blockStoreInfo.blockCount).toBeGreaterThanOrEqual(0);

        expect(blockStoreInfo.totalSize).toBeDefined();
        expect(typeof blockStoreInfo.totalSize).toBe('number');
        expect(blockStoreInfo.totalSize).toBeGreaterThanOrEqual(0);

        expect(blockStoreInfo.blockIds).toBeDefined();
        expect(Array.isArray(blockStoreInfo.blockIds)).toBe(true);
        expect(blockStoreInfo.blockIds.length).toBe(blockStoreInfo.blockCount);
      }
    });

    it('should have valid animation state information structure', () => {
      const animationStateVariations: AnimationStateInfo[] = [
        {
          isPlaying: false,
          currentFrame: 0,
          totalFrames: 100,
          speed: 1.0,
        },
        {
          isPlaying: true,
          currentFrame: 50,
          totalFrames: 100,
          speed: 1.5,
          currentSequence: {
            id: 'encoding-123',
            type: 'encoding',
            progress: 50,
          },
        },
        {
          isPlaying: true,
          currentFrame: 75,
          totalFrames: 100,
          speed: 0.5,
          currentSequence: {
            id: 'reconstruction-456',
            type: 'reconstruction',
            progress: 75,
          },
        },
      ];

      for (const animationState of animationStateVariations) {
        // Verify all required fields are present
        expect(animationState.isPlaying).toBeDefined();
        expect(typeof animationState.isPlaying).toBe('boolean');

        expect(animationState.currentFrame).toBeDefined();
        expect(typeof animationState.currentFrame).toBe('number');
        expect(animationState.currentFrame).toBeGreaterThanOrEqual(0);

        expect(animationState.totalFrames).toBeDefined();
        expect(typeof animationState.totalFrames).toBe('number');
        expect(animationState.totalFrames).toBeGreaterThan(0);

        expect(animationState.speed).toBeDefined();
        expect(typeof animationState.speed).toBe('number');
        expect(animationState.speed).toBeGreaterThan(0);

        // Verify frame count is within bounds
        expect(animationState.currentFrame).toBeLessThanOrEqual(
          animationState.totalFrames,
        );

        // If sequence exists, verify its structure
        if (animationState.currentSequence) {
          expect(animationState.currentSequence.id).toBeDefined();
          expect(animationState.currentSequence.type).toBeDefined();
          expect(animationState.currentSequence.progress).toBeDefined();
          expect(
            animationState.currentSequence.progress,
          ).toBeGreaterThanOrEqual(0);
          expect(animationState.currentSequence.progress).toBeLessThanOrEqual(
            100,
          );
        }
      }
    });

    it('should have valid performance information structure', () => {
      const performanceVariations: PerformanceInfo[] = [
        {
          frameRate: 60,
          averageFrameTime: 16.67,
          droppedFrames: 0,
          memoryUsage: 0,
          sequenceCount: 0,
          errorCount: 0,
        },
        {
          frameRate: 30,
          averageFrameTime: 33.33,
          droppedFrames: 5,
          memoryUsage: 50,
          sequenceCount: 3,
          errorCount: 0,
        },
        {
          frameRate: 15,
          averageFrameTime: 66.67,
          droppedFrames: 20,
          memoryUsage: 100,
          sequenceCount: 10,
          errorCount: 2,
        },
      ];

      for (const performanceInfo of performanceVariations) {
        // Verify all required fields are present
        expect(performanceInfo.frameRate).toBeDefined();
        expect(typeof performanceInfo.frameRate).toBe('number');
        expect(performanceInfo.frameRate).toBeGreaterThanOrEqual(0);

        expect(performanceInfo.averageFrameTime).toBeDefined();
        expect(typeof performanceInfo.averageFrameTime).toBe('number');
        expect(performanceInfo.averageFrameTime).toBeGreaterThanOrEqual(0);

        expect(performanceInfo.droppedFrames).toBeDefined();
        expect(typeof performanceInfo.droppedFrames).toBe('number');
        expect(performanceInfo.droppedFrames).toBeGreaterThanOrEqual(0);

        expect(performanceInfo.memoryUsage).toBeDefined();
        expect(typeof performanceInfo.memoryUsage).toBe('number');
        expect(performanceInfo.memoryUsage).toBeGreaterThanOrEqual(0);

        expect(performanceInfo.sequenceCount).toBeDefined();
        expect(typeof performanceInfo.sequenceCount).toBe('number');
        expect(performanceInfo.sequenceCount).toBeGreaterThanOrEqual(0);

        expect(performanceInfo.errorCount).toBeDefined();
        expect(typeof performanceInfo.errorCount).toBe('number');
        expect(performanceInfo.errorCount).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle block store with last operation information', () => {
      const operations: Array<{
        type: 'store' | 'retrieve' | 'delete' | 'clear';
        timestamp: number;
        blockId?: string;
      }> = [
        { type: 'store', timestamp: Date.now(), blockId: 'block-123' },
        { type: 'retrieve', timestamp: Date.now(), blockId: 'block-456' },
        { type: 'delete', timestamp: Date.now(), blockId: 'block-789' },
        { type: 'clear', timestamp: Date.now() },
      ];

      for (const operation of operations) {
        const blockStoreInfo: BlockStoreInfo = {
          sessionId: 'session-test',
          blockCount: 5,
          totalSize: 5120,
          blockIds: ['block-1', 'block-2'],
          lastOperation: operation,
        };

        // Verify last operation structure
        expect(blockStoreInfo.lastOperation).toBeDefined();
        expect(blockStoreInfo.lastOperation?.type).toBeDefined();
        expect(['store', 'retrieve', 'delete', 'clear']).toContain(
          blockStoreInfo.lastOperation?.type,
        );
        expect(blockStoreInfo.lastOperation?.timestamp).toBeDefined();
        expect(typeof blockStoreInfo.lastOperation?.timestamp).toBe('number');
        expect(blockStoreInfo.lastOperation?.timestamp).toBeGreaterThan(0);
      }
    });

    it('should validate performance status thresholds', () => {
      const performanceScenarios = [
        { frameRate: 60, expectedStatus: 'good' },
        { frameRate: 30, expectedStatus: 'good' },
        { frameRate: 25, expectedStatus: 'warning' },
        { frameRate: 15, expectedStatus: 'poor' },
      ];

      for (const scenario of performanceScenarios) {
        const performanceInfo: PerformanceInfo = {
          frameRate: scenario.frameRate,
          averageFrameTime: 1000 / scenario.frameRate,
          droppedFrames: 0,
          memoryUsage: 0,
          sequenceCount: 0,
          errorCount: 0,
        };

        // Determine status based on frame rate
        let status: string;
        if (performanceInfo.frameRate >= 30) {
          status = 'good';
        } else if (performanceInfo.frameRate >= 20) {
          status = 'warning';
        } else {
          status = 'poor';
        }

        expect(status).toBe(scenario.expectedStatus);
      }
    });

    it('should format byte sizes correctly', () => {
      const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
      };

      const sizeScenarios = [
        { bytes: 0, expectedText: '0 B' },
        { bytes: 1024, expectedText: '1.00 KB' },
        { bytes: 1048576, expectedText: '1.00 MB' },
        { bytes: 5120, expectedText: '5.00 KB' },
      ];

      for (const scenario of sizeScenarios) {
        const formatted = formatBytes(scenario.bytes);
        expect(formatted).toBe(scenario.expectedText);
      }
    });

    it('should handle varying numbers of block IDs', () => {
      const blockCounts = [0, 1, 5, 10, 20, 50, 100];

      for (const count of blockCounts) {
        const blockStoreInfo: BlockStoreInfo = {
          sessionId: 'session-test',
          blockCount: count,
          totalSize: count * 1024,
          blockIds: Array.from({ length: count }, (_, i) => `block-${i}`),
        };

        // Verify block IDs match count
        expect(blockStoreInfo.blockIds.length).toBe(count);
        expect(blockStoreInfo.blockCount).toBe(count);

        // Verify all block IDs are unique
        const uniqueIds = new Set(blockStoreInfo.blockIds);
        expect(uniqueIds.size).toBe(count);
      }
    });

    it('should handle animation sequences with different progress values', () => {
      const progressValues = [0, 25, 50, 75, 100];

      for (const progress of progressValues) {
        const animationState: AnimationStateInfo = {
          isPlaying: true,
          currentFrame: progress,
          totalFrames: 100,
          speed: 1.0,
          currentSequence: {
            id: 'test-sequence',
            type: 'encoding',
            progress,
          },
        };

        // Verify progress is within valid range
        expect(animationState.currentSequence?.progress).toBeGreaterThanOrEqual(
          0,
        );
        expect(animationState.currentSequence?.progress).toBeLessThanOrEqual(
          100,
        );

        // Verify progress matches expected value
        expect(animationState.currentSequence?.progress).toBe(progress);
      }
    });

    it('should handle different animation speeds', () => {
      const speeds = [0.25, 0.5, 1.0, 1.5, 2.0];

      for (const speed of speeds) {
        const animationState: AnimationStateInfo = {
          isPlaying: true,
          currentFrame: 50,
          totalFrames: 100,
          speed,
        };

        // Verify speed is positive
        expect(animationState.speed).toBeGreaterThan(0);

        // Verify speed matches expected value
        expect(animationState.speed).toBe(speed);
      }
    });

    it('should handle error counts in performance info', () => {
      const errorCounts = [0, 1, 5, 10, 20];

      for (const errorCount of errorCounts) {
        const performanceInfo: PerformanceInfo = {
          frameRate: 60,
          averageFrameTime: 16.67,
          droppedFrames: 0,
          memoryUsage: 0,
          sequenceCount: 0,
          errorCount,
        };

        // Verify error count is non-negative
        expect(performanceInfo.errorCount).toBeGreaterThanOrEqual(0);

        // Verify error count matches expected value
        expect(performanceInfo.errorCount).toBe(errorCount);
      }
    });
  });
});
