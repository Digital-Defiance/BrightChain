import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  DigitalBurnbagStringKey,
  DigitalBurnbagStrings,
} from '../../enumerations/digitalburnbag-strings';

export const DigitalBurnbagJapaneseStrings: ComponentStrings<DigitalBurnbagStringKey> =
  {
    [DigitalBurnbagStrings.KeyFeatures_1]:
      '自動公開または削除のルールを設定して、ファイルを安全に保管します。',
    [DigitalBurnbagStrings.KeyFeatures_2]:
      'デジタルまたは物理的な活動を監視する「カナリア」を作成します。',
    [DigitalBurnbagStrings.KeyFeatures_3]:
      'カナリアの状態（例：非活動）に基づいてアクションが実行されます。',
    [DigitalBurnbagStrings.KeyFeatures_4]:
      '緊急時の即時対応のための脅迫コード。',
    [DigitalBurnbagStrings.SiteDescription]:
      'デジタルおよび物理的な活動の監視に基づき、自動公開または削除のルールを設定してファイルを安全に保管します。',
    [DigitalBurnbagStrings.SiteTagline]: 'あなたのデータ、あなたのルール',
    [DigitalBurnbagStrings.Nav_MyFiles]: 'マイファイル',
    [DigitalBurnbagStrings.Nav_SharedWithMe]: '共有アイテム',
    [DigitalBurnbagStrings.Nav_Favorites]: 'お気に入り',
    [DigitalBurnbagStrings.Nav_Recent]: '最近',
    [DigitalBurnbagStrings.Nav_Trash]: 'ゴミ箱',
    [DigitalBurnbagStrings.Nav_Activity]: 'アクティビティ',
    [DigitalBurnbagStrings.Nav_Analytics]: 'アナリティクス',
    [DigitalBurnbagStrings.Nav_Canary]: 'カナリア',
    [DigitalBurnbagStrings.Nav_Vaults]: '金庫',
    [DigitalBurnbagStrings.Nav_FileSections]: 'ファイルセクション',

    // -- Vault Container --
    [DigitalBurnbagStrings.Vault_Title]: '金庫コンテナ',
    [DigitalBurnbagStrings.Vault_CreateNew]: '新しい金庫',
    [DigitalBurnbagStrings.Vault_NameLabel]: '金庫名',
    [DigitalBurnbagStrings.Vault_DescriptionLabel]: '説明',
    [DigitalBurnbagStrings.Vault_Create]: '作成',
    [DigitalBurnbagStrings.Vault_Cancel]: 'キャンセル',
    [DigitalBurnbagStrings.Vault_Empty]: '金庫がありません',
    [DigitalBurnbagStrings.Vault_EmptyDesc]:
      '金庫を作成してファイルを安全に保管しましょう。',
    [DigitalBurnbagStrings.Vault_Files]: 'ファイル',
    [DigitalBurnbagStrings.Vault_Folders]: 'フォルダ',
    [DigitalBurnbagStrings.Vault_State]: '状態',
    [DigitalBurnbagStrings.Vault_SealStatus]: 'シール状態',
    [DigitalBurnbagStrings.Vault_AllPristine]: 'すべて未開封',
    [DigitalBurnbagStrings.Vault_SomeAccessed]: '一部アクセス済み',
    [DigitalBurnbagStrings.Vault_Open]: '開く',
    [DigitalBurnbagStrings.Vault_Lock]: 'ロック',
    [DigitalBurnbagStrings.Vault_Destroy]: '破棄',
    [DigitalBurnbagStrings.Vault_CreateFailed]: '金庫の作成に失敗しました',
    [DigitalBurnbagStrings.Vault_LoadFailed]: '金庫の読み込みに失敗しました',
    [DigitalBurnbagStrings.Vault_Created]: '金庫が作成されました',

    [DigitalBurnbagStrings.FileBrowser_ColName]: '名前',
    [DigitalBurnbagStrings.FileBrowser_ColSize]: 'サイズ',
    [DigitalBurnbagStrings.FileBrowser_ColModified]: '更新日',
    [DigitalBurnbagStrings.FileBrowser_ColType]: '種類',
    [DigitalBurnbagStrings.FileBrowser_EmptyFolder]: 'このフォルダは空です',
    [DigitalBurnbagStrings.FileBrowser_SelectAll]: 'すべて選択',
    [DigitalBurnbagStrings.FileBrowser_FolderPath]: 'フォルダパス',
    [DigitalBurnbagStrings.FileBrowser_Loading]: 'フォルダの内容を読み込み中',
    [DigitalBurnbagStrings.FileBrowser_TypeFolder]: 'フォルダ',
    [DigitalBurnbagStrings.FileBrowser_TypeFile]: 'ファイル',
    [DigitalBurnbagStrings.Action_Rename]: '名前変更',
    [DigitalBurnbagStrings.Action_Move]: '移動',
    [DigitalBurnbagStrings.Action_Copy]: 'コピー',
    [DigitalBurnbagStrings.Action_Delete]: '削除',
    [DigitalBurnbagStrings.Action_Share]: '共有',
    [DigitalBurnbagStrings.Action_Download]: 'ダウンロード',
    [DigitalBurnbagStrings.Action_Duplicate]: '複製',
    [DigitalBurnbagStrings.Action_History]: '履歴',
    [DigitalBurnbagStrings.Action_Permissions]: '権限',
    [DigitalBurnbagStrings.Action_Preview]: 'プレビュー',
    [DigitalBurnbagStrings.Action_More]: 'その他…',
    [DigitalBurnbagStrings.Action_Paste]: '貼り付け',
    [DigitalBurnbagStrings.Action_UploadNewVersion]:
      '新しいバージョンをアップロード',
    [DigitalBurnbagStrings.Action_StorageContract]: 'ストレージ契約',
    [DigitalBurnbagStrings.Action_CopyPathLink]: 'パスリンクをコピー',
    [DigitalBurnbagStrings.Trash_ColName]: '名前',
    [DigitalBurnbagStrings.Trash_ColOriginalPath]: '元のパス',
    [DigitalBurnbagStrings.Trash_ColDeleted]: '削除日',
    [DigitalBurnbagStrings.Trash_ColTimeRemaining]: '残り時間',
    [DigitalBurnbagStrings.Trash_ColActions]: '操作',
    [DigitalBurnbagStrings.Trash_Empty]: 'ゴミ箱は空です',
    [DigitalBurnbagStrings.Trash_Restore]: '復元',
    [DigitalBurnbagStrings.Trash_DeletePermanently]: '完全に削除',
    [DigitalBurnbagStrings.Trash_Loading]: 'ゴミ箱を読み込み中',
    [DigitalBurnbagStrings.Trash_Expired]: '期限切れ',
    [DigitalBurnbagStrings.Trash_DaysRemaining]: '{count}日',
    [DigitalBurnbagStrings.Trash_HoursRemaining]: '{count}時間',
    [DigitalBurnbagStrings.Share_Title]: '共有 — {fileName}',
    [DigitalBurnbagStrings.Share_WithUser]: 'ユーザーと共有',
    [DigitalBurnbagStrings.Share_EmailLabel]: 'メール',
    [DigitalBurnbagStrings.Share_PermView]: '閲覧',
    [DigitalBurnbagStrings.Share_PermEdit]: '編集',
    [DigitalBurnbagStrings.Share_Button]: '共有',
    [DigitalBurnbagStrings.Share_AdvancedOptions]: '高度な共有オプション',
    [DigitalBurnbagStrings.Share_EncryptionMode]: '暗号化モード',
    [DigitalBurnbagStrings.Share_ServerProxied]: 'サーバープロキシ',
    [DigitalBurnbagStrings.Share_ServerProxiedDesc]:
      'サーバーが受信者の代わりに復号します。最も簡単なオプションです。',
    [DigitalBurnbagStrings.Share_EphemeralKeyPair]: '一時鍵ペア',
    [DigitalBurnbagStrings.Share_EphemeralKeyPairDesc]:
      '一回限りの鍵ペアを生成します。秘密鍵はURLフラグメントに含まれます。',
    [DigitalBurnbagStrings.Share_RecipientPublicKey]: '受信者の公開鍵',
    [DigitalBurnbagStrings.Share_RecipientPublicKeyDesc]:
      '受信者の公開鍵で暗号化します。既知の受信者に最も安全です。',
    [DigitalBurnbagStrings.Share_RecipientKeyLabel]: '受信者の公開鍵',
    [DigitalBurnbagStrings.Share_PasswordLabel]: 'パスワード（任意）',
    [DigitalBurnbagStrings.Share_ExpiresAtLabel]: '有効期限',
    [DigitalBurnbagStrings.Share_MaxAccessLabel]: '最大アクセス回数',
    [DigitalBurnbagStrings.Share_ScopeLabel]: 'リンクの範囲',
    [DigitalBurnbagStrings.Share_ScopeSpecific]: '特定のユーザー',
    [DigitalBurnbagStrings.Share_ScopeOrganization]: '組織',
    [DigitalBurnbagStrings.Share_ScopeAnonymous]: '匿名',
    [DigitalBurnbagStrings.Share_BlockDownload]:
      'ダウンロードをブロック（プレビューのみ）',
    [DigitalBurnbagStrings.Share_CreateLink]: '共有リンクを作成',
    [DigitalBurnbagStrings.Share_MagnetWarning]:
      'マグネットURLは取り消し不可です。共有すると、URLを持つ誰でもファイルにアクセスできます。',
    [DigitalBurnbagStrings.Share_GetMagnetUrl]: 'マグネットURLを取得',
    [DigitalBurnbagStrings.Share_Close]: '閉じる',
    [DigitalBurnbagStrings.Share_Failed]: '共有に失敗しました',
    [DigitalBurnbagStrings.Share_LinkFailed]: 'リンクの作成に失敗しました',
    [DigitalBurnbagStrings.Share_MagnetFailed]:
      'マグネットURLの取得に失敗しました',
    [DigitalBurnbagStrings.Upload_DropOrBrowse]:
      'ファイルをここにドロップするか、クリックして参照',
    [DigitalBurnbagStrings.Upload_DropZoneLabel]: 'ファイルアップロードゾーン',
    [DigitalBurnbagStrings.Upload_Failed]: 'アップロードに失敗しました',

    // -- Upload New Version --
    [DigitalBurnbagStrings.Upload_NewVersion]: '新しいバージョンをアップロード',
    [DigitalBurnbagStrings.Upload_NewVersionTitle]:
      '新しいバージョンをアップロード',
    [DigitalBurnbagStrings.Upload_NewVersionDesc]:
      '新しいバージョンとしてアップロードするファイルを選択してください。ファイルは元のファイルと同じ種類である必要があります。',
    [DigitalBurnbagStrings.Upload_NewVersionSelect]: 'ファイルを選択',
    [DigitalBurnbagStrings.Upload_NewVersionUploading]:
      '新しいバージョンをアップロード中…',
    [DigitalBurnbagStrings.Upload_NewVersionSuccess]:
      '新しいバージョンが正常にアップロードされました',
    [DigitalBurnbagStrings.Upload_NewVersionFailed]:
      '新しいバージョンのアップロードに失敗しました',
    [DigitalBurnbagStrings.Upload_NewVersionMimeTypeMismatch]:
      'ファイル形式が一致しません: {expected}が期待されましたが{actual}でした',

    [DigitalBurnbagStrings.Preview_CloseLabel]: 'プレビューを閉じる',
    [DigitalBurnbagStrings.Preview_Download]: 'ダウンロード',
    [DigitalBurnbagStrings.Preview_Close]: '閉じる',
    [DigitalBurnbagStrings.Preview_TypeLabel]: '種類: {mimeType}',
    [DigitalBurnbagStrings.Preview_NotAvailable]:
      'このファイル形式のプレビューは利用できません。',
    [DigitalBurnbagStrings.Preview_VideoNotSupported]:
      'お使いのブラウザは動画再生に対応していません。',
    [DigitalBurnbagStrings.Preview_LoadFailed]:
      'コンテンツの読み込みに失敗しました',
    [DigitalBurnbagStrings.Bulk_ItemsSelected]: '{count}件選択中',
    [DigitalBurnbagStrings.Bulk_ClearSelection]: '選択を解除',
    [DigitalBurnbagStrings.Bulk_Succeeded]: '{count}件成功',
    [DigitalBurnbagStrings.Bulk_Failed]: '{count}件失敗',
    [DigitalBurnbagStrings.ACL_ColPrincipal]: 'プリンシパル',
    [DigitalBurnbagStrings.ACL_ColType]: '種類',
    [DigitalBurnbagStrings.ACL_ColPermission]: '権限',
    [DigitalBurnbagStrings.ACL_ColActions]: '操作',
    [DigitalBurnbagStrings.ACL_Remove]: '削除',
    [DigitalBurnbagStrings.ACL_Add]: '追加',
    [DigitalBurnbagStrings.ACL_UserOrGroupPlaceholder]:
      'ユーザーまたはグループID',
    [DigitalBurnbagStrings.ACL_InheritedFrom]: '{source}から継承',
    [DigitalBurnbagStrings.ACL_AdvancedPermissions]: '高度な権限',
    [DigitalBurnbagStrings.ACL_PermissionFlags]: '権限フラグ',
    [DigitalBurnbagStrings.ACL_PermissionSetName]: '権限セット名',
    [DigitalBurnbagStrings.ACL_CreateSet]: 'セットを作成',
    [DigitalBurnbagStrings.ACL_CustomSets]: 'カスタム権限セット',
    [DigitalBurnbagStrings.ACL_Mixed]: '混在',
    [DigitalBurnbagStrings.ACL_MixedTooltip]:
      '選択したすべてのアイテムがこの権限を共有しているわけではありません',
    [DigitalBurnbagStrings.ACL_ApplyToAll]: '選択したすべてのアイテムに適用',
    [DigitalBurnbagStrings.ACL_MultiItemTitle]: '権限 — {count}件',
    [DigitalBurnbagStrings.ACL_SaveFailed]: '権限の保存に失敗しました',
    [DigitalBurnbagStrings.ACL_Saved]: '権限を保存しました',
    [DigitalBurnbagStrings.Canary_Bindings]: 'カナリアバインディング',
    [DigitalBurnbagStrings.Canary_AddBinding]: 'バインディングを追加',
    [DigitalBurnbagStrings.Canary_ColCondition]: '条件',
    [DigitalBurnbagStrings.Canary_ColAction]: 'アクション',
    [DigitalBurnbagStrings.Canary_ColTarget]: 'ターゲット',
    [DigitalBurnbagStrings.Canary_ColActions]: '操作',
    [DigitalBurnbagStrings.Canary_NoBindings]:
      'バインディングが設定されていません',
    [DigitalBurnbagStrings.Canary_DryRun]: 'テスト実行',
    [DigitalBurnbagStrings.Canary_DeleteBinding]: 'バインディングを削除',
    [DigitalBurnbagStrings.Canary_NewBinding]: '新しいバインディング',
    [DigitalBurnbagStrings.Canary_ProviderLabel]: 'プロバイダー',
    [DigitalBurnbagStrings.Canary_TargetIdsLabel]:
      'ターゲットID（カンマ区切り）',
    [DigitalBurnbagStrings.Canary_NoRecipientList]: '受信者リストなし',
    [DigitalBurnbagStrings.Canary_CascadeDelayLabel]: 'カスケード遅延（秒）',
    [DigitalBurnbagStrings.Canary_Create]: '作成',
    [DigitalBurnbagStrings.Canary_Cancel]: 'キャンセル',
    [DigitalBurnbagStrings.Canary_RecipientLists]: '受信者リスト',
    [DigitalBurnbagStrings.Canary_AddList]: 'リストを追加',
    [DigitalBurnbagStrings.Canary_ColListName]: '名前',
    [DigitalBurnbagStrings.Canary_ColRecipients]: '受信者',
    [DigitalBurnbagStrings.Canary_NoLists]: '受信者リストがありません',
    [DigitalBurnbagStrings.Canary_NewList]: '新しい受信者リスト',
    [DigitalBurnbagStrings.Canary_ListNameLabel]: 'リスト名',
    [DigitalBurnbagStrings.Canary_RecipientsLabel]:
      '受信者（1行に1件: メール, ラベル）',
    [DigitalBurnbagStrings.Canary_DryRunReport]: 'テスト実行レポート',
    [DigitalBurnbagStrings.Canary_AffectedFiles]:
      '影響を受けるファイル: {count}',
    [DigitalBurnbagStrings.Canary_RecipientsCount]: '受信者: {count}',
    [DigitalBurnbagStrings.Canary_ActionsLabel]: 'アクション:',
    [DigitalBurnbagStrings.Notifications_Label]: '通知',
    [DigitalBurnbagStrings.Notifications_Empty]: '通知はありません',
    [DigitalBurnbagStrings.Activity_AllOperations]: 'すべての操作',
    [DigitalBurnbagStrings.Activity_NoActivity]:
      '表示するアクティビティがありません',
    [DigitalBurnbagStrings.Activity_OnTarget]: '{actor} が {target} に対して',
    [DigitalBurnbagStrings.Analytics_StorageUsage]: 'ストレージ使用量',
    [DigitalBurnbagStrings.Analytics_UsageSummary]:
      '{quota}中{used}使用済み（{percent}%）',
    [DigitalBurnbagStrings.Analytics_ByFileType]: 'ファイル種類別',
    [DigitalBurnbagStrings.Analytics_ColCategory]: 'カテゴリ',
    [DigitalBurnbagStrings.Analytics_ColFiles]: 'ファイル数',
    [DigitalBurnbagStrings.Analytics_ColSize]: 'サイズ',
    [DigitalBurnbagStrings.Analytics_LargestItems]: '最大のアイテム',
    [DigitalBurnbagStrings.Analytics_ColName]: '名前',
    [DigitalBurnbagStrings.Analytics_ColItemActions]: '操作',
    [DigitalBurnbagStrings.Analytics_Trash]: 'ゴミ箱',
    [DigitalBurnbagStrings.Analytics_StaleFiles]: '古いファイル',
    [DigitalBurnbagStrings.Analytics_ColAge]: '経過日数',
    [DigitalBurnbagStrings.Analytics_AgeDays]: '{count}日',
    [DigitalBurnbagStrings.Analytics_ScheduleDestroy]: '破棄をスケジュール',
    [DigitalBurnbagStrings.Page_ItemMoved]: 'アイテムを移動しました',
    [DigitalBurnbagStrings.Page_MoveFailed]: 'アイテムの移動に失敗しました',
    [DigitalBurnbagStrings.Page_LoadFolderFailed]:
      'フォルダの読み込みに失敗しました',
    [DigitalBurnbagStrings.Page_LoadTrashFailed]:
      'ゴミ箱の読み込みに失敗しました',
    [DigitalBurnbagStrings.Page_LoadSharedFailed]:
      '共有アイテムの読み込みに失敗しました',
    [DigitalBurnbagStrings.Page_LoadCanaryFailed]:
      'カナリア設定の読み込みに失敗しました',
    [DigitalBurnbagStrings.Page_LoadActivityFailed]:
      'アクティビティの読み込みに失敗しました',
    [DigitalBurnbagStrings.Page_LoadAnalyticsFailed]:
      'ストレージ分析の読み込みに失敗しました',
    [DigitalBurnbagStrings.Page_LoadPermissionsFailed]:
      '権限の読み込みに失敗しました',
    [DigitalBurnbagStrings.Page_DeleteFailed]: '削除に失敗しました',
    [DigitalBurnbagStrings.Page_RenameFailed]: '名前変更に失敗しました',
    [DigitalBurnbagStrings.Page_Renamed]: '名前を変更しました',
    [DigitalBurnbagStrings.Page_ItemsMovedToTrash]:
      '{count}件をゴミ箱に移動しました',
    [DigitalBurnbagStrings.Page_Restored]: '{name}を復元しました',
    [DigitalBurnbagStrings.Page_PermanentlyDeleted]:
      '{name}を完全に削除しました',
    [DigitalBurnbagStrings.Page_RestoreFailed]: '復元に失敗しました',
    [DigitalBurnbagStrings.Page_PermanentDeleteFailed]:
      '完全な削除に失敗しました',
    [DigitalBurnbagStrings.Page_BindingCreated]: 'バインディングを作成しました',
    [DigitalBurnbagStrings.Page_BindingDeleted]: 'バインディングを削除しました',
    [DigitalBurnbagStrings.Page_RecipientListCreated]:
      '受信者リストを作成しました',
    [DigitalBurnbagStrings.Page_UserNotFound]: 'ユーザーが見つかりません',
    [DigitalBurnbagStrings.Page_PathNotFound]:
      'フォルダパスが見つかりません。移動または削除された可能性があります。',
    [DigitalBurnbagStrings.Page_NoFileSelected]: 'ファイルが選択されていません',
    [DigitalBurnbagStrings.Page_UploadFailed]: 'アップロードに失敗しました',
    [DigitalBurnbagStrings.Page_ErrorOccurred]: 'エラーが発生しました',
    [DigitalBurnbagStrings.Page_RenamePrompt]: '新しい名前:',

    // -- Phix（フェニックスサイクルリネーム） --
    [DigitalBurnbagStrings.Phix_Button]: 'Phix',
    [DigitalBurnbagStrings.Phix_Tooltip]:
      'フェニックスサイクルリネーム：古い名前を破壊し、新しい名前で蘇る',
    [DigitalBurnbagStrings.Phix_Confirm_Title]: 'Phix操作の確認',
    [DigitalBurnbagStrings.Phix_Confirm_MetadataOnly]:
      'メタデータのみのリネームです。ブロックには触れません。迅速で簡単です。',
    [DigitalBurnbagStrings.Phix_Confirm_FullCycle]:
      '完全なフェニックスサイクルです。データは再暗号化され、元のデータは破壊されます。時間がかかる場合があります。',
    [DigitalBurnbagStrings.Phix_Progress]: 'Phix処理中…',
    [DigitalBurnbagStrings.Phix_Complete]: 'Phix完了 — 灰の中から蘇りました',
    [DigitalBurnbagStrings.Phix_Failed]: 'Phixに失敗しました',
    [DigitalBurnbagStrings.Phix_Mascot_Tiny]: 'phix-mascot-tiny',
    [DigitalBurnbagStrings.Phix_Mascot_Small]: 'phix-mascot-small',
    [DigitalBurnbagStrings.Phix_Mascot_Medium]: 'phix-mascot-medium',
    [DigitalBurnbagStrings.Phix_Mascot_Large]: 'phix-mascot-large',
    [DigitalBurnbagStrings.Phix_Mascot_Massive]: 'phix-mascot-massive',

    // -- Common --
    [DigitalBurnbagStrings.Common_Close]: '閉じる',
    [DigitalBurnbagStrings.Common_Save]: '保存',
    [DigitalBurnbagStrings.Common_Back]: '戻る',
    [DigitalBurnbagStrings.Common_Next]: '次へ',
    [DigitalBurnbagStrings.Common_Finish]: '完了',
    [DigitalBurnbagStrings.Common_Test]: 'テスト',
    [DigitalBurnbagStrings.Common_Connect]: '接続',
    [DigitalBurnbagStrings.Common_Disconnect]: '切断',
    [DigitalBurnbagStrings.Common_Retry]: '再試行',
    [DigitalBurnbagStrings.Common_Enable]: '有効化',
    [DigitalBurnbagStrings.Common_Disable]: '無効化',
    [DigitalBurnbagStrings.Common_Loading]: '読み込み中...',
    [DigitalBurnbagStrings.Common_Error]: 'エラー',
    [DigitalBurnbagStrings.Common_Success]: '成功',

    // -- Provider Registration --
    [DigitalBurnbagStrings.Provider_Title]: 'カナリアプロバイダー',
    [DigitalBurnbagStrings.Provider_Subtitle]:
      'サービスを接続してアクティビティを監視し、デッドマンスイッチアクションをトリガーします',
    [DigitalBurnbagStrings.Provider_MyConnections]: 'マイ接続',
    [DigitalBurnbagStrings.Provider_AddProvider]: 'プロバイダーを追加',
    [DigitalBurnbagStrings.Provider_NoConnections]:
      'プロバイダーが接続されていません',
    [DigitalBurnbagStrings.Provider_NoConnectionsDesc]:
      'プロバイダーを接続してアクティビティの監視を開始してください',
    [DigitalBurnbagStrings.Provider_SearchPlaceholder]: 'プロバイダーを検索...',
    [DigitalBurnbagStrings.Provider_FilterByCategory]: 'カテゴリでフィルター',
    [DigitalBurnbagStrings.Provider_AllCategories]: 'すべてのカテゴリ',
    [DigitalBurnbagStrings.Provider_LastChecked]: '最終確認: {time}',
    [DigitalBurnbagStrings.Provider_LastActivity]: '最終アクティビティ: {time}',
    [DigitalBurnbagStrings.Provider_NeverChecked]: '未確認',
    [DigitalBurnbagStrings.Provider_CheckNow]: '今すぐ確認',
    [DigitalBurnbagStrings.Provider_Settings]: '設定',
    [DigitalBurnbagStrings.Provider_ViewDetails]: '詳細を表示',

    // -- Provider Status --
    [DigitalBurnbagStrings.ProviderStatus_Connected]: '接続済み',
    [DigitalBurnbagStrings.ProviderStatus_Pending]: '保留中',
    [DigitalBurnbagStrings.ProviderStatus_Expired]: '期限切れ',
    [DigitalBurnbagStrings.ProviderStatus_Invalid]: '無効',
    [DigitalBurnbagStrings.ProviderStatus_Error]: 'エラー',
    [DigitalBurnbagStrings.ProviderStatus_NotConnected]: '未接続',

    // -- Provider Categories --
    [DigitalBurnbagStrings.ProviderCategory_PlatformNative]:
      'プラットフォームネイティブ',
    [DigitalBurnbagStrings.ProviderCategory_PlatformNativeDesc]:
      '外部サービスなしで動作する組み込みチェックイン方法',
    [DigitalBurnbagStrings.ProviderCategory_HealthFitness]:
      '健康・フィットネス',
    [DigitalBurnbagStrings.ProviderCategory_HealthFitnessDesc]:
      '日々のアクティビティを表示するフィットネストラッカーと健康アプリ',
    [DigitalBurnbagStrings.ProviderCategory_Developer]: '開発者ツール',
    [DigitalBurnbagStrings.ProviderCategory_DeveloperDesc]:
      'コードリポジトリと開発者プラットフォーム',
    [DigitalBurnbagStrings.ProviderCategory_Communication]:
      'コミュニケーション',
    [DigitalBurnbagStrings.ProviderCategory_CommunicationDesc]:
      'メッセージングとチャットプラットフォーム',
    [DigitalBurnbagStrings.ProviderCategory_SocialMedia]: 'ソーシャルメディア',
    [DigitalBurnbagStrings.ProviderCategory_SocialMediaDesc]:
      'ソーシャルネットワークとコンテンツプラットフォーム',
    [DigitalBurnbagStrings.ProviderCategory_Productivity]: '生産性',
    [DigitalBurnbagStrings.ProviderCategory_ProductivityDesc]:
      'メール、カレンダー、生産性ツール',
    [DigitalBurnbagStrings.ProviderCategory_SmartHome]: 'スマートホーム',
    [DigitalBurnbagStrings.ProviderCategory_SmartHomeDesc]:
      'IoTデバイスとホームオートメーション',
    [DigitalBurnbagStrings.ProviderCategory_Gaming]: 'ゲーム',
    [DigitalBurnbagStrings.ProviderCategory_GamingDesc]:
      'ゲームプラットフォームとサービス',
    [DigitalBurnbagStrings.ProviderCategory_Financial]: '金融',
    [DigitalBurnbagStrings.ProviderCategory_FinancialDesc]:
      '銀行および金融サービス',
    [DigitalBurnbagStrings.ProviderCategory_Email]: 'メール',
    [DigitalBurnbagStrings.ProviderCategory_EmailDesc]: 'メールプロバイダー',
    [DigitalBurnbagStrings.ProviderCategory_CustomIntegration]: 'カスタム統合',
    [DigitalBurnbagStrings.ProviderCategory_CustomIntegrationDesc]:
      '任意のサービスとの独自の統合を作成',
    [DigitalBurnbagStrings.ProviderCategory_Location]: '位置情報',
    [DigitalBurnbagStrings.ProviderCategory_LocationDesc]:
      '位置情報とマッピングサービス',
    [DigitalBurnbagStrings.ProviderCategory_Entertainment]: 'エンターテインメント',
    [DigitalBurnbagStrings.ProviderCategory_EntertainmentDesc]:
      'エンターテインメントとストリーミングサービス',
    [DigitalBurnbagStrings.ProviderCategory_Other]: 'その他',
    [DigitalBurnbagStrings.ProviderCategory_OtherDesc]: 'その他のプロバイダー',

    // -- Provider Names --
    [DigitalBurnbagStrings.ProviderName_Fitbit]: 'Fitbit',
    [DigitalBurnbagStrings.ProviderName_Strava]: 'Strava',
    [DigitalBurnbagStrings.ProviderName_Garmin]: 'Garmin Connect',
    [DigitalBurnbagStrings.ProviderName_Whoop]: 'WHOOP',
    [DigitalBurnbagStrings.ProviderName_Oura]: 'Oura Ring',
    [DigitalBurnbagStrings.ProviderName_GitHub]: 'GitHub',
    [DigitalBurnbagStrings.ProviderName_GitLab]: 'GitLab',
    [DigitalBurnbagStrings.ProviderName_Bitbucket]: 'Bitbucket',
    [DigitalBurnbagStrings.ProviderName_Twitter]: 'Twitter / X',
    [DigitalBurnbagStrings.ProviderName_Mastodon]: 'Mastodon',
    [DigitalBurnbagStrings.ProviderName_Bluesky]: 'Bluesky',
    [DigitalBurnbagStrings.ProviderName_Reddit]: 'Reddit',
    [DigitalBurnbagStrings.ProviderName_Slack]: 'Slack',
    [DigitalBurnbagStrings.ProviderName_Discord]: 'Discord',
    [DigitalBurnbagStrings.ProviderName_Telegram]: 'Telegram',
    [DigitalBurnbagStrings.ProviderName_Google]: 'Google',
    [DigitalBurnbagStrings.ProviderName_Notion]: 'Notion',
    [DigitalBurnbagStrings.ProviderName_HomeAssistant]: 'Home Assistant',
    [DigitalBurnbagStrings.ProviderName_Steam]: 'Steam',
    [DigitalBurnbagStrings.ProviderName_CustomWebhook]: 'カスタムWebhook',
    [DigitalBurnbagStrings.ProviderName_BrightChain]:
      'BrightChainアクティビティ',
    [DigitalBurnbagStrings.ProviderName_ManualCheckin]: '手動チェックイン',
    [DigitalBurnbagStrings.ProviderName_EmailPing]: 'メールチェックイン',
    [DigitalBurnbagStrings.ProviderName_SmsPing]: 'SMSチェックイン',

    // -- Provider Descriptions --
    [DigitalBurnbagStrings.ProviderDesc_Fitbit]:
      '歩数、心拍数、睡眠データを生存証明として追跡',
    [DigitalBurnbagStrings.ProviderDesc_Strava]:
      'ランニング、サイクリング、ワークアウトを監視',
    [DigitalBurnbagStrings.ProviderDesc_Garmin]:
      'Garminデバイスからのアクティビティを追跡',
    [DigitalBurnbagStrings.ProviderDesc_Whoop]: '回復とストレインデータを監視',
    [DigitalBurnbagStrings.ProviderDesc_Oura]: '睡眠とレディネススコアを追跡',
    [DigitalBurnbagStrings.ProviderDesc_GitHub]:
      'コミット、イシュー、プルリクエストを監視',
    [DigitalBurnbagStrings.ProviderDesc_GitLab]:
      'コミットとマージリクエストを監視',
    [DigitalBurnbagStrings.ProviderDesc_Bitbucket]:
      'コミットとプルリクエストを監視',
    [DigitalBurnbagStrings.ProviderDesc_Twitter]:
      'ツイートとアクティビティを監視',
    [DigitalBurnbagStrings.ProviderDesc_Mastodon]:
      '任意のMastodonインスタンスでのトゥートを監視',
    [DigitalBurnbagStrings.ProviderDesc_Bluesky]: 'Blueskyでの投稿を監視',
    [DigitalBurnbagStrings.ProviderDesc_Reddit]: '投稿とコメントを監視',
    [DigitalBurnbagStrings.ProviderDesc_Slack]:
      'プレゼンスとアクティビティステータスを監視',
    [DigitalBurnbagStrings.ProviderDesc_Discord]:
      'プレゼンスとアクティビティを監視',
    [DigitalBurnbagStrings.ProviderDesc_Telegram]:
      'ボット統合によるアクティビティを監視',
    [DigitalBurnbagStrings.ProviderDesc_Google]:
      'GmailとGoogleカレンダーのアクティビティを監視',
    [DigitalBurnbagStrings.ProviderDesc_Notion]:
      'ワークスペースのアクティビティを監視',
    [DigitalBurnbagStrings.ProviderDesc_HomeAssistant]:
      'スマートホームのアクティビティとプレゼンスを監視',
    [DigitalBurnbagStrings.ProviderDesc_Steam]: 'ゲームアクティビティを監視',
    [DigitalBurnbagStrings.ProviderDesc_CustomWebhook]:
      'HTTPリクエストを送信できる任意のサービスと統合',
    [DigitalBurnbagStrings.ProviderDesc_BrightChain]:
      'このプラットフォームでのアクティビティを監視',
    [DigitalBurnbagStrings.ProviderDesc_ManualCheckin]:
      '定期的に手動でプレゼンスを確認',
    [DigitalBurnbagStrings.ProviderDesc_EmailPing]:
      '定期的なメールチャレンジに応答',
    [DigitalBurnbagStrings.ProviderDesc_SmsPing]: '定期的なSMSチャレンジに応答',

    // -- Provider Data Access Descriptions --
    [DigitalBurnbagStrings.ProviderDataAccess_Fitbit]:
      '継続的なアクティビティを確認するため、日々のアクティビティサマリー（歩数、アクティブ分）、心拍数データ、睡眠ログにアクセスします。',
    [DigitalBurnbagStrings.ProviderDataAccess_Strava]:
      'ランニング、サイクリング、その他のワークアウトを記録したときに検出するため、アクティビティフィードにアクセスします。',
    [DigitalBurnbagStrings.ProviderDataAccess_Garmin]:
      'ワークアウト、歩数、健康指標を含むGarminアクティビティデータにアクセスします。',
    [DigitalBurnbagStrings.ProviderDataAccess_Whoop]:
      '日々のアクティビティを確認するため、WHOOPの回復スコアとストレインデータにアクセスします。',
    [DigitalBurnbagStrings.ProviderDataAccess_Oura]:
      '日々のアクティビティを確認するため、Ouraの睡眠データとレディネススコアにアクセスします。',
    [DigitalBurnbagStrings.ProviderDataAccess_GitHub]:
      'コミット、イシュー、プルリクエスト、コメントを含む公開アクティビティフィードにアクセスします。',
    [DigitalBurnbagStrings.ProviderDataAccess_GitLab]:
      'コミット、マージリクエスト、イシューを含むGitLabアクティビティにアクセスします。',
    [DigitalBurnbagStrings.ProviderDataAccess_Bitbucket]:
      'コミットとプルリクエストを含むBitbucketアクティビティにアクセスします。',
    [DigitalBurnbagStrings.ProviderDataAccess_Twitter]:
      'プラットフォームでの継続的なアクティビティを確認するため、最近のツイートにアクセスします。',
    [DigitalBurnbagStrings.ProviderDataAccess_Mastodon]:
      '継続的なアクティビティを確認するため、最近のトゥートにアクセスします。',
    [DigitalBurnbagStrings.ProviderDataAccess_Bluesky]:
      '継続的なアクティビティを確認するため、最近の投稿にアクセスします。',
    [DigitalBurnbagStrings.ProviderDataAccess_Reddit]:
      '継続的なアクティビティを確認するため、最近の投稿とコメントにアクセスします。',
    [DigitalBurnbagStrings.ProviderDataAccess_Slack]:
      'アクティブであることを確認するため、Slackのプレゼンスステータスにアクセスします。',
    [DigitalBurnbagStrings.ProviderDataAccess_Discord]:
      'アクティブであることを確認するため、Discordのプレゼンスステータスにアクセスします。',
    [DigitalBurnbagStrings.ProviderDataAccess_Telegram]:
      'Telegramボットを使用してチェックインメッセージを受信します。',
    [DigitalBurnbagStrings.ProviderDataAccess_Google]:
      '最近のアクティビティを確認するため、Gmailのメッセージタイムスタンプ（内容ではない）にアクセスします。',
    [DigitalBurnbagStrings.ProviderDataAccess_Notion]:
      '最近の編集を確認するため、Notionワークスペースのアクティビティにアクセスします。',
    [DigitalBurnbagStrings.ProviderDataAccess_HomeAssistant]:
      'モーション、ドアセンサー、その他のプレゼンス指標を検出するため、Home Assistantにアクセスします。',
    [DigitalBurnbagStrings.ProviderDataAccess_Steam]:
      '最近のゲームアクティビティを検出するため、Steamプロフィールにアクセスします。',
    [DigitalBurnbagStrings.ProviderDataAccess_CustomWebhook]:
      '外部サービスがハートビートWebhookを送信するように設定します。',
    [DigitalBurnbagStrings.ProviderDataAccess_BrightChain]:
      'BrightChainでのログイン、ファイルアクセス、その他のアクティビティを自動的に追跡します。',
    [DigitalBurnbagStrings.ProviderDataAccess_ManualCheckin]:
      'アプリまたはウェブサイトから手動でチェックインして、無事であることを確認します。',
    [DigitalBurnbagStrings.ProviderDataAccess_EmailPing]:
      'チェックインリンク付きの定期的なメールを送信します。リンクをクリックして無事であることを確認してください。',
    [DigitalBurnbagStrings.ProviderDataAccess_SmsPing]:
      '定期的なSMSメッセージを送信します。返信して無事であることを確認してください。',

    // -- Provider Check Intervals --
    [DigitalBurnbagStrings.ProviderInterval_EveryMinute]: '毎分',
    [DigitalBurnbagStrings.ProviderInterval_Every5Minutes]: '5分ごと',
    [DigitalBurnbagStrings.ProviderInterval_Every15Minutes]: '15分ごと',
    [DigitalBurnbagStrings.ProviderInterval_Every30Minutes]: '30分ごと',
    [DigitalBurnbagStrings.ProviderInterval_EveryHour]: '毎時',
    [DigitalBurnbagStrings.ProviderInterval_Every2Hours]: '2時間ごと',
    [DigitalBurnbagStrings.ProviderInterval_Every4Hours]: '4時間ごと',
    [DigitalBurnbagStrings.ProviderInterval_Daily]: '毎日',
    [DigitalBurnbagStrings.ProviderInterval_Weekly]: '毎週',
    [DigitalBurnbagStrings.ProviderInterval_BiWeekly]: '2週間ごと',
    [DigitalBurnbagStrings.ProviderInterval_Monthly]: '毎月',
    [DigitalBurnbagStrings.ProviderInterval_Manual]: '手動チェックイン',
    [DigitalBurnbagStrings.ProviderInterval_Automatic]: '自動',
    [DigitalBurnbagStrings.ProviderInterval_Custom]: 'カスタム',

    // -- Registration Wizard --
    [DigitalBurnbagStrings.Wizard_SelectProvider]: 'プロバイダーを選択',
    [DigitalBurnbagStrings.Wizard_SelectProviderDesc]:
      'アクティビティ監視に接続するサービスを選択',
    [DigitalBurnbagStrings.Wizard_ReviewPermissions]: '権限を確認',
    [DigitalBurnbagStrings.Wizard_ReviewPermissionsDesc]:
      'このプロバイダーからアクセスするデータを確認',
    [DigitalBurnbagStrings.Wizard_ConfigureAbsence]: '不在検出を設定',
    [DigitalBurnbagStrings.Wizard_ConfigureAbsenceDesc]:
      '非アクティブがデッドマンスイッチをトリガーするまでの時間を設定',
    [DigitalBurnbagStrings.Wizard_ConfigureDuress]: '脅迫検出を設定',
    [DigitalBurnbagStrings.Wizard_ConfigureDuressDesc]:
      '脅迫を示すキーワードまたはパターンを設定',
    [DigitalBurnbagStrings.Wizard_Authorize]: '認証',
    [DigitalBurnbagStrings.Wizard_AuthorizeDesc]:
      'このプロバイダーのアカウントへのアクセスを許可',
    [DigitalBurnbagStrings.Wizard_EnterApiKey]: 'APIキーを入力',
    [DigitalBurnbagStrings.Wizard_EnterApiKeyDesc]:
      'このプロバイダーに接続するためのAPIキーを入力',
    [DigitalBurnbagStrings.Wizard_ConfigureWebhook]: 'Webhookを設定',
    [DigitalBurnbagStrings.Wizard_ConfigureWebhookDesc]:
      'アクティビティ更新を受信するためのWebhookを設定',
    [DigitalBurnbagStrings.Wizard_TestConnection]: '接続をテスト',
    [DigitalBurnbagStrings.Wizard_TestConnectionDesc]:
      '接続が正しく機能していることを確認',
    [DigitalBurnbagStrings.Wizard_Complete]: '完了',
    [DigitalBurnbagStrings.Wizard_CompleteDesc]:
      'プロバイダーが正常に接続されました',

    // -- Absence Configuration --
    [DigitalBurnbagStrings.Absence_ThresholdLabel]: '不在しきい値',
    [DigitalBurnbagStrings.Absence_ThresholdHelp]:
      'デッドマンスイッチがトリガーされるまでのアクティビティなしの時間',
    [DigitalBurnbagStrings.Absence_GracePeriodLabel]: '猶予期間',
    [DigitalBurnbagStrings.Absence_GracePeriodHelp]:
      'しきい値後、アクションが実行されるまでの追加時間',
    [DigitalBurnbagStrings.Absence_SendWarnings]: '警告通知を送信',
    [DigitalBurnbagStrings.Absence_WarningDaysLabel]: 'しきい値前の警告日数',
    [DigitalBurnbagStrings.Absence_WarningDaysHelp]:
      '警告を送信するしきい値前の日数（カンマ区切り）',
    [DigitalBurnbagStrings.Absence_Days]: '日',
    [DigitalBurnbagStrings.Absence_Hours]: '時間',

    // -- Duress Configuration --
    [DigitalBurnbagStrings.Duress_EnableLabel]: '脅迫検出を有効化',
    [DigitalBurnbagStrings.Duress_EnableHelp]:
      'アクティビティ内の苦痛信号を検出（例：コミット内の特定のキーワード）',
    [DigitalBurnbagStrings.Duress_KeywordsLabel]: '脅迫キーワード',
    [DigitalBurnbagStrings.Duress_KeywordsHelp]:
      'アクティビティ内で見つかった場合に脅迫を示す単語（カンマ区切り）',
    [DigitalBurnbagStrings.Duress_PatternsLabel]: '脅迫パターン',
    [DigitalBurnbagStrings.Duress_PatternsHelp]:
      '脅迫を示す正規表現パターン（1行に1つ）',

    // -- API Key Entry --
    [DigitalBurnbagStrings.ApiKey_Label]: 'APIキー',
    [DigitalBurnbagStrings.ApiKey_Placeholder]: 'APIキーを入力',
    [DigitalBurnbagStrings.ApiKey_Help]:
      'APIキーは暗号化されて安全に保存されます',
    [DigitalBurnbagStrings.ApiKey_WhereToFind]: 'APIキーの場所',

    // -- Webhook Configuration --
    [DigitalBurnbagStrings.Webhook_UrlLabel]: 'Webhook URL',
    [DigitalBurnbagStrings.Webhook_UrlHelp]:
      '外部サービスでこのURLを設定してください',
    [DigitalBurnbagStrings.Webhook_SecretLabel]: 'Webhookシークレット',
    [DigitalBurnbagStrings.Webhook_SecretHelp]:
      'このシークレットを使用してWebhookリクエストに署名',
    [DigitalBurnbagStrings.Webhook_Instructions]:
      'サービスがWebhook URLにPOSTリクエストを送信するように設定してください',
    [DigitalBurnbagStrings.Webhook_CopyUrl]: 'URLをコピー',
    [DigitalBurnbagStrings.Webhook_CopySecret]: 'シークレットをコピー',
    [DigitalBurnbagStrings.Webhook_Copied]: 'クリップボードにコピーしました',

    // -- Connection Test --
    [DigitalBurnbagStrings.Test_Running]: '接続をテスト中...',
    [DigitalBurnbagStrings.Test_Success]: '接続成功',
    [DigitalBurnbagStrings.Test_Failed]: '接続失敗',
    [DigitalBurnbagStrings.Test_ResponseTime]: '応答時間: {ms}ms',
    [DigitalBurnbagStrings.Test_UserInfo]: '{username}として接続',

    // -- OAuth Flow --
    [DigitalBurnbagStrings.OAuth_Redirecting]: '{provider}にリダイレクト中...',
    [DigitalBurnbagStrings.OAuth_WaitingForAuth]: '認証を待機中...',
    [DigitalBurnbagStrings.OAuth_Success]: '認証成功',
    [DigitalBurnbagStrings.OAuth_Failed]: '認証失敗',
    [DigitalBurnbagStrings.OAuth_Cancelled]: '認証がキャンセルされました',

    // -- Connection Summary --
    [DigitalBurnbagStrings.Summary_Healthy]: 'すべてのプロバイダーが正常',
    [DigitalBurnbagStrings.Summary_Degraded]: '一部のプロバイダーに注意が必要',
    [DigitalBurnbagStrings.Summary_Critical]: '重大: プロバイダーに障害が発生',
    [DigitalBurnbagStrings.Summary_None]: 'プロバイダーが接続されていません',
    [DigitalBurnbagStrings.Summary_ConnectedProviders]:
      '{count}個のプロバイダーが接続済み',
    [DigitalBurnbagStrings.Summary_NeedsAttention]: '{count}個に注意が必要',
    [DigitalBurnbagStrings.Summary_LastHeartbeat]: '最終ハートビート: {time}',

    // -- Provider Dashboard --
    [DigitalBurnbagStrings.Nav_Providers]: 'プロバイダー',
    [DigitalBurnbagStrings.Dashboard_Title]: 'プロバイダーダッシュボード',
    [DigitalBurnbagStrings.Dashboard_HealthBanner]: '健全性サマリー',
    [DigitalBurnbagStrings.Dashboard_SignalPresence]: 'プレゼンス',
    [DigitalBurnbagStrings.Dashboard_SignalAbsence]: '不在',
    [DigitalBurnbagStrings.Dashboard_SignalDuress]: '脅迫',
    [DigitalBurnbagStrings.Dashboard_SignalCheckFailed]: 'チェック失敗',
    [DigitalBurnbagStrings.Dashboard_SignalInconclusive]: '不確定',
    [DigitalBurnbagStrings.Dashboard_TimeSinceActivity]:
      '最終アクティビティからの時間',
    [DigitalBurnbagStrings.Detail_StatusHistory]: 'ステータス履歴',
    [DigitalBurnbagStrings.Detail_ConnectionSettings]: '接続設定',
    [DigitalBurnbagStrings.Detail_FilterBySignal]: 'シグナルでフィルター',
    [DigitalBurnbagStrings.Detail_AllSignals]: 'すべてのシグナル',
    [DigitalBurnbagStrings.Detail_Timeline]: 'タイムライン',
    [DigitalBurnbagStrings.Detail_NoHistory]: 'ステータス履歴がありません',
    [DigitalBurnbagStrings.Binding_BindToProvider]: 'プロバイダーにバインド',
    [DigitalBurnbagStrings.Binding_SelectProvider]: 'プロバイダーを選択',
    [DigitalBurnbagStrings.Binding_Condition]: '条件',
    [DigitalBurnbagStrings.Binding_Action]: 'アクション',
    [DigitalBurnbagStrings.Binding_Targets]: 'ターゲット',
    [DigitalBurnbagStrings.Binding_Create]: 'バインディングを作成',
    [DigitalBurnbagStrings.Binding_ProviderNotConnected]:
      'このプロバイダーは接続されていません。',
    [DigitalBurnbagStrings.Binding_FixConnection]: '接続を修正',
    [DigitalBurnbagStrings.Binding_DragHint]:
      'プロバイダーカードをボールトまたはファイルにドラッグ',
    [DigitalBurnbagStrings.CustomProvider_Title]: 'カスタムプロバイダー',
    [DigitalBurnbagStrings.CustomProvider_ImportJson]: 'JSONインポート',
    [DigitalBurnbagStrings.CustomProvider_ExportJson]: 'JSONエクスポート',
    [DigitalBurnbagStrings.CustomProvider_Name]: 'プロバイダー名',
    [DigitalBurnbagStrings.CustomProvider_Description]: '説明',
    [DigitalBurnbagStrings.CustomProvider_BaseUrl]: 'ベースURL',
    [DigitalBurnbagStrings.CustomProvider_Category]: 'カテゴリー',
    [DigitalBurnbagStrings.CustomProvider_AuthType]: '認証タイプ',
    [DigitalBurnbagStrings.CustomProvider_Endpoints]: 'エンドポイント',
    [DigitalBurnbagStrings.CustomProvider_ResponseMapping]:
      'レスポンスマッピング',
    [DigitalBurnbagStrings.CustomProvider_Save]: 'プロバイダーを保存',
    // -- Encryption & Access Indicators --
    [DigitalBurnbagStrings.Encryption_AES256]: 'AES-256',
    [DigitalBurnbagStrings.Encryption_Encrypted]: '暗号化済み',
    [DigitalBurnbagStrings.Encryption_EncryptedTooltip]:
      'このファイルはAES-256-GCMで暗号化されています。認可された鍵保持者のみが復号できます。',
    [DigitalBurnbagStrings.Encryption_KeyWrapped]: '鍵ラップ済み',
    [DigitalBurnbagStrings.Encryption_KeyWrappedTooltip]:
      '復号鍵はあなたの個人ECIESキーペアでラップされています。',
    [DigitalBurnbagStrings.Encryption_ApprovalProtected]: 'クォーラム',
    [DigitalBurnbagStrings.Encryption_ApprovalTooltip]:
      'このファイルは機密操作にクォーラム承認が必要です。',
    [DigitalBurnbagStrings.Access_OnlyYou]: 'あなただけ',
    [DigitalBurnbagStrings.Access_SharedWith]: '共有先',
    [DigitalBurnbagStrings.Access_SharedWithCount]: '{count}人と共有',
    [DigitalBurnbagStrings.Access_ViewAll]: 'すべてのアクセスを表示',
    [DigitalBurnbagStrings.Vault_EncryptionLabel]: '暗号化',
    [DigitalBurnbagStrings.Vault_AllEncrypted]: 'すべてのファイルが暗号化済み',
    [DigitalBurnbagStrings.Vault_AllEncryptedDesc]:
      'この金庫のすべてのファイルはAES-256-GCMで暗号化されています。',
    [DigitalBurnbagStrings.FileBrowser_ColAccess]: 'アクセス',
    [DigitalBurnbagStrings.FileBrowser_ColSecurity]: 'セキュリティ',

    // -- Friends Sharing --
    [DigitalBurnbagStrings.Friends_SectionTitle]: 'フレンド',
    [DigitalBurnbagStrings.Friends_ShareWithAll]: 'フレンドと共有',

    // -- ボールト公開設定 --
    [DigitalBurnbagStrings.Vault_VisibilityLabel]: '公開設定',
    [DigitalBurnbagStrings.Vault_Visibility_Private]: 'プライベート',
    [DigitalBurnbagStrings.Vault_Visibility_PrivateDesc]:
      '明示的に共有した相手のみアクセスできます。',
    [DigitalBurnbagStrings.Vault_Visibility_Unlisted]: '限定公開',
    [DigitalBurnbagStrings.Vault_Visibility_UnlistedDesc]:
      'リンクを持つ人はアクセスできますが、検索や公開ディスカバリーフィードには表示されません。',
    [DigitalBurnbagStrings.Vault_Visibility_Public]: '公開',
    [DigitalBurnbagStrings.Vault_Visibility_PublicDesc]:
      '誰でもこのボールトを発見・アクセスできます。人気の公開ボールトはネットワークから無料のレプリケーションアップグレードを受けることがあります。',
    [DigitalBurnbagStrings.Vault_Public_PopularityLabel]: '人気',
    [DigitalBurnbagStrings.Vault_Public_ReplicationBonus]:
      'レプリケーションボーナス適用中',
    [DigitalBurnbagStrings.Vault_Public_ReplicationBonusDesc]:
      'このボールトは十分な人気があり、ネットワークが追加費用なしで自動的に冗長性を向上させます。',
    [DigitalBurnbagStrings.Vault_Public_DiscoveryNote]:
      '公開ボールトはDigital Burnbagのディスカバリーフィードに掲載され、時間とともに人気を集めることができます。',
    [DigitalBurnbagStrings.File_Visibility_Override]:
      'ファイル公開設定の上書き',
    [DigitalBurnbagStrings.File_Visibility_InheritedFrom]:
      'ボールトから継承 ({visibility})',
    [DigitalBurnbagStrings.ACL_PublicPrincipalLabel]: '公開（誰でも）',
    [DigitalBurnbagStrings.ACL_PublicPrincipalDesc]:
      '認証なしで任意の訪問者にアクセスを許可します。',

    // -- Joule Upload / Storage Cost --
    [DigitalBurnbagStrings.Joule_BurnDateTooltip]: '破棄日設定済み',
    [DigitalBurnbagStrings.Joule_BurnDateChipLabel]: '{date}に破棄',
    [DigitalBurnbagStrings.Joule_BurnDateActive]:
      '「破棄待ち」ティア — ファイルは暗号的に削除されます',
    [DigitalBurnbagStrings.Joule_ExpiryReleaseNote]:
      '{durationDays}日{daySuffix}後に前払いストレージが終了します。破棄日を設定しない場合、ファイルはネットワークに解放されます。コミュニティが延長するか、最終的に削除されます。',
    [DigitalBurnbagStrings.Joule_RsDisplayText]:
      'RS({rsK},{rsM}) · オーバーヘッド {overhead} · {rsM}障害まで耐性',
    [DigitalBurnbagStrings.Joule_RsDisplayAriaLabel]:
      'Reed-Solomon RS({rsK},{rsM})、オーバーヘッド {overhead}、{rsM}障害まで耐性',
    [DigitalBurnbagStrings.Joule_StorageCostPreviewRegion]:
      'ストレージコストプレビュー',
    [DigitalBurnbagStrings.Joule_UpfrontLabel]:
      '前払い（{durationDays}日{daySuffix}）',
    [DigitalBurnbagStrings.Joule_UpfrontAriaLabel]: '前払い料金: {amount}',
    [DigitalBurnbagStrings.Joule_DailyCharge]: '日次料金',
    [DigitalBurnbagStrings.Joule_DailyAriaLabel]:
      '日次料金: 1日あたり {amount}',
    [DigitalBurnbagStrings.Joule_DailyPerDay]: '{amount} / 日',
    [DigitalBurnbagStrings.Joule_InsufficientBalance]:
      '残高不足 — 利用可能: {balance}',
    [DigitalBurnbagStrings.Joule_UnableToCalculateCost]:
      'コストを計算できません',
    [DigitalBurnbagStrings.Joule_StorageDurationTitle]: '保存期間',
    [DigitalBurnbagStrings.Joule_DurationPresetsAriaLabel]: '期間プリセット',
    [DigitalBurnbagStrings.Joule_DurationPresetDays]: '{count}日',
    [DigitalBurnbagStrings.Joule_DurationPreset1Year]: '1年',
    [DigitalBurnbagStrings.Joule_DurationPresetAriaLabel]: '{count}日',
    [DigitalBurnbagStrings.Joule_DurationCustomLabel]: 'カスタム（日数）',
    [DigitalBurnbagStrings.Joule_DurationCustomAriaLabel]:
      '日数で指定するカスタム期間',
    [DigitalBurnbagStrings.Joule_StorageTierTitle]: 'ストレージティア',
    [DigitalBurnbagStrings.Joule_StorageTierAriaLabel]:
      'ストレージティアの選択',
    [DigitalBurnbagStrings.Joule_TierCostVsStandard]:
      'スタンダード比 {multiplier}のコスト',
    [DigitalBurnbagStrings.Joule_Tier_Performance]: 'パフォーマンス',
    [DigitalBurnbagStrings.Joule_Tier_Standard]: 'スタンダード',
    [DigitalBurnbagStrings.Joule_Tier_Archive]: 'アーカイブ',
    [DigitalBurnbagStrings.Joule_Tier_PendingBurn]: '破棄待機中',
    [DigitalBurnbagStrings.Joule_Tier_None]: '冗長性なし',
    [DigitalBurnbagStrings.Joule_FormAriaLabel]: 'アップロード設定フォーム',
    [DigitalBurnbagStrings.Joule_BurnDateCheckboxLabel]: '破棄日を設定する',
    [DigitalBurnbagStrings.Joule_BurnDateCheckboxAriaLabel]:
      '破棄日を有効にする',
    [DigitalBurnbagStrings.Joule_ContinueButton]: '続ける',
    [DigitalBurnbagStrings.Joule_ContinueButtonAriaLabel]:
      'アップロードコスト確認に進む',
    [DigitalBurnbagStrings.Joule_InitUploadFailed]:
      'アップロードセッションの初期化に失敗しました。',
    [DigitalBurnbagStrings.Joule_ModalTitle]: 'ストレージ料金の確認',
    [DigitalBurnbagStrings.Joule_LoadingAriaLabel]:
      'コスト見積もりを読み込んでいます',
    [DigitalBurnbagStrings.Joule_QuoteExpired]:
      '見積もりの有効期限が切れました — 新しい見積もりを生成するには再アップロードしてください。',
    [DigitalBurnbagStrings.Joule_ModalInsufficientBalance]:
      '残高不足 — 前払い料金が利用可能なJoule残高（{balance}）を超えています。',
    [DigitalBurnbagStrings.Joule_ErasureCodingLabel]:
      'イレージャーコーディング',
    [DigitalBurnbagStrings.Joule_ErasureCodingValue]:
      'RS({rsK},{rsM}) · オーバーヘッド {overheadDisplay}',
    [DigitalBurnbagStrings.Joule_QuoteExpiresIn]: '見積もりの有効期限',
    [DigitalBurnbagStrings.Joule_QuoteExpiresInAriaLabel]:
      '見積もりは{seconds}秒後に有効期限切れ',
    [DigitalBurnbagStrings.Joule_QuoteSeconds]: '{seconds}秒',
    [DigitalBurnbagStrings.Joule_QuoteProgressAriaLabel]:
      '見積もり有効期限までの残り時間',
    [DigitalBurnbagStrings.Joule_CancelButton]: 'キャンセル',
    [DigitalBurnbagStrings.Joule_CancelButtonAriaLabel]:
      'アップロードをキャンセルしてセッションを破棄する',
    [DigitalBurnbagStrings.Joule_ConfirmButton]: 'アップロードを確認',
    [DigitalBurnbagStrings.Joule_ConfirmButtonAriaLabel]:
      'アップロードを確認してJoule残高を差し引く',
    [DigitalBurnbagStrings.Joule_FetchQuoteFailed]:
      '見積もりの取得に失敗しました。',
    [DigitalBurnbagStrings.Joule_CommitFailed]:
      'コミットに失敗しました。再試してください。',

    // -- API HTTP Status Labels --
    [DigitalBurnbagStrings.Api_Http_Ok]: 'OK',
    [DigitalBurnbagStrings.Api_Http_Unauthorized]: 'Unauthorized',
    [DigitalBurnbagStrings.Api_Http_BadRequest]: 'Bad Request',
    [DigitalBurnbagStrings.Api_Http_Forbidden]: 'Forbidden',
    [DigitalBurnbagStrings.Api_Http_NotFound]: 'Not Found',
    [DigitalBurnbagStrings.Api_Http_Conflict]: 'Conflict',
    [DigitalBurnbagStrings.Api_Http_UnprocessableEntity]:
      'Unprocessable Entity',
    [DigitalBurnbagStrings.Api_Http_PaymentRequired]: 'Payment Required',
    [DigitalBurnbagStrings.Api_Http_ServiceUnavailable]: 'Service Unavailable',

    // -- API Authentication Errors --
    [DigitalBurnbagStrings.Api_Error_AuthMissing]:
      'Invalid or missing authentication',
    [DigitalBurnbagStrings.Api_Error_AuthenticationRequired]:
      'Authentication required',
    [DigitalBurnbagStrings.Api_Error_InsufficientPermissions]:
      'Insufficient permissions',

    // -- API ID Validation Errors --
    [DigitalBurnbagStrings.Api_Error_InvalidContainerId]:
      'Invalid container ID',
    [DigitalBurnbagStrings.Api_Error_InvalidFileId]: 'Invalid file ID format',
    [DigitalBurnbagStrings.Api_Error_InvalidVersionId]:
      'Invalid version ID format',
    [DigitalBurnbagStrings.Api_Error_InvalidFolderId]:
      'Invalid folder ID format',
    [DigitalBurnbagStrings.Api_Error_InvalidParentFolderIdFormat]:
      'Invalid parentFolderId format',
    [DigitalBurnbagStrings.Api_Error_InvalidVaultContainerIdFormat]:
      'Invalid vaultContainerId format',
    [DigitalBurnbagStrings.Api_Error_InvalidShareLinkId]:
      'Invalid share link ID format',
    [DigitalBurnbagStrings.Api_Error_InvalidSessionId]:
      'Invalid session ID format',
    [DigitalBurnbagStrings.Api_Error_InvalidTargetId]:
      'Invalid target ID format',
    [DigitalBurnbagStrings.Api_Error_InvalidPrincipalId]:
      'Invalid principal ID format',
    [DigitalBurnbagStrings.Api_Error_InvalidItemId]: 'Invalid item ID format',
    [DigitalBurnbagStrings.Api_Error_InvalidConnectionId]:
      'Invalid connection ID',
    [DigitalBurnbagStrings.Api_Error_InvalidConnectionIdTemplate]:
      'Invalid connection ID: {{id}}',
    [DigitalBurnbagStrings.Api_Error_InvalidBindingId]:
      'Invalid binding ID format',
    [DigitalBurnbagStrings.Api_Error_InvalidRecipientListId]:
      'Invalid recipient list ID format',
    [DigitalBurnbagStrings.Api_Error_InvalidRequestId]:
      'Invalid request ID format',
    [DigitalBurnbagStrings.Api_Error_InvalidProviderId]: 'Invalid provider ID',

    // -- API Required Field Errors --
    [DigitalBurnbagStrings.Api_Error_NameRequired]: 'name is required',
    [DigitalBurnbagStrings.Api_Error_ParentFolderIdRequired]:
      'parentFolderId is required',
    [DigitalBurnbagStrings.Api_Error_VaultContainerIdRequired]:
      'vaultContainerId is required',
    [DigitalBurnbagStrings.Api_Error_NewParentIdRequired]:
      'newParentId is required',
    [DigitalBurnbagStrings.Api_Error_InvalidNewParentIdFormat]:
      'Invalid newParentId format',

    // -- API Not Found Errors --
    [DigitalBurnbagStrings.Api_Error_PathNotFound]: 'Path not found',
    [DigitalBurnbagStrings.Api_Error_ConnectionNotFound]:
      'Connection not found',
    [DigitalBurnbagStrings.Api_Error_ConnectionNotFoundTemplate]:
      'Connection not found: {{id}}',
    [DigitalBurnbagStrings.Api_Error_ProviderNotFound]: 'Provider not found',
    [DigitalBurnbagStrings.Api_Error_FileNotFoundTemplate]:
      'File not found: {{fileId}}',
    [DigitalBurnbagStrings.Api_Error_UploadSessionNotFound]:
      'Upload session not found.',
    [DigitalBurnbagStrings.Api_Error_ContractNotFoundTemplate]:
      'Contract not found: {{contractId}}',
    [DigitalBurnbagStrings.Api_Error_ResourceNotFound]:
      '{{resource}} not found',
    [DigitalBurnbagStrings.Api_Error_ResourceWithIdNotFound]:
      "{{resource}} '{{id}}' not found",

    // -- API Forbidden Errors --
    [DigitalBurnbagStrings.Api_Error_UploadSessionForbidden]:
      'You do not have access to this upload session.',
    [DigitalBurnbagStrings.Api_Error_ContractForbidden]:
      'You do not have access to this contract.',

    // -- API Analytics Errors --
    [DigitalBurnbagStrings.Api_Error_SinceUntilRequired]:
      'since and until query parameters are required',
    [DigitalBurnbagStrings.Api_Error_InvalidDateRange]:
      'Invalid date range: since must be before until',
    [DigitalBurnbagStrings.Api_Error_ConnectionIdsRequired]:
      'connectionIds query parameter is required',
    [DigitalBurnbagStrings.Api_Error_MaxConnectionsCompare]:
      'Maximum 5 connections for comparison',
    [DigitalBurnbagStrings.Api_Error_InvalidExportFormat]:
      "Format must be 'csv' or 'json'",

    // -- API Joule / Storage Economy Errors --
    [DigitalBurnbagStrings.Api_Error_JouleNotEnabled]:
      'Joule storage economy is not enabled on this instance.',
    [DigitalBurnbagStrings.Api_Error_JouleParamsMissing]:
      'Missing required query parameters: bytes, tier, days.',
    [DigitalBurnbagStrings.Api_Error_JouleInvalidTier]:
      'Invalid tier. Must be one of: {{tiers}}.',
    [DigitalBurnbagStrings.Api_Error_JouleInvalidBytes]:
      'Invalid bytes parameter: must be a non-negative integer.',
    [DigitalBurnbagStrings.Api_Error_JouleInvalidDays]:
      'Invalid days parameter: must be a positive integer.',
    [DigitalBurnbagStrings.Api_Error_JouleInvalidDaysMin]:
      'Invalid days parameter: must be at least 1.',
    [DigitalBurnbagStrings.Api_Error_JouleCalcFailed]:
      'Failed to calculate storage cost.',
    [DigitalBurnbagStrings.Api_Error_InsufficientJoule]:
      'Insufficient Joule balance for storage.',
    [DigitalBurnbagStrings.Api_Error_DurabilityTierRequired]:
      'durabilityTier is required when Joule storage economy is enabled',
    [DigitalBurnbagStrings.Api_Error_DurabilityTierInvalid]:
      'durabilityTier must be one of: performance, standard, archive, pending-burn, none',
    [DigitalBurnbagStrings.Api_Error_DurationDaysInvalid]:
      'durationDays must be a positive integer when Joule storage economy is enabled',

    // -- API Upload Errors --
    [DigitalBurnbagStrings.Api_Error_TotalSizeBytesInvalid]:
      'totalSizeBytes must be a positive number',
    [DigitalBurnbagStrings.Api_Error_TargetFolderIdMissing]:
      'Invalid or missing targetFolderId',
    [DigitalBurnbagStrings.Api_Error_VaultContainerIdMissing]:
      'Invalid or missing vaultContainerId',
    [DigitalBurnbagStrings.Api_Error_FileIdMissing]:
      'Invalid or missing fileId',
    [DigitalBurnbagStrings.Api_Error_MimeTypeMismatch]:
      'MIME type mismatch: file is "{{actual}}" but received "{{expected}}". Upload a file with the same type.',
    [DigitalBurnbagStrings.Api_Error_UploadAlreadyQuoted]:
      'Upload has already been quoted.',
    [DigitalBurnbagStrings.Api_Error_UploadQuoteExpired]:
      'Upload quote has expired. Please re-quote before committing.',

    // -- API Storage Contract Errors --
    [DigitalBurnbagStrings.Api_Error_AutoRenewOnly]:
      "Only 'autoRenew' may be updated. Immutable fields provided: {{fields}}.",
    [DigitalBurnbagStrings.Api_Error_AutoRenewMustBeBool]:
      "'autoRenew' must be a boolean.",

    // -- API Provider Errors & Success --
    [DigitalBurnbagStrings.Api_Error_FailurePolicyParamsMissing]:
      'failureThreshold and failurePolicy are required',
    [DigitalBurnbagStrings.Api_Error_InvalidProviderConfig]:
      'Invalid provider config: {{errors}}',
    [DigitalBurnbagStrings.Api_Ok_CustomProviderRegistered]:
      'Custom provider registered',
    [DigitalBurnbagStrings.Api_Ok_ProviderConfigImported]:
      'Provider config imported',
    [DigitalBurnbagStrings.Api_Ok_FailurePolicyUpdated]:
      'Failure policy updated',

    // -- API Upload Cost Estimator Validation --
    [DigitalBurnbagStrings.Api_Error_TotalSizeBytesPositiveInt]:
      'INVALID_UPLOAD_COST_PARAMS: totalSizeBytes must be a positive integer',
    [DigitalBurnbagStrings.Api_Error_DurabilityTierMustBeOneOf]:
      'INVALID_TIER: durabilityTier must be one of: {{tiers}}',
    [DigitalBurnbagStrings.Api_Error_DurationDaysMustBeInt]:
      'INVALID_DURATION: durationDays must be an integer \u2265 1',
  };
