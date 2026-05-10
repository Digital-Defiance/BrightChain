import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { ConditionClinicalStatus } from '../clinical';

export type ConditionClinicalStatusLanguageTranslation =
  EnumLanguageTranslation<ConditionClinicalStatus>;

export const ConditionClinicalStatusTranslations: ConditionClinicalStatusLanguageTranslation =
  i18nEngine.registerEnum(
    ConditionClinicalStatus,
    {
      [LanguageCodes.DE]: {
        [ConditionClinicalStatus.Active]: 'Aktiv',
        [ConditionClinicalStatus.Recurrence]: 'Rezidiv',
        [ConditionClinicalStatus.Relapse]: 'Rückfall',
        [ConditionClinicalStatus.Inactive]: 'Inaktiv',
        [ConditionClinicalStatus.Remission]: 'Remission',
        [ConditionClinicalStatus.Resolved]: 'Behoben',
      },
      [LanguageCodes.EN_GB]: {
        [ConditionClinicalStatus.Active]: 'Active',
        [ConditionClinicalStatus.Recurrence]: 'Recurrence',
        [ConditionClinicalStatus.Relapse]: 'Relapse',
        [ConditionClinicalStatus.Inactive]: 'Inactive',
        [ConditionClinicalStatus.Remission]: 'Remission',
        [ConditionClinicalStatus.Resolved]: 'Resolved',
      },
      [LanguageCodes.EN_US]: {
        [ConditionClinicalStatus.Active]: 'Active',
        [ConditionClinicalStatus.Recurrence]: 'Recurrence',
        [ConditionClinicalStatus.Relapse]: 'Relapse',
        [ConditionClinicalStatus.Inactive]: 'Inactive',
        [ConditionClinicalStatus.Remission]: 'Remission',
        [ConditionClinicalStatus.Resolved]: 'Resolved',
      },
      [LanguageCodes.ES]: {
        [ConditionClinicalStatus.Active]: 'Activo',
        [ConditionClinicalStatus.Recurrence]: 'Recurrencia',
        [ConditionClinicalStatus.Relapse]: 'Recaída',
        [ConditionClinicalStatus.Inactive]: 'Inactivo',
        [ConditionClinicalStatus.Remission]: 'Remisión',
        [ConditionClinicalStatus.Resolved]: 'Resuelto',
      },
      [LanguageCodes.FR]: {
        [ConditionClinicalStatus.Active]: 'Actif',
        [ConditionClinicalStatus.Recurrence]: 'Récurrence',
        [ConditionClinicalStatus.Relapse]: 'Rechute',
        [ConditionClinicalStatus.Inactive]: 'Inactif',
        [ConditionClinicalStatus.Remission]: 'Rémission',
        [ConditionClinicalStatus.Resolved]: 'Résolu',
      },
      [LanguageCodes.JA]: {
        [ConditionClinicalStatus.Active]: '活動中',
        [ConditionClinicalStatus.Recurrence]: '再発',
        [ConditionClinicalStatus.Relapse]: '再燃',
        [ConditionClinicalStatus.Inactive]: '非活動',
        [ConditionClinicalStatus.Remission]: '寛解',
        [ConditionClinicalStatus.Resolved]: '解決済み',
      },
      [LanguageCodes.UK]: {
        [ConditionClinicalStatus.Active]: 'Активний',
        [ConditionClinicalStatus.Recurrence]: 'Рецидив',
        [ConditionClinicalStatus.Relapse]: 'Рецидив',
        [ConditionClinicalStatus.Inactive]: 'Неактивний',
        [ConditionClinicalStatus.Remission]: 'Ремісія',
        [ConditionClinicalStatus.Resolved]: 'Вирішений',
      },
      [LanguageCodes.ZH_CN]: {
        [ConditionClinicalStatus.Active]: '活跃',
        [ConditionClinicalStatus.Recurrence]: '复发',
        [ConditionClinicalStatus.Relapse]: '再发',
        [ConditionClinicalStatus.Inactive]: '非活跃',
        [ConditionClinicalStatus.Remission]: '缓解',
        [ConditionClinicalStatus.Resolved]: '已解决',
      },
    },
    'ConditionClinicalStatus',
  );
