import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { MedicationStatus } from '../clinical';

export type MedicationStatusLanguageTranslation =
  EnumLanguageTranslation<MedicationStatus>;

export const MedicationStatusTranslations: MedicationStatusLanguageTranslation =
  i18nEngine.registerEnum(
    MedicationStatus,
    {
      [LanguageCodes.DE]: {
        [MedicationStatus.Active]: 'Aktiv',
        [MedicationStatus.Inactive]: 'Inaktiv',
        [MedicationStatus.EnteredInError]: 'Irrtümlich eingegeben',
      },
      [LanguageCodes.EN_GB]: {
        [MedicationStatus.Active]: 'Active',
        [MedicationStatus.Inactive]: 'Inactive',
        [MedicationStatus.EnteredInError]: 'Entered in Error',
      },
      [LanguageCodes.EN_US]: {
        [MedicationStatus.Active]: 'Active',
        [MedicationStatus.Inactive]: 'Inactive',
        [MedicationStatus.EnteredInError]: 'Entered in Error',
      },
      [LanguageCodes.ES]: {
        [MedicationStatus.Active]: 'Activo',
        [MedicationStatus.Inactive]: 'Inactivo',
        [MedicationStatus.EnteredInError]: 'Ingresado por error',
      },
      [LanguageCodes.FR]: {
        [MedicationStatus.Active]: 'Actif',
        [MedicationStatus.Inactive]: 'Inactif',
        [MedicationStatus.EnteredInError]: 'Saisi par erreur',
      },
      [LanguageCodes.JA]: {
        [MedicationStatus.Active]: '活動中',
        [MedicationStatus.Inactive]: '非活動',
        [MedicationStatus.EnteredInError]: '誤入力',
      },
      [LanguageCodes.UK]: {
        [MedicationStatus.Active]: 'Активний',
        [MedicationStatus.Inactive]: 'Неактивний',
        [MedicationStatus.EnteredInError]: 'Помилково введений',
      },
      [LanguageCodes.ZH_CN]: {
        [MedicationStatus.Active]: '活跃',
        [MedicationStatus.Inactive]: '非活跃',
        [MedicationStatus.EnteredInError]: '误录入',
      },
    },
    'MedicationStatus',
  );
