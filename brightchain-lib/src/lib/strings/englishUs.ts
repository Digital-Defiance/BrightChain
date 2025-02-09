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
    'Tuple size must be between {MIN_TUPLE_SIZE} and {MAX_TUPLE_SIZE}',
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
  [StringNames.Error_IsolatedKeyErrorInvalidPublicKey]:
    'Invalid public key: must be an isolated key',
  [StringNames.Error_IsolatedKeyErrorInvalidKeyId]:
    'Key isolation violation: invalid key ID',
  [StringNames.Error_IsolatedKeyErrorInvalidKeyFormat]: 'Invalid key format',
  [StringNames.Error_IsolatedKeyErrorInvalidKeyLength]: 'Invalid key length',
  [StringNames.Error_IsolatedKeyErrorInvalidKeyType]: 'Invalid key type',
  [StringNames.Error_IsolatedKeyErrorKeyIsolationViolation]:
    'Key isolation violation: ciphertexts from different key instances',
  [StringNames.Error_Pbkdf2InvalidSaltLength]:
    'Salt length does not match expected length',
  [StringNames.Error_Pbkdf2InvalidHashLength]:
    'Hash length does not match expected length',
  [StringNames.Error_BlockServiceErrorBlockWhitenerCountMismatch]:
    'Number of blocks and whiteners must be the same',
  [StringNames.Error_BlockServiceErrorEmptyBlocksArray]:
    'Blocks array must not be empty',
  [StringNames.Error_BlockServiceErrorBlockSizeMismatch]:
    'All blocks must have the same block size',
  [StringNames.Error_BlockServiceErrorNoWhitenersProvided]:
    'No whiteners provided',
  [StringNames.Error_QuorumErrorInvalidQuorumId]: 'Invalid quorum ID',
  [StringNames.Error_QuorumErrorDocumentNotFound]: 'Document not found',
  [StringNames.Error_QuorumErrorUnableToRestoreDocument]:
    'Unable to restore document',
  [StringNames.Error_QuorumErrorNotImplemented]: 'Not implemented',
  [StringNames.Error_SystemKeyringErrorKeyNotFoundTemplate]:
    'Key {KEY} not found',
  [StringNames.Error_SystemKeyringErrorRateLimitExceeded]:
    'Rate limit exceeded',
  [StringNames.Error_FecErrorDataRequired]: 'Data is required',
  [StringNames.Error_FecErrorInvalidShardCounts]: 'Invalid shard counts',
  [StringNames.Error_FecErrorInvalidShardsAvailableArray]:
    'Invalid shards available array',
  [StringNames.Error_FecErrorInputBlockRequired]: 'Input block is required',
  [StringNames.Error_FecErrorParityBlockCountMustBePositive]:
    'Number of parity blocks must be positive',
  [StringNames.Error_FecErrorInputDataMustBeBuffer]:
    'Input data must be a Buffer',
  [StringNames.Error_FecErrorDamagedBlockRequired]: 'Damaged block is required',
  [StringNames.Error_FecErrorParityBlocksRequired]:
    'Parity blocks are required',
  [StringNames.Error_FecErrorBlockSizeMismatch]:
    'All blocks must have the same size',
  [StringNames.Error_FecErrorDamagedBlockDataMustBeBuffer]:
    'Damaged block data must be a Buffer',
  [StringNames.Error_FecErrorParityBlockDataMustBeBuffer]:
    'Parity block data must be a Buffer',
  [StringNames.Error_FecErrorInvalidDataLengthTemplate]:
    'Invalid data length: {LENGTH}, expected {EXPECTED}',
  [StringNames.Error_FecErrorShardSizeExceedsMaximumTemplate]:
    'Shard size {SIZE} exceeds maximum {MAXIMUM}',
  [StringNames.Error_FecErrorNotEnoughShardsAvailableTemplate]:
    'Not enough shards available: {AVAILABLE}, need {REQUIRED}',
  [StringNames.Error_FecErrorInvalidParityBlockSizeTemplate]:
    'Invalid parity block size: {SIZE}, expected {EXPECTED}',
  [StringNames.Error_FecErrorInvalidRecoveredBlockSizeTemplate]:
    'Invalid recovered block size: {SIZE}, expected {EXPECTED}',
  [StringNames.Error_FecErrorFecEncodingFailedTemplate]:
    'FEC encoding failed: {ERROR}',
  [StringNames.Error_FecErrorFecDecodingFailedTemplate]:
    'FEC decoding failed: {ERROR}',
  [StringNames.Error_EciesErrorInvalidHeaderLength]: 'Invalid header length',
  [StringNames.Error_EciesErrorInvalidMnemonic]: 'Invalid mnemonic',
  [StringNames.Error_EciesErrorInvalidEncryptedDataLength]:
    'Invalid encrypted data length',
  [StringNames.Error_EciesErrorMessageLengthMismatch]:
    'Message length mismatch',
  [StringNames.Error_EciesErrorInvalidEncryptedKeyLength]:
    'Invalid encrypted key length',
  [StringNames.Error_EciesErrorInvalidEphemeralPublicKey]:
    'Invalid ephemeral public key',
  [StringNames.Error_EciesErrorRecipientNotFound]:
    'Recipient not found in recipient IDs',
  [StringNames.Error_EciesErrorInvalidSignature]: 'Invalid signature',
  [StringNames.Error_EciesErrorInvalidSenderPublicKey]:
    'Invalid sender public key',
  [StringNames.Error_EciesErrorTooManyRecipients]:
    'Too many recipients: exceeds maximum allowed',
  [StringNames.Error_VotingDerivationErrorFailedToGeneratePrime]:
    'Failed to generate prime number after maximum attempts',
  [StringNames.Error_VotingDerivationErrorIdenticalPrimes]:
    'Generated identical primes',
  [StringNames.Error_VotingDerivationErrorKeyPairTooSmallTemplate]:
    'Generated key pair too small: {ACTUAL_BITS} bits < {REQUIRED_BITS} bits',
  [StringNames.Error_VotingDerivationErrorKeyPairValidationFailed]:
    'Key pair validation failed',
  [StringNames.Error_VotingDerivationErrorModularInverseDoesNotExist]:
    'Modular multiplicative inverse does not exist',
  [StringNames.Error_VotingDerivationErrorPrivateKeyMustBeBuffer]:
    'Private key must be a Buffer',
  [StringNames.Error_VotingDerivationErrorPublicKeyMustBeBuffer]:
    'Public key must be a Buffer',
  [StringNames.Error_VotingDerivationErrorInvalidPublicKeyFormat]:
    'Invalid public key format',
  [StringNames.Error_VotingDerivationErrorInvalidEcdhKeyPair]:
    'Invalid ECDH key pair',
  [StringNames.Error_VotingDerivationErrorFailedToDeriveVotingKeysTemplate]:
    'Failed to derive voting keys: {ERROR}',
  [StringNames.Error_VotingErrorInvalidKeyPairPublicKeyNotIsolated]:
    'Invalid key pair: public key must be isolated',
  [StringNames.Error_VotingErrorInvalidKeyPairPrivateKeyNotIsolated]:
    'Invalid key pair: private key must be isolated',
  [StringNames.Error_VotingErrorInvalidPublicKeyNotIsolated]:
    'Invalid public key: must be an isolated key',
  [StringNames.Error_VotingErrorInvalidPublicKeyBufferTooShort]:
    'Invalid public key buffer: too short',
  [StringNames.Error_VotingErrorInvalidPublicKeyBufferWrongMagic]:
    'Invalid public key buffer: wrong magic',
  [StringNames.Error_VotingErrorUnsupportedPublicKeyVersion]:
    'Unsupported public key version',
  [StringNames.Error_VotingErrorInvalidPublicKeyBufferIncompleteN]:
    'Invalid public key buffer: incomplete n value',
  [StringNames.Error_VotingErrorInvalidPublicKeyBufferFailedToParseNTemplate]:
    'Invalid public key buffer: failed to parse n: {ERROR}',
  [StringNames.Error_VotingErrorInvalidPublicKeyIdMismatch]:
    'Invalid public key: key ID mismatch',
  [StringNames.Error_StoreErrorKeyNotFoundTemplate]: 'Key not found: {KEY}',
  [StringNames.Error_StoreErrorStorePathRequired]: 'Store path is required',
  [StringNames.Error_StoreErrorStorePathNotFound]: 'Store path not found',
  [StringNames.Error_StoreErrorBlockSizeRequired]: 'Block size is required',
  [StringNames.Error_StoreErrorBlockIdRequired]: 'Block ID is required',
  [StringNames.Error_StoreErrorInvalidBlockIdTooShort]:
    'Invalid block ID: too short',
  [StringNames.Error_StoreErrorBlockFileSizeMismatch]:
    'Block file size mismatch',
  [StringNames.Error_StoreErrorBlockValidationFailed]:
    'Block validation failed',
  [StringNames.Error_StoreErrorBlockPathAlreadyExistsTemplate]:
    'Block path {PATH} already exists',
  [StringNames.Error_StoreErrorNoBlocksProvided]: 'No blocks provided',
  [StringNames.Error_StoreErrorCannotStoreEphemeralData]:
    'Cannot store ephemeral structured data',
  [StringNames.Error_StoreErrorBlockIdMismatchTemplate]:
    'Key {KEY} does not match block ID {BLOCK_ID}',
  [StringNames.Error_StoreErrorBlockSizeMismatch]:
    'Block size does not match store block size',
  [StringNames.Error_StoreErrorInvalidBlockMetadataTemplate]:
    'Invalid block metadata: {ERROR}',
  [StringNames.Error_StoreErrorBlockDirectoryCreationFailedTemplate]:
    'Failed to create block directory: {ERROR}',
  [StringNames.Error_SecureStorageDecryptedValueLengthMismatch]:
    'Decrypted value length does not match expected length',
  [StringNames.Error_SecureStorageDecryptedValueChecksumMismatch]:
    'Decrypted value checksum does not match',
  [StringNames.Error_SymmetricDataNullOrUndefined]:
    'Data to encrypt cannot be null or undefined',
  [StringNames.Error_SymmetricInvalidKeyLengthTemplate]:
    'Encryption key must be {KEY_BYTES} bytes long',
  [StringNames.Error_TupleErrorInvalidTupleSize]: 'Invalid tuple size',
  [StringNames.Error_TupleErrorBlockSizeMismatch]:
    'All blocks in tuple must have the same size',
  [StringNames.Error_TupleErrorNoBlocksToXor]: 'No blocks to XOR',
  [StringNames.Error_TupleErrorInvalidBlockCount]:
    'Invalid number of blocks for tuple',
  [StringNames.Error_TupleErrorInvalidBlockType]: 'Invalid block type',
  [StringNames.Error_TupleErrorInvalidSourceLength]:
    'Source length must be positive',
  [StringNames.Error_TupleErrorRandomBlockGenerationFailed]:
    'Failed to generate random block',
  [StringNames.Error_TupleErrorWhiteningBlockGenerationFailed]:
    'Failed to generate whitening block',
  [StringNames.Error_TupleErrorMissingParameters]:
    'All parameters are required',
  [StringNames.Error_TupleErrorXorOperationFailedTemplate]:
    'Failed to XOR blocks: {ERROR}',
  [StringNames.Error_TupleErrorDataStreamProcessingFailedTemplate]:
    'Failed to process data stream: {ERROR}',
  [StringNames.Error_TupleErrorEncryptedDataStreamProcessingFailedTemplate]:
    'Failed to process encrypted data stream: {ERROR}',
  [StringNames.Error_SealingErrorInvalidBitRange]:
    'Bits must be between 3 and 20',
  [StringNames.Error_SealingErrorInvalidMemberArray]:
    'amongstMembers must be an array of BrightChainMember',
  [StringNames.Error_SealingErrorNotEnoughMembersToUnlock]:
    'Not enough members to unlock the document',
  [StringNames.Error_SealingErrorTooManyMembersToUnlock]:
    'Too many members to unlock the document',
  [StringNames.Error_SealingErrorMissingPrivateKeys]:
    'Not all members have private keys loaded',
  [StringNames.Error_SealingErrorEncryptedShareNotFound]:
    'Encrypted share not found',
  [StringNames.Error_SealingErrorMemberNotFound]: 'Member not found',
  [StringNames.Error_SealingErrorFailedToSealTemplate]:
    'Failed to seal document: {ERROR}',
  [StringNames.Error_CblErrorCblRequired]: 'CBL is required',
  [StringNames.Error_CblErrorWhitenedBlockFunctionRequired]:
    'getWhitenedBlock function is required',
  [StringNames.Error_CblErrorFailedToLoadBlock]: 'Failed to load block',
  [StringNames.Error_CblErrorExpectedEncryptedDataBlock]:
    'Expected encrypted data block',
  [StringNames.Error_CblErrorExpectedOwnedDataBlock]:
    'Expected owned data block',
  [StringNames.Error_CblErrorInvalidStructure]: 'Invalid CBL structure',
  [StringNames.Error_CblErrorCreatorUndefined]: 'Creator cannot be undefined',
  [StringNames.Error_CblErrorBlockNotReadable]: 'Block cannot be read',
  [StringNames.Error_CblErrorCreatorRequiredForSignature]:
    'Creator is required for signature validation',
  [StringNames.Error_CblErrorFileNameRequired]: 'File name is required',
  [StringNames.Error_CblErrorFileNameEmpty]: 'File name cannot be empty',
  [StringNames.Error_CblErrorFileNameWhitespace]:
    'File name cannot start or end with spaces',
  [StringNames.Error_CblErrorFileNameInvalidChar]:
    'File name contains invalid character',
  [StringNames.Error_CblErrorFileNameControlChars]:
    'File name contains control characters',
  [StringNames.Error_CblErrorFileNamePathTraversal]:
    'File name cannot contain path traversal',
  [StringNames.Error_CblErrorMimeTypeRequired]: 'MIME type is required',
  [StringNames.Error_CblErrorMimeTypeEmpty]: 'MIME type cannot be empty',
  [StringNames.Error_CblErrorMimeTypeWhitespace]:
    'MIME type cannot start or end with spaces',
  [StringNames.Error_CblErrorMimeTypeLowercase]: 'MIME type must be lowercase',
  [StringNames.Error_CblErrorMimeTypeInvalidFormat]: 'Invalid MIME type format',
  [StringNames.Error_CblErrorInvalidBlockSize]: 'Invalid block size',
  [StringNames.Error_CblErrorMetadataSizeExceeded]:
    'Metadata size exceeds maximum allowed size',
  [StringNames.Error_CblErrorMetadataSizeNegative]:
    'Total metadata size cannot be negative',
  [StringNames.Error_CblErrorInvalidMetadataBuffer]: 'Invalid metadata buffer',
  [StringNames.Error_CblErrorCreationFailedTemplate]:
    'Failed to create CBL block {ERROR}',
  [StringNames.Error_CblErrorInsufficientCapacityTemplate]:
    'Block size ({BLOCK_SIZE}) is too small to hold CBL data ({DATA_SIZE})',
  [StringNames.Error_StreamErrorBlockSizeRequired]: 'Block size is required',
  [StringNames.Error_StreamErrorWhitenedBlockSourceRequired]:
    'Whitened block source is required',
  [StringNames.Error_StreamErrorRandomBlockSourceRequired]:
    'Random block source is required',
  [StringNames.Error_StreamErrorInputMustBeBuffer]: 'Input must be a buffer',
  [StringNames.Error_StreamErrorFailedToGetRandomBlock]:
    'Failed to get random block',
  [StringNames.Error_StreamErrorFailedToGetWhiteningBlock]:
    'Failed to get whitening/random block',
  [StringNames.Error_StreamErrorIncompleteEncryptedBlock]:
    'Incomplete encrypted block',
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
  [StringNames.Error_MemoryTupleErrorInvalidTupleSizeTemplate]: `Tuple must have {TUPLE_SIZE} blocks`,
  [StringNames.Error_MultiEncryptedErrorDataTooShort]:
    'Data too short to contain encryption header',
  [StringNames.Error_MultiEncryptedErrorDataLengthExceedsCapacity]:
    'Data length exceeds block capacity',
  [StringNames.Error_MultiEncryptedErrorCreatorMustBeMember]:
    'Creator must be a BrightChainMember',
  [StringNames.Error_MultiEncryptedErrorBlockNotReadable]:
    'Block cannot be read',
  [StringNames.Error_MultiEncryptedErrorInvalidEphemeralPublicKeyLength]:
    'Invalid ephemeral public key length',
  [StringNames.Error_MultiEncryptedErrorInvalidIVLength]: 'Invalid IV length',
  [StringNames.Error_MultiEncryptedErrorInvalidAuthTagLength]:
    'Invalid auth tag length',
  [StringNames.Error_MultiEncryptedErrorChecksumMismatch]: 'Checksum mismatch',
  [StringNames.Error_MemoryTupleErrorBlockSizeMismatch]:
    'All blocks in tuple must have the same size',
  [StringNames.Error_WhitenedErrorBlockNotReadable]: 'Block cannot be read',
  [StringNames.Error_WhitenedErrorBlockSizeMismatch]: 'Block sizes must match',
  [StringNames.Error_WhitenedErrorDataLengthMismatch]:
    'Data and random data lengths must match',
  [StringNames.Error_WhitenedErrorInvalidBlockSize]: 'Invalid block size',
  [StringNames.Error_HandleTupleErrorInvalidTupleSizeTemplate]:
    'Invalid tuple size ({TUPLE_SIZE})',
  [StringNames.Error_HandleTupleErrorBlockSizeMismatch]:
    'All blocks in tuple must have the same size',
  [StringNames.Error_HandleTupleErrorNoBlocksToXor]: 'No blocks to XOR',
  [StringNames.Error_HandleTupleErrorBlockSizesMustMatch]:
    'Block sizes must match',
  [StringNames.Error_OwnedDataErrorCreatorRequired]: 'Creator is required',
  [StringNames.Error_OwnedDataErrorDataRequired]: 'Data is required',
  [StringNames.Error_OwnedDataErrorDataLengthExceedsCapacity]:
    'Data length exceeds block capacity',
  [StringNames.Error_OwnedDataErrorActualDataLengthNegative]:
    'Actual data length must be positive',
  [StringNames.Error_OwnedDataErrorActualDataLengthExceedsDataLength]:
    'Actual data length cannot exceed data length',
  [StringNames.Error_OwnedDataErrorCreatorRequiredForEncryption]:
    'Creator is required for encryption',
  [StringNames.Error_OwnedDataErrorUnexpectedEncryptedBlockType]:
    'Unexpected encrypted block type',
  [StringNames.Error_MemoryTupleErrorNoBlocksToXor]: 'No blocks to XOR',
  [StringNames.Error_MemoryTupleErrorInvalidBlockCount]:
    'Invalid number of blocks for tuple',
  [StringNames.Error_MemoryTupleErrorExpectedBlockIdsTemplate]: `Expected {TUPLE_SIZE} block IDs`,
  [StringNames.Error_MemoryTupleErrorExpectedBlocksTemplate]: `Expected {TUPLE_SIZE} blocks`,
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
