/**
 * @fileoverview React hook for accessing browser compatibility information
 */

import { useState } from 'react';
import {
  BrowserCompatibility,
  BrowserInfo,
  CompatibilityReport,
  FeatureSupport,
} from './BrowserCompatibility';

/**
 * Hook to access browser compatibility information
 */
export function useBrowserCompatibility() {
  const [compat] = useState(() => BrowserCompatibility.getInstance());
  const [browserInfo] = useState<BrowserInfo>(() => compat.getBrowserInfo());
  const [featureSupport] = useState<FeatureSupport>(() =>
    compat.getFeatureSupport(),
  );
  const [report] = useState<CompatibilityReport>(() => compat.generateReport());

  return {
    compat,
    browserInfo,
    featureSupport,
    report,
    isFullyCompatible: compat.isFullyCompatible(),
    animationStrategy: compat.getRecommendedAnimationStrategy(),
    graphicsStrategy: compat.getRecommendedGraphicsStrategy(),
  };
}

/**
 * Hook to check if a specific feature is supported
 */
export function useFeatureSupport(feature: keyof FeatureSupport): boolean {
  const compat = BrowserCompatibility.getInstance();
  return compat.isFeatureSupported(feature);
}

/**
 * Hook to get safe animation frame functions
 */
export function useSafeAnimationFrame() {
  const compat = BrowserCompatibility.getInstance();
  const hasRAF = compat.isFeatureSupported('requestAnimationFrame');

  const requestFrame = (callback: FrameRequestCallback): number => {
    if (hasRAF) {
      return window.requestAnimationFrame(callback);
    }
    return window.setTimeout(
      () => callback(Date.now()),
      16,
    ) as unknown as number;
  };

  const cancelFrame = (handle: number): void => {
    if (hasRAF) {
      window.cancelAnimationFrame(handle);
    } else {
      window.clearTimeout(handle);
    }
  };

  return { requestFrame, cancelFrame };
}

/**
 * Hook to get safe performance.now function
 */
export function useSafePerformanceNow(): () => number {
  const compat = BrowserCompatibility.getInstance();
  const hasPerformanceNow = compat.isFeatureSupported('performanceNow');

  if (hasPerformanceNow) {
    return () => performance.now();
  }

  const [startTime] = useState(() => Date.now());
  return () => Date.now() - startTime;
}
