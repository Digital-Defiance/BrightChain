import BlockType from '../enumerations/blockType';
import { StringLanguages } from '../enumerations/stringLanguages';

export type BlockTypeTranslation = {
  [key in BlockType]: string;
};
export type BlockTypeLanguageTranslation = {
  [key in StringLanguages]: BlockTypeTranslation;
};

export const BlockTypeTranslations: BlockTypeLanguageTranslation = {
  [StringLanguages.EnglishUS]: {
    [BlockType.Unknown]: 'Unknown',
    [BlockType.ConstituentBlockList]: 'Constituent Block List',
    [BlockType.EncryptedConstituentBlockListBlock]:
      'Encrypted Constituent Block List',
    [BlockType.EncryptedOwnedDataBlock]: 'Encrypted Owned Data',
    [BlockType.ExtendedConstituentBlockListBlock]:
      'Extended Constituent Block List',
    [BlockType.FECData]: 'FEC Data',
    [BlockType.Handle]: 'Handle',
    [BlockType.MultiEncryptedBlock]: 'Multi Encrypted Block',
    [BlockType.OwnedDataBlock]: 'Owned Data',
    [BlockType.OwnerFreeWhitenedBlock]: 'Owner Free Whitened',
    [BlockType.Random]: 'Random',
    [BlockType.RawData]: 'Raw Data',
  },
};
