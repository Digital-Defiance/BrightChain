// Full Node.js exports (includes all functionality)
// For browser-only exports, use './browser'
export * from './lib';

// Export constants with named exports for backward compatibility
export { default as CONSTANTS, CBL, FEC, TUPLE, SEALING, JWT, SITE } from './lib/constants';
export { EciesConfig } from './lib/ecies-config';
