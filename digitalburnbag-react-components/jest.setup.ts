import { TextDecoder, TextEncoder } from 'util';

// Polyfill TextEncoder/TextDecoder for jsdom environment
if (typeof globalThis.TextEncoder === 'undefined') {
  Object.assign(globalThis, {
    TextEncoder,
    TextDecoder,
  });
}

import '@testing-library/jest-dom';
