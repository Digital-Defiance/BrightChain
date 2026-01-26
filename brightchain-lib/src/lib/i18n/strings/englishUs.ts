import { StringsCollection } from '@digitaldefiance/i18n-lib';
import { BrightChainStrings } from '../../enumerations/brightChainStrings';

const site = 'BrightChain';

export const AmericanEnglishStrings: StringsCollection<BrightChainStrings> = {
  [BrightChainStrings.Admin_StringNotFoundForLanguageTemplate]:
    'String {NAME} not found for language {LANG}',
  [BrightChainStrings.Error_NoTranslationsForEnumTemplate]:
    'No translations found for enum: {enumName}',
  [BrightChainStrings.Error_LanguageNotFoundForEnumTemplate]:
    'Language {lang} not found for enum {enumName}',
  [BrightChainStrings.Error_NoTranslationsForEnumLanguageTemplate]:
    'Translation not found for {enumName}.{value} in {lang}',
  [BrightChainStrings.Error_UnknownEnumValueForEnumTemplate]:
    'Unknown enum value: {value} for enum: {enumName}',
  [BrightChainStrings.Error_LanguageNotFoundInStringsTemplate]:
    'Language {LANG} not found in Strings)',
  [BrightChainStrings.Error_Disposed]: 'Object has been disposed',
  [BrightChainStrings.ChangePassword_Success]: 'Password changed successfully.',
  [BrightChainStrings.Common_ChangePassword]: 'Change Password',
  [BrightChainStrings.Common_Dashboard]: 'Dashboard',
  [BrightChainStrings.Common_Logo]: 'Logo',
  [BrightChainStrings.Common_Site]: site,
  [BrightChainStrings.Common_Unauthorized]: 'Unauthorized',
  [BrightChainStrings.Error_BlockAccessTemplate]:
    'Block cannot be accessed: {REASON}',
  [BrightChainStrings.Error_BlockAccessErrorBlockAlreadyExists]:
    'Block file already exists',
  [BrightChainStrings.Error_BlockAccessErrorBlockIsNotPersistable]:
    'Block is not persistable',
  [BrightChainStrings.Error_BlockAccessErrorBlockIsNotReadable]:
    'Block is not readable',
  [BrightChainStrings.Error_BlockAccessErrorBlockFileNotFoundTemplate]:
    'Block file not found: {FILE}',
  [BrightChainStrings.Error_BlockAccessCBLCannotBeEncrypted]:
    'CBL block cannot be encrypted',
  [BrightChainStrings.Error_BlockAccessErrorCreatorMustBeProvided]:
    'Creator must be provided for signature validation',
  [BrightChainStrings.Error_BlockCannotBeDecrypted]:
    'Block cannot be decrypted',
  [BrightChainStrings.Error_BlockCannotBeEncrypted]:
    'Block cannot be encrypted',
  [BrightChainStrings.Error_BlockCapacityTemplate]:
    'Block capacity exceeded. BlockSize: ({BLOCK_SIZE}), Data: ({DATA_SIZE})',
  [BrightChainStrings.Error_BlockMetadataErrorCreatorIdMismatch]:
    'Creator ID mismatch',
  [BrightChainStrings.Error_BlockMetadataErrorCreatorRequired]:
    'Creator is required',
  [BrightChainStrings.Error_BlockMetadataErrorEncryptorRequired]:
    'Encryptor is required',
  [BrightChainStrings.Error_BlockMetadataErrorInvalidBlockMetadata]:
    'Invalid block metadata',
  [BrightChainStrings.Error_BlockMetadataErrorInvalidBlockMetadataTemplate]:
    'Invalid block metadata: {REASON}',
  [BrightChainStrings.Error_BlockMetadataErrorMetadataRequired]:
    'Metadata is required',
  [BrightChainStrings.Error_BlockMetadataErrorMissingRequiredMetadata]:
    'Missing required metadata fields',

  // Block Capacity Errors
  [BrightChainStrings.Error_BlockCapacityInvalidBlockSize]:
    'Invalid block size',
  [BrightChainStrings.Error_BlockCapacityInvalidBlockType]:
    'Invalid block type',
  [BrightChainStrings.Error_BlockCapacityCapacityExceeded]: 'Capacity exceeded',
  [BrightChainStrings.Error_BlockCapacityInvalidFileName]: 'Invalid file name',
  [BrightChainStrings.Error_BlockCapacityInvalidMimetype]: 'Invalid mimetype',
  [BrightChainStrings.Error_BlockCapacityInvalidRecipientCount]:
    'Invalid recipient count',
  [BrightChainStrings.Error_BlockCapacityInvalidExtendedCblData]:
    'Invalid extended CBL data',

  // Block validation error
  [BrightChainStrings.Error_BlockValidationErrorTemplate]:
    'Block validation failed: {REASON}',
  [BrightChainStrings.Error_BlockValidationErrorActualDataLengthUnknown]:
    'Actual data length is unknown',
  [BrightChainStrings.Error_BlockValidationErrorAddressCountExceedsCapacity]:
    'Address count exceeds block capacity',
  [BrightChainStrings.Error_BlockValidationErrorBlockDataNotBuffer]:
    'Block.data must be a buffer',
  [BrightChainStrings.Error_BlockValidationErrorBlockSizeNegative]:
    'Block size must be a positive number',
  [BrightChainStrings.Error_BlockValidationErrorCreatorIDMismatch]:
    'Creator ID mismatch',
  [BrightChainStrings.Error_BlockValidationErrorDataBufferIsTruncated]:
    'Data buffer is truncated',
  [BrightChainStrings.Error_BlockValidationErrorDataCannotBeEmpty]:
    'Data cannot be empty',
  [BrightChainStrings.Error_BlockValidationErrorDataLengthExceedsCapacity]:
    'Data length exceeds block capacity',
  [BrightChainStrings.Error_BlockValidationErrorDataLengthTooShort]:
    'Data too short to contain encryption header',
  [BrightChainStrings.Error_BlockValidationErrorDataLengthTooShortForCBLHeader]:
    'Data too short for CBL header',
  [BrightChainStrings.Error_BlockValidationErrorDataLengthTooShortForEncryptedCBL]:
    'Data too short for encrypted CBL',
  [BrightChainStrings.Error_BlockValidationErrorEphemeralBlockOnlySupportsBufferData]:
    'EphemeralBlock only supports Buffer data',
  [BrightChainStrings.Error_BlockValidationErrorFutureCreationDate]:
    'Block creation date cannot be in the future',
  [BrightChainStrings.Error_BlockValidationErrorInvalidAddressLengthTemplate]:
    'Invalid address length at index {INDEX}: {LENGTH}, expected: {EXPECTED_LENGTH}',
  [BrightChainStrings.Error_BlockValidationErrorInvalidAuthTagLength]:
    'Invalid auth tag length',
  [BrightChainStrings.Error_BlockValidationErrorInvalidBlockTypeTemplate]:
    'Invalid block type: {TYPE}',
  [BrightChainStrings.Error_BlockValidationErrorInvalidCBLAddressCount]:
    'CBL address count must be a multiple of TupleSize',
  [BrightChainStrings.Error_BlockValidationErrorInvalidCBLDataLength]:
    'Invalid CBL data length',
  [BrightChainStrings.Error_BlockValidationErrorInvalidDateCreated]:
    'Invalid date created',
  [BrightChainStrings.Error_BlockValidationErrorInvalidEncryptionHeaderLength]:
    'Invalid encryption header length',
  [BrightChainStrings.Error_BlockValidationErrorInvalidEphemeralPublicKeyLength]:
    'Invalid ephemeral public key length',
  [BrightChainStrings.Error_BlockValidationErrorInvalidIVLength]:
    'Invalid IV length',
  [BrightChainStrings.Error_BlockValidationErrorInvalidSignature]:
    'Invalid signature provided',
  [BrightChainStrings.Error_BlockValidationErrorInvalidRecipientIds]:
    'Invalid recipient IDs',
  [BrightChainStrings.Error_BlockValidationErrorInvalidTupleSizeTemplate]:
    'Tuple size must be between {TUPLE.MIN_SIZE} and {TUPLE.MAX_SIZE}',
  [BrightChainStrings.Error_BlockValidationErrorMethodMustBeImplementedByDerivedClass]:
    'Method must be implemented by derived class',
  [BrightChainStrings.Error_BlockValidationErrorNoChecksum]:
    'No checksum provided',
  [BrightChainStrings.Error_BlockValidationErrorOriginalDataLengthNegative]:
    'Original data length cannot be negative',
  [BrightChainStrings.Error_BlockValidationErrorInvalidEncryptionType]:
    'Invalid encryption type',
  [BrightChainStrings.Error_BlockValidationErrorInvalidRecipientCount]:
    'Invalid recipient count',
  [BrightChainStrings.Error_BlockValidationErrorInvalidRecipientKeys]:
    'Invalid recipient keys',
  [BrightChainStrings.Error_BlockValidationErrorEncryptionRecipientNotFoundInRecipients]:
    'Encryption recipient not found in recipients',
  [BrightChainStrings.Error_BlockValidationErrorEncryptionRecipientHasNoPrivateKey]:
    'Encryption recipient has no private key',
  [BrightChainStrings.Error_BlockValidationErrorInvalidCreator]:
    'Invalid creator',
  [BrightChainStrings.Error_BlockMetadataTemplate]:
    'Block metadata error: {REASON}',
  [BrightChainStrings.Error_BufferErrorInvalidBufferTypeTemplate]:
    'Invalid buffer type. Expected Buffer, got: {TYPE}',
  [BrightChainStrings.Error_ChecksumMismatchTemplate]:
    'Checksum mismatch: expected {EXPECTED}, got {CHECKSUM}',
  [BrightChainStrings.Error_InvalidBlockSizeTemplate]:
    'Invalid block size: {BLOCK_SIZE}',
  [BrightChainStrings.Error_InvalidCredentials]: 'Invalid credentials.',
  [BrightChainStrings.Error_InvalidEmail]: 'Invalid email.',
  [BrightChainStrings.Error_InvalidEmailMissing]: 'Missing email.',
  [BrightChainStrings.Error_InvalidEmailWhitespace]:
    'Email contains trailing or leading whitespace.',

  // GUID error
  [BrightChainStrings.Error_InvalidGuid]: 'Invalid GUID.',
  [BrightChainStrings.Error_InvalidGuidTemplate]: 'Invalid GUID: {GUID}',
  [BrightChainStrings.Error_InvalidGuidUnknownBrandTemplate]:
    'Unknown GUID brand: {BRAND}.',
  [BrightChainStrings.Error_InvalidGuidUnknownLengthTemplate]:
    'Invalid GUID length: {LENGTH}.',

  // Isolated Key Error
  [BrightChainStrings.Error_IsolatedKeyErrorInvalidPublicKey]:
    'Invalid public key: must be an isolated key',
  [BrightChainStrings.Error_IsolatedKeyErrorInvalidKeyId]:
    'Key isolation violation: invalid key ID',
  [BrightChainStrings.Error_IsolatedKeyErrorInvalidKeyFormat]:
    'Invalid key format',
  [BrightChainStrings.Error_IsolatedKeyErrorInvalidKeyLength]:
    'Invalid key length',
  [BrightChainStrings.Error_IsolatedKeyErrorInvalidKeyType]: 'Invalid key type',
  [BrightChainStrings.Error_IsolatedKeyErrorKeyIsolationViolation]:
    'Key isolation violation: ciphertexts from different key instances',

  // PBKDF2 Error
  [BrightChainStrings.Error_Pbkdf2InvalidSaltLength]:
    'Salt length does not match expected length',
  [BrightChainStrings.Error_Pbkdf2InvalidHashLength]:
    'Hash length does not match expected length',

  // Block Service Error
  [BrightChainStrings.Error_BlockServiceErrorBlockWhitenerCountMismatch]:
    'Number of blocks and whiteners must be the same',
  [BrightChainStrings.Error_BlockServiceErrorEmptyBlocksArray]:
    'Blocks array must not be empty',
  [BrightChainStrings.Error_BlockServiceErrorBlockSizeMismatch]:
    'All blocks must have the same block size',
  [BrightChainStrings.Error_BlockServiceErrorNoWhitenersProvided]:
    'No whiteners provided',
  [BrightChainStrings.Error_BlockServiceErrorAlreadyInitialized]:
    'BlockService subsystem already initialized',
  [BrightChainStrings.Error_BlockServiceErrorUninitialized]:
    'BlockService subsystem not initialized',
  [BrightChainStrings.Error_BlockServiceErrorBlockAlreadyExistsTemplate]:
    'Block already exists: {ID}',
  [BrightChainStrings.Error_BlockServiceErrorRecipientRequiredForEncryption]:
    'Recipient is required for encryption',
  [BrightChainStrings.Error_BlockServiceErrorCannotDetermineFileLength]:
    'Cannot determine file length',
  [BrightChainStrings.Error_BlockServiceErrorCannotDetermineBlockSize]:
    'Cannot determine block size',
  [BrightChainStrings.Error_BlockServiceErrorCannotDetermineFileName]:
    'Unable to determine file name',
  [BrightChainStrings.Error_BlockServiceErrorCannotDetermineMimeType]:
    'Unable to determine MIME type',
  [BrightChainStrings.Error_BlockServiceErrorFilePathNotProvided]:
    'File path not provided',
  [BrightChainStrings.Error_BlockServiceErrorUnableToDetermineBlockSize]:
    'Unable to determine block size',
  [BrightChainStrings.Error_BlockServiceErrorInvalidBlockData]:
    'Invalid block data',
  [BrightChainStrings.Error_BlockServiceErrorInvalidBlockType]:
    'Invalid block type',

  // Quorum Error
  [BrightChainStrings.Error_QuorumErrorInvalidQuorumId]: 'Invalid quorum ID',
  [BrightChainStrings.Error_QuorumErrorDocumentNotFound]: 'Document not found',
  [BrightChainStrings.Error_QuorumErrorUnableToRestoreDocument]:
    'Unable to restore document',
  [BrightChainStrings.Error_QuorumErrorNotImplemented]: 'Not implemented',
  [BrightChainStrings.Error_QuorumErrorUninitialized]:
    'Quorum subsystem not intialized',
  [BrightChainStrings.Error_QuorumErrorMemberNotFound]: 'Member not found',
  [BrightChainStrings.Error_QuorumErrorNotEnoughMembers]:
    'Not enough members for quorum operation',

  // System Keyring Error
  [BrightChainStrings.Error_SystemKeyringErrorKeyNotFoundTemplate]:
    'Key {KEY} not found',
  [BrightChainStrings.Error_SystemKeyringErrorRateLimitExceeded]:
    'Rate limit exceeded',

  // FEC error
  [BrightChainStrings.Error_FecErrorDataRequired]: 'Data is required',
  [BrightChainStrings.Error_FecErrorInvalidShardCounts]: 'Invalid shard counts',
  [BrightChainStrings.Error_FecErrorInvalidShardsAvailableArray]:
    'Invalid shards available array',
  [BrightChainStrings.Error_FecErrorInputBlockRequired]:
    'Input block is required',
  [BrightChainStrings.Error_FecErrorParityBlockCountMustBePositive]:
    'Number of parity blocks must be positive',
  [BrightChainStrings.Error_FecErrorInputDataMustBeBuffer]:
    'Input data must be a Buffer',
  [BrightChainStrings.Error_FecErrorDamagedBlockRequired]:
    'Damaged block is required',
  [BrightChainStrings.Error_FecErrorParityBlocksRequired]:
    'Parity blocks are required',
  [BrightChainStrings.Error_FecErrorBlockSizeMismatch]:
    'All blocks must have the same size',
  [BrightChainStrings.Error_FecErrorDamagedBlockDataMustBeBuffer]:
    'Damaged block data must be a Buffer',
  [BrightChainStrings.Error_FecErrorParityBlockDataMustBeBuffer]:
    'Parity block data must be a Buffer',
  [BrightChainStrings.Error_FecErrorInvalidDataLengthTemplate]:
    'Invalid data length: {LENGTH}, expected {EXPECTED}',
  [BrightChainStrings.Error_FecErrorShardSizeExceedsMaximumTemplate]:
    'Shard size {SIZE} exceeds maximum {MAXIMUM}',
  [BrightChainStrings.Error_FecErrorNotEnoughShardsAvailableTemplate]:
    'Not enough shards available: {AVAILABLE}, need {REQUIRED}',
  [BrightChainStrings.Error_FecErrorInvalidParityBlockSizeTemplate]:
    'Invalid parity block size: {SIZE}, expected {EXPECTED}',
  [BrightChainStrings.Error_FecErrorInvalidRecoveredBlockSizeTemplate]:
    'Invalid recovered block size: {SIZE}, expected {EXPECTED}',
  [BrightChainStrings.Error_FecErrorFecEncodingFailedTemplate]:
    'FEC encoding failed: {ERROR}',
  [BrightChainStrings.Error_FecErrorFecDecodingFailedTemplate]:
    'FEC decoding failed: {ERROR}',

  // ECIES error
  [BrightChainStrings.Error_EciesErrorInvalidHeaderLength]:
    'Invalid header length',
  [BrightChainStrings.Error_EciesErrorInvalidMnemonic]: 'Invalid mnemonic',
  [BrightChainStrings.Error_EciesErrorInvalidEncryptedDataLength]:
    'Invalid encrypted data length',
  [BrightChainStrings.Error_EciesErrorMessageLengthMismatch]:
    'Message length mismatch',
  [BrightChainStrings.Error_EciesErrorInvalidEncryptedKeyLength]:
    'Invalid encrypted key length',
  [BrightChainStrings.Error_EciesErrorInvalidEphemeralPublicKey]:
    'Invalid ephemeral public key',
  [BrightChainStrings.Error_EciesErrorRecipientNotFound]:
    'Recipient not found in recipient IDs',
  [BrightChainStrings.Error_EciesErrorInvalidSignature]: 'Invalid signature',
  [BrightChainStrings.Error_EciesErrorInvalidSenderPublicKey]:
    'Invalid sender public key',
  [BrightChainStrings.Error_EciesErrorTooManyRecipients]:
    'Too many recipients: exceeds maximum allowed',
  [BrightChainStrings.Error_EciesErrorPrivateKeyNotLoaded]:
    'Private key not loaded',
  [BrightChainStrings.Error_EciesErrorRecipientKeyCountMismatch]:
    'Recipient count does not match key count',
  [BrightChainStrings.Error_EciesErrorInvalidIVLength]: 'Invalid IV length',
  [BrightChainStrings.Error_EciesErrorInvalidAuthTagLength]:
    'Invalid auth tag length',
  [BrightChainStrings.Error_EciesErrorInvalidRecipientCount]:
    'Invalid recipient count',
  [BrightChainStrings.Error_EciesErrorFileSizeTooLarge]: 'File size too large',
  [BrightChainStrings.Error_EciesErrorInvalidDataLength]: 'Invalid data length',
  [BrightChainStrings.Error_EciesErrorInvalidBlockType]: 'Invalid block type',
  [BrightChainStrings.Error_EciesErrorInvalidMessageCrc]: 'Invalid message CRC',

  // Voting derivation error
  [BrightChainStrings.Error_VotingDerivationErrorFailedToGeneratePrime]:
    'Failed to generate prime number after maximum attempts',
  [BrightChainStrings.Error_VotingDerivationErrorIdenticalPrimes]:
    'Generated identical primes',
  [BrightChainStrings.Error_VotingDerivationErrorKeyPairTooSmallTemplate]:
    'Generated key pair too small: {ACTUAL_BITS} bits < {REQUIRED_BITS} bits',
  [BrightChainStrings.Error_VotingDerivationErrorKeyPairValidationFailed]:
    'Key pair validation failed',
  [BrightChainStrings.Error_VotingDerivationErrorModularInverseDoesNotExist]:
    'Modular multiplicative inverse does not exist',
  [BrightChainStrings.Error_VotingDerivationErrorPrivateKeyMustBeBuffer]:
    'Private key must be a Buffer',
  [BrightChainStrings.Error_VotingDerivationErrorPublicKeyMustBeBuffer]:
    'Public key must be a Buffer',
  [BrightChainStrings.Error_VotingDerivationErrorInvalidPublicKeyFormat]:
    'Invalid public key format',
  [BrightChainStrings.Error_VotingDerivationErrorInvalidEcdhKeyPair]:
    'Invalid ECDH key pair',
  [BrightChainStrings.Error_VotingDerivationErrorFailedToDeriveVotingKeysTemplate]:
    'Failed to derive voting keys: {ERROR}',

  // Voting error
  [BrightChainStrings.Error_VotingErrorInvalidKeyPairPublicKeyNotIsolated]:
    'Invalid key pair: public key must be isolated',
  [BrightChainStrings.Error_VotingErrorInvalidKeyPairPrivateKeyNotIsolated]:
    'Invalid key pair: private key must be isolated',
  [BrightChainStrings.Error_VotingErrorInvalidPublicKeyNotIsolated]:
    'Invalid public key: must be an isolated key',
  [BrightChainStrings.Error_VotingErrorInvalidPublicKeyBufferTooShort]:
    'Invalid public key buffer: too short',
  [BrightChainStrings.Error_VotingErrorInvalidPublicKeyBufferWrongMagic]:
    'Invalid public key buffer: wrong magic',
  [BrightChainStrings.Error_VotingErrorUnsupportedPublicKeyVersion]:
    'Unsupported public key version',
  [BrightChainStrings.Error_VotingErrorInvalidPublicKeyBufferIncompleteN]:
    'Invalid public key buffer: incomplete n value',
  [BrightChainStrings.Error_VotingErrorInvalidPublicKeyBufferFailedToParseNTemplate]:
    'Invalid public key buffer: failed to parse n: {ERROR}',
  [BrightChainStrings.Error_VotingErrorInvalidPublicKeyIdMismatch]:
    'Invalid public key: key ID mismatch',
  [BrightChainStrings.Error_VotingErrorModularInverseDoesNotExist]:
    'Modular multiplicative inverse does not exist',
  [BrightChainStrings.Error_VotingErrorPrivateKeyMustBeBuffer]:
    'Private key must be a Buffer',
  [BrightChainStrings.Error_VotingErrorPublicKeyMustBeBuffer]:
    'Public key must be a Buffer',
  [BrightChainStrings.Error_VotingErrorInvalidPublicKeyFormat]:
    'Invalid public key format',
  [BrightChainStrings.Error_VotingErrorInvalidEcdhKeyPair]:
    'Invalid ECDH key pair',
  [BrightChainStrings.Error_VotingErrorFailedToDeriveVotingKeysTemplate]:
    'Failed to derive voting keys: {ERROR}',
  [BrightChainStrings.Error_VotingErrorFailedToGeneratePrime]:
    'Failed to generate prime number after maximum attempts',
  [BrightChainStrings.Error_VotingErrorIdenticalPrimes]:
    'Generated identical primes',
  [BrightChainStrings.Error_VotingErrorKeyPairTooSmallTemplate]:
    'Generated key pair too small: {ACTUAL_BITS} bits < {REQUIRED_BITS} bits',
  [BrightChainStrings.Error_VotingErrorKeyPairValidationFailed]:
    'Key pair validation failed',
  [BrightChainStrings.Error_VotingErrorInvalidVotingKey]: 'Invalid voting key',
  [BrightChainStrings.Error_VotingErrorInvalidKeyPair]: 'Invalid key pair',
  [BrightChainStrings.Error_VotingErrorInvalidPublicKey]: 'Invalid public key',
  [BrightChainStrings.Error_VotingErrorInvalidPrivateKey]:
    'Invalid private key',
  [BrightChainStrings.Error_VotingErrorInvalidEncryptedKey]:
    'Invalid encrypted key',
  [BrightChainStrings.Error_VotingErrorInvalidPrivateKeyBufferTooShort]:
    'Invalid private key buffer: too short',
  [BrightChainStrings.Error_VotingErrorInvalidPrivateKeyBufferWrongMagic]:
    'Invalid private key buffer: wrong magic',
  [BrightChainStrings.Error_VotingErrorUnsupportedPrivateKeyVersion]:
    'Unsupported private key version',
  [BrightChainStrings.Error_VotingErrorInvalidPrivateKeyBufferIncompleteLambda]:
    'Invalid private key buffer: incomplete lambda',
  [BrightChainStrings.Error_VotingErrorInvalidPrivateKeyBufferIncompleteMuLength]:
    'Invalid private key buffer: incomplete mu length',
  [BrightChainStrings.Error_VotingErrorInvalidPrivateKeyBufferIncompleteMu]:
    'Invalid private key buffer: incomplete mu',
  [BrightChainStrings.Error_VotingErrorInvalidPrivateKeyBufferFailedToParse]:
    'Invalid private key buffer: failed to parse',
  [BrightChainStrings.Error_VotingErrorInvalidPrivateKeyBufferFailedToCreate]:
    'Invalid private key buffer: failed to create',

  // Store rror
  [BrightChainStrings.Error_StoreErrorKeyNotFoundTemplate]:
    'Key not found: {KEY}',
  [BrightChainStrings.Error_StoreErrorStorePathRequired]:
    'Store path is required',
  [BrightChainStrings.Error_StoreErrorStorePathNotFound]:
    'Store path not found',
  [BrightChainStrings.Error_StoreErrorBlockSizeRequired]:
    'Block size is required',
  [BrightChainStrings.Error_StoreErrorBlockIdRequired]: 'Block ID is required',
  [BrightChainStrings.Error_StoreErrorInvalidBlockIdTooShort]:
    'Invalid block ID: too short',
  [BrightChainStrings.Error_StoreErrorBlockFileSizeMismatch]:
    'Block file size mismatch',
  [BrightChainStrings.Error_StoreErrorBlockValidationFailed]:
    'Block validation failed',
  [BrightChainStrings.Error_StoreErrorBlockPathAlreadyExistsTemplate]:
    'Block path {PATH} already exists',
  [BrightChainStrings.Error_StoreErrorNoBlocksProvided]: 'No blocks provided',
  [BrightChainStrings.Error_StoreErrorCannotStoreEphemeralData]:
    'Cannot store ephemeral structured data',
  [BrightChainStrings.Error_StoreErrorBlockIdMismatchTemplate]:
    'Key {KEY} does not match block ID {BLOCK_ID}',
  [BrightChainStrings.Error_StoreErrorBlockSizeMismatch]:
    'Block size does not match store block size',
  [BrightChainStrings.Error_StoreErrorInvalidBlockMetadataTemplate]:
    'Invalid block metadata: {ERROR}',
  [BrightChainStrings.Error_StoreErrorBlockDirectoryCreationFailedTemplate]:
    'Failed to create block directory: {ERROR}',
  [BrightChainStrings.Error_StoreErrorBlockDeletionFailedTemplate]:
    'Failed to delete block: {ERROR}',
  [BrightChainStrings.Error_StoreErrorNotImplemented]:
    'Operation not implemented',
  [BrightChainStrings.Error_StoreErrorInsufficientRandomBlocksTemplate]:
    'Insufficient random blocks available: requested {REQUESTED}, available {AVAILABLE}',

  // Secure storage error
  [BrightChainStrings.Error_SecureStorageDecryptedValueLengthMismatch]:
    'Decrypted value length does not match expected length',
  [BrightChainStrings.Error_SecureStorageDecryptedValueChecksumMismatch]:
    'Decrypted value checksum does not match',
  [BrightChainStrings.Error_SecureStorageValueIsNull]:
    'Secure storage value is null',

  // Symmetric Error
  [BrightChainStrings.Error_SymmetricDataNullOrUndefined]:
    'Data to encrypt cannot be null or undefined',
  [BrightChainStrings.Error_SymmetricInvalidKeyLengthTemplate]:
    'Encryption key must be {KEY_BYTES} bytes long',

  // Tuple Error
  [BrightChainStrings.Error_TupleErrorInvalidTupleSize]: 'Invalid tuple size',
  [BrightChainStrings.Error_TupleErrorBlockSizeMismatch]:
    'All blocks in tuple must have the same size',
  [BrightChainStrings.Error_TupleErrorNoBlocksToXor]: 'No blocks to XOR',
  [BrightChainStrings.Error_TupleErrorInvalidBlockCount]:
    'Invalid number of blocks for tuple',
  [BrightChainStrings.Error_TupleErrorInvalidBlockType]: 'Invalid block type',
  [BrightChainStrings.Error_TupleErrorInvalidSourceLength]:
    'Source length must be positive',
  [BrightChainStrings.Error_TupleErrorRandomBlockGenerationFailed]:
    'Failed to generate random block',
  [BrightChainStrings.Error_TupleErrorWhiteningBlockGenerationFailed]:
    'Failed to generate whitening block',
  [BrightChainStrings.Error_TupleErrorMissingParameters]:
    'All parameters are required',
  [BrightChainStrings.Error_TupleErrorXorOperationFailedTemplate]:
    'Failed to XOR blocks: {ERROR}',
  [BrightChainStrings.Error_TupleErrorDataStreamProcessingFailedTemplate]:
    'Failed to process data stream: {ERROR}',
  [BrightChainStrings.Error_TupleErrorEncryptedDataStreamProcessingFailedTemplate]:
    'Failed to process encrypted data stream: {ERROR}',

  // Sealing Error
  [BrightChainStrings.Error_SealingErrorInvalidBitRange]:
    'Bits must be between 3 and 20',
  [BrightChainStrings.Error_SealingErrorInvalidMemberArray]:
    'amongstMembers must be an array of Member',
  [BrightChainStrings.Error_SealingErrorNotEnoughMembersToUnlock]:
    'Not enough members to unlock the document',
  [BrightChainStrings.Error_SealingErrorTooManyMembersToUnlock]:
    'Too many members to unlock the document',
  [BrightChainStrings.Error_SealingErrorMissingPrivateKeys]:
    'Not all members have private keys loaded',
  [BrightChainStrings.Error_SealingErrorEncryptedShareNotFound]:
    'Encrypted share not found',
  [BrightChainStrings.Error_SealingErrorMemberNotFound]: 'Member not found',
  [BrightChainStrings.Error_SealingErrorFailedToSealTemplate]:
    'Failed to seal document: {ERROR}',

  // CBL Error
  [BrightChainStrings.Error_CblErrorCblRequired]: 'CBL is required',
  [BrightChainStrings.Error_CblErrorWhitenedBlockFunctionRequired]:
    'getWhitenedBlock function is required',
  [BrightChainStrings.Error_CblErrorFailedToLoadBlock]: 'Failed to load block',
  [BrightChainStrings.Error_CblErrorExpectedEncryptedDataBlock]:
    'Expected encrypted data block',
  [BrightChainStrings.Error_CblErrorExpectedOwnedDataBlock]:
    'Expected owned data block',
  [BrightChainStrings.Error_CblErrorInvalidStructure]: 'Invalid CBL structure',
  [BrightChainStrings.Error_CblErrorCreatorUndefined]:
    'Creator cannot be undefined',
  [BrightChainStrings.Error_CblErrorBlockNotReadable]: 'Block cannot be read',
  [BrightChainStrings.Error_CblErrorCreatorRequiredForSignature]:
    'Creator is required for signature validation',
  [BrightChainStrings.Error_CblErrorFileNameRequired]: 'File name is required',
  [BrightChainStrings.Error_CblErrorFileNameEmpty]: 'File name cannot be empty',
  [BrightChainStrings.Error_CblErrorFileNameWhitespace]:
    'File name cannot start or end with spaces',
  [BrightChainStrings.Error_CblErrorFileNameInvalidChar]:
    'File name contains invalid character',
  [BrightChainStrings.Error_CblErrorFileNameControlChars]:
    'File name contains control characters',
  [BrightChainStrings.Error_CblErrorFileNamePathTraversal]:
    'File name cannot contain path traversal',
  [BrightChainStrings.Error_CblErrorMimeTypeRequired]: 'MIME type is required',
  [BrightChainStrings.Error_CblErrorMimeTypeEmpty]: 'MIME type cannot be empty',
  [BrightChainStrings.Error_CblErrorMimeTypeWhitespace]:
    'MIME type cannot start or end with spaces',
  [BrightChainStrings.Error_CblErrorMimeTypeLowercase]:
    'MIME type must be lowercase',
  [BrightChainStrings.Error_CblErrorMimeTypeInvalidFormat]:
    'Invalid MIME type format',
  [BrightChainStrings.Error_CblErrorInvalidBlockSize]: 'Invalid block size',
  [BrightChainStrings.Error_CblErrorMetadataSizeExceeded]:
    'Metadata size exceeds maximum allowed size',
  [BrightChainStrings.Error_CblErrorMetadataSizeNegative]:
    'Total metadata size cannot be negative',
  [BrightChainStrings.Error_CblErrorInvalidMetadataBuffer]:
    'Invalid metadata buffer',
  [BrightChainStrings.Error_CblErrorCreationFailedTemplate]:
    'Failed to create CBL block {ERROR}',
  [BrightChainStrings.Error_CblErrorInsufficientCapacityTemplate]:
    'Block size ({BLOCK_SIZE}) is too small to hold CBL data ({DATA_SIZE})',
  [BrightChainStrings.Error_CblErrorNotExtendedCbl]: 'Not an extended CBL',
  [BrightChainStrings.Error_CblErrorInvalidSignature]: 'Invalid CBL signature',
  [BrightChainStrings.Error_CblErrorFileSizeTooLarge]: 'File size too large',
  [BrightChainStrings.Error_CblErrorFileSizeTooLargeForNode]:
    'File size above the maximum allowable for the current node',
  [BrightChainStrings.Error_CblErrorInvalidTupleSize]: 'Invalid tuple size',
  [BrightChainStrings.Error_CblErrorFileNameTooLong]: 'File name too long',
  [BrightChainStrings.Error_CblErrorMimeTypeTooLong]: 'MIME type too long',
  [BrightChainStrings.Error_CblErrorAddressCountExceedsCapacity]:
    'Address count exceeds block capacity',
  [BrightChainStrings.Error_CblErrorCblEncrypted]:
    'CBL is encrypted. Decrypt before use.',
  [BrightChainStrings.Error_CblErrorUserRequiredForDecryption]:
    'User is required for decryption',

  // Stream Error
  [BrightChainStrings.Error_StreamErrorBlockSizeRequired]:
    'Block size is required',
  [BrightChainStrings.Error_StreamErrorWhitenedBlockSourceRequired]:
    'Whitened block source is required',
  [BrightChainStrings.Error_StreamErrorRandomBlockSourceRequired]:
    'Random block source is required',
  [BrightChainStrings.Error_StreamErrorInputMustBeBuffer]:
    'Input must be a buffer',
  [BrightChainStrings.Error_StreamErrorFailedToGetRandomBlock]:
    'Failed to get random block',
  [BrightChainStrings.Error_StreamErrorFailedToGetWhiteningBlock]:
    'Failed to get whitening/random block',
  [BrightChainStrings.Error_StreamErrorIncompleteEncryptedBlock]:
    'Incomplete encrypted block',

  [BrightChainStrings.Error_InvalidLanguageCode]: 'Invalid language code.',
  [BrightChainStrings.Error_InvalidSessionID]: 'Invalid session ID.',
  [BrightChainStrings.Error_InvalidTupleCountTemplate]:
    'Invalid tuple count ({TUPLE_COUNT}), must be between {TUPLE.MIN_SIZE} and {TUPLE.MAX_SIZE}',

  // Member Error
  [BrightChainStrings.Error_MemberErrorIncorrectOrInvalidPrivateKey]:
    'Incorrect or invalid private key for public key',
  [BrightChainStrings.Error_MemberErrorInvalidEmail]: 'Invalid email.',
  [BrightChainStrings.Error_MemberErrorInvalidEmailWhitespace]:
    'Email contains trailing or leading whitespace.',
  [BrightChainStrings.Error_MemberErrorMissingEncryptionData]:
    'Missing encryption data.',
  [BrightChainStrings.Error_MemberErrorEncryptionDataTooLarge]:
    'Encryption data too large.',
  [BrightChainStrings.Error_MemberErrorInvalidEncryptionData]:
    'Invalid encryption data.',
  [BrightChainStrings.Error_MemberErrorMemberNotFound]: 'Member not found.',
  [BrightChainStrings.Error_MemberErrorMemberAlreadyExists]:
    'Member already exists.',
  [BrightChainStrings.Error_MemberErrorInvalidMemberStatus]:
    'Invalid member status.',
  [BrightChainStrings.Error_MemberErrorInvalidMemberName]:
    'Invalid member name.',
  [BrightChainStrings.Error_MemberErrorInsufficientRandomBlocks]:
    'Insufficient random blocks.',
  [BrightChainStrings.Error_MemberErrorFailedToCreateMemberBlocks]:
    'Failed to create member blocks.',
  [BrightChainStrings.Error_MemberErrorFailedToHydrateMember]:
    'Failed to hydrate member.',
  [BrightChainStrings.Error_MemberErrorInvalidMemberData]:
    'Invalid member data.',
  [BrightChainStrings.Error_MemberErrorFailedToConvertMemberData]:
    'Failed to convert member data.',
  [BrightChainStrings.Error_MemberErrorInvalidMemberNameWhitespace]:
    'Member name contains trailing or leading whitespace.',
  [BrightChainStrings.Error_MemberErrorInvalidMnemonic]:
    'Invalid wallet mnemonic.',
  [BrightChainStrings.Error_MemberErrorMissingEmail]: 'Missing email.',
  [BrightChainStrings.Error_MemberErrorMissingMemberName]:
    'Missing member name.',
  [BrightChainStrings.Error_MemberErrorMissingVotingPrivateKey]:
    'Missing voting private key.',
  [BrightChainStrings.Error_MemberErrorMissingVotingPublicKey]:
    'Missing voting public key.',
  [BrightChainStrings.Error_MemberErrorMissingPrivateKey]:
    'Missing private key.',
  [BrightChainStrings.Error_MemberErrorNoWallet]: 'No wallet loaded.',
  [BrightChainStrings.Error_MemberErrorPrivateKeyRequiredToDeriveVotingKeyPair]:
    'Private key required to derive voting key pair.',
  [BrightChainStrings.Error_MemberErrorWalletAlreadyLoaded]:
    'Wallet already loaded.',
  [BrightChainStrings.Error_MemberErrorInvalidMemberBlocks]:
    'Invalid member blocks.',
  [BrightChainStrings.Error_MemoryTupleErrorInvalidTupleSizeTemplate]: `Tuple must have {TUPLE.SIZE} blocks`,

  // Multi Encrypted Error
  [BrightChainStrings.Error_MultiEncryptedErrorDataTooShort]:
    'Data too short to contain encryption header',
  [BrightChainStrings.Error_MultiEncryptedErrorDataLengthExceedsCapacity]:
    'Data length exceeds block capacity',
  [BrightChainStrings.Error_MultiEncryptedErrorCreatorMustBeMember]:
    'Creator must be a Member',
  [BrightChainStrings.Error_MultiEncryptedErrorBlockNotReadable]:
    'Block cannot be read',
  [BrightChainStrings.Error_MultiEncryptedErrorInvalidEphemeralPublicKeyLength]:
    'Invalid ephemeral public key length',
  [BrightChainStrings.Error_MultiEncryptedErrorInvalidIVLength]:
    'Invalid IV length',
  [BrightChainStrings.Error_MultiEncryptedErrorInvalidAuthTagLength]:
    'Invalid auth tag length',
  [BrightChainStrings.Error_MultiEncryptedErrorChecksumMismatch]:
    'Checksum mismatch',
  [BrightChainStrings.Error_MultiEncryptedErrorRecipientMismatch]:
    'Recipient list does not match header recipient count',
  [BrightChainStrings.Error_MultiEncryptedErrorRecipientsAlreadyLoaded]:
    'Recipients already loaded',

  // Whitened Error
  [BrightChainStrings.Error_WhitenedErrorBlockNotReadable]:
    'Block cannot be read',
  [BrightChainStrings.Error_WhitenedErrorBlockSizeMismatch]:
    'Block sizes must match',
  [BrightChainStrings.Error_WhitenedErrorDataLengthMismatch]:
    'Data and random data lengths must match',
  [BrightChainStrings.Error_WhitenedErrorInvalidBlockSize]:
    'Invalid block size',

  // Handle Tuple Error
  [BrightChainStrings.Error_HandleTupleErrorInvalidTupleSizeTemplate]:
    'Invalid tuple size ({TUPLE.SIZE})',
  [BrightChainStrings.Error_HandleTupleErrorBlockSizeMismatch]:
    'All blocks in tuple must have the same size',
  [BrightChainStrings.Error_HandleTupleErrorNoBlocksToXor]: 'No blocks to XOR',
  [BrightChainStrings.Error_HandleTupleErrorBlockSizesMustMatch]:
    'Block sizes must match',

  // Owned Data Error
  [BrightChainStrings.Error_BlockErrorCreatorRequired]: 'Creator is required',
  [BrightChainStrings.Error_BlockErrorDataRequired]: 'Data is required',
  [BrightChainStrings.Error_BlockErrorDataLengthExceedsCapacity]:
    'Data length exceeds block capacity',
  [BrightChainStrings.Error_BlockErrorActualDataLengthNegative]:
    'Actual data length must be positive',
  [BrightChainStrings.Error_BlockErrorActualDataLengthExceedsDataLength]:
    'Actual data length cannot exceed data length',
  [BrightChainStrings.Error_BlockErrorCreatorRequiredForEncryption]:
    'Creator is required for encryption',
  [BrightChainStrings.Error_BlockErrorUnexpectedEncryptedBlockType]:
    'Unexpected encrypted block type',
  [BrightChainStrings.Error_BlockErrorCannotEncrypt]:
    'Block cannot be encrypted',
  [BrightChainStrings.Error_BlockErrorCannotDecrypt]:
    'Block cannot be decrypted',
  [BrightChainStrings.Error_BlockErrorCreatorPrivateKeyRequired]:
    'Creator private key is required',
  [BrightChainStrings.Error_BlockErrorInvalidMultiEncryptionRecipientCount]:
    'Invalid multi-encryption recipient count',
  [BrightChainStrings.Error_BlockErrorInvalidNewBlockType]:
    'Invalid new block type',
  [BrightChainStrings.Error_BlockErrorUnexpectedEphemeralBlockType]:
    'Unexpected ephemeral block type',
  [BrightChainStrings.Error_BlockErrorRecipientRequired]: 'Recipient required',
  [BrightChainStrings.Error_BlockErrorRecipientKeyRequired]:
    'Recipient private key required',

  // Memory Tuple Error
  [BrightChainStrings.Error_MemoryTupleErrorBlockSizeMismatch]:
    'All blocks in tuple must have the same size',
  [BrightChainStrings.Error_MemoryTupleErrorNoBlocksToXor]: 'No blocks to XOR',
  [BrightChainStrings.Error_MemoryTupleErrorInvalidBlockCount]:
    'Invalid number of blocks for tuple',
  [BrightChainStrings.Error_MemoryTupleErrorExpectedBlockIdsTemplate]: `Expected {TUPLE.SIZE} block IDs`,
  [BrightChainStrings.Error_MemoryTupleErrorExpectedBlocksTemplate]: `Expected {TUPLE.SIZE} blocks`,

  [BrightChainStrings.Error_FailedToHydrateTemplate]:
    'Failed to hydrate: {ERROR}',
  [BrightChainStrings.Error_FailedToSerializeTemplate]:
    'Failed to serialize: {ERROR}',
  [BrightChainStrings.Error_InvalidChecksum]: 'Invalid checksum.',
  [BrightChainStrings.Error_InvalidCreator]: 'Invalid creator.',
  [BrightChainStrings.Error_InvalidIDFormat]: 'Invalid ID format.',
  [BrightChainStrings.Error_InvalidReferences]: 'Invalid references.',
  [BrightChainStrings.Error_InvalidSignature]: 'Invalid signature.',
  [BrightChainStrings.Error_MetadataMismatch]: 'Metadata mismatch.',
  [BrightChainStrings.Error_TokenExpired]: 'Token expired.',
  [BrightChainStrings.Error_TokenInvalid]: 'Token invalid.',
  [BrightChainStrings.Error_UnexpectedError]: 'An unexpected error occurred.',
  [BrightChainStrings.Error_UserNotFound]: 'User not found.',
  [BrightChainStrings.Error_ValidationError]: 'Validation error.',
  [BrightChainStrings.ForgotPassword_Title]: 'Forgot Password',
  [BrightChainStrings.LanguageUpdate_Success]: 'Language updated successfully.',
  [BrightChainStrings.Login_LoginButton]: 'Login',
  [BrightChainStrings.LogoutButton]: 'Logout',
  [BrightChainStrings.Register_Button]: 'Register',
  [BrightChainStrings.Register_Error]: 'An error occurred during registration.',
  [BrightChainStrings.Register_Success]: 'Registration successful.',
  [BrightChainStrings.Validation_InvalidLanguage]: 'Invalid language.',
  [BrightChainStrings.Validation_InvalidPassword]: 'Invalid password.',
  [BrightChainStrings.Validation_PasswordRegexErrorTemplate]:
    'Password does not meet requirements: {ERROR}',
  [BrightChainStrings.Error_InsufficientCapacity]: 'Insufficient capacity.',
  [BrightChainStrings.Error_NotImplemented]: 'Not implemented.',
  [BrightChainStrings.Error_LengthExceedsMaximum]: 'Length exceeds maximum.',
  [BrightChainStrings.Error_LengthIsInvalidType]: 'Length is invalid type.',
  [BrightChainStrings.Common_NoActiveRequest]: 'No active request.',
  [BrightChainStrings.Common_NoActiveResponse]: 'No active response.',
  [BrightChainStrings.Common_NoUserOnRequest]: 'No user on request.',

  // Block Sizes
  [BrightChainStrings.BlockSize_Unknown]: 'Unknown',
  [BrightChainStrings.BlockSize_Message]: 'Message',
  [BrightChainStrings.BlockSize_Tiny]: 'Tiny',
  [BrightChainStrings.BlockSize_Small]: 'Small',
  [BrightChainStrings.BlockSize_Medium]: 'Medium',
  [BrightChainStrings.BlockSize_Large]: 'Large',
  [BrightChainStrings.BlockSize_Huge]: 'Huge',

  // Document Error
  [BrightChainStrings.Error_DocumentErrorInvalidValueTemplate]:
    'Invalid value for {KEY}',
  [BrightChainStrings.Error_DocumentErrorFieldRequiredTemplate]:
    'Field {KEY} is required.',
  [BrightChainStrings.Error_DocumentErrorAlreadyInitialized]:
    'Document subsystem is already initialized',
  [BrightChainStrings.Error_DocumentErrorUninitialized]:
    'Document subsystem is not initialized',
};

export default AmericanEnglishStrings;
