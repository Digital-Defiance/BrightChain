import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { ReminderStatus } from '../scheduling';

export type ReminderStatusLanguageTranslation =
  EnumLanguageTranslation<ReminderStatus>;

export const ReminderStatusTranslations: ReminderStatusLanguageTranslation =
  i18nEngine.registerEnum(
    ReminderStatus,
    {
      [LanguageCodes.DE]: {
        [ReminderStatus.Scheduled]: 'Geplant',
        [ReminderStatus.Sent]: 'Gesendet',
        [ReminderStatus.Failed]: 'Fehlgeschlagen',
        [ReminderStatus.Cancelled]: 'Storniert',
      },
      [LanguageCodes.EN_GB]: {
        [ReminderStatus.Scheduled]: 'Scheduled',
        [ReminderStatus.Sent]: 'Sent',
        [ReminderStatus.Failed]: 'Failed',
        [ReminderStatus.Cancelled]: 'Cancelled',
      },
      [LanguageCodes.EN_US]: {
        [ReminderStatus.Scheduled]: 'Scheduled',
        [ReminderStatus.Sent]: 'Sent',
        [ReminderStatus.Failed]: 'Failed',
        [ReminderStatus.Cancelled]: 'Cancelled',
      },
      [LanguageCodes.ES]: {
        [ReminderStatus.Scheduled]: 'Programado',
        [ReminderStatus.Sent]: 'Enviado',
        [ReminderStatus.Failed]: 'Fallido',
        [ReminderStatus.Cancelled]: 'Cancelado',
      },
      [LanguageCodes.FR]: {
        [ReminderStatus.Scheduled]: 'Planifié',
        [ReminderStatus.Sent]: 'Envoyé',
        [ReminderStatus.Failed]: 'Échoué',
        [ReminderStatus.Cancelled]: 'Annulé',
      },
      [LanguageCodes.JA]: {
        [ReminderStatus.Scheduled]: '予定',
        [ReminderStatus.Sent]: '送信済み',
        [ReminderStatus.Failed]: '失敗',
        [ReminderStatus.Cancelled]: '取消済み',
      },
      [LanguageCodes.UK]: {
        [ReminderStatus.Scheduled]: 'Заплановано',
        [ReminderStatus.Sent]: 'Надіслано',
        [ReminderStatus.Failed]: 'Не вдалося',
        [ReminderStatus.Cancelled]: 'Скасовано',
      },
      [LanguageCodes.ZH_CN]: {
        [ReminderStatus.Scheduled]: '已安排',
        [ReminderStatus.Sent]: '已发送',
        [ReminderStatus.Failed]: '失败',
        [ReminderStatus.Cancelled]: '已取消',
      },
    },
    'ReminderStatus',
  );
