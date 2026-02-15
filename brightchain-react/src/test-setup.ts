/**
 * Test setup for brightchain-react.
 * Polyfills Node.js globals that jsdom doesn't provide but are needed
 * by dependencies like ecies-lib.
 */
import { TextDecoder, TextEncoder } from 'util';

if (typeof globalThis.TextEncoder === 'undefined') {
  Object.assign(globalThis, {
    TextEncoder,
    TextDecoder,
  });
}
