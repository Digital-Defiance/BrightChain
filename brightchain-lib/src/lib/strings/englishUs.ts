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
    'Block capacity exceeded. BlockSize: ({BLOCK_SIZE}), Data: ({DATA_SIZE})',
  [StringNames.Error_BlockMetadataErrorCreatorIdMismatch]:
    'Creator ID mismatch',
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

  // Block Capacity Errors
  [StringNames.Error_BlockCapacityInvalidBlockSize]: 'Invalid block size',
  [StringNames.Error_BlockCapacityInvalidBlockType]: 'Invalid block type',
  [StringNames.Error_BlockCapacityCapacityExceeded]: 'Capacity exceeded',
  [StringNames.Error_BlockCapacityInvalidFileName]: 'Invalid file name',
  [StringNames.Error_BlockCapacityInvalidMimetype]: 'Invalid mimetype',
  [StringNames.Error_BlockCapacityInvalidRecipientCount]:
    'Invalid recipient count',
  [StringNames.Error_BlockCapacityInvalidExtendedCblData]:
    'Invalid extended CBL data',
  // Added
  [StringNames.Error_BlockCapacityInvalidEncryptionType]:
    'Invalid encryption type for this block type', // Added

  // Block validation error
  [StringNames.Error_BlockValidationErrorTemplate]:
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
  [StringNames.Error_BlockValidationErrorInvalidRecipientIds]:
    'Invalid recipient IDs',
  [StringNames.Error_BlockValidationErrorInvalidTupleSizeTemplate]:
    'Tuple size must be between {TUPLE.MIN_SIZE} and {TUPLE.MAX_SIZE}',
  [StringNames.Error_BlockValidationErrorMethodMustBeImplementedByDerivedClass]:
    'Method must be implemented by derived class',
  [StringNames.Error_BlockValidationErrorNoChecksum]: 'No checksum provided',
  [StringNames.Error_BlockValidationErrorOriginalDataLengthNegative]:
    'Original data length cannot be negative',
  [StringNames.Error_BlockValidationErrorInvalidEncryptionType]:
    'Invalid encryption type',
  [StringNames.Error_BlockValidationErrorInvalidRecipientCount]:
    'Invalid recipient count',
  [StringNames.Error_BlockValidationErrorInvalidRecipientKeys]:
    'Invalid recipient keys',
  [StringNames.Error_BlockValidationErrorEncryptionRecipientNotFoundInRecipients]:
    'Encryption recipient not found in recipients',
  [StringNames.Error_BlockValidationErrorEncryptionRecipientHasNoPrivateKey]:
    'Encryption recipient has no private key',
  [StringNames.Error_BlockValidationErrorInvalidCreator]: 'Invalid creator',
  [StringNames.Error_BlockMetadataTemplate]: 'Block metadata error: {REASON}',
  [StringNames.Error_BufferErrorInvalidBufferTypeTemplate]:
    'Invalid buffer type. Expected Buffer, got: {TYPE}',
  [StringNames.Error_ChecksumMismatchTemplate]:
    'Checksum mismatch: expected {EXPECTED}, got {CHECKSUM}',
  [StringNames.Error_InvalidBlockSizeTemplate]:
    'Invalid block size: {BLOCK_SIZE}',
  [StringNames.Error_InvalidCredentials]: 'Invalid credentials.',
  [StringNames.Error_InvalidEmail]: 'Invalid email.',
  [StringNames.Error_InvalidEmailMissing]: 'Missing email.',
  [StringNames.Error_InvalidEmailWhitespace]:
    'Email contains trailing or leading whitespace.',

  // GUID error
  [StringNames.Error_InvalidGuid]: 'Invalid GUID.',
  [StringNames.Error_InvalidGuidTemplate]: 'Invalid GUID: {GUID}',
  [StringNames.Error_InvalidGuidUnknownBrandTemplate]:
    'Unknown GUID brand: {BRAND}.',
  [StringNames.Error_InvalidGuidUnknownLengthTemplate]:
    'Invalid GUID length: {LENGTH}.',

  // Isolated Key Error
  [StringNames.Error_IsolatedKeyErrorInvalidPublicKey]:
    'Invalid public key: must be an isolated key',
  [StringNames.Error_IsolatedKeyErrorInvalidKeyId]:
    'Key isolation violation: invalid key ID',
  [StringNames.Error_IsolatedKeyErrorInvalidKeyFormat]: 'Invalid key format',
  [StringNames.Error_IsolatedKeyErrorInvalidKeyLength]: 'Invalid key length',
  [StringNames.Error_IsolatedKeyErrorInvalidKeyType]: 'Invalid key type',
  [StringNames.Error_IsolatedKeyErrorKeyIsolationViolation]:
    'Key isolation violation: ciphertexts from different key instances',

  // PBKDF2 Error
  [StringNames.Error_Pbkdf2InvalidSaltLength]:
    'Salt length does not match expected length',
  [StringNames.Error_Pbkdf2InvalidHashLength]:
    'Hash length does not match expected length',

  // Block Service Error
  [StringNames.Error_BlockServiceErrorBlockWhitenerCountMismatch]:
    'Number of blocks and whiteners must be the same',
  [StringNames.Error_BlockServiceErrorEmptyBlocksArray]:
    'Blocks array must not be empty',
  [StringNames.Error_BlockServiceErrorBlockSizeMismatch]:
    'All blocks must have the same block size',
  [StringNames.Error_BlockServiceErrorNoWhitenersProvided]:
    'No whiteners provided',
  [StringNames.Error_BlockServiceErrorAlreadyInitialized]:
    'BlockService subsystem already initialized',
  [StringNames.Error_BlockServiceErrorUninitialized]:
    'BlockService subsystem not initialized',
  [StringNames.Error_BlockServiceErrorBlockAlreadyExistsTemplate]:
    'Block already exists: {ID}',
  [StringNames.Error_BlockServiceErrorRecipientRequiredForEncryption]:
    'Recipient is required for encryption',
  [StringNames.Error_BlockServiceErrorCannotDetermineFileLength]:
    'Cannot determine file length',
  [StringNames.Error_BlockServiceErrorCannotDetermineBlockSize]:
    'Cannot determine block size',
  [StringNames.Error_BlockServiceErrorCannotDetermineFileName]:
    'Unable to determine file name',
  [StringNames.Error_BlockServiceErrorCannotDetermineMimeType]:
    'Unable to determine MIME type',
  [StringNames.Error_BlockServiceErrorFilePathNotProvided]:
    'File path not provided',
  [StringNames.Error_BlockServiceErrorUnableToDetermineBlockSize]:
    'Unable to determine block size',
  [StringNames.Error_BlockServiceErrorInvalidBlockData]: 'Invalid block data',
  [StringNames.Error_BlockServiceErrorInvalidBlockType]: 'Invalid block type',

  // Quorum Error
  [StringNames.Error_QuorumErrorInvalidQuorumId]: 'Invalid quorum ID',
  [StringNames.Error_QuorumErrorDocumentNotFound]: 'Document not found',
  [StringNames.Error_QuorumErrorUnableToRestoreDocument]:
    'Unable to restore document',
  [StringNames.Error_QuorumErrorNotImplemented]: 'Not implemented',
  [StringNames.Error_QuorumErrorUninitialized]:
    'Quorum subsystem not intialized',

  // System Keyring Error
  [StringNames.Error_SystemKeyringErrorKeyNotFoundTemplate]:
    'Key {KEY} not found',
  [StringNames.Error_SystemKeyringErrorRateLimitExceeded]:
    'Rate limit exceeded',

  // FEC error
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

  // ECIES error
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
  [StringNames.Error_EciesErrorPrivateKeyNotLoaded]: 'Private key not loaded',
  [StringNames.Error_EciesErrorRecipientKeyCountMismatch]:
    'Recipient count does not match key count',
  [StringNames.Error_EciesErrorInvalidIVLength]: 'Invalid IV length',
  [StringNames.Error_EciesErrorInvalidAuthTagLength]: 'Invalid auth tag length',
  [StringNames.Error_EciesErrorInvalidRecipientCount]:
    'Invalid recipient count',
  [StringNames.Error_EciesErrorFileSizeTooLarge]: 'File size too large',
  [StringNames.Error_EciesErrorInvalidDataLength]: 'Invalid data length',
  [StringNames.Error_EciesErrorInvalidBlockType]: 'Invalid block type',
  [StringNames.Error_EciesErrorInvalidMessageCrc]: 'Invalid message CRC',
  [StringNames.Error_EciesErrorDecryptionFailed]:
    'ECIES decryption failed (MAC check or padding error)', // Added
  [StringNames.Error_EciesErrorInvalidRecipientPublicKey]:
    'Invalid recipient public key provided for encryption', // Added
  [StringNames.Error_EciesErrorSecretComputationFailed]:
    'Failed to compute shared secret during ECIES operation', // Added

  // Voting derivation error
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

  // Voting error
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
  [StringNames.Error_VotingErrorModularInverseDoesNotExist]:
    'Modular multiplicative inverse does not exist',
  [StringNames.Error_VotingErrorPrivateKeyMustBeBuffer]:
    'Private key must be a Buffer',
  [StringNames.Error_VotingErrorPublicKeyMustBeBuffer]:
    'Public key must be a Buffer',
  [StringNames.Error_VotingErrorInvalidPublicKeyFormat]:
    'Invalid public key format',
  [StringNames.Error_VotingErrorInvalidEcdhKeyPair]: 'Invalid ECDH key pair',
  [StringNames.Error_VotingErrorFailedToDeriveVotingKeysTemplate]:
    'Failed to derive voting keys: {ERROR}',
  [StringNames.Error_VotingErrorFailedToGeneratePrime]:
    'Failed to generate prime number after maximum attempts',
  [StringNames.Error_VotingErrorIdenticalPrimes]: 'Generated identical primes',
  [StringNames.Error_VotingErrorKeyPairTooSmallTemplate]:
    'Generated key pair too small: {ACTUAL_BITS} bits < {REQUIRED_BITS} bits',
  [StringNames.Error_VotingErrorKeyPairValidationFailed]:
    'Key pair validation failed',
  [StringNames.Error_VotingErrorInvalidVotingKey]: 'Invalid voting key',
  [StringNames.Error_VotingErrorInvalidKeyPair]: 'Invalid key pair',
  [StringNames.Error_VotingErrorInvalidPublicKey]: 'Invalid public key',
  [StringNames.Error_VotingErrorInvalidPrivateKey]: 'Invalid private key',
  [StringNames.Error_VotingErrorInvalidEncryptedKey]: 'Invalid encrypted key',
  [StringNames.Error_VotingErrorInvalidPrivateKeyBufferTooShort]:
    'Invalid private key buffer: too short',
  [StringNames.Error_VotingErrorInvalidPrivateKeyBufferWrongMagic]:
    'Invalid private key buffer: wrong magic',
  [StringNames.Error_VotingErrorUnsupportedPrivateKeyVersion]:
    'Unsupported private key version',
  [StringNames.Error_VotingErrorInvalidPrivateKeyBufferIncompleteLambda]:
    'Invalid private key buffer: incomplete lambda',
  [StringNames.Error_VotingErrorInvalidPrivateKeyBufferIncompleteMuLength]:
    'Invalid private key buffer: incomplete mu length',
  [StringNames.Error_VotingErrorInvalidPrivateKeyBufferIncompleteMu]:
    'Invalid private key buffer: incomplete mu',
  [StringNames.Error_VotingErrorInvalidPrivateKeyBufferFailedToParse]:
    'Invalid private key buffer: failed to parse',
  [StringNames.Error_VotingErrorInvalidPrivateKeyBufferFailedToCreate]:
    'Invalid private key buffer: failed to create',

  // Store rror
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
  [StringNames.Error_StoreErrorBlockDeletionFailedTemplate]:
    'Failed to delete block: {ERROR}',

  // Secure storage error
  [StringNames.Error_SecureStorageDecryptedValueLengthMismatch]:
    'Decrypted value length does not match expected length',
  [StringNames.Error_SecureStorageDecryptedValueChecksumMismatch]:
    'Decrypted value checksum does not match',

  // Symmetric Error
  [StringNames.Error_SymmetricDataNullOrUndefined]:
    'Data to encrypt cannot be null or undefined',
  [StringNames.Error_SymmetricInvalidKeyLengthTemplate]:
    'Encryption key must be {KEY_BYTES} bytes long',

  // Tuple Error
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

  // Sealing Error
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

  // CBL Error
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
  [StringNames.Error_CblErrorNotExtendedCbl]: 'Not an extended CBL',
  [StringNames.Error_CblErrorInvalidSignature]: 'Invalid CBL signature',
  [StringNames.Error_CblErrorFileSizeTooLarge]: 'File size too large',
  [StringNames.Error_CblErrorFileSizeTooLargeForNode]:
    'File size above the maximum allowable for the current node',
  [StringNames.Error_CblErrorInvalidTupleSize]: 'Invalid tuple size',
  [StringNames.Error_CblErrorFileNameTooLong]: 'File name too long',
  [StringNames.Error_CblErrorMimeTypeTooLong]: 'MIME type too long',
  [StringNames.Error_CblErrorAddressCountExceedsCapacity]:
    'Address count exceeds block capacity',
  [StringNames.Error_CblErrorCblEncrypted]:
    'CBL is encrypted. Decrypt before use.',
  [StringNames.Error_CblErrorUserRequiredForDecryption]:
    'User is required for decryption',

  // Stream Error
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
    'Invalid tuple count ({TUPLE_COUNT}), must be between {TUPLE.MIN_SIZE} and {TUPLE.MAX_SIZE}',

  // Member Error
  [StringNames.Error_MemberErrorIncorrectOrInvalidPrivateKey]:
    'Incorrect or invalid private key for public key',
  [StringNames.Error_MemberErrorInvalidEmail]: 'Invalid email.',
  [StringNames.Error_MemberErrorInvalidEmailWhitespace]:
    'Email contains trailing or leading whitespace.',
  [StringNames.Error_MemberErrorMissingEncryptionData]:
    'Missing encryption data.',
  [StringNames.Error_MemberErrorEncryptionDataTooLarge]:
    'Encryption data too large.',
  [StringNames.Error_MemberErrorInvalidEncryptionData]:
    'Invalid encryption data.',
  [StringNames.Error_MemberErrorMemberNotFound]: 'Member not found.',
  [StringNames.Error_MemberErrorMemberAlreadyExists]: 'Member already exists.',
  [StringNames.Error_MemberErrorInvalidMemberStatus]: 'Invalid member status.',
  [StringNames.Error_MemberErrorInvalidMemberName]: 'Invalid member name.',
  [StringNames.Error_MemberErrorInsufficientRandomBlocks]:
    'Insufficient random blocks.',
  [StringNames.Error_MemberErrorFailedToCreateMemberBlocks]:
    'Failed to create member blocks.',
  [StringNames.Error_MemberErrorFailedToHydrateMember]:
    'Failed to hydrate member.',
  [StringNames.Error_MemberErrorInvalidMemberData]: 'Invalid member data.',
  [StringNames.Error_MemberErrorFailedToConvertMemberData]:
    'Failed to convert member data.',
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
  [StringNames.Error_MemberErrorInvalidMemberBlocks]: 'Invalid member blocks.',
  [StringNames.Error_MemoryTupleErrorInvalidTupleSizeTemplate]: `Tuple must have {TUPLE.SIZE} blocks`,

  // Multi Encrypted Error
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
  [StringNames.Error_MultiEncryptedErrorRecipientMismatch]:
    'Recipient list does not match header recipient count',
  [StringNames.Error_MultiEncryptedErrorRecipientsAlreadyLoaded]:
    'Recipients already loaded',

  // Whitened Error
  [StringNames.Error_WhitenedErrorBlockNotReadable]: 'Block cannot be read',
  [StringNames.Error_WhitenedErrorBlockSizeMismatch]: 'Block sizes must match',
  [StringNames.Error_WhitenedErrorDataLengthMismatch]:
    'Data and random data lengths must match',
  [StringNames.Error_WhitenedErrorInvalidBlockSize]: 'Invalid block size',

  // Handle Tuple Error
  [StringNames.Error_HandleTupleErrorInvalidTupleSizeTemplate]:
    'Invalid tuple size ({TUPLE.SIZE})',
  [StringNames.Error_HandleTupleErrorBlockSizeMismatch]:
    'All blocks in tuple must have the same size',
  [StringNames.Error_HandleTupleErrorNoBlocksToXor]: 'No blocks to XOR',
  [StringNames.Error_HandleTupleErrorBlockSizesMustMatch]:
    'Block sizes must match',

  // Owned Data Error
  [StringNames.Error_BlockErrorCreatorRequired]: 'Creator is required',
  [StringNames.Error_BlockErrorDataRequired]: 'Data is required',
  [StringNames.Error_BlockErrorDataLengthExceedsCapacity]:
    'Data length exceeds block capacity',
  [StringNames.Error_BlockErrorActualDataLengthNegative]:
    'Actual data length must be positive',
  [StringNames.Error_BlockErrorActualDataLengthExceedsDataLength]:
    'Actual data length cannot exceed data length',
  [StringNames.Error_BlockErrorCreatorRequiredForEncryption]:
    'Creator is required for encryption',
  [StringNames.Error_BlockErrorUnexpectedEncryptedBlockType]:
    'Unexpected encrypted block type',
  [StringNames.Error_BlockErrorCannotEncrypt]: 'Block cannot be encrypted',
  [StringNames.Error_BlockErrorCannotDecrypt]: 'Block cannot be decrypted',
  [StringNames.Error_BlockErrorCreatorPrivateKeyRequired]:
    'Creator private key is required',
  [StringNames.Error_BlockErrorInvalidMultiEncryptionRecipientCount]:
    'Invalid multi-encryption recipient count',
  [StringNames.Error_BlockErrorInvalidNewBlockType]: 'Invalid new block type',
  [StringNames.Error_BlockErrorUnexpectedEphemeralBlockType]:
    'Unexpected ephemeral block type',
  [StringNames.Error_BlockErrorRecipientRequired]: 'Recipient required',
  [StringNames.Error_BlockErrorRecipientKeyRequired]:
    'Recipient private key required',

  // Memory Tuple Error
  [StringNames.Error_MemoryTupleErrorBlockSizeMismatch]:
    'All blocks in tuple must have the same size',
  [StringNames.Error_MemoryTupleErrorNoBlocksToXor]: 'No blocks to XOR',
  [StringNames.Error_MemoryTupleErrorInvalidBlockCount]:
    'Invalid number of blocks for tuple',
  [StringNames.Error_MemoryTupleErrorExpectedBlockIdsTemplate]: `Expected {TUPLE.SIZE} block IDs`,
  [StringNames.Error_MemoryTupleErrorExpectedBlocksTemplate]: `Expected {TUPLE.SIZE} blocks`,

  [StringNames.Error_FailedToHydrateTemplate]: 'Failed to hydrate: {ERROR}',
  [StringNames.Error_FailedToSerializeTemplate]: 'Failed to serialize: {ERROR}',
  [StringNames.Error_InvalidChecksum]: 'Invalid checksum.',
  [StringNames.Error_InvalidCreator]: 'Invalid creator.',
  [StringNames.Error_InvalidIDFormat]: 'Invalid ID format.',
  [StringNames.Error_InvalidReferences]: 'Invalid references.',
  [StringNames.Error_InvalidSignature]: 'Invalid signature.',
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
  [StringNames.Error_InsufficientCapacity]: 'Insufficient capacity.',
  [StringNames.Error_NotImplemented]: 'Not implemented.',

  // Block Sizes
  [StringNames.BlockSize_Unknown]: 'Unknown',
  [StringNames.BlockSize_Message]: 'Message',
  [StringNames.BlockSize_Tiny]: 'Tiny',
  [StringNames.BlockSize_Small]: 'Small',
  [StringNames.BlockSize_Medium]: 'Medium',
  [StringNames.BlockSize_Large]: 'Large',
  [StringNames.BlockSize_Huge]: 'Huge',

  // Document Error
  [StringNames.Error_DocumentErrorInvalidValueTemplate]:
    'Invalid value for {KEY}',
  [StringNames.Error_DocumentErrorFieldRequiredTemplate]:
    'Field {KEY} is required.',
  [StringNames.Error_DocumentErrorAlreadyInitialized]:
    'Document subsystem is already initialized',
  [StringNames.Error_DocumentErrorUninitialized]:
    'Document subsystem is not initialized',
};

export default AmericanEnglishStrings;
