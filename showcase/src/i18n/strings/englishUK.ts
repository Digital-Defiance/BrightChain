import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import { ShowcaseStringKey } from '../showcaseStrings';
import { ShowcaseAmericanEnglishStrings } from './englishUs';

// British English - spreads from US English since it's the same language with minor differences
export const ShowcaseBritishEnglishStrings: Partial<
  ComponentStrings<ShowcaseStringKey>
> = {
  ...ShowcaseAmericanEnglishStrings,
  // Override any UK-specific spellings here if needed
};

export default ShowcaseBritishEnglishStrings;
