// test-setup.ts — Jest setup for brightledger-assets-react-components
// Polyfills + module mocks required before test suites run.

// Polyfill TextEncoder / TextDecoder for JSDOM environments
import { TextDecoder, TextEncoder } from 'util';
if (typeof globalThis.TextEncoder === 'undefined') {
  (globalThis as Record<string, unknown>).TextEncoder = TextEncoder;
  (globalThis as Record<string, unknown>).TextDecoder = TextDecoder;
}
