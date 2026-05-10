import { RequiredBrandedStringsCollection } from '@digitaldefiance/i18n-lib';
import { BrightMailStrings } from '../../enumerations/brightMailStrings';

export const BrightMailJapaneseStrings: RequiredBrandedStringsCollection<
  typeof BrightMailStrings
> = {
  // Menu
  [BrightMailStrings.MenuLabel]: 'BrightMail',

  // Inbox
  [BrightMailStrings.Inbox_Title]: '受信トレイ',
  [BrightMailStrings.Inbox_Empty]: 'メールはまだありません',
  [BrightMailStrings.Inbox_Error]: '受信トレイの読み込みに失敗しました',
  [BrightMailStrings.Inbox_Retry]: '再試行',
  [BrightMailStrings.Inbox_UnreadCountTemplate]: '{COUNT} 件未読',

  // Compose
  [BrightMailStrings.Compose_Title]: '作成',
  [BrightMailStrings.Compose_To]: '宛先',
  [BrightMailStrings.Compose_Cc]: 'Cc',
  [BrightMailStrings.Compose_Bcc]: 'Bcc',
  [BrightMailStrings.Compose_Subject]: '件名',
  [BrightMailStrings.Compose_Body]: 'メッセージ',
  [BrightMailStrings.Compose_Send]: '送信',
  [BrightMailStrings.Compose_SendSuccess]: 'メールが正常に送信されました',
  [BrightMailStrings.Compose_SendError]: 'メールの送信に失敗しました',
  [BrightMailStrings.Compose_InvalidRecipient]:
    '有効な宛先を少なくとも1つ追加してください',
  [BrightMailStrings.Compose_Attachments]: '添付ファイル',
  [BrightMailStrings.Compose_ExternalRecipientsWarning]:
    'ECIES暗号化は外部の受信者には利用できません。暗号化が有効な状態で外部アドレスが含まれている間、送信は無効になります。',
  [BrightMailStrings.Compose_ExternalRecipientsWarningTemplate]:
    '外部の受信者（{ADDRESSES}）はローカルドメイン外にあり、ECIES暗号化メッセージを受信できません。',
  [BrightMailStrings.Compose_BounceWarningTitle]: '未確認の宛先',
  [BrightMailStrings.Compose_BounceWarningMessage]:
    '以下の宛先が見つからず、メッセージが返送される可能性があります：{ADDRESSES}。送信しますか？',
  [BrightMailStrings.Compose_BounceWarningSendAnyway]: 'そのまま送信',

  // Thread
  [BrightMailStrings.Thread_Error]: 'スレッドの読み込みに失敗しました',
  [BrightMailStrings.Thread_BackToInbox]: '受信トレイに戻る',
  [BrightMailStrings.Thread_Reply]: '返信',
  [BrightMailStrings.Thread_ReplyAll]: '全員に返信',
  [BrightMailStrings.Thread_Forward]: '転送',

  // Delete
  [BrightMailStrings.Delete_Confirm]: '本当に削除しますか？',
  [BrightMailStrings.Delete_ConfirmBulkTemplate]:
    '選択した {COUNT} 件のメールを削除しますか？',
  [BrightMailStrings.Delete_Success]: 'メールが削除されました',
  [BrightMailStrings.Delete_ErrorTemplate]:
    'メールの削除に失敗しました：{MESSAGE_ID}',

  // Sidebar / Navigation
  [BrightMailStrings.Nav_Inbox]: '受信トレイ',
  [BrightMailStrings.Nav_Sent]: '送信済み',
  [BrightMailStrings.Nav_Drafts]: '下書き',
  [BrightMailStrings.Nav_Trash]: 'ゴミ箱',
  [BrightMailStrings.Nav_Spam]: '迷惑メール',
  [BrightMailStrings.Nav_Labels]: 'ラベル',
  [BrightMailStrings.Nav_Calendar]: 'カレンダー',
  [BrightMailStrings.Nav_Compose]: '作成',
  [BrightMailStrings.Nav_MailFolders]: 'メールフォルダ',

  // Actions
  [BrightMailStrings.Action_Delete]: '削除',
  [BrightMailStrings.Action_MarkAsRead]: '既読にする',
  [BrightMailStrings.Action_Cancel]: 'キャンセル',
  [BrightMailStrings.Action_Discard]: '破棄',
  [BrightMailStrings.Action_Submit]: '送信',
  [BrightMailStrings.Action_Generate]: '生成',
  [BrightMailStrings.Action_Search]: '検索',
  [BrightMailStrings.Action_Import]: 'インポート',

  // General
  [BrightMailStrings.Loading]: '読み込み中...',
  [BrightMailStrings.NewMessage]: '新規メッセージ',
  [BrightMailStrings.DiscardDraftTitle]: '下書きを破棄しますか？',
  [BrightMailStrings.DiscardDraftMessage]:
    'メッセージに未保存の内容があります。破棄しますか？',

  // Attachment
  [BrightMailStrings.Attachment_AttachFiles]: 'ファイルを添付',
  [BrightMailStrings.Attachment_FileSizeExceededTemplate]:
    'ファイル「{FILENAME}」が{LIMIT}の制限を超えています',
  [BrightMailStrings.Attachment_TotalSizeExceeded]:
    '添付ファイルの合計が{LIMIT}の制限を超えています',
  [BrightMailStrings.Attachment_RemoveTemplate]: '{FILENAME}を削除',

  // Email List
  [BrightMailStrings.EmailList_SelectAll]: 'すべてのメールを選択',
  [BrightMailStrings.EmailList_AriaLabel]: 'メール一覧',
  [BrightMailStrings.EmailList_SelectEmailTemplate]:
    '{SENDER}からのメールを選択',
  [BrightMailStrings.EmailList_Header_Sender]: '差出人',
  [BrightMailStrings.EmailList_Header_Subject]: '件名',
  [BrightMailStrings.EmailList_Header_Date]: '日付',
  [BrightMailStrings.EmailList_Header_Status]: 'ステータス',
  [BrightMailStrings.EmailList_Status_Read]: '既読',
  [BrightMailStrings.EmailList_Status_Unread]: '未読',
  [BrightMailStrings.EmailList_Star]: 'スター付き',
  [BrightMailStrings.EmailList_Unstar]: 'スター解除',

  // Encryption
  [BrightMailStrings.Encryption_Label]: '暗号化',
  [BrightMailStrings.Encryption_None]: '暗号化なし',
  [BrightMailStrings.Encryption_ECIES]: 'ECIES',
  [BrightMailStrings.Encryption_GPG]: 'GPG',
  [BrightMailStrings.Encryption_SMIME]: 'S/MIME',
  [BrightMailStrings.Encryption_MissingKeysTemplate]:
    '以下の宛先に公開鍵がありません：{RECIPIENTS}',
  [BrightMailStrings.Encryption_SmimeCertRequired]:
    'S/MIME署名には設定で構成された証明書が必要です',
  [BrightMailStrings.Encryption_GpgKeyRequired]:
    'GPG署名には設定で構成された鍵ペアが必要です',
  [BrightMailStrings.Encryption_DefaultPreference]: 'デフォルト暗号化設定',
  [BrightMailStrings.Encryption_DefaultLabel]: 'デフォルト暗号化',

  // Key Management
  [BrightMailStrings.KeyMgmt_GpgKeypair]: 'GPG鍵ペア',
  [BrightMailStrings.KeyMgmt_SmimeCertificate]: 'S/MIME証明書',
  [BrightMailStrings.KeyMgmt_NoGpgKeypair]:
    'GPG鍵ペアが構成されていません。新しい鍵ペアを生成するか、公開鍵をインポートしてください。',
  [BrightMailStrings.KeyMgmt_NoSmimeCert]:
    'S/MIME証明書が構成されていません。S/MIME暗号化を有効にするには証明書をインポートしてください。',
  [BrightMailStrings.KeyMgmt_ExportPublicKey]: '公開鍵をエクスポート',
  [BrightMailStrings.KeyMgmt_PublishToKeyserver]: '鍵サーバーに公開',
  [BrightMailStrings.KeyMgmt_GenerateKeypair]: '鍵ペアを生成',
  [BrightMailStrings.KeyMgmt_ImportPublicKey]: '公開鍵をインポート',
  [BrightMailStrings.KeyMgmt_ReplaceKey]: '鍵を置換',
  [BrightMailStrings.KeyMgmt_ImportByEmail]: 'メールでインポート',
  [BrightMailStrings.KeyMgmt_ImportCertPem]: '証明書をインポート（PEM）',
  [BrightMailStrings.KeyMgmt_ReplaceCertificate]: '証明書を置換',
  [BrightMailStrings.KeyMgmt_ImportPkcs12]: 'PKCS#12をインポート',
  [BrightMailStrings.KeyMgmt_Passphrase]: 'パスフレーズ',
  [BrightMailStrings.KeyMgmt_Pkcs12Password]: 'PKCS#12パスワード',
  [BrightMailStrings.KeyMgmt_EmailAddress]: 'メールアドレス',
  [BrightMailStrings.KeyMgmt_DeleteGpgKeypair]: 'GPG鍵ペアを削除',
  [BrightMailStrings.KeyMgmt_DeleteGpgPublicKey]: 'GPG公開鍵を削除',
  [BrightMailStrings.KeyMgmt_DeleteSmimeCert]: 'S/MIME証明書を削除',
  [BrightMailStrings.KeyMgmt_CertExpired]: 'この証明書は期限切れです',
  [BrightMailStrings.KeyMgmt_ErrorInvalidCert]: '無効なX.509証明書ファイル',
  [BrightMailStrings.KeyMgmt_ErrorInvalidKey]: '無効なPGP公開鍵ファイル',
  [BrightMailStrings.KeyMgmt_ErrorUploadCert]:
    '証明書のアップロードに失敗しました',
  [BrightMailStrings.KeyMgmt_ErrorUploadKey]: '鍵のアップロードに失敗しました',
  [BrightMailStrings.KeyMgmt_ErrorDeleteCert]: '証明書の削除に失敗しました',
  [BrightMailStrings.KeyMgmt_ErrorDeleteKey]: '鍵の削除に失敗しました',
  [BrightMailStrings.KeyMgmt_ErrorGenerateKeypair]:
    'GPG鍵ペアの生成に失敗しました',
  [BrightMailStrings.KeyMgmt_ErrorExportKey]:
    'GPG公開鍵のエクスポートに失敗しました',
  [BrightMailStrings.KeyMgmt_ErrorPublishKey]:
    'GPG鍵の鍵サーバーへの公開に失敗しました',
  [BrightMailStrings.KeyMgmt_ErrorImportByEmail]:
    'メールによるGPG鍵のインポートに失敗しました',
  [BrightMailStrings.KeyMgmt_ErrorImportPkcs12]:
    'PKCS#12証明書のインポートに失敗しました',

  // Passphrase Dialog
  [BrightMailStrings.Passphrase_Title]: 'GPGパスフレーズを入力',
  [BrightMailStrings.Passphrase_Label]: 'パスフレーズ',

  // Reading Pane
  [BrightMailStrings.ReadingPane_Placeholder]: 'メールを選択して読む',

  // Recipient Chip Input
  [BrightMailStrings.Recipient_AddedOneTemplate]: '宛先を追加しました：{EMAIL}',
  [BrightMailStrings.Recipient_AddedManyTemplate]:
    '宛先を追加しました：{EMAILS}',
  [BrightMailStrings.Recipient_RemovedTemplate]: '宛先を削除しました：{EMAIL}',
  [BrightMailStrings.Recipient_NotFoundTemplate]:
    '{LOCAL}は{DOMAIN}で見つかりません',

  // Rich Text Editor
  [BrightMailStrings.RichText_Placeholder]: 'メッセージを作成...',
  [BrightMailStrings.RichText_Bold]: '太字',
  [BrightMailStrings.RichText_Italic]: '斜体',
  [BrightMailStrings.RichText_Underline]: '下線',
  [BrightMailStrings.RichText_OrderedList]: '番号付きリスト',
  [BrightMailStrings.RichText_UnorderedList]: '箇条書きリスト',
  [BrightMailStrings.RichText_Link]: 'リンク',
  [BrightMailStrings.RichText_EnterUrl]: 'URLを入力：',
  [BrightMailStrings.RichText_ToolbarLabel]: 'テキスト書式設定',

  // Compose Modal
  [BrightMailStrings.ComposeModal_Restore]: '作成を復元',
  [BrightMailStrings.ComposeModal_Minimize]: '作成を最小化',
  [BrightMailStrings.ComposeModal_Maximize]: '作成を最大化',
  [BrightMailStrings.ComposeModal_RestoreDown]: '作成サイズを復元',
  [BrightMailStrings.ComposeModal_Close]: '作成を閉じる',

  // GPG Setup Wizard
  [BrightMailStrings.GpgWizard_Title]: 'GPG暗号化のセットアップ',
  [BrightMailStrings.GpgWizard_WelcomeHeading]: 'GPGでメールを保護',
  [BrightMailStrings.GpgWizard_WelcomeBody]:
    'GPG（GNU Privacy Guard）を使用すると、メールを暗号化・署名して、意図した受信者のみが読めるようにできます。セットアップは1分もかかりません。',
  [BrightMailStrings.GpgWizard_EciesNote]:
    'BrightChainメンバーは、ネットワーク内のメッセージに対してECIES暗号化も自動的に利用できます。',
  [BrightMailStrings.GpgWizard_OptionGenerate]: '新しい鍵ペアを作成',
  [BrightMailStrings.GpgWizard_OptionGenerateDesc]:
    '推奨。安全な鍵ペアを自動生成します。',
  [BrightMailStrings.GpgWizard_OptionImport]: '既にGPG鍵を持っています',
  [BrightMailStrings.GpgWizard_OptionImportDesc]:
    'ファイル、クリップボード、または鍵サーバーから既存の公開鍵をインポートします。',
  [BrightMailStrings.GpgWizard_GenerateHeading]: 'パスフレーズを選択',
  [BrightMailStrings.GpgWizard_GenerateBody]:
    'パスフレーズは秘密鍵を保護します。覚えやすく推測しにくいものを選んでください。',
  [BrightMailStrings.GpgWizard_PassphraseLabel]: 'パスフレーズ',
  [BrightMailStrings.GpgWizard_PassphraseConfirmLabel]: 'パスフレーズの確認',
  [BrightMailStrings.GpgWizard_PassphraseMismatch]:
    'パスフレーズが一致しません',
  [BrightMailStrings.GpgWizard_PassphraseStrengthWeak]: '弱い',
  [BrightMailStrings.GpgWizard_PassphraseStrengthFair]: '普通',
  [BrightMailStrings.GpgWizard_PassphraseStrengthGood]: '良い',
  [BrightMailStrings.GpgWizard_PassphraseStrengthStrong]: '強い',
  [BrightMailStrings.GpgWizard_GenerateButton]: '鍵を生成',
  [BrightMailStrings.GpgWizard_Generating]: '鍵ペアを生成中…',
  [BrightMailStrings.GpgWizard_ImportHeading]: 'GPG鍵をインポート',
  [BrightMailStrings.GpgWizard_ImportTabFile]: 'ファイルをアップロード',
  [BrightMailStrings.GpgWizard_ImportTabPaste]: '鍵を貼り付け',
  [BrightMailStrings.GpgWizard_ImportTabKeyserver]: '鍵サーバーを検索',
  [BrightMailStrings.GpgWizard_ImportFilePrompt]:
    '.asc、.gpg、または.pubファイルを選択',
  [BrightMailStrings.GpgWizard_ImportPasteLabel]:
    'ASCIIアーマー形式の公開鍵を貼り付けてください',
  [BrightMailStrings.GpgWizard_ImportKeyserverLabel]: 'メールアドレス',
  [BrightMailStrings.GpgWizard_ImportKeyserverHint]:
    'このメールアドレスに一致する鍵を公開鍵サーバーで検索します。',
  [BrightMailStrings.GpgWizard_ImportButton]: '鍵をインポート',
  [BrightMailStrings.GpgWizard_Searching]: '鍵サーバーを検索中…',
  [BrightMailStrings.GpgWizard_SuccessHeading]: '準備完了！',
  [BrightMailStrings.GpgWizard_SuccessBody]:
    'GPG鍵の準備ができました。GPG暗号化メールの送受信が可能です。',
  [BrightMailStrings.GpgWizard_SuccessFingerprint]: '鍵のフィンガープリント',
  [BrightMailStrings.GpgWizard_PublishPrompt]:
    '公開鍵を公開して、他の人があなたに暗号化メールを送れるようにしましょう。',
  [BrightMailStrings.GpgWizard_PublishButton]: '鍵サーバーに公開',
  [BrightMailStrings.GpgWizard_SetDefaultPrompt]:
    'GPGを新しいメッセージのデフォルト暗号化に設定しますか？',
  [BrightMailStrings.GpgWizard_SetDefaultButton]: 'GPGをデフォルトに設定',
  [BrightMailStrings.GpgWizard_Done]: '完了',
  [BrightMailStrings.GpgWizard_Back]: '戻る',
  [BrightMailStrings.GpgWizard_Next]: '次へ',
  [BrightMailStrings.GpgWizard_ErrorGenerate]:
    '鍵ペアの生成に失敗しました。もう一度お試しください。',
  [BrightMailStrings.GpgWizard_ErrorImport]:
    '鍵のインポートに失敗しました。ファイルまたは鍵データを確認して再試行してください。',
  [BrightMailStrings.GpgWizard_ErrorPublish]:
    '鍵サーバーへの公開に失敗しました。',

  // Calendar Invite Card
  [BrightMailStrings.CalInvite_Title]: 'カレンダーの招待',
  [BrightMailStrings.CalInvite_Organizer]: '主催者',
  [BrightMailStrings.CalInvite_WhenTemplate]: '{START} – {END}',
  [BrightMailStrings.CalInvite_AllDay]: '終日',
  [BrightMailStrings.CalInvite_Location]: '場所',
  [BrightMailStrings.CalInvite_Description]: '説明',
  [BrightMailStrings.CalInvite_AttendeesTemplate]: '{COUNT} 名の参加者',
  [BrightMailStrings.CalInvite_Accept]: '承諾',
  [BrightMailStrings.CalInvite_Decline]: '辞退',
  [BrightMailStrings.CalInvite_Tentative]: '仮承諾',
  [BrightMailStrings.CalInvite_AddToCalendar]: 'カレンダーに追加',
  [BrightMailStrings.CalInvite_ViewInCalendar]: 'カレンダーで表示',
  [BrightMailStrings.CalInvite_AlreadyResponded]: '既に回答済みです',
  [BrightMailStrings.CalInvite_ResponseTemplate]: '回答済み: {RESPONSE}',
  [BrightMailStrings.CalInvite_Cancelled]: 'イベントがキャンセルされました',
  [BrightMailStrings.CalInvite_CancelledBody]:
    '主催者がこのイベントをキャンセルしました。',
  [BrightMailStrings.CalInvite_Updated]: 'イベントが更新されました',
  [BrightMailStrings.CalInvite_UpdatedBody]:
    '主催者がこのイベントを更新しました。',
  [BrightMailStrings.CalInvite_Counter]: '代替案の提案',
  [BrightMailStrings.CalInvite_CounterBody]:
    '参加者が新しい時間を提案しました。',
  [BrightMailStrings.CalInvite_ErrorRsvp]: '出欠の送信に失敗しました',
  [BrightMailStrings.CalInvite_ErrorImport]:
    'カレンダーへのイベントのインポートに失敗しました',
  [BrightMailStrings.CalInvite_SuccessAccepted]: '招待を承諾しました',
  [BrightMailStrings.CalInvite_SuccessDeclined]: '招待を辞退しました',
  [BrightMailStrings.CalInvite_SuccessTentative]: '招待を仮承諾しました',
};
