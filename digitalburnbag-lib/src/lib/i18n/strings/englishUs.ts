import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  DigitalBurnbagStringKey,
  DigitalBurnbagStrings,
} from '../../enumerations/digitalburnbag-strings';

export const DigitalBurnbagAmericanEnglishStrings: ComponentStrings<DigitalBurnbagStringKey> =
  {
    // -- Existing --
    [DigitalBurnbagStrings.KeyFeatures_1]:
      'Securely store files with rules for automated release or deletion.',
    [DigitalBurnbagStrings.KeyFeatures_2]:
      'Create "Canaries" to monitor your digital or physical activity.',
    [DigitalBurnbagStrings.KeyFeatures_3]:
      'Actions are triggered based on canary status (e.g., inactivity).',
    [DigitalBurnbagStrings.KeyFeatures_4]:
      'Duress codes for immediate, emergency actions.',
    [DigitalBurnbagStrings.SiteDescription]:
      'Securely store files with rules for automated release or deletion based on digital and physical activity monitoring.',
    [DigitalBurnbagStrings.SiteTagline]: 'Your Data, Your Rules',

    // -- Navigation --
    [DigitalBurnbagStrings.Nav_MyFiles]: 'My Files',
    [DigitalBurnbagStrings.Nav_SharedWithMe]: 'Shared with Me',
    [DigitalBurnbagStrings.Nav_Favorites]: 'Favorites',
    [DigitalBurnbagStrings.Nav_Recent]: 'Recent',
    [DigitalBurnbagStrings.Nav_Trash]: 'Trash',
    [DigitalBurnbagStrings.Nav_Activity]: 'Activity',
    [DigitalBurnbagStrings.Nav_Analytics]: 'Analytics',
    [DigitalBurnbagStrings.Nav_Canary]: 'Canary',
    [DigitalBurnbagStrings.Nav_Vaults]: 'Vaults',
    [DigitalBurnbagStrings.Nav_FileSections]: 'File sections',

    // -- Vault Container --
    [DigitalBurnbagStrings.Vault_Title]: 'Vault Containers',
    [DigitalBurnbagStrings.Vault_CreateNew]: 'New Vault',
    [DigitalBurnbagStrings.Vault_NameLabel]: 'Vault name',
    [DigitalBurnbagStrings.Vault_DescriptionLabel]: 'Description',
    [DigitalBurnbagStrings.Vault_Create]: 'Create',
    [DigitalBurnbagStrings.Vault_Cancel]: 'Cancel',
    [DigitalBurnbagStrings.Vault_Empty]: 'No vaults yet',
    [DigitalBurnbagStrings.Vault_EmptyDesc]:
      'Create a vault to start storing files securely.',
    [DigitalBurnbagStrings.Vault_Files]: 'files',
    [DigitalBurnbagStrings.Vault_Folders]: 'folders',
    [DigitalBurnbagStrings.Vault_State]: 'State',
    [DigitalBurnbagStrings.Vault_SealStatus]: 'Seal status',
    [DigitalBurnbagStrings.Vault_AllPristine]: 'All pristine',
    [DigitalBurnbagStrings.Vault_SomeAccessed]: 'Some accessed',
    [DigitalBurnbagStrings.Vault_Open]: 'Open',
    [DigitalBurnbagStrings.Vault_Lock]: 'Lock',
    [DigitalBurnbagStrings.Vault_Destroy]: 'Destroy',
    [DigitalBurnbagStrings.Vault_CreateFailed]: 'Failed to create vault',
    [DigitalBurnbagStrings.Vault_LoadFailed]: 'Failed to load vaults',
    [DigitalBurnbagStrings.Vault_Created]: 'Vault created',

    // -- FileBrowser --
    [DigitalBurnbagStrings.FileBrowser_ColName]: 'Name',
    [DigitalBurnbagStrings.FileBrowser_ColSize]: 'Size',
    [DigitalBurnbagStrings.FileBrowser_ColModified]: 'Modified',
    [DigitalBurnbagStrings.FileBrowser_ColType]: 'Type',
    [DigitalBurnbagStrings.FileBrowser_EmptyFolder]: 'This folder is empty',
    [DigitalBurnbagStrings.FileBrowser_SelectAll]: 'Select all items',
    [DigitalBurnbagStrings.FileBrowser_FolderPath]: 'Folder path',
    [DigitalBurnbagStrings.FileBrowser_Loading]: 'Loading folder contents',
    [DigitalBurnbagStrings.FileBrowser_TypeFolder]: 'Folder',
    [DigitalBurnbagStrings.FileBrowser_TypeFile]: 'File',

    // -- Context menu actions --
    [DigitalBurnbagStrings.Action_Rename]: 'Rename',
    [DigitalBurnbagStrings.Action_Move]: 'Move',
    [DigitalBurnbagStrings.Action_Copy]: 'Copy',
    [DigitalBurnbagStrings.Action_Delete]: 'Delete',
    [DigitalBurnbagStrings.Action_Share]: 'Share',
    [DigitalBurnbagStrings.Action_Download]: 'Download',
    [DigitalBurnbagStrings.Action_Duplicate]: 'Duplicate',
    [DigitalBurnbagStrings.Action_History]: 'History',
    [DigitalBurnbagStrings.Action_Permissions]: 'Permissions',
    [DigitalBurnbagStrings.Action_Preview]: 'Preview',
    [DigitalBurnbagStrings.Action_More]: 'More…',
    [DigitalBurnbagStrings.Action_Paste]: 'Paste',

    // -- TrashBinView --
    [DigitalBurnbagStrings.Trash_ColName]: 'Name',
    [DigitalBurnbagStrings.Trash_ColOriginalPath]: 'Original Path',
    [DigitalBurnbagStrings.Trash_ColDeleted]: 'Deleted',
    [DigitalBurnbagStrings.Trash_ColTimeRemaining]: 'Time Remaining',
    [DigitalBurnbagStrings.Trash_ColActions]: 'Actions',
    [DigitalBurnbagStrings.Trash_Empty]: 'Trash is empty',
    [DigitalBurnbagStrings.Trash_Restore]: 'Restore',
    [DigitalBurnbagStrings.Trash_DeletePermanently]: 'Delete permanently',
    [DigitalBurnbagStrings.Trash_Loading]: 'Loading trash items',
    [DigitalBurnbagStrings.Trash_Expired]: 'Expired',
    [DigitalBurnbagStrings.Trash_DaysRemaining]:
      '{count, plural, one {# day} other {# days}}',
    [DigitalBurnbagStrings.Trash_HoursRemaining]:
      '{count, plural, one {# hour} other {# hours}}',

    // -- ShareDialog --
    [DigitalBurnbagStrings.Share_Title]: 'Share — {fileName}',
    [DigitalBurnbagStrings.Share_WithUser]: 'Share with a user',
    [DigitalBurnbagStrings.Share_EmailLabel]: 'Email',
    [DigitalBurnbagStrings.Share_PermView]: 'View',
    [DigitalBurnbagStrings.Share_PermEdit]: 'Edit',
    [DigitalBurnbagStrings.Share_Button]: 'Share',
    [DigitalBurnbagStrings.Share_AdvancedOptions]: 'Advanced sharing options',
    [DigitalBurnbagStrings.Share_EncryptionMode]: 'Encryption mode',
    [DigitalBurnbagStrings.Share_ServerProxied]: 'server proxied',
    [DigitalBurnbagStrings.Share_ServerProxiedDesc]:
      'Server decrypts on behalf of recipient. Simplest option.',
    [DigitalBurnbagStrings.Share_EphemeralKeyPair]: 'ephemeral key pair',
    [DigitalBurnbagStrings.Share_EphemeralKeyPairDesc]:
      'Generates a one-time key pair. Private key is in the URL fragment (never sent to server).',
    [DigitalBurnbagStrings.Share_RecipientPublicKey]: 'recipient public key',
    [DigitalBurnbagStrings.Share_RecipientPublicKeyDesc]:
      "Encrypts with the recipient's public key. Most secure for known recipients.",
    [DigitalBurnbagStrings.Share_RecipientKeyLabel]: 'Recipient public key',
    [DigitalBurnbagStrings.Share_PasswordLabel]: 'Password (optional)',
    [DigitalBurnbagStrings.Share_ExpiresAtLabel]: 'Expires at',
    [DigitalBurnbagStrings.Share_MaxAccessLabel]: 'Max access count',
    [DigitalBurnbagStrings.Share_ScopeLabel]: 'Link scope',
    [DigitalBurnbagStrings.Share_ScopeSpecific]: 'Specific people',
    [DigitalBurnbagStrings.Share_ScopeOrganization]: 'Organization',
    [DigitalBurnbagStrings.Share_ScopeAnonymous]: 'Anonymous',
    [DigitalBurnbagStrings.Share_BlockDownload]:
      'Block download (preview only)',
    [DigitalBurnbagStrings.Share_CreateLink]: 'Create Share Link',
    [DigitalBurnbagStrings.Share_MagnetWarning]:
      'Magnet URLs are irrevocable. Once shared, the file can be accessed by anyone with the URL and cannot be taken back.',
    [DigitalBurnbagStrings.Share_GetMagnetUrl]: 'Get Magnet URL',
    [DigitalBurnbagStrings.Share_Close]: 'Close',
    [DigitalBurnbagStrings.Share_Failed]: 'Share failed',
    [DigitalBurnbagStrings.Share_LinkFailed]: 'Failed to create link',
    [DigitalBurnbagStrings.Share_MagnetFailed]: 'Failed to get magnet URL',

    // -- UploadWidget --
    [DigitalBurnbagStrings.Upload_DropOrBrowse]:
      'Drop files here or click to browse',
    [DigitalBurnbagStrings.Upload_DropZoneLabel]: 'Upload files drop zone',
    [DigitalBurnbagStrings.Upload_Failed]: 'Upload failed',

    // -- Upload New Version --
    [DigitalBurnbagStrings.Upload_NewVersion]: 'Upload New Version',
    [DigitalBurnbagStrings.Upload_NewVersionTitle]: 'Upload New Version',
    [DigitalBurnbagStrings.Upload_NewVersionDesc]:
      'Select a file to upload as a new version. The file must be the same type as the original.',
    [DigitalBurnbagStrings.Upload_NewVersionSelect]: 'Select File',
    [DigitalBurnbagStrings.Upload_NewVersionUploading]:
      'Uploading new version…',
    [DigitalBurnbagStrings.Upload_NewVersionSuccess]:
      'New version uploaded successfully',
    [DigitalBurnbagStrings.Upload_NewVersionFailed]:
      'Failed to upload new version',
    [DigitalBurnbagStrings.Upload_NewVersionMimeTypeMismatch]:
      'File type mismatch: expected {expected} but got {actual}',
    [DigitalBurnbagStrings.Action_UploadNewVersion]: 'Upload New Version',
    [DigitalBurnbagStrings.Action_StorageContract]: 'Storage Contract',
    [DigitalBurnbagStrings.Action_CopyPathLink]: 'Copy Path Link',

    // -- PreviewViewer --
    [DigitalBurnbagStrings.Preview_CloseLabel]: 'Close preview',
    [DigitalBurnbagStrings.Preview_Download]: 'Download',
    [DigitalBurnbagStrings.Preview_Close]: 'Close',
    [DigitalBurnbagStrings.Preview_TypeLabel]: 'Type: {mimeType}',
    [DigitalBurnbagStrings.Preview_NotAvailable]:
      'Preview not available for this file type.',
    [DigitalBurnbagStrings.Preview_VideoNotSupported]:
      'Your browser does not support video playback.',
    [DigitalBurnbagStrings.Preview_LoadFailed]: 'Failed to load content',

    // -- BulkOperationsToolbar --
    [DigitalBurnbagStrings.Bulk_ItemsSelected]:
      '{count, plural, one {# item selected} other {# items selected}}',
    [DigitalBurnbagStrings.Bulk_ClearSelection]: 'Clear selection',
    [DigitalBurnbagStrings.Bulk_Succeeded]: '{count} succeeded',
    [DigitalBurnbagStrings.Bulk_Failed]: '{count} failed',

    // -- ACLEditor --
    [DigitalBurnbagStrings.ACL_ColPrincipal]: 'Principal',
    [DigitalBurnbagStrings.ACL_ColType]: 'Type',
    [DigitalBurnbagStrings.ACL_ColPermission]: 'Permission',
    [DigitalBurnbagStrings.ACL_ColActions]: 'Actions',
    [DigitalBurnbagStrings.ACL_Remove]: 'Remove',
    [DigitalBurnbagStrings.ACL_Add]: 'Add',
    [DigitalBurnbagStrings.ACL_UserOrGroupPlaceholder]: 'User or group ID',
    [DigitalBurnbagStrings.ACL_InheritedFrom]: 'Inherited from {source}',
    [DigitalBurnbagStrings.ACL_AdvancedPermissions]: 'Advanced permissions',
    [DigitalBurnbagStrings.ACL_PermissionFlags]: 'Permission flags',
    [DigitalBurnbagStrings.ACL_PermissionSetName]: 'Permission set name',
    [DigitalBurnbagStrings.ACL_CreateSet]: 'Create Set',
    [DigitalBurnbagStrings.ACL_CustomSets]: 'Custom permission sets',
    [DigitalBurnbagStrings.ACL_Mixed]: 'Mixed',
    [DigitalBurnbagStrings.ACL_MixedTooltip]:
      'Not all selected items share this permission',
    [DigitalBurnbagStrings.ACL_ApplyToAll]: 'Apply to all selected items',
    [DigitalBurnbagStrings.ACL_MultiItemTitle]: 'Permissions — {count} items',
    [DigitalBurnbagStrings.ACL_SaveFailed]: 'Failed to save permissions',
    [DigitalBurnbagStrings.ACL_Saved]: 'Permissions saved',

    // -- CanaryConfigPanel --
    [DigitalBurnbagStrings.Canary_Bindings]: 'Canary Bindings',
    [DigitalBurnbagStrings.Canary_AddBinding]: 'Add Binding',
    [DigitalBurnbagStrings.Canary_ColCondition]: 'Condition',
    [DigitalBurnbagStrings.Canary_ColAction]: 'Action',
    [DigitalBurnbagStrings.Canary_ColTarget]: 'Target',
    [DigitalBurnbagStrings.Canary_ColActions]: 'Actions',
    [DigitalBurnbagStrings.Canary_NoBindings]: 'No bindings configured',
    [DigitalBurnbagStrings.Canary_DryRun]: 'Dry run',
    [DigitalBurnbagStrings.Canary_DeleteBinding]: 'Delete binding',
    [DigitalBurnbagStrings.Canary_NewBinding]: 'New Binding',
    [DigitalBurnbagStrings.Canary_ProviderLabel]: 'Provider',
    [DigitalBurnbagStrings.Canary_TargetIdsLabel]:
      'Target IDs (comma-separated)',
    [DigitalBurnbagStrings.Canary_NoRecipientList]: 'No recipient list',
    [DigitalBurnbagStrings.Canary_CascadeDelayLabel]: 'Cascade delay (seconds)',
    [DigitalBurnbagStrings.Canary_Create]: 'Create',
    [DigitalBurnbagStrings.Canary_Cancel]: 'Cancel',
    [DigitalBurnbagStrings.Canary_RecipientLists]: 'Recipient Lists',
    [DigitalBurnbagStrings.Canary_AddList]: 'Add List',
    [DigitalBurnbagStrings.Canary_ColListName]: 'Name',
    [DigitalBurnbagStrings.Canary_ColRecipients]: 'Recipients',
    [DigitalBurnbagStrings.Canary_NoLists]: 'No recipient lists',
    [DigitalBurnbagStrings.Canary_NewList]: 'New Recipient List',
    [DigitalBurnbagStrings.Canary_ListNameLabel]: 'List name',
    [DigitalBurnbagStrings.Canary_RecipientsLabel]:
      'Recipients (one per line: email, label)',
    [DigitalBurnbagStrings.Canary_DryRunReport]: 'Dry Run Report',
    [DigitalBurnbagStrings.Canary_AffectedFiles]: 'Affected files: {count}',
    [DigitalBurnbagStrings.Canary_RecipientsCount]: 'Recipients: {count}',
    [DigitalBurnbagStrings.Canary_ActionsLabel]: 'Actions:',

    // -- NotificationPanel --
    [DigitalBurnbagStrings.Notifications_Label]: 'Notifications',
    [DigitalBurnbagStrings.Notifications_Empty]: 'No notifications',

    // -- ActivityFeed --
    [DigitalBurnbagStrings.Activity_AllOperations]: 'All operations',
    [DigitalBurnbagStrings.Activity_NoActivity]: 'No activity to show',
    [DigitalBurnbagStrings.Activity_OnTarget]: '{actor} on {target}',

    // -- StorageAnalytics --
    [DigitalBurnbagStrings.Analytics_StorageUsage]: 'Storage Usage',
    [DigitalBurnbagStrings.Analytics_UsageSummary]:
      '{used} of {quota} used ({percent}%)',
    [DigitalBurnbagStrings.Analytics_ByFileType]: 'By File Type',
    [DigitalBurnbagStrings.Analytics_ColCategory]: 'Category',
    [DigitalBurnbagStrings.Analytics_ColFiles]: 'Files',
    [DigitalBurnbagStrings.Analytics_ColSize]: 'Size',
    [DigitalBurnbagStrings.Analytics_LargestItems]: 'Largest Items',
    [DigitalBurnbagStrings.Analytics_ColName]: 'Name',
    [DigitalBurnbagStrings.Analytics_ColItemActions]: 'Actions',
    [DigitalBurnbagStrings.Analytics_Trash]: 'Trash',
    [DigitalBurnbagStrings.Analytics_StaleFiles]: 'Stale Files',
    [DigitalBurnbagStrings.Analytics_ColAge]: 'Age',
    [DigitalBurnbagStrings.Analytics_AgeDays]:
      '{count, plural, one {# day} other {# days}}',
    [DigitalBurnbagStrings.Analytics_ScheduleDestroy]: 'Schedule Destroy',

    // -- BurnbagPage messages --
    [DigitalBurnbagStrings.Page_ItemMoved]: 'Item moved',
    [DigitalBurnbagStrings.Page_MoveFailed]: 'Failed to move item',
    [DigitalBurnbagStrings.Page_LoadFolderFailed]: 'Failed to load folder',
    [DigitalBurnbagStrings.Page_LoadTrashFailed]: 'Failed to load trash',
    [DigitalBurnbagStrings.Page_LoadSharedFailed]:
      'Failed to load shared items',
    [DigitalBurnbagStrings.Page_LoadCanaryFailed]:
      'Failed to load canary config',
    [DigitalBurnbagStrings.Page_LoadActivityFailed]: 'Failed to load activity',
    [DigitalBurnbagStrings.Page_LoadAnalyticsFailed]:
      'Failed to load storage analytics',
    [DigitalBurnbagStrings.Page_LoadPermissionsFailed]:
      'Failed to load permissions',
    [DigitalBurnbagStrings.Page_DeleteFailed]: 'Failed to delete',
    [DigitalBurnbagStrings.Page_RenameFailed]: 'Failed to rename',
    [DigitalBurnbagStrings.Page_Renamed]: 'Renamed',
    [DigitalBurnbagStrings.Page_ItemsMovedToTrash]:
      '{count, plural, one {# item moved to trash} other {# items moved to trash}}',
    [DigitalBurnbagStrings.Page_Restored]: 'Restored {name}',
    [DigitalBurnbagStrings.Page_PermanentlyDeleted]:
      'Permanently deleted {name}',
    [DigitalBurnbagStrings.Page_RestoreFailed]: 'Failed to restore',
    [DigitalBurnbagStrings.Page_PermanentDeleteFailed]:
      'Failed to permanently delete',
    [DigitalBurnbagStrings.Page_BindingCreated]: 'Binding created',
    [DigitalBurnbagStrings.Page_BindingDeleted]: 'Binding deleted',
    [DigitalBurnbagStrings.Page_RecipientListCreated]: 'Recipient list created',
    [DigitalBurnbagStrings.Page_UserNotFound]: 'User not found',
    [DigitalBurnbagStrings.Page_PathNotFound]:
      'The folder path was not found. It may have been moved or deleted.',
    [DigitalBurnbagStrings.Page_NoFileSelected]: 'No file selected',
    [DigitalBurnbagStrings.Page_UploadFailed]: 'Upload failed',
    [DigitalBurnbagStrings.Page_ErrorOccurred]: 'An error occurred',
    [DigitalBurnbagStrings.Page_RenamePrompt]: 'New name:',

    // -- Phix (Phoenix-cycle rename) --
    [DigitalBurnbagStrings.Phix_Button]: 'Phix',
    [DigitalBurnbagStrings.Phix_Tooltip]:
      'Phoenix-cycle rename: destroy the old name, rise with the new one',
    [DigitalBurnbagStrings.Phix_Confirm_Title]: 'Confirm Phix Operation',
    [DigitalBurnbagStrings.Phix_Confirm_MetadataOnly]:
      'This is a metadata-only rename. No blocks will be touched. Quick and painless.',
    [DigitalBurnbagStrings.Phix_Confirm_FullCycle]:
      'This is a full phoenix-cycle. Data will be re-encrypted and the original destroyed. This may take a while.',
    [DigitalBurnbagStrings.Phix_Progress]: 'Phixing in progress…',
    [DigitalBurnbagStrings.Phix_Complete]:
      'Phix complete — risen from the ashes',
    [DigitalBurnbagStrings.Phix_Failed]: 'Phix failed',
    [DigitalBurnbagStrings.Phix_Mascot_Tiny]: 'phix-mascot-tiny',
    [DigitalBurnbagStrings.Phix_Mascot_Small]: 'phix-mascot-small',
    [DigitalBurnbagStrings.Phix_Mascot_Medium]: 'phix-mascot-medium',
    [DigitalBurnbagStrings.Phix_Mascot_Large]: 'phix-mascot-large',
    [DigitalBurnbagStrings.Phix_Mascot_Massive]: 'phix-mascot-massive',

    // -- Common --
    [DigitalBurnbagStrings.Common_Close]: 'Close',
    [DigitalBurnbagStrings.Common_Save]: 'Save',
    [DigitalBurnbagStrings.Common_Back]: 'Back',
    [DigitalBurnbagStrings.Common_Next]: 'Next',
    [DigitalBurnbagStrings.Common_Finish]: 'Finish',
    [DigitalBurnbagStrings.Common_Test]: 'Test',
    [DigitalBurnbagStrings.Common_Connect]: 'Connect',
    [DigitalBurnbagStrings.Common_Disconnect]: 'Disconnect',
    [DigitalBurnbagStrings.Common_Retry]: 'Retry',
    [DigitalBurnbagStrings.Common_Enable]: 'Enable',
    [DigitalBurnbagStrings.Common_Disable]: 'Disable',
    [DigitalBurnbagStrings.Common_Loading]: 'Loading...',
    [DigitalBurnbagStrings.Common_Error]: 'Error',
    [DigitalBurnbagStrings.Common_Success]: 'Success',

    // -- Provider Registration --
    [DigitalBurnbagStrings.Provider_Title]: 'Canary Providers',
    [DigitalBurnbagStrings.Provider_Subtitle]:
      "Connect services to monitor your activity and trigger dead man's switch actions",
    [DigitalBurnbagStrings.Provider_MyConnections]: 'My Connections',
    [DigitalBurnbagStrings.Provider_AddProvider]: 'Add Provider',
    [DigitalBurnbagStrings.Provider_NoConnections]: 'No providers connected',
    [DigitalBurnbagStrings.Provider_NoConnectionsDesc]:
      'Connect a provider to start monitoring your activity',
    [DigitalBurnbagStrings.Provider_SearchPlaceholder]: 'Search providers...',
    [DigitalBurnbagStrings.Provider_FilterByCategory]: 'Filter by category',
    [DigitalBurnbagStrings.Provider_AllCategories]: 'All categories',
    [DigitalBurnbagStrings.Provider_LastChecked]: 'Last checked: {time}',
    [DigitalBurnbagStrings.Provider_LastActivity]: 'Last activity: {time}',
    [DigitalBurnbagStrings.Provider_NeverChecked]: 'Never checked',
    [DigitalBurnbagStrings.Provider_CheckNow]: 'Check now',
    [DigitalBurnbagStrings.Provider_Settings]: 'Settings',
    [DigitalBurnbagStrings.Provider_ViewDetails]: 'View details',

    // -- Provider Status --
    [DigitalBurnbagStrings.ProviderStatus_Connected]: 'Connected',
    [DigitalBurnbagStrings.ProviderStatus_Pending]: 'Pending',
    [DigitalBurnbagStrings.ProviderStatus_Expired]: 'Expired',
    [DigitalBurnbagStrings.ProviderStatus_Invalid]: 'Invalid',
    [DigitalBurnbagStrings.ProviderStatus_Error]: 'Error',
    [DigitalBurnbagStrings.ProviderStatus_NotConnected]: 'Not connected',

    // -- Provider Categories --
    [DigitalBurnbagStrings.ProviderCategory_PlatformNative]: 'Platform Native',
    [DigitalBurnbagStrings.ProviderCategory_PlatformNativeDesc]:
      'Built-in check-in methods that work without external services',
    [DigitalBurnbagStrings.ProviderCategory_HealthFitness]: 'Health & Fitness',
    [DigitalBurnbagStrings.ProviderCategory_HealthFitnessDesc]:
      'Fitness trackers and health apps that show daily activity',
    [DigitalBurnbagStrings.ProviderCategory_Developer]: 'Developer Tools',
    [DigitalBurnbagStrings.ProviderCategory_DeveloperDesc]:
      'Code repositories and developer platforms',
    [DigitalBurnbagStrings.ProviderCategory_Communication]: 'Communication',
    [DigitalBurnbagStrings.ProviderCategory_CommunicationDesc]:
      'Messaging and chat platforms',
    [DigitalBurnbagStrings.ProviderCategory_SocialMedia]: 'Social Media',
    [DigitalBurnbagStrings.ProviderCategory_SocialMediaDesc]:
      'Social networks and content platforms',
    [DigitalBurnbagStrings.ProviderCategory_Productivity]: 'Productivity',
    [DigitalBurnbagStrings.ProviderCategory_ProductivityDesc]:
      'Email, calendar, and productivity tools',
    [DigitalBurnbagStrings.ProviderCategory_SmartHome]: 'Smart Home',
    [DigitalBurnbagStrings.ProviderCategory_SmartHomeDesc]:
      'IoT devices and home automation',
    [DigitalBurnbagStrings.ProviderCategory_Gaming]: 'Gaming',
    [DigitalBurnbagStrings.ProviderCategory_GamingDesc]:
      'Gaming platforms and services',
    [DigitalBurnbagStrings.ProviderCategory_Financial]: 'Financial',
    [DigitalBurnbagStrings.ProviderCategory_FinancialDesc]:
      'Banking and financial services',
    [DigitalBurnbagStrings.ProviderCategory_Email]: 'Email',
    [DigitalBurnbagStrings.ProviderCategory_EmailDesc]: 'Email providers',
    [DigitalBurnbagStrings.ProviderCategory_CustomIntegration]:
      'Custom Integration',
    [DigitalBurnbagStrings.ProviderCategory_CustomIntegrationDesc]:
      'Create your own integration with any service',
    [DigitalBurnbagStrings.ProviderCategory_Location]: 'Location',
    [DigitalBurnbagStrings.ProviderCategory_LocationDesc]:
      'Location and mapping services',
    [DigitalBurnbagStrings.ProviderCategory_Entertainment]: 'Entertainment',
    [DigitalBurnbagStrings.ProviderCategory_EntertainmentDesc]:
      'Entertainment and streaming services',
    [DigitalBurnbagStrings.ProviderCategory_Other]: 'Other',
    [DigitalBurnbagStrings.ProviderCategory_OtherDesc]: 'Other providers',

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
    [DigitalBurnbagStrings.ProviderName_CustomWebhook]: 'Custom Webhook',
    [DigitalBurnbagStrings.ProviderName_BrightChain]: 'BrightChain Activity',
    [DigitalBurnbagStrings.ProviderName_ManualCheckin]: 'Manual Check-in',
    [DigitalBurnbagStrings.ProviderName_EmailPing]: 'Email Check-in',
    [DigitalBurnbagStrings.ProviderName_SmsPing]: 'SMS Check-in',

    // -- Provider Descriptions --
    [DigitalBurnbagStrings.ProviderDesc_Fitbit]:
      'Track steps, heart rate, and sleep data as proof of life',
    [DigitalBurnbagStrings.ProviderDesc_Strava]:
      'Monitor your runs, rides, and workouts',
    [DigitalBurnbagStrings.ProviderDesc_Garmin]:
      'Track activity from Garmin devices',
    [DigitalBurnbagStrings.ProviderDesc_Whoop]:
      'Monitor recovery and strain data',
    [DigitalBurnbagStrings.ProviderDesc_Oura]:
      'Track sleep and readiness scores',
    [DigitalBurnbagStrings.ProviderDesc_GitHub]:
      'Monitor commits, issues, and pull requests',
    [DigitalBurnbagStrings.ProviderDesc_GitLab]:
      'Monitor commits and merge requests',
    [DigitalBurnbagStrings.ProviderDesc_Bitbucket]:
      'Monitor commits and pull requests',
    [DigitalBurnbagStrings.ProviderDesc_Twitter]: 'Monitor tweets and activity',
    [DigitalBurnbagStrings.ProviderDesc_Mastodon]:
      'Monitor toots on any Mastodon instance',
    [DigitalBurnbagStrings.ProviderDesc_Bluesky]: 'Monitor posts on Bluesky',
    [DigitalBurnbagStrings.ProviderDesc_Reddit]: 'Monitor posts and comments',
    [DigitalBurnbagStrings.ProviderDesc_Slack]:
      'Monitor presence and activity status',
    [DigitalBurnbagStrings.ProviderDesc_Discord]:
      'Monitor presence and activity',
    [DigitalBurnbagStrings.ProviderDesc_Telegram]:
      'Monitor activity via bot integration',
    [DigitalBurnbagStrings.ProviderDesc_Google]:
      'Monitor Gmail and Calendar activity',
    [DigitalBurnbagStrings.ProviderDesc_Notion]: 'Monitor workspace activity',
    [DigitalBurnbagStrings.ProviderDesc_HomeAssistant]:
      'Monitor smart home activity and presence',
    [DigitalBurnbagStrings.ProviderDesc_Steam]: 'Monitor gaming activity',
    [DigitalBurnbagStrings.ProviderDesc_CustomWebhook]:
      'Integrate any service that can send HTTP requests',
    [DigitalBurnbagStrings.ProviderDesc_BrightChain]:
      'Monitor your activity on this platform',
    [DigitalBurnbagStrings.ProviderDesc_ManualCheckin]:
      'Manually confirm your presence periodically',
    [DigitalBurnbagStrings.ProviderDesc_EmailPing]:
      'Respond to periodic email challenges',
    [DigitalBurnbagStrings.ProviderDesc_SmsPing]:
      'Respond to periodic SMS challenges',

    // -- Provider Data Access Descriptions --
    [DigitalBurnbagStrings.ProviderDataAccess_Fitbit]:
      'We access your daily activity summary (steps, active minutes), heart rate data, and sleep logs to verify your ongoing activity.',
    [DigitalBurnbagStrings.ProviderDataAccess_Strava]:
      'We access your activity feed to detect when you log runs, rides, or other workouts.',
    [DigitalBurnbagStrings.ProviderDataAccess_Garmin]:
      'We access your Garmin activity data including workouts, steps, and health metrics.',
    [DigitalBurnbagStrings.ProviderDataAccess_Whoop]:
      'We access your WHOOP recovery scores and strain data to verify daily activity.',
    [DigitalBurnbagStrings.ProviderDataAccess_Oura]:
      'We access your Oura sleep data and readiness scores to verify daily activity.',
    [DigitalBurnbagStrings.ProviderDataAccess_GitHub]:
      'We access your public activity feed including commits, issues, pull requests, and comments.',
    [DigitalBurnbagStrings.ProviderDataAccess_GitLab]:
      'We access your GitLab activity including commits, merge requests, and issues.',
    [DigitalBurnbagStrings.ProviderDataAccess_Bitbucket]:
      'We access your Bitbucket activity including commits and pull requests.',
    [DigitalBurnbagStrings.ProviderDataAccess_Twitter]:
      'We access your recent tweets to verify your ongoing activity on the platform.',
    [DigitalBurnbagStrings.ProviderDataAccess_Mastodon]:
      'We access your recent toots to verify your ongoing activity.',
    [DigitalBurnbagStrings.ProviderDataAccess_Bluesky]:
      'We access your recent posts to verify your ongoing activity.',
    [DigitalBurnbagStrings.ProviderDataAccess_Reddit]:
      'We access your recent posts and comments to verify your ongoing activity.',
    [DigitalBurnbagStrings.ProviderDataAccess_Slack]:
      'We access your Slack presence status to verify you are active.',
    [DigitalBurnbagStrings.ProviderDataAccess_Discord]:
      'We access your Discord presence status to verify you are active.',
    [DigitalBurnbagStrings.ProviderDataAccess_Telegram]:
      'We use a Telegram bot to receive check-in messages from you.',
    [DigitalBurnbagStrings.ProviderDataAccess_Google]:
      'We access your Gmail message timestamps (not content) to verify recent activity.',
    [DigitalBurnbagStrings.ProviderDataAccess_Notion]:
      'We access your Notion workspace activity to verify recent edits.',
    [DigitalBurnbagStrings.ProviderDataAccess_HomeAssistant]:
      'We access your Home Assistant to detect motion, door sensors, and other presence indicators.',
    [DigitalBurnbagStrings.ProviderDataAccess_Steam]:
      'We access your Steam profile to detect recent gaming activity.',
    [DigitalBurnbagStrings.ProviderDataAccess_CustomWebhook]:
      'You configure an external service to send heartbeat webhooks to us.',
    [DigitalBurnbagStrings.ProviderDataAccess_BrightChain]:
      'We automatically track your logins, file access, and other activity on BrightChain.',
    [DigitalBurnbagStrings.ProviderDataAccess_ManualCheckin]:
      'You manually check in via the app or website to confirm you are okay.',
    [DigitalBurnbagStrings.ProviderDataAccess_EmailPing]:
      'We send you periodic emails with a check-in link. Click the link to confirm you are okay.',
    [DigitalBurnbagStrings.ProviderDataAccess_SmsPing]:
      'We send you periodic SMS messages. Reply to confirm you are okay.',

    // -- Provider Check Intervals --
    [DigitalBurnbagStrings.ProviderInterval_EveryMinute]: 'Every minute',
    [DigitalBurnbagStrings.ProviderInterval_Every5Minutes]: 'Every 5 minutes',
    [DigitalBurnbagStrings.ProviderInterval_Every15Minutes]: 'Every 15 minutes',
    [DigitalBurnbagStrings.ProviderInterval_Every30Minutes]: 'Every 30 minutes',
    [DigitalBurnbagStrings.ProviderInterval_EveryHour]: 'Every hour',
    [DigitalBurnbagStrings.ProviderInterval_Every2Hours]: 'Every 2 hours',
    [DigitalBurnbagStrings.ProviderInterval_Every4Hours]: 'Every 4 hours',
    [DigitalBurnbagStrings.ProviderInterval_Daily]: 'Daily',
    [DigitalBurnbagStrings.ProviderInterval_Weekly]: 'Weekly',
    [DigitalBurnbagStrings.ProviderInterval_BiWeekly]: 'Every Two Weeks',
    [DigitalBurnbagStrings.ProviderInterval_Monthly]: 'Monthly',
    [DigitalBurnbagStrings.ProviderInterval_Manual]: 'Manual check-in',
    [DigitalBurnbagStrings.ProviderInterval_Automatic]: 'Automatic',
    [DigitalBurnbagStrings.ProviderInterval_Custom]: 'Custom',

    // -- Registration Wizard --
    [DigitalBurnbagStrings.Wizard_SelectProvider]: 'Select Provider',
    [DigitalBurnbagStrings.Wizard_SelectProviderDesc]:
      'Choose a service to connect for activity monitoring',
    [DigitalBurnbagStrings.Wizard_ReviewPermissions]: 'Review Permissions',
    [DigitalBurnbagStrings.Wizard_ReviewPermissionsDesc]:
      'Review what data we will access from this provider',
    [DigitalBurnbagStrings.Wizard_ConfigureAbsence]:
      'Configure Absence Detection',
    [DigitalBurnbagStrings.Wizard_ConfigureAbsenceDesc]:
      "Set how long before inactivity triggers your dead man's switch",
    [DigitalBurnbagStrings.Wizard_ConfigureDuress]:
      'Configure Duress Detection',
    [DigitalBurnbagStrings.Wizard_ConfigureDuressDesc]:
      'Set up keywords or patterns that indicate you are under duress',
    [DigitalBurnbagStrings.Wizard_Authorize]: 'Authorize',
    [DigitalBurnbagStrings.Wizard_AuthorizeDesc]:
      'Grant access to your account on this provider',
    [DigitalBurnbagStrings.Wizard_EnterApiKey]: 'Enter API Key',
    [DigitalBurnbagStrings.Wizard_EnterApiKeyDesc]:
      'Enter your API key to connect this provider',
    [DigitalBurnbagStrings.Wizard_ConfigureWebhook]: 'Configure Webhook',
    [DigitalBurnbagStrings.Wizard_ConfigureWebhookDesc]:
      'Set up a webhook to receive activity updates',
    [DigitalBurnbagStrings.Wizard_TestConnection]: 'Test Connection',
    [DigitalBurnbagStrings.Wizard_TestConnectionDesc]:
      'Verify the connection is working correctly',
    [DigitalBurnbagStrings.Wizard_Complete]: 'Complete',
    [DigitalBurnbagStrings.Wizard_CompleteDesc]:
      'Provider connected successfully',

    // -- Absence Configuration --
    [DigitalBurnbagStrings.Absence_ThresholdLabel]: 'Absence threshold',
    [DigitalBurnbagStrings.Absence_ThresholdHelp]:
      "How long without activity before triggering the dead man's switch",
    [DigitalBurnbagStrings.Absence_GracePeriodLabel]: 'Grace period',
    [DigitalBurnbagStrings.Absence_GracePeriodHelp]:
      'Additional time after threshold before actions are executed',
    [DigitalBurnbagStrings.Absence_SendWarnings]: 'Send warning notifications',
    [DigitalBurnbagStrings.Absence_WarningDaysLabel]:
      'Warning days before threshold',
    [DigitalBurnbagStrings.Absence_WarningDaysHelp]:
      'Days before threshold to send warnings (comma-separated)',
    [DigitalBurnbagStrings.Absence_Days]: 'days',
    [DigitalBurnbagStrings.Absence_Hours]: 'hours',

    // -- Duress Configuration --
    [DigitalBurnbagStrings.Duress_EnableLabel]: 'Enable duress detection',
    [DigitalBurnbagStrings.Duress_EnableHelp]:
      'Detect distress signals in your activity (e.g., specific keywords in commits)',
    [DigitalBurnbagStrings.Duress_KeywordsLabel]: 'Duress keywords',
    [DigitalBurnbagStrings.Duress_KeywordsHelp]:
      'Words that indicate duress when found in your activity (comma-separated)',
    [DigitalBurnbagStrings.Duress_PatternsLabel]: 'Duress patterns',
    [DigitalBurnbagStrings.Duress_PatternsHelp]:
      'Regex patterns that indicate duress (one per line)',

    // -- API Key Entry --
    [DigitalBurnbagStrings.ApiKey_Label]: 'API Key',
    [DigitalBurnbagStrings.ApiKey_Placeholder]: 'Enter your API key',
    [DigitalBurnbagStrings.ApiKey_Help]:
      'Your API key will be encrypted and stored securely',
    [DigitalBurnbagStrings.ApiKey_WhereToFind]: 'Where to find your API key',

    // -- Webhook Configuration --
    [DigitalBurnbagStrings.Webhook_UrlLabel]: 'Webhook URL',
    [DigitalBurnbagStrings.Webhook_UrlHelp]:
      'Configure this URL in your external service',
    [DigitalBurnbagStrings.Webhook_SecretLabel]: 'Webhook Secret',
    [DigitalBurnbagStrings.Webhook_SecretHelp]:
      'Use this secret to sign webhook requests',
    [DigitalBurnbagStrings.Webhook_Instructions]:
      'Configure your service to send POST requests to the webhook URL',
    [DigitalBurnbagStrings.Webhook_CopyUrl]: 'Copy URL',
    [DigitalBurnbagStrings.Webhook_CopySecret]: 'Copy Secret',
    [DigitalBurnbagStrings.Webhook_Copied]: 'Copied to clipboard',

    // -- Connection Test --
    [DigitalBurnbagStrings.Test_Running]: 'Testing connection...',
    [DigitalBurnbagStrings.Test_Success]: 'Connection successful',
    [DigitalBurnbagStrings.Test_Failed]: 'Connection failed',
    [DigitalBurnbagStrings.Test_ResponseTime]: 'Response time: {ms}ms',
    [DigitalBurnbagStrings.Test_UserInfo]: 'Connected as {username}',

    // -- OAuth Flow --
    [DigitalBurnbagStrings.OAuth_Redirecting]: 'Redirecting to {provider}...',
    [DigitalBurnbagStrings.OAuth_WaitingForAuth]:
      'Waiting for authorization...',
    [DigitalBurnbagStrings.OAuth_Success]: 'Authorization successful',
    [DigitalBurnbagStrings.OAuth_Failed]: 'Authorization failed',
    [DigitalBurnbagStrings.OAuth_Cancelled]: 'Authorization cancelled',

    // -- Connection Summary --
    [DigitalBurnbagStrings.Summary_Healthy]: 'All providers healthy',
    [DigitalBurnbagStrings.Summary_Degraded]: 'Some providers need attention',
    [DigitalBurnbagStrings.Summary_Critical]: 'Critical: providers failing',
    [DigitalBurnbagStrings.Summary_None]: 'No providers connected',
    [DigitalBurnbagStrings.Summary_ConnectedProviders]:
      '{count} providers connected',
    [DigitalBurnbagStrings.Summary_NeedsAttention]: '{count} need attention',
    [DigitalBurnbagStrings.Summary_LastHeartbeat]: 'Last heartbeat: {time}',

    // -- Provider Dashboard --
    [DigitalBurnbagStrings.Nav_Providers]: 'Providers',
    [DigitalBurnbagStrings.Dashboard_Title]: 'Provider Dashboard',
    [DigitalBurnbagStrings.Dashboard_HealthBanner]: 'Health Summary',
    [DigitalBurnbagStrings.Dashboard_SignalPresence]: 'Presence',
    [DigitalBurnbagStrings.Dashboard_SignalAbsence]: 'Absence',
    [DigitalBurnbagStrings.Dashboard_SignalDuress]: 'Duress',
    [DigitalBurnbagStrings.Dashboard_SignalCheckFailed]: 'Check Failed',
    [DigitalBurnbagStrings.Dashboard_SignalInconclusive]: 'Inconclusive',
    [DigitalBurnbagStrings.Dashboard_TimeSinceActivity]:
      'Time since last activity',

    // -- Provider Detail View --
    [DigitalBurnbagStrings.Detail_StatusHistory]: 'Status History',
    [DigitalBurnbagStrings.Detail_ConnectionSettings]: 'Connection Settings',
    [DigitalBurnbagStrings.Detail_FilterBySignal]: 'Filter by signal',
    [DigitalBurnbagStrings.Detail_AllSignals]: 'All signals',
    [DigitalBurnbagStrings.Detail_Timeline]: 'Timeline',
    [DigitalBurnbagStrings.Detail_NoHistory]: 'No status history available',

    // -- Binding Assistant --
    [DigitalBurnbagStrings.Binding_BindToProvider]: 'Bind to Provider',
    [DigitalBurnbagStrings.Binding_SelectProvider]: 'Select Provider',
    [DigitalBurnbagStrings.Binding_Condition]: 'Condition',
    [DigitalBurnbagStrings.Binding_Action]: 'Action',
    [DigitalBurnbagStrings.Binding_Targets]: 'Targets',
    [DigitalBurnbagStrings.Binding_Create]: 'Create Binding',
    [DigitalBurnbagStrings.Binding_ProviderNotConnected]:
      'This provider is not connected. Please fix the connection first.',
    [DigitalBurnbagStrings.Binding_FixConnection]: 'Fix Connection',
    [DigitalBurnbagStrings.Binding_DragHint]:
      'Drag a provider card onto a vault or file to create a binding',

    // -- Custom Provider Form --
    [DigitalBurnbagStrings.CustomProvider_Title]: 'Custom Provider',
    [DigitalBurnbagStrings.CustomProvider_ImportJson]: 'Import JSON',
    [DigitalBurnbagStrings.CustomProvider_ExportJson]: 'Export JSON',
    [DigitalBurnbagStrings.CustomProvider_Name]: 'Provider Name',
    [DigitalBurnbagStrings.CustomProvider_Description]: 'Description',
    [DigitalBurnbagStrings.CustomProvider_BaseUrl]: 'Base URL',
    [DigitalBurnbagStrings.CustomProvider_Category]: 'Category',
    [DigitalBurnbagStrings.CustomProvider_AuthType]: 'Authentication Type',
    [DigitalBurnbagStrings.CustomProvider_Endpoints]: 'Endpoints',
    [DigitalBurnbagStrings.CustomProvider_ResponseMapping]: 'Response Mapping',
    [DigitalBurnbagStrings.CustomProvider_Save]: 'Save Provider',
    // -- Encryption & Access Indicators --
    [DigitalBurnbagStrings.Encryption_AES256]: 'AES-256',
    [DigitalBurnbagStrings.Encryption_Encrypted]: 'Encrypted',
    [DigitalBurnbagStrings.Encryption_EncryptedTooltip]:
      'This file is encrypted with AES-256-GCM. Only authorized key holders can decrypt it.',
    [DigitalBurnbagStrings.Encryption_KeyWrapped]: 'Key Wrapped',
    [DigitalBurnbagStrings.Encryption_KeyWrappedTooltip]:
      'Your decryption key is wrapped under your personal ECIES key pair. Only you can unwrap it.',
    [DigitalBurnbagStrings.Encryption_ApprovalProtected]: 'Quorum',
    [DigitalBurnbagStrings.Encryption_ApprovalTooltip]:
      'This file requires quorum approval for sensitive operations like sharing or destruction.',
    [DigitalBurnbagStrings.Access_OnlyYou]: 'Only you',
    [DigitalBurnbagStrings.Access_SharedWith]: 'Shared with',
    [DigitalBurnbagStrings.Access_SharedWithCount]:
      'Shared with {count} people',
    [DigitalBurnbagStrings.Access_ViewAll]: 'View all access',
    [DigitalBurnbagStrings.Vault_EncryptionLabel]: 'Encryption',
    [DigitalBurnbagStrings.Vault_AllEncrypted]: 'All files encrypted',
    [DigitalBurnbagStrings.Vault_AllEncryptedDesc]:
      'Every file in this vault is encrypted with AES-256-GCM. Encryption keys are wrapped per-user via ECIES.',
    [DigitalBurnbagStrings.FileBrowser_ColAccess]: 'Access',
    [DigitalBurnbagStrings.FileBrowser_ColSecurity]: 'Security',

    // -- Friends Sharing --
    [DigitalBurnbagStrings.Friends_SectionTitle]: 'Friends',
    [DigitalBurnbagStrings.Friends_ShareWithAll]: 'Share with Friends',

    // -- Vault Visibility / Public Vaults --
    [DigitalBurnbagStrings.Vault_VisibilityLabel]: 'Visibility',
    [DigitalBurnbagStrings.Vault_Visibility_Private]: 'Private',
    [DigitalBurnbagStrings.Vault_Visibility_PrivateDesc]:
      'Only people you explicitly share with can access this vault.',
    [DigitalBurnbagStrings.Vault_Visibility_Unlisted]: 'Unlisted',
    [DigitalBurnbagStrings.Vault_Visibility_UnlistedDesc]:
      'Anyone with the link can access this vault, but it will not appear in search or the public discovery feed.',
    [DigitalBurnbagStrings.Vault_Visibility_Public]: 'Public',
    [DigitalBurnbagStrings.Vault_Visibility_PublicDesc]:
      'Anyone can discover and access this vault. Popular public vaults may receive free replication upgrades from the network.',
    [DigitalBurnbagStrings.Vault_Public_PopularityLabel]: 'Popularity',
    [DigitalBurnbagStrings.Vault_Public_ReplicationBonus]:
      'Replication bonus active',
    [DigitalBurnbagStrings.Vault_Public_ReplicationBonusDesc]:
      'This vault is popular enough for the network to automatically upgrade its redundancy at no extra cost.',
    [DigitalBurnbagStrings.Vault_Public_DiscoveryNote]:
      'Public vaults are indexed in the Digital Burnbag discovery feed and can gain popularity over time.',
    [DigitalBurnbagStrings.File_Visibility_Override]:
      'File visibility override',
    [DigitalBurnbagStrings.File_Visibility_InheritedFrom]:
      'Inherited from vault ({visibility})',
    [DigitalBurnbagStrings.ACL_PublicPrincipalLabel]: 'Public (anyone)',
    [DigitalBurnbagStrings.ACL_PublicPrincipalDesc]:
      'Grants access to any visitor without requiring authentication.',

    // -- Joule Upload / Storage Cost --
    [DigitalBurnbagStrings.Joule_BurnDateTooltip]: 'Burn date set',
    [DigitalBurnbagStrings.Joule_BurnDateChipLabel]: 'Burns on {date}',
    [DigitalBurnbagStrings.Joule_BurnDateActive]:
      'Pending Burn tier — file will be cryptographically destroyed',
    [DigitalBurnbagStrings.Joule_ExpiryReleaseNote]:
      'After {durationDays} day{daySuffix} your prepaid storage ends. Without a burn date, the file is released to the network — the community may choose to extend it, or it will eventually be removed.',
    [DigitalBurnbagStrings.Joule_RsDisplayText]:
      'RS({rsK},{rsM}) · {overhead} overhead · tolerates {rsM} node failure{failureSuffix}',
    [DigitalBurnbagStrings.Joule_RsDisplayAriaLabel]:
      'Reed-Solomon RS({rsK},{rsM}), {overhead} overhead, tolerates {rsM} node failure{failureSuffix}',
    [DigitalBurnbagStrings.Joule_StorageCostPreviewRegion]:
      'Storage cost preview',
    [DigitalBurnbagStrings.Joule_UpfrontLabel]:
      'Upfront ({durationDays} day{daySuffix})',
    [DigitalBurnbagStrings.Joule_UpfrontAriaLabel]: 'Upfront charge: {amount}',
    [DigitalBurnbagStrings.Joule_DailyCharge]: 'Daily charge',
    [DigitalBurnbagStrings.Joule_DailyAriaLabel]:
      'Daily charge: {amount} per day',
    [DigitalBurnbagStrings.Joule_DailyPerDay]: '{amount} / day',
    [DigitalBurnbagStrings.Joule_InsufficientBalance]:
      'Insufficient balance — available: {balance}',
    [DigitalBurnbagStrings.Joule_UnableToCalculateCost]:
      'Unable to calculate cost',
    [DigitalBurnbagStrings.Joule_StorageDurationTitle]: 'Storage Duration',
    [DigitalBurnbagStrings.Joule_DurationPresetsAriaLabel]: 'Duration presets',
    [DigitalBurnbagStrings.Joule_DurationPresetDays]: '{count} days',
    [DigitalBurnbagStrings.Joule_DurationPreset1Year]: '1 yr',
    [DigitalBurnbagStrings.Joule_DurationPresetAriaLabel]: '{count} days',
    [DigitalBurnbagStrings.Joule_DurationCustomLabel]: 'Custom (days)',
    [DigitalBurnbagStrings.Joule_DurationCustomAriaLabel]:
      'Custom duration in days',
    [DigitalBurnbagStrings.Joule_StorageTierTitle]: 'Storage Tier',
    [DigitalBurnbagStrings.Joule_StorageTierAriaLabel]:
      'Storage tier selection',
    [DigitalBurnbagStrings.Joule_TierCostVsStandard]:
      '{multiplier} cost vs Standard',
    [DigitalBurnbagStrings.Joule_Tier_Performance]: 'Performance',
    [DigitalBurnbagStrings.Joule_Tier_Standard]: 'Standard',
    [DigitalBurnbagStrings.Joule_Tier_Archive]: 'Archive',
    [DigitalBurnbagStrings.Joule_Tier_PendingBurn]: 'Pending Burn',
    [DigitalBurnbagStrings.Joule_Tier_None]: 'No Redundancy',
    [DigitalBurnbagStrings.Joule_FormAriaLabel]: 'Upload configuration form',
    [DigitalBurnbagStrings.Joule_BurnDateCheckboxLabel]: 'Set a burn date',
    [DigitalBurnbagStrings.Joule_BurnDateCheckboxAriaLabel]: 'Enable burn date',
    [DigitalBurnbagStrings.Joule_ContinueButton]: 'Continue',
    [DigitalBurnbagStrings.Joule_ContinueButtonAriaLabel]:
      'Continue to upload cost review',
    [DigitalBurnbagStrings.Joule_InitUploadFailed]:
      'Failed to initialise upload session.',
    [DigitalBurnbagStrings.Joule_ModalTitle]: 'Confirm Storage Charges',
    [DigitalBurnbagStrings.Joule_LoadingAriaLabel]: 'Loading cost quote',
    [DigitalBurnbagStrings.Joule_QuoteExpired]:
      'Quote expired — please re-upload to generate a new cost estimate.',
    [DigitalBurnbagStrings.Joule_ModalInsufficientBalance]:
      'Insufficient balance — upfront charge exceeds your available Joule balance ({balance}).',
    [DigitalBurnbagStrings.Joule_ErasureCodingLabel]: 'Erasure coding',
    [DigitalBurnbagStrings.Joule_ErasureCodingValue]:
      'RS({rsK},{rsM}) · {overheadDisplay} overhead',
    [DigitalBurnbagStrings.Joule_QuoteExpiresIn]: 'Quote expires in',
    [DigitalBurnbagStrings.Joule_QuoteExpiresInAriaLabel]:
      'Quote expires in {seconds} seconds',
    [DigitalBurnbagStrings.Joule_QuoteSeconds]: '{seconds}s',
    [DigitalBurnbagStrings.Joule_QuoteProgressAriaLabel]:
      'Time remaining before quote expires',
    [DigitalBurnbagStrings.Joule_CancelButton]: 'Cancel',
    [DigitalBurnbagStrings.Joule_CancelButtonAriaLabel]:
      'Cancel upload and discard session',
    [DigitalBurnbagStrings.Joule_ConfirmButton]: 'Confirm Upload',
    [DigitalBurnbagStrings.Joule_ConfirmButtonAriaLabel]:
      'Confirm upload and deduct Joule balance',
    [DigitalBurnbagStrings.Joule_FetchQuoteFailed]: 'Failed to fetch quote.',
    [DigitalBurnbagStrings.Joule_CommitFailed]: 'Commit failed. Please retry.',

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
