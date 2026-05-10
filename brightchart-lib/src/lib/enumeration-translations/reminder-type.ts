import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { ReminderType } from '../scheduling';

export type ReminderTypeLanguageTranslation =
  EnumLanguageTranslation<ReminderType>;

export const ReminderTypeTranslations: ReminderTypeLanguageTranslation =
  i18nEngine.registerEnum(
    ReminderType,
    {
      [LanguageCodes.DE]: {
        [ReminderType.Sms]: 'SMS',
        [ReminderType.Email]: 'E-Mail',
        [ReminderType.Push]: 'Push-Benachrichtigung',
        [ReminderType.Phone]: 'Telefonanruf',
      },
      [LanguageCodes.EN_GB]: {
        [ReminderType.Sms]: 'SMS',
        [ReminderType.Email]: 'Email',
        [ReminderType.Push]: 'Push Notification',
        [ReminderType.Phone]: 'Phone Call',
      },
      [LanguageCodes.EN_US]: {
        [ReminderType.Sms]: 'SMS',
        [ReminderType.Email]: 'Email',
        [ReminderType.Push]: 'Push Notification',
        [ReminderType.Phone]: 'Phone Call',
      },
      [LanguageCodes.ES]: {
        [ReminderType.Sms]: 'SMS',
        [ReminderType.Email]: 'Correo electrónico',
        [ReminderType.Push]: 'Notificación push',
        [ReminderType.Phone]: 'Llamada telefónica',
      },
      [LanguageCodes.FR]: {
        [ReminderType.Sms]: 'SMS',
        [ReminderType.Email]: 'Courriel',
        [ReminderType.Push]: 'Notification push',
        [ReminderType.Phone]: 'Appel téléphonique',
      },
      [LanguageCodes.JA]: {
        [ReminderType.Sms]: 'SMS',
        [ReminderType.Email]: 'メール',
        [ReminderType.Push]: 'プッシュ通知',
        [ReminderType.Phone]: '電話',
      },
      [LanguageCodes.UK]: {
        [ReminderType.Sms]: 'SMS',
        [ReminderType.Email]: 'Електронна пошта',
        [ReminderType.Push]: 'Push-сповіщення',
        [ReminderType.Phone]: 'Телефонний дзвінок',
      },
      [LanguageCodes.ZH_CN]: {
        [ReminderType.Sms]: '短信',
        [ReminderType.Email]: '电子邮件',
        [ReminderType.Push]: '推送通知',
        [ReminderType.Phone]: '电话',
      },
    },
    'ReminderType',
  );
