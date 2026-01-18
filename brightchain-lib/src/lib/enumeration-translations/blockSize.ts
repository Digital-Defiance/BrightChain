import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { BlockSize } from '../enumerations/blockSize';
import { registerTranslation } from '../i18n';
import { createTranslations, EnumLanguageTranslation } from '../types';

export type BlockSizeLanguageTranslation = EnumLanguageTranslation<BlockSize>;

export const BlockSizeTranslations: BlockSizeLanguageTranslation =
  registerTranslation(
    BlockSize,
    createTranslations({
      [LanguageCodes.EN_US]: {
        0: 'Unknown',
        512: 'Message',
        1024: 'Tiny',
        4096: 'Small',
        1048576: 'Medium',
        67108864: 'Large',
        268435456: 'Huge',
      },
    }),
  );
