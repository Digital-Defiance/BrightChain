import { RequiredBrandedStringsCollection } from '@digitaldefiance/i18n-lib';
import { BrightMailStrings } from '../../enumerations/brightMailStrings';
import { BrightMailAmericanEnglishStrings } from './englishUs';

export const BrightMailBritishEnglishStrings: RequiredBrandedStringsCollection<
  typeof BrightMailStrings
> = {
  ...BrightMailAmericanEnglishStrings,
  // No British spelling overrides needed currently
};
