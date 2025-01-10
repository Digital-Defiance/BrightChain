import QuorumDataRecordActionType from '../enumerations/actionType';
import { StringLanguages } from '../enumerations/stringLanguages';

export type QuorumDataRecordActionTypeTranslation = {
  [key in QuorumDataRecordActionType]: string;
};
export type QuorumDataRecordActionTypeLanguageTranslation = {
  [key in StringLanguages]: QuorumDataRecordActionTypeTranslation;
};

export const QuorumDataRecordActionTypeTranslations: QuorumDataRecordActionTypeLanguageTranslation =
  {
    [StringLanguages.EnglishUS]: {
      [QuorumDataRecordActionType.Seal]: 'Seal',
      [QuorumDataRecordActionType.Unseal]: 'Unseal',
      [QuorumDataRecordActionType.Reseal]: 'Reseal',
      [QuorumDataRecordActionType.ValidateHeldKeys]: 'Validate Held Keys',
      [QuorumDataRecordActionType.ValidateRecordIntegrity]:
        'Validate Record Integrity',
    },
  };
