export enum StringNames {
  ChangePassword_Success = 'changePassword_success',
  Common_ChangePassword = 'common_changePassword',
  Common_Dashboard = 'common_dashboard',
  Common_Logo = 'common_logo',
  Common_Site = 'common_site',
  Common_Unauthorized = 'common_unauthorized',
  Error_BlockAccessTemplate = 'error_blockAccessTemplate',
  Error_BlockAccessErrorBlockAlreadyExists = 'error_blockAccessErrorBlockAlreadyExists',
  Error_BlockAccessErrorBlockFileNotFoundTemplate = 'error_blockAccessErrorBlockFileNotFoundTemplate',
  Error_BlockAccessErrorBlockIsNotPersistable = 'error_blockAccessErrorBlockIsNotPersistable',
  Error_BlockAccessErrorBlockIsNotReadable = 'error_blockAccessErrorBlockIsNotReadable',
  Error_BlockAccessCBLCannotBeEncrypted = 'error_blockAccessCBLCannotBeEncrypted',
  Error_BlockCannotBeDecrypted = 'error_blockCannotBeDecrypted',
  Error_BlockCannotBeEncrypted = 'error_blockCannotBeEncrypted',
  Error_BlockCapacityTemplate = 'error_blockCapacityTemplate',
  Error_BlockMetadataErrorCreatorRequired = 'error_blockMetadataErrorCreatorRequired',
  Error_BlockMetadataErrorEncryptorRequired = 'error_blockMetadataErrorEncryptorRequired',
  Error_BlockMetadataErrorInvalidBlockMetadata = 'error_blockMetadataErrorInvalidBlockMetadata',
  Error_BlockMetadataErrorInvalidBlockMetadataTemplate = 'error_blockMetadataErrorInvalidBlockMetadataTemplate',
  Error_BlockMetadataErrorMetadataRequired = 'error_blockMetadataErrorMetadataRequired',
  Error_BlockMetadataErrorMissingRequiredMetadata = 'error_blockMetadataErrorMissingRequiredMetadata',
  Error_BlockMetadataTemplate = 'error_blockMetadataTemplate',
  Error_BlockAccessErrorCreatorMustBeProvided = 'error_blockAccessErrorCreatorMustBeProvided',
  Error_BlockValidationErrorActualDataLengthUnknown = 'error_blockValidationErrorActualDataLengthUnknown',
  Error_BlockValidationErrorAddressCountExceedsCapacity = 'error_blockValidationErrorAddressCountExceedsCapacity',
  Error_BlockValidationErrorBlockDataNotBuffer = 'error_blockValidationErrorBlockDataNotBuffer',
  Error_BlockValidationErrorBlockSizeNegative = 'error_blockValidationErrorBlockSizeNegative',
  Error_BlockValidationErrorCreatorIDMismatch = 'error_blockValidationErrorCreatorIDMismatch',
  Error_BlockValidationErrorDataCannotBeEmpty = 'error_blockValidationErrorDataCannotBeEmpty',
  Error_BlockValidationErrorDataBufferIsTruncated = 'error_blockValidationErrorDataBufferIsTruncated',
  Error_BlockValidationErrorDataLengthExceedsCapacity = 'error_blockValidationErrorDataLengthExceedsCapacity',
  Error_BlockValidationErrorDataLengthTooShort = 'error_blockValidationErrorDataLengthTooShort',
  Error_BlockValidationErrorDataLengthTooShortForCBLHeader = 'error_blockValidationErrorDataLengthTooShortForCBLHeader',
  Error_BlockValidationErrorDataLengthTooShortForEncryptedCBL = 'error_blockValidationErrorDataLengthTooShortForEncryptedCBL',
  Error_BlockValidationErrorEphemeralBlockOnlySupportsBufferData = 'error_blockValidationErrorEphemeralBlockOnlySupportsBufferData',
  Error_BlockValidationErrorFutureCreationDate = 'error_blockValidationErrorFutureCreationDate',
  Error_BlockValidationErrorInvalidAddressLengthTemplate = 'error_blockValidationErrorInvalidAddressLengthTemplate',
  Error_BlockValidationErrorInvalidAuthTagLength = 'error_blockValidationErrorInvalidAuthTagLength',
  Error_BlockValidationErrorInvalidBlockTypeTemplate = 'error_blockValidationErrorInvalidBlockTypeTemplate',
  Error_BlockValidationErrorInvalidCBLAddressCount = 'error_blockValidationErrorInvalidCBLAddressCount',
  Error_BlockValidationErrorInvalidCBLDataLength = 'error_blockValidationErrorInvalidCBLDataLength',
  Error_BlockValidationErrorInvalidDateCreated = 'error_blockValidationErrorInvalidDateCreated',
  Error_BlockValidationErrorInvalidEncryptionHeaderLength = 'error_blockValidationErrorInvalidEncryptionHeaderLength',
  Error_BlockValidationErrorInvalidEphemeralPublicKeyLength = 'error_blockValidationErrorInvalidEphemeralPublicKeyLength',
  Error_BlockValidationErrorInvalidIVLength = 'error_blockValidationErrorInvalidIVLength',
  Error_BlockValidationErrorInvalidSignature = 'error_blockValidationErrorInvalidSignature',
  Error_BlockValidationErrorInvalidTupleSizeTemplate = 'error_blockValidationErrorInvalidTupleSizeTemplate',
  Error_BlockValidationErrorMethodMustBeImplementedByDerivedClass = 'error_blockValidationErrorMethodMustBeImplementedByDerivedClass',
  Error_BlockValidationErrorNoChecksum = 'error_blockValidationErrorNoChecksum',
  Error_BlockValidationErrorOriginalDataLengthNegative = 'error_blockValidationErrorOriginalDataLengthNegative',
  Error_BlockValidationTemplate = 'error_blockValidationTemplate',
  Error_ChecksumMismatchTemplate = 'error_checksumMismatchTemplate',
  Error_InvalidBlockSizeTemplate = 'error_invalidBlockSizeTemplate',
  Error_InvalidCredentials = 'error_invalidCredentials',
  Error_InvalidEmail = 'error_invalidEmail',
  Error_InvalidEmailMissing = 'error_invalidEmailMissing',
  Error_InvalidEmailWhitespace = 'error_invalidEmailWhitespace',
  Error_InvalidGuid = 'error_invalidGuid',
  Error_InvalidGuidTemplate = 'error_invalidGuidTemplate',
  Error_InvalidGuidUnknownBrandTemplate = 'error_invalidGuidUnknownBrandTemplate',
  Error_InvalidGuidUnknownLengthTemplate = 'error_invalidGuidUnknownLengthTemplate',
  Error_IsolatedKeyErrorInvalidPublicKey = 'error_isolatedKeyErrorInvalidPublicKey',
  Error_IsolatedKeyErrorInvalidKeyId = 'error_isolatedKeyErrorInvalidKeyId',
  Error_IsolatedKeyErrorInvalidKeyFormat = 'error_isolatedKeyErrorInvalidKeyFormat',
  Error_IsolatedKeyErrorInvalidKeyLength = 'error_isolatedKeyErrorInvalidKeyLength',
  Error_IsolatedKeyErrorInvalidKeyType = 'error_isolatedKeyErrorInvalidKeyType',
  Error_IsolatedKeyErrorKeyIsolationViolation = 'error_isolatedKeyErrorKeyIsolationViolation',
  Error_Pbkdf2InvalidSaltLength = 'error_pbkdf2InvalidSaltLength',
  Error_Pbkdf2InvalidHashLength = 'error_pbkdf2InvalidHashLength',
  Error_BlockServiceErrorBlockWhitenerCountMismatch = 'error_blockServiceErrorBlockWhitenerCountMismatch',
  Error_BlockServiceErrorEmptyBlocksArray = 'error_blockServiceErrorEmptyBlocksArray',
  Error_BlockServiceErrorBlockSizeMismatch = 'error_blockServiceErrorBlockSizeMismatch',
  Error_BlockServiceErrorNoWhitenersProvided = 'error_blockServiceErrorNoWhitenersProvided',
  Error_QuorumErrorInvalidQuorumId = 'error_quorumErrorInvalidQuorumId',
  Error_QuorumErrorDocumentNotFound = 'error_quorumErrorDocumentNotFound',
  Error_QuorumErrorUnableToRestoreDocument = 'error_quorumErrorUnableToRestoreDocument',
  Error_QuorumErrorNotImplemented = 'error_quorumErrorNotImplemented',
  Error_SystemKeyringErrorKeyNotFoundTemplate = 'error_systemKeyringErrorKeyNotFoundTemplate',
  Error_SystemKeyringErrorRateLimitExceeded = 'error_systemKeyringErrorRateLimitExceeded',
  Error_FecErrorDataRequired = 'error_fecErrorDataRequired',
  Error_FecErrorInvalidShardCounts = 'error_fecErrorInvalidShardCounts',
  Error_FecErrorInvalidShardsAvailableArray = 'error_fecErrorInvalidShardsAvailableArray',
  Error_FecErrorInputBlockRequired = 'error_fecErrorInputBlockRequired',
  Error_FecErrorParityBlockCountMustBePositive = 'error_fecErrorParityBlockCountMustBePositive',
  Error_FecErrorInputDataMustBeBuffer = 'error_fecErrorInputDataMustBeBuffer',
  Error_FecErrorDamagedBlockRequired = 'error_fecErrorDamagedBlockRequired',
  Error_FecErrorParityBlocksRequired = 'error_fecErrorParityBlocksRequired',
  Error_FecErrorBlockSizeMismatch = 'error_fecErrorBlockSizeMismatch',
  Error_FecErrorDamagedBlockDataMustBeBuffer = 'error_fecErrorDamagedBlockDataMustBeBuffer',
  Error_FecErrorParityBlockDataMustBeBuffer = 'error_fecErrorParityBlockDataMustBeBuffer',
  Error_FecErrorInvalidDataLengthTemplate = 'error_fecErrorInvalidDataLengthTemplate',
  Error_FecErrorShardSizeExceedsMaximumTemplate = 'error_fecErrorShardSizeExceedsMaximumTemplate',
  Error_FecErrorNotEnoughShardsAvailableTemplate = 'error_fecErrorNotEnoughShardsAvailableTemplate',
  Error_FecErrorInvalidParityBlockSizeTemplate = 'error_fecErrorInvalidParityBlockSizeTemplate',
  Error_FecErrorInvalidRecoveredBlockSizeTemplate = 'error_fecErrorInvalidRecoveredBlockSizeTemplate',
  Error_FecErrorFecEncodingFailedTemplate = 'error_fecErrorFecEncodingFailedTemplate',
  Error_FecErrorFecDecodingFailedTemplate = 'error_fecErrorFecDecodingFailedTemplate',
  Error_EciesErrorInvalidHeaderLength = 'error_eciesErrorInvalidHeaderLength',
  Error_EciesErrorInvalidMnemonic = 'error_eciesErrorInvalidMnemonic',
  Error_EciesErrorInvalidEncryptedDataLength = 'error_eciesErrorInvalidEncryptedDataLength',
  Error_EciesErrorMessageLengthMismatch = 'error_eciesErrorMessageLengthMismatch',
  Error_EciesErrorInvalidEncryptedKeyLength = 'error_eciesErrorInvalidEncryptedKeyLength',
  Error_EciesErrorInvalidEphemeralPublicKey = 'error_eciesErrorInvalidEphemeralPublicKey',
  Error_EciesErrorRecipientNotFound = 'error_eciesErrorRecipientNotFound',
  Error_EciesErrorInvalidSignature = 'error_eciesErrorInvalidSignature',
  Error_EciesErrorInvalidSenderPublicKey = 'error_eciesErrorInvalidSenderPublicKey',
  Error_EciesErrorTooManyRecipients = 'error_eciesErrorTooManyRecipients',
  Error_VotingDerivationErrorFailedToGeneratePrime = 'error_votingDerivationErrorFailedToGeneratePrime',
  Error_VotingDerivationErrorIdenticalPrimes = 'error_votingDerivationErrorIdenticalPrimes',
  Error_VotingDerivationErrorKeyPairTooSmallTemplate = 'error_votingDerivationErrorKeyPairTooSmallTemplate',
  Error_VotingDerivationErrorKeyPairValidationFailed = 'error_votingDerivationErrorKeyPairValidationFailed',
  Error_VotingDerivationErrorModularInverseDoesNotExist = 'error_votingDerivationErrorModularInverseDoesNotExist',
  Error_VotingDerivationErrorPrivateKeyMustBeBuffer = 'error_votingDerivationErrorPrivateKeyMustBeBuffer',
  Error_VotingDerivationErrorPublicKeyMustBeBuffer = 'error_votingDerivationErrorPublicKeyMustBeBuffer',
  Error_VotingDerivationErrorInvalidPublicKeyFormat = 'error_votingDerivationErrorInvalidPublicKeyFormat',
  Error_VotingDerivationErrorInvalidEcdhKeyPair = 'error_votingDerivationErrorInvalidEcdhKeyPair',
  Error_VotingDerivationErrorFailedToDeriveVotingKeysTemplate = 'error_votingDerivationErrorFailedToDeriveVotingKeysTemplate',
  Error_VotingErrorInvalidKeyPairPublicKeyNotIsolated = 'error_votingErrorInvalidKeyPairPublicKeyNotIsolated',
  Error_VotingErrorInvalidKeyPairPrivateKeyNotIsolated = 'error_votingErrorInvalidKeyPairPrivateKeyNotIsolated',
  Error_VotingErrorInvalidPublicKeyNotIsolated = 'error_votingErrorInvalidPublicKeyNotIsolated',
  Error_VotingErrorInvalidPublicKeyBufferTooShort = 'error_votingErrorInvalidPublicKeyBufferTooShort',
  Error_VotingErrorInvalidPublicKeyBufferWrongMagic = 'error_votingErrorInvalidPublicKeyBufferWrongMagic',
  Error_VotingErrorUnsupportedPublicKeyVersion = 'error_votingErrorUnsupportedPublicKeyVersion',
  Error_VotingErrorInvalidPublicKeyBufferIncompleteN = 'error_votingErrorInvalidPublicKeyBufferIncompleteN',
  Error_VotingErrorInvalidPublicKeyBufferFailedToParseNTemplate = 'error_votingErrorInvalidPublicKeyBufferFailedToParseNTemplate',
  Error_VotingErrorInvalidPublicKeyIdMismatch = 'error_votingErrorInvalidPublicKeyIdMismatch',
  Error_StoreErrorKeyNotFoundTemplate = 'error_storeErrorKeyNotFoundTemplate',
  Error_StoreErrorStorePathRequired = 'error_storeErrorStorePathRequired',
  Error_StoreErrorStorePathNotFound = 'error_storeErrorStorePathNotFound',
  Error_StoreErrorBlockSizeRequired = 'error_storeErrorBlockSizeRequired',
  Error_StoreErrorBlockIdRequired = 'error_storeErrorBlockIdRequired',
  Error_StoreErrorInvalidBlockIdTooShort = 'error_storeErrorInvalidBlockIdTooShort',
  Error_StoreErrorBlockFileSizeMismatch = 'error_storeErrorBlockFileSizeMismatch',
  Error_StoreErrorBlockValidationFailed = 'error_storeErrorBlockValidationFailed',
  Error_StoreErrorBlockPathAlreadyExistsTemplate = 'error_storeErrorBlockPathAlreadyExistsTemplate',
  Error_StoreErrorNoBlocksProvided = 'error_storeErrorNoBlocksProvided',
  Error_StoreErrorCannotStoreEphemeralData = 'error_storeErrorCannotStoreEphemeralData',
  Error_StoreErrorBlockIdMismatchTemplate = 'error_storeErrorBlockIdMismatchTemplate',
  Error_StoreErrorBlockSizeMismatch = 'error_storeErrorBlockSizeMismatch',
  Error_StoreErrorInvalidBlockMetadataTemplate = 'error_storeErrorInvalidBlockMetadataTemplate',
  Error_StoreErrorBlockDirectoryCreationFailedTemplate = 'error_storeErrorBlockDirectoryCreationFailedTemplate',
  Error_SecureStorageDecryptedValueChecksumMismatch = 'error_secureStorageDecryptedValueChecksumMismatch',
  Error_SecureStorageDecryptedValueLengthMismatch = 'error_secureStorageDecryptedValueLengthMismatch',
  Error_SymmetricDataNullOrUndefined = 'error_symmetricDataNullOrUndefined',
  Error_SymmetricInvalidKeyLengthTemplate = 'error_symmetricInvalidKeyLengthTemplate',
  Error_TupleErrorInvalidTupleSize = 'error_tupleErrorInvalidTupleSize',
  Error_TupleErrorBlockSizeMismatch = 'error_tupleErrorBlockSizeMismatch',
  Error_TupleErrorNoBlocksToXor = 'error_tupleErrorNoBlocksToXor',
  Error_TupleErrorInvalidBlockCount = 'error_tupleErrorInvalidBlockCount',
  Error_TupleErrorInvalidBlockType = 'error_tupleErrorInvalidBlockType',
  Error_TupleErrorInvalidSourceLength = 'error_tupleErrorInvalidSourceLength',
  Error_TupleErrorRandomBlockGenerationFailed = 'error_tupleErrorRandomBlockGenerationFailed',
  Error_TupleErrorWhiteningBlockGenerationFailed = 'error_tupleErrorWhiteningBlockGenerationFailed',
  Error_TupleErrorMissingParameters = 'error_tupleErrorMissingParameters',
  Error_TupleErrorXorOperationFailedTemplate = 'error_tupleErrorXorOperationFailedTemplate',
  Error_TupleErrorDataStreamProcessingFailedTemplate = 'error_tupleErrorDataStreamProcessingFailedTemplate',
  Error_TupleErrorEncryptedDataStreamProcessingFailedTemplate = 'error_tupleErrorEncryptedDataStreamProcessingFailedTemplate',
  Error_SealingErrorInvalidBitRange = 'error_sealingErrorInvalidBitRange',
  Error_SealingErrorInvalidMemberArray = 'error_sealingErrorInvalidMemberArray',
  Error_SealingErrorNotEnoughMembersToUnlock = 'error_sealingErrorNotEnoughMembersToUnlock',
  Error_SealingErrorTooManyMembersToUnlock = 'error_sealingErrorTooManyMembersToUnlock',
  Error_SealingErrorMissingPrivateKeys = 'error_sealingErrorMissingPrivateKeys',
  Error_SealingErrorEncryptedShareNotFound = 'error_sealingErrorEncryptedShareNotFound',
  Error_SealingErrorMemberNotFound = 'error_sealingErrorMemberNotFound',
  Error_SealingErrorFailedToSealTemplate = 'error_sealingErrorFailedToSealTemplate',
  Error_CblErrorCblRequired = 'error_cblErrorCblRequired',
  Error_CblErrorWhitenedBlockFunctionRequired = 'error_cblErrorWhitenedBlockFunctionRequired',
  Error_CblErrorFailedToLoadBlock = 'error_cblErrorFailedToLoadBlock',
  Error_CblErrorExpectedEncryptedDataBlock = 'error_cblErrorExpectedEncryptedDataBlock',
  Error_CblErrorExpectedOwnedDataBlock = 'error_cblErrorExpectedOwnedDataBlock',
  Error_CblErrorInvalidStructure = 'error_cblErrorInvalidStructure',
  Error_CblErrorCreatorUndefined = 'error_cblErrorCreatorUndefined',
  Error_CblErrorBlockNotReadable = 'error_cblErrorBlockNotReadable',
  Error_CblErrorCreatorRequiredForSignature = 'error_cblErrorCreatorRequiredForSignature',
  Error_CblErrorFileNameRequired = 'error_cblErrorFileNameRequired',
  Error_CblErrorFileNameEmpty = 'error_cblErrorFileNameEmpty',
  Error_CblErrorFileNameWhitespace = 'error_cblErrorFileNameWhitespace',
  Error_CblErrorFileNameInvalidChar = 'error_cblErrorFileNameInvalidChar',
  Error_CblErrorFileNameControlChars = 'error_cblErrorFileNameControlChars',
  Error_CblErrorFileNamePathTraversal = 'error_cblErrorFileNamePathTraversal',
  Error_CblErrorMimeTypeRequired = 'error_cblErrorMimeTypeRequired',
  Error_CblErrorMimeTypeEmpty = 'error_cblErrorMimeTypeEmpty',
  Error_CblErrorMimeTypeWhitespace = 'error_cblErrorMimeTypeWhitespace',
  Error_CblErrorMimeTypeLowercase = 'error_cblErrorMimeTypeLowercase',
  Error_CblErrorMimeTypeInvalidFormat = 'error_cblErrorMimeTypeInvalidFormat',
  Error_CblErrorInvalidBlockSize = 'error_cblErrorInvalidBlockSize',
  Error_CblErrorMetadataSizeExceeded = 'error_cblErrorMetadataSizeExceeded',
  Error_CblErrorMetadataSizeNegative = 'error_cblErrorMetadataSizeNegative',
  Error_CblErrorInvalidMetadataBuffer = 'error_cblErrorInvalidMetadataBuffer',
  Error_CblErrorCreationFailedTemplate = 'error_cblErrorCreationFailedTemplate',
  Error_CblErrorInsufficientCapacityTemplate = 'error_cblErrorInsufficientCapacityTemplate',
  Error_StreamErrorBlockSizeRequired = 'error_streamErrorBlockSizeRequired',
  Error_StreamErrorWhitenedBlockSourceRequired = 'error_streamErrorWhitenedBlockSourceRequired',
  Error_StreamErrorRandomBlockSourceRequired = 'error_streamErrorRandomBlockSourceRequired',
  Error_StreamErrorInputMustBeBuffer = 'error_streamErrorInputMustBeBuffer',
  Error_StreamErrorFailedToGetRandomBlock = 'error_streamErrorFailedToGetRandomBlock',
  Error_StreamErrorFailedToGetWhiteningBlock = 'error_streamErrorFailedToGetWhiteningBlock',
  Error_StreamErrorIncompleteEncryptedBlock = 'error_streamErrorIncompleteEncryptedBlock',
  Error_InvalidLanguageCode = 'error_invalidLanguageCode',
  Error_InvalidSessionID = 'error_invalidSessionID',
  Error_InvalidTupleCountTemplate = 'error_invalidTupleCountTemplate',
  Error_MemberErrorIncorrectOrInvalidPrivateKey = 'error_memberErrorIncorrectOrInvalidPrivateKey',
  Error_MemberErrorInvalidEmail = 'error_memberErrorInvalidEmail',
  Error_MemberErrorInvalidEmailWhitespace = 'error_memberErrorInvalidEmailWhitespace',
  Error_MemberErrorInvalidMemberName = 'error_memberErrorInvalidMemberName',
  Error_MemberErrorInvalidMemberNameWhitespace = 'error_memberErrorInvalidMemberNameWhitespace',
  Error_MemberErrorInvalidMnemonic = 'error_memberErrorInvalidMnemonic',
  Error_MemberErrorMissingEmail = 'error_memberErrorMissingEmail',
  Error_MemberErrorMissingMemberName = 'error_memberErrorMissingMemberName',
  Error_MemberErrorMissingVotingPrivateKey = 'error_memberErrorMissingVotingPrivateKey',
  Error_MemberErrorMissingVotingPublicKey = 'error_memberErrorMissingVotingPublicKey',
  Error_MemberErrorMissingPrivateKey = 'error_memberErrorMissingPrivateKey',
  Error_MemberErrorNoWallet = 'error_memberErrorNoWallet',
  Error_MemberErrorPrivateKeyRequiredToDeriveVotingKeyPair = 'error_memberErrorPrivateKeyRequiredToDeriveVotingKeyPair',
  Error_MemberErrorWalletAlreadyLoaded = 'error_memberErrorWalletAlreadyLoaded',
  Error_MemoryTupleErrorInvalidTupleSizeTemplate = 'error_memoryTupleErrorInvalidTupleSizeTemplate',
  Error_MultiEncryptedErrorDataTooShort = 'error_multiEncryptedErrorDataTooShort',
  Error_MultiEncryptedErrorDataLengthExceedsCapacity = 'error_multiEncryptedErrorDataLengthExceedsCapacity',
  Error_MultiEncryptedErrorCreatorMustBeMember = 'error_multiEncryptedErrorCreatorMustBeMember',
  Error_MultiEncryptedErrorBlockNotReadable = 'error_multiEncryptedErrorBlockNotReadable',
  Error_MultiEncryptedErrorInvalidEphemeralPublicKeyLength = 'error_multiEncryptedErrorInvalidEphemeralPublicKeyLength',
  Error_MultiEncryptedErrorInvalidIVLength = 'error_multiEncryptedErrorInvalidIVLength',
  Error_MultiEncryptedErrorInvalidAuthTagLength = 'error_multiEncryptedErrorInvalidAuthTagLength',
  Error_MultiEncryptedErrorChecksumMismatch = 'error_multiEncryptedErrorChecksumMismatch',
  Error_MemoryTupleErrorBlockSizeMismatch = 'error_memoryTupleErrorBlockSizeMismatch',
  Error_WhitenedErrorBlockNotReadable = 'error_whitenedErrorBlockNotReadable',
  Error_WhitenedErrorBlockSizeMismatch = 'error_whitenedErrorBlockSizeMismatch',
  Error_WhitenedErrorDataLengthMismatch = 'error_whitenedErrorDataLengthMismatch',
  Error_WhitenedErrorInvalidBlockSize = 'error_whitenedErrorInvalidBlockSize',
  Error_HandleTupleErrorInvalidTupleSizeTemplate = 'error_handleTupleErrorInvalidTupleSizeTemplate',
  Error_HandleTupleErrorBlockSizeMismatch = 'error_handleTupleErrorBlockSizeMismatch',
  Error_HandleTupleErrorNoBlocksToXor = 'error_handleTupleErrorNoBlocksToXor',
  Error_HandleTupleErrorBlockSizesMustMatch = 'error_handleTupleErrorBlockSizesMustMatch',
  Error_OwnedDataErrorCreatorRequired = 'error_ownedDataErrorCreatorRequired',
  Error_OwnedDataErrorDataRequired = 'error_ownedDataErrorDataRequired',
  Error_OwnedDataErrorDataLengthExceedsCapacity = 'error_ownedDataErrorDataLengthExceedsCapacity',
  Error_OwnedDataErrorActualDataLengthNegative = 'error_ownedDataErrorActualDataLengthNegative',
  Error_OwnedDataErrorActualDataLengthExceedsDataLength = 'error_ownedDataErrorActualDataLengthExceedsDataLength',
  Error_OwnedDataErrorCreatorRequiredForEncryption = 'error_ownedDataErrorCreatorRequiredForEncryption',
  Error_OwnedDataErrorUnexpectedEncryptedBlockType = 'error_ownedDataErrorUnexpectedEncryptedBlockType',
  Error_MemoryTupleErrorNoBlocksToXor = 'error_memoryTupleErrorNoBlocksToXor',
  Error_MemoryTupleErrorInvalidBlockCount = 'error_memoryTupleErrorInvalidBlockCount',
  Error_MemoryTupleErrorExpectedBlockIdsTemplate = 'error_memoryTupleErrorExpectedBlockIdsTemplate',
  Error_MemoryTupleErrorExpectedBlocksTemplate = 'error_memoryTupleErrorExpectedBlocksTemplate',
  Error_MetadataMismatch = 'error_metadataMismatch',
  Error_TokenExpired = 'error_tokenExpired',
  Error_TokenInvalid = 'error_tokenInvalid',
  Error_UnexpectedError = 'error_unexpectedError',
  Error_UserNotFound = 'error_userNotFound',
  Error_ValidationError = 'error_validationError',
  ForgotPassword_Title = 'forgotPassword_title',
  LanguageUpdate_Success = 'languageUpdate_success',
  Login_LoginButton = 'login_loginButton',
  LogoutButton = 'logoutButton',
  Register_Button = 'register_button',
  Register_Error = 'register_error',
  Register_Success = 'register_success',
  Validation_InvalidLanguage = 'validation_invalidLanguage',
}
