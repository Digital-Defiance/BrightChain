import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { AttestationMode } from '../documentation';

export type AttestationModeLanguageTranslation =
  EnumLanguageTranslation<AttestationMode>;

export const AttestationModeTranslations: AttestationModeLanguageTranslation =
  i18nEngine.registerEnum(
    AttestationMode,
    {
      [LanguageCodes.DE]: {
        [AttestationMode.Personal]: 'Persönlich',
        [AttestationMode.Professional]: 'Professionell',
        [AttestationMode.Legal]: 'Rechtlich',
        [AttestationMode.Official]: 'Offiziell',
      },
      [LanguageCodes.EN_GB]: {
        [AttestationMode.Personal]: 'Personal',
        [AttestationMode.Professional]: 'Professional',
        [AttestationMode.Legal]: 'Legal',
        [AttestationMode.Official]: 'Official',
      },
      [LanguageCodes.EN_US]: {
        [AttestationMode.Personal]: 'Personal',
        [AttestationMode.Professional]: 'Professional',
        [AttestationMode.Legal]: 'Legal',
        [AttestationMode.Official]: 'Official',
      },
      [LanguageCodes.ES]: {
        [AttestationMode.Personal]: 'Personal',
        [AttestationMode.Professional]: 'Profesional',
        [AttestationMode.Legal]: 'Legal',
        [AttestationMode.Official]: 'Oficial',
      },
      [LanguageCodes.FR]: {
        [AttestationMode.Personal]: 'Personnel',
        [AttestationMode.Professional]: 'Professionnel',
        [AttestationMode.Legal]: 'Légal',
        [AttestationMode.Official]: 'Officiel',
      },
      [LanguageCodes.JA]: {
        [AttestationMode.Personal]: '個人',
        [AttestationMode.Professional]: '専門',
        [AttestationMode.Legal]: '法的',
        [AttestationMode.Official]: '公式',
      },
      [LanguageCodes.UK]: {
        [AttestationMode.Personal]: 'Особистий',
        [AttestationMode.Professional]: 'Професійний',
        [AttestationMode.Legal]: 'Юридичний',
        [AttestationMode.Official]: 'Офіційний',
      },
      [LanguageCodes.ZH_CN]: {
        [AttestationMode.Personal]: '个人',
        [AttestationMode.Professional]: '专业',
        [AttestationMode.Legal]: '法律',
        [AttestationMode.Official]: '官方',
      },
    },
    'AttestationMode',
  );
