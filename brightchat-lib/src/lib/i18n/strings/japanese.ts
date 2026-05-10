import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightChatStringKey,
  BrightChatStrings,
} from '../../enumerations/brightChatStrings';

export const BrightChatJapaneseStrings: ComponentStrings<BrightChatStringKey> =
  {
    // Menu
    [BrightChatStrings.MenuLabel]: 'BrightChat',
    [BrightChatStrings.ChatSectionsLabel]: 'チャットセクション',
    [BrightChatStrings.Nav_Conversations]: '会話',
    [BrightChatStrings.Nav_Groups]: 'グループ',
    [BrightChatStrings.Nav_Channels]: 'チャンネル',
    [BrightChatStrings.Nav_DirectMessages]: 'ダイレクトメッセージ',

    // Server Rail
    [BrightChatStrings.Server_Rail]: 'サーバー',
    [BrightChatStrings.Server_Rail_Home]: 'ホーム',
    [BrightChatStrings.Server_Rail_CreateServer]: 'サーバーを作成',

    // Create Server Dialog
    [BrightChatStrings.Create_Server]: 'サーバーを作成',
    [BrightChatStrings.Create_Server_Title]: 'サーバーを作成',
    [BrightChatStrings.Create_Server_NameLabel]: 'サーバー名',
    [BrightChatStrings.Create_Server_NamePlaceholder]: 'サーバー名を入力',
    [BrightChatStrings.Create_Server_IconLabel]: 'サーバーアイコン',
    [BrightChatStrings.Create_Server_Submit]: '作成',
    [BrightChatStrings.Create_Server_Cancel]: 'キャンセル',

    // Channel Sidebar
    [BrightChatStrings.Channel_Sidebar]: 'チャンネル',
    [BrightChatStrings.Channel_Sidebar_CreateChannel]: 'チャンネルを作成',

    // Create Channel Dialog
    [BrightChatStrings.Create_Channel]: 'チャンネルを作成',
    [BrightChatStrings.Create_Channel_Title]: 'チャンネルを作成',
    [BrightChatStrings.Create_Channel_NameLabel]: 'チャンネル名',
    [BrightChatStrings.Create_Channel_TopicLabel]: 'トピック',
    [BrightChatStrings.Create_Channel_CategoryLabel]: 'カテゴリ',
    [BrightChatStrings.Create_Channel_Submit]: '作成',
    [BrightChatStrings.Create_Channel_Cancel]: 'キャンセル',

    // Create DM Dialog
    [BrightChatStrings.Create_DM]: '新しいメッセージ',
    [BrightChatStrings.Create_DM_Title]: '新しいダイレクトメッセージ',
    [BrightChatStrings.Create_DM_SearchPlaceholder]: 'ユーザーを検索',
    [BrightChatStrings.Create_DM_Submit]: '送信',
    [BrightChatStrings.Create_DM_Cancel]: 'キャンセル',
    [BrightChatStrings.Create_DM_NewMessage]: '新しいメッセージ',

    // Server Settings Panel
    [BrightChatStrings.Server_Settings]: 'サーバー設定',
    [BrightChatStrings.Server_Settings_Title]: 'サーバー設定',
    [BrightChatStrings.Server_Settings_Overview]: '概要',
    [BrightChatStrings.Server_Settings_Members]: 'メンバー',
    [BrightChatStrings.Server_Settings_Categories]: 'カテゴリ',
    [BrightChatStrings.Server_Settings_Invites]: '招待',
    [BrightChatStrings.Server_Settings_Save]: '変更を保存',

    // Channel Context Menu
    [BrightChatStrings.Channel_Edit]: 'チャンネルを編集',
    [BrightChatStrings.Channel_Delete]: 'チャンネルを削除',
    [BrightChatStrings.Channel_Mute]: 'チャンネルをミュート',

    // Edit Channel Dialog
    [BrightChatStrings.Edit_Channel_Title]: 'チャンネルを編集',
    [BrightChatStrings.Edit_Channel_NameLabel]: 'チャンネル名',
    [BrightChatStrings.Edit_Channel_TopicLabel]: 'トピック',
    [BrightChatStrings.Edit_Channel_Save]: '保存',
    [BrightChatStrings.Edit_Channel_Cancel]: 'キャンセル',
    [BrightChatStrings.Edit_Channel_Saving]: '保存中…',
    [BrightChatStrings.Edit_Channel_Failed]: 'チャンネルの更新に失敗しました',
    [BrightChatStrings.Edit_Channel_NameRequired]: 'チャンネル名は必須です',
    [BrightChatStrings.Edit_Channel_NameLength]:
      'チャンネル名は2〜100文字である必要があります',

    // Delete Channel Confirmation
    [BrightChatStrings.Delete_Channel_Title]: 'チャンネルを削除',
    [BrightChatStrings.Delete_Channel_Confirm]: '削除',
    [BrightChatStrings.Delete_Channel_Cancel]: 'キャンセル',
    [BrightChatStrings.Delete_Channel_Deleting]: '削除中…',
    [BrightChatStrings.Delete_Channel_Failed]: 'チャンネルの削除に失敗しました',

    // Presence Status Labels
    [BrightChatStrings.Presence_Online]: 'オンライン',
    [BrightChatStrings.Presence_Idle]: '退席中',
    [BrightChatStrings.Presence_DoNotDisturb]: '取り込み中',
    [BrightChatStrings.Presence_Offline]: 'オフライン',
    [BrightChatStrings.Presence_SetStatus]: 'ステータスを設定',

    // Breadcrumb Navigation
    [BrightChatStrings.Breadcrumb_BrightChat]: 'BrightChat',
    [BrightChatStrings.Breadcrumb_Conversation]: '会話',
    [BrightChatStrings.Breadcrumb_Group]: 'グループ',
    [BrightChatStrings.Breadcrumb_Channel]: 'チャンネル',

    // Channel Permissions (Discord-style)
    [BrightChatStrings.Channel_Permissions]: '権限',
    [BrightChatStrings.Channel_Permissions_Title]: 'チャンネル権限',
    [BrightChatStrings.Channel_Permissions_Role]: 'ロール',
    [BrightChatStrings.Channel_Permissions_SendMessages]: 'メッセージを送信',
    [BrightChatStrings.Channel_Permissions_ManageChannel]: 'チャンネルを管理',
    [BrightChatStrings.Channel_Permissions_ManageMembers]: 'メンバーを管理',
    [BrightChatStrings.Channel_Permissions_CreateInvites]: '招待を作成',
    [BrightChatStrings.Channel_Permissions_PinMessages]: 'メッセージをピン留め',
    [BrightChatStrings.Channel_Permissions_MuteMembers]: 'メンバーをミュート',
    [BrightChatStrings.Channel_Permissions_KickMembers]: 'メンバーをキック',
    [BrightChatStrings.Channel_Permissions_DeleteMessages]: 'メッセージを削除',

    // Channel Visibility
    [BrightChatStrings.Channel_Visibility_Public]: '公開',
    [BrightChatStrings.Channel_Visibility_Private]: 'プライベート',
    [BrightChatStrings.Channel_Visibility_Secret]: 'シークレット',
    [BrightChatStrings.Channel_Visibility_Public_Desc]: '誰でも閲覧・参加可能',
    [BrightChatStrings.Channel_Visibility_Private_Desc]: '招待のみ',
    [BrightChatStrings.Channel_Visibility_Secret_Desc]: '非メンバーには非表示',
    [BrightChatStrings.Compose_Placeholder]: '暗号化メッセージを入力...',
    [BrightChatStrings.Compose_SendLabel]: 'メッセージを送信',
    [BrightChatStrings.Compose_MessageNotDelivered]:
      'メッセージを配信できませんでした',
    [BrightChatStrings.Compose_SendFailed]: 'メッセージの送信に失敗しました',
    [BrightChatStrings.ConversationList_Title]: '会話',
    [BrightChatStrings.ConversationList_NewMessage]: '新しいメッセージ',
    [BrightChatStrings.ConversationList_Empty]:
      'ダイレクトメッセージはまだありません。',
    [BrightChatStrings.ConversationList_RecentChannels]: '最近のチャンネル',
    [BrightChatStrings.MessageThread_Empty]:
      'メッセージはまだありません。会話を始めましょう！',
    [BrightChatStrings.Create_Channel_NamePlaceholder]: '例: 一般',
    [BrightChatStrings.Create_Channel_TopicPlaceholder]:
      'このチャンネルの話題は？',
    [BrightChatStrings.Create_Channel_VisibilityLabel]: '公開設定',
    [BrightChatStrings.Create_Channel_NameRequired]: 'チャンネル名は必須です',
    [BrightChatStrings.Create_Channel_NameLength]:
      'チャンネル名は2〜100文字である必要があります',
    [BrightChatStrings.Create_Channel_Creating]: '作成中...',
    [BrightChatStrings.Create_Channel_Failed]: 'チャンネルの作成に失敗しました',
    [BrightChatStrings.Create_Channel_CategoryNone]: 'なし',
    [BrightChatStrings.Server_Settings_ServerNameLabel]: 'サーバー名',
    [BrightChatStrings.Server_Settings_IconUrlLabel]: 'アイコンURL',
    [BrightChatStrings.Server_Settings_Saving]: '保存中…',
    [BrightChatStrings.Server_Settings_GenerateInvite]: '招待を生成',
    [BrightChatStrings.Server_Settings_CopyToken]: 'トークンをコピー',
    [BrightChatStrings.Server_Settings_Uses]: '使用回数',
    [BrightChatStrings.Server_Settings_NewCategory]: '新しいカテゴリ',
    [BrightChatStrings.Server_Settings_AddCategory]: '追加',
    [BrightChatStrings.Server_Settings_ChannelCount]: 'チャンネル',
    [BrightChatStrings.Server_Settings_RemoveMember]: 'メンバーを削除',
    [BrightChatStrings.Server_Settings_DeleteCategory]: 'カテゴリを削除',
    [BrightChatStrings.Server_Settings_DeleteServer]: 'サーバーを削除',
    [BrightChatStrings.Server_Settings_DeleteServerConfirm]: 'このサーバーを削除してもよろしいですか？すべてのチャンネルとメッセージが完全に失われます。',
    [BrightChatStrings.Server_Settings_DeleteServerConfirmTitle]: 'サーバーを削除',
    [BrightChatStrings.DMSidebar_NoConversations]: 'まだ会話がありません',
    [BrightChatStrings.DMSidebar_NoGroups]: 'まだグループチャットがありません',

    // Encryption
    [BrightChatStrings.Encryption_E2E]: 'エンドツーエンド暗号化',
    [BrightChatStrings.Encryption_E2E_AriaLabel]:
      'この会話はエンドツーエンドで暗号化されています',
    [BrightChatStrings.Encryption_EncryptedServer]: '暗号化サーバー',
    [BrightChatStrings.Encryption_ServerEncrypted]: '暗号化済み',

    // Key Rotation
    [BrightChatStrings.KeyRotation_MemberJoined]:
      '暗号化キーが更新されました — メンバーが参加しました',
    [BrightChatStrings.KeyRotation_MemberLeft]:
      '暗号化キーが更新されました — メンバーが退出しました',
    [BrightChatStrings.KeyRotation_MemberRemoved]:
      '暗号化キーが更新されました — メンバーが削除されました',

    // Channel List View
    [BrightChatStrings.ChannelList_Title]: 'チャンネル',
    [BrightChatStrings.ChannelList_Empty]: 'まだチャンネルがありません。',
    [BrightChatStrings.ChannelList_Join]: '参加',
    [BrightChatStrings.ChannelList_Joining]: '参加中…',
    [BrightChatStrings.ChannelList_MemberCount]: 'メンバー',

    // Group List View
    [BrightChatStrings.GroupList_Title]: 'グループ',
    [BrightChatStrings.GroupList_Empty]: 'まだグループがありません。',
    [BrightChatStrings.GroupList_MemberCount]: 'メンバー',

    // Create Server Dialog extras
    [BrightChatStrings.Create_Server_IconLabelOptional]: 'アイコンURL（任意）',
    [BrightChatStrings.Create_Server_Creating]: '作成中…',
    [BrightChatStrings.Create_Server_NameRequired]: 'サーバー名は必須です',
    [BrightChatStrings.Create_Server_NameTooLong]:
      'サーバー名は100文字以内にしてください',
    [BrightChatStrings.Create_Server_Failed]: 'サーバーの作成に失敗しました',

    // Create DM Dialog extras
    [BrightChatStrings.Create_DM_SearchLabel]: 'ユーザーを検索',
    [BrightChatStrings.Create_DM_SearchHint]: '名前を入力…',
    [BrightChatStrings.Create_DM_NoUsersFound]: 'ユーザーが見つかりません',
    [BrightChatStrings.Create_DM_SelectUser]: 'ユーザーを選択してください',
    [BrightChatStrings.Create_DM_Starting]: '開始中…',
    [BrightChatStrings.Create_DM_StartConversation]: '会話を開始',
    [BrightChatStrings.Create_DM_Failed]: '会話の開始に失敗しました',

    // Channel Permissions Panel
    [BrightChatStrings.Permissions_SelectChannel]:
      'チャンネルを選択して権限を表示します。',
    [BrightChatStrings.Permissions_PermissionsFor]: '権限の対象',
    [BrightChatStrings.Permissions_MembersWith]: 'ロールを持つメンバー',
    [BrightChatStrings.Permissions_NoMembers]: 'このロールのメンバーはいません',
    [BrightChatStrings.Permissions_Joined]: '参加日',
    [BrightChatStrings.Permissions_DeleteOwnMessages]: '自分のメッセージを削除',
    [BrightChatStrings.Permissions_DeleteAnyMessage]: '任意のメッセージを削除',
    [BrightChatStrings.Permissions_ManageRoles]: 'ロールを管理',

    // Roles
    [BrightChatStrings.Role_Owner]: 'オーナー',
    [BrightChatStrings.Role_Admin]: '管理者',
    [BrightChatStrings.Role_Moderator]: 'モデレーター',
    [BrightChatStrings.Role_Member]: 'メンバー',

    // Channel Sidebar extras
    [BrightChatStrings.Channel_Sidebar_Uncategorized]: '未分類',

    // Message Thread extras
    [BrightChatStrings.MessageThread_Pinned]: 'ピン留めされたメッセージ',
    [BrightChatStrings.MessageThread_Edited]: '（編集済み）',
    [BrightChatStrings.MessageThread_TypingSingle]: '入力中…',
    [BrightChatStrings.MessageThread_TypingMultiple]: '入力中…',

    // Layout
    [BrightChatStrings.Layout_BreadcrumbLabel]: 'BrightChat パンくずリスト',
    [BrightChatStrings.Layout_UserProfile]: 'ユーザープロフィール',
    [BrightChatStrings.Layout_OpenNavigation]: 'ナビゲーションを開く',

    // Friends Suggestion Section
    [BrightChatStrings.Friends_SectionTitle]: 'フレンド',

    // Server Icon Upload
    [BrightChatStrings.Server_Icon_Upload]: 'アイコンをアップロード',
    [BrightChatStrings.Server_Icon_Change]: 'アイコンを変更',
    [BrightChatStrings.Server_Icon_Remove]: 'アイコンを削除',
    [BrightChatStrings.Server_Icon_RemoveConfirm]:
      'サーバーアイコンを削除してもよろしいですか？',
    [BrightChatStrings.Server_Icon_RemoveConfirmTitle]:
      'サーバーアイコンの削除',
    [BrightChatStrings.Server_Icon_Uploading]: 'アップロード中…',
    [BrightChatStrings.Server_Icon_UploadFailed]:
      'アイコンのアップロードに失敗しました',
    [BrightChatStrings.Server_Icon_UploadSuccess]:
      'アイコンが正常にアップロードされました',
    [BrightChatStrings.Server_Icon_FileTooLarge]:
      'ファイルが大きすぎます。最大サイズは5MBです。',
    [BrightChatStrings.Server_Icon_InvalidType]:
      '無効なファイル形式です。許可される形式: PNG、JPEG、GIF、WebP。',
    [BrightChatStrings.Server_Icon_CropTitle]: 'サーバーアイコンの切り抜き',
    [BrightChatStrings.Server_Icon_CropConfirm]: '適用',
    [BrightChatStrings.Server_Icon_CropCancel]: 'キャンセル',
    [BrightChatStrings.Server_Icon_ZoomLabel]: 'ズーム',
    [BrightChatStrings.Server_Icon_PreviewAlt]: 'サーバーアイコンのプレビュー',
    [BrightChatStrings.Server_Icon_UploadLabel]:
      'サーバーアイコンをアップロード',
    [BrightChatStrings.Server_Icon_DropOrBrowse]:
      '画像をドロップするかクリックして選択',
    [BrightChatStrings.Server_Icon_StagingFailed]:
      'アップロード用のファイル準備に失敗しました',
    [BrightChatStrings.Server_Icon_StagingExpired]:
      '準備されたファイルの有効期限が切れました。画像を再度選択してください。',

    // FontAwesome Icon Picker
    [BrightChatStrings.IconPicker_Title]: 'アイコンを選択',
    [BrightChatStrings.IconPicker_SearchPlaceholder]: 'アイコンを検索...',
    [BrightChatStrings.IconPicker_NoMatchTemplate]:
      '「{0}」に一致するアイコンはありません',
    [BrightChatStrings.IconPicker_Cancel]: 'キャンセル',
    [BrightChatStrings.IconPicker_RemoveIcon]: 'アイコンを削除',
    [BrightChatStrings.IconPicker_CurrentLabel]: '現在:',
  };
