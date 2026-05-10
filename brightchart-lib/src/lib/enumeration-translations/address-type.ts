import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { AddressType } from '../fhir';

export type AddressTypeLanguageTranslation =
  EnumLanguageTranslation<AddressType>;

export const AddressTypeTranslations: AddressTypeLanguageTranslation =
  i18nEngine.registerEnum(
    AddressType,
    {
      [LanguageCodes.DE]: {
        [AddressType.Postal]: 'Postalisch',
        [AddressType.Physical]: 'Physisch',
        [AddressType.Both]: 'Beides',
      },
      [LanguageCodes.EN_GB]: {
        [AddressType.Postal]: 'Postal',
        [AddressType.Physical]: 'Physical',
        [AddressType.Both]: 'Both',
      },
      [LanguageCodes.EN_US]: {
        [AddressType.Postal]: 'Postal',
        [AddressType.Physical]: 'Physical',
        [AddressType.Both]: 'Both',
      },
      [LanguageCodes.ES]: {
        [AddressType.Postal]: 'Postal',
        [AddressType.Physical]: 'Físico',
        [AddressType.Both]: 'Ambos',
      },
      [LanguageCodes.FR]: {
        [AddressType.Postal]: 'Postal',
        [AddressType.Physical]: 'Physique',
        [AddressType.Both]: 'Les deux',
      },
      [LanguageCodes.JA]: {
        [AddressType.Postal]: '郵便',
        [AddressType.Physical]: '物理',
        [AddressType.Both]: '両方',
      },
      [LanguageCodes.UK]: {
        [AddressType.Postal]: 'Поштова',
        [AddressType.Physical]: 'Фізична',
        [AddressType.Both]: 'Обидва',
      },
      [LanguageCodes.ZH_CN]: {
        [AddressType.Postal]: '邮政',
        [AddressType.Physical]: '实际',
        [AddressType.Both]: '两者',
      },
    },
    'AddressType',
  );
