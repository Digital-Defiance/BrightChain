import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { CompositionStatus } from '../documentation';

export type CompositionStatusLanguageTranslation =
  EnumLanguageTranslation<CompositionStatus>;

export const CompositionStatusTranslations: CompositionStatusLanguageTranslation =
  i18nEngine.registerEnum(
    CompositionStatus,
    {
      [LanguageCodes.DE]: {
        [CompositionStatus.Preliminary]: 'Vorläufig',
        [CompositionStatus.Final]: 'Endgültig',
        [CompositionStatus.Amended]: 'Geändert',
        [CompositionStatus.EnteredInError]: 'Irrtümlich eingegeben',
      },
      [LanguageCodes.EN_GB]: {
        [CompositionStatus.Preliminary]: 'Preliminary',
        [CompositionStatus.Final]: 'Final',
        [CompositionStatus.Amended]: 'Amended',
        [CompositionStatus.EnteredInError]: 'Entered in Error',
      },
      [LanguageCodes.EN_US]: {
        [CompositionStatus.Preliminary]: 'Preliminary',
        [CompositionStatus.Final]: 'Final',
        [CompositionStatus.Amended]: 'Amended',
        [CompositionStatus.EnteredInError]: 'Entered in Error',
      },
      [LanguageCodes.ES]: {
        [CompositionStatus.Preliminary]: 'Preliminar',
        [CompositionStatus.Final]: 'Final',
        [CompositionStatus.Amended]: 'Modificado',
        [CompositionStatus.EnteredInError]: 'Ingresado por error',
      },
      [LanguageCodes.FR]: {
        [CompositionStatus.Preliminary]: 'Préliminaire',
        [CompositionStatus.Final]: 'Final',
        [CompositionStatus.Amended]: 'Modifié',
        [CompositionStatus.EnteredInError]: 'Saisi par erreur',
      },
      [LanguageCodes.JA]: {
        [CompositionStatus.Preliminary]: '暫定',
        [CompositionStatus.Final]: '最終',
        [CompositionStatus.Amended]: '修正済み',
        [CompositionStatus.EnteredInError]: '誤入力',
      },
      [LanguageCodes.UK]: {
        [CompositionStatus.Preliminary]: 'Попередній',
        [CompositionStatus.Final]: 'Остаточний',
        [CompositionStatus.Amended]: 'Змінений',
        [CompositionStatus.EnteredInError]: 'Помилково введений',
      },
      [LanguageCodes.ZH_CN]: {
        [CompositionStatus.Preliminary]: '初步',
        [CompositionStatus.Final]: '最终',
        [CompositionStatus.Amended]: '已修改',
        [CompositionStatus.EnteredInError]: '误录入',
      },
    },
    'CompositionStatus',
  );
