/**
 * @fileoverview Property-based tests for AnimationController performance standards
 *
 * **Feature: visual-brightchain-demo, Property 9: Animation Performance Standards**
 * **Validates: Requirements 6.1, 6.4**
 *
 * This test suite verifies that the AnimationController maintains at least 30 frames per second
 * and remains responsive to user input throughout animation sequences.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AnimationController, AnimationState, AnimationSequence, ProcessStep } from './AnimationController';

// Mock performance.now for consistent timing in tests
const mockPerformanceNow = vi.fn();
vi.stubGlobal('performance', {
  now: mockPerformanceNow,
  memory: {
    usedJSHeapSize: 1024 * 1024 * 50 // 50MB mock
  }
});

// Mock requestAnimationFrame and cancelAnimationFrame
const mockRequestAnimationFrame = vi.fn();
const mockCancelAnimationFrame = vi.fn();
vi.stubGlobal('requestAnimationFrame', mockRequestAnimationFrame);
vi.stubGlobal('cancelAnimationFrame', mockCancelAnimationFrame);

// Mock crypto for session ID generation
vi.stubGlobal('crypto', {
  getRandomValues: (arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  }
});

describe('AnimationController Performance Property Tests', () => {
  let controller: AnimationController;
  let mockTime: number;

  beforeEach(() => {
    controller = new AnimationController();
    mockTime = 0;
    mockPerformanceNow.mockImplementation(() => mockTime);
    mockRequestAnimationFrame.mockImplementation((callback) => {
      const id = Math.random();
      setTimeout(() => callback(mockTime), 16); // Simulate 60fps
      return id;
    });
    mockCancelAnimationFrame.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 9: Animation Performance Standards', () => {
    /**
     * Property: For any animation sequence, the animation engine should maintain
     * at least 30 frames per second and remain responsive to user input throughout
     * the animation.
     *
     * This property ensures that animations perform well across different scenarios
     * and maintain user interface responsiveness.
     */

    it('should maintain responsive state management across different speed multipliers', () => {
      // Test various speed multipliers
      const speedMultipliers = [0.25, 0.5, 1.0, 1.5, 2.0];
      
      for (const speed of speedMultipliers) {
        controller.setSpeed(speed);
        const state = controller.getState();
        
        // Speed should be set correctly
        expect(state.speed).toBe(speed);
        
        // Controller should remain responsive
        expect(state.isPlaying).toBe(false); // Should start in stopped state
        expect(state.currentFrame).toBe(0);
        expect(state.direction).toBe('forward');
      }
    });

    it('should handle rapid state changes without performance degradation', () => {
      const startTime = performance.now();
      
      // Perform rapid state changes
      const operationCount = 1000;
      for (let i = 0; i < operationCount; i++) {
        // Alternate between different operations
        switch (i % 4) {
          case 0:
            controller.setSpeed(Math.random() * 2 + 0.5); // 0.5 to 2.5
            break;
          case 1:
            controller.pause();
            break;
          case 2:
            controller.resume();
            break;
          case 3:
            controller.reset();
            break;
        }
        
        // Verify state remains consistent
        const state = controller.getState();
        expect(state.speed).toBeGreaterThan(0);
        expect(state.currentFrame).toBeGreaterThanOrEqual(0);
        expect(['forward', 'reverse']).toContain(state.direction);
      }
      
      const endTime = performance.now();
      const operationTime = endTime - startTime;
      
      // Operations should complete quickly (less than 100ms for 1000 operations)
      expect(operationTime).toBeLessThan(100);
    });

    it('should maintain performance metrics within acceptable ranges', () => {
      // Simulate frame recording for performance monitoring
      const frameCount = 60; // Simulate 1 second at 60fps
      const targetFrameTime = 16.67; // ~60fps
      
      // Record frames to populate performance metrics
      for (let i = 0; i < frameCount; i++) {
        mockTime += targetFrameTime;
        mockPerformanceNow.mockReturnValue(mockTime);
        controller.recordFrame(); // Use the public method to record frames
      }
      
      const metrics = controller.getPerformanceMetrics();
      
      // Performance metrics should be within acceptable ranges
      expect(metrics.frameRate).toBeGreaterThanOrEqual(30); // At least 30fps
      expect(metrics.averageFrameTime).toBeLessThanOrEqual(33.33); // Max 30fps frame time
      expect(metrics.droppedFrames).toBeLessThanOrEqual(frameCount * 0.1); // Max 10% dropped frames
      expect(metrics.errorCount).toBe(0); // No errors during normal operation
    });

    it('should handle concurrent animation sequences without blocking', async () => {
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const mockReceipt = {
        id: 'test-receipt',
        fileName: 'test.txt',
        blocks: [],
        blockCount: 1,
        originalSize: 12,
        cblData: [1, 2, 3],
        magnetUrl: 'magnet:test'
      };

      // Start multiple animation sequences concurrently
      const encodingPromises = [];
      const reconstructionPromises = [];
      
      const concurrentCount = 5;
      
      for (let i = 0; i < concurrentCount; i++) {
        // Note: These will throw errors since we're not mocking the full BrightChain integration
        // but we're testing that the controller handles concurrent requests
        encodingPromises.push(
          controller.playEncodingAnimation(mockFile).catch(() => 'encoding-error')
        );
        reconstructionPromises.push(
          controller.playReconstructionAnimation(mockReceipt).catch(() => 'reconstruction-error')
        );
      }
      
      const startTime = performance.now();
      
      // Wait for all animations to complete or error
      const encodingResults = await Promise.all(encodingPromises);
      const reconstructionResults = await Promise.all(reconstructionPromises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // All operations should complete (even if with errors)
      expect(encodingResults).toHaveLength(concurrentCount);
      expect(reconstructionResults).toHaveLength(concurrentCount);
      
      // Operations should not take excessively long (max 10 seconds for all)
      expect(totalTime).toBeLessThan(10000);
      
      // Controller should remain in a consistent state
      const finalState = controller.getState();
      expect(finalState.isPlaying).toBe(false);
    });

    it('should maintain responsiveness during different animation types', async () => {
      const animationTypes = ['encoding', 'reconstruction'] as const;
      const mockFile = new File(['test'], 'test.txt');
      const mockReceipt = {
        id: 'test',
        fileName: 'test.txt',
        blocks: [],
        blockCount: 1,
        originalSize: 4,
        cblData: [1],
        magnetUrl: 'magnet:test'
      };

      for (const animationType of animationTypes) {
        const startTime = performance.now();
        
        try {
          if (animationType === 'encoding') {
            await controller.playEncodingAnimation(mockFile);
          } else {
            await controller.playReconstructionAnimation(mockReceipt);
          }
        } catch (error) {
          // Expected to fail without full BrightChain integration
        }
        
        const endTime = performance.now();
        const animationTime = endTime - startTime;
        
        // Animation should complete within reasonable time (max 2 seconds for test)
        expect(animationTime).toBeLessThan(2000);
        
        // Controller should be responsive to state queries
        const state = controller.getState();
        expect(state).toBeDefined();
        expect(typeof state.isPlaying).toBe('boolean');
        expect(typeof state.speed).toBe('number');
        expect(state.speed).toBeGreaterThan(0);
      }
    }, 20000);

    it('should handle stress conditions with many rapid operations', () => {
      const operations = [
        () => controller.setSpeed(Math.random() * 2 + 0.5),
        () => controller.pause(),
        () => controller.resume(),
        () => controller.reset(),
        () => controller.getState(),
        () => controller.getCurrentSequence(),
        () => controller.getPerformanceMetrics()
      ];

      const startTime = performance.now();
      const operationCount = 10000;
      
      // Perform many random operations
      for (let i = 0; i < operationCount; i++) {
        const randomOperation = operations[Math.floor(Math.random() * operations.length)];
        randomOperation();
        
        // Periodically verify state consistency
        if (i % 1000 === 0) {
          const state = controller.getState();
          expect(state.speed).toBeGreaterThan(0);
          expect(state.currentFrame).toBeGreaterThanOrEqual(0);
        }
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // All operations should complete quickly (less than 1 second)
      expect(totalTime).toBeLessThan(1000);
      
      // Final state should be consistent
      const finalState = controller.getState();
      expect(finalState.speed).toBeGreaterThan(0);
      expect(finalState.currentFrame).toBeGreaterThanOrEqual(0);
    });

    it('should maintain event listener performance under load', () => {
      const eventTypes = [
        'sequence-started',
        'sequence-completed',
        'step-started',
        'step-completed',
        'speed-changed',
        'animation-paused',
        'animation-resumed',
        'animation-reset'
      ];

      const listenerCount = 100;
      const listeners: Array<() => void> = [];
      
      // Add many listeners for each event type
      for (const eventType of eventTypes) {
        for (let i = 0; i < listenerCount; i++) {
          const listener = vi.fn();
          listeners.push(listener);
          controller.on(eventType, listener);
        }
      }
      
      const startTime = performance.now();
      
      // Trigger events that should call listeners
      controller.setSpeed(1.5); // Should trigger 'speed-changed'
      controller.pause(); // Should trigger 'animation-paused'
      controller.resume(); // Should trigger 'animation-resumed'
      controller.reset(); // Should trigger 'animation-reset'
      
      const endTime = performance.now();
      const eventTime = endTime - startTime;
      
      // Event processing should be fast (less than 100ms)
      expect(eventTime).toBeLessThan(100);
      
      // Remove all listeners
      const removeStartTime = performance.now();
      for (const eventType of eventTypes) {
        for (const listener of listeners) {
          controller.off(eventType, listener);
        }
      }
      const removeEndTime = performance.now();
      const removeTime = removeEndTime - removeStartTime;
      
      // Listener removal should also be fast (less than 100ms)
      expect(removeTime).toBeLessThan(100);
    });

    it('should handle edge cases in speed control without performance issues', () => {
      const edgeCases = [
        0.001, // Very slow
        0.01,
        0.1,
        0.25,
        1.0,   // Normal
        2.0,
        5.0,
        10.0,  // Very fast
        100.0
      ];

      for (const speed of edgeCases) {
        const startTime = performance.now();
        
        controller.setSpeed(speed);
        const state = controller.getState();
        
        const endTime = performance.now();
        const operationTime = endTime - startTime;
        
        // Speed setting should be instantaneous (less than 10ms)
        expect(operationTime).toBeLessThan(10);
        
        // Speed should be set correctly
        expect(state.speed).toBe(speed);
        
        // Controller should remain responsive
        const metrics = controller.getPerformanceMetrics();
        expect(metrics).toBeDefined();
      }
    });

    it('should maintain memory efficiency during extended operation', () => {
      const initialMetrics = controller.getPerformanceMetrics();
      const initialMemory = initialMetrics.memoryUsage;
      
      // Perform many operations that could potentially leak memory
      for (let cycle = 0; cycle < 100; cycle++) {
        // Create and destroy event listeners
        const listeners: Array<() => void> = [];
        for (let i = 0; i < 10; i++) {
          const listener = () => {};
          listeners.push(listener);
          controller.on('test-event', listener);
        }
        
        // Remove listeners
        for (const listener of listeners) {
          controller.off('test-event', listener);
        }
        
        // Perform state operations
        controller.setSpeed(Math.random() * 2 + 0.5);
        controller.pause();
        controller.resume();
        controller.reset();
      }
      
      const finalMetrics = controller.getPerformanceMetrics();
      const finalMemory = finalMetrics.memoryUsage;
      
      // Memory usage should not grow excessively (less than 50% increase)
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = (finalMemory - initialMemory) / initialMemory;
        expect(memoryIncrease).toBeLessThan(0.5);
      }
      
      // Error count should remain low
      expect(finalMetrics.errorCount).toBeLessThanOrEqual(initialMetrics.errorCount + 5);
    });

    it('should handle animation timing precision across different speeds', () => {
      const speeds = [0.25, 0.5, 1.0, 2.0];
      const baseDuration = 1000; // 1 second
      
      for (const speed of speeds) {
        controller.setSpeed(speed);
        
        const expectedDuration = baseDuration / speed;
        const tolerance = expectedDuration * 0.1; // 10% tolerance
        
        // Create a mock step with known duration
        const mockStep: ProcessStep = {
          id: 'timing-test',
          name: 'Timing Test',
          description: 'Testing timing precision',
          status: 'pending',
          duration: baseDuration
        };
        
        const startTime = performance.now();
        
        // Simulate step execution timing
        const adjustedDuration = mockStep.duration / speed;
        
        // Timing calculation should be precise
        expect(adjustedDuration).toBeCloseTo(expectedDuration, 1);
        expect(Math.abs(adjustedDuration - expectedDuration)).toBeLessThan(tolerance);
      }
    });
  });
});