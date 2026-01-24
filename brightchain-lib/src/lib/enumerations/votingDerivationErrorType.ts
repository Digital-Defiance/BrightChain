import { BrightChainStrings } from './brightChainStrings';

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
  [key in VotingDerivationErrorType]: BrightChainStrings;
} = {
  [VotingDerivationErrorType.FailedToGeneratePrime]:
    BrightChainStrings.Error_VotingDerivationErrorFailedToGeneratePrime,
  [VotingDerivationErrorType.IdenticalPrimes]:
    BrightChainStrings.Error_VotingDerivationErrorIdenticalPrimes,
  [VotingDerivationErrorType.KeyPairTooSmall]:
    BrightChainStrings.Error_VotingDerivationErrorKeyPairTooSmallTemplate,
  [VotingDerivationErrorType.KeyPairValidationFailed]:
    BrightChainStrings.Error_VotingDerivationErrorKeyPairValidationFailed,
  [VotingDerivationErrorType.ModularInverseDoesNotExist]:
    BrightChainStrings.Error_VotingDerivationErrorModularInverseDoesNotExist,
  [VotingDerivationErrorType.PrivateKeyMustBeBuffer]:
    BrightChainStrings.Error_VotingDerivationErrorPrivateKeyMustBeBuffer,
  [VotingDerivationErrorType.PublicKeyMustBeBuffer]:
    BrightChainStrings.Error_VotingDerivationErrorPublicKeyMustBeBuffer,
  [VotingDerivationErrorType.InvalidPublicKeyFormat]:
    BrightChainStrings.Error_VotingDerivationErrorInvalidPublicKeyFormat,
  [VotingDerivationErrorType.InvalidEcdhKeyPair]:
    BrightChainStrings.Error_VotingDerivationErrorInvalidEcdhKeyPair,
  [VotingDerivationErrorType.FailedToDeriveVotingKeys]:
    BrightChainStrings.Error_VotingDerivationErrorFailedToDeriveVotingKeysTemplate,
};
