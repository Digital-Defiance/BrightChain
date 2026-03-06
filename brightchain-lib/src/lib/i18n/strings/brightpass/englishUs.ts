import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightPassStringKey,
  BrightPassStrings,
} from '../../../enumerations/brightPassStrings';

export const BrightPassAmericanEnglishStrings: ComponentStrings<BrightPassStringKey> =
  {
    // Menu
    [BrightPassStrings.Menu_BrightPass]: 'BrightPass',

    // Vault List
    [BrightPassStrings.VaultList_Title]: 'Vaults',
    [BrightPassStrings.VaultList_CreateVaultName]: 'Vault Name',
    [BrightPassStrings.VaultList_CreateVault]: 'Create Vault',
    [BrightPassStrings.VaultList_DeleteVault]: 'Delete Vault',
    [BrightPassStrings.VaultList_SharedWithTemplate]: 'Shared with {COUNT} members',
    [BrightPassStrings.VaultList_NoVaults]:
      'No vaults yet. Create one to get started.',

    // Vault Detail
    [BrightPassStrings.VaultDetail_TitleNameTemplate]: 'Vault: {NAME}',
    [BrightPassStrings.VaultDetail_AddEntry]: 'Add Entry',
    [BrightPassStrings.VaultDetail_LockVault]: 'Lock Vault',
    [BrightPassStrings.VaultDetail_Search]: 'Search entries…',
    [BrightPassStrings.VaultDetail_NoEntries]:
      'No entries yet. Add one to get started.',
    [BrightPassStrings.VaultDetail_Favorite]: 'Favorite',
    [BrightPassStrings.VaultDetail_ConfirmLockTitle]: 'Lock Vault?',
    [BrightPassStrings.VaultDetail_ConfirmLockMessage]:
      'You are navigating away. Would you like to lock the vault?',
    [BrightPassStrings.VaultDetail_Cancel]: 'Cancel',
    [BrightPassStrings.VaultDetail_Confirm]: 'Lock',

    // Entry Types
    [BrightPassStrings.EntryType_Login]: 'Login',
    [BrightPassStrings.EntryType_SecureNote]: 'Secure Note',
    [BrightPassStrings.EntryType_CreditCard]: 'Credit Card',
    [BrightPassStrings.EntryType_Identity]: 'Identity',

    // Password Generator
    [BrightPassStrings.PasswordGen_Title]: 'Password Generator',
    [BrightPassStrings.PasswordGen_Length]: 'Length',
    [BrightPassStrings.PasswordGen_Generate]: 'Generate',
    [BrightPassStrings.PasswordGen_Copy]: 'Copy',
    [BrightPassStrings.PasswordGen_UsePassword]: 'Use Password',
    [BrightPassStrings.PasswordGen_Strength_Weak]: 'Weak',
    [BrightPassStrings.PasswordGen_Strength_Fair]: 'Fair',
    [BrightPassStrings.PasswordGen_Strength_Strong]: 'Strong',
    [BrightPassStrings.PasswordGen_Strength_VeryStrong]: 'Very Strong',
    [BrightPassStrings.PasswordGen_Uppercase]: 'Uppercase',
    [BrightPassStrings.PasswordGen_Lowercase]: 'Lowercase',
    [BrightPassStrings.PasswordGen_Digits]: 'Digits',
    [BrightPassStrings.PasswordGen_Symbols]: 'Symbols',
    [BrightPassStrings.PasswordGen_Copied]: 'Copied!',
    [BrightPassStrings.PasswordGen_Entropy]: '{BITS} bits of entropy',

    // TOTP
    [BrightPassStrings.TOTP_Title]: 'TOTP Authenticator',
    [BrightPassStrings.TOTP_Code]: 'Current Code',
    [BrightPassStrings.TOTP_CopyCode]: 'Copy Code',
    [BrightPassStrings.TOTP_Copied]: 'Copied!',
    [BrightPassStrings.TOTP_SecondsRemainingTemplate]: '{SECONDS}s remaining',
    [BrightPassStrings.TOTP_QrCode]: 'QR Code',
    [BrightPassStrings.TOTP_SecretUri]: 'Secret URI',

    // Breach Check
    [BrightPassStrings.Breach_Title]: 'Breach Check',
    [BrightPassStrings.Breach_Check]: 'Check for Breaches',
    [BrightPassStrings.Breach_Password]: 'Password to check',
    [BrightPassStrings.Breach_FoundTemplate]:
      'This password was found in {COUNT} data breaches.',
    [BrightPassStrings.Breach_NotFound]:
      'This password has not been found in any known data breaches.',

    // Audit Log
    [BrightPassStrings.AuditLog_Title]: 'Audit Log',
    [BrightPassStrings.AuditLog_Timestamp]: 'Timestamp',
    [BrightPassStrings.AuditLog_Action]: 'Action',
    [BrightPassStrings.AuditLog_Member]: 'Member ID',
    [BrightPassStrings.AuditLog_FilterAll]: 'All Actions',
    [BrightPassStrings.AuditLog_NoEntries]: 'No audit log entries found.',
    [BrightPassStrings.AuditLog_Error]:
      'Failed to load audit log. Please try again.',

    // Breadcrumb Navigation
    [BrightPassStrings.Breadcrumb_BrightPass]: 'BrightPass',
    [BrightPassStrings.Breadcrumb_VaultTemplate]: 'Vault: {NAME}',
    [BrightPassStrings.Breadcrumb_AuditLog]: 'Audit Log',
    [BrightPassStrings.Breadcrumb_PasswordGenerator]: 'Password Generator',
    [BrightPassStrings.Breadcrumb_Tools]: 'Tools',

    // Vault List Dialogs
    [BrightPassStrings.VaultList_ConfirmDelete]: 'Delete Vault',
    [BrightPassStrings.VaultList_ConfirmDeleteMessageTemplate]:
      'Enter your master password to delete vault "{NAME}". This action cannot be undone.',
    [BrightPassStrings.VaultList_EnterMasterPassword]: 'Enter master password',
    [BrightPassStrings.VaultList_ConfirmMasterPassword]:
      'Confirm master password',
    [BrightPassStrings.VaultList_PasswordsMustMatch]:
      'Master password and confirmation must match.',
    [BrightPassStrings.VaultList_Cancel]: 'Cancel',
    [BrightPassStrings.VaultList_Confirm]: 'Confirm',
    [BrightPassStrings.VaultList_Unlock]: 'Unlock',
    [BrightPassStrings.VaultList_UnlockVault]: 'Unlock Vault',

    // Validation Messages
    [BrightPassStrings.Validation_VaultNameMinLengthTemplate]:
      'Vault name must be at least {MIN_LENGTH} characters',
    [BrightPassStrings.Validation_VaultNameMaxLengthTemplate]:
      'Vault name must be at most {MAX_LENGTH} characters',
    [BrightPassStrings.Validation_VaultNameRequired]: 'Vault name is required',
    [BrightPassStrings.Validation_PasswordMinLengthTemplate]:
      'Master password must be at least {MIN_LENGTH} characters',
    [BrightPassStrings.Validation_PasswordUppercase]:
      'Must contain at least one uppercase letter',
    [BrightPassStrings.Validation_PasswordLowercase]:
      'Must contain at least one lowercase letter',
    [BrightPassStrings.Validation_PasswordNumber]:
      'Must contain at least one number',
    [BrightPassStrings.Validation_PasswordSpecialChar]:
      'Must contain at least one special character',
    [BrightPassStrings.Validation_PasswordRequired]:
      'Master password is required',
    [BrightPassStrings.Validation_ConfirmPasswordRequired]:
      'Please confirm your master password',

    // Entry Detail
    [BrightPassStrings.EntryDetail_Title]: 'Entry Details',
    [BrightPassStrings.EntryDetail_Edit]: 'Edit',
    [BrightPassStrings.EntryDetail_Delete]: 'Delete',
    [BrightPassStrings.EntryDetail_ConfirmDelete]: 'Delete Entry',
    [BrightPassStrings.EntryDetail_ConfirmDeleteMessage]:
      'Are you sure you want to delete this entry? This action cannot be undone.',
    [BrightPassStrings.EntryDetail_Username]: 'Username',
    [BrightPassStrings.EntryDetail_Password]: 'Password',
    [BrightPassStrings.EntryDetail_SiteUrl]: 'Site URL',
    [BrightPassStrings.EntryDetail_TotpSecret]: 'TOTP Secret',
    [BrightPassStrings.EntryDetail_Content]: 'Content',
    [BrightPassStrings.EntryDetail_CardholderName]: 'Cardholder Name',
    [BrightPassStrings.EntryDetail_CardNumber]: 'Card Number',
    [BrightPassStrings.EntryDetail_ExpirationDate]: 'Expiration Date',
    [BrightPassStrings.EntryDetail_CVV]: 'CVV',
    [BrightPassStrings.EntryDetail_FirstName]: 'First Name',
    [BrightPassStrings.EntryDetail_LastName]: 'Last Name',
    [BrightPassStrings.EntryDetail_Email]: 'Email',
    [BrightPassStrings.EntryDetail_Phone]: 'Phone',
    [BrightPassStrings.EntryDetail_Address]: 'Address',
    [BrightPassStrings.EntryDetail_Notes]: 'Notes',
    [BrightPassStrings.EntryDetail_Tags]: 'Tags',
    [BrightPassStrings.EntryDetail_CreatedAt]: 'Created',
    [BrightPassStrings.EntryDetail_UpdatedAt]: 'Updated',
    [BrightPassStrings.EntryDetail_BreachWarningTemplate]:
      'This password was found in {COUNT} data breaches!',
    [BrightPassStrings.EntryDetail_BreachSafe]:
      'This password has not been found in any known data breaches.',
    [BrightPassStrings.EntryDetail_ShowPassword]: 'Show',
    [BrightPassStrings.EntryDetail_HidePassword]: 'Hide',
    [BrightPassStrings.EntryDetail_Cancel]: 'Cancel',

    // Entry Form
    [BrightPassStrings.EntryForm_Title_Create]: 'Create Entry',
    [BrightPassStrings.EntryForm_Title_Edit]: 'Edit Entry',
    [BrightPassStrings.EntryForm_FieldTitle]: 'Title',
    [BrightPassStrings.EntryForm_FieldNotes]: 'Notes',
    [BrightPassStrings.EntryForm_FieldTags]: 'Tags (comma-separated)',
    [BrightPassStrings.EntryForm_FieldFavorite]: 'Favorite',
    [BrightPassStrings.EntryForm_Save]: 'Save',
    [BrightPassStrings.EntryForm_Cancel]: 'Cancel',
    [BrightPassStrings.EntryForm_GeneratePassword]: 'Generate',
    [BrightPassStrings.EntryForm_TotpSecretHelp]:
      'Enter base32 secret or otpauth:// URI',

    // SearchBar
    [BrightPassStrings.SearchBar_Placeholder]:
      'Search by title, tags, or URL\u2026',
    [BrightPassStrings.SearchBar_FilterFavorites]: 'Favorites',
    [BrightPassStrings.SearchBar_NoResults]: 'No matching entries found',

    // Emergency Access Dialog
    [BrightPassStrings.Emergency_Title]: 'Emergency Access',
    [BrightPassStrings.Emergency_Configure]: 'Configure',
    [BrightPassStrings.Emergency_Recover]: 'Recover',
    [BrightPassStrings.Emergency_Threshold]:
      'Threshold (minimum trustees required)',
    [BrightPassStrings.Emergency_Trustees]:
      'Trustee member IDs (comma-separated)',
    [BrightPassStrings.Emergency_Shares]: 'Encrypted share {INDEX}',
    [BrightPassStrings.Emergency_InsufficientSharesTemplate]:
      'Insufficient shares. At least {THRESHOLD} shares are required.',
    [BrightPassStrings.Emergency_InvalidThreshold]:
      'Threshold must be between 1 and the number of trustees.',
    [BrightPassStrings.Emergency_Close]: 'Close',
    [BrightPassStrings.Emergency_Error]: 'An error occurred. Please try again.',
    [BrightPassStrings.Emergency_Success]: 'Operation completed successfully.',

    // Share Dialog
    [BrightPassStrings.Share_Title]: 'Share Vault',
    [BrightPassStrings.Share_SearchMembers]: 'Search members by name or email',
    [BrightPassStrings.Share_Add]: 'Add',
    [BrightPassStrings.Share_Revoke]: 'Revoke',
    [BrightPassStrings.Share_CurrentRecipients]: 'Current Recipients',
    [BrightPassStrings.Share_NoRecipients]:
      'This vault is not shared with anyone yet.',
    [BrightPassStrings.Share_Close]: 'Close',
    [BrightPassStrings.Share_Error]: 'An error occurred. Please try again.',

    // Import Dialog
    [BrightPassStrings.Import_Title]: 'Import Entries',
    [BrightPassStrings.Import_SelectFormat]: 'Select format',
    [BrightPassStrings.Import_Upload]: 'Upload file',
    [BrightPassStrings.Import_Import]: 'Import',
    [BrightPassStrings.Import_Close]: 'Close',
    [BrightPassStrings.Import_Summary]: 'Import Summary',
    [BrightPassStrings.Import_ImportedTemplate]:
      '{COUNT} entries imported successfully',
    [BrightPassStrings.Import_SkippedTemplate]: '{COUNT} entries skipped',
    [BrightPassStrings.Import_ErrorsTemplate]: 'Row {INDEX}: {MESSAGE}',
    [BrightPassStrings.Import_InvalidFormat]:
      'The uploaded file does not match the selected format.',
    [BrightPassStrings.Import_Error]:
      'An error occurred during import. Please try again.',

    // Errors
    [BrightPassStrings.Error_InvalidMasterPassword]: 'Invalid master password.',
    [BrightPassStrings.Error_VaultNotFound]: 'Vault not found.',
    [BrightPassStrings.Error_Unauthorized]:
      'You are not authorized to perform this action.',
    [BrightPassStrings.Error_Generic]:
      'An unexpected error occurred. Please try again.',
  };
