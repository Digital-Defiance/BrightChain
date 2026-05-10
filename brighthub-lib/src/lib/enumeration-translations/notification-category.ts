import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { NotificationCategory } from '../enumerations/notification-category';

export type NotificationCategoryLanguageTranslation =
  EnumLanguageTranslation<NotificationCategory>;

export const NotificationCategoryTranslations: NotificationCategoryLanguageTranslation =
  i18nEngine.registerEnum(
    NotificationCategory,
    {
      [LanguageCodes.DE]: {
        [NotificationCategory.Social]: 'Sozial',
        [NotificationCategory.Messages]: 'Nachrichten',
        [NotificationCategory.Connections]: 'Verbindungen',
        [NotificationCategory.System]: 'System',
      },
      [LanguageCodes.EN_GB]: {
        [NotificationCategory.Social]: 'Social',
        [NotificationCategory.Messages]: 'Messages',
        [NotificationCategory.Connections]: 'Connections',
        [NotificationCategory.System]: 'System',
      },
      [LanguageCodes.EN_US]: {
        [NotificationCategory.Social]: 'Social',
        [NotificationCategory.Messages]: 'Messages',
        [NotificationCategory.Connections]: 'Connections',
        [NotificationCategory.System]: 'System',
      },
      [LanguageCodes.ES]: {
        [NotificationCategory.Social]: 'Social',
        [NotificationCategory.Messages]: 'Mensajes',
        [NotificationCategory.Connections]: 'Conexiones',
        [NotificationCategory.System]: 'Sistema',
      },
      [LanguageCodes.FR]: {
        [NotificationCategory.Social]: 'Social',
        [NotificationCategory.Messages]: 'Messages',
        [NotificationCategory.Connections]: 'Connexions',
        [NotificationCategory.System]: 'Système',
      },
      [LanguageCodes.JA]: {
        [NotificationCategory.Social]: 'ソーシャル',
        [NotificationCategory.Messages]: 'メッセージ',
        [NotificationCategory.Connections]: 'つながり',
        [NotificationCategory.System]: 'システム',
      },
      [LanguageCodes.UK]: {
        [NotificationCategory.Social]: 'Соціальне',
        [NotificationCategory.Messages]: 'Повідомлення',
        [NotificationCategory.Connections]: "Зв'язки",
        [NotificationCategory.System]: 'Система',
      },
      [LanguageCodes.ZH_CN]: {
        [NotificationCategory.Social]: '社交',
        [NotificationCategory.Messages]: '消息',
        [NotificationCategory.Connections]: '关注',
        [NotificationCategory.System]: '系统',
      },
    },
    'NotificationCategory',
  );
