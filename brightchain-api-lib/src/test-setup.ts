import { blockLogger, SecurityAuditLogger } from '@brightchain/brightchain-lib';
import { webcrypto } from 'crypto';
import {
  GlobalActiveContext,
  I18nEngine,
  LanguageRegistry,
} from '@digitaldefiance/i18n-lib';
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

if (!LanguageRegistry.has('en-US')) {
  LanguageRegistry.register(testLang);
}
if (!I18nEngine.hasInstance()) {
  new I18nEngine([testLang]);
}

// Ensure the GlobalActiveContext default context exists.
// The upstream authenticateToken middleware accesses
// `context.adminTimezone.constructor` which throws if the context map is
// empty, causing spurious 403/500 errors under parallel test workers.
const ctx = GlobalActiveContext.getInstance();
try {
  ctx.context;
} catch {
  ctx.createContext('en-US');
}

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
