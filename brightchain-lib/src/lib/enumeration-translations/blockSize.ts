import { BlockSize } from '../enumerations/blockSizes';
import { StringLanguages } from '../enumerations/stringLanguages';

export type BlockSizeTranslation = {
  [key in BlockSize]: string;
};
export type BlockSizeLanguageTranslation = {
  [key in StringLanguages]: BlockSizeTranslation;
};

export const BlockSizeTranslations: BlockSizeLanguageTranslation = {
  [StringLanguages.EnglishUS]: {
    [BlockSize.Unknown]: 'Unknown',
    [BlockSize.Tiny]: 'Tiny',
    [BlockSize.Message]: 'Message',
    [BlockSize.Small]: 'Small',
    [BlockSize.Medium]: 'Medium',
    [BlockSize.Large]: 'Large',
    [BlockSize.Huge]: 'Huge',
  },
};
