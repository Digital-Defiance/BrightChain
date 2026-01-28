import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { BlockSize } from '../enumerations/blockSize';
import { registerTranslation } from '../i18n';
import { createTranslations, EnumLanguageTranslation } from '../types';

export type BlockSizeLanguageTranslation = EnumLanguageTranslation<BlockSize>;

export const BlockSizeTranslations: BlockSizeLanguageTranslation =
  registerTranslation(
    BlockSize,
    createTranslations({
      [LanguageCodes.DE]: {
        0: 'Unbekannt',
        512: 'Nachricht',
        1024: 'Klein',
        4096: 'Klein',
        1048576: 'Mittel',
        67108864: 'Groß',
        268435456: 'Riesig',
      },
      [LanguageCodes.EN_GB]: {
        0: 'Unknown',
        512: 'Message',
        1024: 'Tiny',
        4096: 'Small',
        1048576: 'Medium',
        67108864: 'Large',
        268435456: 'Huge',
      },
      [LanguageCodes.EN_US]: {
        0: 'Unknown',
        512: 'Message',
        1024: 'Tiny',
        4096: 'Small',
        1048576: 'Medium',
        67108864: 'Large',
        268435456: 'Huge',
      },
      [LanguageCodes.ES]: {
        0: 'Desconocido',
        512: 'Mensaje',
        1024: 'Diminuto',
        4096: 'Pequeño',
        1048576: 'Medio',
        67108864: 'Grande',
        268435456: 'Enorme',
      },
      [LanguageCodes.FR]: {
        0: 'Inconnu',
        512: 'Message',
        1024: 'Minuscule',
        4096: 'Petit',
        1048576: 'Moyen',
        67108864: 'Grand',
        268435456: 'Énorme',
      },
      [LanguageCodes.JA]: {
        0: '不明',
        512: 'メッセージ',
        1024: '極小',
        4096: '小',
        1048576: '中',
        67108864: '大',
        268435456: '巨大',
      },
      [LanguageCodes.UK]: {
        0: 'Невідомо',
        512: 'Повідомлення',
        1024: 'Дуже малий',
        4096: 'Малий',
        1048576: 'Середній',
        67108864: 'Великий',
        268435456: 'Гігантський',
      },
      [LanguageCodes.ZH_CN]: {
        0: '未知',
        512: '消息',
        1024: '极小',
        4096: '小',
        1048576: '中等',
        67108864: '大',
        268435456: '巨大',
      },
    }),
  );
