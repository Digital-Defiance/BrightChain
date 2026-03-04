import {
  BrandedStringKeyValue,
  createI18nStringKeys,
} from '@digitaldefiance/i18n-lib';

export const BrightHubComponentId = 'BrightHub';

export const BrightHubStrings = createI18nStringKeys(BrightHubComponentId, {
  // PostCard
  PostCard_Reposted: 'PostCard_Reposted',
  PostCard_Edited: 'PostCard_Edited',
  PostCard_HubRestricted: 'PostCard_HubRestricted',
  PostCard_Deleted: 'PostCard_Deleted',
  PostCard_ReplyAriaTemplate: 'PostCard_ReplyAriaTemplate',
  PostCard_RepostAriaTemplate: 'PostCard_RepostAriaTemplate',
  PostCard_LikeAriaTemplate: 'PostCard_LikeAriaTemplate',
  PostCard_UnlikeAriaTemplate: 'PostCard_UnlikeAriaTemplate',
  PostCard_PostByAriaTemplate: 'PostCard_PostByAriaTemplate',

  // PostComposer
  PostComposer_Placeholder: 'PostComposer_Placeholder',
  PostComposer_ReplyPlaceholder: 'PostComposer_ReplyPlaceholder',
  PostComposer_ReplyingTo: 'PostComposer_ReplyingTo',
  PostComposer_CancelReply: 'PostComposer_CancelReply',
  PostComposer_Bold: 'PostComposer_Bold',
  PostComposer_Italic: 'PostComposer_Italic',
  PostComposer_Code: 'PostComposer_Code',
  PostComposer_Emoji: 'PostComposer_Emoji',
  PostComposer_AttachImage: 'PostComposer_AttachImage',
  PostComposer_RemoveAttachmentTemplate:
    'PostComposer_RemoveAttachmentTemplate',
  PostComposer_AttachmentAltTemplate: 'PostComposer_AttachmentAltTemplate',
  PostComposer_VisibleTo: 'PostComposer_VisibleTo',
  PostComposer_MembersTemplate: 'PostComposer_MembersTemplate',
  PostComposer_SubmitPost: 'PostComposer_SubmitPost',
  PostComposer_Post: 'PostComposer_Post',
  PostComposer_Reply: 'PostComposer_Reply',

  // Timeline
  Timeline_AriaLabel: 'Timeline_AriaLabel',
  Timeline_FilteredByTemplate: 'Timeline_FilteredByTemplate',
  Timeline_ClearFilter: 'Timeline_ClearFilter',
  Timeline_EmptyDefault: 'Timeline_EmptyDefault',
  Timeline_LoadingPosts: 'Timeline_LoadingPosts',
  Timeline_AllCaughtUp: 'Timeline_AllCaughtUp',

  // ThreadView
  ThreadView_AriaLabel: 'ThreadView_AriaLabel',
  ThreadView_ParentDeleted: 'ThreadView_ParentDeleted',
  ThreadView_ReplyCountSingular: 'ThreadView_ReplyCountSingular',
  ThreadView_ReplyCountPluralTemplate: 'ThreadView_ReplyCountPluralTemplate',
  ThreadView_ParticipantCountSingular: 'ThreadView_ParticipantCountSingular',
  ThreadView_ParticipantCountPluralTemplate:
    'ThreadView_ParticipantCountPluralTemplate',
  ThreadView_NoReplies: 'ThreadView_NoReplies',

  // FollowButton
  FollowButton_Follow: 'FollowButton_Follow',
  FollowButton_Following: 'FollowButton_Following',
  FollowButton_Unfollow: 'FollowButton_Unfollow',

  // LikeButton
  LikeButton_LikeAriaTemplate: 'LikeButton_LikeAriaTemplate',
  LikeButton_UnlikeAriaTemplate: 'LikeButton_UnlikeAriaTemplate',

  // RepostButton
  RepostButton_RepostAriaTemplate: 'RepostButton_RepostAriaTemplate',
  RepostButton_UndoRepostAriaTemplate: 'RepostButton_UndoRepostAriaTemplate',

  // UserProfileCard
  UserProfileCard_Verified: 'UserProfileCard_Verified',
  UserProfileCard_ProtectedAccount: 'UserProfileCard_ProtectedAccount',
  UserProfileCard_ProfileOfTemplate: 'UserProfileCard_ProfileOfTemplate',
  UserProfileCard_Following: 'UserProfileCard_Following',
  UserProfileCard_Followers: 'UserProfileCard_Followers',
  UserProfileCard_StrongConnection: 'UserProfileCard_StrongConnection',
  UserProfileCard_ModerateConnection: 'UserProfileCard_ModerateConnection',
  UserProfileCard_WeakConnection: 'UserProfileCard_WeakConnection',
  UserProfileCard_DormantConnection: 'UserProfileCard_DormantConnection',
  UserProfileCard_MutualConnectionSingular:
    'UserProfileCard_MutualConnectionSingular',
  UserProfileCard_MutualConnectionPluralTemplate:
    'UserProfileCard_MutualConnectionPluralTemplate',

  // ConnectionListManager
  ConnectionListManager_Title: 'ConnectionListManager_Title',
  ConnectionListManager_CreateList: 'ConnectionListManager_CreateList',
  ConnectionListManager_EditList: 'ConnectionListManager_EditList',
  ConnectionListManager_DeleteList: 'ConnectionListManager_DeleteList',
  ConnectionListManager_DeleteConfirmTemplate:
    'ConnectionListManager_DeleteConfirmTemplate',
  ConnectionListManager_DeleteConfirmAction:
    'ConnectionListManager_DeleteConfirmAction',
  ConnectionListManager_Cancel: 'ConnectionListManager_Cancel',
  ConnectionListManager_Save: 'ConnectionListManager_Save',
  ConnectionListManager_ListName: 'ConnectionListManager_ListName',
  ConnectionListManager_ListDescription:
    'ConnectionListManager_ListDescription',
  ConnectionListManager_Visibility: 'ConnectionListManager_Visibility',
  ConnectionListManager_VisibilityPrivate:
    'ConnectionListManager_VisibilityPrivate',
  ConnectionListManager_VisibilityFollowersOnly:
    'ConnectionListManager_VisibilityFollowersOnly',
  ConnectionListManager_VisibilityPublic:
    'ConnectionListManager_VisibilityPublic',
  ConnectionListManager_MembersTemplate:
    'ConnectionListManager_MembersTemplate',
  ConnectionListManager_FollowersTemplate:
    'ConnectionListManager_FollowersTemplate',
  ConnectionListManager_EmptyState: 'ConnectionListManager_EmptyState',
  ConnectionListManager_EmptyStateHint: 'ConnectionListManager_EmptyStateHint',
  ConnectionListManager_AddMembers: 'ConnectionListManager_AddMembers',
  ConnectionListManager_RemoveMembers: 'ConnectionListManager_RemoveMembers',
  ConnectionListManager_AddMembersTitle:
    'ConnectionListManager_AddMembersTitle',
  ConnectionListManager_RemoveMembersTitle:
    'ConnectionListManager_RemoveMembersTitle',
  ConnectionListManager_UserIdsPlaceholder:
    'ConnectionListManager_UserIdsPlaceholder',
  ConnectionListManager_Loading: 'ConnectionListManager_Loading',
  ConnectionListManager_AriaLabel: 'ConnectionListManager_AriaLabel',

  // ConnectionListCard
  ConnectionListCard_AriaLabel: 'ConnectionListCard_AriaLabel',
  ConnectionListCard_MembersTemplate: 'ConnectionListCard_MembersTemplate',
  ConnectionListCard_FollowersTemplate: 'ConnectionListCard_FollowersTemplate',
  ConnectionListCard_VisibilityPrivate: 'ConnectionListCard_VisibilityPrivate',
  ConnectionListCard_VisibilityFollowersOnly:
    'ConnectionListCard_VisibilityFollowersOnly',
  ConnectionListCard_VisibilityPublic: 'ConnectionListCard_VisibilityPublic',
  ConnectionListCard_CreatedAtTemplate: 'ConnectionListCard_CreatedAtTemplate',

  // ConnectionCategorySelector
  ConnectionCategorySelector_Title: 'ConnectionCategorySelector_Title',
  ConnectionCategorySelector_AriaLabel: 'ConnectionCategorySelector_AriaLabel',
  ConnectionCategorySelector_DefaultIndicator:
    'ConnectionCategorySelector_DefaultIndicator',
  ConnectionCategorySelector_NoneAvailable:
    'ConnectionCategorySelector_NoneAvailable',

  // ConnectionNoteEditor
  ConnectionNoteEditor_Title: 'ConnectionNoteEditor_Title',
  ConnectionNoteEditor_AriaLabel: 'ConnectionNoteEditor_AriaLabel',
  ConnectionNoteEditor_Placeholder: 'ConnectionNoteEditor_Placeholder',
  ConnectionNoteEditor_EmptyState: 'ConnectionNoteEditor_EmptyState',
  ConnectionNoteEditor_Save: 'ConnectionNoteEditor_Save',
  ConnectionNoteEditor_Delete: 'ConnectionNoteEditor_Delete',
  ConnectionNoteEditor_Cancel: 'ConnectionNoteEditor_Cancel',
  ConnectionNoteEditor_DeleteConfirmTitle:
    'ConnectionNoteEditor_DeleteConfirmTitle',
  ConnectionNoteEditor_DeleteConfirmMessage:
    'ConnectionNoteEditor_DeleteConfirmMessage',
  ConnectionNoteEditor_DeleteConfirmAction:
    'ConnectionNoteEditor_DeleteConfirmAction',

  // ConnectionSuggestions
  ConnectionSuggestions_Title: 'ConnectionSuggestions_Title',
  ConnectionSuggestions_AriaLabel: 'ConnectionSuggestions_AriaLabel',
  ConnectionSuggestions_EmptyState: 'ConnectionSuggestions_EmptyState',
  ConnectionSuggestions_Loading: 'ConnectionSuggestions_Loading',
  ConnectionSuggestions_Follow: 'ConnectionSuggestions_Follow',
  ConnectionSuggestions_Dismiss: 'ConnectionSuggestions_Dismiss',
  ConnectionSuggestions_MutualCountSingular:
    'ConnectionSuggestions_MutualCountSingular',
  ConnectionSuggestions_MutualCountPluralTemplate:
    'ConnectionSuggestions_MutualCountPluralTemplate',
  ConnectionSuggestions_ReasonMutualConnections:
    'ConnectionSuggestions_ReasonMutualConnections',
  ConnectionSuggestions_ReasonSimilarInterests:
    'ConnectionSuggestions_ReasonSimilarInterests',
  ConnectionSuggestions_ReasonSimilarToUser:
    'ConnectionSuggestions_ReasonSimilarToUser',

  // MutualConnections
  MutualConnections_Title: 'MutualConnections_Title',
  MutualConnections_AriaLabel: 'MutualConnections_AriaLabel',
  MutualConnections_Loading: 'MutualConnections_Loading',
  MutualConnections_EmptyState: 'MutualConnections_EmptyState',
  MutualConnections_CountSingular: 'MutualConnections_CountSingular',
  MutualConnections_CountPluralTemplate:
    'MutualConnections_CountPluralTemplate',
  MutualConnections_LoadMore: 'MutualConnections_LoadMore',

  // ConnectionStrengthIndicator
  ConnectionStrengthIndicator_Title: 'ConnectionStrengthIndicator_Title',
  ConnectionStrengthIndicator_AriaLabel:
    'ConnectionStrengthIndicator_AriaLabel',
  ConnectionStrengthIndicator_Strong: 'ConnectionStrengthIndicator_Strong',
  ConnectionStrengthIndicator_Moderate: 'ConnectionStrengthIndicator_Moderate',
  ConnectionStrengthIndicator_Weak: 'ConnectionStrengthIndicator_Weak',
  ConnectionStrengthIndicator_Dormant: 'ConnectionStrengthIndicator_Dormant',

  // HubManager
  HubManager_Title: 'HubManager_Title',
  HubManager_AriaLabel: 'HubManager_AriaLabel',
  HubManager_CreateHub: 'HubManager_CreateHub',
  HubManager_EditHub: 'HubManager_EditHub',
  HubManager_DeleteHub: 'HubManager_DeleteHub',
  HubManager_HubName: 'HubManager_HubName',
  HubManager_HubDescription: 'HubManager_HubDescription',
  HubManager_MembersTemplate: 'HubManager_MembersTemplate',
  HubManager_EmptyState: 'HubManager_EmptyState',
  HubManager_EmptyStateHint: 'HubManager_EmptyStateHint',
  HubManager_Save: 'HubManager_Save',
  HubManager_Cancel: 'HubManager_Cancel',
  HubManager_DeleteConfirmTemplate: 'HubManager_DeleteConfirmTemplate',
  HubManager_DeleteConfirmAction: 'HubManager_DeleteConfirmAction',
  HubManager_AddMembers: 'HubManager_AddMembers',
  HubManager_AddMembersTitle: 'HubManager_AddMembersTitle',
  HubManager_RemoveMembers: 'HubManager_RemoveMembers',
  HubManager_RemoveMembersTitle: 'HubManager_RemoveMembersTitle',
  HubManager_UserIdsPlaceholder: 'HubManager_UserIdsPlaceholder',
  HubManager_Loading: 'HubManager_Loading',
  HubManager_DefaultBadge: 'HubManager_DefaultBadge',

  // HubSelector
  HubSelector_Title: 'HubSelector_Title',
  HubSelector_AriaLabel: 'HubSelector_AriaLabel',
  HubSelector_MembersTemplate: 'HubSelector_MembersTemplate',
  HubSelector_NoneAvailable: 'HubSelector_NoneAvailable',
  HubSelector_NoneSelected: 'HubSelector_NoneSelected',
  HubSelector_SelectedCountTemplate: 'HubSelector_SelectedCountTemplate',
  HubSelector_DefaultBadge: 'HubSelector_DefaultBadge',

  // FollowRequestList
  FollowRequestList_Title: 'FollowRequestList_Title',
  FollowRequestList_AriaLabel: 'FollowRequestList_AriaLabel',
  FollowRequestList_Loading: 'FollowRequestList_Loading',
  FollowRequestList_EmptyState: 'FollowRequestList_EmptyState',
  FollowRequestList_Approve: 'FollowRequestList_Approve',
  FollowRequestList_Reject: 'FollowRequestList_Reject',
  FollowRequestList_PendingCountTemplate:
    'FollowRequestList_PendingCountTemplate',
  FollowRequestList_PendingCountSingular:
    'FollowRequestList_PendingCountSingular',
  FollowRequestList_CustomMessage: 'FollowRequestList_CustomMessage',

  // SearchResults
  SearchResults_AriaTemplate: 'SearchResults_AriaTemplate',
  SearchResults_TabAll: 'SearchResults_TabAll',
  SearchResults_TabPosts: 'SearchResults_TabPosts',
  SearchResults_TabPostsTemplate: 'SearchResults_TabPostsTemplate',
  SearchResults_TabUsers: 'SearchResults_TabUsers',
  SearchResults_TabUsersTemplate: 'SearchResults_TabUsersTemplate',
  SearchResults_NoResultsTemplate: 'SearchResults_NoResultsTemplate',
  SearchResults_EnterSearchTerm: 'SearchResults_EnterSearchTerm',
  SearchResults_SectionPeople: 'SearchResults_SectionPeople',
  SearchResults_SectionPosts: 'SearchResults_SectionPosts',
  SearchResults_Loading: 'SearchResults_Loading',
  SearchResults_EndOfResults: 'SearchResults_EndOfResults',

  // ConnectionPrivacySettings
  ConnectionPrivacySettings_Title: 'ConnectionPrivacySettings_Title',
  ConnectionPrivacySettings_AriaLabel: 'ConnectionPrivacySettings_AriaLabel',
  ConnectionPrivacySettings_HideFollowerCount:
    'ConnectionPrivacySettings_HideFollowerCount',
  ConnectionPrivacySettings_HideFollowingCount:
    'ConnectionPrivacySettings_HideFollowingCount',
  ConnectionPrivacySettings_HideFollowersFromNonFollowers:
    'ConnectionPrivacySettings_HideFollowersFromNonFollowers',
  ConnectionPrivacySettings_HideFollowingFromNonFollowers:
    'ConnectionPrivacySettings_HideFollowingFromNonFollowers',
  ConnectionPrivacySettings_AllowDmsFromNonFollowers:
    'ConnectionPrivacySettings_AllowDmsFromNonFollowers',
  ConnectionPrivacySettings_ShowOnlineStatus:
    'ConnectionPrivacySettings_ShowOnlineStatus',
  ConnectionPrivacySettings_ShowReadReceipts:
    'ConnectionPrivacySettings_ShowReadReceipts',
  ConnectionPrivacySettings_ApproveFollowersMode:
    'ConnectionPrivacySettings_ApproveFollowersMode',
  ConnectionPrivacySettings_ApproveNone:
    'ConnectionPrivacySettings_ApproveNone',
  ConnectionPrivacySettings_ApproveAll: 'ConnectionPrivacySettings_ApproveAll',
  ConnectionPrivacySettings_ApproveNonMutuals:
    'ConnectionPrivacySettings_ApproveNonMutuals',
  ConnectionPrivacySettings_Save: 'ConnectionPrivacySettings_Save',

  // TemporaryMuteDialog
  TemporaryMuteDialog_Title: 'TemporaryMuteDialog_Title',
  TemporaryMuteDialog_AriaLabel: 'TemporaryMuteDialog_AriaLabel',
  TemporaryMuteDialog_MuteUserTemplate: 'TemporaryMuteDialog_MuteUserTemplate',
  TemporaryMuteDialog_Duration1h: 'TemporaryMuteDialog_Duration1h',
  TemporaryMuteDialog_Duration8h: 'TemporaryMuteDialog_Duration8h',
  TemporaryMuteDialog_Duration24h: 'TemporaryMuteDialog_Duration24h',
  TemporaryMuteDialog_Duration7d: 'TemporaryMuteDialog_Duration7d',
  TemporaryMuteDialog_Duration30d: 'TemporaryMuteDialog_Duration30d',
  TemporaryMuteDialog_Permanent: 'TemporaryMuteDialog_Permanent',
  TemporaryMuteDialog_Mute: 'TemporaryMuteDialog_Mute',
  TemporaryMuteDialog_Cancel: 'TemporaryMuteDialog_Cancel',

  // ConnectionInsights
  ConnectionInsights_Title: 'ConnectionInsights_Title',
  ConnectionInsights_AriaLabel: 'ConnectionInsights_AriaLabel',
  ConnectionInsights_Period7d: 'ConnectionInsights_Period7d',
  ConnectionInsights_Period30d: 'ConnectionInsights_Period30d',
  ConnectionInsights_Period90d: 'ConnectionInsights_Period90d',
  ConnectionInsights_PeriodAllTime: 'ConnectionInsights_PeriodAllTime',
  ConnectionInsights_Interactions: 'ConnectionInsights_Interactions',
  ConnectionInsights_Messages: 'ConnectionInsights_Messages',
  ConnectionInsights_Likes: 'ConnectionInsights_Likes',
  ConnectionInsights_Reposts: 'ConnectionInsights_Reposts',
  ConnectionInsights_Replies: 'ConnectionInsights_Replies',
  ConnectionInsights_EmptyState: 'ConnectionInsights_EmptyState',
  ConnectionInsights_Loading: 'ConnectionInsights_Loading',

  // ListTimelineFilter
  ListTimelineFilter_Title: 'ListTimelineFilter_Title',
  ListTimelineFilter_AriaLabel: 'ListTimelineFilter_AriaLabel',
  ListTimelineFilter_AllConnections: 'ListTimelineFilter_AllConnections',
  ListTimelineFilter_SelectList: 'ListTimelineFilter_SelectList',
  ListTimelineFilter_MembersTemplate: 'ListTimelineFilter_MembersTemplate',
  ListTimelineFilter_ClearFilter: 'ListTimelineFilter_ClearFilter',

  // MessagingInbox
  MessagingInbox_Title: 'MessagingInbox_Title',
  MessagingInbox_AriaLabel: 'MessagingInbox_AriaLabel',
  MessagingInbox_Loading: 'MessagingInbox_Loading',
  MessagingInbox_EmptyState: 'MessagingInbox_EmptyState',
  MessagingInbox_EmptyStateHint: 'MessagingInbox_EmptyStateHint',
  MessagingInbox_Pinned: 'MessagingInbox_Pinned',
  MessagingInbox_UnreadTemplate: 'MessagingInbox_UnreadTemplate',
  MessagingInbox_NewConversation: 'MessagingInbox_NewConversation',
  MessagingInbox_GroupBadge: 'MessagingInbox_GroupBadge',

  // ConversationView
  ConversationView_AriaLabel: 'ConversationView_AriaLabel',
  ConversationView_Loading: 'ConversationView_Loading',
  ConversationView_EmptyState: 'ConversationView_EmptyState',
  ConversationView_LoadMore: 'ConversationView_LoadMore',

  // MessageComposer
  MessageComposer_Placeholder: 'MessageComposer_Placeholder',
  MessageComposer_AriaLabel: 'MessageComposer_AriaLabel',
  MessageComposer_Send: 'MessageComposer_Send',
  MessageComposer_AttachFile: 'MessageComposer_AttachFile',
  MessageComposer_ReplyingTo: 'MessageComposer_ReplyingTo',
  MessageComposer_CancelReply: 'MessageComposer_CancelReply',

  // MessageRequestsList
  MessageRequestsList_Title: 'MessageRequestsList_Title',
  MessageRequestsList_AriaLabel: 'MessageRequestsList_AriaLabel',
  MessageRequestsList_Loading: 'MessageRequestsList_Loading',
  MessageRequestsList_EmptyState: 'MessageRequestsList_EmptyState',
  MessageRequestsList_Accept: 'MessageRequestsList_Accept',
  MessageRequestsList_Decline: 'MessageRequestsList_Decline',
  MessageRequestsList_PendingCountTemplate:
    'MessageRequestsList_PendingCountTemplate',

  // MessageBubble
  MessageBubble_AriaLabel: 'MessageBubble_AriaLabel',
  MessageBubble_Edited: 'MessageBubble_Edited',
  MessageBubble_Forwarded: 'MessageBubble_Forwarded',
  MessageBubble_Deleted: 'MessageBubble_Deleted',
  MessageBubble_ReplyTo: 'MessageBubble_ReplyTo',

  // TypingIndicator
  TypingIndicator_AriaLabel: 'TypingIndicator_AriaLabel',
  TypingIndicator_SingleTemplate: 'TypingIndicator_SingleTemplate',
  TypingIndicator_MultipleTemplate: 'TypingIndicator_MultipleTemplate',

  // ReadReceipt
  ReadReceipt_AriaLabel: 'ReadReceipt_AriaLabel',
  ReadReceipt_Sent: 'ReadReceipt_Sent',
  ReadReceipt_Delivered: 'ReadReceipt_Delivered',
  ReadReceipt_SeenTemplate: 'ReadReceipt_SeenTemplate',

  // MessageReactions
  MessageReactions_AriaLabel: 'MessageReactions_AriaLabel',
  MessageReactions_AddReaction: 'MessageReactions_AddReaction',
  MessageReactions_CountTemplate: 'MessageReactions_CountTemplate',
  MessageReactions_RemoveReaction: 'MessageReactions_RemoveReaction',

  // GroupConversationSettings
  GroupConversationSettings_Title: 'GroupConversationSettings_Title',
  GroupConversationSettings_AriaLabel: 'GroupConversationSettings_AriaLabel',
  GroupConversationSettings_GroupName: 'GroupConversationSettings_GroupName',
  GroupConversationSettings_GroupAvatar:
    'GroupConversationSettings_GroupAvatar',
  GroupConversationSettings_Participants:
    'GroupConversationSettings_Participants',
  GroupConversationSettings_ParticipantCountTemplate:
    'GroupConversationSettings_ParticipantCountTemplate',
  GroupConversationSettings_AddParticipant:
    'GroupConversationSettings_AddParticipant',
  GroupConversationSettings_RemoveParticipant:
    'GroupConversationSettings_RemoveParticipant',
  GroupConversationSettings_PromoteToAdmin:
    'GroupConversationSettings_PromoteToAdmin',
  GroupConversationSettings_DemoteFromAdmin:
    'GroupConversationSettings_DemoteFromAdmin',
  GroupConversationSettings_AdminBadge: 'GroupConversationSettings_AdminBadge',
  GroupConversationSettings_Save: 'GroupConversationSettings_Save',
  GroupConversationSettings_Cancel: 'GroupConversationSettings_Cancel',
  GroupConversationSettings_LeaveGroup: 'GroupConversationSettings_LeaveGroup',

  // NewConversationDialog
  NewConversationDialog_Title: 'NewConversationDialog_Title',
  NewConversationDialog_AriaLabel: 'NewConversationDialog_AriaLabel',
  NewConversationDialog_SearchPlaceholder:
    'NewConversationDialog_SearchPlaceholder',
  NewConversationDialog_CreateGroup: 'NewConversationDialog_CreateGroup',
  NewConversationDialog_GroupNamePlaceholder:
    'NewConversationDialog_GroupNamePlaceholder',
  NewConversationDialog_SelectedTemplate:
    'NewConversationDialog_SelectedTemplate',
  NewConversationDialog_Start: 'NewConversationDialog_Start',
  NewConversationDialog_Cancel: 'NewConversationDialog_Cancel',
  NewConversationDialog_NoResults: 'NewConversationDialog_NoResults',

  // ConversationSearch
  ConversationSearch_Placeholder: 'ConversationSearch_Placeholder',
  ConversationSearch_AriaLabel: 'ConversationSearch_AriaLabel',
  ConversationSearch_NoResults: 'ConversationSearch_NoResults',
  ConversationSearch_ResultCountTemplate:
    'ConversationSearch_ResultCountTemplate',
  ConversationSearch_Clear: 'ConversationSearch_Clear',

  // MessagingMenuBadge
  MessagingMenuBadge_AriaLabel: 'MessagingMenuBadge_AriaLabel',
  MessagingMenuBadge_UnreadTemplate: 'MessagingMenuBadge_UnreadTemplate',
  MessagingMenuBadge_NoUnread: 'MessagingMenuBadge_NoUnread',

  // NotificationProvider
  NotificationProvider_Error: 'NotificationProvider_Error',

  // NotificationBell
  NotificationBell_AriaLabel: 'NotificationBell_AriaLabel',
  NotificationBell_UnreadTemplate: 'NotificationBell_UnreadTemplate',
  NotificationBell_NoUnread: 'NotificationBell_NoUnread',
  NotificationBell_Overflow: 'NotificationBell_Overflow',

  // NotificationDropdown
  NotificationDropdown_Title: 'NotificationDropdown_Title',
  NotificationDropdown_AriaLabel: 'NotificationDropdown_AriaLabel',
  NotificationDropdown_ViewAll: 'NotificationDropdown_ViewAll',
  NotificationDropdown_MarkAllRead: 'NotificationDropdown_MarkAllRead',
  NotificationDropdown_EmptyState: 'NotificationDropdown_EmptyState',
  NotificationDropdown_Loading: 'NotificationDropdown_Loading',

  // NotificationItem
  NotificationItem_AriaLabel: 'NotificationItem_AriaLabel',
  NotificationItem_MarkRead: 'NotificationItem_MarkRead',
  NotificationItem_Delete: 'NotificationItem_Delete',
  NotificationItem_GroupExpandTemplate: 'NotificationItem_GroupExpandTemplate',
  NotificationItem_GroupCollapseTemplate:
    'NotificationItem_GroupCollapseTemplate',

  // NotificationList
  NotificationList_Title: 'NotificationList_Title',
  NotificationList_AriaLabel: 'NotificationList_AriaLabel',
  NotificationList_Loading: 'NotificationList_Loading',
  NotificationList_EmptyState: 'NotificationList_EmptyState',
  NotificationList_FilterAll: 'NotificationList_FilterAll',
  NotificationList_FilterUnread: 'NotificationList_FilterUnread',
  NotificationList_FilterRead: 'NotificationList_FilterRead',
  NotificationList_LoadMore: 'NotificationList_LoadMore',
  NotificationList_EndOfList: 'NotificationList_EndOfList',

  // NotificationPreferences
  NotificationPreferences_Title: 'NotificationPreferences_Title',
  NotificationPreferences_AriaLabel: 'NotificationPreferences_AriaLabel',
  NotificationPreferences_CategorySettings:
    'NotificationPreferences_CategorySettings',
  NotificationPreferences_ChannelSettings:
    'NotificationPreferences_ChannelSettings',
  NotificationPreferences_QuietHours: 'NotificationPreferences_QuietHours',
  NotificationPreferences_QuietHoursEnabled:
    'NotificationPreferences_QuietHoursEnabled',
  NotificationPreferences_QuietHoursStart:
    'NotificationPreferences_QuietHoursStart',
  NotificationPreferences_QuietHoursEnd:
    'NotificationPreferences_QuietHoursEnd',
  NotificationPreferences_QuietHoursTimezone:
    'NotificationPreferences_QuietHoursTimezone',
  NotificationPreferences_DoNotDisturb: 'NotificationPreferences_DoNotDisturb',
  NotificationPreferences_DndEnabled: 'NotificationPreferences_DndEnabled',
  NotificationPreferences_DndDuration: 'NotificationPreferences_DndDuration',
  NotificationPreferences_SoundEnabled: 'NotificationPreferences_SoundEnabled',
  NotificationPreferences_Save: 'NotificationPreferences_Save',
  NotificationPreferences_CategorySocial:
    'NotificationPreferences_CategorySocial',
  NotificationPreferences_CategoryMessages:
    'NotificationPreferences_CategoryMessages',
  NotificationPreferences_CategoryConnections:
    'NotificationPreferences_CategoryConnections',
  NotificationPreferences_CategorySystem:
    'NotificationPreferences_CategorySystem',
  NotificationPreferences_ChannelInApp: 'NotificationPreferences_ChannelInApp',
  NotificationPreferences_ChannelEmail: 'NotificationPreferences_ChannelEmail',
  NotificationPreferences_ChannelPush: 'NotificationPreferences_ChannelPush',

  // NotificationCategoryFilter
  NotificationCategoryFilter_Title: 'NotificationCategoryFilter_Title',
  NotificationCategoryFilter_AriaLabel: 'NotificationCategoryFilter_AriaLabel',
  NotificationCategoryFilter_All: 'NotificationCategoryFilter_All',
  NotificationCategoryFilter_Social: 'NotificationCategoryFilter_Social',
  NotificationCategoryFilter_Messages: 'NotificationCategoryFilter_Messages',
  NotificationCategoryFilter_Connections:
    'NotificationCategoryFilter_Connections',
  NotificationCategoryFilter_System: 'NotificationCategoryFilter_System',
} as const);

export type BrightHubStringKey = BrandedStringKeyValue<typeof BrightHubStrings>;

export type BrightHubStringKeyValue = BrightHubStringKey;
