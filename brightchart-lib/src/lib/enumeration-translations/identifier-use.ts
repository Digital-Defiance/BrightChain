import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { IdentifierUse } from '../fhir';

export type IdentifierUseLanguageTranslation =
  EnumLanguageTranslation<IdentifierUse>;

export const IdentifierUseTranslations: IdentifierUseLanguageTranslation =
  i18nEngine.registerEnum(
    IdentifierUse,
    {
      [LanguageCodes.DE]: {
        [IdentifierUse.Usual]: 'Üblich',
        [IdentifierUse.Official]: 'Offiziell',
        [IdentifierUse.Temp]: 'Vorübergehend',
        [IdentifierUse.Secondary]: 'Sekundär',
        [IdentifierUse.Old]: 'Alt',
      },
      [LanguageCodes.EN_GB]: {
        [IdentifierUse.Usual]: 'Usual',
        [IdentifierUse.Official]: 'Official',
        [IdentifierUse.Temp]: 'Temporary',
        [IdentifierUse.Secondary]: 'Secondary',
        [IdentifierUse.Old]: 'Old',
      },
      [LanguageCodes.EN_US]: {
        [IdentifierUse.Usual]: 'Usual',
        [IdentifierUse.Official]: 'Official',
        [IdentifierUse.Temp]: 'Temporary',
        [IdentifierUse.Secondary]: 'Secondary',
        [IdentifierUse.Old]: 'Old',
      },
      [LanguageCodes.ES]: {
        [IdentifierUse.Usual]: 'Habitual',
        [IdentifierUse.Official]: 'Oficial',
        [IdentifierUse.Temp]: 'Temporal',
        [IdentifierUse.Secondary]: 'Secundario',
        [IdentifierUse.Old]: 'Anterior',
      },
      [LanguageCodes.FR]: {
        [IdentifierUse.Usual]: 'Usuel',
        [IdentifierUse.Official]: 'Officiel',
        [IdentifierUse.Temp]: 'Temporaire',
        [IdentifierUse.Secondary]: 'Secondaire',
        [IdentifierUse.Old]: 'Ancien',
      },
      [LanguageCodes.JA]: {
        [IdentifierUse.Usual]: '通常',
        [IdentifierUse.Official]: '公式',
        [IdentifierUse.Temp]: '一時的',
        [IdentifierUse.Secondary]: '二次',
        [IdentifierUse.Old]: '旧',
      },
      [LanguageCodes.UK]: {
        [IdentifierUse.Usual]: 'Звичайний',
        [IdentifierUse.Official]: 'Офіційний',
        [IdentifierUse.Temp]: 'Тимчасовий',
        [IdentifierUse.Secondary]: 'Вторинний',
        [IdentifierUse.Old]: 'Старий',
      },
      [LanguageCodes.ZH_CN]: {
        [IdentifierUse.Usual]: '常用',
        [IdentifierUse.Official]: '正式',
        [IdentifierUse.Temp]: '临时',
        [IdentifierUse.Secondary]: '次要',
        [IdentifierUse.Old]: '旧',
      },
    },
    'IdentifierUse',
  );
