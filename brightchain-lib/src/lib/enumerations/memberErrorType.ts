/**
 * Error types specific to member operations
 */
export enum MemberErrorType {
  /**
   * Member name is missing
   */
  MissingMemberName = 'MissingMemberName',

  /**
   * Member name contains invalid whitespace
   */
  InvalidMemberNameWhitespace = 'InvalidMemberNameWhitespace',

  /**
   * Invalid email for member
   */
  InvalidEmail = 'InvalidEmail',

  /**
   * Invalid name for member
   */
  InvalidMemberName = 'InvalidMemberName',

  /**
   * Member email is missing
   */
  MissingEmail = 'MissingEmail',

  /**
   * Member email contains invalid whitespace
   */
  InvalidEmailWhitespace = 'InvalidEmailWhitespace',

  /**
   * Member private key is missing
   */
  MissingPrivateKey = 'MissingPrivateKey',

  /**
   * Member voting private key is missing
   */
  MissingVotingPrivateKey = 'MissingVotingPrivateKey',

  /**
   * Member voting public key is missing
   */
  MissingVotingPublicKey = 'MissingVotingPublicKey',

  /**
   * Member wallet is not loaded
   */
  NoWallet = 'NoWallet',

  /**
   * Member wallet is already loaded
   */
  WalletAlreadyLoaded = 'WalletAlreadyLoaded',

  /**
   * Invalid mnemonic for member
   */
  InvalidMnemonic = 'InvalidMnemonic',

  /**
   * Incorrect or invalid private key
   */
  IncorrectOrInvalidPrivateKey = 'IncorrectOrInvalidPrivateKey',

  /**
   * Private key required to derive voting key pair
   */
  PrivateKeyRequiredToDeriveVotingKeyPair = 'PrivateKeyRequiredToDeriveVotingKeyPair',

  /**
   * Member not found
   */
  MemberNotFound = 'MemberNotFound',

  /**
   * Member already exists
   */
  MemberAlreadyExists = 'MemberAlreadyExists',

  /**
   * Invalid member status
   */
  InvalidMemberStatus = 'InvalidMemberStatus',

  /**
   * Insufficient random blocks available
   */
  InsufficientRandomBlocks = 'InsufficientRandomBlocks',

  /**
   * Failed to create member blocks
   */
  FailedToCreateMemberBlocks = 'FailedToCreateMemberBlocks',

  /**
   * Failed to hydrate member
   */
  FailedToHydrateMember = 'FailedToHydrateMember',

  /**
   * Invalid member data
   */
  InvalidMemberData = 'InvalidMemberData',

  /**
   * Failed to convert member data
   */
  FailedToConvertMemberData = 'FailedToConvertMemberData',

  /**
   * Invalid member blocks
   */
  InvalidMemberBlocks = 'InvalidMemberBlocks',

  /**
   * Data to encrypt is missing or null
   */
  MissingEncryptionData = 'MissingEncryptionData',

  /**
   * Data to encrypt exceeds maximum size limit
   */
  EncryptionDataTooLarge = 'EncryptionDataTooLarge',

  /**
   * Data to encrypt contains invalid characters
   */
  InvalidEncryptionData = 'InvalidEncryptionData',
}

export default MemberErrorType;
