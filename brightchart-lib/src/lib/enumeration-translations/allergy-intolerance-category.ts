import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { AllergyIntoleranceCategory } from '../clinical';

export type AllergyIntoleranceCategoryLanguageTranslation =
  EnumLanguageTranslation<AllergyIntoleranceCategory>;

export const AllergyIntoleranceCategoryTranslations: AllergyIntoleranceCategoryLanguageTranslation =
  i18nEngine.registerEnum(
    AllergyIntoleranceCategory,
    {
      [LanguageCodes.DE]: {
        [AllergyIntoleranceCategory.Food]: 'Nahrungsmittel',
        [AllergyIntoleranceCategory.Medication]: 'Medikament',
        [AllergyIntoleranceCategory.Environment]: 'Umwelt',
        [AllergyIntoleranceCategory.Biologic]: 'Biologisch',
      },
      [LanguageCodes.EN_GB]: {
        [AllergyIntoleranceCategory.Food]: 'Food',
        [AllergyIntoleranceCategory.Medication]: 'Medication',
        [AllergyIntoleranceCategory.Environment]: 'Environment',
        [AllergyIntoleranceCategory.Biologic]: 'Biologic',
      },
      [LanguageCodes.EN_US]: {
        [AllergyIntoleranceCategory.Food]: 'Food',
        [AllergyIntoleranceCategory.Medication]: 'Medication',
        [AllergyIntoleranceCategory.Environment]: 'Environment',
        [AllergyIntoleranceCategory.Biologic]: 'Biologic',
      },
      [LanguageCodes.ES]: {
        [AllergyIntoleranceCategory.Food]: 'Alimento',
        [AllergyIntoleranceCategory.Medication]: 'Medicamento',
        [AllergyIntoleranceCategory.Environment]: 'Ambiente',
        [AllergyIntoleranceCategory.Biologic]: 'Biológico',
      },
      [LanguageCodes.FR]: {
        [AllergyIntoleranceCategory.Food]: 'Alimentaire',
        [AllergyIntoleranceCategory.Medication]: 'Médicament',
        [AllergyIntoleranceCategory.Environment]: 'Environnement',
        [AllergyIntoleranceCategory.Biologic]: 'Biologique',
      },
      [LanguageCodes.JA]: {
        [AllergyIntoleranceCategory.Food]: '食物',
        [AllergyIntoleranceCategory.Medication]: '薬剤',
        [AllergyIntoleranceCategory.Environment]: '環境',
        [AllergyIntoleranceCategory.Biologic]: '生物学的',
      },
      [LanguageCodes.UK]: {
        [AllergyIntoleranceCategory.Food]: 'Харчова',
        [AllergyIntoleranceCategory.Medication]: 'Медикаментозна',
        [AllergyIntoleranceCategory.Environment]: 'Екологічна',
        [AllergyIntoleranceCategory.Biologic]: 'Біологічна',
      },
      [LanguageCodes.ZH_CN]: {
        [AllergyIntoleranceCategory.Food]: '食物',
        [AllergyIntoleranceCategory.Medication]: '药物',
        [AllergyIntoleranceCategory.Environment]: '环境',
        [AllergyIntoleranceCategory.Biologic]: '生物',
      },
    },
    'AllergyIntoleranceCategory',
  );
