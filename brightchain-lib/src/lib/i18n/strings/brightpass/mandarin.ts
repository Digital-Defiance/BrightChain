import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightPassStringKey,
  BrightPassStrings,
} from '../../../enumerations/brightPassStrings';

export const BrightPassMandarinStrings: ComponentStrings<BrightPassStringKey> =
  {
    // Menu
    [BrightPassStrings.Menu_BrightPass]: 'BrightPass',

    // Vault List
    [BrightPassStrings.VaultList_Title]: '保险库',
    [BrightPassStrings.VaultList_CreateVaultName]: '保险库名称',
    [BrightPassStrings.VaultList_CreateVault]: '创建保险库',
    [BrightPassStrings.VaultList_DeleteVault]: '删除保险库',
    [BrightPassStrings.VaultList_SharedWithTemplate]: '与{COUNT}位成员共享',
    [BrightPassStrings.VaultList_NoVaults]: '暂无保险库。创建一个开始使用吧。',

    // Vault Detail
    [BrightPassStrings.VaultDetail_TitleNameTemplate]: '保险库: {NAME}',
    [BrightPassStrings.VaultDetail_AddEntry]: '添加条目',
    [BrightPassStrings.VaultDetail_LockVault]: '锁定保险库',
    [BrightPassStrings.VaultDetail_Search]: '搜索条目…',
    [BrightPassStrings.VaultDetail_NoEntries]: '暂无条目。添加一个开始使用吧。',
    [BrightPassStrings.VaultDetail_Favorite]: '收藏',
    [BrightPassStrings.VaultDetail_ConfirmLockTitle]: '锁定保险库？',
    [BrightPassStrings.VaultDetail_ConfirmLockMessage]:
      '您正在离开页面。是否要锁定保险库？',
    [BrightPassStrings.VaultDetail_Cancel]: '取消',
    [BrightPassStrings.VaultDetail_Confirm]: '锁定',

    // Entry Types
    [BrightPassStrings.EntryType_Login]: '登录',
    [BrightPassStrings.EntryType_SecureNote]: '安全笔记',
    [BrightPassStrings.EntryType_CreditCard]: '信用卡',
    [BrightPassStrings.EntryType_Identity]: '身份信息',

    // Password Generator
    [BrightPassStrings.PasswordGen_Title]: '密码生成器',
    [BrightPassStrings.PasswordGen_Length]: '长度',
    [BrightPassStrings.PasswordGen_Generate]: '生成',
    [BrightPassStrings.PasswordGen_Copy]: '复制',
    [BrightPassStrings.PasswordGen_UsePassword]: '使用密码',
    [BrightPassStrings.PasswordGen_Strength_Weak]: '弱',
    [BrightPassStrings.PasswordGen_Strength_Fair]: '一般',
    [BrightPassStrings.PasswordGen_Strength_Strong]: '强',
    [BrightPassStrings.PasswordGen_Strength_VeryStrong]: '非常强',
    [BrightPassStrings.PasswordGen_Uppercase]: '大写字母',
    [BrightPassStrings.PasswordGen_Lowercase]: '小写字母',
    [BrightPassStrings.PasswordGen_Digits]: '数字',
    [BrightPassStrings.PasswordGen_Symbols]: '符号',
    [BrightPassStrings.PasswordGen_Copied]: '已复制！',
    [BrightPassStrings.PasswordGen_Entropy]: '{BITS}位熵',

    // TOTP
    [BrightPassStrings.TOTP_Title]: 'TOTP验证器',
    [BrightPassStrings.TOTP_Code]: '当前验证码',
    [BrightPassStrings.TOTP_CopyCode]: '复制验证码',
    [BrightPassStrings.TOTP_Copied]: '已复制！',
    [BrightPassStrings.TOTP_SecondsRemainingTemplate]: '剩余{SECONDS}秒',
    [BrightPassStrings.TOTP_QrCode]: '二维码',
    [BrightPassStrings.TOTP_SecretUri]: '密钥URI',

    // Breach Check
    [BrightPassStrings.Breach_Title]: '泄露检查',
    [BrightPassStrings.Breach_Check]: '检查泄露',
    [BrightPassStrings.Breach_Password]: '要检查的密码',
    [BrightPassStrings.Breach_FoundTemplate]: '此密码在{COUNT}次数据泄露中被发现。',
    [BrightPassStrings.Breach_NotFound]: '此密码未在任何已知数据泄露中被发现。',

    // Audit Log
    [BrightPassStrings.AuditLog_Title]: '审计日志',
    [BrightPassStrings.AuditLog_Timestamp]: '时间戳',
    [BrightPassStrings.AuditLog_Action]: '操作',
    [BrightPassStrings.AuditLog_Member]: '成员ID',
    [BrightPassStrings.AuditLog_FilterAll]: '所有操作',
    [BrightPassStrings.AuditLog_NoEntries]: '未找到审计日志条目。',
    [BrightPassStrings.AuditLog_Error]: '加载审计日志失败，请重试。',

    // Breadcrumb Navigation
    [BrightPassStrings.Breadcrumb_BrightPass]: 'BrightPass',
    [BrightPassStrings.Breadcrumb_VaultTemplate]: '保险库: {NAME}',
    [BrightPassStrings.Breadcrumb_AuditLog]: '审计日志',
    [BrightPassStrings.Breadcrumb_PasswordGenerator]: '密码生成器',
    [BrightPassStrings.Breadcrumb_Tools]: '工具',

    // Vault List Dialogs
    [BrightPassStrings.VaultList_ConfirmDelete]: '删除保险库',
    [BrightPassStrings.VaultList_ConfirmDeleteMessageTemplate]:
      '输入您的主密码以删除保险库"{NAME}"。此操作无法撤销。',
    [BrightPassStrings.VaultList_EnterMasterPassword]: '输入主密码',
    [BrightPassStrings.VaultList_ConfirmMasterPassword]: '确认主密码',
    [BrightPassStrings.VaultList_PasswordsMustMatch]:
      '主密码和确认密码必须匹配。',
    [BrightPassStrings.VaultList_Cancel]: '取消',
    [BrightPassStrings.VaultList_Confirm]: '确认',
    [BrightPassStrings.VaultList_Unlock]: '解锁',
    [BrightPassStrings.VaultList_UnlockVault]: '解锁保险库',

    // Validation Messages
    [BrightPassStrings.Validation_VaultNameMinLengthTemplate]:
      '保险库名称必须至少{MIN_LENGTH}个字符',
    [BrightPassStrings.Validation_VaultNameMaxLengthTemplate]:
      '保险库名称最多{MAX_LENGTH}个字符',
    [BrightPassStrings.Validation_VaultNameRequired]: '保险库名称为必填项',
    [BrightPassStrings.Validation_PasswordMinLengthTemplate]:
      '主密码必须至少{MIN_LENGTH}个字符',
    [BrightPassStrings.Validation_PasswordUppercase]:
      '必须包含至少一个大写字母',
    [BrightPassStrings.Validation_PasswordLowercase]:
      '必须包含至少一个小写字母',
    [BrightPassStrings.Validation_PasswordNumber]: '必须包含至少一个数字',
    [BrightPassStrings.Validation_PasswordSpecialChar]:
      '必须包含至少一个特殊字符',
    [BrightPassStrings.Validation_PasswordRequired]: '主密码为必填项',
    [BrightPassStrings.Validation_ConfirmPasswordRequired]: '请确认您的主密码',

    // Entry Detail
    [BrightPassStrings.EntryDetail_Title]: '条目详情',
    [BrightPassStrings.EntryDetail_Edit]: '编辑',
    [BrightPassStrings.EntryDetail_Delete]: '删除',
    [BrightPassStrings.EntryDetail_ConfirmDelete]: '删除条目',
    [BrightPassStrings.EntryDetail_ConfirmDeleteMessage]:
      '确定要删除此条目吗？此操作无法撤销。',
    [BrightPassStrings.EntryDetail_Username]: '用户名',
    [BrightPassStrings.EntryDetail_Password]: '密码',
    [BrightPassStrings.EntryDetail_SiteUrl]: '网站URL',
    [BrightPassStrings.EntryDetail_TotpSecret]: 'TOTP密钥',
    [BrightPassStrings.EntryDetail_Content]: '内容',
    [BrightPassStrings.EntryDetail_CardholderName]: '持卡人姓名',
    [BrightPassStrings.EntryDetail_CardNumber]: '卡号',
    [BrightPassStrings.EntryDetail_ExpirationDate]: '有效期',
    [BrightPassStrings.EntryDetail_CVV]: 'CVV',
    [BrightPassStrings.EntryDetail_FirstName]: '名',
    [BrightPassStrings.EntryDetail_LastName]: '姓',
    [BrightPassStrings.EntryDetail_Email]: '电子邮件',
    [BrightPassStrings.EntryDetail_Phone]: '电话',
    [BrightPassStrings.EntryDetail_Address]: '地址',
    [BrightPassStrings.EntryDetail_Notes]: '备注',
    [BrightPassStrings.EntryDetail_Tags]: '标签',
    [BrightPassStrings.EntryDetail_CreatedAt]: '创建时间',
    [BrightPassStrings.EntryDetail_UpdatedAt]: '更新时间',
    [BrightPassStrings.EntryDetail_BreachWarningTemplate]:
      '此密码在{COUNT}次数据泄露中被发现！',
    [BrightPassStrings.EntryDetail_BreachSafe]:
      '此密码未在任何已知数据泄露中被发现。',
    [BrightPassStrings.EntryDetail_ShowPassword]: '显示',
    [BrightPassStrings.EntryDetail_HidePassword]: '隐藏',
    [BrightPassStrings.EntryDetail_Cancel]: '取消',

    // Entry Form
    [BrightPassStrings.EntryForm_Title_Create]: '创建条目',
    [BrightPassStrings.EntryForm_Title_Edit]: '编辑条目',
    [BrightPassStrings.EntryForm_FieldTitle]: '标题',
    [BrightPassStrings.EntryForm_FieldNotes]: '备注',
    [BrightPassStrings.EntryForm_FieldTags]: '标签（逗号分隔）',
    [BrightPassStrings.EntryForm_FieldFavorite]: '收藏',
    [BrightPassStrings.EntryForm_Save]: '保存',
    [BrightPassStrings.EntryForm_Cancel]: '取消',
    [BrightPassStrings.EntryForm_GeneratePassword]: '生成',
    [BrightPassStrings.EntryForm_TotpSecretHelp]:
      '输入base32密钥或otpauth:// URI',

    // SearchBar
    [BrightPassStrings.SearchBar_Placeholder]: '按标题、标签或URL搜索\u2026',
    [BrightPassStrings.SearchBar_FilterFavorites]: '收藏',
    [BrightPassStrings.SearchBar_NoResults]: '未找到匹配的条目',

    // Emergency Access Dialog
    [BrightPassStrings.Emergency_Title]: '紧急访问',
    [BrightPassStrings.Emergency_Configure]: '配置',
    [BrightPassStrings.Emergency_Recover]: '恢复',
    [BrightPassStrings.Emergency_Threshold]: '阈值（所需最少受托人数）',
    [BrightPassStrings.Emergency_Trustees]: '受托人成员ID（逗号分隔）',
    [BrightPassStrings.Emergency_Shares]: '加密份额 {INDEX}',
    [BrightPassStrings.Emergency_InsufficientSharesTemplate]:
      '份额不足。至少需要{THRESHOLD}个份额。',
    [BrightPassStrings.Emergency_InvalidThreshold]:
      '阈值必须在1和受托人数量之间。',
    [BrightPassStrings.Emergency_Close]: '关闭',
    [BrightPassStrings.Emergency_Error]: '发生错误，请重试。',
    [BrightPassStrings.Emergency_Success]: '操作成功完成。',

    // Share Dialog
    [BrightPassStrings.Share_Title]: '共享保险库',
    [BrightPassStrings.Share_SearchMembers]: '按姓名或邮箱搜索成员',
    [BrightPassStrings.Share_Add]: '添加',
    [BrightPassStrings.Share_Revoke]: '撤销',
    [BrightPassStrings.Share_CurrentRecipients]: '当前共享对象',
    [BrightPassStrings.Share_NoRecipients]: '此保险库尚未与任何人共享。',
    [BrightPassStrings.Share_Close]: '关闭',
    [BrightPassStrings.Share_Error]: '发生错误，请重试。',

    // Import Dialog
    [BrightPassStrings.Import_Title]: '导入条目',
    [BrightPassStrings.Import_SelectFormat]: '选择格式',
    [BrightPassStrings.Import_Upload]: '上传文件',
    [BrightPassStrings.Import_Import]: '导入',
    [BrightPassStrings.Import_Close]: '关闭',
    [BrightPassStrings.Import_Summary]: '导入摘要',
    [BrightPassStrings.Import_ImportedTemplate]: '成功导入{COUNT}个条目',
    [BrightPassStrings.Import_SkippedTemplate]: '跳过{COUNT}个条目',
    [BrightPassStrings.Import_ErrorsTemplate]: '第{INDEX}行：{MESSAGE}',
    [BrightPassStrings.Import_InvalidFormat]: '上传的文件与所选格式不匹配。',
    [BrightPassStrings.Import_Error]: '导入过程中发生错误，请重试。',

    // Errors
    [BrightPassStrings.Error_InvalidMasterPassword]: '主密码无效。',
    [BrightPassStrings.Error_VaultNotFound]: '未找到保险库。',
    [BrightPassStrings.Error_Unauthorized]: '您无权执行此操作。',
    [BrightPassStrings.Error_Generic]: '发生意外错误，请重试。',
  };
