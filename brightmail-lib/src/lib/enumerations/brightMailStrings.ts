import {
  BrandedStringKeyValue,
  createI18nStringKeys,
} from '@digitaldefiance/i18n-lib';

export const BrightMailComponentId = 'BrightMail';

export const BrightMailStrings = createI18nStringKeys(BrightMailComponentId, {
  // Menu
  MenuLabel: 'MenuLabel',

  // Inbox
  Inbox_Title: 'Inbox_Title',
  Inbox_Empty: 'Inbox_Empty',
  Inbox_Error: 'Inbox_Error',
  Inbox_Retry: 'Inbox_Retry',
  Inbox_UnreadCountTemplate: 'Inbox_UnreadCountTemplate',

  // Compose
  Compose_Title: 'Compose_Title',
  Compose_To: 'Compose_To',
  Compose_Cc: 'Compose_Cc',
  Compose_Bcc: 'Compose_Bcc',
  Compose_Subject: 'Compose_Subject',
  Compose_Body: 'Compose_Body',
  Compose_Send: 'Compose_Send',
  Compose_SendSuccess: 'Compose_SendSuccess',
  Compose_SendError: 'Compose_SendError',
  Compose_InvalidRecipient: 'Compose_InvalidRecipient',
  Compose_Attachments: 'Compose_Attachments',
  Compose_ExternalRecipientsWarning: 'Compose_ExternalRecipientsWarning',
  Compose_ExternalRecipientsWarningTemplate:
    'Compose_ExternalRecipientsWarningTemplate',
  Compose_BounceWarningTitle: 'Compose_BounceWarningTitle',
  Compose_BounceWarningMessage: 'Compose_BounceWarningMessage',
  Compose_BounceWarningSendAnyway: 'Compose_BounceWarningSendAnyway',

  // Thread
  Thread_Error: 'Thread_Error',
  Thread_BackToInbox: 'Thread_BackToInbox',
  Thread_Reply: 'Thread_Reply',
  Thread_ReplyAll: 'Thread_ReplyAll',
  Thread_Forward: 'Thread_Forward',

  // Delete
  Delete_Confirm: 'Delete_Confirm',
  Delete_ConfirmBulkTemplate: 'Delete_ConfirmBulkTemplate',
  Delete_Success: 'Delete_Success',
  Delete_ErrorTemplate: 'Delete_ErrorTemplate',

  // Sidebar / Navigation
  Nav_Inbox: 'Nav_Inbox',
  Nav_Sent: 'Nav_Sent',
  Nav_Drafts: 'Nav_Drafts',
  Nav_Trash: 'Nav_Trash',
  Nav_Spam: 'Nav_Spam',
  Nav_Labels: 'Nav_Labels',
  Nav_Calendar: 'Nav_Calendar',
  Nav_Compose: 'Nav_Compose',
  Nav_MailFolders: 'Nav_MailFolders',

  // Actions
  Action_Delete: 'Action_Delete',
  Action_MarkAsRead: 'Action_MarkAsRead',
  Action_Cancel: 'Action_Cancel',
  Action_Discard: 'Action_Discard',
  Action_Submit: 'Action_Submit',
  Action_Generate: 'Action_Generate',
  Action_Search: 'Action_Search',
  Action_Import: 'Action_Import',

  // General
  Loading: 'Loading',
  NewMessage: 'NewMessage',
  DiscardDraftTitle: 'DiscardDraftTitle',
  DiscardDraftMessage: 'DiscardDraftMessage',

  // Attachment
  Attachment_AttachFiles: 'Attachment_AttachFiles',
  Attachment_FileSizeExceededTemplate: 'Attachment_FileSizeExceededTemplate',
  Attachment_TotalSizeExceeded: 'Attachment_TotalSizeExceeded',
  Attachment_RemoveTemplate: 'Attachment_RemoveTemplate',

  // Email List
  EmailList_SelectAll: 'EmailList_SelectAll',
  EmailList_AriaLabel: 'EmailList_AriaLabel',
  EmailList_SelectEmailTemplate: 'EmailList_SelectEmailTemplate',
  EmailList_Header_Sender: 'EmailList_Header_Sender',
  EmailList_Header_Subject: 'EmailList_Header_Subject',
  EmailList_Header_Date: 'EmailList_Header_Date',
  EmailList_Header_Status: 'EmailList_Header_Status',
  EmailList_Status_Read: 'EmailList_Status_Read',
  EmailList_Status_Unread: 'EmailList_Status_Unread',
  EmailList_Star: 'EmailList_Star',
  EmailList_Unstar: 'EmailList_Unstar',

  // Encryption
  Encryption_Label: 'Encryption_Label',
  Encryption_None: 'Encryption_None',
  Encryption_ECIES: 'Encryption_ECIES',
  Encryption_GPG: 'Encryption_GPG',
  Encryption_SMIME: 'Encryption_SMIME',
  Encryption_MissingKeysTemplate: 'Encryption_MissingKeysTemplate',
  Encryption_SmimeCertRequired: 'Encryption_SmimeCertRequired',
  Encryption_GpgKeyRequired: 'Encryption_GpgKeyRequired',
  Encryption_DefaultPreference: 'Encryption_DefaultPreference',
  Encryption_DefaultLabel: 'Encryption_DefaultLabel',

  // Key Management
  KeyMgmt_GpgKeypair: 'KeyMgmt_GpgKeypair',
  KeyMgmt_SmimeCertificate: 'KeyMgmt_SmimeCertificate',
  KeyMgmt_NoGpgKeypair: 'KeyMgmt_NoGpgKeypair',
  KeyMgmt_NoSmimeCert: 'KeyMgmt_NoSmimeCert',
  KeyMgmt_ExportPublicKey: 'KeyMgmt_ExportPublicKey',
  KeyMgmt_PublishToKeyserver: 'KeyMgmt_PublishToKeyserver',
  KeyMgmt_GenerateKeypair: 'KeyMgmt_GenerateKeypair',
  KeyMgmt_ImportPublicKey: 'KeyMgmt_ImportPublicKey',
  KeyMgmt_ReplaceKey: 'KeyMgmt_ReplaceKey',
  KeyMgmt_ImportByEmail: 'KeyMgmt_ImportByEmail',
  KeyMgmt_ImportCertPem: 'KeyMgmt_ImportCertPem',
  KeyMgmt_ReplaceCertificate: 'KeyMgmt_ReplaceCertificate',
  KeyMgmt_ImportPkcs12: 'KeyMgmt_ImportPkcs12',
  KeyMgmt_Passphrase: 'KeyMgmt_Passphrase',
  KeyMgmt_Pkcs12Password: 'KeyMgmt_Pkcs12Password',
  KeyMgmt_EmailAddress: 'KeyMgmt_EmailAddress',
  KeyMgmt_DeleteGpgKeypair: 'KeyMgmt_DeleteGpgKeypair',
  KeyMgmt_DeleteGpgPublicKey: 'KeyMgmt_DeleteGpgPublicKey',
  KeyMgmt_DeleteSmimeCert: 'KeyMgmt_DeleteSmimeCert',
  KeyMgmt_CertExpired: 'KeyMgmt_CertExpired',
  KeyMgmt_ErrorInvalidCert: 'KeyMgmt_ErrorInvalidCert',
  KeyMgmt_ErrorInvalidKey: 'KeyMgmt_ErrorInvalidKey',
  KeyMgmt_ErrorUploadCert: 'KeyMgmt_ErrorUploadCert',
  KeyMgmt_ErrorUploadKey: 'KeyMgmt_ErrorUploadKey',
  KeyMgmt_ErrorDeleteCert: 'KeyMgmt_ErrorDeleteCert',
  KeyMgmt_ErrorDeleteKey: 'KeyMgmt_ErrorDeleteKey',
  KeyMgmt_ErrorGenerateKeypair: 'KeyMgmt_ErrorGenerateKeypair',
  KeyMgmt_ErrorExportKey: 'KeyMgmt_ErrorExportKey',
  KeyMgmt_ErrorPublishKey: 'KeyMgmt_ErrorPublishKey',
  KeyMgmt_ErrorImportByEmail: 'KeyMgmt_ErrorImportByEmail',
  KeyMgmt_ErrorImportPkcs12: 'KeyMgmt_ErrorImportPkcs12',

  // Passphrase Dialog
  Passphrase_Title: 'Passphrase_Title',
  Passphrase_Label: 'Passphrase_Label',

  // Reading Pane
  ReadingPane_Placeholder: 'ReadingPane_Placeholder',

  // Recipient Chip Input
  Recipient_AddedOneTemplate: 'Recipient_AddedOneTemplate',
  Recipient_AddedManyTemplate: 'Recipient_AddedManyTemplate',
  Recipient_RemovedTemplate: 'Recipient_RemovedTemplate',
  Recipient_NotFoundTemplate: 'Recipient_NotFoundTemplate',

  // Rich Text Editor
  RichText_Placeholder: 'RichText_Placeholder',
  RichText_Bold: 'RichText_Bold',
  RichText_Italic: 'RichText_Italic',
  RichText_Underline: 'RichText_Underline',
  RichText_OrderedList: 'RichText_OrderedList',
  RichText_UnorderedList: 'RichText_UnorderedList',
  RichText_Link: 'RichText_Link',
  RichText_EnterUrl: 'RichText_EnterUrl',
  RichText_ToolbarLabel: 'RichText_ToolbarLabel',

  // Compose Modal
  ComposeModal_Restore: 'ComposeModal_Restore',
  ComposeModal_Minimize: 'ComposeModal_Minimize',
  ComposeModal_Maximize: 'ComposeModal_Maximize',
  ComposeModal_RestoreDown: 'ComposeModal_RestoreDown',
  ComposeModal_Close: 'ComposeModal_Close',

  // GPG Setup Wizard
  GpgWizard_Title: 'GpgWizard_Title',
  GpgWizard_WelcomeHeading: 'GpgWizard_WelcomeHeading',
  GpgWizard_WelcomeBody: 'GpgWizard_WelcomeBody',
  GpgWizard_EciesNote: 'GpgWizard_EciesNote',
  GpgWizard_OptionGenerate: 'GpgWizard_OptionGenerate',
  GpgWizard_OptionGenerateDesc: 'GpgWizard_OptionGenerateDesc',
  GpgWizard_OptionImport: 'GpgWizard_OptionImport',
  GpgWizard_OptionImportDesc: 'GpgWizard_OptionImportDesc',
  GpgWizard_GenerateHeading: 'GpgWizard_GenerateHeading',
  GpgWizard_GenerateBody: 'GpgWizard_GenerateBody',
  GpgWizard_PassphraseLabel: 'GpgWizard_PassphraseLabel',
  GpgWizard_PassphraseConfirmLabel: 'GpgWizard_PassphraseConfirmLabel',
  GpgWizard_PassphraseMismatch: 'GpgWizard_PassphraseMismatch',
  GpgWizard_PassphraseStrengthWeak: 'GpgWizard_PassphraseStrengthWeak',
  GpgWizard_PassphraseStrengthFair: 'GpgWizard_PassphraseStrengthFair',
  GpgWizard_PassphraseStrengthGood: 'GpgWizard_PassphraseStrengthGood',
  GpgWizard_PassphraseStrengthStrong: 'GpgWizard_PassphraseStrengthStrong',
  GpgWizard_GenerateButton: 'GpgWizard_GenerateButton',
  GpgWizard_Generating: 'GpgWizard_Generating',
  GpgWizard_ImportHeading: 'GpgWizard_ImportHeading',
  GpgWizard_ImportTabFile: 'GpgWizard_ImportTabFile',
  GpgWizard_ImportTabPaste: 'GpgWizard_ImportTabPaste',
  GpgWizard_ImportTabKeyserver: 'GpgWizard_ImportTabKeyserver',
  GpgWizard_ImportFilePrompt: 'GpgWizard_ImportFilePrompt',
  GpgWizard_ImportPasteLabel: 'GpgWizard_ImportPasteLabel',
  GpgWizard_ImportKeyserverLabel: 'GpgWizard_ImportKeyserverLabel',
  GpgWizard_ImportKeyserverHint: 'GpgWizard_ImportKeyserverHint',
  GpgWizard_ImportButton: 'GpgWizard_ImportButton',
  GpgWizard_Searching: 'GpgWizard_Searching',
  GpgWizard_SuccessHeading: 'GpgWizard_SuccessHeading',
  GpgWizard_SuccessBody: 'GpgWizard_SuccessBody',
  GpgWizard_SuccessFingerprint: 'GpgWizard_SuccessFingerprint',
  GpgWizard_PublishPrompt: 'GpgWizard_PublishPrompt',
  GpgWizard_PublishButton: 'GpgWizard_PublishButton',
  GpgWizard_SetDefaultPrompt: 'GpgWizard_SetDefaultPrompt',
  GpgWizard_SetDefaultButton: 'GpgWizard_SetDefaultButton',
  GpgWizard_Done: 'GpgWizard_Done',
  GpgWizard_Back: 'GpgWizard_Back',
  GpgWizard_Next: 'GpgWizard_Next',
  GpgWizard_ErrorGenerate: 'GpgWizard_ErrorGenerate',
  GpgWizard_ErrorImport: 'GpgWizard_ErrorImport',
  GpgWizard_ErrorPublish: 'GpgWizard_ErrorPublish',

  // ── Calendar Invite Card ──────────────────────────────────────────────────
  // Shown inside the ReadingPane when an email contains a text/calendar MIME
  // part (iTIP method REQUEST, CANCEL, UPDATE, REPLY, or COUNTER).

  CalInvite_Title: 'CalInvite_Title',
  CalInvite_Organizer: 'CalInvite_Organizer',
  CalInvite_WhenTemplate: 'CalInvite_WhenTemplate',
  CalInvite_AllDay: 'CalInvite_AllDay',
  CalInvite_Location: 'CalInvite_Location',
  CalInvite_Description: 'CalInvite_Description',
  CalInvite_AttendeesTemplate: 'CalInvite_AttendeesTemplate',
  CalInvite_Accept: 'CalInvite_Accept',
  CalInvite_Decline: 'CalInvite_Decline',
  CalInvite_Tentative: 'CalInvite_Tentative',
  CalInvite_AddToCalendar: 'CalInvite_AddToCalendar',
  CalInvite_ViewInCalendar: 'CalInvite_ViewInCalendar',
  CalInvite_AlreadyResponded: 'CalInvite_AlreadyResponded',
  CalInvite_ResponseTemplate: 'CalInvite_ResponseTemplate',
  CalInvite_Cancelled: 'CalInvite_Cancelled',
  CalInvite_CancelledBody: 'CalInvite_CancelledBody',
  CalInvite_Updated: 'CalInvite_Updated',
  CalInvite_UpdatedBody: 'CalInvite_UpdatedBody',
  CalInvite_Counter: 'CalInvite_Counter',
  CalInvite_CounterBody: 'CalInvite_CounterBody',
  CalInvite_ErrorRsvp: 'CalInvite_ErrorRsvp',
  CalInvite_ErrorImport: 'CalInvite_ErrorImport',
  CalInvite_SuccessAccepted: 'CalInvite_SuccessAccepted',
  CalInvite_SuccessDeclined: 'CalInvite_SuccessDeclined',
  CalInvite_SuccessTentative: 'CalInvite_SuccessTentative',
} as const);

export type BrightMailStringKey = BrandedStringKeyValue<
  typeof BrightMailStrings
>;

export type BrightMailStringKeyValue = BrightMailStringKey;
