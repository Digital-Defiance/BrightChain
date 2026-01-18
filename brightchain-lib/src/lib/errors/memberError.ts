import { HandleableError } from '@digitaldefiance/i18n-lib';
import { MemberErrorType } from '../enumerations/memberErrorType';
import StringNames from '../enumerations/stringNames';

export class MemberError extends HandleableError {
  public readonly type: MemberErrorType;

  public get reasonMap(): Record<MemberErrorType, StringNames> {
    return {
      [MemberErrorType.IncorrectOrInvalidPrivateKey]:
        StringNames.Error_MemberErrorIncorrectOrInvalidPrivateKey,
      [MemberErrorType.InvalidEmail]: StringNames.Error_MemberErrorInvalidEmail,
      [MemberErrorType.InvalidEmailWhitespace]:
        StringNames.Error_MemberErrorInvalidEmailWhitespace,
      [MemberErrorType.InvalidMemberName]:
        StringNames.Error_MemberErrorInvalidMemberName,
      [MemberErrorType.InvalidMemberStatus]:
        StringNames.Error_MemberErrorInvalidMemberStatus,
      [MemberErrorType.InvalidMemberNameWhitespace]:
        StringNames.Error_MemberErrorInvalidMemberNameWhitespace,
      [MemberErrorType.InvalidMnemonic]:
        StringNames.Error_MemberErrorInvalidMnemonic,
      [MemberErrorType.MissingEmail]: StringNames.Error_MemberErrorMissingEmail,
      [MemberErrorType.MemberAlreadyExists]:
        StringNames.Error_MemberErrorMemberAlreadyExists,
      [MemberErrorType.MissingMemberName]:
        StringNames.Error_MemberErrorMissingMemberName,
      [MemberErrorType.MemberNotFound]:
        StringNames.Error_MemberErrorMemberNotFound,
      [MemberErrorType.MissingVotingPrivateKey]:
        StringNames.Error_MemberErrorMissingVotingPrivateKey,
      [MemberErrorType.MissingVotingPublicKey]:
        StringNames.Error_MemberErrorMissingVotingPublicKey,
      [MemberErrorType.MissingPrivateKey]:
        StringNames.Error_MemberErrorMissingPrivateKey,
      [MemberErrorType.NoWallet]: StringNames.Error_MemberErrorNoWallet,
      [MemberErrorType.PrivateKeyRequiredToDeriveVotingKeyPair]:
        StringNames.Error_MemberErrorPrivateKeyRequiredToDeriveVotingKeyPair,
      [MemberErrorType.WalletAlreadyLoaded]:
        StringNames.Error_MemberErrorWalletAlreadyLoaded,
      [MemberErrorType.InsufficientRandomBlocks]:
        StringNames.Error_MemberErrorInsufficientRandomBlocks,
      [MemberErrorType.FailedToCreateMemberBlocks]:
        StringNames.Error_MemberErrorFailedToCreateMemberBlocks,
      [MemberErrorType.FailedToHydrateMember]:
        StringNames.Error_MemberErrorFailedToHydrateMember,
      [MemberErrorType.InvalidMemberData]:
        StringNames.Error_MemberErrorInvalidMemberData,
      [MemberErrorType.FailedToConvertMemberData]:
        StringNames.Error_MemberErrorFailedToConvertMemberData,
      [MemberErrorType.InvalidMemberBlocks]:
        StringNames.Error_MemberErrorInvalidMemberBlocks,
      [MemberErrorType.MissingEncryptionData]:
        StringNames.Error_MemberErrorMissingEncryptionData,
      [MemberErrorType.EncryptionDataTooLarge]:
        StringNames.Error_MemberErrorEncryptionDataTooLarge,
      [MemberErrorType.InvalidEncryptionData]:
        StringNames.Error_MemberErrorInvalidEncryptionData,
    };
  }
  constructor(type: MemberErrorType, _language?: string) {
    // Temporarily bypass translation to avoid i18n initialization issues
    const message =
      type === MemberErrorType.FailedToCreateMemberBlocks
        ? 'Failed to create member blocks.'
        : `Member error: ${type}`;
    super(new Error(message));
    this.type = type;
    this.name = 'MemberError';
  }
}
