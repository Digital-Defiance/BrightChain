import { RequiredBrandedStringsCollection } from '@digitaldefiance/i18n-lib';
import { BrightMailStrings } from '../../enumerations/brightMailStrings';

export const BrightMailGermanStrings: RequiredBrandedStringsCollection<
  typeof BrightMailStrings
> = {
  // Menu
  [BrightMailStrings.MenuLabel]: 'BrightMail',

  // Inbox
  [BrightMailStrings.Inbox_Title]: 'Posteingang',
  [BrightMailStrings.Inbox_Empty]: 'Noch keine E-Mails',
  [BrightMailStrings.Inbox_Error]: 'Posteingang konnte nicht geladen werden',
  [BrightMailStrings.Inbox_Retry]: 'Erneut versuchen',
  [BrightMailStrings.Inbox_UnreadCountTemplate]: '{COUNT} ungelesen',

  // Compose
  [BrightMailStrings.Compose_Title]: 'Verfassen',
  [BrightMailStrings.Compose_To]: 'An',
  [BrightMailStrings.Compose_Cc]: 'Cc',
  [BrightMailStrings.Compose_Bcc]: 'Bcc',
  [BrightMailStrings.Compose_Subject]: 'Betreff',
  [BrightMailStrings.Compose_Body]: 'Nachricht',
  [BrightMailStrings.Compose_Send]: 'Senden',
  [BrightMailStrings.Compose_SendSuccess]: 'E-Mail erfolgreich gesendet',
  [BrightMailStrings.Compose_SendError]: 'E-Mail konnte nicht gesendet werden',
  [BrightMailStrings.Compose_InvalidRecipient]:
    'Bitte fügen Sie mindestens einen gültigen Empfänger hinzu',
  [BrightMailStrings.Compose_Attachments]: 'Anhänge',
  [BrightMailStrings.Compose_ExternalRecipientsWarning]:
    'ECIES-Verschlüsselung ist für externe Empfänger nicht verfügbar. Das Senden ist deaktiviert, solange externe Adressen bei aktivierter Verschlüsselung vorhanden sind.',
  [BrightMailStrings.Compose_ExternalRecipientsWarningTemplate]:
    'Externe Empfänger ({ADDRESSES}) befinden sich außerhalb der lokalen Domäne und können keine ECIES-verschlüsselten Nachrichten empfangen.',
  [BrightMailStrings.Compose_BounceWarningTitle]:
    'Nicht verifizierte Empfänger',
  [BrightMailStrings.Compose_BounceWarningMessage]:
    'Die folgenden Empfänger konnten nicht gefunden werden und Ihre Nachricht könnte zurückgewiesen werden: {ADDRESSES}. Trotzdem senden?',
  [BrightMailStrings.Compose_BounceWarningSendAnyway]: 'Trotzdem senden',

  // Thread
  [BrightMailStrings.Thread_Error]: 'Thread konnte nicht geladen werden',
  [BrightMailStrings.Thread_BackToInbox]: 'Zurück zum Posteingang',
  [BrightMailStrings.Thread_Reply]: 'Antworten',
  [BrightMailStrings.Thread_ReplyAll]: 'Allen antworten',
  [BrightMailStrings.Thread_Forward]: 'Weiterleiten',

  // Delete
  [BrightMailStrings.Delete_Confirm]:
    'Sind Sie sicher, dass Sie löschen möchten?',
  [BrightMailStrings.Delete_ConfirmBulkTemplate]:
    '{COUNT} ausgewählte E-Mails löschen?',
  [BrightMailStrings.Delete_Success]: 'E-Mail gelöscht',
  [BrightMailStrings.Delete_ErrorTemplate]:
    'E-Mail konnte nicht gelöscht werden: {MESSAGE_ID}',

  // Sidebar / Navigation
  [BrightMailStrings.Nav_Inbox]: 'Posteingang',
  [BrightMailStrings.Nav_Sent]: 'Gesendet',
  [BrightMailStrings.Nav_Drafts]: 'Entwürfe',
  [BrightMailStrings.Nav_Trash]: 'Papierkorb',
  [BrightMailStrings.Nav_Spam]: 'Spam',
  [BrightMailStrings.Nav_Labels]: 'Labels',
  [BrightMailStrings.Nav_Calendar]: 'Kalender',
  [BrightMailStrings.Nav_Compose]: 'Verfassen',
  [BrightMailStrings.Nav_MailFolders]: 'E-Mail-Ordner',

  // Actions
  [BrightMailStrings.Action_Delete]: 'Löschen',
  [BrightMailStrings.Action_MarkAsRead]: 'Als gelesen markieren',
  [BrightMailStrings.Action_Cancel]: 'Abbrechen',
  [BrightMailStrings.Action_Discard]: 'Verwerfen',
  [BrightMailStrings.Action_Submit]: 'Absenden',
  [BrightMailStrings.Action_Generate]: 'Generieren',
  [BrightMailStrings.Action_Search]: 'Suchen',
  [BrightMailStrings.Action_Import]: 'Importieren',

  // General
  [BrightMailStrings.Loading]: 'Wird geladen...',
  [BrightMailStrings.NewMessage]: 'Neue Nachricht',
  [BrightMailStrings.DiscardDraftTitle]: 'Entwurf verwerfen?',
  [BrightMailStrings.DiscardDraftMessage]:
    'Ihre Nachricht enthält nicht gespeicherte Inhalte. Verwerfen?',

  // Attachment
  [BrightMailStrings.Attachment_AttachFiles]: 'Dateien anhängen',
  [BrightMailStrings.Attachment_FileSizeExceededTemplate]:
    'Datei „{FILENAME}" überschreitet das Limit von {LIMIT}',
  [BrightMailStrings.Attachment_TotalSizeExceeded]:
    'Gesamtgröße der Anhänge überschreitet das Limit von {LIMIT}',
  [BrightMailStrings.Attachment_RemoveTemplate]: '{FILENAME} entfernen',

  // Email List
  [BrightMailStrings.EmailList_SelectAll]: 'Alle E-Mails auswählen',
  [BrightMailStrings.EmailList_AriaLabel]: 'E-Mail-Liste',
  [BrightMailStrings.EmailList_SelectEmailTemplate]:
    'E-Mail von {SENDER} auswählen',
  [BrightMailStrings.EmailList_Header_Sender]: 'Absender',
  [BrightMailStrings.EmailList_Header_Subject]: 'Betreff',
  [BrightMailStrings.EmailList_Header_Date]: 'Datum',
  [BrightMailStrings.EmailList_Header_Status]: 'Status',
  [BrightMailStrings.EmailList_Status_Read]: 'Gelesen',
  [BrightMailStrings.EmailList_Status_Unread]: 'Ungelesen',
  [BrightMailStrings.EmailList_Star]: 'Markieren',
  [BrightMailStrings.EmailList_Unstar]: 'Markierung aufheben',

  // Encryption
  [BrightMailStrings.Encryption_Label]: 'Verschlüsselung',
  [BrightMailStrings.Encryption_None]: 'Keine Verschlüsselung',
  [BrightMailStrings.Encryption_ECIES]: 'ECIES',
  [BrightMailStrings.Encryption_GPG]: 'GPG',
  [BrightMailStrings.Encryption_SMIME]: 'S/MIME',
  [BrightMailStrings.Encryption_MissingKeysTemplate]:
    'Den folgenden Empfängern fehlen öffentliche Schlüssel: {RECIPIENTS}',
  [BrightMailStrings.Encryption_SmimeCertRequired]:
    'S/MIME-Signierung erfordert ein konfiguriertes Zertifikat in den Einstellungen',
  [BrightMailStrings.Encryption_GpgKeyRequired]:
    'GPG-Signierung erfordert ein konfiguriertes Schlüsselpaar in den Einstellungen',
  [BrightMailStrings.Encryption_DefaultPreference]:
    'Standard-Verschlüsselungspräferenz',
  [BrightMailStrings.Encryption_DefaultLabel]: 'Standardverschlüsselung',

  // Key Management
  [BrightMailStrings.KeyMgmt_GpgKeypair]: 'GPG-Schlüsselpaar',
  [BrightMailStrings.KeyMgmt_SmimeCertificate]: 'S/MIME-Zertifikat',
  [BrightMailStrings.KeyMgmt_NoGpgKeypair]:
    'Kein GPG-Schlüsselpaar konfiguriert. Generieren Sie ein neues Schlüsselpaar oder importieren Sie einen öffentlichen Schlüssel.',
  [BrightMailStrings.KeyMgmt_NoSmimeCert]:
    'Kein S/MIME-Zertifikat konfiguriert. Importieren Sie ein Zertifikat, um S/MIME-Verschlüsselung zu aktivieren.',
  [BrightMailStrings.KeyMgmt_ExportPublicKey]:
    'Öffentlichen Schlüssel exportieren',
  [BrightMailStrings.KeyMgmt_PublishToKeyserver]:
    'Auf Schlüsselserver veröffentlichen',
  [BrightMailStrings.KeyMgmt_GenerateKeypair]: 'Schlüsselpaar generieren',
  [BrightMailStrings.KeyMgmt_ImportPublicKey]:
    'Öffentlichen Schlüssel importieren',
  [BrightMailStrings.KeyMgmt_ReplaceKey]: 'Schlüssel ersetzen',
  [BrightMailStrings.KeyMgmt_ImportByEmail]: 'Per E-Mail importieren',
  [BrightMailStrings.KeyMgmt_ImportCertPem]: 'Zertifikat importieren (PEM)',
  [BrightMailStrings.KeyMgmt_ReplaceCertificate]: 'Zertifikat ersetzen',
  [BrightMailStrings.KeyMgmt_ImportPkcs12]: 'PKCS#12 importieren',
  [BrightMailStrings.KeyMgmt_Passphrase]: 'Passphrase',
  [BrightMailStrings.KeyMgmt_Pkcs12Password]: 'PKCS#12-Passwort',
  [BrightMailStrings.KeyMgmt_EmailAddress]: 'E-Mail-Adresse',
  [BrightMailStrings.KeyMgmt_DeleteGpgKeypair]: 'GPG-Schlüsselpaar löschen',
  [BrightMailStrings.KeyMgmt_DeleteGpgPublicKey]:
    'Öffentlichen GPG-Schlüssel löschen',
  [BrightMailStrings.KeyMgmt_DeleteSmimeCert]: 'S/MIME-Zertifikat löschen',
  [BrightMailStrings.KeyMgmt_CertExpired]: 'Dieses Zertifikat ist abgelaufen',
  [BrightMailStrings.KeyMgmt_ErrorInvalidCert]:
    'Ungültige X.509-Zertifikatsdatei',
  [BrightMailStrings.KeyMgmt_ErrorInvalidKey]:
    'Ungültige PGP-Datei mit öffentlichem Schlüssel',
  [BrightMailStrings.KeyMgmt_ErrorUploadCert]:
    'Zertifikat konnte nicht hochgeladen werden',
  [BrightMailStrings.KeyMgmt_ErrorUploadKey]:
    'Schlüssel konnte nicht hochgeladen werden',
  [BrightMailStrings.KeyMgmt_ErrorDeleteCert]:
    'Zertifikat konnte nicht gelöscht werden',
  [BrightMailStrings.KeyMgmt_ErrorDeleteKey]:
    'Schlüssel konnte nicht gelöscht werden',
  [BrightMailStrings.KeyMgmt_ErrorGenerateKeypair]:
    'GPG-Schlüsselpaar konnte nicht generiert werden',
  [BrightMailStrings.KeyMgmt_ErrorExportKey]:
    'Öffentlicher GPG-Schlüssel konnte nicht exportiert werden',
  [BrightMailStrings.KeyMgmt_ErrorPublishKey]:
    'GPG-Schlüssel konnte nicht auf dem Schlüsselserver veröffentlicht werden',
  [BrightMailStrings.KeyMgmt_ErrorImportByEmail]:
    'GPG-Schlüssel konnte nicht per E-Mail importiert werden',
  [BrightMailStrings.KeyMgmt_ErrorImportPkcs12]:
    'PKCS#12-Zertifikat konnte nicht importiert werden',

  // Passphrase Dialog
  [BrightMailStrings.Passphrase_Title]: 'GPG-Passphrase eingeben',
  [BrightMailStrings.Passphrase_Label]: 'Passphrase',

  // Reading Pane
  [BrightMailStrings.ReadingPane_Placeholder]:
    'Wählen Sie eine E-Mail zum Lesen aus',

  // Recipient Chip Input
  [BrightMailStrings.Recipient_AddedOneTemplate]:
    'Empfänger hinzugefügt: {EMAIL}',
  [BrightMailStrings.Recipient_AddedManyTemplate]:
    'Empfänger hinzugefügt: {EMAILS}',
  [BrightMailStrings.Recipient_RemovedTemplate]: 'Empfänger entfernt: {EMAIL}',
  [BrightMailStrings.Recipient_NotFoundTemplate]:
    '{LOCAL} nicht gefunden bei {DOMAIN}',

  // Rich Text Editor
  [BrightMailStrings.RichText_Placeholder]: 'Verfassen Sie Ihre Nachricht...',
  [BrightMailStrings.RichText_Bold]: 'Fett',
  [BrightMailStrings.RichText_Italic]: 'Kursiv',
  [BrightMailStrings.RichText_Underline]: 'Unterstrichen',
  [BrightMailStrings.RichText_OrderedList]: 'Nummerierte Liste',
  [BrightMailStrings.RichText_UnorderedList]: 'Aufzählungsliste',
  [BrightMailStrings.RichText_Link]: 'Link',
  [BrightMailStrings.RichText_EnterUrl]: 'URL eingeben:',
  [BrightMailStrings.RichText_ToolbarLabel]: 'Textformatierung',

  // Compose Modal
  [BrightMailStrings.ComposeModal_Restore]: 'Verfassen wiederherstellen',
  [BrightMailStrings.ComposeModal_Minimize]: 'Verfassen minimieren',
  [BrightMailStrings.ComposeModal_Maximize]: 'Verfassen maximieren',
  [BrightMailStrings.ComposeModal_RestoreDown]:
    'Verfassen-Größe wiederherstellen',
  [BrightMailStrings.ComposeModal_Close]: 'Verfassen schließen',

  // GPG Setup Wizard
  [BrightMailStrings.GpgWizard_Title]: 'GPG-Verschlüsselung einrichten',
  [BrightMailStrings.GpgWizard_WelcomeHeading]:
    'Sichern Sie Ihre E-Mails mit GPG',
  [BrightMailStrings.GpgWizard_WelcomeBody]:
    'GPG (GNU Privacy Guard) ermöglicht es Ihnen, E-Mails zu verschlüsseln und zu signieren, sodass nur der beabsichtigte Empfänger sie lesen kann. Die Einrichtung dauert weniger als eine Minute.',
  [BrightMailStrings.GpgWizard_EciesNote]:
    'BrightChain-Mitglieder erhalten außerdem automatisch ECIES-Verschlüsselung für Nachrichten innerhalb des Netzwerks.',
  [BrightMailStrings.GpgWizard_OptionGenerate]: 'Neues Schlüsselpaar erstellen',
  [BrightMailStrings.GpgWizard_OptionGenerateDesc]:
    'Empfohlen. Wir generieren ein sicheres Schlüsselpaar für Sie.',
  [BrightMailStrings.GpgWizard_OptionImport]:
    'Ich habe bereits einen GPG-Schlüssel',
  [BrightMailStrings.GpgWizard_OptionImportDesc]:
    'Importieren Sie einen vorhandenen öffentlichen Schlüssel aus einer Datei, der Zwischenablage oder einem Schlüsselserver.',
  [BrightMailStrings.GpgWizard_GenerateHeading]: 'Wählen Sie eine Passphrase',
  [BrightMailStrings.GpgWizard_GenerateBody]:
    'Ihre Passphrase schützt Ihren privaten Schlüssel. Wählen Sie etwas Einprägsames, das schwer zu erraten ist.',
  [BrightMailStrings.GpgWizard_PassphraseLabel]: 'Passphrase',
  [BrightMailStrings.GpgWizard_PassphraseConfirmLabel]: 'Passphrase bestätigen',
  [BrightMailStrings.GpgWizard_PassphraseMismatch]:
    'Passphrasen stimmen nicht überein',
  [BrightMailStrings.GpgWizard_PassphraseStrengthWeak]: 'Schwach',
  [BrightMailStrings.GpgWizard_PassphraseStrengthFair]: 'Mäßig',
  [BrightMailStrings.GpgWizard_PassphraseStrengthGood]: 'Gut',
  [BrightMailStrings.GpgWizard_PassphraseStrengthStrong]: 'Stark',
  [BrightMailStrings.GpgWizard_GenerateButton]: 'Meine Schlüssel generieren',
  [BrightMailStrings.GpgWizard_Generating]: 'Ihr Schlüsselpaar wird generiert…',
  [BrightMailStrings.GpgWizard_ImportHeading]:
    'Ihren GPG-Schlüssel importieren',
  [BrightMailStrings.GpgWizard_ImportTabFile]: 'Datei hochladen',
  [BrightMailStrings.GpgWizard_ImportTabPaste]: 'Schlüssel einfügen',
  [BrightMailStrings.GpgWizard_ImportTabKeyserver]:
    'Schlüsselserver durchsuchen',
  [BrightMailStrings.GpgWizard_ImportFilePrompt]:
    'Wählen Sie eine .asc-, .gpg- oder .pub-Datei',
  [BrightMailStrings.GpgWizard_ImportPasteLabel]:
    'Fügen Sie Ihren ASCII-geschützten öffentlichen Schlüssel ein',
  [BrightMailStrings.GpgWizard_ImportKeyserverLabel]: 'E-Mail-Adresse',
  [BrightMailStrings.GpgWizard_ImportKeyserverHint]:
    'Wir durchsuchen öffentliche Schlüsselserver nach einem Schlüssel, der zu dieser E-Mail passt.',
  [BrightMailStrings.GpgWizard_ImportButton]: 'Schlüssel importieren',
  [BrightMailStrings.GpgWizard_Searching]: 'Schlüsselserver werden durchsucht…',
  [BrightMailStrings.GpgWizard_SuccessHeading]: 'Alles bereit!',
  [BrightMailStrings.GpgWizard_SuccessBody]:
    'Ihr GPG-Schlüssel ist bereit. Sie können jetzt GPG-verschlüsselte E-Mails senden und empfangen.',
  [BrightMailStrings.GpgWizard_SuccessFingerprint]: 'Schlüssel-Fingerabdruck',
  [BrightMailStrings.GpgWizard_PublishPrompt]:
    'Veröffentlichen Sie Ihren öffentlichen Schlüssel, damit andere ihn finden und Ihnen verschlüsselte E-Mails senden können.',
  [BrightMailStrings.GpgWizard_PublishButton]:
    'Auf Schlüsselserver veröffentlichen',
  [BrightMailStrings.GpgWizard_SetDefaultPrompt]:
    'GPG als Standardverschlüsselung für neue Nachrichten festlegen?',
  [BrightMailStrings.GpgWizard_SetDefaultButton]: 'GPG als Standard festlegen',
  [BrightMailStrings.GpgWizard_Done]: 'Fertig',
  [BrightMailStrings.GpgWizard_Back]: 'Zurück',
  [BrightMailStrings.GpgWizard_Next]: 'Weiter',
  [BrightMailStrings.GpgWizard_ErrorGenerate]:
    'Schlüsselpaar konnte nicht generiert werden. Bitte versuchen Sie es erneut.',
  [BrightMailStrings.GpgWizard_ErrorImport]:
    'Schlüssel konnte nicht importiert werden. Überprüfen Sie die Datei oder Schlüsseldaten und versuchen Sie es erneut.',
  [BrightMailStrings.GpgWizard_ErrorPublish]:
    'Schlüssel konnte nicht auf dem Schlüsselserver veröffentlicht werden.',

  // Calendar Invite Card
  [BrightMailStrings.CalInvite_Title]: 'Kalendereinladung',
  [BrightMailStrings.CalInvite_Organizer]: 'Organisator',
  [BrightMailStrings.CalInvite_WhenTemplate]: '{START} – {END}',
  [BrightMailStrings.CalInvite_AllDay]: 'Ganztägig',
  [BrightMailStrings.CalInvite_Location]: 'Ort',
  [BrightMailStrings.CalInvite_Description]: 'Beschreibung',
  [BrightMailStrings.CalInvite_AttendeesTemplate]: '{COUNT} Teilnehmer',
  [BrightMailStrings.CalInvite_Accept]: 'Annehmen',
  [BrightMailStrings.CalInvite_Decline]: 'Ablehnen',
  [BrightMailStrings.CalInvite_Tentative]: 'Vorläufig',
  [BrightMailStrings.CalInvite_AddToCalendar]: 'Zum Kalender hinzufügen',
  [BrightMailStrings.CalInvite_ViewInCalendar]: 'Im Kalender anzeigen',
  [BrightMailStrings.CalInvite_AlreadyResponded]:
    'Sie haben bereits geantwortet',
  [BrightMailStrings.CalInvite_ResponseTemplate]:
    'Sie haben geantwortet: {RESPONSE}',
  [BrightMailStrings.CalInvite_Cancelled]: 'Termin abgesagt',
  [BrightMailStrings.CalInvite_CancelledBody]:
    'Der Organisator hat diesen Termin abgesagt.',
  [BrightMailStrings.CalInvite_Updated]: 'Termin aktualisiert',
  [BrightMailStrings.CalInvite_UpdatedBody]:
    'Der Organisator hat diesen Termin aktualisiert.',
  [BrightMailStrings.CalInvite_Counter]: 'Gegenvorschlag',
  [BrightMailStrings.CalInvite_CounterBody]:
    'Ein Teilnehmer hat eine neue Zeit vorgeschlagen.',
  [BrightMailStrings.CalInvite_ErrorRsvp]:
    'Antwort konnte nicht gesendet werden',
  [BrightMailStrings.CalInvite_ErrorImport]:
    'Termin konnte nicht in den Kalender importiert werden',
  [BrightMailStrings.CalInvite_SuccessAccepted]: 'Einladung angenommen',
  [BrightMailStrings.CalInvite_SuccessDeclined]: 'Einladung abgelehnt',
  [BrightMailStrings.CalInvite_SuccessTentative]:
    'Einladung vorläufig angenommen',
};
