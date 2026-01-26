import { blockLogger, SecurityAuditLogger } from '@brightchain/brightchain-lib';
import { webcrypto } from 'crypto';
import './lib/testUtils';

// Polyfill Web Crypto API for Node.js test environment
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: false,
    configurable: true,
  });
}

// Silence security audit logs and block logs during tests
SecurityAuditLogger.getInstance().silent = true;
blockLogger.silent = true;
