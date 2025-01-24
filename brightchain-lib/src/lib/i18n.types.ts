import QuorumDataRecordActionType from './enumerations/actionType';
import { BlockSize } from './enumerations/blockSizes';
import MemberType from './enumerations/memberType';
import { StringLanguages } from './enumerations/stringLanguages';
import { TranslatableEnumType } from './enumerations/translatableEnum';

export type StringOrObject = string | { [key: string]: StringOrObject };

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
  [TranslatableEnumType.BlockSize]: {
    [key in StringLanguages]: { [key in BlockSize]: string };
  };
  [TranslatableEnumType.MemberType]: {
    [key in StringLanguages]: { [key in MemberType]: string };
  };
  [TranslatableEnumType.QuorumDataRecordAction]: {
    [key in StringLanguages]: { [key in QuorumDataRecordActionType]: string };
  };
};
