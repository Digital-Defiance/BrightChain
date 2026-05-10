import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { AddressUse } from '../fhir';

export type AddressUseLanguageTranslation = EnumLanguageTranslation<AddressUse>;

export const AddressUseTranslations: AddressUseLanguageTranslation =
  i18nEngine.registerEnum(
    AddressUse,
    {
      [LanguageCodes.DE]: {
        [AddressUse.Home]: 'Zuhause',
        [AddressUse.Work]: 'Arbeit',
        [AddressUse.Temp]: 'Vorübergehend',
        [AddressUse.Old]: 'Alt',
        [AddressUse.Billing]: 'Rechnungsadresse',
      },
      [LanguageCodes.EN_GB]: {
        [AddressUse.Home]: 'Home',
        [AddressUse.Work]: 'Work',
        [AddressUse.Temp]: 'Temporary',
        [AddressUse.Old]: 'Old',
        [AddressUse.Billing]: 'Billing',
      },
      [LanguageCodes.EN_US]: {
        [AddressUse.Home]: 'Home',
        [AddressUse.Work]: 'Work',
        [AddressUse.Temp]: 'Temporary',
        [AddressUse.Old]: 'Old',
        [AddressUse.Billing]: 'Billing',
      },
      [LanguageCodes.ES]: {
        [AddressUse.Home]: 'Domicilio',
        [AddressUse.Work]: 'Trabajo',
        [AddressUse.Temp]: 'Temporal',
        [AddressUse.Old]: 'Anterior',
        [AddressUse.Billing]: 'Facturación',
      },
      [LanguageCodes.FR]: {
        [AddressUse.Home]: 'Domicile',
        [AddressUse.Work]: 'Travail',
        [AddressUse.Temp]: 'Temporaire',
        [AddressUse.Old]: 'Ancien',
        [AddressUse.Billing]: 'Facturation',
      },
      [LanguageCodes.JA]: {
        [AddressUse.Home]: '自宅',
        [AddressUse.Work]: '職場',
        [AddressUse.Temp]: '一時的',
        [AddressUse.Old]: '旧',
        [AddressUse.Billing]: '請求先',
      },
      [LanguageCodes.UK]: {
        [AddressUse.Home]: 'Домашня',
        [AddressUse.Work]: 'Робоча',
        [AddressUse.Temp]: 'Тимчасова',
        [AddressUse.Old]: 'Стара',
        [AddressUse.Billing]: 'Для рахунків',
      },
      [LanguageCodes.ZH_CN]: {
        [AddressUse.Home]: '家庭',
        [AddressUse.Work]: '工作',
        [AddressUse.Temp]: '临时',
        [AddressUse.Old]: '旧',
        [AddressUse.Billing]: '账单',
      },
    },
    'AddressUse',
  );
