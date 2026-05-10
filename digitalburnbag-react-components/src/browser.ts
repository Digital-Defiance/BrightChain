/**
 * Browser-safe entry point for @brightchain/digitalburnbag-react-components.
 *
 * All submodules are browser-safe:
 * - lib/components  — React/MUI UI components
 * - lib/crypto      — Web Crypto API (crypto.subtle), not Node.js crypto
 * - lib/interfaces  — TypeScript types only
 * - lib/pages       — React page components
 * - lib/services    — fetch()-based API client
 */
export * from './lib/components';
export * from './lib/crypto';
export type * from './lib/interfaces';
export * from './lib/pages';
export * from './lib/services';
