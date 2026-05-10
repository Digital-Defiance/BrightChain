import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightHubStringKey,
  BrightHubStrings,
} from '../../enumerations/brightHubStrings';

export const BrightHubMandarinStrings: ComponentStrings<BrightHubStringKey> = {
  // PostCard
  [BrightHubStrings.PostCard_Reposted]: '已转发',
  [BrightHubStrings.PostCard_Edited]: '已编辑',
  [BrightHubStrings.PostCard_HubRestricted]: '仅Hub成员可见',
  [BrightHubStrings.PostCard_Deleted]: '此帖子已被删除。',
  [BrightHubStrings.PostCard_ReplyAriaTemplate]: '回复，{COUNT}条回复',
  [BrightHubStrings.PostCard_RepostAriaTemplate]: '转发，{COUNT}次转发',
  [BrightHubStrings.PostCard_LikeAriaTemplate]: '点赞，{COUNT}个赞',
  [BrightHubStrings.PostCard_UnlikeAriaTemplate]: '取消点赞，{COUNT}个赞',
  [BrightHubStrings.PostCard_PostByAriaTemplate]: '{NAME}的帖子',

  // PostComposer
  [BrightHubStrings.PostComposer_Placeholder]: '有什么新鲜事？',
  [BrightHubStrings.PostComposer_ReplyPlaceholder]: '发布你的回复',
  [BrightHubStrings.PostComposer_ReplyingTo]: '回复',
  [BrightHubStrings.PostComposer_CancelReply]: '取消回复',
  [BrightHubStrings.PostComposer_Bold]: '粗体',
  [BrightHubStrings.PostComposer_Italic]: '斜体',
  [BrightHubStrings.PostComposer_Code]: '代码',
  [BrightHubStrings.PostComposer_Emoji]: '插入表情',
  [BrightHubStrings.PostComposer_AttachImage]: '附加图片',
  [BrightHubStrings.PostComposer_RemoveAttachmentTemplate]: '移除附件{INDEX}',
  [BrightHubStrings.PostComposer_AttachmentAltTemplate]: '附件{INDEX}',
  [BrightHubStrings.PostComposer_VisibleTo]: '可见范围',
  [BrightHubStrings.PostComposer_VisibilityPublic]: '公开',
  [BrightHubStrings.PostComposer_VisibilityFollowersOnly]: '仅关注者',
  [BrightHubStrings.PostComposer_VisibilityFriendsOnly]: '仅朋友',
  [BrightHubStrings.PostComposer_VisibilityHubOnly]: '仅中心成员',
  [BrightHubStrings.PostComposer_MembersTemplate]: '{COUNT}位成员',
  [BrightHubStrings.PostComposer_SubmitPost]: '提交帖子',
  [BrightHubStrings.PostComposer_Post]: '发布',
  [BrightHubStrings.PostComposer_Reply]: '回复',

  [BrightHubStrings.PostComposer_Preview]: '预览',
  [BrightHubStrings.PostComposer_PreviewAriaLabel]: '帖子内容预览',
  [BrightHubStrings.PostComposer_MarkupHelp]: '格式帮助',
  [BrightHubStrings.PostComposer_MarkupHelpAriaLabel]: '帖子格式与标记参考',
  [BrightHubStrings.PostComposer_MarkupHelpClose]: '关闭',
  [BrightHubStrings.PostComposer_MarkupHelpTabPost]: '帖子格式',
  [BrightHubStrings.PostComposer_MarkupHelpTabIcons]: '图标标记',
  [BrightHubStrings.PostComposer_ImageLimitReached]: '每篇帖子最多20张图片',
  [BrightHubStrings.PostComposer_ImageUploadFailed]: '图片上传失败',
  [BrightHubStrings.PostComposer_Uploading]: '上传中...',
  [BrightHubStrings.PostComposer_InsertImage]: '插入图片',
  [BrightHubStrings.PostComposer_RemoveAttachment]: '移除附件',
  [BrightHubStrings.PostComposer_AttachmentLimitReached]: '每篇帖子最多4个附件',
  [BrightHubStrings.PostComposer_EditAltText]: '编辑替代文本',
  [BrightHubStrings.PostComposer_AltText]: '替代文本',
  [BrightHubStrings.PostComposer_Save]: '保存',
  [BrightHubStrings.PostComposer_Cancel]: '取消',
  [BrightHubStrings.PostComposer_InsertIcon]: '插入图标',
  [BrightHubStrings.PostComposer_IconSearchPlaceholder]: '搜索图标...',
  [BrightHubStrings.PostComposer_IconNoMatchTemplate]:
    '没有匹配"{0}"的图标',
  [BrightHubStrings.PostComposer_IconStyleOptions]: '样式选项',
  [BrightHubStrings.PostComposer_IconColor]: '颜色',
  [BrightHubStrings.PostComposer_IconColorNone]: '无',
  [BrightHubStrings.PostComposer_IconAnimation]: '动画',
  [BrightHubStrings.PostComposer_IconAnimationNone]: '无',
  [BrightHubStrings.PostComposer_IconRotation]: '旋转',
  [BrightHubStrings.PostComposer_IconRotationNone]: '无',
  [BrightHubStrings.PostComposer_IconSize]: '大小',
  [BrightHubStrings.PostComposer_IconSizeDefault]: '默认',
  [BrightHubStrings.PostComposer_IconPreview]: '预览',

  // ImageCropDialog
  [BrightHubStrings.ImageCropDialog_Title]: '裁剪图片',
  [BrightHubStrings.ImageCropDialog_Crop]: '裁剪',
  [BrightHubStrings.ImageCropDialog_Skip]: '使用原图',
  [BrightHubStrings.ImageCropDialog_Cancel]: '取消',
  [BrightHubStrings.ImageCropDialog_ZoomLabel]: '缩放',
  [BrightHubStrings.ImageCropDialog_PreviewAlt]: '裁剪预览',

  // Timeline
  [BrightHubStrings.Timeline_AriaLabel]: '时间线',
  [BrightHubStrings.Timeline_FilteredByTemplate]: '筛选条件：{LABEL}',
  [BrightHubStrings.Timeline_ClearFilter]: '清除',
  [BrightHubStrings.Timeline_EmptyDefault]:
    '暂无帖子。关注一些人以在此查看他们的帖子。',
  [BrightHubStrings.Timeline_LoadingPosts]: '正在加载帖子',
  [BrightHubStrings.Timeline_AllCaughtUp]: '已全部看完',

  // ThreadView
  [BrightHubStrings.ThreadView_AriaLabel]: '讨论串',
  [BrightHubStrings.ThreadView_ParentDeleted]: '原帖已被删除',
  [BrightHubStrings.ThreadView_ReplyCountSingular]: '1条回复',
  [BrightHubStrings.ThreadView_ReplyCountPluralTemplate]: '{COUNT}条回复',
  [BrightHubStrings.ThreadView_ParticipantCountSingular]: '1位参与者',
  [BrightHubStrings.ThreadView_ParticipantCountPluralTemplate]:
    '{COUNT}位参与者',
  [BrightHubStrings.ThreadView_NoReplies]: '暂无回复。成为第一个回复的人！',

  // FollowButton
  [BrightHubStrings.FollowButton_Follow]: '关注',
  [BrightHubStrings.FollowButton_Following]: '已关注',
  [BrightHubStrings.FollowButton_Unfollow]: '取消关注',

  // LikeButton
  [BrightHubStrings.LikeButton_LikeAriaTemplate]: '点赞，{COUNT}个赞',
  [BrightHubStrings.LikeButton_UnlikeAriaTemplate]: '取消点赞，{COUNT}个赞',

  // RepostButton
  [BrightHubStrings.RepostButton_RepostAriaTemplate]: '转发，{COUNT}次转发',
  [BrightHubStrings.RepostButton_UndoRepostAriaTemplate]:
    '撤销转发，{COUNT}次转发',

  // UserProfileCard
  [BrightHubStrings.UserProfileCard_Verified]: '已认证',
  [BrightHubStrings.UserProfileCard_ProtectedAccount]: '受保护的账户',
  [BrightHubStrings.UserProfileCard_ProfileOfTemplate]: '{NAME}的个人资料',
  [BrightHubStrings.UserProfileCard_Following]: '正在关注',
  [BrightHubStrings.UserProfileCard_Followers]: '粉丝',
  [BrightHubStrings.UserProfileCard_Friends]: '朋友',
  [BrightHubStrings.UserProfileCard_FriendsTab]: '朋友',
  [BrightHubStrings.UserProfileCard_FriendsHidden]: '该用户已隐藏其好友列表',
  [BrightHubStrings.UserProfileCard_StrongConnection]: '强连接',
  [BrightHubStrings.UserProfileCard_ModerateConnection]: '中等连接',
  [BrightHubStrings.UserProfileCard_WeakConnection]: '弱连接',
  [BrightHubStrings.UserProfileCard_DormantConnection]: '休眠连接',
  [BrightHubStrings.UserProfileCard_MutualConnectionSingular]: '1个共同好友',
  [BrightHubStrings.UserProfileCard_MutualConnectionPluralTemplate]:
    '{COUNT}个共同好友',

  // SearchResults
  [BrightHubStrings.SearchResults_AriaTemplate]: '"{QUERY}"的搜索结果',
  [BrightHubStrings.SearchResults_TabAll]: '全部',
  [BrightHubStrings.SearchResults_TabPosts]: '帖子',
  [BrightHubStrings.SearchResults_TabPostsTemplate]: '帖子（{COUNT}）',
  [BrightHubStrings.SearchResults_TabUsers]: '用户',
  [BrightHubStrings.SearchResults_TabUsersTemplate]: '用户（{COUNT}）',
  [BrightHubStrings.SearchResults_NoResultsTemplate]: '未找到"{QUERY}"的结果',
  [BrightHubStrings.SearchResults_EnterSearchTerm]:
    '输入搜索词以查找帖子和用户',
  [BrightHubStrings.SearchResults_SectionPeople]: '用户',
  [BrightHubStrings.SearchResults_SectionPosts]: '帖子',
  [BrightHubStrings.SearchResults_Loading]: '正在加载搜索结果',
  [BrightHubStrings.SearchResults_EndOfResults]: '已到底部',

  // ConnectionListManager
  [BrightHubStrings.ConnectionListManager_Title]: '连接列表',
  [BrightHubStrings.ConnectionListManager_CreateList]: '创建列表',
  [BrightHubStrings.ConnectionListManager_EditList]: '编辑列表',
  [BrightHubStrings.ConnectionListManager_DeleteList]: '删除列表',
  [BrightHubStrings.ConnectionListManager_DeleteConfirmTemplate]:
    '确定要删除"{NAME}"吗？所有成员将被移除。',
  [BrightHubStrings.ConnectionListManager_DeleteConfirmAction]: '删除',
  [BrightHubStrings.ConnectionListManager_Cancel]: '取消',
  [BrightHubStrings.ConnectionListManager_Save]: '保存',
  [BrightHubStrings.ConnectionListManager_ListName]: '列表名称',
  [BrightHubStrings.ConnectionListManager_ListDescription]: '描述',
  [BrightHubStrings.ConnectionListManager_Visibility]: '可见性',
  [BrightHubStrings.ConnectionListManager_VisibilityPrivate]: '私密',
  [BrightHubStrings.ConnectionListManager_VisibilityFollowersOnly]:
    '仅关注者可见',
  [BrightHubStrings.ConnectionListManager_VisibilityPublic]: '公开',
  [BrightHubStrings.ConnectionListManager_MembersTemplate]: '{COUNT}位成员',
  [BrightHubStrings.ConnectionListManager_FollowersTemplate]: '{COUNT}位关注者',
  [BrightHubStrings.ConnectionListManager_EmptyState]: '暂无连接列表',
  [BrightHubStrings.ConnectionListManager_EmptyStateHint]:
    '创建一个列表来整理你的连接。',
  [BrightHubStrings.ConnectionListManager_AddMembers]: '添加成员',
  [BrightHubStrings.ConnectionListManager_RemoveMembers]: '移除成员',
  [BrightHubStrings.ConnectionListManager_AddMembersTitle]: '向列表添加成员',
  [BrightHubStrings.ConnectionListManager_RemoveMembersTitle]: '从列表移除成员',
  [BrightHubStrings.ConnectionListManager_UserIdsPlaceholder]:
    '输入用户ID，每行一个',
  [BrightHubStrings.ConnectionListManager_Loading]: '正在加载列表…',
  [BrightHubStrings.ConnectionListManager_AriaLabel]: '连接列表管理器',

  // ConnectionListCard
  [BrightHubStrings.ConnectionListCard_AriaLabel]: '连接列表：{NAME}',
  [BrightHubStrings.ConnectionListCard_MembersTemplate]: '{COUNT}位成员',
  [BrightHubStrings.ConnectionListCard_FollowersTemplate]: '{COUNT}位关注者',
  [BrightHubStrings.ConnectionListCard_VisibilityPrivate]: '私密',
  [BrightHubStrings.ConnectionListCard_VisibilityFollowersOnly]: '仅关注者可见',
  [BrightHubStrings.ConnectionListCard_VisibilityPublic]: '公开',
  [BrightHubStrings.ConnectionListCard_CreatedAtTemplate]: '创建于{DATE}',

  // ConnectionCategorySelector
  [BrightHubStrings.ConnectionCategorySelector_Title]: '分类',
  [BrightHubStrings.ConnectionCategorySelector_AriaLabel]: '连接分类选择器',
  [BrightHubStrings.ConnectionCategorySelector_DefaultIndicator]: '默认',
  [BrightHubStrings.ConnectionCategorySelector_NoneAvailable]: '暂无可用分类',

  // ConnectionNoteEditor
  [BrightHubStrings.ConnectionNoteEditor_Title]: '备注',
  [BrightHubStrings.ConnectionNoteEditor_AriaLabel]: '连接备注',
  [BrightHubStrings.ConnectionNoteEditor_Placeholder]:
    '添加关于此连接的私密备注…',
  [BrightHubStrings.ConnectionNoteEditor_EmptyState]:
    '暂无备注。添加一条私密备注，记录关于此连接的信息。',
  [BrightHubStrings.ConnectionNoteEditor_Save]: '保存',
  [BrightHubStrings.ConnectionNoteEditor_Delete]: '删除',
  [BrightHubStrings.ConnectionNoteEditor_Cancel]: '取消',
  [BrightHubStrings.ConnectionNoteEditor_DeleteConfirmTitle]: '删除备注？',
  [BrightHubStrings.ConnectionNoteEditor_DeleteConfirmMessage]:
    '确定要删除此备注吗？此操作无法撤销。',
  [BrightHubStrings.ConnectionNoteEditor_DeleteConfirmAction]: '删除',

  // ConnectionSuggestions
  [BrightHubStrings.ConnectionSuggestions_Title]: '推荐连接',
  [BrightHubStrings.ConnectionSuggestions_AriaLabel]: '连接推荐',
  [BrightHubStrings.ConnectionSuggestions_EmptyState]:
    '暂无推荐。稍后再来看看！',
  [BrightHubStrings.ConnectionSuggestions_Loading]: '正在加载推荐…',
  [BrightHubStrings.ConnectionSuggestions_Follow]: '关注',
  [BrightHubStrings.ConnectionSuggestions_Dismiss]: '忽略',
  [BrightHubStrings.ConnectionSuggestions_MutualCountSingular]: '1个共同好友',
  [BrightHubStrings.ConnectionSuggestions_MutualCountPluralTemplate]:
    '{COUNT}个共同好友',
  [BrightHubStrings.ConnectionSuggestions_ReasonMutualConnections]:
    '基于共同好友',
  [BrightHubStrings.ConnectionSuggestions_ReasonSimilarInterests]:
    '基于相似兴趣',
  [BrightHubStrings.ConnectionSuggestions_ReasonSimilarToUser]:
    '与你关注的人相似',
  [BrightHubStrings.ConnectionSuggestions_ReasonMutualFriends]: '共同朋友',

  // MutualConnections
  [BrightHubStrings.MutualConnections_Title]: '共同好友',
  [BrightHubStrings.MutualConnections_AriaLabel]: '共同好友',
  [BrightHubStrings.MutualConnections_Loading]: '正在加载共同好友…',
  [BrightHubStrings.MutualConnections_EmptyState]: '没有共同好友',
  [BrightHubStrings.MutualConnections_CountSingular]: '1个共同好友',
  [BrightHubStrings.MutualConnections_CountPluralTemplate]: '{COUNT}个共同好友',
  [BrightHubStrings.MutualConnections_LoadMore]: '加载更多',

  // ConnectionStrengthIndicator
  [BrightHubStrings.ConnectionStrengthIndicator_Title]: '连接强度',
  [BrightHubStrings.ConnectionStrengthIndicator_AriaLabel]: '连接强度指示器',
  [BrightHubStrings.ConnectionStrengthIndicator_Strong]: '强',
  [BrightHubStrings.ConnectionStrengthIndicator_Moderate]: '中等',
  [BrightHubStrings.ConnectionStrengthIndicator_Weak]: '弱',
  [BrightHubStrings.ConnectionStrengthIndicator_Dormant]: '休眠',

  // HubManager
  [BrightHubStrings.HubManager_Title]: 'Hub',
  [BrightHubStrings.HubManager_AriaLabel]: 'Hub管理器',
  [BrightHubStrings.HubManager_CreateHub]: '创建Hub',
  [BrightHubStrings.HubManager_EditHub]: '编辑Hub',
  [BrightHubStrings.HubManager_DeleteHub]: '删除Hub',
  [BrightHubStrings.HubManager_HubName]: 'Hub名称',
  [BrightHubStrings.HubManager_HubDescription]: '描述',
  [BrightHubStrings.HubManager_MembersTemplate]: '{COUNT}位成员',
  [BrightHubStrings.HubManager_EmptyState]: '暂无Hub。',
  [BrightHubStrings.HubManager_EmptyStateHint]:
    '创建一个Hub，与特定的连接群组分享内容。',
  [BrightHubStrings.HubManager_Save]: '保存',
  [BrightHubStrings.HubManager_Cancel]: '取消',
  [BrightHubStrings.HubManager_DeleteConfirmTemplate]:
    '确定要删除"{NAME}"吗？所有成员将被移除。',
  [BrightHubStrings.HubManager_DeleteConfirmAction]: '删除',
  [BrightHubStrings.HubManager_AddMembers]: '添加成员',
  [BrightHubStrings.HubManager_AddMembersTitle]: '向Hub添加成员',
  [BrightHubStrings.HubManager_RemoveMembers]: '移除成员',
  [BrightHubStrings.HubManager_RemoveMembersTitle]: '从Hub移除成员',
  [BrightHubStrings.HubManager_UserIdsPlaceholder]: '输入用户ID，每行一个',
  [BrightHubStrings.HubManager_Loading]: '正在加载Hub…',
  [BrightHubStrings.HubManager_DefaultBadge]: '默认',

  // HubSelector
  [BrightHubStrings.HubSelector_Title]: '帖子可见范围',
  [BrightHubStrings.HubSelector_AriaLabel]: '帖子可见范围Hub选择器',
  [BrightHubStrings.HubSelector_MembersTemplate]: '{COUNT}位成员',
  [BrightHubStrings.HubSelector_NoneAvailable]: '暂无可用Hub。',
  [BrightHubStrings.HubSelector_NoneSelected]: '对所有关注者可见',
  [BrightHubStrings.HubSelector_SelectedCountTemplate]: '已选择{COUNT}个Hub',
  [BrightHubStrings.HubSelector_DefaultBadge]: '默认',

  // FollowRequestList
  [BrightHubStrings.FollowRequestList_Title]: '关注请求',
  [BrightHubStrings.FollowRequestList_AriaLabel]: '待处理的关注请求',
  [BrightHubStrings.FollowRequestList_Loading]: '正在加载关注请求…',
  [BrightHubStrings.FollowRequestList_EmptyState]: '没有待处理的关注请求',
  [BrightHubStrings.FollowRequestList_Approve]: '批准',
  [BrightHubStrings.FollowRequestList_Reject]: '拒绝',
  [BrightHubStrings.FollowRequestList_PendingCountTemplate]:
    '{COUNT}个待处理请求',
  [BrightHubStrings.FollowRequestList_PendingCountSingular]: '1个待处理请求',
  [BrightHubStrings.FollowRequestList_CustomMessage]: '留言',

  // ConnectionPrivacySettings
  [BrightHubStrings.ConnectionPrivacySettings_Title]: '隐私设置',
  [BrightHubStrings.ConnectionPrivacySettings_AriaLabel]: '连接隐私设置',
  [BrightHubStrings.ConnectionPrivacySettings_HideFollowerCount]:
    '隐藏粉丝数量',
  [BrightHubStrings.ConnectionPrivacySettings_HideFollowingCount]:
    '隐藏关注数量',
  [BrightHubStrings.ConnectionPrivacySettings_HideFollowersFromNonFollowers]:
    '对非关注者隐藏粉丝列表',
  [BrightHubStrings.ConnectionPrivacySettings_HideFollowingFromNonFollowers]:
    '对非关注者隐藏关注列表',
  [BrightHubStrings.ConnectionPrivacySettings_AllowDmsFromNonFollowers]:
    '允许非关注者发送私信',
  [BrightHubStrings.ConnectionPrivacySettings_ShowOnlineStatus]: '显示在线状态',
  [BrightHubStrings.ConnectionPrivacySettings_ShowReadReceipts]: '显示已读回执',
  [BrightHubStrings.ConnectionPrivacySettings_HideFriendsFromNonFriends]:
    '对非好友隐藏好友列表',
  [BrightHubStrings.ConnectionPrivacySettings_ApproveFollowersMode]:
    '关注者审批模式',
  [BrightHubStrings.ConnectionPrivacySettings_ApproveNone]: '自动批准所有人',
  [BrightHubStrings.ConnectionPrivacySettings_ApproveAll]: '所有人需要审批',
  [BrightHubStrings.ConnectionPrivacySettings_ApproveNonMutuals]:
    '非互关用户需要审批',
  [BrightHubStrings.ConnectionPrivacySettings_Save]: '保存',

  // TemporaryMuteDialog
  [BrightHubStrings.TemporaryMuteDialog_Title]: '静音用户',
  [BrightHubStrings.TemporaryMuteDialog_AriaLabel]: '临时静音对话框',
  [BrightHubStrings.TemporaryMuteDialog_MuteUserTemplate]: '静音{USERNAME}',
  [BrightHubStrings.TemporaryMuteDialog_Duration1h]: '1小时',
  [BrightHubStrings.TemporaryMuteDialog_Duration8h]: '8小时',
  [BrightHubStrings.TemporaryMuteDialog_Duration24h]: '24小时',
  [BrightHubStrings.TemporaryMuteDialog_Duration7d]: '7天',
  [BrightHubStrings.TemporaryMuteDialog_Duration30d]: '30天',
  [BrightHubStrings.TemporaryMuteDialog_Permanent]: '永久静音',
  [BrightHubStrings.TemporaryMuteDialog_Mute]: '静音',
  [BrightHubStrings.TemporaryMuteDialog_Cancel]: '取消',

  // ConnectionInsights
  [BrightHubStrings.ConnectionInsights_Title]: '连接洞察',
  [BrightHubStrings.ConnectionInsights_AriaLabel]: '连接洞察',
  [BrightHubStrings.ConnectionInsights_Period7d]: '7天',
  [BrightHubStrings.ConnectionInsights_Period30d]: '30天',
  [BrightHubStrings.ConnectionInsights_Period90d]: '90天',
  [BrightHubStrings.ConnectionInsights_PeriodAllTime]: '全部时间',
  [BrightHubStrings.ConnectionInsights_Interactions]: '互动',
  [BrightHubStrings.ConnectionInsights_Messages]: '消息',
  [BrightHubStrings.ConnectionInsights_Likes]: '点赞',
  [BrightHubStrings.ConnectionInsights_Reposts]: '转发',
  [BrightHubStrings.ConnectionInsights_Replies]: '回复',
  [BrightHubStrings.ConnectionInsights_EmptyState]: '暂无互动数据',
  [BrightHubStrings.ConnectionInsights_Loading]: '正在加载连接洞察…',

  // ListTimelineFilter
  [BrightHubStrings.ListTimelineFilter_Title]: '按列表筛选',
  [BrightHubStrings.ListTimelineFilter_AriaLabel]: '按连接列表筛选时间线',
  [BrightHubStrings.ListTimelineFilter_AllConnections]: '所有连接',
  [BrightHubStrings.ListTimelineFilter_SelectList]: '选择列表',
  [BrightHubStrings.ListTimelineFilter_MembersTemplate]: '（{COUNT}位成员）',
  [BrightHubStrings.ListTimelineFilter_ClearFilter]: '清除筛选',

  // MessagingInbox
  [BrightHubStrings.MessagingInbox_Title]: '消息',
  [BrightHubStrings.MessagingInbox_AriaLabel]: '消息收件箱',
  [BrightHubStrings.MessagingInbox_Loading]: '正在加载对话',
  [BrightHubStrings.MessagingInbox_EmptyState]: '暂无对话。',
  [BrightHubStrings.MessagingInbox_EmptyStateHint]: '发起新对话开始聊天吧。',
  [BrightHubStrings.MessagingInbox_Pinned]: '已置顶',
  [BrightHubStrings.MessagingInbox_UnreadTemplate]: '{COUNT}条未读',
  [BrightHubStrings.MessagingInbox_NewConversation]: '新对话',
  [BrightHubStrings.MessagingInbox_GroupBadge]: '群组',

  // ConversationView
  [BrightHubStrings.ConversationView_AriaLabel]: '对话视图',
  [BrightHubStrings.ConversationView_Loading]: '正在加载消息',
  [BrightHubStrings.ConversationView_EmptyState]:
    '暂无消息。发送第一条消息吧！',
  [BrightHubStrings.ConversationView_LoadMore]: '加载更多',

  // MessageComposer
  [BrightHubStrings.MessageComposer_Placeholder]: '输入消息…',
  [BrightHubStrings.MessageComposer_AriaLabel]: '消息编辑器',
  [BrightHubStrings.MessageComposer_Send]: '发送',
  [BrightHubStrings.MessageComposer_AttachFile]: '附加文件',
  [BrightHubStrings.MessageComposer_ReplyingTo]: '回复',
  [BrightHubStrings.MessageComposer_CancelReply]: '取消回复',

  // MessageRequestsList
  [BrightHubStrings.MessageRequestsList_Title]: '消息请求',
  [BrightHubStrings.MessageRequestsList_AriaLabel]: '消息请求列表',
  [BrightHubStrings.MessageRequestsList_Loading]: '正在加载请求',
  [BrightHubStrings.MessageRequestsList_EmptyState]: '没有待处理的请求。',
  [BrightHubStrings.MessageRequestsList_Accept]: '接受',
  [BrightHubStrings.MessageRequestsList_Decline]: '拒绝',
  [BrightHubStrings.MessageRequestsList_PendingCountTemplate]:
    '{COUNT}条待处理',

  // MessageBubble
  [BrightHubStrings.MessageBubble_AriaLabel]: '消息',
  [BrightHubStrings.MessageBubble_Edited]: '已编辑',
  [BrightHubStrings.MessageBubble_Forwarded]: '已转发',
  [BrightHubStrings.MessageBubble_Deleted]: '此消息已被删除。',
  [BrightHubStrings.MessageBubble_ReplyTo]: '回复',

  // TypingIndicator
  [BrightHubStrings.TypingIndicator_AriaLabel]: '正在输入指示器',
  [BrightHubStrings.TypingIndicator_SingleTemplate]: '{NAME}正在输入…',
  [BrightHubStrings.TypingIndicator_MultipleTemplate]: '{COUNT}人正在输入…',

  // ReadReceipt
  [BrightHubStrings.ReadReceipt_AriaLabel]: '已读回执',
  [BrightHubStrings.ReadReceipt_Sent]: '已发送',
  [BrightHubStrings.ReadReceipt_Delivered]: '已送达',
  [BrightHubStrings.ReadReceipt_SeenTemplate]: '已读 {TIMESTAMP}',

  // MessageReactions
  [BrightHubStrings.MessageReactions_AriaLabel]: '消息回应',
  [BrightHubStrings.MessageReactions_AddReaction]: '添加回应',
  [BrightHubStrings.MessageReactions_CountTemplate]: '{COUNT}',
  [BrightHubStrings.MessageReactions_RemoveReaction]: '移除回应',

  // GroupConversationSettings
  [BrightHubStrings.GroupConversationSettings_Title]: '群组设置',
  [BrightHubStrings.GroupConversationSettings_AriaLabel]: '群组对话设置',
  [BrightHubStrings.GroupConversationSettings_GroupName]: '群组名称',
  [BrightHubStrings.GroupConversationSettings_GroupAvatar]: '群组头像',
  [BrightHubStrings.GroupConversationSettings_Participants]: '参与者',
  [BrightHubStrings.GroupConversationSettings_ParticipantCountTemplate]:
    '{COUNT}位参与者',
  [BrightHubStrings.GroupConversationSettings_AddParticipant]: '添加参与者',
  [BrightHubStrings.GroupConversationSettings_RemoveParticipant]: '移除参与者',
  [BrightHubStrings.GroupConversationSettings_PromoteToAdmin]: '提升为管理员',
  [BrightHubStrings.GroupConversationSettings_DemoteFromAdmin]: '撤销管理员',
  [BrightHubStrings.GroupConversationSettings_AdminBadge]: '管理员',
  [BrightHubStrings.GroupConversationSettings_Save]: '保存',
  [BrightHubStrings.GroupConversationSettings_Cancel]: '取消',
  [BrightHubStrings.GroupConversationSettings_LeaveGroup]: '退出群组',

  // NewConversationDialog
  [BrightHubStrings.NewConversationDialog_Title]: '新对话',
  [BrightHubStrings.NewConversationDialog_AriaLabel]: '新对话对话框',
  [BrightHubStrings.NewConversationDialog_SearchPlaceholder]: '搜索用户…',
  [BrightHubStrings.NewConversationDialog_CreateGroup]: '创建群组',
  [BrightHubStrings.NewConversationDialog_GroupNamePlaceholder]: '群组名称',
  [BrightHubStrings.NewConversationDialog_SelectedTemplate]: '已选择{COUNT}人',
  [BrightHubStrings.NewConversationDialog_Start]: '开始',
  [BrightHubStrings.NewConversationDialog_Cancel]: '取消',
  [BrightHubStrings.NewConversationDialog_NoResults]: '未找到用户',

  // ConversationSearch
  [BrightHubStrings.ConversationSearch_Placeholder]: '在对话中搜索…',
  [BrightHubStrings.ConversationSearch_AriaLabel]: '在对话中搜索',
  [BrightHubStrings.ConversationSearch_NoResults]: '未找到消息',
  [BrightHubStrings.ConversationSearch_ResultCountTemplate]: '{COUNT}条结果',
  [BrightHubStrings.ConversationSearch_Clear]: '清除搜索',

  // MessagingMenuBadge
  [BrightHubStrings.MessagingMenuBadge_AriaLabel]: '消息',
  [BrightHubStrings.MessagingMenuBadge_UnreadTemplate]: '{COUNT}条未读消息',
  [BrightHubStrings.MessagingMenuBadge_NoUnread]: '没有未读消息',

  // NotificationProvider
  [BrightHubStrings.NotificationProvider_Error]: '加载通知失败',

  // NotificationBell
  [BrightHubStrings.NotificationBell_AriaLabel]: '通知',
  [BrightHubStrings.NotificationBell_UnreadTemplate]: '{COUNT}条未读通知',
  [BrightHubStrings.NotificationBell_NoUnread]: '没有未读通知',
  [BrightHubStrings.NotificationBell_Overflow]: '99+',

  // NotificationDropdown
  [BrightHubStrings.NotificationDropdown_Title]: '通知',
  [BrightHubStrings.NotificationDropdown_AriaLabel]: '通知下拉菜单',
  [BrightHubStrings.NotificationDropdown_ViewAll]: '查看全部',
  [BrightHubStrings.NotificationDropdown_MarkAllRead]: '全部标为已读',
  [BrightHubStrings.NotificationDropdown_EmptyState]: '暂无通知',
  [BrightHubStrings.NotificationDropdown_Loading]: '正在加载通知',

  // NotificationItem
  [BrightHubStrings.NotificationItem_AriaLabel]: '通知',
  [BrightHubStrings.NotificationItem_MarkRead]: '标为已读',
  [BrightHubStrings.NotificationItem_Delete]: '删除',
  [BrightHubStrings.NotificationItem_GroupExpandTemplate]: '显示其余{COUNT}条',
  [BrightHubStrings.NotificationItem_GroupCollapseTemplate]: '收起',

  // NotificationList
  [BrightHubStrings.NotificationList_Title]: '通知',
  [BrightHubStrings.NotificationList_AriaLabel]: '通知列表',
  [BrightHubStrings.NotificationList_Loading]: '正在加载通知',
  [BrightHubStrings.NotificationList_EmptyState]: '暂无通知',
  [BrightHubStrings.NotificationList_FilterAll]: '全部',
  [BrightHubStrings.NotificationList_FilterUnread]: '未读',
  [BrightHubStrings.NotificationList_FilterRead]: '已读',
  [BrightHubStrings.NotificationList_LoadMore]: '加载更多',
  [BrightHubStrings.NotificationList_EndOfList]: '没有更多通知了',

  // NotificationPreferences
  [BrightHubStrings.NotificationPreferences_Title]: '通知偏好设置',
  [BrightHubStrings.NotificationPreferences_AriaLabel]: '通知偏好设置',
  [BrightHubStrings.NotificationPreferences_CategorySettings]: '分类设置',
  [BrightHubStrings.NotificationPreferences_ChannelSettings]: '渠道设置',
  [BrightHubStrings.NotificationPreferences_QuietHours]: '免打扰时段',
  [BrightHubStrings.NotificationPreferences_QuietHoursEnabled]:
    '启用免打扰时段',
  [BrightHubStrings.NotificationPreferences_QuietHoursStart]: '开始时间',
  [BrightHubStrings.NotificationPreferences_QuietHoursEnd]: '结束时间',
  [BrightHubStrings.NotificationPreferences_QuietHoursTimezone]: '时区',
  [BrightHubStrings.NotificationPreferences_DoNotDisturb]: '勿扰模式',
  [BrightHubStrings.NotificationPreferences_DndEnabled]: '启用勿扰模式',
  [BrightHubStrings.NotificationPreferences_DndDuration]: '持续时间',
  [BrightHubStrings.NotificationPreferences_SoundEnabled]: '通知声音',
  [BrightHubStrings.NotificationPreferences_Save]: '保存',
  [BrightHubStrings.NotificationPreferences_CategorySocial]: '社交',
  [BrightHubStrings.NotificationPreferences_CategoryMessages]: '消息',
  [BrightHubStrings.NotificationPreferences_CategoryConnections]: '连接',
  [BrightHubStrings.NotificationPreferences_CategorySystem]: '系统',
  [BrightHubStrings.NotificationPreferences_ChannelInApp]: '应用内',
  [BrightHubStrings.NotificationPreferences_ChannelEmail]: '邮件',
  [BrightHubStrings.NotificationPreferences_ChannelPush]: '推送',

  // NotificationCategoryFilter
  [BrightHubStrings.NotificationCategoryFilter_Title]: '按分类筛选',
  [BrightHubStrings.NotificationCategoryFilter_AriaLabel]: '通知分类筛选器',
  [BrightHubStrings.NotificationCategoryFilter_All]: '全部',
  [BrightHubStrings.NotificationCategoryFilter_Social]: '社交',
  [BrightHubStrings.NotificationCategoryFilter_Messages]: '消息',
  [BrightHubStrings.NotificationCategoryFilter_Connections]: '连接',
  [BrightHubStrings.NotificationCategoryFilter_System]: '系统',

  // Navigation / Sidebar
  [BrightHubStrings.Nav_Home]: '首页',
  [BrightHubStrings.Nav_Explore]: '探索',
  [BrightHubStrings.Nav_Notifications]: '通知',
  [BrightHubStrings.Nav_Messages]: '消息',
  [BrightHubStrings.Nav_Profile]: '个人资料',
  [BrightHubStrings.Nav_Connections]: '连接',
  [BrightHubStrings.Nav_Settings]: '设置',
  [BrightHubStrings.Nav_SidebarLabel]: 'BrightHub导航',
  [BrightHubStrings.Nav_SubscribedHubs]: '你的Hub',
  [BrightHubStrings.Nav_CreateHub]: '创建Hub',
  [BrightHubStrings.HubDetail_MembersTemplate]: '{COUNT}位成员',
  [BrightHubStrings.HubDetail_PostsTemplate]: '{COUNT}篇帖子',
  [BrightHubStrings.HubDetail_Join]: '加入',
  [BrightHubStrings.HubDetail_Leave]: '离开',
  [BrightHubStrings.HubDetail_Joined]: '已加入',
  [BrightHubStrings.HubDetail_TrustOpen]: '开放',
  [BrightHubStrings.HubDetail_TrustVerified]: '已验证',
  [BrightHubStrings.HubDetail_TrustEncrypted]: '加密',
  [BrightHubStrings.HubDetail_About]: '关于',
  [BrightHubStrings.HubDetail_Rules]: '规则',
  [BrightHubStrings.HubDetail_SortHot]: '热门',
  [BrightHubStrings.HubDetail_SortNew]: '最新',
  [BrightHubStrings.HubDetail_SortTop]: '最佳',
  [BrightHubStrings.HubDetail_EmptyState]:
    '还没有帖子。成为第一个发起讨论的人！',
  [BrightHubStrings.HubDetail_SubHubs]: '子Hub',
  [BrightHubStrings.Explore_Title]: '探索Hub',
  [BrightHubStrings.Explore_SearchPlaceholder]: '搜索Hub…',
  [BrightHubStrings.Explore_Trending]: '趋势',
  [BrightHubStrings.Explore_New]: '最新',
  [BrightHubStrings.Explore_EmptyState]: '还没有Hub。创建一个开始吧！',
  [BrightHubStrings.Explore_NoResults]: '没有匹配的Hub。',
  [BrightHubStrings.Home_TrendingHubs]: '热门Hub',
  [BrightHubStrings.Home_RecentActivity]: '最近活动',
  [BrightHubStrings.Home_YourHubs]: '你的Hub',
  [BrightHubStrings.Home_SuggestedHubs]: '推荐Hub',
  [BrightHubStrings.Home_ViewAll]: '查看全部',
  [BrightHubStrings.Home_Welcome]: '欢迎来到BrightHub',
  [BrightHubStrings.Home_WelcomeSubtitle]: '加入Hub，查看你感兴趣的社区讨论。',
  [BrightHubStrings.Home_NoHubsYet]: '你还没有加入任何Hub',
  [BrightHubStrings.Home_NoHubsHint]: '探索Hub，找到你感兴趣的社区。',
  [BrightHubStrings.CreateHub_Title]: '创建Hub',
  [BrightHubStrings.CreateHub_NameLabel]: 'Hub名称',
  [BrightHubStrings.CreateHub_NamePlaceholder]: '例如：编程',
  [BrightHubStrings.CreateHub_SlugLabel]: 'URL标识',
  [BrightHubStrings.CreateHub_SlugPlaceholder]: '例如：programming',
  [BrightHubStrings.CreateHub_DescriptionLabel]: '描述',
  [BrightHubStrings.CreateHub_DescriptionPlaceholder]: '这个Hub是关于什么的？',
  [BrightHubStrings.CreateHub_TrustTierLabel]: '信任等级',
  [BrightHubStrings.CreateHub_ParentHubLabel]: '父Hub（可选）',
  [BrightHubStrings.CreateHub_ParentHubNone]: '无（顶级Hub）',
  [BrightHubStrings.CreateHub_Submit]: '创建Hub',
  [BrightHubStrings.CreateHub_Cancel]: '取消',
  [BrightHubStrings.Nav_CreatePost]: '新帖子',
  [BrightHubStrings.Nav_Trending]: '趋势',

  // PinnedPostSection
  [BrightHubStrings.PinnedPostSection_Pinned]: '已置顶',
  [BrightHubStrings.PinnedPostSection_Unpin]: '取消置顶',
  [BrightHubStrings.PinnedPostSection_AriaLabel]: '置顶帖子',

  // EditProfileDialog
  [BrightHubStrings.EditProfileDialog_Title]: '编辑资料',
  [BrightHubStrings.EditProfileDialog_DisplayName]: '显示名称',
  [BrightHubStrings.EditProfileDialog_Bio]: '简介',
  [BrightHubStrings.EditProfileDialog_BioPlaceholder]: '向大家介绍自己。支持 Markdown 和图标。',
  [BrightHubStrings.EditProfileDialog_BioCharCountTemplate]: '{CURRENT}/{MAX}',
  [BrightHubStrings.EditProfileDialog_BioPreview]: '预览',
  [BrightHubStrings.EditProfileDialog_Location]: '位置',
  [BrightHubStrings.EditProfileDialog_WebsiteUrl]: '网站',
  [BrightHubStrings.EditProfileDialog_Save]: '保存',
  [BrightHubStrings.EditProfileDialog_Cancel]: '取消',
  [BrightHubStrings.EditProfileDialog_Saving]: '保存中\u2026',
  [BrightHubStrings.EditProfileDialog_ErrorBioTooLong]: '简介超过最大长度 {MAX} 个字符。',
  [BrightHubStrings.EditProfileDialog_ErrorBioContainsImage]: '简介不能包含图片 Markdown 语法。',

  // UserProfileCard
  [BrightHubStrings.UserProfileCard_EditProfile]: '编辑资料',
};
