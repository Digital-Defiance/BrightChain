import { RequiredBrandedStringsCollection } from '@digitaldefiance/i18n-lib';
import { BrightMailStrings } from '../../enumerations/brightMailStrings';

export const BrightMailAmericanEnglishStrings: RequiredBrandedStringsCollection<
  typeof BrightMailStrings
> = {
  // Menu
  [BrightMailStrings.MenuLabel]: 'BrightMail',

  // Inbox
  [BrightMailStrings.Inbox_Title]: 'Inbox',
  [BrightMailStrings.Inbox_Empty]: 'No emails yet',
  [BrightMailStrings.Inbox_Error]: 'Failed to load inbox',
  [BrightMailStrings.Inbox_Retry]: 'Retry',
  [BrightMailStrings.Inbox_UnreadCountTemplate]: '{COUNT} unread',

  // Compose
  [BrightMailStrings.Compose_Title]: 'Compose',
  [BrightMailStrings.Compose_To]: 'To',
  [BrightMailStrings.Compose_Cc]: 'Cc',
  [BrightMailStrings.Compose_Bcc]: 'Bcc',
  [BrightMailStrings.Compose_Subject]: 'Subject',
  [BrightMailStrings.Compose_Body]: 'Message',
  [BrightMailStrings.Compose_Send]: 'Send',
  [BrightMailStrings.Compose_SendSuccess]: 'Email sent successfully',
  [BrightMailStrings.Compose_SendError]: 'Failed to send email',
  [BrightMailStrings.Compose_InvalidRecipient]:
    'Please add at least one valid recipient',
  [BrightMailStrings.Compose_Attachments]: 'Attachments',
  [BrightMailStrings.Compose_ExternalRecipientsWarning]:
    'ECIES encryption is not available for external recipients. Sending is disabled while external addresses are present with encryption enabled.',
  [BrightMailStrings.Compose_ExternalRecipientsWarningTemplate]:
    'External recipients ({ADDRESSES}) are outside the local domain and cannot receive ECIES-encrypted messages.',
  [BrightMailStrings.Compose_BounceWarningTitle]: 'Unverified recipients',
  [BrightMailStrings.Compose_BounceWarningMessage]:
    'The following recipients could not be found and your message may bounce: {ADDRESSES}. Send anyway?',
  [BrightMailStrings.Compose_BounceWarningSendAnyway]: 'Send Anyway',

  // Thread
  [BrightMailStrings.Thread_Error]: 'Failed to load thread',
  [BrightMailStrings.Thread_BackToInbox]: 'Back to Inbox',
  [BrightMailStrings.Thread_Reply]: 'Reply',
  [BrightMailStrings.Thread_ReplyAll]: 'Reply All',
  [BrightMailStrings.Thread_Forward]: 'Forward',

  // Delete
  [BrightMailStrings.Delete_Confirm]: 'Are you sure you want to delete?',
  [BrightMailStrings.Delete_ConfirmBulkTemplate]:
    'Delete {COUNT} selected emails?',
  [BrightMailStrings.Delete_Success]: 'Email deleted',
  [BrightMailStrings.Delete_ErrorTemplate]:
    'Failed to delete email: {MESSAGE_ID}',

  // Sidebar / Navigation
  [BrightMailStrings.Nav_Inbox]: 'Inbox',
  [BrightMailStrings.Nav_Sent]: 'Sent',
  [BrightMailStrings.Nav_Drafts]: 'Drafts',
  [BrightMailStrings.Nav_Trash]: 'Trash',
  [BrightMailStrings.Nav_Spam]: 'Spam',
  [BrightMailStrings.Nav_Labels]: 'Labels',
  [BrightMailStrings.Nav_Calendar]: 'Calendar',
  [BrightMailStrings.Nav_Compose]: 'Compose',
  [BrightMailStrings.Nav_MailFolders]: 'Mail folders',

  // Actions
  [BrightMailStrings.Action_Delete]: 'Delete',
  [BrightMailStrings.Action_MarkAsRead]: 'Mark as Read',
  [BrightMailStrings.Action_Cancel]: 'Cancel',
  [BrightMailStrings.Action_Discard]: 'Discard',
  [BrightMailStrings.Action_Submit]: 'Submit',
  [BrightMailStrings.Action_Generate]: 'Generate',
  [BrightMailStrings.Action_Search]: 'Search',
  [BrightMailStrings.Action_Import]: 'Import',

  // General
  [BrightMailStrings.Loading]: 'Loading...',
  [BrightMailStrings.NewMessage]: 'New Message',
  [BrightMailStrings.DiscardDraftTitle]: 'Discard draft?',
  [BrightMailStrings.DiscardDraftMessage]:
    'Your message has unsaved content. Discard it?',

  // Attachment
  [BrightMailStrings.Attachment_AttachFiles]: 'Attach files',
  [BrightMailStrings.Attachment_FileSizeExceededTemplate]:
    'File "{FILENAME}" exceeds {LIMIT} limit',
  [BrightMailStrings.Attachment_TotalSizeExceeded]:
    'Total attachments exceed {LIMIT} limit',
  [BrightMailStrings.Attachment_RemoveTemplate]: 'Remove {FILENAME}',

  // Email List
  [BrightMailStrings.EmailList_SelectAll]: 'Select all emails',
  [BrightMailStrings.EmailList_AriaLabel]: 'Email list',
  [BrightMailStrings.EmailList_SelectEmailTemplate]:
    'Select email from {SENDER}',
  [BrightMailStrings.EmailList_Header_Sender]: 'Sender',
  [BrightMailStrings.EmailList_Header_Subject]: 'Subject',
  [BrightMailStrings.EmailList_Header_Date]: 'Date',
  [BrightMailStrings.EmailList_Header_Status]: 'Status',
  [BrightMailStrings.EmailList_Status_Read]: 'Read',
  [BrightMailStrings.EmailList_Status_Unread]: 'Unread',
  [BrightMailStrings.EmailList_Star]: 'Star',
  [BrightMailStrings.EmailList_Unstar]: 'Unstar',

  // Encryption
  [BrightMailStrings.Encryption_Label]: 'Encryption',
  [BrightMailStrings.Encryption_None]: 'No Encryption',
  [BrightMailStrings.Encryption_ECIES]: 'ECIES',
  [BrightMailStrings.Encryption_GPG]: 'GPG',
  [BrightMailStrings.Encryption_SMIME]: 'S/MIME',
  [BrightMailStrings.Encryption_MissingKeysTemplate]:
    'The following recipients lack public keys: {RECIPIENTS}',
  [BrightMailStrings.Encryption_SmimeCertRequired]:
    'S/MIME signing requires a configured certificate in Settings',
  [BrightMailStrings.Encryption_GpgKeyRequired]:
    'GPG signing requires a configured keypair in Settings',
  [BrightMailStrings.Encryption_DefaultPreference]:
    'Default Encryption Preference',
  [BrightMailStrings.Encryption_DefaultLabel]: 'Default Encryption',

  // Key Management
  [BrightMailStrings.KeyMgmt_GpgKeypair]: 'GPG Keypair',
  [BrightMailStrings.KeyMgmt_SmimeCertificate]: 'S/MIME Certificate',
  [BrightMailStrings.KeyMgmt_NoGpgKeypair]:
    'No GPG keypair configured. Generate a new keypair or import a public key.',
  [BrightMailStrings.KeyMgmt_NoSmimeCert]:
    'No S/MIME certificate configured. Import a certificate to enable S/MIME encryption.',
  [BrightMailStrings.KeyMgmt_ExportPublicKey]: 'Export Public Key',
  [BrightMailStrings.KeyMgmt_PublishToKeyserver]: 'Publish to Keyserver',
  [BrightMailStrings.KeyMgmt_GenerateKeypair]: 'Generate Keypair',
  [BrightMailStrings.KeyMgmt_ImportPublicKey]: 'Import Public Key',
  [BrightMailStrings.KeyMgmt_ReplaceKey]: 'Replace Key',
  [BrightMailStrings.KeyMgmt_ImportByEmail]: 'Import by Email',
  [BrightMailStrings.KeyMgmt_ImportCertPem]: 'Import Certificate (PEM)',
  [BrightMailStrings.KeyMgmt_ReplaceCertificate]: 'Replace Certificate',
  [BrightMailStrings.KeyMgmt_ImportPkcs12]: 'Import PKCS#12',
  [BrightMailStrings.KeyMgmt_Passphrase]: 'Passphrase',
  [BrightMailStrings.KeyMgmt_Pkcs12Password]: 'PKCS#12 Password',
  [BrightMailStrings.KeyMgmt_EmailAddress]: 'Email address',
  [BrightMailStrings.KeyMgmt_DeleteGpgKeypair]: 'Delete GPG keypair',
  [BrightMailStrings.KeyMgmt_DeleteGpgPublicKey]: 'Delete GPG public key',
  [BrightMailStrings.KeyMgmt_DeleteSmimeCert]: 'Delete S/MIME certificate',
  [BrightMailStrings.KeyMgmt_CertExpired]: 'This certificate has expired',
  [BrightMailStrings.KeyMgmt_ErrorInvalidCert]:
    'Invalid X.509 certificate file',
  [BrightMailStrings.KeyMgmt_ErrorInvalidKey]: 'Invalid PGP public key file',
  [BrightMailStrings.KeyMgmt_ErrorUploadCert]: 'Failed to upload certificate',
  [BrightMailStrings.KeyMgmt_ErrorUploadKey]: 'Failed to upload key',
  [BrightMailStrings.KeyMgmt_ErrorDeleteCert]: 'Failed to delete certificate',
  [BrightMailStrings.KeyMgmt_ErrorDeleteKey]: 'Failed to delete key',
  [BrightMailStrings.KeyMgmt_ErrorGenerateKeypair]:
    'Failed to generate GPG keypair',
  [BrightMailStrings.KeyMgmt_ErrorExportKey]: 'Failed to export GPG public key',
  [BrightMailStrings.KeyMgmt_ErrorPublishKey]:
    'Failed to publish GPG key to keyserver',
  [BrightMailStrings.KeyMgmt_ErrorImportByEmail]:
    'Failed to import GPG key by email',
  [BrightMailStrings.KeyMgmt_ErrorImportPkcs12]:
    'Failed to import PKCS#12 certificate',

  // Passphrase Dialog
  [BrightMailStrings.Passphrase_Title]: 'Enter GPG Passphrase',
  [BrightMailStrings.Passphrase_Label]: 'Passphrase',

  // Reading Pane
  [BrightMailStrings.ReadingPane_Placeholder]: 'Select an email to read',

  // Recipient Chip Input
  [BrightMailStrings.Recipient_AddedOneTemplate]: 'Added recipient: {EMAIL}',
  [BrightMailStrings.Recipient_AddedManyTemplate]: 'Added recipients: {EMAILS}',
  [BrightMailStrings.Recipient_RemovedTemplate]: 'Removed recipient: {EMAIL}',
  [BrightMailStrings.Recipient_NotFoundTemplate]:
    '{LOCAL} not found at {DOMAIN}',

  // Rich Text Editor
  [BrightMailStrings.RichText_Placeholder]: 'Compose your message...',
  [BrightMailStrings.RichText_Bold]: 'Bold',
  [BrightMailStrings.RichText_Italic]: 'Italic',
  [BrightMailStrings.RichText_Underline]: 'Underline',
  [BrightMailStrings.RichText_OrderedList]: 'Ordered List',
  [BrightMailStrings.RichText_UnorderedList]: 'Unordered List',
  [BrightMailStrings.RichText_Link]: 'Link',
  [BrightMailStrings.RichText_EnterUrl]: 'Enter URL:',
  [BrightMailStrings.RichText_ToolbarLabel]: 'Text formatting',

  // Compose Modal
  [BrightMailStrings.ComposeModal_Restore]: 'Restore compose',
  [BrightMailStrings.ComposeModal_Minimize]: 'Minimize compose',
  [BrightMailStrings.ComposeModal_Maximize]: 'Maximize compose',
  [BrightMailStrings.ComposeModal_RestoreDown]: 'Restore compose size',
  [BrightMailStrings.ComposeModal_Close]: 'Close compose',

  // GPG Setup Wizard
  [BrightMailStrings.GpgWizard_Title]: 'Set Up GPG Encryption',
  [BrightMailStrings.GpgWizard_WelcomeHeading]: 'Secure your email with GPG',
  [BrightMailStrings.GpgWizard_WelcomeBody]:
    'GPG (GNU Privacy Guard) lets you encrypt and sign emails so only the intended recipient can read them. It takes less than a minute to set up.',
  [BrightMailStrings.GpgWizard_EciesNote]:
    'BrightChain members also get ECIES encryption automatically for messages within the network.',
  [BrightMailStrings.GpgWizard_OptionGenerate]: 'Create a new keypair',
  [BrightMailStrings.GpgWizard_OptionGenerateDesc]:
    'Recommended. We generate a secure keypair for you.',
  [BrightMailStrings.GpgWizard_OptionImport]: 'I already have a GPG key',
  [BrightMailStrings.GpgWizard_OptionImportDesc]:
    'Import an existing public key from a file, clipboard, or keyserver.',
  [BrightMailStrings.GpgWizard_GenerateHeading]: 'Choose a passphrase',
  [BrightMailStrings.GpgWizard_GenerateBody]:
    'Your passphrase protects your private key. Pick something memorable but hard to guess.',
  [BrightMailStrings.GpgWizard_PassphraseLabel]: 'Passphrase',
  [BrightMailStrings.GpgWizard_PassphraseConfirmLabel]: 'Confirm passphrase',
  [BrightMailStrings.GpgWizard_PassphraseMismatch]: 'Passphrases do not match',
  [BrightMailStrings.GpgWizard_PassphraseStrengthWeak]: 'Weak',
  [BrightMailStrings.GpgWizard_PassphraseStrengthFair]: 'Fair',
  [BrightMailStrings.GpgWizard_PassphraseStrengthGood]: 'Good',
  [BrightMailStrings.GpgWizard_PassphraseStrengthStrong]: 'Strong',
  [BrightMailStrings.GpgWizard_GenerateButton]: 'Generate My Keys',
  [BrightMailStrings.GpgWizard_Generating]: 'Generating your keypair…',
  [BrightMailStrings.GpgWizard_ImportHeading]: 'Import your GPG key',
  [BrightMailStrings.GpgWizard_ImportTabFile]: 'Upload file',
  [BrightMailStrings.GpgWizard_ImportTabPaste]: 'Paste key',
  [BrightMailStrings.GpgWizard_ImportTabKeyserver]: 'Search keyserver',
  [BrightMailStrings.GpgWizard_ImportFilePrompt]:
    'Select a .asc, .gpg, or .pub file',
  [BrightMailStrings.GpgWizard_ImportPasteLabel]:
    'Paste your ASCII-armored public key',
  [BrightMailStrings.GpgWizard_ImportKeyserverLabel]: 'Email address',
  [BrightMailStrings.GpgWizard_ImportKeyserverHint]:
    'We will search public keyservers for a key matching this email.',
  [BrightMailStrings.GpgWizard_ImportButton]: 'Import Key',
  [BrightMailStrings.GpgWizard_Searching]: 'Searching keyservers…',
  [BrightMailStrings.GpgWizard_SuccessHeading]: 'You are all set!',
  [BrightMailStrings.GpgWizard_SuccessBody]:
    'Your GPG key is ready. You can now send and receive GPG-encrypted email.',
  [BrightMailStrings.GpgWizard_SuccessFingerprint]: 'Key fingerprint',
  [BrightMailStrings.GpgWizard_PublishPrompt]:
    'Publish your public key so others can find it and send you encrypted mail.',
  [BrightMailStrings.GpgWizard_PublishButton]: 'Publish to Keyserver',
  [BrightMailStrings.GpgWizard_SetDefaultPrompt]:
    'Make GPG your default encryption for new messages?',
  [BrightMailStrings.GpgWizard_SetDefaultButton]: 'Set GPG as Default',
  [BrightMailStrings.GpgWizard_Done]: 'Done',
  [BrightMailStrings.GpgWizard_Back]: 'Back',
  [BrightMailStrings.GpgWizard_Next]: 'Next',
  [BrightMailStrings.GpgWizard_ErrorGenerate]:
    'Failed to generate keypair. Please try again.',
  [BrightMailStrings.GpgWizard_ErrorImport]:
    'Failed to import key. Check the file or key data and try again.',
  [BrightMailStrings.GpgWizard_ErrorPublish]:
    'Failed to publish key to keyserver.',

  // Calendar Invite Card
  [BrightMailStrings.CalInvite_Title]: 'Calendar Invitation',
  [BrightMailStrings.CalInvite_Organizer]: 'Organizer',
  [BrightMailStrings.CalInvite_WhenTemplate]: '{START} – {END}',
  [BrightMailStrings.CalInvite_AllDay]: 'All Day',
  [BrightMailStrings.CalInvite_Location]: 'Location',
  [BrightMailStrings.CalInvite_Description]: 'Description',
  [BrightMailStrings.CalInvite_AttendeesTemplate]: '{COUNT} attendee(s)',
  [BrightMailStrings.CalInvite_Accept]: 'Accept',
  [BrightMailStrings.CalInvite_Decline]: 'Decline',
  [BrightMailStrings.CalInvite_Tentative]: 'Tentative',
  [BrightMailStrings.CalInvite_AddToCalendar]: 'Add to Calendar',
  [BrightMailStrings.CalInvite_ViewInCalendar]: 'View in Calendar',
  [BrightMailStrings.CalInvite_AlreadyResponded]: 'You have already responded',
  [BrightMailStrings.CalInvite_ResponseTemplate]: 'You responded: {RESPONSE}',
  [BrightMailStrings.CalInvite_Cancelled]: 'Event Cancelled',
  [BrightMailStrings.CalInvite_CancelledBody]:
    'The organizer has cancelled this event.',
  [BrightMailStrings.CalInvite_Updated]: 'Event Updated',
  [BrightMailStrings.CalInvite_UpdatedBody]:
    'The organizer has updated this event.',
  [BrightMailStrings.CalInvite_Counter]: 'Counter Proposal',
  [BrightMailStrings.CalInvite_CounterBody]:
    'An attendee has proposed a new time.',
  [BrightMailStrings.CalInvite_ErrorRsvp]: 'Failed to send RSVP',
  [BrightMailStrings.CalInvite_ErrorImport]:
    'Failed to import event to calendar',
  [BrightMailStrings.CalInvite_SuccessAccepted]: 'Invitation accepted',
  [BrightMailStrings.CalInvite_SuccessDeclined]: 'Invitation declined',
  [BrightMailStrings.CalInvite_SuccessTentative]:
    'Invitation tentatively accepted',
};
