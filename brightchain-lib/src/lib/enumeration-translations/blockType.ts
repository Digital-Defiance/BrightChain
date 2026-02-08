import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import BlockType from '../enumerations/blockType';
import { i18nEngine } from '../i18n';
import { createTranslations, EnumLanguageTranslation } from '../types';

export type BlockTypeLanguageTranslation = EnumLanguageTranslation<BlockType>;

export const BlockTypeTranslations: BlockTypeLanguageTranslation =
  i18nEngine.registerEnum(
    BlockType,
    createTranslations({
      [LanguageCodes.DE]: {
        [BlockType.Unknown]: 'Unbekannt',
        [BlockType.ConstituentBlockList]: 'Bestandteil Blockliste',
        [BlockType.EncryptedOwnedDataBlock]: 'Verschlüsselte Eigentümerdaten',
        [BlockType.ExtendedConstituentBlockListBlock]:
          'Erweiterte Bestandteil Blockliste',
        [BlockType.EncryptedExtendedConstituentBlockListBlock]:
          'Verschlüsselte Erweiterte Bestandteil Blockliste',
        [BlockType.EncryptedConstituentBlockListBlock]:
          'Verschlüsselte Bestandteil Blockliste',
        [BlockType.FECData]: 'FEC Daten',
        [BlockType.Handle]: 'Handle',
        [BlockType.EphemeralOwnedDataBlock]: 'Eigentümerdaten',
        [BlockType.OwnerFreeWhitenedBlock]: 'Besitzerfreie Aufgehellte Daten',
        [BlockType.Random]: 'Zufällig',
        [BlockType.RawData]: 'Rohdaten',
        [BlockType.MultiEncryptedBlock]: 'Mehrfach Verschlüsselter Block',
      },
      [LanguageCodes.EN_GB]: {
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
      [LanguageCodes.ES]: {
        [BlockType.Unknown]: 'Desconocido',
        [BlockType.ConstituentBlockList]: 'Lista de bloques constituyentes',
        [BlockType.EncryptedOwnedDataBlock]: 'Datos del propietario cifrados',
        [BlockType.ExtendedConstituentBlockListBlock]:
          'Lista de bloques constituyentes extendida',
        [BlockType.EncryptedExtendedConstituentBlockListBlock]:
          'Lista de bloques constituyentes extendida cifrada',
        [BlockType.EncryptedConstituentBlockListBlock]:
          'Lista de bloques constituyentes cifrada',
        [BlockType.FECData]: 'Datos FEC',
        [BlockType.Handle]: 'Manija',
        [BlockType.EphemeralOwnedDataBlock]: 'Datos del propietario',
        [BlockType.OwnerFreeWhitenedBlock]:
          'Datos blanqueados libres del propietario',
        [BlockType.Random]: 'Aleatorio',
        [BlockType.RawData]: 'Datos sin procesar',
        [BlockType.MultiEncryptedBlock]: 'Bloque multi-cifrado',
      },
      [LanguageCodes.FR]: {
        [BlockType.Unknown]: 'Inconnu',
        [BlockType.ConstituentBlockList]: 'Liste des blocs constituants',
        [BlockType.EncryptedOwnedDataBlock]: 'Données possédées chiffrées',
        [BlockType.ExtendedConstituentBlockListBlock]:
          'Liste étendue des blocs constituants',
        [BlockType.EncryptedExtendedConstituentBlockListBlock]:
          'Liste étendue des blocs constituants chiffrée',
        [BlockType.EncryptedConstituentBlockListBlock]:
          'Liste des blocs constituants chiffrée',
        [BlockType.FECData]: 'Données FEC',
        [BlockType.Handle]: 'Poignée',
        [BlockType.EphemeralOwnedDataBlock]: 'Données possédées',
        [BlockType.OwnerFreeWhitenedBlock]:
          'Données blanchies libres du propriétaire',
        [BlockType.Random]: 'Aléatoire',
        [BlockType.RawData]: 'Données brutes',
        [BlockType.MultiEncryptedBlock]: 'Bloc multi-chiffré',
      },
      [LanguageCodes.JA]: {
        [BlockType.Unknown]: '不明',
        [BlockType.ConstituentBlockList]: '構成ブロックリスト',
        [BlockType.EncryptedOwnedDataBlock]: '暗号化された所有データ',
        [BlockType.ExtendedConstituentBlockListBlock]: '拡張構成ブロックリスト',
        [BlockType.EncryptedExtendedConstituentBlockListBlock]:
          '暗号化された拡張構成ブロックリスト',
        [BlockType.EncryptedConstituentBlockListBlock]:
          '暗号化された構成ブロックリスト',
        [BlockType.FECData]: 'FECデータ',
        [BlockType.Handle]: 'ハンドル',
        [BlockType.EphemeralOwnedDataBlock]: '所有データ',
        [BlockType.OwnerFreeWhitenedBlock]: 'オーナーフリーホワイトニング',
        [BlockType.Random]: 'ランダム',
        [BlockType.RawData]: '生データ',
        [BlockType.MultiEncryptedBlock]: '多重暗号化ブロック',
      },
      [LanguageCodes.UK]: {
        [BlockType.Unknown]: 'Невідомо',
        [BlockType.ConstituentBlockList]: 'Список складових блоків',
        [BlockType.EncryptedOwnedDataBlock]: 'Зашифровані власні дані',
        [BlockType.ExtendedConstituentBlockListBlock]:
          'Розширений список складових блоків',
        [BlockType.EncryptedExtendedConstituentBlockListBlock]:
          'Зашифрований розширений список складових блоків',
        [BlockType.EncryptedConstituentBlockListBlock]:
          'Зашифрований список складових блоків',
        [BlockType.FECData]: 'Дані FEC',
        [BlockType.Handle]: 'Обробляти',
        [BlockType.EphemeralOwnedDataBlock]: 'Власні дані',
        [BlockType.OwnerFreeWhitenedBlock]: 'Власник вільного відбілювання',
        [BlockType.Random]: 'Випадковий',
        [BlockType.RawData]: 'Необроблені дані',
        [BlockType.MultiEncryptedBlock]: 'Багатошифрований блок',
      },
      [LanguageCodes.ZH_CN]: {
        [BlockType.Unknown]: '未知',
        [BlockType.ConstituentBlockList]: '组成块列表',
        [BlockType.EncryptedOwnedDataBlock]: '加密的拥有数据',
        [BlockType.ExtendedConstituentBlockListBlock]: '扩展组成块列表',
        [BlockType.EncryptedExtendedConstituentBlockListBlock]:
          '加密的扩展组成块列表',
        [BlockType.EncryptedConstituentBlockListBlock]: '加密的组成块列表',
        [BlockType.FECData]: 'FEC数据',
        [BlockType.Handle]: '句柄',
        [BlockType.EphemeralOwnedDataBlock]: '拥有数据',
        [BlockType.OwnerFreeWhitenedBlock]: '所有者自由漂白',
        [BlockType.Random]: '随机',
        [BlockType.RawData]: '原始数据',
        [BlockType.MultiEncryptedBlock]: '多重加密块',
      },
    }),
    'BlockType',
  );
