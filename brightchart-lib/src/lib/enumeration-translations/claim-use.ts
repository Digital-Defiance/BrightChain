import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { ClaimUse } from '../billing';

export type ClaimUseLanguageTranslation = EnumLanguageTranslation<ClaimUse>;

export const ClaimUseTranslations: ClaimUseLanguageTranslation =
  i18nEngine.registerEnum(
    ClaimUse,
    {
      [LanguageCodes.DE]: {
        [ClaimUse.Claim]: 'Behandlungskosten',
        [ClaimUse.Preauthorization]: 'Vorautorisierung',
        [ClaimUse.Predetermination]: 'Vorbestimmung',
      },
      [LanguageCodes.EN_GB]: {
        [ClaimUse.Claim]: 'Claim',
        [ClaimUse.Preauthorization]: 'Pre-Authorization',
        [ClaimUse.Predetermination]: 'Pre-Determination',
      },
      [LanguageCodes.EN_US]: {
        [ClaimUse.Claim]: 'Claim',
        [ClaimUse.Preauthorization]: 'Pre-Authorization',
        [ClaimUse.Predetermination]: 'Pre-Determination',
      },
      [LanguageCodes.ES]: {
        [ClaimUse.Claim]: 'Reclamación',
        [ClaimUse.Preauthorization]: 'Preautorización',
        [ClaimUse.Predetermination]: 'Precalificación',
      },
      [LanguageCodes.FR]: {
        [ClaimUse.Claim]: 'Réclamation',
        [ClaimUse.Preauthorization]: 'Préautorisation',
        [ClaimUse.Predetermination]: 'Prétermination',
      },
      [LanguageCodes.JA]: {
        [ClaimUse.Claim]: '請求',
        [ClaimUse.Preauthorization]: '预授权',
        [ClaimUse.Predetermination]: '预确定',
      },
      [LanguageCodes.UK]: {
        [ClaimUse.Claim]: 'Претензія',
        [ClaimUse.Preauthorization]: 'Попередня авторизація',
        [ClaimUse.Predetermination]: 'Попереднє визначення',
      },
      [LanguageCodes.ZH_CN]: {
        [ClaimUse.Claim]: '索赔',
        [ClaimUse.Preauthorization]: '预授权',
        [ClaimUse.Predetermination]: '预确定',
      },
    },
    'ClaimUse',
  );
