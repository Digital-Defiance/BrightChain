import { StringNames } from '../enumerations/stringNames';
import { StringsCollection } from '../sharedTypes';

const site = 'BrightChain';

export const AmericanEnglishStrings: StringsCollection = {
  [StringNames.ChangePassword_Success]: 'Password changed successfully.',
  [StringNames.Common_ChangePassword]: 'Change Password',
  [StringNames.Common_Dashboard]: 'Dashboard',
  [StringNames.Common_Logo]: 'Logo',
  [StringNames.Common_Site]: site,
  [StringNames.Common_Unauthorized]: 'Unauthorized',
  [StringNames.Error_BlockAccessTemplate]: 'Block cannot be accessed: {REASON}',
  [StringNames.Error_BlockAccessErrorBlockAlreadyExists]:
    'Block file already exists',
  [StringNames.Error_BlockAccessErrorBlockIsNotPersistable]:
    'Block is not persistable',
  [StringNames.Error_BlockAccessErrorBlockIsNotReadable]:
    'Block is not readable',
  [StringNames.Error_BlockAccessErrorBlockFileNotFoundTemplate]:
    'Block file not found: {FILE}',
  [StringNames.Error_BlockAccessCBLCannotBeEncrypted]:
    'CBL block cannot be encrypted',
  [StringNames.Error_BlockAccessErrorCreatorMustBeProvided]:
    'Creator must be provided for signature validation',
  [StringNames.Error_BlockCannotBeDecrypted]: 'Block cannot be decrypted',
  [StringNames.Error_BlockCannotBeEncrypted]: 'Block cannot be encrypted',
  [StringNames.Error_BlockCapacityTemplate]:
    'Block capacity exceeded: {DETAILS}',
  [StringNames.Error_BlockMetadataErrorCreatorRequired]: 'Creator is required',
  [StringNames.Error_BlockMetadataErrorEncryptorRequired]:
    'Encryptor is required',
  [StringNames.Error_BlockMetadataErrorInvalidBlockMetadata]:
    'Invalid block metadata',
  [StringNames.Error_BlockMetadataErrorInvalidBlockMetadataTemplate]:
    'Invalid block metadata: {REASON}',
  [StringNames.Error_BlockMetadataErrorMetadataRequired]:
    'Metadata is required',
  [StringNames.Error_BlockMetadataErrorMissingRequiredMetadata]:
    'Missing required metadata fields',
  [StringNames.Error_BlockValidationTemplate]:
    'Block validation failed: {REASON}',
  [StringNames.Error_BlockValidationErrorActualDataLengthUnknown]:
    'Actual data length is unknown',
  [StringNames.Error_BlockValidationErrorAddressCountExceedsCapacity]:
    'Address count exceeds block capacity',
  [StringNames.Error_BlockValidationErrorBlockDataNotBuffer]:
    'Block.data must be a buffer',
  [StringNames.Error_BlockValidationErrorBlockSizeNegative]:
    'Block size must be a positive number',
  [StringNames.Error_BlockValidationErrorCreatorIDMismatch]:
    'Creator ID mismatch',
  [StringNames.Error_BlockValidationErrorDataBufferIsTruncated]:
    'Data buffer is truncated',
  [StringNames.Error_BlockValidationErrorDataCannotBeEmpty]:
    'Data cannot be empty',
  [StringNames.Error_BlockValidationErrorDataLengthExceedsCapacity]:
    'Data length exceeds block capacity',
  [StringNames.Error_BlockValidationErrorDataLengthTooShort]:
    'Data too short to contain encryption header',
  [StringNames.Error_BlockValidationErrorDataLengthTooShortForCBLHeader]:
    'Data too short for CBL header',
  [StringNames.Error_BlockValidationErrorDataLengthTooShortForEncryptedCBL]:
    'Data too short for encrypted CBL',
  [StringNames.Error_BlockValidationErrorEphemeralBlockOnlySupportsBufferData]:
    'EphemeralBlock only supports Buffer data',
  [StringNames.Error_BlockValidationErrorFutureCreationDate]:
    'Block creation date cannot be in the future',
  [StringNames.Error_BlockValidationErrorInvalidAddressLengthTemplate]:
    'Invalid address length at index {INDEX}: {LENGTH}, expected: {EXPECTED_LENGTH}',
  [StringNames.Error_BlockValidationErrorInvalidAuthTagLength]:
    'Invalid auth tag length',
  [StringNames.Error_BlockValidationErrorInvalidBlockTypeTemplate]:
    'Invalid block type: {TYPE}',
  [StringNames.Error_BlockValidationErrorInvalidCBLAddressCount]:
    'CBL address count must be a multiple of TupleSize',
  [StringNames.Error_BlockValidationErrorInvalidCBLDataLength]:
    'Invalid CBL data length',
  [StringNames.Error_BlockValidationErrorInvalidDateCreated]:
    'Invalid date created',
  [StringNames.Error_BlockValidationErrorInvalidEncryptionHeaderLength]:
    'Invalid encryption header length',
  [StringNames.Error_BlockValidationErrorInvalidEphemeralPublicKeyLength]:
    'Invalid ephemeral public key length',
  [StringNames.Error_BlockValidationErrorInvalidIVLength]: 'Invalid IV length',
  [StringNames.Error_BlockValidationErrorInvalidSignature]:
    'Invalid signature provided',
  [StringNames.Error_BlockValidationErrorInvalidTupleSizeTemplate]:
    'Tuple size must be between {MIN_TUPLE_SIZE} and ${MAX_TUPLE_SIZE}',
  [StringNames.Error_BlockValidationErrorMethodMustBeImplementedByDerivedClass]:
    'Method must be implemented by derived class',
  [StringNames.Error_BlockValidationErrorNoChecksum]: 'No checksum provided',
  [StringNames.Error_BlockValidationErrorOriginalDataLengthNegative]:
    'Original data length cannot be negative',
  [StringNames.Error_BlockMetadataTemplate]: 'Block metadata error: {DETAILS}',
  [StringNames.Error_ChecksumMismatchTemplate]:
    'Checksum mismatch: expected {EXPECTED}, got {CHECKSUM}',
  [StringNames.Error_InvalidBlockSizeTemplate]:
    'Invalid block size: {BLOCK_SIZE}',
  [StringNames.Error_InvalidCredentials]: 'Invalid credentials.',
  [StringNames.Error_InvalidEmail]: 'Invalid email.',
  [StringNames.Error_InvalidEmailMissing]: 'Missing email.',
  [StringNames.Error_InvalidEmailWhitespace]:
    'Email contains trailing or leading whitespace.',
  [StringNames.Error_InvalidGuid]: 'Invalid GUID.',
  [StringNames.Error_InvalidGuidTemplate]: 'Invalid GUID: {GUID}',
  [StringNames.Error_InvalidGuidUnknownBrandTemplate]:
    'Unknown GUID brand: {BRAND}.',
  [StringNames.Error_InvalidGuidUnknownLengthTemplate]:
    'Invalid GUID length: {LENGTH}.',
  [StringNames.Error_InvalidLanguageCode]: 'Invalid language code.',
  [StringNames.Error_InvalidSessionID]: 'Invalid session ID.',
  [StringNames.Error_InvalidTupleCountTemplate]:
    'Invalid tuple count ({TUPLE_COUNT}), must be between {MIN_TUPLE_SIZE} and {MAX_TUPLE_SIZE}',
  [StringNames.Error_MemberErrorIncorrectOrInvalidPrivateKey]:
    'Incorrect or invalid private key for public key',
  [StringNames.Error_MemberErrorInvalidEmail]: 'Invalid email.',
  [StringNames.Error_MemberErrorInvalidEmailWhitespace]:
    'Email contains trailing or leading whitespace.',
  [StringNames.Error_MemberErrorInvalidMemberName]: 'Invalid member name.',
  [StringNames.Error_MemberErrorInvalidMemberNameWhitespace]:
    'Member name contains trailing or leading whitespace.',
  [StringNames.Error_MemberErrorInvalidMnemonic]: 'Invalid wallet mnemonic.',
  [StringNames.Error_MemberErrorMissingEmail]: 'Missing email.',
  [StringNames.Error_MemberErrorMissingMemberName]: 'Missing member name.',
  [StringNames.Error_MemberErrorMissingVotingPrivateKey]:
    'Missing voting private key.',
  [StringNames.Error_MemberErrorMissingVotingPublicKey]:
    'Missing voting public key.',
  [StringNames.Error_MemberErrorMissingPrivateKey]: 'Missing private key.',
  [StringNames.Error_MemberErrorNoWallet]: 'No wallet loaded.',
  [StringNames.Error_MemberErrorPrivateKeyRequiredToDeriveVotingKeyPair]:
    'Private key required to derive voting key pair.',
  [StringNames.Error_MemberErrorWalletAlreadyLoaded]: 'Wallet already loaded.',
  [StringNames.Error_MetadataMismatch]: 'Metadata mismatch.',
  [StringNames.Error_TokenExpired]: 'Token expired.',
  [StringNames.Error_TokenInvalid]: 'Token invalid.',
  [StringNames.Error_UnexpectedError]: 'An unexpected error occurred.',
  [StringNames.Error_UserNotFound]: 'User not found.',
  [StringNames.Error_ValidationError]: 'Validation error.',
  [StringNames.ForgotPassword_Title]: 'Forgot Password',
  [StringNames.LanguageUpdate_Success]: 'Language updated successfully.',
  [StringNames.Login_LoginButton]: 'Login',
  [StringNames.LogoutButton]: 'Logout',
  [StringNames.Register_Button]: 'Register',
  [StringNames.Register_Error]: 'An error occurred during registration.',
  [StringNames.Register_Success]: 'Registration successful.',
  [StringNames.Validation_InvalidLanguage]: 'Invalid language.',
};

export default AmericanEnglishStrings;
