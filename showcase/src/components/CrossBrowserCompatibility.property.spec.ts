/**
 * @fileoverview Property-based tests for cross-browser compatibility
 * Feature: visual-brightchain-demo, Property 13: Cross-Browser Compatibility
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import {
  BrowserCompatibility,
  initializeBrowserCompatibility,
  getSafeRequestAnimationFrame,
  getSafeCancelAnimationFrame,
  getSafePerformanceNow,
} from './BrowserCompatibility';

describe('Property 13: Cross-Browser Compatibility', () => {
  beforeEach(() => {
    // Reset singleton instance for each test
    (BrowserCompatibility as any).instance = null;
  });

  /**
   * Property: Browser detection should always return valid browser information
   * For any browser environment, the compatibility system should detect and return
   * valid browser information with name, version, engine, platform, and mobile status.
   */
  it('should always detect valid browser information', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const compat = BrowserCompatibility.getInstance();
        const browserInfo = compat.getBrowserInfo();

        // Browser info should have all required fields
        expect(browserInfo).toHaveProperty('name');
        expect(browserInfo).toHaveProperty('version');
        expect(browserInfo).toHaveProperty('engine');
        expect(browserInfo).toHaveProperty('platform');
        expect(browserInfo).toHaveProperty('isMobile');

        // Fields should be strings
        expect(typeof browserInfo.name).toBe('string');
        expect(typeof browserInfo.version).toBe('string');
        expect(typeof browserInfo.engine).toBe('string');
        expect(typeof browserInfo.platform).toBe('string');
        expect(typeof browserInfo.isMobile).toBe('boolean');

        // Name should not be empty
        expect(browserInfo.name.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Feature detection should return consistent boolean values
   * For any feature check, the system should return a boolean value indicating
   * whether the feature is supported, and repeated checks should return the same value.
   */
  it('should return consistent feature support values', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const compat = BrowserCompatibility.getInstance();
        const features = compat.getFeatureSupport();

        // All feature flags should be booleans
        Object.values(features).forEach((value) => {
          expect(typeof value).toBe('boolean');
        });

        // Repeated calls should return the same values
        const features2 = compat.getFeatureSupport();
        expect(features).toEqual(features2);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Compatibility report should always be complete and valid
   * For any browser environment, the compatibility report should contain all required
   * sections (browser info, features, warnings, errors, recommendations) with valid data.
   */
  it('should generate complete and valid compatibility reports', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const compat = BrowserCompatibility.getInstance();
        const report = compat.generateReport();

        // Report should have all required sections
        expect(report).toHaveProperty('browser');
        expect(report).toHaveProperty('features');
        expect(report).toHaveProperty('warnings');
        expect(report).toHaveProperty('errors');
        expect(report).toHaveProperty('recommendedFallbacks');

        // Warnings, errors, and fallbacks should be arrays
        expect(Array.isArray(report.warnings)).toBe(true);
        expect(Array.isArray(report.errors)).toBe(true);
        expect(Array.isArray(report.recommendedFallbacks)).toBe(true);

        // All array items should be strings
        report.warnings.forEach((warning) => {
          expect(typeof warning).toBe('string');
          expect(warning.length).toBeGreaterThan(0);
        });

        report.errors.forEach((error) => {
          expect(typeof error).toBe('string');
          expect(error.length).toBeGreaterThan(0);
        });

        report.recommendedFallbacks.forEach((fallback) => {
          expect(typeof fallback).toBe('string');
          expect(fallback.length).toBeGreaterThan(0);
        });
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Animation strategy should match browser capabilities
   * For any browser environment, the recommended animation strategy should be
   * appropriate for the detected feature support (full > reduced > minimal > none).
   */
  it('should recommend appropriate animation strategy based on capabilities', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const compat = BrowserCompatibility.getInstance();
        const strategy = compat.getRecommendedAnimationStrategy();
        const features = compat.getFeatureSupport();

        // Strategy should be one of the valid options
        expect(['full', 'reduced', 'minimal', 'none']).toContain(strategy);

        // Strategy should match capabilities
        if (strategy === 'full') {
          // Full strategy requires advanced features
          expect(
            features.webAnimations || features.requestAnimationFrame
          ).toBe(true);
        } else if (strategy === 'reduced') {
          // Reduced strategy requires CSS animations
          expect(
            features.cssAnimations || features.cssTransitions
          ).toBe(true);
        } else if (strategy === 'minimal') {
          // Minimal strategy requires at least requestAnimationFrame
          expect(features.requestAnimationFrame).toBe(true);
        }
        // 'none' strategy has no requirements
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Graphics strategy should match browser capabilities
   * For any browser environment, the recommended graphics strategy should be
   * appropriate for the detected feature support (webgl > canvas > svg > css).
   */
  it('should recommend appropriate graphics strategy based on capabilities', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const compat = BrowserCompatibility.getInstance();
        const strategy = compat.getRecommendedGraphicsStrategy();
        const features = compat.getFeatureSupport();

        // Strategy should be one of the valid options
        expect(['webgl', 'canvas', 'svg', 'css']).toContain(strategy);

        // Strategy should match capabilities
        if (strategy === 'webgl') {
          expect(features.webgl).toBe(true);
        } else if (strategy === 'canvas') {
          expect(features.canvas).toBe(true);
          // If canvas is recommended, webgl should not be available
          expect(features.webgl).toBe(false);
        } else if (strategy === 'svg') {
          expect(features.svg).toBe(true);
          // If svg is recommended, canvas and webgl should not be available
          expect(features.canvas).toBe(false);
          expect(features.webgl).toBe(false);
        }
        // 'css' strategy is the fallback when nothing else is available
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Safe animation frame functions should always work
   * For any browser environment, the safe animation frame functions should provide
   * working implementations (either native or polyfilled) that can be called successfully.
   */
  it('should provide working animation frame functions', () => {
    fc.assert(
      fc.property(fc.integer(), () => {
        const requestFrame = getSafeRequestAnimationFrame();
        const cancelFrame = getSafeCancelAnimationFrame();

        // Functions should be callable
        expect(typeof requestFrame).toBe('function');
        expect(typeof cancelFrame).toBe('function');

        // requestAnimationFrame should return a handle
        let callbackExecuted = false;
        const handle = requestFrame(() => {
          callbackExecuted = true;
        });

        expect(typeof handle).toBe('number');

        // cancelAnimationFrame should accept the handle without throwing
        expect(() => cancelFrame(handle)).not.toThrow();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Safe performance.now should always return increasing timestamps
   * For any sequence of calls, performance.now should return monotonically increasing
   * or equal timestamps (time never goes backwards).
   */
  it('should provide monotonically increasing timestamps', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),
        (callCount) => {
          const performanceNow = getSafePerformanceNow();

          const timestamps: number[] = [];
          for (let i = 0; i < callCount; i++) {
            timestamps.push(performanceNow());
          }

          // All timestamps should be numbers
          timestamps.forEach((ts) => {
            expect(typeof ts).toBe('number');
            expect(ts).toBeGreaterThanOrEqual(0);
          });

          // Timestamps should be monotonically increasing or equal
          for (let i = 1; i < timestamps.length; i++) {
            expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Polyfills should be tracked correctly
   * For any browser environment, applied polyfills should be tracked and retrievable,
   * and the list should not contain duplicates.
   */
  it('should track applied polyfills without duplicates', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const compat = BrowserCompatibility.getInstance();
        const polyfills = compat.getAppliedPolyfills();

        // Polyfills should be an array
        expect(Array.isArray(polyfills)).toBe(true);

        // All items should be strings
        polyfills.forEach((polyfill) => {
          expect(typeof polyfill).toBe('string');
          expect(polyfill.length).toBeGreaterThan(0);
        });

        // No duplicates
        const uniquePolyfills = new Set(polyfills);
        expect(uniquePolyfills.size).toBe(polyfills.length);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Compatibility check should be consistent with report
   * For any browser environment, isFullyCompatible() should return false if and only if
   * the compatibility report contains errors.
   */
  it('should have consistent compatibility status with report', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const compat = BrowserCompatibility.getInstance();
        const isCompatible = compat.isFullyCompatible();
        const report = compat.generateReport();

        // isFullyCompatible should be false if there are errors
        if (report.errors.length > 0) {
          expect(isCompatible).toBe(false);
        } else {
          expect(isCompatible).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Feature support should be internally consistent
   * For any browser environment, feature support should follow logical dependencies
   * (e.g., if webAnimations is supported, requestAnimationFrame should also be supported).
   */
  it('should have internally consistent feature support', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const compat = BrowserCompatibility.getInstance();
        const features = compat.getFeatureSupport();

        // If webAnimations is supported, requestAnimationFrame should be too
        // (webAnimations is built on top of requestAnimationFrame)
        if (features.webAnimations) {
          expect(features.requestAnimationFrame).toBe(true);
        }

        // If subtleCrypto is supported, crypto should be too
        if (features.subtleCrypto) {
          expect(features.crypto).toBe(true);
        }

        // If webgl is supported, canvas should be too
        // (WebGL uses canvas as its rendering context)
        if (features.webgl) {
          expect(features.canvas).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Initialization should be idempotent
   * For any number of initialization calls, the system should return the same
   * singleton instance with consistent state.
   */
  it('should maintain singleton pattern across multiple initializations', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (initCount) => {
          const instances: BrowserCompatibility[] = [];

          for (let i = 0; i < initCount; i++) {
            instances.push(initializeBrowserCompatibility());
          }

          // All instances should be the same object
          for (let i = 1; i < instances.length; i++) {
            expect(instances[i]).toBe(instances[0]);
          }

          // All instances should have the same state
          const firstReport = instances[0].generateReport();
          for (let i = 1; i < instances.length; i++) {
            const report = instances[i].generateReport();
            expect(report).toEqual(firstReport);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Browser info should remain stable across multiple accesses
   * For any browser environment, repeated calls to getBrowserInfo should return
   * the same information (browser doesn't change during execution).
   */
  it('should return stable browser information across multiple accesses', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),
        (accessCount) => {
          const compat = BrowserCompatibility.getInstance();
          const browserInfos: any[] = [];

          for (let i = 0; i < accessCount; i++) {
            browserInfos.push(compat.getBrowserInfo());
          }

          // All browser info objects should be equal
          for (let i = 1; i < browserInfos.length; i++) {
            expect(browserInfos[i]).toEqual(browserInfos[0]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Feature checks should not throw errors
   * For any feature name, checking if it's supported should never throw an error,
   * even for invalid feature names.
   */
  it('should handle feature checks gracefully without throwing', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (featureName) => {
          const compat = BrowserCompatibility.getInstance();

          // Should not throw for any string input
          expect(() => {
            compat.isFeatureSupported(featureName as any);
          }).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });
});
