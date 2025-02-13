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
  ModularInverseDoesNotExist = 'ModularInverseDoesNotExist',
  PrivateKeyMustBeBuffer = 'PrivateKeyMustBeBuffer',
  PublicKeyMustBeBuffer = 'PublicKeyMustBeBuffer',
  InvalidPublicKeyFormat = 'InvalidPublicKeyFormat',
  InvalidEcdhKeyPair = 'InvalidEcdhKeyPair',
  FailedToDeriveVotingKeys = 'FailedToDeriveVotingKeys',
  FailedToGeneratePrime = 'FailedToGeneratePrime',
  IdenticalPrimes = 'IdenticalPrimes',
  KeyPairTooSmall = 'KeyPairTooSmall',
  KeyPairValidationFailed = 'KeyPairValidationFailed',
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
  [VotingErrorType.ModularInverseDoesNotExist]:
    StringNames.Error_VotingDerivationErrorModularInverseDoesNotExist,
  [VotingErrorType.PrivateKeyMustBeBuffer]:
    StringNames.Error_VotingDerivationErrorPrivateKeyMustBeBuffer,
  [VotingErrorType.PublicKeyMustBeBuffer]:
    StringNames.Error_VotingDerivationErrorPublicKeyMustBeBuffer,
  [VotingErrorType.InvalidPublicKeyFormat]:
    StringNames.Error_VotingDerivationErrorInvalidPublicKeyFormat,
  [VotingErrorType.InvalidEcdhKeyPair]:
    StringNames.Error_VotingDerivationErrorInvalidEcdhKeyPair,
  [VotingErrorType.FailedToDeriveVotingKeys]:
    StringNames.Error_VotingDerivationErrorFailedToDeriveVotingKeysTemplate,
  [VotingErrorType.FailedToGeneratePrime]:
    StringNames.Error_VotingDerivationErrorFailedToGeneratePrime,
  [VotingErrorType.IdenticalPrimes]:
    StringNames.Error_VotingDerivationErrorIdenticalPrimes,
  [VotingErrorType.KeyPairTooSmall]:
    StringNames.Error_VotingDerivationErrorKeyPairTooSmallTemplate,
  [VotingErrorType.KeyPairValidationFailed]:
    StringNames.Error_VotingDerivationErrorKeyPairValidationFailed,
};
