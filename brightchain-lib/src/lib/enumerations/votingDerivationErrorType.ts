import { StringNames } from './stringNames';

export enum VotingDerivationErrorType {
  FailedToGeneratePrime = 'FailedToGeneratePrime',
  IdenticalPrimes = 'IdenticalPrimes',
  KeyPairTooSmall = 'KeyPairTooSmall',
  KeyPairValidationFailed = 'KeyPairValidationFailed',
  ModularInverseDoesNotExist = 'ModularInverseDoesNotExist',
  PrivateKeyMustBeBuffer = 'PrivateKeyMustBeBuffer',
  PublicKeyMustBeBuffer = 'PublicKeyMustBeBuffer',
  InvalidPublicKeyFormat = 'InvalidPublicKeyFormat',
  InvalidEcdhKeyPair = 'InvalidEcdhKeyPair',
  FailedToDeriveVotingKeys = 'FailedToDeriveVotingKeys',
}

export const VotingDerivationErrorTypes: {
  [key in VotingDerivationErrorType]: StringNames;
} = {
  [VotingDerivationErrorType.FailedToGeneratePrime]:
    StringNames.Error_VotingDerivationErrorFailedToGeneratePrime,
  [VotingDerivationErrorType.IdenticalPrimes]:
    StringNames.Error_VotingDerivationErrorIdenticalPrimes,
  [VotingDerivationErrorType.KeyPairTooSmall]:
    StringNames.Error_VotingDerivationErrorKeyPairTooSmallTemplate,
  [VotingDerivationErrorType.KeyPairValidationFailed]:
    StringNames.Error_VotingDerivationErrorKeyPairValidationFailed,
  [VotingDerivationErrorType.ModularInverseDoesNotExist]:
    StringNames.Error_VotingDerivationErrorModularInverseDoesNotExist,
  [VotingDerivationErrorType.PrivateKeyMustBeBuffer]:
    StringNames.Error_VotingDerivationErrorPrivateKeyMustBeBuffer,
  [VotingDerivationErrorType.PublicKeyMustBeBuffer]:
    StringNames.Error_VotingDerivationErrorPublicKeyMustBeBuffer,
  [VotingDerivationErrorType.InvalidPublicKeyFormat]:
    StringNames.Error_VotingDerivationErrorInvalidPublicKeyFormat,
  [VotingDerivationErrorType.InvalidEcdhKeyPair]:
    StringNames.Error_VotingDerivationErrorInvalidEcdhKeyPair,
  [VotingDerivationErrorType.FailedToDeriveVotingKeys]:
    StringNames.Error_VotingDerivationErrorFailedToDeriveVotingKeysTemplate,
};
