import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { AllergyIntoleranceSeverity } from '../clinical';

export type AllergyIntoleranceSeverityLanguageTranslation =
  EnumLanguageTranslation<AllergyIntoleranceSeverity>;

export const AllergyIntoleranceSeverityTranslations: AllergyIntoleranceSeverityLanguageTranslation =
  i18nEngine.registerEnum(
    AllergyIntoleranceSeverity,
    {
      [LanguageCodes.DE]: {
        [AllergyIntoleranceSeverity.Mild]: 'Leicht',
        [AllergyIntoleranceSeverity.Moderate]: 'Mäßig',
        [AllergyIntoleranceSeverity.Severe]: 'Schwer',
      },
      [LanguageCodes.EN_GB]: {
        [AllergyIntoleranceSeverity.Mild]: 'Mild',
        [AllergyIntoleranceSeverity.Moderate]: 'Moderate',
        [AllergyIntoleranceSeverity.Severe]: 'Severe',
      },
      [LanguageCodes.EN_US]: {
        [AllergyIntoleranceSeverity.Mild]: 'Mild',
        [AllergyIntoleranceSeverity.Moderate]: 'Moderate',
        [AllergyIntoleranceSeverity.Severe]: 'Severe',
      },
      [LanguageCodes.ES]: {
        [AllergyIntoleranceSeverity.Mild]: 'Leve',
        [AllergyIntoleranceSeverity.Moderate]: 'Moderado',
        [AllergyIntoleranceSeverity.Severe]: 'Grave',
      },
      [LanguageCodes.FR]: {
        [AllergyIntoleranceSeverity.Mild]: 'Léger',
        [AllergyIntoleranceSeverity.Moderate]: 'Modéré',
        [AllergyIntoleranceSeverity.Severe]: 'Sévère',
      },
      [LanguageCodes.JA]: {
        [AllergyIntoleranceSeverity.Mild]: '軽度',
        [AllergyIntoleranceSeverity.Moderate]: '中等度',
        [AllergyIntoleranceSeverity.Severe]: '重度',
      },
      [LanguageCodes.UK]: {
        [AllergyIntoleranceSeverity.Mild]: 'Легкий',
        [AllergyIntoleranceSeverity.Moderate]: 'Помірний',
        [AllergyIntoleranceSeverity.Severe]: 'Тяжкий',
      },
      [LanguageCodes.ZH_CN]: {
        [AllergyIntoleranceSeverity.Mild]: '轻度',
        [AllergyIntoleranceSeverity.Moderate]: '中度',
        [AllergyIntoleranceSeverity.Severe]: '重度',
      },
    },
    'AllergyIntoleranceSeverity',
  );
