import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { AllergyIntoleranceCriticality } from '../clinical';

export type AllergyIntoleranceCriticalityLanguageTranslation =
  EnumLanguageTranslation<AllergyIntoleranceCriticality>;

export const AllergyIntoleranceCriticalityTranslations: AllergyIntoleranceCriticalityLanguageTranslation =
  i18nEngine.registerEnum(
    AllergyIntoleranceCriticality,
    {
      [LanguageCodes.DE]: {
        [AllergyIntoleranceCriticality.Low]: 'Niedrig',
        [AllergyIntoleranceCriticality.High]: 'Hoch',
        [AllergyIntoleranceCriticality.UnableToAssess]: 'Nicht beurteilbar',
      },
      [LanguageCodes.EN_GB]: {
        [AllergyIntoleranceCriticality.Low]: 'Low',
        [AllergyIntoleranceCriticality.High]: 'High',
        [AllergyIntoleranceCriticality.UnableToAssess]: 'Unable to Assess',
      },
      [LanguageCodes.EN_US]: {
        [AllergyIntoleranceCriticality.Low]: 'Low',
        [AllergyIntoleranceCriticality.High]: 'High',
        [AllergyIntoleranceCriticality.UnableToAssess]: 'Unable to Assess',
      },
      [LanguageCodes.ES]: {
        [AllergyIntoleranceCriticality.Low]: 'Bajo',
        [AllergyIntoleranceCriticality.High]: 'Alto',
        [AllergyIntoleranceCriticality.UnableToAssess]: 'No evaluable',
      },
      [LanguageCodes.FR]: {
        [AllergyIntoleranceCriticality.Low]: 'Faible',
        [AllergyIntoleranceCriticality.High]: 'Élevé',
        [AllergyIntoleranceCriticality.UnableToAssess]: 'Impossible à évaluer',
      },
      [LanguageCodes.JA]: {
        [AllergyIntoleranceCriticality.Low]: '低',
        [AllergyIntoleranceCriticality.High]: '高',
        [AllergyIntoleranceCriticality.UnableToAssess]: '評価不能',
      },
      [LanguageCodes.UK]: {
        [AllergyIntoleranceCriticality.Low]: 'Низький',
        [AllergyIntoleranceCriticality.High]: 'Високий',
        [AllergyIntoleranceCriticality.UnableToAssess]: 'Неможливо оцінити',
      },
      [LanguageCodes.ZH_CN]: {
        [AllergyIntoleranceCriticality.Low]: '低',
        [AllergyIntoleranceCriticality.High]: '高',
        [AllergyIntoleranceCriticality.UnableToAssess]: '无法评估',
      },
    },
    'AllergyIntoleranceCriticality',
  );
