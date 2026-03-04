import { StringsCollection } from '@digitaldefiance/i18n-lib';
import {
  BrightHubStringKey,
  BrightHubStrings,
} from '../../../enumerations/brightHubStrings';

export const BrightHubAmericanEnglishStrings: StringsCollection<BrightHubStringKey> =
  {
    // PostCard
    [BrightHubStrings.PostCard_Reposted]: 'Reposted',
    [BrightHubStrings.PostCard_Edited]: 'Edited',
    [BrightHubStrings.PostCard_HubRestricted]: 'Visible to hub members only',
    [BrightHubStrings.PostCard_Deleted]: 'This post has been deleted.',
    [BrightHubStrings.PostCard_ReplyAriaTemplate]: 'Reply, {COUNT} replies',
    [BrightHubStrings.PostCard_RepostAriaTemplate]: 'Repost, {COUNT} reposts',
    [BrightHubStrings.PostCard_LikeAriaTemplate]: 'Like, {COUNT} likes',
    [BrightHubStrings.PostCard_UnlikeAriaTemplate]: 'Unlike, {COUNT} likes',
    [BrightHubStrings.PostCard_PostByAriaTemplate]: 'Post by {NAME}',

    // PostComposer
    [BrightHubStrings.PostComposer_Placeholder]: "What's happening?",
    [BrightHubStrings.PostComposer_ReplyPlaceholder]: 'Post your reply',
    [BrightHubStrings.PostComposer_ReplyingTo]: 'Replying to',
    [BrightHubStrings.PostComposer_CancelReply]: 'Cancel reply',
    [BrightHubStrings.PostComposer_Bold]: 'Bold',
    [BrightHubStrings.PostComposer_Italic]: 'Italic',
    [BrightHubStrings.PostComposer_Code]: 'Code',
    [BrightHubStrings.PostComposer_Emoji]: 'Insert emoji',
    [BrightHubStrings.PostComposer_AttachImage]: 'Attach image',
    [BrightHubStrings.PostComposer_RemoveAttachmentTemplate]:
      'Remove attachment {INDEX}',
    [BrightHubStrings.PostComposer_AttachmentAltTemplate]: 'Attachment {INDEX}',
    [BrightHubStrings.PostComposer_VisibleTo]: 'Visible to',
    [BrightHubStrings.PostComposer_MembersTemplate]: '{COUNT} members',
    [BrightHubStrings.PostComposer_SubmitPost]: 'Submit post',
    [BrightHubStrings.PostComposer_Post]: 'Post',
    [BrightHubStrings.PostComposer_Reply]: 'Reply',

    // Timeline
    [BrightHubStrings.Timeline_AriaLabel]: 'Timeline',
    [BrightHubStrings.Timeline_FilteredByTemplate]: 'Filtered by: {LABEL}',
    [BrightHubStrings.Timeline_ClearFilter]: 'Clear',
    [BrightHubStrings.Timeline_EmptyDefault]:
      'No posts yet. Follow some people to see their posts here.',
    [BrightHubStrings.Timeline_LoadingPosts]: 'Loading posts',
    [BrightHubStrings.Timeline_AllCaughtUp]: "You're all caught up",

    // ThreadView
    [BrightHubStrings.ThreadView_AriaLabel]: 'Thread',
    [BrightHubStrings.ThreadView_ParentDeleted]: 'Parent post was deleted',
    [BrightHubStrings.ThreadView_ReplyCountSingular]: '1 reply',
    [BrightHubStrings.ThreadView_ReplyCountPluralTemplate]: '{COUNT} replies',
    [BrightHubStrings.ThreadView_ParticipantCountSingular]: '1 participant',
    [BrightHubStrings.ThreadView_ParticipantCountPluralTemplate]:
      '{COUNT} participants',
    [BrightHubStrings.ThreadView_NoReplies]:
      'No replies yet. Be the first to reply!',

    // FollowButton
    [BrightHubStrings.FollowButton_Follow]: 'Follow',
    [BrightHubStrings.FollowButton_Following]: 'Following',
    [BrightHubStrings.FollowButton_Unfollow]: 'Unfollow',

    // LikeButton
    [BrightHubStrings.LikeButton_LikeAriaTemplate]: 'Like, {COUNT} likes',
    [BrightHubStrings.LikeButton_UnlikeAriaTemplate]: 'Unlike, {COUNT} likes',

    // RepostButton
    [BrightHubStrings.RepostButton_RepostAriaTemplate]:
      'Repost, {COUNT} reposts',
    [BrightHubStrings.RepostButton_UndoRepostAriaTemplate]:
      'Undo repost, {COUNT} reposts',

    // UserProfileCard
    [BrightHubStrings.UserProfileCard_Verified]: 'Verified',
    [BrightHubStrings.UserProfileCard_ProtectedAccount]: 'Protected account',
    [BrightHubStrings.UserProfileCard_ProfileOfTemplate]: 'Profile of {NAME}',
    [BrightHubStrings.UserProfileCard_Following]: 'Following',
    [BrightHubStrings.UserProfileCard_Followers]: 'Followers',
    [BrightHubStrings.UserProfileCard_StrongConnection]: 'Strong connection',
    [BrightHubStrings.UserProfileCard_ModerateConnection]:
      'Moderate connection',
    [BrightHubStrings.UserProfileCard_WeakConnection]: 'Weak connection',
    [BrightHubStrings.UserProfileCard_DormantConnection]: 'Dormant connection',
    [BrightHubStrings.UserProfileCard_MutualConnectionSingular]:
      '1 mutual connection',
    [BrightHubStrings.UserProfileCard_MutualConnectionPluralTemplate]:
      '{COUNT} mutual connections',

    // ConnectionListManager
    [BrightHubStrings.ConnectionListManager_Title]: 'Connection Lists',
    [BrightHubStrings.ConnectionListManager_CreateList]: 'Create List',
    [BrightHubStrings.ConnectionListManager_EditList]: 'Edit List',
    [BrightHubStrings.ConnectionListManager_DeleteList]: 'Delete List',
    [BrightHubStrings.ConnectionListManager_DeleteConfirmTemplate]:
      'Are you sure you want to delete "{NAME}"? This will remove all members.',
    [BrightHubStrings.ConnectionListManager_DeleteConfirmAction]: 'Delete',
    [BrightHubStrings.ConnectionListManager_Cancel]: 'Cancel',
    [BrightHubStrings.ConnectionListManager_Save]: 'Save',
    [BrightHubStrings.ConnectionListManager_ListName]: 'List name',
    [BrightHubStrings.ConnectionListManager_ListDescription]: 'Description',
    [BrightHubStrings.ConnectionListManager_Visibility]: 'Visibility',
    [BrightHubStrings.ConnectionListManager_VisibilityPrivate]: 'Private',
    [BrightHubStrings.ConnectionListManager_VisibilityFollowersOnly]:
      'Followers only',
    [BrightHubStrings.ConnectionListManager_VisibilityPublic]: 'Public',
    [BrightHubStrings.ConnectionListManager_MembersTemplate]: '{COUNT} members',
    [BrightHubStrings.ConnectionListManager_FollowersTemplate]:
      '{COUNT} followers',
    [BrightHubStrings.ConnectionListManager_EmptyState]:
      'No connection lists yet',
    [BrightHubStrings.ConnectionListManager_EmptyStateHint]:
      'Create a list to organize your connections.',
    [BrightHubStrings.ConnectionListManager_AddMembers]: 'Add Members',
    [BrightHubStrings.ConnectionListManager_RemoveMembers]: 'Remove Members',
    [BrightHubStrings.ConnectionListManager_AddMembersTitle]:
      'Add Members to List',
    [BrightHubStrings.ConnectionListManager_RemoveMembersTitle]:
      'Remove Members from List',
    [BrightHubStrings.ConnectionListManager_UserIdsPlaceholder]:
      'Enter user IDs, one per line',
    [BrightHubStrings.ConnectionListManager_Loading]: 'Loading lists…',
    [BrightHubStrings.ConnectionListManager_AriaLabel]:
      'Connection list manager',

    // ConnectionListCard
    [BrightHubStrings.ConnectionListCard_AriaLabel]: 'Connection list: {NAME}',
    [BrightHubStrings.ConnectionListCard_MembersTemplate]: '{COUNT} members',
    [BrightHubStrings.ConnectionListCard_FollowersTemplate]:
      '{COUNT} followers',
    [BrightHubStrings.ConnectionListCard_VisibilityPrivate]: 'Private',
    [BrightHubStrings.ConnectionListCard_VisibilityFollowersOnly]:
      'Followers only',
    [BrightHubStrings.ConnectionListCard_VisibilityPublic]: 'Public',
    [BrightHubStrings.ConnectionListCard_CreatedAtTemplate]: 'Created {DATE}',

    // ConnectionCategorySelector
    [BrightHubStrings.ConnectionCategorySelector_Title]: 'Categories',
    [BrightHubStrings.ConnectionCategorySelector_AriaLabel]:
      'Connection category selector',
    [BrightHubStrings.ConnectionCategorySelector_DefaultIndicator]: 'Default',
    [BrightHubStrings.ConnectionCategorySelector_NoneAvailable]:
      'No categories available',

    // ConnectionNoteEditor
    [BrightHubStrings.ConnectionNoteEditor_Title]: 'Note',
    [BrightHubStrings.ConnectionNoteEditor_AriaLabel]: 'Connection note',
    [BrightHubStrings.ConnectionNoteEditor_Placeholder]:
      'Add a private note about this connection…',
    [BrightHubStrings.ConnectionNoteEditor_EmptyState]:
      'No note yet. Add a private note to remember context about this connection.',
    [BrightHubStrings.ConnectionNoteEditor_Save]: 'Save',
    [BrightHubStrings.ConnectionNoteEditor_Delete]: 'Delete',
    [BrightHubStrings.ConnectionNoteEditor_Cancel]: 'Cancel',
    [BrightHubStrings.ConnectionNoteEditor_DeleteConfirmTitle]: 'Delete note?',
    [BrightHubStrings.ConnectionNoteEditor_DeleteConfirmMessage]:
      'Are you sure you want to delete this note? This action cannot be undone.',
    [BrightHubStrings.ConnectionNoteEditor_DeleteConfirmAction]: 'Delete',

    // ConnectionSuggestions
    [BrightHubStrings.ConnectionSuggestions_Title]: 'Suggested Connections',
    [BrightHubStrings.ConnectionSuggestions_AriaLabel]:
      'Connection suggestions',
    [BrightHubStrings.ConnectionSuggestions_EmptyState]:
      'No suggestions right now. Check back later!',
    [BrightHubStrings.ConnectionSuggestions_Loading]: 'Loading suggestions…',
    [BrightHubStrings.ConnectionSuggestions_Follow]: 'Follow',
    [BrightHubStrings.ConnectionSuggestions_Dismiss]: 'Dismiss',
    [BrightHubStrings.ConnectionSuggestions_MutualCountSingular]:
      '1 mutual connection',
    [BrightHubStrings.ConnectionSuggestions_MutualCountPluralTemplate]:
      '{COUNT} mutual connections',
    [BrightHubStrings.ConnectionSuggestions_ReasonMutualConnections]:
      'Based on mutual connections',
    [BrightHubStrings.ConnectionSuggestions_ReasonSimilarInterests]:
      'Based on similar interests',
    [BrightHubStrings.ConnectionSuggestions_ReasonSimilarToUser]:
      'Similar to people you follow',

    // MutualConnections
    [BrightHubStrings.MutualConnections_Title]: 'Mutual Connections',
    [BrightHubStrings.MutualConnections_AriaLabel]: 'Mutual connections',
    [BrightHubStrings.MutualConnections_Loading]: 'Loading mutual connections…',
    [BrightHubStrings.MutualConnections_EmptyState]: 'No mutual connections',
    [BrightHubStrings.MutualConnections_CountSingular]: '1 mutual connection',
    [BrightHubStrings.MutualConnections_CountPluralTemplate]:
      '{COUNT} mutual connections',
    [BrightHubStrings.MutualConnections_LoadMore]: 'Load more',

    // ConnectionStrengthIndicator
    [BrightHubStrings.ConnectionStrengthIndicator_Title]: 'Connection Strength',
    [BrightHubStrings.ConnectionStrengthIndicator_AriaLabel]:
      'Connection strength indicator',
    [BrightHubStrings.ConnectionStrengthIndicator_Strong]: 'Strong',
    [BrightHubStrings.ConnectionStrengthIndicator_Moderate]: 'Moderate',
    [BrightHubStrings.ConnectionStrengthIndicator_Weak]: 'Weak',
    [BrightHubStrings.ConnectionStrengthIndicator_Dormant]: 'Dormant',

    // HubManager
    [BrightHubStrings.HubManager_Title]: 'Hubs',
    [BrightHubStrings.HubManager_AriaLabel]: 'Hub manager',
    [BrightHubStrings.HubManager_CreateHub]: 'Create Hub',
    [BrightHubStrings.HubManager_EditHub]: 'Edit Hub',
    [BrightHubStrings.HubManager_DeleteHub]: 'Delete Hub',
    [BrightHubStrings.HubManager_HubName]: 'Hub name',
    [BrightHubStrings.HubManager_HubDescription]: 'Description',
    [BrightHubStrings.HubManager_MembersTemplate]: '{COUNT} members',
    [BrightHubStrings.HubManager_EmptyState]: 'No hubs yet.',
    [BrightHubStrings.HubManager_EmptyStateHint]:
      'Create a hub to share content with a select group of connections.',
    [BrightHubStrings.HubManager_Save]: 'Save',
    [BrightHubStrings.HubManager_Cancel]: 'Cancel',
    [BrightHubStrings.HubManager_DeleteConfirmTemplate]:
      'Are you sure you want to delete "{NAME}"? All members will be removed.',
    [BrightHubStrings.HubManager_DeleteConfirmAction]: 'Delete',
    [BrightHubStrings.HubManager_AddMembers]: 'Add Members',
    [BrightHubStrings.HubManager_AddMembersTitle]: 'Add Members to Hub',
    [BrightHubStrings.HubManager_RemoveMembers]: 'Remove Members',
    [BrightHubStrings.HubManager_RemoveMembersTitle]: 'Remove Members from Hub',
    [BrightHubStrings.HubManager_UserIdsPlaceholder]:
      'Enter user IDs, one per line',
    [BrightHubStrings.HubManager_Loading]: 'Loading hubs…',
    [BrightHubStrings.HubManager_DefaultBadge]: 'Default',

    // HubSelector
    [BrightHubStrings.HubSelector_Title]: 'Post Visibility',
    [BrightHubStrings.HubSelector_AriaLabel]:
      'Hub selector for post visibility',
    [BrightHubStrings.HubSelector_MembersTemplate]: '{COUNT} members',
    [BrightHubStrings.HubSelector_NoneAvailable]: 'No hubs available.',
    [BrightHubStrings.HubSelector_NoneSelected]: 'Visible to all followers',
    [BrightHubStrings.HubSelector_SelectedCountTemplate]:
      '{COUNT} hubs selected',
    [BrightHubStrings.HubSelector_DefaultBadge]: 'Default',

    // FollowRequestList
    [BrightHubStrings.FollowRequestList_Title]: 'Follow Requests',
    [BrightHubStrings.FollowRequestList_AriaLabel]: 'Pending follow requests',
    [BrightHubStrings.FollowRequestList_Loading]: 'Loading follow requests…',
    [BrightHubStrings.FollowRequestList_EmptyState]:
      'No pending follow requests',
    [BrightHubStrings.FollowRequestList_Approve]: 'Approve',
    [BrightHubStrings.FollowRequestList_Reject]: 'Reject',
    [BrightHubStrings.FollowRequestList_PendingCountTemplate]:
      '{COUNT} pending requests',
    [BrightHubStrings.FollowRequestList_PendingCountSingular]:
      '1 pending request',
    [BrightHubStrings.FollowRequestList_CustomMessage]: 'Message',

    // SearchResults
    [BrightHubStrings.SearchResults_AriaTemplate]:
      'Search results for "{QUERY}"',
    [BrightHubStrings.SearchResults_TabAll]: 'All',
    [BrightHubStrings.SearchResults_TabPosts]: 'Posts',
    [BrightHubStrings.SearchResults_TabPostsTemplate]: 'Posts ({COUNT})',
    [BrightHubStrings.SearchResults_TabUsers]: 'Users',
    [BrightHubStrings.SearchResults_TabUsersTemplate]: 'Users ({COUNT})',
    [BrightHubStrings.SearchResults_NoResultsTemplate]:
      'No results found for "{QUERY}"',
    [BrightHubStrings.SearchResults_EnterSearchTerm]:
      'Enter a search term to find posts and people',
    [BrightHubStrings.SearchResults_SectionPeople]: 'People',
    [BrightHubStrings.SearchResults_SectionPosts]: 'Posts',
    [BrightHubStrings.SearchResults_Loading]: 'Loading search results',
    [BrightHubStrings.SearchResults_EndOfResults]: 'End of results',

    // ConnectionPrivacySettings
    [BrightHubStrings.ConnectionPrivacySettings_Title]: 'Privacy Settings',
    [BrightHubStrings.ConnectionPrivacySettings_AriaLabel]:
      'Connection privacy settings',
    [BrightHubStrings.ConnectionPrivacySettings_HideFollowerCount]:
      'Hide follower count',
    [BrightHubStrings.ConnectionPrivacySettings_HideFollowingCount]:
      'Hide following count',
    [BrightHubStrings.ConnectionPrivacySettings_HideFollowersFromNonFollowers]:
      'Hide followers from non-followers',
    [BrightHubStrings.ConnectionPrivacySettings_HideFollowingFromNonFollowers]:
      'Hide following from non-followers',
    [BrightHubStrings.ConnectionPrivacySettings_AllowDmsFromNonFollowers]:
      'Allow DMs from non-followers',
    [BrightHubStrings.ConnectionPrivacySettings_ShowOnlineStatus]:
      'Show online status',
    [BrightHubStrings.ConnectionPrivacySettings_ShowReadReceipts]:
      'Show read receipts',
    [BrightHubStrings.ConnectionPrivacySettings_ApproveFollowersMode]:
      'Approve followers mode',
    [BrightHubStrings.ConnectionPrivacySettings_ApproveNone]:
      'Auto-approve all',
    [BrightHubStrings.ConnectionPrivacySettings_ApproveAll]:
      'Require approval for all',
    [BrightHubStrings.ConnectionPrivacySettings_ApproveNonMutuals]:
      'Require approval for non-mutuals',
    [BrightHubStrings.ConnectionPrivacySettings_Save]: 'Save',

    // TemporaryMuteDialog
    [BrightHubStrings.TemporaryMuteDialog_Title]: 'Mute User',
    [BrightHubStrings.TemporaryMuteDialog_AriaLabel]: 'Temporary mute dialog',
    [BrightHubStrings.TemporaryMuteDialog_MuteUserTemplate]: 'Mute {USERNAME}',
    [BrightHubStrings.TemporaryMuteDialog_Duration1h]: '1 hour',
    [BrightHubStrings.TemporaryMuteDialog_Duration8h]: '8 hours',
    [BrightHubStrings.TemporaryMuteDialog_Duration24h]: '24 hours',
    [BrightHubStrings.TemporaryMuteDialog_Duration7d]: '7 days',
    [BrightHubStrings.TemporaryMuteDialog_Duration30d]: '30 days',
    [BrightHubStrings.TemporaryMuteDialog_Permanent]: 'Mute permanently',
    [BrightHubStrings.TemporaryMuteDialog_Mute]: 'Mute',
    [BrightHubStrings.TemporaryMuteDialog_Cancel]: 'Cancel',

    // ConnectionInsights
    [BrightHubStrings.ConnectionInsights_Title]: 'Connection Insights',
    [BrightHubStrings.ConnectionInsights_AriaLabel]: 'Connection insights',
    [BrightHubStrings.ConnectionInsights_Period7d]: '7 days',
    [BrightHubStrings.ConnectionInsights_Period30d]: '30 days',
    [BrightHubStrings.ConnectionInsights_Period90d]: '90 days',
    [BrightHubStrings.ConnectionInsights_PeriodAllTime]: 'All time',
    [BrightHubStrings.ConnectionInsights_Interactions]: 'Interactions',
    [BrightHubStrings.ConnectionInsights_Messages]: 'Messages',
    [BrightHubStrings.ConnectionInsights_Likes]: 'Likes',
    [BrightHubStrings.ConnectionInsights_Reposts]: 'Reposts',
    [BrightHubStrings.ConnectionInsights_Replies]: 'Replies',
    [BrightHubStrings.ConnectionInsights_EmptyState]:
      'No interaction data available',
    [BrightHubStrings.ConnectionInsights_Loading]:
      'Loading connection insights…',

    // ListTimelineFilter
    [BrightHubStrings.ListTimelineFilter_Title]: 'Filter by list',
    [BrightHubStrings.ListTimelineFilter_AriaLabel]:
      'Filter timeline by connection list',
    [BrightHubStrings.ListTimelineFilter_AllConnections]: 'All connections',
    [BrightHubStrings.ListTimelineFilter_SelectList]: 'Select a list',
    [BrightHubStrings.ListTimelineFilter_MembersTemplate]: '({COUNT} members)',
    [BrightHubStrings.ListTimelineFilter_ClearFilter]: 'Clear filter',

    // MessagingInbox
    [BrightHubStrings.MessagingInbox_Title]: 'Messages',
    [BrightHubStrings.MessagingInbox_AriaLabel]: 'Messaging inbox',
    [BrightHubStrings.MessagingInbox_Loading]: 'Loading conversations',
    [BrightHubStrings.MessagingInbox_EmptyState]: 'No conversations yet.',
    [BrightHubStrings.MessagingInbox_EmptyStateHint]:
      'Start a new conversation to get going.',
    [BrightHubStrings.MessagingInbox_Pinned]: 'Pinned',
    [BrightHubStrings.MessagingInbox_UnreadTemplate]: '{COUNT} unread',
    [BrightHubStrings.MessagingInbox_NewConversation]: 'New conversation',
    [BrightHubStrings.MessagingInbox_GroupBadge]: 'Group',

    // ConversationView
    [BrightHubStrings.ConversationView_AriaLabel]: 'Conversation view',
    [BrightHubStrings.ConversationView_Loading]: 'Loading messages',
    [BrightHubStrings.ConversationView_EmptyState]:
      'No messages yet. Send the first one!',
    [BrightHubStrings.ConversationView_LoadMore]: 'Load more',

    // MessageComposer
    [BrightHubStrings.MessageComposer_Placeholder]: 'Type a message…',
    [BrightHubStrings.MessageComposer_AriaLabel]: 'Message composer',
    [BrightHubStrings.MessageComposer_Send]: 'Send',
    [BrightHubStrings.MessageComposer_AttachFile]: 'Attach file',
    [BrightHubStrings.MessageComposer_ReplyingTo]: 'Replying to',
    [BrightHubStrings.MessageComposer_CancelReply]: 'Cancel reply',

    // MessageRequestsList
    [BrightHubStrings.MessageRequestsList_Title]: 'Message Requests',
    [BrightHubStrings.MessageRequestsList_AriaLabel]: 'Message requests list',
    [BrightHubStrings.MessageRequestsList_Loading]: 'Loading requests',
    [BrightHubStrings.MessageRequestsList_EmptyState]: 'No pending requests.',
    [BrightHubStrings.MessageRequestsList_Accept]: 'Accept',
    [BrightHubStrings.MessageRequestsList_Decline]: 'Decline',
    [BrightHubStrings.MessageRequestsList_PendingCountTemplate]:
      '{COUNT} pending',

    // MessageBubble
    [BrightHubStrings.MessageBubble_AriaLabel]: 'Message',
    [BrightHubStrings.MessageBubble_Edited]: 'Edited',
    [BrightHubStrings.MessageBubble_Forwarded]: 'Forwarded',
    [BrightHubStrings.MessageBubble_Deleted]: 'This message was deleted.',
    [BrightHubStrings.MessageBubble_ReplyTo]: 'Reply to',

    // TypingIndicator
    [BrightHubStrings.TypingIndicator_AriaLabel]: 'Typing indicator',
    [BrightHubStrings.TypingIndicator_SingleTemplate]: '{NAME} is typing…',
    [BrightHubStrings.TypingIndicator_MultipleTemplate]:
      '{COUNT} people are typing…',

    // ReadReceipt
    [BrightHubStrings.ReadReceipt_AriaLabel]: 'Read receipt',
    [BrightHubStrings.ReadReceipt_Sent]: 'Sent',
    [BrightHubStrings.ReadReceipt_Delivered]: 'Delivered',
    [BrightHubStrings.ReadReceipt_SeenTemplate]: 'Seen {TIMESTAMP}',

    // MessageReactions
    [BrightHubStrings.MessageReactions_AriaLabel]: 'Message reactions',
    [BrightHubStrings.MessageReactions_AddReaction]: 'Add reaction',
    [BrightHubStrings.MessageReactions_CountTemplate]: '{COUNT}',
    [BrightHubStrings.MessageReactions_RemoveReaction]: 'Remove reaction',

    // GroupConversationSettings
    [BrightHubStrings.GroupConversationSettings_Title]: 'Group Settings',
    [BrightHubStrings.GroupConversationSettings_AriaLabel]:
      'Group conversation settings',
    [BrightHubStrings.GroupConversationSettings_GroupName]: 'Group name',
    [BrightHubStrings.GroupConversationSettings_GroupAvatar]: 'Group avatar',
    [BrightHubStrings.GroupConversationSettings_Participants]: 'Participants',
    [BrightHubStrings.GroupConversationSettings_ParticipantCountTemplate]:
      '{COUNT} participants',
    [BrightHubStrings.GroupConversationSettings_AddParticipant]:
      'Add participant',
    [BrightHubStrings.GroupConversationSettings_RemoveParticipant]:
      'Remove participant',
    [BrightHubStrings.GroupConversationSettings_PromoteToAdmin]:
      'Promote to admin',
    [BrightHubStrings.GroupConversationSettings_DemoteFromAdmin]:
      'Demote from admin',
    [BrightHubStrings.GroupConversationSettings_AdminBadge]: 'Admin',
    [BrightHubStrings.GroupConversationSettings_Save]: 'Save',
    [BrightHubStrings.GroupConversationSettings_Cancel]: 'Cancel',
    [BrightHubStrings.GroupConversationSettings_LeaveGroup]: 'Leave group',

    // NewConversationDialog
    [BrightHubStrings.NewConversationDialog_Title]: 'New Conversation',
    [BrightHubStrings.NewConversationDialog_AriaLabel]:
      'New conversation dialog',
    [BrightHubStrings.NewConversationDialog_SearchPlaceholder]: 'Search users…',
    [BrightHubStrings.NewConversationDialog_CreateGroup]: 'Create group',
    [BrightHubStrings.NewConversationDialog_GroupNamePlaceholder]: 'Group name',
    [BrightHubStrings.NewConversationDialog_SelectedTemplate]:
      '{COUNT} selected',
    [BrightHubStrings.NewConversationDialog_Start]: 'Start',
    [BrightHubStrings.NewConversationDialog_Cancel]: 'Cancel',
    [BrightHubStrings.NewConversationDialog_NoResults]: 'No users found',

    // ConversationSearch
    [BrightHubStrings.ConversationSearch_Placeholder]:
      'Search in conversation…',
    [BrightHubStrings.ConversationSearch_AriaLabel]: 'Search in conversation',
    [BrightHubStrings.ConversationSearch_NoResults]: 'No messages found',
    [BrightHubStrings.ConversationSearch_ResultCountTemplate]:
      '{COUNT} results',
    [BrightHubStrings.ConversationSearch_Clear]: 'Clear search',

    // MessagingMenuBadge
    [BrightHubStrings.MessagingMenuBadge_AriaLabel]: 'Messages',
    [BrightHubStrings.MessagingMenuBadge_UnreadTemplate]:
      '{COUNT} unread messages',
    [BrightHubStrings.MessagingMenuBadge_NoUnread]: 'No unread messages',

    // NotificationProvider
    [BrightHubStrings.NotificationProvider_Error]:
      'Failed to load notifications',

    // NotificationBell
    [BrightHubStrings.NotificationBell_AriaLabel]: 'Notifications',
    [BrightHubStrings.NotificationBell_UnreadTemplate]:
      '{COUNT} unread notifications',
    [BrightHubStrings.NotificationBell_NoUnread]: 'No unread notifications',
    [BrightHubStrings.NotificationBell_Overflow]: '99+',

    // NotificationDropdown
    [BrightHubStrings.NotificationDropdown_Title]: 'Notifications',
    [BrightHubStrings.NotificationDropdown_AriaLabel]: 'Notification dropdown',
    [BrightHubStrings.NotificationDropdown_ViewAll]: 'View all',
    [BrightHubStrings.NotificationDropdown_MarkAllRead]: 'Mark all as read',
    [BrightHubStrings.NotificationDropdown_EmptyState]: 'No notifications yet',
    [BrightHubStrings.NotificationDropdown_Loading]: 'Loading notifications',

    // NotificationItem
    [BrightHubStrings.NotificationItem_AriaLabel]: 'Notification',
    [BrightHubStrings.NotificationItem_MarkRead]: 'Mark as read',
    [BrightHubStrings.NotificationItem_Delete]: 'Delete',
    [BrightHubStrings.NotificationItem_GroupExpandTemplate]:
      'Show {COUNT} more',
    [BrightHubStrings.NotificationItem_GroupCollapseTemplate]: 'Show less',

    // NotificationList
    [BrightHubStrings.NotificationList_Title]: 'Notifications',
    [BrightHubStrings.NotificationList_AriaLabel]: 'Notification list',
    [BrightHubStrings.NotificationList_Loading]: 'Loading notifications',
    [BrightHubStrings.NotificationList_EmptyState]: 'No notifications',
    [BrightHubStrings.NotificationList_FilterAll]: 'All',
    [BrightHubStrings.NotificationList_FilterUnread]: 'Unread',
    [BrightHubStrings.NotificationList_FilterRead]: 'Read',
    [BrightHubStrings.NotificationList_LoadMore]: 'Load more',
    [BrightHubStrings.NotificationList_EndOfList]: 'No more notifications',

    // NotificationPreferences
    [BrightHubStrings.NotificationPreferences_Title]:
      'Notification Preferences',
    [BrightHubStrings.NotificationPreferences_AriaLabel]:
      'Notification preferences',
    [BrightHubStrings.NotificationPreferences_CategorySettings]:
      'Category Settings',
    [BrightHubStrings.NotificationPreferences_ChannelSettings]:
      'Channel Settings',
    [BrightHubStrings.NotificationPreferences_QuietHours]: 'Quiet Hours',
    [BrightHubStrings.NotificationPreferences_QuietHoursEnabled]:
      'Enable quiet hours',
    [BrightHubStrings.NotificationPreferences_QuietHoursStart]: 'Start time',
    [BrightHubStrings.NotificationPreferences_QuietHoursEnd]: 'End time',
    [BrightHubStrings.NotificationPreferences_QuietHoursTimezone]: 'Timezone',
    [BrightHubStrings.NotificationPreferences_DoNotDisturb]: 'Do Not Disturb',
    [BrightHubStrings.NotificationPreferences_DndEnabled]:
      'Enable Do Not Disturb',
    [BrightHubStrings.NotificationPreferences_DndDuration]: 'Duration',
    [BrightHubStrings.NotificationPreferences_SoundEnabled]:
      'Notification sounds',
    [BrightHubStrings.NotificationPreferences_Save]: 'Save',
    [BrightHubStrings.NotificationPreferences_CategorySocial]: 'Social',
    [BrightHubStrings.NotificationPreferences_CategoryMessages]: 'Messages',
    [BrightHubStrings.NotificationPreferences_CategoryConnections]:
      'Connections',
    [BrightHubStrings.NotificationPreferences_CategorySystem]: 'System',
    [BrightHubStrings.NotificationPreferences_ChannelInApp]: 'In-app',
    [BrightHubStrings.NotificationPreferences_ChannelEmail]: 'Email',
    [BrightHubStrings.NotificationPreferences_ChannelPush]: 'Push',

    // NotificationCategoryFilter
    [BrightHubStrings.NotificationCategoryFilter_Title]: 'Filter by category',
    [BrightHubStrings.NotificationCategoryFilter_AriaLabel]:
      'Notification category filter',
    [BrightHubStrings.NotificationCategoryFilter_All]: 'All',
    [BrightHubStrings.NotificationCategoryFilter_Social]: 'Social',
    [BrightHubStrings.NotificationCategoryFilter_Messages]: 'Messages',
    [BrightHubStrings.NotificationCategoryFilter_Connections]: 'Connections',
    [BrightHubStrings.NotificationCategoryFilter_System]: 'System',
  };
