import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { ParticipantRequired } from '../scheduling';

export type ParticipantRequiredLanguageTranslation =
  EnumLanguageTranslation<ParticipantRequired>;

export const ParticipantRequiredTranslations: ParticipantRequiredLanguageTranslation =
  i18nEngine.registerEnum(
    ParticipantRequired,
    {
      [LanguageCodes.DE]: {
        [ParticipantRequired.Required]: 'Erforderlich',
        [ParticipantRequired.Optional]: 'Optional',
        [ParticipantRequired.InformationOnly]: 'Nur zur Information',
      },
      [LanguageCodes.EN_GB]: {
        [ParticipantRequired.Required]: 'Required',
        [ParticipantRequired.Optional]: 'Optional',
        [ParticipantRequired.InformationOnly]: 'Information Only',
      },
      [LanguageCodes.EN_US]: {
        [ParticipantRequired.Required]: 'Required',
        [ParticipantRequired.Optional]: 'Optional',
        [ParticipantRequired.InformationOnly]: 'Information Only',
      },
      [LanguageCodes.ES]: {
        [ParticipantRequired.Required]: 'Requerido',
        [ParticipantRequired.Optional]: 'Opcional',
        [ParticipantRequired.InformationOnly]: 'Solo información',
      },
      [LanguageCodes.FR]: {
        [ParticipantRequired.Required]: 'Requis',
        [ParticipantRequired.Optional]: 'Optionnel',
        [ParticipantRequired.InformationOnly]: 'Information uniquement',
      },
      [LanguageCodes.JA]: {
        [ParticipantRequired.Required]: '必須',
        [ParticipantRequired.Optional]: '任意',
        [ParticipantRequired.InformationOnly]: '情報のみ',
      },
      [LanguageCodes.UK]: {
        [ParticipantRequired.Required]: "Обов'язковий",
        [ParticipantRequired.Optional]: "Необов'язковий",
        [ParticipantRequired.InformationOnly]: 'Лише для інформації',
      },
      [LanguageCodes.ZH_CN]: {
        [ParticipantRequired.Required]: '必需',
        [ParticipantRequired.Optional]: '可选',
        [ParticipantRequired.InformationOnly]: '仅供参考',
      },
    },
    'ParticipantRequired',
  );
