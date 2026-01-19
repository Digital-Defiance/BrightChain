/**
 * @fileoverview Browser compatibility detection and polyfill system
 * Implements feature detection for animation capabilities, provides polyfills
 * for missing browser features, and creates graceful fallbacks for unsupported features.
 */

export interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  platform: string;
  isMobile: boolean;
}

export interface FeatureSupport {
  // Animation features
  requestAnimationFrame: boolean;
  cssAnimations: boolean;
  cssTransitions: boolean;
  webAnimations: boolean;

  // Modern APIs
  resizeObserver: boolean;
  intersectionObserver: boolean;
  mutationObserver: boolean;

  // Graphics features
  canvas: boolean;
  webgl: boolean;
  svg: boolean;

  // Storage features
  localStorage: boolean;
  sessionStorage: boolean;
  indexedDB: boolean;

  // File APIs
  fileReader: boolean;
  blob: boolean;
  url: boolean;

  // Performance APIs
  performanceNow: boolean;
  performanceMemory: boolean;

  // ES6+ features
  promises: boolean;
  asyncAwait: boolean;
  modules: boolean;
  weakMap: boolean;

  // Crypto
  crypto: boolean;
  subtleCrypto: boolean;
}

export interface CompatibilityReport {
  browser: BrowserInfo;
  features: FeatureSupport;
  warnings: string[];
  errors: string[];
  recommendedFallbacks: string[];
}

/**
 * Browser compatibility detection and management system
 */
export class BrowserCompatibility {
  private static instance: BrowserCompatibility | null = null;
  private browserInfo: BrowserInfo;
  private featureSupport: FeatureSupport;
  private polyfillsApplied: Set<string> = new Set();

  private constructor() {
    this.browserInfo = this.detectBrowser();
    this.featureSupport = this.detectFeatures();
    this.applyPolyfills();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): BrowserCompatibility {
    if (!BrowserCompatibility.instance) {
      BrowserCompatibility.instance = new BrowserCompatibility();
    }
    return BrowserCompatibility.instance;
  }

  /**
   * Detect browser information
   */
  private detectBrowser(): BrowserInfo {
    const ua = navigator.userAgent;
    const platform = navigator.platform || 'unknown';

    let name = 'Unknown';
    let version = 'Unknown';
    let engine = 'Unknown';

    // Detect browser name and version
    if (ua.includes('Firefox/')) {
      name = 'Firefox';
      version = ua.match(/Firefox\/(\d+\.\d+)/)?.[1] || 'Unknown';
      engine = 'Gecko';
    } else if (ua.includes('Edg/')) {
      name = 'Edge';
      version = ua.match(/Edg\/(\d+\.\d+)/)?.[1] || 'Unknown';
      engine = 'Blink';
    } else if (ua.includes('Chrome/')) {
      name = 'Chrome';
      version = ua.match(/Chrome\/(\d+\.\d+)/)?.[1] || 'Unknown';
      engine = 'Blink';
    } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
      name = 'Safari';
      version = ua.match(/Version\/(\d+\.\d+)/)?.[1] || 'Unknown';
      engine = 'WebKit';
    }

    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

