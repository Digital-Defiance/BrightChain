import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { VotingErrorType } from '../enumerations/votingErrorType';
import { TypedError } from './typedError';

export class VotingError extends TypedError<VotingErrorType> {
  public get reasonMap(): Record<VotingErrorType, StringNames> {
    return {
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
        StringNames.Error_VotingErrorModularInverseDoesNotExist,
      [VotingErrorType.PrivateKeyMustBeBuffer]:
        StringNames.Error_VotingErrorPrivateKeyMustBeBuffer,
      [VotingErrorType.PublicKeyMustBeBuffer]:
        StringNames.Error_VotingErrorPublicKeyMustBeBuffer,
      [VotingErrorType.InvalidPublicKeyFormat]:
        StringNames.Error_VotingErrorInvalidPublicKeyFormat,
      [VotingErrorType.InvalidEcdhKeyPair]:
        StringNames.Error_VotingErrorInvalidEcdhKeyPair,
      [VotingErrorType.FailedToDeriveVotingKeys]:
        StringNames.Error_VotingErrorFailedToDeriveVotingKeysTemplate,
      [VotingErrorType.FailedToGeneratePrime]:
        StringNames.Error_VotingErrorFailedToGeneratePrime,
      [VotingErrorType.IdenticalPrimes]:
        StringNames.Error_VotingErrorIdenticalPrimes,
      [VotingErrorType.KeyPairTooSmall]:
        StringNames.Error_VotingErrorKeyPairTooSmallTemplate,
      [VotingErrorType.KeyPairValidationFailed]:
        StringNames.Error_VotingDerivationErrorKeyPairValidationFailed,
      [VotingErrorType.InvalidVotingKeys]:
        StringNames.Error_VotingErrorInvalidVotingKey,
      [VotingErrorType.InvalidKeyPair]:
        StringNames.Error_VotingErrorInvalidKeyPair,
      [VotingErrorType.InvalidPublicKey]:
        StringNames.Error_VotingErrorInvalidPublicKey,
      [VotingErrorType.InvalidPrivateKey]:
        StringNames.Error_VotingErrorInvalidPrivateKey,
      [VotingErrorType.InvalidEncryptedKey]:
        StringNames.Error_VotingErrorInvalidEncryptedKey,

      [VotingErrorType.InvalidPrivateKeyBufferTooShort]:
        StringNames.Error_VotingErrorInvalidPrivateKeyBufferTooShort,
      [VotingErrorType.InvalidPrivateKeyBufferWrongMagic]:
        StringNames.Error_VotingErrorInvalidPrivateKeyBufferWrongMagic,
      [VotingErrorType.UnsupportedPrivateKeyVersion]:
        StringNames.Error_VotingErrorUnsupportedPrivateKeyVersion,
      [VotingErrorType.InvalidPrivateKeyBufferIncompleteLambda]:
        StringNames.Error_VotingErrorInvalidPrivateKeyBufferIncompleteLambda,
      [VotingErrorType.InvalidPrivateKeyBufferIncompleteMuLength]:
        StringNames.Error_VotingErrorInvalidPrivateKeyBufferIncompleteMuLength,
      [VotingErrorType.InvalidPrivateKeyBufferIncompleteMu]:
        StringNames.Error_VotingErrorInvalidPrivateKeyBufferIncompleteMu,
      [VotingErrorType.InvalidPrivateKeyBufferFailedToParse]:
        StringNames.Error_VotingErrorInvalidPrivateKeyBufferFailedToParse,
      [VotingErrorType.InvalidPrivateKeyBufferFailedToCreate]:
        StringNames.Error_VotingErrorInvalidPrivateKeyBufferFailedToCreate,
    };
  }
  constructor(
    type: VotingErrorType,
    language?: StringLanguages,
    params?: { [key: string]: string | number },
  ) {
    super(type, undefined, params);
    this.name = 'VotingError';
  }
}
