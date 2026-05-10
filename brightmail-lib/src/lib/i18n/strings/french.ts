import { RequiredBrandedStringsCollection } from '@digitaldefiance/i18n-lib';
import { BrightMailStrings } from '../../enumerations/brightMailStrings';

export const BrightMailFrenchStrings: RequiredBrandedStringsCollection<
  typeof BrightMailStrings
> = {
  // Menu
  [BrightMailStrings.MenuLabel]: 'BrightMail',

  // Inbox
  [BrightMailStrings.Inbox_Title]: 'Boîte de réception',
  [BrightMailStrings.Inbox_Empty]: 'Aucun e-mail pour le moment',
  [BrightMailStrings.Inbox_Error]:
    'Échec du chargement de la boîte de réception',
  [BrightMailStrings.Inbox_Retry]: 'Réessayer',
  [BrightMailStrings.Inbox_UnreadCountTemplate]: '{COUNT} non lu(s)',

  // Compose
  [BrightMailStrings.Compose_Title]: 'Rédiger',
  [BrightMailStrings.Compose_To]: 'À',
  [BrightMailStrings.Compose_Cc]: 'Cc',
  [BrightMailStrings.Compose_Bcc]: 'Cci',
  [BrightMailStrings.Compose_Subject]: 'Objet',
  [BrightMailStrings.Compose_Body]: 'Message',
  [BrightMailStrings.Compose_Send]: 'Envoyer',
  [BrightMailStrings.Compose_SendSuccess]: 'E-mail envoyé avec succès',
  [BrightMailStrings.Compose_SendError]: "Échec de l'envoi de l'e-mail",
  [BrightMailStrings.Compose_InvalidRecipient]:
    'Veuillez ajouter au moins un destinataire valide',
  [BrightMailStrings.Compose_Attachments]: 'Pièces jointes',
  [BrightMailStrings.Compose_ExternalRecipientsWarning]:
    "Le chiffrement ECIES n'est pas disponible pour les destinataires externes. L'envoi est désactivé tant que des adresses externes sont présentes avec le chiffrement activé.",
  [BrightMailStrings.Compose_ExternalRecipientsWarningTemplate]:
    'Les destinataires externes ({ADDRESSES}) sont en dehors du domaine local et ne peuvent pas recevoir de messages chiffrés ECIES.',
  [BrightMailStrings.Compose_BounceWarningTitle]: 'Destinataires non vérifiés',
  [BrightMailStrings.Compose_BounceWarningMessage]:
    'Les destinataires suivants sont introuvables et votre message pourrait être rejeté : {ADDRESSES}. Envoyer quand même ?',
  [BrightMailStrings.Compose_BounceWarningSendAnyway]: 'Envoyer quand même',

  // Thread
  [BrightMailStrings.Thread_Error]: 'Échec du chargement du fil de discussion',
  [BrightMailStrings.Thread_BackToInbox]: 'Retour à la boîte de réception',
  [BrightMailStrings.Thread_Reply]: 'Répondre',
  [BrightMailStrings.Thread_ReplyAll]: 'Répondre à tous',
  [BrightMailStrings.Thread_Forward]: 'Transférer',

  // Delete
  [BrightMailStrings.Delete_Confirm]: 'Êtes-vous sûr de vouloir supprimer ?',
  [BrightMailStrings.Delete_ConfirmBulkTemplate]:
    'Supprimer {COUNT} e-mails sélectionnés ?',
  [BrightMailStrings.Delete_Success]: 'E-mail supprimé',
  [BrightMailStrings.Delete_ErrorTemplate]:
    "Échec de la suppression de l'e-mail : {MESSAGE_ID}",

  // Sidebar / Navigation
  [BrightMailStrings.Nav_Inbox]: 'Boîte de réception',
  [BrightMailStrings.Nav_Sent]: 'Envoyés',
  [BrightMailStrings.Nav_Drafts]: 'Brouillons',
  [BrightMailStrings.Nav_Trash]: 'Corbeille',
  [BrightMailStrings.Nav_Spam]: 'Courrier indésirable',
  [BrightMailStrings.Nav_Labels]: 'Libellés',
  [BrightMailStrings.Nav_Calendar]: 'Calendrier',
  [BrightMailStrings.Nav_Compose]: 'Rédiger',
  [BrightMailStrings.Nav_MailFolders]: 'Dossiers de messagerie',

  // Actions
  [BrightMailStrings.Action_Delete]: 'Supprimer',
  [BrightMailStrings.Action_MarkAsRead]: 'Marquer comme lu',
  [BrightMailStrings.Action_Cancel]: 'Annuler',
  [BrightMailStrings.Action_Discard]: 'Abandonner',
  [BrightMailStrings.Action_Submit]: 'Soumettre',
  [BrightMailStrings.Action_Generate]: 'Générer',
  [BrightMailStrings.Action_Search]: 'Rechercher',
  [BrightMailStrings.Action_Import]: 'Importer',

  // General
  [BrightMailStrings.Loading]: 'Chargement...',
  [BrightMailStrings.NewMessage]: 'Nouveau message',
  [BrightMailStrings.DiscardDraftTitle]: 'Abandonner le brouillon ?',
  [BrightMailStrings.DiscardDraftMessage]:
    "Votre message contient du contenu non enregistré. L'abandonner ?",

  // Attachment
  [BrightMailStrings.Attachment_AttachFiles]: 'Joindre des fichiers',
  [BrightMailStrings.Attachment_FileSizeExceededTemplate]:
    'Le fichier « {FILENAME} » dépasse la limite de {LIMIT}',
  [BrightMailStrings.Attachment_TotalSizeExceeded]:
    'Le total des pièces jointes dépasse la limite de {LIMIT}',
  [BrightMailStrings.Attachment_RemoveTemplate]: 'Supprimer {FILENAME}',

  // Email List
  [BrightMailStrings.EmailList_SelectAll]: 'Sélectionner tous les e-mails',
  [BrightMailStrings.EmailList_AriaLabel]: 'Liste des e-mails',
  [BrightMailStrings.EmailList_SelectEmailTemplate]:
    "Sélectionner l'e-mail de {SENDER}",
  [BrightMailStrings.EmailList_Header_Sender]: 'Expéditeur',
  [BrightMailStrings.EmailList_Header_Subject]: 'Objet',
  [BrightMailStrings.EmailList_Header_Date]: 'Date',
  [BrightMailStrings.EmailList_Header_Status]: 'Statut',
  [BrightMailStrings.EmailList_Status_Read]: 'Lu',
  [BrightMailStrings.EmailList_Status_Unread]: 'Non lu',
  [BrightMailStrings.EmailList_Star]: 'Suivre',
  [BrightMailStrings.EmailList_Unstar]: 'Ne plus suivre',

  // Encryption
  [BrightMailStrings.Encryption_Label]: 'Chiffrement',
  [BrightMailStrings.Encryption_None]: 'Aucun chiffrement',
  [BrightMailStrings.Encryption_ECIES]: 'ECIES',
  [BrightMailStrings.Encryption_GPG]: 'GPG',
  [BrightMailStrings.Encryption_SMIME]: 'S/MIME',
  [BrightMailStrings.Encryption_MissingKeysTemplate]:
    "Les destinataires suivants n'ont pas de clé publique : {RECIPIENTS}",
  [BrightMailStrings.Encryption_SmimeCertRequired]:
    'La signature S/MIME nécessite un certificat configuré dans les Paramètres',
  [BrightMailStrings.Encryption_GpgKeyRequired]:
    'La signature GPG nécessite une paire de clés configurée dans les Paramètres',
  [BrightMailStrings.Encryption_DefaultPreference]:
    'Préférence de chiffrement par défaut',
  [BrightMailStrings.Encryption_DefaultLabel]: 'Chiffrement par défaut',

  // Key Management
  [BrightMailStrings.KeyMgmt_GpgKeypair]: 'Paire de clés GPG',
  [BrightMailStrings.KeyMgmt_SmimeCertificate]: 'Certificat S/MIME',
  [BrightMailStrings.KeyMgmt_NoGpgKeypair]:
    'Aucune paire de clés GPG configurée. Générez une nouvelle paire de clés ou importez une clé publique.',
  [BrightMailStrings.KeyMgmt_NoSmimeCert]:
    'Aucun certificat S/MIME configuré. Importez un certificat pour activer le chiffrement S/MIME.',
  [BrightMailStrings.KeyMgmt_ExportPublicKey]: 'Exporter la clé publique',
  [BrightMailStrings.KeyMgmt_PublishToKeyserver]:
    'Publier sur le serveur de clés',
  [BrightMailStrings.KeyMgmt_GenerateKeypair]: 'Générer une paire de clés',
  [BrightMailStrings.KeyMgmt_ImportPublicKey]: 'Importer une clé publique',
  [BrightMailStrings.KeyMgmt_ReplaceKey]: 'Remplacer la clé',
  [BrightMailStrings.KeyMgmt_ImportByEmail]: 'Importer par e-mail',
  [BrightMailStrings.KeyMgmt_ImportCertPem]: 'Importer un certificat (PEM)',
  [BrightMailStrings.KeyMgmt_ReplaceCertificate]: 'Remplacer le certificat',
  [BrightMailStrings.KeyMgmt_ImportPkcs12]: 'Importer PKCS#12',
  [BrightMailStrings.KeyMgmt_Passphrase]: 'Phrase secrète',
  [BrightMailStrings.KeyMgmt_Pkcs12Password]: 'Mot de passe PKCS#12',
  [BrightMailStrings.KeyMgmt_EmailAddress]: 'Adresse e-mail',
  [BrightMailStrings.KeyMgmt_DeleteGpgKeypair]:
    'Supprimer la paire de clés GPG',
  [BrightMailStrings.KeyMgmt_DeleteGpgPublicKey]:
    'Supprimer la clé publique GPG',
  [BrightMailStrings.KeyMgmt_DeleteSmimeCert]: 'Supprimer le certificat S/MIME',
  [BrightMailStrings.KeyMgmt_CertExpired]: 'Ce certificat a expiré',
  [BrightMailStrings.KeyMgmt_ErrorInvalidCert]:
    'Fichier de certificat X.509 invalide',
  [BrightMailStrings.KeyMgmt_ErrorInvalidKey]:
    'Fichier de clé publique PGP invalide',
  [BrightMailStrings.KeyMgmt_ErrorUploadCert]:
    'Échec du téléversement du certificat',
  [BrightMailStrings.KeyMgmt_ErrorUploadKey]:
    'Échec du téléversement de la clé',
  [BrightMailStrings.KeyMgmt_ErrorDeleteCert]:
    'Échec de la suppression du certificat',
  [BrightMailStrings.KeyMgmt_ErrorDeleteKey]:
    'Échec de la suppression de la clé',
  [BrightMailStrings.KeyMgmt_ErrorGenerateKeypair]:
    'Échec de la génération de la paire de clés GPG',
  [BrightMailStrings.KeyMgmt_ErrorExportKey]:
    "Échec de l'exportation de la clé publique GPG",
  [BrightMailStrings.KeyMgmt_ErrorPublishKey]:
    'Échec de la publication de la clé GPG sur le serveur de clés',
  [BrightMailStrings.KeyMgmt_ErrorImportByEmail]:
    "Échec de l'importation de la clé GPG par e-mail",
  [BrightMailStrings.KeyMgmt_ErrorImportPkcs12]:
    "Échec de l'importation du certificat PKCS#12",

  // Passphrase Dialog
  [BrightMailStrings.Passphrase_Title]: 'Saisir la phrase secrète GPG',
  [BrightMailStrings.Passphrase_Label]: 'Phrase secrète',

  // Reading Pane
  [BrightMailStrings.ReadingPane_Placeholder]: 'Sélectionnez un e-mail à lire',

  // Recipient Chip Input
  [BrightMailStrings.Recipient_AddedOneTemplate]:
    'Destinataire ajouté : {EMAIL}',
  [BrightMailStrings.Recipient_AddedManyTemplate]:
    'Destinataires ajoutés : {EMAILS}',
  [BrightMailStrings.Recipient_RemovedTemplate]:
    'Destinataire supprimé : {EMAIL}',
  [BrightMailStrings.Recipient_NotFoundTemplate]:
    '{LOCAL} introuvable sur {DOMAIN}',

  // Rich Text Editor
  [BrightMailStrings.RichText_Placeholder]: 'Rédigez votre message...',
  [BrightMailStrings.RichText_Bold]: 'Gras',
  [BrightMailStrings.RichText_Italic]: 'Italique',
  [BrightMailStrings.RichText_Underline]: 'Souligné',
  [BrightMailStrings.RichText_OrderedList]: 'Liste ordonnée',
  [BrightMailStrings.RichText_UnorderedList]: 'Liste non ordonnée',
  [BrightMailStrings.RichText_Link]: 'Lien',
  [BrightMailStrings.RichText_EnterUrl]: "Saisir l'URL :",
  [BrightMailStrings.RichText_ToolbarLabel]: 'Mise en forme du texte',

  // Compose Modal
  [BrightMailStrings.ComposeModal_Restore]: 'Restaurer la rédaction',
  [BrightMailStrings.ComposeModal_Minimize]: 'Réduire la rédaction',
  [BrightMailStrings.ComposeModal_Maximize]: 'Agrandir la rédaction',
  [BrightMailStrings.ComposeModal_RestoreDown]:
    'Restaurer la taille de rédaction',
  [BrightMailStrings.ComposeModal_Close]: 'Fermer la rédaction',

  // GPG Setup Wizard
  [BrightMailStrings.GpgWizard_Title]: 'Configurer le chiffrement GPG',
  [BrightMailStrings.GpgWizard_WelcomeHeading]:
    'Sécurisez vos e-mails avec GPG',
  [BrightMailStrings.GpgWizard_WelcomeBody]:
    "GPG (GNU Privacy Guard) vous permet de chiffrer et signer vos e-mails afin que seul le destinataire prévu puisse les lire. La configuration prend moins d'une minute.",
  [BrightMailStrings.GpgWizard_EciesNote]:
    'Les membres BrightChain bénéficient également du chiffrement ECIES automatique pour les messages au sein du réseau.',
  [BrightMailStrings.GpgWizard_OptionGenerate]:
    'Créer une nouvelle paire de clés',
  [BrightMailStrings.GpgWizard_OptionGenerateDesc]:
    'Recommandé. Nous générons une paire de clés sécurisée pour vous.',
  [BrightMailStrings.GpgWizard_OptionImport]: "J'ai déjà une clé GPG",
  [BrightMailStrings.GpgWizard_OptionImportDesc]:
    'Importez une clé publique existante depuis un fichier, le presse-papiers ou un serveur de clés.',
  [BrightMailStrings.GpgWizard_GenerateHeading]:
    'Choisissez une phrase secrète',
  [BrightMailStrings.GpgWizard_GenerateBody]:
    'Votre phrase secrète protège votre clé privée. Choisissez quelque chose de mémorable mais difficile à deviner.',
  [BrightMailStrings.GpgWizard_PassphraseLabel]: 'Phrase secrète',
  [BrightMailStrings.GpgWizard_PassphraseConfirmLabel]:
    'Confirmer la phrase secrète',
  [BrightMailStrings.GpgWizard_PassphraseMismatch]:
    'Les phrases secrètes ne correspondent pas',
  [BrightMailStrings.GpgWizard_PassphraseStrengthWeak]: 'Faible',
  [BrightMailStrings.GpgWizard_PassphraseStrengthFair]: 'Passable',
  [BrightMailStrings.GpgWizard_PassphraseStrengthGood]: 'Bon',
  [BrightMailStrings.GpgWizard_PassphraseStrengthStrong]: 'Fort',
  [BrightMailStrings.GpgWizard_GenerateButton]: 'Générer mes clés',
  [BrightMailStrings.GpgWizard_Generating]:
    'Génération de votre paire de clés…',
  [BrightMailStrings.GpgWizard_ImportHeading]: 'Importer votre clé GPG',
  [BrightMailStrings.GpgWizard_ImportTabFile]: 'Téléverser un fichier',
  [BrightMailStrings.GpgWizard_ImportTabPaste]: 'Coller la clé',
  [BrightMailStrings.GpgWizard_ImportTabKeyserver]:
    'Rechercher sur un serveur de clés',
  [BrightMailStrings.GpgWizard_ImportFilePrompt]:
    'Sélectionnez un fichier .asc, .gpg ou .pub',
  [BrightMailStrings.GpgWizard_ImportPasteLabel]:
    'Collez votre clé publique au format ASCII-armored',
  [BrightMailStrings.GpgWizard_ImportKeyserverLabel]: 'Adresse e-mail',
  [BrightMailStrings.GpgWizard_ImportKeyserverHint]:
    'Nous rechercherons sur les serveurs de clés publics une clé correspondant à cet e-mail.',
  [BrightMailStrings.GpgWizard_ImportButton]: 'Importer la clé',
  [BrightMailStrings.GpgWizard_Searching]:
    'Recherche sur les serveurs de clés…',
  [BrightMailStrings.GpgWizard_SuccessHeading]: 'Tout est prêt !',
  [BrightMailStrings.GpgWizard_SuccessBody]:
    'Votre clé GPG est prête. Vous pouvez maintenant envoyer et recevoir des e-mails chiffrés GPG.',
  [BrightMailStrings.GpgWizard_SuccessFingerprint]: 'Empreinte de la clé',
  [BrightMailStrings.GpgWizard_PublishPrompt]:
    "Publiez votre clé publique pour que d'autres puissent la trouver et vous envoyer des e-mails chiffrés.",
  [BrightMailStrings.GpgWizard_PublishButton]: 'Publier sur le serveur de clés',
  [BrightMailStrings.GpgWizard_SetDefaultPrompt]:
    'Définir GPG comme chiffrement par défaut pour les nouveaux messages ?',
  [BrightMailStrings.GpgWizard_SetDefaultButton]: 'Définir GPG par défaut',
  [BrightMailStrings.GpgWizard_Done]: 'Terminé',
  [BrightMailStrings.GpgWizard_Back]: 'Retour',
  [BrightMailStrings.GpgWizard_Next]: 'Suivant',
  [BrightMailStrings.GpgWizard_ErrorGenerate]:
    'Échec de la génération de la paire de clés. Veuillez réessayer.',
  [BrightMailStrings.GpgWizard_ErrorImport]:
    "Échec de l'importation de la clé. Vérifiez le fichier ou les données et réessayez.",
  [BrightMailStrings.GpgWizard_ErrorPublish]:
    'Échec de la publication de la clé sur le serveur de clés.',

  // Calendar Invite Card
  [BrightMailStrings.CalInvite_Title]: 'Invitation de calendrier',
  [BrightMailStrings.CalInvite_Organizer]: 'Organisateur',
  [BrightMailStrings.CalInvite_WhenTemplate]: '{START} – {END}',
  [BrightMailStrings.CalInvite_AllDay]: 'Toute la journée',
  [BrightMailStrings.CalInvite_Location]: 'Lieu',
  [BrightMailStrings.CalInvite_Description]: 'Description',
  [BrightMailStrings.CalInvite_AttendeesTemplate]: '{COUNT} participant(s)',
  [BrightMailStrings.CalInvite_Accept]: 'Accepter',
  [BrightMailStrings.CalInvite_Decline]: 'Refuser',
  [BrightMailStrings.CalInvite_Tentative]: 'Provisoire',
  [BrightMailStrings.CalInvite_AddToCalendar]: 'Ajouter au calendrier',
  [BrightMailStrings.CalInvite_ViewInCalendar]: 'Voir dans le calendrier',
  [BrightMailStrings.CalInvite_AlreadyResponded]: 'Vous avez déjà répondu',
  [BrightMailStrings.CalInvite_ResponseTemplate]:
    'Vous avez répondu : {RESPONSE}',
  [BrightMailStrings.CalInvite_Cancelled]: 'Événement annulé',
  [BrightMailStrings.CalInvite_CancelledBody]:
    "L'organisateur a annulé cet événement.",
  [BrightMailStrings.CalInvite_Updated]: 'Événement mis à jour',
  [BrightMailStrings.CalInvite_UpdatedBody]:
    "L'organisateur a mis à jour cet événement.",
  [BrightMailStrings.CalInvite_Counter]: 'Contre-proposition',
  [BrightMailStrings.CalInvite_CounterBody]:
    'Un participant a proposé un nouvel horaire.',
  [BrightMailStrings.CalInvite_ErrorRsvp]: "Échec de l'envoi de la réponse",
  [BrightMailStrings.CalInvite_ErrorImport]:
    "Échec de l'importation de l'événement dans le calendrier",
  [BrightMailStrings.CalInvite_SuccessAccepted]: 'Invitation acceptée',
  [BrightMailStrings.CalInvite_SuccessDeclined]: 'Invitation refusée',
  [BrightMailStrings.CalInvite_SuccessTentative]:
    'Invitation acceptée provisoirement',
};
