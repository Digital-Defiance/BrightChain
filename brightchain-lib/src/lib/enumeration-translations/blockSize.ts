import { StringLanguages } from '../enumerations/stringLanguages';

// Define translations before importing BlockSize to avoid circular dependencies
const translations = {
  [StringLanguages.EnglishUS]: {
    0: 'Unknown',
    512: 'Message',
    1024: 'Tiny',
    4096: 'Small',
    1048576: 'Medium',
    67108864: 'Large',
    268435456: 'Huge',
  },
};

// Import BlockSize after defining translations
import { BlockSize } from '../enumerations/blockSizes';

export type BlockSizeTranslation = {
  [key in BlockSize]: string;
};

export type BlockSizeLanguageTranslation = {
  [key in StringLanguages]: BlockSizeTranslation;
};

export const BlockSizeTranslations: BlockSizeLanguageTranslation =
  translations as BlockSizeLanguageTranslation;
