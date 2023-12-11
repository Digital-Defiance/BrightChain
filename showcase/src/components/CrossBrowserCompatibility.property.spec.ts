/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @fileoverview Tests for cross-browser compatibility
 * Feature: visual-brightchain-demo, Property 13: Cross-Browser Compatibility
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5
 *
 * Tests that use deterministic singleton state are plain unit tests.
 * Tests that benefit from varied input use fast-check with real arbitraries.
 */

import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BrowserCompatibility,
  getSafeCancelAnimationFrame,
  getSafePerformanceNow,
  getSafeRequestAnimationFrame,
  initializeBrowserCompatibility,
} from './BrowserCompatibility';

describe('Property 13: Cross-Browser Compatibility', () => {
  beforeEach(() => {
    // Reset singleton instance for each test
    (BrowserCompatibility as any).instance = null;
    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    vi.spyOn(console, 'table').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should detect valid browser information with all required fields', () => {
    const compat = BrowserCompatibility.getInstance();
    const browserInfo = compat.getBrowserInfo();

    expect(typeof browserInfo.name).toBe('string');
    expect(typeof browserInfo.version).toBe('string');
    expect(typeof browserInfo.engine).toBe('string');
    expect(typeof browserInfo.platform).toBe('string');
    expect(typeof browserInfo.isMobile).toBe('boolean');
    expect(browserInfo.name.length).toBeGreaterThan(0);
  });

  it('should return consistent feature support values across repeated calls', () => {
    const compat = BrowserCompatibility.getInstance();
    const features1 = compat.getFeatureSupport();
    const features2 = compat.getFeatureSupport();

    // All feature flags should be booleans
    Object.values(features1).forEach((value) => {
      expect(typeof value).toBe('boolean');
    });

    // Repeated calls return identical results
    expect(features1).toEqual(features2);
  });

  it('should generate a complete compatibility report', () => {
    const compat = BrowserCompatibility.getInstance();
    const report = compat.generateReport();

    expect(report).toHaveProperty('browser');
    expect(report).toHaveProperty('features');
    expect(Array.isArray(report.warnings)).toBe(true);
    expect(Array.isArray(report.errors)).toBe(true);
    expect(Array.isArray(report.recommendedFallbacks)).toBe(true);

    // All array items should be non-empty strings
    for (const warning of report.warnings) {
      expect(typeof warning).toBe('string');
      expect(warning.length).toBeGreaterThan(0);
    }
    for (const error of report.errors) {
      expect(typeof error).toBe('string');
      expect(error.length).toBeGreaterThan(0);
    }
  });

  it('should recommend animation strategy consistent with feature support', () => {
    const compat = BrowserCompatibility.getInstance();
    const strategy = compat.getRecommendedAnimationStrategy();
    const features = compat.getFeatureSupport();

    expect(['full', 'reduced', 'minimal', 'none']).toContain(strategy);

    if (strategy === 'full') {
      expect(
        features.webAnimations || features.requestAnimationFrame,
      ).toBe(true);
    } else if (strategy === 'reduced') {
      expect(
        features.cssAnimations || features.cssTransitions,
      ).toBe(true);
    } else if (strategy === 'minimal') {
      expect(features.requestAnimationFrame).toBe(true);
    }
  });

  it('should recommend graphics strategy consistent with feature support', () => {
    const compat = BrowserCompatibility.getInstance();
    const strategy = compat.getRecommendedGraphicsStrategy();
    const features = compat.getFeatureSupport();

    expect(['webgl', 'canvas', 'svg', 'css']).toContain(strategy);

    if (strategy === 'webgl') {
      expect(features.webgl).toBe(true);
    } else if (strategy === 'canvas') {
      expect(features.canvas).toBe(true);
      expect(features.webgl).toBe(false);
    } else if (strategy === 'svg') {
      expect(features.svg).toBe(true);
      expect(features.canvas).toBe(false);
    }
  });

  it('should provide working safe animation frame functions', () => {
    const requestFrame = getSafeRequestAnimationFrame();
    const cancelFrame = getSafeCancelAnimationFrame();

    expect(typeof requestFrame).toBe('function');
    expect(typeof cancelFrame).toBe('function');

    const handle = requestFrame(() => {});
    expect(typeof handle).toBe('number');
    expect(() => cancelFrame(handle)).not.toThrow();
  });

  it('should provide monotonically increasing timestamps', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 10 }), (callCount) => {
        const performanceNow = getSafePerformanceNow();
        const timestamps: number[] = [];
        for (let i = 0; i < callCount; i++) {
          timestamps.push(performanceNow());
        }

        for (const ts of timestamps) {
          expect(typeof ts).toBe('number');
          expect(ts).toBeGreaterThanOrEqual(0);
        }

        for (let i = 1; i < timestamps.length; i++) {
          expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
        }
      }),
      { numRuns: 20 },
    );
  });

  it('should track applied polyfills without duplicates', () => {
    const compat = BrowserCompatibility.getInstance();
    const polyfills = compat.getAppliedPolyfills();

    expect(Array.isArray(polyfills)).toBe(true);
    for (const p of polyfills) {
      expect(typeof p).toBe('string');
      expect(p.length).toBeGreaterThan(0);
    }
    expect(new Set(polyfills).size).toBe(polyfills.length);
  });

  it('should have isFullyCompatible consistent with report errors', () => {
    const compat = BrowserCompatibility.getInstance();
    const isCompatible = compat.isFullyCompatible();
    const report = compat.generateReport();

    if (report.errors.length > 0) {
      expect(isCompatible).toBe(false);
    } else {
      expect(isCompatible).toBe(true);
    }
  });

  it('should have internally consistent feature dependencies', () => {
    const compat = BrowserCompatibility.getInstance();
    const features = compat.getFeatureSupport();

    if (features.webAnimations) {
      expect(features.requestAnimationFrame).toBe(true);
    }
    if (features.subtleCrypto) {
      expect(features.crypto).toBe(true);
    }
    if (features.webgl) {
      expect(features.canvas).toBe(true);
    }
  });

  it('should maintain singleton across multiple initializations', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10 }), (initCount) => {
        const instances: BrowserCompatibility[] = [];
        for (let i = 0; i < initCount; i++) {
          instances.push(initializeBrowserCompatibility());
        }

        for (let i = 1; i < instances.length; i++) {
          expect(instances[i]).toBe(instances[0]);
        }
      }),
      { numRuns: 10 },
    );
  });

  it('should handle arbitrary feature name checks without throwing', () => {
    fc.assert(
      fc.property(fc.string(), (featureName) => {
        const compat = BrowserCompatibility.getInstance();
        expect(() => {
          compat.isFeatureSupported(featureName as any);
        }).not.toThrow();
      }),
      { numRuns: 50 },
    );
  });
});
