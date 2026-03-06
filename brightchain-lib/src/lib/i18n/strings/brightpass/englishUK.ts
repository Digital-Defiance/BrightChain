import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import { BrightPassStringKey } from '../../../enumerations/brightPassStrings';
import { BrightPassAmericanEnglishStrings } from './englishUs';

export const BrightPassBritishEnglishStrings: ComponentStrings<BrightPassStringKey> =
  {
    ...BrightPassAmericanEnglishStrings,
    // Override spelling differences between British and American English
  };
