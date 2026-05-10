import {
  ComponentConfig,
  CoreLanguageCode,
  LanguageCodes,
  RequiredBrandedMasterStringsCollection,
  type I18nComponentPackage,
} from '@digitaldefiance/i18n-lib';
import {
  BrightMailComponentId,
  BrightMailStrings,
} from '../enumerations/brightMailStrings';
import { BrightMailBritishEnglishStrings } from './strings/englishUK';
import { BrightMailAmericanEnglishStrings } from './strings/englishUs';
import { BrightMailFrenchStrings } from './strings/french';
import { BrightMailGermanStrings } from './strings/german';
import { BrightMailJapaneseStrings } from './strings/japanese';
import { BrightMailMandarinStrings } from './strings/mandarin';
import { BrightMailSpanishStrings } from './strings/spanish';
import { BrightMailUkrainianStrings } from './strings/ukrainian';

export const BrightMailComponentStrings: RequiredBrandedMasterStringsCollection<
  typeof BrightMailStrings,
  CoreLanguageCode
> = {
  [LanguageCodes.EN_US]: BrightMailAmericanEnglishStrings,
  [LanguageCodes.EN_GB]: BrightMailBritishEnglishStrings,
  [LanguageCodes.FR]: BrightMailFrenchStrings,
  [LanguageCodes.ZH_CN]: BrightMailMandarinStrings,
  [LanguageCodes.ES]: BrightMailSpanishStrings,
  [LanguageCodes.UK]: BrightMailUkrainianStrings,
  [LanguageCodes.DE]: BrightMailGermanStrings,
  [LanguageCodes.JA]: BrightMailJapaneseStrings,
};

export function createBrightMailComponentConfig(): ComponentConfig {
  return {
    id: BrightMailComponentId,
    strings: BrightMailComponentStrings,
    aliases: ['BrightMailStrings'],
  };
}

export function createBrightMailComponentPackage(): I18nComponentPackage {
  return {
    config: createBrightMailComponentConfig(),
    stringKeyEnum: BrightMailStrings,
  };
}
