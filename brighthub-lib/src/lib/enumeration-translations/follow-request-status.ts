import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { FollowRequestStatus } from '../enumerations/follow-request-status';

export type FollowRequestStatusLanguageTranslation =
  EnumLanguageTranslation<FollowRequestStatus>;

export const FollowRequestStatusTranslations: FollowRequestStatusLanguageTranslation =
  i18nEngine.registerEnum(
    FollowRequestStatus,
    {
      [LanguageCodes.DE]: {
        [FollowRequestStatus.Pending]: 'Ausstehend',
        [FollowRequestStatus.Approved]: 'Genehmigt',
        [FollowRequestStatus.Rejected]: 'Abgelehnt',
      },
      [LanguageCodes.EN_GB]: {
        [FollowRequestStatus.Pending]: 'Pending',
        [FollowRequestStatus.Approved]: 'Approved',
        [FollowRequestStatus.Rejected]: 'Rejected',
      },
      [LanguageCodes.EN_US]: {
        [FollowRequestStatus.Pending]: 'Pending',
        [FollowRequestStatus.Approved]: 'Approved',
        [FollowRequestStatus.Rejected]: 'Rejected',
      },
      [LanguageCodes.ES]: {
        [FollowRequestStatus.Pending]: 'Pendiente',
        [FollowRequestStatus.Approved]: 'Aprobado',
        [FollowRequestStatus.Rejected]: 'Rechazado',
      },
      [LanguageCodes.FR]: {
        [FollowRequestStatus.Pending]: 'En attente',
        [FollowRequestStatus.Approved]: 'Approuvé',
        [FollowRequestStatus.Rejected]: 'Rejeté',
      },
      [LanguageCodes.JA]: {
        [FollowRequestStatus.Pending]: '保留中',
        [FollowRequestStatus.Approved]: '承認済み',
        [FollowRequestStatus.Rejected]: '拒否',
      },
      [LanguageCodes.UK]: {
        [FollowRequestStatus.Pending]: 'Очікує',
        [FollowRequestStatus.Approved]: 'Схвалено',
        [FollowRequestStatus.Rejected]: 'Відхилено',
      },
      [LanguageCodes.ZH_CN]: {
        [FollowRequestStatus.Pending]: '待处理',
        [FollowRequestStatus.Approved]: '已批准',
        [FollowRequestStatus.Rejected]: '已拒绝',
      },
    },
    'FollowRequestStatus',
  );
