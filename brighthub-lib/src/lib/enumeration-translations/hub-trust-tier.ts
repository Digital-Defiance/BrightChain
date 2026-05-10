import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { HubTrustTier } from '../interfaces/base-hub';

export type HubTrustTierLanguageTranslation =
  EnumLanguageTranslation<HubTrustTier>;

export const HubTrustTierTranslations: HubTrustTierLanguageTranslation =
  i18nEngine.registerEnum(
    HubTrustTier,
    {
      [LanguageCodes.DE]: {
        [HubTrustTier.Open]: 'Offen',
        [HubTrustTier.Verified]: 'Verifiziert',
        [HubTrustTier.Encrypted]: 'Verschlüsselt',
      },
      [LanguageCodes.EN_GB]: {
        [HubTrustTier.Open]: 'Open',
        [HubTrustTier.Verified]: 'Verified',
        [HubTrustTier.Encrypted]: 'Encrypted',
      },
      [LanguageCodes.EN_US]: {
        [HubTrustTier.Open]: 'Open',
        [HubTrustTier.Verified]: 'Verified',
        [HubTrustTier.Encrypted]: 'Encrypted',
      },
      [LanguageCodes.ES]: {
        [HubTrustTier.Open]: 'Abierto',
        [HubTrustTier.Verified]: 'Verificado',
        [HubTrustTier.Encrypted]: 'Cifrado',
      },
      [LanguageCodes.FR]: {
        [HubTrustTier.Open]: 'Ouvert',
        [HubTrustTier.Verified]: 'Vérifié',
        [HubTrustTier.Encrypted]: 'Chiffré',
      },
      [LanguageCodes.JA]: {
        [HubTrustTier.Open]: 'オープン',
        [HubTrustTier.Verified]: '認証済み',
        [HubTrustTier.Encrypted]: '暗号化',
      },
      [LanguageCodes.UK]: {
        [HubTrustTier.Open]: 'Відкритий',
        [HubTrustTier.Verified]: 'Верифікований',
        [HubTrustTier.Encrypted]: 'Зашифрований',
      },
      [LanguageCodes.ZH_CN]: {
        [HubTrustTier.Open]: '开放',
        [HubTrustTier.Verified]: '已验证',
        [HubTrustTier.Encrypted]: '加密',
      },
    },
    'HubTrustTier',
  );
