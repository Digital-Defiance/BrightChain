import {
  ComponentConfig,
  CoreLanguageCode,
  LanguageCodes,
  RequiredBrandedMasterStringsCollection,
  type I18nComponentPackage,
} from '@digitaldefiance/i18n-lib';
import {
  DigitalBurnbagComponentId,
  DigitalBurnbagStrings,
} from '../enumerations/digitalburnbag-strings';
import { DigitalBurnbagBritishEnglishStrings } from './strings/englishUK';
import { DigitalBurnbagAmericanEnglishStrings } from './strings/englishUs';
import { DigitalBurnbagFrenchStrings } from './strings/french';
import { DigitalBurnbagGermanStrings } from './strings/german';
import { DigitalBurnbagJapaneseStrings } from './strings/japanese';
import { DigitalBurnbagMandarinStrings } from './strings/mandarin';
import { DigitalBurnbagSpanishStrings } from './strings/spanish';
import { DigitalBurnbagUkrainianStrings } from './strings/ukrainian';

export const DigitalBurnbagComponentStrings: RequiredBrandedMasterStringsCollection<
  typeof DigitalBurnbagStrings,
  CoreLanguageCode
> = {
  [LanguageCodes.EN_US]: DigitalBurnbagAmericanEnglishStrings,
  [LanguageCodes.EN_GB]: DigitalBurnbagBritishEnglishStrings,
  [LanguageCodes.FR]: DigitalBurnbagFrenchStrings,
  [LanguageCodes.ZH_CN]: DigitalBurnbagMandarinStrings,
  [LanguageCodes.ES]: DigitalBurnbagSpanishStrings,
  [LanguageCodes.UK]: DigitalBurnbagUkrainianStrings,
  [LanguageCodes.DE]: DigitalBurnbagGermanStrings,
  [LanguageCodes.JA]: DigitalBurnbagJapaneseStrings,
};

export function createDigitalBurnbagComponentConfig(): ComponentConfig {
  return {
    id: DigitalBurnbagComponentId,
    strings: DigitalBurnbagComponentStrings,
    aliases: ['DigitalBurnbagStrings'],
  };
}

export function createDigitalBurnbagComponentPackage(): I18nComponentPackage {
  return {
    config: createDigitalBurnbagComponentConfig(),
    stringKeyEnum: DigitalBurnbagStrings,
  };
}
