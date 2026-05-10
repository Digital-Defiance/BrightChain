import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { AllergyIntoleranceType } from '../clinical';

export type AllergyIntoleranceTypeLanguageTranslation =
  EnumLanguageTranslation<AllergyIntoleranceType>;

export const AllergyIntoleranceTypeTranslations: AllergyIntoleranceTypeLanguageTranslation =
  i18nEngine.registerEnum(
    AllergyIntoleranceType,
    {
      [LanguageCodes.DE]: {
        [AllergyIntoleranceType.Allergy]: 'Allergie',
        [AllergyIntoleranceType.Intolerance]: 'Unverträglichkeit',
      },
      [LanguageCodes.EN_GB]: {
        [AllergyIntoleranceType.Allergy]: 'Allergy',
        [AllergyIntoleranceType.Intolerance]: 'Intolerance',
      },
      [LanguageCodes.EN_US]: {
        [AllergyIntoleranceType.Allergy]: 'Allergy',
        [AllergyIntoleranceType.Intolerance]: 'Intolerance',
      },
      [LanguageCodes.ES]: {
        [AllergyIntoleranceType.Allergy]: 'Alergia',
        [AllergyIntoleranceType.Intolerance]: 'Intolerancia',
      },
      [LanguageCodes.FR]: {
        [AllergyIntoleranceType.Allergy]: 'Allergie',
        [AllergyIntoleranceType.Intolerance]: 'Intolérance',
      },
      [LanguageCodes.JA]: {
        [AllergyIntoleranceType.Allergy]: 'アレルギー',
        [AllergyIntoleranceType.Intolerance]: '不耐性',
      },
      [LanguageCodes.UK]: {
        [AllergyIntoleranceType.Allergy]: 'Алергія',
        [AllergyIntoleranceType.Intolerance]: 'Непереносимість',
      },
      [LanguageCodes.ZH_CN]: {
        [AllergyIntoleranceType.Allergy]: '过敏',
        [AllergyIntoleranceType.Intolerance]: '不耐受',
      },
    },
    'AllergyIntoleranceType',
  );
