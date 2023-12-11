import { blockLogger, SecurityAuditLogger } from '@brightchain/brightchain-lib';
import {
  GlobalActiveContext,
  I18nEngine,
  LanguageRegistry,
} from '@digitaldefiance/i18n-lib';
import { webcrypto } from 'crypto';
import 'reflect-metadata';
import './lib/testUtils';

// Bootstrap i18n so the setGlobalContextLanguageFromRequest middleware
// (called inside BaseController's route pipeline) does not
// throw "No default language configured".
const testLang = {
  id: 'en-US',
  code: 'en-US',
  name: 'English (US)',
  nativeName: 'English',
  isDefault: true,
};

/**
 * Re-ensure the i18n subsystem is fully bootstrapped.
 *
 * CJS singletons (LanguageRegistry, GlobalActiveContext, I18nEngine) are
 * shared across all test files that run in the same Jest worker because
 * they live in Node's native require() cache. A test file running earlier
 * in the same worker can leave these singletons in a partially-reset state
 * (e.g. after calling I18nEngine.removeInstance()). This function restores
 * the minimum state required by the setGlobalContextLanguageFromRequest
 * middleware before every single test.
 */
function ensureI18nGlobalState(): void {
  if (!LanguageRegistry.has('en-US')) {
    LanguageRegistry.register(testLang);
  }
  if (!I18nEngine.hasInstance()) {
    new I18nEngine([testLang]);
  }
  const ctx = GlobalActiveContext.getInstance();
  try {
    ctx.context;
  } catch {
    ctx.createContext('en-US');
  }
}

// Run once at module load time.
ensureI18nGlobalState();

// Run before every test so that state corrupted by a preceding test file
// in the same worker is always repaired before the next test begins.
beforeEach(() => {
  ensureI18nGlobalState();
});

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

// Ensure tests that initialize the database use the in-memory store by default.
// Individual tests that need a different store can override this.
// Without this (or BRIGHTCHAIN_BLOCKSTORE_PATH), brightchainDatabaseInit throws
// "Neither DEV_DATABASE nor BRIGHTCHAIN_BLOCKSTORE_PATH is set."
process.env['DEV_DATABASE'] = process.env['DEV_DATABASE'] ?? 'jest-ephemeral';

process.env['API_PROTOCOL'] = process.env['API_PROTOCOL'] ?? 'http';
process.env['PUBLIC_HOST'] = process.env['PUBLIC_HOST'] ?? 'localhost';
process.env['SERVER_URL'] =
  process.env['SERVER_URL'] ?? 'http://localhost:3000';
