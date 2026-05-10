import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightChatStringKey,
  BrightChatStrings,
} from '../../enumerations/brightChatStrings';

export const BrightChatAmericanEnglishStrings: ComponentStrings<BrightChatStringKey> =
  {
    // Menu
    [BrightChatStrings.MenuLabel]: 'BrightChat',
    [BrightChatStrings.ChatSectionsLabel]: 'Chat Sections',
    [BrightChatStrings.Nav_Conversations]: 'Conversations',
    [BrightChatStrings.Nav_Groups]: 'Groups',
    [BrightChatStrings.Nav_Channels]: 'Channels',
    [BrightChatStrings.Nav_DirectMessages]: 'Direct Messages',

    // Server Rail
    [BrightChatStrings.Server_Rail]: 'Servers',
    [BrightChatStrings.Server_Rail_Home]: 'Home',
    [BrightChatStrings.Server_Rail_CreateServer]: 'Create Server',

    // Create Server Dialog
    [BrightChatStrings.Create_Server]: 'Create Server',
    [BrightChatStrings.Create_Server_Title]: 'Create a Server',
    [BrightChatStrings.Create_Server_NameLabel]: 'Server Name',
    [BrightChatStrings.Create_Server_NamePlaceholder]: 'Enter server name',
    [BrightChatStrings.Create_Server_IconLabel]: 'Server Icon',
    [BrightChatStrings.Create_Server_Submit]: 'Create',
    [BrightChatStrings.Create_Server_Cancel]: 'Cancel',

    // Channel Sidebar
    [BrightChatStrings.Channel_Sidebar]: 'Channels',
    [BrightChatStrings.Channel_Sidebar_CreateChannel]: 'Create Channel',

    // Create Channel Dialog
    [BrightChatStrings.Create_Channel]: 'Create Channel',
    [BrightChatStrings.Create_Channel_Title]: 'Create a Channel',
    [BrightChatStrings.Create_Channel_NameLabel]: 'Channel Name',
    [BrightChatStrings.Create_Channel_TopicLabel]: 'Topic',
    [BrightChatStrings.Create_Channel_CategoryLabel]: 'Category',
    [BrightChatStrings.Create_Channel_Submit]: 'Create',
    [BrightChatStrings.Create_Channel_Cancel]: 'Cancel',

    // Create DM Dialog
    [BrightChatStrings.Create_DM]: 'New Message',
    [BrightChatStrings.Create_DM_Title]: 'New Direct Message',
    [BrightChatStrings.Create_DM_SearchPlaceholder]:
      'Search for a user to message',
    [BrightChatStrings.Create_DM_Submit]: 'Send',
    [BrightChatStrings.Create_DM_Cancel]: 'Cancel',
    [BrightChatStrings.Create_DM_NewMessage]: 'New Message',

    // Server Settings Panel
    [BrightChatStrings.Server_Settings]: 'Server Settings',
    [BrightChatStrings.Server_Settings_Title]: 'Server Settings',
    [BrightChatStrings.Server_Settings_Overview]: 'Overview',
    [BrightChatStrings.Server_Settings_Members]: 'Members',
    [BrightChatStrings.Server_Settings_Categories]: 'Categories',
    [BrightChatStrings.Server_Settings_Invites]: 'Invites',
    [BrightChatStrings.Server_Settings_Save]: 'Save Changes',

    // Channel Context Menu
    [BrightChatStrings.Channel_Edit]: 'Edit Channel',
    [BrightChatStrings.Channel_Delete]: 'Delete Channel',
    [BrightChatStrings.Channel_Mute]: 'Mute Channel',

    // Edit Channel Dialog
    [BrightChatStrings.Edit_Channel_Title]: 'Edit Channel',
    [BrightChatStrings.Edit_Channel_NameLabel]: 'Channel Name',
    [BrightChatStrings.Edit_Channel_TopicLabel]: 'Topic',
    [BrightChatStrings.Edit_Channel_Save]: 'Save',
    [BrightChatStrings.Edit_Channel_Cancel]: 'Cancel',
    [BrightChatStrings.Edit_Channel_Saving]: 'Saving…',
    [BrightChatStrings.Edit_Channel_Failed]: 'Failed to update channel',
    [BrightChatStrings.Edit_Channel_NameRequired]: 'Channel name is required',
    [BrightChatStrings.Edit_Channel_NameLength]:
      'Channel name must be between 2 and 100 characters',

    // Delete Channel Confirmation
    [BrightChatStrings.Delete_Channel_Title]: 'Delete Channel',
    [BrightChatStrings.Delete_Channel_Confirm]: 'Delete',
    [BrightChatStrings.Delete_Channel_Cancel]: 'Cancel',
    [BrightChatStrings.Delete_Channel_Deleting]: 'Deleting…',
    [BrightChatStrings.Delete_Channel_Failed]: 'Failed to delete channel',

    // Presence Status Labels
    [BrightChatStrings.Presence_Online]: 'Online',
    [BrightChatStrings.Presence_Idle]: 'Idle',
    [BrightChatStrings.Presence_DoNotDisturb]: 'Do Not Disturb',
    [BrightChatStrings.Presence_Offline]: 'Offline',
    [BrightChatStrings.Presence_SetStatus]: 'Set Status',

    // Breadcrumb Navigation
    [BrightChatStrings.Breadcrumb_BrightChat]: 'BrightChat',
    [BrightChatStrings.Breadcrumb_Conversation]: 'Conversation',
    [BrightChatStrings.Breadcrumb_Group]: 'Group',
    [BrightChatStrings.Breadcrumb_Channel]: 'Channel',

    // Channel Permissions (Discord-style)
    [BrightChatStrings.Channel_Permissions]: 'Permissions',
    [BrightChatStrings.Channel_Permissions_Title]: 'Channel Permissions',
    [BrightChatStrings.Channel_Permissions_Role]: 'Role',
    [BrightChatStrings.Channel_Permissions_SendMessages]: 'Send Messages',
    [BrightChatStrings.Channel_Permissions_ManageChannel]: 'Manage Channel',
    [BrightChatStrings.Channel_Permissions_ManageMembers]: 'Manage Members',
    [BrightChatStrings.Channel_Permissions_CreateInvites]: 'Create Invites',
    [BrightChatStrings.Channel_Permissions_PinMessages]: 'Pin Messages',
    [BrightChatStrings.Channel_Permissions_MuteMembers]: 'Mute Members',
    [BrightChatStrings.Channel_Permissions_KickMembers]: 'Kick Members',
    [BrightChatStrings.Channel_Permissions_DeleteMessages]: 'Delete Messages',

    // Channel Visibility
    [BrightChatStrings.Channel_Visibility_Public]: 'Public',
    [BrightChatStrings.Channel_Visibility_Private]: 'Private',
    [BrightChatStrings.Channel_Visibility_Secret]: 'Secret',
    [BrightChatStrings.Channel_Visibility_Public_Desc]:
      'Anyone can see and join',
    [BrightChatStrings.Channel_Visibility_Private_Desc]: 'Invite only',
    [BrightChatStrings.Channel_Visibility_Secret_Desc]:
      'Hidden from non-members',

    // Compose Area
    [BrightChatStrings.Compose_Placeholder]: 'Type an encrypted message...',
    [BrightChatStrings.Compose_SendLabel]: 'Send message',
    [BrightChatStrings.Compose_MessageNotDelivered]:
      'Message could not be delivered',
    [BrightChatStrings.Compose_SendFailed]: 'Failed to send message',

    // Conversation List
    [BrightChatStrings.ConversationList_Title]: 'Conversations',
    [BrightChatStrings.ConversationList_NewMessage]: 'New Message',
    [BrightChatStrings.ConversationList_Empty]: 'No direct messages yet.',
    [BrightChatStrings.ConversationList_RecentChannels]: 'Recent Channels',

    // Message Thread
    [BrightChatStrings.MessageThread_Empty]:
      'No messages yet. Start the conversation!',

    // Create Channel Dialog extras
    [BrightChatStrings.Create_Channel_NamePlaceholder]: 'e.g. general',
    [BrightChatStrings.Create_Channel_TopicPlaceholder]:
      "What's this channel about?",
    [BrightChatStrings.Create_Channel_VisibilityLabel]: 'Visibility',
    [BrightChatStrings.Create_Channel_NameRequired]: 'Channel name is required',
    [BrightChatStrings.Create_Channel_NameLength]:
      'Channel name must be between 2 and 100 characters',
    [BrightChatStrings.Create_Channel_Creating]: 'Creating...',
    [BrightChatStrings.Create_Channel_Failed]: 'Failed to create channel',
    [BrightChatStrings.Create_Channel_CategoryNone]: 'None',

    // Server Settings extras
    [BrightChatStrings.Server_Settings_ServerNameLabel]: 'Server Name',
    [BrightChatStrings.Server_Settings_IconUrlLabel]: 'Icon URL',
    [BrightChatStrings.Server_Settings_Saving]: 'Saving…',
    [BrightChatStrings.Server_Settings_GenerateInvite]: 'Generate Invite',
    [BrightChatStrings.Server_Settings_CopyToken]: 'Copy token',
    [BrightChatStrings.Server_Settings_Uses]: 'Uses',
    [BrightChatStrings.Server_Settings_NewCategory]: 'New Category',
    [BrightChatStrings.Server_Settings_AddCategory]: 'Add',
    [BrightChatStrings.Server_Settings_ChannelCount]: 'channels',
    [BrightChatStrings.Server_Settings_RemoveMember]: 'Remove member',
    [BrightChatStrings.Server_Settings_DeleteCategory]: 'Delete category',
    [BrightChatStrings.Server_Settings_DeleteServer]: 'Delete Server',
    [BrightChatStrings.Server_Settings_DeleteServerConfirm]:
      'Are you sure you want to delete this server? All channels and messages will be permanently lost. This cannot be undone.',
    [BrightChatStrings.Server_Settings_DeleteServerConfirmTitle]:
      'Delete Server',

    // DM Sidebar
    [BrightChatStrings.DMSidebar_NoConversations]: 'No conversations yet',
    [BrightChatStrings.DMSidebar_NoGroups]: 'No group chats yet',

    // Encryption
    [BrightChatStrings.Encryption_E2E]: 'End-to-end encrypted',
    [BrightChatStrings.Encryption_E2E_AriaLabel]:
      'This conversation is end-to-end encrypted',
    [BrightChatStrings.Encryption_EncryptedServer]: 'Encrypted server',
    [BrightChatStrings.Encryption_ServerEncrypted]: 'Encrypted',

    // Key Rotation
    [BrightChatStrings.KeyRotation_MemberJoined]:
      'Encryption key updated — a member joined',
    [BrightChatStrings.KeyRotation_MemberLeft]:
      'Encryption key updated — a member left',
    [BrightChatStrings.KeyRotation_MemberRemoved]:
      'Encryption key updated — a member was removed',

    // Channel List View
    [BrightChatStrings.ChannelList_Title]: 'Channels',
    [BrightChatStrings.ChannelList_Empty]: 'No channels yet.',
    [BrightChatStrings.ChannelList_Join]: 'Join',
    [BrightChatStrings.ChannelList_Joining]: 'Joining…',
    [BrightChatStrings.ChannelList_MemberCount]: 'member',

    // Group List View
    [BrightChatStrings.GroupList_Title]: 'Groups',
    [BrightChatStrings.GroupList_Empty]: 'No groups yet.',
    [BrightChatStrings.GroupList_MemberCount]: 'member',

    // Create Server Dialog extras
    [BrightChatStrings.Create_Server_IconLabelOptional]: 'Icon URL (optional)',
    [BrightChatStrings.Create_Server_Creating]: 'Creating…',
    [BrightChatStrings.Create_Server_NameRequired]: 'Server name is required',
    [BrightChatStrings.Create_Server_NameTooLong]:
      'Server name must be 100 characters or fewer',
    [BrightChatStrings.Create_Server_Failed]: 'Failed to create server',

    // Create DM Dialog extras
    [BrightChatStrings.Create_DM_SearchLabel]: 'Search users',
    [BrightChatStrings.Create_DM_SearchHint]: 'Type a name…',
    [BrightChatStrings.Create_DM_NoUsersFound]: 'No users found',
    [BrightChatStrings.Create_DM_SelectUser]: 'Please select a user',
    [BrightChatStrings.Create_DM_Starting]: 'Starting…',
    [BrightChatStrings.Create_DM_StartConversation]: 'Start Conversation',
    [BrightChatStrings.Create_DM_Failed]: 'Failed to start conversation',

    // Channel Permissions Panel
    [BrightChatStrings.Permissions_SelectChannel]:
      'Select a channel to view permissions.',
    [BrightChatStrings.Permissions_PermissionsFor]: 'Permissions for',
    [BrightChatStrings.Permissions_MembersWith]: 'Members with',
    [BrightChatStrings.Permissions_NoMembers]: 'No members with this role',
    [BrightChatStrings.Permissions_Joined]: 'Joined',
    [BrightChatStrings.Permissions_DeleteOwnMessages]: 'Delete Own Messages',
    [BrightChatStrings.Permissions_DeleteAnyMessage]: 'Delete Any Message',
    [BrightChatStrings.Permissions_ManageRoles]: 'Manage Roles',

    // Roles
    [BrightChatStrings.Role_Owner]: 'Owner',
    [BrightChatStrings.Role_Admin]: 'Admin',
    [BrightChatStrings.Role_Moderator]: 'Moderator',
    [BrightChatStrings.Role_Member]: 'Member',

    // Channel Sidebar extras
    [BrightChatStrings.Channel_Sidebar_Uncategorized]: 'Uncategorized',

    // Message Thread extras
    [BrightChatStrings.MessageThread_Pinned]: 'Pinned message',
    [BrightChatStrings.MessageThread_Edited]: '(edited)',
    [BrightChatStrings.MessageThread_TypingSingle]: 'is typing...',
    [BrightChatStrings.MessageThread_TypingMultiple]: 'are typing...',

    // Layout
    [BrightChatStrings.Layout_BreadcrumbLabel]: 'BrightChat breadcrumb',
    [BrightChatStrings.Layout_UserProfile]: 'User profile',
    [BrightChatStrings.Layout_OpenNavigation]: 'Open navigation',

    // Friends Suggestion Section
    [BrightChatStrings.Friends_SectionTitle]: 'Friends',

    // Server Icon Upload
    [BrightChatStrings.Server_Icon_Upload]: 'Upload Icon',
    [BrightChatStrings.Server_Icon_Change]: 'Change Icon',
    [BrightChatStrings.Server_Icon_Remove]: 'Remove Icon',
    [BrightChatStrings.Server_Icon_RemoveConfirm]:
      'Are you sure you want to remove the server icon?',
    [BrightChatStrings.Server_Icon_RemoveConfirmTitle]: 'Remove Server Icon',
    [BrightChatStrings.Server_Icon_Uploading]: 'Uploading…',
    [BrightChatStrings.Server_Icon_UploadFailed]: 'Failed to upload icon',
    [BrightChatStrings.Server_Icon_UploadSuccess]: 'Icon uploaded successfully',
    [BrightChatStrings.Server_Icon_FileTooLarge]:
      'File is too large. Maximum size is 5MB.',
    [BrightChatStrings.Server_Icon_InvalidType]:
      'Invalid file type. Allowed types: PNG, JPEG, GIF, WebP.',
    [BrightChatStrings.Server_Icon_CropTitle]: 'Crop Server Icon',
    [BrightChatStrings.Server_Icon_CropConfirm]: 'Apply',
    [BrightChatStrings.Server_Icon_CropCancel]: 'Cancel',
    [BrightChatStrings.Server_Icon_ZoomLabel]: 'Zoom',
    [BrightChatStrings.Server_Icon_PreviewAlt]: 'Server icon preview',
    [BrightChatStrings.Server_Icon_UploadLabel]: 'Upload server icon',
    [BrightChatStrings.Server_Icon_DropOrBrowse]:
      'Drop an image or click to browse',
    [BrightChatStrings.Server_Icon_StagingFailed]:
      'Failed to stage file for upload',
    [BrightChatStrings.Server_Icon_StagingExpired]:
      'Staged file has expired. Please select the image again.',

    // FontAwesome Icon Picker
    [BrightChatStrings.IconPicker_Title]: 'Choose an Icon',
    [BrightChatStrings.IconPicker_SearchPlaceholder]: 'Search icons...',
    [BrightChatStrings.IconPicker_NoMatchTemplate]: 'No icons match "{0}"',
    [BrightChatStrings.IconPicker_Cancel]: 'Cancel',
    [BrightChatStrings.IconPicker_RemoveIcon]: 'Remove Icon',
    [BrightChatStrings.IconPicker_CurrentLabel]: 'Current:',
  };
