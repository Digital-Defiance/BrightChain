import { StringsCollection } from '@digitaldefiance/i18n-lib';
import {
  BrightHubStringKey,
  BrightHubStrings,
} from '../../../enumerations/brightHubStrings';

export const BrightHubJapaneseStrings: StringsCollection<BrightHubStringKey> = {
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
  [BrightHubStrings.UserProfileCard_StrongConnection]: '強いつながり',
  [BrightHubStrings.UserProfileCard_ModerateConnection]: '中程度のつながり',
  [BrightHubStrings.UserProfileCard_WeakConnection]: '弱いつながり',
  [BrightHubStrings.UserProfileCard_DormantConnection]: '休止中のつながり',
  [BrightHubStrings.UserProfileCard_MutualConnectionSingular]:
    '1人の共通のつながり',
  [BrightHubStrings.UserProfileCard_MutualConnectionPluralTemplate]:
    '{COUNT}人の共通のつながり',

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
};
