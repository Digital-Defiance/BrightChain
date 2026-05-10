import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import { BrightHubStringKey } from '../../enumerations/brightHubStrings';
import { BrightHubAmericanEnglishStrings } from './englishUs';

export const BrightHubBritishEnglishStrings: ComponentStrings<BrightHubStringKey> =
  {
    ...BrightHubAmericanEnglishStrings,
    // Override spelling differences between British and American English
  };
