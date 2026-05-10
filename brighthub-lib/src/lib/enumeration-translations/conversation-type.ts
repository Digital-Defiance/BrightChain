import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { ConversationType } from '../enumerations/conversation-type';

export type ConversationTypeLanguageTranslation =
  EnumLanguageTranslation<ConversationType>;

export const ConversationTypeTranslations: ConversationTypeLanguageTranslation =
  i18nEngine.registerEnum(
    ConversationType,
    {
      [LanguageCodes.DE]: {
        [ConversationType.Direct]: 'Direkt',
        [ConversationType.Group]: 'Gruppe',
      },
      [LanguageCodes.EN_GB]: {
        [ConversationType.Direct]: 'Direct',
        [ConversationType.Group]: 'Group',
      },
      [LanguageCodes.EN_US]: {
        [ConversationType.Direct]: 'Direct',
        [ConversationType.Group]: 'Group',
      },
      [LanguageCodes.ES]: {
        [ConversationType.Direct]: 'Directo',
        [ConversationType.Group]: 'Grupo',
      },
      [LanguageCodes.FR]: {
        [ConversationType.Direct]: 'Direct',
        [ConversationType.Group]: 'Groupe',
      },
      [LanguageCodes.JA]: {
        [ConversationType.Direct]: 'ダイレクト',
        [ConversationType.Group]: 'グループ',
      },
      [LanguageCodes.UK]: {
        [ConversationType.Direct]: 'Прямий',
        [ConversationType.Group]: 'Група',
      },
      [LanguageCodes.ZH_CN]: {
        [ConversationType.Direct]: '私信',
        [ConversationType.Group]: '群组',
      },
    },
    'ConversationType',
  );
