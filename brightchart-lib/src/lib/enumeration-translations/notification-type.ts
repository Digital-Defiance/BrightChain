import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { NotificationType } from '../shell/notificationTypes';

export type NotificationTypeLanguageTranslation =
  EnumLanguageTranslation<NotificationType>;

export const NotificationTypeTranslations: NotificationTypeLanguageTranslation =
  i18nEngine.registerEnum(
    NotificationType,
    {
      [LanguageCodes.DE]: {
        [NotificationType.Result]: 'Ergebnis',
        [NotificationType.Note]: 'Notiz',
        [NotificationType.Appointment]: 'Termin',
        [NotificationType.Claim]: 'Anspruch',
        [NotificationType.Message]: 'Nachricht',
        [NotificationType.System]: 'System',
      },
      [LanguageCodes.EN_GB]: {
        [NotificationType.Result]: 'Result',
        [NotificationType.Note]: 'Note',
        [NotificationType.Appointment]: 'Appointment',
        [NotificationType.Claim]: 'Claim',
        [NotificationType.Message]: 'Message',
        [NotificationType.System]: 'System',
      },
      [LanguageCodes.EN_US]: {
        [NotificationType.Result]: 'Result',
        [NotificationType.Note]: 'Note',
        [NotificationType.Appointment]: 'Appointment',
        [NotificationType.Claim]: 'Claim',
        [NotificationType.Message]: 'Message',
        [NotificationType.System]: 'System',
      },
      [LanguageCodes.ES]: {
        [NotificationType.Result]: 'Resultado',
        [NotificationType.Note]: 'Nota',
        [NotificationType.Appointment]: 'Cita',
        [NotificationType.Claim]: 'Reclamación',
        [NotificationType.Message]: 'Mensaje',
        [NotificationType.System]: 'Sistema',
      },
      [LanguageCodes.FR]: {
        [NotificationType.Result]: 'Résultat',
        [NotificationType.Note]: 'Note',
        [NotificationType.Appointment]: 'Rendez-vous',
        [NotificationType.Claim]: 'Réclamation',
        [NotificationType.Message]: 'Message',
        [NotificationType.System]: 'Système',
      },
      [LanguageCodes.JA]: {
        [NotificationType.Result]: '結果',
        [NotificationType.Note]: 'ノート',
        [NotificationType.Appointment]: '予約',
        [NotificationType.Claim]: '請求',
        [NotificationType.Message]: 'メッセージ',
        [NotificationType.System]: 'システム',
      },
      [LanguageCodes.UK]: {
        [NotificationType.Result]: 'Результат',
        [NotificationType.Note]: 'Нотатка',
        [NotificationType.Appointment]: 'Прийом',
        [NotificationType.Claim]: 'Претензія',
        [NotificationType.Message]: 'Повідомлення',
        [NotificationType.System]: 'Система',
      },
      [LanguageCodes.ZH_CN]: {
        [NotificationType.Result]: '结果',
        [NotificationType.Note]: '笔记',
        [NotificationType.Appointment]: '预约',
        [NotificationType.Claim]: '索赔',
        [NotificationType.Message]: '消息',
        [NotificationType.System]: '系统',
      },
    },
    'NotificationType',
  );
