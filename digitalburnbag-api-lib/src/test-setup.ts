// Test setup for digitalburnbag-api-lib

// Bootstrap i18n so the setGlobalContextLanguageFromRequest middleware
// (called inside BaseController's authenticateRequest pipeline) does not
// throw "No default language configured".
import { I18nEngine, LanguageRegistry } from '@digitaldefiance/i18n-lib';

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
