import { RequiredBrandedStringsCollection } from '@digitaldefiance/i18n-lib';
import { BrightMailStrings } from '../../enumerations/brightMailStrings';

export const BrightMailMandarinStrings: RequiredBrandedStringsCollection<
  typeof BrightMailStrings
> = {
  // Menu
  [BrightMailStrings.MenuLabel]: 'BrightMail',

  // Inbox
  [BrightMailStrings.Inbox_Title]: '收件箱',
  [BrightMailStrings.Inbox_Empty]: '暂无邮件',
  [BrightMailStrings.Inbox_Error]: '加载收件箱失败',
  [BrightMailStrings.Inbox_Retry]: '重试',
  [BrightMailStrings.Inbox_UnreadCountTemplate]: '{COUNT} 封未读',

  // Compose
  [BrightMailStrings.Compose_Title]: '撰写',
  [BrightMailStrings.Compose_To]: '收件人',
  [BrightMailStrings.Compose_Cc]: '抄送',
  [BrightMailStrings.Compose_Bcc]: '密送',
  [BrightMailStrings.Compose_Subject]: '主题',
  [BrightMailStrings.Compose_Body]: '正文',
  [BrightMailStrings.Compose_Send]: '发送',
  [BrightMailStrings.Compose_SendSuccess]: '邮件发送成功',
  [BrightMailStrings.Compose_SendError]: '邮件发送失败',
  [BrightMailStrings.Compose_InvalidRecipient]: '请添加至少一个有效的收件人',
  [BrightMailStrings.Compose_Attachments]: '附件',
  [BrightMailStrings.Compose_ExternalRecipientsWarning]:
    'ECIES加密不适用于外部收件人。在启用加密的情况下存在外部地址时，发送功能将被禁用。',
  [BrightMailStrings.Compose_ExternalRecipientsWarningTemplate]:
    '外部收件人（{ADDRESSES}）不在本地域内，无法接收ECIES加密消息。',
  [BrightMailStrings.Compose_BounceWarningTitle]: '未验证的收件人',
  [BrightMailStrings.Compose_BounceWarningMessage]:
    '以下收件人未找到，您的邮件可能会被退回：{ADDRESSES}。仍然发送吗？',
  [BrightMailStrings.Compose_BounceWarningSendAnyway]: '仍然发送',

  // Thread
  [BrightMailStrings.Thread_Error]: '加载会话失败',
  [BrightMailStrings.Thread_BackToInbox]: '返回收件箱',
  [BrightMailStrings.Thread_Reply]: '回复',
  [BrightMailStrings.Thread_ReplyAll]: '回复全部',
  [BrightMailStrings.Thread_Forward]: '转发',

  // Delete
  [BrightMailStrings.Delete_Confirm]: '确定要删除吗？',
  [BrightMailStrings.Delete_ConfirmBulkTemplate]: '删除 {COUNT} 封选中的邮件？',
  [BrightMailStrings.Delete_Success]: '邮件已删除',
  [BrightMailStrings.Delete_ErrorTemplate]: '删除邮件失败：{MESSAGE_ID}',

  // Sidebar / Navigation
  [BrightMailStrings.Nav_Inbox]: '收件箱',
  [BrightMailStrings.Nav_Sent]: '已发送',
  [BrightMailStrings.Nav_Drafts]: '草稿',
  [BrightMailStrings.Nav_Trash]: '垃圾箱',
  [BrightMailStrings.Nav_Spam]: '垃圾邮件',
  [BrightMailStrings.Nav_Labels]: '标签',
  [BrightMailStrings.Nav_Calendar]: '日历',
  [BrightMailStrings.Nav_Compose]: '撰写',
  [BrightMailStrings.Nav_MailFolders]: '邮件文件夹',

  // Actions
  [BrightMailStrings.Action_Delete]: '删除',
  [BrightMailStrings.Action_MarkAsRead]: '标记为已读',
  [BrightMailStrings.Action_Cancel]: '取消',
  [BrightMailStrings.Action_Discard]: '丢弃',
  [BrightMailStrings.Action_Submit]: '提交',
  [BrightMailStrings.Action_Generate]: '生成',
  [BrightMailStrings.Action_Search]: '搜索',
  [BrightMailStrings.Action_Import]: '导入',

  // General
  [BrightMailStrings.Loading]: '加载中...',
  [BrightMailStrings.NewMessage]: '新消息',
  [BrightMailStrings.DiscardDraftTitle]: '丢弃草稿？',
  [BrightMailStrings.DiscardDraftMessage]: '您的消息有未保存的内容。是否丢弃？',

  // Attachment
  [BrightMailStrings.Attachment_AttachFiles]: '添加附件',
  [BrightMailStrings.Attachment_FileSizeExceededTemplate]:
    '文件"{FILENAME}"超过了{LIMIT}的限制',
  [BrightMailStrings.Attachment_TotalSizeExceeded]:
    '附件总大小超过了{LIMIT}的限制',
  [BrightMailStrings.Attachment_RemoveTemplate]: '移除{FILENAME}',

  // Email List
  [BrightMailStrings.EmailList_SelectAll]: '全选邮件',
  [BrightMailStrings.EmailList_AriaLabel]: '邮件列表',
  [BrightMailStrings.EmailList_SelectEmailTemplate]: '选择来自{SENDER}的邮件',
  [BrightMailStrings.EmailList_Header_Sender]: '发件人',
  [BrightMailStrings.EmailList_Header_Subject]: '主题',
  [BrightMailStrings.EmailList_Header_Date]: '日期',
  [BrightMailStrings.EmailList_Header_Status]: '状态',
  [BrightMailStrings.EmailList_Status_Read]: '已读',
  [BrightMailStrings.EmailList_Status_Unread]: '未读',
  [BrightMailStrings.EmailList_Star]: '加星标',
  [BrightMailStrings.EmailList_Unstar]: '取消星标',

  // Encryption
  [BrightMailStrings.Encryption_Label]: '加密',
  [BrightMailStrings.Encryption_None]: '不加密',
  [BrightMailStrings.Encryption_ECIES]: 'ECIES',
  [BrightMailStrings.Encryption_GPG]: 'GPG',
  [BrightMailStrings.Encryption_SMIME]: 'S/MIME',
  [BrightMailStrings.Encryption_MissingKeysTemplate]:
    '以下收件人缺少公钥：{RECIPIENTS}',
  [BrightMailStrings.Encryption_SmimeCertRequired]:
    'S/MIME签名需要在设置中配置证书',
  [BrightMailStrings.Encryption_GpgKeyRequired]:
    'GPG签名需要在设置中配置密钥对',
  [BrightMailStrings.Encryption_DefaultPreference]: '默认加密偏好',
  [BrightMailStrings.Encryption_DefaultLabel]: '默认加密',

  // Key Management
  [BrightMailStrings.KeyMgmt_GpgKeypair]: 'GPG密钥对',
  [BrightMailStrings.KeyMgmt_SmimeCertificate]: 'S/MIME证书',
  [BrightMailStrings.KeyMgmt_NoGpgKeypair]:
    '未配置GPG密钥对。请生成新的密钥对或导入公钥。',
  [BrightMailStrings.KeyMgmt_NoSmimeCert]:
    '未配置S/MIME证书。请导入证书以启用S/MIME加密。',
  [BrightMailStrings.KeyMgmt_ExportPublicKey]: '导出公钥',
  [BrightMailStrings.KeyMgmt_PublishToKeyserver]: '发布到密钥服务器',
  [BrightMailStrings.KeyMgmt_GenerateKeypair]: '生成密钥对',
  [BrightMailStrings.KeyMgmt_ImportPublicKey]: '导入公钥',
  [BrightMailStrings.KeyMgmt_ReplaceKey]: '替换密钥',
  [BrightMailStrings.KeyMgmt_ImportByEmail]: '通过邮件导入',
  [BrightMailStrings.KeyMgmt_ImportCertPem]: '导入证书（PEM）',
  [BrightMailStrings.KeyMgmt_ReplaceCertificate]: '替换证书',
  [BrightMailStrings.KeyMgmt_ImportPkcs12]: '导入PKCS#12',
  [BrightMailStrings.KeyMgmt_Passphrase]: '密码短语',
  [BrightMailStrings.KeyMgmt_Pkcs12Password]: 'PKCS#12密码',
  [BrightMailStrings.KeyMgmt_EmailAddress]: '电子邮件地址',
  [BrightMailStrings.KeyMgmt_DeleteGpgKeypair]: '删除GPG密钥对',
  [BrightMailStrings.KeyMgmt_DeleteGpgPublicKey]: '删除GPG公钥',
  [BrightMailStrings.KeyMgmt_DeleteSmimeCert]: '删除S/MIME证书',
  [BrightMailStrings.KeyMgmt_CertExpired]: '此证书已过期',
  [BrightMailStrings.KeyMgmt_ErrorInvalidCert]: '无效的X.509证书文件',
  [BrightMailStrings.KeyMgmt_ErrorInvalidKey]: '无效的PGP公钥文件',
  [BrightMailStrings.KeyMgmt_ErrorUploadCert]: '上传证书失败',
  [BrightMailStrings.KeyMgmt_ErrorUploadKey]: '上传密钥失败',
  [BrightMailStrings.KeyMgmt_ErrorDeleteCert]: '删除证书失败',
  [BrightMailStrings.KeyMgmt_ErrorDeleteKey]: '删除密钥失败',
  [BrightMailStrings.KeyMgmt_ErrorGenerateKeypair]: '生成GPG密钥对失败',
  [BrightMailStrings.KeyMgmt_ErrorExportKey]: '导出GPG公钥失败',
  [BrightMailStrings.KeyMgmt_ErrorPublishKey]: '将GPG密钥发布到密钥服务器失败',
  [BrightMailStrings.KeyMgmt_ErrorImportByEmail]: '通过邮件导入GPG密钥失败',
  [BrightMailStrings.KeyMgmt_ErrorImportPkcs12]: '导入PKCS#12证书失败',

  // Passphrase Dialog
  [BrightMailStrings.Passphrase_Title]: '输入GPG密码短语',
  [BrightMailStrings.Passphrase_Label]: '密码短语',

  // Reading Pane
  [BrightMailStrings.ReadingPane_Placeholder]: '选择一封邮件阅读',

  // Recipient Chip Input
  [BrightMailStrings.Recipient_AddedOneTemplate]: '已添加收件人：{EMAIL}',
  [BrightMailStrings.Recipient_AddedManyTemplate]: '已添加收件人：{EMAILS}',
  [BrightMailStrings.Recipient_RemovedTemplate]: '已移除收件人：{EMAIL}',
  [BrightMailStrings.Recipient_NotFoundTemplate]: '在{DOMAIN}未找到{LOCAL}',

  // Rich Text Editor
  [BrightMailStrings.RichText_Placeholder]: '撰写您的消息...',
  [BrightMailStrings.RichText_Bold]: '粗体',
  [BrightMailStrings.RichText_Italic]: '斜体',
  [BrightMailStrings.RichText_Underline]: '下划线',
  [BrightMailStrings.RichText_OrderedList]: '有序列表',
  [BrightMailStrings.RichText_UnorderedList]: '无序列表',
  [BrightMailStrings.RichText_Link]: '链接',
  [BrightMailStrings.RichText_EnterUrl]: '输入URL：',
  [BrightMailStrings.RichText_ToolbarLabel]: '文本格式',

  // Compose Modal
  [BrightMailStrings.ComposeModal_Restore]: '恢复撰写',
  [BrightMailStrings.ComposeModal_Minimize]: '最小化撰写',
  [BrightMailStrings.ComposeModal_Maximize]: '最大化撰写',
  [BrightMailStrings.ComposeModal_RestoreDown]: '恢复撰写大小',
  [BrightMailStrings.ComposeModal_Close]: '关闭撰写',

  // GPG Setup Wizard
  [BrightMailStrings.GpgWizard_Title]: '设置GPG加密',
  [BrightMailStrings.GpgWizard_WelcomeHeading]: '使用GPG保护您的邮件',
  [BrightMailStrings.GpgWizard_WelcomeBody]:
    'GPG（GNU Privacy Guard）可以加密和签名您的邮件，确保只有预期的收件人才能阅读。设置不到一分钟。',
  [BrightMailStrings.GpgWizard_EciesNote]:
    'BrightChain成员还可以自动获得网络内消息的ECIES加密。',
  [BrightMailStrings.GpgWizard_OptionGenerate]: '创建新密钥对',
  [BrightMailStrings.GpgWizard_OptionGenerateDesc]:
    '推荐。我们为您生成安全的密钥对。',
  [BrightMailStrings.GpgWizard_OptionImport]: '我已有GPG密钥',
  [BrightMailStrings.GpgWizard_OptionImportDesc]:
    '从文件、剪贴板或密钥服务器导入现有公钥。',
  [BrightMailStrings.GpgWizard_GenerateHeading]: '选择密码短语',
  [BrightMailStrings.GpgWizard_GenerateBody]:
    '密码短语保护您的私钥。请选择容易记住但难以猜测的内容。',
  [BrightMailStrings.GpgWizard_PassphraseLabel]: '密码短语',
  [BrightMailStrings.GpgWizard_PassphraseConfirmLabel]: '确认密码短语',
  [BrightMailStrings.GpgWizard_PassphraseMismatch]: '密码短语不匹配',
  [BrightMailStrings.GpgWizard_PassphraseStrengthWeak]: '弱',
  [BrightMailStrings.GpgWizard_PassphraseStrengthFair]: '一般',
  [BrightMailStrings.GpgWizard_PassphraseStrengthGood]: '良好',
  [BrightMailStrings.GpgWizard_PassphraseStrengthStrong]: '强',
  [BrightMailStrings.GpgWizard_GenerateButton]: '生成我的密钥',
  [BrightMailStrings.GpgWizard_Generating]: '正在生成密钥对…',
  [BrightMailStrings.GpgWizard_ImportHeading]: '导入您的GPG密钥',
  [BrightMailStrings.GpgWizard_ImportTabFile]: '上传文件',
  [BrightMailStrings.GpgWizard_ImportTabPaste]: '粘贴密钥',
  [BrightMailStrings.GpgWizard_ImportTabKeyserver]: '搜索密钥服务器',
  [BrightMailStrings.GpgWizard_ImportFilePrompt]: '选择.asc、.gpg或.pub文件',
  [BrightMailStrings.GpgWizard_ImportPasteLabel]: '粘贴您的ASCII装甲格式公钥',
  [BrightMailStrings.GpgWizard_ImportKeyserverLabel]: '电子邮件地址',
  [BrightMailStrings.GpgWizard_ImportKeyserverHint]:
    '我们将在公共密钥服务器上搜索与此邮箱匹配的密钥。',
  [BrightMailStrings.GpgWizard_ImportButton]: '导入密钥',
  [BrightMailStrings.GpgWizard_Searching]: '正在搜索密钥服务器…',
  [BrightMailStrings.GpgWizard_SuccessHeading]: '一切就绪！',
  [BrightMailStrings.GpgWizard_SuccessBody]:
    '您的GPG密钥已准备就绪。现在可以发送和接收GPG加密邮件。',
  [BrightMailStrings.GpgWizard_SuccessFingerprint]: '密钥指纹',
  [BrightMailStrings.GpgWizard_PublishPrompt]:
    '发布您的公钥，以便他人找到并向您发送加密邮件。',
  [BrightMailStrings.GpgWizard_PublishButton]: '发布到密钥服务器',
  [BrightMailStrings.GpgWizard_SetDefaultPrompt]:
    '将GPG设为新消息的默认加密方式？',
  [BrightMailStrings.GpgWizard_SetDefaultButton]: '设GPG为默认',
  [BrightMailStrings.GpgWizard_Done]: '完成',
  [BrightMailStrings.GpgWizard_Back]: '返回',
  [BrightMailStrings.GpgWizard_Next]: '下一步',
  [BrightMailStrings.GpgWizard_ErrorGenerate]: '密钥对生成失败。请重试。',
  [BrightMailStrings.GpgWizard_ErrorImport]:
    '密钥导入失败。请检查文件或密钥数据后重试。',
  [BrightMailStrings.GpgWizard_ErrorPublish]: '密钥发布到服务器失败。',

  // Calendar Invite Card
  [BrightMailStrings.CalInvite_Title]: '日历邀请',
  [BrightMailStrings.CalInvite_Organizer]: '组织者',
  [BrightMailStrings.CalInvite_WhenTemplate]: '{START} – {END}',
  [BrightMailStrings.CalInvite_AllDay]: '全天',
  [BrightMailStrings.CalInvite_Location]: '地点',
  [BrightMailStrings.CalInvite_Description]: '描述',
  [BrightMailStrings.CalInvite_AttendeesTemplate]: '{COUNT} 位参与者',
  [BrightMailStrings.CalInvite_Accept]: '接受',
  [BrightMailStrings.CalInvite_Decline]: '拒绝',
  [BrightMailStrings.CalInvite_Tentative]: '暂定',
  [BrightMailStrings.CalInvite_AddToCalendar]: '添加到日历',
  [BrightMailStrings.CalInvite_ViewInCalendar]: '在日历中查看',
  [BrightMailStrings.CalInvite_AlreadyResponded]: '您已回复',
  [BrightMailStrings.CalInvite_ResponseTemplate]: '您的回复：{RESPONSE}',
  [BrightMailStrings.CalInvite_Cancelled]: '活动已取消',
  [BrightMailStrings.CalInvite_CancelledBody]: '组织者已取消此活动。',
  [BrightMailStrings.CalInvite_Updated]: '活动已更新',
  [BrightMailStrings.CalInvite_UpdatedBody]: '组织者已更新此活动。',
  [BrightMailStrings.CalInvite_Counter]: '替代提议',
  [BrightMailStrings.CalInvite_CounterBody]: '一位参与者提议了新的时间。',
  [BrightMailStrings.CalInvite_ErrorRsvp]: '发送回复失败',
  [BrightMailStrings.CalInvite_ErrorImport]: '将活动导入日历失败',
  [BrightMailStrings.CalInvite_SuccessAccepted]: '已接受邀请',
  [BrightMailStrings.CalInvite_SuccessDeclined]: '已拒绝邀请',
  [BrightMailStrings.CalInvite_SuccessTentative]: '已暂定接受邀请',
};
