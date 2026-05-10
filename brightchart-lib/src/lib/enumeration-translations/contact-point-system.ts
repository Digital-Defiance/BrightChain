import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { ContactPointSystem } from '../fhir';

export type ContactPointSystemLanguageTranslation =
  EnumLanguageTranslation<ContactPointSystem>;

export const ContactPointSystemTranslations: ContactPointSystemLanguageTranslation =
  i18nEngine.registerEnum(
    ContactPointSystem,
    {
      [LanguageCodes.DE]: {
        [ContactPointSystem.Phone]: 'Telefon',
        [ContactPointSystem.Fax]: 'Fax',
        [ContactPointSystem.Email]: 'E-Mail',
        [ContactPointSystem.Pager]: 'Pager',
        [ContactPointSystem.Url]: 'URL',
        [ContactPointSystem.Sms]: 'SMS',
        [ContactPointSystem.Other]: 'Sonstig',
      },
      [LanguageCodes.EN_GB]: {
        [ContactPointSystem.Phone]: 'Phone',
        [ContactPointSystem.Fax]: 'Fax',
        [ContactPointSystem.Email]: 'Email',
        [ContactPointSystem.Pager]: 'Pager',
        [ContactPointSystem.Url]: 'URL',
        [ContactPointSystem.Sms]: 'SMS',
        [ContactPointSystem.Other]: 'Other',
      },
      [LanguageCodes.EN_US]: {
        [ContactPointSystem.Phone]: 'Phone',
        [ContactPointSystem.Fax]: 'Fax',
        [ContactPointSystem.Email]: 'Email',
        [ContactPointSystem.Pager]: 'Pager',
        [ContactPointSystem.Url]: 'URL',
        [ContactPointSystem.Sms]: 'SMS',
        [ContactPointSystem.Other]: 'Other',
      },
      [LanguageCodes.ES]: {
        [ContactPointSystem.Phone]: 'Teléfono',
        [ContactPointSystem.Fax]: 'Fax',
        [ContactPointSystem.Email]: 'Correo electrónico',
        [ContactPointSystem.Pager]: 'Buscapersonas',
        [ContactPointSystem.Url]: 'URL',
        [ContactPointSystem.Sms]: 'SMS',
        [ContactPointSystem.Other]: 'Otro',
      },
      [LanguageCodes.FR]: {
        [ContactPointSystem.Phone]: 'Téléphone',
        [ContactPointSystem.Fax]: 'Fax',
        [ContactPointSystem.Email]: 'Courriel',
        [ContactPointSystem.Pager]: 'Téléavertisseur',
        [ContactPointSystem.Url]: 'URL',
        [ContactPointSystem.Sms]: 'SMS',
        [ContactPointSystem.Other]: 'Autre',
      },
      [LanguageCodes.JA]: {
        [ContactPointSystem.Phone]: '電話',
        [ContactPointSystem.Fax]: 'ファックス',
        [ContactPointSystem.Email]: 'メール',
        [ContactPointSystem.Pager]: 'ポケベル',
        [ContactPointSystem.Url]: 'URL',
        [ContactPointSystem.Sms]: 'SMS',
        [ContactPointSystem.Other]: 'その他',
      },
      [LanguageCodes.UK]: {
        [ContactPointSystem.Phone]: 'Телефон',
        [ContactPointSystem.Fax]: 'Факс',
        [ContactPointSystem.Email]: 'Електронна пошта',
        [ContactPointSystem.Pager]: 'Пейджер',
        [ContactPointSystem.Url]: 'URL',
        [ContactPointSystem.Sms]: 'SMS',
        [ContactPointSystem.Other]: 'Інше',
      },
      [LanguageCodes.ZH_CN]: {
        [ContactPointSystem.Phone]: '电话',
        [ContactPointSystem.Fax]: '传真',
        [ContactPointSystem.Email]: '电子邮件',
        [ContactPointSystem.Pager]: '寻呼机',
        [ContactPointSystem.Url]: 'URL',
        [ContactPointSystem.Sms]: '短信',
        [ContactPointSystem.Other]: '其他',
      },
    },
    'ContactPointSystem',
  );
