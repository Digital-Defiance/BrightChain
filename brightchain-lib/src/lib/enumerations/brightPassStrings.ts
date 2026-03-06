import {
  BrandedStringKeyValue,
  createI18nStringKeys,
} from '@digitaldefiance/i18n-lib';

export const BrightPassComponentId = 'BrightPass';

export const BrightPassStrings = createI18nStringKeys(BrightPassComponentId, {
  // Menu
  Menu_BrightPass: 'Menu_BrightPass',

  // Vault List
  VaultList_Title: 'VaultList_Title',
  VaultList_CreateVaultName: 'VaultList_CreateVaultName',
  VaultList_CreateVault: 'VaultList_CreateVault',
  VaultList_DeleteVault: 'VaultList_DeleteVault',
  VaultList_SharedWithTemplate: 'VaultList_SharedWithTemplate',
  VaultList_NoVaults: 'VaultList_NoVaults',

  // Vault Detail
  VaultDetail_TitleNameTemplate: 'VaultDetail_TitleNameTemplate',
  VaultDetail_AddEntry: 'VaultDetail_AddEntry',
  VaultDetail_LockVault: 'VaultDetail_LockVault',
  VaultDetail_Search: 'VaultDetail_Search',
  VaultDetail_NoEntries: 'VaultDetail_NoEntries',
  VaultDetail_Favorite: 'VaultDetail_Favorite',
  VaultDetail_ConfirmLockTitle: 'VaultDetail_ConfirmLockTitle',
  VaultDetail_ConfirmLockMessage: 'VaultDetail_ConfirmLockMessage',
  VaultDetail_Cancel: 'VaultDetail_Cancel',
  VaultDetail_Confirm: 'VaultDetail_Confirm',

  // Entry Types
  EntryType_Login: 'EntryType_Login',
  EntryType_SecureNote: 'EntryType_SecureNote',
  EntryType_CreditCard: 'EntryType_CreditCard',
  EntryType_Identity: 'EntryType_Identity',

  // Password Generator
  PasswordGen_Title: 'PasswordGen_Title',
  PasswordGen_Length: 'PasswordGen_Length',
  PasswordGen_Generate: 'PasswordGen_Generate',
  PasswordGen_Copy: 'PasswordGen_Copy',
  PasswordGen_UsePassword: 'PasswordGen_UsePassword',
  PasswordGen_Strength_Weak: 'PasswordGen_Strength_Weak',
  PasswordGen_Strength_Fair: 'PasswordGen_Strength_Fair',
  PasswordGen_Strength_Strong: 'PasswordGen_Strength_Strong',
  PasswordGen_Strength_VeryStrong: 'PasswordGen_Strength_VeryStrong',
  PasswordGen_Uppercase: 'PasswordGen_Uppercase',
  PasswordGen_Lowercase: 'PasswordGen_Lowercase',
  PasswordGen_Digits: 'PasswordGen_Digits',
  PasswordGen_Symbols: 'PasswordGen_Symbols',
  PasswordGen_Copied: 'PasswordGen_Copied',
  PasswordGen_Entropy: 'PasswordGen_Entropy',

  // TOTP
  TOTP_Title: 'TOTP_Title',
  TOTP_Code: 'TOTP_Code',
  TOTP_CopyCode: 'TOTP_CopyCode',
  TOTP_Copied: 'TOTP_Copied',
  TOTP_SecondsRemainingTemplate: 'TOTP_SecondsRemainingTemplate',
  TOTP_QrCode: 'TOTP_QrCode',
  TOTP_SecretUri: 'TOTP_SecretUri',

  // Breach Check
  Breach_Title: 'Breach_Title',
  Breach_Check: 'Breach_Check',
  Breach_Password: 'Breach_Password',
  Breach_FoundTemplate: 'Breach_FoundTemplate',
  Breach_NotFound: 'Breach_NotFound',

  // Audit Log
  AuditLog_Title: 'AuditLog_Title',
  AuditLog_Timestamp: 'AuditLog_Timestamp',
  AuditLog_Action: 'AuditLog_Action',
  AuditLog_Member: 'AuditLog_Member',
  AuditLog_FilterAll: 'AuditLog_FilterAll',
  AuditLog_NoEntries: 'AuditLog_NoEntries',
  AuditLog_Error: 'AuditLog_Error',

  // Breadcrumb Navigation
  Breadcrumb_BrightPass: 'Breadcrumb_BrightPass',
  Breadcrumb_VaultTemplate: 'Breadcrumb_VaultTemplate',
  Breadcrumb_AuditLog: 'Breadcrumb_AuditLog',
  Breadcrumb_PasswordGenerator: 'Breadcrumb_PasswordGenerator',
  Breadcrumb_Tools: 'Breadcrumb_Tools',

  // Vault List Dialogs
  VaultList_ConfirmDelete: 'VaultList_ConfirmDelete',
  VaultList_ConfirmDeleteMessageTemplate: 'VaultList_ConfirmDeleteMessageTemplate',
  VaultList_EnterMasterPassword: 'VaultList_EnterMasterPassword',
  VaultList_ConfirmMasterPassword: 'VaultList_ConfirmMasterPassword',
  VaultList_PasswordsMustMatch: 'VaultList_PasswordsMustMatch',
  VaultList_Cancel: 'VaultList_Cancel',
  VaultList_Confirm: 'VaultList_Confirm',
  VaultList_Unlock: 'VaultList_Unlock',
  VaultList_UnlockVault: 'VaultList_UnlockVault',

  // Validation Messages
  Validation_VaultNameMinLengthTemplate:
    'Validation_VaultNameMinLengthTemplate',
  Validation_VaultNameMaxLengthTemplate:
    'Validation_VaultNameMaxLengthTemplate',
  Validation_VaultNameRequired: 'Validation_VaultNameRequired',
  Validation_PasswordMinLengthTemplate: 'Validation_PasswordMinLengthTemplate',
  Validation_PasswordUppercase: 'Validation_PasswordUppercase',
  Validation_PasswordLowercase: 'Validation_PasswordLowercase',
  Validation_PasswordNumber: 'Validation_PasswordNumber',
  Validation_PasswordSpecialChar: 'Validation_PasswordSpecialChar',
  Validation_PasswordRequired: 'Validation_PasswordRequired',
  Validation_ConfirmPasswordRequired: 'Validation_ConfirmPasswordRequired',

  // Entry Detail
  EntryDetail_Title: 'EntryDetail_Title',
  EntryDetail_Edit: 'EntryDetail_Edit',
  EntryDetail_Delete: 'EntryDetail_Delete',
  EntryDetail_ConfirmDelete: 'EntryDetail_ConfirmDelete',
  EntryDetail_ConfirmDeleteMessage: 'EntryDetail_ConfirmDeleteMessage',
  EntryDetail_Username: 'EntryDetail_Username',
  EntryDetail_Password: 'EntryDetail_Password',
  EntryDetail_SiteUrl: 'EntryDetail_SiteUrl',
  EntryDetail_TotpSecret: 'EntryDetail_TotpSecret',
  EntryDetail_Content: 'EntryDetail_Content',
  EntryDetail_CardholderName: 'EntryDetail_CardholderName',
  EntryDetail_CardNumber: 'EntryDetail_CardNumber',
  EntryDetail_ExpirationDate: 'EntryDetail_ExpirationDate',
  EntryDetail_CVV: 'EntryDetail_CVV',
  EntryDetail_FirstName: 'EntryDetail_FirstName',
  EntryDetail_LastName: 'EntryDetail_LastName',
  EntryDetail_Email: 'EntryDetail_Email',
  EntryDetail_Phone: 'EntryDetail_Phone',
  EntryDetail_Address: 'EntryDetail_Address',
  EntryDetail_Notes: 'EntryDetail_Notes',
  EntryDetail_Tags: 'EntryDetail_Tags',
  EntryDetail_CreatedAt: 'EntryDetail_CreatedAt',
  EntryDetail_UpdatedAt: 'EntryDetail_UpdatedAt',
  EntryDetail_BreachWarningTemplate: 'EntryDetail_BreachWarningTemplate',
  EntryDetail_BreachSafe: 'EntryDetail_BreachSafe',
  EntryDetail_ShowPassword: 'EntryDetail_ShowPassword',
  EntryDetail_HidePassword: 'EntryDetail_HidePassword',
  EntryDetail_Cancel: 'EntryDetail_Cancel',

  // Entry Form
  EntryForm_Title_Create: 'EntryForm_Title_Create',
  EntryForm_Title_Edit: 'EntryForm_Title_Edit',
  EntryForm_FieldTitle: 'EntryForm_FieldTitle',
  EntryForm_FieldNotes: 'EntryForm_FieldNotes',
  EntryForm_FieldTags: 'EntryForm_FieldTags',
  EntryForm_FieldFavorite: 'EntryForm_FieldFavorite',
  EntryForm_Save: 'EntryForm_Save',
  EntryForm_Cancel: 'EntryForm_Cancel',
  EntryForm_GeneratePassword: 'EntryForm_GeneratePassword',
  EntryForm_TotpSecretHelp: 'EntryForm_TotpSecretHelp',

  // SearchBar
  SearchBar_Placeholder: 'SearchBar_Placeholder',
  SearchBar_FilterFavorites: 'SearchBar_FilterFavorites',
  SearchBar_NoResults: 'SearchBar_NoResults',

  // Emergency Access Dialog
  Emergency_Title: 'Emergency_Title',
  Emergency_Configure: 'Emergency_Configure',
  Emergency_Recover: 'Emergency_Recover',
  Emergency_Threshold: 'Emergency_Threshold',
  Emergency_Trustees: 'Emergency_Trustees',
  Emergency_Shares: 'Emergency_Shares',
  Emergency_InsufficientSharesTemplate: 'Emergency_InsufficientSharesTemplate',
  Emergency_InvalidThreshold: 'Emergency_InvalidThreshold',
  Emergency_Close: 'Emergency_Close',
  Emergency_Error: 'Emergency_Error',
  Emergency_Success: 'Emergency_Success',

  // Share Dialog
  Share_Title: 'Share_Title',
  Share_SearchMembers: 'Share_SearchMembers',
  Share_Add: 'Share_Add',
  Share_Revoke: 'Share_Revoke',
  Share_CurrentRecipients: 'Share_CurrentRecipients',
  Share_NoRecipients: 'Share_NoRecipients',
  Share_Close: 'Share_Close',
  Share_Error: 'Share_Error',

  // Import Dialog
  Import_Title: 'Import_Title',
  Import_SelectFormat: 'Import_SelectFormat',
  Import_Upload: 'Import_Upload',
  Import_Import: 'Import_Import',
  Import_Close: 'Import_Close',
  Import_Summary: 'Import_Summary',
  Import_ImportedTemplate: 'Import_ImportedTemplate',
  Import_SkippedTemplate: 'Import_SkippedTemplate',
  Import_ErrorsTemplate: 'Import_ErrorsTemplate',
  Import_InvalidFormat: 'Import_InvalidFormat',
  Import_Error: 'Import_Error',

  // Errors
  Error_InvalidMasterPassword: 'Error_InvalidMasterPassword',
  Error_VaultNotFound: 'Error_VaultNotFound',
  Error_Unauthorized: 'Error_Unauthorized',
  Error_Generic: 'Error_Generic',
} as const);

export type BrightPassStringKey = BrandedStringKeyValue<
  typeof BrightPassStrings
>;

export type BrightPassStringKeyValue = BrightPassStringKey;
