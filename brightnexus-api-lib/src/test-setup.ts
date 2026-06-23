import { initializeBrightChain } from '@brightchain/brightchain-lib';
import { I18nEngine, LanguageRegistry } from '@digitaldefiance/i18n-lib';

initializeBrightChain();

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
