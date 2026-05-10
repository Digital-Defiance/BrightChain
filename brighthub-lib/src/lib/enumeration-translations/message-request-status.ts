import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { MessageRequestStatus } from '../enumerations/message-request-status';

export type MessageRequestStatusLanguageTranslation =
  EnumLanguageTranslation<MessageRequestStatus>;

export const MessageRequestStatusTranslations: MessageRequestStatusLanguageTranslation =
  i18nEngine.registerEnum(
    MessageRequestStatus,
    {
      [LanguageCodes.DE]: {
        [MessageRequestStatus.Pending]: 'Ausstehend',
        [MessageRequestStatus.Accepted]: 'Akzeptiert',
        [MessageRequestStatus.Declined]: 'Abgelehnt',
      },
      [LanguageCodes.EN_GB]: {
        [MessageRequestStatus.Pending]: 'Pending',
        [MessageRequestStatus.Accepted]: 'Accepted',
        [MessageRequestStatus.Declined]: 'Declined',
      },
      [LanguageCodes.EN_US]: {
        [MessageRequestStatus.Pending]: 'Pending',
        [MessageRequestStatus.Accepted]: 'Accepted',
        [MessageRequestStatus.Declined]: 'Declined',
      },
      [LanguageCodes.ES]: {
        [MessageRequestStatus.Pending]: 'Pendiente',
        [MessageRequestStatus.Accepted]: 'Aceptado',
        [MessageRequestStatus.Declined]: 'Rechazado',
      },
      [LanguageCodes.FR]: {
        [MessageRequestStatus.Pending]: 'En attente',
        [MessageRequestStatus.Accepted]: 'Accepté',
        [MessageRequestStatus.Declined]: 'Refusé',
      },
      [LanguageCodes.JA]: {
        [MessageRequestStatus.Pending]: '保留中',
        [MessageRequestStatus.Accepted]: '承認済み',
        [MessageRequestStatus.Declined]: '辞退',
      },
      [LanguageCodes.UK]: {
        [MessageRequestStatus.Pending]: 'Очікує',
        [MessageRequestStatus.Accepted]: 'Прийнято',
        [MessageRequestStatus.Declined]: 'Відхилено',
      },
      [LanguageCodes.ZH_CN]: {
        [MessageRequestStatus.Pending]: '待处理',
        [MessageRequestStatus.Accepted]: '已接受',
        [MessageRequestStatus.Declined]: '已拒绝',
      },
    },
    'MessageRequestStatus',
  );
