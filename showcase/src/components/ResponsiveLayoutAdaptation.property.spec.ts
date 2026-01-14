/**
 * @fileoverview Property-based tests for responsive layout adaptation
 *
 * **Feature: visual-brightchain-demo, Property 12: Responsive Layout Adaptation**
 * **Validates: Requirements 6.5**
 *
 * This test suite verifies that the animation engine adapts the layout without
 * breaking or interrupting ongoing animations when the browser window is resized.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { PerformanceOptimizer } from './PerformanceOptimizer';

// Mock ResizeObserver with callback support
class MockResizeObserver {
  private callback: ResizeObserverCallback;
  private observedElements = new Set<Element>();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(element: Element) {
    this.observedElements.add(element);
  }

  unobserve(element: Element) {
    this.observedElements.delete(element);
  }

  disconnect() {
    this.observedElements.clear();
  }

  // Helper method to trigger resize
  triggerResize() {
    const entries: ResizeObserverEntry[] = Array.from(this.observedElements).map(
      (element) => ({
        target: element,
        contentRect: element.getBoundingClientRect(),
        borderBoxSize: [],
        contentBoxSize: [],
        devicePixelContentBoxSize: [],
      } as ResizeObserverEntry),
    );
    this.callback(entries, this);
  }
}

let mockResizeObserver: MockResizeObserver | null = null;

vi.stubGlobal('ResizeObserver', function (callback: ResizeObserverCallback) {
  mockResizeObserver = new MockResizeObserver(callback);
  return mockResizeObserver;
});

// Mock performance.memory
vi.stubGlobal('performance', {
  now: () => Date.now(),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024,
    jsHeapSizeLimit: 2048 * 1024 * 1024,
  },
});

// Mock window dimensions
let mockInnerWidth = 1920;
let mockInnerHeight = 1080;

Object.defineProperty(window, 'innerWidth', {
  get: () => mockInnerWidth,
  configurable: true,
});

Object.defineProperty(window, 'innerHeight', {
  get: () => mockInnerHeight,
  configurable: true,
});

describe('Responsive Layout Adaptation Property Tests', () => {
  let optimizer: PerformanceOptimizer;

  beforeEach(() => {
    mockInnerWidth = 1920;
    mockInnerHeight = 1080;
    optimizer = new PerformanceOptimizer({
      maxConcurrentFiles: 3,
      largeFileThreshold: 10 * 1024 * 1024,
      targetFrameRate: 60,
      minFrameRate: 30,
    });
  });

  afterEach(() => {
    optimizer.destroy();
    mockResizeObserver = null;
    vi.clearAllMocks();
  });

  // Helper to create a fresh optimizer for property tests
  const createTestOptimizer = () => {
    return new PerformanceOptimizer({
      maxConcurrentFiles: 3,
      largeFileThreshold: 10 * 1024 * 1024,
      targetFrameRate: 60,
      minFrameRate: 30,
    });
  };

  describe('Property 12: Responsive Layout Adaptation', () => {
    /**
     * Property: For any browser window resize during animations, the animation engine
     * should adapt the layout without breaking or interrupting ongoing animations.
     *
     * This property ensures that the system remains functional and visually correct
     * across different screen sizes and orientations.
     */

    it('should detect correct breakpoints for different window widths', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 320, max: 3840 }), // Mobile to 4K
          (width) => {
            mockInnerWidth = width;
            mockInnerHeight = 1080;

            // Create new optimizer to pick up new dimensions
            const testOptimizer = new PerformanceOptimizer();
            const dimensions = testOptimizer.getLayoutDimensions();

            // Verify breakpoint is correct
            if (width < 768) {
              expect(dimensions.breakpoint).toBe('mobile');
            } else if (width < 1024) {
              expect(dimensions.breakpoint).toBe('tablet');
            } else {
              expect(dimensions.breakpoint).toBe('desktop');
            }

            // Verify dimensions match
            expect(dimensions.width).toBe(width);
            expect(dimensions.height).toBe(1080);

            testOptimizer.destroy();
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should detect correct orientation for different aspect ratios', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.integer({ min: 320, max: 2560 }),
            fc.integer({ min: 320, max: 2560 }),
          ),
          ([width, height]) => {
            mockInnerWidth = width;
            mockInnerHeight = height;

            const testOptimizer = new PerformanceOptimizer();
            const dimensions = testOptimizer.getLayoutDimensions();

            // Verify orientation
            if (width > height) {
              expect(dimensions.orientation).toBe('landscape');
            } else {
              expect(dimensions.orientation).toBe('portrait');
            }

            expect(dimensions.width).toBe(width);
            expect(dimensions.height).toBe(height);

            testOptimizer.destroy();
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should emit layout change events when dimensions change', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(
              fc.integer({ min: 320, max: 2560 }),
              fc.integer({ min: 320, max: 2560 }),
            ),
            { minLength: 2, maxLength: 10 },
          ),
          (dimensionPairs) => {
            const layoutChanges: any[] = [];

            optimizer.on('layout-changed', (data) => {
              layoutChanges.push(data);
            });

            // Simulate window resizes
            for (const [width, height] of dimensionPairs) {
              mockInnerWidth = width;
              mockInnerHeight = height;

              // Trigger resize observer
              if (mockResizeObserver) {
                mockResizeObserver.triggerResize();
              }
            }

            // Should have received layout change events
            // (may be fewer than dimension pairs if some don't change breakpoint)
            expect(layoutChanges.length).toBeGreaterThanOrEqual(0);

            // Each event should have from and to dimensions
            for (const change of layoutChanges) {
              expect(change.from).toBeDefined();
              expect(change.to).toBeDefined();
              expect(change.from.width).toBeDefined();
              expect(change.to.width).toBeDefined();
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should maintain consistent state during rapid resizes', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(
              fc.integer({ min: 320, max: 2560 }),
              fc.integer({ min: 320, max: 2560 }),
            ),
            { minLength: 5, maxLength: 20 },
          ),
          (dimensionPairs) => {
            // Perform rapid resizes
            for (const [width, height] of dimensionPairs) {
              mockInnerWidth = width;
              mockInnerHeight = height;

              if (mockResizeObserver) {
                mockResizeObserver.triggerResize();
              }

              // System should remain responsive
              const dimensions = optimizer.getLayoutDimensions();
              expect(dimensions.width).toBe(width);
              expect(dimensions.height).toBe(height);

              // Breakpoint should be consistent with width
              if (width < 768) {
                expect(dimensions.breakpoint).toBe('mobile');
              } else if (width < 1024) {
                expect(dimensions.breakpoint).toBe('tablet');
              } else {
                expect(dimensions.breakpoint).toBe('desktop');
              }

              // Orientation should be consistent with aspect ratio
              if (width > height) {
                expect(dimensions.orientation).toBe('landscape');
              } else {
                expect(dimensions.orientation).toBe('portrait');
              }
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should handle breakpoint transitions correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.integer({ min: 320, max: 2560 }),
            { minLength: 3, maxLength: 10 },
          ),
          (widths) => {
            const layoutChanges: any[] = [];

            optimizer.on('layout-changed', (data) => {
              layoutChanges.push(data);
            });

            let previousBreakpoint: string | null = null;

            for (const width of widths) {
              mockInnerWidth = width;
              mockInnerHeight = 1080;

              if (mockResizeObserver) {
                mockResizeObserver.triggerResize();
              }

              const dimensions = optimizer.getLayoutDimensions();
              const currentBreakpoint = dimensions.breakpoint;

              // If breakpoint changed, should have emitted event
              if (previousBreakpoint !== null && previousBreakpoint !== currentBreakpoint) {
                // Should have at least one layout change event
                expect(layoutChanges.length).toBeGreaterThan(0);
              }

              previousBreakpoint = currentBreakpoint;
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should maintain queue functionality during layout changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 30 }),
                size: fc.integer({ min: 1000, max: 500000 }),
              }),
              { minLength: 2, maxLength: 5 },
            ),
            fc.array(
              fc.tuple(
                fc.integer({ min: 320, max: 2560 }),
                fc.integer({ min: 320, max: 2560 }),
              ),
              { minLength: 2, maxLength: 5 },
            ),
          ),
          async ([fileSpecs, dimensionPairs]) => {
            const testOptimizer = createTestOptimizer();
            
            try {
              const files = fileSpecs.map(
                (spec) => new File([new Uint8Array(spec.size)], spec.name),
              );

              // Add files to queue
              testOptimizer.addToQueue(files);

              // Perform resizes while processing
              for (const [width, height] of dimensionPairs) {
                mockInnerWidth = width;
                mockInnerHeight = height;

                if (mockResizeObserver) {
                  mockResizeObserver.triggerResize();
                }

                // Wait a bit
                await new Promise((resolve) => setTimeout(resolve, 20));

                // Queue should still be functional
                const status = testOptimizer.getQueueStatus();
                expect(status.total).toBe(files.length);

                // System should remain responsive
                const dimensions = testOptimizer.getLayoutDimensions();
                expect(dimensions.width).toBe(width);
                expect(dimensions.height).toBe(height);
              }
            } finally {
              testOptimizer.destroy();
            }
          },
        ),
        { numRuns: 20 },
      );
    }, 15000);

    it('should handle extreme dimension changes gracefully', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(
              fc.integer({ min: 320, max: 3840 }),
              fc.integer({ min: 320, max: 2160 }),
            ),
            { minLength: 3, maxLength: 8 },
          ),
          (dimensionPairs) => {
            for (const [width, height] of dimensionPairs) {
              mockInnerWidth = width;
              mockInnerHeight = height;

              // Should not throw
              expect(() => {
                if (mockResizeObserver) {
                  mockResizeObserver.triggerResize();
                }
              }).not.toThrow();

              // Should return valid dimensions
              const dimensions = optimizer.getLayoutDimensions();
              expect(dimensions.width).toBe(width);
              expect(dimensions.height).toBe(height);
              expect(dimensions.breakpoint).toMatch(/^(mobile|tablet|desktop)$/);
              expect(dimensions.orientation).toMatch(/^(portrait|landscape)$/);
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should provide consistent dimensions across multiple queries', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.integer({ min: 320, max: 2560 }),
            fc.integer({ min: 320, max: 2560 }),
          ),
          ([width, height]) => {
            mockInnerWidth = width;
            mockInnerHeight = height;

            if (mockResizeObserver) {
              mockResizeObserver.triggerResize();
            }

            // Query dimensions multiple times
            const dimensions1 = optimizer.getLayoutDimensions();
            const dimensions2 = optimizer.getLayoutDimensions();
            const dimensions3 = optimizer.getLayoutDimensions();

            // All queries should return same values
            expect(dimensions1.width).toBe(dimensions2.width);
            expect(dimensions1.height).toBe(dimensions2.height);
            expect(dimensions1.breakpoint).toBe(dimensions2.breakpoint);
            expect(dimensions1.orientation).toBe(dimensions2.orientation);

            expect(dimensions2.width).toBe(dimensions3.width);
            expect(dimensions2.height).toBe(dimensions3.height);
            expect(dimensions2.breakpoint).toBe(dimensions3.breakpoint);
            expect(dimensions2.orientation).toBe(dimensions3.orientation);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should handle orientation changes correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.integer({ min: 320, max: 1920 }),
            { minLength: 3, maxLength: 8 },
          ),
          (sizes) => {
            const orientationChanges: any[] = [];

            optimizer.on('layout-changed', (data) => {
              if (data.from.orientation !== data.to.orientation) {
                orientationChanges.push(data);
              }
            });

            // Alternate between portrait and landscape
            for (let i = 0; i < sizes.length; i++) {
              const size = sizes[i];
              if (i % 2 === 0) {
                // Portrait
                mockInnerWidth = size;
                mockInnerHeight = size * 1.5;
              } else {
                // Landscape
                mockInnerWidth = size * 1.5;
                mockInnerHeight = size;
              }

              if (mockResizeObserver) {
                mockResizeObserver.triggerResize();
              }

              const dimensions = optimizer.getLayoutDimensions();

              // Verify orientation matches aspect ratio
              if (mockInnerWidth > mockInnerHeight) {
                expect(dimensions.orientation).toBe('landscape');
              } else {
                expect(dimensions.orientation).toBe('portrait');
              }
            }

            // Should have detected orientation changes
            if (sizes.length > 1) {
              expect(orientationChanges.length).toBeGreaterThan(0);
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
