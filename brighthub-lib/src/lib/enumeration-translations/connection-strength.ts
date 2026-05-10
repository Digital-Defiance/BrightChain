import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { ConnectionStrength } from '../enumerations/connection-strength';

export type ConnectionStrengthLanguageTranslation =
  EnumLanguageTranslation<ConnectionStrength>;

export const ConnectionStrengthTranslations: ConnectionStrengthLanguageTranslation =
  i18nEngine.registerEnum(
    ConnectionStrength,
    {
      [LanguageCodes.DE]: {
        [ConnectionStrength.Strong]: 'Stark',
        [ConnectionStrength.Moderate]: 'Mäßig',
        [ConnectionStrength.Weak]: 'Schwach',
        [ConnectionStrength.Dormant]: 'Ruhend',
      },
      [LanguageCodes.EN_GB]: {
        [ConnectionStrength.Strong]: 'Strong',
        [ConnectionStrength.Moderate]: 'Moderate',
        [ConnectionStrength.Weak]: 'Weak',
        [ConnectionStrength.Dormant]: 'Dormant',
      },
      [LanguageCodes.EN_US]: {
        [ConnectionStrength.Strong]: 'Strong',
        [ConnectionStrength.Moderate]: 'Moderate',
        [ConnectionStrength.Weak]: 'Weak',
        [ConnectionStrength.Dormant]: 'Dormant',
      },
      [LanguageCodes.ES]: {
        [ConnectionStrength.Strong]: 'Fuerte',
        [ConnectionStrength.Moderate]: 'Moderado',
        [ConnectionStrength.Weak]: 'Débil',
        [ConnectionStrength.Dormant]: 'Inactivo',
      },
      [LanguageCodes.FR]: {
        [ConnectionStrength.Strong]: 'Fort',
        [ConnectionStrength.Moderate]: 'Modéré',
        [ConnectionStrength.Weak]: 'Faible',
        [ConnectionStrength.Dormant]: 'Dormant',
      },
      [LanguageCodes.JA]: {
        [ConnectionStrength.Strong]: '強い',
        [ConnectionStrength.Moderate]: '中程度',
        [ConnectionStrength.Weak]: '弱い',
        [ConnectionStrength.Dormant]: '休眠',
      },
      [LanguageCodes.UK]: {
        [ConnectionStrength.Strong]: 'Сильний',
        [ConnectionStrength.Moderate]: 'Помірний',
        [ConnectionStrength.Weak]: 'Слабкий',
        [ConnectionStrength.Dormant]: 'Неактивний',
      },
      [LanguageCodes.ZH_CN]: {
        [ConnectionStrength.Strong]: '强',
        [ConnectionStrength.Moderate]: '中等',
        [ConnectionStrength.Weak]: '弱',
        [ConnectionStrength.Dormant]: '休眠',
      },
    },
    'ConnectionStrength',
  );
