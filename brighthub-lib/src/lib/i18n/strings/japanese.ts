import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightHubStringKey,
  BrightHubStrings,
} from '../../enumerations/brightHubStrings';

export const BrightHubJapaneseStrings: ComponentStrings<BrightHubStringKey> = {
  // PostCard
  [BrightHubStrings.PostCard_Reposted]: 'リポスト済み',
  [BrightHubStrings.PostCard_Edited]: '編集済み',
  [BrightHubStrings.PostCard_HubRestricted]: 'ハブメンバーのみに表示',
  [BrightHubStrings.PostCard_Deleted]: 'この投稿は削除されました。',
  [BrightHubStrings.PostCard_ReplyAriaTemplate]: '返信、{COUNT}件の返信',
  [BrightHubStrings.PostCard_RepostAriaTemplate]:
    'リポスト、{COUNT}件のリポスト',
  [BrightHubStrings.PostCard_LikeAriaTemplate]: 'いいね、{COUNT}件のいいね',
  [BrightHubStrings.PostCard_UnlikeAriaTemplate]:
    'いいね取消、{COUNT}件のいいね',
  [BrightHubStrings.PostCard_PostByAriaTemplate]: '{NAME}の投稿',

  // PostComposer
  [BrightHubStrings.PostComposer_Placeholder]: '何が起きていますか？',
  [BrightHubStrings.PostComposer_ReplyPlaceholder]: '返信を投稿',
  [BrightHubStrings.PostComposer_ReplyingTo]: '返信先',
  [BrightHubStrings.PostComposer_CancelReply]: '返信をキャンセル',
  [BrightHubStrings.PostComposer_Bold]: '太字',
  [BrightHubStrings.PostComposer_Italic]: '斜体',
  [BrightHubStrings.PostComposer_Code]: 'コード',
  [BrightHubStrings.PostComposer_Emoji]: '絵文字を挿入',
  [BrightHubStrings.PostComposer_AttachImage]: '画像を添付',
  [BrightHubStrings.PostComposer_RemoveAttachmentTemplate]:
    '添付ファイル{INDEX}を削除',
  [BrightHubStrings.PostComposer_AttachmentAltTemplate]: '添付ファイル{INDEX}',
  [BrightHubStrings.PostComposer_VisibleTo]: '公開範囲',
  [BrightHubStrings.PostComposer_VisibilityPublic]: '公開',
  [BrightHubStrings.PostComposer_VisibilityFollowersOnly]: 'フォロワーのみ',
  [BrightHubStrings.PostComposer_VisibilityFriendsOnly]: '友達のみ',
  [BrightHubStrings.PostComposer_VisibilityHubOnly]: 'ハブメンバーのみ',
  [BrightHubStrings.PostComposer_MembersTemplate]: '{COUNT}人のメンバー',
  [BrightHubStrings.PostComposer_SubmitPost]: '投稿を送信',
  [BrightHubStrings.PostComposer_Post]: '投稿',
  [BrightHubStrings.PostComposer_Reply]: '返信',
  [BrightHubStrings.PostComposer_Preview]: 'プレビュー',
  [BrightHubStrings.PostComposer_PreviewAriaLabel]: '投稿内容のプレビュー',
  [BrightHubStrings.PostComposer_MarkupHelp]: '書式ヘルプ',
  [BrightHubStrings.PostComposer_MarkupHelpAriaLabel]:
    '投稿の書式とマークアップリファレンス',
  [BrightHubStrings.PostComposer_MarkupHelpClose]: '閉じる',
  [BrightHubStrings.PostComposer_MarkupHelpTabPost]: '投稿の書式',
  [BrightHubStrings.PostComposer_MarkupHelpTabIcons]: 'アイコンマークアップ',
  [BrightHubStrings.PostComposer_ImageLimitReached]:
    '1投稿あたり最大20枚の画像',
  [BrightHubStrings.PostComposer_ImageUploadFailed]:
    '画像のアップロードに失敗しました',
  [BrightHubStrings.PostComposer_Uploading]: 'アップロード中...',
  [BrightHubStrings.PostComposer_InsertImage]: '画像を挿入',
  [BrightHubStrings.PostComposer_RemoveAttachment]: '添付を削除',
  [BrightHubStrings.PostComposer_AttachmentLimitReached]: '投稿あたり最大4件の添付',
  [BrightHubStrings.PostComposer_EditAltText]: '代替テキストを編集',
  [BrightHubStrings.PostComposer_AltText]: '代替テキスト',
  [BrightHubStrings.PostComposer_Save]: '保存',
  [BrightHubStrings.PostComposer_Cancel]: 'キャンセル',
  [BrightHubStrings.PostComposer_InsertIcon]: 'アイコンを挿入',
  [BrightHubStrings.PostComposer_IconSearchPlaceholder]: 'アイコンを検索...',
  [BrightHubStrings.PostComposer_IconNoMatchTemplate]:
    '「{0}」に一致するアイコンはありません',
  [BrightHubStrings.PostComposer_IconStyleOptions]: 'スタイルオプション',
  [BrightHubStrings.PostComposer_IconColor]: '色',
  [BrightHubStrings.PostComposer_IconColorNone]: 'なし',
  [BrightHubStrings.PostComposer_IconAnimation]: 'アニメーション',
  [BrightHubStrings.PostComposer_IconAnimationNone]: 'なし',
  [BrightHubStrings.PostComposer_IconRotation]: '回転',
  [BrightHubStrings.PostComposer_IconRotationNone]: 'なし',
  [BrightHubStrings.PostComposer_IconSize]: 'サイズ',
  [BrightHubStrings.PostComposer_IconSizeDefault]: 'デフォルト',
  [BrightHubStrings.PostComposer_IconPreview]: 'プレビュー',

  // ImageCropDialog
  [BrightHubStrings.ImageCropDialog_Title]: '画像を切り抜く',
  [BrightHubStrings.ImageCropDialog_Crop]: '切り抜く',
  [BrightHubStrings.ImageCropDialog_Skip]: 'オリジナルを使用',
  [BrightHubStrings.ImageCropDialog_Cancel]: 'キャンセル',
  [BrightHubStrings.ImageCropDialog_ZoomLabel]: 'ズーム',
  [BrightHubStrings.ImageCropDialog_PreviewAlt]: '切り抜きプレビュー',

  // Timeline
  [BrightHubStrings.Timeline_AriaLabel]: 'タイムライン',
  [BrightHubStrings.Timeline_FilteredByTemplate]: 'フィルター：{LABEL}',
  [BrightHubStrings.Timeline_ClearFilter]: 'クリア',
  [BrightHubStrings.Timeline_EmptyDefault]:
    'まだ投稿がありません。フォローして投稿を表示しましょう。',
  [BrightHubStrings.Timeline_LoadingPosts]: '投稿を読み込み中',
  [BrightHubStrings.Timeline_AllCaughtUp]: 'すべて確認済みです',

  // ThreadView
  [BrightHubStrings.ThreadView_AriaLabel]: 'スレッド',
  [BrightHubStrings.ThreadView_ParentDeleted]: '元の投稿は削除されました',
  [BrightHubStrings.ThreadView_ReplyCountSingular]: '1件の返信',
  [BrightHubStrings.ThreadView_ReplyCountPluralTemplate]: '{COUNT}件の返信',
  [BrightHubStrings.ThreadView_ParticipantCountSingular]: '1人の参加者',
  [BrightHubStrings.ThreadView_ParticipantCountPluralTemplate]:
    '{COUNT}人の参加者',
  [BrightHubStrings.ThreadView_NoReplies]:
    'まだ返信がありません。最初に返信しましょう！',

  // FollowButton
  [BrightHubStrings.FollowButton_Follow]: 'フォロー',
  [BrightHubStrings.FollowButton_Following]: 'フォロー中',
  [BrightHubStrings.FollowButton_Unfollow]: 'フォロー解除',

  // LikeButton
  [BrightHubStrings.LikeButton_LikeAriaTemplate]: 'いいね、{COUNT}件のいいね',
  [BrightHubStrings.LikeButton_UnlikeAriaTemplate]:
    'いいね取消、{COUNT}件のいいね',

  // RepostButton
  [BrightHubStrings.RepostButton_RepostAriaTemplate]:
    'リポスト、{COUNT}件のリポスト',
  [BrightHubStrings.RepostButton_UndoRepostAriaTemplate]:
    'リポスト取消、{COUNT}件のリポスト',

  // UserProfileCard
  [BrightHubStrings.UserProfileCard_Verified]: '認証済み',
  [BrightHubStrings.UserProfileCard_ProtectedAccount]: '保護されたアカウント',
  [BrightHubStrings.UserProfileCard_ProfileOfTemplate]: '{NAME}のプロフィール',
  [BrightHubStrings.UserProfileCard_Following]: 'フォロー中',
  [BrightHubStrings.UserProfileCard_Followers]: 'フォロワー',
  [BrightHubStrings.UserProfileCard_Friends]: '友達',
  [BrightHubStrings.UserProfileCard_FriendsTab]: '友達',
  [BrightHubStrings.UserProfileCard_FriendsHidden]:
    'このユーザーは友達リストを非公開にしています',
  [BrightHubStrings.UserProfileCard_StrongConnection]: '強いつながり',
  [BrightHubStrings.UserProfileCard_ModerateConnection]: '中程度のつながり',
  [BrightHubStrings.UserProfileCard_WeakConnection]: '弱いつながり',
  [BrightHubStrings.UserProfileCard_DormantConnection]: '休止中のつながり',
  [BrightHubStrings.UserProfileCard_MutualConnectionSingular]:
    '1人の共通のつながり',
  [BrightHubStrings.UserProfileCard_MutualConnectionPluralTemplate]:
    '{COUNT}人の共通のつながり',

  // ConnectionListManager
  [BrightHubStrings.ConnectionListManager_Title]: 'つながりリスト',
  [BrightHubStrings.ConnectionListManager_CreateList]: 'リストを作成',
  [BrightHubStrings.ConnectionListManager_EditList]: 'リストを編集',
  [BrightHubStrings.ConnectionListManager_DeleteList]: 'リストを削除',
  [BrightHubStrings.ConnectionListManager_DeleteConfirmTemplate]:
    '「{NAME}」を削除してもよろしいですか？すべてのメンバーが削除されます。',
  [BrightHubStrings.ConnectionListManager_DeleteConfirmAction]: '削除',
  [BrightHubStrings.ConnectionListManager_Cancel]: 'キャンセル',
  [BrightHubStrings.ConnectionListManager_Save]: '保存',
  [BrightHubStrings.ConnectionListManager_ListName]: 'リスト名',
  [BrightHubStrings.ConnectionListManager_ListDescription]: '説明',
  [BrightHubStrings.ConnectionListManager_Visibility]: '公開範囲',
  [BrightHubStrings.ConnectionListManager_VisibilityPrivate]: '非公開',
  [BrightHubStrings.ConnectionListManager_VisibilityFollowersOnly]:
    'フォロワーのみ',
  [BrightHubStrings.ConnectionListManager_VisibilityPublic]: '公開',
  [BrightHubStrings.ConnectionListManager_MembersTemplate]:
    '{COUNT}人のメンバー',
  [BrightHubStrings.ConnectionListManager_FollowersTemplate]:
    '{COUNT}人のフォロワー',
  [BrightHubStrings.ConnectionListManager_EmptyState]:
    'つながりリストはまだありません',
  [BrightHubStrings.ConnectionListManager_EmptyStateHint]:
    'リストを作成してつながりを整理しましょう。',
  [BrightHubStrings.ConnectionListManager_AddMembers]: 'メンバーを追加',
  [BrightHubStrings.ConnectionListManager_RemoveMembers]: 'メンバーを削除',
  [BrightHubStrings.ConnectionListManager_AddMembersTitle]:
    'リストにメンバーを追加',
  [BrightHubStrings.ConnectionListManager_RemoveMembersTitle]:
    'リストからメンバーを削除',
  [BrightHubStrings.ConnectionListManager_UserIdsPlaceholder]:
    'ユーザーIDを1行に1つずつ入力',
  [BrightHubStrings.ConnectionListManager_Loading]: 'リストを読み込み中…',
  [BrightHubStrings.ConnectionListManager_AriaLabel]: 'つながりリスト管理',

  // ConnectionListCard
  [BrightHubStrings.ConnectionListCard_AriaLabel]: 'つながりリスト：{NAME}',
  [BrightHubStrings.ConnectionListCard_MembersTemplate]: '{COUNT}人のメンバー',
  [BrightHubStrings.ConnectionListCard_FollowersTemplate]:
    '{COUNT}人のフォロワー',
  [BrightHubStrings.ConnectionListCard_VisibilityPrivate]: '非公開',
  [BrightHubStrings.ConnectionListCard_VisibilityFollowersOnly]:
    'フォロワーのみ',
  [BrightHubStrings.ConnectionListCard_VisibilityPublic]: '公開',
  [BrightHubStrings.ConnectionListCard_CreatedAtTemplate]: '{DATE}に作成',

  // ConnectionCategorySelector
  [BrightHubStrings.ConnectionCategorySelector_Title]: 'カテゴリー',
  [BrightHubStrings.ConnectionCategorySelector_AriaLabel]:
    'つながりカテゴリー選択',
  [BrightHubStrings.ConnectionCategorySelector_DefaultIndicator]: 'デフォルト',
  [BrightHubStrings.ConnectionCategorySelector_NoneAvailable]:
    '利用可能なカテゴリーがありません',

  // ConnectionNoteEditor
  [BrightHubStrings.ConnectionNoteEditor_Title]: 'メモ',
  [BrightHubStrings.ConnectionNoteEditor_AriaLabel]: 'つながりメモ',
  [BrightHubStrings.ConnectionNoteEditor_Placeholder]:
    'このつながりについてのプライベートメモを追加…',
  [BrightHubStrings.ConnectionNoteEditor_EmptyState]:
    'まだメモがありません。このつながりについてのプライベートメモを追加して、コンテキストを記録しましょう。',
  [BrightHubStrings.ConnectionNoteEditor_Save]: '保存',
  [BrightHubStrings.ConnectionNoteEditor_Delete]: '削除',
  [BrightHubStrings.ConnectionNoteEditor_Cancel]: 'キャンセル',
  [BrightHubStrings.ConnectionNoteEditor_DeleteConfirmTitle]:
    'メモを削除しますか？',
  [BrightHubStrings.ConnectionNoteEditor_DeleteConfirmMessage]:
    'このメモを削除してもよろしいですか？この操作は取り消せません。',
  [BrightHubStrings.ConnectionNoteEditor_DeleteConfirmAction]: '削除',

  // ConnectionSuggestions
  [BrightHubStrings.ConnectionSuggestions_Title]: 'おすすめのつながり',
  [BrightHubStrings.ConnectionSuggestions_AriaLabel]: 'つながりの提案',
  [BrightHubStrings.ConnectionSuggestions_EmptyState]:
    '現在おすすめはありません。後でもう一度確認してください！',
  [BrightHubStrings.ConnectionSuggestions_Loading]: 'おすすめを読み込み中…',
  [BrightHubStrings.ConnectionSuggestions_Follow]: 'フォロー',
  [BrightHubStrings.ConnectionSuggestions_Dismiss]: '非表示',
  [BrightHubStrings.ConnectionSuggestions_MutualCountSingular]:
    '1人の共通のつながり',
  [BrightHubStrings.ConnectionSuggestions_MutualCountPluralTemplate]:
    '{COUNT}人の共通のつながり',
  [BrightHubStrings.ConnectionSuggestions_ReasonMutualConnections]:
    '共通のつながりに基づく',
  [BrightHubStrings.ConnectionSuggestions_ReasonSimilarInterests]:
    '似た興味に基づく',
  [BrightHubStrings.ConnectionSuggestions_ReasonSimilarToUser]:
    'フォロー中のユーザーに類似',
  [BrightHubStrings.ConnectionSuggestions_ReasonMutualFriends]: '共通の友達',

  // MutualConnections
  [BrightHubStrings.MutualConnections_Title]: '共通のつながり',
  [BrightHubStrings.MutualConnections_AriaLabel]: '共通のつながり',
  [BrightHubStrings.MutualConnections_Loading]: '共通のつながりを読み込み中…',
  [BrightHubStrings.MutualConnections_EmptyState]: '共通のつながりはありません',
  [BrightHubStrings.MutualConnections_CountSingular]: '1人の共通のつながり',
  [BrightHubStrings.MutualConnections_CountPluralTemplate]:
    '{COUNT}人の共通のつながり',
  [BrightHubStrings.MutualConnections_LoadMore]: 'もっと見る',

  // ConnectionStrengthIndicator
  [BrightHubStrings.ConnectionStrengthIndicator_Title]: 'つながりの強さ',
  [BrightHubStrings.ConnectionStrengthIndicator_AriaLabel]:
    'つながりの強さインジケーター',
  [BrightHubStrings.ConnectionStrengthIndicator_Strong]: '強い',
  [BrightHubStrings.ConnectionStrengthIndicator_Moderate]: '中程度',
  [BrightHubStrings.ConnectionStrengthIndicator_Weak]: '弱い',
  [BrightHubStrings.ConnectionStrengthIndicator_Dormant]: '休止中',

  // HubManager
  [BrightHubStrings.HubManager_Title]: 'Hub',
  [BrightHubStrings.HubManager_AriaLabel]: 'Hub管理',
  [BrightHubStrings.HubManager_CreateHub]: 'Hubを作成',
  [BrightHubStrings.HubManager_EditHub]: 'Hubを編集',
  [BrightHubStrings.HubManager_DeleteHub]: 'Hubを削除',
  [BrightHubStrings.HubManager_HubName]: 'Hub名',
  [BrightHubStrings.HubManager_HubDescription]: '説明',
  [BrightHubStrings.HubManager_MembersTemplate]: '{COUNT}人のメンバー',
  [BrightHubStrings.HubManager_EmptyState]: 'まだHubがありません。',
  [BrightHubStrings.HubManager_EmptyStateHint]:
    'Hubを作成して、選んだつながりとコンテンツを共有しましょう。',
  [BrightHubStrings.HubManager_Save]: '保存',
  [BrightHubStrings.HubManager_Cancel]: 'キャンセル',
  [BrightHubStrings.HubManager_DeleteConfirmTemplate]:
    '「{NAME}」を削除してもよろしいですか？すべてのメンバーが削除されます。',
  [BrightHubStrings.HubManager_DeleteConfirmAction]: '削除',
  [BrightHubStrings.HubManager_AddMembers]: 'メンバーを追加',
  [BrightHubStrings.HubManager_AddMembersTitle]: 'Hubにメンバーを追加',
  [BrightHubStrings.HubManager_RemoveMembers]: 'メンバーを削除',
  [BrightHubStrings.HubManager_RemoveMembersTitle]: 'Hubからメンバーを削除',
  [BrightHubStrings.HubManager_UserIdsPlaceholder]:
    'ユーザーIDを1行に1つずつ入力',
  [BrightHubStrings.HubManager_Loading]: 'Hubを読み込み中…',
  [BrightHubStrings.HubManager_DefaultBadge]: 'デフォルト',

  // HubSelector
  [BrightHubStrings.HubSelector_Title]: '投稿の公開範囲',
  [BrightHubStrings.HubSelector_AriaLabel]: '投稿の公開範囲のHub選択',
  [BrightHubStrings.HubSelector_MembersTemplate]: '{COUNT}人のメンバー',
  [BrightHubStrings.HubSelector_NoneAvailable]: '利用可能なHubがありません。',
  [BrightHubStrings.HubSelector_NoneSelected]: 'すべてのフォロワーに公開',
  [BrightHubStrings.HubSelector_SelectedCountTemplate]:
    '{COUNT}個のHubを選択中',
  [BrightHubStrings.HubSelector_DefaultBadge]: 'デフォルト',

  // FollowRequestList
  [BrightHubStrings.FollowRequestList_Title]: 'フォローリクエスト',
  [BrightHubStrings.FollowRequestList_AriaLabel]: '保留中のフォローリクエスト',
  [BrightHubStrings.FollowRequestList_Loading]:
    'フォローリクエストを読み込み中…',
  [BrightHubStrings.FollowRequestList_EmptyState]:
    '保留中のフォローリクエストはありません',
  [BrightHubStrings.FollowRequestList_Approve]: '承認',
  [BrightHubStrings.FollowRequestList_Reject]: '拒否',
  [BrightHubStrings.FollowRequestList_PendingCountTemplate]:
    '{COUNT}件の保留中リクエスト',
  [BrightHubStrings.FollowRequestList_PendingCountSingular]:
    '1件の保留中リクエスト',
  [BrightHubStrings.FollowRequestList_CustomMessage]: 'メッセージ',

  // SearchResults
  [BrightHubStrings.SearchResults_AriaTemplate]: '「{QUERY}」の検索結果',
  [BrightHubStrings.SearchResults_TabAll]: 'すべて',
  [BrightHubStrings.SearchResults_TabPosts]: '投稿',
  [BrightHubStrings.SearchResults_TabPostsTemplate]: '投稿（{COUNT}）',
  [BrightHubStrings.SearchResults_TabUsers]: 'ユーザー',
  [BrightHubStrings.SearchResults_TabUsersTemplate]: 'ユーザー（{COUNT}）',
  [BrightHubStrings.SearchResults_NoResultsTemplate]:
    '「{QUERY}」の結果が見つかりません',
  [BrightHubStrings.SearchResults_EnterSearchTerm]:
    '検索語を入力して投稿やユーザーを検索',
  [BrightHubStrings.SearchResults_SectionPeople]: 'ユーザー',
  [BrightHubStrings.SearchResults_SectionPosts]: '投稿',
  [BrightHubStrings.SearchResults_Loading]: '検索結果を読み込み中',
  [BrightHubStrings.SearchResults_EndOfResults]: '結果の最後',

  // ConnectionPrivacySettings
  [BrightHubStrings.ConnectionPrivacySettings_Title]: 'プライバシー設定',
  [BrightHubStrings.ConnectionPrivacySettings_AriaLabel]:
    'つながりのプライバシー設定',
  [BrightHubStrings.ConnectionPrivacySettings_HideFollowerCount]:
    'フォロワー数を非表示',
  [BrightHubStrings.ConnectionPrivacySettings_HideFollowingCount]:
    'フォロー数を非表示',
  [BrightHubStrings.ConnectionPrivacySettings_HideFollowersFromNonFollowers]:
    'フォロワー以外にフォロワーを非表示',
  [BrightHubStrings.ConnectionPrivacySettings_HideFollowingFromNonFollowers]:
    'フォロワー以外にフォロー中を非表示',
  [BrightHubStrings.ConnectionPrivacySettings_AllowDmsFromNonFollowers]:
    'フォロワー以外からのDMを許可',
  [BrightHubStrings.ConnectionPrivacySettings_ShowOnlineStatus]:
    'オンラインステータスを表示',
  [BrightHubStrings.ConnectionPrivacySettings_ShowReadReceipts]:
    '既読通知を表示',
  [BrightHubStrings.ConnectionPrivacySettings_HideFriendsFromNonFriends]:
    '友達以外から友達リストを隠す',
  [BrightHubStrings.ConnectionPrivacySettings_ApproveFollowersMode]:
    'フォロワー承認モード',
  [BrightHubStrings.ConnectionPrivacySettings_ApproveNone]: 'すべて自動承認',
  [BrightHubStrings.ConnectionPrivacySettings_ApproveAll]: 'すべて承認が必要',
  [BrightHubStrings.ConnectionPrivacySettings_ApproveNonMutuals]:
    '相互フォロー以外は承認が必要',
  [BrightHubStrings.ConnectionPrivacySettings_Save]: '保存',

  // TemporaryMuteDialog
  [BrightHubStrings.TemporaryMuteDialog_Title]: 'ユーザーをミュート',
  [BrightHubStrings.TemporaryMuteDialog_AriaLabel]: '一時ミュートダイアログ',
  [BrightHubStrings.TemporaryMuteDialog_MuteUserTemplate]:
    '{USERNAME}をミュート',
  [BrightHubStrings.TemporaryMuteDialog_Duration1h]: '1時間',
  [BrightHubStrings.TemporaryMuteDialog_Duration8h]: '8時間',
  [BrightHubStrings.TemporaryMuteDialog_Duration24h]: '24時間',
  [BrightHubStrings.TemporaryMuteDialog_Duration7d]: '7日間',
  [BrightHubStrings.TemporaryMuteDialog_Duration30d]: '30日間',
  [BrightHubStrings.TemporaryMuteDialog_Permanent]: '永久にミュート',
  [BrightHubStrings.TemporaryMuteDialog_Mute]: 'ミュート',
  [BrightHubStrings.TemporaryMuteDialog_Cancel]: 'キャンセル',

  // ConnectionInsights
  [BrightHubStrings.ConnectionInsights_Title]: 'つながりインサイト',
  [BrightHubStrings.ConnectionInsights_AriaLabel]: 'つながりインサイト',
  [BrightHubStrings.ConnectionInsights_Period7d]: '7日間',
  [BrightHubStrings.ConnectionInsights_Period30d]: '30日間',
  [BrightHubStrings.ConnectionInsights_Period90d]: '90日間',
  [BrightHubStrings.ConnectionInsights_PeriodAllTime]: '全期間',
  [BrightHubStrings.ConnectionInsights_Interactions]: 'インタラクション',
  [BrightHubStrings.ConnectionInsights_Messages]: 'メッセージ',
  [BrightHubStrings.ConnectionInsights_Likes]: 'いいね',
  [BrightHubStrings.ConnectionInsights_Reposts]: 'リポスト',
  [BrightHubStrings.ConnectionInsights_Replies]: '返信',
  [BrightHubStrings.ConnectionInsights_EmptyState]:
    'インタラクションデータがありません',
  [BrightHubStrings.ConnectionInsights_Loading]:
    'つながりインサイトを読み込み中…',

  // ListTimelineFilter
  [BrightHubStrings.ListTimelineFilter_Title]: 'リストでフィルター',
  [BrightHubStrings.ListTimelineFilter_AriaLabel]:
    'つながりリストでタイムラインをフィルター',
  [BrightHubStrings.ListTimelineFilter_AllConnections]: 'すべてのつながり',
  [BrightHubStrings.ListTimelineFilter_SelectList]: 'リストを選択',
  [BrightHubStrings.ListTimelineFilter_MembersTemplate]:
    '（{COUNT}人のメンバー）',
  [BrightHubStrings.ListTimelineFilter_ClearFilter]: 'フィルターをクリア',

  // MessagingInbox
  [BrightHubStrings.MessagingInbox_Title]: 'メッセージ',
  [BrightHubStrings.MessagingInbox_AriaLabel]: 'メッセージ受信箱',
  [BrightHubStrings.MessagingInbox_Loading]: '会話を読み込み中',
  [BrightHubStrings.MessagingInbox_EmptyState]: 'まだ会話がありません。',
  [BrightHubStrings.MessagingInbox_EmptyStateHint]:
    '新しい会話を始めましょう。',
  [BrightHubStrings.MessagingInbox_Pinned]: 'ピン留め',
  [BrightHubStrings.MessagingInbox_UnreadTemplate]: '{COUNT}件の未読',
  [BrightHubStrings.MessagingInbox_NewConversation]: '新しい会話',
  [BrightHubStrings.MessagingInbox_GroupBadge]: 'グループ',

  // ConversationView
  [BrightHubStrings.ConversationView_AriaLabel]: '会話ビュー',
  [BrightHubStrings.ConversationView_Loading]: 'メッセージを読み込み中',
  [BrightHubStrings.ConversationView_EmptyState]:
    'まだメッセージがありません。最初のメッセージを送りましょう！',
  [BrightHubStrings.ConversationView_LoadMore]: 'もっと見る',

  // MessageComposer
  [BrightHubStrings.MessageComposer_Placeholder]: 'メッセージを入力…',
  [BrightHubStrings.MessageComposer_AriaLabel]: 'メッセージ作成',
  [BrightHubStrings.MessageComposer_Send]: '送信',
  [BrightHubStrings.MessageComposer_AttachFile]: 'ファイルを添付',
  [BrightHubStrings.MessageComposer_ReplyingTo]: '返信先',
  [BrightHubStrings.MessageComposer_CancelReply]: '返信をキャンセル',

  // MessageRequestsList
  [BrightHubStrings.MessageRequestsList_Title]: 'メッセージリクエスト',
  [BrightHubStrings.MessageRequestsList_AriaLabel]: 'メッセージリクエスト一覧',
  [BrightHubStrings.MessageRequestsList_Loading]: 'リクエストを読み込み中',
  [BrightHubStrings.MessageRequestsList_EmptyState]:
    '保留中のリクエストはありません。',
  [BrightHubStrings.MessageRequestsList_Accept]: '承認',
  [BrightHubStrings.MessageRequestsList_Decline]: '拒否',
  [BrightHubStrings.MessageRequestsList_PendingCountTemplate]:
    '{COUNT}件の保留中',

  // MessageBubble
  [BrightHubStrings.MessageBubble_AriaLabel]: 'メッセージ',
  [BrightHubStrings.MessageBubble_Edited]: '編集済み',
  [BrightHubStrings.MessageBubble_Forwarded]: '転送済み',
  [BrightHubStrings.MessageBubble_Deleted]: 'このメッセージは削除されました。',
  [BrightHubStrings.MessageBubble_ReplyTo]: '返信先',

  // TypingIndicator
  [BrightHubStrings.TypingIndicator_AriaLabel]: '入力中インジケーター',
  [BrightHubStrings.TypingIndicator_SingleTemplate]: '{NAME}が入力中…',
  [BrightHubStrings.TypingIndicator_MultipleTemplate]: '{COUNT}人が入力中…',

  // ReadReceipt
  [BrightHubStrings.ReadReceipt_AriaLabel]: '既読通知',
  [BrightHubStrings.ReadReceipt_Sent]: '送信済み',
  [BrightHubStrings.ReadReceipt_Delivered]: '配信済み',
  [BrightHubStrings.ReadReceipt_SeenTemplate]: '{TIMESTAMP}に既読',

  // MessageReactions
  [BrightHubStrings.MessageReactions_AriaLabel]: 'メッセージリアクション',
  [BrightHubStrings.MessageReactions_AddReaction]: 'リアクションを追加',
  [BrightHubStrings.MessageReactions_CountTemplate]: '{COUNT}',
  [BrightHubStrings.MessageReactions_RemoveReaction]: 'リアクションを削除',

  // GroupConversationSettings
  [BrightHubStrings.GroupConversationSettings_Title]: 'グループ設定',
  [BrightHubStrings.GroupConversationSettings_AriaLabel]: 'グループ会話設定',
  [BrightHubStrings.GroupConversationSettings_GroupName]: 'グループ名',
  [BrightHubStrings.GroupConversationSettings_GroupAvatar]: 'グループアバター',
  [BrightHubStrings.GroupConversationSettings_Participants]: '参加者',
  [BrightHubStrings.GroupConversationSettings_ParticipantCountTemplate]:
    '{COUNT}人の参加者',
  [BrightHubStrings.GroupConversationSettings_AddParticipant]: '参加者を追加',
  [BrightHubStrings.GroupConversationSettings_RemoveParticipant]:
    '参加者を削除',
  [BrightHubStrings.GroupConversationSettings_PromoteToAdmin]: '管理者に昇格',
  [BrightHubStrings.GroupConversationSettings_DemoteFromAdmin]:
    '管理者から降格',
  [BrightHubStrings.GroupConversationSettings_AdminBadge]: '管理者',
  [BrightHubStrings.GroupConversationSettings_Save]: '保存',
  [BrightHubStrings.GroupConversationSettings_Cancel]: 'キャンセル',
  [BrightHubStrings.GroupConversationSettings_LeaveGroup]: 'グループを退出',

  // NewConversationDialog
  [BrightHubStrings.NewConversationDialog_Title]: '新しい会話',
  [BrightHubStrings.NewConversationDialog_AriaLabel]: '新しい会話ダイアログ',
  [BrightHubStrings.NewConversationDialog_SearchPlaceholder]: 'ユーザーを検索…',
  [BrightHubStrings.NewConversationDialog_CreateGroup]: 'グループを作成',
  [BrightHubStrings.NewConversationDialog_GroupNamePlaceholder]: 'グループ名',
  [BrightHubStrings.NewConversationDialog_SelectedTemplate]:
    '{COUNT}人を選択中',
  [BrightHubStrings.NewConversationDialog_Start]: '開始',
  [BrightHubStrings.NewConversationDialog_Cancel]: 'キャンセル',
  [BrightHubStrings.NewConversationDialog_NoResults]:
    'ユーザーが見つかりません',

  // ConversationSearch
  [BrightHubStrings.ConversationSearch_Placeholder]: '会話内を検索…',
  [BrightHubStrings.ConversationSearch_AriaLabel]: '会話内検索',
  [BrightHubStrings.ConversationSearch_NoResults]: 'メッセージが見つかりません',
  [BrightHubStrings.ConversationSearch_ResultCountTemplate]: '{COUNT}件の結果',
  [BrightHubStrings.ConversationSearch_Clear]: '検索をクリア',

  // MessagingMenuBadge
  [BrightHubStrings.MessagingMenuBadge_AriaLabel]: 'メッセージ',
  [BrightHubStrings.MessagingMenuBadge_UnreadTemplate]:
    '{COUNT}件の未読メッセージ',
  [BrightHubStrings.MessagingMenuBadge_NoUnread]: '未読メッセージなし',

  // NotificationProvider
  [BrightHubStrings.NotificationProvider_Error]: '通知の読み込みに失敗しました',

  // NotificationBell
  [BrightHubStrings.NotificationBell_AriaLabel]: '通知',
  [BrightHubStrings.NotificationBell_UnreadTemplate]: '{COUNT}件の未読通知',
  [BrightHubStrings.NotificationBell_NoUnread]: '未読通知なし',
  [BrightHubStrings.NotificationBell_Overflow]: '99+',

  // NotificationDropdown
  [BrightHubStrings.NotificationDropdown_Title]: '通知',
  [BrightHubStrings.NotificationDropdown_AriaLabel]: '通知ドロップダウン',
  [BrightHubStrings.NotificationDropdown_ViewAll]: 'すべて表示',
  [BrightHubStrings.NotificationDropdown_MarkAllRead]: 'すべて既読にする',
  [BrightHubStrings.NotificationDropdown_EmptyState]: 'まだ通知はありません',
  [BrightHubStrings.NotificationDropdown_Loading]: '通知を読み込み中',

  // NotificationItem
  [BrightHubStrings.NotificationItem_AriaLabel]: '通知',
  [BrightHubStrings.NotificationItem_MarkRead]: '既読にする',
  [BrightHubStrings.NotificationItem_Delete]: '削除',
  [BrightHubStrings.NotificationItem_GroupExpandTemplate]:
    'さらに{COUNT}件を表示',
  [BrightHubStrings.NotificationItem_GroupCollapseTemplate]: '折りたたむ',

  // NotificationList
  [BrightHubStrings.NotificationList_Title]: '通知',
  [BrightHubStrings.NotificationList_AriaLabel]: '通知一覧',
  [BrightHubStrings.NotificationList_Loading]: '通知を読み込み中',
  [BrightHubStrings.NotificationList_EmptyState]: '通知はありません',
  [BrightHubStrings.NotificationList_FilterAll]: 'すべて',
  [BrightHubStrings.NotificationList_FilterUnread]: '未読',
  [BrightHubStrings.NotificationList_FilterRead]: '既読',
  [BrightHubStrings.NotificationList_LoadMore]: 'もっと見る',
  [BrightHubStrings.NotificationList_EndOfList]: '通知はこれ以上ありません',

  // NotificationPreferences
  [BrightHubStrings.NotificationPreferences_Title]: '通知設定',
  [BrightHubStrings.NotificationPreferences_AriaLabel]: '通知設定',
  [BrightHubStrings.NotificationPreferences_CategorySettings]: 'カテゴリー設定',
  [BrightHubStrings.NotificationPreferences_ChannelSettings]: 'チャンネル設定',
  [BrightHubStrings.NotificationPreferences_QuietHours]: 'おやすみ時間',
  [BrightHubStrings.NotificationPreferences_QuietHoursEnabled]:
    'おやすみ時間を有効にする',
  [BrightHubStrings.NotificationPreferences_QuietHoursStart]: '開始時刻',
  [BrightHubStrings.NotificationPreferences_QuietHoursEnd]: '終了時刻',
  [BrightHubStrings.NotificationPreferences_QuietHoursTimezone]: 'タイムゾーン',
  [BrightHubStrings.NotificationPreferences_DoNotDisturb]: 'おやすみモード',
  [BrightHubStrings.NotificationPreferences_DndEnabled]:
    'おやすみモードを有効にする',
  [BrightHubStrings.NotificationPreferences_DndDuration]: '期間',
  [BrightHubStrings.NotificationPreferences_SoundEnabled]: '通知音',
  [BrightHubStrings.NotificationPreferences_Save]: '保存',
  [BrightHubStrings.NotificationPreferences_CategorySocial]: 'ソーシャル',
  [BrightHubStrings.NotificationPreferences_CategoryMessages]: 'メッセージ',
  [BrightHubStrings.NotificationPreferences_CategoryConnections]: 'つながり',
  [BrightHubStrings.NotificationPreferences_CategorySystem]: 'システム',
  [BrightHubStrings.NotificationPreferences_ChannelInApp]: 'アプリ内',
  [BrightHubStrings.NotificationPreferences_ChannelEmail]: 'メール',
  [BrightHubStrings.NotificationPreferences_ChannelPush]: 'プッシュ',

  // NotificationCategoryFilter
  [BrightHubStrings.NotificationCategoryFilter_Title]: 'カテゴリーでフィルター',
  [BrightHubStrings.NotificationCategoryFilter_AriaLabel]:
    '通知カテゴリーフィルター',
  [BrightHubStrings.NotificationCategoryFilter_All]: 'すべて',
  [BrightHubStrings.NotificationCategoryFilter_Social]: 'ソーシャル',
  [BrightHubStrings.NotificationCategoryFilter_Messages]: 'メッセージ',
  [BrightHubStrings.NotificationCategoryFilter_Connections]: 'つながり',
  [BrightHubStrings.NotificationCategoryFilter_System]: 'システム',

  // Navigation / Sidebar
  [BrightHubStrings.Nav_Home]: 'ホーム',
  [BrightHubStrings.Nav_Explore]: '探索',
  [BrightHubStrings.Nav_Notifications]: '通知',
  [BrightHubStrings.Nav_Messages]: 'メッセージ',
  [BrightHubStrings.Nav_Profile]: 'プロフィール',
  [BrightHubStrings.Nav_Connections]: 'つながり',
  [BrightHubStrings.Nav_Settings]: '設定',
  [BrightHubStrings.Nav_SidebarLabel]: 'BrightHubナビゲーション',
  [BrightHubStrings.Nav_SubscribedHubs]: 'あなたのHub',
  [BrightHubStrings.Nav_CreateHub]: 'Hubを作成',

  // Hub Detail Page
  [BrightHubStrings.HubDetail_MembersTemplate]: '{COUNT}人のメンバー',
  [BrightHubStrings.HubDetail_PostsTemplate]: '{COUNT}件の投稿',
  [BrightHubStrings.HubDetail_Join]: '参加',
  [BrightHubStrings.HubDetail_Leave]: '退出',
  [BrightHubStrings.HubDetail_Joined]: '参加済み',
  [BrightHubStrings.HubDetail_TrustOpen]: 'オープン',
  [BrightHubStrings.HubDetail_TrustVerified]: '認証済み',
  [BrightHubStrings.HubDetail_TrustEncrypted]: '暗号化',
  [BrightHubStrings.HubDetail_About]: '概要',
  [BrightHubStrings.HubDetail_Rules]: 'ルール',
  [BrightHubStrings.HubDetail_SortHot]: '人気',
  [BrightHubStrings.HubDetail_SortNew]: '新着',
  [BrightHubStrings.HubDetail_SortTop]: 'トップ',
  [BrightHubStrings.HubDetail_EmptyState]:
    'まだ投稿がありません。最初のディスカッションを始めましょう！',
  [BrightHubStrings.HubDetail_SubHubs]: 'サブHub',

  // Explore Hubs Page
  [BrightHubStrings.Explore_Title]: 'Hubを探索',
  [BrightHubStrings.Explore_SearchPlaceholder]: 'Hubを検索…',
  [BrightHubStrings.Explore_Trending]: 'トレンド',
  [BrightHubStrings.Explore_New]: '新着',
  [BrightHubStrings.Explore_EmptyState]:
    'まだHubがありません。作成して始めましょう！',
  [BrightHubStrings.Explore_NoResults]: '検索に一致するHubはありません。',

  // Home Page Sections
  [BrightHubStrings.Home_TrendingHubs]: 'トレンドHub',
  [BrightHubStrings.Home_RecentActivity]: '最近のアクティビティ',
  [BrightHubStrings.Home_YourHubs]: 'あなたのHub',
  [BrightHubStrings.Home_SuggestedHubs]: 'おすすめHub',
  [BrightHubStrings.Home_ViewAll]: 'すべて表示',
  [BrightHubStrings.Home_Welcome]: 'BrightHubへようこそ',
  [BrightHubStrings.Home_WelcomeSubtitle]:
    'Hubに参加して、興味のあるコミュニティのディスカッションを見ましょう。',
  [BrightHubStrings.Home_NoHubsYet]: 'まだHubに参加していません',
  [BrightHubStrings.Home_NoHubsHint]:
    'Hubを探索して、興味のあるコミュニティを見つけましょう。',

  // Create Hub Page
  [BrightHubStrings.CreateHub_Title]: 'Hubを作成',
  [BrightHubStrings.CreateHub_NameLabel]: 'Hub名',
  [BrightHubStrings.CreateHub_NamePlaceholder]: '例：プログラミング',
  [BrightHubStrings.CreateHub_SlugLabel]: 'URLスラッグ',
  [BrightHubStrings.CreateHub_SlugPlaceholder]: '例：programming',
  [BrightHubStrings.CreateHub_DescriptionLabel]: '説明',
  [BrightHubStrings.CreateHub_DescriptionPlaceholder]:
    'このHubは何についてですか？',
  [BrightHubStrings.CreateHub_TrustTierLabel]: '信頼レベル',
  [BrightHubStrings.CreateHub_ParentHubLabel]: '親Hub（オプション）',
  [BrightHubStrings.CreateHub_ParentHubNone]: 'なし（トップレベルHub）',
  [BrightHubStrings.CreateHub_Submit]: 'Hubを作成',
  [BrightHubStrings.CreateHub_Cancel]: 'キャンセル',

  // Sidebar extras
  [BrightHubStrings.Nav_CreatePost]: '新規投稿',
  [BrightHubStrings.Nav_Trending]: 'トレンド',

  // PinnedPostSection
  [BrightHubStrings.PinnedPostSection_Pinned]: 'ピン留め',
  [BrightHubStrings.PinnedPostSection_Unpin]: 'ピン留めを外す',
  [BrightHubStrings.PinnedPostSection_AriaLabel]: 'ピン留めされた投稿',

  // EditProfileDialog
  [BrightHubStrings.EditProfileDialog_Title]: 'プロフィールを編集',
  [BrightHubStrings.EditProfileDialog_DisplayName]: '表示名',
  [BrightHubStrings.EditProfileDialog_Bio]: '自己紹介',
  [BrightHubStrings.EditProfileDialog_BioPlaceholder]: '自己紹介を書いてください。Markdownとアイコンがサポートされています。',
  [BrightHubStrings.EditProfileDialog_BioCharCountTemplate]: '{CURRENT}/{MAX}',
  [BrightHubStrings.EditProfileDialog_BioPreview]: 'プレビュー',
  [BrightHubStrings.EditProfileDialog_Location]: '場所',
  [BrightHubStrings.EditProfileDialog_WebsiteUrl]: 'ウェブサイト',
  [BrightHubStrings.EditProfileDialog_Save]: '保存',
  [BrightHubStrings.EditProfileDialog_Cancel]: 'キャンセル',
  [BrightHubStrings.EditProfileDialog_Saving]: '保存中\u2026',
  [BrightHubStrings.EditProfileDialog_ErrorBioTooLong]: '自己紹介が最大文字数 {MAX} を超えています。',
  [BrightHubStrings.EditProfileDialog_ErrorBioContainsImage]: '自己紹介に画像のMarkdown構文を含めることはできません。',

  // UserProfileCard
  [BrightHubStrings.UserProfileCard_EditProfile]: 'プロフィールを編集',
};
