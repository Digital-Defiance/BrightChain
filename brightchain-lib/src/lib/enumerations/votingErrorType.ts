import { StringNames } from './stringNames';

export enum VotingErrorType {
  InvalidKeyPairPublicKeyNotIsolated = 'InvalidKeyPairPublicKeyNotIsolated',
  InvalidKeyPairPrivateKeyNotIsolated = 'InvalidKeyPairPrivateKeyNotIsolated',
  InvalidPublicKeyNotIsolated = 'InvalidPublicKeyNotIsolated',
  InvalidPublicKeyBufferTooShort = 'InvalidPublicKeyBufferTooShort',
  InvalidPublicKeyBufferWrongMagic = 'InvalidPublicKeyBufferWrongMagic',
  UnsupportedPublicKeyVersion = 'UnsupportedPublicKeyVersion',
  InvalidPublicKeyBufferIncompleteN = 'InvalidPublicKeyBufferIncompleteN',
  InvalidPublicKeyBufferFailedToParseN = 'InvalidPublicKeyBufferFailedToParseN',
  InvalidPublicKeyIdMismatch = 'InvalidPublicKeyIdMismatch',
}

export const VotingErrorTypes: {
  [key in VotingErrorType]: StringNames;
} = {
  [VotingErrorType.InvalidKeyPairPublicKeyNotIsolated]:
    StringNames.Error_VotingErrorInvalidKeyPairPublicKeyNotIsolated,
  [VotingErrorType.InvalidKeyPairPrivateKeyNotIsolated]:
    StringNames.Error_VotingErrorInvalidKeyPairPrivateKeyNotIsolated,
  [VotingErrorType.InvalidPublicKeyNotIsolated]:
    StringNames.Error_VotingErrorInvalidPublicKeyNotIsolated,
  [VotingErrorType.InvalidPublicKeyBufferTooShort]:
    StringNames.Error_VotingErrorInvalidPublicKeyBufferTooShort,
  [VotingErrorType.InvalidPublicKeyBufferWrongMagic]:
    StringNames.Error_VotingErrorInvalidPublicKeyBufferWrongMagic,
  [VotingErrorType.UnsupportedPublicKeyVersion]:
    StringNames.Error_VotingErrorUnsupportedPublicKeyVersion,
  [VotingErrorType.InvalidPublicKeyBufferIncompleteN]:
    StringNames.Error_VotingErrorInvalidPublicKeyBufferIncompleteN,
  [VotingErrorType.InvalidPublicKeyBufferFailedToParseN]:
    StringNames.Error_VotingErrorInvalidPublicKeyBufferFailedToParseNTemplate,
  [VotingErrorType.InvalidPublicKeyIdMismatch]:
    StringNames.Error_VotingErrorInvalidPublicKeyIdMismatch,
};
