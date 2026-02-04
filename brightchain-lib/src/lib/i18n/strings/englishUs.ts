import { StringsCollection } from '@digitaldefiance/i18n-lib';
import { BrightChainStrings, BrightChainStringKey } from '../../enumerations/brightChainStrings';

const site = 'BrightChain';

export const AmericanEnglishStrings: StringsCollection<BrightChainStringKey> = {
  // NOTE: Admin, i18n, common UI, and many error strings have been moved to external libraries
  // Use SuiteCoreStringKey from @digitaldefiance/suite-core-lib for common errors
  // Use EciesStringKey from @digitaldefiance/ecies-lib for ECIES/Member errors

  [BrightChainStrings.Common_BlockSize]: 'Block Size',
  [BrightChainStrings.Common_AtIndexTemplate]: '{OPERATION} at index {INDEX}',

  [BrightChainStrings.ChangePassword_Success]: 'Password changed successfully.',
  [BrightChainStrings.Common_Site]: site,
  [BrightChainStrings.Error_BlockAccess_Template]:
    'Block cannot be accessed: {REASON}',
  [BrightChainStrings.Error_BlockAccessError_BlockAlreadyExists]:
    'Block file already exists',
  [BrightChainStrings.Error_BlockAccessError_BlockIsNotPersistable]:
    'Block is not persistable',
  [BrightChainStrings.Error_BlockAccessError_BlockIsNotReadable]:
    'Block is not readable',
  [BrightChainStrings.Error_BlockAccessError_BlockFileNotFoundTemplate]:
    'Block file not found: {FILE}',
  [BrightChainStrings.Error_BlockAccess_CBLCannotBeEncrypted]:
    'CBL block cannot be encrypted',
  [BrightChainStrings.Error_BlockAccessError_CreatorMustBeProvided]:
    'Creator must be provided for signature validation',
  [BrightChainStrings.Error_Block_CannotBeDecrypted]:
    'Block cannot be decrypted',
  [BrightChainStrings.Error_Block_CannotBeEncrypted]:
    'Block cannot be encrypted',
  [BrightChainStrings.Error_BlockCapacity_Template]:
    'Block capacity exceeded. BlockSize: ({BLOCK_SIZE}), Data: ({DATA_SIZE})',
  [BrightChainStrings.Error_BlockMetadataError_CreatorIdMismatch]:
    'Creator ID mismatch',
  [BrightChainStrings.Error_BlockMetadataError_CreatorRequired]:
    'Creator is required',
  [BrightChainStrings.Error_BlockMetadataError_EncryptorRequired]:
    'Encryptor is required',
  [BrightChainStrings.Error_BlockMetadataError_InvalidBlockMetadata]:
    'Invalid block metadata',
  [BrightChainStrings.Error_BlockMetadataError_InvalidBlockMetadataTemplate]:
    'Invalid block metadata: {REASON}',
  [BrightChainStrings.Error_BlockMetadataError_MetadataRequired]:
    'Metadata is required',
  [BrightChainStrings.Error_BlockMetadataError_MissingRequiredMetadata]:
    'Missing required metadata fields',

  // Block Capacity Errors
  [BrightChainStrings.Error_BlockCapacity_InvalidBlockSize]:
    'Invalid block size',
  [BrightChainStrings.Error_BlockCapacity_InvalidBlockType]:
    'Invalid block type',
  [BrightChainStrings.Error_BlockCapacity_CapacityExceeded]:
    'Capacity exceeded',
  [BrightChainStrings.Error_BlockCapacity_InvalidFileName]: 'Invalid file name',
  [BrightChainStrings.Error_BlockCapacity_InvalidMimetype]: 'Invalid mimetype',
  [BrightChainStrings.Error_BlockCapacity_InvalidRecipientCount]:
    'Invalid recipient count',
  [BrightChainStrings.Error_BlockCapacity_InvalidExtendedCblData]:
    'Invalid extended CBL data',

  // Block validation error
  [BrightChainStrings.Error_BlockValidationError_Template]:
    'Block validation failed: {REASON}',
  [BrightChainStrings.Error_BlockValidationError_ActualDataLengthUnknown]:
    'Actual data length is unknown',
  [BrightChainStrings.Error_BlockValidationError_AddressCountExceedsCapacity]:
    'Address count exceeds block capacity',
  [BrightChainStrings.Error_BlockValidationError_BlockDataNotBuffer]:
    'Block.data must be a buffer',
  [BrightChainStrings.Error_BlockValidationError_BlockSizeNegative]:
    'Block size must be a positive number',
  [BrightChainStrings.Error_BlockValidationError_CreatorIDMismatch]:
    'Creator ID mismatch',
  [BrightChainStrings.Error_BlockValidationError_DataBufferIsTruncated]:
    'Data buffer is truncated',
  [BrightChainStrings.Error_BlockValidationError_DataCannotBeEmpty]:
    'Data cannot be empty',
  [BrightChainStrings.Error_BlockValidationError_DataLengthExceedsCapacity]:
    'Data length exceeds block capacity',
  [BrightChainStrings.Error_BlockValidationError_DataLengthTooShort]:
    'Data too short to contain encryption header',
  [BrightChainStrings.Error_BlockValidationError_DataLengthTooShortForCBLHeader]:
    'Data too short for CBL header',
  [BrightChainStrings.Error_BlockValidationError_DataLengthTooShortForEncryptedCBL]:
    'Data too short for encrypted CBL',
  [BrightChainStrings.Error_BlockValidationError_EphemeralBlockOnlySupportsBufferData]:
    'EphemeralBlock only supports Buffer data',
  [BrightChainStrings.Error_BlockValidationError_FutureCreationDate]:
    'Block creation date cannot be in the future',
  [BrightChainStrings.Error_BlockValidationError_InvalidAddressLengthTemplate]:
    'Invalid address length at index {INDEX}: {LENGTH}, expected: {EXPECTED_LENGTH}',
  [BrightChainStrings.Error_BlockValidationError_InvalidAuthTagLength]:
    'Invalid auth tag length',
  [BrightChainStrings.Error_BlockValidationError_InvalidBlockTypeTemplate]:
    'Invalid block type: {TYPE}',
  [BrightChainStrings.Error_BlockValidationError_InvalidCBLAddressCount]:
    'CBL address count must be a multiple of TupleSize',
  [BrightChainStrings.Error_BlockValidationError_InvalidCBLDataLength]:
    'Invalid CBL data length',
  [BrightChainStrings.Error_BlockValidationError_InvalidDateCreated]:
    'Invalid date created',
  [BrightChainStrings.Error_BlockValidationError_InvalidEncryptionHeaderLength]:
    'Invalid encryption header length',
  [BrightChainStrings.Error_BlockValidationError_InvalidEphemeralPublicKeyLength]:
    'Invalid ephemeral public key length',
  [BrightChainStrings.Error_BlockValidationError_InvalidIVLength]:
    'Invalid IV length',
  [BrightChainStrings.Error_BlockValidationError_InvalidSignature]:
    'Invalid signature provided',
  [BrightChainStrings.Error_BlockValidationError_InvalidRecipientIds]:
    'Invalid recipient IDs',
  [BrightChainStrings.Error_BlockValidationError_InvalidTupleSizeTemplate]:
    'Tuple size must be between {TUPLE_MIN_SIZE} and {TUPLE_MAX_SIZE}',
  [BrightChainStrings.Error_BlockValidationError_MethodMustBeImplementedByDerivedClass]:
    'Method must be implemented by derived class',
  [BrightChainStrings.Error_BlockValidationError_NoChecksum]:
    'No checksum provided',
  [BrightChainStrings.Error_BlockValidationError_OriginalDataLengthNegative]:
    'Original data length cannot be negative',
  [BrightChainStrings.Error_BlockValidationError_InvalidEncryptionType]:
    'Invalid encryption type',
  [BrightChainStrings.Error_BlockValidationError_InvalidRecipientCount]:
    'Invalid recipient count',
  [BrightChainStrings.Error_BlockValidationError_InvalidRecipientKeys]:
    'Invalid recipient keys',
  [BrightChainStrings.Error_BlockValidationError_EncryptionRecipientNotFoundInRecipients]:
    'Encryption recipient not found in recipients',
  [BrightChainStrings.Error_BlockValidationError_EncryptionRecipientHasNoPrivateKey]:
    'Encryption recipient has no private key',
  [BrightChainStrings.Error_BlockValidationError_InvalidCreator]:
    'Invalid creator',
  [BrightChainStrings.Error_BlockMetadata_Template]:
    'Block metadata error: {REASON}',
  [BrightChainStrings.Error_BufferError_InvalidBufferTypeTemplate]:
    'Invalid buffer type. Expected Buffer, got: {TYPE}',
  [BrightChainStrings.Error_Checksum_MismatchTemplate]:
    'Checksum mismatch: expected {EXPECTED}, got {CHECKSUM}',
  [BrightChainStrings.Error_BlockSize_InvalidTemplate]:
    'Invalid block size: {BLOCK_SIZE}',
  [BrightChainStrings.Error_Credentials_Invalid]: 'Invalid credentials.',

  // NOTE: Email and GUID errors moved to external libraries (SuiteCoreStringKey, EciesStringKey)

  // Isolated Key Error
  [BrightChainStrings.Error_IsolatedKeyError_InvalidPublicKey]:
    'Invalid public key: must be an isolated key',
  [BrightChainStrings.Error_IsolatedKeyError_InvalidKeyId]:
    'Key isolation violation: invalid key ID',
  [BrightChainStrings.Error_IsolatedKeyError_InvalidKeyFormat]:
    'Invalid key format',
  [BrightChainStrings.Error_IsolatedKeyError_InvalidKeyLength]:
    'Invalid key length',
  [BrightChainStrings.Error_IsolatedKeyError_InvalidKeyType]:
    'Invalid key type',
  [BrightChainStrings.Error_IsolatedKeyError_KeyIsolationViolation]:
    'Key isolation violation: ciphertexts from different key instances',

  // NOTE: PBKDF2 errors moved to EciesStringKey

  // Block Handle Error
  [BrightChainStrings.Error_BlockHandle_BlockConstructorMustBeValid]:
    'blockConstructor must be a valid constructor function',
  [BrightChainStrings.Error_BlockHandle_BlockSizeRequired]:
    'blockSize is required',
  [BrightChainStrings.Error_BlockHandle_DataMustBeUint8Array]:
    'data must be a Uint8Array',
  [BrightChainStrings.Error_BlockHandle_ChecksumMustBeChecksum]:
    'checksum must be a Checksum',

  // Block Handle Tuple Error
  [BrightChainStrings.Error_BlockHandleTuple_FailedToLoadBlockTemplate]:
    'Failed to load block {CHECKSUM}: {ERROR}',
  [BrightChainStrings.Error_BlockHandleTuple_FailedToStoreXorResultTemplate]:
    'Failed to store XOR result: {ERROR}',

  // Block Service Error
  [BrightChainStrings.Error_BlockServiceError_BlockWhitenerCountMismatch]:
    'Number of blocks and whiteners must be the same',
  [BrightChainStrings.Error_BlockServiceError_EmptyBlocksArray]:
    'Blocks array must not be empty',
  [BrightChainStrings.Error_BlockServiceError_BlockSizeMismatch]:
    'All blocks must have the same block size',
  [BrightChainStrings.Error_BlockServiceError_NoWhitenersProvided]:
    'No whiteners provided',
  [BrightChainStrings.Error_BlockServiceError_AlreadyInitialized]:
    'BlockService subsystem already initialized',
  [BrightChainStrings.Error_BlockServiceError_Uninitialized]:
    'BlockService subsystem not initialized',
  [BrightChainStrings.Error_BlockServiceError_BlockAlreadyExistsTemplate]:
    'Block already exists: {ID}',
  [BrightChainStrings.Error_BlockServiceError_RecipientRequiredForEncryption]:
    'Recipient is required for encryption',
  [BrightChainStrings.Error_BlockServiceError_CannotDetermineFileLength]:
    'Cannot determine file length',
  [BrightChainStrings.Error_BlockServiceError_CannotDetermineBlockSize]:
    'Cannot determine block size',
  [BrightChainStrings.Error_BlockServiceError_CannotDetermineFileName]:
    'Unable to determine file name',
  [BrightChainStrings.Error_BlockServiceError_CannotDetermineMimeType]:
    'Unable to determine MIME type',
  [BrightChainStrings.Error_BlockServiceError_FilePathNotProvided]:
    'File path not provided',
  [BrightChainStrings.Error_BlockServiceError_UnableToDetermineBlockSize]:
    'Unable to determine block size',
  [BrightChainStrings.Error_BlockServiceError_InvalidBlockData]:
    'Invalid block data',
  [BrightChainStrings.Error_BlockServiceError_InvalidBlockType]:
    'Invalid block type',

  // Quorum Error
  [BrightChainStrings.Error_QuorumError_InvalidQuorumId]: 'Invalid quorum ID',
  [BrightChainStrings.Error_QuorumError_DocumentNotFound]: 'Document not found',
  [BrightChainStrings.Error_QuorumError_UnableToRestoreDocument]:
    'Unable to restore document',
  [BrightChainStrings.Error_QuorumError_NotImplemented]: 'Not implemented',
  [BrightChainStrings.Error_QuorumError_Uninitialized]:
    'Quorum subsystem not intialized',
  [BrightChainStrings.Error_QuorumError_MemberNotFound]: 'Member not found',
  [BrightChainStrings.Error_QuorumError_NotEnoughMembers]:
    'Not enough members for quorum operation',

  // System Keyring Error
  [BrightChainStrings.Error_SystemKeyringError_KeyNotFoundTemplate]:
    'Key {KEY} not found',
  [BrightChainStrings.Error_SystemKeyringError_RateLimitExceeded]:
    'Rate limit exceeded',

  // NOTE: FEC errors moved to SuiteCoreStringKey in @digitaldefiance/suite-core-lib
  // BrightChain-specific FEC errors remain here
  [BrightChainStrings.Error_FecError_InputBlockRequired]:
    'Input block is required',
  [BrightChainStrings.Error_FecError_DamagedBlockRequired]:
    'Damaged block is required',
  [BrightChainStrings.Error_FecError_ParityBlocksRequired]:
    'Parity blocks are required',
  [BrightChainStrings.Error_FecError_InvalidParityBlockSizeTemplate]:
    'Invalid parity block size: expected {EXPECTED_SIZE}, got {ACTUAL_SIZE}',
  [BrightChainStrings.Error_FecError_InvalidRecoveredBlockSizeTemplate]:
    'Invalid recovered block size: expected {EXPECTED_SIZE}, got {ACTUAL_SIZE}',
  [BrightChainStrings.Error_FecError_InputDataMustBeBuffer]:
    'Input data must be a Buffer',
  [BrightChainStrings.Error_FecError_BlockSizeMismatch]:
    'Block sizes must match',
  [BrightChainStrings.Error_FecError_DamagedBlockDataMustBeBuffer]:
    'Damaged block data must be a Buffer',
  [BrightChainStrings.Error_FecError_ParityBlockDataMustBeBuffer]:
    'Parity block data must be a Buffer',

  // NOTE: ECIES errors moved to EciesStringKey in @digitaldefiance/ecies-lib
  // BrightChain-specific ECIES errors remain here
  [BrightChainStrings.Error_EciesError_InvalidBlockType]:
    'Invalid block type for ECIES operation',

  // Voting derivation error
  [BrightChainStrings.Error_VotingDerivationError_FailedToGeneratePrime]:
    'Failed to generate prime number after maximum attempts',
  [BrightChainStrings.Error_VotingDerivationError_IdenticalPrimes]:
    'Generated identical primes',
  [BrightChainStrings.Error_VotingDerivationError_KeyPairTooSmallTemplate]:
    'Generated key pair too small: {ACTUAL_BITS} bits < {REQUIRED_BITS} bits',
  [BrightChainStrings.Error_VotingDerivationError_KeyPairValidationFailed]:
    'Key pair validation failed',
  [BrightChainStrings.Error_VotingDerivationError_ModularInverseDoesNotExist]:
    'Modular multiplicative inverse does not exist',
  [BrightChainStrings.Error_VotingDerivationError_PrivateKeyMustBeBuffer]:
    'Private key must be a Buffer',
  [BrightChainStrings.Error_VotingDerivationError_PublicKeyMustBeBuffer]:
    'Public key must be a Buffer',
  [BrightChainStrings.Error_VotingDerivationError_InvalidPublicKeyFormat]:
    'Invalid public key format',
  [BrightChainStrings.Error_VotingDerivationError_InvalidEcdhKeyPair]:
    'Invalid ECDH key pair',
  [BrightChainStrings.Error_VotingDerivationError_FailedToDeriveVotingKeysTemplate]:
    'Failed to derive voting keys: {ERROR}',

  // Voting error
  [BrightChainStrings.Error_VotingError_InvalidKeyPairPublicKeyNotIsolated]:
    'Invalid key pair: public key must be isolated',
  [BrightChainStrings.Error_VotingError_InvalidKeyPairPrivateKeyNotIsolated]:
    'Invalid key pair: private key must be isolated',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyNotIsolated]:
    'Invalid public key: must be an isolated key',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyBufferTooShort]:
    'Invalid public key buffer: too short',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyBufferWrongMagic]:
    'Invalid public key buffer: wrong magic',
  [BrightChainStrings.Error_VotingError_UnsupportedPublicKeyVersion]:
    'Unsupported public key version',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyBufferIncompleteN]:
    'Invalid public key buffer: incomplete n value',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyBufferFailedToParseNTemplate]:
    'Invalid public key buffer: failed to parse n: {ERROR}',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyIdMismatch]:
    'Invalid public key: key ID mismatch',
  [BrightChainStrings.Error_VotingError_ModularInverseDoesNotExist]:
    'Modular multiplicative inverse does not exist',
  [BrightChainStrings.Error_VotingError_PrivateKeyMustBeBuffer]:
    'Private key must be a Buffer',
  [BrightChainStrings.Error_VotingError_PublicKeyMustBeBuffer]:
    'Public key must be a Buffer',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyFormat]:
    'Invalid public key format',
  [BrightChainStrings.Error_VotingError_InvalidEcdhKeyPair]:
    'Invalid ECDH key pair',
  [BrightChainStrings.Error_VotingError_FailedToDeriveVotingKeysTemplate]:
    'Failed to derive voting keys: {ERROR}',
  [BrightChainStrings.Error_VotingError_FailedToGeneratePrime]:
    'Failed to generate prime number after maximum attempts',
  [BrightChainStrings.Error_VotingError_IdenticalPrimes]:
    'Generated identical primes',
  [BrightChainStrings.Error_VotingError_KeyPairTooSmallTemplate]:
    'Generated key pair too small: {ACTUAL_BITS} bits < {REQUIRED_BITS} bits',
  [BrightChainStrings.Error_VotingError_KeyPairValidationFailed]:
    'Key pair validation failed',
  [BrightChainStrings.Error_VotingError_InvalidVotingKey]: 'Invalid voting key',
  [BrightChainStrings.Error_VotingError_InvalidKeyPair]: 'Invalid key pair',
  [BrightChainStrings.Error_VotingError_InvalidPublicKey]: 'Invalid public key',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKey]:
    'Invalid private key',
  [BrightChainStrings.Error_VotingError_InvalidEncryptedKey]:
    'Invalid encrypted key',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferTooShort]:
    'Invalid private key buffer: too short',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferWrongMagic]:
    'Invalid private key buffer: wrong magic',
  [BrightChainStrings.Error_VotingError_UnsupportedPrivateKeyVersion]:
    'Unsupported private key version',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferIncompleteLambda]:
    'Invalid private key buffer: incomplete lambda',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferIncompleteMuLength]:
    'Invalid private key buffer: incomplete mu length',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferIncompleteMu]:
    'Invalid private key buffer: incomplete mu',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferFailedToParse]:
    'Invalid private key buffer: failed to parse',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferFailedToCreate]:
    'Invalid private key buffer: failed to create',

  // Store rror
  [BrightChainStrings.Error_StoreError_KeyNotFoundTemplate]:
    'Key not found: {KEY}',
  [BrightChainStrings.Error_StoreError_StorePathRequired]:
    'Store path is required',
  [BrightChainStrings.Error_StoreError_StorePathNotFound]:
    'Store path not found',
  [BrightChainStrings.Error_StoreError_BlockSizeRequired]:
    'Block size is required',
  [BrightChainStrings.Error_StoreError_BlockIdRequired]: 'Block ID is required',
  [BrightChainStrings.Error_StoreError_InvalidBlockIdTooShort]:
    'Invalid block ID: too short',
  [BrightChainStrings.Error_StoreError_BlockFileSizeMismatch]:
    'Block file size mismatch',
  [BrightChainStrings.Error_StoreError_BlockValidationFailed]:
    'Block validation failed',
  [BrightChainStrings.Error_StoreError_BlockPathAlreadyExistsTemplate]:
    'Block path {PATH} already exists',
  [BrightChainStrings.Error_StoreError_BlockAlreadyExists]:
    'Block already exists',
  [BrightChainStrings.Error_StoreError_NoBlocksProvided]: 'No blocks provided',
  [BrightChainStrings.Error_StoreError_CannotStoreEphemeralData]:
    'Cannot store ephemeral structured data',
  [BrightChainStrings.Error_StoreError_BlockIdMismatchTemplate]:
    'Key {KEY} does not match block ID {BLOCK_ID}',
  [BrightChainStrings.Error_StoreError_BlockSizeMismatch]:
    'Block size does not match store block size',
  [BrightChainStrings.Error_StoreError_InvalidBlockMetadataTemplate]:
    'Invalid block metadata: {ERROR}',
  [BrightChainStrings.Error_StoreError_BlockDirectoryCreationFailedTemplate]:
    'Failed to create block directory: {ERROR}',
  [BrightChainStrings.Error_StoreError_BlockDeletionFailedTemplate]:
    'Failed to delete block: {ERROR}',
  [BrightChainStrings.Error_StoreError_NotImplemented]:
    'Operation not implemented',
  [BrightChainStrings.Error_StoreError_InsufficientRandomBlocksTemplate]:
    'Insufficient random blocks available: requested {REQUESTED}, available {AVAILABLE}',

  // NOTE: Secure storage errors moved to EciesStringKey in @digitaldefiance/ecies-lib

  // NOTE: Symmetric errors moved to SuiteCoreStringKey in @digitaldefiance/suite-core-lib

  // Tuple Error
  [BrightChainStrings.Error_TupleError_InvalidTupleSize]: 'Invalid tuple size',
  [BrightChainStrings.Error_TupleError_BlockSizeMismatch]:
    'All blocks in tuple must have the same size',
  [BrightChainStrings.Error_TupleError_NoBlocksToXor]: 'No blocks to XOR',
  [BrightChainStrings.Error_TupleError_InvalidBlockCount]:
    'Invalid number of blocks for tuple',
  [BrightChainStrings.Error_TupleError_InvalidBlockType]: 'Invalid block type',
  [BrightChainStrings.Error_TupleError_InvalidSourceLength]:
    'Source length must be positive',
  [BrightChainStrings.Error_TupleError_RandomBlockGenerationFailed]:
    'Failed to generate random block',
  [BrightChainStrings.Error_TupleError_WhiteningBlockGenerationFailed]:
    'Failed to generate whitening block',
  [BrightChainStrings.Error_TupleError_MissingParameters]:
    'All parameters are required',
  [BrightChainStrings.Error_TupleError_XorOperationFailedTemplate]:
    'Failed to XOR blocks: {ERROR}',
  [BrightChainStrings.Error_TupleError_DataStreamProcessingFailedTemplate]:
    'Failed to process data stream: {ERROR}',
  [BrightChainStrings.Error_TupleError_EncryptedDataStreamProcessingFailedTemplate]:
    'Failed to process encrypted data stream: {ERROR}',

  // Sealing Error
  [BrightChainStrings.Error_SealingError_InvalidBitRange]:
    'Bits must be between 3 and 20',
  [BrightChainStrings.Error_SealingError_InvalidMemberArray]:
    'amongstMembers must be an array of Member',
  [BrightChainStrings.Error_SealingError_NotEnoughMembersToUnlock]:
    'Not enough members to unlock the document',
  [BrightChainStrings.Error_SealingError_TooManyMembersToUnlock]:
    'Too many members to unlock the document',
  [BrightChainStrings.Error_SealingError_MissingPrivateKeys]:
    'Not all members have private keys loaded',
  [BrightChainStrings.Error_SealingError_EncryptedShareNotFound]:
    'Encrypted share not found',
  [BrightChainStrings.Error_SealingError_MemberNotFound]: 'Member not found',
  [BrightChainStrings.Error_SealingError_FailedToSealTemplate]:
    'Failed to seal document: {ERROR}',

  // CBL Error
  [BrightChainStrings.Error_CblError_CblRequired]: 'CBL is required',
  [BrightChainStrings.Error_CblError_WhitenedBlockFunctionRequired]:
    'getWhitenedBlock function is required',
  [BrightChainStrings.Error_CblError_FailedToLoadBlock]: 'Failed to load block',
  [BrightChainStrings.Error_CblError_ExpectedEncryptedDataBlock]:
    'Expected encrypted data block',
  [BrightChainStrings.Error_CblError_ExpectedOwnedDataBlock]:
    'Expected owned data block',
  [BrightChainStrings.Error_CblError_InvalidStructure]: 'Invalid CBL structure',
  [BrightChainStrings.Error_CblError_CreatorUndefined]:
    'Creator cannot be undefined',
  [BrightChainStrings.Error_CblError_BlockNotReadable]: 'Block cannot be read',
  [BrightChainStrings.Error_CblError_CreatorRequiredForSignature]:
    'Creator is required for signature validation',
  [BrightChainStrings.Error_CblError_InvalidCreatorId]: 'Invalid creator ID',
  [BrightChainStrings.Error_CblError_FileNameRequired]: 'File name is required',
  [BrightChainStrings.Error_CblError_FileNameEmpty]:
    'File name cannot be empty',
  [BrightChainStrings.Error_CblError_FileNameWhitespace]:
    'File name cannot start or end with spaces',
  [BrightChainStrings.Error_CblError_FileNameInvalidChar]:
    'File name contains invalid character',
  [BrightChainStrings.Error_CblError_FileNameControlChars]:
    'File name contains control characters',
  [BrightChainStrings.Error_CblError_FileNamePathTraversal]:
    'File name cannot contain path traversal',
  [BrightChainStrings.Error_CblError_MimeTypeRequired]: 'MIME type is required',
  [BrightChainStrings.Error_CblError_MimeTypeEmpty]:
    'MIME type cannot be empty',
  [BrightChainStrings.Error_CblError_MimeTypeWhitespace]:
    'MIME type cannot start or end with spaces',
  [BrightChainStrings.Error_CblError_MimeTypeLowercase]:
    'MIME type must be lowercase',
  [BrightChainStrings.Error_CblError_MimeTypeInvalidFormat]:
    'Invalid MIME type format',
  [BrightChainStrings.Error_CblError_InvalidBlockSize]: 'Invalid block size',
  [BrightChainStrings.Error_CblError_MetadataSizeExceeded]:
    'Metadata size exceeds maximum allowed size',
  [BrightChainStrings.Error_CblError_MetadataSizeNegative]:
    'Total metadata size cannot be negative',
  [BrightChainStrings.Error_CblError_InvalidMetadataBuffer]:
    'Invalid metadata buffer',
  [BrightChainStrings.Error_CblError_CreationFailedTemplate]:
    'Failed to create CBL block {ERROR}',
  [BrightChainStrings.Error_CblError_InsufficientCapacityTemplate]:
    'Block size ({BLOCK_SIZE}) is too small to hold CBL data ({DATA_SIZE})',
  [BrightChainStrings.Error_CblError_NotExtendedCbl]: 'Not an extended CBL',
  [BrightChainStrings.Error_CblError_InvalidSignature]: 'Invalid CBL signature',
  [BrightChainStrings.Error_CblError_CreatorIdMismatch]: 'Creator ID mismatch',
  [BrightChainStrings.Error_CblError_FileSizeTooLarge]: 'File size too large',
  [BrightChainStrings.Error_CblError_FileSizeTooLargeForNode]:
    'File size above the maximum allowable for the current node',
  [BrightChainStrings.Error_CblError_InvalidTupleSize]: 'Invalid tuple size',
  [BrightChainStrings.Error_CblError_FileNameTooLong]: 'File name too long',
  [BrightChainStrings.Error_CblError_MimeTypeTooLong]: 'MIME type too long',
  [BrightChainStrings.Error_CblError_AddressCountExceedsCapacity]:
    'Address count exceeds block capacity',
  [BrightChainStrings.Error_CblError_CblEncrypted]:
    'CBL is encrypted. Decrypt before use.',
  [BrightChainStrings.Error_CblError_UserRequiredForDecryption]:
    'User is required for decryption',
  [BrightChainStrings.Error_CblError_NotASuperCbl]: 'Not a super CBL',
  [BrightChainStrings.Error_CblError_FailedToExtractCreatorId]:
    'Failed to extract creator ID bytes from CBL header',
  [BrightChainStrings.Error_CblError_FailedToExtractProvidedCreatorId]:
    'Failed to extract member ID bytes from provided creator',

  // Stream Error
  [BrightChainStrings.Error_StreamError_BlockSizeRequired]:
    'Block size is required',
  [BrightChainStrings.Error_StreamError_WhitenedBlockSourceRequired]:
    'Whitened block source is required',
  [BrightChainStrings.Error_StreamError_RandomBlockSourceRequired]:
    'Random block source is required',
  [BrightChainStrings.Error_StreamError_InputMustBeBuffer]:
    'Input must be a buffer',
  [BrightChainStrings.Error_StreamError_FailedToGetRandomBlock]:
    'Failed to get random block',
  [BrightChainStrings.Error_StreamError_FailedToGetWhiteningBlock]:
    'Failed to get whitening/random block',
  [BrightChainStrings.Error_StreamError_IncompleteEncryptedBlock]:
    'Incomplete encrypted block',

  [BrightChainStrings.Error_SessionID_Invalid]: 'Invalid session ID.',
  [BrightChainStrings.Error_TupleCount_InvalidTemplate]:
    'Invalid tuple count ({TUPLE_COUNT}), must be between {TUPLE_MIN_SIZE} and {TUPLE_MAX_SIZE}',

  // NOTE: Most Member errors moved to EciesStringKey in @digitaldefiance/ecies-lib
  // BrightChain-specific member errors remain (voting-related, blocks-related)
  [BrightChainStrings.Error_MemberError_InsufficientRandomBlocks]:
    'Insufficient random blocks.',
  [BrightChainStrings.Error_MemberError_FailedToCreateMemberBlocks]:
    'Failed to create member blocks.',
  [BrightChainStrings.Error_MemberError_InvalidMemberBlocks]:
    'Invalid member blocks.',
  [BrightChainStrings.Error_MemberError_PrivateKeyRequiredToDeriveVotingKeyPair]:
    'Private key required to derive voting key pair.',
  [BrightChainStrings.Error_MemoryTupleError_InvalidTupleSizeTemplate]: `Tuple must have {TUPLE_SIZE} blocks`,

  // Multi Encrypted Error
  [BrightChainStrings.Error_MultiEncryptedError_DataTooShort]:
    'Data too short to contain encryption header',
  [BrightChainStrings.Error_MultiEncryptedError_DataLengthExceedsCapacity]:
    'Data length exceeds block capacity',
  [BrightChainStrings.Error_MultiEncryptedError_CreatorMustBeMember]:
    'Creator must be a Member',
  [BrightChainStrings.Error_MultiEncryptedError_BlockNotReadable]:
    'Block cannot be read',
  [BrightChainStrings.Error_MultiEncryptedError_InvalidEphemeralPublicKeyLength]:
    'Invalid ephemeral public key length',
  [BrightChainStrings.Error_MultiEncryptedError_InvalidIVLength]:
    'Invalid IV length',
  [BrightChainStrings.Error_MultiEncryptedError_InvalidAuthTagLength]:
    'Invalid auth tag length',
  [BrightChainStrings.Error_MultiEncryptedError_ChecksumMismatch]:
    'Checksum mismatch',
  [BrightChainStrings.Error_MultiEncryptedError_RecipientMismatch]:
    'Recipient list does not match header recipient count',
  [BrightChainStrings.Error_MultiEncryptedError_RecipientsAlreadyLoaded]:
    'Recipients already loaded',

  // Whitened Error
  [BrightChainStrings.Error_WhitenedError_BlockNotReadable]:
    'Block cannot be read',
  [BrightChainStrings.Error_WhitenedError_BlockSizeMismatch]:
    'Block sizes must match',
  [BrightChainStrings.Error_WhitenedError_DataLengthMismatch]:
    'Data and random data lengths must match',
  [BrightChainStrings.Error_WhitenedError_InvalidBlockSize]:
    'Invalid block size',

  // Handle Tuple Error
  [BrightChainStrings.Error_HandleTupleError_InvalidTupleSizeTemplate]:
    'Invalid tuple size ({TUPLE_SIZE})',
  [BrightChainStrings.Error_HandleTupleError_BlockSizeMismatch]:
    'All blocks in tuple must have the same size',
  [BrightChainStrings.Error_HandleTupleError_NoBlocksToXor]: 'No blocks to XOR',
  [BrightChainStrings.Error_HandleTupleError_BlockSizesMustMatch]:
    'Block sizes must match',

  // Owned Data Error
  [BrightChainStrings.Error_BlockError_CreatorRequired]: 'Creator is required',
  [BrightChainStrings.Error_BlockError_DataRequired]: 'Data is required',
  [BrightChainStrings.Error_BlockError_DataLengthExceedsCapacity]:
    'Data length exceeds block capacity',
  [BrightChainStrings.Error_BlockError_ActualDataLengthNegative]:
    'Actual data length must be positive',
  [BrightChainStrings.Error_BlockError_ActualDataLengthExceedsDataLength]:
    'Actual data length cannot exceed data length',
  [BrightChainStrings.Error_BlockError_CreatorRequiredForEncryption]:
    'Creator is required for encryption',
  [BrightChainStrings.Error_BlockError_UnexpectedEncryptedBlockType]:
    'Unexpected encrypted block type',
  [BrightChainStrings.Error_BlockError_CannotEncrypt]:
    'Block cannot be encrypted',
  [BrightChainStrings.Error_BlockError_CannotDecrypt]:
    'Block cannot be decrypted',
  [BrightChainStrings.Error_BlockError_CreatorPrivateKeyRequired]:
    'Creator private key is required',
  [BrightChainStrings.Error_BlockError_InvalidMultiEncryptionRecipientCount]:
    'Invalid multi-encryption recipient count',
  [BrightChainStrings.Error_BlockError_InvalidNewBlockType]:
    'Invalid new block type',
  [BrightChainStrings.Error_BlockError_UnexpectedEphemeralBlockType]:
    'Unexpected ephemeral block type',
  [BrightChainStrings.Error_BlockError_RecipientRequired]: 'Recipient required',
  [BrightChainStrings.Error_BlockError_RecipientKeyRequired]:
    'Recipient private key required',
  [BrightChainStrings.Error_BlockError_DataLengthMustMatchBlockSize]:
    'Data length must match block size',

  // Memory Tuple Error
  [BrightChainStrings.Error_MemoryTupleError_BlockSizeMismatch]:
    'All blocks in tuple must have the same size',
  [BrightChainStrings.Error_MemoryTupleError_NoBlocksToXor]: 'No blocks to XOR',
  [BrightChainStrings.Error_MemoryTupleError_InvalidBlockCount]:
    'Invalid number of blocks for tuple',
  [BrightChainStrings.Error_MemoryTupleError_ExpectedBlockIdsTemplate]: `Expected {TUPLE_SIZE} block IDs`,
  [BrightChainStrings.Error_MemoryTupleError_ExpectedBlocksTemplate]: `Expected {TUPLE_SIZE} blocks`,

  [BrightChainStrings.Error_Hydration_FailedToHydrateTemplate]:
    'Failed to hydrate: {ERROR}',
  [BrightChainStrings.Error_Serialization_FailedToSerializeTemplate]:
    'Failed to serialize: {ERROR}',
  [BrightChainStrings.Error_Checksum_Invalid]: 'Invalid checksum.',
  [BrightChainStrings.Error_Creator_Invalid]: 'Invalid creator.',
  [BrightChainStrings.Error_ID_InvalidFormat]: 'Invalid ID format.',
  [BrightChainStrings.Error_References_Invalid]: 'Invalid references.',
  [BrightChainStrings.Error_Signature_Invalid]: 'Invalid signature.',
  [BrightChainStrings.Error_Metadata_Mismatch]: 'Metadata mismatch.',
  [BrightChainStrings.Error_Token_Expired]: 'Token expired.',
  [BrightChainStrings.Error_Token_Invalid]: 'Token invalid.',
  [BrightChainStrings.Error_Unexpected_Error]: 'An unexpected error occurred.',
  [BrightChainStrings.Error_User_NotFound]: 'User not found.',
  [BrightChainStrings.Error_Validation_Error]: 'Validation error.',
  // NOTE: UI strings and common errors moved to SuiteCoreStringKey in @digitaldefiance/suite-core-lib
  [BrightChainStrings.ForgotPassword_Title]: 'Forgot Password',
  [BrightChainStrings.Register_Button]: 'Register',
  [BrightChainStrings.Register_Error]: 'An error occurred during registration.',
  [BrightChainStrings.Register_Success]: 'Registration successful.',
  [BrightChainStrings.Error_Capacity_Insufficient]: 'Insufficient capacity.',
  [BrightChainStrings.Error_Implementation_NotImplemented]: 'Not implemented.',

  // Block Sizes
  [BrightChainStrings.BlockSize_Unknown]: 'Unknown',
  [BrightChainStrings.BlockSize_Message]: 'Message',
  [BrightChainStrings.BlockSize_Tiny]: 'Tiny',
  [BrightChainStrings.BlockSize_Small]: 'Small',
  [BrightChainStrings.BlockSize_Medium]: 'Medium',
  [BrightChainStrings.BlockSize_Large]: 'Large',
  [BrightChainStrings.BlockSize_Huge]: 'Huge',

  // Document Error
  [BrightChainStrings.Error_DocumentError_InvalidValueTemplate]:
    'Invalid value for {KEY}',
  [BrightChainStrings.Error_DocumentError_FieldRequiredTemplate]:
    'Field {KEY} is required.',
  [BrightChainStrings.Error_DocumentError_AlreadyInitialized]:
    'Document subsystem is already initialized',
  [BrightChainStrings.Error_DocumentError_Uninitialized]:
    'Document subsystem is not initialized',

  // XOR Service Errors
  [BrightChainStrings.Error_Xor_LengthMismatchTemplate]:
    'XOR requires equal-length arrays: a.length={A_LENGTH}, b.length={B_LENGTH}',
  [BrightChainStrings.Error_Xor_NoArraysProvided]:
    'At least one array must be provided for XOR',
  [BrightChainStrings.Error_Xor_ArrayLengthMismatchTemplate]:
    'All arrays must have the same length. Expected: {EXPECTED_LENGTH}, got: {ACTUAL_LENGTH} at index {INDEX}',
  [BrightChainStrings.Error_Xor_CryptoApiNotAvailable]:
    'Crypto API is not available in this environment',

  // Tuple Storage Service Errors
  [BrightChainStrings.Error_TupleStorage_DataExceedsBlockSizeTemplate]:
    'Data size ({DATA_SIZE}) exceeds block size ({BLOCK_SIZE})',
  [BrightChainStrings.Error_TupleStorage_InvalidMagnetProtocol]:
    'Invalid magnet protocol. Expected "magnet:"',
  [BrightChainStrings.Error_TupleStorage_InvalidMagnetType]:
    'Invalid magnet type. Expected "brightchain"',
  [BrightChainStrings.Error_TupleStorage_MissingMagnetParameters]:
    'Missing required magnet parameters',

  // Location Record Errors
  [BrightChainStrings.Error_LocationRecord_NodeIdRequired]:
    'Node ID is required',
  [BrightChainStrings.Error_LocationRecord_LastSeenRequired]:
    'Last seen timestamp is required',
  [BrightChainStrings.Error_LocationRecord_IsAuthoritativeRequired]:
    'isAuthoritative flag is required',
  [BrightChainStrings.Error_LocationRecord_InvalidLastSeenDate]:
    'Invalid last seen date',
  [BrightChainStrings.Error_LocationRecord_InvalidLatencyMs]:
    'Latency must be a non-negative number',

  // Metadata Errors
  [BrightChainStrings.Error_Metadata_BlockIdRequired]: 'Block ID is required',
  [BrightChainStrings.Error_Metadata_CreatedAtRequired]:
    'Created at timestamp is required',
  [BrightChainStrings.Error_Metadata_LastAccessedAtRequired]:
    'Last accessed at timestamp is required',
  [BrightChainStrings.Error_Metadata_LocationUpdatedAtRequired]:
    'Location updated at timestamp is required',
  [BrightChainStrings.Error_Metadata_InvalidCreatedAtDate]:
    'Invalid created at date',
  [BrightChainStrings.Error_Metadata_InvalidLastAccessedAtDate]:
    'Invalid last accessed at date',
  [BrightChainStrings.Error_Metadata_InvalidLocationUpdatedAtDate]:
    'Invalid location updated at date',
  [BrightChainStrings.Error_Metadata_InvalidExpiresAtDate]:
    'Invalid expires at date',
  [BrightChainStrings.Error_Metadata_InvalidAvailabilityStateTemplate]:
    'Invalid availability state: {STATE}',
  [BrightChainStrings.Error_Metadata_LocationRecordsMustBeArray]:
    'Location records must be an array',
  [BrightChainStrings.Error_Metadata_InvalidLocationRecordTemplate]:
    'Invalid location record at index {INDEX}',
  [BrightChainStrings.Error_Metadata_InvalidAccessCount]:
    'Access count must be a non-negative number',
  [BrightChainStrings.Error_Metadata_InvalidTargetReplicationFactor]:
    'Target replication factor must be a positive number',
  [BrightChainStrings.Error_Metadata_InvalidSize]:
    'Size must be a non-negative number',
  [BrightChainStrings.Error_Metadata_ParityBlockIdsMustBeArray]:
    'Parity block IDs must be an array',
  [BrightChainStrings.Error_Metadata_ReplicaNodeIdsMustBeArray]:
    'Replica node IDs must be an array',

  // Service Provider Errors
  [BrightChainStrings.Error_ServiceProvider_UseSingletonInstance]:
    'Use ServiceProvider.getInstance() instead of creating a new instance',
  [BrightChainStrings.Error_ServiceProvider_NotInitialized]:
    'ServiceProvider has not been initialized',
  [BrightChainStrings.Error_ServiceLocator_NotSet]:
    'ServiceLocator has not been set',

  // Block Service Errors (additional)
  [BrightChainStrings.Error_BlockService_CannotEncrypt]: 'Cannot encrypt block',
  [BrightChainStrings.Error_BlockService_BlocksArrayEmpty]:
    'Blocks array must not be empty',
  [BrightChainStrings.Error_BlockService_BlockSizesMustMatch]:
    'All blocks must have the same block size',

  // Message Router Errors
  [BrightChainStrings.Error_MessageRouter_MessageNotFoundTemplate]:
    'Message not found: {MESSAGE_ID}',

  // Browser Config Errors
  [BrightChainStrings.Error_BrowserConfig_NotImplementedTemplate]:
    'Method {METHOD} is not implemented in browser environment',

  // Debug Errors
  [BrightChainStrings.Error_Debug_UnsupportedFormat]:
    'Unsupported format for debug output',

  // Secure Heap Storage Errors
  [BrightChainStrings.Error_SecureHeap_KeyNotFound]:
    'Key not found in secure heap storage',

  // I18n Errors
  [BrightChainStrings.Error_I18n_KeyConflictObjectTemplate]:
    'Key conflict detected: {KEY} already exists in {OBJECT}',
  [BrightChainStrings.Error_I18n_KeyConflictValueTemplate]:
    'Key conflict detected: {KEY} has conflicting value {VALUE}',
  [BrightChainStrings.Error_I18n_StringsNotFoundTemplate]:
    'Strings not found for language: {LANGUAGE}',

  // Document Errors (additional)
  [BrightChainStrings.Error_Document_CreatorRequiredForSaving]:
    'Creator is required for saving document',
  [BrightChainStrings.Error_Document_CreatorRequiredForEncrypting]:
    'Creator is required for encrypting document',
  [BrightChainStrings.Error_Document_NoEncryptedData]:
    'No encrypted data available',
  [BrightChainStrings.Error_Document_FieldShouldBeArrayTemplate]:
    'Field {FIELD} should be an array',
  [BrightChainStrings.Error_Document_InvalidArrayValueTemplate]:
    'Invalid array value at index {INDEX} in field {FIELD}',
  [BrightChainStrings.Error_Document_FieldRequiredTemplate]:
    'Field {FIELD} is required',
  [BrightChainStrings.Error_Document_FieldInvalidTemplate]:
    'Field {FIELD} is invalid',
  [BrightChainStrings.Error_Document_InvalidValueTemplate]:
    'Invalid value for field {FIELD}',
  [BrightChainStrings.Error_MemberDocument_PublicCblIdNotSet]:
    'Public CBL ID has not been set',
  [BrightChainStrings.Error_MemberDocument_PrivateCblIdNotSet]:
    'Private CBL ID has not been set',
  [BrightChainStrings.Error_BaseMemberDocument_PublicCblIdNotSet]:
    'Base member document public CBL ID has not been set',
  [BrightChainStrings.Error_BaseMemberDocument_PrivateCblIdNotSet]:
    'Base member document private CBL ID has not been set',
  [BrightChainStrings.Error_Document_InvalidValueInArrayTemplate]:
    'Invalid value in array for {KEY}',
  [BrightChainStrings.Error_Document_FieldIsRequiredTemplate]:
    'Field {FIELD} is required',
  [BrightChainStrings.Error_Document_FieldIsInvalidTemplate]:
    'Field {FIELD} is invalid',

  // SimpleBrightChain Errors
  [BrightChainStrings.Error_SimpleBrightChain_BlockNotFoundTemplate]:
    'Block not found: {BLOCK_ID}',

  // Currency Code Errors
  [BrightChainStrings.Error_CurrencyCode_Invalid]: 'Invalid currency code',

  // Console Output Warnings
  [BrightChainStrings.Warning_BufferUtils_InvalidBase64String]:
    'Invalid base64 string provided',
  [BrightChainStrings.Warning_Keyring_FailedToLoad]:
    'Failed to load keyring from storage',
  [BrightChainStrings.Warning_I18n_TranslationFailedTemplate]:
    'Translation failed for key {KEY}',

  // Console Output Errors
  [BrightChainStrings.Error_MemberStore_RollbackFailed]:
    'Failed to rollback member store transaction',
  [BrightChainStrings.Error_MemberCblService_CreateMemberCblFailed]:
    'Failed to create member CBL',
  [BrightChainStrings.Error_MemberCblService_ChecksumMismatch]:
    'Block checksum mismatch during integrity verification',
  [BrightChainStrings.Error_MemberCblService_BlockRetrievalFailed]:
    'Failed to retrieve block during integrity verification',
  [BrightChainStrings.Error_MemberCblService_MissingRequiredFields]:
    'Member data missing required fields',
  [BrightChainStrings.Error_DeliveryTimeout_HandleTimeoutFailedTemplate]:
    'Failed to handle delivery timeout: {ERROR}',

  // Validator Errors
  [BrightChainStrings.Error_Validator_InvalidBlockSizeTemplate]:
    'Invalid block size: {BLOCK_SIZE}. Valid sizes are: {BLOCK_SIZES}',
  [BrightChainStrings.Error_Validator_InvalidBlockTypeTemplate]:
    'Invalid block type: {BLOCK_TYPE}. Valid types are: {BLOCK_TYPES}',
  [BrightChainStrings.Error_Validator_InvalidEncryptionTypeTemplate]:
    'Invalid encryption type: {ENCRYPTION_TYPE}. Valid types are: {ENCRYPTION_TYPES}',
  [BrightChainStrings.Error_Validator_RecipientCountMustBeAtLeastOne]:
    'Recipient count must be at least 1 for multi-recipient encryption',
  [BrightChainStrings.Error_Validator_RecipientCountMaximumTemplate]:
    'Recipient count cannot exceed {MAXIMUM}',
  [BrightChainStrings.Error_Validator_FieldRequiredTemplate]:
    '{FIELD} is required',
  [BrightChainStrings.Error_Validator_FieldCannotBeEmptyTemplate]:
    '{FIELD} cannot be empty',

  // Miscellaneous Block Errors
  [BrightChainStrings.Error_BlockError_BlockSizesMustMatch]:
    'Block sizes must match',
  [BrightChainStrings.Error_BlockError_DataCannotBeNullOrUndefined]:
    'Data cannot be null or undefined',
  [BrightChainStrings.Error_BlockError_DataLengthExceedsBlockSizeTemplate]:
    'Data length ({LENGTH}) exceeds block size ({BLOCK_SIZE})',

  // CPU Errors
  [BrightChainStrings.Error_CPU_DuplicateOpcodeErrorTemplate]:
    'Duplicate opcode 0x{OPCODE} in instruction set {INSTRUCTION_SET}',
  [BrightChainStrings.Error_CPU_NotImplementedTemplate]:
    '{INSTRUCTION} is not implemented',
  [BrightChainStrings.Error_CPU_InvalidReadSizeTemplate]:
    'Invalid read size: {SIZE}',
  [BrightChainStrings.Error_CPU_StackOverflow]: 'Stack overflow',
  [BrightChainStrings.Error_CPU_StackUnderflow]: 'Stack underflow',

  // Member CBL Errors
  [BrightChainStrings.Error_MemberCBL_PublicCBLIdNotSet]:
    'Public CBL ID not set',
  [BrightChainStrings.Error_MemberCBL_PrivateCBLIdNotSet]:
    'Private CBL ID not set',

  // Member Document Errors
  [BrightChainStrings.Error_MemberDocument_Hint]:
    'Use MemberDocument.create() instead of new MemberDocument()',
  [BrightChainStrings.Error_MemberDocument_CBLNotGenerated]:
    'CBLs have not been generated. Call generateCBLs() before calling toMember()',

  // Member Profile Document Errors
  [BrightChainStrings.Error_MemberProfileDocument_Hint]:
    'Use MemberProfileDocument.create() instead of new MemberProfileDocument()',

  // Quorum Document Errors
  [BrightChainStrings.Error_QuorumDocument_CreatorMustBeSetBeforeSaving]:
    'Creator must be set before saving',
  [BrightChainStrings.Error_QuorumDocument_CreatorMustBeSetBeforeEncrypting]:
    'Creator must be set before encrypting',
  [BrightChainStrings.Error_QuorumDocument_DocumentHasNoEncryptedData]:
    'Document has no encrypted data',
  [BrightChainStrings.Error_QuorumDocument_InvalidEncryptedDataFormat]:
    'Invalid encrypted data format',
  [BrightChainStrings.Error_QuorumDocument_InvalidMemberIdsFormat]:
    'Invalid member IDs format',
  [BrightChainStrings.Error_QuorumDocument_InvalidSignatureFormat]:
    'Invalid signature format',
  [BrightChainStrings.Error_QuorumDocument_InvalidCreatorIdFormat]:
    'Invalid creator ID format',
  [BrightChainStrings.Error_QuorumDocument_InvalidChecksumFormat]:
    'Invalid checksum format',

  // Quorum DataRecord
  [BrightChainStrings.QuorumDataRecord_MustShareWithAtLeastTwoMembers]:
    'Must share with at least 2 members',
  [BrightChainStrings.QuorumDataRecord_SharesRequiredExceedsMembers]:
    'Shares required exceeds number of members',
  [BrightChainStrings.QuorumDataRecord_SharesRequiredMustBeAtLeastTwo]:
    'Shares required must be at least 2',
  [BrightChainStrings.QuorumDataRecord_InvalidChecksum]: 'Invalid checksum',
  [BrightChainStrings.QuorumDataRecord_InvalidSignature]: 'Invalid signature',

  // Block Logger
  [BrightChainStrings.BlockLogger_Redacted]: 'REDACTED',

  // Member Schema Errors
  [BrightChainStrings.Error_MemberSchema_InvalidIdFormat]: 'Invalid ID format',
  [BrightChainStrings.Error_MemberSchema_InvalidPublicKeyFormat]:
    'Invalid public key format',
  [BrightChainStrings.Error_MemberSchema_InvalidVotingPublicKeyFormat]:
    'Invalid voting public key format',
  [BrightChainStrings.Error_MemberSchema_InvalidEmailFormat]:
    'Invalid email format',
  [BrightChainStrings.Error_MemberSchema_InvalidRecoveryDataFormat]:
    'Invalid recovery data format',
  [BrightChainStrings.Error_MemberSchema_InvalidTrustedPeersFormat]:
    'Invalid trusted peers format',
  [BrightChainStrings.Error_MemberSchema_InvalidBlockedPeersFormat]:
    'Invalid blocked peers format',
  [BrightChainStrings.Error_MemberSchema_InvalidActivityLogFormat]:
    'Invalid activity log format',

  // Message Metadata Schema Errors
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidRecipientsFormat]:
    'Invalid recipients format',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidPriorityFormat]:
    'Invalid priority format',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidDeliveryStatusFormat]:
    'Invalid delivery status format',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidAcknowledgementsFormat]:
    'Invalid acknowledgments format',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidEncryptionSchemeFormat]:
    'Invalid encryption scheme format',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidCBLBlockIDsFormat]:
    'Invalid CBL block IDs format',

  // Security
  [BrightChainStrings.Security_DOS_InputSizeExceedsLimitErrorTemplate]:
    'Input size {SIZE} exceeds limit {MAX_SIZE} for {OPERATION}',
  [BrightChainStrings.Security_DOS_OperationExceededTimeLimitErrorTemplate]:
    'Operation {OPERATION} exceeded timeout {MAX_TIME}ms',
  [BrightChainStrings.Security_RateLimiter_RateLimitExceededErrorTemplate]:
    'Rate limit exceeded for {OPERATION}',
  [BrightChainStrings.Security_AuditLogger_SignatureValidationResultTemplate]:
    'Signature validation {RESULT}',
  [BrightChainStrings.Security_AuditLogger_Failure]: 'Failure',
  [BrightChainStrings.Security_AuditLogger_Success]: 'Success',
  [BrightChainStrings.Security_AuditLogger_BlockCreated]: 'Block created',
  [BrightChainStrings.Security_AuditLogger_EncryptionPerformed]:
    'Encryption performed',
  [BrightChainStrings.Security_AuditLogger_DecryptionResultTemplate]:
    'Decryption {RESULT}',
  [BrightChainStrings.Security_AuditLogger_AccessDeniedTemplate]:
    'Access denied to {RESOURCE}',
  [BrightChainStrings.Security_AuditLogger_Security]: 'Security',

  // Delivery Timeout
  [BrightChainStrings.DeliveryTimeout_FailedToHandleTimeoutTemplate]:
    'Failed to handle timeout for {MESSAGE_ID}:{RECIPIENT_ID}',

  // Message CBL Service
  [BrightChainStrings.MessageCBLService_MessageSizeExceedsMaximumTemplate]:
    'Message size {SIZE} exceeds maximum {MAX_SIZE}',
  [BrightChainStrings.MessageCBLService_FailedToCreateMessageAfterRetries]:
    'Failed to create message after retries',
  [BrightChainStrings.MessageCBLService_FailedToRetrieveMessageTemplate]:
    'Failed to retrieve message {MESSAGE_ID}',
  [BrightChainStrings.MessageCBLService_MessageTypeIsRequired]:
    'Message type is required',
  [BrightChainStrings.MessageCBLService_SenderIDIsRequired]:
    'Sender ID is required',
  [BrightChainStrings.MessageCBLService_RecipientCountExceedsMaximumTemplate]:
    'Recipient count {COUNT} exceeds maximum {MAXIMUM}',

  // Message Encryption Service
  [BrightChainStrings.MessageEncryptionService_NoRecipientPublicKeysProvided]:
    'No recipient public keys provided',
  [BrightChainStrings.MessageEncryptionService_FailedToEncryptTemplate]:
    'Failed to encrypt for recipient {RECIPIENT_ID}: {ERROR}',
  [BrightChainStrings.MessageEncryptionService_BroadcastEncryptionFailedTemplate]:
    'Broadcast encryption failed: {TEMPLATE}',
  [BrightChainStrings.MessageEncryptionService_DecryptionFailedTemplate]:
    'Decryption failed: {ERROR}',
  [BrightChainStrings.MessageEncryptionService_KeyDecryptionFailedTemplate]:
    'Key decryption failed: {ERROR}',

  // Message Logger
  [BrightChainStrings.MessageLogger_MessageCreated]: 'Message created',
  [BrightChainStrings.MessageLogger_RoutingDecision]: 'Routing decision',
  [BrightChainStrings.MessageLogger_DeliveryFailure]: 'Delivery failure',
  [BrightChainStrings.MessageLogger_EncryptionFailure]: 'Encryption failure',
  [BrightChainStrings.MessageLogger_SlowQueryDetected]: 'Slow query detected',

  // Message Router
  [BrightChainStrings.MessageRouter_RoutingTimeout]: 'Routing timeout',
  [BrightChainStrings.MessageRouter_FailedToRouteToAnyRecipient]:
    'Failed to route message to any recipient',
  [BrightChainStrings.MessageRouter_ForwardingLoopDetected]:
    'Forwarding loop detected',

  // Block Format Service
  [BrightChainStrings.BlockFormatService_DataTooShort]:
    'Data too short for structured block header (minimum 4 bytes required)',
  [BrightChainStrings.BlockFormatService_InvalidStructuredBlockFormatTemplate]:
    'Invalid structured block type: 0x{TYPE}',
  [BrightChainStrings.BlockFormatService_CannotDetermineHeaderSize]:
    'Cannot determine header size - data may be truncated',
  [BrightChainStrings.BlockFormatService_Crc8MismatchTemplate]:
    'CRC8 mismatch - header may be corrupted (expected 0x{EXPECTED}, got 0x{CHECKSUM})',
  [BrightChainStrings.BlockFormatService_DataAppearsEncrypted]:
    'Data appears to be ECIES encrypted - decrypt before parsing',
  [BrightChainStrings.BlockFormatService_UnknownBlockFormat]:
    'Unknown block format - missing 0xBC magic prefix (may be raw data)',

  // CBL Service
  [BrightChainStrings.CBLService_NotAMessageCBL]: 'Not a message CBL',
  [BrightChainStrings.CBLService_CreatorIDByteLengthMismatchTemplate]:
    'Creator ID byte length mismatch: got {LENGTH}, expected {EXPECTED}',
  [BrightChainStrings.CBLService_CreatorIDProviderReturnedBytesLengthMismatchTemplate]:
    'Creator ID provider returned {LENGTH} bytes, expected {EXPECTED}',
  [BrightChainStrings.CBLService_SignatureLengthMismatchTemplate]:
    'Signature length mismatch: got {LENGTH}, expected {EXPECTED}',
  [BrightChainStrings.CBLService_DataAppearsRaw]:
    'Data appears to be raw data without structured header',
  [BrightChainStrings.CBLService_InvalidBlockFormat]: 'Invalid block format',
  [BrightChainStrings.CBLService_SubCBLCountChecksumMismatchTemplate]:
    'SubCblCount ({COUNT}) does not match subCblChecksums length ({EXPECTED})',
  [BrightChainStrings.CBLService_InvalidDepthTemplate]:
    'Depth must be between 1 and 65535, got {DEPTH}',
  [BrightChainStrings.CBLService_ExpectedSuperCBLTemplate]:
    'Expected SuperCBL (block type 0x03), got block type 0x${TYPE}',

  // Global Service Provider
  [BrightChainStrings.GlobalServiceProvider_NotInitialized]:
    'Service provider not initialized. Call ServiceProvider.getInstance() first.',

  // Block Store Adapter
  [BrightChainStrings.BlockStoreAdapter_DataLengthExceedsBlockSizeTemplate]:
    'Data length ({LENGTH}) exceeds block size ({BLOCK_SIZE})',

  // Memory Block Store
  [BrightChainStrings.MemoryBlockStore_FECServiceUnavailable]:
    'FEC service is not available',
  [BrightChainStrings.MemoryBlockStore_FECServiceUnavailableInThisEnvironment]:
    'FEC service is not available in this environment',
  [BrightChainStrings.MemoryBlockStore_NoParityDataAvailable]:
    'No parity data available for recovery',
  [BrightChainStrings.MemoryBlockStore_BlockMetadataNotFound]:
    'Block metadata not found',
  [BrightChainStrings.MemoryBlockStore_RecoveryFailedInsufficientParityData]:
    'Recovery failed - insufficient parity data',
  [BrightChainStrings.MemoryBlockStore_UnknownRecoveryError]:
    'Unknown recovery error',
  [BrightChainStrings.MemoryBlockStore_CBLDataCannotBeEmpty]:
    'CBL data cannot be empty',
  [BrightChainStrings.MemoryBlockStore_CBLDataTooLargeTemplate]:
    'CBL data too large: padded size ({LENGTH}) exceeds block size ({BLOCK_SIZE}). Use a larger block size or smaller CBL.',
  [BrightChainStrings.MemoryBlockStore_Block1NotFound]:
    'Block 1 not found and recovery failed',
  [BrightChainStrings.MemoryBlockStore_Block2NotFound]:
    'Block 2 not found and recovery failed',
  [BrightChainStrings.MemoryBlockStore_InvalidMagnetURL]:
    'Invalid magnet URL: must start with "magnet:?"',
  [BrightChainStrings.MemoryBlockStore_InvalidMagnetURLXT]:
    'Invalid magnet URL: xt parameter must be "urn:brightchain:cbl"',
  [BrightChainStrings.MemoryBlockStore_InvalidMagnetURLMissingTemplate]:
    'Invalid magnet URL: missing {PARAMETER} parameter',
  [BrightChainStrings.MemoryBlockStore_InvalidMagnetURL_InvalidBlockSize]:
    'Invalid magnet URL: invalid block size',

  // Checksum
  [BrightChainStrings.Checksum_InvalidTemplate]:
    'Checksum must be {EXPECTED} bytes, got {LENGTH} bytes',
  [BrightChainStrings.Checksum_InvalidHexString]:
    'Invalid hex string: contains non-hexadecimal characters',
  [BrightChainStrings.Checksum_InvalidHexStringTemplate]:
    'Invalid hex string length: expected {EXPECTED} characters, got {LENGTH}',

  [BrightChainStrings.Error_XorLengthMismatchTemplate]:
    'XOR requires equal-length arrays{CONTEXT}: a.length={A_LENGTH}, b.length={B_LENGTH}',
  [BrightChainStrings.Error_XorAtLeastOneArrayRequired]:
    'At least one array must be provided for XOR',

  [BrightChainStrings.Error_InvalidUnixTimestampTemplate]:
    'Invalid Unix timestamp: {TIMESTAMP}',
  [BrightChainStrings.Error_InvalidDateStringTemplate]:
    'Invalid date string: "{VALUE}". Expected ISO 8601 format (e.g., "2024-01-23T10:30:00Z") or Unix timestamp.',
  [BrightChainStrings.Error_InvalidDateValueTypeTemplate]:
    'Invalid date value type: {TYPE}. Expected string or number.',
  [BrightChainStrings.Error_InvalidDateObjectTemplate]:
    'Invalid date object: expected Date instance, got {OBJECT_STRING}',
  [BrightChainStrings.Error_InvalidDateNaN]:
    'Invalid date: date object contains NaN timestamp',
  [BrightChainStrings.Error_JsonValidationErrorTemplate]:
    'JSON validation failed for field {FIELD}: {REASON}',
  [BrightChainStrings.Error_JsonValidationError_MustBeNonNull]:
    'must be a non-null object',
  [BrightChainStrings.Error_JsonValidationError_FieldRequired]:
    'field is required',
  [BrightChainStrings.Error_JsonValidationError_MustBeValidBlockSize]:
    'must be a valid BlockSize enum value',
  [BrightChainStrings.Error_JsonValidationError_MustBeValidBlockType]:
    'must be a valid BlockType enum value',
  [BrightChainStrings.Error_JsonValidationError_MustBeValidBlockDataType]:
    'must be a valid BlockDataType enum value',
  [BrightChainStrings.Error_JsonValidationError_MustBeNumber]:
    'must be a number',
  [BrightChainStrings.Error_JsonValidationError_MustBeNonNegative]:
    'must be non-negative',
  [BrightChainStrings.Error_JsonValidationError_MustBeInteger]:
    'must be an integer',
  [BrightChainStrings.Error_JsonValidationError_MustBeISO8601DateStringOrUnixTimestamp]:
    'must be a valid ISO 8601 string or Unix timestamp',
  [BrightChainStrings.Error_JsonValidationError_MustBeString]:
    'must be a string',
  [BrightChainStrings.Error_JsonValidationError_MustNotBeEmpty]:
    'must not be empty',
  [BrightChainStrings.Error_JsonValidationError_JSONParsingFailed]:
    'JSON parsing failed',
  [BrightChainStrings.Error_JsonValidationError_ValidationFailed]:
    'validation failed',

  [BrightChainStrings.XorUtils_BlockSizeMustBePositiveTemplate]:
    'Block size must be positive: {BLOCK_SIZE}',
  [BrightChainStrings.XorUtils_InvalidPaddedDataTemplate]:
    'Invalid padded data: too short ({LENGTH} bytes, need at least {REQUIRED})',
  [BrightChainStrings.XorUtils_InvalidLengthPrefixTemplate]:
    'Invalid length prefix: claims {LENGTH} bytes but only {AVAILABLE} available',

  [BrightChainStrings.BlockPaddingTransform_MustBeArray]:
    'Input must be Uint8Array, TypedArray, or ArrayBuffer',
  [BrightChainStrings.CblStream_UnknownErrorReadingData]:
    'Unknown error reading data',
  [BrightChainStrings.CurrencyCode_InvalidCurrencyCode]:
    'Invalid currency code',
  [BrightChainStrings.EnergyAccount_InsufficientBalanceTemplate]:
    'Insufficient balance: need {AMOUNT}J, have {AVAILABLE_BALANCE}J',
  [BrightChainStrings.Init_BrowserCompatibleConfiguration]:
    'BrightChain browser-compatible configuration with GuidV4Provider',
  [BrightChainStrings.Init_NotInitialized]:
    'BrightChain library not initialized. Call initializeBrightChain() first.',
  [BrightChainStrings.ModInverse_MultiplicativeInverseDoesNotExist]:
    'Modular multiplicative inverse does not exist',
  [BrightChainStrings.PrimeTupleGeneratorStream_UnknownErrorInTransform]:
    'Unknown error in transform',
  [BrightChainStrings.PrimeTupleGeneratorStream_UnknownErrorInMakeTuple]:
    'Unknown error in makeTuple',

  [BrightChainStrings.SimpleBrowserStore_BlockNotFoundTemplate]:
    'Block not found: {ID}',

  [BrightChainStrings.EncryptedBlockCreator_NoCreatorRegisteredTemplate]:
    'No creator registered for block type {TYPE}',
  [BrightChainStrings.TestMember_MemberNotFoundTemplate]:
    'Member {KEY} not found',
};

export default AmericanEnglishStrings;
