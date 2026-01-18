// Full Node.js exports (includes all functionality)
// For browser-only exports, use './browser'
export * from './lib';

// Export constants with named exports for backward compatibility
export {
  CBL,
  default as CONSTANTS,
  FEC,
  JWT,
  SEALING,
  SITE,
  TUPLE,
} from './lib/constants';
export { EciesConfig } from './lib/ecies-config';
