import { StringNames } from './stringNames';

export enum IsolatedKeyErrorType {
  InvalidPublicKey = 'InvalidPublicKey',
  InvalidKeyId = 'InvalidKeyId',
  InvalidKeyFormat = 'InvalidKeyFormat',
  InvalidKeyLength = 'InvalidKeyLength',
  InvalidKeyType = 'InvalidKeyType',
  KeyIsolationViolation = 'KeyIsolationViolation',
}

export const IsolatedKeyErrorTypes: {
  [key in IsolatedKeyErrorType]: StringNames;
} = {
  [IsolatedKeyErrorType.InvalidPublicKey]:
    StringNames.Error_IsolatedKeyErrorInvalidPublicKey,
  [IsolatedKeyErrorType.InvalidKeyId]:
    StringNames.Error_IsolatedKeyErrorInvalidKeyId,
  [IsolatedKeyErrorType.InvalidKeyFormat]:
    StringNames.Error_IsolatedKeyErrorInvalidKeyFormat,
  [IsolatedKeyErrorType.InvalidKeyLength]:
    StringNames.Error_IsolatedKeyErrorInvalidKeyLength,
  [IsolatedKeyErrorType.InvalidKeyType]:
    StringNames.Error_IsolatedKeyErrorInvalidKeyType,
  [IsolatedKeyErrorType.KeyIsolationViolation]:
    StringNames.Error_IsolatedKeyErrorKeyIsolationViolation,
};
