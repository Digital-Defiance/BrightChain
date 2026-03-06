import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightPassStringKey,
  BrightPassStrings,
} from '../../../enumerations/brightPassStrings';

export const BrightPassJapaneseStrings: ComponentStrings<BrightPassStringKey> =
  {
    // Menu
    [BrightPassStrings.Menu_BrightPass]: 'BrightPass',

    // Vault List
    [BrightPassStrings.VaultList_Title]: '保管庫',
    [BrightPassStrings.VaultList_CreateVaultName]: '保管庫名',
    [BrightPassStrings.VaultList_CreateVault]: '保管庫を作成',
    [BrightPassStrings.VaultList_DeleteVault]: '保管庫を削除',
    [BrightPassStrings.VaultList_SharedWithTemplate]: '{COUNT}人のメンバーと共有',
    [BrightPassStrings.VaultList_NoVaults]:
      '保管庫がありません。作成して始めましょう。',

    // Vault Detail
    [BrightPassStrings.VaultDetail_TitleNameTemplate]: '保管庫: {NAME}',
    [BrightPassStrings.VaultDetail_AddEntry]: 'エントリを追加',
    [BrightPassStrings.VaultDetail_LockVault]: '保管庫をロック',
    [BrightPassStrings.VaultDetail_Search]: 'エントリを検索…',
    [BrightPassStrings.VaultDetail_NoEntries]:
      'エントリがありません。追加して始めましょう。',
    [BrightPassStrings.VaultDetail_Favorite]: 'お気に入り',
    [BrightPassStrings.VaultDetail_ConfirmLockTitle]:
      '保管庫をロックしますか？',
    [BrightPassStrings.VaultDetail_ConfirmLockMessage]:
      'ページから離れます。保管庫をロックしますか？',
    [BrightPassStrings.VaultDetail_Cancel]: 'キャンセル',
    [BrightPassStrings.VaultDetail_Confirm]: 'ロック',

    // Entry Types
    [BrightPassStrings.EntryType_Login]: 'ログイン',
    [BrightPassStrings.EntryType_SecureNote]: 'セキュアノート',
    [BrightPassStrings.EntryType_CreditCard]: 'クレジットカード',
    [BrightPassStrings.EntryType_Identity]: 'ID情報',

    // Password Generator
    [BrightPassStrings.PasswordGen_Title]: 'パスワード生成',
    [BrightPassStrings.PasswordGen_Length]: '長さ',
    [BrightPassStrings.PasswordGen_Generate]: '生成',
    [BrightPassStrings.PasswordGen_Copy]: 'コピー',
    [BrightPassStrings.PasswordGen_UsePassword]: 'パスワードを使用',
    [BrightPassStrings.PasswordGen_Strength_Weak]: '弱い',
    [BrightPassStrings.PasswordGen_Strength_Fair]: '普通',
    [BrightPassStrings.PasswordGen_Strength_Strong]: '強い',
    [BrightPassStrings.PasswordGen_Strength_VeryStrong]: '非常に強い',
    [BrightPassStrings.PasswordGen_Uppercase]: '大文字',
    [BrightPassStrings.PasswordGen_Lowercase]: '小文字',
    [BrightPassStrings.PasswordGen_Digits]: '数字',
    [BrightPassStrings.PasswordGen_Symbols]: '記号',
    [BrightPassStrings.PasswordGen_Copied]: 'コピーしました！',
    [BrightPassStrings.PasswordGen_Entropy]: '{BITS}ビットのエントロピー',

    // TOTP
    [BrightPassStrings.TOTP_Title]: 'TOTP認証',
    [BrightPassStrings.TOTP_Code]: '現在のコード',
    [BrightPassStrings.TOTP_CopyCode]: 'コードをコピー',
    [BrightPassStrings.TOTP_Copied]: 'コピーしました！',
    [BrightPassStrings.TOTP_SecondsRemainingTemplate]: '残り{SECONDS}秒',
    [BrightPassStrings.TOTP_QrCode]: 'QRコード',
    [BrightPassStrings.TOTP_SecretUri]: 'シークレットURI',

    // Breach Check
    [BrightPassStrings.Breach_Title]: '漏洩チェック',
    [BrightPassStrings.Breach_Check]: 'チェック',
    [BrightPassStrings.Breach_Password]: 'チェックするパスワード',
    [BrightPassStrings.Breach_FoundTemplate]:
      'このパスワードは{COUNT}件のデータ漏洩で見つかりました。',
    [BrightPassStrings.Breach_NotFound]:
      'このパスワードは既知のデータ漏洩では見つかりませんでした。',

    // Audit Log
    [BrightPassStrings.AuditLog_Title]: '監査ログ',
    [BrightPassStrings.AuditLog_Timestamp]: 'タイムスタンプ',
    [BrightPassStrings.AuditLog_Action]: 'アクション',
    [BrightPassStrings.AuditLog_Member]: 'メンバーID',
    [BrightPassStrings.AuditLog_FilterAll]: 'すべてのアクション',
    [BrightPassStrings.AuditLog_NoEntries]:
      '監査ログのエントリが見つかりません。',
    [BrightPassStrings.AuditLog_Error]:
      '監査ログの読み込みに失敗しました。もう一度お試しください。',

    // Breadcrumb Navigation
    [BrightPassStrings.Breadcrumb_BrightPass]: 'BrightPass',
    [BrightPassStrings.Breadcrumb_VaultTemplate]: '保管庫: {NAME}',
    [BrightPassStrings.Breadcrumb_AuditLog]: '監査ログ',
    [BrightPassStrings.Breadcrumb_PasswordGenerator]: 'パスワード生成',
    [BrightPassStrings.Breadcrumb_Tools]: 'ツール',

    // Vault List Dialogs
    [BrightPassStrings.VaultList_ConfirmDelete]: '保管庫を削除',
    [BrightPassStrings.VaultList_ConfirmDeleteMessageTemplate]:
      'マスターパスワードを入力して保管庫「{NAME}」を削除してください。この操作は元に戻せません。',
    [BrightPassStrings.VaultList_EnterMasterPassword]:
      'マスターパスワードを入力',
    [BrightPassStrings.VaultList_ConfirmMasterPassword]:
      'マスターパスワードを確認',
    [BrightPassStrings.VaultList_PasswordsMustMatch]:
      'マスターパスワードと確認が一致する必要があります。',
    [BrightPassStrings.VaultList_Cancel]: 'キャンセル',
    [BrightPassStrings.VaultList_Confirm]: '確認',
    [BrightPassStrings.VaultList_Unlock]: 'ロック解除',
    [BrightPassStrings.VaultList_UnlockVault]: '保管庫のロックを解除',

    // Validation Messages
    [BrightPassStrings.Validation_VaultNameMinLengthTemplate]:
      '保管庫名は{MIN_LENGTH}文字以上である必要があります',
    [BrightPassStrings.Validation_VaultNameMaxLengthTemplate]:
      '保管庫名は{MAX_LENGTH}文字以下である必要があります',
    [BrightPassStrings.Validation_VaultNameRequired]: '保管庫名は必須です',
    [BrightPassStrings.Validation_PasswordMinLengthTemplate]:
      'マスターパスワードは{MIN_LENGTH}文字以上である必要があります',
    [BrightPassStrings.Validation_PasswordUppercase]:
      '大文字を少なくとも1文字含める必要があります',
    [BrightPassStrings.Validation_PasswordLowercase]:
      '小文字を少なくとも1文字含める必要があります',
    [BrightPassStrings.Validation_PasswordNumber]:
      '数字を少なくとも1文字含める必要があります',
    [BrightPassStrings.Validation_PasswordSpecialChar]:
      '特殊文字を少なくとも1文字含める必要があります',
    [BrightPassStrings.Validation_PasswordRequired]:
      'マスターパスワードは必須です',
    [BrightPassStrings.Validation_ConfirmPasswordRequired]:
      'マスターパスワードを確認してください',

    // Entry Detail
    [BrightPassStrings.EntryDetail_Title]: 'エントリの詳細',
    [BrightPassStrings.EntryDetail_Edit]: '編集',
    [BrightPassStrings.EntryDetail_Delete]: '削除',
    [BrightPassStrings.EntryDetail_ConfirmDelete]: 'エントリを削除',
    [BrightPassStrings.EntryDetail_ConfirmDeleteMessage]:
      'このエントリを削除してもよろしいですか？この操作は元に戻せません。',
    [BrightPassStrings.EntryDetail_Username]: 'ユーザー名',
    [BrightPassStrings.EntryDetail_Password]: 'パスワード',
    [BrightPassStrings.EntryDetail_SiteUrl]: 'サイトURL',
    [BrightPassStrings.EntryDetail_TotpSecret]: 'TOTPシークレット',
    [BrightPassStrings.EntryDetail_Content]: '内容',
    [BrightPassStrings.EntryDetail_CardholderName]: 'カード名義人',
    [BrightPassStrings.EntryDetail_CardNumber]: 'カード番号',
    [BrightPassStrings.EntryDetail_ExpirationDate]: '有効期限',
    [BrightPassStrings.EntryDetail_CVV]: 'CVV',
    [BrightPassStrings.EntryDetail_FirstName]: '名',
    [BrightPassStrings.EntryDetail_LastName]: '姓',
    [BrightPassStrings.EntryDetail_Email]: 'メール',
    [BrightPassStrings.EntryDetail_Phone]: '電話番号',
    [BrightPassStrings.EntryDetail_Address]: '住所',
    [BrightPassStrings.EntryDetail_Notes]: 'メモ',
    [BrightPassStrings.EntryDetail_Tags]: 'タグ',
    [BrightPassStrings.EntryDetail_CreatedAt]: '作成日',
    [BrightPassStrings.EntryDetail_UpdatedAt]: '更新日',
    [BrightPassStrings.EntryDetail_BreachWarningTemplate]:
      'このパスワードは{COUNT}件のデータ漏洩で見つかりました！',
    [BrightPassStrings.EntryDetail_BreachSafe]:
      'このパスワードは既知のデータ漏洩では見つかりませんでした。',
    [BrightPassStrings.EntryDetail_ShowPassword]: '表示',
    [BrightPassStrings.EntryDetail_HidePassword]: '非表示',
    [BrightPassStrings.EntryDetail_Cancel]: 'キャンセル',

    // Entry Form
    [BrightPassStrings.EntryForm_Title_Create]: 'エントリを作成',
    [BrightPassStrings.EntryForm_Title_Edit]: 'エントリを編集',
    [BrightPassStrings.EntryForm_FieldTitle]: 'タイトル',
    [BrightPassStrings.EntryForm_FieldNotes]: 'メモ',
    [BrightPassStrings.EntryForm_FieldTags]: 'タグ（カンマ区切り）',
    [BrightPassStrings.EntryForm_FieldFavorite]: 'お気に入り',
    [BrightPassStrings.EntryForm_Save]: '保存',
    [BrightPassStrings.EntryForm_Cancel]: 'キャンセル',
    [BrightPassStrings.EntryForm_GeneratePassword]: '生成',
    [BrightPassStrings.EntryForm_TotpSecretHelp]:
      'base32シークレットまたはotpauth:// URIを入力',

    // SearchBar
    [BrightPassStrings.SearchBar_Placeholder]:
      'タイトル、タグ、またはURLで検索\u2026',
    [BrightPassStrings.SearchBar_FilterFavorites]: 'お気に入り',
    [BrightPassStrings.SearchBar_NoResults]: '一致するエントリが見つかりません',

    // Emergency Access Dialog
    [BrightPassStrings.Emergency_Title]: '緊急アクセス',
    [BrightPassStrings.Emergency_Configure]: '設定',
    [BrightPassStrings.Emergency_Recover]: '復旧',
    [BrightPassStrings.Emergency_Threshold]: 'しきい値（必要な最小受託者数）',
    [BrightPassStrings.Emergency_Trustees]: '受託者メンバーID（カンマ区切り）',
    [BrightPassStrings.Emergency_Shares]: '暗号化シェア {INDEX}',
    [BrightPassStrings.Emergency_InsufficientSharesTemplate]:
      'シェアが不足しています。少なくとも{THRESHOLD}個のシェアが必要です。',
    [BrightPassStrings.Emergency_InvalidThreshold]:
      'しきい値は1から受託者数の間でなければなりません。',
    [BrightPassStrings.Emergency_Close]: '閉じる',
    [BrightPassStrings.Emergency_Error]:
      'エラーが発生しました。もう一度お試しください。',
    [BrightPassStrings.Emergency_Success]: '操作が正常に完了しました。',

    // Share Dialog
    [BrightPassStrings.Share_Title]: '保管庫を共有',
    [BrightPassStrings.Share_SearchMembers]: '名前またはメールでメンバーを検索',
    [BrightPassStrings.Share_Add]: '追加',
    [BrightPassStrings.Share_Revoke]: '取り消し',
    [BrightPassStrings.Share_CurrentRecipients]: '現在の共有先',
    [BrightPassStrings.Share_NoRecipients]:
      'この保管庫はまだ誰とも共有されていません。',
    [BrightPassStrings.Share_Close]: '閉じる',
    [BrightPassStrings.Share_Error]:
      'エラーが発生しました。もう一度お試しください。',

    // Import Dialog
    [BrightPassStrings.Import_Title]: 'エントリをインポート',
    [BrightPassStrings.Import_SelectFormat]: 'フォーマットを選択',
    [BrightPassStrings.Import_Upload]: 'ファイルをアップロード',
    [BrightPassStrings.Import_Import]: 'インポート',
    [BrightPassStrings.Import_Close]: '閉じる',
    [BrightPassStrings.Import_Summary]: 'インポート結果',
    [BrightPassStrings.Import_ImportedTemplate]:
      '{COUNT}件のエントリが正常にインポートされました',
    [BrightPassStrings.Import_SkippedTemplate]:
      '{COUNT}件のエントリがスキップされました',
    [BrightPassStrings.Import_ErrorsTemplate]: '行{INDEX}: {MESSAGE}',
    [BrightPassStrings.Import_InvalidFormat]:
      'アップロードされたファイルは選択されたフォーマットと一致しません。',
    [BrightPassStrings.Import_Error]:
      'インポート中にエラーが発生しました。もう一度お試しください。',

    // Errors
    [BrightPassStrings.Error_InvalidMasterPassword]:
      'マスターパスワードが無効です。',
    [BrightPassStrings.Error_VaultNotFound]: '保管庫が見つかりません。',
    [BrightPassStrings.Error_Unauthorized]:
      'このアクションを実行する権限がありません。',
    [BrightPassStrings.Error_Generic]:
      '予期しないエラーが発生しました。もう一度お試しください。',
  };
