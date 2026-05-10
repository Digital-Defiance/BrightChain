import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { CoverageStatus } from '../billing';

export type CoverageStatusLanguageTranslation =
  EnumLanguageTranslation<CoverageStatus>;

export const CoverageStatusTranslations: CoverageStatusLanguageTranslation =
  i18nEngine.registerEnum(
    CoverageStatus,
    {
      [LanguageCodes.DE]: {
        [CoverageStatus.Active]: 'Aktiv',
        [CoverageStatus.Cancelled]: 'Storniert',
        [CoverageStatus.Draft]: 'Entwurf',
        [CoverageStatus.EnteredInError]: 'Fehlerhafte Eingabe',
      },
      [LanguageCodes.EN_GB]: {
        [CoverageStatus.Active]: 'Active',
        [CoverageStatus.Cancelled]: 'Cancelled',
        [CoverageStatus.Draft]: 'Draft',
        [CoverageStatus.EnteredInError]: 'Entered-in-error',
      },
      [LanguageCodes.EN_US]: {
        [CoverageStatus.Active]: 'Active',
        [CoverageStatus.Cancelled]: 'Cancelled',
        [CoverageStatus.Draft]: 'Draft',
        [CoverageStatus.EnteredInError]: 'Entered-in-error',
      },
      [LanguageCodes.ES]: {
        [CoverageStatus.Active]: 'Activ',
        [CoverageStatus.Cancelled]: 'Cancelado',
        [CoverageStatus.Draft]: 'Borrador',
        [CoverageStatus.EnteredInError]: 'Error introducido',
      },
      [LanguageCodes.FR]: {
        [CoverageStatus.Active]: 'Actif',
        [CoverageStatus.Cancelled]: 'Annulé',
        [CoverageStatus.Draft]: 'Brouillon',
        [CoverageStatus.EnteredInError]: 'Erreur de saisie',
      },
      [LanguageCodes.JA]: {
        [CoverageStatus.Active]: '活性',
        [CoverageStatus.Cancelled]: 'キャンセル',
        [CoverageStatus.Draft]: '下書き',
        [CoverageStatus.EnteredInError]: 'エラー入力',
      },
      [LanguageCodes.UK]: {
        [CoverageStatus.Active]: 'Активний',
        [CoverageStatus.Cancelled]: 'Скасований',
        [CoverageStatus.Draft]: 'Проект',
        [CoverageStatus.EnteredInError]: 'Помилкове введення',
      },
      [LanguageCodes.ZH_CN]: {
        [CoverageStatus.Active]: '激活',
        [CoverageStatus.Cancelled]: '已取消',
        [CoverageStatus.Draft]: '草稿',
        [CoverageStatus.EnteredInError]: '输入错误',
      },
    },
    'CoverageStatus',
  );
