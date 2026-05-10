/**
 * Test setup for brightchart-react-components.
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

// Register the BrightChart i18n component so that useBrightChartTranslation
// can resolve translations during tests.
import {
  getBrightChainI18nEngine,
  registerI18nComponentPackage,
} from '@brightchain/brightchain-lib';
import { createBrightChartComponentPackage } from '@brightchain/brightchart-lib';

// Ensure the engine is initialized, then register BrightChart
try {
  getBrightChainI18nEngine();
  registerI18nComponentPackage(createBrightChartComponentPackage());
} catch {
  // If engine initialization fails (e.g., missing dependencies), tests
  // that mock the hook will still work.
}
