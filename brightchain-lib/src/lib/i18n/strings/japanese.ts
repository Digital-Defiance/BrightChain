import { StringsCollection } from '@digitaldefiance/i18n-lib';
import {
  BrightChainStringKey,
  BrightChainStrings,
} from '../../enumerations/brightChainStrings';

export const JapaneseStrings: StringsCollection<BrightChainStringKey> = {
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
  [BrightChainStrings.Error_QuorumError_InvalidQuorumId]: '無効なクォーラムID',
  [BrightChainStrings.Error_QuorumError_DocumentNotFound]:
    'ドキュメントが見つかりません',
  [BrightChainStrings.Error_QuorumError_UnableToRestoreDocument]:
    'ドキュメントを復元できません',
  [BrightChainStrings.Error_QuorumError_NotImplemented]: '未実装',
  [BrightChainStrings.Error_QuorumError_Uninitialized]:
    'クォーラムサブシステムが初期化されていません',
  [BrightChainStrings.Error_QuorumError_MemberNotFound]:
    'メンバーが見つかりません',
  [BrightChainStrings.Error_QuorumError_NotEnoughMembers]:
    'クォーラム操作に十分なメンバーがいません',
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

  // Quorum Document Errors
  [BrightChainStrings.Error_QuorumDocument_CreatorMustBeSetBeforeSaving]:
    '保存前に作成者を設定する必要があります',
  [BrightChainStrings.Error_QuorumDocument_CreatorMustBeSetBeforeEncrypting]:
    '暗号化前に作成者を設定する必要があります',
  [BrightChainStrings.Error_QuorumDocument_DocumentHasNoEncryptedData]:
    'ドキュメントに暗号化されたデータがありません',
  [BrightChainStrings.Error_QuorumDocument_InvalidEncryptedDataFormat]:
    '無効な暗号化データ形式',
  [BrightChainStrings.Error_QuorumDocument_InvalidMemberIdsFormat]:
    '無効なメンバーID形式',
  [BrightChainStrings.Error_QuorumDocument_InvalidSignatureFormat]:
    '無効な署名形式',
  [BrightChainStrings.Error_QuorumDocument_InvalidCreatorIdFormat]:
    '無効な作成者ID形式',
  [BrightChainStrings.Error_QuorumDocument_InvalidChecksumFormat]:
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
  [BrightChainStrings.QuorumDataRecord_MustShareWithAtLeastTwoMembers]:
    '少なくとも2人のメンバーと共有する必要があります',
  [BrightChainStrings.QuorumDataRecord_SharesRequiredExceedsMembers]:
    '必要なシェア数がメンバー数を超えています',
  [BrightChainStrings.QuorumDataRecord_SharesRequiredMustBeAtLeastTwo]:
    '必要なシェア数は2以上である必要があります',
  [BrightChainStrings.QuorumDataRecord_InvalidChecksum]: '無効なチェックサム',
  [BrightChainStrings.SimpleBrowserStore_BlockNotFoundTemplate]:
    'ブロックが見つかりません: {ID}',
  [BrightChainStrings.EncryptedBlockCreator_NoCreatorRegisteredTemplate]:
    'ブロックタイプ {TYPE} に登録されたクリエイターがありません',
  [BrightChainStrings.TestMember_MemberNotFoundTemplate]:
    'メンバー {KEY} が見つかりません',
};
