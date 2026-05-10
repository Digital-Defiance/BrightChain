import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { ParticipationStatus } from '../scheduling';

export type ParticipationStatusLanguageTranslation =
  EnumLanguageTranslation<ParticipationStatus>;

export const ParticipationStatusTranslations: ParticipationStatusLanguageTranslation =
  i18nEngine.registerEnum(
    ParticipationStatus,
    {
      [LanguageCodes.DE]: {
        [ParticipationStatus.Accepted]: 'Akzeptiert',
        [ParticipationStatus.Declined]: 'Abgelehnt',
        [ParticipationStatus.Tentative]: 'Vorläufig',
        [ParticipationStatus.NeedsAction]: 'Aktion erforderlich',
      },
      [LanguageCodes.EN_GB]: {
        [ParticipationStatus.Accepted]: 'Accepted',
        [ParticipationStatus.Declined]: 'Declined',
        [ParticipationStatus.Tentative]: 'Tentative',
        [ParticipationStatus.NeedsAction]: 'Needs Action',
      },
      [LanguageCodes.EN_US]: {
        [ParticipationStatus.Accepted]: 'Accepted',
        [ParticipationStatus.Declined]: 'Declined',
        [ParticipationStatus.Tentative]: 'Tentative',
        [ParticipationStatus.NeedsAction]: 'Needs Action',
      },
      [LanguageCodes.ES]: {
        [ParticipationStatus.Accepted]: 'Aceptado',
        [ParticipationStatus.Declined]: 'Rechazado',
        [ParticipationStatus.Tentative]: 'Provisional',
        [ParticipationStatus.NeedsAction]: 'Acción requerida',
      },
      [LanguageCodes.FR]: {
        [ParticipationStatus.Accepted]: 'Accepté',
        [ParticipationStatus.Declined]: 'Refusé',
        [ParticipationStatus.Tentative]: 'Provisoire',
        [ParticipationStatus.NeedsAction]: 'Action requise',
      },
      [LanguageCodes.JA]: {
        [ParticipationStatus.Accepted]: '承諾',
        [ParticipationStatus.Declined]: '辞退',
        [ParticipationStatus.Tentative]: '仮',
        [ParticipationStatus.NeedsAction]: '要対応',
      },
      [LanguageCodes.UK]: {
        [ParticipationStatus.Accepted]: 'Прийнято',
        [ParticipationStatus.Declined]: 'Відхилено',
        [ParticipationStatus.Tentative]: 'Попередній',
        [ParticipationStatus.NeedsAction]: 'Потребує дії',
      },
      [LanguageCodes.ZH_CN]: {
        [ParticipationStatus.Accepted]: '已接受',
        [ParticipationStatus.Declined]: '已拒绝',
        [ParticipationStatus.Tentative]: '暂定',
        [ParticipationStatus.NeedsAction]: '需要操作',
      },
    },
    'ParticipationStatus',
  );
