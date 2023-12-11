/**
 * Browser polyfills for Node.js globals required by transitive dependencies
 * (e.g. bloom-filters uses Buffer).
 *
 * This file MUST be imported before any other module in main.tsx.
 */
import { Buffer } from 'buffer';

if (typeof globalThis.Buffer === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).Buffer = Buffer;
}
