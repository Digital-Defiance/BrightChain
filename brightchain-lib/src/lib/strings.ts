import { StringLanguages } from './enumerations/stringLanguages';
import { MasterStringsCollection } from './sharedTypes';
import AmericanEnglishStrings from './strings/englishUs';

export const Strings: MasterStringsCollection = {
  [StringLanguages.EnglishUS]: AmericanEnglishStrings,
};
