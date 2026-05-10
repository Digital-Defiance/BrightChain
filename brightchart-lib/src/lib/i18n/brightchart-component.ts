import {
  ComponentConfig,
  CoreLanguageCode,
  LanguageCodes,
  RequiredBrandedMasterStringsCollection,
  type I18nComponentPackage,
} from '@digitaldefiance/i18n-lib';
import {
  BrightChartComponentId,
  BrightChartStrings,
} from '../enumerations/BrightChartStrings';
import { BrightChartBritishEnglishStrings } from './strings/englishUK';
import { BrightChartAmericanEnglishStrings } from './strings/englishUs';
import { BrightChartFrenchStrings } from './strings/french';
import { BrightChartGermanStrings } from './strings/german';
import { BrightChartJapaneseStrings } from './strings/japanese';
import { BrightChartMandarinStrings } from './strings/mandarin';
import { BrightChartSpanishStrings } from './strings/spanish';
import { BrightChartUkrainianStrings } from './strings/ukrainian';

export const BrightChartComponentStrings: RequiredBrandedMasterStringsCollection<
  typeof BrightChartStrings,
  CoreLanguageCode
> = {
  [LanguageCodes.EN_US]: BrightChartAmericanEnglishStrings,
  [LanguageCodes.EN_GB]: BrightChartBritishEnglishStrings,
  [LanguageCodes.FR]: BrightChartFrenchStrings,
  [LanguageCodes.ZH_CN]: BrightChartMandarinStrings,
  [LanguageCodes.ES]: BrightChartSpanishStrings,
  [LanguageCodes.UK]: BrightChartUkrainianStrings,
  [LanguageCodes.DE]: BrightChartGermanStrings,
  [LanguageCodes.JA]: BrightChartJapaneseStrings,
};

export function createBrightChartComponentConfig(): ComponentConfig {
  return {
    id: BrightChartComponentId,
    strings: BrightChartComponentStrings,
    aliases: ['BrightChartStrings'],
  };
}

export function createBrightChartComponentPackage(): I18nComponentPackage {
  return {
    config: createBrightChartComponentConfig(),
    stringKeyEnum: BrightChartStrings,
  };
}
