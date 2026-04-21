import {
  type BrandedStringKeys,
  BrandedStringKeyValue,
  createI18nStringKeys,
} from '@digitaldefiance/i18n-lib';

export const BrightChainComponentId = 'BrightChain';

// Branded enum for BrightChain string keys
const _brightChainKeys = {
  // NOTE: Admin and i18n error strings moved to @digitaldefiance/suite-core-lib SuiteCoreStringKey
  // Use SuiteCoreStringKey for: Admin_StringNotFoundForLanguageTemplate, Error_NoTranslationsForEnumTemplate,
  // Error_LanguageNotFoundForEnumTemplate, Error_NoTranslationsForEnumLanguageTemplate,
  // Error_UnknownEnumValueForEnumTemplate, Error_LanguageNotFoundInStringsTemplate, Error_Disposed

  Common_Bright: 'Common_Bright',
  Common_Chain: 'Common_Chain',
  Common_Privacy: 'Common_Privacy',
  Common_Participation: 'Common_Participation',
  Common_Power: 'Common_Power',
  Common_PrivacyParticipationPower: 'Common_PrivacyParticipationPower',

  Common_BlockSize: 'Common_BlockSize',
  Common_AtIndexTemplate: 'Common_AtIndexTemplate',

  // Block Access Errors
  Error_BlockAccess_Template: 'Error_BlockAccess_Template',
  Error_BlockAccessError_BlockAlreadyExists:
    'Error_BlockAccessError_BlockAlreadyExists',
  Error_BlockAccessError_BlockIsNotPersistable:
    'Error_BlockAccessError_BlockIsNotPersistable',
  Error_BlockAccessError_BlockIsNotReadable:
    'Error_BlockAccessError_BlockIsNotReadable',
  Error_BlockAccessError_BlockFileNotFoundTemplate:
    'Error_BlockAccessError_BlockFileNotFoundTemplate',
  Error_BlockAccess_CBLCannotBeEncrypted:
    'Error_BlockAccess_CBLCannotBeEncrypted',
  Error_BlockAccessError_CreatorMustBeProvided:
    'Error_BlockAccessError_CreatorMustBeProvided',

  // Block Validation Errors
  Error_BlockValidationError_Template: 'Error_BlockValidationError_Template',
  Error_BlockValidationError_ActualDataLengthUnknown:
    'Error_BlockValidationError_ActualDataLengthUnknown',
  Error_BlockValidationError_AddressCountExceedsCapacity:
    'Error_BlockValidationError_AddressCountExceedsCapacity',
  Error_BlockValidationError_BlockDataNotBuffer:
    'Error_BlockValidationError_BlockDataNotBuffer',
  Error_BlockValidationError_BlockSizeNegative:
    'Error_BlockValidationError_BlockSizeNegative',
  Error_BlockValidationError_CreatorIDMismatch:
    'Error_BlockValidationError_CreatorIDMismatch',
  Error_BlockValidationError_DataBufferIsTruncated:
    'Error_BlockValidationError_DataBufferIsTruncated',
  Error_BlockValidationError_DataCannotBeEmpty:
    'Error_BlockValidationError_DataCannotBeEmpty',
  Error_BlockValidationError_DataLengthExceedsCapacity:
    'Error_BlockValidationError_DataLengthExceedsCapacity',
  Error_BlockValidationError_DataLengthTooShort:
    'Error_BlockValidationError_DataLengthTooShort',
  Error_BlockValidationError_DataLengthTooShortForCBLHeader:
    'Error_BlockValidationError_DataLengthTooShortForCBLHeader',
  Error_BlockValidationError_DataLengthTooShortForEncryptedCBL:
    'Error_BlockValidationError_DataLengthTooShortForEncryptedCBL',
  Error_BlockValidationError_EphemeralBlockOnlySupportsBufferData:
    'Error_BlockValidationError_EphemeralBlockOnlySupportsBufferData',
  Error_BlockValidationError_FutureCreationDate:
    'Error_BlockValidationError_FutureCreationDate',
  Error_BlockValidationError_InvalidAddressLengthTemplate:
    'Error_BlockValidationError_InvalidAddressLengthTemplate',
  Error_BlockValidationError_InvalidAuthTagLength:
    'Error_BlockValidationError_InvalidAuthTagLength',
  Error_BlockValidationError_InvalidBlockTypeTemplate:
    'Error_BlockValidationError_InvalidBlockTypeTemplate',
  Error_BlockValidationError_InvalidCBLAddressCount:
    'Error_BlockValidationError_InvalidCBLAddressCount',
  Error_BlockValidationError_InvalidCBLDataLength:
    'Error_BlockValidationError_InvalidCBLDataLength',
  Error_BlockValidationError_InvalidDateCreated:
    'Error_BlockValidationError_InvalidDateCreated',
  Error_BlockValidationError_InvalidEncryptionHeaderLength:
    'Error_BlockValidationError_InvalidEncryptionHeaderLength',
  Error_BlockValidationError_InvalidEphemeralPublicKeyLength:
    'Error_BlockValidationError_InvalidEphemeralPublicKeyLength',
  Error_BlockValidationError_InvalidIVLength:
    'Error_BlockValidationError_InvalidIVLength',
  Error_BlockValidationError_InvalidSignature:
    'Error_BlockValidationError_InvalidSignature',
  Error_BlockValidationError_InvalidTupleSizeTemplate:
    'Error_BlockValidationError_InvalidTupleSizeTemplate',
  Error_BlockValidationError_MethodMustBeImplementedByDerivedClass:
    'Error_BlockValidationError_MethodMustBeImplementedByDerivedClass',
  Error_BlockValidationError_NoChecksum:
    'Error_BlockValidationError_NoChecksum',
  Error_BlockValidationError_OriginalDataLengthNegative:
    'Error_BlockValidationError_OriginalDataLengthNegative',
  Error_BlockValidationError_InvalidRecipientCount:
    'Error_BlockValidationError_InvalidRecipientCount',
  Error_BlockValidationError_InvalidRecipientIds:
    'Error_BlockValidationError_InvalidRecipientIds',
  Error_BlockValidationError_InvalidRecipientKeys:
    'Error_BlockValidationError_InvalidRecipientKeys',
  Error_BlockValidationError_InvalidEncryptionType:
    'Error_BlockValidationError_InvalidEncryptionType',
  Error_BlockValidationError_InvalidCreator:
    'Error_BlockValidationError_InvalidCreator',
  Error_BlockValidationError_EncryptionRecipientNotFoundInRecipients:
    'Error_BlockValidationError_EncryptionRecipientNotFoundInRecipients',
  Error_BlockValidationError_EncryptionRecipientHasNoPrivateKey:
    'Error_BlockValidationError_EncryptionRecipientHasNoPrivateKey',

  // Buffer Errors
  Error_BufferError_InvalidBufferTypeTemplate:
    'Error_BufferError_InvalidBufferTypeTemplate',

  // Block Handle Errors
  Error_BlockHandle_BlockConstructorMustBeValid:
    'Error_BlockHandle_BlockConstructorMustBeValid',
  Error_BlockHandle_BlockSizeRequired: 'Error_BlockHandle_BlockSizeRequired',
  Error_BlockHandle_DataMustBeUint8Array:
    'Error_BlockHandle_DataMustBeUint8Array',
  Error_BlockHandle_ChecksumMustBeChecksum:
    'Error_BlockHandle_ChecksumMustBeChecksum',

  // Block Handle Tuple Errors
  Error_BlockHandleTuple_FailedToLoadBlockTemplate:
    'Error_BlockHandleTuple_FailedToLoadBlockTemplate',
  Error_BlockHandleTuple_FailedToStoreXorResultTemplate:
    'Error_BlockHandleTuple_FailedToStoreXorResultTemplate',

  // Block Metadata Errors
  Error_BlockMetadata_Template: 'Error_BlockMetadata_Template',
  Error_BlockMetadataError_CreatorIdMismatch:
    'Error_BlockMetadataError_CreatorIdMismatch',
  Error_BlockMetadataError_CreatorRequired:
    'Error_BlockMetadataError_CreatorRequired',
  Error_BlockMetadataError_EncryptorRequired:
    'Error_BlockMetadataError_EncryptorRequired',
  Error_BlockMetadataError_InvalidBlockMetadata:
    'Error_BlockMetadataError_InvalidBlockMetadata',
  Error_BlockMetadataError_InvalidBlockMetadataTemplate:
    'Error_BlockMetadataError_InvalidBlockMetadataTemplate',
  Error_BlockMetadataError_MetadataRequired:
    'Error_BlockMetadataError_MetadataRequired',
  Error_BlockMetadataError_MissingRequiredMetadata:
    'Error_BlockMetadataError_MissingRequiredMetadata',

  // Block Operation Errors
  Error_Block_CannotBeDecrypted: 'Error_Block_CannotBeDecrypted',
  Error_Block_CannotBeEncrypted: 'Error_Block_CannotBeEncrypted',
  Error_BlockCapacity_Template: 'Error_BlockCapacity_Template',

  // Block Capacity Errors
  Error_BlockCapacity_InvalidBlockSize: 'Error_BlockCapacity_InvalidBlockSize',
  Error_BlockCapacity_InvalidBlockType: 'Error_BlockCapacity_InvalidBlockType',
  Error_BlockCapacity_CapacityExceeded: 'Error_BlockCapacity_CapacityExceeded',
  Error_BlockCapacity_InvalidFileName: 'Error_BlockCapacity_InvalidFileName',
  Error_BlockCapacity_InvalidMimetype: 'Error_BlockCapacity_InvalidMimetype',
  Error_BlockCapacity_InvalidRecipientCount:
    'Error_BlockCapacity_InvalidRecipientCount',
  Error_BlockCapacity_InvalidExtendedCblData:
    'Error_BlockCapacity_InvalidExtendedCblData',

  // Block Service Errors
  Error_BlockServiceError_BlockWhitenerCountMismatch:
    'Error_BlockServiceError_BlockWhitenerCountMismatch',
  Error_BlockServiceError_EmptyBlocksArray:
    'Error_BlockServiceError_EmptyBlocksArray',
  Error_BlockServiceError_BlockSizeMismatch:
    'Error_BlockServiceError_BlockSizeMismatch',
  Error_BlockServiceError_NoWhitenersProvided:
    'Error_BlockServiceError_NoWhitenersProvided',
  Error_BlockServiceError_AlreadyInitialized:
    'Error_BlockServiceError_AlreadyInitialized',
  Error_BlockServiceError_Uninitialized:
    'Error_BlockServiceError_Uninitialized',
  Error_BlockServiceError_BlockAlreadyExistsTemplate:
    'Error_BlockServiceError_BlockAlreadyExistsTemplate',
  Error_BlockServiceError_RecipientRequiredForEncryption:
    'Error_BlockServiceError_RecipientRequiredForEncryption',
  Error_BlockServiceError_CannotDetermineBlockSize:
    'Error_BlockServiceError_CannotDetermineBlockSize',
  Error_BlockServiceError_CannotDetermineFileName:
    'Error_BlockServiceError_CannotDetermineFileName',
  Error_BlockServiceError_CannotDetermineFileLength:
    'Error_BlockServiceError_CannotDetermineFileLength',
  Error_BlockServiceError_CannotDetermineMimeType:
    'Error_BlockServiceError_CannotDetermineMimeType',
  Error_BlockServiceError_FilePathNotProvided:
    'Error_BlockServiceError_FilePathNotProvided',
  Error_BlockServiceError_UnableToDetermineBlockSize:
    'Error_BlockServiceError_UnableToDetermineBlockSize',
  Error_BlockServiceError_InvalidBlockData:
    'Error_BlockServiceError_InvalidBlockData',
  Error_BlockServiceError_InvalidBlockType:
    'Error_BlockServiceError_InvalidBlockType',

  // NOTE: Most member error strings moved to @digitaldefiance/ecies-lib EciesStringKey
  // BrightChain-specific member errors (voting-related, blocks-related) remain here
  // NOTE: Error_MemberErrorMissingVotingPrivateKey and Error_MemberErrorMissingVotingPublicKey moved to @digitaldefiance/suite-core-lib SuiteCoreStringKey
  Error_MemberError_InsufficientRandomBlocks:
    'Error_MemberError_InsufficientRandomBlocks',
  Error_MemberError_FailedToCreateMemberBlocks:
    'Error_MemberError_FailedToCreateMemberBlocks',
  Error_MemberError_InvalidMemberBlocks:
    'Error_MemberError_InvalidMemberBlocks',
  Error_MemberError_PrivateKeyRequiredToDeriveVotingKeyPair:
    'Error_MemberError_PrivateKeyRequiredToDeriveVotingKeyPair',

  // Voting Derivation Errors
  Error_VotingDerivationError_FailedToGeneratePrime:
    'Error_VotingDerivationError_FailedToGeneratePrime',
  Error_VotingDerivationError_IdenticalPrimes:
    'Error_VotingDerivationError_IdenticalPrimes',
  Error_VotingDerivationError_KeyPairTooSmallTemplate:
    'Error_VotingDerivationError_KeyPairTooSmallTemplate',
  Error_VotingDerivationError_KeyPairValidationFailed:
    'Error_VotingDerivationError_KeyPairValidationFailed',
  Error_VotingDerivationError_ModularInverseDoesNotExist:
    'Error_VotingDerivationError_ModularInverseDoesNotExist',
  Error_VotingDerivationError_PrivateKeyMustBeBuffer:
    'Error_VotingDerivationError_PrivateKeyMustBeBuffer',
  Error_VotingDerivationError_PublicKeyMustBeBuffer:
    'Error_VotingDerivationError_PublicKeyMustBeBuffer',
  Error_VotingDerivationError_InvalidPublicKeyFormat:
    'Error_VotingDerivationError_InvalidPublicKeyFormat',
  Error_VotingDerivationError_InvalidEcdhKeyPair:
    'Error_VotingDerivationError_InvalidEcdhKeyPair',
  Error_VotingDerivationError_FailedToDeriveVotingKeysTemplate:
    'Error_VotingDerivationError_FailedToDeriveVotingKeysTemplate',

  // Voting Errors
  Error_VotingError_InvalidKeyPairPublicKeyNotIsolated:
    'Error_VotingError_InvalidKeyPairPublicKeyNotIsolated',
  Error_VotingError_InvalidKeyPairPrivateKeyNotIsolated:
    'Error_VotingError_InvalidKeyPairPrivateKeyNotIsolated',
  Error_VotingError_InvalidPublicKeyNotIsolated:
    'Error_VotingError_InvalidPublicKeyNotIsolated',
  Error_VotingError_InvalidPublicKeyBufferTooShort:
    'Error_VotingError_InvalidPublicKeyBufferTooShort',
  Error_VotingError_InvalidPublicKeyBufferWrongMagic:
    'Error_VotingError_InvalidPublicKeyBufferWrongMagic',
  Error_VotingError_UnsupportedPublicKeyVersion:
    'Error_VotingError_UnsupportedPublicKeyVersion',
  Error_VotingError_InvalidPublicKeyBufferIncompleteN:
    'Error_VotingError_InvalidPublicKeyBufferIncompleteN',
  Error_VotingError_InvalidPublicKeyBufferFailedToParseNTemplate:
    'Error_VotingError_InvalidPublicKeyBufferFailedToParseNTemplate',
  Error_VotingError_InvalidPublicKeyIdMismatch:
    'Error_VotingError_InvalidPublicKeyIdMismatch',
  Error_VotingError_ModularInverseDoesNotExist:
    'Error_VotingError_ModularInverseDoesNotExist',
  Error_VotingError_PrivateKeyMustBeBuffer:
    'Error_VotingError_PrivateKeyMustBeBuffer',
  Error_VotingError_PublicKeyMustBeBuffer:
    'Error_VotingError_PublicKeyMustBeBuffer',
  Error_VotingError_InvalidPublicKeyFormat:
    'Error_VotingError_InvalidPublicKeyFormat',
  Error_VotingError_InvalidEcdhKeyPair: 'Error_VotingError_InvalidEcdhKeyPair',
  Error_VotingError_FailedToDeriveVotingKeysTemplate:
    'Error_VotingError_FailedToDeriveVotingKeysTemplate',
  Error_VotingError_FailedToGeneratePrime:
    'Error_VotingError_FailedToGeneratePrime',
  Error_VotingError_IdenticalPrimes: 'Error_VotingError_IdenticalPrimes',
  Error_VotingError_KeyPairTooSmallTemplate:
    'Error_VotingError_KeyPairTooSmallTemplate',
  Error_VotingError_KeyPairValidationFailed:
    'Error_VotingError_KeyPairValidationFailed',
  Error_VotingError_InvalidVotingKey: 'Error_VotingError_InvalidVotingKey',
  Error_VotingError_InvalidKeyPair: 'Error_VotingError_InvalidKeyPair',
  Error_VotingError_InvalidPublicKey: 'Error_VotingError_InvalidPublicKey',
  Error_VotingError_InvalidPrivateKey: 'Error_VotingError_InvalidPrivateKey',
  Error_VotingError_InvalidEncryptedKey:
    'Error_VotingError_InvalidEncryptedKey',
  Error_VotingError_InvalidPrivateKeyBufferTooShort:
    'Error_VotingError_InvalidPrivateKeyBufferTooShort',
  Error_VotingError_InvalidPrivateKeyBufferWrongMagic:
    'Error_VotingError_InvalidPrivateKeyBufferWrongMagic',
  Error_VotingError_UnsupportedPrivateKeyVersion:
    'Error_VotingError_UnsupportedPrivateKeyVersion',
  Error_VotingError_InvalidPrivateKeyBufferIncompleteLambda:
    'Error_VotingError_InvalidPrivateKeyBufferIncompleteLambda',
  Error_VotingError_InvalidPrivateKeyBufferIncompleteMuLength:
    'Error_VotingError_InvalidPrivateKeyBufferIncompleteMuLength',
  Error_VotingError_InvalidPrivateKeyBufferIncompleteMu:
    'Error_VotingError_InvalidPrivateKeyBufferIncompleteMu',
  Error_VotingError_InvalidPrivateKeyBufferFailedToParse:
    'Error_VotingError_InvalidPrivateKeyBufferFailedToParse',
  Error_VotingError_InvalidPrivateKeyBufferFailedToCreate:
    'Error_VotingError_InvalidPrivateKeyBufferFailedToCreate',

  // NOTE: FEC error strings moved to @digitaldefiance/suite-core-lib SuiteCoreStringKey
  // Use SuiteCoreStringKey for: Error_FecErrorDataRequired, Error_FecErrorInvalidShardCounts,
  // Error_FecErrorInvalidShardsAvailableArray, Error_FecErrorParityDataCountMustBePositive,
  // Error_FecErrorInvalidDataLengthTemplate, Error_FecErrorShardSizeExceedsMaximumTemplate,
  // Error_FecErrorNotEnoughShardsAvailableTemplate, Error_FecErrorFecEncodingFailedTemplate,
  // Error_FecErrorFecDecodingFailedTemplate
  Error_FecError_InputBlockRequired: 'Error_FecError_InputBlockRequired',
  Error_FecError_DamagedBlockRequired: 'Error_FecError_DamagedBlockRequired',
  Error_FecError_ParityBlocksRequired: 'Error_FecError_ParityBlocksRequired',
  Error_FecError_InvalidParityBlockSizeTemplate:
    'Error_FecError_InvalidParityBlockSizeTemplate',
  Error_FecError_InvalidRecoveredBlockSizeTemplate:
    'Error_FecError_InvalidRecoveredBlockSizeTemplate',
  Error_FecError_InputDataMustBeBuffer: 'Error_FecError_InputDataMustBeBuffer',
  Error_FecError_BlockSizeMismatch: 'Error_FecError_BlockSizeMismatch',
  Error_FecError_DamagedBlockDataMustBeBuffer:
    'Error_FecError_DamagedBlockDataMustBeBuffer',
  Error_FecError_ParityBlockDataMustBeBuffer:
    'Error_FecError_ParityBlockDataMustBeBuffer',

  // NOTE: ECIES error strings moved to @digitaldefiance/suite-core-lib SuiteCoreStringKey
  // Use SuiteCoreStringKey for all Error_EciesError* keys
  Error_EciesError_InvalidBlockType: 'Error_EciesError_InvalidBlockType',

  // Store Errors
  Error_StoreError_InvalidBlockMetadataTemplate:
    'Error_StoreError_InvalidBlockMetadataTemplate',
  Error_StoreError_KeyNotFoundTemplate: 'Error_StoreError_KeyNotFoundTemplate',
  Error_StoreError_StorePathRequired: 'Error_StoreError_StorePathRequired',
  Error_StoreError_StorePathNotFound: 'Error_StoreError_StorePathNotFound',
  Error_StoreError_BlockSizeRequired: 'Error_StoreError_BlockSizeRequired',
  Error_StoreError_BlockIdRequired: 'Error_StoreError_BlockIdRequired',
  Error_StoreError_InvalidBlockIdTooShort:
    'Error_StoreError_InvalidBlockIdTooShort',
  Error_StoreError_BlockFileSizeMismatch:
    'Error_StoreError_BlockFileSizeMismatch',
  Error_StoreError_BlockValidationFailed:
    'Error_StoreError_BlockValidationFailed',
  Error_StoreError_BlockPathAlreadyExistsTemplate:
    'Error_StoreError_BlockPathAlreadyExistsTemplate',
  Error_StoreError_BlockAlreadyExists: 'Error_StoreError_BlockAlreadyExists',
  Error_StoreError_NoBlocksProvided: 'Error_StoreError_NoBlocksProvided',
  Error_StoreError_CannotStoreEphemeralData:
    'Error_StoreError_CannotStoreEphemeralData',
  Error_StoreError_BlockIdMismatchTemplate:
    'Error_StoreError_BlockIdMismatchTemplate',
  Error_StoreError_BlockSizeMismatch: 'Error_StoreError_BlockSizeMismatch',
  Error_StoreError_BlockDirectoryCreationFailedTemplate:
    'Error_StoreError_BlockDirectoryCreationFailedTemplate',
  Error_StoreError_BlockDeletionFailedTemplate:
    'Error_StoreError_BlockDeletionFailedTemplate',
  Error_StoreError_NotImplemented: 'Error_StoreError_NotImplemented',
  Error_StoreError_InsufficientRandomBlocksTemplate:
    'Error_StoreError_InsufficientRandomBlocksTemplate',
  Error_StoreError_FactoryNotRegistered:
    'Error_StoreError_FactoryNotRegistered',
  Error_StoreError_CloudOperationFailedTemplate:
    'Error_StoreError_CloudOperationFailedTemplate',
  Error_StoreError_CloudAuthenticationFailedTemplate:
    'Error_StoreError_CloudAuthenticationFailedTemplate',

  // NOTE: Secure Storage error strings moved to @digitaldefiance/suite-core-lib SuiteCoreStringKey
  // Use SuiteCoreStringKey for: Error_SecureStorageDecryptedValueLengthMismatch,
  // Error_SecureStorageDecryptedValueChecksumMismatch, Error_SecureStorageValueIsNull

  // Sealing Errors
  Error_SealingError_MissingPrivateKeys:
    'Error_SealingError_MissingPrivateKeys',
  Error_SealingError_MemberNotFound: 'Error_SealingError_MemberNotFound',
  Error_SealingError_TooManyMembersToUnlock:
    'Error_SealingError_TooManyMembersToUnlock',
  Error_SealingError_NotEnoughMembersToUnlock:
    'Error_SealingError_NotEnoughMembersToUnlock',
  Error_SealingError_EncryptedShareNotFound:
    'Error_SealingError_EncryptedShareNotFound',
  Error_SealingError_InvalidBitRange: 'Error_SealingError_InvalidBitRange',
  Error_SealingError_InvalidMemberArray:
    'Error_SealingError_InvalidMemberArray',
  Error_SealingError_FailedToSealTemplate:
    'Error_SealingError_FailedToSealTemplate',
  Error_SealingError_InsufficientSharesForReconstruction:
    'Error_SealingError_InsufficientSharesForReconstruction',
  Error_SealingError_KeyReconstructionFailed:
    'Error_SealingError_KeyReconstructionFailed',

  // CBL Errors
  Error_CblError_BlockNotReadable: 'Error_CblError_BlockNotReadable',
  Error_CblError_CblRequired: 'Error_CblError_CblRequired',
  Error_CblError_WhitenedBlockFunctionRequired:
    'Error_CblError_WhitenedBlockFunctionRequired',
  Error_CblError_FailedToLoadBlock: 'Error_CblError_FailedToLoadBlock',
  Error_CblError_ExpectedEncryptedDataBlock:
    'Error_CblError_ExpectedEncryptedDataBlock',
  Error_CblError_ExpectedOwnedDataBlock:
    'Error_CblError_ExpectedOwnedDataBlock',
  Error_CblError_InvalidStructure: 'Error_CblError_InvalidStructure',
  Error_CblError_CreatorUndefined: 'Error_CblError_CreatorUndefined',
  Error_CblError_CreatorRequiredForSignature:
    'Error_CblError_CreatorRequiredForSignature',
  Error_CblError_InvalidCreatorId: 'Error_CblError_InvalidCreatorId',
  Error_CblError_FileNameRequired: 'Error_CblError_FileNameRequired',
  Error_CblError_FileNameEmpty: 'Error_CblError_FileNameEmpty',
  Error_CblError_FileNameWhitespace: 'Error_CblError_FileNameWhitespace',
  Error_CblError_FileNameInvalidChar: 'Error_CblError_FileNameInvalidChar',
  Error_CblError_FileNameControlChars: 'Error_CblError_FileNameControlChars',
  Error_CblError_FileNamePathTraversal: 'Error_CblError_FileNamePathTraversal',
  Error_CblError_MimeTypeRequired: 'Error_CblError_MimeTypeRequired',
  Error_CblError_MimeTypeEmpty: 'Error_CblError_MimeTypeEmpty',
  Error_CblError_MimeTypeWhitespace: 'Error_CblError_MimeTypeWhitespace',
  Error_CblError_MimeTypeLowercase: 'Error_CblError_MimeTypeLowercase',
  Error_CblError_MimeTypeInvalidFormat: 'Error_CblError_MimeTypeInvalidFormat',
  Error_CblError_InvalidBlockSize: 'Error_CblError_InvalidBlockSize',
  Error_CblError_MetadataSizeExceeded: 'Error_CblError_MetadataSizeExceeded',
  Error_CblError_MetadataSizeNegative: 'Error_CblError_MetadataSizeNegative',
  Error_CblError_InvalidMetadataBuffer: 'Error_CblError_InvalidMetadataBuffer',
  Error_CblError_CreationFailedTemplate:
    'Error_CblError_CreationFailedTemplate',
  Error_CblError_InsufficientCapacityTemplate:
    'Error_CblError_InsufficientCapacityTemplate',
  Error_CblError_NotExtendedCbl: 'Error_CblError_NotExtendedCbl',
  Error_CblError_InvalidSignature: 'Error_CblError_InvalidSignature',
  Error_CblError_CreatorIdMismatch: 'Error_CblError_CreatorIdMismatch',
  Error_CblError_FileSizeTooLarge: 'Error_CblError_FileSizeTooLarge',
  Error_CblError_FileSizeTooLargeForNode:
    'Error_CblError_FileSizeTooLargeForNode',
  Error_CblError_InvalidTupleSize: 'Error_CblError_InvalidTupleSize',
  Error_CblError_FileNameTooLong: 'Error_CblError_FileNameTooLong',
  Error_CblError_MimeTypeTooLong: 'Error_CblError_MimeTypeTooLong',
  Error_CblError_AddressCountExceedsCapacity:
    'Error_CblError_AddressCountExceedsCapacity',
  Error_CblError_CblEncrypted: 'Error_CblError_CblEncrypted',
  Error_CblError_UserRequiredForDecryption:
    'Error_CblError_UserRequiredForDecryption',
  Error_CblError_NotASuperCbl: 'Error_CblError_NotASuperCbl',
  Error_CblError_FailedToExtractCreatorId:
    'Error_CblError_FailedToExtractCreatorId',
  Error_CblError_FailedToExtractProvidedCreatorId:
    'Error_CblError_FailedToExtractProvidedCreatorId',
  Error_CblError_PoolIntegrityError: 'Error_CblError_PoolIntegrityError',

  // Multi-Encrypted Errors
  Error_MultiEncryptedError_InvalidEphemeralPublicKeyLength:
    'Error_MultiEncryptedError_InvalidEphemeralPublicKeyLength',
  Error_MultiEncryptedError_DataLengthExceedsCapacity:
    'Error_MultiEncryptedError_DataLengthExceedsCapacity',
  Error_MultiEncryptedError_BlockNotReadable:
    'Error_MultiEncryptedError_BlockNotReadable',
  Error_MultiEncryptedError_DataTooShort:
    'Error_MultiEncryptedError_DataTooShort',
  Error_MultiEncryptedError_CreatorMustBeMember:
    'Error_MultiEncryptedError_CreatorMustBeMember',
  Error_MultiEncryptedError_InvalidIVLength:
    'Error_MultiEncryptedError_InvalidIVLength',
  Error_MultiEncryptedError_InvalidAuthTagLength:
    'Error_MultiEncryptedError_InvalidAuthTagLength',
  Error_MultiEncryptedError_ChecksumMismatch:
    'Error_MultiEncryptedError_ChecksumMismatch',
  Error_MultiEncryptedError_RecipientMismatch:
    'Error_MultiEncryptedError_RecipientMismatch',
  Error_MultiEncryptedError_RecipientsAlreadyLoaded:
    'Error_MultiEncryptedError_RecipientsAlreadyLoaded',

  // Block Errors
  Error_BlockError_DataLengthMustMatchBlockSize:
    'Error_BlockError_DataLengthMustMatchBlockSize',
  Error_BlockError_CreatorRequired: 'Error_BlockError_CreatorRequired',
  Error_BlockError_DataLengthExceedsCapacity:
    'Error_BlockError_DataLengthExceedsCapacity',
  Error_BlockError_DataRequired: 'Error_BlockError_DataRequired',
  Error_BlockError_ActualDataLengthExceedsDataLength:
    'Error_BlockError_ActualDataLengthExceedsDataLength',
  Error_BlockError_ActualDataLengthNegative:
    'Error_BlockError_ActualDataLengthNegative',
  Error_BlockError_CreatorRequiredForEncryption:
    'Error_BlockError_CreatorRequiredForEncryption',
  Error_BlockError_UnexpectedEncryptedBlockType:
    'Error_BlockError_UnexpectedEncryptedBlockType',
  Error_BlockError_CannotEncrypt: 'Error_BlockError_CannotEncrypt',
  Error_BlockError_CannotDecrypt: 'Error_BlockError_CannotDecrypt',
  Error_BlockError_CreatorPrivateKeyRequired:
    'Error_BlockError_CreatorPrivateKeyRequired',
  Error_BlockError_InvalidMultiEncryptionRecipientCount:
    'Error_BlockError_InvalidMultiEncryptionRecipientCount',
  Error_BlockError_InvalidNewBlockType: 'Error_BlockError_InvalidNewBlockType',
  Error_BlockError_UnexpectedEphemeralBlockType:
    'Error_BlockError_UnexpectedEphemeralBlockType',
  Error_BlockError_RecipientRequired: 'Error_BlockError_RecipientRequired',
  Error_BlockError_RecipientKeyRequired:
    'Error_BlockError_RecipientKeyRequired',

  // Whitened Errors
  Error_WhitenedError_BlockNotReadable: 'Error_WhitenedError_BlockNotReadable',
  Error_WhitenedError_BlockSizeMismatch:
    'Error_WhitenedError_BlockSizeMismatch',
  Error_WhitenedError_DataLengthMismatch:
    'Error_WhitenedError_DataLengthMismatch',
  Error_WhitenedError_InvalidBlockSize: 'Error_WhitenedError_InvalidBlockSize',

  // Tuple Errors
  Error_TupleError_InvalidTupleSize: 'Error_TupleError_InvalidTupleSize',
  Error_TupleError_BlockSizeMismatch: 'Error_TupleError_BlockSizeMismatch',
  Error_TupleError_NoBlocksToXor: 'Error_TupleError_NoBlocksToXor',
  Error_TupleError_InvalidBlockCount: 'Error_TupleError_InvalidBlockCount',
  Error_TupleError_InvalidBlockType: 'Error_TupleError_InvalidBlockType',
  Error_TupleError_InvalidSourceLength: 'Error_TupleError_InvalidSourceLength',
  Error_TupleError_RandomBlockGenerationFailed:
    'Error_TupleError_RandomBlockGenerationFailed',
  Error_TupleError_WhiteningBlockGenerationFailed:
    'Error_TupleError_WhiteningBlockGenerationFailed',
  Error_TupleError_MissingParameters: 'Error_TupleError_MissingParameters',
  Error_TupleError_XorOperationFailedTemplate:
    'Error_TupleError_XorOperationFailedTemplate',
  Error_TupleError_DataStreamProcessingFailedTemplate:
    'Error_TupleError_DataStreamProcessingFailedTemplate',
  Error_TupleError_EncryptedDataStreamProcessingFailedTemplate:
    'Error_TupleError_EncryptedDataStreamProcessingFailedTemplate',
  Error_TupleError_PoolBoundaryViolationTemplate:
    'Error_TupleError_PoolBoundaryViolationTemplate',

  // Memory Tuple Errors
  Error_MemoryTupleError_InvalidTupleSizeTemplate:
    'Error_MemoryTupleError_InvalidTupleSizeTemplate',
  Error_MemoryTupleError_BlockSizeMismatch:
    'Error_MemoryTupleError_BlockSizeMismatch',
  Error_MemoryTupleError_NoBlocksToXor: 'Error_MemoryTupleError_NoBlocksToXor',
  Error_MemoryTupleError_InvalidBlockCount:
    'Error_MemoryTupleError_InvalidBlockCount',
  Error_MemoryTupleError_ExpectedBlockIdsTemplate:
    'Error_MemoryTupleError_ExpectedBlockIdsTemplate',
  Error_MemoryTupleError_ExpectedBlocksTemplate:
    'Error_MemoryTupleError_ExpectedBlocksTemplate',

  // Handle Tuple Errors
  Error_HandleTupleError_InvalidTupleSizeTemplate:
    'Error_HandleTupleError_InvalidTupleSizeTemplate',
  Error_HandleTupleError_BlockSizeMismatch:
    'Error_HandleTupleError_BlockSizeMismatch',
  Error_HandleTupleError_NoBlocksToXor: 'Error_HandleTupleError_NoBlocksToXor',
  Error_HandleTupleError_BlockSizesMustMatch:
    'Error_HandleTupleError_BlockSizesMustMatch',
  Error_HandleTupleError_PoolMismatchTemplate:
    'Error_HandleTupleError_PoolMismatchTemplate',

  // Stream Errors
  Error_StreamError_BlockSizeRequired: 'Error_StreamError_BlockSizeRequired',
  Error_StreamError_WhitenedBlockSourceRequired:
    'Error_StreamError_WhitenedBlockSourceRequired',
  Error_StreamError_RandomBlockSourceRequired:
    'Error_StreamError_RandomBlockSourceRequired',
  Error_StreamError_InputMustBeBuffer: 'Error_StreamError_InputMustBeBuffer',
  Error_StreamError_FailedToGetRandomBlock:
    'Error_StreamError_FailedToGetRandomBlock',
  Error_StreamError_FailedToGetWhiteningBlock:
    'Error_StreamError_FailedToGetWhiteningBlock',
  Error_StreamError_IncompleteEncryptedBlock:
    'Error_StreamError_IncompleteEncryptedBlock',

  // NOTE: Common error strings moved to @digitaldefiance/suite-core-lib SuiteCoreStringKey
  // Use SuiteCoreStringKey for: Error_InvalidEmail, Error_InvalidEmailMissing, Error_InvalidEmailWhitespace,
  // Error_InvalidGuid, Error_InvalidGuidTemplate, Error_InvalidGuidUnknownBrandTemplate,
  // Error_InvalidGuidUnknownLengthTemplate, Error_InvalidLanguageCode, Error_LengthExceedsMaximum,
  // Error_LengthIsInvalidType
  Error_Checksum_MismatchTemplate: 'Error_Checksum_MismatchTemplate',
  Error_Hydration_FailedToHydrateTemplate:
    'Error_Hydration_FailedToHydrateTemplate',
  Error_Serialization_FailedToSerializeTemplate:
    'Error_Serialization_FailedToSerializeTemplate',
  Error_BlockSize_InvalidTemplate: 'Error_BlockSize_InvalidTemplate',
  Error_Checksum_Invalid: 'Error_Checksum_Invalid',
  Error_Creator_Invalid: 'Error_Creator_Invalid',
  Error_Credentials_Invalid: 'Error_Credentials_Invalid',
  Error_ID_InvalidFormat: 'Error_ID_InvalidFormat',
  Error_TupleCount_InvalidTemplate: 'Error_TupleCount_InvalidTemplate',
  Error_References_Invalid: 'Error_References_Invalid',
  Error_SessionID_Invalid: 'Error_SessionID_Invalid',
  Error_Signature_Invalid: 'Error_Signature_Invalid',
  Error_Metadata_Mismatch: 'Error_Metadata_Mismatch',
  Error_Token_Expired: 'Error_Token_Expired',
  Error_Token_Invalid: 'Error_Token_Invalid',
  Error_Unexpected_Error: 'Error_Unexpected_Error',
  Error_User_NotFound: 'Error_User_NotFound',
  Error_Validation_Error: 'Error_Validation_Error',
  Error_Capacity_Insufficient: 'Error_Capacity_Insufficient',
  Error_Implementation_NotImplemented: 'Error_Implementation_NotImplemented',

  // Block Sizes
  BlockSize_Unknown: 'BlockSize_Unknown',
  BlockSize_Message: 'BlockSize_Message',
  BlockSize_Tiny: 'BlockSize_Tiny',
  BlockSize_Small: 'BlockSize_Small',
  BlockSize_Medium: 'BlockSize_Medium',
  BlockSize_Large: 'BlockSize_Large',
  BlockSize_Huge: 'BlockSize_Huge',

  // NOTE: UI strings moved to @digitaldefiance/suite-core-lib SuiteCoreStringKey
  // Use SuiteCoreStringKey for: Common_ChangePassword, Common_Dashboard, Common_Logo,
  // Common_NoActiveRequest, Common_NoActiveResponse, Common_NoUserOnRequest, Common_Unauthorized,
  // LanguageUpdate_Success, Login_LoginButton, LogoutButton, Validation_InvalidLanguage,
  // Validation_InvalidPassword, Validation_PasswordRegexErrorTemplate
  ChangePassword_Success: 'ChangePassword_Success',
  Common_Site: 'Common_Site',
  ForgotPassword_Title: 'ForgotPassword_Title',
  Register_Button: 'Register_Button',
  Register_Error: 'Register_Error',
  Register_Success: 'Register_Success',

  // Document Errors
  Error_DocumentError_InvalidValueTemplate:
    'Error_DocumentError_InvalidValueTemplate',
  Error_DocumentError_FieldRequiredTemplate:
    'Error_DocumentError_FieldRequiredTemplate',
  Error_DocumentError_AlreadyInitialized:
    'Error_DocumentError_AlreadyInitialized',
  Error_DocumentError_Uninitialized: 'Error_DocumentError_Uninitialized',

  // Isolated Key Errors
  Error_IsolatedKeyError_InvalidPublicKey:
    'Error_IsolatedKeyError_InvalidPublicKey',
  Error_IsolatedKeyError_InvalidKeyId: 'Error_IsolatedKeyError_InvalidKeyId',
  Error_IsolatedKeyError_InvalidKeyFormat:
    'Error_IsolatedKeyError_InvalidKeyFormat',
  Error_IsolatedKeyError_InvalidKeyLength:
    'Error_IsolatedKeyError_InvalidKeyLength',
  Error_IsolatedKeyError_InvalidKeyType:
    'Error_IsolatedKeyError_InvalidKeyType',
  Error_IsolatedKeyError_KeyIsolationViolation:
    'Error_IsolatedKeyError_KeyIsolationViolation',

  // NOTE: PBKDF2 error strings moved to @digitaldefiance/suite-core-lib SuiteCoreStringKey
  // Use SuiteCoreStringKey for: Error_Pbkdf2InvalidSaltLength, Error_Pbkdf2InvalidHashLength

  // BrightTrust Errors
  Error_BrightTrustError_InvalidBrightTrustId:
    'Error_BrightTrustError_InvalidBrightTrustId',
  Error_BrightTrustError_DocumentNotFound:
    'Error_BrightTrustError_DocumentNotFound',
  Error_BrightTrustError_UnableToRestoreDocument:
    'Error_BrightTrustError_UnableToRestoreDocument',
  Error_BrightTrustError_NotImplemented:
    'Error_BrightTrustError_NotImplemented',
  Error_BrightTrustError_Uninitialized: 'Error_BrightTrustError_Uninitialized',
  Error_BrightTrustError_MemberNotFound:
    'Error_BrightTrustError_MemberNotFound',
  Error_BrightTrustError_NotEnoughMembers:
    'Error_BrightTrustError_NotEnoughMembers',
  // BrightTrust Mode Errors
  Error_BrightTrustError_TransitionInProgress:
    'Error_BrightTrustError_TransitionInProgress',
  Error_BrightTrustError_InvalidModeTransition:
    'Error_BrightTrustError_InvalidModeTransition',
  Error_BrightTrustError_InsufficientMembersForTransition:
    'Error_BrightTrustError_InsufficientMembersForTransition',
  // BrightTrust Member Management Errors
  Error_BrightTrustError_MemberAlreadyExists:
    'Error_BrightTrustError_MemberAlreadyExists',
  Error_BrightTrustError_InsufficientRemainingMembers:
    'Error_BrightTrustError_InsufficientRemainingMembers',
  Error_BrightTrustError_MemberBanned: 'Error_BrightTrustError_MemberBanned',
  Error_BrightTrustError_MemberSuspended:
    'Error_BrightTrustError_MemberSuspended',
  // BrightTrust Proposal/Voting Errors
  Error_BrightTrustError_DuplicateProposal:
    'Error_BrightTrustError_DuplicateProposal',
  Error_BrightTrustError_ProposalExpired:
    'Error_BrightTrustError_ProposalExpired',
  Error_BrightTrustError_DuplicateVote: 'Error_BrightTrustError_DuplicateVote',
  Error_BrightTrustError_VoterNotOnProposal:
    'Error_BrightTrustError_VoterNotOnProposal',
  Error_BrightTrustError_AuthenticationFailed:
    'Error_BrightTrustError_AuthenticationFailed',
  Error_BrightTrustError_VotingLocked: 'Error_BrightTrustError_VotingLocked',
  Error_BrightTrustError_MissingAttachment:
    'Error_BrightTrustError_MissingAttachment',
  Error_BrightTrustError_AttachmentNotRetrievable:
    'Error_BrightTrustError_AttachmentNotRetrievable',
  // BrightTrust Ban Mechanism Errors
  Error_BrightTrustError_CannotBanSelf: 'Error_BrightTrustError_CannotBanSelf',
  Error_BrightTrustError_MemberAlreadyBanned:
    'Error_BrightTrustError_MemberAlreadyBanned',
  Error_BrightTrustError_MemberNotBanned:
    'Error_BrightTrustError_MemberNotBanned',
  Error_BrightTrustError_NewMemberCannotProposeBan:
    'Error_BrightTrustError_NewMemberCannotProposeBan',
  Error_BrightTrustError_BanCoolingPeriodNotElapsed:
    'Error_BrightTrustError_BanCoolingPeriodNotElapsed',
  Error_BrightTrustError_InvalidBanRecordSignatures:
    'Error_BrightTrustError_InvalidBanRecordSignatures',
  // BrightTrust Share Redistribution Errors
  Error_BrightTrustError_RedistributionFailed:
    'Error_BrightTrustError_RedistributionFailed',
  Error_BrightTrustError_InsufficientSharesForReconstruction:
    'Error_BrightTrustError_InsufficientSharesForReconstruction',
  Error_BrightTrustError_KeyReconstructionValidationFailed:
    'Error_BrightTrustError_KeyReconstructionValidationFailed',
  // BrightTrust Identity Errors
  Error_BrightTrustError_IdentityPermanentlyUnrecoverable:
    'Error_BrightTrustError_IdentityPermanentlyUnrecoverable',
  Error_BrightTrustError_InvalidMembershipProof:
    'Error_BrightTrustError_InvalidMembershipProof',
  Error_BrightTrustError_MissingMembershipProof:
    'Error_BrightTrustError_MissingMembershipProof',
  Error_BrightTrustError_AliasAlreadyTaken:
    'Error_BrightTrustError_AliasAlreadyTaken',
  Error_BrightTrustError_AliasNotFound: 'Error_BrightTrustError_AliasNotFound',
  Error_BrightTrustError_AliasInactive: 'Error_BrightTrustError_AliasInactive',
  Error_BrightTrustError_IdentitySealingFailed:
    'Error_BrightTrustError_IdentitySealingFailed',
  Error_BrightTrustError_ShardVerificationFailed:
    'Error_BrightTrustError_ShardVerificationFailed',
  // BrightTrust Database Errors
  Error_BrightTrustError_BrightTrustDatabaseUnavailable:
    'Error_BrightTrustError_BrightTrustDatabaseUnavailable',
  Error_BrightTrustError_TransactionFailed:
    'Error_BrightTrustError_TransactionFailed',
  // BrightTrust Audit Errors
  Error_BrightTrustError_AuditChainCorrupted:
    'Error_BrightTrustError_AuditChainCorrupted',
  // Identity Validation Errors
  Error_IdentityValidationError_InvalidSignature:
    'Error_IdentityValidationError_InvalidSignature',
  Error_IdentityValidationError_UnregisteredAlias:
    'Error_IdentityValidationError_UnregisteredAlias',
  Error_IdentityValidationError_InactiveAlias:
    'Error_IdentityValidationError_InactiveAlias',
  Error_IdentityValidationError_InvalidMembershipProof:
    'Error_IdentityValidationError_InvalidMembershipProof',
  Error_IdentityValidationError_MissingMembershipProof:
    'Error_IdentityValidationError_MissingMembershipProof',
  Error_IdentityValidationError_BannedUser:
    'Error_IdentityValidationError_BannedUser',
  Error_IdentityValidationError_SuspendedUser:
    'Error_IdentityValidationError_SuspendedUser',
  Error_IdentityValidationError_ShardVerificationFailed:
    'Error_IdentityValidationError_ShardVerificationFailed',

  // System Keyring Errors
  Error_SystemKeyringError_KeyNotFoundTemplate:
    'Error_SystemKeyringError_KeyNotFoundTemplate',
  Error_SystemKeyringError_RateLimitExceeded:
    'Error_SystemKeyringError_RateLimitExceeded',

  // NOTE: Symmetric Encryption error strings moved to @digitaldefiance/suite-core-lib SuiteCoreStringKey
  // Use SuiteCoreStringKey for: Error_SymmetricDataNullOrUndefined, Error_SymmetricInvalidKeyLengthTemplate

  // NOTE: Member Encryption error strings moved to @digitaldefiance/suite-core-lib SuiteCoreStringKey
  // Use SuiteCoreStringKey for: Error_MemberErrorMissingEncryptionData, Error_MemberErrorEncryptionDataTooLarge,
  // Error_MemberErrorInvalidEncryptionData

  // XOR Service Errors
  Error_Xor_LengthMismatchTemplate: 'Error_Xor_LengthMismatchTemplate',
  Error_Xor_NoArraysProvided: 'Error_Xor_NoArraysProvided',
  Error_Xor_ArrayLengthMismatchTemplate:
    'Error_Xor_ArrayLengthMismatchTemplate',
  Error_Xor_CryptoApiNotAvailable: 'Error_Xor_CryptoApiNotAvailable',

  // Tuple Storage Service Errors
  Error_TupleStorage_DataExceedsBlockSizeTemplate:
    'Error_TupleStorage_DataExceedsBlockSizeTemplate',
  Error_TupleStorage_InvalidMagnetProtocol:
    'Error_TupleStorage_InvalidMagnetProtocol',
  Error_TupleStorage_InvalidMagnetType: 'Error_TupleStorage_InvalidMagnetType',
  Error_TupleStorage_MissingMagnetParameters:
    'Error_TupleStorage_MissingMagnetParameters',

  // Location Record Errors
  Error_LocationRecord_NodeIdRequired: 'Error_LocationRecord_NodeIdRequired',
  Error_LocationRecord_LastSeenRequired:
    'Error_LocationRecord_LastSeenRequired',
  Error_LocationRecord_IsAuthoritativeRequired:
    'Error_LocationRecord_IsAuthoritativeRequired',
  Error_LocationRecord_InvalidLastSeenDate:
    'Error_LocationRecord_InvalidLastSeenDate',
  Error_LocationRecord_InvalidLatencyMs:
    'Error_LocationRecord_InvalidLatencyMs',
  Error_LocationRecord_InvalidPoolId: 'Error_LocationRecord_InvalidPoolId',

  // Metadata Errors
  Error_Metadata_BlockIdRequired: 'Error_Metadata_BlockIdRequired',
  Error_Metadata_CreatedAtRequired: 'Error_Metadata_CreatedAtRequired',
  Error_Metadata_LastAccessedAtRequired:
    'Error_Metadata_LastAccessedAtRequired',
  Error_Metadata_LocationUpdatedAtRequired:
    'Error_Metadata_LocationUpdatedAtRequired',
  Error_Metadata_InvalidCreatedAtDate: 'Error_Metadata_InvalidCreatedAtDate',
  Error_Metadata_InvalidLastAccessedAtDate:
    'Error_Metadata_InvalidLastAccessedAtDate',
  Error_Metadata_InvalidLocationUpdatedAtDate:
    'Error_Metadata_InvalidLocationUpdatedAtDate',
  Error_Metadata_InvalidExpiresAtDate: 'Error_Metadata_InvalidExpiresAtDate',
  Error_Metadata_InvalidAvailabilityStateTemplate:
    'Error_Metadata_InvalidAvailabilityStateTemplate',
  Error_Metadata_LocationRecordsMustBeArray:
    'Error_Metadata_LocationRecordsMustBeArray',
  Error_Metadata_InvalidLocationRecordTemplate:
    'Error_Metadata_InvalidLocationRecordTemplate',
  Error_Metadata_InvalidAccessCount: 'Error_Metadata_InvalidAccessCount',
  Error_Metadata_InvalidTargetReplicationFactor:
    'Error_Metadata_InvalidTargetReplicationFactor',
  Error_Metadata_InvalidSize: 'Error_Metadata_InvalidSize',
  Error_Metadata_ParityBlockIdsMustBeArray:
    'Error_Metadata_ParityBlockIdsMustBeArray',
  Error_Metadata_ReplicaNodeIdsMustBeArray:
    'Error_Metadata_ReplicaNodeIdsMustBeArray',

  // Service Provider Errors
  Error_ServiceProvider_UseSingletonInstance:
    'Error_ServiceProvider_UseSingletonInstance',
  Error_ServiceProvider_NotInitialized: 'Error_ServiceProvider_NotInitialized',
  Error_ServiceLocator_NotSet: 'Error_ServiceLocator_NotSet',

  // Block Service Errors (additional hardcoded errors)
  Error_BlockService_CannotEncrypt: 'Error_BlockService_CannotEncrypt',
  Error_BlockService_BlocksArrayEmpty: 'Error_BlockService_BlocksArrayEmpty',
  Error_BlockService_BlockSizesMustMatch:
    'Error_BlockService_BlockSizesMustMatch',

  // Message Router Errors
  Error_MessageRouter_MessageNotFoundTemplate:
    'Error_MessageRouter_MessageNotFoundTemplate',

  // Browser Config Errors
  Error_BrowserConfig_NotImplementedTemplate:
    'Error_BrowserConfig_NotImplementedTemplate',

  // Debug Errors
  Error_Debug_UnsupportedFormat: 'Error_Debug_UnsupportedFormat',

  // Secure Heap Storage Errors
  Error_SecureHeap_KeyNotFound: 'Error_SecureHeap_KeyNotFound',

  // I18n Errors
  Error_I18n_KeyConflictObjectTemplate: 'Error_I18n_KeyConflictObjectTemplate',
  Error_I18n_KeyConflictValueTemplate: 'Error_I18n_KeyConflictValueTemplate',
  Error_I18n_StringsNotFoundTemplate: 'Error_I18n_StringsNotFoundTemplate',

  // Document Errors (additional hardcoded errors)
  Error_Document_CreatorRequiredForSaving:
    'Error_Document_CreatorRequiredForSaving',
  Error_Document_CreatorRequiredForEncrypting:
    'Error_Document_CreatorRequiredForEncrypting',
  Error_Document_NoEncryptedData: 'Error_Document_NoEncryptedData',
  Error_Document_FieldShouldBeArrayTemplate:
    'Error_Document_FieldShouldBeArrayTemplate',
  Error_Document_InvalidArrayValueTemplate:
    'Error_Document_InvalidArrayValueTemplate',
  Error_Document_FieldRequiredTemplate: 'Error_Document_FieldRequiredTemplate',
  Error_Document_FieldInvalidTemplate: 'Error_Document_FieldInvalidTemplate',
  Error_Document_InvalidValueTemplate: 'Error_Document_InvalidValueTemplate',
  Error_MemberDocument_PublicCblIdNotSet:
    'Error_MemberDocument_PublicCblIdNotSet',
  Error_MemberDocument_PrivateCblIdNotSet:
    'Error_MemberDocument_PrivateCblIdNotSet',
  Error_BaseMemberDocument_PublicCblIdNotSet:
    'Error_BaseMemberDocument_PublicCblIdNotSet',
  Error_BaseMemberDocument_PrivateCblIdNotSet:
    'Error_BaseMemberDocument_PrivateCblIdNotSet',

  // SimpleBrightChain Errors
  Error_SimpleBrightChain_BlockNotFoundTemplate:
    'Error_SimpleBrightChain_BlockNotFoundTemplate',

  // Currency Code Errors
  Error_CurrencyCode_Invalid: 'Error_CurrencyCode_Invalid',

  // Console Output Warnings
  Warning_BufferUtils_InvalidBase64String:
    'Warning_BufferUtils_InvalidBase64String',
  Warning_Keyring_FailedToLoad: 'Warning_Keyring_FailedToLoad',
  Warning_I18n_TranslationFailedTemplate:
    'Warning_I18n_TranslationFailedTemplate',

  // Console Output Errors
  Error_MemberStore_RollbackFailed: 'Error_MemberStore_RollbackFailed',
  Error_MemberCblService_CreateMemberCblFailed:
    'Error_MemberCblService_CreateMemberCblFailed',
  Error_MemberCblService_ChecksumMismatch:
    'Error_MemberCblService_ChecksumMismatch',
  Error_MemberCblService_BlockRetrievalFailed:
    'Error_MemberCblService_BlockRetrievalFailed',
  Error_MemberCblService_MissingRequiredFields:
    'Error_MemberCblService_MissingRequiredFields',
  Error_DeliveryTimeout_HandleTimeoutFailedTemplate:
    'Error_DeliveryTimeout_HandleTimeoutFailedTemplate',

  // Error Validator Errors
  Error_Validator_InvalidBlockSizeTemplate:
    'Error_Validator_InvalidBlockSizeTemplate',
  Error_Validator_InvalidBlockTypeTemplate:
    'Error_Validator_InvalidBlockTypeTemplate',
  Error_Validator_InvalidEncryptionTypeTemplate:
    'Error_Validator_InvalidEncryptionTypeTemplate',
  Error_Validator_RecipientCountMustBeAtLeastOne:
    'Error_Validator_RecipientCountMustBeAtLeastOne',
  Error_Validator_RecipientCountMaximumTemplate:
    'Error_Validator_RecipientCountMaximumTemplate',
  Error_Validator_FieldRequiredTemplate:
    'Error_Validator_FieldRequiredTemplate',
  Error_Validator_FieldCannotBeEmptyTemplate:
    'Error_Validator_FieldCannotBeEmptyTemplate',

  // Miscellaneous Block Errors
  Error_BlockError_BlockSizesMustMatch: 'Error_BlockError_BlockSizesMustMatch',
  Error_BlockError_DataCannotBeNullOrUndefined:
    'Error_BlockError_DataCannotBeNullOrUndefined',
  Error_BlockError_DataLengthExceedsBlockSizeTemplate:
    'Error_BlockError_DataLengthExceedsBlockSizeTemplate',

  // CPU
  Error_CPU_DuplicateOpcodeErrorTemplate:
    'Error_CPU_DuplicateOpcodeErrorTemplate',
  Error_CPU_NotImplementedTemplate: 'Error_CPU_NotImplementedTemplate',
  Error_CPU_InvalidReadSizeTemplate: 'Error_CPU_InvalidReadSizeTemplate',
  Error_CPU_StackOverflow: 'Error_CPU_StackOverflow',
  Error_CPU_StackUnderflow: 'Error_CPU_StackUnderflow',

  // Document
  Error_Document_InvalidValueInArrayTemplate:
    'Error_Document_InvalidValueInArrayTemplate',
  Error_Document_FieldIsRequiredTemplate:
    'Error_Document_FieldIsRequiredTemplate',
  Error_Document_FieldIsInvalidTemplate:
    'Error_Document_FieldIsInvalidTemplate',

  // Member CBL Errors
  Error_MemberCBL_PublicCBLIdNotSet: 'Error_MemberCBL_PublicCBLIdNotSet',
  Error_MemberCBL_PrivateCBLIdNotSet: 'Error_MemberCBL_PrivateCBLIdNotSet',

  // Member Document Errors
  Error_MemberDocument_Hint: 'Error_MemberDocument_Hint',
  Error_MemberDocument_CBLNotGenerated: 'Error_MemberDocument_CBLNotGenerated',

  // Member Profile Document Errors
  Error_MemberProfileDocument_Hint: 'Error_MemberProfileDocument_Hint',

  // BrightTrust Document Errors
  Error_BrightTrustDocument_CreatorMustBeSetBeforeSaving:
    'Error_BrightTrustDocument_CreatorMustBeSetBeforeSaving',
  Error_BrightTrustDocument_CreatorMustBeSetBeforeEncrypting:
    'Error_BrightTrustDocument_CreatorMustBeSetBeforeEncrypting',
  Error_BrightTrustDocument_DocumentHasNoEncryptedData:
    'Error_BrightTrustDocument_DocumentHasNoEncryptedData',
  Error_BrightTrustDocument_InvalidEncryptedDataFormat:
    'Error_BrightTrustDocument_InvalidEncryptedDataFormat',
  Error_BrightTrustDocument_InvalidMemberIdsFormat:
    'Error_BrightTrustDocument_InvalidMemberIdsFormat',
  Error_BrightTrustDocument_InvalidSignatureFormat:
    'Error_BrightTrustDocument_InvalidSignatureFormat',
  Error_BrightTrustDocument_InvalidCreatorIdFormat:
    'Error_BrightTrustDocument_InvalidCreatorIdFormat',
  Error_BrightTrustDocument_InvalidChecksumFormat:
    'Error_BrightTrustDocument_InvalidChecksumFormat',

  // BrightTrust Data Record
  BrightTrustDataRecord_MustShareWithAtLeastTwoMembers:
    'BrightTrustDataRecord_MustShareWithAtLeastTwoMembers',
  BrightTrustDataRecord_SharesRequiredExceedsMembers:
    'BrightTrustDataRecord_SharesRequiredExceedsMembers',
  BrightTrustDataRecord_SharesRequiredMustBeAtLeastTwo:
    'BrightTrustDataRecord_SharesRequiredMustBeAtLeastTwo',
  BrightTrustDataRecord_InvalidChecksum:
    'BrightTrustDataRecord_InvalidChecksum',
  BrightTrustDataRecord_InvalidSignature:
    'BrightTrustDataRecord_InvalidSignature',

  // Block Logger
  BlockLogger_Redacted: 'BlockLogger_Redacted',

  // Member Schema Errors
  Error_MemberSchema_InvalidIdFormat: 'Error_MemberSchema_InvalidIdFormat',
  Error_MemberSchema_InvalidPublicKeyFormat:
    'Error_MemberSchema_InvalidPublicKeyFormat',
  Error_MemberSchema_InvalidVotingPublicKeyFormat:
    'Error_MemberSchema_InvalidVotingPublicKeyFormat',
  Error_MemberSchema_InvalidEmailFormat:
    'Error_MemberSchema_InvalidEmailFormat',
  Error_MemberSchema_InvalidRecoveryDataFormat:
    'Error_MemberSchema_InvalidRecoveryDataFormat',
  Error_MemberSchema_InvalidTrustedPeersFormat:
    'Error_MemberSchema_InvalidTrustedPeersFormat',
  Error_MemberSchema_InvalidBlockedPeersFormat:
    'Error_MemberSchema_InvalidBlockedPeersFormat',
  Error_MemberSchema_InvalidActivityLogFormat:
    'Error_MemberSchema_InvalidActivityLogFormat',

  // Message Metadata Schema Errors
  Error_MessageMetadataSchema_InvalidRecipientsFormat:
    'Error_MessageMetadataSchema_InvalidRecipientsFormat',
  Error_MessageMetadataSchema_InvalidPriorityFormat:
    'Error_MessageMetadataSchema_InvalidPriorityFormat',
  Error_MessageMetadataSchema_InvalidDeliveryStatusFormat:
    'Error_MessageMetadataSchema_InvalidDeliveryStatusFormat',
  Error_MessageMetadataSchema_InvalidAcknowledgementsFormat:
    'Error_MessageMetadataSchema_InvalidAcknowledgmentsFormat',
  Error_MessageMetadataSchema_InvalidEncryptionSchemeFormat:
    'Error_MessageMetadataSchema_InvalidEncryptionSchemeFormat',
  Error_MessageMetadataSchema_InvalidCBLBlockIDsFormat:
    'Error_MessageMetadataSchema_InvalidCBLBlockIDsFormat',

  // Security Strings
  Security_DOS_InputSizeExceedsLimitErrorTemplate:
    'Security_DOS_InputSizeExceedsLimitErrorTemplate',
  Security_DOS_OperationExceededTimeLimitErrorTemplate:
    'Security_DOS_OperationExceededTimeLimitErrorTemplate',
  Security_RateLimiter_RateLimitExceededErrorTemplate:
    'Security_RateLimiter_RateLimitExceededErrorTemplate',
  Security_AuditLogger_SignatureValidationResultTemplate:
    'Security_AuditLogger_SignatureValidationResultTemplate',
  Security_AuditLogger_Success: 'Security_AuditLogger_Success',
  Security_AuditLogger_Failure: 'Security_AuditLogger_Failure',
  Security_AuditLogger_BlockCreated: 'Security_AuditLogger_BlockCreated',
  Security_AuditLogger_EncryptionPerformed:
    'Security_AuditLogger_EncryptionPerformed',
  Security_AuditLogger_DecryptionResultTemplate:
    'Security_AuditLogger_DecryptionResultTemplate',
  Security_AuditLogger_AccessDeniedTemplate:
    'Security_AuditLogger_AccessDeniedTemplate',
  Security_AuditLogger_Security: 'Security_AuditLogger_Security',

  // Delivery Timeout Strings
  DeliveryTimeout_FailedToHandleTimeoutTemplate:
    'DeliveryTimeout_FailedToHandleTimeoutTemplate',

  // Message CBL Service
  MessageCBLService_MessageSizeExceedsMaximumTemplate:
    'MessageCBLService_MessageSizeExceedsMaximumTemplate',
  MessageCBLService_FailedToCreateMessageAfterRetries:
    'MessageCBLService_FailedToCreateMessageAfterRetries',
  MessageCBLService_FailedToRetrieveMessageTemplate:
    'MessageCBLService_FailedToRetrieveMessageTemplate',
  MessageCBLService_MessageTypeIsRequired:
    'MessageCBLService_MessageTypeIsRequired',
  MessageCBLService_SenderIDIsRequired: 'MessageCBLService_SenderIDIsRequired',
  MessageCBLService_RecipientCountExceedsMaximumTemplate:
    'MessageCBLService_RecipientCountExceedsMaximumTemplate',

  // Message Encryption Service
  MessageEncryptionService_NoRecipientPublicKeysProvided:
    'MessageEncryptionService_NoRecipientPublicKeysProvided',
  MessageEncryptionService_FailedToEncryptTemplate:
    'MessageEncryptionService_FailedToEncryptTemplate',
  MessageEncryptionService_BroadcastEncryptionFailedTemplate:
    'MessageEncryptionService_BroadcastEncryptionFailedTemplate',
  MessageEncryptionService_DecryptionFailedTemplate:
    'MessageEncryptionService_DecryptionFailedTemplate',
  MessageEncryptionService_KeyDecryptionFailedTemplate:
    'MessageEncryptionService_KeyDecryptionFailedTemplate',

  // Message Logger
  MessageLogger_MessageCreated: 'MessageLogger_MessageCreated',
  MessageLogger_RoutingDecision: 'MessageLogger_RoutingDecision',
  MessageLogger_DeliveryFailure: 'MessageLogger_DeliveryFailure',
  MessageLogger_EncryptionFailure: 'MessageLogger_EncryptionFailure',
  MessageLogger_SlowQueryDetected: 'MessageLogger_SlowQueryDetected',

  // Message Router
  MessageRouter_RoutingTimeout: 'MessageRouter_RoutingTimeout',
  MessageRouter_FailedToRouteToAnyRecipient:
    'MessageRouter_FailedToRouteToAnyRecipient',
  MessageRouter_ForwardingLoopDetected: 'MessageRouter_ForwardingLoopDetected',

  // Block Format Service
  BlockFormatService_DataTooShort: 'BlockFormatService_DataTooShort',
  BlockFormatService_InvalidStructuredBlockFormatTemplate:
    'BlockFormatService_InvalidStructuredBlockFormatTemplate',
  BlockFormatService_CannotDetermineHeaderSize:
    'BlockFormatService_CannotDetermineHeaderSize',
  BlockFormatService_Crc8MismatchTemplate:
    'BlockFormatService_Crc8MismatchTemplate',
  BlockFormatService_DataAppearsEncrypted:
    'BlockFormatService_DataAppearsEncrypted',
  BlockFormatService_UnknownBlockFormat:
    'BlockFormatService_UnknownBlockFormat',

  // CBL Service
  CBLService_NotAMessageCBL: 'CBLService_NotAMessageCBL',
  CBLService_CreatorIDByteLengthMismatchTemplate:
    'CBLService_CreatorIDByteLengthMismatchTemplate',
  CBLService_CreatorIDProviderReturnedBytesLengthMismatchTemplate:
    'CBLService_CreatorIDProviderReturnedBytesLengthMismatchTemplate',
  CBLService_SignatureLengthMismatchTemplate:
    'CBLService_SignatureLengthMismatchTemplate',
  CBLService_DataAppearsRaw: 'CBLService_DataAppearsRaw',
  CBLService_InvalidBlockFormat: 'CBLService_InvalidBlockFormat',
  CBLService_SubCBLCountChecksumMismatchTemplate:
    'CBLService_SubCBLCountChecksumMismatchTemplate',
  CBLService_InvalidDepthTemplate: 'CBLService_InvalidDepthTemplate',
  CBLService_ExpectedSuperCBLTemplate: 'CBLService_ExpectedSuperCBLTemplate',

  // Global Service Provider
  GlobalServiceProvider_NotInitialized: 'GlobalServiceProvider_NotInitialized',

  // Block Store Adapter
  BlockStoreAdapter_DataLengthExceedsBlockSizeTemplate:
    'BlockStoreAdapter_DataLengthExceedsBlockSizeTemplate',

  // Memory Block Store
  MemoryBlockStore_FECServiceUnavailable:
    'MemoryBlockStore_FECServiceUnavailable',
  MemoryBlockStore_FECServiceUnavailableInThisEnvironment:
    'MemoryBlockStore_FECServiceUnavailableInThisEnvironment',
  MemoryBlockStore_NoParityDataAvailable:
    'MemoryBlockStore_NoParityDataAvailable',
  MemoryBlockStore_BlockMetadataNotFound:
    'MemoryBlockStore_BlockMetadataNotFound',
  MemoryBlockStore_RecoveryFailedInsufficientParityData:
    'MemoryBlockStore_RecoveryFailedInsufficientParityData',
  MemoryBlockStore_UnknownRecoveryError:
    'MemoryBlockStore_UnknownRecoveryError',
  MemoryBlockStore_CBLDataCannotBeEmpty:
    'MemoryBlockStore_CBLDataCannotBeEmpty',
  MemoryBlockStore_CBLDataTooLargeTemplate:
    'MemoryBlockStore_CBLDataTooLargeTemplate',
  MemoryBlockStore_Block1NotFound: 'MemoryBlockStore_Block1NotFound',
  MemoryBlockStore_Block2NotFound: 'MemoryBlockStore_Block2NotFound',
  MemoryBlockStore_InvalidMagnetURL: 'MemoryBlockStore_InvalidMagnetURL',
  MemoryBlockStore_InvalidMagnetURLXT: 'MemoryBlockStore_InvalidMagnetURLXT',
  MemoryBlockStore_InvalidMagnetURLMissingTemplate:
    'MemoryBlockStore_InvalidMagnetURLMissingTemplate',
  MemoryBlockStore_InvalidMagnetURL_InvalidBlockSize:
    'MemoryBlockStore_InvalidMagnetURL_InvalidBlockSize',

  // Checksum
  Checksum_InvalidTemplate: 'Checksum_InvalidTemplate',
  Checksum_InvalidHexString: 'Checksum_InvalidHexString',
  Checksum_InvalidHexStringTemplate: 'Checksum_InvalidHexStringTemplate',

  // XorLengthMismatchErrorTemplate
  Error_XorLengthMismatchTemplate: 'Error_XorLengthMismatchTemplate',
  Error_XorAtLeastOneArrayRequired: 'Error_XorAtLeastOneArrayRequired',

  Error_InvalidUnixTimestampTemplate: 'Error_InvalidUnixTimestampTemplate',
  Error_InvalidDateStringTemplate: 'Error_InvalidDateStringTemplate',
  Error_InvalidDateValueTypeTemplate: 'Error_InvalidDateValueTypeTemplate',
  Error_InvalidDateObjectTemplate: 'Error_InvalidDateObjectTemplate',
  Error_InvalidDateNaN: 'Error_InvalidDateNaN',
  Error_JsonValidationErrorTemplate: 'Error_JsonValidationErrorTemplate',
  Error_JsonValidationError_MustBeNonNull:
    'Error_JsonValidationError_MustBeNonNull',
  Error_JsonValidationError_FieldRequired:
    'Error_JsonValidationError_FieldRequired',
  Error_JsonValidationError_MustBeValidBlockSize:
    'Error_JsonValidationError_MustBeValidBlockSize',
  Error_JsonValidationError_MustBeValidBlockType:
    'Error_JsonValidationError_MustBeValidBlockType',
  Error_JsonValidationError_MustBeValidBlockDataType:
    'Error_JsonValidationError_MustBeValidBlockDataType',
  Error_JsonValidationError_MustBeNumber:
    'Error_JsonValidationError_MustBeNumber',
  Error_JsonValidationError_MustBeNonNegative:
    'Error_JsonValidationError_MustBeNonNegative',
  Error_JsonValidationError_MustBeInteger:
    'Error_JsonValidationError_MustBeInteger',
  Error_JsonValidationError_MustBeISO8601DateStringOrUnixTimestamp:
    'Error_JsonValidationError_MustBeISO8601DateStringOrUnixTimestamp',
  Error_JsonValidationError_MustBeString:
    'Error_JsonValidationError_MustBeString',
  Error_JsonValidationError_MustNotBeEmpty:
    'Error_JsonValidationError_MustNotBeEmpty',
  Error_JsonValidationError_JSONParsingFailed:
    'Error_JsonValidationError_JSONParsingFailed',
  Error_JsonValidationError_ValidationFailed:
    'Error_JsonValidationError_ValidationFailed',

  XorUtils_BlockSizeMustBePositiveTemplate:
    'XorUtils_BlockSizeMustBePositiveTemplate',
  XorUtils_InvalidPaddedDataTemplate: 'XorUtils_InvalidPaddedDataTemplate',
  XorUtils_InvalidLengthPrefixTemplate: 'XorUtils_InvalidLengthPrefixTemplate',

  BlockPaddingTransform_MustBeArray: 'BlockPaddingTransform_MustBeAnArray',
  CblStream_UnknownErrorReadingData: 'CblStream_UnknownErrorReadingData',
  CurrencyCode_InvalidCurrencyCode: 'CurrencyCode_InvalidCurrencyCode',
  EnergyAccount_InsufficientBalanceTemplate:
    'EnergyAccount_InsufficientBalanceTemplate',
  Init_BrowserCompatibleConfiguration: 'Init_BrowserCompatibleConfiguration',
  Init_NotInitialized: 'Init_NotInitialized',
  ModInverse_MultiplicativeInverseDoesNotExist:
    'ModInverse_MultiplicativeInverseDoesNotExist',
  PrimeTupleGeneratorStream_UnknownErrorInTransform:
    'PrimeTupleGeneratorStream_UnknownErrorInTransform',
  PrimeTupleGeneratorStream_UnknownErrorInMakeTuple:
    'Unknown error in makeTuple',
  PrimeTupleGeneratorStream_UnknownErrorInFlush: 'Unknown error in flush',

  SimpleBrowserStore_BlockNotFoundTemplate:
    'SimpleBrowserStore_BlockNotFoundTemplate',
  EncryptedBlockCreator_NoCreatorRegisteredTemplate:
    'EncryptedBlockCreator_NoCreatorRegisteredTemplate',
  TestMember_MemberNotFoundTemplate: 'TestMember_MemberNotFoundTemplate',

  // TCBL (Tarball CBL) Errors
  Error_TcblError_InvalidHeader: 'Error_TcblError_InvalidHeader',
  Error_TcblError_ManifestChecksumMismatch:
    'Error_TcblError_ManifestChecksumMismatch',
  Error_TcblError_ManifestCountMismatch:
    'Error_TcblError_ManifestCountMismatch',
  Error_TcblError_ManifestCorrupted: 'Error_TcblError_ManifestCorrupted',
  Error_TcblError_ManifestTruncated: 'Error_TcblError_ManifestTruncated',
  Error_TcblError_EntryNotFound: 'Error_TcblError_EntryNotFound',
  Error_TcblError_FileNameTooLong: 'Error_TcblError_FileNameTooLong',
  Error_TcblError_MimeTypeTooLong: 'Error_TcblError_MimeTypeTooLong',
  Error_TcblError_PathTraversal: 'Error_TcblError_PathTraversal',
  Error_TcblError_DecompressionFailed: 'Error_TcblError_DecompressionFailed',
  Error_TcblError_DecryptionFailed: 'Error_TcblError_DecryptionFailed',
  Error_TcblError_InvalidManifestVersion:
    'Error_TcblError_InvalidManifestVersion',

  // Splash
  Splash_Welcome: 'Splash_Welcome',
  Splash_NextGenInfrastructure: 'Splash_NextGenInfrastructure',
  Splash_SoupCanDemo: 'Splash_SoupCanDemo',
  Splash_SoupCanDemoDescription: 'Splash_SoupCanDemoDescription',
  Splash_StoragePools: 'Splash_StoragePools',
  Splash_StoragePoolsDescription: 'Splash_StoragePoolsDescription',
  Splash_Messaging: 'Splash_Messaging',
  Splash_MessagingDescription: 'Splash_MessagingDescription',
  Splash_BrightPass: 'Splash_BrightPass',
  Splash_BrightPassDescription: 'Splash_BrightPassDescription',
  Splash_Database: 'Splash_Database',
  Splash_DatabaseDescription: 'Splash_DatabaseDescription',
  Splash_IdentityAndSecurity: 'Splash_IdentityAndSecurity',
  Splash_IdentityAndSecurityDescription:
    'Splash_IdentityAndSecurityDescription',
  Splash_TrySoupCanDemo: 'Splash_TrySoupCanDemo',
  Splash_GetStarted: 'Splash_GetStarted',
  Splash_WhatIsBrightChain: 'Splash_WhatIsBrightChain',
  Splash_WhatIsBrightChainDescription: 'Splash_WhatIsBrightChainDescription',
  Splash_OwnerFreeStorage: 'Splash_OwnerFreeStorage',
  Splash_OwnerFreeStorageDescription: 'Splash_OwnerFreeStorageDescription',
  Splash_EnergyEfficient: 'Splash_EnergyEfficient',
  Splash_EnergyEfficientDescription: 'Splash_EnergyEfficientDescription',
  Splash_Decentralized: 'Splash_Decentralized',
  Splash_DecentralizedDescription: 'Splash_DecentralizedDescription',
  Splash_AnonymousYetAccountable: 'Splash_AnonymousYetAccountable',
  Splash_AnonymousYetAccountableDescription:
    'Splash_AnonymousYetAccountableDescription',
  Splash_ExploreThePlatform: 'Splash_ExploreThePlatform',
  Splash_InteractiveDemos: 'Splash_InteractiveDemos',
  Splash_LaunchDemo: 'Splash_LaunchDemo',

  // Splash - BrightStack
  Splash_BuildWithBrightStack: 'Splash_BuildWithBrightStack',
  Splash_BuildWithBrightStackDescription:
    'Splash_BuildWithBrightStackDescription',
  Splash_BrightStackSubtitle: 'Splash_BrightStackSubtitle',
  Splash_BrightDb: 'Splash_BrightDb',
  Splash_BrightDbDescription: 'Splash_BrightDbDescription',
  Splash_FamiliarApi: 'Splash_FamiliarApi',
  Splash_FamiliarApiDescription: 'Splash_FamiliarApiDescription',
  Splash_BuiltOnBrightStack: 'Splash_BuiltOnBrightStack',
  Splash_BuiltOnBrightStackDescription: 'Splash_BuiltOnBrightStackDescription',
  Splash_OpenSource: 'Splash_OpenSource',
  Splash_OpenSourceDescription: 'Splash_OpenSourceDescription',

  // Splash - Not a Cryptocurrency
  Splash_NotACryptocurrency: 'Splash_NotACryptocurrency',
  Splash_NotACryptocurrencyDescription: 'Splash_NotACryptocurrencyDescription',
  Splash_NoCurrency: 'Splash_NoCurrency',
  Splash_NoCurrencyDescription: 'Splash_NoCurrencyDescription',
  Splash_NoMining: 'Splash_NoMining',
  Splash_NoMiningDescription: 'Splash_NoMiningDescription',
  Splash_Joules: 'Splash_Joules',
  Splash_JoulesDescription: 'Splash_JoulesDescription',
  Splash_RealWorldValue: 'Splash_RealWorldValue',
  Splash_RealWorldValueDescription: 'Splash_RealWorldValueDescription',
  Splash_Documentation: 'Splash_Documentation',
  Splash_FAQ: 'Splash_FAQ',
  Splash_PrivacyPolicy: 'Splash_PrivacyPolicy',
  Splash_TermsOfService: 'Splash_TermsOfService',

  // Dashboard
  Dashboard_Title: 'Dashboard_Title',
  Dashboard_EnergyBalance: 'Dashboard_EnergyBalance',
  Dashboard_AvailableCredits: 'Dashboard_AvailableCredits',
  Dashboard_Reputation: 'Dashboard_Reputation',
  Dashboard_ReputationScore: 'Dashboard_ReputationScore',
  Dashboard_EnergyEarned: 'Dashboard_EnergyEarned',
  Dashboard_EarnedDescription: 'Dashboard_EarnedDescription',
  Dashboard_EnergySpent: 'Dashboard_EnergySpent',
  Dashboard_SpentDescription: 'Dashboard_SpentDescription',
  Dashboard_Loading: 'Dashboard_Loading',
  Dashboard_FailedToLoadBalance: 'Dashboard_FailedToLoadBalance',
  Dashboard_FailedToLoadReputation: 'Dashboard_FailedToLoadReputation',
  Dashboard_FailedToLoadData: 'Dashboard_FailedToLoadData',

  // Admin Dashboard
  Admin_Dashboard_Title: 'Admin_Dashboard_Title',
  Admin_Dashboard_AccessDenied: 'Admin_Dashboard_AccessDenied',
  Admin_Dashboard_AccessDeniedDescription:
    'Admin_Dashboard_AccessDeniedDescription',
  Admin_Dashboard_Loading: 'Admin_Dashboard_Loading',
  Admin_Dashboard_NoData: 'Admin_Dashboard_NoData',
  Admin_Dashboard_RefreshNow: 'Admin_Dashboard_RefreshNow',
  Admin_Dashboard_ErrorLastSuccessTemplate:
    'Admin_Dashboard_ErrorLastSuccessTemplate',
  Admin_Dashboard_ErrorLastSuccessNever:
    'Admin_Dashboard_ErrorLastSuccessNever',
  Admin_Dashboard_ServerIdentity: 'Admin_Dashboard_ServerIdentity',
  Admin_Dashboard_Hostname: 'Admin_Dashboard_Hostname',
  Admin_Dashboard_LocalNodeId: 'Admin_Dashboard_LocalNodeId',
  Admin_Dashboard_Timestamp: 'Admin_Dashboard_Timestamp',
  Admin_Dashboard_NA: 'Admin_Dashboard_NA',
  Admin_Dashboard_Nodes: 'Admin_Dashboard_Nodes',
  Admin_Dashboard_NoNodesRegistered: 'Admin_Dashboard_NoNodesRegistered',
  Admin_Dashboard_DisconnectedPeers: 'Admin_Dashboard_DisconnectedPeers',
  Admin_Dashboard_LumenClients: 'Admin_Dashboard_LumenClients',
  Admin_Dashboard_ConnectedClients: 'Admin_Dashboard_ConnectedClients',
  Admin_Dashboard_RoomsTemplate: 'Admin_Dashboard_RoomsTemplate',
  Admin_Dashboard_NodeConnections: 'Admin_Dashboard_NodeConnections',
  Admin_Dashboard_NodeToNodeConnections:
    'Admin_Dashboard_NodeToNodeConnections',
  Admin_Dashboard_SystemMetrics: 'Admin_Dashboard_SystemMetrics',
  Admin_Dashboard_HeapUsed: 'Admin_Dashboard_HeapUsed',
  Admin_Dashboard_HeapTotal: 'Admin_Dashboard_HeapTotal',
  Admin_Dashboard_RSS: 'Admin_Dashboard_RSS',
  Admin_Dashboard_External: 'Admin_Dashboard_External',
  Admin_Dashboard_UptimeTemplate: 'Admin_Dashboard_UptimeTemplate',
  Admin_Dashboard_NodeVersionTemplate: 'Admin_Dashboard_NodeVersionTemplate',
  Admin_Dashboard_DBStats: 'Admin_Dashboard_DBStats',
  Admin_Dashboard_Users: 'Admin_Dashboard_Users',
  Admin_Dashboard_Roles: 'Admin_Dashboard_Roles',
  Admin_Dashboard_Active: 'Admin_Dashboard_Active',
  Admin_Dashboard_Locked: 'Admin_Dashboard_Locked',
  Admin_Dashboard_Pending: 'Admin_Dashboard_Pending',
  Admin_Dashboard_Members: 'Admin_Dashboard_Members',
  Admin_Dashboard_Threshold: 'Admin_Dashboard_Threshold',
  Admin_Dashboard_Pools: 'Admin_Dashboard_Pools',
  Admin_Dashboard_NoPools: 'Admin_Dashboard_NoPools',
  Admin_Dashboard_Dependencies: 'Admin_Dashboard_Dependencies',
  Admin_Dashboard_BlockStore: 'Admin_Dashboard_BlockStore',
  Admin_Dashboard_TotalBlocks: 'Admin_Dashboard_TotalBlocks',
  Admin_Dashboard_TotalSize: 'Admin_Dashboard_TotalSize',
  Admin_Dashboard_TotalPosts: 'Admin_Dashboard_TotalPosts',
  Admin_Dashboard_ActiveUsersLast30Days:
    'Admin_Dashboard_ActiveUsersLast30Days',
  Admin_Dashboard_Conversations: 'Admin_Dashboard_Conversations',
  Admin_Dashboard_Messages: 'Admin_Dashboard_Messages',
  Admin_Dashboard_TotalVaults: 'Admin_Dashboard_TotalVaults',
  Admin_Dashboard_SharedVaults: 'Admin_Dashboard_SharedVaults',
  Admin_Dashboard_TotalEmails: 'Admin_Dashboard_TotalEmails',
  Admin_Dashboard_DeliveryFailures: 'Admin_Dashboard_DeliveryFailures',
  Admin_Dashboard_Last24Hours: 'Admin_Dashboard_Last24Hours',

  // Admin Menu
  Admin_Menu_Dashboard: 'Admin_Menu_Dashboard',
  Admin_Menu_Users: 'Admin_Menu_Users',
  Admin_Menu_Blocks: 'Admin_Menu_Blocks',
  Admin_Menu_Chat: 'Admin_Menu_Chat',
  Admin_Menu_Hub: 'Admin_Menu_Hub',
  Admin_Menu_Mail: 'Admin_Menu_Mail',
  Admin_Menu_Pass: 'Admin_Menu_Pass',
  Admin_Menu_About: 'Admin_Menu_About',

  // Admin Common (shared across panels)
  Admin_Common_Loading: 'Admin_Common_Loading',
  Admin_Common_Previous: 'Admin_Common_Previous',
  Admin_Common_Next: 'Admin_Common_Next',
  Admin_Common_PageTemplate: 'Admin_Common_PageTemplate',
  Admin_Common_Cancel: 'Admin_Common_Cancel',
  Admin_Common_Delete: 'Admin_Common_Delete',
  Admin_Common_Yes: 'Admin_Common_Yes',
  Admin_Common_No: 'Admin_Common_No',
  Admin_Common_Never: 'Admin_Common_Never',
  Admin_Common_Close: 'Admin_Common_Close',

  // Admin User Management
  Admin_Users_Title: 'Admin_Users_Title',
  Admin_Users_FilterAll: 'Admin_Users_FilterAll',
  Admin_Users_FilterActive: 'Admin_Users_FilterActive',
  Admin_Users_FilterLocked: 'Admin_Users_FilterLocked',
  Admin_Users_FilterPending: 'Admin_Users_FilterPending',
  Admin_Users_ColUsername: 'Admin_Users_ColUsername',
  Admin_Users_ColEmail: 'Admin_Users_ColEmail',
  Admin_Users_ColStatus: 'Admin_Users_ColStatus',
  Admin_Users_ColEmailVerified: 'Admin_Users_ColEmailVerified',
  Admin_Users_ColLastLogin: 'Admin_Users_ColLastLogin',
  Admin_Users_ColActions: 'Admin_Users_ColActions',
  Admin_Users_NoUsersFound: 'Admin_Users_NoUsersFound',
  Admin_Users_UnlockUser: 'Admin_Users_UnlockUser',
  Admin_Users_LockUser: 'Admin_Users_LockUser',
  Admin_Users_LockUserTitle: 'Admin_Users_LockUserTitle',
  Admin_Users_UnlockUserTitle: 'Admin_Users_UnlockUserTitle',
  Admin_Users_LockConfirmTemplate: 'Admin_Users_LockConfirmTemplate',
  Admin_Users_UnlockConfirmTemplate: 'Admin_Users_UnlockConfirmTemplate',
  Admin_Users_LockWarning: 'Admin_Users_LockWarning',
  Admin_Users_ColRole: 'Admin_Users_ColRole',
  Admin_Users_ChangeRole: 'Admin_Users_ChangeRole',
  Admin_Users_ChangeRoleTitle: 'Admin_Users_ChangeRoleTitle',
  Admin_Users_ChangeRoleConfirmTemplate:
    'Admin_Users_ChangeRoleConfirmTemplate',
  Admin_Users_ChangeRoleWarning: 'Admin_Users_ChangeRoleWarning',
  Admin_Users_RoleAdmin: 'Admin_Users_RoleAdmin',
  Admin_Users_RoleMember: 'Admin_Users_RoleMember',
  Admin_Users_RoleSystem: 'Admin_Users_RoleSystem',
  Admin_Users_CannotChangeOwnRole: 'Admin_Users_CannotChangeOwnRole',
  Admin_Users_CannotChangeSystemUser: 'Admin_Users_CannotChangeSystemUser',
  Admin_Users_DeleteUser: 'Admin_Users_DeleteUser',
  Admin_Users_DeleteUserTitle: 'Admin_Users_DeleteUserTitle',
  Admin_Users_DeleteConfirmTemplate: 'Admin_Users_DeleteConfirmTemplate',
  Admin_Users_DeleteWarning: 'Admin_Users_DeleteWarning',
  Admin_Users_CannotDeleteSelf: 'Admin_Users_CannotDeleteSelf',
  Admin_Users_CannotDeleteSystemUser: 'Admin_Users_CannotDeleteSystemUser',

  // Admin Block Explorer
  Admin_Blocks_Title: 'Admin_Blocks_Title',
  Admin_Blocks_SearchPlaceholder: 'Admin_Blocks_SearchPlaceholder',
  Admin_Blocks_FilterAllDurability: 'Admin_Blocks_FilterAllDurability',
  Admin_Blocks_FilterStandard: 'Admin_Blocks_FilterStandard',
  Admin_Blocks_FilterHighDurability: 'Admin_Blocks_FilterHighDurability',
  Admin_Blocks_FilterEphemeral: 'Admin_Blocks_FilterEphemeral',
  Admin_Blocks_SortByDate: 'Admin_Blocks_SortByDate',
  Admin_Blocks_SortBySize: 'Admin_Blocks_SortBySize',
  Admin_Blocks_Detail: 'Admin_Blocks_Detail',
  Admin_Blocks_ColBlockId: 'Admin_Blocks_ColBlockId',
  Admin_Blocks_ColSize: 'Admin_Blocks_ColSize',
  Admin_Blocks_ColDurability: 'Admin_Blocks_ColDurability',
  Admin_Blocks_ColCreated: 'Admin_Blocks_ColCreated',
  Admin_Blocks_ColAccessCount: 'Admin_Blocks_ColAccessCount',
  Admin_Blocks_ColReplication: 'Admin_Blocks_ColReplication',
  Admin_Blocks_ColActions: 'Admin_Blocks_ColActions',
  Admin_Blocks_NoBlocksFound: 'Admin_Blocks_NoBlocksFound',
  Admin_Blocks_DiscoverNodes: 'Admin_Blocks_DiscoverNodes',
  Admin_Blocks_NodesHoldingBlockTemplate:
    'Admin_Blocks_NodesHoldingBlockTemplate',
  Admin_Blocks_NoNodesFound: 'Admin_Blocks_NoNodesFound',
  Admin_Blocks_Checksum: 'Admin_Blocks_Checksum',
  Admin_Blocks_DeleteTitle: 'Admin_Blocks_DeleteTitle',
  Admin_Blocks_DeleteConfirmTemplate: 'Admin_Blocks_DeleteConfirmTemplate',
  Admin_Blocks_SizeBytesTemplate: 'Admin_Blocks_SizeBytesTemplate',

  // Admin BrightPass
  Admin_Pass_Title: 'Admin_Pass_Title',
  Admin_Pass_EncryptedNotice: 'Admin_Pass_EncryptedNotice',
  Admin_Pass_ColOwner: 'Admin_Pass_ColOwner',
  Admin_Pass_ColShared: 'Admin_Pass_ColShared',
  Admin_Pass_ColCreated: 'Admin_Pass_ColCreated',
  Admin_Pass_ColLastAccessed: 'Admin_Pass_ColLastAccessed',
  Admin_Pass_ColActions: 'Admin_Pass_ColActions',
  Admin_Pass_NoVaultsFound: 'Admin_Pass_NoVaultsFound',
  Admin_Pass_DeleteVault: 'Admin_Pass_DeleteVault',
  Admin_Pass_DeleteVaultTitle: 'Admin_Pass_DeleteVaultTitle',
  Admin_Pass_DeleteVaultConfirm: 'Admin_Pass_DeleteVaultConfirm',

  // Admin BrightChat
  Admin_Chat_Title: 'Admin_Chat_Title',
  Admin_Chat_ColId: 'Admin_Chat_ColId',
  Admin_Chat_ColParticipants: 'Admin_Chat_ColParticipants',
  Admin_Chat_ColMessages: 'Admin_Chat_ColMessages',
  Admin_Chat_ColLastActivity: 'Admin_Chat_ColLastActivity',
  Admin_Chat_NoConversationsFound: 'Admin_Chat_NoConversationsFound',
  Admin_Chat_MessagesForTemplate: 'Admin_Chat_MessagesForTemplate',
  Admin_Chat_LoadingMessages: 'Admin_Chat_LoadingMessages',
  Admin_Chat_NoMessages: 'Admin_Chat_NoMessages',
  Admin_Chat_ColSender: 'Admin_Chat_ColSender',
  Admin_Chat_ColContent: 'Admin_Chat_ColContent',
  Admin_Chat_ColCreated: 'Admin_Chat_ColCreated',
  Admin_Chat_ColStatus: 'Admin_Chat_ColStatus',
  Admin_Chat_StatusDeleted: 'Admin_Chat_StatusDeleted',
  Admin_Chat_StatusActive: 'Admin_Chat_StatusActive',
  Admin_Chat_DeleteMessage: 'Admin_Chat_DeleteMessage',
  Admin_Chat_DeleteMessageTitle: 'Admin_Chat_DeleteMessageTitle',
  Admin_Chat_DeleteMessageConfirm: 'Admin_Chat_DeleteMessageConfirm',

  // Admin BrightChat Servers
  Admin_ChatServers_Title: 'Admin_ChatServers_Title',
  Admin_ChatServers_TabServers: 'Admin_ChatServers_TabServers',
  Admin_ChatServers_TabChannels: 'Admin_ChatServers_TabChannels',
  Admin_ChatServers_TabMembers: 'Admin_ChatServers_TabMembers',
  Admin_ChatServers_ColName: 'Admin_ChatServers_ColName',
  Admin_ChatServers_ColOwner: 'Admin_ChatServers_ColOwner',
  Admin_ChatServers_ColMembers: 'Admin_ChatServers_ColMembers',
  Admin_ChatServers_ColChannels: 'Admin_ChatServers_ColChannels',
  Admin_ChatServers_ColCreated: 'Admin_ChatServers_ColCreated',
  Admin_ChatServers_ColActions: 'Admin_ChatServers_ColActions',
  Admin_ChatServers_NoServersFound: 'Admin_ChatServers_NoServersFound',
  Admin_ChatServers_DeleteServer: 'Admin_ChatServers_DeleteServer',
  Admin_ChatServers_DeleteServerTitle: 'Admin_ChatServers_DeleteServerTitle',
  Admin_ChatServers_DeleteServerConfirm: 'Admin_ChatServers_DeleteServerConfirm',
  Admin_ChatServers_EditServer: 'Admin_ChatServers_EditServer',
  Admin_ChatServers_EditServerTitle: 'Admin_ChatServers_EditServerTitle',
  Admin_ChatServers_ServerName: 'Admin_ChatServers_ServerName',
  Admin_ChatServers_ServerIcon: 'Admin_ChatServers_ServerIcon',
  Admin_ChatServers_Save: 'Admin_ChatServers_Save',
  Admin_ChatServers_ChannelName: 'Admin_ChatServers_ChannelName',
  Admin_ChatServers_ChannelTopic: 'Admin_ChatServers_ChannelTopic',
  Admin_ChatServers_ChannelVisibility: 'Admin_ChatServers_ChannelVisibility',
  Admin_ChatServers_ChannelMembers: 'Admin_ChatServers_ChannelMembers',
  Admin_ChatServers_NoChannelsFound: 'Admin_ChatServers_NoChannelsFound',
  Admin_ChatServers_DeleteChannel: 'Admin_ChatServers_DeleteChannel',
  Admin_ChatServers_DeleteChannelTitle: 'Admin_ChatServers_DeleteChannelTitle',
  Admin_ChatServers_DeleteChannelConfirm: 'Admin_ChatServers_DeleteChannelConfirm',
  Admin_ChatServers_MemberName: 'Admin_ChatServers_MemberName',
  Admin_ChatServers_MemberRole: 'Admin_ChatServers_MemberRole',
  Admin_ChatServers_MemberJoined: 'Admin_ChatServers_MemberJoined',
  Admin_ChatServers_NoMembersFound: 'Admin_ChatServers_NoMembersFound',
  Admin_ChatServers_RemoveMember: 'Admin_ChatServers_RemoveMember',
  Admin_ChatServers_RemoveMemberTitle: 'Admin_ChatServers_RemoveMemberTitle',
  Admin_ChatServers_RemoveMemberConfirm: 'Admin_ChatServers_RemoveMemberConfirm',
  Admin_ChatServers_ChangeRole: 'Admin_ChatServers_ChangeRole',
  Admin_ChatServers_EncryptedNote: 'Admin_ChatServers_EncryptedNote',
  Admin_ChatServers_FilterByServer: 'Admin_ChatServers_FilterByServer',
  Admin_ChatServers_AllServers: 'Admin_ChatServers_AllServers',
  Admin_Menu_ChatServers: 'Admin_Menu_ChatServers',

  // Admin BrightHub
  Admin_Hub_Title: 'Admin_Hub_Title',
  Admin_Hub_FilterByAuthorId: 'Admin_Hub_FilterByAuthorId',
  Admin_Hub_FilterAllPosts: 'Admin_Hub_FilterAllPosts',
  Admin_Hub_FilterActive: 'Admin_Hub_FilterActive',
  Admin_Hub_FilterDeleted: 'Admin_Hub_FilterDeleted',
  Admin_Hub_ColAuthor: 'Admin_Hub_ColAuthor',
  Admin_Hub_ColContentPreview: 'Admin_Hub_ColContentPreview',
  Admin_Hub_ColCreated: 'Admin_Hub_ColCreated',
  Admin_Hub_ColStatus: 'Admin_Hub_ColStatus',
  Admin_Hub_ColLikes: 'Admin_Hub_ColLikes',
  Admin_Hub_ColReposts: 'Admin_Hub_ColReposts',
  Admin_Hub_ColActions: 'Admin_Hub_ColActions',
  Admin_Hub_StatusDeleted: 'Admin_Hub_StatusDeleted',
  Admin_Hub_StatusActive: 'Admin_Hub_StatusActive',
  Admin_Hub_NoPostsFound: 'Admin_Hub_NoPostsFound',
  Admin_Hub_SoftDeletePost: 'Admin_Hub_SoftDeletePost',
  Admin_Hub_DeletePostTitle: 'Admin_Hub_DeletePostTitle',
  Admin_Hub_DeletePostConfirm: 'Admin_Hub_DeletePostConfirm',

  // Admin BrightMail
  Admin_Mail_Title: 'Admin_Mail_Title',
  Admin_Mail_ColSender: 'Admin_Mail_ColSender',
  Admin_Mail_ColRecipients: 'Admin_Mail_ColRecipients',
  Admin_Mail_ColSubject: 'Admin_Mail_ColSubject',
  Admin_Mail_ColCreated: 'Admin_Mail_ColCreated',
  Admin_Mail_ColDeliveryStatus: 'Admin_Mail_ColDeliveryStatus',
  Admin_Mail_ColActions: 'Admin_Mail_ColActions',
  Admin_Mail_NoEmailsFound: 'Admin_Mail_NoEmailsFound',
  Admin_Mail_DeleteEmail: 'Admin_Mail_DeleteEmail',
  Admin_Mail_DeleteEmailTitle: 'Admin_Mail_DeleteEmailTitle',
  Admin_Mail_DeleteEmailConfirm: 'Admin_Mail_DeleteEmailConfirm',

  // About Page
  About_Title: 'About_Title',
  About_AccessDenied: 'About_AccessDenied',
  About_AccessDeniedDescription: 'About_AccessDeniedDescription',
  About_MasterVersion: 'About_MasterVersion',
  About_BrightChainPackages: 'About_BrightChainPackages',
  About_DigitalDefiancePackages: 'About_DigitalDefiancePackages',
  About_PackageName: 'About_PackageName',
  About_Version: 'About_Version',
} as const;

export const BrightChainStrings: BrandedStringKeys<typeof _brightChainKeys> =
  createI18nStringKeys(BrightChainComponentId, _brightChainKeys);

export type BrightChainStringKey = BrandedStringKeyValue<
  typeof BrightChainStrings
>;

// Alias for consistency with other packages (e.g., NodeEciesStringKeyValue)
export type BrightChainStringKeyValue = BrightChainStringKey;
