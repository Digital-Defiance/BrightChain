import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightChainStringKey,
  BrightChainStrings,
} from '../../enumerations/brightChainStrings';

export const JapaneseStrings: ComponentStrings<BrightChainStringKey> = {
  // BrightChain
  [BrightChainStrings.Common_Bright]: 'ブライト',
  [BrightChainStrings.Common_Chain]: 'チェーン',

  [BrightChainStrings.Common_Privacy]: 'プライバシー',
  [BrightChainStrings.Common_Participation]: '参加',
  [BrightChainStrings.Common_Power]: '力',
  [BrightChainStrings.Common_PrivacyParticipationPower]:
    'プライバシー。参加。力。',

  // UI Strings
  [BrightChainStrings.Common_BlockSize]: 'ブロックサイズ',
  [BrightChainStrings.Common_AtIndexTemplate]:
    'インデックス{INDEX}で{OPERATION}',
  [BrightChainStrings.ChangePassword_Success]:
    'パスワードが正常に変更されました。',
  [BrightChainStrings.Common_Site]: 'BrightChain',

  // Block Handle Errors
  [BrightChainStrings.Error_BlockHandle_BlockConstructorMustBeValid]:
    'blockConstructorは有効なコンストラクタ関数である必要があります',
  [BrightChainStrings.Error_BlockHandle_BlockSizeRequired]:
    'blockSizeは必須です',
  [BrightChainStrings.Error_BlockHandle_DataMustBeUint8Array]:
    'dataはUint8Arrayである必要があります',
  [BrightChainStrings.Error_BlockHandle_ChecksumMustBeChecksum]:
    'checksumはChecksumである必要があります',

  // Block Handle Tuple Errors
  [BrightChainStrings.Error_BlockHandleTuple_FailedToLoadBlockTemplate]:
    'ブロック {CHECKSUM} の読み込みに失敗しました: {ERROR}',
  [BrightChainStrings.Error_BlockHandleTuple_FailedToStoreXorResultTemplate]:
    'XOR結果の保存に失敗しました: {ERROR}',

  // Block Access Errors
  [BrightChainStrings.Error_BlockAccess_Template]:
    'ブロックにアクセスできません: {REASON}',
  [BrightChainStrings.Error_BlockAccessError_BlockAlreadyExists]:
    'ブロックファイルは既に存在します',
  [BrightChainStrings.Error_BlockAccessError_BlockIsNotPersistable]:
    'ブロックは永続化できません',
  [BrightChainStrings.Error_BlockAccessError_BlockIsNotReadable]:
    'ブロックは読み取れません',
  [BrightChainStrings.Error_BlockAccessError_BlockFileNotFoundTemplate]:
    'ブロックファイルが見つかりません: {FILE}',
  [BrightChainStrings.Error_BlockAccess_CBLCannotBeEncrypted]:
    'CBLブロックは暗号化できません',
  [BrightChainStrings.Error_BlockAccessError_CreatorMustBeProvided]:
    '署名検証には作成者を指定する必要があります',
  [BrightChainStrings.Error_Block_CannotBeDecrypted]:
    'ブロックを復号化できません',
  [BrightChainStrings.Error_Block_CannotBeEncrypted]:
    'ブロックを暗号化できません',
  [BrightChainStrings.Error_BlockCapacity_Template]:
    'ブロック容量を超過しました。ブロックサイズ: ({BLOCK_SIZE})、データ: ({DATA_SIZE})',
  [BrightChainStrings.Error_BlockMetadataError_CreatorIdMismatch]:
    '作成者IDが一致しません',
  [BrightChainStrings.Error_BlockMetadataError_CreatorRequired]:
    '作成者が必要です',
  [BrightChainStrings.Error_BlockMetadataError_EncryptorRequired]:
    '暗号化者が必要です',
  [BrightChainStrings.Error_BlockMetadataError_InvalidBlockMetadata]:
    '無効なブロックメタデータ',
  [BrightChainStrings.Error_BlockMetadataError_InvalidBlockMetadataTemplate]:
    '無効なブロックメタデータ: {REASON}',
  [BrightChainStrings.Error_BlockMetadataError_MetadataRequired]:
    'メタデータが必要です',
  [BrightChainStrings.Error_BlockMetadataError_MissingRequiredMetadata]:
    '必須のメタデータフィールドがありません',
  [BrightChainStrings.Error_BlockCapacity_InvalidBlockSize]:
    '無効なブロックサイズ',
  [BrightChainStrings.Error_BlockCapacity_InvalidBlockType]:
    '無効なブロックタイプ',
  [BrightChainStrings.Error_BlockCapacity_CapacityExceeded]:
    '容量を超過しました',
  [BrightChainStrings.Error_BlockCapacity_InvalidFileName]: '無効なファイル名',
  [BrightChainStrings.Error_BlockCapacity_InvalidMimetype]: '無効なMIMEタイプ',
  [BrightChainStrings.Error_BlockCapacity_InvalidRecipientCount]:
    '無効な受信者数',
  [BrightChainStrings.Error_BlockCapacity_InvalidExtendedCblData]:
    '無効な拡張CBLデータ',
  [BrightChainStrings.Error_BlockValidationError_Template]:
    'ブロック検証に失敗しました: {REASON}',
  [BrightChainStrings.Error_BlockValidationError_ActualDataLengthUnknown]:
    '実際のデータ長が不明です',
  [BrightChainStrings.Error_BlockValidationError_AddressCountExceedsCapacity]:
    'アドレス数がブロック容量を超えています',
  [BrightChainStrings.Error_BlockValidationError_BlockDataNotBuffer]:
    'Block.dataはバッファである必要があります',
  [BrightChainStrings.Error_BlockValidationError_BlockSizeNegative]:
    'ブロックサイズは正の数である必要があります',
  [BrightChainStrings.Error_BlockValidationError_CreatorIDMismatch]:
    '作成者IDが一致しません',
  [BrightChainStrings.Error_BlockValidationError_DataBufferIsTruncated]:
    'データバッファが切り捨てられています',
  [BrightChainStrings.Error_BlockValidationError_DataCannotBeEmpty]:
    'データは空にできません',
  [BrightChainStrings.Error_BlockValidationError_DataLengthExceedsCapacity]:
    'データ長がブロック容量を超えています',
  [BrightChainStrings.Error_BlockValidationError_DataLengthTooShort]:
    '暗号化ヘッダーを含むにはデータが短すぎます',
  [BrightChainStrings.Error_BlockValidationError_DataLengthTooShortForCBLHeader]:
    'CBLヘッダーにはデータが短すぎます',
  [BrightChainStrings.Error_BlockValidationError_DataLengthTooShortForEncryptedCBL]:
    '暗号化CBLにはデータが短すぎます',
  [BrightChainStrings.Error_BlockValidationError_EphemeralBlockOnlySupportsBufferData]:
    'EphemeralBlockはバッファデータのみをサポートします',
  [BrightChainStrings.Error_BlockValidationError_FutureCreationDate]:
    'ブロック作成日は未来にできません',
  [BrightChainStrings.Error_BlockValidationError_InvalidAddressLengthTemplate]:
    'インデックス{INDEX}で無効なアドレス長: {LENGTH}、期待値: {EXPECTED_LENGTH}',
  [BrightChainStrings.Error_BlockValidationError_InvalidAuthTagLength]:
    '無効な認証タグ長',
  [BrightChainStrings.Error_BlockValidationError_InvalidBlockTypeTemplate]:
    '無効なブロックタイプ: {TYPE}',
  [BrightChainStrings.Error_BlockValidationError_InvalidCBLAddressCount]:
    'CBLアドレス数はTupleSizeの倍数である必要があります',
  [BrightChainStrings.Error_BlockValidationError_InvalidCBLDataLength]:
    '無効なCBLデータ長',
  [BrightChainStrings.Error_BlockValidationError_InvalidDateCreated]:
    '無効な作成日',
  [BrightChainStrings.Error_BlockValidationError_InvalidEncryptionHeaderLength]:
    '無効な暗号化ヘッダー長',
  [BrightChainStrings.Error_BlockValidationError_InvalidEphemeralPublicKeyLength]:
    '無効な一時公開鍵長',
  [BrightChainStrings.Error_BlockValidationError_InvalidIVLength]: '無効なIV長',
  [BrightChainStrings.Error_BlockValidationError_InvalidSignature]:
    '無効な署名が提供されました',
  [BrightChainStrings.Error_BlockValidationError_InvalidRecipientIds]:
    '無効な受信者ID',
  [BrightChainStrings.Error_BlockValidationError_InvalidTupleSizeTemplate]:
    'タプルサイズは{TUPLE_MIN_SIZE}から{TUPLE_MAX_SIZE}の間である必要があります',
  [BrightChainStrings.Error_BlockValidationError_MethodMustBeImplementedByDerivedClass]:
    'メソッドは派生クラスで実装する必要があります',
  [BrightChainStrings.Error_BlockValidationError_NoChecksum]:
    'チェックサムが提供されていません',
  [BrightChainStrings.Error_BlockValidationError_OriginalDataLengthNegative]:
    '元のデータ長は負にできません',
  [BrightChainStrings.Error_BlockValidationError_InvalidEncryptionType]:
    '無効な暗号化タイプ',
  [BrightChainStrings.Error_BlockValidationError_InvalidRecipientCount]:
    '無効な受信者数',
  [BrightChainStrings.Error_BlockValidationError_InvalidRecipientKeys]:
    '無効な受信者キー',
  [BrightChainStrings.Error_BlockValidationError_EncryptionRecipientNotFoundInRecipients]:
    '暗号化受信者が受信者リストに見つかりません',
  [BrightChainStrings.Error_BlockValidationError_EncryptionRecipientHasNoPrivateKey]:
    '暗号化受信者に秘密鍵がありません',
  [BrightChainStrings.Error_BlockValidationError_InvalidCreator]:
    '無効な作成者',
  [BrightChainStrings.Error_BlockMetadata_Template]:
    'ブロックメタデータエラー: {REASON}',
  [BrightChainStrings.Error_BufferError_InvalidBufferTypeTemplate]:
    '無効なバッファタイプ。期待: Buffer、取得: {TYPE}',
  [BrightChainStrings.Error_Checksum_MismatchTemplate]:
    'チェックサム不一致: 期待 {EXPECTED}、取得 {CHECKSUM}',
  [BrightChainStrings.Error_BlockSize_InvalidTemplate]:
    '無効なブロックサイズ: {BLOCK_SIZE}',
  [BrightChainStrings.Error_Credentials_Invalid]: '無効な認証情報。',
  [BrightChainStrings.Error_IsolatedKeyError_InvalidPublicKey]:
    '無効な公開鍵: 分離鍵である必要があります',
  [BrightChainStrings.Error_IsolatedKeyError_InvalidKeyId]:
    '鍵分離違反: 無効な鍵ID',
  [BrightChainStrings.Error_IsolatedKeyError_InvalidKeyFormat]:
    '無効な鍵フォーマット',
  [BrightChainStrings.Error_IsolatedKeyError_InvalidKeyLength]: '無効な鍵長',
  [BrightChainStrings.Error_IsolatedKeyError_InvalidKeyType]: '無効な鍵タイプ',
  [BrightChainStrings.Error_IsolatedKeyError_KeyIsolationViolation]:
    '鍵分離違反: 異なる鍵インスタンスからの暗号文',
  [BrightChainStrings.Error_BlockServiceError_BlockWhitenerCountMismatch]:
    'ブロック数とホワイトナー数は同じである必要があります',
  [BrightChainStrings.Error_BlockServiceError_EmptyBlocksArray]:
    'ブロック配列は空にできません',
  [BrightChainStrings.Error_BlockServiceError_BlockSizeMismatch]:
    'すべてのブロックは同じブロックサイズである必要があります',
  [BrightChainStrings.Error_BlockServiceError_NoWhitenersProvided]:
    'ホワイトナーが提供されていません',
  [BrightChainStrings.Error_BlockServiceError_AlreadyInitialized]:
    'BlockServiceサブシステムは既に初期化されています',
  [BrightChainStrings.Error_BlockServiceError_Uninitialized]:
    'BlockServiceサブシステムが初期化されていません',
  [BrightChainStrings.Error_BlockServiceError_BlockAlreadyExistsTemplate]:
    'ブロックは既に存在します: {ID}',
  [BrightChainStrings.Error_BlockServiceError_RecipientRequiredForEncryption]:
    '暗号化には受信者が必要です',
  [BrightChainStrings.Error_BlockServiceError_CannotDetermineFileLength]:
    'ファイル長を決定できません',
  [BrightChainStrings.Error_BlockServiceError_CannotDetermineBlockSize]:
    'ブロックサイズを決定できません',
  [BrightChainStrings.Error_BlockServiceError_CannotDetermineFileName]:
    'ファイル名を決定できません',
  [BrightChainStrings.Error_BlockServiceError_CannotDetermineMimeType]:
    'MIMEタイプを決定できません',
  [BrightChainStrings.Error_BlockServiceError_FilePathNotProvided]:
    'ファイルパスが提供されていません',
  [BrightChainStrings.Error_BlockServiceError_UnableToDetermineBlockSize]:
    'ブロックサイズを決定できません',
  [BrightChainStrings.Error_BlockServiceError_InvalidBlockData]:
    '無効なブロックデータ',
  [BrightChainStrings.Error_BlockServiceError_InvalidBlockType]:
    '無効なブロックタイプ',
  [BrightChainStrings.Error_BrightTrustError_InvalidBrightTrustId]:
    '無効なクォーラムID',
  [BrightChainStrings.Error_BrightTrustError_DocumentNotFound]:
    'ドキュメントが見つかりません',
  [BrightChainStrings.Error_BrightTrustError_UnableToRestoreDocument]:
    'ドキュメントを復元できません',
  [BrightChainStrings.Error_BrightTrustError_NotImplemented]: '未実装',
  [BrightChainStrings.Error_BrightTrustError_Uninitialized]:
    'クォーラムサブシステムが初期化されていません',
  [BrightChainStrings.Error_BrightTrustError_MemberNotFound]:
    'メンバーが見つかりません',
  [BrightChainStrings.Error_BrightTrustError_NotEnoughMembers]:
    'クォーラム操作に十分なメンバーがいません',
  [BrightChainStrings.Error_BrightTrustError_TransitionInProgress]:
    '操作がブロックされています：移行式が進行中です',
  [BrightChainStrings.Error_BrightTrustError_InvalidModeTransition]:
    '無効な動作モード遷移',
  [BrightChainStrings.Error_BrightTrustError_InsufficientMembersForTransition]:
    '移行式を開始するにはメンバーが不足しています',
  [BrightChainStrings.Error_BrightTrustError_MemberAlreadyExists]:
    'メンバーはすでにクォーラムに存在します',
  [BrightChainStrings.Error_BrightTrustError_InsufficientRemainingMembers]:
    'メンバーを削除できません：残りのメンバーがしきい値を下回ります',
  [BrightChainStrings.Error_BrightTrustError_MemberBanned]:
    'メンバーはネットワークから禁止されています',
  [BrightChainStrings.Error_BrightTrustError_MemberSuspended]:
    'メンバーはネットワークで一時停止されています',
  [BrightChainStrings.Error_BrightTrustError_DuplicateProposal]:
    '重複した提案ID',
  [BrightChainStrings.Error_BrightTrustError_ProposalExpired]:
    '提案の有効期限が切れました',
  [BrightChainStrings.Error_BrightTrustError_DuplicateVote]:
    'このメンバーからの重複投票',
  [BrightChainStrings.Error_BrightTrustError_VoterNotOnProposal]:
    '投票者はこの提案のアクティブメンバーではありません',
  [BrightChainStrings.Error_BrightTrustError_AuthenticationFailed]:
    '認証に失敗しました',
  [BrightChainStrings.Error_BrightTrustError_VotingLocked]:
    '認証の繰り返し失敗により投票がロックされています',
  [BrightChainStrings.Error_BrightTrustError_MissingAttachment]:
    '提案には添付ファイルが必要ですが、提供されていません',
  [BrightChainStrings.Error_BrightTrustError_AttachmentNotRetrievable]:
    '参照された添付ファイルCBLは取得できません',
  [BrightChainStrings.Error_BrightTrustError_RedistributionFailed]:
    'シェアの再配布に失敗しました',
  [BrightChainStrings.Error_BrightTrustError_InsufficientSharesForReconstruction]:
    '鍵の再構築に十分なシェアがありません',
  [BrightChainStrings.Error_BrightTrustError_KeyReconstructionValidationFailed]:
    '再構築された鍵の検証に失敗しました',
  [BrightChainStrings.Error_BrightTrustError_IdentityPermanentlyUnrecoverable]:
    '時効の満了により、アイデンティティは永久に回復不能です',
  [BrightChainStrings.Error_BrightTrustError_InvalidMembershipProof]:
    '無効なメンバーシップ証明',
  [BrightChainStrings.Error_BrightTrustError_MissingMembershipProof]:
    '匿名コンテンツのメンバーシップ証明がありません',
  [BrightChainStrings.Error_BrightTrustError_AliasAlreadyTaken]:
    'エイリアスはすでに登録されています',
  [BrightChainStrings.Error_BrightTrustError_AliasNotFound]:
    'エイリアスが見つかりません',
  [BrightChainStrings.Error_BrightTrustError_AliasInactive]:
    'エイリアスは無効化されています',
  [BrightChainStrings.Error_BrightTrustError_IdentitySealingFailed]:
    'アイデンティティシーリングパイプラインが失敗しました',
  [BrightChainStrings.Error_BrightTrustError_ShardVerificationFailed]:
    'アイデンティティシャードの検証に失敗しました',
  [BrightChainStrings.Error_BrightTrustError_BrightTrustDatabaseUnavailable]:
    'クォーラムデータベースが利用できません',
  [BrightChainStrings.Error_BrightTrustError_TransactionFailed]:
    'データベーストランザクションが失敗しました',
  [BrightChainStrings.Error_BrightTrustError_AuditChainCorrupted]:
    '監査チェーンの整合性が損なわれています',
  // BrightTrust Ban Mechanism Errors
  [BrightChainStrings.Error_BrightTrustError_CannotBanSelf]:
    'メンバーは自分自身の追放を提案できません',
  [BrightChainStrings.Error_BrightTrustError_MemberAlreadyBanned]:
    'メンバーは既に追放されています',
  [BrightChainStrings.Error_BrightTrustError_MemberNotBanned]:
    'メンバーは現在追放されていません',
  [BrightChainStrings.Error_BrightTrustError_NewMemberCannotProposeBan]:
    '現在のエポックで承認されたメンバーは追放を提案できません',
  [BrightChainStrings.Error_BrightTrustError_BanCoolingPeriodNotElapsed]:
    '追放のクーリング期間がまだ経過していません',
  [BrightChainStrings.Error_BrightTrustError_InvalidBanRecordSignatures]:
    '追放記録に十分な有効なクォーラム署名がありません',
  [BrightChainStrings.Error_IdentityValidationError_InvalidSignature]:
    'コンテンツの署名が主張されたアイデンティティと一致しません',
  [BrightChainStrings.Error_IdentityValidationError_UnregisteredAlias]:
    'エイリアスは登録されていません',
  [BrightChainStrings.Error_IdentityValidationError_InactiveAlias]:
    'エイリアスは非アクティブです',
  [BrightChainStrings.Error_IdentityValidationError_InvalidMembershipProof]:
    '無効なメンバーシップ証明',
  [BrightChainStrings.Error_IdentityValidationError_MissingMembershipProof]:
    '匿名コンテンツのメンバーシップ証明がありません',
  [BrightChainStrings.Error_IdentityValidationError_BannedUser]:
    'コンテンツ作成者は禁止されています',
  [BrightChainStrings.Error_IdentityValidationError_SuspendedUser]:
    'コンテンツ作成者は一時停止されています',
  [BrightChainStrings.Error_IdentityValidationError_ShardVerificationFailed]:
    'アイデンティティシャードの検証に失敗しました',
  [BrightChainStrings.Error_SystemKeyringError_KeyNotFoundTemplate]:
    'キー {KEY} が見つかりません',
  [BrightChainStrings.Error_SystemKeyringError_RateLimitExceeded]:
    'レート制限を超過しました',
  [BrightChainStrings.Error_FecError_InputBlockRequired]:
    '入力ブロックが必要です',
  [BrightChainStrings.Error_FecError_DamagedBlockRequired]:
    '破損ブロックが必要です',
  [BrightChainStrings.Error_FecError_ParityBlocksRequired]:
    'パリティブロックが必要です',
  [BrightChainStrings.Error_FecError_InvalidParityBlockSizeTemplate]:
    '無効なパリティブロックサイズ: 期待 {EXPECTED_SIZE}、取得 {ACTUAL_SIZE}',
  [BrightChainStrings.Error_FecError_InvalidRecoveredBlockSizeTemplate]:
    '無効な復元ブロックサイズ: 期待 {EXPECTED_SIZE}、取得 {ACTUAL_SIZE}',
  [BrightChainStrings.Error_FecError_InputDataMustBeBuffer]:
    '入力データはバッファである必要があります',
  [BrightChainStrings.Error_FecError_BlockSizeMismatch]:
    'ブロックサイズは一致する必要があります',
  [BrightChainStrings.Error_FecError_DamagedBlockDataMustBeBuffer]:
    '破損ブロックデータはバッファである必要があります',
  [BrightChainStrings.Error_FecError_ParityBlockDataMustBeBuffer]:
    'パリティブロックデータはバッファである必要があります',
  [BrightChainStrings.Error_EciesError_InvalidBlockType]:
    'ECIES操作に無効なブロックタイプ',
  [BrightChainStrings.Error_VotingDerivationError_FailedToGeneratePrime]:
    '最大試行回数後に素数を生成できませんでした',
  [BrightChainStrings.Error_VotingDerivationError_IdenticalPrimes]:
    '同一の素数が生成されました',
  [BrightChainStrings.Error_VotingDerivationError_KeyPairTooSmallTemplate]:
    '生成された鍵ペアが小さすぎます: {ACTUAL_BITS}ビット < {REQUIRED_BITS}ビット',
  [BrightChainStrings.Error_VotingDerivationError_KeyPairValidationFailed]:
    '鍵ペアの検証に失敗しました',
  [BrightChainStrings.Error_VotingDerivationError_ModularInverseDoesNotExist]:
    'モジュラー乗法逆元が存在しません',
  [BrightChainStrings.Error_VotingDerivationError_PrivateKeyMustBeBuffer]:
    '秘密鍵はバッファである必要があります',
  [BrightChainStrings.Error_VotingDerivationError_PublicKeyMustBeBuffer]:
    '公開鍵はバッファである必要があります',
  [BrightChainStrings.Error_VotingDerivationError_InvalidPublicKeyFormat]:
    '無効な公開鍵フォーマット',
  [BrightChainStrings.Error_VotingDerivationError_InvalidEcdhKeyPair]:
    '無効なECDH鍵ペア',
  [BrightChainStrings.Error_VotingDerivationError_FailedToDeriveVotingKeysTemplate]:
    '投票鍵の導出に失敗しました: {ERROR}',
  [BrightChainStrings.Error_VotingError_InvalidKeyPairPublicKeyNotIsolated]:
    '無効な鍵ペア: 公開鍵は分離されている必要があります',
  [BrightChainStrings.Error_VotingError_InvalidKeyPairPrivateKeyNotIsolated]:
    '無効な鍵ペア: 秘密鍵は分離されている必要があります',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyNotIsolated]:
    '無効な公開鍵: 分離鍵である必要があります',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyBufferTooShort]:
    '無効な公開鍵バッファ: 短すぎます',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyBufferWrongMagic]:
    '無効な公開鍵バッファ: 間違ったマジック',
  [BrightChainStrings.Error_VotingError_UnsupportedPublicKeyVersion]:
    'サポートされていない公開鍵バージョン',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyBufferIncompleteN]:
    '無効な公開鍵バッファ: 不完全なn値',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyBufferFailedToParseNTemplate]:
    '無効な公開鍵バッファ: nの解析に失敗: {ERROR}',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyIdMismatch]:
    '無効な公開鍵: 鍵IDが一致しません',
  [BrightChainStrings.Error_VotingError_ModularInverseDoesNotExist]:
    'モジュラー乗法逆元が存在しません',
  [BrightChainStrings.Error_VotingError_PrivateKeyMustBeBuffer]:
    '秘密鍵はバッファである必要があります',
  [BrightChainStrings.Error_VotingError_PublicKeyMustBeBuffer]:
    '公開鍵はバッファである必要があります',
  [BrightChainStrings.Error_VotingError_InvalidPublicKeyFormat]:
    '無効な公開鍵フォーマット',
  [BrightChainStrings.Error_VotingError_InvalidEcdhKeyPair]: '無効なECDH鍵ペア',
  [BrightChainStrings.Error_VotingError_FailedToDeriveVotingKeysTemplate]:
    '投票鍵の導出に失敗しました: {ERROR}',
  [BrightChainStrings.Error_VotingError_FailedToGeneratePrime]:
    '最大試行回数後に素数を生成できませんでした',
  [BrightChainStrings.Error_VotingError_IdenticalPrimes]:
    '同一の素数が生成されました',
  [BrightChainStrings.Error_VotingError_KeyPairTooSmallTemplate]:
    '生成された鍵ペアが小さすぎます: {ACTUAL_BITS}ビット < {REQUIRED_BITS}ビット',
  [BrightChainStrings.Error_VotingError_KeyPairValidationFailed]:
    '鍵ペアの検証に失敗しました',
  [BrightChainStrings.Error_VotingError_InvalidVotingKey]: '無効な投票鍵',
  [BrightChainStrings.Error_VotingError_InvalidKeyPair]: '無効な鍵ペア',
  [BrightChainStrings.Error_VotingError_InvalidPublicKey]: '無効な公開鍵',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKey]: '無効な秘密鍵',
  [BrightChainStrings.Error_VotingError_InvalidEncryptedKey]: '無効な暗号化鍵',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferTooShort]:
    '無効な秘密鍵バッファ: 短すぎます',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferWrongMagic]:
    '無効な秘密鍵バッファ: 間違ったマジック',
  [BrightChainStrings.Error_VotingError_UnsupportedPrivateKeyVersion]:
    'サポートされていない秘密鍵バージョン',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferIncompleteLambda]:
    '無効な秘密鍵バッファ: 不完全なラムダ',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferIncompleteMuLength]:
    '無効な秘密鍵バッファ: 不完全なmu長',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferIncompleteMu]:
    '無効な秘密鍵バッファ: 不完全なmu',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferFailedToParse]:
    '無効な秘密鍵バッファ: 解析に失敗',
  [BrightChainStrings.Error_VotingError_InvalidPrivateKeyBufferFailedToCreate]:
    '無効な秘密鍵バッファ: 作成に失敗',
  [BrightChainStrings.Error_StoreError_KeyNotFoundTemplate]:
    'キーが見つかりません: {KEY}',
  [BrightChainStrings.Error_StoreError_StorePathRequired]:
    'ストアパスが必要です',
  [BrightChainStrings.Error_StoreError_StorePathNotFound]:
    'ストアパスが見つかりません',
  [BrightChainStrings.Error_StoreError_BlockSizeRequired]:
    'ブロックサイズが必要です',
  [BrightChainStrings.Error_StoreError_BlockIdRequired]: 'ブロックIDが必要です',
  [BrightChainStrings.Error_StoreError_InvalidBlockIdTooShort]:
    '無効なブロックID: 短すぎます',
  [BrightChainStrings.Error_StoreError_BlockFileSizeMismatch]:
    'ブロックファイルサイズが一致しません',
  [BrightChainStrings.Error_StoreError_BlockValidationFailed]:
    'ブロック検証に失敗しました',
  [BrightChainStrings.Error_StoreError_BlockPathAlreadyExistsTemplate]:
    'ブロックパス {PATH} は既に存在します',
  [BrightChainStrings.Error_StoreError_BlockAlreadyExists]:
    'ブロックは既に存在します',
  [BrightChainStrings.Error_StoreError_NoBlocksProvided]:
    'ブロックが提供されていません',
  [BrightChainStrings.Error_StoreError_CannotStoreEphemeralData]:
    '一時的な構造化データは保存できません',
  [BrightChainStrings.Error_StoreError_BlockIdMismatchTemplate]:
    'キー {KEY} がブロックID {BLOCK_ID} と一致しません',
  [BrightChainStrings.Error_StoreError_BlockSizeMismatch]:
    'ブロックサイズがストアのブロックサイズと一致しません',
  [BrightChainStrings.Error_StoreError_InvalidBlockMetadataTemplate]:
    '無効なブロックメタデータ: {ERROR}',
  [BrightChainStrings.Error_StoreError_BlockDirectoryCreationFailedTemplate]:
    'ブロックディレクトリの作成に失敗しました: {ERROR}',
  [BrightChainStrings.Error_StoreError_BlockDeletionFailedTemplate]:
    'ブロックの削除に失敗しました: {ERROR}',
  [BrightChainStrings.Error_StoreError_NotImplemented]:
    '操作は実装されていません',
  [BrightChainStrings.Error_StoreError_InsufficientRandomBlocksTemplate]:
    '利用可能なランダムブロックが不足しています: 要求 {REQUESTED}、利用可能 {AVAILABLE}',
  [BrightChainStrings.Error_StoreError_FactoryNotRegistered]:
    '要求されたストアタイプのブロックストアファクトリが登録されていません',
  [BrightChainStrings.Error_StoreError_CloudOperationFailedTemplate]:
    'クラウドストレージ操作 {OPERATION} がブロック {BLOCK_CHECKSUM} で失敗しました: {ORIGINAL_ERROR}',
  [BrightChainStrings.Error_StoreError_CloudAuthenticationFailedTemplate]:
    'クラウドストレージ認証が操作 {OPERATION} で失敗しました: {ORIGINAL_ERROR}',
  [BrightChainStrings.Error_TupleError_InvalidTupleSize]: '無効なタプルサイズ',
  [BrightChainStrings.Error_TupleError_BlockSizeMismatch]:
    'タプル内のすべてのブロックは同じサイズである必要があります',
  [BrightChainStrings.Error_TupleError_NoBlocksToXor]:
    'XORするブロックがありません',
  [BrightChainStrings.Error_TupleError_InvalidBlockCount]:
    'タプルのブロック数が無効です',
  [BrightChainStrings.Error_TupleError_InvalidBlockType]:
    '無効なブロックタイプ',
  [BrightChainStrings.Error_TupleError_InvalidSourceLength]:
    'ソース長は正である必要があります',
  [BrightChainStrings.Error_TupleError_RandomBlockGenerationFailed]:
    'ランダムブロックの生成に失敗しました',
  [BrightChainStrings.Error_TupleError_WhiteningBlockGenerationFailed]:
    'ホワイトニングブロックの生成に失敗しました',
  [BrightChainStrings.Error_TupleError_MissingParameters]:
    'すべてのパラメータが必要です',
  [BrightChainStrings.Error_TupleError_XorOperationFailedTemplate]:
    'ブロックのXORに失敗しました: {ERROR}',
  [BrightChainStrings.Error_TupleError_DataStreamProcessingFailedTemplate]:
    'データストリームの処理に失敗しました: {ERROR}',
  [BrightChainStrings.Error_TupleError_EncryptedDataStreamProcessingFailedTemplate]:
    '暗号化データストリームの処理に失敗しました: {ERROR}',
  [BrightChainStrings.Error_TupleError_PoolBoundaryViolationTemplate]:
    'プール境界違反: {BLOCK_TYPE} はプール "{ACTUAL_POOL}" に属していますが、タプルにはプール "{EXPECTED_POOL}" が必要です',
  [BrightChainStrings.Error_SealingError_InvalidBitRange]:
    'ビットは3から20の間である必要があります',
  [BrightChainStrings.Error_SealingError_InvalidMemberArray]:
    'amongstMembersはMemberの配列である必要があります',
  [BrightChainStrings.Error_SealingError_NotEnoughMembersToUnlock]:
    'ドキュメントのロック解除に十分なメンバーがいません',
  [BrightChainStrings.Error_SealingError_TooManyMembersToUnlock]:
    'ドキュメントのロック解除にメンバーが多すぎます',
  [BrightChainStrings.Error_SealingError_MissingPrivateKeys]:
    'すべてのメンバーが秘密鍵をロードしていません',
  [BrightChainStrings.Error_SealingError_EncryptedShareNotFound]:
    '暗号化されたシェアが見つかりません',
  [BrightChainStrings.Error_SealingError_MemberNotFound]:
    'メンバーが見つかりません',
  [BrightChainStrings.Error_SealingError_FailedToSealTemplate]:
    'ドキュメントのシールに失敗しました: {ERROR}',
  [BrightChainStrings.Error_SealingError_InsufficientSharesForReconstruction]:
    '鍵の再構築に必要なシェアが不足しています',
  [BrightChainStrings.Error_SealingError_KeyReconstructionFailed]:
    '鍵の再構築に失敗しました',
  [BrightChainStrings.Error_CblError_CblRequired]: 'CBLが必要です',
  [BrightChainStrings.Error_CblError_WhitenedBlockFunctionRequired]:
    'getWhitenedBlock関数が必要です',
  [BrightChainStrings.Error_CblError_FailedToLoadBlock]:
    'ブロックの読み込みに失敗しました',
  [BrightChainStrings.Error_CblError_ExpectedEncryptedDataBlock]:
    '暗号化データブロックが期待されます',
  [BrightChainStrings.Error_CblError_ExpectedOwnedDataBlock]:
    '所有データブロックが期待されます',
  [BrightChainStrings.Error_CblError_InvalidStructure]: '無効なCBL構造',
  [BrightChainStrings.Error_CblError_CreatorUndefined]:
    '作成者は未定義にできません',
  [BrightChainStrings.Error_CblError_BlockNotReadable]:
    'ブロックを読み取れません',
  [BrightChainStrings.Error_CblError_CreatorRequiredForSignature]:
    '署名検証には作成者が必要です',
  [BrightChainStrings.Error_CblError_InvalidCreatorId]: '無効な作成者ID',
  [BrightChainStrings.Error_CblError_FileNameRequired]: 'ファイル名が必要です',
  [BrightChainStrings.Error_CblError_FileNameEmpty]:
    'ファイル名は空にできません',
  [BrightChainStrings.Error_CblError_FileNameWhitespace]:
    'ファイル名はスペースで始まったり終わったりできません',
  [BrightChainStrings.Error_CblError_FileNameInvalidChar]:
    'ファイル名に無効な文字が含まれています',
  [BrightChainStrings.Error_CblError_FileNameControlChars]:
    'ファイル名に制御文字が含まれています',
  [BrightChainStrings.Error_CblError_FileNamePathTraversal]:
    'ファイル名にパストラバーサルを含めることはできません',
  [BrightChainStrings.Error_CblError_MimeTypeRequired]: 'MIMEタイプが必要です',
  [BrightChainStrings.Error_CblError_MimeTypeEmpty]:
    'MIMEタイプは空にできません',
  [BrightChainStrings.Error_CblError_MimeTypeWhitespace]:
    'MIMEタイプはスペースで始まったり終わったりできません',
  [BrightChainStrings.Error_CblError_MimeTypeLowercase]:
    'MIMEタイプは小文字である必要があります',
  [BrightChainStrings.Error_CblError_MimeTypeInvalidFormat]:
    '無効なMIMEタイプフォーマット',
  [BrightChainStrings.Error_CblError_InvalidBlockSize]: '無効なブロックサイズ',
  [BrightChainStrings.Error_CblError_MetadataSizeExceeded]:
    'メタデータサイズが最大許容サイズを超えています',
  [BrightChainStrings.Error_CblError_MetadataSizeNegative]:
    '合計メタデータサイズは負にできません',
  [BrightChainStrings.Error_CblError_InvalidMetadataBuffer]:
    '無効なメタデータバッファ',
  [BrightChainStrings.Error_CblError_CreationFailedTemplate]:
    'CBLブロックの作成に失敗しました: {ERROR}',
  [BrightChainStrings.Error_CblError_InsufficientCapacityTemplate]:
    'ブロックサイズ ({BLOCK_SIZE}) がCBLデータ ({DATA_SIZE}) を保持するには小さすぎます',
  [BrightChainStrings.Error_CblError_NotExtendedCbl]: '拡張CBLではありません',
  [BrightChainStrings.Error_CblError_InvalidSignature]: '無効なCBL署名',
  [BrightChainStrings.Error_CblError_CreatorIdMismatch]:
    '作成者IDが一致しません',
  [BrightChainStrings.Error_CblError_FileSizeTooLarge]:
    'ファイルサイズが大きすぎます',
  [BrightChainStrings.Error_CblError_FileSizeTooLargeForNode]:
    'ファイルサイズが現在のノードの最大許容値を超えています',
  [BrightChainStrings.Error_CblError_InvalidTupleSize]: '無効なタプルサイズ',
  [BrightChainStrings.Error_CblError_FileNameTooLong]: 'ファイル名が長すぎます',
  [BrightChainStrings.Error_CblError_MimeTypeTooLong]: 'MIMEタイプが長すぎます',
  [BrightChainStrings.Error_CblError_AddressCountExceedsCapacity]:
    'アドレス数がブロック容量を超えています',
  [BrightChainStrings.Error_CblError_CblEncrypted]:
    'CBLは暗号化されています。使用前に復号化してください。',
  [BrightChainStrings.Error_CblError_UserRequiredForDecryption]:
    '復号化にはユーザーが必要です',
  [BrightChainStrings.Error_CblError_NotASuperCbl]: 'スーパーCBLではありません',
  [BrightChainStrings.Error_CblError_FailedToExtractCreatorId]:
    'CBLヘッダーから作成者IDのバイトを抽出できませんでした',
  [BrightChainStrings.Error_CblError_FailedToExtractProvidedCreatorId]:
    '提供された作成者からメンバーIDのバイトを抽出できませんでした',
  [BrightChainStrings.Error_CblError_PoolIntegrityError]:
    'CBLプール整合性エラー: 参照されたブロックの一部が期待されるプールに存在しません',
  [BrightChainStrings.Error_StreamError_BlockSizeRequired]:
    'ブロックサイズが必要です',
  [BrightChainStrings.Error_StreamError_WhitenedBlockSourceRequired]:
    'ホワイトニングブロックソースが必要です',
  [BrightChainStrings.Error_StreamError_RandomBlockSourceRequired]:
    'ランダムブロックソースが必要です',
  [BrightChainStrings.Error_StreamError_InputMustBeBuffer]:
    '入力はバッファである必要があります',
  [BrightChainStrings.Error_StreamError_FailedToGetRandomBlock]:
    'ランダムブロックの取得に失敗しました',
  [BrightChainStrings.Error_StreamError_FailedToGetWhiteningBlock]:
    'ホワイトニング/ランダムブロックの取得に失敗しました',
  [BrightChainStrings.Error_StreamError_IncompleteEncryptedBlock]:
    '不完全な暗号化ブロック',
  [BrightChainStrings.Error_SessionID_Invalid]: '無効なセッションID。',
  [BrightChainStrings.Error_TupleCount_InvalidTemplate]:
    '無効なタプル数 ({TUPLE_COUNT})、{TUPLE_MIN_SIZE}から{TUPLE_MAX_SIZE}の間である必要があります',
  [BrightChainStrings.Error_MemberError_InsufficientRandomBlocks]:
    'ランダムブロックが不足しています。',
  [BrightChainStrings.Error_MemberError_FailedToCreateMemberBlocks]:
    'メンバーブロックの作成に失敗しました。',
  [BrightChainStrings.Error_MemberError_InvalidMemberBlocks]:
    '無効なメンバーブロック。',
  [BrightChainStrings.Error_MemberError_PrivateKeyRequiredToDeriveVotingKeyPair]:
    '投票鍵ペアの導出には秘密鍵が必要です。',
  [BrightChainStrings.Error_MemoryTupleError_InvalidTupleSizeTemplate]:
    'タプルには{TUPLE_SIZE}個のブロックが必要です',
  [BrightChainStrings.Error_MultiEncryptedError_DataTooShort]:
    '暗号化ヘッダーを含むにはデータが短すぎます',
  [BrightChainStrings.Error_MultiEncryptedError_DataLengthExceedsCapacity]:
    'データ長がブロック容量を超えています',
  [BrightChainStrings.Error_MultiEncryptedError_CreatorMustBeMember]:
    '作成者はメンバーである必要があります',
  [BrightChainStrings.Error_MultiEncryptedError_BlockNotReadable]:
    'ブロックを読み取れません',
  [BrightChainStrings.Error_MultiEncryptedError_InvalidEphemeralPublicKeyLength]:
    '無効な一時公開鍵長',
  [BrightChainStrings.Error_MultiEncryptedError_InvalidIVLength]: '無効なIV長',
  [BrightChainStrings.Error_MultiEncryptedError_InvalidAuthTagLength]:
    '無効な認証タグ長',
  [BrightChainStrings.Error_MultiEncryptedError_ChecksumMismatch]:
    'チェックサム不一致',
  [BrightChainStrings.Error_MultiEncryptedError_RecipientMismatch]:
    '受信者リストがヘッダーの受信者数と一致しません',
  [BrightChainStrings.Error_MultiEncryptedError_RecipientsAlreadyLoaded]:
    '受信者は既にロードされています',
  [BrightChainStrings.Error_WhitenedError_BlockNotReadable]:
    'ブロックを読み取れません',
  [BrightChainStrings.Error_WhitenedError_BlockSizeMismatch]:
    'ブロックサイズは一致する必要があります',
  [BrightChainStrings.Error_WhitenedError_DataLengthMismatch]:
    'データとランダムデータの長さは一致する必要があります',
  [BrightChainStrings.Error_WhitenedError_InvalidBlockSize]:
    '無効なブロックサイズ',
  [BrightChainStrings.Error_HandleTupleError_InvalidTupleSizeTemplate]:
    '無効なタプルサイズ ({TUPLE_SIZE})',
  [BrightChainStrings.Error_HandleTupleError_BlockSizeMismatch]:
    'タプル内のすべてのブロックは同じサイズである必要があります',
  [BrightChainStrings.Error_HandleTupleError_NoBlocksToXor]:
    'XORするブロックがありません',
  [BrightChainStrings.Error_HandleTupleError_BlockSizesMustMatch]:
    'ブロックサイズは一致する必要があります',
  [BrightChainStrings.Error_HandleTupleError_PoolMismatchTemplate]:
    'プール不一致: ブロック {BLOCK_ID} はプール "{ACTUAL_POOL}" に属していますが、タプルにはプール "{EXPECTED_POOL}" が必要です',
  [BrightChainStrings.Error_BlockError_CreatorRequired]: '作成者が必要です',
  [BrightChainStrings.Error_BlockError_DataRequired]: 'データが必要です',
  [BrightChainStrings.Error_BlockError_DataLengthExceedsCapacity]:
    'データ長がブロック容量を超えています',
  [BrightChainStrings.Error_BlockError_ActualDataLengthNegative]:
    '実際のデータ長は正である必要があります',
  [BrightChainStrings.Error_BlockError_ActualDataLengthExceedsDataLength]:
    '実際のデータ長はデータ長を超えることはできません',
  [BrightChainStrings.Error_BlockError_CreatorRequiredForEncryption]:
    '暗号化には作成者が必要です',
  [BrightChainStrings.Error_BlockError_UnexpectedEncryptedBlockType]:
    '予期しない暗号化ブロックタイプ',
  [BrightChainStrings.Error_BlockError_CannotEncrypt]:
    'ブロックを暗号化できません',
  [BrightChainStrings.Error_BlockError_CannotDecrypt]:
    'ブロックを復号化できません',
  [BrightChainStrings.Error_BlockError_CreatorPrivateKeyRequired]:
    '作成者の秘密鍵が必要です',
  [BrightChainStrings.Error_BlockError_InvalidMultiEncryptionRecipientCount]:
    '無効なマルチ暗号化受信者数',
  [BrightChainStrings.Error_BlockError_InvalidNewBlockType]:
    '無効な新しいブロックタイプ',
  [BrightChainStrings.Error_BlockError_UnexpectedEphemeralBlockType]:
    '予期しない一時ブロックタイプ',
  [BrightChainStrings.Error_BlockError_RecipientRequired]: '受信者が必要です',
  [BrightChainStrings.Error_BlockError_RecipientKeyRequired]:
    '受信者の秘密鍵が必要です',
  [BrightChainStrings.Error_BlockError_DataLengthMustMatchBlockSize]:
    'データ長はブロックサイズと一致する必要があります',
  [BrightChainStrings.Error_MemoryTupleError_BlockSizeMismatch]:
    'タプル内のすべてのブロックは同じサイズである必要があります',
  [BrightChainStrings.Error_MemoryTupleError_NoBlocksToXor]:
    'XORするブロックがありません',
  [BrightChainStrings.Error_MemoryTupleError_InvalidBlockCount]:
    'タプルのブロック数が無効です',
  [BrightChainStrings.Error_MemoryTupleError_ExpectedBlockIdsTemplate]:
    '{TUPLE_SIZE}個のブロックIDが期待されます',
  [BrightChainStrings.Error_MemoryTupleError_ExpectedBlocksTemplate]:
    '{TUPLE_SIZE}個のブロックが期待されます',
  [BrightChainStrings.Error_Hydration_FailedToHydrateTemplate]:
    'ハイドレーションに失敗しました: {ERROR}',
  [BrightChainStrings.Error_Serialization_FailedToSerializeTemplate]:
    'シリアライズに失敗しました: {ERROR}',
  [BrightChainStrings.Error_Checksum_Invalid]: '無効なチェックサム。',
  [BrightChainStrings.Error_Creator_Invalid]: '無効な作成者。',
  [BrightChainStrings.Error_ID_InvalidFormat]: '無効なIDフォーマット。',
  [BrightChainStrings.Error_References_Invalid]: '無効な参照。',
  [BrightChainStrings.Error_Signature_Invalid]: '無効な署名。',
  [BrightChainStrings.Error_Metadata_Mismatch]: 'メタデータ不一致。',
  [BrightChainStrings.Error_Token_Expired]: 'トークンの有効期限が切れました。',
  [BrightChainStrings.Error_Token_Invalid]: 'トークンが無効です。',
  [BrightChainStrings.Error_Unexpected_Error]:
    '予期しないエラーが発生しました。',
  [BrightChainStrings.Error_User_NotFound]: 'ユーザーが見つかりません。',
  [BrightChainStrings.Error_Validation_Error]: '検証エラー。',
  [BrightChainStrings.ForgotPassword_Title]: 'パスワードを忘れた',
  [BrightChainStrings.Register_Button]: '登録',
  [BrightChainStrings.Register_Error]: '登録中にエラーが発生しました。',
  [BrightChainStrings.Register_Success]: '登録が成功しました。',
  [BrightChainStrings.Error_Capacity_Insufficient]: '容量が不足しています。',
  [BrightChainStrings.Error_Implementation_NotImplemented]: '未実装。',
  [BrightChainStrings.BlockSize_Unknown]: '不明',
  [BrightChainStrings.BlockSize_Message]: 'メッセージ',
  [BrightChainStrings.BlockSize_Tiny]: '極小',
  [BrightChainStrings.BlockSize_Small]: '小',
  [BrightChainStrings.BlockSize_Medium]: '中',
  [BrightChainStrings.BlockSize_Large]: '大',
  [BrightChainStrings.BlockSize_Huge]: '巨大',
  [BrightChainStrings.Error_DocumentError_InvalidValueTemplate]:
    '{KEY}の値が無効です',
  [BrightChainStrings.Error_DocumentError_FieldRequiredTemplate]:
    'フィールド{KEY}は必須です。',
  [BrightChainStrings.Error_DocumentError_AlreadyInitialized]:
    'ドキュメントサブシステムは既に初期化されています',
  [BrightChainStrings.Error_DocumentError_Uninitialized]:
    'ドキュメントサブシステムが初期化されていません',
  [BrightChainStrings.Error_Xor_LengthMismatchTemplate]:
    'XORには同じ長さの配列が必要です: a.length={A_LENGTH}, b.length={B_LENGTH}',
  [BrightChainStrings.Error_Xor_NoArraysProvided]:
    'XORには少なくとも1つの配列を提供する必要があります',
  [BrightChainStrings.Error_Xor_ArrayLengthMismatchTemplate]:
    'すべての配列は同じ長さである必要があります。期待値: {EXPECTED_LENGTH}、実際: {ACTUAL_LENGTH}、インデックス {INDEX}',
  [BrightChainStrings.Error_Xor_CryptoApiNotAvailable]:
    'この環境ではCrypto APIが利用できません',
  [BrightChainStrings.Error_TupleStorage_DataExceedsBlockSizeTemplate]:
    'データサイズ（{DATA_SIZE}）がブロックサイズ（{BLOCK_SIZE}）を超えています',
  [BrightChainStrings.Error_TupleStorage_InvalidMagnetProtocol]:
    '無効なマグネットプロトコルです。"magnet:"が必要です',
  [BrightChainStrings.Error_TupleStorage_InvalidMagnetType]:
    '無効なマグネットタイプです。"brightchain"が必要です',
  [BrightChainStrings.Error_TupleStorage_MissingMagnetParameters]:
    '必須のマグネットパラメータが不足しています',
  [BrightChainStrings.Error_LocationRecord_NodeIdRequired]:
    'ノードIDが必要です',
  [BrightChainStrings.Error_LocationRecord_LastSeenRequired]:
    '最終確認タイムスタンプが必要です',
  [BrightChainStrings.Error_LocationRecord_IsAuthoritativeRequired]:
    'isAuthoritativeフラグが必要です',
  [BrightChainStrings.Error_LocationRecord_InvalidLastSeenDate]:
    '無効な最終確認日時です',
  [BrightChainStrings.Error_LocationRecord_InvalidLatencyMs]:
    'レイテンシは非負の数値である必要があります',
  [BrightChainStrings.Error_LocationRecord_InvalidPoolId]:
    '無効なプールID形式です',
  [BrightChainStrings.Error_Metadata_BlockIdRequired]: 'ブロックIDが必要です',
  [BrightChainStrings.Error_Metadata_CreatedAtRequired]:
    '作成日時タイムスタンプが必要です',
  [BrightChainStrings.Error_Metadata_LastAccessedAtRequired]:
    '最終アクセス日時タイムスタンプが必要です',
  [BrightChainStrings.Error_Metadata_LocationUpdatedAtRequired]:
    '位置情報更新日時タイムスタンプが必要です',
  [BrightChainStrings.Error_Metadata_InvalidCreatedAtDate]:
    '無効な作成日時です',
  [BrightChainStrings.Error_Metadata_InvalidLastAccessedAtDate]:
    '無効な最終アクセス日時です',
  [BrightChainStrings.Error_Metadata_InvalidLocationUpdatedAtDate]:
    '無効な位置情報更新日時です',
  [BrightChainStrings.Error_Metadata_InvalidExpiresAtDate]:
    '無効な有効期限日時です',
  [BrightChainStrings.Error_Metadata_InvalidAvailabilityStateTemplate]:
    '無効な可用性状態: {STATE}',
  [BrightChainStrings.Error_Metadata_LocationRecordsMustBeArray]:
    '位置情報レコードは配列である必要があります',
  [BrightChainStrings.Error_Metadata_InvalidLocationRecordTemplate]:
    'インデックス {INDEX} の位置情報レコードが無効です',
  [BrightChainStrings.Error_Metadata_InvalidAccessCount]:
    'アクセス回数は非負の数値である必要があります',
  [BrightChainStrings.Error_Metadata_InvalidTargetReplicationFactor]:
    'ターゲットレプリケーション係数は正の数値である必要があります',
  [BrightChainStrings.Error_Metadata_InvalidSize]:
    'サイズは非負の数値である必要があります',
  [BrightChainStrings.Error_Metadata_ParityBlockIdsMustBeArray]:
    'パリティブロックIDは配列である必要があります',
  [BrightChainStrings.Error_Metadata_ReplicaNodeIdsMustBeArray]:
    'レプリカノードIDは配列である必要があります',
  [BrightChainStrings.Error_ServiceProvider_UseSingletonInstance]:
    '新しいインスタンスを作成する代わりにServiceProvider.getInstance()を使用してください',
  [BrightChainStrings.Error_ServiceProvider_NotInitialized]:
    'ServiceProviderが初期化されていません',
  [BrightChainStrings.Error_ServiceLocator_NotSet]:
    'ServiceLocatorが設定されていません',
  [BrightChainStrings.Error_BlockService_CannotEncrypt]:
    'ブロックを暗号化できません',
  [BrightChainStrings.Error_BlockService_BlocksArrayEmpty]:
    'ブロック配列は空であってはなりません',
  [BrightChainStrings.Error_BlockService_BlockSizesMustMatch]:
    'すべてのブロックは同じブロックサイズである必要があります',
  [BrightChainStrings.Error_MessageRouter_MessageNotFoundTemplate]:
    'メッセージが見つかりません: {MESSAGE_ID}',
  [BrightChainStrings.Error_BrowserConfig_NotImplementedTemplate]:
    'メソッド {METHOD} はブラウザ環境では実装されていません',
  [BrightChainStrings.Error_Debug_UnsupportedFormat]:
    'デバッグ出力用のサポートされていない形式です',
  [BrightChainStrings.Error_SecureHeap_KeyNotFound]:
    'セキュアヒープストレージにキーが見つかりません',
  [BrightChainStrings.Error_I18n_KeyConflictObjectTemplate]:
    'キーの競合が検出されました: {KEY} は既に {OBJECT} に存在します',
  [BrightChainStrings.Error_I18n_KeyConflictValueTemplate]:
    'キーの競合が検出されました: {KEY} には競合する値 {VALUE} があります',
  [BrightChainStrings.Error_I18n_StringsNotFoundTemplate]:
    '言語の文字列が見つかりません: {LANGUAGE}',
  [BrightChainStrings.Warning_BufferUtils_InvalidBase64String]:
    '無効なbase64文字列が提供されました',
  [BrightChainStrings.Warning_Keyring_FailedToLoad]:
    'ストレージからキーリングの読み込みに失敗しました',
  [BrightChainStrings.Warning_I18n_TranslationFailedTemplate]:
    'キー {KEY} の翻訳に失敗しました',
  [BrightChainStrings.Error_MemberStore_RollbackFailed]:
    'メンバーストアトランザクションのロールバックに失敗しました',
  [BrightChainStrings.Error_MemberCblService_CreateMemberCblFailed]:
    'メンバーCBLの作成に失敗しました',
  [BrightChainStrings.Error_MemberCblService_ChecksumMismatch]:
    '整合性検証中にブロックチェックサムの不一致が発生しました',
  [BrightChainStrings.Error_MemberCblService_BlockRetrievalFailed]:
    '整合性検証中にブロックの取得に失敗しました',
  [BrightChainStrings.Error_MemberCblService_MissingRequiredFields]:
    'メンバーデータに必須フィールドがありません',
  [BrightChainStrings.Error_DeliveryTimeout_HandleTimeoutFailedTemplate]:
    '配信タイムアウトの処理に失敗しました: {ERROR}',
  [BrightChainStrings.Error_BaseMemberDocument_PrivateCblIdNotSet]:
    'ベースメンバードキュメントのプライベートCBL IDが設定されていません',
  [BrightChainStrings.Error_BaseMemberDocument_PublicCblIdNotSet]:
    'ベースメンバードキュメントの公開CBL IDが設定されていません',

  // Document Errors (additional)
  [BrightChainStrings.Error_Document_CreatorRequiredForSaving]:
    'ドキュメントの保存には作成者が必要です',
  [BrightChainStrings.Error_Document_CreatorRequiredForEncrypting]:
    'ドキュメントの暗号化には作成者が必要です',
  [BrightChainStrings.Error_Document_NoEncryptedData]:
    '暗号化されたデータがありません',
  [BrightChainStrings.Error_Document_FieldShouldBeArrayTemplate]:
    'フィールド {FIELD} は配列である必要があります',
  [BrightChainStrings.Error_Document_InvalidArrayValueTemplate]:
    'フィールド {FIELD} のインデックス {INDEX} に無効な配列値があります',
  [BrightChainStrings.Error_Document_FieldRequiredTemplate]:
    'フィールド {FIELD} は必須です',
  [BrightChainStrings.Error_Document_FieldInvalidTemplate]:
    'フィールド {FIELD} は無効です',
  [BrightChainStrings.Error_Document_InvalidValueTemplate]:
    'フィールド {FIELD} に無効な値があります',
  [BrightChainStrings.Error_Document_InvalidValueInArrayTemplate]:
    '{KEY} の配列に無効な値があります',
  [BrightChainStrings.Error_Document_FieldIsRequiredTemplate]:
    'フィールド {FIELD} は必須です',
  [BrightChainStrings.Error_Document_FieldIsInvalidTemplate]:
    'フィールド {FIELD} は無効です',
  [BrightChainStrings.Error_MemberDocument_PublicCblIdNotSet]:
    '公開CBL IDが設定されていません',
  [BrightChainStrings.Error_MemberDocument_PrivateCblIdNotSet]:
    'プライベートCBL IDが設定されていません',

  // SimpleBrightChain Errors
  [BrightChainStrings.Error_SimpleBrightChain_BlockNotFoundTemplate]:
    'ブロックが見つかりません: {BLOCK_ID}',

  // Currency Code Errors
  [BrightChainStrings.Error_CurrencyCode_Invalid]: '無効な通貨コード',

  // Validator Errors
  [BrightChainStrings.Error_Validator_InvalidBlockSizeTemplate]:
    '無効なブロックサイズ: {BLOCK_SIZE}。有効なサイズは: {BLOCK_SIZES}',
  [BrightChainStrings.Error_Validator_InvalidBlockTypeTemplate]:
    '無効なブロックタイプ: {BLOCK_TYPE}。有効なタイプは: {BLOCK_TYPES}',
  [BrightChainStrings.Error_Validator_InvalidEncryptionTypeTemplate]:
    '無効な暗号化タイプ: {ENCRYPTION_TYPE}。有効なタイプは: {ENCRYPTION_TYPES}',
  [BrightChainStrings.Error_Validator_RecipientCountMustBeAtLeastOne]:
    '複数受信者暗号化の場合、受信者数は少なくとも1つ必要です',
  [BrightChainStrings.Error_Validator_RecipientCountMaximumTemplate]:
    '受信者数は {MAXIMUM} を超えることはできません',
  [BrightChainStrings.Error_Validator_FieldRequiredTemplate]:
    '{FIELD} は必須です',
  [BrightChainStrings.Error_Validator_FieldCannotBeEmptyTemplate]:
    '{FIELD} は空にできません',

  // Miscellaneous Block Errors
  [BrightChainStrings.Error_BlockError_BlockSizesMustMatch]:
    'ブロックサイズが一致する必要があります',
  [BrightChainStrings.Error_BlockError_DataCannotBeNullOrUndefined]:
    'データはnullまたはundefinedにできません',
  [BrightChainStrings.Error_BlockError_DataLengthExceedsBlockSizeTemplate]:
    'データ長 ({LENGTH}) がブロックサイズ ({BLOCK_SIZE}) を超えています',

  // CPU Errors
  [BrightChainStrings.Error_CPU_DuplicateOpcodeErrorTemplate]:
    '命令セット {INSTRUCTION_SET} に重複するオペコード 0x{OPCODE} があります',
  [BrightChainStrings.Error_CPU_NotImplementedTemplate]:
    '{INSTRUCTION} は実装されていません',
  [BrightChainStrings.Error_CPU_InvalidReadSizeTemplate]:
    '無効な読み取りサイズ: {SIZE}',
  [BrightChainStrings.Error_CPU_StackOverflow]: 'スタックオーバーフロー',
  [BrightChainStrings.Error_CPU_StackUnderflow]: 'スタックアンダーフロー',

  // Member CBL Errors
  [BrightChainStrings.Error_MemberCBL_PublicCBLIdNotSet]:
    '公開CBL IDが設定されていません',
  [BrightChainStrings.Error_MemberCBL_PrivateCBLIdNotSet]:
    'プライベートCBL IDが設定されていません',

  // Member Document Errors
  [BrightChainStrings.Error_MemberDocument_Hint]:
    'new MemberDocument() の代わりに MemberDocument.create() を使用してください',
  [BrightChainStrings.Error_MemberDocument_CBLNotGenerated]:
    'CBLが生成されていません。toMember()を呼び出す前にgenerateCBLs()を呼び出してください',

  // Member Profile Document Errors
  [BrightChainStrings.Error_MemberProfileDocument_Hint]:
    'new MemberProfileDocument() の代わりに MemberProfileDocument.create() を使用してください',

  // BrightTrust Document Errors
  [BrightChainStrings.Error_BrightTrustDocument_CreatorMustBeSetBeforeSaving]:
    '保存前に作成者を設定する必要があります',
  [BrightChainStrings.Error_BrightTrustDocument_CreatorMustBeSetBeforeEncrypting]:
    '暗号化前に作成者を設定する必要があります',
  [BrightChainStrings.Error_BrightTrustDocument_DocumentHasNoEncryptedData]:
    'ドキュメントに暗号化されたデータがありません',
  [BrightChainStrings.Error_BrightTrustDocument_InvalidEncryptedDataFormat]:
    '無効な暗号化データ形式',
  [BrightChainStrings.Error_BrightTrustDocument_InvalidMemberIdsFormat]:
    '無効なメンバーID形式',
  [BrightChainStrings.Error_BrightTrustDocument_InvalidSignatureFormat]:
    '無効な署名形式',
  [BrightChainStrings.Error_BrightTrustDocument_InvalidCreatorIdFormat]:
    '無効な作成者ID形式',
  [BrightChainStrings.Error_BrightTrustDocument_InvalidChecksumFormat]:
    '無効なチェックサム形式',

  // Block Logger
  [BrightChainStrings.BlockLogger_Redacted]: '墨消し済み',

  // Member Schema Errors
  [BrightChainStrings.Error_MemberSchema_InvalidIdFormat]: '無効なID形式',
  [BrightChainStrings.Error_MemberSchema_InvalidPublicKeyFormat]:
    '無効な公開鍵形式',
  [BrightChainStrings.Error_MemberSchema_InvalidVotingPublicKeyFormat]:
    '無効な投票用公開鍵形式',
  [BrightChainStrings.Error_MemberSchema_InvalidEmailFormat]:
    '無効なメールアドレス形式',
  [BrightChainStrings.Error_MemberSchema_InvalidRecoveryDataFormat]:
    '無効な復旧データ形式',
  [BrightChainStrings.Error_MemberSchema_InvalidTrustedPeersFormat]:
    '無効な信頼済みピア形式',
  [BrightChainStrings.Error_MemberSchema_InvalidBlockedPeersFormat]:
    '無効なブロック済みピア形式',
  [BrightChainStrings.Error_MemberSchema_InvalidActivityLogFormat]:
    '無効なアクティビティログ形式',

  // Message Metadata Schema Errors
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidRecipientsFormat]:
    '無効な受信者形式',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidPriorityFormat]:
    '無効な優先度形式',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidDeliveryStatusFormat]:
    '無効な配信ステータス形式',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidAcknowledgementsFormat]:
    '無効な確認応答形式',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidEncryptionSchemeFormat]:
    '無効な暗号化スキーム形式',
  [BrightChainStrings.Error_MessageMetadataSchema_InvalidCBLBlockIDsFormat]:
    '無効なCBLブロックID形式',

  // Security
  [BrightChainStrings.Security_DOS_InputSizeExceedsLimitErrorTemplate]:
    '入力サイズ {SIZE} が {OPERATION} の制限 {MAX_SIZE} を超えています',
  [BrightChainStrings.Security_DOS_OperationExceededTimeLimitErrorTemplate]:
    '操作 {OPERATION} がタイムアウト {MAX_TIME} ms を超えました',
  [BrightChainStrings.Security_RateLimiter_RateLimitExceededErrorTemplate]:
    '{OPERATION} のレート制限を超えました',
  [BrightChainStrings.Security_AuditLogger_SignatureValidationResultTemplate]:
    '署名検証 {RESULT}',
  [BrightChainStrings.Security_AuditLogger_Failure]: '失敗',
  [BrightChainStrings.Security_AuditLogger_Success]: '成功',
  [BrightChainStrings.Security_AuditLogger_BlockCreated]:
    'ブロックが作成されました',
  [BrightChainStrings.Security_AuditLogger_EncryptionPerformed]:
    '暗号化が実行されました',
  [BrightChainStrings.Security_AuditLogger_DecryptionResultTemplate]:
    '復号化 {RESULT}',
  [BrightChainStrings.Security_AuditLogger_AccessDeniedTemplate]:
    '{RESOURCE} へのアクセスが拒否されました',
  [BrightChainStrings.Security_AuditLogger_Security]: 'セキュリティ',

  // Delivery Timeout
  [BrightChainStrings.DeliveryTimeout_FailedToHandleTimeoutTemplate]:
    '{MESSAGE_ID}:{RECIPIENT_ID} のタイムアウト処理に失敗しました',

  // Message CBL Service
  [BrightChainStrings.MessageCBLService_MessageSizeExceedsMaximumTemplate]:
    'メッセージサイズ {SIZE} が最大値 {MAX_SIZE} を超えています',
  [BrightChainStrings.MessageCBLService_FailedToCreateMessageAfterRetries]:
    'リトライ後もメッセージの作成に失敗しました',
  [BrightChainStrings.MessageCBLService_FailedToRetrieveMessageTemplate]:
    'メッセージ {MESSAGE_ID} の取得に失敗しました',
  [BrightChainStrings.MessageCBLService_MessageTypeIsRequired]:
    'メッセージタイプは必須です',
  [BrightChainStrings.MessageCBLService_SenderIDIsRequired]:
    '送信者IDは必須です',
  [BrightChainStrings.MessageCBLService_RecipientCountExceedsMaximumTemplate]:
    '受信者数 {COUNT} が最大値 {MAXIMUM} を超えています',

  // Message Encryption Service
  [BrightChainStrings.MessageEncryptionService_NoRecipientPublicKeysProvided]:
    '受信者の公開鍵が提供されていません',
  [BrightChainStrings.MessageEncryptionService_FailedToEncryptTemplate]:
    '受信者 {RECIPIENT_ID} への暗号化に失敗しました: {ERROR}',
  [BrightChainStrings.MessageEncryptionService_BroadcastEncryptionFailedTemplate]:
    'ブロードキャスト暗号化に失敗しました: {TEMPLATE}',
  [BrightChainStrings.MessageEncryptionService_DecryptionFailedTemplate]:
    '復号化に失敗しました: {ERROR}',
  [BrightChainStrings.MessageEncryptionService_KeyDecryptionFailedTemplate]:
    '鍵の復号化に失敗しました: {ERROR}',

  // Message Logger
  [BrightChainStrings.MessageLogger_MessageCreated]:
    'メッセージが作成されました',
  [BrightChainStrings.MessageLogger_RoutingDecision]: 'ルーティング決定',
  [BrightChainStrings.MessageLogger_DeliveryFailure]: '配信失敗',
  [BrightChainStrings.MessageLogger_EncryptionFailure]: '暗号化失敗',
  [BrightChainStrings.MessageLogger_SlowQueryDetected]: '低速クエリを検出',

  // Message Router
  [BrightChainStrings.MessageRouter_RoutingTimeout]: 'ルーティングタイムアウト',
  [BrightChainStrings.MessageRouter_FailedToRouteToAnyRecipient]:
    'どの受信者にもメッセージをルーティングできませんでした',
  [BrightChainStrings.MessageRouter_ForwardingLoopDetected]:
    '転送ループが検出されました',

  // Block Format Service
  [BrightChainStrings.BlockFormatService_DataTooShort]:
    '構造化ブロックヘッダーにはデータが短すぎます（最低4バイト必要）',
  [BrightChainStrings.BlockFormatService_InvalidStructuredBlockFormatTemplate]:
    '無効な構造化ブロックタイプ: 0x{TYPE}',
  [BrightChainStrings.BlockFormatService_CannotDetermineHeaderSize]:
    'ヘッダーサイズを決定できません - データが切り捨てられている可能性があります',
  [BrightChainStrings.BlockFormatService_Crc8MismatchTemplate]:
    'CRC8不一致 - ヘッダーが破損している可能性があります（期待値 0x{EXPECTED}、取得値 0x{CHECKSUM}）',
  [BrightChainStrings.BlockFormatService_DataAppearsEncrypted]:
    'データはECIES暗号化されているようです - 解析前に復号してください',
  [BrightChainStrings.BlockFormatService_UnknownBlockFormat]:
    '不明なブロック形式 - 0xBCマジックプレフィックスがありません（生データの可能性があります）',

  // CBL Service
  [BrightChainStrings.CBLService_NotAMessageCBL]: 'メッセージCBLではありません',
  [BrightChainStrings.CBLService_CreatorIDByteLengthMismatchTemplate]:
    '作成者IDのバイト長が不一致: 取得値 {LENGTH}、期待値 {EXPECTED}',
  [BrightChainStrings.CBLService_CreatorIDProviderReturnedBytesLengthMismatchTemplate]:
    '作成者IDプロバイダーが {LENGTH} バイトを返しました、期待値 {EXPECTED}',
  [BrightChainStrings.CBLService_SignatureLengthMismatchTemplate]:
    '署名の長さが不一致: 取得値 {LENGTH}、期待値 {EXPECTED}',
  [BrightChainStrings.CBLService_DataAppearsRaw]:
    'データは構造化ヘッダーのない生データのようです',
  [BrightChainStrings.CBLService_InvalidBlockFormat]: '無効なブロック形式',
  [BrightChainStrings.CBLService_SubCBLCountChecksumMismatchTemplate]:
    'SubCblCount ({COUNT}) が subCblChecksums の長さ ({EXPECTED}) と一致しません',
  [BrightChainStrings.CBLService_InvalidDepthTemplate]:
    '深さは1から65535の間でなければなりません。取得値: {DEPTH}',
  [BrightChainStrings.CBLService_ExpectedSuperCBLTemplate]:
    'SuperCBL（ブロックタイプ 0x03）が期待されましたが、ブロックタイプ 0x{TYPE} を取得しました',

  // Global Service Provider
  [BrightChainStrings.GlobalServiceProvider_NotInitialized]:
    'サービスプロバイダーが初期化されていません。まず ServiceProvider.getInstance() を呼び出してください。',

  // Block Store Adapter
  [BrightChainStrings.BlockStoreAdapter_DataLengthExceedsBlockSizeTemplate]:
    'データ長 ({LENGTH}) がブロックサイズ ({BLOCK_SIZE}) を超えています',

  // Memory Block Store
  [BrightChainStrings.MemoryBlockStore_FECServiceUnavailable]:
    'FECサービスは利用できません',
  [BrightChainStrings.MemoryBlockStore_FECServiceUnavailableInThisEnvironment]:
    'FECサービスはこの環境では利用できません',
  [BrightChainStrings.MemoryBlockStore_NoParityDataAvailable]:
    '復旧用のパリティデータがありません',
  [BrightChainStrings.MemoryBlockStore_BlockMetadataNotFound]:
    'ブロックメタデータが見つかりません',
  [BrightChainStrings.MemoryBlockStore_RecoveryFailedInsufficientParityData]:
    '復旧に失敗しました - パリティデータが不足しています',
  [BrightChainStrings.MemoryBlockStore_UnknownRecoveryError]:
    '不明な復旧エラー',
  [BrightChainStrings.MemoryBlockStore_CBLDataCannotBeEmpty]:
    'CBLデータは空にできません',
  [BrightChainStrings.MemoryBlockStore_CBLDataTooLargeTemplate]:
    'CBLデータが大きすぎます：パディングサイズ（{LENGTH}）がブロックサイズ（{BLOCK_SIZE}）を超えています。より大きなブロックサイズまたはより小さなCBLを使用してください。',
  [BrightChainStrings.MemoryBlockStore_Block1NotFound]:
    'ブロック1が見つからず、復旧に失敗しました',
  [BrightChainStrings.MemoryBlockStore_Block2NotFound]:
    'ブロック2が見つからず、復旧に失敗しました',
  [BrightChainStrings.MemoryBlockStore_InvalidMagnetURL]:
    '無効なマグネットURL：「magnet:?」で始まる必要があります',
  [BrightChainStrings.MemoryBlockStore_InvalidMagnetURLXT]:
    '無効なマグネットURL：xtパラメータは「urn:brightchain:cbl」である必要があります',
  [BrightChainStrings.MemoryBlockStore_InvalidMagnetURLMissingTemplate]:
    '無効なマグネットURL：{PARAMETER}パラメータがありません',
  [BrightChainStrings.MemoryBlockStore_InvalidMagnetURL_InvalidBlockSize]:
    '無効なマグネットURL：無効なブロックサイズ',

  // Checksum
  [BrightChainStrings.Checksum_InvalidTemplate]:
    'チェックサムは{EXPECTED}バイトである必要がありますが、{LENGTH}バイトを取得しました',
  [BrightChainStrings.Checksum_InvalidHexString]:
    '無効な16進数文字列：16進数以外の文字が含まれています',
  [BrightChainStrings.Checksum_InvalidHexStringTemplate]:
    '無効な16進数文字列の長さ：{EXPECTED}文字が必要ですが、{LENGTH}文字を取得しました',

  [BrightChainStrings.Error_XorLengthMismatchTemplate]:
    'XORには同じ長さの配列が必要です{CONTEXT}：a.length={A_LENGTH}、b.length={B_LENGTH}',
  [BrightChainStrings.Error_XorAtLeastOneArrayRequired]:
    'XORには少なくとも1つの配列を提供する必要があります',

  [BrightChainStrings.Error_InvalidUnixTimestampTemplate]:
    '無効なUnixタイムスタンプ：{TIMESTAMP}',
  [BrightChainStrings.Error_InvalidDateStringTemplate]:
    '無効な日付文字列："{VALUE}"。ISO 8601形式（例："2024-01-23T10:30:00Z"）またはUnixタイムスタンプが必要です。',
  [BrightChainStrings.Error_InvalidDateValueTypeTemplate]:
    '無効な日付値の型：{TYPE}。文字列または数値が必要です。',
  [BrightChainStrings.Error_InvalidDateObjectTemplate]:
    '無効な日付オブジェクト：Dateインスタンスが必要ですが、{OBJECT_STRING}を取得しました',
  [BrightChainStrings.Error_InvalidDateNaN]:
    '無効な日付：日付オブジェクトにNaNタイムスタンプが含まれています',
  [BrightChainStrings.Error_JsonValidationErrorTemplate]:
    'フィールド {FIELD} のJSON検証に失敗しました：{REASON}',
  [BrightChainStrings.Error_JsonValidationError_MustBeNonNull]:
    'nullでないオブジェクトである必要があります',
  [BrightChainStrings.Error_JsonValidationError_FieldRequired]:
    'フィールドは必須です',
  [BrightChainStrings.Error_JsonValidationError_MustBeValidBlockSize]:
    '有効なBlockSize列挙値である必要があります',
  [BrightChainStrings.Error_JsonValidationError_MustBeValidBlockType]:
    '有効なBlockType列挙値である必要があります',
  [BrightChainStrings.Error_JsonValidationError_MustBeValidBlockDataType]:
    '有効なBlockDataType列挙値である必要があります',
  [BrightChainStrings.Error_JsonValidationError_MustBeNumber]:
    '数値である必要があります',
  [BrightChainStrings.Error_JsonValidationError_MustBeNonNegative]:
    '非負の値である必要があります',
  [BrightChainStrings.Error_JsonValidationError_MustBeInteger]:
    '整数である必要があります',
  [BrightChainStrings.Error_JsonValidationError_MustBeISO8601DateStringOrUnixTimestamp]:
    '有効なISO 8601文字列またはUnixタイムスタンプである必要があります',
  [BrightChainStrings.Error_JsonValidationError_MustBeString]:
    '文字列である必要があります',
  [BrightChainStrings.Error_JsonValidationError_MustNotBeEmpty]:
    '空であってはなりません',
  [BrightChainStrings.Error_JsonValidationError_JSONParsingFailed]:
    'JSON解析に失敗しました',
  [BrightChainStrings.Error_JsonValidationError_ValidationFailed]:
    '検証に失敗しました',
  [BrightChainStrings.XorUtils_BlockSizeMustBePositiveTemplate]:
    'ブロックサイズは正の値である必要があります: {BLOCK_SIZE}',
  [BrightChainStrings.XorUtils_InvalidPaddedDataTemplate]:
    '無効なパディングデータ: 短すぎます ({LENGTH} バイト、最低 {REQUIRED} 必要)',
  [BrightChainStrings.XorUtils_InvalidLengthPrefixTemplate]:
    '無効な長さプレフィックス: {LENGTH} バイトを主張していますが、{AVAILABLE} バイトのみ利用可能',
  [BrightChainStrings.BlockPaddingTransform_MustBeArray]:
    '入力は Uint8Array、TypedArray、または ArrayBuffer である必要があります',
  [BrightChainStrings.CblStream_UnknownErrorReadingData]:
    'データ読み取り中の不明なエラー',
  [BrightChainStrings.CurrencyCode_InvalidCurrencyCode]: '無効な通貨コード',
  [BrightChainStrings.EnergyAccount_InsufficientBalanceTemplate]:
    '残高不足: {AMOUNT}J 必要、{AVAILABLE_BALANCE}J 利用可能',
  [BrightChainStrings.Init_BrowserCompatibleConfiguration]:
    'GuidV4Provider を使用した BrightChain ブラウザ互換構成',
  [BrightChainStrings.Init_NotInitialized]:
    'BrightChain ライブラリが初期化されていません。最初に initializeBrightChain() を呼び出してください。',
  [BrightChainStrings.ModInverse_MultiplicativeInverseDoesNotExist]:
    'モジュラー乗法逆元が存在しません',
  [BrightChainStrings.PrimeTupleGeneratorStream_UnknownErrorInTransform]:
    '変換中に不明なエラーが発生しました',
  [BrightChainStrings.PrimeTupleGeneratorStream_UnknownErrorInMakeTuple]:
    'makeTuple で不明なエラーが発生しました',
  [BrightChainStrings.PrimeTupleGeneratorStream_UnknownErrorInFlush]:
    'flush で不明なエラーが発生しました',
  [BrightChainStrings.BrightTrustDataRecord_MustShareWithAtLeastTwoMembers]:
    '少なくとも2人のメンバーと共有する必要があります',
  [BrightChainStrings.BrightTrustDataRecord_SharesRequiredExceedsMembers]:
    '必要なシェア数がメンバー数を超えています',
  [BrightChainStrings.BrightTrustDataRecord_SharesRequiredMustBeAtLeastTwo]:
    '必要なシェア数は2以上である必要があります',
  [BrightChainStrings.BrightTrustDataRecord_InvalidChecksum]:
    '無効なチェックサム',
  [BrightChainStrings.BrightTrustDataRecord_InvalidSignature]: '無効な署名',
  [BrightChainStrings.SimpleBrowserStore_BlockNotFoundTemplate]:
    'ブロックが見つかりません: {ID}',
  [BrightChainStrings.EncryptedBlockCreator_NoCreatorRegisteredTemplate]:
    'ブロックタイプ {TYPE} に登録されたクリエイターがありません',
  [BrightChainStrings.TestMember_MemberNotFoundTemplate]:
    'メンバー {KEY} が見つかりません',

  // TCBL (Tarball CBL) Errors
  [BrightChainStrings.Error_TcblError_InvalidHeader]:
    'TCBLヘッダーが無効です：マジックプレフィックスまたはタイプバイトが欠落しているか不正です',
  [BrightChainStrings.Error_TcblError_ManifestChecksumMismatch]:
    'TCBLマニフェストのチェックサムが計算されたチェックサムと一致しません',
  [BrightChainStrings.Error_TcblError_ManifestCountMismatch]:
    'TCBLマニフェストのエントリ数が実際のエントリ記述子の数と一致しません',
  [BrightChainStrings.Error_TcblError_ManifestCorrupted]:
    'TCBLマニフェストデータが破損しているか不正です',
  [BrightChainStrings.Error_TcblError_ManifestTruncated]:
    'TCBLマニフェストデータが切り詰められています',
  [BrightChainStrings.Error_TcblError_EntryNotFound]:
    'TCBLエントリがマニフェストに見つかりません',
  [BrightChainStrings.Error_TcblError_FileNameTooLong]:
    'TCBLエントリのファイル名が最大許容長を超えています',
  [BrightChainStrings.Error_TcblError_MimeTypeTooLong]:
    'TCBLエントリのMIMEタイプが最大許容長を超えています',
  [BrightChainStrings.Error_TcblError_PathTraversal]:
    'TCBLエントリのファイル名にパストラバーサルシーケンスが含まれています',
  [BrightChainStrings.Error_TcblError_DecompressionFailed]:
    'TCBLアーカイブペイロードの解凍に失敗しました',
  [BrightChainStrings.Error_TcblError_DecryptionFailed]:
    'TCBLアーカイブペイロードの復号に失敗しました',
  [BrightChainStrings.Error_TcblError_InvalidManifestVersion]:
    'TCBLマニフェストバージョンはサポートされていません',

  // Splash
  [BrightChainStrings.Splash_Welcome]: 'BrightChainへようこそ',
  [BrightChainStrings.Splash_NextGenInfrastructure]:
    '分散型アプリケーションプラットフォーム',
  [BrightChainStrings.Splash_SoupCanDemo]: 'スープ缶デモ',
  [BrightChainStrings.Splash_SoupCanDemoDescription]:
    'BrightChainがデータをブロックに分割し、XOR演算を使用してランダムデータと混合することで、所有者不在ストレージを実現する仕組みをご覧ください。',
  [BrightChainStrings.Splash_StoragePools]: 'ストレージプール',
  [BrightChainStrings.Splash_StoragePoolsDescription]:
    'ネームスペース分離されたプール、コンテンツアドレス指定ブロック、プールスコープのホワイトニング、およびクロスプール分離保証を探索します。',
  [BrightChainStrings.Splash_Messaging]: 'メッセージング',
  [BrightChainStrings.Splash_MessagingDescription]:
    'ECIES暗号化されたダイレクトメッセージ、プール共有グループチャット、可視性モード付きチャンネル、消滅メッセージ、およびプレゼンス。',
  [BrightChainStrings.Splash_BrightPass]: 'BrightPass',
  [BrightChainStrings.Splash_BrightPassDescription]:
    '認証情報の保存、パスワード生成、侵害チェック、TOTP/2FA設定を備えた分散型パスワード保管庫。',
  [BrightChainStrings.Splash_Database]: 'データベース',
  [BrightChainStrings.Splash_DatabaseDescription]:
    'コピーオンライトブロック、プール分離、楽観的並行性トランザクション、集約パイプラインを備えたドキュメントデータベース。',
  [BrightChainStrings.Splash_IdentityAndSecurity]:
    'アイデンティティとセキュリティ',
  [BrightChainStrings.Splash_IdentityAndSecurityDescription]:
    'ペーパーキーバックアップ、デバイス管理、プラットフォーム間のアイデンティティ証明、公開鍵ディレクトリでのプロファイル検索。',
  [BrightChainStrings.Splash_TrySoupCanDemo]: 'スープ缶デモを試す',
  [BrightChainStrings.Splash_GetStarted]: '始める',
  [BrightChainStrings.Splash_WhatIsBrightChain]: 'BrightChainとは？',
  [BrightChainStrings.Splash_WhatIsBrightChainDescription]:
    'BrightChainは「ブライトブロックスープ」コンセプトを使用してデータストレージを革新します。ファイルはブロックに分割され、XOR演算を使用してランダムデータと混合されることで、完全にランダムに見えながら完璧なセキュリティを維持します。',
  [BrightChainStrings.Splash_OwnerFreeStorage]: '所有者不在ストレージ',
  [BrightChainStrings.Splash_OwnerFreeStorageDescription]:
    '暗号学的ランダム性がストレージの責任を排除',
  [BrightChainStrings.Splash_EnergyEfficient]: 'エネルギー効率的',
  [BrightChainStrings.Splash_EnergyEfficientDescription]:
    '無駄なプルーフオブワークマイニングなし',
  [BrightChainStrings.Splash_Decentralized]: '分散型',
  [BrightChainStrings.Splash_DecentralizedDescription]:
    'ネットワーク全体に分散',
  [BrightChainStrings.Splash_AnonymousYetAccountable]:
    '匿名でありながら説明責任あり',
  [BrightChainStrings.Splash_AnonymousYetAccountableDescription]:
    'モデレーション機能を備えたプライバシー',
  [BrightChainStrings.Splash_ExploreThePlatform]: 'プラットフォームを探索',
  [BrightChainStrings.Splash_InteractiveDemos]:
    'BrightChainの主要機能を紹介するインタラクティブデモ',
  [BrightChainStrings.Splash_LaunchDemo]: 'デモを起動',

  // Splash - BrightStack
  [BrightChainStrings.Splash_BuildWithBrightStack]: 'BrightStackで構築する',
  [BrightChainStrings.Splash_BuildWithBrightStackDescription]:
    'BrightStackは分散型アプリケーションのためのフルスタックパラダイムです：BrightChain + Express + React + Node。MERNスタックを知っていれば、BrightStackも使えます。',
  [BrightChainStrings.Splash_BrightStackSubtitle]:
    'MongoDBをBrightDbに置き換えるだけ。他はそのまま。',
  [BrightChainStrings.Splash_BrightDb]: 'BrightDb',
  [BrightChainStrings.Splash_BrightDbDescription]:
    'Owner-Freeファイルシステム上のMongoDB互換ドキュメントデータベース。完全なCRUD、クエリ、インデックス、トランザクション、集約パイプラインをサポート。',
  [BrightChainStrings.Splash_FamiliarApi]: 'おなじみのAPI',
  [BrightChainStrings.Splash_FamiliarApiDescription]:
    'MongoDBと同じパターン — コレクション、find、insert、update — ただし、すべてのドキュメントはプライバシーを保護するホワイトニングブロックとして保存されます。',
  [BrightChainStrings.Splash_BuiltOnBrightStack]: 'BrightStack上に構築',
  [BrightChainStrings.Splash_BuiltOnBrightStackDescription]:
    'BrightPass、BrightMail、BrightHubはすべてBrightStack上に構築されており、分散型アプリ開発が従来のフルスタック開発と同じくらい簡単であることを証明しています。',
  [BrightChainStrings.Splash_OpenSource]: 'オープンソース',
  [BrightChainStrings.Splash_OpenSourceDescription]:
    'BrightChainは完全にオープンソースです。BrightStack上で独自のdAppを構築し、分散型の未来に貢献しましょう。',

  // Splash - 暗号通貨ではない
  [BrightChainStrings.Splash_NotACryptocurrency]: '暗号通貨ではありません',
  [BrightChainStrings.Splash_NotACryptocurrencyDescription]:
    '「ブロックチェーン」と聞くと、ビットコインを思い浮かべるでしょう。BrightChainは根本的に異なります — 通貨もなく、プルーフ・オブ・ワークもなく、マイニングもありません。コインを鋳造するためにエネルギーを浪費する代わりに、BrightChainはストレージとコンピューティングの実際の貢献を重視します。',
  [BrightChainStrings.Splash_NoCurrency]: '通貨なし',
  [BrightChainStrings.Splash_NoCurrencyDescription]:
    'BrightChainにはコイン、トークン、投機的資産はありません。金融ではなく、インフラストラクチャです。',
  [BrightChainStrings.Splash_NoMining]: 'マイニングなし',
  [BrightChainStrings.Splash_NoMiningDescription]:
    'プルーフ・オブ・ワークなし、エネルギーの無駄なし。すべての計算サイクルが有用な目的に使われます。',
  [BrightChainStrings.Splash_Joules]: 'コインではなくジュール',
  [BrightChainStrings.Splash_JoulesDescription]:
    'ストレージとコンピューティングの貢献はジュールで追跡されます — 市場の投機ではなく、実際のエネルギーコストに結びついた単位です。',
  [BrightChainStrings.Splash_RealWorldValue]: '現実世界の価値',
  [BrightChainStrings.Splash_RealWorldValueDescription]:
    'ジュールの値は実際のコストに基づく公式で設定され、時間とともにその公式を改善していきます — 取引なし、変動なし。',
  [BrightChainStrings.Splash_Documentation]: 'ドキュメント',
  [BrightChainStrings.Splash_FAQ]: 'よくある質問',
  [BrightChainStrings.Splash_PrivacyPolicy]: 'プライバシーポリシー',
  [BrightChainStrings.Splash_TermsOfService]: '利用規約',

  // Splash - 早期開発バナー
  [BrightChainStrings.Splash_EarlyDev_Title]:
    '🚧 開発初期段階 — 開発中',
  [BrightChainStrings.Splash_EarlyDev_Body]:
    'BrightChainは開発中のプロジェクトです。ほとんどの機能は活発に開発中であり、完全には動作していません。ネットワークを立ち上げている間、すべては非常に初歩的な状態です。',
  [BrightChainStrings.Splash_EarlyDev_Team]: '少人数チーム',
  [BrightChainStrings.Splash_EarlyDev_TeamDescription]:
    '開発チームは現在、1人の人間とAIアシスタントで構成されています。ネットワークの共同開発者や最初のピアノードを積極的に探しています。',
  [BrightChainStrings.Splash_EarlyDev_DataWarning]:
    'データが削除される可能性があります',
  [BrightChainStrings.Splash_EarlyDev_DataWarningDescription]:
    'データの永続性は保証できません。安定性に達する前に、後方互換性のない変更によりデータベースをパージする必要が生じる場合があります。代替不可能なものは保存しないでください。',
  [BrightChainStrings.Splash_EarlyDev_UptimeWarning]: '稼働時間の保証なし',
  [BrightChainStrings.Splash_EarlyDev_UptimeWarningDescription]:
    '冗長性のない単一の本番ノードがあり、自動化なしで手動でセットアップされています。いつでも障害が発生する可能性があります。',
  [BrightChainStrings.Splash_EarlyDev_GetInvolved]: '参加する',
  [BrightChainStrings.Splash_EarlyDev_GetInvolvedDescription]:
    '寄付や時間の貢献は大歓迎であり、開発を大幅に加速させるでしょう。共同開発やピアノードの運営に興味がある方は、ぜひご連絡ください。',

  // Dashboard
  [BrightChainStrings.Dashboard_Title]: 'ダッシュボード',
  [BrightChainStrings.Dashboard_EnergyBalance]: 'エネルギー残高',
  [BrightChainStrings.Dashboard_AvailableCredits]:
    '利用可能なエネルギークレジット',
  [BrightChainStrings.Dashboard_Reputation]: 'レピュテーション',
  [BrightChainStrings.Dashboard_ReputationScore]:
    'ネットワークレピュテーションスコア',
  [BrightChainStrings.Dashboard_EnergyEarned]: '獲得エネルギー',
  [BrightChainStrings.Dashboard_EarnedDescription]:
    'リソース提供による総獲得量',
  [BrightChainStrings.Dashboard_EnergySpent]: '消費エネルギー',
  [BrightChainStrings.Dashboard_SpentDescription]:
    'オペレーションに費やした総量',
  [BrightChainStrings.Dashboard_Loading]: '読み込み中...',
  [BrightChainStrings.Dashboard_FailedToLoadBalance]:
    '残高の読み込みに失敗しました',
  [BrightChainStrings.Dashboard_FailedToLoadReputation]:
    'レピュテーションの読み込みに失敗しました',
  [BrightChainStrings.Dashboard_FailedToLoadData]:
    'データの読み込みに失敗しました',

  // Admin Dashboard
  [BrightChainStrings.Admin_Dashboard_Title]: '管理ダッシュボード',
  [BrightChainStrings.Admin_Dashboard_AccessDenied]: 'アクセス拒否',
  [BrightChainStrings.Admin_Dashboard_AccessDeniedDescription]:
    '管理ダッシュボードを表示する権限がありません。',
  [BrightChainStrings.Admin_Dashboard_Loading]: 'ダッシュボードを読み込み中…',
  [BrightChainStrings.Admin_Dashboard_NoData]: 'データがありません。',
  [BrightChainStrings.Admin_Dashboard_RefreshNow]: '今すぐ更新',
  [BrightChainStrings.Admin_Dashboard_ErrorLastSuccessTemplate]:
    'エラー — 最終成功：{TIME}',
  [BrightChainStrings.Admin_Dashboard_ErrorLastSuccessNever]: 'なし',
  [BrightChainStrings.Admin_Dashboard_ServerIdentity]: 'サーバー識別情報',
  [BrightChainStrings.Admin_Dashboard_Hostname]: 'ホスト名',
  [BrightChainStrings.Admin_Dashboard_LocalNodeId]: 'ローカルノード ID',
  [BrightChainStrings.Admin_Dashboard_Timestamp]: 'タイムスタンプ',
  [BrightChainStrings.Admin_Dashboard_NA]: '該当なし',
  [BrightChainStrings.Admin_Dashboard_Nodes]: 'ノード',
  [BrightChainStrings.Admin_Dashboard_NoNodesRegistered]:
    '登録されたノードはありません。',
  [BrightChainStrings.Admin_Dashboard_DisconnectedPeers]: '切断されたピア',
  [BrightChainStrings.Admin_Dashboard_LumenClients]: 'Lumen クライアント',
  [BrightChainStrings.Admin_Dashboard_ConnectedClients]: '接続中のクライアント',
  [BrightChainStrings.Admin_Dashboard_RoomsTemplate]: '{COUNT} ルーム',
  [BrightChainStrings.Admin_Dashboard_NodeConnections]: 'ノード接続',
  [BrightChainStrings.Admin_Dashboard_NodeToNodeConnections]: 'ノード間接続',
  [BrightChainStrings.Admin_Dashboard_SystemMetrics]: 'システムメトリクス',
  [BrightChainStrings.Admin_Dashboard_HeapUsed]: 'ヒープ使用量',
  [BrightChainStrings.Admin_Dashboard_HeapTotal]: 'ヒープ合計',
  [BrightChainStrings.Admin_Dashboard_RSS]: 'RSS',
  [BrightChainStrings.Admin_Dashboard_External]: '外部',
  [BrightChainStrings.Admin_Dashboard_UptimeTemplate]: '稼働時間：{SECONDS}秒',
  [BrightChainStrings.Admin_Dashboard_NodeVersionTemplate]:
    'Node {NODE_VERSION} — App v{APP_VERSION}',
  [BrightChainStrings.Admin_Dashboard_DBStats]: 'DB 統計',
  [BrightChainStrings.Admin_Dashboard_Users]: 'ユーザー',
  [BrightChainStrings.Admin_Dashboard_Roles]: 'ロール',
  [BrightChainStrings.Admin_Dashboard_Active]: 'アクティブ',
  [BrightChainStrings.Admin_Dashboard_Locked]: 'ロック済み',
  [BrightChainStrings.Admin_Dashboard_Pending]: '保留中',
  [BrightChainStrings.Admin_Dashboard_Members]: 'メンバー',
  [BrightChainStrings.Admin_Dashboard_Threshold]: 'しきい値',
  [BrightChainStrings.Admin_Dashboard_Pools]: 'プール',
  [BrightChainStrings.Admin_Dashboard_NoPools]: 'プールはありません。',
  [BrightChainStrings.Admin_Dashboard_Dependencies]: '依存関係',
  [BrightChainStrings.Admin_Dashboard_BlockStore]: 'BrightStore',
  [BrightChainStrings.Admin_Dashboard_TotalBlocks]: 'ブロック合計',
  [BrightChainStrings.Admin_Dashboard_TotalSize]: '合計サイズ',
  [BrightChainStrings.Admin_Dashboard_TotalPosts]: '投稿合計',
  [BrightChainStrings.Admin_Dashboard_ActiveUsersLast30Days]:
    'アクティブユーザー（30日）',
  [BrightChainStrings.Admin_Dashboard_Conversations]: '会話',
  [BrightChainStrings.Admin_Dashboard_Messages]: 'メッセージ',
  [BrightChainStrings.Admin_Dashboard_TotalVaults]: 'ボールト合計',
  [BrightChainStrings.Admin_Dashboard_SharedVaults]: '共有ボールト',
  [BrightChainStrings.Admin_Dashboard_TotalEmails]: 'メール合計',
  [BrightChainStrings.Admin_Dashboard_DeliveryFailures]: '配信失敗',
  [BrightChainStrings.Admin_Dashboard_Last24Hours]: '過去24時間',
  [BrightChainStrings.Admin_Menu_Dashboard]: '管理ダッシュボード',
  [BrightChainStrings.Admin_Menu_Users]: 'ユーザー管理',
  [BrightChainStrings.Admin_Menu_Blocks]: 'ブロックエクスプローラー',
  [BrightChainStrings.Admin_Menu_Chat]: 'チャット管理',
  [BrightChainStrings.Admin_Menu_Hub]: 'ハブ管理',
  [BrightChainStrings.Admin_Menu_Mail]: 'メール管理',
  [BrightChainStrings.Admin_Menu_Pass]: 'パス管理',
  [BrightChainStrings.Admin_Menu_About]: '概要',
  [BrightChainStrings.Admin_Common_Loading]: '読み込み中…',
  [BrightChainStrings.Admin_Common_Previous]: '前へ',
  [BrightChainStrings.Admin_Common_Next]: '次へ',
  [BrightChainStrings.Admin_Common_PageTemplate]: '{TOTAL}ページ中{PAGE}ページ',
  [BrightChainStrings.Admin_Common_Cancel]: 'キャンセル',
  [BrightChainStrings.Admin_Common_Delete]: '削除',
  [BrightChainStrings.Admin_Common_Yes]: 'はい',
  [BrightChainStrings.Admin_Common_No]: 'いいえ',
  [BrightChainStrings.Admin_Common_Never]: 'なし',
  [BrightChainStrings.Admin_Common_Close]: '閉じる',
  [BrightChainStrings.Admin_Users_Title]: 'ユーザー管理',
  [BrightChainStrings.Admin_Users_FilterAll]: 'すべて',
  [BrightChainStrings.Admin_Users_FilterActive]: 'アクティブ',
  [BrightChainStrings.Admin_Users_FilterLocked]: 'ロック済み',
  [BrightChainStrings.Admin_Users_FilterPending]: '保留中',
  [BrightChainStrings.Admin_Users_ColUsername]: 'ユーザー名',
  [BrightChainStrings.Admin_Users_ColEmail]: 'メールアドレス',
  [BrightChainStrings.Admin_Users_ColStatus]: 'ステータス',
  [BrightChainStrings.Admin_Users_ColEmailVerified]: 'メール認証済み',
  [BrightChainStrings.Admin_Users_ColLastLogin]: '最終ログイン',
  [BrightChainStrings.Admin_Users_ColActions]: 'アクション',
  [BrightChainStrings.Admin_Users_NoUsersFound]: 'ユーザーが見つかりません。',
  [BrightChainStrings.Admin_Users_UnlockUser]: 'ユーザーのロック解除',
  [BrightChainStrings.Admin_Users_LockUser]: 'ユーザーをロック',
  [BrightChainStrings.Admin_Users_LockUserTitle]: 'ユーザーをロック',
  [BrightChainStrings.Admin_Users_UnlockUserTitle]: 'ユーザーのロック解除',
  [BrightChainStrings.Admin_Users_LockConfirmTemplate]:
    '{USERNAME} をロックしてもよろしいですか？',
  [BrightChainStrings.Admin_Users_UnlockConfirmTemplate]:
    '{USERNAME} のロックを解除してもよろしいですか？',
  [BrightChainStrings.Admin_Users_LockWarning]:
    ' これにより、ユーザーはログインできなくなります。',
  [BrightChainStrings.Admin_Users_ColRole]: '役割',
  [BrightChainStrings.Admin_Users_ChangeRole]: '役割を変更',
  [BrightChainStrings.Admin_Users_ChangeRoleTitle]: 'ユーザーの役割を変更',
  [BrightChainStrings.Admin_Users_ChangeRoleConfirmTemplate]:
    '{USERNAME} を {OLD_ROLE} から {NEW_ROLE} に変更してもよろしいですか？',
  [BrightChainStrings.Admin_Users_ChangeRoleWarning]:
    ' ユーザーを管理者に変更すると、完全な管理アクセスが付与されます。',
  [BrightChainStrings.Admin_Users_RoleAdmin]: '管理者',
  [BrightChainStrings.Admin_Users_RoleMember]: 'メンバー',
  [BrightChainStrings.Admin_Users_RoleSystem]: 'システム',
  [BrightChainStrings.Admin_Users_CannotChangeOwnRole]:
    '自分の役割を変更することはできません。',
  [BrightChainStrings.Admin_Users_CannotChangeSystemUser]:
    'システムユーザーの役割は変更できません。',
  [BrightChainStrings.Admin_Users_DeleteUser]: 'ユーザーを削除',
  [BrightChainStrings.Admin_Users_DeleteUserTitle]: 'ユーザーを削除',
  [BrightChainStrings.Admin_Users_DeleteConfirmTemplate]:
    'ユーザー「{USERNAME}」を完全に削除してもよろしいですか？CBL、設定、およびすべてのデータベースレコードが削除されます。この操作は元に戻せません。',
  [BrightChainStrings.Admin_Users_DeleteWarning]:
    ' これは破壊的な操作です。',
  [BrightChainStrings.Admin_Users_CannotDeleteSelf]:
    '自分のアカウントは削除できません。',
  [BrightChainStrings.Admin_Users_CannotDeleteSystemUser]:
    'システムユーザーは削除できません。',
  [BrightChainStrings.Admin_Blocks_Title]: 'ブロックエクスプローラー',
  [BrightChainStrings.Admin_Blocks_SearchPlaceholder]: 'ブロック ID で検索',
  [BrightChainStrings.Admin_Blocks_FilterAllDurability]: 'すべての耐久性',
  [BrightChainStrings.Admin_Blocks_FilterStandard]: '標準',
  [BrightChainStrings.Admin_Blocks_FilterHighDurability]: '高耐久性',
  [BrightChainStrings.Admin_Blocks_FilterEphemeral]: '一時的',
  [BrightChainStrings.Admin_Blocks_SortByDate]: '日付順',
  [BrightChainStrings.Admin_Blocks_SortBySize]: 'サイズ順',
  [BrightChainStrings.Admin_Blocks_Detail]: 'ブロック詳細',
  [BrightChainStrings.Admin_Blocks_ColBlockId]: 'ブロック ID',
  [BrightChainStrings.Admin_Blocks_ColSize]: 'サイズ',
  [BrightChainStrings.Admin_Blocks_ColDurability]: '耐久性',
  [BrightChainStrings.Admin_Blocks_ColCreated]: '作成日',
  [BrightChainStrings.Admin_Blocks_ColAccessCount]: 'アクセス回数',
  [BrightChainStrings.Admin_Blocks_ColReplication]: 'レプリケーション',
  [BrightChainStrings.Admin_Blocks_ColActions]: 'アクション',
  [BrightChainStrings.Admin_Blocks_NoBlocksFound]: 'ブロックが見つかりません。',
  [BrightChainStrings.Admin_Blocks_DiscoverNodes]: 'ノードを検出',
  [BrightChainStrings.Admin_Blocks_NodesHoldingBlockTemplate]:
    'ブロック {BLOCK_ID} を保持するノード：',
  [BrightChainStrings.Admin_Blocks_NoNodesFound]: 'ノードが見つかりません。',
  [BrightChainStrings.Admin_Blocks_Checksum]: 'チェックサム',
  [BrightChainStrings.Admin_Blocks_DeleteTitle]: 'ブロックを削除',
  [BrightChainStrings.Admin_Blocks_DeleteConfirmTemplate]:
    'ブロック {BLOCK_ID} を削除してもよろしいですか？関連するパリティブロックもローカルストレージから削除されます。',
  [BrightChainStrings.Admin_Blocks_SizeBytesTemplate]: '{SIZE} バイト',
  [BrightChainStrings.Admin_Pass_Title]: 'BrightPass 管理',
  [BrightChainStrings.Admin_Pass_EncryptedNotice]:
    'ボールトの内容は暗号化されており、閲覧できません。ボールトのメタデータのみが表示されます。',
  [BrightChainStrings.Admin_Pass_ColOwner]: '所有者',
  [BrightChainStrings.Admin_Pass_ColShared]: '共有',
  [BrightChainStrings.Admin_Pass_ColCreated]: '作成日',
  [BrightChainStrings.Admin_Pass_ColLastAccessed]: '最終アクセス',
  [BrightChainStrings.Admin_Pass_ColActions]: 'アクション',
  [BrightChainStrings.Admin_Pass_NoVaultsFound]: 'ボールトが見つかりません。',
  [BrightChainStrings.Admin_Pass_DeleteVault]: 'ボールトを削除',
  [BrightChainStrings.Admin_Pass_DeleteVaultTitle]: 'ボールトを削除',
  [BrightChainStrings.Admin_Pass_DeleteVaultConfirm]:
    'このボールトを削除してもよろしいですか？ボールトと関連するブロックが削除されます。この操作は元に戻せません。',
  [BrightChainStrings.Admin_Chat_Title]: 'BrightChat 管理',
  [BrightChainStrings.Admin_Chat_ColId]: 'ID',
  [BrightChainStrings.Admin_Chat_ColParticipants]: '参加者',
  [BrightChainStrings.Admin_Chat_ColMessages]: 'メッセージ',
  [BrightChainStrings.Admin_Chat_ColLastActivity]: '最終アクティビティ',
  [BrightChainStrings.Admin_Chat_NoConversationsFound]:
    '会話が見つかりません。',
  [BrightChainStrings.Admin_Chat_MessagesForTemplate]:
    '会話 {CONVERSATION_ID} のメッセージ',
  [BrightChainStrings.Admin_Chat_LoadingMessages]: 'メッセージを読み込み中…',
  [BrightChainStrings.Admin_Chat_NoMessages]: 'メッセージはありません。',
  [BrightChainStrings.Admin_Chat_ColSender]: '送信者',
  [BrightChainStrings.Admin_Chat_ColContent]: '内容',
  [BrightChainStrings.Admin_Chat_ColCreated]: '作成日',
  [BrightChainStrings.Admin_Chat_ColStatus]: 'ステータス',
  [BrightChainStrings.Admin_Chat_StatusDeleted]: '削除済み',
  [BrightChainStrings.Admin_Chat_StatusActive]: 'アクティブ',
  [BrightChainStrings.Admin_Chat_DeleteMessage]: 'メッセージを削除',
  [BrightChainStrings.Admin_Chat_DeleteMessageTitle]: 'メッセージを削除',
  [BrightChainStrings.Admin_Chat_DeleteMessageConfirm]:
    'このメッセージを削除してもよろしいですか？ソフトデリートされます。',

  // Admin BrightChat Servers
  [BrightChainStrings.Admin_ChatServers_Title]: 'BrightChat サーバー管理',
  [BrightChainStrings.Admin_ChatServers_TabServers]: 'サーバー',
  [BrightChainStrings.Admin_ChatServers_TabChannels]: 'チャンネル',
  [BrightChainStrings.Admin_ChatServers_TabMembers]: 'メンバー',
  [BrightChainStrings.Admin_ChatServers_ColName]: '名前',
  [BrightChainStrings.Admin_ChatServers_ColOwner]: 'オーナー',
  [BrightChainStrings.Admin_ChatServers_ColMembers]: 'メンバー',
  [BrightChainStrings.Admin_ChatServers_ColChannels]: 'チャンネル',
  [BrightChainStrings.Admin_ChatServers_ColCreated]: '作成日',
  [BrightChainStrings.Admin_ChatServers_ColActions]: 'アクション',
  [BrightChainStrings.Admin_ChatServers_NoServersFound]: 'サーバーが見つかりません。',
  [BrightChainStrings.Admin_ChatServers_DeleteServer]: 'サーバーを削除',
  [BrightChainStrings.Admin_ChatServers_DeleteServerTitle]: 'サーバーを削除',
  [BrightChainStrings.Admin_ChatServers_DeleteServerConfirm]:
    'このサーバーを削除してもよろしいですか？すべてのチャンネルとデータが完全に削除されます。',
  [BrightChainStrings.Admin_ChatServers_EditServer]: 'サーバーを編集',
  [BrightChainStrings.Admin_ChatServers_EditServerTitle]: 'サーバーを編集',
  [BrightChainStrings.Admin_ChatServers_ServerName]: 'サーバー名',
  [BrightChainStrings.Admin_ChatServers_ServerIcon]: 'アイコンURL',
  [BrightChainStrings.Admin_ChatServers_Save]: '保存',
  [BrightChainStrings.Admin_ChatServers_ChannelName]: 'チャンネル名',
  [BrightChainStrings.Admin_ChatServers_ChannelTopic]: 'トピック',
  [BrightChainStrings.Admin_ChatServers_ChannelVisibility]: '公開設定',
  [BrightChainStrings.Admin_ChatServers_ChannelMembers]: 'メンバー',
  [BrightChainStrings.Admin_ChatServers_NoChannelsFound]: 'チャンネルが見つかりません。',
  [BrightChainStrings.Admin_ChatServers_DeleteChannel]: 'チャンネルを削除',
  [BrightChainStrings.Admin_ChatServers_DeleteChannelTitle]: 'チャンネルを削除',
  [BrightChainStrings.Admin_ChatServers_DeleteChannelConfirm]:
    'このチャンネルを削除してもよろしいですか？すべてのメッセージが完全に削除されます。',
  [BrightChainStrings.Admin_ChatServers_MemberName]: 'メンバー',
  [BrightChainStrings.Admin_ChatServers_MemberRole]: '役割',
  [BrightChainStrings.Admin_ChatServers_MemberJoined]: '参加日',
  [BrightChainStrings.Admin_ChatServers_NoMembersFound]: 'メンバーが見つかりません。',
  [BrightChainStrings.Admin_ChatServers_RemoveMember]: 'メンバーを削除',
  [BrightChainStrings.Admin_ChatServers_RemoveMemberTitle]: 'メンバーを削除',
  [BrightChainStrings.Admin_ChatServers_RemoveMemberConfirm]:
    'このメンバーをサーバーから削除してもよろしいですか？',
  [BrightChainStrings.Admin_ChatServers_ChangeRole]: '役割を変更',
  [BrightChainStrings.Admin_ChatServers_EncryptedNote]:
    'メッセージの内容はエンドツーエンドで暗号化されており、管理者には表示されません。',
  [BrightChainStrings.Admin_ChatServers_FilterByServer]: 'サーバーで絞り込み',
  [BrightChainStrings.Admin_ChatServers_AllServers]: 'すべてのサーバー',
  [BrightChainStrings.Admin_Menu_ChatServers]: 'チャットサーバー',

  // Admin BrightHub
  [BrightChainStrings.Admin_Hub_Title]: 'BrightHub 管理',
  [BrightChainStrings.Admin_Hub_FilterByAuthorId]: '著者 ID でフィルター',
  [BrightChainStrings.Admin_Hub_FilterAllPosts]: 'すべての投稿',
  [BrightChainStrings.Admin_Hub_FilterActive]: 'アクティブ',
  [BrightChainStrings.Admin_Hub_FilterDeleted]: '削除済み',
  [BrightChainStrings.Admin_Hub_ColAuthor]: '著者',
  [BrightChainStrings.Admin_Hub_ColContentPreview]: 'コンテンツプレビュー',
  [BrightChainStrings.Admin_Hub_ColCreated]: '作成日',
  [BrightChainStrings.Admin_Hub_ColStatus]: 'ステータス',
  [BrightChainStrings.Admin_Hub_ColLikes]: 'いいね',
  [BrightChainStrings.Admin_Hub_ColReposts]: 'リポスト',
  [BrightChainStrings.Admin_Hub_ColActions]: 'アクション',
  [BrightChainStrings.Admin_Hub_StatusDeleted]: '削除済み',
  [BrightChainStrings.Admin_Hub_StatusActive]: 'アクティブ',
  [BrightChainStrings.Admin_Hub_NoPostsFound]: '投稿が見つかりません。',
  [BrightChainStrings.Admin_Hub_SoftDeletePost]: '投稿を削除',
  [BrightChainStrings.Admin_Hub_DeletePostTitle]: '投稿を削除',
  [BrightChainStrings.Admin_Hub_DeletePostConfirm]:
    'この投稿を削除してもよろしいですか？削除済みとしてマークされますが、完全には削除されません。',
  [BrightChainStrings.Admin_Mail_Title]: 'BrightMail 管理',
  [BrightChainStrings.Admin_Mail_ColSender]: '送信者',
  [BrightChainStrings.Admin_Mail_ColRecipients]: '受信者',
  [BrightChainStrings.Admin_Mail_ColSubject]: '件名',
  [BrightChainStrings.Admin_Mail_ColCreated]: '作成日',
  [BrightChainStrings.Admin_Mail_ColDeliveryStatus]: '配信ステータス',
  [BrightChainStrings.Admin_Mail_ColActions]: 'アクション',
  [BrightChainStrings.Admin_Mail_NoEmailsFound]: 'メールが見つかりません。',
  [BrightChainStrings.Admin_Mail_DeleteEmail]: 'メールを削除',
  [BrightChainStrings.Admin_Mail_DeleteEmailTitle]: 'メールを削除',
  [BrightChainStrings.Admin_Mail_DeleteEmailConfirm]:
    'このメールを削除してもよろしいですか？この操作は元に戻せません。',

  // About Page
  [BrightChainStrings.About_Title]: 'BrightChain について',
  [BrightChainStrings.About_AccessDenied]: 'アクセス拒否',
  [BrightChainStrings.About_AccessDeniedDescription]:
    'このページを表示するには管理者である必要があります。',
  [BrightChainStrings.About_MasterVersion]: 'BrightChain バージョン',
  [BrightChainStrings.About_BrightChainPackages]: 'BrightChain パッケージ',
  [BrightChainStrings.About_DigitalDefiancePackages]:
    'Digital Defiance パッケージ',
  [BrightChainStrings.About_PackageName]: 'パッケージ',
  [BrightChainStrings.About_Version]: 'バージョン',

  // Friends System
  [BrightChainStrings.Error_Friends_SelfRequestNotAllowed]:
    '自分自身にフレンドリクエストを送ることはできません',
  [BrightChainStrings.Error_Friends_AlreadyFriends]:
    'このメンバーとは既にフレンドです',
  [BrightChainStrings.Error_Friends_RequestAlreadyExists]:
    '保留中のフレンドリクエストが既に存在します',
  [BrightChainStrings.Error_Friends_RequestNotFound]:
    'フレンドリクエストが見つからないか、保留中ではありません',
  [BrightChainStrings.Error_Friends_NotFriends]:
    'これらのメンバー間にフレンド関係は存在しません',
  [BrightChainStrings.Error_Friends_UserBlocked]:
    'メンバー間のブロックにより、フレンド操作を実行できません',
  [BrightChainStrings.Error_Friends_Unauthorized]:
    'このフレンドリクエストに対してこのアクションを実行する権限がありません',

  // Friends Controller Response Messages
  [BrightChainStrings.Friends_RequestSent]: 'フレンドリクエストを送信しました',
  [BrightChainStrings.Friends_RequestAccepted]:
    'フレンドリクエストを承認しました',
  [BrightChainStrings.Friends_RequestRejected]:
    'フレンドリクエストを拒否しました',
  [BrightChainStrings.Friends_RequestCancelled]:
    'フレンドリクエストをキャンセルしました',
  [BrightChainStrings.Friends_Removed]: 'フレンドを削除しました',
  [BrightChainStrings.Friends_ListRetrieved]:
    'フレンドリストを取得しました',
  [BrightChainStrings.Friends_ReceivedRequestsRetrieved]:
    '受信したフレンドリクエストを取得しました',
  [BrightChainStrings.Friends_SentRequestsRetrieved]:
    '送信したフレンドリクエストを取得しました',
  [BrightChainStrings.Friends_StatusRetrieved]:
    'フレンドシップステータスを取得しました',
  [BrightChainStrings.Friends_MutualRetrieved]:
    '共通のフレンドを取得しました',
  [BrightChainStrings.Friends_Unauthenticated]: '認証が必要です',
};
