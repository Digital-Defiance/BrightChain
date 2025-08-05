import QuorumDataRecordActionType from '../enumerations/actionType';
import { StringLanguages } from '../enumerations/stringLanguages';
import { registerTranslation } from '../i18n';
import { createTranslations, EnumLanguageTranslation } from '../types';

export type QuorumDataRecordActionTypeTranslation =
  EnumLanguageTranslation<QuorumDataRecordActionType>;

export const QuorumDataRecordActionTypeTranslations: QuorumDataRecordActionTypeTranslation =
  registerTranslation(
    QuorumDataRecordActionType,
    createTranslations({
      [StringLanguages.EnglishUS]: {
        [QuorumDataRecordActionType.Seal]: 'Seal',
        [QuorumDataRecordActionType.Unseal]: 'Unseal',
        [QuorumDataRecordActionType.Reseal]: 'Reseal',
        [QuorumDataRecordActionType.ValidateHeldKeys]: 'Validate Held Keys',
        [QuorumDataRecordActionType.ValidateRecordIntegrity]:
          'Validate Record Integrity',
      },
    }),
  );
