import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { EligibilityRequestPurpose } from '../billing';

export type EligibilityRequestPurposeLanguageTranslation =
  EnumLanguageTranslation<EligibilityRequestPurpose>;

export const EligibilityRequestPurposeTranslations: EligibilityRequestPurposeLanguageTranslation =
  i18nEngine.registerEnum(
    EligibilityRequestPurpose,
    {
      [LanguageCodes.DE]: {
        [EligibilityRequestPurpose.AuthRequirements]:
          'Autorisierungsanforderungen',
        [EligibilityRequestPurpose.Benefits]: 'Leistungen',
        [EligibilityRequestPurpose.Discovery]: 'Ermittlung',
        [EligibilityRequestPurpose.Validation]: 'Validierung',
      },
      [LanguageCodes.EN_GB]: {
        [EligibilityRequestPurpose.AuthRequirements]: 'Auth-Requirements',
        [EligibilityRequestPurpose.Benefits]: 'Benefits',
        [EligibilityRequestPurpose.Discovery]: 'Discovery',
        [EligibilityRequestPurpose.Validation]: 'Validation',
      },
      [LanguageCodes.EN_US]: {
        [EligibilityRequestPurpose.AuthRequirements]: 'Auth-Requirements',
        [EligibilityRequestPurpose.Benefits]: 'Benefits',
        [EligibilityRequestPurpose.Discovery]: 'Discovery',
        [EligibilityRequestPurpose.Validation]: 'Validation',
      },
      [LanguageCodes.ES]: {
        [EligibilityRequestPurpose.AuthRequirements]:
          'Requisitos de autorización',
        [EligibilityRequestPurpose.Benefits]: 'Beneficios',
        [EligibilityRequestPurpose.Discovery]: 'Descubrir',
        [EligibilityRequestPurpose.Validation]: 'Validación',
      },
      [LanguageCodes.FR]: {
        [EligibilityRequestPurpose.AuthRequirements]:
          "Conditions d'autorisation",
        [EligibilityRequestPurpose.Benefits]: 'Prestations',
        [EligibilityRequestPurpose.Discovery]: 'Découverte',
        [EligibilityRequestPurpose.Validation]: 'Validation',
      },
      [LanguageCodes.JA]: {
        [EligibilityRequestPurpose.AuthRequirements]: '認証要件',
        [EligibilityRequestPurpose.Benefits]: '給付',
        [EligibilityRequestPurpose.Discovery]: '照会',
        [EligibilityRequestPurpose.Validation]: '検証',
      },
      [LanguageCodes.UK]: {
        [EligibilityRequestPurpose.AuthRequirements]: 'Вимоги авторизації',
        [EligibilityRequestPurpose.Benefits]: 'Пільги',
        [EligibilityRequestPurpose.Discovery]: 'Виявлення',
        [EligibilityRequestPurpose.Validation]: 'Валідація',
      },
      [LanguageCodes.ZH_CN]: {
        [EligibilityRequestPurpose.AuthRequirements]: '授权要求',
        [EligibilityRequestPurpose.Benefits]: '福利',
        [EligibilityRequestPurpose.Discovery]: '查询',
        [EligibilityRequestPurpose.Validation]: '验证',
      },
    },
    'EligibilityRequestPurpose',
  );
