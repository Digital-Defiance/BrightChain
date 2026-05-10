import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { EOBStatus } from '../billing';

export type EOBStatusLanguageTranslation = EnumLanguageTranslation<EOBStatus>;

export const EOBStatusTranslations: EOBStatusLanguageTranslation =
  i18nEngine.registerEnum(
    EOBStatus,
    {
      [LanguageCodes.DE]: {
        [EOBStatus.Active]: 'Aktiv',
        [EOBStatus.Cancelled]: 'Storniert',
        [EOBStatus.Draft]: 'Entwurf',
        [EOBStatus.EnteredInError]: 'Fehlerhafte Eingabe',
      },
      [LanguageCodes.EN_GB]: {
        [EOBStatus.Active]: 'Active',
        [EOBStatus.Cancelled]: 'Cancelled',
        [EOBStatus.Draft]: 'Draft',
        [EOBStatus.EnteredInError]: 'Entered-in-error',
      },
      [LanguageCodes.EN_US]: {
        [EOBStatus.Active]: 'Active',
        [EOBStatus.Cancelled]: 'Cancelled',
        [EOBStatus.Draft]: 'Draft',
        [EOBStatus.EnteredInError]: 'Entered-in-error',
      },
      [LanguageCodes.ES]: {
        [EOBStatus.Active]: 'Activo',
        [EOBStatus.Cancelled]: 'Cancelado',
        [EOBStatus.Draft]: 'Borrador',
        [EOBStatus.EnteredInError]: 'Error de ingreso',
      },
      [LanguageCodes.FR]: {
        [EOBStatus.Active]: 'Actif',
        [EOBStatus.Cancelled]: 'Annulé',
        [EOBStatus.Draft]: 'Brouillon',
        [EOBStatus.EnteredInError]: 'Erreur de saisie',
      },
      [LanguageCodes.JA]: {
        [EOBStatus.Active]: '活性',
        [EOBStatus.Cancelled]: 'キャンセル',
        [EOBStatus.Draft]: '下書き',
        [EOBStatus.EnteredInError]: '入力エラー',
      },
      [LanguageCodes.UK]: {
        [EOBStatus.Active]: 'Активний',
        [EOBStatus.Cancelled]: 'Скасований',
        [EOBStatus.Draft]: 'Проект',
        [EOBStatus.EnteredInError]: 'Помилкове введення',
      },
      [LanguageCodes.ZH_CN]: {
        [EOBStatus.Active]: '激活',
        [EOBStatus.Cancelled]: '已取消',
        [EOBStatus.Draft]: '草稿',
        [EOBStatus.EnteredInError]: '输入错误',
      },
    },
    'EOBStatus',
  );
