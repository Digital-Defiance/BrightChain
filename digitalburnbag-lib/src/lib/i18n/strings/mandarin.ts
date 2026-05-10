import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  DigitalBurnbagStringKey,
  DigitalBurnbagStrings,
} from '../../enumerations/digitalburnbag-strings';

export const DigitalBurnbagMandarinStrings: ComponentStrings<DigitalBurnbagStringKey> =
  {
    [DigitalBurnbagStrings.KeyFeatures_1]:
      '安全存储文件，并设置自动发布或删除规则。',
    [DigitalBurnbagStrings.KeyFeatures_2]:
      '创建"金丝雀"来监控您的数字或物理活动。',
    [DigitalBurnbagStrings.KeyFeatures_3]:
      '根据金丝雀状态（例如：不活动）触发操作。',
    [DigitalBurnbagStrings.KeyFeatures_4]: '胁迫代码，用于立即执行紧急操作。',
    [DigitalBurnbagStrings.SiteDescription]:
      '基于数字和物理活动监控，安全存储文件并设置自动发布或删除规则。',
    [DigitalBurnbagStrings.SiteTagline]: '您的数据，您的规则',
    [DigitalBurnbagStrings.Nav_MyFiles]: '我的文件',
    [DigitalBurnbagStrings.Nav_SharedWithMe]: '与我共享',
    [DigitalBurnbagStrings.Nav_Favorites]: '收藏夹',
    [DigitalBurnbagStrings.Nav_Recent]: '最近',
    [DigitalBurnbagStrings.Nav_Trash]: '回收站',
    [DigitalBurnbagStrings.Nav_Activity]: '活动',
    [DigitalBurnbagStrings.Nav_Analytics]: '分析',
    [DigitalBurnbagStrings.Nav_Canary]: '金丝雀',
    [DigitalBurnbagStrings.Nav_Vaults]: '保险库',
    [DigitalBurnbagStrings.Nav_FileSections]: '文件分区',

    // -- Vault Container --
    [DigitalBurnbagStrings.Vault_Title]: '保险库容器',
    [DigitalBurnbagStrings.Vault_CreateNew]: '新建保险库',
    [DigitalBurnbagStrings.Vault_NameLabel]: '保险库名称',
    [DigitalBurnbagStrings.Vault_DescriptionLabel]: '描述',
    [DigitalBurnbagStrings.Vault_Create]: '创建',
    [DigitalBurnbagStrings.Vault_Cancel]: '取消',
    [DigitalBurnbagStrings.Vault_Empty]: '暂无保险库',
    [DigitalBurnbagStrings.Vault_EmptyDesc]: '创建保险库以安全存储文件。',
    [DigitalBurnbagStrings.Vault_Files]: '文件',
    [DigitalBurnbagStrings.Vault_Folders]: '文件夹',
    [DigitalBurnbagStrings.Vault_State]: '状态',
    [DigitalBurnbagStrings.Vault_SealStatus]: '封印状态',
    [DigitalBurnbagStrings.Vault_AllPristine]: '全部完好',
    [DigitalBurnbagStrings.Vault_SomeAccessed]: '部分已访问',
    [DigitalBurnbagStrings.Vault_Open]: '打开',
    [DigitalBurnbagStrings.Vault_Lock]: '锁定',
    [DigitalBurnbagStrings.Vault_Destroy]: '销毁',
    [DigitalBurnbagStrings.Vault_CreateFailed]: '创建保险库失败',
    [DigitalBurnbagStrings.Vault_LoadFailed]: '加载保险库失败',
    [DigitalBurnbagStrings.Vault_Created]: '保险库已创建',

    [DigitalBurnbagStrings.FileBrowser_ColName]: '名称',
    [DigitalBurnbagStrings.FileBrowser_ColSize]: '大小',
    [DigitalBurnbagStrings.FileBrowser_ColModified]: '修改日期',
    [DigitalBurnbagStrings.FileBrowser_ColType]: '类型',
    [DigitalBurnbagStrings.FileBrowser_EmptyFolder]: '此文件夹为空',
    [DigitalBurnbagStrings.FileBrowser_SelectAll]: '全选',
    [DigitalBurnbagStrings.FileBrowser_FolderPath]: '文件夹路径',
    [DigitalBurnbagStrings.FileBrowser_Loading]: '正在加载文件夹内容',
    [DigitalBurnbagStrings.FileBrowser_TypeFolder]: '文件夹',
    [DigitalBurnbagStrings.FileBrowser_TypeFile]: '文件',
    [DigitalBurnbagStrings.Action_Rename]: '重命名',
    [DigitalBurnbagStrings.Action_Move]: '移动',
    [DigitalBurnbagStrings.Action_Copy]: '复制',
    [DigitalBurnbagStrings.Action_Delete]: '删除',
    [DigitalBurnbagStrings.Action_Share]: '共享',
    [DigitalBurnbagStrings.Action_Download]: '下载',
    [DigitalBurnbagStrings.Action_Duplicate]: '复制副本',
    [DigitalBurnbagStrings.Action_History]: '历史记录',
    [DigitalBurnbagStrings.Action_Permissions]: '权限',
    [DigitalBurnbagStrings.Action_Preview]: '预览',
    [DigitalBurnbagStrings.Action_More]: '更多…',
    [DigitalBurnbagStrings.Action_Paste]: '粘贴',
    [DigitalBurnbagStrings.Action_UploadNewVersion]: '上传新版本',
    [DigitalBurnbagStrings.Action_StorageContract]: '存储合同',
    [DigitalBurnbagStrings.Action_CopyPathLink]: '复制路径链接',
    [DigitalBurnbagStrings.Trash_ColName]: '名称',
    [DigitalBurnbagStrings.Trash_ColOriginalPath]: '原始路径',
    [DigitalBurnbagStrings.Trash_ColDeleted]: '删除日期',
    [DigitalBurnbagStrings.Trash_ColTimeRemaining]: '剩余时间',
    [DigitalBurnbagStrings.Trash_ColActions]: '操作',
    [DigitalBurnbagStrings.Trash_Empty]: '回收站为空',
    [DigitalBurnbagStrings.Trash_Restore]: '恢复',
    [DigitalBurnbagStrings.Trash_DeletePermanently]: '永久删除',
    [DigitalBurnbagStrings.Trash_Loading]: '正在加载回收站',
    [DigitalBurnbagStrings.Trash_Expired]: '已过期',
    [DigitalBurnbagStrings.Trash_DaysRemaining]: '{count}天',
    [DigitalBurnbagStrings.Trash_HoursRemaining]: '{count}小时',
    [DigitalBurnbagStrings.Share_Title]: '共享 — {fileName}',
    [DigitalBurnbagStrings.Share_WithUser]: '与用户共享',
    [DigitalBurnbagStrings.Share_EmailLabel]: '电子邮件',
    [DigitalBurnbagStrings.Share_PermView]: '查看',
    [DigitalBurnbagStrings.Share_PermEdit]: '编辑',
    [DigitalBurnbagStrings.Share_Button]: '共享',
    [DigitalBurnbagStrings.Share_AdvancedOptions]: '高级共享选项',
    [DigitalBurnbagStrings.Share_EncryptionMode]: '加密模式',
    [DigitalBurnbagStrings.Share_ServerProxied]: '服务器代理',
    [DigitalBurnbagStrings.Share_ServerProxiedDesc]:
      '服务器代表接收者解密。最简单的选项。',
    [DigitalBurnbagStrings.Share_EphemeralKeyPair]: '临时密钥对',
    [DigitalBurnbagStrings.Share_EphemeralKeyPairDesc]:
      '生成一次性密钥对。私钥在URL片段中（不会发送到服务器）。',
    [DigitalBurnbagStrings.Share_RecipientPublicKey]: '接收者公钥',
    [DigitalBurnbagStrings.Share_RecipientPublicKeyDesc]:
      '使用接收者的公钥加密。对已知接收者最安全。',
    [DigitalBurnbagStrings.Share_RecipientKeyLabel]: '接收者公钥',
    [DigitalBurnbagStrings.Share_PasswordLabel]: '密码（可选）',
    [DigitalBurnbagStrings.Share_ExpiresAtLabel]: '过期时间',
    [DigitalBurnbagStrings.Share_MaxAccessLabel]: '最大访问次数',
    [DigitalBurnbagStrings.Share_ScopeLabel]: '链接范围',
    [DigitalBurnbagStrings.Share_ScopeSpecific]: '特定人员',
    [DigitalBurnbagStrings.Share_ScopeOrganization]: '组织',
    [DigitalBurnbagStrings.Share_ScopeAnonymous]: '匿名',
    [DigitalBurnbagStrings.Share_BlockDownload]: '阻止下载（仅预览）',
    [DigitalBurnbagStrings.Share_CreateLink]: '创建共享链接',
    [DigitalBurnbagStrings.Share_MagnetWarning]:
      '磁力链接不可撤销。一旦共享，任何拥有该URL的人都可以访问文件。',
    [DigitalBurnbagStrings.Share_GetMagnetUrl]: '获取磁力链接',
    [DigitalBurnbagStrings.Share_Close]: '关闭',
    [DigitalBurnbagStrings.Share_Failed]: '共享失败',
    [DigitalBurnbagStrings.Share_LinkFailed]: '创建链接失败',
    [DigitalBurnbagStrings.Share_MagnetFailed]: '获取磁力链接失败',
    [DigitalBurnbagStrings.Upload_DropOrBrowse]: '将文件拖放到此处或点击浏览',
    [DigitalBurnbagStrings.Upload_DropZoneLabel]: '文件上传区域',
    [DigitalBurnbagStrings.Upload_Failed]: '上传失败',

    // -- Upload New Version --
    [DigitalBurnbagStrings.Upload_NewVersion]: '上传新版本',
    [DigitalBurnbagStrings.Upload_NewVersionTitle]: '上传新版本',
    [DigitalBurnbagStrings.Upload_NewVersionDesc]:
      '选择一个文件作为新版本上传。文件必须与原始文件类型相同。',
    [DigitalBurnbagStrings.Upload_NewVersionSelect]: '选择文件',
    [DigitalBurnbagStrings.Upload_NewVersionUploading]: '正在上传新版本…',
    [DigitalBurnbagStrings.Upload_NewVersionSuccess]: '新版本上传成功',
    [DigitalBurnbagStrings.Upload_NewVersionFailed]: '上传新版本失败',
    [DigitalBurnbagStrings.Upload_NewVersionMimeTypeMismatch]:
      '文件类型不匹配：期望{expected}但收到{actual}',

    [DigitalBurnbagStrings.Preview_CloseLabel]: '关闭预览',
    [DigitalBurnbagStrings.Preview_Download]: '下载',
    [DigitalBurnbagStrings.Preview_Close]: '关闭',
    [DigitalBurnbagStrings.Preview_TypeLabel]: '类型：{mimeType}',
    [DigitalBurnbagStrings.Preview_NotAvailable]: '此文件类型不支持预览。',
    [DigitalBurnbagStrings.Preview_VideoNotSupported]:
      '您的浏览器不支持视频播放。',
    [DigitalBurnbagStrings.Preview_LoadFailed]: '内容加载失败',
    [DigitalBurnbagStrings.Bulk_ItemsSelected]: '已选择{count}项',
    [DigitalBurnbagStrings.Bulk_ClearSelection]: '清除选择',
    [DigitalBurnbagStrings.Bulk_Succeeded]: '{count}项成功',
    [DigitalBurnbagStrings.Bulk_Failed]: '{count}项失败',
    [DigitalBurnbagStrings.ACL_ColPrincipal]: '主体',
    [DigitalBurnbagStrings.ACL_ColType]: '类型',
    [DigitalBurnbagStrings.ACL_ColPermission]: '权限',
    [DigitalBurnbagStrings.ACL_ColActions]: '操作',
    [DigitalBurnbagStrings.ACL_Remove]: '移除',
    [DigitalBurnbagStrings.ACL_Add]: '添加',
    [DigitalBurnbagStrings.ACL_UserOrGroupPlaceholder]: '用户或组ID',
    [DigitalBurnbagStrings.ACL_InheritedFrom]: '继承自{source}',
    [DigitalBurnbagStrings.ACL_AdvancedPermissions]: '高级权限',
    [DigitalBurnbagStrings.ACL_PermissionFlags]: '权限标志',
    [DigitalBurnbagStrings.ACL_PermissionSetName]: '权限集名称',
    [DigitalBurnbagStrings.ACL_CreateSet]: '创建集合',
    [DigitalBurnbagStrings.ACL_CustomSets]: '自定义权限集',
    [DigitalBurnbagStrings.ACL_Mixed]: '混合',
    [DigitalBurnbagStrings.ACL_MixedTooltip]: '并非所有选中项都共享此权限',
    [DigitalBurnbagStrings.ACL_ApplyToAll]: '应用到所有选中项',
    [DigitalBurnbagStrings.ACL_MultiItemTitle]: '权限 — {count} 个项目',
    [DigitalBurnbagStrings.ACL_SaveFailed]: '保存权限失败',
    [DigitalBurnbagStrings.ACL_Saved]: '权限已保存',
    [DigitalBurnbagStrings.Canary_Bindings]: '金丝雀绑定',
    [DigitalBurnbagStrings.Canary_AddBinding]: '添加绑定',
    [DigitalBurnbagStrings.Canary_ColCondition]: '条件',
    [DigitalBurnbagStrings.Canary_ColAction]: '操作',
    [DigitalBurnbagStrings.Canary_ColTarget]: '目标',
    [DigitalBurnbagStrings.Canary_ColActions]: '操作',
    [DigitalBurnbagStrings.Canary_NoBindings]: '未配置绑定',
    [DigitalBurnbagStrings.Canary_DryRun]: '模拟运行',
    [DigitalBurnbagStrings.Canary_DeleteBinding]: '删除绑定',
    [DigitalBurnbagStrings.Canary_NewBinding]: '新建绑定',
    [DigitalBurnbagStrings.Canary_ProviderLabel]: '提供者',
    [DigitalBurnbagStrings.Canary_TargetIdsLabel]: '目标ID（逗号分隔）',
    [DigitalBurnbagStrings.Canary_NoRecipientList]: '无接收者列表',
    [DigitalBurnbagStrings.Canary_CascadeDelayLabel]: '级联延迟（秒）',
    [DigitalBurnbagStrings.Canary_Create]: '创建',
    [DigitalBurnbagStrings.Canary_Cancel]: '取消',
    [DigitalBurnbagStrings.Canary_RecipientLists]: '接收者列表',
    [DigitalBurnbagStrings.Canary_AddList]: '添加列表',
    [DigitalBurnbagStrings.Canary_ColListName]: '名称',
    [DigitalBurnbagStrings.Canary_ColRecipients]: '接收者',
    [DigitalBurnbagStrings.Canary_NoLists]: '无接收者列表',
    [DigitalBurnbagStrings.Canary_NewList]: '新建接收者列表',
    [DigitalBurnbagStrings.Canary_ListNameLabel]: '列表名称',
    [DigitalBurnbagStrings.Canary_RecipientsLabel]:
      '接收者（每行一个：邮箱, 标签）',
    [DigitalBurnbagStrings.Canary_DryRunReport]: '模拟运行报告',
    [DigitalBurnbagStrings.Canary_AffectedFiles]: '受影响文件：{count}',
    [DigitalBurnbagStrings.Canary_RecipientsCount]: '接收者：{count}',
    [DigitalBurnbagStrings.Canary_ActionsLabel]: '操作：',
    [DigitalBurnbagStrings.Notifications_Label]: '通知',
    [DigitalBurnbagStrings.Notifications_Empty]: '没有通知',
    [DigitalBurnbagStrings.Activity_AllOperations]: '所有操作',
    [DigitalBurnbagStrings.Activity_NoActivity]: '没有活动可显示',
    [DigitalBurnbagStrings.Activity_OnTarget]: '{actor}对{target}',
    [DigitalBurnbagStrings.Analytics_StorageUsage]: '存储使用量',
    [DigitalBurnbagStrings.Analytics_UsageSummary]:
      '已使用{used}/{quota}（{percent}%）',
    [DigitalBurnbagStrings.Analytics_ByFileType]: '按文件类型',
    [DigitalBurnbagStrings.Analytics_ColCategory]: '类别',
    [DigitalBurnbagStrings.Analytics_ColFiles]: '文件数',
    [DigitalBurnbagStrings.Analytics_ColSize]: '大小',
    [DigitalBurnbagStrings.Analytics_LargestItems]: '最大项目',
    [DigitalBurnbagStrings.Analytics_ColName]: '名称',
    [DigitalBurnbagStrings.Analytics_ColItemActions]: '操作',
    [DigitalBurnbagStrings.Analytics_Trash]: '回收站',
    [DigitalBurnbagStrings.Analytics_StaleFiles]: '过期文件',
    [DigitalBurnbagStrings.Analytics_ColAge]: '天数',
    [DigitalBurnbagStrings.Analytics_AgeDays]: '{count}天',
    [DigitalBurnbagStrings.Analytics_ScheduleDestroy]: '计划销毁',
    [DigitalBurnbagStrings.Page_ItemMoved]: '项目已移动',
    [DigitalBurnbagStrings.Page_MoveFailed]: '移动项目失败',
    [DigitalBurnbagStrings.Page_LoadFolderFailed]: '加载文件夹失败',
    [DigitalBurnbagStrings.Page_LoadTrashFailed]: '加载回收站失败',
    [DigitalBurnbagStrings.Page_LoadSharedFailed]: '加载共享项目失败',
    [DigitalBurnbagStrings.Page_LoadCanaryFailed]: '加载金丝雀配置失败',
    [DigitalBurnbagStrings.Page_LoadActivityFailed]: '加载活动失败',
    [DigitalBurnbagStrings.Page_LoadAnalyticsFailed]: '加载存储分析失败',
    [DigitalBurnbagStrings.Page_LoadPermissionsFailed]: '加载权限失败',
    [DigitalBurnbagStrings.Page_DeleteFailed]: '删除失败',
    [DigitalBurnbagStrings.Page_RenameFailed]: '重命名失败',
    [DigitalBurnbagStrings.Page_Renamed]: '已重命名',
    [DigitalBurnbagStrings.Page_ItemsMovedToTrash]: '{count}项已移至回收站',
    [DigitalBurnbagStrings.Page_Restored]: '已恢复{name}',
    [DigitalBurnbagStrings.Page_PermanentlyDeleted]: '已永久删除{name}',
    [DigitalBurnbagStrings.Page_RestoreFailed]: '恢复失败',
    [DigitalBurnbagStrings.Page_PermanentDeleteFailed]: '永久删除失败',
    [DigitalBurnbagStrings.Page_BindingCreated]: '绑定已创建',
    [DigitalBurnbagStrings.Page_BindingDeleted]: '绑定已删除',
    [DigitalBurnbagStrings.Page_RecipientListCreated]: '接收者列表已创建',
    [DigitalBurnbagStrings.Page_UserNotFound]: '未找到用户',
    [DigitalBurnbagStrings.Page_PathNotFound]:
      '未找到文件夹路径。它可能已被移动或删除。',
    [DigitalBurnbagStrings.Page_NoFileSelected]: '未选择文件',
    [DigitalBurnbagStrings.Page_UploadFailed]: '上传失败',
    [DigitalBurnbagStrings.Page_ErrorOccurred]: '发生错误',
    [DigitalBurnbagStrings.Page_RenamePrompt]: '新名称：',

    // -- Phix（凤凰循环重命名） --
    [DigitalBurnbagStrings.Phix_Button]: 'Phix',
    [DigitalBurnbagStrings.Phix_Tooltip]:
      '凤凰循环重命名：销毁旧名称，以新名称重生',
    [DigitalBurnbagStrings.Phix_Confirm_Title]: '确认Phix操作',
    [DigitalBurnbagStrings.Phix_Confirm_MetadataOnly]:
      '仅元数据重命名。不会触及任何数据块。快速且无痛。',
    [DigitalBurnbagStrings.Phix_Confirm_FullCycle]:
      '完整凤凰循环。数据将被重新加密，原始数据将被销毁。这可能需要一些时间。',
    [DigitalBurnbagStrings.Phix_Progress]: 'Phix进行中…',
    [DigitalBurnbagStrings.Phix_Complete]: 'Phix完成 — 浴火重生',
    [DigitalBurnbagStrings.Phix_Failed]: 'Phix失败',
    [DigitalBurnbagStrings.Phix_Mascot_Tiny]: 'phix-mascot-tiny',
    [DigitalBurnbagStrings.Phix_Mascot_Small]: 'phix-mascot-small',
    [DigitalBurnbagStrings.Phix_Mascot_Medium]: 'phix-mascot-medium',
    [DigitalBurnbagStrings.Phix_Mascot_Large]: 'phix-mascot-large',
    [DigitalBurnbagStrings.Phix_Mascot_Massive]: 'phix-mascot-massive',

    // -- Common --
    [DigitalBurnbagStrings.Common_Close]: '关闭',
    [DigitalBurnbagStrings.Common_Save]: '保存',
    [DigitalBurnbagStrings.Common_Back]: '返回',
    [DigitalBurnbagStrings.Common_Next]: '下一步',
    [DigitalBurnbagStrings.Common_Finish]: '完成',
    [DigitalBurnbagStrings.Common_Test]: '测试',
    [DigitalBurnbagStrings.Common_Connect]: '连接',
    [DigitalBurnbagStrings.Common_Disconnect]: '断开',
    [DigitalBurnbagStrings.Common_Retry]: '重试',
    [DigitalBurnbagStrings.Common_Enable]: '启用',
    [DigitalBurnbagStrings.Common_Disable]: '禁用',
    [DigitalBurnbagStrings.Common_Loading]: '加载中...',
    [DigitalBurnbagStrings.Common_Error]: '错误',
    [DigitalBurnbagStrings.Common_Success]: '成功',

    // -- Provider Registration --
    [DigitalBurnbagStrings.Provider_Title]: '金丝雀提供者',
    [DigitalBurnbagStrings.Provider_Subtitle]:
      '连接服务以监控您的活动并触发死亡开关操作',
    [DigitalBurnbagStrings.Provider_MyConnections]: '我的连接',
    [DigitalBurnbagStrings.Provider_AddProvider]: '添加提供者',
    [DigitalBurnbagStrings.Provider_NoConnections]: '未连接任何提供者',
    [DigitalBurnbagStrings.Provider_NoConnectionsDesc]:
      '连接提供者以开始监控您的活动',
    [DigitalBurnbagStrings.Provider_SearchPlaceholder]: '搜索提供者...',
    [DigitalBurnbagStrings.Provider_FilterByCategory]: '按类别筛选',
    [DigitalBurnbagStrings.Provider_AllCategories]: '所有类别',
    [DigitalBurnbagStrings.Provider_LastChecked]: '上次检查：{time}',
    [DigitalBurnbagStrings.Provider_LastActivity]: '上次活动：{time}',
    [DigitalBurnbagStrings.Provider_NeverChecked]: '从未检查',
    [DigitalBurnbagStrings.Provider_CheckNow]: '立即检查',
    [DigitalBurnbagStrings.Provider_Settings]: '设置',
    [DigitalBurnbagStrings.Provider_ViewDetails]: '查看详情',

    // -- Provider Status --
    [DigitalBurnbagStrings.ProviderStatus_Connected]: '已连接',
    [DigitalBurnbagStrings.ProviderStatus_Pending]: '待处理',
    [DigitalBurnbagStrings.ProviderStatus_Expired]: '已过期',
    [DigitalBurnbagStrings.ProviderStatus_Invalid]: '无效',
    [DigitalBurnbagStrings.ProviderStatus_Error]: '错误',
    [DigitalBurnbagStrings.ProviderStatus_NotConnected]: '未连接',

    // -- Provider Categories --
    [DigitalBurnbagStrings.ProviderCategory_PlatformNative]: '平台原生',
    [DigitalBurnbagStrings.ProviderCategory_PlatformNativeDesc]:
      '无需外部服务即可工作的内置签到方法',
    [DigitalBurnbagStrings.ProviderCategory_HealthFitness]: '健康与健身',
    [DigitalBurnbagStrings.ProviderCategory_HealthFitnessDesc]:
      '显示日常活动的健身追踪器和健康应用',
    [DigitalBurnbagStrings.ProviderCategory_Developer]: '开发者工具',
    [DigitalBurnbagStrings.ProviderCategory_DeveloperDesc]:
      '代码仓库和开发者平台',
    [DigitalBurnbagStrings.ProviderCategory_Communication]: '通讯',
    [DigitalBurnbagStrings.ProviderCategory_CommunicationDesc]:
      '消息和聊天平台',
    [DigitalBurnbagStrings.ProviderCategory_SocialMedia]: '社交媒体',
    [DigitalBurnbagStrings.ProviderCategory_SocialMediaDesc]:
      '社交网络和内容平台',
    [DigitalBurnbagStrings.ProviderCategory_Productivity]: '生产力',
    [DigitalBurnbagStrings.ProviderCategory_ProductivityDesc]:
      '电子邮件、日历和生产力工具',
    [DigitalBurnbagStrings.ProviderCategory_SmartHome]: '智能家居',
    [DigitalBurnbagStrings.ProviderCategory_SmartHomeDesc]:
      '物联网设备和家庭自动化',
    [DigitalBurnbagStrings.ProviderCategory_Gaming]: '游戏',
    [DigitalBurnbagStrings.ProviderCategory_GamingDesc]: '游戏平台和服务',
    [DigitalBurnbagStrings.ProviderCategory_Financial]: '金融',
    [DigitalBurnbagStrings.ProviderCategory_FinancialDesc]: '银行和金融服务',
    [DigitalBurnbagStrings.ProviderCategory_Email]: '电子邮件',
    [DigitalBurnbagStrings.ProviderCategory_EmailDesc]: '电子邮件提供者',
    [DigitalBurnbagStrings.ProviderCategory_CustomIntegration]: '自定义集成',
    [DigitalBurnbagStrings.ProviderCategory_CustomIntegrationDesc]:
      '创建与任何服务的自定义集成',
    [DigitalBurnbagStrings.ProviderCategory_Location]: '位置',
    [DigitalBurnbagStrings.ProviderCategory_LocationDesc]:
      '位置和地图服务',
    [DigitalBurnbagStrings.ProviderCategory_Entertainment]: '娱乐',
    [DigitalBurnbagStrings.ProviderCategory_EntertainmentDesc]:
      '娱乐和流媒体服务',
    [DigitalBurnbagStrings.ProviderCategory_Other]: '其他',
    [DigitalBurnbagStrings.ProviderCategory_OtherDesc]: '其他提供者',

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
    [DigitalBurnbagStrings.ProviderName_CustomWebhook]: '自定义Webhook',
    [DigitalBurnbagStrings.ProviderName_BrightChain]: 'BrightChain活动',
    [DigitalBurnbagStrings.ProviderName_ManualCheckin]: '手动签到',
    [DigitalBurnbagStrings.ProviderName_EmailPing]: '电子邮件签到',
    [DigitalBurnbagStrings.ProviderName_SmsPing]: '短信签到',

    // -- Provider Descriptions --
    [DigitalBurnbagStrings.ProviderDesc_Fitbit]:
      '追踪步数、心率和睡眠数据作为生存证明',
    [DigitalBurnbagStrings.ProviderDesc_Strava]: '监控您的跑步、骑行和锻炼',
    [DigitalBurnbagStrings.ProviderDesc_Garmin]: '追踪Garmin设备的活动',
    [DigitalBurnbagStrings.ProviderDesc_Whoop]: '监控恢复和压力数据',
    [DigitalBurnbagStrings.ProviderDesc_Oura]: '追踪睡眠和准备度评分',
    [DigitalBurnbagStrings.ProviderDesc_GitHub]: '监控提交、问题和拉取请求',
    [DigitalBurnbagStrings.ProviderDesc_GitLab]: '监控提交和合并请求',
    [DigitalBurnbagStrings.ProviderDesc_Bitbucket]: '监控提交和拉取请求',
    [DigitalBurnbagStrings.ProviderDesc_Twitter]: '监控推文和活动',
    [DigitalBurnbagStrings.ProviderDesc_Mastodon]:
      '监控任何Mastodon实例上的嘟文',
    [DigitalBurnbagStrings.ProviderDesc_Bluesky]: '监控Bluesky上的帖子',
    [DigitalBurnbagStrings.ProviderDesc_Reddit]: '监控帖子和评论',
    [DigitalBurnbagStrings.ProviderDesc_Slack]: '监控在线状态和活动状态',
    [DigitalBurnbagStrings.ProviderDesc_Discord]: '监控在线状态和活动',
    [DigitalBurnbagStrings.ProviderDesc_Telegram]: '通过机器人集成监控活动',
    [DigitalBurnbagStrings.ProviderDesc_Google]: '监控Gmail和日历活动',
    [DigitalBurnbagStrings.ProviderDesc_Notion]: '监控工作区活动',
    [DigitalBurnbagStrings.ProviderDesc_HomeAssistant]:
      '监控智能家居活动和在场状态',
    [DigitalBurnbagStrings.ProviderDesc_Steam]: '监控游戏活动',
    [DigitalBurnbagStrings.ProviderDesc_CustomWebhook]:
      '与任何可以发送HTTP请求的服务集成',
    [DigitalBurnbagStrings.ProviderDesc_BrightChain]: '监控您在此平台上的活动',
    [DigitalBurnbagStrings.ProviderDesc_ManualCheckin]: '定期手动确认您的在场',
    [DigitalBurnbagStrings.ProviderDesc_EmailPing]: '响应定期的电子邮件挑战',
    [DigitalBurnbagStrings.ProviderDesc_SmsPing]: '响应定期的短信挑战',

    // -- Provider Data Access Descriptions --
    [DigitalBurnbagStrings.ProviderDataAccess_Fitbit]:
      '我们访问您的每日活动摘要（步数、活动分钟数）、心率数据和睡眠日志以验证您的持续活动。',
    [DigitalBurnbagStrings.ProviderDataAccess_Strava]:
      '我们访问您的活动动态以检测您何时记录跑步、骑行或其他锻炼。',
    [DigitalBurnbagStrings.ProviderDataAccess_Garmin]:
      '我们访问您的Garmin活动数据，包括锻炼、步数和健康指标。',
    [DigitalBurnbagStrings.ProviderDataAccess_Whoop]:
      '我们访问您的WHOOP恢复评分和压力数据以验证每日活动。',
    [DigitalBurnbagStrings.ProviderDataAccess_Oura]:
      '我们访问您的Oura睡眠数据和准备度评分以验证每日活动。',
    [DigitalBurnbagStrings.ProviderDataAccess_GitHub]:
      '我们访问您的公开活动动态，包括提交、问题、拉取请求和评论。',
    [DigitalBurnbagStrings.ProviderDataAccess_GitLab]:
      '我们访问您的GitLab活动，包括提交、合并请求和问题。',
    [DigitalBurnbagStrings.ProviderDataAccess_Bitbucket]:
      '我们访问您的Bitbucket活动，包括提交和拉取请求。',
    [DigitalBurnbagStrings.ProviderDataAccess_Twitter]:
      '我们访问您最近的推文以验证您在平台上的持续活动。',
    [DigitalBurnbagStrings.ProviderDataAccess_Mastodon]:
      '我们访问您最近的嘟文以验证您的持续活动。',
    [DigitalBurnbagStrings.ProviderDataAccess_Bluesky]:
      '我们访问您最近的帖子以验证您的持续活动。',
    [DigitalBurnbagStrings.ProviderDataAccess_Reddit]:
      '我们访问您最近的帖子和评论以验证您的持续活动。',
    [DigitalBurnbagStrings.ProviderDataAccess_Slack]:
      '我们访问您的Slack在线状态以验证您处于活动状态。',
    [DigitalBurnbagStrings.ProviderDataAccess_Discord]:
      '我们访问您的Discord在线状态以验证您处于活动状态。',
    [DigitalBurnbagStrings.ProviderDataAccess_Telegram]:
      '我们使用Telegram机器人接收您的签到消息。',
    [DigitalBurnbagStrings.ProviderDataAccess_Google]:
      '我们访问您的Gmail消息时间戳（非内容）以验证最近的活动。',
    [DigitalBurnbagStrings.ProviderDataAccess_Notion]:
      '我们访问您的Notion工作区活动以验证最近的编辑。',
    [DigitalBurnbagStrings.ProviderDataAccess_HomeAssistant]:
      '我们访问您的Home Assistant以检测运动、门传感器和其他在场指标。',
    [DigitalBurnbagStrings.ProviderDataAccess_Steam]:
      '我们访问您的Steam个人资料以检测最近的游戏活动。',
    [DigitalBurnbagStrings.ProviderDataAccess_CustomWebhook]:
      '您配置外部服务向我们发送心跳Webhook。',
    [DigitalBurnbagStrings.ProviderDataAccess_BrightChain]:
      '我们自动追踪您在BrightChain上的登录、文件访问和其他活动。',
    [DigitalBurnbagStrings.ProviderDataAccess_ManualCheckin]:
      '您通过应用或网站手动签到以确认您安全。',
    [DigitalBurnbagStrings.ProviderDataAccess_EmailPing]:
      '我们向您发送带有签到链接的定期电子邮件。点击链接确认您安全。',
    [DigitalBurnbagStrings.ProviderDataAccess_SmsPing]:
      '我们向您发送定期短信。回复以确认您安全。',

    // -- Provider Check Intervals --
    [DigitalBurnbagStrings.ProviderInterval_EveryMinute]: '每分钟',
    [DigitalBurnbagStrings.ProviderInterval_Every5Minutes]: '每5分钟',
    [DigitalBurnbagStrings.ProviderInterval_Every15Minutes]: '每15分钟',
    [DigitalBurnbagStrings.ProviderInterval_Every30Minutes]: '每30分钟',
    [DigitalBurnbagStrings.ProviderInterval_EveryHour]: '每小时',
    [DigitalBurnbagStrings.ProviderInterval_Every2Hours]: '每2小时',
    [DigitalBurnbagStrings.ProviderInterval_Every4Hours]: '每4小时',
    [DigitalBurnbagStrings.ProviderInterval_Daily]: '每天',
    [DigitalBurnbagStrings.ProviderInterval_Weekly]: '每周',
    [DigitalBurnbagStrings.ProviderInterval_BiWeekly]: '每两周',
    [DigitalBurnbagStrings.ProviderInterval_Monthly]: '每月',
    [DigitalBurnbagStrings.ProviderInterval_Manual]: '手动签到',
    [DigitalBurnbagStrings.ProviderInterval_Automatic]: '自动',
    [DigitalBurnbagStrings.ProviderInterval_Custom]: '自定义',

    // -- Registration Wizard --
    [DigitalBurnbagStrings.Wizard_SelectProvider]: '选择提供者',
    [DigitalBurnbagStrings.Wizard_SelectProviderDesc]:
      '选择要连接以进行活动监控的服务',
    [DigitalBurnbagStrings.Wizard_ReviewPermissions]: '查看权限',
    [DigitalBurnbagStrings.Wizard_ReviewPermissionsDesc]:
      '查看我们将从此提供者访问的数据',
    [DigitalBurnbagStrings.Wizard_ConfigureAbsence]: '配置缺席检测',
    [DigitalBurnbagStrings.Wizard_ConfigureAbsenceDesc]:
      '设置不活动多长时间后触发死亡开关',
    [DigitalBurnbagStrings.Wizard_ConfigureDuress]: '配置胁迫检测',
    [DigitalBurnbagStrings.Wizard_ConfigureDuressDesc]:
      '设置表示您处于胁迫状态的关键词或模式',
    [DigitalBurnbagStrings.Wizard_Authorize]: '授权',
    [DigitalBurnbagStrings.Wizard_AuthorizeDesc]:
      '授予对此提供者上您帐户的访问权限',
    [DigitalBurnbagStrings.Wizard_EnterApiKey]: '输入API密钥',
    [DigitalBurnbagStrings.Wizard_EnterApiKeyDesc]:
      '输入您的API密钥以连接此提供者',
    [DigitalBurnbagStrings.Wizard_ConfigureWebhook]: '配置Webhook',
    [DigitalBurnbagStrings.Wizard_ConfigureWebhookDesc]:
      '设置Webhook以接收活动更新',
    [DigitalBurnbagStrings.Wizard_TestConnection]: '测试连接',
    [DigitalBurnbagStrings.Wizard_TestConnectionDesc]: '验证连接是否正常工作',
    [DigitalBurnbagStrings.Wizard_Complete]: '完成',
    [DigitalBurnbagStrings.Wizard_CompleteDesc]: '提供者已成功连接',

    // -- Absence Configuration --
    [DigitalBurnbagStrings.Absence_ThresholdLabel]: '缺席阈值',
    [DigitalBurnbagStrings.Absence_ThresholdHelp]: '触发死亡开关前无活动的时间',
    [DigitalBurnbagStrings.Absence_GracePeriodLabel]: '宽限期',
    [DigitalBurnbagStrings.Absence_GracePeriodHelp]:
      '阈值后执行操作前的额外时间',
    [DigitalBurnbagStrings.Absence_SendWarnings]: '发送警告通知',
    [DigitalBurnbagStrings.Absence_WarningDaysLabel]: '阈值前警告天数',
    [DigitalBurnbagStrings.Absence_WarningDaysHelp]:
      '发送警告的阈值前天数（逗号分隔）',
    [DigitalBurnbagStrings.Absence_Days]: '天',
    [DigitalBurnbagStrings.Absence_Hours]: '小时',

    // -- Duress Configuration --
    [DigitalBurnbagStrings.Duress_EnableLabel]: '启用胁迫检测',
    [DigitalBurnbagStrings.Duress_EnableHelp]:
      '检测活动中的求救信号（例如，提交中的特定关键词）',
    [DigitalBurnbagStrings.Duress_KeywordsLabel]: '胁迫关键词',
    [DigitalBurnbagStrings.Duress_KeywordsHelp]:
      '在活动中发现时表示胁迫的词语（逗号分隔）',
    [DigitalBurnbagStrings.Duress_PatternsLabel]: '胁迫模式',
    [DigitalBurnbagStrings.Duress_PatternsHelp]:
      '表示胁迫的正则表达式模式（每行一个）',

    // -- API Key Entry --
    [DigitalBurnbagStrings.ApiKey_Label]: 'API密钥',
    [DigitalBurnbagStrings.ApiKey_Placeholder]: '输入您的API密钥',
    [DigitalBurnbagStrings.ApiKey_Help]: '您的API密钥将被加密并安全存储',
    [DigitalBurnbagStrings.ApiKey_WhereToFind]: '在哪里找到您的API密钥',

    // -- Webhook Configuration --
    [DigitalBurnbagStrings.Webhook_UrlLabel]: 'Webhook URL',
    [DigitalBurnbagStrings.Webhook_UrlHelp]: '在您的外部服务中配置此URL',
    [DigitalBurnbagStrings.Webhook_SecretLabel]: 'Webhook密钥',
    [DigitalBurnbagStrings.Webhook_SecretHelp]: '使用此密钥签署Webhook请求',
    [DigitalBurnbagStrings.Webhook_Instructions]:
      '配置您的服务向Webhook URL发送POST请求',
    [DigitalBurnbagStrings.Webhook_CopyUrl]: '复制URL',
    [DigitalBurnbagStrings.Webhook_CopySecret]: '复制密钥',
    [DigitalBurnbagStrings.Webhook_Copied]: '已复制到剪贴板',

    // -- Connection Test --
    [DigitalBurnbagStrings.Test_Running]: '正在测试连接...',
    [DigitalBurnbagStrings.Test_Success]: '连接成功',
    [DigitalBurnbagStrings.Test_Failed]: '连接失败',
    [DigitalBurnbagStrings.Test_ResponseTime]: '响应时间：{ms}ms',
    [DigitalBurnbagStrings.Test_UserInfo]: '已连接为{username}',

    // -- OAuth Flow --
    [DigitalBurnbagStrings.OAuth_Redirecting]: '正在重定向到{provider}...',
    [DigitalBurnbagStrings.OAuth_WaitingForAuth]: '等待授权...',
    [DigitalBurnbagStrings.OAuth_Success]: '授权成功',
    [DigitalBurnbagStrings.OAuth_Failed]: '授权失败',
    [DigitalBurnbagStrings.OAuth_Cancelled]: '授权已取消',

    // -- Connection Summary --
    [DigitalBurnbagStrings.Summary_Healthy]: '所有提供者正常',
    [DigitalBurnbagStrings.Summary_Degraded]: '部分提供者需要关注',
    [DigitalBurnbagStrings.Summary_Critical]: '严重：提供者故障',
    [DigitalBurnbagStrings.Summary_None]: '未连接任何提供者',
    [DigitalBurnbagStrings.Summary_ConnectedProviders]: '已连接{count}个提供者',
    [DigitalBurnbagStrings.Summary_NeedsAttention]: '{count}个需要关注',
    [DigitalBurnbagStrings.Summary_LastHeartbeat]: '上次心跳：{time}',

    // -- Provider Dashboard --
    [DigitalBurnbagStrings.Nav_Providers]: '提供者',
    [DigitalBurnbagStrings.Dashboard_Title]: '提供者仪表板',
    [DigitalBurnbagStrings.Dashboard_HealthBanner]: '健康摘要',
    [DigitalBurnbagStrings.Dashboard_SignalPresence]: '在线',
    [DigitalBurnbagStrings.Dashboard_SignalAbsence]: '离线',
    [DigitalBurnbagStrings.Dashboard_SignalDuress]: '胁迫',
    [DigitalBurnbagStrings.Dashboard_SignalCheckFailed]: '检查失败',
    [DigitalBurnbagStrings.Dashboard_SignalInconclusive]: '不确定',
    [DigitalBurnbagStrings.Dashboard_TimeSinceActivity]: '距上次活动时间',
    [DigitalBurnbagStrings.Detail_StatusHistory]: '状态历史',
    [DigitalBurnbagStrings.Detail_ConnectionSettings]: '连接设置',
    [DigitalBurnbagStrings.Detail_FilterBySignal]: '按信号筛选',
    [DigitalBurnbagStrings.Detail_AllSignals]: '所有信号',
    [DigitalBurnbagStrings.Detail_Timeline]: '时间线',
    [DigitalBurnbagStrings.Detail_NoHistory]: '无状态历史记录',
    [DigitalBurnbagStrings.Binding_BindToProvider]: '绑定到提供者',
    [DigitalBurnbagStrings.Binding_SelectProvider]: '选择提供者',
    [DigitalBurnbagStrings.Binding_Condition]: '条件',
    [DigitalBurnbagStrings.Binding_Action]: '操作',
    [DigitalBurnbagStrings.Binding_Targets]: '目标',
    [DigitalBurnbagStrings.Binding_Create]: '创建绑定',
    [DigitalBurnbagStrings.Binding_ProviderNotConnected]: '此提供者未连接。',
    [DigitalBurnbagStrings.Binding_FixConnection]: '修复连接',
    [DigitalBurnbagStrings.Binding_DragHint]: '将提供者卡片拖到保险库或文件上',
    [DigitalBurnbagStrings.CustomProvider_Title]: '自定义提供者',
    [DigitalBurnbagStrings.CustomProvider_ImportJson]: '导入JSON',
    [DigitalBurnbagStrings.CustomProvider_ExportJson]: '导出JSON',
    [DigitalBurnbagStrings.CustomProvider_Name]: '提供者名称',
    [DigitalBurnbagStrings.CustomProvider_Description]: '描述',
    [DigitalBurnbagStrings.CustomProvider_BaseUrl]: '基础URL',
    [DigitalBurnbagStrings.CustomProvider_Category]: '类别',
    [DigitalBurnbagStrings.CustomProvider_AuthType]: '认证类型',
    [DigitalBurnbagStrings.CustomProvider_Endpoints]: '端点',
    [DigitalBurnbagStrings.CustomProvider_ResponseMapping]: '响应映射',
    [DigitalBurnbagStrings.CustomProvider_Save]: '保存提供者',
    // -- Encryption & Access Indicators --
    [DigitalBurnbagStrings.Encryption_AES256]: 'AES-256',
    [DigitalBurnbagStrings.Encryption_Encrypted]: '已加密',
    [DigitalBurnbagStrings.Encryption_EncryptedTooltip]:
      '此文件使用AES-256-GCM加密。只有授权的密钥持有者才能解密。',
    [DigitalBurnbagStrings.Encryption_KeyWrapped]: '密钥已包装',
    [DigitalBurnbagStrings.Encryption_KeyWrappedTooltip]:
      '您的解密密钥使用您的个人ECIES密钥对包装。',
    [DigitalBurnbagStrings.Encryption_ApprovalProtected]: '法定人数',
    [DigitalBurnbagStrings.Encryption_ApprovalTooltip]:
      '此文件的敏感操作需要法定人数批准。',
    [DigitalBurnbagStrings.Access_OnlyYou]: '仅您',
    [DigitalBurnbagStrings.Access_SharedWith]: '共享给',
    [DigitalBurnbagStrings.Access_SharedWithCount]: '与{count}人共享',
    [DigitalBurnbagStrings.Access_ViewAll]: '查看所有访问权限',
    [DigitalBurnbagStrings.Vault_EncryptionLabel]: '加密',
    [DigitalBurnbagStrings.Vault_AllEncrypted]: '所有文件已加密',
    [DigitalBurnbagStrings.Vault_AllEncryptedDesc]:
      '此保险库中的每个文件都使用AES-256-GCM加密。',
    [DigitalBurnbagStrings.FileBrowser_ColAccess]: '访问',
    [DigitalBurnbagStrings.FileBrowser_ColSecurity]: '安全',

    // -- Friends Sharing --
    [DigitalBurnbagStrings.Friends_SectionTitle]: '好友',
    [DigitalBurnbagStrings.Friends_ShareWithAll]: '分享给好友',

    // -- 保险库可见性 / 公开保险库 --
    [DigitalBurnbagStrings.Vault_VisibilityLabel]: '可见性',
    [DigitalBurnbagStrings.Vault_Visibility_Private]: '私密',
    [DigitalBurnbagStrings.Vault_Visibility_PrivateDesc]:
      '只有您明确分享的人才能访问此保险库。',
    [DigitalBurnbagStrings.Vault_Visibility_Unlisted]: '隐藏',
    [DigitalBurnbagStrings.Vault_Visibility_UnlistedDesc]:
      '任何拥有链接的人都可以访问，但不会出现在搜索或公开发现动态中。',
    [DigitalBurnbagStrings.Vault_Visibility_Public]: '公开',
    [DigitalBurnbagStrings.Vault_Visibility_PublicDesc]:
      '任何人都可以发现并访问此保险库。热门公开保险库可能会从网络获得免费的复制升级。',
    [DigitalBurnbagStrings.Vault_Public_PopularityLabel]: '热度',
    [DigitalBurnbagStrings.Vault_Public_ReplicationBonus]: '复制奖励已激活',
    [DigitalBurnbagStrings.Vault_Public_ReplicationBonusDesc]:
      '此保险库足够受欢迎，网络将自动免费提升其冗余级别。',
    [DigitalBurnbagStrings.Vault_Public_DiscoveryNote]:
      '公开保险库会被收录到 Digital Burnbag 的发现动态中，并随时间积累热度。',
    [DigitalBurnbagStrings.File_Visibility_Override]: '文件可见性覆盖',
    [DigitalBurnbagStrings.File_Visibility_InheritedFrom]:
      '继承自保险库（{visibility}）',
    [DigitalBurnbagStrings.ACL_PublicPrincipalLabel]: '公开（任何人）',
    [DigitalBurnbagStrings.ACL_PublicPrincipalDesc]:
      '无需身份验证即可向任何访客授予访问权限。',

    // -- Joule Upload / Storage Cost --
    [DigitalBurnbagStrings.Joule_BurnDateTooltip]: '已设置销毁日期',
    [DigitalBurnbagStrings.Joule_BurnDateChipLabel]: '将于 {date} 销毁',
    [DigitalBurnbagStrings.Joule_BurnDateActive]:
      '「待销毁」层级 — 文件将被加密销毁',
    [DigitalBurnbagStrings.Joule_ExpiryReleaseNote]:
      '{durationDays}天{daySuffix}后您的预付存储到期。未设置销毁日期时，文件将释放到网络——社区可选择续期，否则最终将被删除。',
    [DigitalBurnbagStrings.Joule_RsDisplayText]:
      'RS({rsK},{rsM}) · {overhead} 冗余 · 容忍 {rsM} 个节点故障',
    [DigitalBurnbagStrings.Joule_RsDisplayAriaLabel]:
      'Reed-Solomon RS({rsK},{rsM})，{overhead} 冗余，容忍 {rsM} 个节点故障',
    [DigitalBurnbagStrings.Joule_StorageCostPreviewRegion]: '存储费用预览',
    [DigitalBurnbagStrings.Joule_UpfrontLabel]:
      '预付（{durationDays} 天{daySuffix}）',
    [DigitalBurnbagStrings.Joule_UpfrontAriaLabel]: '预付费用：{amount}',
    [DigitalBurnbagStrings.Joule_DailyCharge]: '日常费用',
    [DigitalBurnbagStrings.Joule_DailyAriaLabel]: '日常费用：{amount}/天',
    [DigitalBurnbagStrings.Joule_DailyPerDay]: '{amount} / 天',
    [DigitalBurnbagStrings.Joule_InsufficientBalance]:
      '余额不足 — 可用余额：{balance}',
    [DigitalBurnbagStrings.Joule_UnableToCalculateCost]: '无法计算费用',
    [DigitalBurnbagStrings.Joule_StorageDurationTitle]: '存储时长',
    [DigitalBurnbagStrings.Joule_DurationPresetsAriaLabel]: '时长预设',
    [DigitalBurnbagStrings.Joule_DurationPresetDays]: '{count} 天',
    [DigitalBurnbagStrings.Joule_DurationPreset1Year]: '1 年',
    [DigitalBurnbagStrings.Joule_DurationPresetAriaLabel]: '{count} 天',
    [DigitalBurnbagStrings.Joule_DurationCustomLabel]: '自定义（天数）',
    [DigitalBurnbagStrings.Joule_DurationCustomAriaLabel]: '自定义天数时长',
    [DigitalBurnbagStrings.Joule_StorageTierTitle]: '存储级别',
    [DigitalBurnbagStrings.Joule_StorageTierAriaLabel]: '选择存储级别',
    [DigitalBurnbagStrings.Joule_TierCostVsStandard]: '标准费用的 {multiplier}',
    [DigitalBurnbagStrings.Joule_Tier_Performance]: '性能',
    [DigitalBurnbagStrings.Joule_Tier_Standard]: '标准',
    [DigitalBurnbagStrings.Joule_Tier_Archive]: '归档',
    [DigitalBurnbagStrings.Joule_Tier_PendingBurn]: '待销毁',
    [DigitalBurnbagStrings.Joule_Tier_None]: '无冗余',
    [DigitalBurnbagStrings.Joule_FormAriaLabel]: '上传配置表单',
    [DigitalBurnbagStrings.Joule_BurnDateCheckboxLabel]: '设置销毁日期',
    [DigitalBurnbagStrings.Joule_BurnDateCheckboxAriaLabel]: '启用销毁日期',
    [DigitalBurnbagStrings.Joule_ContinueButton]: '继续',
    [DigitalBurnbagStrings.Joule_ContinueButtonAriaLabel]: '继续查看上传费用',
    [DigitalBurnbagStrings.Joule_InitUploadFailed]: '初始化上传会话失败。',
    [DigitalBurnbagStrings.Joule_ModalTitle]: '确认存储费用',
    [DigitalBurnbagStrings.Joule_LoadingAriaLabel]: '正在加载费用报价',
    [DigitalBurnbagStrings.Joule_QuoteExpired]:
      '报价已过期 — 请重新上传以生成新的费用估算。',
    [DigitalBurnbagStrings.Joule_ModalInsufficientBalance]:
      '余额不足 — 预付费用超过您可用的 Joule 余额（{balance}）。',
    [DigitalBurnbagStrings.Joule_ErasureCodingLabel]: '纺删码',
    [DigitalBurnbagStrings.Joule_ErasureCodingValue]:
      'RS({rsK},{rsM}) · {overheadDisplay} 冗余',
    [DigitalBurnbagStrings.Joule_QuoteExpiresIn]: '报价到期',
    [DigitalBurnbagStrings.Joule_QuoteExpiresInAriaLabel]:
      '报价将在 {seconds} 秒后到期',
    [DigitalBurnbagStrings.Joule_QuoteSeconds]: '{seconds}秒',
    [DigitalBurnbagStrings.Joule_QuoteProgressAriaLabel]: '报价到期前剩余时间',
    [DigitalBurnbagStrings.Joule_CancelButton]: '取消',
    [DigitalBurnbagStrings.Joule_CancelButtonAriaLabel]: '取消上传并丢弃会话',
    [DigitalBurnbagStrings.Joule_ConfirmButton]: '确认上传',
    [DigitalBurnbagStrings.Joule_ConfirmButtonAriaLabel]:
      '确认上传并扣除 Joule 余额',
    [DigitalBurnbagStrings.Joule_FetchQuoteFailed]: '获取报价失败。',
    [DigitalBurnbagStrings.Joule_CommitFailed]: '提交失败，请重试。',

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
