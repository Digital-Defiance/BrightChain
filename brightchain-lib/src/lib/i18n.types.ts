import QuorumDataRecordActionType from './enumerations/actionType';
import MemberType from './enumerations/memberType';
import { StringLanguages } from './enumerations/stringLanguages';
import { TranslatableEnumType } from './enumerations/translatableEnum';

/**
 * Enums that can be translated
 */
export type TranslatableEnum =
  | { type: TranslatableEnumType.MemberType; value: MemberType }
  | {
      type: TranslatableEnumType.QuorumDataRecordAction;
      value: QuorumDataRecordActionType;
    };

/**
 * Translations map
 */
export type TranslationsMap = {
  [TranslatableEnumType.MemberType]: {
    [key in StringLanguages]: { [key in MemberType]: string };
  };
  [TranslatableEnumType.QuorumDataRecordAction]: {
    [key in StringLanguages]: { [key in QuorumDataRecordActionType]: string };
  };
};
