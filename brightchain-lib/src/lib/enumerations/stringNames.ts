export enum StringNames {
  // Block Access Errors
  Error_BlockAccessTemplate = 'Error_BlockAccessTemplate',
  Error_BlockAccessErrorBlockAlreadyExists = 'Error_BlockAccessErrorBlockAlreadyExists',
  Error_BlockAccessErrorBlockIsNotPersistable = 'Error_BlockAccessErrorBlockIsNotPersistable',
  Error_BlockAccessErrorBlockIsNotReadable = 'Error_BlockAccessErrorBlockIsNotReadable',
  Error_BlockAccessErrorBlockFileNotFoundTemplate = 'Error_BlockAccessErrorBlockFileNotFoundTemplate',
  Error_BlockAccessCBLCannotBeEncrypted = 'Error_BlockAccessCBLCannotBeEncrypted',
  Error_BlockAccessErrorCreatorMustBeProvided = 'Error_BlockAccessErrorCreatorMustBeProvided',

  // Block Validation Errors
  Error_BlockValidationErrorTemplate = 'Error_BlockValidationErrorTemplate',
  Error_BlockValidationErrorActualDataLengthUnknown = 'Error_BlockValidationErrorActualDataLengthUnknown',
  Error_BlockValidationErrorAddressCountExceedsCapacity = 'Error_BlockValidationErrorAddressCountExceedsCapacity',
  Error_BlockValidationErrorBlockDataNotBuffer = 'Error_BlockValidationErrorBlockDataNotBuffer',
  Error_BlockValidationErrorBlockSizeNegative = 'Error_BlockValidationErrorBlockSizeNegative',
  Error_BlockValidationErrorCreatorIDMismatch = 'Error_BlockValidationErrorCreatorIDMismatch',
  Error_BlockValidationErrorCreatorHasNoPrivateKey = 'Error_BlockValidationErrorCreatorHasNoPrivateKey',
  Error_BlockValidationErrorDataBufferIsTruncated = 'Error_BlockValidationErrorDataBufferIsTruncated',
  Error_BlockValidationErrorDataCannotBeEmpty = 'Error_BlockValidationErrorDataCannotBeEmpty',
  Error_BlockValidationErrorDataLengthExceedsCapacity = 'Error_BlockValidationErrorDataLengthExceedsCapacity',
  Error_BlockValidationErrorDataLengthTooShort = 'Error_BlockValidationErrorDataLengthTooShort',
  Error_BlockValidationErrorDataLengthTooShortForCBLHeader = 'Error_BlockValidationErrorDataLengthTooShortForCBLHeader',
  Error_BlockValidationErrorDataLengthTooShortForEncryptedCBL = 'Error_BlockValidationErrorDataLengthTooShortForEncryptedCBL',
  Error_BlockValidationErrorEphemeralBlockOnlySupportsBufferData = 'Error_BlockValidationErrorEphemeralBlockOnlySupportsBufferData',
  Error_BlockValidationErrorFutureCreationDate = 'Error_BlockValidationErrorFutureCreationDate',
  Error_BlockValidationErrorInvalidAddressLengthTemplate = 'Error_BlockValidationErrorInvalidAddressLengthTemplate',
  Error_BlockValidationErrorInvalidAuthTagLength = 'Error_BlockValidationErrorInvalidAuthTagLength',
  Error_BlockValidationErrorInvalidBlockTypeTemplate = 'Error_BlockValidationErrorInvalidBlockTypeTemplate',
  Error_BlockValidationErrorInvalidCBLAddressCount = 'Error_BlockValidationErrorInvalidCBLAddressCount',
  Error_BlockValidationErrorInvalidCBLDataLength = 'Error_BlockValidationErrorInvalidCBLDataLength',
  Error_BlockValidationErrorInvalidDateCreated = 'Error_BlockValidationErrorInvalidDateCreated',
  Error_BlockValidationErrorInvalidEncryptionHeaderLength = 'Error_BlockValidationErrorInvalidEncryptionHeaderLength',
  Error_BlockValidationErrorInvalidEphemeralPublicKeyLength = 'Error_BlockValidationErrorInvalidEphemeralPublicKeyLength',
  Error_BlockValidationErrorInvalidIVLength = 'Error_BlockValidationErrorInvalidIVLength',
  Error_BlockValidationErrorInvalidSignature = 'Error_BlockValidationErrorInvalidSignature',
  Error_BlockValidationErrorInvalidTupleSizeTemplate = 'Error_BlockValidationErrorInvalidTupleSizeTemplate',
  Error_BlockValidationErrorMethodMustBeImplementedByDerivedClass = 'Error_BlockValidationErrorMethodMustBeImplementedByDerivedClass',
  Error_BlockValidationErrorNoChecksum = 'Error_BlockValidationErrorNoChecksum',
  Error_BlockValidationErrorOriginalDataLengthNegative = 'Error_BlockValidationErrorOriginalDataLengthNegative',
  Error_BlockValidationErrorInvalidRecipientCount = 'Error_BlockValidationErrorInvalidRecipientCount',
  Error_BlockValidationErrorInvalidRecipientIds = 'Error_BlockValidationErrorInvalidRecipientIds',
  Error_BlockValidationErrorInvalidRecipientKeys = 'Error_BlockValidationErrorInvalidRecipientKeys',
  Error_BlockValidationErrorInvalidEncryptionType = 'Error_BlockValidationErrorInvalidEncryptionType',
  Error_BlockValidationErrorInvalidCreator = 'Error_BlockValidationErrorInvalidCreator',
  Error_BlockValidationErrorEncryptionRecipientNotFoundInRecipients = 'Error_BlockValidationErrorEncryptionRecipientNotFoundInRecipients',
  Error_BlockValidationErrorEncryptionRecipientHasNoPrivateKey = 'Error_BlockValidationErrorEncryptionRecipientHasNoPrivateKey',

  // Buffer Errors
  Error_BufferErrorInvalidBufferTypeTemplate = 'Error_BufferErrorInvalidBufferTypeTemplate',

  // Block Metadata Errors
  Error_BlockMetadataTemplate = 'Error_BlockMetadataTemplate',
  Error_BlockMetadataErrorCreatorIdMismatch = 'Error_BlockMetadataErrorCreatorIdMismatch',
  Error_BlockMetadataErrorCreatorRequired = 'Error_BlockMetadataErrorCreatorRequired',
  Error_BlockMetadataErrorEncryptorRequired = 'Error_BlockMetadataErrorEncryptorRequired',
  Error_BlockMetadataErrorInvalidBlockMetadata = 'Error_BlockMetadataErrorInvalidBlockMetadata',
  Error_BlockMetadataErrorInvalidBlockMetadataTemplate = 'Error_BlockMetadataErrorInvalidBlockMetadataTemplate',
  Error_BlockMetadataErrorMetadataRequired = 'Error_BlockMetadataErrorMetadataRequired',
  Error_BlockMetadataErrorMissingRequiredMetadata = 'Error_BlockMetadataErrorMissingRequiredMetadata',

  // Block Operation Errors
  Error_BlockCannotBeDecrypted = 'Error_BlockCannotBeDecrypted',
  Error_BlockCannotBeEncrypted = 'Error_BlockCannotBeEncrypted',
  Error_BlockCapacityTemplate = 'Error_BlockCapacityTemplate',

  // Block Capacity Errors
  Error_BlockCapacityInvalidBlockSize = 'Error_BlockCapacityInvalidBlockSize',
  Error_BlockCapacityInvalidBlockType = 'Error_BlockCapacityInvalidBlockType',
  Error_BlockCapacityCapacityExceeded = 'Error_BlockCapacityCapacityExceeded',
  Error_BlockCapacityInvalidFileName = 'Error_BlockCapacityInvalidFileName',
  Error_BlockCapacityInvalidMimetype = 'Error_BlockCapacityInvalidMimetype',
  Error_BlockCapacityInvalidRecipientCount = 'Error_BlockCapacityInvalidRecipientCount',
  Error_BlockCapacityInvalidExtendedCblData = 'Error_BlockCapacityInvalidExtendedCblData',
  Error_BlockCapacityInvalidEncryptionType = 'Error_BlockCapacityInvalidEncryptionType', // Added

  // Block Service Errors
  Error_BlockServiceErrorBlockWhitenerCountMismatch = 'Error_BlockServiceErrorBlockWhitenerCountMismatch',
  Error_BlockServiceErrorEmptyBlocksArray = 'Error_BlockServiceErrorEmptyBlocksArray',
  Error_BlockServiceErrorBlockSizeMismatch = 'Error_BlockServiceErrorBlockSizeMismatch',
  Error_BlockServiceErrorNoWhiteners = 'Error_BlockServiceErrorNoWhiteners',
  Error_BlockServiceErrorAlreadyInitialized = 'Error_BlockServiceErrorAlreadyInitialized',
  Error_BlockServiceErrorUninitialized = 'Error_BlockServiceErrorUninitialized',
  Error_BlockServiceErrorBlockAlreadyExistsTemplate = 'Error_BlockServiceErrorBlockAlreadyExistsTemplate',
  Error_BlockServiceErrorRecipientRequiredForEncryption = 'Error_BlockServiceErrorRecipientRequiredForEncryption',
  Error_BlockServiceErrorCannotDetermineBlockSize = 'Error_BlockServiceErrorCannotDetermineBlockSize',
  Error_BlockServiceErrorCannotDetermineFileName = 'Error_BlockServiceErrorCannotDetermineFileName',
  Error_BlockServiceErrorCannotDetermineFileLength = 'Error_BlockServiceErrorCannotDetermineFileLength',
  Error_BlockServiceErrorCannotDetermineMimeType = 'Error_BlockServiceErrorCannotDetermineMimeType',
  Error_BlockServiceErrorFilePathNotProvided = 'Error_BlockServiceErrorFilePathNotProvided',
  Error_BlockServiceErrorUnableToDetermineBlockSize = 'Error_BlockServiceErrorUnableToDetermineBlockSize',
  Error_BlockServiceErrorInvalidBlockData = 'Error_BlockServiceErrorInvalidBlockData',
  Error_BlockServiceErrorInvalidBlockType = 'Error_BlockServiceErrorInvalidBlockType',

  // Member Errors
  Error_MemberErrorIncorrectOrInvalidPrivateKey = 'Error_MemberErrorIncorrectOrInvalidPrivateKey',
  Error_MemberErrorInvalidEmail = 'Error_MemberErrorInvalidEmail',
  Error_MemberErrorInvalidEmailWhitespace = 'Error_MemberErrorInvalidEmailWhitespace',
  Error_MemberErrorMemberNotFound = 'Error_MemberErrorMemberNotFound',
  Error_MemberErrorMemberAlreadyExists = 'Error_MemberErrorMemberAlreadyExists',
  Error_MemberErrorInvalidMemberStatus = 'Error_MemberErrorInvalidMemberStatus',
  Error_MemberErrorInvalidMemberName = 'Error_MemberErrorInvalidMemberName',
  Error_MemberErrorInvalidMemberNameWhitespace = 'Error_MemberErrorInvalidMemberNameWhitespace',
  Error_MemberErrorInvalidMnemonic = 'Error_MemberErrorInvalidMnemonic',
  Error_MemberErrorMissingEmail = 'Error_MemberErrorMissingEmail',
  Error_MemberErrorMissingMemberName = 'Error_MemberErrorMissingMemberName',
  Error_MemberErrorMissingVotingPrivateKey = 'Error_MemberErrorMissingVotingPrivateKey',
  Error_MemberErrorMissingVotingPublicKey = 'Error_MemberErrorMissingVotingPublicKey',
  Error_MemberErrorMissingPrivateKey = 'Error_MemberErrorMissingPrivateKey',
  Error_MemberErrorNoWallet = 'Error_MemberErrorNoWallet',
  Error_MemberErrorPrivateKeyRequiredToDeriveVotingKeyPair = 'Error_MemberErrorPrivateKeyRequiredToDeriveVotingKeyPair',
  Error_MemberErrorWalletAlreadyLoaded = 'Error_MemberErrorWalletAlreadyLoaded',
  Error_MemberErrorInsufficientRandomBlocks = 'Error_MemberErrorInsufficientRandomBlocks',
  Error_MemberErrorFailedToCreateMemberBlocks = 'Error_MemberErrorFailedToCreateMemberBlocks',
  Error_MemberErrorFailedToHydrateMember = 'Error_MemberErrorFailedToHydrateMember',
  Error_MemberErrorInvalidMemberData = 'Error_MemberErrorInvalidMemberData',
  Error_MemberErrorFailedToConvertMemberData = 'Error_MemberErrorFailedToConvertMemberData',
  Error_MemberErrorInvalidMemberBlocks = 'Error_MemberErrorInvalidMemberBlocks',

  // Voting Derivation Errors
  Error_VotingDerivationErrorFailedToGeneratePrime = 'Error_VotingDerivationErrorFailedToGeneratePrime',
  Error_VotingDerivationErrorIdenticalPrimes = 'Error_VotingDerivationErrorIdenticalPrimes',
  Error_VotingDerivationErrorKeyPairTooSmallTemplate = 'Error_VotingDerivationErrorKeyPairTooSmallTemplate',
  Error_VotingDerivationErrorKeyPairValidationFailed = 'Error_VotingDerivationErrorKeyPairValidationFailed',
  Error_VotingDerivationErrorModularInverseDoesNotExist = 'Error_VotingDerivationErrorModularInverseDoesNotExist',
  Error_VotingDerivationErrorPrivateKeyMustBeBuffer = 'Error_VotingDerivationErrorPrivateKeyMustBeBuffer',
  Error_VotingDerivationErrorPublicKeyMustBeBuffer = 'Error_VotingDerivationErrorPublicKeyMustBeBuffer',
  Error_VotingDerivationErrorInvalidPublicKeyFormat = 'Error_VotingDerivationErrorInvalidPublicKeyFormat',
  Error_VotingDerivationErrorInvalidEcdhKeyPair = 'Error_VotingDerivationErrorInvalidEcdhKeyPair',
  Error_VotingDerivationErrorFailedToDeriveVotingKeysTemplate = 'Error_VotingDerivationErrorFailedToDeriveVotingKeysTemplate',

  // Voting Errors
  Error_VotingErrorInvalidKeyPairPublicKeyNotIsolated = 'Error_VotingErrorInvalidKeyPairPublicKeyNotIsolated',
  Error_VotingErrorInvalidKeyPairPrivateKeyNotIsolated = 'Error_VotingErrorInvalidKeyPairPrivateKeyNotIsolated',
  Error_VotingErrorInvalidPublicKeyNotIsolated = 'Error_VotingErrorInvalidPublicKeyNotIsolated',
  Error_VotingErrorInvalidPublicKeyBufferTooShort = 'Error_VotingErrorInvalidPublicKeyBufferTooShort',
  Error_VotingErrorInvalidPublicKeyBufferWrongMagic = 'Error_VotingErrorInvalidPublicKeyBufferWrongMagic',
  Error_VotingErrorUnsupportedPublicKeyVersion = 'Error_VotingErrorUnsupportedPublicKeyVersion',
  Error_VotingErrorInvalidPublicKeyBufferIncompleteN = 'Error_VotingErrorInvalidPublicKeyBufferIncompleteN',
  Error_VotingErrorInvalidPublicKeyBufferFailedToParseNTemplate = 'Error_VotingErrorInvalidPublicKeyBufferFailedToParseNTemplate',
  Error_VotingErrorInvalidPublicKeyIdMismatch = 'Error_VotingErrorInvalidPublicKeyIdMismatch',
  Error_VotingErrorModularInverseDoesNotExist = 'Error_VotingErrorModularInverseDoesNotExist',
  Error_VotingErrorPrivateKeyMustBeBuffer = 'Error_VotingErrorPrivateKeyMustBeBuffer',
  Error_VotingErrorPublicKeyMustBeBuffer = 'Error_VotingErrorPublicKeyMustBeBuffer',
  Error_VotingErrorInvalidPublicKeyFormat = 'Error_VotingErrorInvalidPublicKeyFormat',
  Error_VotingErrorInvalidEcdhKeyPair = 'Error_VotingErrorInvalidEcdhKeyPair',
  Error_VotingErrorFailedToDeriveVotingKeysTemplate = 'Error_VotingErrorFailedToDeriveVotingKeysTemplate',
  Error_VotingErrorFailedToGeneratePrime = 'Error_VotingErrorFailedToGeneratePrime',
  Error_VotingErrorIdenticalPrimes = 'Error_VotingErrorIdenticalPrimes',
  Error_VotingErrorKeyPairTooSmallTemplate = 'Error_VotingErrorKeyPairTooSmallTemplate',
  Error_VotingErrorKeyPairValidationFailed = 'Error_VotingErrorKeyPairValidationFailed',
  Error_VotingErrorInvalidVotingKey = 'Error_VotingErrorInvalidVotingKey',
  Error_VotingErrorInvalidKeyPair = 'Error_VotingErrorInvalidKeyPair',
  Error_VotingErrorInvalidPublicKey = 'Error_VotingErrorInvalidPublicKey',
  Error_VotingErrorInvalidPrivateKey = 'Error_VotingErrorInvalidPrivateKey',
  Error_VotingErrorInvalidEncryptedKey = 'Error_VotingErrorInvalidEncryptedKey',
  Error_VotingErrorInvalidPrivateKeyBufferTooShort = 'Error_VotingErrorInvalidPrivateKeyBufferTooShort',
  Error_VotingErrorInvalidPrivateKeyBufferWrongMagic = 'Error_VotingErrorInvalidPrivateKeyBufferWrongMagic',
  Error_VotingErrorUnsupportedPrivateKeyVersion = 'Error_VotingErrorUnsupportedPrivateKeyVersion',
  Error_VotingErrorInvalidPrivateKeyBufferIncompleteLambda = 'Error_VotingErrorInvalidPrivateKeyBufferIncompleteLambda',
  Error_VotingErrorInvalidPrivateKeyBufferIncompleteMuLength = 'Error_VotingErrorInvalidPrivateKeyBufferIncompleteMuLength',
  Error_VotingErrorInvalidPrivateKeyBufferIncompleteMu = 'Error_VotingErrorInvalidPrivateKeyBufferIncompleteMu',
  Error_VotingErrorInvalidPrivateKeyBufferFailedToParse = 'Error_VotingErrorInvalidPrivateKeyBufferFailedToParse',
  Error_VotingErrorInvalidPrivateKeyBufferFailedToCreate = 'Error_VotingErrorInvalidPrivateKeyBufferFailedToCreate',

  // FEC Errors
  Error_FecErrorDataRequired = 'Error_FecErrorDataRequired',
  Error_FecErrorInputBlockRequired = 'Error_FecErrorInputBlockRequired',
  Error_FecErrorDamagedBlockRequired = 'Error_FecErrorDamagedBlockRequired',
  Error_FecErrorParityBlocksRequired = 'Error_FecErrorParityBlocksRequired',
  Error_FecErrorInvalidParityBlockSizeTemplate = 'Error_FecErrorInvalidParityBlockSizeTemplate',
  Error_FecErrorInvalidRecoveredBlockSizeTemplate = 'Error_FecErrorInvalidRecoveredBlockSizeTemplate',
  Error_FecErrorInvalidShardCounts = 'Error_FecErrorInvalidShardCounts',
  Error_FecErrorInvalidShardsAvailableArray = 'Error_FecErrorInvalidShardsAvailableArray',
  Error_FecErrorParityBlockCountMustBePositive = 'Error_FecErrorParityBlockCountMustBePositive',
  Error_FecErrorInputDataMustBeBuffer = 'Error_FecErrorInputDataMustBeBuffer',
  Error_FecErrorBlockSizeMismatch = 'Error_FecErrorBlockSizeMismatch',
  Error_FecErrorDamagedBlockDataMustBeBuffer = 'Error_FecErrorDamagedBlockDataMustBeBuffer',
  Error_FecErrorParityBlockDataMustBeBuffer = 'Error_FecErrorParityBlockDataMustBeBuffer',
  Error_FecErrorInvalidDataLengthTemplate = 'Error_FecErrorInvalidDataLengthTemplate',
  Error_FecErrorShardSizeExceedsMaximumTemplate = 'Error_FecErrorShardSizeExceedsMaximumTemplate',
  Error_FecErrorNotEnoughShardsAvailableTemplate = 'Error_FecErrorNotEnoughShardsAvailableTemplate',
  Error_FecErrorFecEncodingFailedTemplate = 'Error_FecErrorFecEncodingFailedTemplate',
  Error_FecErrorFecDecodingFailedTemplate = 'Error_FecErrorFecDecodingFailedTemplate',

  // ECIES Errors
  Error_EciesErrorInvalidMnemonic = 'Error_EciesErrorInvalidMnemonic',
  Error_EciesErrorInvalidEphemeralPublicKey = 'Error_EciesErrorInvalidEphemeralPublicKey',
  Error_EciesErrorInvalidSenderPublicKey = 'Error_EciesErrorInvalidSenderPublicKey',
  Error_EciesErrorInvalidEncryptedDataLength = 'Error_EciesErrorInvalidEncryptedDataLength',
  Error_EciesErrorInvalidHeaderLength = 'Error_EciesErrorInvalidHeaderLength',
  Error_EciesErrorMessageLengthMismatch = 'Error_EciesErrorMessageLengthMismatch',
  Error_EciesErrorInvalidEncryptedKeyLength = 'Error_EciesErrorInvalidEncryptedKeyLength',
  Error_EciesErrorRecipientNotFound = 'Error_EciesErrorRecipientNotFound',
  Error_EciesErrorInvalidSignature = 'Error_EciesErrorInvalidSignature',
  Error_EciesErrorTooManyRecipients = 'Error_EciesErrorTooManyRecipients',
  Error_EciesErrorPrivateKeyNotLoaded = 'Error_EciesErrorPrivateKeyNotLoaded',
  Error_EciesErrorRecipientKeyCountMismatch = 'Error_EciesErrorRecipientKeyCountMismatch',
  Error_EciesErrorInvalidIVLength = 'Error_EciesErrorInvalidIVLength',
  Error_EciesErrorInvalidAuthTagLength = 'Error_EciesErrorInvalidAuthTagLength',
  Error_EciesErrorInvalidRecipientCount = 'Error_EciesErrorInvalidRecipientCount',
  Error_EciesErrorFileSizeTooLarge = 'Error_EciesErrorFileSizeTooLarge',
  Error_EciesErrorInvalidDataLength = 'Error_EciesErrorInvalidDataLength',
  Error_EciesErrorInvalidBlockType = 'Error_EciesErrorInvalidBlockType',
  Error_EciesErrorInvalidMessageCrc = 'Error_EciesErrorInvalidMessageCrc',
  Error_EciesErrorDecryptionFailed = 'Error_EciesErrorDecryptionFailed', // Added
  Error_EciesErrorInvalidRecipientPublicKey = 'Error_EciesErrorInvalidRecipientPublicKey', // Added
  Error_EciesErrorSecretComputationFailed = 'Error_EciesErrorSecretComputationFailed', // Added

  // Store Errors
  Error_StoreErrorInvalidBlockMetadataTemplate = 'Error_StoreErrorInvalidBlockMetadataTemplate',
  Error_StoreErrorKeyNotFoundTemplate = 'Error_StoreErrorKeyNotFoundTemplate',
  Error_StoreErrorStorePathRequired = 'Error_StoreErrorStorePathRequired',
  Error_StoreErrorStorePathNotFound = 'Error_StoreErrorStorePathNotFound',
  Error_StoreErrorBlockSizeRequired = 'Error_StoreErrorBlockSizeRequired',
  Error_StoreErrorBlockIdRequired = 'Error_StoreErrorBlockIdRequired',
  Error_StoreErrorInvalidBlockIdTooShort = 'Error_StoreErrorInvalidBlockIdTooShort',
  Error_StoreErrorBlockFileSizeMismatch = 'Error_StoreErrorBlockFileSizeMismatch',
  Error_StoreErrorBlockValidationFailed = 'Error_StoreErrorBlockValidationFailed',
  Error_StoreErrorBlockPathAlreadyExistsTemplate = 'Error_StoreErrorBlockPathAlreadyExistsTemplate',
  Error_StoreErrorNoBlocksProvided = 'Error_StoreErrorNoBlocksProvided',
  Error_StoreErrorCannotStoreEphemeralData = 'Error_StoreErrorCannotStoreEphemeralData',
  Error_StoreErrorBlockIdMismatchTemplate = 'Error_StoreErrorBlockIdMismatchTemplate',
  Error_StoreErrorBlockSizeMismatch = 'Error_StoreErrorBlockSizeMismatch',
  Error_StoreErrorBlockDirectoryCreationFailedTemplate = 'Error_StoreErrorBlockDirectoryCreationFailedTemplate',
  Error_StoreErrorBlockDeletionFailedTemplate = 'Error_StoreErrorBlockDeletionFailedTemplate',

  // Secure Storage Errors
  Error_SecureStorageDecryptedValueLengthMismatch = 'Error_SecureStorageDecryptedValueLengthMismatch',
  Error_SecureStorageDecryptedValueChecksumMismatch = 'Error_SecureStorageDecryptedValueChecksumMismatch',

  // Sealing Errors
  Error_SealingErrorMissingPrivateKeys = 'Error_SealingErrorMissingPrivateKeys',
  Error_SealingErrorMemberNotFound = 'Error_SealingErrorMemberNotFound',
  Error_SealingErrorTooManyMembersToUnlock = 'Error_SealingErrorTooManyMembersToUnlock',
  Error_SealingErrorNotEnoughMembersToUnlock = 'Error_SealingErrorNotEnoughMembersToUnlock',
  Error_SealingErrorEncryptedShareNotFound = 'Error_SealingErrorEncryptedShareNotFound',
  Error_SealingErrorInvalidBitRange = 'Error_SealingErrorInvalidBitRange',
  Error_SealingErrorInvalidMemberArray = 'Error_SealingErrorInvalidMemberArray',
  Error_SealingErrorFailedToSealTemplate = 'Error_SealingErrorFailedToSealTemplate',

  // CBL Errors
  Error_CblErrorBlockNotReadable = 'Error_CblErrorBlockNotReadable',
  Error_CblErrorCblRequired = 'Error_CblErrorCblRequired',
  Error_CblErrorWhitenedBlockFunctionRequired = 'Error_CblErrorWhitenedBlockFunctionRequired',
  Error_CblErrorFailedToLoadBlock = 'Error_CblErrorFailedToLoadBlock',
  Error_CblErrorExpectedEncryptedDataBlock = 'Error_CblErrorExpectedEncryptedDataBlock',
  Error_CblErrorExpectedOwnedDataBlock = 'Error_CblErrorExpectedOwnedDataBlock',
  Error_CblErrorInvalidStructure = 'Error_CblErrorInvalidStructure',
  Error_CblErrorCreatorUndefined = 'Error_CblErrorCreatorUndefined',
  Error_CblErrorCreatorRequiredForSignature = 'Error_CblErrorCreatorRequiredForSignature',
  Error_CblErrorFileNameRequired = 'Error_CblErrorFileNameRequired',
  Error_CblErrorFileNameEmpty = 'Error_CblErrorFileNameEmpty',
  Error_CblErrorFileNameWhitespace = 'Error_CblErrorFileNameWhitespace',
  Error_CblErrorFileNameInvalidChar = 'Error_CblErrorFileNameInvalidChar',
  Error_CblErrorFileNameControlChars = 'Error_CblErrorFileNameControlChars',
  Error_CblErrorFileNamePathTraversal = 'Error_CblErrorFileNamePathTraversal',
  Error_CblErrorMimeTypeRequired = 'Error_CblErrorMimeTypeRequired',
  Error_CblErrorMimeTypeEmpty = 'Error_CblErrorMimeTypeEmpty',
  Error_CblErrorMimeTypeWhitespace = 'Error_CblErrorMimeTypeWhitespace',
  Error_CblErrorMimeTypeLowercase = 'Error_CblErrorMimeTypeLowercase',
  Error_CblErrorMimeTypeInvalidFormat = 'Error_CblErrorMimeTypeInvalidFormat',
  Error_CblErrorInvalidBlockSize = 'Error_CblErrorInvalidBlockSize',
  Error_CblErrorMetadataSizeExceeded = 'Error_CblErrorMetadataSizeExceeded',
  Error_CblErrorMetadataSizeNegative = 'Error_CblErrorMetadataSizeNegative',
  Error_CblErrorInvalidMetadataBuffer = 'Error_CblErrorInvalidMetadataBuffer',
  Error_CblErrorCreationFailedTemplate = 'Error_CblErrorCreationFailedTemplate',
  Error_CblErrorInsufficientCapacityTemplate = 'Error_CblErrorInsufficientCapacityTemplate',
  Error_CblErrorNotExtendedCbl = 'Error_CblErrorNotExtendedCbl',
  Error_CblErrorInvalidSignature = 'Error_CblErrorInvalidSignature',
  Error_CblErrorFileSizeTooLarge = 'Error_CblErrorFileSizeTooLarge',
  Error_CblErrorFileSizeTooLargeForNode = 'Error_CblErrorFileSizeTooLargeForNode',
  Error_CblErrorInvalidTupleSize = 'Error_CblErrorInvalidTupleSize',
  Error_CblErrorFileNameTooLong = 'Error_CblErrorFileNameTooLong',
  Error_CblErrorMimeTypeTooLong = 'Error_CblErrorMimeTypeTooLong',
  Error_CblErrorAddressCountExceedsCapacity = 'Error_CblErrorAddressCountExceedsCapacity',
  Error_CblErrorCblEncrypted = 'Error_CblErrorCblEncrypted',
  Error_CblErrorUserRequiredForDecryption = 'Error_CblErrorUserRequiredForDecryption',

  // Multi-Encrypted Errors
  Error_MultiEncryptedErrorInvalidEphemeralPublicKeyLength = 'Error_MultiEncryptedErrorInvalidEphemeralPublicKeyLength',
  Error_MultiEncryptedErrorDataLengthExceedsCapacity = 'Error_MultiEncryptedErrorDataLengthExceedsCapacity',
  Error_MultiEncryptedErrorBlockNotReadable = 'Error_MultiEncryptedErrorBlockNotReadable',
  Error_MultiEncryptedErrorDataTooShort = 'Error_MultiEncryptedErrorDataTooShort',
  Error_MultiEncryptedErrorCreatorMustBeMember = 'Error_MultiEncryptedErrorCreatorMustBeMember',
  Error_MultiEncryptedErrorInvalidIVLength = 'Error_MultiEncryptedErrorInvalidIVLength',
  Error_MultiEncryptedErrorInvalidAuthTagLength = 'Error_MultiEncryptedErrorInvalidAuthTagLength',
  Error_MultiEncryptedErrorChecksumMismatch = 'Error_MultiEncryptedErrorChecksumMismatch',
  Error_MultiEncryptedErrorRecipientMismatch = 'Error_MultiEncryptedErrorRecipientMismatch',
  Error_MultiEncryptedErrorRecipientsAlreadyLoaded = 'Error_MultiEncryptedErrorRecipientsAlreadyLoaded',

  // Block Errors
  Error_BlockErrorCreatorRequired = 'Error_BlockErrorCreatorRequired',
  Error_BlockErrorDataLengthExceedsCapacity = 'Error_BlockErrorDataLengthExceedsCapacity',
  Error_BlockErrorDataRequired = 'Error_BlockErrorDataRequired',
  Error_BlockErrorActualDataLengthExceedsDataLength = 'Error_BlockErrorActualDataLengthExceedsDataLength',
  Error_BlockErrorActualDataLengthNegative = 'Error_BlockErrorActualDataLengthNegative',
  Error_BlockErrorCreatorRequiredForEncryption = 'Error_BlockErrorCreatorRequiredForEncryption',
  Error_BlockErrorUnexpectedEncryptedBlockType = 'Error_BlockErrorUnexpectedEncryptedBlockType',
  Error_BlockErrorCannotEncrypt = 'Error_BlockErrorCannotEncrypt',
  Error_BlockErrorCannotDecrypt = 'Error_BlockErrorCannotDecrypt',
  Error_BlockErrorCreatorPrivateKeyRequired = 'Error_BlockErrorCreatorPrivateKeyRequired',
  Error_BlockErrorInvalidMultiEncryptionRecipientCount = 'Error_BlockErrorInvalidMultiEncryptionRecipientCount',
  Error_BlockErrorInvalidNewBlockType = 'Error_BlockErrorInvalidNewBlockType',
  Error_BlockErrorUnexpectedEphemeralBlockType = 'Error_BlockErrorUnexpectedEphemeralBlockType',
  Error_BlockErrorRecipientRequired = 'Error_BlockErrorRecipientRequired',
  Error_BlockErrorRecipientKeyRequired = 'Error_BlockErrorRecipientKeyRequired',

  // Whitened Errors
  Error_WhitenedErrorBlockNotReadable = 'Error_WhitenedErrorBlockNotReadable',
  Error_WhitenedErrorBlockSizeMismatch = 'Error_WhitenedErrorBlockSizeMismatch',
  Error_WhitenedErrorDataLengthMismatch = 'Error_WhitenedErrorDataLengthMismatch',
  Error_WhitenedErrorInvalidBlockSize = 'Error_WhitenedErrorInvalidBlockSize',

  // Tuple Errors
  Error_TupleErrorInvalidTupleSize = 'Error_TupleErrorInvalidTupleSize',
  Error_TupleErrorBlockSizeMismatch = 'Error_TupleErrorBlockSizeMismatch',
  Error_TupleErrorNoBlocksToXor = 'Error_TupleErrorNoBlocksToXor',
  Error_TupleErrorInvalidBlockCount = 'Error_TupleErrorInvalidBlockCount',
  Error_TupleErrorInvalidBlockType = 'Error_TupleErrorInvalidBlockType',
  Error_TupleErrorInvalidSourceLength = 'Error_TupleErrorInvalidSourceLength',
  Error_TupleErrorRandomBlockGenerationFailed = 'Error_TupleErrorRandomBlockGenerationFailed',
  Error_TupleErrorWhiteningBlockGenerationFailed = 'Error_TupleErrorWhiteningBlockGenerationFailed',
  Error_TupleErrorMissingParameters = 'Error_TupleErrorMissingParameters',
  Error_TupleErrorXorOperationFailedTemplate = 'Error_TupleErrorXorOperationFailedTemplate',
  Error_TupleErrorDataStreamProcessingFailedTemplate = 'Error_TupleErrorDataStreamProcessingFailedTemplate',
  Error_TupleErrorEncryptedDataStreamProcessingFailedTemplate = 'Error_TupleErrorEncryptedDataStreamProcessingFailedTemplate',

  // Memory Tuple Errors
  Error_MemoryTupleErrorInvalidTupleSizeTemplate = 'Error_MemoryTupleErrorInvalidTupleSizeTemplate',
  Error_MemoryTupleErrorBlockSizeMismatch = 'Error_MemoryTupleErrorBlockSizeMismatch',
  Error_MemoryTupleErrorNoBlocksToXor = 'Error_MemoryTupleErrorNoBlocksToXor',
  Error_MemoryTupleErrorInvalidBlockCount = 'Error_MemoryTupleErrorInvalidBlockCount',
  Error_MemoryTupleErrorExpectedBlockIdsTemplate = 'Error_MemoryTupleErrorExpectedBlockIdsTemplate',
  Error_MemoryTupleErrorExpectedBlocksTemplate = 'Error_MemoryTupleErrorExpectedBlocksTemplate',

  // Handle Tuple Errors
  Error_HandleTupleErrorInvalidTupleSizeTemplate = 'Error_HandleTupleErrorInvalidTupleSizeTemplate',
  Error_HandleTupleErrorBlockSizeMismatch = 'Error_HandleTupleErrorBlockSizeMismatch',
  Error_HandleTupleErrorNoBlocksToXor = 'Error_HandleTupleErrorNoBlocksToXor',
  Error_HandleTupleErrorBlockSizesMustMatch = 'Error_HandleTupleErrorBlockSizesMustMatch',

  // Stream Errors
  Error_StreamErrorBlockSizeRequired = 'Error_StreamErrorBlockSizeRequired',
  Error_StreamErrorWhitenedBlockSourceRequired = 'Error_StreamErrorWhitenedBlockSourceRequired',
  Error_StreamErrorRandomBlockSourceRequired = 'Error_StreamErrorRandomBlockSourceRequired',
  Error_StreamErrorInputMustBeBuffer = 'Error_StreamErrorInputMustBeBuffer',
  Error_StreamErrorFailedToGetRandomBlock = 'Error_StreamErrorFailedToGetRandomBlock',
  Error_StreamErrorFailedToGetWhiteningBlock = 'Error_StreamErrorFailedToGetWhiteningBlock',
  Error_StreamErrorIncompleteEncryptedBlock = 'Error_StreamErrorIncompleteEncryptedBlock',

  // Other Errors
  Error_ChecksumMismatchTemplate = 'Error_ChecksumMismatchTemplate',
  Error_FailedToHydrateTemplate = 'Error_FailedToHydrateTemplate',
  Error_FailedToSerializeTemplate = 'Error_FailedToSerializeTemplate',
  Error_InvalidBlockSizeTemplate = 'Error_InvalidBlockSizeTemplate',
  Error_InvalidChecksum = 'Error_InvalidChecksum',
  Error_InvalidCreator = 'Error_InvalidCreator',
  Error_InvalidCredentials = 'Error_InvalidCredentials',
  Error_InvalidEmail = 'Error_InvalidEmail',
  Error_InvalidEmailMissing = 'Error_InvalidEmailMissing',
  Error_InvalidEmailWhitespace = 'Error_InvalidEmailWhitespace',
  Error_InvalidGuid = 'Error_InvalidGuid',
  Error_InvalidGuidTemplate = 'Error_InvalidGuidTemplate',
  Error_InvalidGuidUnknownBrandTemplate = 'Error_InvalidGuidUnknownBrandTemplate',
  Error_InvalidGuidUnknownLengthTemplate = 'Error_InvalidGuidUnknownLengthTemplate',
  Error_InvalidIDFormat = 'Error_InvalidIDFormat',
  Error_InvalidLanguageCode = 'Error_InvalidLanguageCode',
  Error_InvalidTupleCountTemplate = 'Error_InvalidTupleCountTemplate',
  Error_InvalidReferences = 'Error_InvalidReferences',
  Error_InvalidSessionID = 'Error_InvalidSessionID',
  Error_InvalidSignature = 'Error_InvalidSignature',
  Error_MetadataMismatch = 'Error_MetadataMismatch',
  Error_TokenExpired = 'Error_TokenExpired',
  Error_TokenInvalid = 'Error_TokenInvalid',
  Error_UnexpectedError = 'Error_UnexpectedError',
  Error_UserNotFound = 'Error_UserNotFound',
  Error_ValidationError = 'Error_ValidationError',
  Error_InsufficientCapacity = 'Error_InsufficientCapacity',
  Error_NotImplemented = 'Error_NotImplemented',

  // Block Sizes
  BlockSize_Unknown = 'BlockSize_Unknown',
  BlockSize_Message = 'BlockSize_Message',
  BlockSize_Tiny = 'BlockSize_Tiny',
  BlockSize_Small = 'BlockSize_Small',
  BlockSize_Medium = 'BlockSize_Medium',
  BlockSize_Large = 'BlockSize_Large',
  BlockSize_Huge = 'BlockSize_Huge',

  // UI Strings
  ChangePassword_Success = 'ChangePassword_Success',
  Common_ChangePassword = 'Common_ChangePassword',
  Common_Dashboard = 'Common_Dashboard',
  Common_Logo = 'Common_Logo',
  Common_Site = 'Common_Site',
  Common_Unauthorized = 'Common_Unauthorized',
  ForgotPassword_Title = 'ForgotPassword_Title',
  LanguageUpdate_Success = 'LanguageUpdate_Success',
  Login_LoginButton = 'Login_LoginButton',
  LogoutButton = 'LogoutButton',
  Register_Button = 'Register_Button',
  Register_Error = 'Register_Error',
  Register_Success = 'Register_Success',
  Validation_InvalidLanguage = 'Validation_InvalidLanguage',

  // Document Errors
  Error_DocumentErrorInvalidValueTemplate = 'Error_DocumentErrorInvalidValueTemplate',
  Error_DocumentErrorFieldRequiredTemplate = 'Error_DocumentErrorFieldRequiredTemplate',
  Error_DocumentErrorAlreadyInitialized = 'Error_DocumentErrorAlreadyInitialized',
  Error_DocumentErrorUninitialized = 'Error_DocumentErrorUninitialized',

  // Isolated Key Errors
  Error_IsolatedKeyErrorInvalidPublicKey = 'Error_IsolatedKeyErrorInvalidPublicKey',
  Error_IsolatedKeyErrorInvalidKeyId = 'Error_IsolatedKeyErrorInvalidKeyId',
  Error_IsolatedKeyErrorInvalidKeyFormat = 'Error_IsolatedKeyErrorInvalidKeyFormat',
  Error_IsolatedKeyErrorInvalidKeyLength = 'Error_IsolatedKeyErrorInvalidKeyLength',
  Error_IsolatedKeyErrorInvalidKeyType = 'Error_IsolatedKeyErrorInvalidKeyType',
  Error_IsolatedKeyErrorKeyIsolationViolation = 'Error_IsolatedKeyErrorKeyIsolationViolation',

  // PBKDF2 Errors
  Error_Pbkdf2InvalidSaltLength = 'Error_Pbkdf2InvalidSaltLength',
  Error_Pbkdf2InvalidHashLength = 'Error_Pbkdf2InvalidHashLength',

  // Quorum Errors
  Error_QuorumErrorInvalidQuorumId = 'Error_QuorumErrorInvalidQuorumId',
  Error_QuorumErrorDocumentNotFound = 'Error_QuorumErrorDocumentNotFound',
  Error_QuorumErrorUnableToRestoreDocument = 'Error_QuorumErrorUnableToRestoreDocument',
  Error_QuorumErrorNotImplemented = 'Error_QuorumErrorNotImplemented',
  Error_QuorumErrorUninitialized = 'Error_QuorumErrorUninitialized',

  // System Keyring Errors
  Error_SystemKeyringErrorKeyNotFoundTemplate = 'Error_SystemKeyringErrorKeyNotFoundTemplate',
  Error_SystemKeyringErrorRateLimitExceeded = 'Error_SystemKeyringErrorRateLimitExceeded',

  // Symmetric Encryption Errors
  Error_SymmetricDataNullOrUndefined = 'Error_SymmetricDataNullOrUndefined',
  Error_SymmetricInvalidKeyLengthTemplate = 'Error_SymmetricInvalidKeyLengthTemplate',

  // Member Encryption Errors
  Error_MemberErrorMissingEncryptionData = 'Error_MemberErrorMissingEncryptionData',
  Error_MemberErrorEncryptionDataTooLarge = 'Error_MemberErrorEncryptionDataTooLarge',
  Error_MemberErrorInvalidEncryptionData = 'Error_MemberErrorInvalidEncryptionData',
}

export default StringNames;
