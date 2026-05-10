import {
  ComponentConfig,
  CoreLanguageCode,
  LanguageCodes,
  RequiredBrandedMasterStringsCollection,
  type I18nComponentPackage,
} from '@digitaldefiance/i18n-lib';
import {
  BrightChatComponentId,
  BrightChatStrings,
} from '../enumerations/brightChatStrings';
import { BrightChatBritishEnglishStrings } from './strings/englishUK';
import { BrightChatAmericanEnglishStrings } from './strings/englishUs';
import { BrightChatFrenchStrings } from './strings/french';
import { BrightChatGermanStrings } from './strings/german';
import { BrightChatJapaneseStrings } from './strings/japanese';
import { BrightChatMandarinStrings } from './strings/mandarin';
import { BrightChatSpanishStrings } from './strings/spanish';
import { BrightChatUkrainianStrings } from './strings/ukrainian';

export const BrightChatComponentStrings: RequiredBrandedMasterStringsCollection<
  typeof BrightChatStrings,
  CoreLanguageCode
> = {
  [LanguageCodes.EN_US]: BrightChatAmericanEnglishStrings,
  [LanguageCodes.EN_GB]: BrightChatBritishEnglishStrings,
  [LanguageCodes.FR]: BrightChatFrenchStrings,
  [LanguageCodes.ZH_CN]: BrightChatMandarinStrings,
  [LanguageCodes.ES]: BrightChatSpanishStrings,
  [LanguageCodes.UK]: BrightChatUkrainianStrings,
  [LanguageCodes.DE]: BrightChatGermanStrings,
  [LanguageCodes.JA]: BrightChatJapaneseStrings,
};

export function createBrightChatComponentConfig(): ComponentConfig {
  return {
    id: BrightChatComponentId,
    strings: BrightChatComponentStrings,
    aliases: ['BrightChatStrings'],
  };
}

export function createBrightChatComponentPackage(): I18nComponentPackage {
  return {
    config: createBrightChatComponentConfig(),
    stringKeyEnum: BrightChatStrings,
  };
}
