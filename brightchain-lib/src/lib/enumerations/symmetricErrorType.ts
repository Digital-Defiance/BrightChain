import { StringNames } from './stringNames';

export enum SymmetricErrorType {
  DataNullOrUndefined = 'DataNullOrUndefined',
  InvalidKeyLength = 'InvalidKeyLength',
}

export const SymmetricErrorTypes: {
  [key in SymmetricErrorType]: StringNames;
} = {
  [SymmetricErrorType.DataNullOrUndefined]:
    StringNames.Error_SymmetricDataNullOrUndefined,
  [SymmetricErrorType.InvalidKeyLength]:
    StringNames.Error_SymmetricInvalidKeyLengthTemplate,
};
