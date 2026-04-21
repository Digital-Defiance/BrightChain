import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightChainStringKey,
  BrightChainStrings,
} from '../../enumerations/brightChainStrings';

export const MandarinStrings: ComponentStrings<BrightChainStringKey> = {
  // BrightChain
  [BrightChainStrings.Common_Bright]: '明亮',
  [BrightChainStrings.Common_Chain]: '链',

  [BrightChainStrings.Common_Privacy]: '隐私',
  [BrightChainStrings.Common_Participation]: '参与',
  [BrightChainStrings.Common_Power]: '力量',
  [BrightChainStrings.Common_PrivacyParticipationPower]: '隐私。参与。力量。',

  // UI Strings
  [BrightChainStrings.Common_BlockSize]: '区块大小',
  [BrightChainStrings.Common_AtIndexTemplate]: '在索引{INDEX}处{OPERATION}',
  [BrightChainStrings.ChangePassword_Success]: '密码更改成功。',
  [BrightChainStrings.Common_Site]: 'BrightChain',
  [BrightChainStrings.ForgotPassword_Title]: '忘记密码',
  [BrightChainStrings.Register_Button]: '注册',
  [BrightChainStrings.Register_Error]: '注册过程中发生错误。',
  [BrightChainStrings.Register_Success]: '注册成功。',

  // Block Handle Errors
  [BrightChainStrings.Error_BlockHandle_BlockConstructorMustBeValid]:
    'blockConstructor必须是有效的构造函数',
  [BrightChainStrings.Error_BlockHandle_BlockSizeRequired]: 'blockSize是必需的',
  [BrightChainStrings.Error_BlockHandle_DataMustBeUint8Array]:
    'data必须是Uint8Array',
  [BrightChainStrings.Error_BlockHandle_ChecksumMustBeChecksum]:
    'checksum必须是Checksum',

  // Block Handle Tuple Errors
  [BrightChainStrings.Error_BlockHandleTuple_FailedToLoadBlockTemplate]:
    '加载块 {CHECKSUM} 失败：{ERROR}',
  [BrightChainStrings.Error_BlockHandleTuple_FailedToStoreXorResultTemplate]:
    '存储XOR结果失败：{ERROR}',

  // Block Access Errors
  [BrightChainStrings.Error_BlockAccess_Template]: '无法访问块：{REASON}',
  [BrightChainStrings.Error_BlockAccessError_BlockAlreadyExists]:
    '块文件已存在',
  [BrightChainStrings.Error_BlockAccessError_BlockIsNotPersistable]:
    '块不可持久化',
  [BrightChainStrings.Error_BlockAccessError_BlockIsNotReadable]: '块不可读取',
  [BrightChainStrings.Error_BlockAccessError_BlockFileNotFoundTemplate]:
    '未找到块文件：{FILE}',
  [BrightChainStrings.Error_BlockAccess_CBLCannotBeEncrypted]: 'CBL块无法加密',
  [BrightChainStrings.Error_BlockAccessError_CreatorMustBeProvided]:
    '签名验证必须提供创建者',
  [BrightChainStrings.Error_Block_CannotBeDecrypted]: '块无法解密',
  [BrightChainStrings.Error_Block_CannotBeEncrypted]: '块无法加密',
  [BrightChainStrings.Error_BlockCapacity_Template]:
    '块容量超出。块大小：({BLOCK_SIZE})，数据：({DATA_SIZE})',

  // Block Metadata Errors
  [BrightChainStrings.Error_BlockMetadata_Template]: '块元数据错误：{REASON}',
  [BrightChainStrings.Error_BlockMetadataError_CreatorIdMismatch]:
    '创建者ID不匹配',
  [BrightChainStrings.Error_BlockMetadataError_CreatorRequired]:
    '创建者是必需的',
  [BrightChainStrings.Error_BlockMetadataError_EncryptorRequired]:
    '加密器是必需的',
  [BrightChainStrings.Error_BlockMetadataError_InvalidBlockMetadata]:
    '无效的块元数据',
  [BrightChainStrings.Error_BlockMetadataError_InvalidBlockMetadataTemplate]:
    '无效的块元数据：{REASON}',
  [BrightChainStrings.Error_BlockMetadataError_MetadataRequired]:
    '元数据是必需的',
  [BrightChainStrings.Error_BlockMetadataError_MissingRequiredMetadata]:
    '缺少必需的元数据字段',

  // Block Capacity Errors
  [BrightChainStrings.Error_BlockCapacity_InvalidBlockSize]: '无效的块大小',
  [BrightChainStrings.Error_BlockCapacity_InvalidBlockType]: '无效的块类型',
  [BrightChainStrings.Error_BlockCapacity_CapacityExceeded]: '容量超出',
  [BrightChainStrings.Error_BlockCapacity_InvalidFileName]: '无效的文件名',
  [BrightChainStrings.Error_BlockCapacity_InvalidMimetype]: '无效的MIME类型',
  [BrightChainStrings.Error_BlockCapacity_InvalidRecipientCount]:
    '无效的收件人数量',
  [BrightChainStrings.Error_BlockCapacity_InvalidExtendedCblData]:
    '无效的扩展CBL数据',

  // Block Validation Errors
  [BrightChainStrings.Error_BlockValidationError_Template]:
    '块验证失败：{REASON}',
  [BrightChainStrings.Error_BlockValidationError_ActualDataLengthUnknown]:
    '实际数据长度未知',
  [BrightChainStrings.Error_BlockValidationError_AddressCountExceedsCapacity]:
    '地址数量超出块容量',
  [BrightChainStrings.Error_BlockValidationError_BlockDataNotBuffer]:
    'Block.data必须是buffer',
  [BrightChainStrings.Error_BlockValidationError_BlockSizeNegative]:
    '块大小必须是正数',
  [BrightChainStrings.Error_BlockValidationError_CreatorIDMismatch]:
    '创建者ID不匹配',
  [BrightChainStrings.Error_BlockValidationError_DataBufferIsTruncated]:
    '数据缓冲区被截断',
  [BrightChainStrings.Error_BlockValidationError_DataCannotBeEmpty]:
    '数据不能为空',
  [BrightChainStrings.Error_BlockValidationError_DataLengthExceedsCapacity]:
    '数据长度超出块容量',
  [BrightChainStrings.Error_BlockValidationError_DataLengthTooShort]:
    '数据太短，无法包含加密头',
  [BrightChainStrings.Error_BlockValidationError_DataLengthTooShortForCBLHeader]:
    '数据太短，无法包含CBL头',
  [BrightChainStrings.Error_BlockValidationError_DataLengthTooShortForEncryptedCBL]:
    '数据太短，无法包含加密CBL',
  [BrightChainStrings.Error_BlockValidationError_EphemeralBlockOnlySupportsBufferData]:
    'EphemeralBlock仅支持Buffer数据',
  [BrightChainStrings.Error_BlockValidationError_FutureCreationDate]:
    '块创建日期不能是未来时间',
  [BrightChainStrings.Error_BlockValidationError_InvalidAddressLengthTemplate]:
    '索引 {INDEX} 处的地址长度无效：{LENGTH}，期望：{EXPECTED_LENGTH}',
  [BrightChainStrings.Error_BlockValidationError_InvalidAuthTagLength]:
    '无效的认证标签长度',
  [BrightChainStrings.Error_BlockValidationError_InvalidBlockTypeTemplate]:
    '无效的块类型：{TYPE}',
  [BrightChainStrings.Error_BlockValidationError_InvalidCBLAddressCount]:
    'CBL地址数量必须是TupleSize的倍数',
  [BrightChainStrings.Error_BlockValidationError_InvalidCBLDataLength]:
    '无效的CBL数据长度',
  [BrightChainStrings.Error_BlockValidationError_InvalidDateCreated]:
    '无效的创建日期',
  [BrightChainStrings.Error_BlockValidationError_InvalidEncryptionHeaderLength]:
    '无效的加密头长度',
  [BrightChainStrings.Error_BlockValidationError_InvalidEphemeralPublicKeyLength]:
    '无效的临时公钥长度',
  [BrightChainStrings.Error_BlockValidationError_InvalidIVLength]:
    '无效的IV长度',
  [BrightChainStrings.Error_BlockValidationError_InvalidSignature]:
    '提供的签名无效',
  [BrightChainStrings.Error_BlockValidationError_InvalidRecipientIds]:
    '无效的收件人ID',
  [BrightChainStrings.Error_BlockValidationError_InvalidTupleSizeTemplate]:
    '元组大小必须在 {TUPLE_MIN_SIZE} 和 {TUPLE_MAX_SIZE} 之间',
  [BrightChainStrings.Error_BlockValidationError_MethodMustBeImplementedByDerivedClass]:
    '方法必须由派生类实现',
  [BrightChainStrings.Error_BlockValidationError_NoChecksum]: '未提供校验和',
  [BrightChainStrings.Error_BlockValidationError_OriginalDataLengthNegative]:
    '原始数据长度不能为负',
  [BrightChainStrings.Error_BlockValidationError_InvalidEncryptionType]:
    '无效的加密类型',
  [BrightChainStrings.Error_BlockValidationError_InvalidRecipientCount]:
    '无效的收件人数量',
  [BrightChainStrings.Error_BlockValidationError_InvalidRecipientKeys]:
    '无效的收件人密钥',
  [BrightChainStrings.Error_BlockValidationError_EncryptionRecipientNotFoundInRecipients]:
    '加密收件人未在收件人列表中找到',
  [BrightChainStrings.Error_BlockValidationError_EncryptionRecipientHasNoPrivateKey]:
    '加密收件人没有私钥',
  [BrightChainStrings.Error_BlockValidationError_InvalidCreator]:
    '无效的创建者',
  [BrightChainStrings.Error_BufferError_InvalidBufferTypeTemplate]:
    '无效的缓冲区类型。期望Buffer，实际：{TYPE}',
  [BrightChainStrings.Error_Checksum_MismatchTemplate]:
    '校验和不匹配：期望 {EXPECTED}，实际 {CHECKSUM}',
  [BrightChainStrings.Error_BlockSize_InvalidTemplate]:
    '无效的块大小：{BLOCK_SIZE}',
  [BrightChainStrings.Error_Credentials_Invalid]: '无效的凭据。',

  // Isolated Key Errors
  [BrightChainStrings.Error_IsolatedKeyError_InvalidPublicKey]:
    '无效的公钥：必须是隔离密钥',
  [BrightChainStrings.Error_IsolatedKeyError_InvalidKeyId]:
    '密钥隔离违规：无效的密钥ID',
  [BrightChainStrings.Error_IsolatedKeyError_InvalidKeyFormat]:
    '无效的密钥格式',
  [BrightChainStrings.Error_IsolatedKeyError_InvalidKeyLength]:
    '无效的密钥长度',
  [BrightChainStrings.Error_IsolatedKeyError_InvalidKeyType]: '无效的密钥类型',
  [BrightChainStrings.Error_IsolatedKeyError_KeyIsolationViolation]:
    '密钥隔离违规：来自不同密钥实例的密文',

  // Block Service Errors
  [BrightChainStrings.Error_BlockServiceError_BlockWhitenerCountMismatch]:
    '块和白化器的数量必须相同',
  [BrightChainStrings.Error_BlockServiceError_EmptyBlocksArray]:
    '块数组不能为空',
  [BrightChainStrings.Error_BlockServiceError_BlockSizeMismatch]:
    '所有块必须具有相同的块大小',
  [BrightChainStrings.Error_BlockServiceError_NoWhitenersProvided]:
    '未提供白化器',
  [BrightChainStrings.Error_BlockServiceError_AlreadyInitialized]:
    'BlockService子系统已初始化',
  [BrightChainStrings.Error_BlockServiceError_Uninitialized]:
    'BlockService子系统未初始化',
  [BrightChainStrings.Error_BlockServiceError_BlockAlreadyExistsTemplate]:
    '块已存在：{ID}',
  [BrightChainStrings.Error_BlockServiceError_RecipientRequiredForEncryption]:
    '加密需要收件人',
  [BrightChainStrings.Error_BlockServiceError_CannotDetermineFileLength]:
    '无法确定文件长度',
  [BrightChainStrings.Error_BlockServiceError_CannotDetermineBlockSize]:
    '无法确定块大小',
  [BrightChainStrings.Error_BlockServiceError_CannotDetermineFileName]:
    '无法确定文件名',
  [BrightChainStrings.Error_BlockServiceError_CannotDetermineMimeType]:
    '无法确定MIME类型',
  [BrightChainStrings.Error_BlockServiceError_FilePathNotProvided]:
    '未提供文件路径',
  [BrightChainStrings.Error_BlockServiceError_UnableToDetermineBlockSize]:
    '无法确定块大小',
  [BrightChainStrings.Error_BlockServiceError_InvalidBlockData]: '无效的块数据',
  [BrightChainStrings.Error_BlockServiceError_InvalidBlockType]: '无效的块类型',

  // BrightTrust Errors
  [BrightChainStrings.Error_BrightTrustError_InvalidBrightTrustId]:
    '无效的法定人数ID',
  [BrightChainStrings.Error_BrightTrustError_DocumentNotFound]: '未找到文档',
  [BrightChainStrings.Error_BrightTrustError_UnableToRestoreDocument]:
    '无法恢复文档',
  [BrightChainStrings.Error_BrightTrustError_NotImplemented]: '未实现',
  [BrightChainStrings.Error_BrightTrustError_Uninitialized]:
    '法定人数子系统未初始化',
  [BrightChainStrings.Error_BrightTrustError_MemberNotFound]: '未找到成员',
  [BrightChainStrings.Error_BrightTrustError_NotEnoughMembers]:
    '法定人数操作没有足够的成员',
  [BrightChainStrings.Error_BrightTrustError_TransitionInProgress]:
    '操作被阻止：过渡仪式正在进行中',
  [BrightChainStrings.Error_BrightTrustError_InvalidModeTransition]:
    '无效的操作模式转换',
  [BrightChainStrings.Error_BrightTrustError_InsufficientMembersForTransition]:
    '成员不足，无法启动过渡仪式',
  [BrightChainStrings.Error_BrightTrustError_MemberAlreadyExists]:
    '成员已存在于法定人数中',
  [BrightChainStrings.Error_BrightTrustError_InsufficientRemainingMembers]:
    '无法移除成员：剩余成员将低于阈值',
  [BrightChainStrings.Error_BrightTrustError_MemberBanned]: '成员已被禁止',
  [BrightChainStrings.Error_BrightTrustError_MemberSuspended]: '成员已被暂停',
  [BrightChainStrings.Error_BrightTrustError_DuplicateProposal]: '重复的提案ID',
  [BrightChainStrings.Error_BrightTrustError_ProposalExpired]: '提案已过期',
  [BrightChainStrings.Error_BrightTrustError_DuplicateVote]: '该成员的重复投票',
  [BrightChainStrings.Error_BrightTrustError_VoterNotOnProposal]:
    '投票者不是该提案的活跃成员',
  [BrightChainStrings.Error_BrightTrustError_AuthenticationFailed]: '认证失败',
  [BrightChainStrings.Error_BrightTrustError_VotingLocked]:
    '由于多次认证失败，投票已被锁定',
  [BrightChainStrings.Error_BrightTrustError_MissingAttachment]:
    '提案需要附件但未提供',
  [BrightChainStrings.Error_BrightTrustError_AttachmentNotRetrievable]:
    '引用的附件CBL无法检索',
  [BrightChainStrings.Error_BrightTrustError_RedistributionFailed]:
    '份额重新分配失败',
  [BrightChainStrings.Error_BrightTrustError_InsufficientSharesForReconstruction]:
    '提供的份额不足以重建密钥',
  [BrightChainStrings.Error_BrightTrustError_KeyReconstructionValidationFailed]:
    '重建的密钥验证失败',
  [BrightChainStrings.Error_BrightTrustError_IdentityPermanentlyUnrecoverable]:
    '由于诉讼时效已过，身份永久不可恢复',
  [BrightChainStrings.Error_BrightTrustError_InvalidMembershipProof]:
    '无效的成员资格证明',
  [BrightChainStrings.Error_BrightTrustError_MissingMembershipProof]:
    '匿名内容缺少成员资格证明',
  [BrightChainStrings.Error_BrightTrustError_AliasAlreadyTaken]: '别名已被注册',
  [BrightChainStrings.Error_BrightTrustError_AliasNotFound]: '未找到别名',
  [BrightChainStrings.Error_BrightTrustError_AliasInactive]: '别名已被停用',
  [BrightChainStrings.Error_BrightTrustError_IdentitySealingFailed]:
    '身份封存管道失败',
  [BrightChainStrings.Error_BrightTrustError_ShardVerificationFailed]:
    '身份分片验证失败',
  [BrightChainStrings.Error_BrightTrustError_BrightTrustDatabaseUnavailable]:
    '法定人数数据库不可用',
  [BrightChainStrings.Error_BrightTrustError_TransactionFailed]:
    '数据库事务失败',
  [BrightChainStrings.Error_BrightTrustError_AuditChainCorrupted]:
    '审计链完整性受损',
  // BrightTrust Ban Mechanism Errors
  [BrightChainStrings.Error_BrightTrustError_CannotBanSelf]:
    '成员不能提议封禁自己',
  [BrightChainStrings.Error_BrightTrustError_MemberAlreadyBanned]:
    '成员已被封禁',
  [BrightChainStrings.Error_BrightTrustError_MemberNotBanned]:
    '成员当前未被封禁',
  [BrightChainStrings.Error_BrightTrustError_NewMemberCannotProposeBan]:
    '在当前纪元中加入的成员不能提议封禁',
  [BrightChainStrings.Error_BrightTrustError_BanCoolingPeriodNotElapsed]:
    '封禁冷却期尚未结束',
  [BrightChainStrings.Error_BrightTrustError_InvalidBanRecordSignatures]:
    '封禁记录没有足够的有效法定人数签名',
  [BrightChainStrings.Error_IdentityValidationError_InvalidSignature]:
    '内容签名与声明的身份不匹配',
  [BrightChainStrings.Error_IdentityValidationError_UnregisteredAlias]:
    '别名未注册',
  [BrightChainStrings.Error_IdentityValidationError_InactiveAlias]:
    '别名已停用',
  [BrightChainStrings.Error_IdentityValidationError_InvalidMembershipProof]:
    '无效的成员资格证明',
  [BrightChainStrings.Error_IdentityValidationError_MissingMembershipProof]:
    '匿名内容缺少成员资格证明',
  [BrightChainStrings.Error_IdentityValidationError_BannedUser]:
    '内容创建者已被禁止',
  [BrightChainStrings.Error_IdentityValidationError_SuspendedUser]:
    '内容创建者已被暂停',
  [BrightChainStrings.Error_IdentityValidationError_ShardVerificationFailed]:
    '身份分片验证失败',

  // System Keyring Errors
  [BrightChainStrings.Error_SystemKeyringError_KeyNotFoundTemplate]:
    '未找到密钥 {KEY}',
  [BrightChainStrings.Error_SystemKeyringError_RateLimitExceeded]:
    '超出速率限制',

  // FEC Errors
  [BrightChainStrings.Error_FecError_InputBlockRequired]: '输入块是必需的',
  [BrightChainStrings.Error_FecError_DamagedBlockRequired]: '损坏块是必需的',
  [BrightChainStrings.Error_FecError_ParityBlocksRequired]:
    '奇偶校验块是必需的',
  [BrightChainStrings.Error_FecError_InvalidParityBlockSizeTemplate]:
    '无效的奇偶校验块大小：期望 {EXPECTED_SIZE}，实际 {ACTUAL_SIZE}',
  [BrightChainStrings.Error_FecError_InvalidRecoveredBlockSizeTemplate]:
    '无效的恢复块大小：期望 {EXPECTED_SIZE}，实际 {ACTUAL_SIZE}',
  [BrightChainStrings.Error_FecError_InputDataMustBeBuffer]:
    '输入数据必须是Buffer',
  [BrightChainStrings.Error_FecError_BlockSizeMismatch]: '块大小必须匹配',
  [BrightChainStrings.Error_FecError_DamagedBlockDataMustBeBuffer]:
    '损坏块数据必须是Buffer',
  [BrightChainStrings.Error_FecError_ParityBlockDataMustBeBuffer]:
    '奇偶校验块数据必须是Buffer',

  // ECIES Errors
  [BrightChainStrings.Error_EciesError_InvalidBlockType]:
    'ECIES操作的块类型无效',

  // Voting Derivation Errors
  [BrightChainStrings.Error_VotingDerivationError_FailedToGeneratePrime]:
    '在最大尝试次数后无法生成素数',
  [BrightChainStrings.Error_VotingDerivationError_IdenticalPrimes]:
    '生成了相同的素数',
  [BrightChainStrings.Error_VotingDerivationError_KeyPairTooSmallTemplate]:
    '生成的密钥对太小：{ACTUAL_BITS} 位 < {REQUIRED_BITS} 位',
  [BrightChainStrings.Error_VotingDerivationError_KeyPairValidationFailed]:
    '密钥对验证失败',
  [BrightChainStrings.Error_VotingDerivationError_ModularInverseDoesNotExist]:
    '模逆不存在',
  [BrightChainStrings.Error_VotingDerivationError_PrivateKeyMustBeBuffer]:
    '私钥必须是Buffer',
  [BrightChainStrings.Error_VotingDerivationError_PublicKeyMustBeBuffer]:
    '公钥必须是Buffer',
  [BrightChainStrings.Error_VotingDerivationError_InvalidPublicKeyFormat]:
    '无效的公钥格式',
  [BrightChainStrings.Error_VotingDerivationError_InvalidEcdhKeyPair]:
    '无效的ECDH密钥对',
  [BrightChainStrings.Error_VotingDerivationError_FailedToDeriveVotingKeysTemplate]:
    '无法派生投票密钥：{ERROR}',

  // Voting Errors
  [BrightChainStrings.Error_VotingError_InvalidKeyPairPublicKeyNotIsolated]:
    '无效的密钥对：公钥必须是隔离的',
  [BrightChainStrings.Error_VotingError_InvalidKeyPairPrivateKeyNotIsolated]:
    '无效的密钥对：私钥必须是隔离的',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyNotIsolated]:
    '无效的公钥：必须是隔离密钥',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyBufferTooShort]:
    '无效的公钥缓冲区：太短',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyBufferWrongMagic]:
    '无效的公钥缓冲区：错误的魔数',
  [BrightChainStrings.Error_VotingError_UnsupportedPublicKeyVersion]:
    '不支持的公钥版本',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyBufferIncompleteN]:
    '无效的公钥缓冲区：n值不完整',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyBufferFailedToParseNTemplate]:
    '无效的公钥缓冲区：无法解析n：{ERROR}',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyIdMismatch]:
    '无效的公钥：密钥ID不匹配',
  [BrightChainStrings.Error_VotingError_ModularInverseDoesNotExist]:
    '模逆不存在',
  [BrightChainStrings.Error_VotingError_PrivateKeyMustBeBuffer]:
    '私钥必须是Buffer',
  [BrightChainStrings.Error_VotingError_PublicKeyMustBeBuffer]:
    '公钥必须是Buffer',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyFormat]:
    '无效的公钥格式',
  [BrightChainStrings.Error_VotingError_InvalidEcdhKeyPair]: '无效的ECDH密钥对',
  [BrightChainStrings.Error_VotingError_FailedToDeriveVotingKeysTemplate]:
    '无法派生投票密钥：{ERROR}',
  [BrightChainStrings.Error_VotingError_FailedToGeneratePrime]:
    '在最大尝试次数后无法生成素数',
  [BrightChainStrings.Error_VotingError_IdenticalPrimes]: '生成了相同的素数',
  [BrightChainStrings.Error_VotingError_KeyPairTooSmallTemplate]:
    '生成的密钥对太小：{ACTUAL_BITS} 位 < {REQUIRED_BITS} 位',
  [BrightChainStrings.Error_VotingError_KeyPairValidationFailed]:
    '密钥对验证失败',
  [BrightChainStrings.Error_VotingError_InvalidVotingKey]: '无效的投票密钥',
  [BrightChainStrings.Error_VotingError_InvalidKeyPair]: '无效的密钥对',
  [BrightChainStrings.Error_VotingError_InvalidPublicKey]: '无效的公钥',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKey]: '无效的私钥',
  [BrightChainStrings.Error_VotingError_InvalidEncryptedKey]: '无效的加密密钥',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferTooShort]:
    '无效的私钥缓冲区：太短',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferWrongMagic]:
    '无效的私钥缓冲区：错误的魔数',
  [BrightChainStrings.Error_VotingError_UnsupportedPrivateKeyVersion]:
    '不支持的私钥版本',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferIncompleteLambda]:
    '无效的私钥缓冲区：lambda不完整',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferIncompleteMuLength]:
    '无效的私钥缓冲区：mu长度不完整',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferIncompleteMu]:
    '无效的私钥缓冲区：mu不完整',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferFailedToParse]:
    '无效的私钥缓冲区：解析失败',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferFailedToCreate]:
    '无效的私钥缓冲区：创建失败',

  // Store Errors
  [BrightChainStrings.Error_StoreError_InvalidBlockMetadataTemplate]:
    '无效的块元数据：{ERROR}',
  [BrightChainStrings.Error_StoreError_KeyNotFoundTemplate]:
    '未找到密钥：{KEY}',
  [BrightChainStrings.Error_StoreError_StorePathRequired]: '存储路径是必需的',
  [BrightChainStrings.Error_StoreError_StorePathNotFound]: '未找到存储路径',
  [BrightChainStrings.Error_StoreError_BlockSizeRequired]: '块大小是必需的',
  [BrightChainStrings.Error_StoreError_BlockIdRequired]: '块ID是必需的',
  [BrightChainStrings.Error_StoreError_InvalidBlockIdTooShort]:
    '无效的块ID：太短',
  [BrightChainStrings.Error_StoreError_BlockFileSizeMismatch]:
    '块文件大小不匹配',
  [BrightChainStrings.Error_StoreError_BlockValidationFailed]: '块验证失败',
  [BrightChainStrings.Error_StoreError_BlockPathAlreadyExistsTemplate]:
    '块路径 {PATH} 已存在',
  [BrightChainStrings.Error_StoreError_BlockAlreadyExists]: '块已存在',
  [BrightChainStrings.Error_StoreError_NoBlocksProvided]: '未提供块',
  [BrightChainStrings.Error_StoreError_CannotStoreEphemeralData]:
    '无法存储临时结构化数据',
  [BrightChainStrings.Error_StoreError_BlockIdMismatchTemplate]:
    '密钥 {KEY} 与块ID {BLOCK_ID} 不匹配',
  [BrightChainStrings.Error_StoreError_BlockSizeMismatch]:
    '块大小与存储块大小不匹配',
  [BrightChainStrings.Error_StoreError_BlockDirectoryCreationFailedTemplate]:
    '创建块目录失败：{ERROR}',
  [BrightChainStrings.Error_StoreError_BlockDeletionFailedTemplate]:
    '删除块失败：{ERROR}',
  [BrightChainStrings.Error_StoreError_NotImplemented]: '操作未实现',
  [BrightChainStrings.Error_StoreError_InsufficientRandomBlocksTemplate]:
    '可用随机块不足：请求 {REQUESTED}，可用 {AVAILABLE}',
  [BrightChainStrings.Error_StoreError_FactoryNotRegistered]:
    '未为请求的存储类型注册块存储工厂',
  [BrightChainStrings.Error_StoreError_CloudOperationFailedTemplate]:
    '云存储操作 {OPERATION} 对块 {BLOCK_CHECKSUM} 失败：{ORIGINAL_ERROR}',
  [BrightChainStrings.Error_StoreError_CloudAuthenticationFailedTemplate]:
    '云存储认证对操作 {OPERATION} 失败：{ORIGINAL_ERROR}',

  // Sealing Errors
  [BrightChainStrings.Error_SealingError_MissingPrivateKeys]:
    '并非所有成员都加载了私钥',
  [BrightChainStrings.Error_SealingError_MemberNotFound]: '未找到成员',
  [BrightChainStrings.Error_SealingError_TooManyMembersToUnlock]:
    '解锁文档的成员太多',
  [BrightChainStrings.Error_SealingError_NotEnoughMembersToUnlock]:
    '解锁文档的成员不足',
  [BrightChainStrings.Error_SealingError_EncryptedShareNotFound]:
    '未找到加密份额',
  [BrightChainStrings.Error_SealingError_InvalidBitRange]:
    '位数必须在3到20之间',
  [BrightChainStrings.Error_SealingError_InvalidMemberArray]:
    'amongstMembers必须是Member数组',
  [BrightChainStrings.Error_SealingError_FailedToSealTemplate]:
    '密封文档失败：{ERROR}',
  [BrightChainStrings.Error_SealingError_InsufficientSharesForReconstruction]:
    '密钥重建所需份额不足',
  [BrightChainStrings.Error_SealingError_KeyReconstructionFailed]:
    '密钥重建失败',

  // CBL Errors
  [BrightChainStrings.Error_CblError_BlockNotReadable]: '块不可读取',
  [BrightChainStrings.Error_CblError_CblRequired]: 'CBL是必需的',
  [BrightChainStrings.Error_CblError_WhitenedBlockFunctionRequired]:
    'getWhitenedBlock函数是必需的',
  [BrightChainStrings.Error_CblError_FailedToLoadBlock]: '加载块失败',
  [BrightChainStrings.Error_CblError_ExpectedEncryptedDataBlock]:
    '期望加密数据块',
  [BrightChainStrings.Error_CblError_ExpectedOwnedDataBlock]:
    '期望拥有的数据块',
  [BrightChainStrings.Error_CblError_InvalidStructure]: '无效的CBL结构',
  [BrightChainStrings.Error_CblError_CreatorUndefined]: '创建者不能为undefined',
  [BrightChainStrings.Error_CblError_CreatorRequiredForSignature]:
    '签名验证需要创建者',
  [BrightChainStrings.Error_CblError_InvalidCreatorId]: '无效的创建者ID',
  [BrightChainStrings.Error_CblError_FileNameRequired]: '文件名是必需的',
  [BrightChainStrings.Error_CblError_FileNameEmpty]: '文件名不能为空',
  [BrightChainStrings.Error_CblError_FileNameWhitespace]:
    '文件名不能以空格开头或结尾',
  [BrightChainStrings.Error_CblError_FileNameInvalidChar]: '文件名包含无效字符',
  [BrightChainStrings.Error_CblError_FileNameControlChars]:
    '文件名包含控制字符',
  [BrightChainStrings.Error_CblError_FileNamePathTraversal]:
    '文件名不能包含路径遍历',
  [BrightChainStrings.Error_CblError_MimeTypeRequired]: 'MIME类型是必需的',
  [BrightChainStrings.Error_CblError_MimeTypeEmpty]: 'MIME类型不能为空',
  [BrightChainStrings.Error_CblError_MimeTypeWhitespace]:
    'MIME类型不能以空格开头或结尾',
  [BrightChainStrings.Error_CblError_MimeTypeLowercase]: 'MIME类型必须是小写',
  [BrightChainStrings.Error_CblError_MimeTypeInvalidFormat]:
    '无效的MIME类型格式',
  [BrightChainStrings.Error_CblError_InvalidBlockSize]: '无效的块大小',
  [BrightChainStrings.Error_CblError_MetadataSizeExceeded]:
    '元数据大小超过最大允许大小',
  [BrightChainStrings.Error_CblError_MetadataSizeNegative]:
    '总元数据大小不能为负',
  [BrightChainStrings.Error_CblError_InvalidMetadataBuffer]:
    '无效的元数据缓冲区',
  [BrightChainStrings.Error_CblError_CreationFailedTemplate]:
    '创建CBL块失败：{ERROR}',
  [BrightChainStrings.Error_CblError_InsufficientCapacityTemplate]:
    '块大小（{BLOCK_SIZE}）太小，无法容纳CBL数据（{DATA_SIZE}）',
  [BrightChainStrings.Error_CblError_NotExtendedCbl]: '不是扩展CBL',
  [BrightChainStrings.Error_CblError_InvalidSignature]: '无效的CBL签名',
  [BrightChainStrings.Error_CblError_CreatorIdMismatch]: '创建者ID不匹配',
  [BrightChainStrings.Error_CblError_FileSizeTooLarge]: '文件大小太大',
  [BrightChainStrings.Error_CblError_FileSizeTooLargeForNode]:
    '文件大小大于当前节点允许的最大值',
  [BrightChainStrings.Error_CblError_InvalidTupleSize]: '无效的元组大小',
  [BrightChainStrings.Error_CblError_FileNameTooLong]: '文件名太长',
  [BrightChainStrings.Error_CblError_MimeTypeTooLong]: 'MIME类型太长',
  [BrightChainStrings.Error_CblError_AddressCountExceedsCapacity]:
    '地址数量超出块容量',
  [BrightChainStrings.Error_CblError_CblEncrypted]:
    'CBL已加密。请先解密再使用。',
  [BrightChainStrings.Error_CblError_UserRequiredForDecryption]: '解密需要用户',
  [BrightChainStrings.Error_CblError_NotASuperCbl]: '不是超级CBL',
  [BrightChainStrings.Error_CblError_FailedToExtractCreatorId]:
    '无法从CBL头提取创建者ID字节',
  [BrightChainStrings.Error_CblError_FailedToExtractProvidedCreatorId]:
    '无法从提供的创建者提取成员ID字节',
  [BrightChainStrings.Error_CblError_PoolIntegrityError]:
    'CBL池完整性错误：一个或多个引用的块在预期的池中不存在',
  // Multi-Encrypted Errors
  [BrightChainStrings.Error_MultiEncryptedError_InvalidEphemeralPublicKeyLength]:
    '无效的临时公钥长度',
  [BrightChainStrings.Error_MultiEncryptedError_DataLengthExceedsCapacity]:
    '数据长度超出块容量',
  [BrightChainStrings.Error_MultiEncryptedError_BlockNotReadable]: '块不可读取',
  [BrightChainStrings.Error_MultiEncryptedError_DataTooShort]:
    '数据太短，无法包含加密头',
  [BrightChainStrings.Error_MultiEncryptedError_CreatorMustBeMember]:
    '创建者必须是Member',
  [BrightChainStrings.Error_MultiEncryptedError_InvalidIVLength]:
    '无效的IV长度',
  [BrightChainStrings.Error_MultiEncryptedError_InvalidAuthTagLength]:
    '无效的认证标签长度',
  [BrightChainStrings.Error_MultiEncryptedError_ChecksumMismatch]:
    '校验和不匹配',
  [BrightChainStrings.Error_MultiEncryptedError_RecipientMismatch]:
    '收件人列表与头部收件人数量不匹配',
  [BrightChainStrings.Error_MultiEncryptedError_RecipientsAlreadyLoaded]:
    '收件人已加载',

  // Block Errors
  [BrightChainStrings.Error_BlockError_CreatorRequired]: '创建者是必需的',
  [BrightChainStrings.Error_BlockError_DataLengthExceedsCapacity]:
    '数据长度超出块容量',
  [BrightChainStrings.Error_BlockError_DataRequired]: '数据是必需的',
  [BrightChainStrings.Error_BlockError_ActualDataLengthExceedsDataLength]:
    '实际数据长度不能超过数据长度',
  [BrightChainStrings.Error_BlockError_ActualDataLengthNegative]:
    '实际数据长度必须是正数',
  [BrightChainStrings.Error_BlockError_CreatorRequiredForEncryption]:
    '加密需要创建者',
  [BrightChainStrings.Error_BlockError_UnexpectedEncryptedBlockType]:
    '意外的加密块类型',
  [BrightChainStrings.Error_BlockError_CannotEncrypt]: '块无法加密',
  [BrightChainStrings.Error_BlockError_CannotDecrypt]: '块无法解密',
  [BrightChainStrings.Error_BlockError_CreatorPrivateKeyRequired]:
    '需要创建者私钥',
  [BrightChainStrings.Error_BlockError_InvalidMultiEncryptionRecipientCount]:
    '无效的多重加密收件人数量',
  [BrightChainStrings.Error_BlockError_InvalidNewBlockType]: '无效的新块类型',
  [BrightChainStrings.Error_BlockError_UnexpectedEphemeralBlockType]:
    '意外的临时块类型',
  [BrightChainStrings.Error_BlockError_RecipientRequired]: '收件人是必需的',
  [BrightChainStrings.Error_BlockError_RecipientKeyRequired]: '需要收件人私钥',
  [BrightChainStrings.Error_BlockError_DataLengthMustMatchBlockSize]:
    '数据长度必须与块大小匹配',

  // Whitened Errors
  [BrightChainStrings.Error_WhitenedError_BlockNotReadable]: '块不可读取',
  [BrightChainStrings.Error_WhitenedError_BlockSizeMismatch]: '块大小必须匹配',
  [BrightChainStrings.Error_WhitenedError_DataLengthMismatch]:
    '数据和随机数据长度必须匹配',
  [BrightChainStrings.Error_WhitenedError_InvalidBlockSize]: '无效的块大小',

  // Tuple Errors
  [BrightChainStrings.Error_TupleError_InvalidTupleSize]: '无效的元组大小',
  [BrightChainStrings.Error_TupleError_BlockSizeMismatch]:
    '元组中的所有块必须具有相同的大小',
  [BrightChainStrings.Error_TupleError_NoBlocksToXor]: '没有块可进行XOR',
  [BrightChainStrings.Error_TupleError_InvalidBlockCount]: '元组的块数量无效',
  [BrightChainStrings.Error_TupleError_InvalidBlockType]: '无效的块类型',
  [BrightChainStrings.Error_TupleError_InvalidSourceLength]: '源长度必须是正数',
  [BrightChainStrings.Error_TupleError_RandomBlockGenerationFailed]:
    '生成随机块失败',
  [BrightChainStrings.Error_TupleError_WhiteningBlockGenerationFailed]:
    '生成白化块失败',
  [BrightChainStrings.Error_TupleError_MissingParameters]: '所有参数都是必需的',
  [BrightChainStrings.Error_TupleError_XorOperationFailedTemplate]:
    'XOR块失败：{ERROR}',
  [BrightChainStrings.Error_TupleError_DataStreamProcessingFailedTemplate]:
    '处理数据流失败：{ERROR}',
  [BrightChainStrings.Error_TupleError_EncryptedDataStreamProcessingFailedTemplate]:
    '处理加密数据流失败：{ERROR}',
  [BrightChainStrings.Error_TupleError_PoolBoundaryViolationTemplate]:
    '池边界违规：{BLOCK_TYPE} 属于池 "{ACTUAL_POOL}"，但元组需要池 "{EXPECTED_POOL}"',

  // Memory Tuple Errors
  [BrightChainStrings.Error_MemoryTupleError_InvalidTupleSizeTemplate]:
    '元组必须有 {TUPLE_SIZE} 个块',
  [BrightChainStrings.Error_MemoryTupleError_BlockSizeMismatch]:
    '元组中的所有块必须具有相同的大小',
  [BrightChainStrings.Error_MemoryTupleError_NoBlocksToXor]: '没有块可进行XOR',
  [BrightChainStrings.Error_MemoryTupleError_InvalidBlockCount]:
    '元组的块数量无效',
  [BrightChainStrings.Error_MemoryTupleError_ExpectedBlockIdsTemplate]:
    '期望 {TUPLE_SIZE} 个块ID',
  [BrightChainStrings.Error_MemoryTupleError_ExpectedBlocksTemplate]:
    '期望 {TUPLE_SIZE} 个块',

  // Handle Tuple Errors
  [BrightChainStrings.Error_HandleTupleError_InvalidTupleSizeTemplate]:
    '无效的元组大小（{TUPLE_SIZE}）',
  [BrightChainStrings.Error_HandleTupleError_BlockSizeMismatch]:
    '元组中的所有块必须具有相同的大小',
  [BrightChainStrings.Error_HandleTupleError_NoBlocksToXor]: '没有块可进行XOR',
  [BrightChainStrings.Error_HandleTupleError_BlockSizesMustMatch]:
    '块大小必须匹配',
  [BrightChainStrings.Error_HandleTupleError_PoolMismatchTemplate]:
    '池不匹配：块 {BLOCK_ID} 属于池 "{ACTUAL_POOL}"，但元组需要池 "{EXPECTED_POOL}"',

  // Stream Errors
  [BrightChainStrings.Error_StreamError_BlockSizeRequired]: '块大小是必需的',
  [BrightChainStrings.Error_StreamError_WhitenedBlockSourceRequired]:
    '白化块源是必需的',
  [BrightChainStrings.Error_StreamError_RandomBlockSourceRequired]:
    '随机块源是必需的',
  [BrightChainStrings.Error_StreamError_InputMustBeBuffer]: '输入必须是buffer',
  [BrightChainStrings.Error_StreamError_FailedToGetRandomBlock]:
    '获取随机块失败',
  [BrightChainStrings.Error_StreamError_FailedToGetWhiteningBlock]:
    '获取白化/随机块失败',
  [BrightChainStrings.Error_StreamError_IncompleteEncryptedBlock]:
    '加密块不完整',

  // Member Errors
  [BrightChainStrings.Error_MemberError_InsufficientRandomBlocks]:
    '随机块不足。',
  [BrightChainStrings.Error_MemberError_FailedToCreateMemberBlocks]:
    '创建成员块失败。',
  [BrightChainStrings.Error_MemberError_InvalidMemberBlocks]: '无效的成员块。',
  [BrightChainStrings.Error_MemberError_PrivateKeyRequiredToDeriveVotingKeyPair]:
    '需要私钥来派生投票密钥对。',

  // General Errors
  [BrightChainStrings.Error_Hydration_FailedToHydrateTemplate]:
    '水合失败：{ERROR}',
  [BrightChainStrings.Error_Serialization_FailedToSerializeTemplate]:
    '序列化失败：{ERROR}',
  [BrightChainStrings.Error_Checksum_Invalid]: '无效的校验和。',
  [BrightChainStrings.Error_Creator_Invalid]: '无效的创建者。',
  [BrightChainStrings.Error_ID_InvalidFormat]: '无效的ID格式。',
  [BrightChainStrings.Error_TupleCount_InvalidTemplate]:
    '无效的元组数量（{TUPLE_COUNT}），必须在 {TUPLE_MIN_SIZE} 和 {TUPLE_MAX_SIZE} 之间',
  [BrightChainStrings.Error_References_Invalid]: '无效的引用。',
  [BrightChainStrings.Error_SessionID_Invalid]: '无效的会话ID。',
  [BrightChainStrings.Error_Signature_Invalid]: '无效的签名。',
  [BrightChainStrings.Error_Metadata_Mismatch]: '元数据不匹配。',
  [BrightChainStrings.Error_Token_Expired]: '令牌已过期。',
  [BrightChainStrings.Error_Token_Invalid]: '无效的令牌。',
  [BrightChainStrings.Error_Unexpected_Error]: '发生意外错误。',
  [BrightChainStrings.Error_User_NotFound]: '未找到用户。',
  [BrightChainStrings.Error_Validation_Error]: '验证错误。',
  [BrightChainStrings.Error_Capacity_Insufficient]: '容量不足。',
  [BrightChainStrings.Error_Implementation_NotImplemented]: '未实现。',

  // Block Sizes
  [BrightChainStrings.BlockSize_Unknown]: '未知',
  [BrightChainStrings.BlockSize_Message]: '消息',
  [BrightChainStrings.BlockSize_Tiny]: '微型',
  [BrightChainStrings.BlockSize_Small]: '小型',
  [BrightChainStrings.BlockSize_Medium]: '中型',
  [BrightChainStrings.BlockSize_Large]: '大型',
  [BrightChainStrings.BlockSize_Huge]: '巨型',

  // Document Errors
  [BrightChainStrings.Error_DocumentError_InvalidValueTemplate]:
    '{KEY} 的值无效',
  [BrightChainStrings.Error_DocumentError_FieldRequiredTemplate]:
    '字段 {KEY} 是必需的。',
  [BrightChainStrings.Error_DocumentError_AlreadyInitialized]:
    '文档子系统已初始化',
  [BrightChainStrings.Error_DocumentError_Uninitialized]: '文档子系统未初始化',

  // XOR Service Errors
  [BrightChainStrings.Error_Xor_LengthMismatchTemplate]:
    'XOR需要等长数组：a.length={A_LENGTH}，b.length={B_LENGTH}',
  [BrightChainStrings.Error_Xor_NoArraysProvided]: 'XOR至少需要提供一个数组',
  [BrightChainStrings.Error_Xor_ArrayLengthMismatchTemplate]:
    '所有数组必须具有相同的长度。期望：{EXPECTED_LENGTH}，实际：{ACTUAL_LENGTH}，索引 {INDEX}',
  [BrightChainStrings.Error_Xor_CryptoApiNotAvailable]:
    '此环境中不可用Crypto API',

  // Tuple Storage Service Errors
  [BrightChainStrings.Error_TupleStorage_DataExceedsBlockSizeTemplate]:
    '数据大小（{DATA_SIZE}）超过块大小（{BLOCK_SIZE}）',
  [BrightChainStrings.Error_TupleStorage_InvalidMagnetProtocol]:
    '无效的磁力协议。期望"magnet:"',
  [BrightChainStrings.Error_TupleStorage_InvalidMagnetType]:
    '无效的磁力类型。期望"brightchain"',
  [BrightChainStrings.Error_TupleStorage_MissingMagnetParameters]:
    '缺少必需的磁力参数',

  // Location Record Errors
  [BrightChainStrings.Error_LocationRecord_NodeIdRequired]: '节点ID是必需的',
  [BrightChainStrings.Error_LocationRecord_LastSeenRequired]:
    '最后查看时间戳是必需的',
  [BrightChainStrings.Error_LocationRecord_IsAuthoritativeRequired]:
    'isAuthoritative标志是必需的',
  [BrightChainStrings.Error_LocationRecord_InvalidLastSeenDate]:
    '无效的最后查看日期',
  [BrightChainStrings.Error_LocationRecord_InvalidLatencyMs]:
    '延迟必须是非负数',
  [BrightChainStrings.Error_LocationRecord_InvalidPoolId]: '无效的池ID格式',

  // Metadata Errors
  [BrightChainStrings.Error_Metadata_BlockIdRequired]: '块ID是必需的',
  [BrightChainStrings.Error_Metadata_CreatedAtRequired]: '创建时间戳是必需的',
  [BrightChainStrings.Error_Metadata_LastAccessedAtRequired]:
    '最后访问时间戳是必需的',
  [BrightChainStrings.Error_Metadata_LocationUpdatedAtRequired]:
    '位置更新时间戳是必需的',
  [BrightChainStrings.Error_Metadata_InvalidCreatedAtDate]: '无效的创建日期',
  [BrightChainStrings.Error_Metadata_InvalidLastAccessedAtDate]:
    '无效的最后访问日期',
  [BrightChainStrings.Error_Metadata_InvalidLocationUpdatedAtDate]:
    '无效的位置更新日期',
  [BrightChainStrings.Error_Metadata_InvalidExpiresAtDate]: '无效的过期日期',
  [BrightChainStrings.Error_Metadata_InvalidAvailabilityStateTemplate]:
    '无效的可用性状态：{STATE}',
  [BrightChainStrings.Error_Metadata_LocationRecordsMustBeArray]:
    '位置记录必须是数组',
  [BrightChainStrings.Error_Metadata_InvalidLocationRecordTemplate]:
    '索引 {INDEX} 处的位置记录无效',
  [BrightChainStrings.Error_Metadata_InvalidAccessCount]:
    '访问计数必须是非负数',
  [BrightChainStrings.Error_Metadata_InvalidTargetReplicationFactor]:
    '目标复制因子必须是正数',
  [BrightChainStrings.Error_Metadata_InvalidSize]: '大小必须是非负数',
  [BrightChainStrings.Error_Metadata_ParityBlockIdsMustBeArray]:
    '奇偶校验块ID必须是数组',
  [BrightChainStrings.Error_Metadata_ReplicaNodeIdsMustBeArray]:
    '副本节点ID必须是数组',

  // Service Provider Errors
  [BrightChainStrings.Error_ServiceProvider_UseSingletonInstance]:
    '使用ServiceProvider.getInstance()而不是创建新实例',
  [BrightChainStrings.Error_ServiceProvider_NotInitialized]:
    'ServiceProvider尚未初始化',
  [BrightChainStrings.Error_ServiceLocator_NotSet]: 'ServiceLocator尚未设置',

  // Block Service Errors (additional)
  [BrightChainStrings.Error_BlockService_CannotEncrypt]: '无法加密块',
  [BrightChainStrings.Error_BlockService_BlocksArrayEmpty]: '块数组不能为空',
  [BrightChainStrings.Error_BlockService_BlockSizesMustMatch]:
    '所有块必须具有相同的块大小',

  // Message Router Errors
  [BrightChainStrings.Error_MessageRouter_MessageNotFoundTemplate]:
    '未找到消息：{MESSAGE_ID}',

  // Browser Config Errors
  [BrightChainStrings.Error_BrowserConfig_NotImplementedTemplate]:
    '方法 {METHOD} 在浏览器环境中未实现',

  // Debug Errors
  [BrightChainStrings.Error_Debug_UnsupportedFormat]: '调试输出不支持的格式',

  // Secure Heap Storage Errors
  [BrightChainStrings.Error_SecureHeap_KeyNotFound]: '在安全堆存储中未找到密钥',

  // I18n Errors
  [BrightChainStrings.Error_I18n_KeyConflictObjectTemplate]:
    '检测到密钥冲突：{KEY} 已存在于 {OBJECT} 中',
  [BrightChainStrings.Error_I18n_KeyConflictValueTemplate]:
    '检测到密钥冲突：{KEY} 具有冲突值 {VALUE}',
  [BrightChainStrings.Error_I18n_StringsNotFoundTemplate]:
    '未找到语言的字符串：{LANGUAGE}',

  // Document Errors (additional)
  [BrightChainStrings.Error_Document_CreatorRequiredForSaving]:
    '保存文档需要创建者',
  [BrightChainStrings.Error_Document_CreatorRequiredForEncrypting]:
    '加密文档需要创建者',
  [BrightChainStrings.Error_Document_NoEncryptedData]: '没有可用的加密数据',
  [BrightChainStrings.Error_Document_FieldShouldBeArrayTemplate]:
    '字段 {FIELD} 应该是数组',
  [BrightChainStrings.Error_Document_InvalidArrayValueTemplate]:
    '字段 {FIELD} 的索引 {INDEX} 处的数组值无效',
  [BrightChainStrings.Error_Document_FieldRequiredTemplate]:
    '字段 {FIELD} 是必需的',
  [BrightChainStrings.Error_Document_FieldInvalidTemplate]: '字段 {FIELD} 无效',
  [BrightChainStrings.Error_Document_InvalidValueTemplate]:
    '字段 {FIELD} 的值无效',
  [BrightChainStrings.Error_Document_InvalidValueInArrayTemplate]:
    '{KEY} 的数组中存在无效值',
  [BrightChainStrings.Error_Document_FieldIsRequiredTemplate]:
    '字段 {FIELD} 是必填的',
  [BrightChainStrings.Error_Document_FieldIsInvalidTemplate]:
    '字段 {FIELD} 无效',
  [BrightChainStrings.Error_MemberDocument_PublicCblIdNotSet]:
    '公共CBL ID尚未设置',
  [BrightChainStrings.Error_MemberDocument_PrivateCblIdNotSet]:
    '私有CBL ID尚未设置',
  [BrightChainStrings.Error_BaseMemberDocument_PublicCblIdNotSet]:
    '基础成员文档公共CBL ID尚未设置',
  [BrightChainStrings.Error_BaseMemberDocument_PrivateCblIdNotSet]:
    '基础成员文档私有CBL ID尚未设置',

  // SimpleBrightChain Errors
  [BrightChainStrings.Error_SimpleBrightChain_BlockNotFoundTemplate]:
    '未找到块：{BLOCK_ID}',

  // Currency Code Errors
  [BrightChainStrings.Error_CurrencyCode_Invalid]: '无效的货币代码',

  // Console Output Warnings
  [BrightChainStrings.Warning_BufferUtils_InvalidBase64String]:
    '提供了无效的base64字符串',
  [BrightChainStrings.Warning_Keyring_FailedToLoad]: '从存储加载密钥环失败',
  [BrightChainStrings.Warning_I18n_TranslationFailedTemplate]:
    '密钥 {KEY} 的翻译失败',

  // Console Output Errors
  [BrightChainStrings.Error_MemberStore_RollbackFailed]: '回滚成员存储事务失败',
  [BrightChainStrings.Error_MemberCblService_CreateMemberCblFailed]:
    '创建成员CBL失败',
  [BrightChainStrings.Error_MemberCblService_ChecksumMismatch]:
    '完整性验证期间区块校验和不匹配',
  [BrightChainStrings.Error_MemberCblService_BlockRetrievalFailed]:
    '完整性验证期间检索区块失败',
  [BrightChainStrings.Error_MemberCblService_MissingRequiredFields]:
    '成员数据缺少必需字段',
  [BrightChainStrings.Error_DeliveryTimeout_HandleTimeoutFailedTemplate]:
    '处理交付超时失败：{ERROR}',

  // Validator Errors
  [BrightChainStrings.Error_Validator_InvalidBlockSizeTemplate]:
    '无效的块大小：{BLOCK_SIZE}。有效大小为：{BLOCK_SIZES}',
  [BrightChainStrings.Error_Validator_InvalidBlockTypeTemplate]:
    '无效的块类型：{BLOCK_TYPE}。有效类型为：{BLOCK_TYPES}',
  [BrightChainStrings.Error_Validator_InvalidEncryptionTypeTemplate]:
    '无效的加密类型：{ENCRYPTION_TYPE}。有效类型为：{ENCRYPTION_TYPES}',
  [BrightChainStrings.Error_Validator_RecipientCountMustBeAtLeastOne]:
    '多接收者加密的接收者数量必须至少为1',
  [BrightChainStrings.Error_Validator_RecipientCountMaximumTemplate]:
    '接收者数量不能超过 {MAXIMUM}',
  [BrightChainStrings.Error_Validator_FieldRequiredTemplate]:
    '{FIELD} 是必填的',
  [BrightChainStrings.Error_Validator_FieldCannotBeEmptyTemplate]:
    '{FIELD} 不能为空',

  // Miscellaneous Block Errors
  [BrightChainStrings.Error_BlockError_BlockSizesMustMatch]: '块大小必须匹配',
  [BrightChainStrings.Error_BlockError_DataCannotBeNullOrUndefined]:
    '数据不能为null或undefined',
  [BrightChainStrings.Error_BlockError_DataLengthExceedsBlockSizeTemplate]:
    '数据长度 ({LENGTH}) 超过块大小 ({BLOCK_SIZE})',

  // CPU Errors
  [BrightChainStrings.Error_CPU_DuplicateOpcodeErrorTemplate]:
    '指令集 {INSTRUCTION_SET} 中存在重复的操作码 0x{OPCODE}',
  [BrightChainStrings.Error_CPU_NotImplementedTemplate]: '{INSTRUCTION} 未实现',
  [BrightChainStrings.Error_CPU_InvalidReadSizeTemplate]:
    '无效的读取大小: {SIZE}',
  [BrightChainStrings.Error_CPU_StackOverflow]: '堆栈溢出',
  [BrightChainStrings.Error_CPU_StackUnderflow]: '堆栈下溢',

  // Member CBL Errors
  [BrightChainStrings.Error_MemberCBL_PublicCBLIdNotSet]: '公共CBL ID未设置',
  [BrightChainStrings.Error_MemberCBL_PrivateCBLIdNotSet]: '私有CBL ID未设置',

  // Member Document Errors
  [BrightChainStrings.Error_MemberDocument_Hint]:
    '请使用 MemberDocument.create() 而不是 new MemberDocument()',
  [BrightChainStrings.Error_MemberDocument_CBLNotGenerated]:
    'CBL尚未生成。请在调用toMember()之前调用generateCBLs()',

  // Member Profile Document Errors
  [BrightChainStrings.Error_MemberProfileDocument_Hint]:
    '请使用 MemberProfileDocument.create() 而不是 new MemberProfileDocument()',

  // BrightTrust Document Errors
  [BrightChainStrings.Error_BrightTrustDocument_CreatorMustBeSetBeforeSaving]:
    '保存前必须设置创建者',
  [BrightChainStrings.Error_BrightTrustDocument_CreatorMustBeSetBeforeEncrypting]:
    '加密前必须设置创建者',
  [BrightChainStrings.Error_BrightTrustDocument_DocumentHasNoEncryptedData]:
    '文档没有加密数据',
  [BrightChainStrings.Error_BrightTrustDocument_InvalidEncryptedDataFormat]:
    '无效的加密数据格式',
  [BrightChainStrings.Error_BrightTrustDocument_InvalidMemberIdsFormat]:
    '无效的成员ID格式',
  [BrightChainStrings.Error_BrightTrustDocument_InvalidSignatureFormat]:
    '无效的签名格式',
  [BrightChainStrings.Error_BrightTrustDocument_InvalidCreatorIdFormat]:
    '无效的创建者ID格式',
  [BrightChainStrings.Error_BrightTrustDocument_InvalidChecksumFormat]:
    '无效的校验和格式',

  // Block Logger
  [BrightChainStrings.BlockLogger_Redacted]: '已编辑',

  // Member Schema Errors
  [BrightChainStrings.Error_MemberSchema_InvalidIdFormat]: '无效的ID格式',
  [BrightChainStrings.Error_MemberSchema_InvalidPublicKeyFormat]:
    '无效的公钥格式',
  [BrightChainStrings.Error_MemberSchema_InvalidVotingPublicKeyFormat]:
    '无效的投票公钥格式',
  [BrightChainStrings.Error_MemberSchema_InvalidEmailFormat]:
    '无效的电子邮件格式',
  [BrightChainStrings.Error_MemberSchema_InvalidRecoveryDataFormat]:
    '无效的恢复数据格式',
  [BrightChainStrings.Error_MemberSchema_InvalidTrustedPeersFormat]:
    '无效的受信任节点格式',
  [BrightChainStrings.Error_MemberSchema_InvalidBlockedPeersFormat]:
    '无效的已屏蔽节点格式',
  [BrightChainStrings.Error_MemberSchema_InvalidActivityLogFormat]:
    '无效的活动日志格式',

  // Message Metadata Schema Errors
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidRecipientsFormat]:
    '无效的收件人格式',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidPriorityFormat]:
    '无效的优先级格式',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidDeliveryStatusFormat]:
    '无效的送达状态格式',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidAcknowledgementsFormat]:
    '无效的确认回执格式',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidEncryptionSchemeFormat]:
    '无效的加密方案格式',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidCBLBlockIDsFormat]:
    '无效的CBL区块ID格式',

  // Security
  [BrightChainStrings.Security_DOS_InputSizeExceedsLimitErrorTemplate]:
    '输入大小 {SIZE} 超过 {OPERATION} 的限制 {MAX_SIZE}',
  [BrightChainStrings.Security_DOS_OperationExceededTimeLimitErrorTemplate]:
    '操作 {OPERATION} 超过超时时间 {MAX_TIME} 毫秒',
  [BrightChainStrings.Security_RateLimiter_RateLimitExceededErrorTemplate]:
    '{OPERATION} 的速率限制已超过',
  [BrightChainStrings.Security_AuditLogger_SignatureValidationResultTemplate]:
    '签名验证 {RESULT}',
  [BrightChainStrings.Security_AuditLogger_Failure]: '失败',
  [BrightChainStrings.Security_AuditLogger_Success]: '成功',
  [BrightChainStrings.Security_AuditLogger_BlockCreated]: '区块已创建',
  [BrightChainStrings.Security_AuditLogger_EncryptionPerformed]: '加密已执行',
  [BrightChainStrings.Security_AuditLogger_DecryptionResultTemplate]:
    '解密 {RESULT}',
  [BrightChainStrings.Security_AuditLogger_AccessDeniedTemplate]:
    '拒绝访问 {RESOURCE}',
  [BrightChainStrings.Security_AuditLogger_Security]: '安全',

  // Delivery Timeout
  [BrightChainStrings.DeliveryTimeout_FailedToHandleTimeoutTemplate]:
    '无法处理 {MESSAGE_ID}:{RECIPIENT_ID} 的超时',

  // Message CBL Service
  [BrightChainStrings.MessageCBLService_MessageSizeExceedsMaximumTemplate]:
    '消息大小 {SIZE} 超过最大值 {MAX_SIZE}',
  [BrightChainStrings.MessageCBLService_FailedToCreateMessageAfterRetries]:
    '重试后仍无法创建消息',
  [BrightChainStrings.MessageCBLService_FailedToRetrieveMessageTemplate]:
    '无法检索消息 {MESSAGE_ID}',
  [BrightChainStrings.MessageCBLService_MessageTypeIsRequired]:
    '消息类型是必填项',
  [BrightChainStrings.MessageCBLService_SenderIDIsRequired]: '发送者ID是必填项',
  [BrightChainStrings.MessageCBLService_RecipientCountExceedsMaximumTemplate]:
    '收件人数量 {COUNT} 超过最大值 {MAXIMUM}',

  // Message Encryption Service
  [BrightChainStrings.MessageEncryptionService_NoRecipientPublicKeysProvided]:
    '未提供收件人公钥',
  [BrightChainStrings.MessageEncryptionService_FailedToEncryptTemplate]:
    '为收件人 {RECIPIENT_ID} 加密失败: {ERROR}',
  [BrightChainStrings.MessageEncryptionService_BroadcastEncryptionFailedTemplate]:
    '广播加密失败: {TEMPLATE}',
  [BrightChainStrings.MessageEncryptionService_DecryptionFailedTemplate]:
    '解密失败: {ERROR}',
  [BrightChainStrings.MessageEncryptionService_KeyDecryptionFailedTemplate]:
    '密钥解密失败: {ERROR}',

  // Message Logger
  [BrightChainStrings.MessageLogger_MessageCreated]: '消息已创建',
  [BrightChainStrings.MessageLogger_RoutingDecision]: '路由决策',
  [BrightChainStrings.MessageLogger_DeliveryFailure]: '投递失败',
  [BrightChainStrings.MessageLogger_EncryptionFailure]: '加密失败',
  [BrightChainStrings.MessageLogger_SlowQueryDetected]: '检测到慢查询',

  // Message Router
  [BrightChainStrings.MessageRouter_RoutingTimeout]: '路由超时',
  [BrightChainStrings.MessageRouter_FailedToRouteToAnyRecipient]:
    '无法将消息路由到任何收件人',
  [BrightChainStrings.MessageRouter_ForwardingLoopDetected]: '检测到转发循环',

  // Block Format Service
  [BrightChainStrings.BlockFormatService_DataTooShort]:
    '数据太短，不足以构成结构化块头（至少需要4字节）',
  [BrightChainStrings.BlockFormatService_InvalidStructuredBlockFormatTemplate]:
    '无效的结构化块类型: 0x{TYPE}',
  [BrightChainStrings.BlockFormatService_CannotDetermineHeaderSize]:
    '无法确定头部大小 - 数据可能被截断',
  [BrightChainStrings.BlockFormatService_Crc8MismatchTemplate]:
    'CRC8不匹配 - 头部可能已损坏（期望 0x{EXPECTED}，得到 0x{CHECKSUM}）',
  [BrightChainStrings.BlockFormatService_DataAppearsEncrypted]:
    '数据似乎已进行ECIES加密 - 请在解析前解密',
  [BrightChainStrings.BlockFormatService_UnknownBlockFormat]:
    '未知的块格式 - 缺少0xBC魔术前缀（可能是原始数据）',

  // CBL Service
  [BrightChainStrings.CBLService_NotAMessageCBL]: '不是消息CBL',
  [BrightChainStrings.CBLService_CreatorIDByteLengthMismatchTemplate]:
    '创建者ID字节长度不匹配：得到 {LENGTH}，期望 {EXPECTED}',
  [BrightChainStrings.CBLService_CreatorIDProviderReturnedBytesLengthMismatchTemplate]:
    '创建者ID提供者返回了 {LENGTH} 字节，期望 {EXPECTED}',
  [BrightChainStrings.CBLService_SignatureLengthMismatchTemplate]:
    '签名长度不匹配：得到 {LENGTH}，期望 {EXPECTED}',
  [BrightChainStrings.CBLService_DataAppearsRaw]:
    '数据似乎是没有结构化头部的原始数据',
  [BrightChainStrings.CBLService_InvalidBlockFormat]: '无效的块格式',
  [BrightChainStrings.CBLService_SubCBLCountChecksumMismatchTemplate]:
    'SubCblCount ({COUNT}) 与 subCblChecksums 长度 ({EXPECTED}) 不匹配',
  [BrightChainStrings.CBLService_InvalidDepthTemplate]:
    '深度必须在1到65535之间，得到 {DEPTH}',
  [BrightChainStrings.CBLService_ExpectedSuperCBLTemplate]:
    '期望 SuperCBL（块类型 0x03），得到块类型 0x{TYPE}',

  // Global Service Provider
  [BrightChainStrings.GlobalServiceProvider_NotInitialized]:
    '服务提供者未初始化。请先调用 ServiceProvider.getInstance()。',

  // Block Store Adapter
  [BrightChainStrings.BlockStoreAdapter_DataLengthExceedsBlockSizeTemplate]:
    '数据长度 ({LENGTH}) 超过块大小 ({BLOCK_SIZE})',

  // Memory Block Store
  [BrightChainStrings.MemoryBlockStore_FECServiceUnavailable]: 'FEC服务不可用',
  [BrightChainStrings.MemoryBlockStore_FECServiceUnavailableInThisEnvironment]:
    'FEC服务在此环境中不可用',
  [BrightChainStrings.MemoryBlockStore_NoParityDataAvailable]:
    '没有可用于恢复的奇偶校验数据',
  [BrightChainStrings.MemoryBlockStore_BlockMetadataNotFound]: '未找到块元数据',
  [BrightChainStrings.MemoryBlockStore_RecoveryFailedInsufficientParityData]:
    '恢复失败 - 奇偶校验数据不足',
  [BrightChainStrings.MemoryBlockStore_UnknownRecoveryError]: '未知恢复错误',
  [BrightChainStrings.MemoryBlockStore_CBLDataCannotBeEmpty]: 'CBL数据不能为空',
  [BrightChainStrings.MemoryBlockStore_CBLDataTooLargeTemplate]:
    'CBL数据过大：填充大小（{LENGTH}）超过块大小（{BLOCK_SIZE}）。请使用更大的块大小或更小的CBL。',
  [BrightChainStrings.MemoryBlockStore_Block1NotFound]: '未找到块1且恢复失败',
  [BrightChainStrings.MemoryBlockStore_Block2NotFound]: '未找到块2且恢复失败',
  [BrightChainStrings.MemoryBlockStore_InvalidMagnetURL]:
    '无效的磁力URL：必须以"magnet:?"开头',
  [BrightChainStrings.MemoryBlockStore_InvalidMagnetURLXT]:
    '无效的磁力URL：xt参数必须为"urn:brightchain:cbl"',
  [BrightChainStrings.MemoryBlockStore_InvalidMagnetURLMissingTemplate]:
    '无效的磁力URL：缺少{PARAMETER}参数',
  [BrightChainStrings.MemoryBlockStore_InvalidMagnetURL_InvalidBlockSize]:
    '无效的磁力URL：无效的区块大小',

  // Checksum
  [BrightChainStrings.Checksum_InvalidTemplate]:
    '校验和必须为{EXPECTED}字节，实际为{LENGTH}字节',
  [BrightChainStrings.Checksum_InvalidHexString]:
    '无效的十六进制字符串：包含非十六进制字符',
  [BrightChainStrings.Checksum_InvalidHexStringTemplate]:
    '无效的十六进制字符串长度：应为{EXPECTED}个字符，实际为{LENGTH}个',

  [BrightChainStrings.Error_XorLengthMismatchTemplate]:
    'XOR需要等长数组{CONTEXT}：a.length={A_LENGTH}，b.length={B_LENGTH}',
  [BrightChainStrings.Error_XorAtLeastOneArrayRequired]:
    'XOR至少需要提供一个数组',

  [BrightChainStrings.Error_InvalidUnixTimestampTemplate]:
    '无效的Unix时间戳：{TIMESTAMP}',
  [BrightChainStrings.Error_InvalidDateStringTemplate]:
    '无效的日期字符串："{VALUE}"。需要ISO 8601格式（例如"2024-01-23T10:30:00Z"）或Unix时间戳。',
  [BrightChainStrings.Error_InvalidDateValueTypeTemplate]:
    '无效的日期值类型：{TYPE}。需要字符串或数字。',
  [BrightChainStrings.Error_InvalidDateObjectTemplate]:
    '无效的日期对象：需要Date实例，实际为{OBJECT_STRING}',
  [BrightChainStrings.Error_InvalidDateNaN]:
    '无效的日期：日期对象包含NaN时间戳',
  [BrightChainStrings.Error_JsonValidationErrorTemplate]:
    '字段 {FIELD} 的JSON验证失败：{REASON}',
  [BrightChainStrings.Error_JsonValidationError_MustBeNonNull]:
    '必须是非空对象',
  [BrightChainStrings.Error_JsonValidationError_FieldRequired]: '字段是必需的',
  [BrightChainStrings.Error_JsonValidationError_MustBeValidBlockSize]:
    '必须是有效的BlockSize枚举值',
  [BrightChainStrings.Error_JsonValidationError_MustBeValidBlockType]:
    '必须是有效的BlockType枚举值',
  [BrightChainStrings.Error_JsonValidationError_MustBeValidBlockDataType]:
    '必须是有效的BlockDataType枚举值',
  [BrightChainStrings.Error_JsonValidationError_MustBeNumber]: '必须是数字',
  [BrightChainStrings.Error_JsonValidationError_MustBeNonNegative]:
    '必须是非负数',
  [BrightChainStrings.Error_JsonValidationError_MustBeInteger]: '必须是整数',
  [BrightChainStrings.Error_JsonValidationError_MustBeISO8601DateStringOrUnixTimestamp]:
    '必须是有效的ISO 8601字符串或Unix时间戳',
  [BrightChainStrings.Error_JsonValidationError_MustBeString]: '必须是字符串',
  [BrightChainStrings.Error_JsonValidationError_MustNotBeEmpty]: '不能为空',
  [BrightChainStrings.Error_JsonValidationError_JSONParsingFailed]:
    'JSON解析失败',
  [BrightChainStrings.Error_JsonValidationError_ValidationFailed]: '验证失败',
  [BrightChainStrings.XorUtils_BlockSizeMustBePositiveTemplate]:
    '块大小必须为正数: {BLOCK_SIZE}',
  [BrightChainStrings.XorUtils_InvalidPaddedDataTemplate]:
    '无效的填充数据: 太短 ({LENGTH} 字节，至少需要 {REQUIRED})',
  [BrightChainStrings.XorUtils_InvalidLengthPrefixTemplate]:
    '无效的长度前缀: 声明 {LENGTH} 字节但仅有 {AVAILABLE} 可用',
  [BrightChainStrings.BlockPaddingTransform_MustBeArray]:
    '输入必须是 Uint8Array、TypedArray 或 ArrayBuffer',
  [BrightChainStrings.CblStream_UnknownErrorReadingData]:
    '读取数据时发生未知错误',
  [BrightChainStrings.CurrencyCode_InvalidCurrencyCode]: '无效的货币代码',
  [BrightChainStrings.EnergyAccount_InsufficientBalanceTemplate]:
    '余额不足: 需要 {AMOUNT}J，可用 {AVAILABLE_BALANCE}J',
  [BrightChainStrings.Init_BrowserCompatibleConfiguration]:
    '使用 GuidV4Provider 的 BrightChain 浏览器兼容配置',
  [BrightChainStrings.Init_NotInitialized]:
    'BrightChain 库未初始化。请先调用 initializeBrightChain()。',
  [BrightChainStrings.ModInverse_MultiplicativeInverseDoesNotExist]:
    '模乘法逆元不存在',
  [BrightChainStrings.PrimeTupleGeneratorStream_UnknownErrorInTransform]:
    '转换中发生未知错误',
  [BrightChainStrings.PrimeTupleGeneratorStream_UnknownErrorInMakeTuple]:
    'makeTuple 中发生未知错误',
  [BrightChainStrings.PrimeTupleGeneratorStream_UnknownErrorInFlush]:
    'flush 中发生未知错误',
  [BrightChainStrings.BrightTrustDataRecord_MustShareWithAtLeastTwoMembers]:
    '必须与至少2名成员共享',
  [BrightChainStrings.BrightTrustDataRecord_SharesRequiredExceedsMembers]:
    '所需份额超过成员数量',
  [BrightChainStrings.BrightTrustDataRecord_SharesRequiredMustBeAtLeastTwo]:
    '所需份额必须至少为2',
  [BrightChainStrings.BrightTrustDataRecord_InvalidChecksum]: '无效的校验和',
  [BrightChainStrings.BrightTrustDataRecord_InvalidSignature]: '无效的签名',
  [BrightChainStrings.SimpleBrowserStore_BlockNotFoundTemplate]:
    '未找到区块: {ID}',
  [BrightChainStrings.EncryptedBlockCreator_NoCreatorRegisteredTemplate]:
    '没有为区块类型 {TYPE} 注册创建者',
  [BrightChainStrings.TestMember_MemberNotFoundTemplate]: '未找到成员 {KEY}',

  // TCBL (Tarball CBL) Errors
  [BrightChainStrings.Error_TcblError_InvalidHeader]:
    'TCBL头部无效：缺少或不正确的魔术前缀或类型字节',
  [BrightChainStrings.Error_TcblError_ManifestChecksumMismatch]:
    'TCBL清单校验和与计算的校验和不匹配',
  [BrightChainStrings.Error_TcblError_ManifestCountMismatch]:
    'TCBL清单条目计数与实际条目描述符数量不匹配',
  [BrightChainStrings.Error_TcblError_ManifestCorrupted]:
    'TCBL清单数据已损坏或格式错误',
  [BrightChainStrings.Error_TcblError_ManifestTruncated]: 'TCBL清单数据被截断',
  [BrightChainStrings.Error_TcblError_EntryNotFound]: '在清单中未找到TCBL条目',
  [BrightChainStrings.Error_TcblError_FileNameTooLong]:
    'TCBL条目文件名超过最大允许长度',
  [BrightChainStrings.Error_TcblError_MimeTypeTooLong]:
    'TCBL条目MIME类型超过最大允许长度',
  [BrightChainStrings.Error_TcblError_PathTraversal]:
    'TCBL条目文件名包含路径遍历序列',
  [BrightChainStrings.Error_TcblError_DecompressionFailed]:
    'TCBL存档有效载荷解压缩失败',
  [BrightChainStrings.Error_TcblError_DecryptionFailed]:
    'TCBL存档有效载荷解密失败',
  [BrightChainStrings.Error_TcblError_InvalidManifestVersion]:
    'TCBL清单版本不受支持',

  // Splash
  [BrightChainStrings.Splash_Welcome]: '欢迎使用BrightChain',
  [BrightChainStrings.Splash_NextGenInfrastructure]: '去中心化应用平台',
  [BrightChainStrings.Splash_SoupCanDemo]: '汤罐演示',
  [BrightChainStrings.Splash_SoupCanDemoDescription]:
    '了解BrightChain如何将数据分解为块，并使用XOR操作将其与随机数据混合，以实现无所有者存储。',
  [BrightChainStrings.Splash_StoragePools]: '存储池',
  [BrightChainStrings.Splash_StoragePoolsDescription]:
    '探索命名空间隔离的池、内容寻址块、池范围白化和跨池隔离保证。',
  [BrightChainStrings.Splash_Messaging]: '消息传递',
  [BrightChainStrings.Splash_MessagingDescription]:
    'ECIES加密的直接消息、池共享群聊、具有可见性模式的频道、阅后即焚消息和在线状态。',
  [BrightChainStrings.Splash_BrightPass]: 'BrightPass',
  [BrightChainStrings.Splash_BrightPassDescription]:
    '去中心化密码保险库，具有凭据存储、密码生成、泄露检查和TOTP/2FA设置功能。',
  [BrightChainStrings.Splash_Database]: '数据库',
  [BrightChainStrings.Splash_DatabaseDescription]:
    '具有写时复制块、池隔离、乐观并发事务和聚合管道的文档数据库。',
  [BrightChainStrings.Splash_IdentityAndSecurity]: '身份与安全',
  [BrightChainStrings.Splash_IdentityAndSecurityDescription]:
    '纸质密钥备份、设备管理、跨平台身份证明以及公钥目录中的个人资料搜索。',
  [BrightChainStrings.Splash_TrySoupCanDemo]: '试用汤罐演示',
  [BrightChainStrings.Splash_GetStarted]: '开始使用',
  [BrightChainStrings.Splash_WhatIsBrightChain]: '什么是BrightChain？',
  [BrightChainStrings.Splash_WhatIsBrightChainDescription]:
    'BrightChain使用"明亮区块汤"概念革新数据存储。您的文件被分解为块，并使用XOR操作与随机数据混合，使它们看起来完全随机，同时保持完美的安全性。',
  [BrightChainStrings.Splash_OwnerFreeStorage]: '无所有者存储',
  [BrightChainStrings.Splash_OwnerFreeStorageDescription]:
    '加密随机性消除存储责任',
  [BrightChainStrings.Splash_EnergyEfficient]: '节能高效',
  [BrightChainStrings.Splash_EnergyEfficientDescription]:
    '无浪费的工作量证明挖矿',
  [BrightChainStrings.Splash_Decentralized]: '去中心化',
  [BrightChainStrings.Splash_DecentralizedDescription]: '分布在整个网络',
  [BrightChainStrings.Splash_AnonymousYetAccountable]: '匿名但可问责',
  [BrightChainStrings.Splash_AnonymousYetAccountableDescription]:
    '具有审核功能的隐私保护',
  [BrightChainStrings.Splash_ExploreThePlatform]: '探索平台',
  [BrightChainStrings.Splash_InteractiveDemos]:
    '展示BrightChain核心功能的互动演示',
  [BrightChainStrings.Splash_LaunchDemo]: '启动演示',

  // Splash - BrightStack
  [BrightChainStrings.Splash_BuildWithBrightStack]: '使用BrightStack构建',
  [BrightChainStrings.Splash_BuildWithBrightStackDescription]:
    'BrightStack是去中心化应用的全栈范式：BrightChain + Express + React + Node。如果你了解MERN技术栈，你就已经了解BrightStack了。',
  [BrightChainStrings.Splash_BrightStackSubtitle]:
    '将MongoDB替换为BrightDb，其他保持不变。',
  [BrightChainStrings.Splash_BrightDb]: 'BrightDb',
  [BrightChainStrings.Splash_BrightDbDescription]:
    '基于Owner-Free文件系统的MongoDB兼容文档数据库。完整的CRUD、查询、索引、事务和聚合管道。',
  [BrightChainStrings.Splash_FamiliarApi]: '熟悉的API',
  [BrightChainStrings.Splash_FamiliarApiDescription]:
    '与MongoDB相同的模式 — 集合、find、insert、update — 但每个文档都以保护隐私的白化块形式存储。',
  [BrightChainStrings.Splash_BuiltOnBrightStack]: '基于BrightStack构建',
  [BrightChainStrings.Splash_BuiltOnBrightStackDescription]:
    'BrightPass、BrightMail和BrightHub都基于BrightStack构建，证明了去中心化应用开发可以像传统全栈开发一样简单。',
  [BrightChainStrings.Splash_OpenSource]: '开源',
  [BrightChainStrings.Splash_OpenSourceDescription]:
    'BrightChain完全开源。在BrightStack上构建你自己的dApp，为去中心化的未来做出贡献。',

  // Splash - 不是加密货币
  [BrightChainStrings.Splash_NotACryptocurrency]: '不是加密货币',
  [BrightChainStrings.Splash_NotACryptocurrencyDescription]:
    '听到"区块链"，你可能会想到比特币。BrightChain从根本上不同——没有货币，没有工作量证明，没有挖矿。BrightChain不是燃烧能源来铸造代币，而是重视存储和计算的实际贡献。',
  [BrightChainStrings.Splash_NoCurrency]: '没有货币',
  [BrightChainStrings.Splash_NoCurrencyDescription]:
    'BrightChain没有代币、没有通证、没有投机资产。它是基础设施，不是金融。',
  [BrightChainStrings.Splash_NoMining]: '没有挖矿',
  [BrightChainStrings.Splash_NoMiningDescription]:
    '没有工作量证明，没有能源浪费。每一个计算周期都服务于有用的目的。',
  [BrightChainStrings.Splash_Joules]: '焦耳，不是代币',
  [BrightChainStrings.Splash_JoulesDescription]:
    '存储和计算的贡献以焦耳为单位追踪——一个与实际能源成本挂钩的单位，而非市场投机。',
  [BrightChainStrings.Splash_RealWorldValue]: '现实世界价值',
  [BrightChainStrings.Splash_RealWorldValueDescription]:
    '焦耳的价值由基于实际成本的公式设定，我们会随时间不断完善该公式——没有交易，没有波动。',
  [BrightChainStrings.Splash_Documentation]: '文档',
  [BrightChainStrings.Splash_FAQ]: '常见问题',
  [BrightChainStrings.Splash_PrivacyPolicy]: '隐私政策',
  [BrightChainStrings.Splash_TermsOfService]: '服务条款',
  // Dashboard
  [BrightChainStrings.Dashboard_Title]: '您的仪表板',
  [BrightChainStrings.Dashboard_EnergyBalance]: '能量余额',
  [BrightChainStrings.Dashboard_AvailableCredits]: '可用能量积分',
  [BrightChainStrings.Dashboard_Reputation]: '声誉',
  [BrightChainStrings.Dashboard_ReputationScore]: '网络声誉评分',
  [BrightChainStrings.Dashboard_EnergyEarned]: '已获得能量',
  [BrightChainStrings.Dashboard_EarnedDescription]: '通过提供资源获得的总量',
  [BrightChainStrings.Dashboard_EnergySpent]: '已消耗能量',
  [BrightChainStrings.Dashboard_SpentDescription]: '用于操作的总消耗量',
  [BrightChainStrings.Dashboard_Loading]: '加载中...',
  [BrightChainStrings.Dashboard_FailedToLoadBalance]: '加载余额失败',
  [BrightChainStrings.Dashboard_FailedToLoadReputation]: '加载声誉失败',
  [BrightChainStrings.Dashboard_FailedToLoadData]: '加载数据失败',

  // Admin Dashboard
  [BrightChainStrings.Admin_Dashboard_Title]: '管理面板',
  [BrightChainStrings.Admin_Dashboard_AccessDenied]: '访问被拒绝',
  [BrightChainStrings.Admin_Dashboard_AccessDeniedDescription]:
    '您没有权限查看管理面板。',
  [BrightChainStrings.Admin_Dashboard_Loading]: '正在加载面板…',
  [BrightChainStrings.Admin_Dashboard_NoData]: '没有可用数据。',
  [BrightChainStrings.Admin_Dashboard_RefreshNow]: '立即刷新',
  [BrightChainStrings.Admin_Dashboard_ErrorLastSuccessTemplate]:
    '错误 — 上次成功：{TIME}',
  [BrightChainStrings.Admin_Dashboard_ErrorLastSuccessNever]: '从未',
  [BrightChainStrings.Admin_Dashboard_ServerIdentity]: '服务器身份',
  [BrightChainStrings.Admin_Dashboard_Hostname]: '主机名',
  [BrightChainStrings.Admin_Dashboard_LocalNodeId]: '本地节点 ID',
  [BrightChainStrings.Admin_Dashboard_Timestamp]: '时间戳',
  [BrightChainStrings.Admin_Dashboard_NA]: '不适用',
  [BrightChainStrings.Admin_Dashboard_Nodes]: '节点',
  [BrightChainStrings.Admin_Dashboard_NoNodesRegistered]: '没有已注册的节点。',
  [BrightChainStrings.Admin_Dashboard_DisconnectedPeers]: '已断开的对等节点',
  [BrightChainStrings.Admin_Dashboard_LumenClients]: 'Lumen 客户端',
  [BrightChainStrings.Admin_Dashboard_ConnectedClients]: '已连接的客户端',
  [BrightChainStrings.Admin_Dashboard_RoomsTemplate]: '{COUNT} 个房间',
  [BrightChainStrings.Admin_Dashboard_NodeConnections]: '节点连接',
  [BrightChainStrings.Admin_Dashboard_NodeToNodeConnections]: '节点间连接',
  [BrightChainStrings.Admin_Dashboard_SystemMetrics]: '系统指标',
  [BrightChainStrings.Admin_Dashboard_HeapUsed]: '已用堆内存',
  [BrightChainStrings.Admin_Dashboard_HeapTotal]: '堆内存总量',
  [BrightChainStrings.Admin_Dashboard_RSS]: 'RSS',
  [BrightChainStrings.Admin_Dashboard_External]: '外部',
  [BrightChainStrings.Admin_Dashboard_UptimeTemplate]: '运行时间：{SECONDS}秒',
  [BrightChainStrings.Admin_Dashboard_NodeVersionTemplate]:
    'Node {NODE_VERSION} — App v{APP_VERSION}',
  [BrightChainStrings.Admin_Dashboard_DBStats]: '数据库统计',
  [BrightChainStrings.Admin_Dashboard_Users]: '用户',
  [BrightChainStrings.Admin_Dashboard_Roles]: '角色',
  [BrightChainStrings.Admin_Dashboard_Active]: '活跃',
  [BrightChainStrings.Admin_Dashboard_Locked]: '已锁定',
  [BrightChainStrings.Admin_Dashboard_Pending]: '待处理',
  [BrightChainStrings.Admin_Dashboard_Members]: '成员',
  [BrightChainStrings.Admin_Dashboard_Threshold]: '阈值',
  [BrightChainStrings.Admin_Dashboard_Pools]: '池',
  [BrightChainStrings.Admin_Dashboard_NoPools]: '没有池。',
  [BrightChainStrings.Admin_Dashboard_Dependencies]: '依赖项',
  [BrightChainStrings.Admin_Dashboard_BlockStore]: 'BrightStore',
  [BrightChainStrings.Admin_Dashboard_TotalBlocks]: '区块总数',
  [BrightChainStrings.Admin_Dashboard_TotalSize]: '总大小',
  [BrightChainStrings.Admin_Dashboard_TotalPosts]: '帖子总数',
  [BrightChainStrings.Admin_Dashboard_ActiveUsersLast30Days]:
    '活跃用户（30天）',
  [BrightChainStrings.Admin_Dashboard_Conversations]: '对话',
  [BrightChainStrings.Admin_Dashboard_Messages]: '消息',
  [BrightChainStrings.Admin_Dashboard_TotalVaults]: '保险库总数',
  [BrightChainStrings.Admin_Dashboard_SharedVaults]: '共享保险库',
  [BrightChainStrings.Admin_Dashboard_TotalEmails]: '邮件总数',
  [BrightChainStrings.Admin_Dashboard_DeliveryFailures]: '投递失败',
  [BrightChainStrings.Admin_Dashboard_Last24Hours]: '最近24小时',
  [BrightChainStrings.Admin_Menu_Dashboard]: '管理面板',
  [BrightChainStrings.Admin_Menu_Users]: '用户管理',
  [BrightChainStrings.Admin_Menu_Blocks]: '区块浏览器',
  [BrightChainStrings.Admin_Menu_Chat]: '聊天管理',
  [BrightChainStrings.Admin_Menu_Hub]: '中心管理',
  [BrightChainStrings.Admin_Menu_Mail]: '邮件管理',
  [BrightChainStrings.Admin_Menu_Pass]: '密码管理',
  [BrightChainStrings.Admin_Menu_About]: '关于',
  [BrightChainStrings.Admin_Common_Loading]: '加载中…',
  [BrightChainStrings.Admin_Common_Previous]: '上一页',
  [BrightChainStrings.Admin_Common_Next]: '下一页',
  [BrightChainStrings.Admin_Common_PageTemplate]: '第 {PAGE} 页，共 {TOTAL} 页',
  [BrightChainStrings.Admin_Common_Cancel]: '取消',
  [BrightChainStrings.Admin_Common_Delete]: '删除',
  [BrightChainStrings.Admin_Common_Yes]: '是',
  [BrightChainStrings.Admin_Common_No]: '否',
  [BrightChainStrings.Admin_Common_Never]: '从未',
  [BrightChainStrings.Admin_Common_Close]: '关闭',
  [BrightChainStrings.Admin_Users_Title]: '用户管理',
  [BrightChainStrings.Admin_Users_FilterAll]: '全部',
  [BrightChainStrings.Admin_Users_FilterActive]: '活跃',
  [BrightChainStrings.Admin_Users_FilterLocked]: '已锁定',
  [BrightChainStrings.Admin_Users_FilterPending]: '待处理',
  [BrightChainStrings.Admin_Users_ColUsername]: '用户名',
  [BrightChainStrings.Admin_Users_ColEmail]: '电子邮件',
  [BrightChainStrings.Admin_Users_ColStatus]: '状态',
  [BrightChainStrings.Admin_Users_ColEmailVerified]: '邮箱已验证',
  [BrightChainStrings.Admin_Users_ColLastLogin]: '上次登录',
  [BrightChainStrings.Admin_Users_ColActions]: '操作',
  [BrightChainStrings.Admin_Users_NoUsersFound]: '未找到用户。',
  [BrightChainStrings.Admin_Users_UnlockUser]: '解锁用户',
  [BrightChainStrings.Admin_Users_LockUser]: '锁定用户',
  [BrightChainStrings.Admin_Users_LockUserTitle]: '锁定用户',
  [BrightChainStrings.Admin_Users_UnlockUserTitle]: '解锁用户',
  [BrightChainStrings.Admin_Users_LockConfirmTemplate]:
    '您确定要锁定 {USERNAME} 吗？',
  [BrightChainStrings.Admin_Users_UnlockConfirmTemplate]:
    '您确定要解锁 {USERNAME} 吗？',
  [BrightChainStrings.Admin_Users_LockWarning]: ' 这将阻止该用户登录。',
  [BrightChainStrings.Admin_Users_ColRole]: '角色',
  [BrightChainStrings.Admin_Users_ChangeRole]: '更改角色',
  [BrightChainStrings.Admin_Users_ChangeRoleTitle]: '更改用户角色',
  [BrightChainStrings.Admin_Users_ChangeRoleConfirmTemplate]:
    '您确定要将 {USERNAME} 从 {OLD_ROLE} 更改为 {NEW_ROLE} 吗？',
  [BrightChainStrings.Admin_Users_ChangeRoleWarning]:
    ' 将用户更改为管理员将授予完全管理权限。',
  [BrightChainStrings.Admin_Users_RoleAdmin]: '管理员',
  [BrightChainStrings.Admin_Users_RoleMember]: '成员',
  [BrightChainStrings.Admin_Users_RoleSystem]: '系统',
  [BrightChainStrings.Admin_Users_CannotChangeOwnRole]:
    '您不能更改自己的角色。',
  [BrightChainStrings.Admin_Users_CannotChangeSystemUser]:
    '系统用户的角色不能更改。',
  [BrightChainStrings.Admin_Users_DeleteUser]: '删除用户',
  [BrightChainStrings.Admin_Users_DeleteUserTitle]: '删除用户',
  [BrightChainStrings.Admin_Users_DeleteConfirmTemplate]:
    '您确定要永久删除用户"{USERNAME}"吗？这将删除其 CBL、设置和所有数据库记录。此操作无法撤消。',
  [BrightChainStrings.Admin_Users_DeleteWarning]:
    ' 这是一个破坏性操作。',
  [BrightChainStrings.Admin_Users_CannotDeleteSelf]:
    '您不能删除自己的账户。',
  [BrightChainStrings.Admin_Users_CannotDeleteSystemUser]:
    '系统用户不能被删除。',
  [BrightChainStrings.Admin_Blocks_Title]: '区块浏览器',
  [BrightChainStrings.Admin_Blocks_SearchPlaceholder]: '按区块 ID 搜索',
  [BrightChainStrings.Admin_Blocks_FilterAllDurability]: '所有持久性',
  [BrightChainStrings.Admin_Blocks_FilterStandard]: '标准',
  [BrightChainStrings.Admin_Blocks_FilterHighDurability]: '高持久性',
  [BrightChainStrings.Admin_Blocks_FilterEphemeral]: '临时',
  [BrightChainStrings.Admin_Blocks_SortByDate]: '按日期排序',
  [BrightChainStrings.Admin_Blocks_SortBySize]: '按大小排序',
  [BrightChainStrings.Admin_Blocks_Detail]: '区块详情',
  [BrightChainStrings.Admin_Blocks_ColBlockId]: '区块 ID',
  [BrightChainStrings.Admin_Blocks_ColSize]: '大小',
  [BrightChainStrings.Admin_Blocks_ColDurability]: '持久性',
  [BrightChainStrings.Admin_Blocks_ColCreated]: '创建时间',
  [BrightChainStrings.Admin_Blocks_ColAccessCount]: '访问次数',
  [BrightChainStrings.Admin_Blocks_ColReplication]: '复制',
  [BrightChainStrings.Admin_Blocks_ColActions]: '操作',
  [BrightChainStrings.Admin_Blocks_NoBlocksFound]: '未找到区块。',
  [BrightChainStrings.Admin_Blocks_DiscoverNodes]: '发现节点',
  [BrightChainStrings.Admin_Blocks_NodesHoldingBlockTemplate]:
    '持有区块 {BLOCK_ID} 的节点：',
  [BrightChainStrings.Admin_Blocks_NoNodesFound]: '未找到节点。',
  [BrightChainStrings.Admin_Blocks_Checksum]: '校验和',
  [BrightChainStrings.Admin_Blocks_DeleteTitle]: '删除区块',
  [BrightChainStrings.Admin_Blocks_DeleteConfirmTemplate]:
    '您确定要删除区块 {BLOCK_ID} 吗？这也将从本地存储中删除关联的奇偶校验块。',
  [BrightChainStrings.Admin_Blocks_SizeBytesTemplate]: '{SIZE} 字节',
  [BrightChainStrings.Admin_Pass_Title]: 'BrightPass 管理',
  [BrightChainStrings.Admin_Pass_EncryptedNotice]:
    '保险库内容已加密，无法查看。仅显示保险库元数据。',
  [BrightChainStrings.Admin_Pass_ColOwner]: '所有者',
  [BrightChainStrings.Admin_Pass_ColShared]: '已共享',
  [BrightChainStrings.Admin_Pass_ColCreated]: '创建时间',
  [BrightChainStrings.Admin_Pass_ColLastAccessed]: '上次访问',
  [BrightChainStrings.Admin_Pass_ColActions]: '操作',
  [BrightChainStrings.Admin_Pass_NoVaultsFound]: '未找到保险库。',
  [BrightChainStrings.Admin_Pass_DeleteVault]: '删除保险库',
  [BrightChainStrings.Admin_Pass_DeleteVaultTitle]: '删除保险库',
  [BrightChainStrings.Admin_Pass_DeleteVaultConfirm]:
    '您确定要删除此保险库吗？这将删除保险库及其关联的区块。此操作无法撤销。',
  [BrightChainStrings.Admin_Chat_Title]: 'BrightChat 管理',
  [BrightChainStrings.Admin_Chat_ColId]: 'ID',
  [BrightChainStrings.Admin_Chat_ColParticipants]: '参与者',
  [BrightChainStrings.Admin_Chat_ColMessages]: '消息',
  [BrightChainStrings.Admin_Chat_ColLastActivity]: '最近活动',
  [BrightChainStrings.Admin_Chat_NoConversationsFound]: '未找到对话。',
  [BrightChainStrings.Admin_Chat_MessagesForTemplate]:
    '对话 {CONVERSATION_ID} 的消息',
  [BrightChainStrings.Admin_Chat_LoadingMessages]: '正在加载消息…',
  [BrightChainStrings.Admin_Chat_NoMessages]: '没有消息。',
  [BrightChainStrings.Admin_Chat_ColSender]: '发送者',
  [BrightChainStrings.Admin_Chat_ColContent]: '内容',
  [BrightChainStrings.Admin_Chat_ColCreated]: '创建时间',
  [BrightChainStrings.Admin_Chat_ColStatus]: '状态',
  [BrightChainStrings.Admin_Chat_StatusDeleted]: '已删除',
  [BrightChainStrings.Admin_Chat_StatusActive]: '活跃',
  [BrightChainStrings.Admin_Chat_DeleteMessage]: '删除消息',
  [BrightChainStrings.Admin_Chat_DeleteMessageTitle]: '删除消息',
  [BrightChainStrings.Admin_Chat_DeleteMessageConfirm]:
    '您确定要删除此消息吗？该消息将被软删除。',

  // Admin BrightChat Servers
  [BrightChainStrings.Admin_ChatServers_Title]: 'BrightChat 服务器管理',
  [BrightChainStrings.Admin_ChatServers_TabServers]: '服务器',
  [BrightChainStrings.Admin_ChatServers_TabChannels]: '频道',
  [BrightChainStrings.Admin_ChatServers_TabMembers]: '成员',
  [BrightChainStrings.Admin_ChatServers_ColName]: '名称',
  [BrightChainStrings.Admin_ChatServers_ColOwner]: '所有者',
  [BrightChainStrings.Admin_ChatServers_ColMembers]: '成员',
  [BrightChainStrings.Admin_ChatServers_ColChannels]: '频道',
  [BrightChainStrings.Admin_ChatServers_ColCreated]: '创建时间',
  [BrightChainStrings.Admin_ChatServers_ColActions]: '操作',
  [BrightChainStrings.Admin_ChatServers_NoServersFound]: '未找到服务器。',
  [BrightChainStrings.Admin_ChatServers_DeleteServer]: '删除服务器',
  [BrightChainStrings.Admin_ChatServers_DeleteServerTitle]: '删除服务器',
  [BrightChainStrings.Admin_ChatServers_DeleteServerConfirm]:
    '您确定要删除此服务器吗？所有频道和数据将被永久删除。',
  [BrightChainStrings.Admin_ChatServers_EditServer]: '编辑服务器',
  [BrightChainStrings.Admin_ChatServers_EditServerTitle]: '编辑服务器',
  [BrightChainStrings.Admin_ChatServers_ServerName]: '服务器名称',
  [BrightChainStrings.Admin_ChatServers_ServerIcon]: '图标URL',
  [BrightChainStrings.Admin_ChatServers_Save]: '保存',
  [BrightChainStrings.Admin_ChatServers_ChannelName]: '频道名称',
  [BrightChainStrings.Admin_ChatServers_ChannelTopic]: '主题',
  [BrightChainStrings.Admin_ChatServers_ChannelVisibility]: '可见性',
  [BrightChainStrings.Admin_ChatServers_ChannelMembers]: '成员',
  [BrightChainStrings.Admin_ChatServers_NoChannelsFound]: '未找到频道。',
  [BrightChainStrings.Admin_ChatServers_DeleteChannel]: '删除频道',
  [BrightChainStrings.Admin_ChatServers_DeleteChannelTitle]: '删除频道',
  [BrightChainStrings.Admin_ChatServers_DeleteChannelConfirm]:
    '您确定要删除此频道吗？所有消息将被永久删除。',
  [BrightChainStrings.Admin_ChatServers_MemberName]: '成员',
  [BrightChainStrings.Admin_ChatServers_MemberRole]: '角色',
  [BrightChainStrings.Admin_ChatServers_MemberJoined]: '加入时间',
  [BrightChainStrings.Admin_ChatServers_NoMembersFound]: '未找到成员。',
  [BrightChainStrings.Admin_ChatServers_RemoveMember]: '移除成员',
  [BrightChainStrings.Admin_ChatServers_RemoveMemberTitle]: '移除成员',
  [BrightChainStrings.Admin_ChatServers_RemoveMemberConfirm]:
    '您确定要将此成员从服务器中移除吗？',
  [BrightChainStrings.Admin_ChatServers_ChangeRole]: '更改角色',
  [BrightChainStrings.Admin_ChatServers_EncryptedNote]:
    '消息内容已端到端加密，管理员无法查看。',
  [BrightChainStrings.Admin_ChatServers_FilterByServer]: '按服务器筛选',
  [BrightChainStrings.Admin_ChatServers_AllServers]: '所有服务器',
  [BrightChainStrings.Admin_Menu_ChatServers]: '聊天服务器',

  // Admin BrightHub
  [BrightChainStrings.Admin_Hub_Title]: 'BrightHub 管理',
  [BrightChainStrings.Admin_Hub_FilterByAuthorId]: '按作者 ID 筛选',
  [BrightChainStrings.Admin_Hub_FilterAllPosts]: '所有帖子',
  [BrightChainStrings.Admin_Hub_FilterActive]: '活跃',
  [BrightChainStrings.Admin_Hub_FilterDeleted]: '已删除',
  [BrightChainStrings.Admin_Hub_ColAuthor]: '作者',
  [BrightChainStrings.Admin_Hub_ColContentPreview]: '内容预览',
  [BrightChainStrings.Admin_Hub_ColCreated]: '创建时间',
  [BrightChainStrings.Admin_Hub_ColStatus]: '状态',
  [BrightChainStrings.Admin_Hub_ColLikes]: '点赞',
  [BrightChainStrings.Admin_Hub_ColReposts]: '转发',
  [BrightChainStrings.Admin_Hub_ColActions]: '操作',
  [BrightChainStrings.Admin_Hub_StatusDeleted]: '已删除',
  [BrightChainStrings.Admin_Hub_StatusActive]: '活跃',
  [BrightChainStrings.Admin_Hub_NoPostsFound]: '未找到帖子。',
  [BrightChainStrings.Admin_Hub_SoftDeletePost]: '删除帖子',
  [BrightChainStrings.Admin_Hub_DeletePostTitle]: '删除帖子',
  [BrightChainStrings.Admin_Hub_DeletePostConfirm]:
    '您确定要删除此帖子吗？它将被标记为已删除，但不会被永久移除。',
  [BrightChainStrings.Admin_Mail_Title]: 'BrightMail 管理',
  [BrightChainStrings.Admin_Mail_ColSender]: '发送者',
  [BrightChainStrings.Admin_Mail_ColRecipients]: '收件人',
  [BrightChainStrings.Admin_Mail_ColSubject]: '主题',
  [BrightChainStrings.Admin_Mail_ColCreated]: '创建时间',
  [BrightChainStrings.Admin_Mail_ColDeliveryStatus]: '投递状态',
  [BrightChainStrings.Admin_Mail_ColActions]: '操作',
  [BrightChainStrings.Admin_Mail_NoEmailsFound]: '未找到邮件。',
  [BrightChainStrings.Admin_Mail_DeleteEmail]: '删除邮件',
  [BrightChainStrings.Admin_Mail_DeleteEmailTitle]: '删除邮件',
  [BrightChainStrings.Admin_Mail_DeleteEmailConfirm]:
    '您确定要删除此邮件吗？此操作无法撤销。',

  // About Page
  [BrightChainStrings.About_Title]: '关于 BrightChain',
  [BrightChainStrings.About_AccessDenied]: '访问被拒绝',
  [BrightChainStrings.About_AccessDeniedDescription]:
    '您必须是管理员才能查看此页面。',
  [BrightChainStrings.About_MasterVersion]: 'BrightChain 版本',
  [BrightChainStrings.About_BrightChainPackages]: 'BrightChain 包',
  [BrightChainStrings.About_DigitalDefiancePackages]: 'Digital Defiance 包',
  [BrightChainStrings.About_PackageName]: '包名',
  [BrightChainStrings.About_Version]: '版本',
};
