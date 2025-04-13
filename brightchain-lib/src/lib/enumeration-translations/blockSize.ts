// Import BlockSize after defining translations
import { BlockSize } from '../enumerations/blockSize';
import { StringLanguages } from '../enumerations/stringLanguages';

export type BlockSizeTranslation = {
  [key in BlockSize]: string;
};

export type BlockSizeLanguageTranslation = {
  [key in StringLanguages]: BlockSizeTranslation;
};

// Define translations before importing BlockSize to avoid circular dependencies
const translations: BlockSizeLanguageTranslation = {
  [StringLanguages.EnglishUS]: {
    [BlockSize.Unknown]: 'Unknown',
    [BlockSize.Message]: 'Message',
    [BlockSize.Tiny]: 'Tiny',
    [BlockSize.Small]: 'Small',
    [BlockSize.Medium]: 'Medium',
    [BlockSize.Large]: 'Large',
    [BlockSize.Huge]: 'Huge',
  },
};

export const BlockSizeTranslations: BlockSizeLanguageTranslation = translations;
