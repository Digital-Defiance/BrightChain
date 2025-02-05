import { StringNames } from './stringNames';

export enum MemberErrorType {
  IncorrectOrInvalidPrivateKey = 'IncorrectOrInvalidPrivateKey',
  InvalidEmail = 'InvalidEmail',
  InvalidEmailWhitespace = 'InvalidEmailWhitespace',
  InvalidMemberName = 'InvalidMemberName',
  InvalidMemberNameWhitespace = 'InvalidMemberNameWhitespace',
  InvalidMnemonic = 'InvalidMnemonic',
  MissingEmail = 'MissingEmail',
  MissingMemberName = 'MissingMemberName',
  MissingVotingPrivateKey = 'MissingVotingPrivateKey',
  MissingVotingPublicKey = 'MissingVotingPublicKey',
  MissingPrivateKey = 'MissingPrivateKey',
  NoWallet = 'NoWallet',
  PrivateKeyRequiredToDeriveVotingKeyPair = 'PrivateKeyRequiredToDeriveVotingKeyPair',
  WalletAlreadyLoaded = 'WalletAlreadyLoaded',
}

export const MemberErrorTypes: { [key in MemberErrorType]: StringNames } = {
  [MemberErrorType.IncorrectOrInvalidPrivateKey]:
    StringNames.Error_MemberErrorIncorrectOrInvalidPrivateKey,
  [MemberErrorType.InvalidEmail]: StringNames.Error_MemberErrorInvalidEmail,
  [MemberErrorType.InvalidEmailWhitespace]:
    StringNames.Error_MemberErrorInvalidEmailWhitespace,
  [MemberErrorType.InvalidMemberName]:
    StringNames.Error_MemberErrorInvalidMemberName,
  [MemberErrorType.InvalidMemberNameWhitespace]:
    StringNames.Error_MemberErrorInvalidMemberNameWhitespace,
  [MemberErrorType.InvalidMnemonic]:
    StringNames.Error_MemberErrorInvalidMnemonic,
  [MemberErrorType.MissingEmail]: StringNames.Error_MemberErrorMissingEmail,
  [MemberErrorType.MissingMemberName]:
    StringNames.Error_MemberErrorMissingMemberName,
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
};
