import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { AdministrativeGender } from '../fhir';

export type AdministrativeGenderLanguageTranslation =
  EnumLanguageTranslation<AdministrativeGender>;

export const AdministrativeGenderTranslations: AdministrativeGenderLanguageTranslation =
  i18nEngine.registerEnum(
    AdministrativeGender,
    {
      [LanguageCodes.DE]: {
        [AdministrativeGender.Male]: 'Männlich',
        [AdministrativeGender.Female]: 'Weiblich',
        [AdministrativeGender.Other]: 'Sonstig',
        [AdministrativeGender.Unknown]: 'Unbekannt',
      },
      [LanguageCodes.EN_GB]: {
        [AdministrativeGender.Male]: 'Male',
        [AdministrativeGender.Female]: 'Female',
        [AdministrativeGender.Other]: 'Other',
        [AdministrativeGender.Unknown]: 'Unknown',
      },
      [LanguageCodes.EN_US]: {
        [AdministrativeGender.Male]: 'Male',
        [AdministrativeGender.Female]: 'Female',
        [AdministrativeGender.Other]: 'Other',
        [AdministrativeGender.Unknown]: 'Unknown',
      },
      [LanguageCodes.ES]: {
        [AdministrativeGender.Male]: 'Masculino',
        [AdministrativeGender.Female]: 'Femenino',
        [AdministrativeGender.Other]: 'Otro',
        [AdministrativeGender.Unknown]: 'Desconocido',
      },
      [LanguageCodes.FR]: {
        [AdministrativeGender.Male]: 'Masculin',
        [AdministrativeGender.Female]: 'Féminin',
        [AdministrativeGender.Other]: 'Autre',
        [AdministrativeGender.Unknown]: 'Inconnu',
      },
      [LanguageCodes.JA]: {
        [AdministrativeGender.Male]: '男性',
        [AdministrativeGender.Female]: '女性',
        [AdministrativeGender.Other]: 'その他',
        [AdministrativeGender.Unknown]: '不明',
      },
      [LanguageCodes.UK]: {
        [AdministrativeGender.Male]: 'Чоловічий',
        [AdministrativeGender.Female]: 'Жіночий',
        [AdministrativeGender.Other]: 'Інший',
        [AdministrativeGender.Unknown]: 'Невідомий',
      },
      [LanguageCodes.ZH_CN]: {
        [AdministrativeGender.Male]: '男性',
        [AdministrativeGender.Female]: '女性',
        [AdministrativeGender.Other]: '其他',
        [AdministrativeGender.Unknown]: '未知',
      },
    },
    'AdministrativeGender',
  );
