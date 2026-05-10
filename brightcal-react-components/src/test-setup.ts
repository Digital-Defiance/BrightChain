/**
 * Test setup for brightcal-react-components.
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

// Global mock for the i18n hook used by all BrightCal components.
// Returns the branded string key as-is so tests can assert on keys.
jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tComponent: (_componentId: string, key: string) => key,
    t: (key: string) => key,
    tBranded: (key: string) => key,
    changeLanguage: jest.fn(),
    currentLanguage: 'en-US',
  }),
}));
