import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import BlockType from '../enumerations/blockType';
import { registerTranslation } from '../i18n';
import { createTranslations, EnumLanguageTranslation } from '../types';

export type BlockTypeLanguageTranslation = EnumLanguageTranslation<BlockType>;

export const BlockTypeTranslations: BlockTypeLanguageTranslation =
  registerTranslation(
    BlockType,
    createTranslations({
      [LanguageCodes.EN_US]: {
        [BlockType.Unknown]: 'Unknown',
        [BlockType.ConstituentBlockList]: 'Constituent Block List',
        [BlockType.EncryptedOwnedDataBlock]: 'Encrypted Owned Data',
        [BlockType.ExtendedConstituentBlockListBlock]:
          'Extended Constituent Block List',
        [BlockType.EncryptedExtendedConstituentBlockListBlock]:
          'Encrypted Extended Constituent Block List',
        [BlockType.EncryptedConstituentBlockListBlock]:
          'Encrypted Constituent Block List',
        [BlockType.FECData]: 'FEC Data',
        [BlockType.Handle]: 'Handle',
        [BlockType.EphemeralOwnedDataBlock]: 'Owned Data',
        [BlockType.OwnerFreeWhitenedBlock]: 'Owner Free Whitened',
        [BlockType.Random]: 'Random',
        [BlockType.RawData]: 'Raw Data',
        [BlockType.MultiEncryptedBlock]: 'Multi-Encrypted Block',
      },
    }),
  );
