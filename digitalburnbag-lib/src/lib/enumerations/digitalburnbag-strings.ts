import {
  type BrandedStringKeys,
  BrandedStringKeyValue,
  createI18nStringKeys,
} from '@digitaldefiance/i18n-lib';

export const DigitalBurnbagComponentId = 'DigitalBurnbag';

const _digitalBurnbagKeys = {
  // -- Existing keys --
  KeyFeatures_1: 'DigitalBurnbag_KeyFeatures_1',
  KeyFeatures_2: 'DigitalBurnbag_KeyFeatures_2',
  KeyFeatures_3: 'DigitalBurnbag_KeyFeatures_3',
  KeyFeatures_4: 'DigitalBurnbag_KeyFeatures_4',
  SiteDescription: 'DigitalBurnbag_SiteDescription',
  SiteTagline: 'DigitalBurnbag_SiteTagline',

  // -- Navigation --
  Nav_MyFiles: 'DigitalBurnbag_Nav_MyFiles',
  Nav_SharedWithMe: 'DigitalBurnbag_Nav_SharedWithMe',
  Nav_Favorites: 'DigitalBurnbag_Nav_Favorites',
  Nav_Recent: 'DigitalBurnbag_Nav_Recent',
  Nav_Trash: 'DigitalBurnbag_Nav_Trash',
  Nav_Activity: 'DigitalBurnbag_Nav_Activity',
  Nav_Analytics: 'DigitalBurnbag_Nav_Analytics',
  Nav_Canary: 'DigitalBurnbag_Nav_Canary',
  Nav_Vaults: 'DigitalBurnbag_Nav_Vaults',
  Nav_FileSections: 'DigitalBurnbag_Nav_FileSections',

  // -- Vault Container --
  Vault_Title: 'DigitalBurnbag_Vault_Title',
  Vault_CreateNew: 'DigitalBurnbag_Vault_CreateNew',
  Vault_NameLabel: 'DigitalBurnbag_Vault_NameLabel',
  Vault_DescriptionLabel: 'DigitalBurnbag_Vault_DescriptionLabel',
  Vault_Create: 'DigitalBurnbag_Vault_Create',
  Vault_Cancel: 'DigitalBurnbag_Vault_Cancel',
  Vault_Empty: 'DigitalBurnbag_Vault_Empty',
  Vault_EmptyDesc: 'DigitalBurnbag_Vault_EmptyDesc',
  Vault_Files: 'DigitalBurnbag_Vault_Files',
  Vault_Folders: 'DigitalBurnbag_Vault_Folders',
  Vault_State: 'DigitalBurnbag_Vault_State',
  Vault_SealStatus: 'DigitalBurnbag_Vault_SealStatus',
  Vault_AllPristine: 'DigitalBurnbag_Vault_AllPristine',
  Vault_SomeAccessed: 'DigitalBurnbag_Vault_SomeAccessed',
  Vault_Open: 'DigitalBurnbag_Vault_Open',
  Vault_Lock: 'DigitalBurnbag_Vault_Lock',
  Vault_Destroy: 'DigitalBurnbag_Vault_Destroy',
  Vault_CreateFailed: 'DigitalBurnbag_Vault_CreateFailed',
  Vault_LoadFailed: 'DigitalBurnbag_Vault_LoadFailed',
  Vault_Created: 'DigitalBurnbag_Vault_Created',

  // -- FileBrowser --
  FileBrowser_ColName: 'DigitalBurnbag_FileBrowser_ColName',
  FileBrowser_ColSize: 'DigitalBurnbag_FileBrowser_ColSize',
  FileBrowser_ColModified: 'DigitalBurnbag_FileBrowser_ColModified',
  FileBrowser_ColType: 'DigitalBurnbag_FileBrowser_ColType',
  FileBrowser_EmptyFolder: 'DigitalBurnbag_FileBrowser_EmptyFolder',
  FileBrowser_SelectAll: 'DigitalBurnbag_FileBrowser_SelectAll',
  FileBrowser_FolderPath: 'DigitalBurnbag_FileBrowser_FolderPath',
  FileBrowser_Loading: 'DigitalBurnbag_FileBrowser_Loading',
  FileBrowser_TypeFolder: 'DigitalBurnbag_FileBrowser_TypeFolder',
  FileBrowser_TypeFile: 'DigitalBurnbag_FileBrowser_TypeFile',

  // -- Context menu actions --
  Action_Rename: 'DigitalBurnbag_Action_Rename',
  Action_Move: 'DigitalBurnbag_Action_Move',
  Action_Copy: 'DigitalBurnbag_Action_Copy',
  Action_Delete: 'DigitalBurnbag_Action_Delete',
  Action_Share: 'DigitalBurnbag_Action_Share',
  Action_Download: 'DigitalBurnbag_Action_Download',
  Action_Duplicate: 'DigitalBurnbag_Action_Duplicate',
  Action_History: 'DigitalBurnbag_Action_History',
  Action_Permissions: 'DigitalBurnbag_Action_Permissions',
  Action_Preview: 'DigitalBurnbag_Action_Preview',
  Action_More: 'DigitalBurnbag_Action_More',
  Action_Paste: 'DigitalBurnbag_Action_Paste',
  Action_UploadNewVersion: 'DigitalBurnbag_Action_UploadNewVersion',
  Action_StorageContract: 'DigitalBurnbag_Action_StorageContract',
  Action_CopyPathLink: 'DigitalBurnbag_Action_CopyPathLink',

  // -- TrashBinView --
  Trash_ColName: 'DigitalBurnbag_Trash_ColName',
  Trash_ColOriginalPath: 'DigitalBurnbag_Trash_ColOriginalPath',
  Trash_ColDeleted: 'DigitalBurnbag_Trash_ColDeleted',
  Trash_ColTimeRemaining: 'DigitalBurnbag_Trash_ColTimeRemaining',
  Trash_ColActions: 'DigitalBurnbag_Trash_ColActions',
  Trash_Empty: 'DigitalBurnbag_Trash_Empty',
  Trash_Restore: 'DigitalBurnbag_Trash_Restore',
  Trash_DeletePermanently: 'DigitalBurnbag_Trash_DeletePermanently',
  Trash_Loading: 'DigitalBurnbag_Trash_Loading',
  Trash_Expired: 'DigitalBurnbag_Trash_Expired',
  Trash_DaysRemaining: 'DigitalBurnbag_Trash_DaysRemaining',
  Trash_HoursRemaining: 'DigitalBurnbag_Trash_HoursRemaining',

  // -- ShareDialog --
  Share_Title: 'DigitalBurnbag_Share_Title',
  Share_WithUser: 'DigitalBurnbag_Share_WithUser',
  Share_EmailLabel: 'DigitalBurnbag_Share_EmailLabel',
  Share_PermView: 'DigitalBurnbag_Share_PermView',
  Share_PermEdit: 'DigitalBurnbag_Share_PermEdit',
  Share_Button: 'DigitalBurnbag_Share_Button',
  Share_AdvancedOptions: 'DigitalBurnbag_Share_AdvancedOptions',
  Share_EncryptionMode: 'DigitalBurnbag_Share_EncryptionMode',
  Share_ServerProxied: 'DigitalBurnbag_Share_ServerProxied',
  Share_ServerProxiedDesc: 'DigitalBurnbag_Share_ServerProxiedDesc',
  Share_EphemeralKeyPair: 'DigitalBurnbag_Share_EphemeralKeyPair',
  Share_EphemeralKeyPairDesc: 'DigitalBurnbag_Share_EphemeralKeyPairDesc',
  Share_RecipientPublicKey: 'DigitalBurnbag_Share_RecipientPublicKey',
  Share_RecipientPublicKeyDesc: 'DigitalBurnbag_Share_RecipientPublicKeyDesc',
  Share_RecipientKeyLabel: 'DigitalBurnbag_Share_RecipientKeyLabel',
  Share_PasswordLabel: 'DigitalBurnbag_Share_PasswordLabel',
  Share_ExpiresAtLabel: 'DigitalBurnbag_Share_ExpiresAtLabel',
  Share_MaxAccessLabel: 'DigitalBurnbag_Share_MaxAccessLabel',
  Share_ScopeLabel: 'DigitalBurnbag_Share_ScopeLabel',
  Share_ScopeSpecific: 'DigitalBurnbag_Share_ScopeSpecific',
  Share_ScopeOrganization: 'DigitalBurnbag_Share_ScopeOrganization',
  Share_ScopeAnonymous: 'DigitalBurnbag_Share_ScopeAnonymous',
  Share_BlockDownload: 'DigitalBurnbag_Share_BlockDownload',
  Share_CreateLink: 'DigitalBurnbag_Share_CreateLink',
  Share_MagnetWarning: 'DigitalBurnbag_Share_MagnetWarning',
  Share_GetMagnetUrl: 'DigitalBurnbag_Share_GetMagnetUrl',
  Share_Close: 'DigitalBurnbag_Share_Close',
  Share_Failed: 'DigitalBurnbag_Share_Failed',
  Share_LinkFailed: 'DigitalBurnbag_Share_LinkFailed',
  Share_MagnetFailed: 'DigitalBurnbag_Share_MagnetFailed',

  // -- UploadWidget --
  Upload_DropOrBrowse: 'DigitalBurnbag_Upload_DropOrBrowse',
  Upload_DropZoneLabel: 'DigitalBurnbag_Upload_DropZoneLabel',
  Upload_Failed: 'DigitalBurnbag_Upload_Failed',

  // -- Upload New Version --
  Upload_NewVersion: 'DigitalBurnbag_Upload_NewVersion',
  Upload_NewVersionTitle: 'DigitalBurnbag_Upload_NewVersionTitle',
  Upload_NewVersionDesc: 'DigitalBurnbag_Upload_NewVersionDesc',
  Upload_NewVersionSelect: 'DigitalBurnbag_Upload_NewVersionSelect',
  Upload_NewVersionUploading: 'DigitalBurnbag_Upload_NewVersionUploading',
  Upload_NewVersionSuccess: 'DigitalBurnbag_Upload_NewVersionSuccess',
  Upload_NewVersionFailed: 'DigitalBurnbag_Upload_NewVersionFailed',
  Upload_NewVersionMimeTypeMismatch:
    'DigitalBurnbag_Upload_NewVersionMimeTypeMismatch',

  // -- PreviewViewer --
  Preview_CloseLabel: 'DigitalBurnbag_Preview_CloseLabel',
  Preview_Download: 'DigitalBurnbag_Preview_Download',
  Preview_Close: 'DigitalBurnbag_Preview_Close',
  Preview_TypeLabel: 'DigitalBurnbag_Preview_TypeLabel',
  Preview_NotAvailable: 'DigitalBurnbag_Preview_NotAvailable',
  Preview_VideoNotSupported: 'DigitalBurnbag_Preview_VideoNotSupported',
  Preview_LoadFailed: 'DigitalBurnbag_Preview_LoadFailed',

  // -- BulkOperationsToolbar --
  Bulk_ItemsSelected: 'DigitalBurnbag_Bulk_ItemsSelected',
  Bulk_ClearSelection: 'DigitalBurnbag_Bulk_ClearSelection',
  Bulk_Succeeded: 'DigitalBurnbag_Bulk_Succeeded',
  Bulk_Failed: 'DigitalBurnbag_Bulk_Failed',

  // -- ACLEditor --
  ACL_ColPrincipal: 'DigitalBurnbag_ACL_ColPrincipal',
  ACL_ColType: 'DigitalBurnbag_ACL_ColType',
  ACL_ColPermission: 'DigitalBurnbag_ACL_ColPermission',
  ACL_ColActions: 'DigitalBurnbag_ACL_ColActions',
  ACL_Remove: 'DigitalBurnbag_ACL_Remove',
  ACL_Add: 'DigitalBurnbag_ACL_Add',
  ACL_UserOrGroupPlaceholder: 'DigitalBurnbag_ACL_UserOrGroupPlaceholder',
  ACL_InheritedFrom: 'DigitalBurnbag_ACL_InheritedFrom',
  ACL_AdvancedPermissions: 'DigitalBurnbag_ACL_AdvancedPermissions',
  ACL_PermissionFlags: 'DigitalBurnbag_ACL_PermissionFlags',
  ACL_PermissionSetName: 'DigitalBurnbag_ACL_PermissionSetName',
  ACL_CreateSet: 'DigitalBurnbag_ACL_CreateSet',
  ACL_CustomSets: 'DigitalBurnbag_ACL_CustomSets',
  ACL_Mixed: 'DigitalBurnbag_ACL_Mixed',
  ACL_MixedTooltip: 'DigitalBurnbag_ACL_MixedTooltip',
  ACL_ApplyToAll: 'DigitalBurnbag_ACL_ApplyToAll',
  ACL_MultiItemTitle: 'DigitalBurnbag_ACL_MultiItemTitle',
  ACL_SaveFailed: 'DigitalBurnbag_ACL_SaveFailed',
  ACL_Saved: 'DigitalBurnbag_ACL_Saved',

  // -- CanaryConfigPanel --
  Canary_Bindings: 'DigitalBurnbag_Canary_Bindings',
  Canary_AddBinding: 'DigitalBurnbag_Canary_AddBinding',
  Canary_ColCondition: 'DigitalBurnbag_Canary_ColCondition',
  Canary_ColAction: 'DigitalBurnbag_Canary_ColAction',
  Canary_ColTarget: 'DigitalBurnbag_Canary_ColTarget',
  Canary_ColActions: 'DigitalBurnbag_Canary_ColActions',
  Canary_NoBindings: 'DigitalBurnbag_Canary_NoBindings',
  Canary_DryRun: 'DigitalBurnbag_Canary_DryRun',
  Canary_DeleteBinding: 'DigitalBurnbag_Canary_DeleteBinding',
  Canary_NewBinding: 'DigitalBurnbag_Canary_NewBinding',
  Canary_ProviderLabel: 'DigitalBurnbag_Canary_ProviderLabel',
  Canary_TargetIdsLabel: 'DigitalBurnbag_Canary_TargetIdsLabel',
  Canary_NoRecipientList: 'DigitalBurnbag_Canary_NoRecipientList',
  Canary_CascadeDelayLabel: 'DigitalBurnbag_Canary_CascadeDelayLabel',
  Canary_Create: 'DigitalBurnbag_Canary_Create',
  Canary_Cancel: 'DigitalBurnbag_Canary_Cancel',
  Canary_RecipientLists: 'DigitalBurnbag_Canary_RecipientLists',
  Canary_AddList: 'DigitalBurnbag_Canary_AddList',
  Canary_ColListName: 'DigitalBurnbag_Canary_ColListName',
  Canary_ColRecipients: 'DigitalBurnbag_Canary_ColRecipients',
  Canary_NoLists: 'DigitalBurnbag_Canary_NoLists',
  Canary_NewList: 'DigitalBurnbag_Canary_NewList',
  Canary_ListNameLabel: 'DigitalBurnbag_Canary_ListNameLabel',
  Canary_RecipientsLabel: 'DigitalBurnbag_Canary_RecipientsLabel',
  Canary_DryRunReport: 'DigitalBurnbag_Canary_DryRunReport',
  Canary_AffectedFiles: 'DigitalBurnbag_Canary_AffectedFiles',
  Canary_RecipientsCount: 'DigitalBurnbag_Canary_RecipientsCount',
  Canary_ActionsLabel: 'DigitalBurnbag_Canary_ActionsLabel',

  // -- NotificationPanel --
  Notifications_Label: 'DigitalBurnbag_Notifications_Label',
  Notifications_Empty: 'DigitalBurnbag_Notifications_Empty',

  // -- ActivityFeed --
  Activity_AllOperations: 'DigitalBurnbag_Activity_AllOperations',
  Activity_NoActivity: 'DigitalBurnbag_Activity_NoActivity',
  Activity_OnTarget: 'DigitalBurnbag_Activity_OnTarget',

  // -- StorageAnalytics --
  Analytics_StorageUsage: 'DigitalBurnbag_Analytics_StorageUsage',
  Analytics_UsageSummary: 'DigitalBurnbag_Analytics_UsageSummary',
  Analytics_ByFileType: 'DigitalBurnbag_Analytics_ByFileType',
  Analytics_ColCategory: 'DigitalBurnbag_Analytics_ColCategory',
  Analytics_ColFiles: 'DigitalBurnbag_Analytics_ColFiles',
  Analytics_ColSize: 'DigitalBurnbag_Analytics_ColSize',
  Analytics_LargestItems: 'DigitalBurnbag_Analytics_LargestItems',
  Analytics_ColName: 'DigitalBurnbag_Analytics_ColName',
  Analytics_ColItemActions: 'DigitalBurnbag_Analytics_ColItemActions',
  Analytics_Trash: 'DigitalBurnbag_Analytics_Trash',
  Analytics_StaleFiles: 'DigitalBurnbag_Analytics_StaleFiles',
  Analytics_ColAge: 'DigitalBurnbag_Analytics_ColAge',
  Analytics_AgeDays: 'DigitalBurnbag_Analytics_AgeDays',
  Analytics_ScheduleDestroy: 'DigitalBurnbag_Analytics_ScheduleDestroy',

  // -- BurnbagPage snackbar / error messages --
  Page_ItemMoved: 'DigitalBurnbag_Page_ItemMoved',
  Page_MoveFailed: 'DigitalBurnbag_Page_MoveFailed',
  Page_LoadFolderFailed: 'DigitalBurnbag_Page_LoadFolderFailed',
  Page_LoadTrashFailed: 'DigitalBurnbag_Page_LoadTrashFailed',
  Page_LoadSharedFailed: 'DigitalBurnbag_Page_LoadSharedFailed',
  Page_LoadCanaryFailed: 'DigitalBurnbag_Page_LoadCanaryFailed',
  Page_LoadActivityFailed: 'DigitalBurnbag_Page_LoadActivityFailed',
  Page_LoadAnalyticsFailed: 'DigitalBurnbag_Page_LoadAnalyticsFailed',
  Page_LoadPermissionsFailed: 'DigitalBurnbag_Page_LoadPermissionsFailed',
  Page_DeleteFailed: 'DigitalBurnbag_Page_DeleteFailed',
  Page_RenameFailed: 'DigitalBurnbag_Page_RenameFailed',
  Page_Renamed: 'DigitalBurnbag_Page_Renamed',
  Page_ItemsMovedToTrash: 'DigitalBurnbag_Page_ItemsMovedToTrash',
  Page_Restored: 'DigitalBurnbag_Page_Restored',
  Page_PermanentlyDeleted: 'DigitalBurnbag_Page_PermanentlyDeleted',
  Page_RestoreFailed: 'DigitalBurnbag_Page_RestoreFailed',
  Page_PermanentDeleteFailed: 'DigitalBurnbag_Page_PermanentDeleteFailed',
  Page_BindingCreated: 'DigitalBurnbag_Page_BindingCreated',
  Page_BindingDeleted: 'DigitalBurnbag_Page_BindingDeleted',
  Page_RecipientListCreated: 'DigitalBurnbag_Page_RecipientListCreated',
  Page_UserNotFound: 'DigitalBurnbag_Page_UserNotFound',
  Page_PathNotFound: 'DigitalBurnbag_Page_PathNotFound',
  Page_NoFileSelected: 'DigitalBurnbag_Page_NoFileSelected',
  Page_UploadFailed: 'DigitalBurnbag_Page_UploadFailed',
  Page_ErrorOccurred: 'DigitalBurnbag_Page_ErrorOccurred',
  Page_RenamePrompt: 'DigitalBurnbag_Page_RenamePrompt',

  // -- Phix (Phoenix-cycle rename) --
  Phix_Button: 'DigitalBurnbag_Phix_Button',
  Phix_Tooltip: 'DigitalBurnbag_Phix_Tooltip',
  Phix_Confirm_Title: 'DigitalBurnbag_Phix_Confirm_Title',
  Phix_Confirm_MetadataOnly: 'DigitalBurnbag_Phix_Confirm_MetadataOnly',
  Phix_Confirm_FullCycle: 'DigitalBurnbag_Phix_Confirm_FullCycle',
  Phix_Progress: 'DigitalBurnbag_Phix_Progress',
  Phix_Complete: 'DigitalBurnbag_Phix_Complete',
  Phix_Failed: 'DigitalBurnbag_Phix_Failed',
  Phix_Mascot_Tiny: 'DigitalBurnbag_Phix_Mascot_Tiny',
  Phix_Mascot_Small: 'DigitalBurnbag_Phix_Mascot_Small',
  Phix_Mascot_Medium: 'DigitalBurnbag_Phix_Mascot_Medium',
  Phix_Mascot_Large: 'DigitalBurnbag_Phix_Mascot_Large',
  Phix_Mascot_Massive: 'DigitalBurnbag_Phix_Mascot_Massive',

  // -- Common --
  Common_Close: 'DigitalBurnbag_Common_Close',
  Common_Save: 'DigitalBurnbag_Common_Save',
  Common_Back: 'DigitalBurnbag_Common_Back',
  Common_Next: 'DigitalBurnbag_Common_Next',
  Common_Finish: 'DigitalBurnbag_Common_Finish',
  Common_Test: 'DigitalBurnbag_Common_Test',
  Common_Connect: 'DigitalBurnbag_Common_Connect',
  Common_Disconnect: 'DigitalBurnbag_Common_Disconnect',
  Common_Retry: 'DigitalBurnbag_Common_Retry',
  Common_Enable: 'DigitalBurnbag_Common_Enable',
  Common_Disable: 'DigitalBurnbag_Common_Disable',
  Common_Loading: 'DigitalBurnbag_Common_Loading',
  Common_Error: 'DigitalBurnbag_Common_Error',
  Common_Success: 'DigitalBurnbag_Common_Success',

  // -- Provider Registration --
  Provider_Title: 'DigitalBurnbag_Provider_Title',
  Provider_Subtitle: 'DigitalBurnbag_Provider_Subtitle',
  Provider_MyConnections: 'DigitalBurnbag_Provider_MyConnections',
  Provider_AddProvider: 'DigitalBurnbag_Provider_AddProvider',
  Provider_NoConnections: 'DigitalBurnbag_Provider_NoConnections',
  Provider_NoConnectionsDesc: 'DigitalBurnbag_Provider_NoConnectionsDesc',
  Provider_SearchPlaceholder: 'DigitalBurnbag_Provider_SearchPlaceholder',
  Provider_FilterByCategory: 'DigitalBurnbag_Provider_FilterByCategory',
  Provider_AllCategories: 'DigitalBurnbag_Provider_AllCategories',
  Provider_LastChecked: 'DigitalBurnbag_Provider_LastChecked',
  Provider_LastActivity: 'DigitalBurnbag_Provider_LastActivity',
  Provider_NeverChecked: 'DigitalBurnbag_Provider_NeverChecked',
  Provider_CheckNow: 'DigitalBurnbag_Provider_CheckNow',
  Provider_Settings: 'DigitalBurnbag_Provider_Settings',
  Provider_ViewDetails: 'DigitalBurnbag_Provider_ViewDetails',

  // -- Provider Status --
  ProviderStatus_Connected: 'DigitalBurnbag_ProviderStatus_Connected',
  ProviderStatus_Pending: 'DigitalBurnbag_ProviderStatus_Pending',
  ProviderStatus_Expired: 'DigitalBurnbag_ProviderStatus_Expired',
  ProviderStatus_Invalid: 'DigitalBurnbag_ProviderStatus_Invalid',
  ProviderStatus_Error: 'DigitalBurnbag_ProviderStatus_Error',
  ProviderStatus_NotConnected: 'DigitalBurnbag_ProviderStatus_NotConnected',

  // -- Provider Categories --
  ProviderCategory_PlatformNative:
    'DigitalBurnbag_ProviderCategory_PlatformNative',
  ProviderCategory_PlatformNativeDesc:
    'DigitalBurnbag_ProviderCategory_PlatformNativeDesc',
  ProviderCategory_HealthFitness:
    'DigitalBurnbag_ProviderCategory_HealthFitness',
  ProviderCategory_HealthFitnessDesc:
    'DigitalBurnbag_ProviderCategory_HealthFitnessDesc',
  ProviderCategory_Developer: 'DigitalBurnbag_ProviderCategory_Developer',
  ProviderCategory_DeveloperDesc:
    'DigitalBurnbag_ProviderCategory_DeveloperDesc',
  ProviderCategory_Communication:
    'DigitalBurnbag_ProviderCategory_Communication',
  ProviderCategory_CommunicationDesc:
    'DigitalBurnbag_ProviderCategory_CommunicationDesc',
  ProviderCategory_SocialMedia: 'DigitalBurnbag_ProviderCategory_SocialMedia',
  ProviderCategory_SocialMediaDesc:
    'DigitalBurnbag_ProviderCategory_SocialMediaDesc',
  ProviderCategory_Productivity: 'DigitalBurnbag_ProviderCategory_Productivity',
  ProviderCategory_ProductivityDesc:
    'DigitalBurnbag_ProviderCategory_ProductivityDesc',
  ProviderCategory_SmartHome: 'DigitalBurnbag_ProviderCategory_SmartHome',
  ProviderCategory_SmartHomeDesc:
    'DigitalBurnbag_ProviderCategory_SmartHomeDesc',
  ProviderCategory_Gaming: 'DigitalBurnbag_ProviderCategory_Gaming',
  ProviderCategory_GamingDesc: 'DigitalBurnbag_ProviderCategory_GamingDesc',
  ProviderCategory_Financial: 'DigitalBurnbag_ProviderCategory_Financial',
  ProviderCategory_FinancialDesc:
    'DigitalBurnbag_ProviderCategory_FinancialDesc',
  ProviderCategory_Email: 'DigitalBurnbag_ProviderCategory_Email',
  ProviderCategory_EmailDesc: 'DigitalBurnbag_ProviderCategory_EmailDesc',
  ProviderCategory_CustomIntegration:
    'DigitalBurnbag_ProviderCategory_CustomIntegration',
  ProviderCategory_CustomIntegrationDesc:
    'DigitalBurnbag_ProviderCategory_CustomIntegrationDesc',
  ProviderCategory_Location: 'DigitalBurnbag_ProviderCategory_Location',
  ProviderCategory_LocationDesc:
    'DigitalBurnbag_ProviderCategory_LocationDesc',
  ProviderCategory_Entertainment:
    'DigitalBurnbag_ProviderCategory_Entertainment',
  ProviderCategory_EntertainmentDesc:
    'DigitalBurnbag_ProviderCategory_EntertainmentDesc',
  ProviderCategory_Other: 'DigitalBurnbag_ProviderCategory_Other',
  ProviderCategory_OtherDesc: 'DigitalBurnbag_ProviderCategory_OtherDesc',

  // -- Provider Names --
  ProviderName_Fitbit: 'DigitalBurnbag_ProviderName_Fitbit',
  ProviderName_Strava: 'DigitalBurnbag_ProviderName_Strava',
  ProviderName_Garmin: 'DigitalBurnbag_ProviderName_Garmin',
  ProviderName_Whoop: 'DigitalBurnbag_ProviderName_Whoop',
  ProviderName_Oura: 'DigitalBurnbag_ProviderName_Oura',
  ProviderName_GitHub: 'DigitalBurnbag_ProviderName_GitHub',
  ProviderName_GitLab: 'DigitalBurnbag_ProviderName_GitLab',
  ProviderName_Bitbucket: 'DigitalBurnbag_ProviderName_Bitbucket',
  ProviderName_Twitter: 'DigitalBurnbag_ProviderName_Twitter',
  ProviderName_Mastodon: 'DigitalBurnbag_ProviderName_Mastodon',
  ProviderName_Bluesky: 'DigitalBurnbag_ProviderName_Bluesky',
  ProviderName_Reddit: 'DigitalBurnbag_ProviderName_Reddit',
  ProviderName_Slack: 'DigitalBurnbag_ProviderName_Slack',
  ProviderName_Discord: 'DigitalBurnbag_ProviderName_Discord',
  ProviderName_Telegram: 'DigitalBurnbag_ProviderName_Telegram',
  ProviderName_Google: 'DigitalBurnbag_ProviderName_Google',
  ProviderName_Notion: 'DigitalBurnbag_ProviderName_Notion',
  ProviderName_HomeAssistant: 'DigitalBurnbag_ProviderName_HomeAssistant',
  ProviderName_Steam: 'DigitalBurnbag_ProviderName_Steam',
  ProviderName_CustomWebhook: 'DigitalBurnbag_ProviderName_CustomWebhook',
  ProviderName_BrightChain: 'DigitalBurnbag_ProviderName_BrightChain',
  ProviderName_ManualCheckin: 'DigitalBurnbag_ProviderName_ManualCheckin',
  ProviderName_EmailPing: 'DigitalBurnbag_ProviderName_EmailPing',
  ProviderName_SmsPing: 'DigitalBurnbag_ProviderName_SmsPing',

  // -- Provider Descriptions --
  ProviderDesc_Fitbit: 'DigitalBurnbag_ProviderDesc_Fitbit',
  ProviderDesc_Strava: 'DigitalBurnbag_ProviderDesc_Strava',
  ProviderDesc_Garmin: 'DigitalBurnbag_ProviderDesc_Garmin',
  ProviderDesc_Whoop: 'DigitalBurnbag_ProviderDesc_Whoop',
  ProviderDesc_Oura: 'DigitalBurnbag_ProviderDesc_Oura',
  ProviderDesc_GitHub: 'DigitalBurnbag_ProviderDesc_GitHub',
  ProviderDesc_GitLab: 'DigitalBurnbag_ProviderDesc_GitLab',
  ProviderDesc_Bitbucket: 'DigitalBurnbag_ProviderDesc_Bitbucket',
  ProviderDesc_Twitter: 'DigitalBurnbag_ProviderDesc_Twitter',
  ProviderDesc_Mastodon: 'DigitalBurnbag_ProviderDesc_Mastodon',
  ProviderDesc_Bluesky: 'DigitalBurnbag_ProviderDesc_Bluesky',
  ProviderDesc_Reddit: 'DigitalBurnbag_ProviderDesc_Reddit',
  ProviderDesc_Slack: 'DigitalBurnbag_ProviderDesc_Slack',
  ProviderDesc_Discord: 'DigitalBurnbag_ProviderDesc_Discord',
  ProviderDesc_Telegram: 'DigitalBurnbag_ProviderDesc_Telegram',
  ProviderDesc_Google: 'DigitalBurnbag_ProviderDesc_Google',
  ProviderDesc_Notion: 'DigitalBurnbag_ProviderDesc_Notion',
  ProviderDesc_HomeAssistant: 'DigitalBurnbag_ProviderDesc_HomeAssistant',
  ProviderDesc_Steam: 'DigitalBurnbag_ProviderDesc_Steam',
  ProviderDesc_CustomWebhook: 'DigitalBurnbag_ProviderDesc_CustomWebhook',
  ProviderDesc_BrightChain: 'DigitalBurnbag_ProviderDesc_BrightChain',
  ProviderDesc_ManualCheckin: 'DigitalBurnbag_ProviderDesc_ManualCheckin',
  ProviderDesc_EmailPing: 'DigitalBurnbag_ProviderDesc_EmailPing',
  ProviderDesc_SmsPing: 'DigitalBurnbag_ProviderDesc_SmsPing',

  // -- Provider Data Access Descriptions --
  ProviderDataAccess_Fitbit: 'DigitalBurnbag_ProviderDataAccess_Fitbit',
  ProviderDataAccess_Strava: 'DigitalBurnbag_ProviderDataAccess_Strava',
  ProviderDataAccess_Garmin: 'DigitalBurnbag_ProviderDataAccess_Garmin',
  ProviderDataAccess_Whoop: 'DigitalBurnbag_ProviderDataAccess_Whoop',
  ProviderDataAccess_Oura: 'DigitalBurnbag_ProviderDataAccess_Oura',
  ProviderDataAccess_GitHub: 'DigitalBurnbag_ProviderDataAccess_GitHub',
  ProviderDataAccess_GitLab: 'DigitalBurnbag_ProviderDataAccess_GitLab',
  ProviderDataAccess_Bitbucket: 'DigitalBurnbag_ProviderDataAccess_Bitbucket',
  ProviderDataAccess_Twitter: 'DigitalBurnbag_ProviderDataAccess_Twitter',
  ProviderDataAccess_Mastodon: 'DigitalBurnbag_ProviderDataAccess_Mastodon',
  ProviderDataAccess_Bluesky: 'DigitalBurnbag_ProviderDataAccess_Bluesky',
  ProviderDataAccess_Reddit: 'DigitalBurnbag_ProviderDataAccess_Reddit',
  ProviderDataAccess_Slack: 'DigitalBurnbag_ProviderDataAccess_Slack',
  ProviderDataAccess_Discord: 'DigitalBurnbag_ProviderDataAccess_Discord',
  ProviderDataAccess_Telegram: 'DigitalBurnbag_ProviderDataAccess_Telegram',
  ProviderDataAccess_Google: 'DigitalBurnbag_ProviderDataAccess_Google',
  ProviderDataAccess_Notion: 'DigitalBurnbag_ProviderDataAccess_Notion',
  ProviderDataAccess_HomeAssistant:
    'DigitalBurnbag_ProviderDataAccess_HomeAssistant',
  ProviderDataAccess_Steam: 'DigitalBurnbag_ProviderDataAccess_Steam',
  ProviderDataAccess_CustomWebhook:
    'DigitalBurnbag_ProviderDataAccess_CustomWebhook',
  ProviderDataAccess_BrightChain:
    'DigitalBurnbag_ProviderDataAccess_BrightChain',
  ProviderDataAccess_ManualCheckin:
    'DigitalBurnbag_ProviderDataAccess_ManualCheckin',
  ProviderDataAccess_EmailPing: 'DigitalBurnbag_ProviderDataAccess_EmailPing',
  ProviderDataAccess_SmsPing: 'DigitalBurnbag_ProviderDataAccess_SmsPing',

  // -- Provider Check Intervals --
  ProviderInterval_EveryMinute: 'DigitalBurnbag_ProviderInterval_EveryMinute',
  ProviderInterval_Every5Minutes:
    'DigitalBurnbag_ProviderInterval_Every5Minutes',
  ProviderInterval_Every15Minutes:
    'DigitalBurnbag_ProviderInterval_Every15Minutes',
  ProviderInterval_Every30Minutes:
    'DigitalBurnbag_ProviderInterval_Every30Minutes',
  ProviderInterval_EveryHour: 'DigitalBurnbag_ProviderInterval_EveryHour',
  ProviderInterval_Every2Hours: 'DigitalBurnbag_ProviderInterval_Every2Hours',
  ProviderInterval_Every4Hours: 'DigitalBurnbag_ProviderInterval_Every4Hours',
  ProviderInterval_Daily: 'DigitalBurnbag_ProviderInterval_Daily',
  ProviderInterval_Weekly: 'DigitalBurnbag_ProviderInterval_Weekly',
  ProviderInterval_BiWeekly: 'DigitalBurnbag_ProviderInterval_BiWeekly',
  ProviderInterval_Monthly: 'DigitalBurnbag_ProviderInterval_Monthly',
  ProviderInterval_Manual: 'DigitalBurnbag_ProviderInterval_Manual',
  ProviderInterval_Automatic: 'DigitalBurnbag_ProviderInterval_Automatic',
  ProviderInterval_Custom: 'DigitalBurnbag_ProviderInterval_Custom',

  // -- Registration Wizard --
  Wizard_SelectProvider: 'DigitalBurnbag_Wizard_SelectProvider',
  Wizard_SelectProviderDesc: 'DigitalBurnbag_Wizard_SelectProviderDesc',
  Wizard_ReviewPermissions: 'DigitalBurnbag_Wizard_ReviewPermissions',
  Wizard_ReviewPermissionsDesc: 'DigitalBurnbag_Wizard_ReviewPermissionsDesc',
  Wizard_ConfigureAbsence: 'DigitalBurnbag_Wizard_ConfigureAbsence',
  Wizard_ConfigureAbsenceDesc: 'DigitalBurnbag_Wizard_ConfigureAbsenceDesc',
  Wizard_ConfigureDuress: 'DigitalBurnbag_Wizard_ConfigureDuress',
  Wizard_ConfigureDuressDesc: 'DigitalBurnbag_Wizard_ConfigureDuressDesc',
  Wizard_Authorize: 'DigitalBurnbag_Wizard_Authorize',
  Wizard_AuthorizeDesc: 'DigitalBurnbag_Wizard_AuthorizeDesc',
  Wizard_EnterApiKey: 'DigitalBurnbag_Wizard_EnterApiKey',
  Wizard_EnterApiKeyDesc: 'DigitalBurnbag_Wizard_EnterApiKeyDesc',
  Wizard_ConfigureWebhook: 'DigitalBurnbag_Wizard_ConfigureWebhook',
  Wizard_ConfigureWebhookDesc: 'DigitalBurnbag_Wizard_ConfigureWebhookDesc',
  Wizard_TestConnection: 'DigitalBurnbag_Wizard_TestConnection',
  Wizard_TestConnectionDesc: 'DigitalBurnbag_Wizard_TestConnectionDesc',
  Wizard_Complete: 'DigitalBurnbag_Wizard_Complete',
  Wizard_CompleteDesc: 'DigitalBurnbag_Wizard_CompleteDesc',

  // -- Absence Configuration --
  Absence_ThresholdLabel: 'DigitalBurnbag_Absence_ThresholdLabel',
  Absence_ThresholdHelp: 'DigitalBurnbag_Absence_ThresholdHelp',
  Absence_GracePeriodLabel: 'DigitalBurnbag_Absence_GracePeriodLabel',
  Absence_GracePeriodHelp: 'DigitalBurnbag_Absence_GracePeriodHelp',
  Absence_SendWarnings: 'DigitalBurnbag_Absence_SendWarnings',
  Absence_WarningDaysLabel: 'DigitalBurnbag_Absence_WarningDaysLabel',
  Absence_WarningDaysHelp: 'DigitalBurnbag_Absence_WarningDaysHelp',
  Absence_Days: 'DigitalBurnbag_Absence_Days',
  Absence_Hours: 'DigitalBurnbag_Absence_Hours',

  // -- Duress Configuration --
  Duress_EnableLabel: 'DigitalBurnbag_Duress_EnableLabel',
  Duress_EnableHelp: 'DigitalBurnbag_Duress_EnableHelp',
  Duress_KeywordsLabel: 'DigitalBurnbag_Duress_KeywordsLabel',
  Duress_KeywordsHelp: 'DigitalBurnbag_Duress_KeywordsHelp',
  Duress_PatternsLabel: 'DigitalBurnbag_Duress_PatternsLabel',
  Duress_PatternsHelp: 'DigitalBurnbag_Duress_PatternsHelp',

  // -- API Key Entry --
  ApiKey_Label: 'DigitalBurnbag_ApiKey_Label',
  ApiKey_Placeholder: 'DigitalBurnbag_ApiKey_Placeholder',
  ApiKey_Help: 'DigitalBurnbag_ApiKey_Help',
  ApiKey_WhereToFind: 'DigitalBurnbag_ApiKey_WhereToFind',

  // -- Webhook Configuration --
  Webhook_UrlLabel: 'DigitalBurnbag_Webhook_UrlLabel',
  Webhook_UrlHelp: 'DigitalBurnbag_Webhook_UrlHelp',
  Webhook_SecretLabel: 'DigitalBurnbag_Webhook_SecretLabel',
  Webhook_SecretHelp: 'DigitalBurnbag_Webhook_SecretHelp',
  Webhook_Instructions: 'DigitalBurnbag_Webhook_Instructions',
  Webhook_CopyUrl: 'DigitalBurnbag_Webhook_CopyUrl',
  Webhook_CopySecret: 'DigitalBurnbag_Webhook_CopySecret',
  Webhook_Copied: 'DigitalBurnbag_Webhook_Copied',

  // -- Connection Test --
  Test_Running: 'DigitalBurnbag_Test_Running',
  Test_Success: 'DigitalBurnbag_Test_Success',
  Test_Failed: 'DigitalBurnbag_Test_Failed',
  Test_ResponseTime: 'DigitalBurnbag_Test_ResponseTime',
  Test_UserInfo: 'DigitalBurnbag_Test_UserInfo',

  // -- OAuth Flow --
  OAuth_Redirecting: 'DigitalBurnbag_OAuth_Redirecting',
  OAuth_WaitingForAuth: 'DigitalBurnbag_OAuth_WaitingForAuth',
  OAuth_Success: 'DigitalBurnbag_OAuth_Success',
  OAuth_Failed: 'DigitalBurnbag_OAuth_Failed',
  OAuth_Cancelled: 'DigitalBurnbag_OAuth_Cancelled',

  // -- Connection Summary --
  Summary_Healthy: 'DigitalBurnbag_Summary_Healthy',
  Summary_Degraded: 'DigitalBurnbag_Summary_Degraded',
  Summary_Critical: 'DigitalBurnbag_Summary_Critical',
  Summary_None: 'DigitalBurnbag_Summary_None',
  Summary_ConnectedProviders: 'DigitalBurnbag_Summary_ConnectedProviders',
  Summary_NeedsAttention: 'DigitalBurnbag_Summary_NeedsAttention',
  Summary_LastHeartbeat: 'DigitalBurnbag_Summary_LastHeartbeat',

  // -- Provider Dashboard --
  Nav_Providers: 'DigitalBurnbag_Nav_Providers',
  Dashboard_Title: 'DigitalBurnbag_Dashboard_Title',
  Dashboard_HealthBanner: 'DigitalBurnbag_Dashboard_HealthBanner',
  Dashboard_SignalPresence: 'DigitalBurnbag_Dashboard_SignalPresence',
  Dashboard_SignalAbsence: 'DigitalBurnbag_Dashboard_SignalAbsence',
  Dashboard_SignalDuress: 'DigitalBurnbag_Dashboard_SignalDuress',
  Dashboard_SignalCheckFailed: 'DigitalBurnbag_Dashboard_SignalCheckFailed',
  Dashboard_SignalInconclusive: 'DigitalBurnbag_Dashboard_SignalInconclusive',
  Dashboard_TimeSinceActivity: 'DigitalBurnbag_Dashboard_TimeSinceActivity',

  // -- Provider Detail View --
  Detail_StatusHistory: 'DigitalBurnbag_Detail_StatusHistory',
  Detail_ConnectionSettings: 'DigitalBurnbag_Detail_ConnectionSettings',
  Detail_FilterBySignal: 'DigitalBurnbag_Detail_FilterBySignal',
  Detail_AllSignals: 'DigitalBurnbag_Detail_AllSignals',
  Detail_Timeline: 'DigitalBurnbag_Detail_Timeline',
  Detail_NoHistory: 'DigitalBurnbag_Detail_NoHistory',

  // -- Binding Assistant --
  Binding_BindToProvider: 'DigitalBurnbag_Binding_BindToProvider',
  Binding_SelectProvider: 'DigitalBurnbag_Binding_SelectProvider',
  Binding_Condition: 'DigitalBurnbag_Binding_Condition',
  Binding_Action: 'DigitalBurnbag_Binding_Action',
  Binding_Targets: 'DigitalBurnbag_Binding_Targets',
  Binding_Create: 'DigitalBurnbag_Binding_Create',
  Binding_ProviderNotConnected: 'DigitalBurnbag_Binding_ProviderNotConnected',
  Binding_FixConnection: 'DigitalBurnbag_Binding_FixConnection',
  Binding_DragHint: 'DigitalBurnbag_Binding_DragHint',

  // -- Custom Provider Form --
  CustomProvider_Title: 'DigitalBurnbag_CustomProvider_Title',
  CustomProvider_ImportJson: 'DigitalBurnbag_CustomProvider_ImportJson',
  CustomProvider_ExportJson: 'DigitalBurnbag_CustomProvider_ExportJson',
  CustomProvider_Name: 'DigitalBurnbag_CustomProvider_Name',
  CustomProvider_Description: 'DigitalBurnbag_CustomProvider_Description',
  CustomProvider_BaseUrl: 'DigitalBurnbag_CustomProvider_BaseUrl',
  CustomProvider_Category: 'DigitalBurnbag_CustomProvider_Category',
  CustomProvider_AuthType: 'DigitalBurnbag_CustomProvider_AuthType',
  CustomProvider_Endpoints: 'DigitalBurnbag_CustomProvider_Endpoints',
  CustomProvider_ResponseMapping:
    'DigitalBurnbag_CustomProvider_ResponseMapping',
  CustomProvider_Save: 'DigitalBurnbag_CustomProvider_Save',

  // -- Encryption & Access Indicators --
  Encryption_AES256: 'DigitalBurnbag_Encryption_AES256',
  Encryption_Encrypted: 'DigitalBurnbag_Encryption_Encrypted',
  Encryption_EncryptedTooltip: 'DigitalBurnbag_Encryption_EncryptedTooltip',
  Encryption_KeyWrapped: 'DigitalBurnbag_Encryption_KeyWrapped',
  Encryption_KeyWrappedTooltip: 'DigitalBurnbag_Encryption_KeyWrappedTooltip',
  Encryption_ApprovalProtected: 'DigitalBurnbag_Encryption_QuorumProtected',
  Encryption_ApprovalTooltip: 'DigitalBurnbag_Encryption_QuorumTooltip',
  Access_OnlyYou: 'DigitalBurnbag_Access_OnlyYou',
  Access_SharedWith: 'DigitalBurnbag_Access_SharedWith',
  Access_SharedWithCount: 'DigitalBurnbag_Access_SharedWithCount',
  Access_ViewAll: 'DigitalBurnbag_Access_ViewAll',
  Vault_EncryptionLabel: 'DigitalBurnbag_Vault_EncryptionLabel',
  Vault_AllEncrypted: 'DigitalBurnbag_Vault_AllEncrypted',
  Vault_AllEncryptedDesc: 'DigitalBurnbag_Vault_AllEncryptedDesc',
  FileBrowser_ColAccess: 'DigitalBurnbag_FileBrowser_ColAccess',
  FileBrowser_ColSecurity: 'DigitalBurnbag_FileBrowser_ColSecurity',

  // -- Friends Sharing --
  Friends_SectionTitle: 'DigitalBurnbag_Friends_SectionTitle',
  Friends_ShareWithAll: 'DigitalBurnbag_Friends_ShareWithAll',

  // -- Vault Visibility / Public Vaults --
  Vault_VisibilityLabel: 'DigitalBurnbag_Vault_VisibilityLabel',
  Vault_Visibility_Private: 'DigitalBurnbag_Vault_Visibility_Private',
  Vault_Visibility_PrivateDesc: 'DigitalBurnbag_Vault_Visibility_PrivateDesc',
  Vault_Visibility_Unlisted: 'DigitalBurnbag_Vault_Visibility_Unlisted',
  Vault_Visibility_UnlistedDesc: 'DigitalBurnbag_Vault_Visibility_UnlistedDesc',
  Vault_Visibility_Public: 'DigitalBurnbag_Vault_Visibility_Public',
  Vault_Visibility_PublicDesc: 'DigitalBurnbag_Vault_Visibility_PublicDesc',
  Vault_Public_PopularityLabel: 'DigitalBurnbag_Vault_Public_PopularityLabel',
  Vault_Public_ReplicationBonus: 'DigitalBurnbag_Vault_Public_ReplicationBonus',
  Vault_Public_ReplicationBonusDesc:
    'DigitalBurnbag_Vault_Public_ReplicationBonusDesc',
  Vault_Public_DiscoveryNote: 'DigitalBurnbag_Vault_Public_DiscoveryNote',
  File_Visibility_Override: 'DigitalBurnbag_File_Visibility_Override',
  File_Visibility_InheritedFrom: 'DigitalBurnbag_File_Visibility_InheritedFrom',
  ACL_PublicPrincipalLabel: 'DigitalBurnbag_ACL_PublicPrincipalLabel',
  ACL_PublicPrincipalDesc: 'DigitalBurnbag_ACL_PublicPrincipalDesc',

  // -- Joule Upload / Storage Cost --
  Joule_BurnDateTooltip: 'DigitalBurnbag_Joule_BurnDateTooltip',
  Joule_BurnDateChipLabel: 'DigitalBurnbag_Joule_BurnDateChipLabel',
  Joule_BurnDateActive: 'DigitalBurnbag_Joule_BurnDateActive',
  Joule_ExpiryReleaseNote: 'DigitalBurnbag_Joule_ExpiryReleaseNote',
  Joule_RsDisplayText: 'DigitalBurnbag_Joule_RsDisplayText',
  Joule_RsDisplayAriaLabel: 'DigitalBurnbag_Joule_RsDisplayAriaLabel',
  Joule_StorageCostPreviewRegion:
    'DigitalBurnbag_Joule_StorageCostPreviewRegion',
  Joule_UpfrontLabel: 'DigitalBurnbag_Joule_UpfrontLabel',
  Joule_UpfrontAriaLabel: 'DigitalBurnbag_Joule_UpfrontAriaLabel',
  Joule_DailyCharge: 'DigitalBurnbag_Joule_DailyCharge',
  Joule_DailyAriaLabel: 'DigitalBurnbag_Joule_DailyAriaLabel',
  Joule_DailyPerDay: 'DigitalBurnbag_Joule_DailyPerDay',
  Joule_InsufficientBalance: 'DigitalBurnbag_Joule_InsufficientBalance',
  Joule_UnableToCalculateCost: 'DigitalBurnbag_Joule_UnableToCalculateCost',
  Joule_StorageDurationTitle: 'DigitalBurnbag_Joule_StorageDurationTitle',
  Joule_DurationPresetsAriaLabel:
    'DigitalBurnbag_Joule_DurationPresetsAriaLabel',
  Joule_DurationPresetDays: 'DigitalBurnbag_Joule_DurationPresetDays',
  Joule_DurationPreset1Year: 'DigitalBurnbag_Joule_DurationPreset1Year',
  Joule_DurationPresetAriaLabel: 'DigitalBurnbag_Joule_DurationPresetAriaLabel',
  Joule_DurationCustomLabel: 'DigitalBurnbag_Joule_DurationCustomLabel',
  Joule_DurationCustomAriaLabel: 'DigitalBurnbag_Joule_DurationCustomAriaLabel',
  Joule_StorageTierTitle: 'DigitalBurnbag_Joule_StorageTierTitle',
  Joule_StorageTierAriaLabel: 'DigitalBurnbag_Joule_StorageTierAriaLabel',
  Joule_TierCostVsStandard: 'DigitalBurnbag_Joule_TierCostVsStandard',
  Joule_Tier_Performance: 'DigitalBurnbag_Joule_Tier_Performance',
  Joule_Tier_Standard: 'DigitalBurnbag_Joule_Tier_Standard',
  Joule_Tier_Archive: 'DigitalBurnbag_Joule_Tier_Archive',
  Joule_Tier_PendingBurn: 'DigitalBurnbag_Joule_Tier_PendingBurn',
  Joule_Tier_None: 'DigitalBurnbag_Joule_Tier_None',
  Joule_FormAriaLabel: 'DigitalBurnbag_Joule_FormAriaLabel',
  Joule_BurnDateCheckboxLabel: 'DigitalBurnbag_Joule_BurnDateCheckboxLabel',
  Joule_BurnDateCheckboxAriaLabel:
    'DigitalBurnbag_Joule_BurnDateCheckboxAriaLabel',
  Joule_ContinueButton: 'DigitalBurnbag_Joule_ContinueButton',
  Joule_ContinueButtonAriaLabel: 'DigitalBurnbag_Joule_ContinueButtonAriaLabel',
  Joule_InitUploadFailed: 'DigitalBurnbag_Joule_InitUploadFailed',
  Joule_ModalTitle: 'DigitalBurnbag_Joule_ModalTitle',
  Joule_LoadingAriaLabel: 'DigitalBurnbag_Joule_LoadingAriaLabel',
  Joule_QuoteExpired: 'DigitalBurnbag_Joule_QuoteExpired',
  Joule_ModalInsufficientBalance:
    'DigitalBurnbag_Joule_ModalInsufficientBalance',
  Joule_ErasureCodingLabel: 'DigitalBurnbag_Joule_ErasureCodingLabel',
  Joule_ErasureCodingValue: 'DigitalBurnbag_Joule_ErasureCodingValue',
  Joule_QuoteExpiresIn: 'DigitalBurnbag_Joule_QuoteExpiresIn',
  Joule_QuoteExpiresInAriaLabel: 'DigitalBurnbag_Joule_QuoteExpiresInAriaLabel',
  Joule_QuoteSeconds: 'DigitalBurnbag_Joule_QuoteSeconds',
  Joule_QuoteProgressAriaLabel: 'DigitalBurnbag_Joule_QuoteProgressAriaLabel',
  Joule_CancelButton: 'DigitalBurnbag_Joule_CancelButton',
  Joule_CancelButtonAriaLabel: 'DigitalBurnbag_Joule_CancelButtonAriaLabel',
  Joule_ConfirmButton: 'DigitalBurnbag_Joule_ConfirmButton',
  Joule_ConfirmButtonAriaLabel: 'DigitalBurnbag_Joule_ConfirmButtonAriaLabel',
  Joule_FetchQuoteFailed: 'DigitalBurnbag_Joule_FetchQuoteFailed',
  Joule_CommitFailed: 'DigitalBurnbag_Joule_CommitFailed',

  // -- API HTTP Status Labels --
  Api_Http_Ok: 'DigitalBurnbag_Api_Http_Ok',
  Api_Http_Unauthorized: 'DigitalBurnbag_Api_Http_Unauthorized',
  Api_Http_BadRequest: 'DigitalBurnbag_Api_Http_BadRequest',
  Api_Http_Forbidden: 'DigitalBurnbag_Api_Http_Forbidden',
  Api_Http_NotFound: 'DigitalBurnbag_Api_Http_NotFound',
  Api_Http_Conflict: 'DigitalBurnbag_Api_Http_Conflict',
  Api_Http_UnprocessableEntity: 'DigitalBurnbag_Api_Http_UnprocessableEntity',
  Api_Http_PaymentRequired: 'DigitalBurnbag_Api_Http_PaymentRequired',
  Api_Http_ServiceUnavailable: 'DigitalBurnbag_Api_Http_ServiceUnavailable',

  // -- API Authentication Errors --
  Api_Error_AuthMissing: 'DigitalBurnbag_Api_Error_AuthMissing',
  Api_Error_AuthenticationRequired:
    'DigitalBurnbag_Api_Error_AuthenticationRequired',
  Api_Error_InsufficientPermissions:
    'DigitalBurnbag_Api_Error_InsufficientPermissions',

  // -- API ID Validation Errors --
  Api_Error_InvalidContainerId: 'DigitalBurnbag_Api_Error_InvalidContainerId',
  Api_Error_InvalidFileId: 'DigitalBurnbag_Api_Error_InvalidFileId',
  Api_Error_InvalidVersionId: 'DigitalBurnbag_Api_Error_InvalidVersionId',
  Api_Error_InvalidFolderId: 'DigitalBurnbag_Api_Error_InvalidFolderId',
  Api_Error_InvalidParentFolderIdFormat:
    'DigitalBurnbag_Api_Error_InvalidParentFolderIdFormat',
  Api_Error_InvalidVaultContainerIdFormat:
    'DigitalBurnbag_Api_Error_InvalidVaultContainerIdFormat',
  Api_Error_InvalidShareLinkId: 'DigitalBurnbag_Api_Error_InvalidShareLinkId',
  Api_Error_InvalidSessionId: 'DigitalBurnbag_Api_Error_InvalidSessionId',
  Api_Error_InvalidTargetId: 'DigitalBurnbag_Api_Error_InvalidTargetId',
  Api_Error_InvalidPrincipalId: 'DigitalBurnbag_Api_Error_InvalidPrincipalId',
  Api_Error_InvalidItemId: 'DigitalBurnbag_Api_Error_InvalidItemId',
  Api_Error_InvalidConnectionId: 'DigitalBurnbag_Api_Error_InvalidConnectionId',
  Api_Error_InvalidConnectionIdTemplate:
    'DigitalBurnbag_Api_Error_InvalidConnectionIdTemplate',
  Api_Error_InvalidBindingId: 'DigitalBurnbag_Api_Error_InvalidBindingId',
  Api_Error_InvalidRecipientListId:
    'DigitalBurnbag_Api_Error_InvalidRecipientListId',
  Api_Error_InvalidRequestId: 'DigitalBurnbag_Api_Error_InvalidRequestId',
  Api_Error_InvalidProviderId: 'DigitalBurnbag_Api_Error_InvalidProviderId',

  // -- API Required Field Errors --
  Api_Error_NameRequired: 'DigitalBurnbag_Api_Error_NameRequired',
  Api_Error_ParentFolderIdRequired:
    'DigitalBurnbag_Api_Error_ParentFolderIdRequired',
  Api_Error_VaultContainerIdRequired:
    'DigitalBurnbag_Api_Error_VaultContainerIdRequired',
  Api_Error_NewParentIdRequired: 'DigitalBurnbag_Api_Error_NewParentIdRequired',
  Api_Error_InvalidNewParentIdFormat:
    'DigitalBurnbag_Api_Error_InvalidNewParentIdFormat',

  // -- API Not Found Errors --
  Api_Error_PathNotFound: 'DigitalBurnbag_Api_Error_PathNotFound',
  Api_Error_ConnectionNotFound: 'DigitalBurnbag_Api_Error_ConnectionNotFound',
  Api_Error_ConnectionNotFoundTemplate:
    'DigitalBurnbag_Api_Error_ConnectionNotFoundTemplate',
  Api_Error_ProviderNotFound: 'DigitalBurnbag_Api_Error_ProviderNotFound',
  Api_Error_FileNotFoundTemplate:
    'DigitalBurnbag_Api_Error_FileNotFoundTemplate',
  Api_Error_UploadSessionNotFound:
    'DigitalBurnbag_Api_Error_UploadSessionNotFound',
  Api_Error_ContractNotFoundTemplate:
    'DigitalBurnbag_Api_Error_ContractNotFoundTemplate',
  Api_Error_ResourceNotFound: 'DigitalBurnbag_Api_Error_ResourceNotFound',
  Api_Error_ResourceWithIdNotFound:
    'DigitalBurnbag_Api_Error_ResourceWithIdNotFound',

  // -- API Forbidden Errors --
  Api_Error_UploadSessionForbidden:
    'DigitalBurnbag_Api_Error_UploadSessionForbidden',
  Api_Error_ContractForbidden: 'DigitalBurnbag_Api_Error_ContractForbidden',

  // -- API Analytics Errors --
  Api_Error_SinceUntilRequired: 'DigitalBurnbag_Api_Error_SinceUntilRequired',
  Api_Error_InvalidDateRange: 'DigitalBurnbag_Api_Error_InvalidDateRange',
  Api_Error_ConnectionIdsRequired:
    'DigitalBurnbag_Api_Error_ConnectionIdsRequired',
  Api_Error_MaxConnectionsCompare:
    'DigitalBurnbag_Api_Error_MaxConnectionsCompare',
  Api_Error_InvalidExportFormat: 'DigitalBurnbag_Api_Error_InvalidExportFormat',

  // -- API Joule / Storage Economy Errors --
  Api_Error_JouleNotEnabled: 'DigitalBurnbag_Api_Error_JouleNotEnabled',
  Api_Error_JouleParamsMissing: 'DigitalBurnbag_Api_Error_JouleParamsMissing',
  Api_Error_JouleInvalidTier: 'DigitalBurnbag_Api_Error_JouleInvalidTier',
  Api_Error_JouleInvalidBytes: 'DigitalBurnbag_Api_Error_JouleInvalidBytes',
  Api_Error_JouleInvalidDays: 'DigitalBurnbag_Api_Error_JouleInvalidDays',
  Api_Error_JouleInvalidDaysMin: 'DigitalBurnbag_Api_Error_JouleInvalidDaysMin',
  Api_Error_JouleCalcFailed: 'DigitalBurnbag_Api_Error_JouleCalcFailed',
  Api_Error_InsufficientJoule: 'DigitalBurnbag_Api_Error_InsufficientJoule',
  Api_Error_DurabilityTierRequired:
    'DigitalBurnbag_Api_Error_DurabilityTierRequired',
  Api_Error_DurabilityTierInvalid:
    'DigitalBurnbag_Api_Error_DurabilityTierInvalid',
  Api_Error_DurationDaysInvalid: 'DigitalBurnbag_Api_Error_DurationDaysInvalid',

  // -- API Upload Errors --
  Api_Error_TotalSizeBytesInvalid:
    'DigitalBurnbag_Api_Error_TotalSizeBytesInvalid',
  Api_Error_TargetFolderIdMissing:
    'DigitalBurnbag_Api_Error_TargetFolderIdMissing',
  Api_Error_VaultContainerIdMissing:
    'DigitalBurnbag_Api_Error_VaultContainerIdMissing',
  Api_Error_FileIdMissing: 'DigitalBurnbag_Api_Error_FileIdMissing',
  Api_Error_MimeTypeMismatch: 'DigitalBurnbag_Api_Error_MimeTypeMismatch',
  Api_Error_UploadAlreadyQuoted: 'DigitalBurnbag_Api_Error_UploadAlreadyQuoted',
  Api_Error_UploadQuoteExpired: 'DigitalBurnbag_Api_Error_UploadQuoteExpired',

  // -- API Storage Contract Errors --
  Api_Error_AutoRenewOnly: 'DigitalBurnbag_Api_Error_AutoRenewOnly',
  Api_Error_AutoRenewMustBeBool: 'DigitalBurnbag_Api_Error_AutoRenewMustBeBool',

  // -- API Provider Errors & Success --
  Api_Error_FailurePolicyParamsMissing:
    'DigitalBurnbag_Api_Error_FailurePolicyParamsMissing',
  Api_Error_InvalidProviderConfig:
    'DigitalBurnbag_Api_Error_InvalidProviderConfig',
  Api_Ok_CustomProviderRegistered:
    'DigitalBurnbag_Api_Ok_CustomProviderRegistered',
  Api_Ok_ProviderConfigImported: 'DigitalBurnbag_Api_Ok_ProviderConfigImported',
  Api_Ok_FailurePolicyUpdated: 'DigitalBurnbag_Api_Ok_FailurePolicyUpdated',

  // -- API Upload Cost Estimator Validation --
  Api_Error_TotalSizeBytesPositiveInt:
    'DigitalBurnbag_Api_Error_TotalSizeBytesPositiveInt',
  Api_Error_DurabilityTierMustBeOneOf:
    'DigitalBurnbag_Api_Error_DurabilityTierMustBeOneOf',
  Api_Error_DurationDaysMustBeInt:
    'DigitalBurnbag_Api_Error_DurationDaysMustBeInt',
} as const;

export const DigitalBurnbagStrings: BrandedStringKeys<
  typeof _digitalBurnbagKeys
> = createI18nStringKeys(DigitalBurnbagComponentId, _digitalBurnbagKeys);

export type DigitalBurnbagStringKey = BrandedStringKeyValue<
  typeof DigitalBurnbagStrings
>;

export type DigitalBurnbagStringKeyValue = DigitalBurnbagStringKey;
