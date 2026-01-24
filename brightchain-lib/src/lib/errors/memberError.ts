import { HandleableError } from '@digitaldefiance/i18n-lib';
import BrightChainStrings from '../enumerations/brightChainStrings';
import { MemberErrorType } from '../enumerations/memberErrorType';

export class MemberError extends HandleableError {
  public readonly type: MemberErrorType;

  public get reasonMap(): Record<MemberErrorType, BrightChainStrings> {
    return {
      [MemberErrorType.IncorrectOrInvalidPrivateKey]:
        BrightChainStrings.Error_MemberErrorIncorrectOrInvalidPrivateKey,
      [MemberErrorType.InvalidEmail]:
        BrightChainStrings.Error_MemberErrorInvalidEmail,
      [MemberErrorType.InvalidEmailWhitespace]:
        BrightChainStrings.Error_MemberErrorInvalidEmailWhitespace,
      [MemberErrorType.InvalidMemberName]:
        BrightChainStrings.Error_MemberErrorInvalidMemberName,
      [MemberErrorType.InvalidMemberStatus]:
        BrightChainStrings.Error_MemberErrorInvalidMemberStatus,
      [MemberErrorType.InvalidMemberNameWhitespace]:
        BrightChainStrings.Error_MemberErrorInvalidMemberNameWhitespace,
      [MemberErrorType.InvalidMnemonic]:
        BrightChainStrings.Error_MemberErrorInvalidMnemonic,
      [MemberErrorType.MissingEmail]:
        BrightChainStrings.Error_MemberErrorMissingEmail,
      [MemberErrorType.MemberAlreadyExists]:
        BrightChainStrings.Error_MemberErrorMemberAlreadyExists,
      [MemberErrorType.MissingMemberName]:
        BrightChainStrings.Error_MemberErrorMissingMemberName,
      [MemberErrorType.MemberNotFound]:
        BrightChainStrings.Error_MemberErrorMemberNotFound,
      [MemberErrorType.MissingVotingPrivateKey]:
        BrightChainStrings.Error_MemberErrorMissingVotingPrivateKey,
      [MemberErrorType.MissingVotingPublicKey]:
        BrightChainStrings.Error_MemberErrorMissingVotingPublicKey,
      [MemberErrorType.MissingPrivateKey]:
        BrightChainStrings.Error_MemberErrorMissingPrivateKey,
      [MemberErrorType.NoWallet]: BrightChainStrings.Error_MemberErrorNoWallet,
      [MemberErrorType.PrivateKeyRequiredToDeriveVotingKeyPair]:
        BrightChainStrings.Error_MemberErrorPrivateKeyRequiredToDeriveVotingKeyPair,
      [MemberErrorType.WalletAlreadyLoaded]:
        BrightChainStrings.Error_MemberErrorWalletAlreadyLoaded,
      [MemberErrorType.InsufficientRandomBlocks]:
        BrightChainStrings.Error_MemberErrorInsufficientRandomBlocks,
      [MemberErrorType.FailedToCreateMemberBlocks]:
        BrightChainStrings.Error_MemberErrorFailedToCreateMemberBlocks,
      [MemberErrorType.FailedToHydrateMember]:
        BrightChainStrings.Error_MemberErrorFailedToHydrateMember,
      [MemberErrorType.InvalidMemberData]:
        BrightChainStrings.Error_MemberErrorInvalidMemberData,
      [MemberErrorType.FailedToConvertMemberData]:
        BrightChainStrings.Error_MemberErrorFailedToConvertMemberData,
      [MemberErrorType.InvalidMemberBlocks]:
        BrightChainStrings.Error_MemberErrorInvalidMemberBlocks,
      [MemberErrorType.MissingEncryptionData]:
        BrightChainStrings.Error_MemberErrorMissingEncryptionData,
      [MemberErrorType.EncryptionDataTooLarge]:
        BrightChainStrings.Error_MemberErrorEncryptionDataTooLarge,
      [MemberErrorType.InvalidEncryptionData]:
        BrightChainStrings.Error_MemberErrorInvalidEncryptionData,
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
