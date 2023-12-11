import { BrightChainStringKey, BrightChainStrings } from './brightChainStrings';

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
  [key in VotingDerivationErrorType]: BrightChainStringKey;
} = {
  [VotingDerivationErrorType.FailedToGeneratePrime]:
    BrightChainStrings.Error_VotingDerivationError_FailedToGeneratePrime,
  [VotingDerivationErrorType.IdenticalPrimes]:
    BrightChainStrings.Error_VotingDerivationError_IdenticalPrimes,
  [VotingDerivationErrorType.KeyPairTooSmall]:
    BrightChainStrings.Error_VotingDerivationError_KeyPairTooSmallTemplate,
  [VotingDerivationErrorType.KeyPairValidationFailed]:
    BrightChainStrings.Error_VotingDerivationError_KeyPairValidationFailed,
  [VotingDerivationErrorType.ModularInverseDoesNotExist]:
    BrightChainStrings.Error_VotingDerivationError_ModularInverseDoesNotExist,
  [VotingDerivationErrorType.PrivateKeyMustBeBuffer]:
    BrightChainStrings.Error_VotingDerivationError_PrivateKeyMustBeBuffer,
  [VotingDerivationErrorType.PublicKeyMustBeBuffer]:
    BrightChainStrings.Error_VotingDerivationError_PublicKeyMustBeBuffer,
  [VotingDerivationErrorType.InvalidPublicKeyFormat]:
    BrightChainStrings.Error_VotingDerivationError_InvalidPublicKeyFormat,
  [VotingDerivationErrorType.InvalidEcdhKeyPair]:
    BrightChainStrings.Error_VotingDerivationError_InvalidEcdhKeyPair,
  [VotingDerivationErrorType.FailedToDeriveVotingKeys]:
    BrightChainStrings.Error_VotingDerivationError_FailedToDeriveVotingKeysTemplate,
};
