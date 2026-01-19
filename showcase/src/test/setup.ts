/**
 * Test setup for Vitest
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {
    // Mock constructor
  }
  disconnect() {
    // Mock disconnect
  }
  observe() {
    // Mock observe
  }
  takeRecords() {
    return [];
  }
  unobserve() {
    // Mock unobserve
  }
} as unknown as typeof IntersectionObserver;

// Ensure requestAnimationFrame and cancelAnimationFrame are available
if (typeof window.requestAnimationFrame === 'undefined') {
  let frameId = 0;
  window.requestAnimationFrame = (callback: FrameRequestCallback) => {
    const id = ++frameId;
    setTimeout(() => callback(Date.now()), 16);
    return id;
  };
  window.cancelAnimationFrame = (_id: number) => {
    // No-op for tests
  };
} else {
  // Wrap existing requestAnimationFrame to ensure it returns a number
  const originalRAF = window.requestAnimationFrame;
  let frameId = 0;
  window.requestAnimationFrame = (callback: FrameRequestCallback) => {
    try {
      const result = originalRAF.call(window, callback);
      // If result is a number, return it; otherwise return our own ID
      return typeof result === 'number' ? result : ++frameId;
    } catch {
      // Fallback
      const id = ++frameId;
      setTimeout(() => callback(Date.now()), 16);
      return id;
    }
  };
}

// Mock HTMLCanvasElement.getContext for cross-browser tests
HTMLCanvasElement.prototype.getContext = vi
  .fn()
  .mockImplementation((contextType: string) => {
    if (contextType === '2d') {
      return {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        globalAlpha: 1,
        shadowBlur: 0,
        shadowColor: '',
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        beginPath: vi.fn(),
        closePath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        scale: vi.fn(),
        drawImage: vi.fn(),
        getImageData: vi.fn(),
        putImageData: vi.fn(),
        createLinearGradient: vi.fn(),
        createRadialGradient: vi.fn(),
        createPattern: vi.fn(),
        measureText: vi.fn(() => ({ width: 0 })),
        canvas: {} as HTMLCanvasElement,
      };
    } else if (contextType === 'webgl' || contextType === 'webgl2') {
      return {
        getParameter: vi.fn(),
        getExtension: vi.fn(),
        getSupportedExtensions: vi.fn(() => []),
        canvas: {} as HTMLCanvasElement,
      };
    }
    return null;
  }) as unknown as typeof HTMLCanvasElement.prototype.getContext;

// Mock crypto.randomUUID for GUID generation
Object.defineProperty(global.crypto, 'randomUUID', {
  value: () => {
    // Generate a valid UUID v4
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    // Set version (4) and variant bits
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(
      '',
    );
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  },
  writable: true,
  configurable: true,
});

// Mock crypto.getRandomValues for tests
Object.defineProperty(global, 'crypto', {
  value: {
    ...global.crypto,
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    randomUUID: global.crypto.randomUUID,
    subtle: {
      digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
    },
  },
});

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
global.console = {
  ...originalConsole,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};
