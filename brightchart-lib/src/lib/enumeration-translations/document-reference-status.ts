import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { DocumentReferenceStatus } from '../documentation';

export type DocumentReferenceStatusLanguageTranslation =
  EnumLanguageTranslation<DocumentReferenceStatus>;

export const DocumentReferenceStatusTranslations: DocumentReferenceStatusLanguageTranslation =
  i18nEngine.registerEnum(
    DocumentReferenceStatus,
    {
      [LanguageCodes.DE]: {
        [DocumentReferenceStatus.Current]: 'Aktuell',
        [DocumentReferenceStatus.Superseded]: 'Ersetzt',
        [DocumentReferenceStatus.EnteredInError]: 'Irrtümlich eingegeben',
      },
      [LanguageCodes.EN_GB]: {
        [DocumentReferenceStatus.Current]: 'Current',
        [DocumentReferenceStatus.Superseded]: 'Superseded',
        [DocumentReferenceStatus.EnteredInError]: 'Entered in Error',
      },
      [LanguageCodes.EN_US]: {
        [DocumentReferenceStatus.Current]: 'Current',
        [DocumentReferenceStatus.Superseded]: 'Superseded',
        [DocumentReferenceStatus.EnteredInError]: 'Entered in Error',
      },
      [LanguageCodes.ES]: {
        [DocumentReferenceStatus.Current]: 'Actual',
        [DocumentReferenceStatus.Superseded]: 'Reemplazado',
        [DocumentReferenceStatus.EnteredInError]: 'Ingresado por error',
      },
      [LanguageCodes.FR]: {
        [DocumentReferenceStatus.Current]: 'Actuel',
        [DocumentReferenceStatus.Superseded]: 'Remplacé',
        [DocumentReferenceStatus.EnteredInError]: 'Saisi par erreur',
      },
      [LanguageCodes.JA]: {
        [DocumentReferenceStatus.Current]: '現行',
        [DocumentReferenceStatus.Superseded]: '置換済み',
        [DocumentReferenceStatus.EnteredInError]: '誤入力',
      },
      [LanguageCodes.UK]: {
        [DocumentReferenceStatus.Current]: 'Поточний',
        [DocumentReferenceStatus.Superseded]: 'Замінений',
        [DocumentReferenceStatus.EnteredInError]: 'Помилково введений',
      },
      [LanguageCodes.ZH_CN]: {
        [DocumentReferenceStatus.Current]: '当前',
        [DocumentReferenceStatus.Superseded]: '已替代',
        [DocumentReferenceStatus.EnteredInError]: '误录入',
      },
    },
    'DocumentReferenceStatus',
  );
