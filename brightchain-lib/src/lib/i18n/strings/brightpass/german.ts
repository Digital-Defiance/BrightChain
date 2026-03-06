import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightPassStringKey,
  BrightPassStrings,
} from '../../../enumerations/brightPassStrings';

export const BrightPassGermanStrings: ComponentStrings<BrightPassStringKey> = {
  // Menu
  [BrightPassStrings.Menu_BrightPass]: 'BrightPass',

  // Vault List
  [BrightPassStrings.VaultList_Title]: 'Tresore',
  [BrightPassStrings.VaultList_CreateVaultName]: 'Tresorname',
  [BrightPassStrings.VaultList_CreateVault]: 'Tresor erstellen',
  [BrightPassStrings.VaultList_DeleteVault]: 'Tresor löschen',
  [BrightPassStrings.VaultList_SharedWithTemplate]: 'Geteilt mit {COUNT} Mitgliedern',
  [BrightPassStrings.VaultList_NoVaults]:
    'Noch keine Tresore. Erstellen Sie einen, um zu beginnen.',

  // Vault Detail
  [BrightPassStrings.VaultDetail_TitleNameTemplate]: 'Tresor: {NAME}',
  [BrightPassStrings.VaultDetail_AddEntry]: 'Eintrag hinzufügen',
  [BrightPassStrings.VaultDetail_LockVault]: 'Tresor sperren',
  [BrightPassStrings.VaultDetail_Search]: 'Einträge durchsuchen…',
  [BrightPassStrings.VaultDetail_NoEntries]:
    'Noch keine Einträge. Fügen Sie einen hinzu, um zu beginnen.',
  [BrightPassStrings.VaultDetail_Favorite]: 'Favorit',
  [BrightPassStrings.VaultDetail_ConfirmLockTitle]: 'Tresor sperren?',
  [BrightPassStrings.VaultDetail_ConfirmLockMessage]:
    'Sie navigieren weg. Möchten Sie den Tresor sperren?',
  [BrightPassStrings.VaultDetail_Cancel]: 'Abbrechen',
  [BrightPassStrings.VaultDetail_Confirm]: 'Sperren',

  // Entry Types
  [BrightPassStrings.EntryType_Login]: 'Anmeldung',
  [BrightPassStrings.EntryType_SecureNote]: 'Sichere Notiz',
  [BrightPassStrings.EntryType_CreditCard]: 'Kreditkarte',
  [BrightPassStrings.EntryType_Identity]: 'Identität',

  // Password Generator
  [BrightPassStrings.PasswordGen_Title]: 'Passwort-Generator',
  [BrightPassStrings.PasswordGen_Length]: 'Länge',
  [BrightPassStrings.PasswordGen_Generate]: 'Generieren',
  [BrightPassStrings.PasswordGen_Copy]: 'Kopieren',
  [BrightPassStrings.PasswordGen_UsePassword]: 'Passwort verwenden',
  [BrightPassStrings.PasswordGen_Strength_Weak]: 'Schwach',
  [BrightPassStrings.PasswordGen_Strength_Fair]: 'Mittel',
  [BrightPassStrings.PasswordGen_Strength_Strong]: 'Stark',
  [BrightPassStrings.PasswordGen_Strength_VeryStrong]: 'Sehr stark',
  [BrightPassStrings.PasswordGen_Uppercase]: 'Großbuchstaben',
  [BrightPassStrings.PasswordGen_Lowercase]: 'Kleinbuchstaben',
  [BrightPassStrings.PasswordGen_Digits]: 'Ziffern',
  [BrightPassStrings.PasswordGen_Symbols]: 'Symbole',
  [BrightPassStrings.PasswordGen_Copied]: 'Kopiert!',
  [BrightPassStrings.PasswordGen_Entropy]: '{BITS} Bit Entropie',

  // TOTP
  [BrightPassStrings.TOTP_Title]: 'TOTP-Authentifikator',
  [BrightPassStrings.TOTP_Code]: 'Aktueller Code',
  [BrightPassStrings.TOTP_CopyCode]: 'Code kopieren',
  [BrightPassStrings.TOTP_Copied]: 'Kopiert!',
  [BrightPassStrings.TOTP_SecondsRemainingTemplate]: '{SECONDS}s verbleibend',
  [BrightPassStrings.TOTP_QrCode]: 'QR-Code',
  [BrightPassStrings.TOTP_SecretUri]: 'Geheimnis-URI',

  // Breach Check
  [BrightPassStrings.Breach_Title]: 'Datenleck-Prüfung',
  [BrightPassStrings.Breach_Check]: 'Auf Datenlecks prüfen',
  [BrightPassStrings.Breach_Password]: 'Zu prüfendes Passwort',
  [BrightPassStrings.Breach_FoundTemplate]:
    'Dieses Passwort wurde in {COUNT} Datenlecks gefunden.',
  [BrightPassStrings.Breach_NotFound]:
    'Dieses Passwort wurde in keinem bekannten Datenleck gefunden.',

  // Audit Log
  [BrightPassStrings.AuditLog_Title]: 'Prüfprotokoll',
  [BrightPassStrings.AuditLog_Timestamp]: 'Zeitstempel',
  [BrightPassStrings.AuditLog_Action]: 'Aktion',
  [BrightPassStrings.AuditLog_Member]: 'Mitglieds-ID',
  [BrightPassStrings.AuditLog_FilterAll]: 'Alle Aktionen',
  [BrightPassStrings.AuditLog_NoEntries]:
    'Keine Prüfprotokolleinträge gefunden.',
  [BrightPassStrings.AuditLog_Error]:
    'Prüfprotokoll konnte nicht geladen werden. Bitte versuchen Sie es erneut.',

  // Breadcrumb Navigation
  [BrightPassStrings.Breadcrumb_BrightPass]: 'BrightPass',
  [BrightPassStrings.Breadcrumb_VaultTemplate]: 'Tresor: {NAME}',
  [BrightPassStrings.Breadcrumb_AuditLog]: 'Prüfprotokoll',
  [BrightPassStrings.Breadcrumb_PasswordGenerator]: 'Passwort-Generator',
  [BrightPassStrings.Breadcrumb_Tools]: 'Werkzeuge',

  // Vault List Dialogs
  [BrightPassStrings.VaultList_ConfirmDelete]: 'Tresor löschen',
  [BrightPassStrings.VaultList_ConfirmDeleteMessageTemplate]:
    'Geben Sie Ihr Master-Passwort ein, um den Tresor "{NAME}" zu löschen. Diese Aktion kann nicht rückgängig gemacht werden.',
  [BrightPassStrings.VaultList_EnterMasterPassword]: 'Master-Passwort eingeben',
  [BrightPassStrings.VaultList_ConfirmMasterPassword]:
    'Master-Passwort bestätigen',
  [BrightPassStrings.VaultList_PasswordsMustMatch]:
    'Master-Passwort und Bestätigung müssen übereinstimmen.',
  [BrightPassStrings.VaultList_Cancel]: 'Abbrechen',
  [BrightPassStrings.VaultList_Confirm]: 'Bestätigen',
  [BrightPassStrings.VaultList_Unlock]: 'Entsperren',
  [BrightPassStrings.VaultList_UnlockVault]: 'Tresor entsperren',

  // Validation Messages
  [BrightPassStrings.Validation_VaultNameMinLengthTemplate]:
    'Der Tresorname muss mindestens {MIN_LENGTH} Zeichen lang sein',
  [BrightPassStrings.Validation_VaultNameMaxLengthTemplate]:
    'Der Tresorname darf höchstens {MAX_LENGTH} Zeichen lang sein',
  [BrightPassStrings.Validation_VaultNameRequired]:
    'Tresorname ist erforderlich',
  [BrightPassStrings.Validation_PasswordMinLengthTemplate]:
    'Das Master-Passwort muss mindestens {MIN_LENGTH} Zeichen lang sein',
  [BrightPassStrings.Validation_PasswordUppercase]:
    'Muss mindestens einen Großbuchstaben enthalten',
  [BrightPassStrings.Validation_PasswordLowercase]:
    'Muss mindestens einen Kleinbuchstaben enthalten',
  [BrightPassStrings.Validation_PasswordNumber]:
    'Muss mindestens eine Zahl enthalten',
  [BrightPassStrings.Validation_PasswordSpecialChar]:
    'Muss mindestens ein Sonderzeichen enthalten',
  [BrightPassStrings.Validation_PasswordRequired]:
    'Master-Passwort ist erforderlich',
  [BrightPassStrings.Validation_ConfirmPasswordRequired]:
    'Bitte bestätigen Sie Ihr Master-Passwort',

  // Entry Detail
  [BrightPassStrings.EntryDetail_Title]: 'Eintragsdetails',
  [BrightPassStrings.EntryDetail_Edit]: 'Bearbeiten',
  [BrightPassStrings.EntryDetail_Delete]: 'Löschen',
  [BrightPassStrings.EntryDetail_ConfirmDelete]: 'Eintrag löschen',
  [BrightPassStrings.EntryDetail_ConfirmDeleteMessage]:
    'Sind Sie sicher, dass Sie diesen Eintrag löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.',
  [BrightPassStrings.EntryDetail_Username]: 'Benutzername',
  [BrightPassStrings.EntryDetail_Password]: 'Passwort',
  [BrightPassStrings.EntryDetail_SiteUrl]: 'Website-URL',
  [BrightPassStrings.EntryDetail_TotpSecret]: 'TOTP-Geheimnis',
  [BrightPassStrings.EntryDetail_Content]: 'Inhalt',
  [BrightPassStrings.EntryDetail_CardholderName]: 'Name des Karteninhabers',
  [BrightPassStrings.EntryDetail_CardNumber]: 'Kartennummer',
  [BrightPassStrings.EntryDetail_ExpirationDate]: 'Ablaufdatum',
  [BrightPassStrings.EntryDetail_CVV]: 'CVV',
  [BrightPassStrings.EntryDetail_FirstName]: 'Vorname',
  [BrightPassStrings.EntryDetail_LastName]: 'Nachname',
  [BrightPassStrings.EntryDetail_Email]: 'E-Mail',
  [BrightPassStrings.EntryDetail_Phone]: 'Telefon',
  [BrightPassStrings.EntryDetail_Address]: 'Adresse',
  [BrightPassStrings.EntryDetail_Notes]: 'Notizen',
  [BrightPassStrings.EntryDetail_Tags]: 'Tags',
  [BrightPassStrings.EntryDetail_CreatedAt]: 'Erstellt',
  [BrightPassStrings.EntryDetail_UpdatedAt]: 'Aktualisiert',
  [BrightPassStrings.EntryDetail_BreachWarningTemplate]:
    'Dieses Passwort wurde in {COUNT} Datenlecks gefunden!',
  [BrightPassStrings.EntryDetail_BreachSafe]:
    'Dieses Passwort wurde in keinem bekannten Datenleck gefunden.',
  [BrightPassStrings.EntryDetail_ShowPassword]: 'Anzeigen',
  [BrightPassStrings.EntryDetail_HidePassword]: 'Verbergen',
  [BrightPassStrings.EntryDetail_Cancel]: 'Abbrechen',

  // Entry Form
  [BrightPassStrings.EntryForm_Title_Create]: 'Eintrag erstellen',
  [BrightPassStrings.EntryForm_Title_Edit]: 'Eintrag bearbeiten',
  [BrightPassStrings.EntryForm_FieldTitle]: 'Titel',
  [BrightPassStrings.EntryForm_FieldNotes]: 'Notizen',
  [BrightPassStrings.EntryForm_FieldTags]: 'Tags (kommagetrennt)',
  [BrightPassStrings.EntryForm_FieldFavorite]: 'Favorit',
  [BrightPassStrings.EntryForm_Save]: 'Speichern',
  [BrightPassStrings.EntryForm_Cancel]: 'Abbrechen',
  [BrightPassStrings.EntryForm_GeneratePassword]: 'Generieren',
  [BrightPassStrings.EntryForm_TotpSecretHelp]:
    'Base32-Geheimnis oder otpauth://-URI eingeben',

  // SearchBar
  [BrightPassStrings.SearchBar_Placeholder]:
    'Nach Titel, Tags oder URL suchen\u2026',
  [BrightPassStrings.SearchBar_FilterFavorites]: 'Favoriten',
  [BrightPassStrings.SearchBar_NoResults]: 'Keine passenden Einträge gefunden',

  // Emergency Access Dialog
  [BrightPassStrings.Emergency_Title]: 'Notfallzugriff',
  [BrightPassStrings.Emergency_Configure]: 'Konfigurieren',
  [BrightPassStrings.Emergency_Recover]: 'Wiederherstellen',
  [BrightPassStrings.Emergency_Threshold]:
    'Schwellenwert (Mindestanzahl erforderlicher Treuhänder)',
  [BrightPassStrings.Emergency_Trustees]: 'Treuhänder-IDs (kommagetrennt)',
  [BrightPassStrings.Emergency_Shares]: 'Verschlüsselter Anteil {INDEX}',
  [BrightPassStrings.Emergency_InsufficientSharesTemplate]:
    'Unzureichende Anteile. Mindestens {THRESHOLD} Anteile sind erforderlich.',
  [BrightPassStrings.Emergency_InvalidThreshold]:
    'Der Schwellenwert muss zwischen 1 und der Anzahl der Treuhänder liegen.',
  [BrightPassStrings.Emergency_Close]: 'Schließen',
  [BrightPassStrings.Emergency_Error]:
    'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
  [BrightPassStrings.Emergency_Success]: 'Vorgang erfolgreich abgeschlossen.',

  // Share Dialog
  [BrightPassStrings.Share_Title]: 'Tresor teilen',
  [BrightPassStrings.Share_SearchMembers]:
    'Mitglieder nach Name oder E-Mail suchen',
  [BrightPassStrings.Share_Add]: 'Hinzufügen',
  [BrightPassStrings.Share_Revoke]: 'Widerrufen',
  [BrightPassStrings.Share_CurrentRecipients]: 'Aktuelle Empfänger',
  [BrightPassStrings.Share_NoRecipients]:
    'Dieser Tresor wird noch mit niemandem geteilt.',
  [BrightPassStrings.Share_Close]: 'Schließen',
  [BrightPassStrings.Share_Error]:
    'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',

  // Import Dialog
  [BrightPassStrings.Import_Title]: 'Einträge importieren',
  [BrightPassStrings.Import_SelectFormat]: 'Format auswählen',
  [BrightPassStrings.Import_Upload]: 'Datei hochladen',
  [BrightPassStrings.Import_Import]: 'Importieren',
  [BrightPassStrings.Import_Close]: 'Schließen',
  [BrightPassStrings.Import_Summary]: 'Import-Zusammenfassung',
  [BrightPassStrings.Import_ImportedTemplate]:
    '{COUNT} Einträge erfolgreich importiert',
  [BrightPassStrings.Import_SkippedTemplate]: '{COUNT} Einträge übersprungen',
  [BrightPassStrings.Import_ErrorsTemplate]: 'Zeile {INDEX}: {MESSAGE}',
  [BrightPassStrings.Import_InvalidFormat]:
    'Die hochgeladene Datei entspricht nicht dem ausgewählten Format.',
  [BrightPassStrings.Import_Error]:
    'Beim Import ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.',

  // Errors
  [BrightPassStrings.Error_InvalidMasterPassword]:
    'Ungültiges Master-Passwort.',
  [BrightPassStrings.Error_VaultNotFound]: 'Tresor nicht gefunden.',
  [BrightPassStrings.Error_Unauthorized]:
    'Sie sind nicht berechtigt, diese Aktion durchzuführen.',
  [BrightPassStrings.Error_Generic]:
    'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
};
