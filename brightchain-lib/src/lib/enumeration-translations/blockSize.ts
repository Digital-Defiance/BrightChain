import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { BlockSize } from '../enumerations/blockSize';
import { i18nEngine } from '../i18n';
import { EnumLanguageTranslation } from '../types';

export type BlockSizeLanguageTranslation = EnumLanguageTranslation<BlockSize>;

export const BlockSizeTranslations: BlockSizeLanguageTranslation =
  i18nEngine.registerEnum(
    BlockSize,
    {
      [LanguageCodes.DE]: {
        [BlockSize.Unknown]: 'Unbekannt',
        [BlockSize.Message]: 'Nachricht',
        [BlockSize.Tiny]: 'Klein',
        [BlockSize.Small]: 'Klein',
        [BlockSize.Medium]: 'Mittel',
        [BlockSize.Large]: 'Groß',
        [BlockSize.Huge]: 'Riesig',
      },
      [LanguageCodes.EN_GB]: {
        [BlockSize.Unknown]: 'Unknown',
        [BlockSize.Message]: 'Message',
        [BlockSize.Tiny]: 'Tiny',
        [BlockSize.Small]: 'Small',
        [BlockSize.Medium]: 'Medium',
        [BlockSize.Large]: 'Large',
        [BlockSize.Huge]: 'Huge',
      },
      [LanguageCodes.EN_US]: {
        [BlockSize.Unknown]: 'Unknown',
        [BlockSize.Message]: 'Message',
        [BlockSize.Tiny]: 'Tiny',
        [BlockSize.Small]: 'Small',
        [BlockSize.Medium]: 'Medium',
        [BlockSize.Large]: 'Large',
        [BlockSize.Huge]: 'Huge',
      },
      [LanguageCodes.ES]: {
        [BlockSize.Unknown]: 'Desconocido',
        [BlockSize.Message]: 'Mensaje',
        [BlockSize.Tiny]: 'Diminuto',
        [BlockSize.Small]: 'Pequeño',
        [BlockSize.Medium]: 'Medio',
        [BlockSize.Large]: 'Grande',
        [BlockSize.Huge]: 'Enorme',
      },
      [LanguageCodes.FR]: {
        [BlockSize.Unknown]: 'Inconnu',
        [BlockSize.Message]: 'Message',
        [BlockSize.Tiny]: 'Minuscule',
        [BlockSize.Small]: 'Petit',
        [BlockSize.Medium]: 'Moyen',
        [BlockSize.Large]: 'Grand',
        [BlockSize.Huge]: 'Énorme',
      },
      [LanguageCodes.JA]: {
        [BlockSize.Unknown]: '不明',
        [BlockSize.Message]: 'メッセージ',
        [BlockSize.Tiny]: '極小',
        [BlockSize.Small]: '小',
        [BlockSize.Medium]: '中',
        [BlockSize.Large]: '大',
        [BlockSize.Huge]: '巨大',
      },
      [LanguageCodes.UK]: {
        [BlockSize.Unknown]: 'Невідомо',
        [BlockSize.Message]: 'Повідомлення',
        [BlockSize.Tiny]: 'Дуже малий',
        [BlockSize.Small]: 'Малий',
        [BlockSize.Medium]: 'Середній',
        [BlockSize.Large]: 'Великий',
        [BlockSize.Huge]: 'Гігантський',
      },
      [LanguageCodes.ZH_CN]: {
        [BlockSize.Unknown]: '未知',
        [BlockSize.Message]: '消息',
        [BlockSize.Tiny]: '极小',
        [BlockSize.Small]: '小',
        [BlockSize.Medium]: '中等',
        [BlockSize.Large]: '大',
        [BlockSize.Huge]: '巨大',
      },
    },
    'BlockSize',
  );
