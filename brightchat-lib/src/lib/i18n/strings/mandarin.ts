import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightChatStringKey,
  BrightChatStrings,
} from '../../enumerations/brightChatStrings';

export const BrightChatMandarinStrings: ComponentStrings<BrightChatStringKey> =
  {
    // Menu
    [BrightChatStrings.MenuLabel]: 'BrightChat',
    [BrightChatStrings.ChatSectionsLabel]: '聊天分区',
    [BrightChatStrings.Nav_Conversations]: '对话',
    [BrightChatStrings.Nav_Groups]: '群组',
    [BrightChatStrings.Nav_Channels]: '频道',
    [BrightChatStrings.Nav_DirectMessages]: '私信',

    // Server Rail
    [BrightChatStrings.Server_Rail]: '服务器',
    [BrightChatStrings.Server_Rail_Home]: '主页',
    [BrightChatStrings.Server_Rail_CreateServer]: '创建服务器',

    // Create Server Dialog
    [BrightChatStrings.Create_Server]: '创建服务器',
    [BrightChatStrings.Create_Server_Title]: '创建服务器',
    [BrightChatStrings.Create_Server_NameLabel]: '服务器名称',
    [BrightChatStrings.Create_Server_NamePlaceholder]: '输入服务器名称',
    [BrightChatStrings.Create_Server_IconLabel]: '服务器图标',
    [BrightChatStrings.Create_Server_Submit]: '创建',
    [BrightChatStrings.Create_Server_Cancel]: '取消',

    // Channel Sidebar
    [BrightChatStrings.Channel_Sidebar]: '频道',
    [BrightChatStrings.Channel_Sidebar_CreateChannel]: '创建频道',

    // Create Channel Dialog
    [BrightChatStrings.Create_Channel]: '创建频道',
    [BrightChatStrings.Create_Channel_Title]: '创建频道',
    [BrightChatStrings.Create_Channel_NameLabel]: '频道名称',
    [BrightChatStrings.Create_Channel_TopicLabel]: '主题',
    [BrightChatStrings.Create_Channel_CategoryLabel]: '分类',
    [BrightChatStrings.Create_Channel_Submit]: '创建',
    [BrightChatStrings.Create_Channel_Cancel]: '取消',

    // Create DM Dialog
    [BrightChatStrings.Create_DM]: '新消息',
    [BrightChatStrings.Create_DM_Title]: '新私信',
    [BrightChatStrings.Create_DM_SearchPlaceholder]: '搜索用户',
    [BrightChatStrings.Create_DM_Submit]: '发送',
    [BrightChatStrings.Create_DM_Cancel]: '取消',
    [BrightChatStrings.Create_DM_NewMessage]: '新消息',

    // Server Settings Panel
    [BrightChatStrings.Server_Settings]: '服务器设置',
    [BrightChatStrings.Server_Settings_Title]: '服务器设置',
    [BrightChatStrings.Server_Settings_Overview]: '概览',
    [BrightChatStrings.Server_Settings_Members]: '成员',
    [BrightChatStrings.Server_Settings_Categories]: '分类',
    [BrightChatStrings.Server_Settings_Invites]: '邀请',
    [BrightChatStrings.Server_Settings_Save]: '保存更改',

    // Channel Context Menu
    [BrightChatStrings.Channel_Edit]: '编辑频道',
    [BrightChatStrings.Channel_Delete]: '删除频道',
    [BrightChatStrings.Channel_Mute]: '静音频道',

    // Edit Channel Dialog
    [BrightChatStrings.Edit_Channel_Title]: '编辑频道',
    [BrightChatStrings.Edit_Channel_NameLabel]: '频道名称',
    [BrightChatStrings.Edit_Channel_TopicLabel]: '主题',
    [BrightChatStrings.Edit_Channel_Save]: '保存',
    [BrightChatStrings.Edit_Channel_Cancel]: '取消',
    [BrightChatStrings.Edit_Channel_Saving]: '保存中…',
    [BrightChatStrings.Edit_Channel_Failed]: '更新频道失败',
    [BrightChatStrings.Edit_Channel_NameRequired]: '频道名称为必填项',
    [BrightChatStrings.Edit_Channel_NameLength]:
      '频道名称必须在2到100个字符之间',

    // Delete Channel Confirmation
    [BrightChatStrings.Delete_Channel_Title]: '删除频道',
    [BrightChatStrings.Delete_Channel_Confirm]: '删除',
    [BrightChatStrings.Delete_Channel_Cancel]: '取消',
    [BrightChatStrings.Delete_Channel_Deleting]: '删除中…',
    [BrightChatStrings.Delete_Channel_Failed]: '删除频道失败',

    // Presence Status Labels
    [BrightChatStrings.Presence_Online]: '在线',
    [BrightChatStrings.Presence_Idle]: '闲置',
    [BrightChatStrings.Presence_DoNotDisturb]: '请勿打扰',
    [BrightChatStrings.Presence_Offline]: '离线',
    [BrightChatStrings.Presence_SetStatus]: '设置状态',

    // Breadcrumb Navigation
    [BrightChatStrings.Breadcrumb_BrightChat]: 'BrightChat',
    [BrightChatStrings.Breadcrumb_Conversation]: '对话',
    [BrightChatStrings.Breadcrumb_Group]: '群组',
    [BrightChatStrings.Breadcrumb_Channel]: '频道',

    // Channel Permissions (Discord-style)
    [BrightChatStrings.Channel_Permissions]: '权限',
    [BrightChatStrings.Channel_Permissions_Title]: '频道权限',
    [BrightChatStrings.Channel_Permissions_Role]: '角色',
    [BrightChatStrings.Channel_Permissions_SendMessages]: '发送消息',
    [BrightChatStrings.Channel_Permissions_ManageChannel]: '管理频道',
    [BrightChatStrings.Channel_Permissions_ManageMembers]: '管理成员',
    [BrightChatStrings.Channel_Permissions_CreateInvites]: '创建邀请',
    [BrightChatStrings.Channel_Permissions_PinMessages]: '置顶消息',
    [BrightChatStrings.Channel_Permissions_MuteMembers]: '静音成员',
    [BrightChatStrings.Channel_Permissions_KickMembers]: '踢出成员',
    [BrightChatStrings.Channel_Permissions_DeleteMessages]: '删除消息',

    // Channel Visibility
    [BrightChatStrings.Channel_Visibility_Public]: '公开',
    [BrightChatStrings.Channel_Visibility_Private]: '私密',
    [BrightChatStrings.Channel_Visibility_Secret]: '秘密',
    [BrightChatStrings.Channel_Visibility_Public_Desc]:
      '任何人都可以查看和加入',
    [BrightChatStrings.Channel_Visibility_Private_Desc]: '仅限邀请',
    [BrightChatStrings.Channel_Visibility_Secret_Desc]: '对非成员隐藏',
    [BrightChatStrings.Compose_Placeholder]: '输入加密消息...',
    [BrightChatStrings.Compose_SendLabel]: '发送消息',
    [BrightChatStrings.Compose_MessageNotDelivered]: '消息无法送达',
    [BrightChatStrings.Compose_SendFailed]: '发送消息失败',
    [BrightChatStrings.ConversationList_Title]: '对话',
    [BrightChatStrings.ConversationList_NewMessage]: '新消息',
    [BrightChatStrings.ConversationList_Empty]: '还没有私信。',
    [BrightChatStrings.ConversationList_RecentChannels]: '最近频道',
    [BrightChatStrings.MessageThread_Empty]: '还没有消息。开始对话吧！',
    [BrightChatStrings.Create_Channel_NamePlaceholder]: '例如 综合',
    [BrightChatStrings.Create_Channel_TopicPlaceholder]:
      '这个频道是关于什么的？',
    [BrightChatStrings.Create_Channel_VisibilityLabel]: '可见性',
    [BrightChatStrings.Create_Channel_NameRequired]: '频道名称为必填项',
    [BrightChatStrings.Create_Channel_NameLength]:
      '频道名称必须在2到100个字符之间',
    [BrightChatStrings.Create_Channel_Creating]: '创建中...',
    [BrightChatStrings.Create_Channel_Failed]: '创建频道失败',
    [BrightChatStrings.Create_Channel_CategoryNone]: '无',
    [BrightChatStrings.Server_Settings_ServerNameLabel]: '服务器名称',
    [BrightChatStrings.Server_Settings_IconUrlLabel]: '图标URL',
    [BrightChatStrings.Server_Settings_Saving]: '保存中…',
    [BrightChatStrings.Server_Settings_GenerateInvite]: '生成邀请',
    [BrightChatStrings.Server_Settings_CopyToken]: '复制令牌',
    [BrightChatStrings.Server_Settings_Uses]: '使用次数',
    [BrightChatStrings.Server_Settings_NewCategory]: '新分类',
    [BrightChatStrings.Server_Settings_AddCategory]: '添加',
    [BrightChatStrings.Server_Settings_ChannelCount]: '频道',
    [BrightChatStrings.Server_Settings_RemoveMember]: '移除成员',
    [BrightChatStrings.Server_Settings_DeleteCategory]: '删除分类',
    [BrightChatStrings.Server_Settings_DeleteServer]: '删除服务器',
    [BrightChatStrings.Server_Settings_DeleteServerConfirm]: '确定要删除此服务器吗？所有频道和消息将永久丢失。',
    [BrightChatStrings.Server_Settings_DeleteServerConfirmTitle]: '删除服务器',
    [BrightChatStrings.DMSidebar_NoConversations]: '还没有对话',
    [BrightChatStrings.DMSidebar_NoGroups]: '还没有群聊',

    // Encryption
    [BrightChatStrings.Encryption_E2E]: '端到端加密',
    [BrightChatStrings.Encryption_E2E_AriaLabel]: '此对话已端到端加密',
    [BrightChatStrings.Encryption_EncryptedServer]: '加密服务器',
    [BrightChatStrings.Encryption_ServerEncrypted]: '已加密',

    // Key Rotation
    [BrightChatStrings.KeyRotation_MemberJoined]: '加密密钥已更新 — 有成员加入',
    [BrightChatStrings.KeyRotation_MemberLeft]: '加密密钥已更新 — 有成员离开',
    [BrightChatStrings.KeyRotation_MemberRemoved]:
      '加密密钥已更新 — 有成员被移除',

    // Channel List View
    [BrightChatStrings.ChannelList_Title]: '频道',
    [BrightChatStrings.ChannelList_Empty]: '还没有频道。',
    [BrightChatStrings.ChannelList_Join]: '加入',
    [BrightChatStrings.ChannelList_Joining]: '加入中…',
    [BrightChatStrings.ChannelList_MemberCount]: '成员',

    // Group List View
    [BrightChatStrings.GroupList_Title]: '群组',
    [BrightChatStrings.GroupList_Empty]: '还没有群组。',
    [BrightChatStrings.GroupList_MemberCount]: '成员',

    // Create Server Dialog extras
    [BrightChatStrings.Create_Server_IconLabelOptional]: '图标URL（可选）',
    [BrightChatStrings.Create_Server_Creating]: '创建中…',
    [BrightChatStrings.Create_Server_NameRequired]: '服务器名称为必填项',
    [BrightChatStrings.Create_Server_NameTooLong]:
      '服务器名称不能超过100个字符',
    [BrightChatStrings.Create_Server_Failed]: '创建服务器失败',

    // Create DM Dialog extras
    [BrightChatStrings.Create_DM_SearchLabel]: '搜索用户',
    [BrightChatStrings.Create_DM_SearchHint]: '输入名称…',
    [BrightChatStrings.Create_DM_NoUsersFound]: '未找到用户',
    [BrightChatStrings.Create_DM_SelectUser]: '请选择一个用户',
    [BrightChatStrings.Create_DM_Starting]: '启动中…',
    [BrightChatStrings.Create_DM_StartConversation]: '开始对话',
    [BrightChatStrings.Create_DM_Failed]: '无法开始对话',

    // Channel Permissions Panel
    [BrightChatStrings.Permissions_SelectChannel]: '选择一个频道以查看权限。',
    [BrightChatStrings.Permissions_PermissionsFor]: '权限适用于',
    [BrightChatStrings.Permissions_MembersWith]: '拥有此角色的成员',
    [BrightChatStrings.Permissions_NoMembers]: '没有拥有此角色的成员',
    [BrightChatStrings.Permissions_Joined]: '已加入',
    [BrightChatStrings.Permissions_DeleteOwnMessages]: '删除自己的消息',
    [BrightChatStrings.Permissions_DeleteAnyMessage]: '删除任意消息',
    [BrightChatStrings.Permissions_ManageRoles]: '管理角色',

    // Roles
    [BrightChatStrings.Role_Owner]: '所有者',
    [BrightChatStrings.Role_Admin]: '管理员',
    [BrightChatStrings.Role_Moderator]: '版主',
    [BrightChatStrings.Role_Member]: '成员',

    // Channel Sidebar extras
    [BrightChatStrings.Channel_Sidebar_Uncategorized]: '未分类',

    // Message Thread extras
    [BrightChatStrings.MessageThread_Pinned]: '置顶消息',
    [BrightChatStrings.MessageThread_Edited]: '（已编辑）',
    [BrightChatStrings.MessageThread_TypingSingle]: '正在输入…',
    [BrightChatStrings.MessageThread_TypingMultiple]: '正在输入…',

    // Layout
    [BrightChatStrings.Layout_BreadcrumbLabel]: 'BrightChat 面包屑导航',
    [BrightChatStrings.Layout_UserProfile]: '用户资料',
    [BrightChatStrings.Layout_OpenNavigation]: '打开导航',

    // Friends Suggestion Section
    [BrightChatStrings.Friends_SectionTitle]: '好友',

    // Server Icon Upload
    [BrightChatStrings.Server_Icon_Upload]: '上传图标',
    [BrightChatStrings.Server_Icon_Change]: '更换图标',
    [BrightChatStrings.Server_Icon_Remove]: '移除图标',
    [BrightChatStrings.Server_Icon_RemoveConfirm]: '确定要移除服务器图标吗？',
    [BrightChatStrings.Server_Icon_RemoveConfirmTitle]: '移除服务器图标',
    [BrightChatStrings.Server_Icon_Uploading]: '上传中…',
    [BrightChatStrings.Server_Icon_UploadFailed]: '图标上传失败',
    [BrightChatStrings.Server_Icon_UploadSuccess]: '图标上传成功',
    [BrightChatStrings.Server_Icon_FileTooLarge]:
      '文件过大。最大允许大小为5MB。',
    [BrightChatStrings.Server_Icon_InvalidType]:
      '文件类型无效。允许的类型：PNG、JPEG、GIF、WebP。',
    [BrightChatStrings.Server_Icon_CropTitle]: '裁剪服务器图标',
    [BrightChatStrings.Server_Icon_CropConfirm]: '应用',
    [BrightChatStrings.Server_Icon_CropCancel]: '取消',
    [BrightChatStrings.Server_Icon_ZoomLabel]: '缩放',
    [BrightChatStrings.Server_Icon_PreviewAlt]: '服务器图标预览',
    [BrightChatStrings.Server_Icon_UploadLabel]: '上传服务器图标',
    [BrightChatStrings.Server_Icon_DropOrBrowse]: '拖放图片或点击浏览',
    [BrightChatStrings.Server_Icon_StagingFailed]: '文件上传准备失败',
    [BrightChatStrings.Server_Icon_StagingExpired]:
      '准备的文件已过期。请重新选择图片。',

    // FontAwesome Icon Picker
    [BrightChatStrings.IconPicker_Title]: '选择图标',
    [BrightChatStrings.IconPicker_SearchPlaceholder]: '搜索图标...',
    [BrightChatStrings.IconPicker_NoMatchTemplate]: '没有匹配"{0}"的图标',
    [BrightChatStrings.IconPicker_Cancel]: '取消',
    [BrightChatStrings.IconPicker_RemoveIcon]: '移除图标',
    [BrightChatStrings.IconPicker_CurrentLabel]: '当前:',
  };
