import {
  ComponentConfig,
  CoreLanguageCode,
  LanguageCodes,
  RequiredBrandedMasterStringsCollection,
  type I18nComponentPackage,
} from '@digitaldefiance/i18n-lib';
import {
  BrightPassComponentId,
  BrightPassStrings,
} from '../enumerations/brightPassStrings';
import { BrightPassBritishEnglishStrings } from './strings/englishUK';
import { BrightPassAmericanEnglishStrings } from './strings/englishUs';
import { BrightPassFrenchStrings } from './strings/french';
import { BrightPassGermanStrings } from './strings/german';
import { BrightPassJapaneseStrings } from './strings/japanese';
import { BrightPassMandarinStrings } from './strings/mandarin';
import { BrightPassSpanishStrings } from './strings/spanish';
import { BrightPassUkrainianStrings } from './strings/ukrainian';

export const BrightPassComponentStrings: RequiredBrandedMasterStringsCollection<
  typeof BrightPassStrings,
  CoreLanguageCode
> = {
  [LanguageCodes.EN_US]: BrightPassAmericanEnglishStrings,
  [LanguageCodes.EN_GB]: BrightPassBritishEnglishStrings,
  [LanguageCodes.FR]: BrightPassFrenchStrings,
  [LanguageCodes.ZH_CN]: BrightPassMandarinStrings,
  [LanguageCodes.ES]: BrightPassSpanishStrings,
  [LanguageCodes.UK]: BrightPassUkrainianStrings,
  [LanguageCodes.DE]: BrightPassGermanStrings,
  [LanguageCodes.JA]: BrightPassJapaneseStrings,
};

export function createBrightPassComponentConfig(): ComponentConfig {
  return {
    id: BrightPassComponentId,
    strings: BrightPassComponentStrings,
    aliases: ['BrightPassStrings'],
  };
}

export function createBrightPassComponentPackage(): I18nComponentPackage {
  return {
    config: createBrightPassComponentConfig(),
    stringKeyEnum: BrightPassStrings,
  };
}
