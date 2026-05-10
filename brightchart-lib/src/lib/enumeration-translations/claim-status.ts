import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { ClaimStatus } from '../billing';

export type ClaimStatusLanguageTranslation =
  EnumLanguageTranslation<ClaimStatus>;

export const ClaimStatusTranslations: ClaimStatusLanguageTranslation =
  i18nEngine.registerEnum(
    ClaimStatus,
    {
      [LanguageCodes.DE]: {
        [ClaimStatus.Active]: 'Aktiv',
        [ClaimStatus.Cancelled]: 'Storniert',
        [ClaimStatus.Draft]: 'Entwurf',
        [ClaimStatus.EnteredInError]: 'Fehlerhafte Eingabe',
      },
      [LanguageCodes.EN_GB]: {
        [ClaimStatus.Active]: 'Active',
        [ClaimStatus.Cancelled]: 'Cancelled',
        [ClaimStatus.Draft]: 'Draft',
        [ClaimStatus.EnteredInError]: 'Entered-in-error',
      },
      [LanguageCodes.EN_US]: {
        [ClaimStatus.Active]: 'Active',
        [ClaimStatus.Cancelled]: 'Cancelled',
        [ClaimStatus.Draft]: 'Draft',
        [ClaimStatus.EnteredInError]: 'Entered-in-error',
      },
      [LanguageCodes.ES]: {
        [ClaimStatus.Active]: 'Activ',
        [ClaimStatus.Cancelled]: 'Cancelado',
        [ClaimStatus.Draft]: 'Borrador',
        [ClaimStatus.EnteredInError]: 'Error introducido',
      },
      [LanguageCodes.FR]: {
        [ClaimStatus.Active]: 'Actif',
        [ClaimStatus.Cancelled]: 'Annulé',
        [ClaimStatus.Draft]: 'Brouillon',
        [ClaimStatus.EnteredInError]: 'Erreur de saisie',
      },
      [LanguageCodes.JA]: {
        [ClaimStatus.Active]: '活性',
        [ClaimStatus.Cancelled]: 'キャンセル',
        [ClaimStatus.Draft]: '下書き',
        [ClaimStatus.EnteredInError]: 'エラー入力',
      },
      [LanguageCodes.UK]: {
        [ClaimStatus.Active]: 'Активний',
        [ClaimStatus.Cancelled]: 'Скасований',
        [ClaimStatus.Draft]: 'Проект',
        [ClaimStatus.EnteredInError]: 'Помилкове введення',
      },
      [LanguageCodes.ZH_CN]: {
        [ClaimStatus.Active]: '激活',
        [ClaimStatus.Cancelled]: '已取消',
        [ClaimStatus.Draft]: '草稿',
        [ClaimStatus.EnteredInError]: '输入错误',
      },
    },
    'ClaimStatus',
  );
