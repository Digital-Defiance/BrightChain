/**
 * BrightChain API Library i18n
 * Re-exports i18n functionality from brightchain-lib
 */

// Re-export all i18n functionality from brightchain-lib
export {
  BrightChainComponentId,
  buildNestedI18n,
  buildNestedI18nForLanguage,
  getI18n,
  registerTranslation,
  Strings,
  t,
  translate,
  translateEnumValue,
} from '@brightchain/brightchain-lib';

// Re-export string collections
export {
  AmericanEnglishStrings,
  BritishEnglishStrings,
  FrenchStrings,
  GermanStrings,
  JapaneseStrings,
  MandarinStrings,
  SpanishStrings,
  UkrainianStrings,
} from '@brightchain/brightchain-lib';
