import {
  BrandedStringKeyValue,
  createI18nStringKeys,
} from '@digitaldefiance/i18n-lib';

export const BrightChatComponentId = 'BrightChat';

export const BrightChatStrings = createI18nStringKeys(BrightChatComponentId, {
  // Menu
  MenuLabel: 'MenuLabel',
  ChatSectionsLabel: 'ChatSectionsLabel',
  Nav_Conversations: 'Nav_Conversations',
  Nav_Groups: 'Nav_Groups',
  Nav_Channels: 'Nav_Channels',
  Nav_DirectMessages: 'Nav_DirectMessages',

  // Server Rail (Req 4.2)
  Server_Rail: 'Server_Rail',
  Server_Rail_Home: 'Server_Rail_Home',
  Server_Rail_CreateServer: 'Server_Rail_CreateServer',

  // Create Server Dialog (Req 5.1)
  Create_Server: 'Create_Server',
  Create_Server_Title: 'Create_Server_Title',
  Create_Server_NameLabel: 'Create_Server_NameLabel',
  Create_Server_NamePlaceholder: 'Create_Server_NamePlaceholder',
  Create_Server_IconLabel: 'Create_Server_IconLabel',
  Create_Server_Submit: 'Create_Server_Submit',
  Create_Server_Cancel: 'Create_Server_Cancel',

  // Channel Sidebar (Req 7.1)
  Channel_Sidebar: 'Channel_Sidebar',
  Channel_Sidebar_CreateChannel: 'Channel_Sidebar_CreateChannel',

  // Create Channel Dialog (Req 7.1)
  Create_Channel: 'Create_Channel',
  Create_Channel_Title: 'Create_Channel_Title',
  Create_Channel_NameLabel: 'Create_Channel_NameLabel',
  Create_Channel_TopicLabel: 'Create_Channel_TopicLabel',
  Create_Channel_CategoryLabel: 'Create_Channel_CategoryLabel',
  Create_Channel_Submit: 'Create_Channel_Submit',
  Create_Channel_Cancel: 'Create_Channel_Cancel',

  // Create DM Dialog (Req 6.1)
  Create_DM: 'Create_DM',
  Create_DM_Title: 'Create_DM_Title',
  Create_DM_SearchPlaceholder: 'Create_DM_SearchPlaceholder',
  Create_DM_Submit: 'Create_DM_Submit',
  Create_DM_Cancel: 'Create_DM_Cancel',
  Create_DM_NewMessage: 'Create_DM_NewMessage',

  // Server Settings Panel (Req 8.1)
  Server_Settings: 'Server_Settings',
  Server_Settings_Title: 'Server_Settings_Title',
  Server_Settings_Overview: 'Server_Settings_Overview',
  Server_Settings_Members: 'Server_Settings_Members',
  Server_Settings_Categories: 'Server_Settings_Categories',
  Server_Settings_Invites: 'Server_Settings_Invites',
  Server_Settings_Save: 'Server_Settings_Save',

  // Channel Context Menu (Req 7.1)
  Channel_Edit: 'Channel_Edit',
  Channel_Delete: 'Channel_Delete',
  Channel_Mute: 'Channel_Mute',

  // Edit Channel Dialog
  Edit_Channel_Title: 'Edit_Channel_Title',
  Edit_Channel_NameLabel: 'Edit_Channel_NameLabel',
  Edit_Channel_TopicLabel: 'Edit_Channel_TopicLabel',
  Edit_Channel_Save: 'Edit_Channel_Save',
  Edit_Channel_Cancel: 'Edit_Channel_Cancel',
  Edit_Channel_Saving: 'Edit_Channel_Saving',
  Edit_Channel_Failed: 'Edit_Channel_Failed',
  Edit_Channel_NameRequired: 'Edit_Channel_NameRequired',
  Edit_Channel_NameLength: 'Edit_Channel_NameLength',

  // Delete Channel Confirmation
  Delete_Channel_Title: 'Delete_Channel_Title',
  Delete_Channel_Confirm: 'Delete_Channel_Confirm',
  Delete_Channel_Cancel: 'Delete_Channel_Cancel',
  Delete_Channel_Deleting: 'Delete_Channel_Deleting',
  Delete_Channel_Failed: 'Delete_Channel_Failed',

  // Presence Status Labels (Req 9.4)
  Presence_Online: 'Presence_Online',
  Presence_Idle: 'Presence_Idle',
  Presence_DoNotDisturb: 'Presence_DoNotDisturb',
  Presence_Offline: 'Presence_Offline',
  Presence_SetStatus: 'Presence_SetStatus',

  // Breadcrumb Navigation
  Breadcrumb_BrightChat: 'Breadcrumb_BrightChat',
  Breadcrumb_Conversation: 'Breadcrumb_Conversation',
  Breadcrumb_Group: 'Breadcrumb_Group',
  Breadcrumb_Channel: 'Breadcrumb_Channel',

  // Channel Permissions (Discord-style)
  Channel_Permissions: 'Channel_Permissions',
  Channel_Permissions_Title: 'Channel_Permissions_Title',
  Channel_Permissions_Role: 'Channel_Permissions_Role',
  Channel_Permissions_SendMessages: 'Channel_Permissions_SendMessages',
  Channel_Permissions_ManageChannel: 'Channel_Permissions_ManageChannel',
  Channel_Permissions_ManageMembers: 'Channel_Permissions_ManageMembers',
  Channel_Permissions_CreateInvites: 'Channel_Permissions_CreateInvites',
  Channel_Permissions_PinMessages: 'Channel_Permissions_PinMessages',
  Channel_Permissions_MuteMembers: 'Channel_Permissions_MuteMembers',
  Channel_Permissions_KickMembers: 'Channel_Permissions_KickMembers',
  Channel_Permissions_DeleteMessages: 'Channel_Permissions_DeleteMessages',

  // Channel Visibility
  Channel_Visibility_Public: 'Channel_Visibility_Public',
  Channel_Visibility_Private: 'Channel_Visibility_Private',
  Channel_Visibility_Secret: 'Channel_Visibility_Secret',
  Channel_Visibility_Public_Desc: 'Channel_Visibility_Public_Desc',
  Channel_Visibility_Private_Desc: 'Channel_Visibility_Private_Desc',
  Channel_Visibility_Secret_Desc: 'Channel_Visibility_Secret_Desc',

  // Compose Area
  Compose_Placeholder: 'Compose_Placeholder',
  Compose_SendLabel: 'Compose_SendLabel',
  Compose_MessageNotDelivered: 'Compose_MessageNotDelivered',
  Compose_SendFailed: 'Compose_SendFailed',

  // Conversation List
  ConversationList_Title: 'ConversationList_Title',
  ConversationList_NewMessage: 'ConversationList_NewMessage',
  ConversationList_Empty: 'ConversationList_Empty',
  ConversationList_RecentChannels: 'ConversationList_RecentChannels',

  // Message Thread
  MessageThread_Empty: 'MessageThread_Empty',

  // Create Channel Dialog extras
  Create_Channel_NamePlaceholder: 'Create_Channel_NamePlaceholder',
  Create_Channel_TopicPlaceholder: 'Create_Channel_TopicPlaceholder',
  Create_Channel_VisibilityLabel: 'Create_Channel_VisibilityLabel',
  Create_Channel_NameRequired: 'Create_Channel_NameRequired',
  Create_Channel_NameLength: 'Create_Channel_NameLength',
  Create_Channel_Creating: 'Create_Channel_Creating',
  Create_Channel_Failed: 'Create_Channel_Failed',
  Create_Channel_CategoryNone: 'Create_Channel_CategoryNone',

  // Server Settings extras
  Server_Settings_ServerNameLabel: 'Server_Settings_ServerNameLabel',
  Server_Settings_IconUrlLabel: 'Server_Settings_IconUrlLabel',
  Server_Settings_Saving: 'Server_Settings_Saving',
  Server_Settings_GenerateInvite: 'Server_Settings_GenerateInvite',
  Server_Settings_CopyToken: 'Server_Settings_CopyToken',
  Server_Settings_Uses: 'Server_Settings_Uses',
  Server_Settings_NewCategory: 'Server_Settings_NewCategory',
  Server_Settings_AddCategory: 'Server_Settings_AddCategory',
  Server_Settings_ChannelCount: 'Server_Settings_ChannelCount',
  Server_Settings_RemoveMember: 'Server_Settings_RemoveMember',
  Server_Settings_DeleteCategory: 'Server_Settings_DeleteCategory',
  Server_Settings_DeleteServer: 'Server_Settings_DeleteServer',
  Server_Settings_DeleteServerConfirm: 'Server_Settings_DeleteServerConfirm',
  Server_Settings_DeleteServerConfirmTitle: 'Server_Settings_DeleteServerConfirmTitle',

  // DM Sidebar
  DMSidebar_NoConversations: 'DMSidebar_NoConversations',
  DMSidebar_NoGroups: 'DMSidebar_NoGroups',

  // Encryption
  Encryption_E2E: 'Encryption_E2E',
  Encryption_E2E_AriaLabel: 'Encryption_E2E_AriaLabel',
  Encryption_EncryptedServer: 'Encryption_EncryptedServer',
  Encryption_ServerEncrypted: 'Encryption_ServerEncrypted',

  // Key Rotation
  KeyRotation_MemberJoined: 'KeyRotation_MemberJoined',
  KeyRotation_MemberLeft: 'KeyRotation_MemberLeft',
  KeyRotation_MemberRemoved: 'KeyRotation_MemberRemoved',

  // Channel List View
  ChannelList_Title: 'ChannelList_Title',
  ChannelList_Empty: 'ChannelList_Empty',
  ChannelList_Join: 'ChannelList_Join',
  ChannelList_Joining: 'ChannelList_Joining',
  ChannelList_MemberCount: 'ChannelList_MemberCount',

  // Group List View
  GroupList_Title: 'GroupList_Title',
  GroupList_Empty: 'GroupList_Empty',
  GroupList_MemberCount: 'GroupList_MemberCount',

  // Create Server Dialog extras
  Create_Server_IconLabelOptional: 'Create_Server_IconLabelOptional',
  Create_Server_Creating: 'Create_Server_Creating',
  Create_Server_NameRequired: 'Create_Server_NameRequired',
  Create_Server_NameTooLong: 'Create_Server_NameTooLong',
  Create_Server_Failed: 'Create_Server_Failed',

  // Create DM Dialog extras
  Create_DM_SearchLabel: 'Create_DM_SearchLabel',
  Create_DM_SearchHint: 'Create_DM_SearchHint',
  Create_DM_NoUsersFound: 'Create_DM_NoUsersFound',
  Create_DM_SelectUser: 'Create_DM_SelectUser',
  Create_DM_Starting: 'Create_DM_Starting',
  Create_DM_StartConversation: 'Create_DM_StartConversation',
  Create_DM_Failed: 'Create_DM_Failed',

  // Channel Permissions Panel
  Permissions_SelectChannel: 'Permissions_SelectChannel',
  Permissions_PermissionsFor: 'Permissions_PermissionsFor',
  Permissions_MembersWith: 'Permissions_MembersWith',
  Permissions_NoMembers: 'Permissions_NoMembers',
  Permissions_Joined: 'Permissions_Joined',
  Permissions_DeleteOwnMessages: 'Permissions_DeleteOwnMessages',
  Permissions_DeleteAnyMessage: 'Permissions_DeleteAnyMessage',
  Permissions_ManageRoles: 'Permissions_ManageRoles',

  // Roles
  Role_Owner: 'Role_Owner',
  Role_Admin: 'Role_Admin',
  Role_Moderator: 'Role_Moderator',
  Role_Member: 'Role_Member',

  // Channel Sidebar extras
  Channel_Sidebar_Uncategorized: 'Channel_Sidebar_Uncategorized',

  // Message Thread extras
  MessageThread_Pinned: 'MessageThread_Pinned',
  MessageThread_Edited: 'MessageThread_Edited',
  MessageThread_TypingSingle: 'MessageThread_TypingSingle',
  MessageThread_TypingMultiple: 'MessageThread_TypingMultiple',

  // Layout
  Layout_BreadcrumbLabel: 'Layout_BreadcrumbLabel',
  Layout_UserProfile: 'Layout_UserProfile',
  Layout_OpenNavigation: 'Layout_OpenNavigation',

  // Friends Suggestion Section (Req 14.1, 14.2)
  Friends_SectionTitle: 'Friends_SectionTitle',

  // Server Icon Upload (Req 8.1)
  Server_Icon_Upload: 'Server_Icon_Upload',
  Server_Icon_Change: 'Server_Icon_Change',
  Server_Icon_Remove: 'Server_Icon_Remove',
  Server_Icon_RemoveConfirm: 'Server_Icon_RemoveConfirm',
  Server_Icon_RemoveConfirmTitle: 'Server_Icon_RemoveConfirmTitle',
  Server_Icon_Uploading: 'Server_Icon_Uploading',
  Server_Icon_UploadFailed: 'Server_Icon_UploadFailed',
  Server_Icon_UploadSuccess: 'Server_Icon_UploadSuccess',
  Server_Icon_FileTooLarge: 'Server_Icon_FileTooLarge',
  Server_Icon_InvalidType: 'Server_Icon_InvalidType',
  Server_Icon_CropTitle: 'Server_Icon_CropTitle',
  Server_Icon_CropConfirm: 'Server_Icon_CropConfirm',
  Server_Icon_CropCancel: 'Server_Icon_CropCancel',
  Server_Icon_ZoomLabel: 'Server_Icon_ZoomLabel',
  Server_Icon_PreviewAlt: 'Server_Icon_PreviewAlt',
  Server_Icon_UploadLabel: 'Server_Icon_UploadLabel',
  Server_Icon_DropOrBrowse: 'Server_Icon_DropOrBrowse',
  Server_Icon_StagingFailed: 'Server_Icon_StagingFailed',
  Server_Icon_StagingExpired: 'Server_Icon_StagingExpired',

  // FontAwesome Icon Picker
  IconPicker_Title: 'IconPicker_Title',
  IconPicker_SearchPlaceholder: 'IconPicker_SearchPlaceholder',
  IconPicker_NoMatchTemplate: 'IconPicker_NoMatchTemplate',
  IconPicker_Cancel: 'IconPicker_Cancel',
  IconPicker_RemoveIcon: 'IconPicker_RemoveIcon',
  IconPicker_CurrentLabel: 'IconPicker_CurrentLabel',
} as const);

export type BrightChatStringKey = BrandedStringKeyValue<
  typeof BrightChatStrings
>;

export type BrightChatStringKeyValue = BrightChatStringKey;
