import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { ConversationStatus } from '../enumerations/conversation-status';

export type ConversationStatusLanguageTranslation =
  EnumLanguageTranslation<ConversationStatus>;

export const ConversationStatusTranslations: ConversationStatusLanguageTranslation =
  i18nEngine.registerEnum(
    ConversationStatus,
    {
      [LanguageCodes.DE]: {
        [ConversationStatus.Active]: 'Aktiv',
        [ConversationStatus.Archived]: 'Archiviert',
        [ConversationStatus.Muted]: 'Stummgeschaltet',
      },
      [LanguageCodes.EN_GB]: {
        [ConversationStatus.Active]: 'Active',
        [ConversationStatus.Archived]: 'Archived',
        [ConversationStatus.Muted]: 'Muted',
      },
      [LanguageCodes.EN_US]: {
        [ConversationStatus.Active]: 'Active',
        [ConversationStatus.Archived]: 'Archived',
        [ConversationStatus.Muted]: 'Muted',
      },
      [LanguageCodes.ES]: {
        [ConversationStatus.Active]: 'Activo',
        [ConversationStatus.Archived]: 'Archivado',
        [ConversationStatus.Muted]: 'Silenciado',
      },
      [LanguageCodes.FR]: {
        [ConversationStatus.Active]: 'Actif',
        [ConversationStatus.Archived]: 'Archivé',
        [ConversationStatus.Muted]: 'Muet',
      },
      [LanguageCodes.JA]: {
        [ConversationStatus.Active]: 'アクティブ',
        [ConversationStatus.Archived]: 'アーカイブ済み',
        [ConversationStatus.Muted]: 'ミュート',
      },
      [LanguageCodes.UK]: {
        [ConversationStatus.Active]: 'Активний',
        [ConversationStatus.Archived]: 'Архівований',
        [ConversationStatus.Muted]: 'Вимкнено',
      },
      [LanguageCodes.ZH_CN]: {
        [ConversationStatus.Active]: '活跃',
        [ConversationStatus.Archived]: '已归档',
        [ConversationStatus.Muted]: '已静音',
      },
    },
    'ConversationStatus',
  );