    return { name, version, engine, platform, isMobile };
  }

  /**
   * Detect feature support
   */
  private detectFeatures(): FeatureSupport {
    return {
      // Animation features
      requestAnimationFrame: typeof window.requestAnimationFrame === 'function',
      cssAnimations: this.checkCSSFeature('animation'),
      cssTransitions: this.checkCSSFeature('transition'),
      webAnimations:
        typeof Element !== 'undefined' &&
        typeof Element.prototype.animate === 'function',

      // Modern APIs
      resizeObserver: typeof ResizeObserver !== 'undefined',
      intersectionObserver: typeof IntersectionObserver !== 'undefined',
      mutationObserver: typeof MutationObserver !== 'undefined',

      // Graphics features
      canvas: this.checkCanvasSupport(),
      webgl: this.checkWebGLSupport(),
      svg: typeof SVGElement !== 'undefined',

      // Storage features
      localStorage: this.checkStorageSupport('localStorage'),
      sessionStorage: this.checkStorageSupport('sessionStorage'),
      indexedDB: typeof indexedDB !== 'undefined',

      // File APIs
      fileReader: typeof FileReader !== 'undefined',
      blob: typeof Blob !== 'undefined',
      url:
        typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function',

      // Performance APIs
      performanceNow:
        typeof performance !== 'undefined' &&
        typeof performance.now === 'function',
      performanceMemory:
        typeof performance !== 'undefined' && 'memory' in performance,

      // ES6+ features
      promises: typeof Promise !== 'undefined',
      asyncAwait: this.checkAsyncAwaitSupport(),
      modules: this.checkModuleSupport(),
      weakMap: typeof WeakMap !== 'undefined',

      // Crypto
      crypto: typeof crypto !== 'undefined',
      subtleCrypto:
        typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined',
    };
  }

  /**
   * Check CSS feature support
   */
  private checkCSSFeature(feature: string): boolean {
    if (typeof document === 'undefined') return false;

    const element = document.createElement('div');
    const style = element.style;

    const prefixes = ['', 'webkit', 'moz', 'ms', 'o'];
    for (const prefix of prefixes) {
      const prop = prefix
        ? prefix + feature.charAt(0).toUpperCase() + feature.slice(1)
        : feature;
      if (prop in style) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check canvas support
   */
  private checkCanvasSupport(): boolean {
    if (typeof document === 'undefined') return false;

    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext && canvas.getContext('2d'));
    } catch {
      return false;
    }
  }

  /**
   * Check WebGL support
   */
  private checkWebGLSupport(): boolean {
    if (typeof document === 'undefined') return false;

    try {
      const canvas = document.createElement('canvas');
      return !!(
        canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      );
    } catch {
      return false;
    }
  }

  /**
   * Check storage support
   */
  private checkStorageSupport(
    type: 'localStorage' | 'sessionStorage',
  ): boolean {
    try {
      const storage = window[type];
      const testKey = '__storage_test__';
      storage.setItem(testKey, 'test');
      storage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check async/await support
   */
  private checkAsyncAwaitSupport(): boolean {
    try {
      new Function('return (async () => {})()')();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check module support
   */
  private checkModuleSupport(): boolean {
    const script = document.createElement('script');
    return 'noModule' in script;
  }

  /**
   * Apply polyfills for missing features
   */
  private applyPolyfills(): void {
    // Polyfill requestAnimationFrame
    if (!this.featureSupport.requestAnimationFrame) {
      this.polyfillRequestAnimationFrame();
    }

    // Polyfill performance.now
    if (!this.featureSupport.performanceNow) {
      this.polyfillPerformanceNow();
    }

    // Polyfill Promise (if needed)
    if (!this.featureSupport.promises) {
      console.warn('Promise not supported - some features may not work');
    }
  }

  /**
   * Polyfill requestAnimationFrame
   */
  private polyfillRequestAnimationFrame(): void {
    let lastTime = 0;

    const win = window as typeof window & {
      requestAnimationFrame?: (callback: FrameRequestCallback) => number;
      cancelAnimationFrame?: (id: number) => void;
    };

    win.requestAnimationFrame = (callback: FrameRequestCallback) => {
      const currentTime = Date.now();
      const timeToCall = Math.max(0, 16 - (currentTime - lastTime));
      const id = window.setTimeout(() => {
        callback(currentTime + timeToCall);
      }, timeToCall);
      lastTime = currentTime + timeToCall;
      return id;
    };

    win.cancelAnimationFrame = (id: number) => {
      clearTimeout(id);
    };

    this.polyfillsApplied.add('requestAnimationFrame');
    console.log('Applied requestAnimationFrame polyfill');
  }

  /**
   * Polyfill performance.now
   */
  private polyfillPerformanceNow(): void {
    if (typeof performance === 'undefined') {
      const win = window as typeof window & { performance?: Performance };
      win.performance = {} as Performance;
    }

    const startTime = Date.now();
    performance.now = () => Date.now() - startTime;

    this.polyfillsApplied.add('performance.now');
    console.log('Applied performance.now polyfill');
  }

  /**
   * Get browser information
   */
  getBrowserInfo(): BrowserInfo {
    return { ...this.browserInfo };
  }

  /**
   * Get feature support information
   */
  getFeatureSupport(): FeatureSupport {
    return { ...this.featureSupport };
  }

  /**
   * Check if specific feature is supported
   */
  isFeatureSupported(feature: keyof FeatureSupport): boolean {
    return this.featureSupport[feature];
  }

  /**
   * Get list of applied polyfills
   */
  getAppliedPolyfills(): string[] {
    return Array.from(this.polyfillsApplied);
  }

  /**
   * Generate compatibility report
   */
  generateReport(): CompatibilityReport {
    const warnings: string[] = [];
    const errors: string[] = [];
    const recommendedFallbacks: string[] = [];

    // Check critical features
    if (!this.featureSupport.requestAnimationFrame) {
      warnings.push(
        'requestAnimationFrame not supported - animations may be choppy',
      );
      recommendedFallbacks.push(
        'Use CSS animations instead of JavaScript animations',
      );
    }

    if (
      !this.featureSupport.cssAnimations &&
      !this.featureSupport.cssTransitions
    ) {
      errors.push(
        'No animation support detected - visual effects will be disabled',
      );
      recommendedFallbacks.push('Display static content only');
    }

    if (!this.featureSupport.canvas) {
      warnings.push('Canvas not supported - particle effects will be disabled');
      recommendedFallbacks.push('Use SVG for graphics instead of canvas');
    }

    if (!this.featureSupport.fileReader) {
      errors.push('FileReader not supported - file upload will not work');
    }

    if (!this.featureSupport.localStorage) {
      warnings.push('localStorage not supported - settings will not persist');
      recommendedFallbacks.push('Use in-memory storage only');
    }

    if (!this.featureSupport.promises) {
      errors.push(
        'Promises not supported - application may not function correctly',
      );
    }

    if (!this.featureSupport.crypto) {
      warnings.push(
        'Crypto API not supported - some security features may be limited',
      );
    }

    return {
      browser: this.browserInfo,
      features: this.featureSupport,
      warnings,
      errors,
      recommendedFallbacks,
    };
  }

  /**
   * Check if browser is fully compatible
   */
  isFullyCompatible(): boolean {
    const report = this.generateReport();
    return report.errors.length === 0;
  }

  /**
   * Get recommended animation strategy based on browser capabilities
   */
  getRecommendedAnimationStrategy(): 'full' | 'reduced' | 'minimal' | 'none' {
    if (
      this.featureSupport.webAnimations &&
      this.featureSupport.requestAnimationFrame
    ) {
      return 'full';
    }

    if (
      this.featureSupport.cssAnimations ||
      this.featureSupport.cssTransitions
    ) {
      return 'reduced';
    }

    if (this.featureSupport.requestAnimationFrame) {
      return 'minimal';
    }

    return 'none';
  }

  /**
   * Get recommended graphics strategy based on browser capabilities
   */
  getRecommendedGraphicsStrategy(): 'webgl' | 'canvas' | 'svg' | 'css' {
    if (this.featureSupport.webgl) {
      return 'webgl';
    }

    if (this.featureSupport.canvas) {
      return 'canvas';
    }

    if (this.featureSupport.svg) {
      return 'svg';
    }

    return 'css';
  }

  /**
   * Log compatibility report to console
   */
  logReport(): void {
    const report = this.generateReport();

    console.group('Browser Compatibility Report');
    console.table({
      Browser: report.browser.name,
      Version: report.browser.version,
      Engine: report.browser.engine,
      Platform: report.browser.platform,
      Mobile: report.browser.isMobile,
    });

    if (report.warnings.length > 0) {
      console.warn('Warnings:', report.warnings);
    }

    if (report.errors.length > 0) {
      console.error('Errors:', report.errors);
    }

    if (report.recommendedFallbacks.length > 0) {
      console.log('Recommended Fallbacks:', report.recommendedFallbacks);
    }

    console.log('Applied Polyfills:', this.getAppliedPolyfills());
    console.log('Animation Strategy:', this.getRecommendedAnimationStrategy());
    console.log('Graphics Strategy:', this.getRecommendedGraphicsStrategy());
    console.groupEnd();
  }
}

/**
 * Initialize browser compatibility system
 */
export function initializeBrowserCompatibility(): BrowserCompatibility {
  const compat = BrowserCompatibility.getInstance();

  // Log report in development mode
  if (import.meta.env.DEV) {
    compat.logReport();
  }

  return compat;
}

/**
 * Get safe animation frame function (with fallback)
 */
export function getSafeRequestAnimationFrame(): (
  callback: FrameRequestCallback,
) => number {
  const compat = BrowserCompatibility.getInstance();

  if (compat.isFeatureSupported('requestAnimationFrame')) {
    return window.requestAnimationFrame.bind(window);
  }

  // Fallback to setTimeout with proper number return
  let timeoutId = 0;
  return (callback: FrameRequestCallback) => {
    const id = ++timeoutId;
    setTimeout(() => callback(Date.now()), 16);
    return id;
  };
}

/**
 * Get safe cancel animation frame function (with fallback)
 */
export function getSafeCancelAnimationFrame(): (handle: number) => void {
  const compat = BrowserCompatibility.getInstance();

  if (compat.isFeatureSupported('requestAnimationFrame')) {
    return window.cancelAnimationFrame.bind(window);
  }

  // Fallback to clearTimeout
  return (handle: number) => {
    window.clearTimeout(handle);
  };
}

/**
 * Get safe performance.now function (with fallback)
 */
export function getSafePerformanceNow(): () => number {
  const compat = BrowserCompatibility.getInstance();

  if (compat.isFeatureSupported('performanceNow')) {
    return performance.now.bind(performance);
  }

  // Fallback to Date.now
  const startTime = Date.now();
  return () => Date.now() - startTime;
}
