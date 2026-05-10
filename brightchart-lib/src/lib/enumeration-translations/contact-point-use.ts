import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { ContactPointUse } from '../fhir';

export type ContactPointUseLanguageTranslation =
  EnumLanguageTranslation<ContactPointUse>;

export const ContactPointUseTranslations: ContactPointUseLanguageTranslation =
  i18nEngine.registerEnum(
    ContactPointUse,
    {
      [LanguageCodes.DE]: {
        [ContactPointUse.Home]: 'Zuhause',
        [ContactPointUse.Work]: 'Arbeit',
        [ContactPointUse.Temp]: 'Vorübergehend',
        [ContactPointUse.Old]: 'Alt',
        [ContactPointUse.Mobile]: 'Mobil',
      },
      [LanguageCodes.EN_GB]: {
        [ContactPointUse.Home]: 'Home',
        [ContactPointUse.Work]: 'Work',
        [ContactPointUse.Temp]: 'Temporary',
        [ContactPointUse.Old]: 'Old',
        [ContactPointUse.Mobile]: 'Mobile',
      },
      [LanguageCodes.EN_US]: {
        [ContactPointUse.Home]: 'Home',
        [ContactPointUse.Work]: 'Work',
        [ContactPointUse.Temp]: 'Temporary',
        [ContactPointUse.Old]: 'Old',
        [ContactPointUse.Mobile]: 'Mobile',
      },
      [LanguageCodes.ES]: {
        [ContactPointUse.Home]: 'Domicilio',
        [ContactPointUse.Work]: 'Trabajo',
        [ContactPointUse.Temp]: 'Temporal',
        [ContactPointUse.Old]: 'Anterior',
        [ContactPointUse.Mobile]: 'Móvil',
      },
      [LanguageCodes.FR]: {
        [ContactPointUse.Home]: 'Domicile',
        [ContactPointUse.Work]: 'Travail',
        [ContactPointUse.Temp]: 'Temporaire',
        [ContactPointUse.Old]: 'Ancien',
        [ContactPointUse.Mobile]: 'Mobile',
      },
      [LanguageCodes.JA]: {
        [ContactPointUse.Home]: '自宅',
        [ContactPointUse.Work]: '職場',
        [ContactPointUse.Temp]: '一時的',
        [ContactPointUse.Old]: '旧',
        [ContactPointUse.Mobile]: '携帯',
      },
      [LanguageCodes.UK]: {
        [ContactPointUse.Home]: 'Домашній',
        [ContactPointUse.Work]: 'Робочий',
        [ContactPointUse.Temp]: 'Тимчасовий',
        [ContactPointUse.Old]: 'Старий',
        [ContactPointUse.Mobile]: 'Мобільний',
      },
      [LanguageCodes.ZH_CN]: {
        [ContactPointUse.Home]: '家庭',
        [ContactPointUse.Work]: '工作',
        [ContactPointUse.Temp]: '临时',
        [ContactPointUse.Old]: '旧',
        [ContactPointUse.Mobile]: '手机',
      },
    },
    'ContactPointUse',
  );
