import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightPassStringKey,
  BrightPassStrings,
} from '../../../enumerations/brightPassStrings';

export const BrightPassFrenchStrings: ComponentStrings<BrightPassStringKey> = {
  // Menu
  [BrightPassStrings.Menu_BrightPass]: 'BrightPass',

  // Vault List
  [BrightPassStrings.VaultList_Title]: 'Coffres-forts',
  [BrightPassStrings.VaultList_CreateVaultName]: 'Nom du coffre-fort',
  [BrightPassStrings.VaultList_CreateVault]: 'Créer un coffre-fort',
  [BrightPassStrings.VaultList_DeleteVault]: 'Supprimer le coffre-fort',
  [BrightPassStrings.VaultList_SharedWithTemplate]: 'Partagé avec {COUNT} membres',
  [BrightPassStrings.VaultList_NoVaults]:
    'Aucun coffre-fort. Créez-en un pour commencer.',

  // Vault Detail
  [BrightPassStrings.VaultDetail_TitleNameTemplate]: 'Coffre-fort : {NAME}',
  [BrightPassStrings.VaultDetail_AddEntry]: 'Ajouter une entrée',
  [BrightPassStrings.VaultDetail_LockVault]: 'Verrouiller le coffre-fort',
  [BrightPassStrings.VaultDetail_Search]: 'Rechercher des entrées…',
  [BrightPassStrings.VaultDetail_NoEntries]:
    'Aucune entrée. Ajoutez-en une pour commencer.',
  [BrightPassStrings.VaultDetail_Favorite]: 'Favori',
  [BrightPassStrings.VaultDetail_ConfirmLockTitle]:
    'Verrouiller le coffre-fort ?',
  [BrightPassStrings.VaultDetail_ConfirmLockMessage]:
    'Vous quittez la page. Voulez-vous verrouiller le coffre-fort ?',
  [BrightPassStrings.VaultDetail_Cancel]: 'Annuler',
  [BrightPassStrings.VaultDetail_Confirm]: 'Verrouiller',

  // Entry Types
  [BrightPassStrings.EntryType_Login]: 'Identifiant',
  [BrightPassStrings.EntryType_SecureNote]: 'Note sécurisée',
  [BrightPassStrings.EntryType_CreditCard]: 'Carte de crédit',
  [BrightPassStrings.EntryType_Identity]: 'Identité',

  // Password Generator
  [BrightPassStrings.PasswordGen_Title]: 'Générateur de mot de passe',
  [BrightPassStrings.PasswordGen_Length]: 'Longueur',
  [BrightPassStrings.PasswordGen_Generate]: 'Générer',
  [BrightPassStrings.PasswordGen_Copy]: 'Copier',
  [BrightPassStrings.PasswordGen_UsePassword]: 'Utiliser le mot de passe',
  [BrightPassStrings.PasswordGen_Strength_Weak]: 'Faible',
  [BrightPassStrings.PasswordGen_Strength_Fair]: 'Moyen',
  [BrightPassStrings.PasswordGen_Strength_Strong]: 'Fort',
  [BrightPassStrings.PasswordGen_Strength_VeryStrong]: 'Très fort',
  [BrightPassStrings.PasswordGen_Uppercase]: 'Majuscules',
  [BrightPassStrings.PasswordGen_Lowercase]: 'Minuscules',
  [BrightPassStrings.PasswordGen_Digits]: 'Chiffres',
  [BrightPassStrings.PasswordGen_Symbols]: 'Symboles',
  [BrightPassStrings.PasswordGen_Copied]: 'Copié !',
  [BrightPassStrings.PasswordGen_Entropy]: "{BITS} bits d'entropie",

  // TOTP
  [BrightPassStrings.TOTP_Title]: 'Authentificateur TOTP',
  [BrightPassStrings.TOTP_Code]: 'Code actuel',
  [BrightPassStrings.TOTP_CopyCode]: 'Copier le code',
  [BrightPassStrings.TOTP_Copied]: 'Copié !',
  [BrightPassStrings.TOTP_SecondsRemainingTemplate]: '{SECONDS}s restantes',
  [BrightPassStrings.TOTP_QrCode]: 'Code QR',
  [BrightPassStrings.TOTP_SecretUri]: 'URI du secret',

  // Breach Check
  [BrightPassStrings.Breach_Title]: 'Vérification des fuites',
  [BrightPassStrings.Breach_Check]: 'Vérifier les fuites',
  [BrightPassStrings.Breach_Password]: 'Mot de passe à vérifier',
  [BrightPassStrings.Breach_FoundTemplate]:
    'Ce mot de passe a été trouvé dans {COUNT} fuites de données.',
  [BrightPassStrings.Breach_NotFound]:
    "Ce mot de passe n'a été trouvé dans aucune fuite de données connue.",

  // Audit Log
  [BrightPassStrings.AuditLog_Title]: "Journal d'audit",
  [BrightPassStrings.AuditLog_Timestamp]: 'Horodatage',
  [BrightPassStrings.AuditLog_Action]: 'Action',
  [BrightPassStrings.AuditLog_Member]: 'ID du membre',
  [BrightPassStrings.AuditLog_FilterAll]: 'Toutes les actions',
  [BrightPassStrings.AuditLog_NoEntries]:
    "Aucune entrée dans le journal d'audit.",
  [BrightPassStrings.AuditLog_Error]:
    "Échec du chargement du journal d'audit. Veuillez réessayer.",

  // Breadcrumb Navigation
  [BrightPassStrings.Breadcrumb_BrightPass]: 'BrightPass',
  [BrightPassStrings.Breadcrumb_VaultTemplate]: 'Coffre-fort : {NAME}',
  [BrightPassStrings.Breadcrumb_AuditLog]: "Journal d'audit",
  [BrightPassStrings.Breadcrumb_PasswordGenerator]:
    'Générateur de mot de passe',
  [BrightPassStrings.Breadcrumb_Tools]: 'Outils',

  // Vault List Dialogs
  [BrightPassStrings.VaultList_ConfirmDelete]: 'Supprimer le coffre-fort',
  [BrightPassStrings.VaultList_ConfirmDeleteMessageTemplate]:
    'Entrez votre mot de passe principal pour supprimer le coffre-fort "{NAME}". Cette action est irréversible.',
  [BrightPassStrings.VaultList_EnterMasterPassword]:
    'Entrez le mot de passe principal',
  [BrightPassStrings.VaultList_ConfirmMasterPassword]:
    'Confirmez le mot de passe principal',
  [BrightPassStrings.VaultList_PasswordsMustMatch]:
    'Le mot de passe principal et la confirmation doivent correspondre.',
  [BrightPassStrings.VaultList_Cancel]: 'Annuler',
  [BrightPassStrings.VaultList_Confirm]: 'Confirmer',
  [BrightPassStrings.VaultList_Unlock]: 'Déverrouiller',
  [BrightPassStrings.VaultList_UnlockVault]: 'Déverrouiller le coffre-fort',

  // Validation Messages
  [BrightPassStrings.Validation_VaultNameMinLengthTemplate]:
    'Le nom du coffre-fort doit contenir au moins {MIN_LENGTH} caractères',
  [BrightPassStrings.Validation_VaultNameMaxLengthTemplate]:
    'Le nom du coffre-fort doit contenir au maximum {MAX_LENGTH} caractères',
  [BrightPassStrings.Validation_VaultNameRequired]:
    'Le nom du coffre-fort est obligatoire',
  [BrightPassStrings.Validation_PasswordMinLengthTemplate]:
    'Le mot de passe principal doit contenir au moins {MIN_LENGTH} caractères',
  [BrightPassStrings.Validation_PasswordUppercase]:
    'Doit contenir au moins une lettre majuscule',
  [BrightPassStrings.Validation_PasswordLowercase]:
    'Doit contenir au moins une lettre minuscule',
  [BrightPassStrings.Validation_PasswordNumber]:
    'Doit contenir au moins un chiffre',
  [BrightPassStrings.Validation_PasswordSpecialChar]:
    'Doit contenir au moins un caractère spécial',
  [BrightPassStrings.Validation_PasswordRequired]:
    'Le mot de passe principal est obligatoire',
  [BrightPassStrings.Validation_ConfirmPasswordRequired]:
    'Veuillez confirmer votre mot de passe principal',

  // Entry Detail
  [BrightPassStrings.EntryDetail_Title]: "Détails de l'entrée",
  [BrightPassStrings.EntryDetail_Edit]: 'Modifier',
  [BrightPassStrings.EntryDetail_Delete]: 'Supprimer',
  [BrightPassStrings.EntryDetail_ConfirmDelete]: "Supprimer l'entrée",
  [BrightPassStrings.EntryDetail_ConfirmDeleteMessage]:
    'Êtes-vous sûr de vouloir supprimer cette entrée ? Cette action est irréversible.',
  [BrightPassStrings.EntryDetail_Username]: "Nom d'utilisateur",
  [BrightPassStrings.EntryDetail_Password]: 'Mot de passe',
  [BrightPassStrings.EntryDetail_SiteUrl]: 'URL du site',
  [BrightPassStrings.EntryDetail_TotpSecret]: 'Secret TOTP',
  [BrightPassStrings.EntryDetail_Content]: 'Contenu',
  [BrightPassStrings.EntryDetail_CardholderName]: 'Nom du titulaire',
  [BrightPassStrings.EntryDetail_CardNumber]: 'Numéro de carte',
  [BrightPassStrings.EntryDetail_ExpirationDate]: "Date d'expiration",
  [BrightPassStrings.EntryDetail_CVV]: 'CVV',
  [BrightPassStrings.EntryDetail_FirstName]: 'Prénom',
  [BrightPassStrings.EntryDetail_LastName]: 'Nom',
  [BrightPassStrings.EntryDetail_Email]: 'E-mail',
  [BrightPassStrings.EntryDetail_Phone]: 'Téléphone',
  [BrightPassStrings.EntryDetail_Address]: 'Adresse',
  [BrightPassStrings.EntryDetail_Notes]: 'Notes',
  [BrightPassStrings.EntryDetail_Tags]: 'Étiquettes',
  [BrightPassStrings.EntryDetail_CreatedAt]: 'Créé',
  [BrightPassStrings.EntryDetail_UpdatedAt]: 'Mis à jour',
  [BrightPassStrings.EntryDetail_BreachWarningTemplate]:
    'Ce mot de passe a été trouvé dans {COUNT} fuites de données !',
  [BrightPassStrings.EntryDetail_BreachSafe]:
    "Ce mot de passe n'a été trouvé dans aucune fuite de données connue.",
  [BrightPassStrings.EntryDetail_ShowPassword]: 'Afficher',
  [BrightPassStrings.EntryDetail_HidePassword]: 'Masquer',
  [BrightPassStrings.EntryDetail_Cancel]: 'Annuler',

  // Entry Form
  [BrightPassStrings.EntryForm_Title_Create]: 'Créer une entrée',
  [BrightPassStrings.EntryForm_Title_Edit]: "Modifier l'entrée",
  [BrightPassStrings.EntryForm_FieldTitle]: 'Titre',
  [BrightPassStrings.EntryForm_FieldNotes]: 'Notes',
  [BrightPassStrings.EntryForm_FieldTags]:
    'Étiquettes (séparées par des virgules)',
  [BrightPassStrings.EntryForm_FieldFavorite]: 'Favori',
  [BrightPassStrings.EntryForm_Save]: 'Enregistrer',
  [BrightPassStrings.EntryForm_Cancel]: 'Annuler',
  [BrightPassStrings.EntryForm_GeneratePassword]: 'Générer',
  [BrightPassStrings.EntryForm_TotpSecretHelp]:
    'Entrez un secret base32 ou une URI otpauth://',

  // SearchBar
  [BrightPassStrings.SearchBar_Placeholder]:
    'Rechercher par titre, étiquettes ou URL\u2026',
  [BrightPassStrings.SearchBar_FilterFavorites]: 'Favoris',
  [BrightPassStrings.SearchBar_NoResults]: 'Aucune entrée correspondante',

  // Emergency Access Dialog
  [BrightPassStrings.Emergency_Title]: "Accès d'urgence",
  [BrightPassStrings.Emergency_Configure]: 'Configurer',
  [BrightPassStrings.Emergency_Recover]: 'Récupérer',
  [BrightPassStrings.Emergency_Threshold]:
    'Seuil (nombre minimum de mandataires requis)',
  [BrightPassStrings.Emergency_Trustees]:
    'IDs des mandataires (séparés par des virgules)',
  [BrightPassStrings.Emergency_Shares]: 'Part chiffrée {INDEX}',
  [BrightPassStrings.Emergency_InsufficientSharesTemplate]:
    'Parts insuffisantes. Au moins {THRESHOLD} parts sont requises.',
  [BrightPassStrings.Emergency_InvalidThreshold]:
    'Le seuil doit être compris entre 1 et le nombre de mandataires.',
  [BrightPassStrings.Emergency_Close]: 'Fermer',
  [BrightPassStrings.Emergency_Error]:
    'Une erreur est survenue. Veuillez réessayer.',
  [BrightPassStrings.Emergency_Success]: 'Opération terminée avec succès.',

  // Share Dialog
  [BrightPassStrings.Share_Title]: 'Partager le coffre-fort',
  [BrightPassStrings.Share_SearchMembers]:
    'Rechercher des membres par nom ou e-mail',
  [BrightPassStrings.Share_Add]: 'Ajouter',
  [BrightPassStrings.Share_Revoke]: 'Révoquer',
  [BrightPassStrings.Share_CurrentRecipients]: 'Destinataires actuels',
  [BrightPassStrings.Share_NoRecipients]:
    "Ce coffre-fort n'est partagé avec personne.",
  [BrightPassStrings.Share_Close]: 'Fermer',
  [BrightPassStrings.Share_Error]:
    'Une erreur est survenue. Veuillez réessayer.',

  // Import Dialog
  [BrightPassStrings.Import_Title]: 'Importer des entrées',
  [BrightPassStrings.Import_SelectFormat]: 'Sélectionner le format',
  [BrightPassStrings.Import_Upload]: 'Télécharger le fichier',
  [BrightPassStrings.Import_Import]: 'Importer',
  [BrightPassStrings.Import_Close]: 'Fermer',
  [BrightPassStrings.Import_Summary]: "Résumé de l'importation",
  [BrightPassStrings.Import_ImportedTemplate]: '{COUNT} entrées importées avec succès',
  [BrightPassStrings.Import_SkippedTemplate]: '{COUNT} entrées ignorées',
  [BrightPassStrings.Import_ErrorsTemplate]: 'Ligne {INDEX} : {MESSAGE}',
  [BrightPassStrings.Import_InvalidFormat]:
    'Le fichier téléchargé ne correspond pas au format sélectionné.',
  [BrightPassStrings.Import_Error]:
    "Une erreur est survenue lors de l'importation. Veuillez réessayer.",

  // Errors
  [BrightPassStrings.Error_InvalidMasterPassword]:
    'Mot de passe principal invalide.',
  [BrightPassStrings.Error_VaultNotFound]: 'Coffre-fort introuvable.',
  [BrightPassStrings.Error_Unauthorized]:
    "Vous n'êtes pas autorisé à effectuer cette action.",
  [BrightPassStrings.Error_Generic]:
    'Une erreur inattendue est survenue. Veuillez réessayer.',
};
