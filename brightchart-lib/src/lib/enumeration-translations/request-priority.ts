import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { RequestPriority } from '../orders';

export type RequestPriorityLanguageTranslation =
  EnumLanguageTranslation<RequestPriority>;

export const RequestPriorityTranslations: RequestPriorityLanguageTranslation =
  i18nEngine.registerEnum(
    RequestPriority,
    {
      [LanguageCodes.DE]: {
        [RequestPriority.Routine]: 'Routine',
        [RequestPriority.Urgent]: 'Dringend',
        [RequestPriority.Asap]: 'Schnellstmöglich',
        [RequestPriority.Stat]: 'Sofort',
      },
      [LanguageCodes.EN_GB]: {
        [RequestPriority.Routine]: 'Routine',
        [RequestPriority.Urgent]: 'Urgent',
        [RequestPriority.Asap]: 'ASAP',
        [RequestPriority.Stat]: 'Stat',
      },
      [LanguageCodes.EN_US]: {
        [RequestPriority.Routine]: 'Routine',
        [RequestPriority.Urgent]: 'Urgent',
        [RequestPriority.Asap]: 'ASAP',
        [RequestPriority.Stat]: 'Stat',
      },
      [LanguageCodes.ES]: {
        [RequestPriority.Routine]: 'Rutina',
        [RequestPriority.Urgent]: 'Urgente',
        [RequestPriority.Asap]: 'Lo antes posible',
        [RequestPriority.Stat]: 'Inmediato',
      },
      [LanguageCodes.FR]: {
        [RequestPriority.Routine]: 'Routine',
        [RequestPriority.Urgent]: 'Urgent',
        [RequestPriority.Asap]: 'Dès que possible',
        [RequestPriority.Stat]: 'Immédiat',
      },
      [LanguageCodes.JA]: {
        [RequestPriority.Routine]: 'ルーチン',
        [RequestPriority.Urgent]: '緊急',
        [RequestPriority.Asap]: 'できるだけ早く',
        [RequestPriority.Stat]: '至急',
      },
      [LanguageCodes.UK]: {
        [RequestPriority.Routine]: 'Рутинний',
        [RequestPriority.Urgent]: 'Терміновий',
        [RequestPriority.Asap]: 'Якнайшвидше',
        [RequestPriority.Stat]: 'Негайно',
      },
      [LanguageCodes.ZH_CN]: {
        [RequestPriority.Routine]: '常规',
        [RequestPriority.Urgent]: '紧急',
        [RequestPriority.Asap]: '尽快',
        [RequestPriority.Stat]: '立即',
      },
    },
    'RequestPriority',
  );
