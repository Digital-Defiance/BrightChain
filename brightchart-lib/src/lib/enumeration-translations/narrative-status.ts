import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { NarrativeStatus } from '../fhir';

export type NarrativeStatusLanguageTranslation =
  EnumLanguageTranslation<NarrativeStatus>;

export const NarrativeStatusTranslations: NarrativeStatusLanguageTranslation =
  i18nEngine.registerEnum(
    NarrativeStatus,
    {
      [LanguageCodes.DE]: {
        [NarrativeStatus.Generated]: 'Generiert',
        [NarrativeStatus.Extensions]: 'Erweiterungen',
        [NarrativeStatus.Additional]: 'Zusätzlich',
        [NarrativeStatus.Empty]: 'Leer',
      },
      [LanguageCodes.EN_GB]: {
        [NarrativeStatus.Generated]: 'Generated',
        [NarrativeStatus.Extensions]: 'Extensions',
        [NarrativeStatus.Additional]: 'Additional',
        [NarrativeStatus.Empty]: 'Empty',
      },
      [LanguageCodes.EN_US]: {
        [NarrativeStatus.Generated]: 'Generated',
        [NarrativeStatus.Extensions]: 'Extensions',
        [NarrativeStatus.Additional]: 'Additional',
        [NarrativeStatus.Empty]: 'Empty',
      },
      [LanguageCodes.ES]: {
        [NarrativeStatus.Generated]: 'Generado',
        [NarrativeStatus.Extensions]: 'Extensiones',
        [NarrativeStatus.Additional]: 'Adicional',
        [NarrativeStatus.Empty]: 'Vacío',
      },
      [LanguageCodes.FR]: {
        [NarrativeStatus.Generated]: 'Généré',
        [NarrativeStatus.Extensions]: 'Extensions',
        [NarrativeStatus.Additional]: 'Supplémentaire',
        [NarrativeStatus.Empty]: 'Vide',
      },
      [LanguageCodes.JA]: {
        [NarrativeStatus.Generated]: '生成済み',
        [NarrativeStatus.Extensions]: '拡張',
        [NarrativeStatus.Additional]: '追加',
        [NarrativeStatus.Empty]: '空',
      },
      [LanguageCodes.UK]: {
        [NarrativeStatus.Generated]: 'Згенерований',
        [NarrativeStatus.Extensions]: 'Розширення',
        [NarrativeStatus.Additional]: 'Додатковий',
        [NarrativeStatus.Empty]: 'Порожній',
      },
      [LanguageCodes.ZH_CN]: {
        [NarrativeStatus.Generated]: '已生成',
        [NarrativeStatus.Extensions]: '扩展',
        [NarrativeStatus.Additional]: '附加',
        [NarrativeStatus.Empty]: '空',
      },
    },
    'NarrativeStatus',
  );
