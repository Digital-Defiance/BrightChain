import { TextDecoder, TextEncoder } from 'util';

// Polyfill TextEncoder/TextDecoder for jsdom environment
// Required because brightchain-lib transitively imports ecies-lib which uses TextEncoder
if (typeof globalThis.TextEncoder === 'undefined') {
  Object.assign(globalThis, {
    TextEncoder,
    TextDecoder,
  });
}

import '@testing-library/jest-dom';
