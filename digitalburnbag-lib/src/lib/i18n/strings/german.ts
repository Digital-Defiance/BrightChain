import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  DigitalBurnbagStringKey,
  DigitalBurnbagStrings,
} from '../../enumerations/digitalburnbag-strings';

export const DigitalBurnbagGermanStrings: ComponentStrings<DigitalBurnbagStringKey> =
  {
    [DigitalBurnbagStrings.KeyFeatures_1]:
      'Dateien sicher speichern mit Regeln für automatische Freigabe oder Löschung.',
    [DigitalBurnbagStrings.KeyFeatures_2]:
      'Erstellen Sie „Kanarienvögel", um Ihre digitale oder physische Aktivität zu überwachen.',
    [DigitalBurnbagStrings.KeyFeatures_3]:
      'Aktionen werden basierend auf dem Kanarienstatus ausgelöst (z. B. Inaktivität).',
    [DigitalBurnbagStrings.KeyFeatures_4]:
      'Zwangscodes für sofortige Notfallmaßnahmen.',
    [DigitalBurnbagStrings.SiteDescription]:
      'Dateien sicher speichern mit Regeln für automatische Freigabe oder Löschung basierend auf der Überwachung digitaler und physischer Aktivität.',
    [DigitalBurnbagStrings.SiteTagline]: 'Ihre Daten, Ihre Regeln',
    [DigitalBurnbagStrings.Nav_MyFiles]: 'Meine Dateien',
    [DigitalBurnbagStrings.Nav_SharedWithMe]: 'Mit mir geteilt',
    [DigitalBurnbagStrings.Nav_Favorites]: 'Favoriten',
    [DigitalBurnbagStrings.Nav_Recent]: 'Zuletzt verwendet',
    [DigitalBurnbagStrings.Nav_Trash]: 'Papierkorb',
    [DigitalBurnbagStrings.Nav_Activity]: 'Aktivität',
    [DigitalBurnbagStrings.Nav_Analytics]: 'Analytik',
    [DigitalBurnbagStrings.Nav_Canary]: 'Kanarienvogel',
    [DigitalBurnbagStrings.Nav_Vaults]: 'Tresore',
    [DigitalBurnbagStrings.Nav_FileSections]: 'Dateibereiche',

    // -- Vault Container --
    [DigitalBurnbagStrings.Vault_Title]: 'Tresor-Container',
    [DigitalBurnbagStrings.Vault_CreateNew]: 'Neuer Tresor',
    [DigitalBurnbagStrings.Vault_NameLabel]: 'Tresorname',
    [DigitalBurnbagStrings.Vault_DescriptionLabel]: 'Beschreibung',
    [DigitalBurnbagStrings.Vault_Create]: 'Erstellen',
    [DigitalBurnbagStrings.Vault_Cancel]: 'Abbrechen',
    [DigitalBurnbagStrings.Vault_Empty]: 'Noch keine Tresore',
    [DigitalBurnbagStrings.Vault_EmptyDesc]:
      'Erstellen Sie einen Tresor, um Dateien sicher zu speichern.',
    [DigitalBurnbagStrings.Vault_Files]: 'Dateien',
    [DigitalBurnbagStrings.Vault_Folders]: 'Ordner',
    [DigitalBurnbagStrings.Vault_State]: 'Status',
    [DigitalBurnbagStrings.Vault_SealStatus]: 'Siegelstatus',
    [DigitalBurnbagStrings.Vault_AllPristine]: 'Alle unberührt',
    [DigitalBurnbagStrings.Vault_SomeAccessed]: 'Einige zugegriffen',
    [DigitalBurnbagStrings.Vault_Open]: 'Öffnen',
    [DigitalBurnbagStrings.Vault_Lock]: 'Sperren',
    [DigitalBurnbagStrings.Vault_Destroy]: 'Zerstören',
    [DigitalBurnbagStrings.Vault_CreateFailed]:
      'Tresor konnte nicht erstellt werden',
    [DigitalBurnbagStrings.Vault_LoadFailed]:
      'Tresore konnten nicht geladen werden',
    [DigitalBurnbagStrings.Vault_Created]: 'Tresor erstellt',

    [DigitalBurnbagStrings.FileBrowser_ColName]: 'Name',
    [DigitalBurnbagStrings.FileBrowser_ColSize]: 'Größe',
    [DigitalBurnbagStrings.FileBrowser_ColModified]: 'Geändert',
    [DigitalBurnbagStrings.FileBrowser_ColType]: 'Typ',
    [DigitalBurnbagStrings.FileBrowser_EmptyFolder]: 'Dieser Ordner ist leer',
    [DigitalBurnbagStrings.FileBrowser_SelectAll]: 'Alle auswählen',
    [DigitalBurnbagStrings.FileBrowser_FolderPath]: 'Ordnerpfad',
    [DigitalBurnbagStrings.FileBrowser_Loading]: 'Ordnerinhalt wird geladen',
    [DigitalBurnbagStrings.FileBrowser_TypeFolder]: 'Ordner',
    [DigitalBurnbagStrings.FileBrowser_TypeFile]: 'Datei',
    [DigitalBurnbagStrings.Action_Rename]: 'Umbenennen',
    [DigitalBurnbagStrings.Action_Move]: 'Verschieben',
    [DigitalBurnbagStrings.Action_Copy]: 'Kopieren',
    [DigitalBurnbagStrings.Action_Delete]: 'Löschen',
    [DigitalBurnbagStrings.Action_Share]: 'Teilen',
    [DigitalBurnbagStrings.Action_Download]: 'Herunterladen',
    [DigitalBurnbagStrings.Action_Duplicate]: 'Duplizieren',
    [DigitalBurnbagStrings.Action_History]: 'Verlauf',
    [DigitalBurnbagStrings.Action_Permissions]: 'Berechtigungen',
    [DigitalBurnbagStrings.Action_Preview]: 'Vorschau',
    [DigitalBurnbagStrings.Action_More]: 'Mehr…',
    [DigitalBurnbagStrings.Action_Paste]: 'Einfügen',
    [DigitalBurnbagStrings.Action_UploadNewVersion]: 'Neue Version hochladen',
    [DigitalBurnbagStrings.Action_StorageContract]: 'Speichervertrag',
    [DigitalBurnbagStrings.Action_CopyPathLink]: 'Pfadlink kopieren',
    [DigitalBurnbagStrings.Trash_ColName]: 'Name',
    [DigitalBurnbagStrings.Trash_ColOriginalPath]: 'Ursprünglicher Pfad',
    [DigitalBurnbagStrings.Trash_ColDeleted]: 'Gelöscht',
    [DigitalBurnbagStrings.Trash_ColTimeRemaining]: 'Verbleibende Zeit',
    [DigitalBurnbagStrings.Trash_ColActions]: 'Aktionen',
    [DigitalBurnbagStrings.Trash_Empty]: 'Papierkorb ist leer',
    [DigitalBurnbagStrings.Trash_Restore]: 'Wiederherstellen',
    [DigitalBurnbagStrings.Trash_DeletePermanently]: 'Endgültig löschen',
    [DigitalBurnbagStrings.Trash_Loading]: 'Papierkorb wird geladen',
    [DigitalBurnbagStrings.Trash_Expired]: 'Abgelaufen',
    [DigitalBurnbagStrings.Trash_DaysRemaining]: '{count} Tage',
    [DigitalBurnbagStrings.Trash_HoursRemaining]: '{count} Stunden',
    [DigitalBurnbagStrings.Share_Title]: 'Teilen — {fileName}',
    [DigitalBurnbagStrings.Share_WithUser]: 'Mit einem Benutzer teilen',
    [DigitalBurnbagStrings.Share_EmailLabel]: 'E-Mail',
    [DigitalBurnbagStrings.Share_PermView]: 'Ansehen',
    [DigitalBurnbagStrings.Share_PermEdit]: 'Bearbeiten',
    [DigitalBurnbagStrings.Share_Button]: 'Teilen',
    [DigitalBurnbagStrings.Share_AdvancedOptions]:
      'Erweiterte Freigabeoptionen',
    [DigitalBurnbagStrings.Share_EncryptionMode]: 'Verschlüsselungsmodus',
    [DigitalBurnbagStrings.Share_ServerProxied]: 'Server-Proxy',
    [DigitalBurnbagStrings.Share_ServerProxiedDesc]:
      'Server entschlüsselt im Auftrag des Empfängers. Einfachste Option.',
    [DigitalBurnbagStrings.Share_EphemeralKeyPair]: 'Ephemeres Schlüsselpaar',
    [DigitalBurnbagStrings.Share_EphemeralKeyPairDesc]:
      'Erzeugt ein einmaliges Schlüsselpaar. Der private Schlüssel befindet sich im URL-Fragment.',
    [DigitalBurnbagStrings.Share_RecipientPublicKey]:
      'Öffentlicher Schlüssel des Empfängers',
    [DigitalBurnbagStrings.Share_RecipientPublicKeyDesc]:
      'Verschlüsselt mit dem öffentlichen Schlüssel des Empfängers. Am sichersten für bekannte Empfänger.',
    [DigitalBurnbagStrings.Share_RecipientKeyLabel]:
      'Öffentlicher Schlüssel des Empfängers',
    [DigitalBurnbagStrings.Share_PasswordLabel]: 'Passwort (optional)',
    [DigitalBurnbagStrings.Share_ExpiresAtLabel]: 'Läuft ab am',
    [DigitalBurnbagStrings.Share_MaxAccessLabel]: 'Maximale Zugriffszahl',
    [DigitalBurnbagStrings.Share_ScopeLabel]: 'Link-Bereich',
    [DigitalBurnbagStrings.Share_ScopeSpecific]: 'Bestimmte Personen',
    [DigitalBurnbagStrings.Share_ScopeOrganization]: 'Organisation',
    [DigitalBurnbagStrings.Share_ScopeAnonymous]: 'Anonym',
    [DigitalBurnbagStrings.Share_BlockDownload]:
      'Download blockieren (nur Vorschau)',
    [DigitalBurnbagStrings.Share_CreateLink]: 'Freigabelink erstellen',
    [DigitalBurnbagStrings.Share_MagnetWarning]:
      'Magnet-URLs sind unwiderruflich. Einmal geteilt, kann jeder mit der URL auf die Datei zugreifen.',
    [DigitalBurnbagStrings.Share_GetMagnetUrl]: 'Magnet-URL abrufen',
    [DigitalBurnbagStrings.Share_Close]: 'Schließen',
    [DigitalBurnbagStrings.Share_Failed]: 'Freigabe fehlgeschlagen',
    [DigitalBurnbagStrings.Share_LinkFailed]: 'Link-Erstellung fehlgeschlagen',
    [DigitalBurnbagStrings.Share_MagnetFailed]:
      'Magnet-URL-Abruf fehlgeschlagen',
    [DigitalBurnbagStrings.Upload_DropOrBrowse]:
      'Dateien hier ablegen oder klicken zum Durchsuchen',
    [DigitalBurnbagStrings.Upload_DropZoneLabel]: 'Datei-Upload-Bereich',
    [DigitalBurnbagStrings.Upload_Failed]: 'Upload fehlgeschlagen',

    // -- Upload New Version --
    [DigitalBurnbagStrings.Upload_NewVersion]: 'Neue Version hochladen',
    [DigitalBurnbagStrings.Upload_NewVersionTitle]: 'Neue Version hochladen',
    [DigitalBurnbagStrings.Upload_NewVersionDesc]:
      'Wählen Sie eine Datei zum Hochladen als neue Version. Die Datei muss vom gleichen Typ wie das Original sein.',
    [DigitalBurnbagStrings.Upload_NewVersionSelect]: 'Datei auswählen',
    [DigitalBurnbagStrings.Upload_NewVersionUploading]:
      'Neue Version wird hochgeladen…',
    [DigitalBurnbagStrings.Upload_NewVersionSuccess]:
      'Neue Version erfolgreich hochgeladen',
    [DigitalBurnbagStrings.Upload_NewVersionFailed]:
      'Hochladen der neuen Version fehlgeschlagen',
    [DigitalBurnbagStrings.Upload_NewVersionMimeTypeMismatch]:
      'Dateityp stimmt nicht überein: erwartet {expected}, erhalten {actual}',

    [DigitalBurnbagStrings.Preview_CloseLabel]: 'Vorschau schließen',
    [DigitalBurnbagStrings.Preview_Download]: 'Herunterladen',
    [DigitalBurnbagStrings.Preview_Close]: 'Schließen',
    [DigitalBurnbagStrings.Preview_TypeLabel]: 'Typ: {mimeType}',
    [DigitalBurnbagStrings.Preview_NotAvailable]:
      'Vorschau für diesen Dateityp nicht verfügbar.',
    [DigitalBurnbagStrings.Preview_VideoNotSupported]:
      'Ihr Browser unterstützt keine Videowiedergabe.',
    [DigitalBurnbagStrings.Preview_LoadFailed]:
      'Inhalt konnte nicht geladen werden',
    [DigitalBurnbagStrings.Bulk_ItemsSelected]: '{count} Elemente ausgewählt',
    [DigitalBurnbagStrings.Bulk_ClearSelection]: 'Auswahl aufheben',
    [DigitalBurnbagStrings.Bulk_Succeeded]: '{count} erfolgreich',
    [DigitalBurnbagStrings.Bulk_Failed]: '{count} fehlgeschlagen',
    [DigitalBurnbagStrings.ACL_ColPrincipal]: 'Prinzipal',
    [DigitalBurnbagStrings.ACL_ColType]: 'Typ',
    [DigitalBurnbagStrings.ACL_ColPermission]: 'Berechtigung',
    [DigitalBurnbagStrings.ACL_ColActions]: 'Aktionen',
    [DigitalBurnbagStrings.ACL_Remove]: 'Entfernen',
    [DigitalBurnbagStrings.ACL_Add]: 'Hinzufügen',
    [DigitalBurnbagStrings.ACL_UserOrGroupPlaceholder]:
      'Benutzer- oder Gruppen-ID',
    [DigitalBurnbagStrings.ACL_InheritedFrom]: 'Geerbt von {source}',
    [DigitalBurnbagStrings.ACL_AdvancedPermissions]:
      'Erweiterte Berechtigungen',
    [DigitalBurnbagStrings.ACL_PermissionFlags]: 'Berechtigungsflags',
    [DigitalBurnbagStrings.ACL_PermissionSetName]:
      'Name des Berechtigungssatzes',
    [DigitalBurnbagStrings.ACL_CreateSet]: 'Satz erstellen',
    [DigitalBurnbagStrings.ACL_CustomSets]:
      'Benutzerdefinierte Berechtigungssätze',
    [DigitalBurnbagStrings.ACL_Mixed]: 'Gemischt',
    [DigitalBurnbagStrings.ACL_MixedTooltip]:
      'Nicht alle ausgewählten Elemente teilen diese Berechtigung',
    [DigitalBurnbagStrings.ACL_ApplyToAll]:
      'Auf alle ausgewählten Elemente anwenden',
    [DigitalBurnbagStrings.ACL_MultiItemTitle]:
      'Berechtigungen — {count} Elemente',
    [DigitalBurnbagStrings.ACL_SaveFailed]:
      'Berechtigungen konnten nicht gespeichert werden',
    [DigitalBurnbagStrings.ACL_Saved]: 'Berechtigungen gespeichert',
    [DigitalBurnbagStrings.Canary_Bindings]: 'Kanarienvogel-Bindungen',
    [DigitalBurnbagStrings.Canary_AddBinding]: 'Bindung hinzufügen',
    [DigitalBurnbagStrings.Canary_ColCondition]: 'Bedingung',
    [DigitalBurnbagStrings.Canary_ColAction]: 'Aktion',
    [DigitalBurnbagStrings.Canary_ColTarget]: 'Ziel',
    [DigitalBurnbagStrings.Canary_ColActions]: 'Aktionen',
    [DigitalBurnbagStrings.Canary_NoBindings]: 'Keine Bindungen konfiguriert',
    [DigitalBurnbagStrings.Canary_DryRun]: 'Testlauf',
    [DigitalBurnbagStrings.Canary_DeleteBinding]: 'Bindung löschen',
    [DigitalBurnbagStrings.Canary_NewBinding]: 'Neue Bindung',
    [DigitalBurnbagStrings.Canary_ProviderLabel]: 'Anbieter',
    [DigitalBurnbagStrings.Canary_TargetIdsLabel]: 'Ziel-IDs (kommagetrennt)',
    [DigitalBurnbagStrings.Canary_NoRecipientList]: 'Keine Empfängerliste',
    [DigitalBurnbagStrings.Canary_CascadeDelayLabel]:
      'Kaskadenverzögerung (Sekunden)',
    [DigitalBurnbagStrings.Canary_Create]: 'Erstellen',
    [DigitalBurnbagStrings.Canary_Cancel]: 'Abbrechen',
    [DigitalBurnbagStrings.Canary_RecipientLists]: 'Empfängerlisten',
    [DigitalBurnbagStrings.Canary_AddList]: 'Liste hinzufügen',
    [DigitalBurnbagStrings.Canary_ColListName]: 'Name',
    [DigitalBurnbagStrings.Canary_ColRecipients]: 'Empfänger',
    [DigitalBurnbagStrings.Canary_NoLists]: 'Keine Empfängerlisten',
    [DigitalBurnbagStrings.Canary_NewList]: 'Neue Empfängerliste',
    [DigitalBurnbagStrings.Canary_ListNameLabel]: 'Listenname',
    [DigitalBurnbagStrings.Canary_RecipientsLabel]:
      'Empfänger (einer pro Zeile: E-Mail, Bezeichnung)',
    [DigitalBurnbagStrings.Canary_DryRunReport]: 'Testlaufbericht',
    [DigitalBurnbagStrings.Canary_AffectedFiles]: 'Betroffene Dateien: {count}',
    [DigitalBurnbagStrings.Canary_RecipientsCount]: 'Empfänger: {count}',
    [DigitalBurnbagStrings.Canary_ActionsLabel]: 'Aktionen:',
    [DigitalBurnbagStrings.Notifications_Label]: 'Benachrichtigungen',
    [DigitalBurnbagStrings.Notifications_Empty]: 'Keine Benachrichtigungen',
    [DigitalBurnbagStrings.Activity_AllOperations]: 'Alle Operationen',
    [DigitalBurnbagStrings.Activity_NoActivity]: 'Keine Aktivität vorhanden',
    [DigitalBurnbagStrings.Activity_OnTarget]: '{actor} auf {target}',
    [DigitalBurnbagStrings.Analytics_StorageUsage]: 'Speichernutzung',
    [DigitalBurnbagStrings.Analytics_UsageSummary]:
      '{used} von {quota} verwendet ({percent} %)',
    [DigitalBurnbagStrings.Analytics_ByFileType]: 'Nach Dateityp',
    [DigitalBurnbagStrings.Analytics_ColCategory]: 'Kategorie',
    [DigitalBurnbagStrings.Analytics_ColFiles]: 'Dateien',
    [DigitalBurnbagStrings.Analytics_ColSize]: 'Größe',
    [DigitalBurnbagStrings.Analytics_LargestItems]: 'Größte Elemente',
    [DigitalBurnbagStrings.Analytics_ColName]: 'Name',
    [DigitalBurnbagStrings.Analytics_ColItemActions]: 'Aktionen',
    [DigitalBurnbagStrings.Analytics_Trash]: 'Papierkorb',
    [DigitalBurnbagStrings.Analytics_StaleFiles]: 'Veraltete Dateien',
    [DigitalBurnbagStrings.Analytics_ColAge]: 'Alter',
    [DigitalBurnbagStrings.Analytics_AgeDays]: '{count} Tage',
    [DigitalBurnbagStrings.Analytics_ScheduleDestroy]: 'Zerstörung planen',
    [DigitalBurnbagStrings.Page_ItemMoved]: 'Element verschoben',
    [DigitalBurnbagStrings.Page_MoveFailed]:
      'Element konnte nicht verschoben werden',
    [DigitalBurnbagStrings.Page_LoadFolderFailed]:
      'Ordner konnte nicht geladen werden',
    [DigitalBurnbagStrings.Page_LoadTrashFailed]:
      'Papierkorb konnte nicht geladen werden',
    [DigitalBurnbagStrings.Page_LoadSharedFailed]:
      'Geteilte Elemente konnten nicht geladen werden',
    [DigitalBurnbagStrings.Page_LoadCanaryFailed]:
      'Kanarienvogel-Konfiguration konnte nicht geladen werden',
    [DigitalBurnbagStrings.Page_LoadActivityFailed]:
      'Aktivität konnte nicht geladen werden',
    [DigitalBurnbagStrings.Page_LoadAnalyticsFailed]:
      'Speicheranalytik konnte nicht geladen werden',
    [DigitalBurnbagStrings.Page_LoadPermissionsFailed]:
      'Berechtigungen konnten nicht geladen werden',
    [DigitalBurnbagStrings.Page_DeleteFailed]: 'Löschen fehlgeschlagen',
    [DigitalBurnbagStrings.Page_RenameFailed]: 'Umbenennen fehlgeschlagen',
    [DigitalBurnbagStrings.Page_Renamed]: 'Umbenannt',
    [DigitalBurnbagStrings.Page_ItemsMovedToTrash]:
      '{count} Elemente in den Papierkorb verschoben',
    [DigitalBurnbagStrings.Page_Restored]: '{name} wiederhergestellt',
    [DigitalBurnbagStrings.Page_PermanentlyDeleted]:
      '{name} endgültig gelöscht',
    [DigitalBurnbagStrings.Page_RestoreFailed]:
      'Wiederherstellung fehlgeschlagen',
    [DigitalBurnbagStrings.Page_PermanentDeleteFailed]:
      'Endgültiges Löschen fehlgeschlagen',
    [DigitalBurnbagStrings.Page_BindingCreated]: 'Bindung erstellt',
    [DigitalBurnbagStrings.Page_BindingDeleted]: 'Bindung gelöscht',
    [DigitalBurnbagStrings.Page_RecipientListCreated]:
      'Empfängerliste erstellt',
    [DigitalBurnbagStrings.Page_UserNotFound]: 'Benutzer nicht gefunden',
    [DigitalBurnbagStrings.Page_PathNotFound]:
      'Der Ordnerpfad wurde nicht gefunden. Er wurde möglicherweise verschoben oder gelöscht.',
    [DigitalBurnbagStrings.Page_NoFileSelected]: 'Keine Datei ausgewählt',
    [DigitalBurnbagStrings.Page_UploadFailed]: 'Upload fehlgeschlagen',
    [DigitalBurnbagStrings.Page_ErrorOccurred]: 'Ein Fehler ist aufgetreten',
    [DigitalBurnbagStrings.Page_RenamePrompt]: 'Neuer Name:',

    // -- Phix (Phönix-Zyklus-Umbenennung) --
    [DigitalBurnbagStrings.Phix_Button]: 'Phix',
    [DigitalBurnbagStrings.Phix_Tooltip]:
      'Phönix-Zyklus-Umbenennung: den alten Namen zerstören, mit dem neuen auferstehen',
    [DigitalBurnbagStrings.Phix_Confirm_Title]: 'Phix-Vorgang bestätigen',
    [DigitalBurnbagStrings.Phix_Confirm_MetadataOnly]:
      'Nur Metadaten-Umbenennung. Keine Blöcke werden berührt. Schnell und schmerzlos.',
    [DigitalBurnbagStrings.Phix_Confirm_FullCycle]:
      'Vollständiger Phönix-Zyklus. Daten werden neu verschlüsselt und das Original zerstört. Dies kann eine Weile dauern.',
    [DigitalBurnbagStrings.Phix_Progress]: 'Phix läuft…',
    [DigitalBurnbagStrings.Phix_Complete]:
      'Phix abgeschlossen — aus der Asche auferstanden',
    [DigitalBurnbagStrings.Phix_Failed]: 'Phix fehlgeschlagen',
    [DigitalBurnbagStrings.Phix_Mascot_Tiny]: 'phix-mascot-tiny',
    [DigitalBurnbagStrings.Phix_Mascot_Small]: 'phix-mascot-small',
    [DigitalBurnbagStrings.Phix_Mascot_Medium]: 'phix-mascot-medium',
    [DigitalBurnbagStrings.Phix_Mascot_Large]: 'phix-mascot-large',
    [DigitalBurnbagStrings.Phix_Mascot_Massive]: 'phix-mascot-massive',

    [DigitalBurnbagStrings.Common_Close]: 'Schließen',
    [DigitalBurnbagStrings.Common_Save]: 'Speichern',
    [DigitalBurnbagStrings.Common_Back]: 'Zurück',
    [DigitalBurnbagStrings.Common_Next]: 'Weiter',
    [DigitalBurnbagStrings.Common_Finish]: 'Fertig',
    [DigitalBurnbagStrings.Common_Test]: 'Testen',
    [DigitalBurnbagStrings.Common_Connect]: 'Verbinden',
    [DigitalBurnbagStrings.Common_Disconnect]: 'Trennen',
    [DigitalBurnbagStrings.Common_Retry]: 'Erneut versuchen',
    [DigitalBurnbagStrings.Common_Enable]: 'Aktivieren',
    [DigitalBurnbagStrings.Common_Disable]: 'Deaktivieren',
    [DigitalBurnbagStrings.Common_Loading]: 'Laden...',
    [DigitalBurnbagStrings.Common_Error]: 'Fehler',
    [DigitalBurnbagStrings.Common_Success]: 'Erfolg',

    // -- Provider Registration --
    [DigitalBurnbagStrings.Provider_Title]: 'Kanarienvogel-Anbieter',
    [DigitalBurnbagStrings.Provider_Subtitle]:
      'Verbinden Sie Dienste, um Ihre Aktivität zu überwachen und Sicherheitsaktionen auszulösen',
    [DigitalBurnbagStrings.Provider_MyConnections]: 'Meine Verbindungen',
    [DigitalBurnbagStrings.Provider_AddProvider]: 'Anbieter hinzufügen',
    [DigitalBurnbagStrings.Provider_NoConnections]: 'Keine Anbieter verbunden',
    [DigitalBurnbagStrings.Provider_NoConnectionsDesc]:
      'Verbinden Sie einen Anbieter, um mit der Überwachung Ihrer Aktivität zu beginnen',
    [DigitalBurnbagStrings.Provider_SearchPlaceholder]: 'Anbieter suchen...',
    [DigitalBurnbagStrings.Provider_FilterByCategory]: 'Nach Kategorie filtern',
    [DigitalBurnbagStrings.Provider_AllCategories]: 'Alle Kategorien',
    [DigitalBurnbagStrings.Provider_LastChecked]: 'Zuletzt geprüft: {time}',
    [DigitalBurnbagStrings.Provider_LastActivity]: 'Letzte Aktivität: {time}',
    [DigitalBurnbagStrings.Provider_NeverChecked]: 'Nie geprüft',
    [DigitalBurnbagStrings.Provider_CheckNow]: 'Jetzt prüfen',
    [DigitalBurnbagStrings.Provider_Settings]: 'Einstellungen',
    [DigitalBurnbagStrings.Provider_ViewDetails]: 'Details anzeigen',

    // -- Provider Status --
    [DigitalBurnbagStrings.ProviderStatus_Connected]: 'Verbunden',
    [DigitalBurnbagStrings.ProviderStatus_Pending]: 'Ausstehend',
    [DigitalBurnbagStrings.ProviderStatus_Expired]: 'Abgelaufen',
    [DigitalBurnbagStrings.ProviderStatus_Invalid]: 'Ungültig',
    [DigitalBurnbagStrings.ProviderStatus_Error]: 'Fehler',
    [DigitalBurnbagStrings.ProviderStatus_NotConnected]: 'Nicht verbunden',

    // -- Provider Categories --
    [DigitalBurnbagStrings.ProviderCategory_PlatformNative]: 'Plattform-nativ',
    [DigitalBurnbagStrings.ProviderCategory_PlatformNativeDesc]:
      'Integrierte Check-in-Methoden ohne externe Dienste',
    [DigitalBurnbagStrings.ProviderCategory_HealthFitness]:
      'Gesundheit & Fitness',
    [DigitalBurnbagStrings.ProviderCategory_HealthFitnessDesc]:
      'Fitness-Tracker und Gesundheits-Apps',
    [DigitalBurnbagStrings.ProviderCategory_Developer]: 'Entwickler-Tools',
    [DigitalBurnbagStrings.ProviderCategory_DeveloperDesc]:
      'Code-Repositories und Entwicklerplattformen',
    [DigitalBurnbagStrings.ProviderCategory_Communication]: 'Kommunikation',
    [DigitalBurnbagStrings.ProviderCategory_CommunicationDesc]:
      'Messaging- und Chat-Plattformen',
    [DigitalBurnbagStrings.ProviderCategory_SocialMedia]: 'Soziale Medien',
    [DigitalBurnbagStrings.ProviderCategory_SocialMediaDesc]:
      'Soziale Netzwerke und Content-Plattformen',
    [DigitalBurnbagStrings.ProviderCategory_Productivity]: 'Produktivität',
    [DigitalBurnbagStrings.ProviderCategory_ProductivityDesc]:
      'E-Mail, Kalender und Produktivitäts-Tools',
    [DigitalBurnbagStrings.ProviderCategory_SmartHome]: 'Smart Home',
    [DigitalBurnbagStrings.ProviderCategory_SmartHomeDesc]:
      'IoT-Geräte und Hausautomation',
    [DigitalBurnbagStrings.ProviderCategory_Gaming]: 'Gaming',
    [DigitalBurnbagStrings.ProviderCategory_GamingDesc]:
      'Gaming-Plattformen und -Dienste',
    [DigitalBurnbagStrings.ProviderCategory_Financial]: 'Finanzen',
    [DigitalBurnbagStrings.ProviderCategory_FinancialDesc]:
      'Bank- und Finanzdienstleistungen',
    [DigitalBurnbagStrings.ProviderCategory_Email]: 'E-Mail',
    [DigitalBurnbagStrings.ProviderCategory_EmailDesc]: 'E-Mail-Anbieter',
    [DigitalBurnbagStrings.ProviderCategory_CustomIntegration]:
      'Benutzerdefinierte Integration',
    [DigitalBurnbagStrings.ProviderCategory_CustomIntegrationDesc]:
      'Erstellen Sie Ihre eigene Integration mit jedem Dienst',
    [DigitalBurnbagStrings.ProviderCategory_Location]: 'Standort',
    [DigitalBurnbagStrings.ProviderCategory_LocationDesc]:
      'Standort- und Kartendienste',
    [DigitalBurnbagStrings.ProviderCategory_Entertainment]: 'Unterhaltung',
    [DigitalBurnbagStrings.ProviderCategory_EntertainmentDesc]:
      'Unterhaltungs- und Streaming-Dienste',
    [DigitalBurnbagStrings.ProviderCategory_Other]: 'Sonstige',
    [DigitalBurnbagStrings.ProviderCategory_OtherDesc]: 'Andere Anbieter',

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
    [DigitalBurnbagStrings.ProviderName_CustomWebhook]:
      'Benutzerdefinierter Webhook',
    [DigitalBurnbagStrings.ProviderName_BrightChain]: 'BrightChain-Aktivität',
    [DigitalBurnbagStrings.ProviderName_ManualCheckin]: 'Manueller Check-in',
    [DigitalBurnbagStrings.ProviderName_EmailPing]: 'E-Mail-Check-in',
    [DigitalBurnbagStrings.ProviderName_SmsPing]: 'SMS-Check-in',

    // -- Provider Descriptions --
    [DigitalBurnbagStrings.ProviderDesc_Fitbit]:
      'Verfolgen Sie Schritte, Herzfrequenz und Schlaf als Lebenszeichen',
    [DigitalBurnbagStrings.ProviderDesc_Strava]:
      'Überwachen Sie Ihre Läufe, Radtouren und Workouts',
    [DigitalBurnbagStrings.ProviderDesc_Garmin]:
      'Verfolgen Sie Aktivitäten von Garmin-Geräten',
    [DigitalBurnbagStrings.ProviderDesc_Whoop]:
      'Überwachen Sie Erholungs- und Belastungsdaten',
    [DigitalBurnbagStrings.ProviderDesc_Oura]:
      'Verfolgen Sie Schlaf- und Bereitschaftswerte',
    [DigitalBurnbagStrings.ProviderDesc_GitHub]:
      'Überwachen Sie Commits, Issues und Pull Requests',
    [DigitalBurnbagStrings.ProviderDesc_GitLab]:
      'Überwachen Sie Commits und Merge Requests',
    [DigitalBurnbagStrings.ProviderDesc_Bitbucket]:
      'Überwachen Sie Commits und Pull Requests',
    [DigitalBurnbagStrings.ProviderDesc_Twitter]:
      'Überwachen Sie Tweets und Aktivität',
    [DigitalBurnbagStrings.ProviderDesc_Mastodon]:
      'Überwachen Sie Toots auf jeder Mastodon-Instanz',
    [DigitalBurnbagStrings.ProviderDesc_Bluesky]:
      'Überwachen Sie Posts auf Bluesky',
    [DigitalBurnbagStrings.ProviderDesc_Reddit]:
      'Überwachen Sie Posts und Kommentare',
    [DigitalBurnbagStrings.ProviderDesc_Slack]:
      'Überwachen Sie Präsenz und Aktivitätsstatus',
    [DigitalBurnbagStrings.ProviderDesc_Discord]:
      'Überwachen Sie Präsenz und Aktivität',
    [DigitalBurnbagStrings.ProviderDesc_Telegram]:
      'Überwachen Sie Aktivität über Bot-Integration',
    [DigitalBurnbagStrings.ProviderDesc_Google]:
      'Überwachen Sie Gmail- und Kalender-Aktivität',
    [DigitalBurnbagStrings.ProviderDesc_Notion]:
      'Überwachen Sie Workspace-Aktivität',
    [DigitalBurnbagStrings.ProviderDesc_HomeAssistant]:
      'Überwachen Sie Smart-Home-Aktivität und Präsenz',
    [DigitalBurnbagStrings.ProviderDesc_Steam]:
      'Überwachen Sie Gaming-Aktivität',
    [DigitalBurnbagStrings.ProviderDesc_CustomWebhook]:
      'Integrieren Sie jeden Dienst, der HTTP-Anfragen senden kann',
    [DigitalBurnbagStrings.ProviderDesc_BrightChain]:
      'Überwachen Sie Ihre Aktivität auf dieser Plattform',
    [DigitalBurnbagStrings.ProviderDesc_ManualCheckin]:
      'Bestätigen Sie Ihre Anwesenheit manuell und regelmäßig',
    [DigitalBurnbagStrings.ProviderDesc_EmailPing]:
      'Antworten Sie auf regelmäßige E-Mail-Herausforderungen',
    [DigitalBurnbagStrings.ProviderDesc_SmsPing]:
      'Antworten Sie auf regelmäßige SMS-Herausforderungen',

    // -- Provider Data Access Descriptions --
    [DigitalBurnbagStrings.ProviderDataAccess_Fitbit]:
      'Wir greifen auf Ihre tägliche Aktivitätszusammenfassung (Schritte, aktive Minuten), Herzfrequenzdaten und Schlafprotokolle zu.',
    [DigitalBurnbagStrings.ProviderDataAccess_Strava]:
      'Wir greifen auf Ihren Aktivitäts-Feed zu, um Läufe, Radtouren oder andere Workouts zu erkennen.',
    [DigitalBurnbagStrings.ProviderDataAccess_Garmin]:
      'Wir greifen auf Ihre Garmin-Aktivitätsdaten einschließlich Workouts, Schritte und Gesundheitsmetriken zu.',
    [DigitalBurnbagStrings.ProviderDataAccess_Whoop]:
      'Wir greifen auf Ihre WHOOP-Erholungswerte und Belastungsdaten zu.',
    [DigitalBurnbagStrings.ProviderDataAccess_Oura]:
      'Wir greifen auf Ihre Oura-Schlafdaten und Bereitschaftswerte zu.',
    [DigitalBurnbagStrings.ProviderDataAccess_GitHub]:
      'Wir greifen auf Ihren öffentlichen Aktivitäts-Feed einschließlich Commits, Issues, Pull Requests und Kommentare zu.',
    [DigitalBurnbagStrings.ProviderDataAccess_GitLab]:
      'Wir greifen auf Ihre GitLab-Aktivität einschließlich Commits, Merge Requests und Issues zu.',
    [DigitalBurnbagStrings.ProviderDataAccess_Bitbucket]:
      'Wir greifen auf Ihre Bitbucket-Aktivität einschließlich Commits und Pull Requests zu.',
    [DigitalBurnbagStrings.ProviderDataAccess_Twitter]:
      'Wir greifen auf Ihre letzten Tweets zu, um Ihre fortlaufende Aktivität zu überprüfen.',
    [DigitalBurnbagStrings.ProviderDataAccess_Mastodon]:
      'Wir greifen auf Ihre letzten Toots zu, um Ihre fortlaufende Aktivität zu überprüfen.',
    [DigitalBurnbagStrings.ProviderDataAccess_Bluesky]:
      'Wir greifen auf Ihre letzten Posts zu, um Ihre fortlaufende Aktivität zu überprüfen.',
    [DigitalBurnbagStrings.ProviderDataAccess_Reddit]:
      'Wir greifen auf Ihre letzten Posts und Kommentare zu, um Ihre fortlaufende Aktivität zu überprüfen.',
    [DigitalBurnbagStrings.ProviderDataAccess_Slack]:
      'Wir greifen auf Ihren Slack-Präsenzstatus zu, um zu überprüfen, ob Sie aktiv sind.',
    [DigitalBurnbagStrings.ProviderDataAccess_Discord]:
      'Wir greifen auf Ihren Discord-Präsenzstatus zu, um zu überprüfen, ob Sie aktiv sind.',
    [DigitalBurnbagStrings.ProviderDataAccess_Telegram]:
      'Wir verwenden einen Telegram-Bot, um Check-in-Nachrichten von Ihnen zu empfangen.',
    [DigitalBurnbagStrings.ProviderDataAccess_Google]:
      'Wir greifen auf Ihre Gmail-Nachrichtenzeitstempel (nicht den Inhalt) zu, um aktuelle Aktivität zu überprüfen.',
    [DigitalBurnbagStrings.ProviderDataAccess_Notion]:
      'Wir greifen auf Ihre Notion-Workspace-Aktivität zu, um aktuelle Bearbeitungen zu überprüfen.',
    [DigitalBurnbagStrings.ProviderDataAccess_HomeAssistant]:
      'Wir greifen auf Ihren Home Assistant zu, um Bewegung, Türsensoren und andere Präsenzindikatoren zu erkennen.',
    [DigitalBurnbagStrings.ProviderDataAccess_Steam]:
      'Wir greifen auf Ihr Steam-Profil zu, um aktuelle Gaming-Aktivität zu erkennen.',
    [DigitalBurnbagStrings.ProviderDataAccess_CustomWebhook]:
      'Sie konfigurieren einen externen Dienst, um uns Heartbeat-Webhooks zu senden.',
    [DigitalBurnbagStrings.ProviderDataAccess_BrightChain]:
      'Wir verfolgen automatisch Ihre Anmeldungen, Dateizugriffe und andere Aktivitäten auf BrightChain.',
    [DigitalBurnbagStrings.ProviderDataAccess_ManualCheckin]:
      'Sie checken manuell über die App oder Website ein, um zu bestätigen, dass es Ihnen gut geht.',
    [DigitalBurnbagStrings.ProviderDataAccess_EmailPing]:
      'Wir senden Ihnen regelmäßige E-Mails mit einem Check-in-Link. Klicken Sie auf den Link zur Bestätigung.',
    [DigitalBurnbagStrings.ProviderDataAccess_SmsPing]:
      'Wir senden Ihnen regelmäßige SMS-Nachrichten. Antworten Sie, um zu bestätigen, dass es Ihnen gut geht.',

    // -- Provider Check Intervals --
    [DigitalBurnbagStrings.ProviderInterval_EveryMinute]: 'Jede Minute',
    [DigitalBurnbagStrings.ProviderInterval_Every5Minutes]: 'Alle 5 Minuten',
    [DigitalBurnbagStrings.ProviderInterval_Every15Minutes]: 'Alle 15 Minuten',
    [DigitalBurnbagStrings.ProviderInterval_Every30Minutes]: 'Alle 30 Minuten',
    [DigitalBurnbagStrings.ProviderInterval_EveryHour]: 'Stündlich',
    [DigitalBurnbagStrings.ProviderInterval_Every2Hours]: 'Alle 2 Stunden',
    [DigitalBurnbagStrings.ProviderInterval_Every4Hours]: 'Alle 4 Stunden',
    [DigitalBurnbagStrings.ProviderInterval_Daily]: 'Täglich',
    [DigitalBurnbagStrings.ProviderInterval_Weekly]: 'Wöchentlich',
    [DigitalBurnbagStrings.ProviderInterval_BiWeekly]: 'Alle zwei Wochen',
    [DigitalBurnbagStrings.ProviderInterval_Monthly]: 'Monatlich',
    [DigitalBurnbagStrings.ProviderInterval_Manual]: 'Manueller Check-in',
    [DigitalBurnbagStrings.ProviderInterval_Automatic]: 'Automatisch',
    [DigitalBurnbagStrings.ProviderInterval_Custom]: 'Benutzerdefiniert',

    // -- Registration Wizard --
    [DigitalBurnbagStrings.Wizard_SelectProvider]: 'Anbieter auswählen',
    [DigitalBurnbagStrings.Wizard_SelectProviderDesc]:
      'Wählen Sie einen Dienst zur Aktivitätsüberwachung',
    [DigitalBurnbagStrings.Wizard_ReviewPermissions]: 'Berechtigungen prüfen',
    [DigitalBurnbagStrings.Wizard_ReviewPermissionsDesc]:
      'Überprüfen Sie, auf welche Daten wir von diesem Anbieter zugreifen',
    [DigitalBurnbagStrings.Wizard_ConfigureAbsence]:
      'Abwesenheitserkennung konfigurieren',
    [DigitalBurnbagStrings.Wizard_ConfigureAbsenceDesc]:
      'Legen Sie fest, wie lange Inaktivität Ihren Sicherheitsschalter auslöst',
    [DigitalBurnbagStrings.Wizard_ConfigureDuress]:
      'Zwangserkennung konfigurieren',
    [DigitalBurnbagStrings.Wizard_ConfigureDuressDesc]:
      'Richten Sie Schlüsselwörter oder Muster ein, die auf Zwang hinweisen',
    [DigitalBurnbagStrings.Wizard_Authorize]: 'Autorisieren',
    [DigitalBurnbagStrings.Wizard_AuthorizeDesc]:
      'Gewähren Sie Zugriff auf Ihr Konto bei diesem Anbieter',
    [DigitalBurnbagStrings.Wizard_EnterApiKey]: 'API-Schlüssel eingeben',
    [DigitalBurnbagStrings.Wizard_EnterApiKeyDesc]:
      'Geben Sie Ihren API-Schlüssel ein, um diesen Anbieter zu verbinden',
    [DigitalBurnbagStrings.Wizard_ConfigureWebhook]: 'Webhook konfigurieren',
    [DigitalBurnbagStrings.Wizard_ConfigureWebhookDesc]:
      'Richten Sie einen Webhook ein, um Aktivitätsupdates zu empfangen',
    [DigitalBurnbagStrings.Wizard_TestConnection]: 'Verbindung testen',
    [DigitalBurnbagStrings.Wizard_TestConnectionDesc]:
      'Überprüfen Sie, ob die Verbindung korrekt funktioniert',
    [DigitalBurnbagStrings.Wizard_Complete]: 'Abgeschlossen',
    [DigitalBurnbagStrings.Wizard_CompleteDesc]:
      'Anbieter erfolgreich verbunden',

    // -- Absence Configuration --
    [DigitalBurnbagStrings.Absence_ThresholdLabel]: 'Abwesenheitsschwelle',
    [DigitalBurnbagStrings.Absence_ThresholdHelp]:
      'Wie lange ohne Aktivität, bevor der Sicherheitsschalter ausgelöst wird',
    [DigitalBurnbagStrings.Absence_GracePeriodLabel]: 'Karenzzeit',
    [DigitalBurnbagStrings.Absence_GracePeriodHelp]:
      'Zusätzliche Zeit nach der Schwelle, bevor Aktionen ausgeführt werden',
    [DigitalBurnbagStrings.Absence_SendWarnings]:
      'Warnbenachrichtigungen senden',
    [DigitalBurnbagStrings.Absence_WarningDaysLabel]: 'Warntage vor Schwelle',
    [DigitalBurnbagStrings.Absence_WarningDaysHelp]:
      'Tage vor der Schwelle, um Warnungen zu senden (kommagetrennt)',
    [DigitalBurnbagStrings.Absence_Days]: 'Tage',
    [DigitalBurnbagStrings.Absence_Hours]: 'Stunden',

    // -- Duress Configuration --
    [DigitalBurnbagStrings.Duress_EnableLabel]: 'Zwangserkennung aktivieren',
    [DigitalBurnbagStrings.Duress_EnableHelp]:
      'Erkennen Sie Notsignale in Ihrer Aktivität (z.B. bestimmte Schlüsselwörter in Commits)',
    [DigitalBurnbagStrings.Duress_KeywordsLabel]: 'Zwangs-Schlüsselwörter',
    [DigitalBurnbagStrings.Duress_KeywordsHelp]:
      'Wörter, die auf Zwang hinweisen, wenn sie in Ihrer Aktivität gefunden werden (kommagetrennt)',
    [DigitalBurnbagStrings.Duress_PatternsLabel]: 'Zwangsmuster',
    [DigitalBurnbagStrings.Duress_PatternsHelp]:
      'Regex-Muster, die auf Zwang hinweisen (eines pro Zeile)',

    // -- API Key Entry --
    [DigitalBurnbagStrings.ApiKey_Label]: 'API-Schlüssel',
    [DigitalBurnbagStrings.ApiKey_Placeholder]:
      'Geben Sie Ihren API-Schlüssel ein',
    [DigitalBurnbagStrings.ApiKey_Help]:
      'Ihr API-Schlüssel wird verschlüsselt und sicher gespeichert',
    [DigitalBurnbagStrings.ApiKey_WhereToFind]:
      'Wo Sie Ihren API-Schlüssel finden',

    // -- Webhook Configuration --
    [DigitalBurnbagStrings.Webhook_UrlLabel]: 'Webhook-URL',
    [DigitalBurnbagStrings.Webhook_UrlHelp]:
      'Konfigurieren Sie diese URL in Ihrem externen Dienst',
    [DigitalBurnbagStrings.Webhook_SecretLabel]: 'Webhook-Geheimnis',
    [DigitalBurnbagStrings.Webhook_SecretHelp]:
      'Verwenden Sie dieses Geheimnis, um Webhook-Anfragen zu signieren',
    [DigitalBurnbagStrings.Webhook_Instructions]:
      'Konfigurieren Sie Ihren Dienst, um POST-Anfragen an die Webhook-URL zu senden',
    [DigitalBurnbagStrings.Webhook_CopyUrl]: 'URL kopieren',
    [DigitalBurnbagStrings.Webhook_CopySecret]: 'Geheimnis kopieren',
    [DigitalBurnbagStrings.Webhook_Copied]: 'In Zwischenablage kopiert',

    // -- Connection Test --
    [DigitalBurnbagStrings.Test_Running]: 'Verbindung wird getestet...',
    [DigitalBurnbagStrings.Test_Success]: 'Verbindung erfolgreich',
    [DigitalBurnbagStrings.Test_Failed]: 'Verbindung fehlgeschlagen',
    [DigitalBurnbagStrings.Test_ResponseTime]: 'Antwortzeit: {ms}ms',
    [DigitalBurnbagStrings.Test_UserInfo]: 'Verbunden als {username}',

    // -- OAuth Flow --
    [DigitalBurnbagStrings.OAuth_Redirecting]: 'Weiterleitung zu {provider}...',
    [DigitalBurnbagStrings.OAuth_WaitingForAuth]: 'Warte auf Autorisierung...',
    [DigitalBurnbagStrings.OAuth_Success]: 'Autorisierung erfolgreich',
    [DigitalBurnbagStrings.OAuth_Failed]: 'Autorisierung fehlgeschlagen',
    [DigitalBurnbagStrings.OAuth_Cancelled]: 'Autorisierung abgebrochen',

    // -- Connection Summary --
    [DigitalBurnbagStrings.Summary_Healthy]: 'Alle Anbieter sind gesund',
    [DigitalBurnbagStrings.Summary_Degraded]:
      'Einige Anbieter benötigen Aufmerksamkeit',
    [DigitalBurnbagStrings.Summary_Critical]:
      'Kritisch: Anbieter fehlgeschlagen',
    [DigitalBurnbagStrings.Summary_None]: 'Keine Anbieter verbunden',
    [DigitalBurnbagStrings.Summary_ConnectedProviders]:
      '{count} Anbieter verbunden',
    [DigitalBurnbagStrings.Summary_NeedsAttention]:
      '{count} benötigen Aufmerksamkeit',
    [DigitalBurnbagStrings.Summary_LastHeartbeat]: 'Letzter Heartbeat: {time}',

    // -- Provider Dashboard --
    [DigitalBurnbagStrings.Nav_Providers]: 'Anbieter',
    [DigitalBurnbagStrings.Dashboard_Title]: 'Anbieter-Dashboard',
    [DigitalBurnbagStrings.Dashboard_HealthBanner]: 'Gesundheitsübersicht',
    [DigitalBurnbagStrings.Dashboard_SignalPresence]: 'Anwesenheit',
    [DigitalBurnbagStrings.Dashboard_SignalAbsence]: 'Abwesenheit',
    [DigitalBurnbagStrings.Dashboard_SignalDuress]: 'Zwang',
    [DigitalBurnbagStrings.Dashboard_SignalCheckFailed]:
      'Prüfung fehlgeschlagen',
    [DigitalBurnbagStrings.Dashboard_SignalInconclusive]: 'Nicht schlüssig',
    [DigitalBurnbagStrings.Dashboard_TimeSinceActivity]:
      'Zeit seit letzter Aktivität',
    [DigitalBurnbagStrings.Detail_StatusHistory]: 'Statusverlauf',
    [DigitalBurnbagStrings.Detail_ConnectionSettings]:
      'Verbindungseinstellungen',
    [DigitalBurnbagStrings.Detail_FilterBySignal]: 'Nach Signal filtern',
    [DigitalBurnbagStrings.Detail_AllSignals]: 'Alle Signale',
    [DigitalBurnbagStrings.Detail_Timeline]: 'Zeitachse',
    [DigitalBurnbagStrings.Detail_NoHistory]: 'Kein Statusverlauf verfügbar',
    [DigitalBurnbagStrings.Binding_BindToProvider]: 'An Anbieter binden',
    [DigitalBurnbagStrings.Binding_SelectProvider]: 'Anbieter auswählen',
    [DigitalBurnbagStrings.Binding_Condition]: 'Bedingung',
    [DigitalBurnbagStrings.Binding_Action]: 'Aktion',
    [DigitalBurnbagStrings.Binding_Targets]: 'Ziele',
    [DigitalBurnbagStrings.Binding_Create]: 'Bindung erstellen',
    [DigitalBurnbagStrings.Binding_ProviderNotConnected]:
      'Dieser Anbieter ist nicht verbunden.',
    [DigitalBurnbagStrings.Binding_FixConnection]: 'Verbindung reparieren',
    [DigitalBurnbagStrings.Binding_DragHint]:
      'Ziehen Sie eine Anbieterkarte auf einen Tresor oder eine Datei',
    [DigitalBurnbagStrings.CustomProvider_Title]:
      'Benutzerdefinierter Anbieter',
    [DigitalBurnbagStrings.CustomProvider_ImportJson]: 'JSON importieren',
    [DigitalBurnbagStrings.CustomProvider_ExportJson]: 'JSON exportieren',
    [DigitalBurnbagStrings.CustomProvider_Name]: 'Anbietername',
    [DigitalBurnbagStrings.CustomProvider_Description]: 'Beschreibung',
    [DigitalBurnbagStrings.CustomProvider_BaseUrl]: 'Basis-URL',
    [DigitalBurnbagStrings.CustomProvider_Category]: 'Kategorie',
    [DigitalBurnbagStrings.CustomProvider_AuthType]: 'Authentifizierungstyp',
    [DigitalBurnbagStrings.CustomProvider_Endpoints]: 'Endpunkte',
    [DigitalBurnbagStrings.CustomProvider_ResponseMapping]: 'Antwortzuordnung',
    [DigitalBurnbagStrings.CustomProvider_Save]: 'Anbieter speichern',
    // -- Encryption & Access Indicators --
    [DigitalBurnbagStrings.Encryption_AES256]: 'AES-256',
    [DigitalBurnbagStrings.Encryption_Encrypted]: 'Verschlüsselt',
    [DigitalBurnbagStrings.Encryption_EncryptedTooltip]:
      'Diese Datei ist mit AES-256-GCM verschlüsselt. Nur autorisierte Schlüsselinhaber können sie entschlüsseln.',
    [DigitalBurnbagStrings.Encryption_KeyWrapped]: 'Schlüssel umhüllt',
    [DigitalBurnbagStrings.Encryption_KeyWrappedTooltip]:
      'Ihr Entschlüsselungsschlüssel ist unter Ihrem persönlichen ECIES-Schlüsselpaar umhüllt.',
    [DigitalBurnbagStrings.Encryption_ApprovalProtected]: 'Quorum',
    [DigitalBurnbagStrings.Encryption_ApprovalTooltip]:
      'Diese Datei erfordert eine Quorum-Genehmigung für sensible Operationen.',
    [DigitalBurnbagStrings.Access_OnlyYou]: 'Nur Sie',
    [DigitalBurnbagStrings.Access_SharedWith]: 'Geteilt mit',
    [DigitalBurnbagStrings.Access_SharedWithCount]:
      'Geteilt mit {count} Personen',
    [DigitalBurnbagStrings.Access_ViewAll]: 'Alle Zugriffe anzeigen',
    [DigitalBurnbagStrings.Vault_EncryptionLabel]: 'Verschlüsselung',
    [DigitalBurnbagStrings.Vault_AllEncrypted]: 'Alle Dateien verschlüsselt',
    [DigitalBurnbagStrings.Vault_AllEncryptedDesc]:
      'Jede Datei in diesem Tresor ist mit AES-256-GCM verschlüsselt.',
    [DigitalBurnbagStrings.FileBrowser_ColAccess]: 'Zugriff',
    [DigitalBurnbagStrings.FileBrowser_ColSecurity]: 'Sicherheit',

    // -- Friends Sharing --
    [DigitalBurnbagStrings.Friends_SectionTitle]: 'Freunde',
    [DigitalBurnbagStrings.Friends_ShareWithAll]: 'Mit Freunden teilen',

    // -- Vault-Sichtbarkeit / Öffentliche Vaults --
    [DigitalBurnbagStrings.Vault_VisibilityLabel]: 'Sichtbarkeit',
    [DigitalBurnbagStrings.Vault_Visibility_Private]: 'Privat',
    [DigitalBurnbagStrings.Vault_Visibility_PrivateDesc]:
      'Nur Personen, mit denen Sie explizit teilen, können auf diesen Vault zugreifen.',
    [DigitalBurnbagStrings.Vault_Visibility_Unlisted]: 'Nicht gelistet',
    [DigitalBurnbagStrings.Vault_Visibility_UnlistedDesc]:
      'Jeder mit dem Link kann zugreifen, aber er erscheint nicht in der Suche oder im öffentlichen Entdeckungs-Feed.',
    [DigitalBurnbagStrings.Vault_Visibility_Public]: 'Öffentlich',
    [DigitalBurnbagStrings.Vault_Visibility_PublicDesc]:
      'Jeder kann diesen Vault entdecken und darauf zugreifen. Beliebte öffentliche Vaults können kostenlose Replikations-Upgrades vom Netzwerk erhalten.',
    [DigitalBurnbagStrings.Vault_Public_PopularityLabel]: 'Popularität',
    [DigitalBurnbagStrings.Vault_Public_ReplicationBonus]:
      'Replikationsbonus aktiv',
    [DigitalBurnbagStrings.Vault_Public_ReplicationBonusDesc]:
      'Dieser Vault ist beliebt genug, damit das Netzwerk seine Redundanz automatisch ohne zusätzliche Kosten erhöht.',
    [DigitalBurnbagStrings.Vault_Public_DiscoveryNote]:
      'Öffentliche Vaults werden im Digital Burnbag-Entdeckungs-Feed indexiert und können mit der Zeit an Popularität gewinnen.',
    [DigitalBurnbagStrings.File_Visibility_Override]:
      'Sichtbarkeits-Override für Datei',
    [DigitalBurnbagStrings.File_Visibility_InheritedFrom]:
      'Vom Vault geerbt ({visibility})',
    [DigitalBurnbagStrings.ACL_PublicPrincipalLabel]: 'Öffentlich (jeder)',
    [DigitalBurnbagStrings.ACL_PublicPrincipalDesc]:
      'Gewährt jedem Besucher Zugriff ohne Authentifizierung.',

    // -- Joule Upload / Storage Cost --
    [DigitalBurnbagStrings.Joule_BurnDateTooltip]: 'Vernichtungsdatum gesetzt',
    [DigitalBurnbagStrings.Joule_BurnDateChipLabel]: 'Vernichtung am {date}',
    [DigitalBurnbagStrings.Joule_BurnDateActive]:
      'Stufe „Vernichtung ausstehend" — Datei wird kryptografisch gelöscht',
    [DigitalBurnbagStrings.Joule_ExpiryReleaseNote]:
      'Nach {durationDays} Tag{daySuffix} endet Ihr vorausbezahlter Speicher. Ohne Vernichtungsdatum wird die Datei ans Netzwerk übergeben — die Community kann sie verlängern oder sie wird schließlich entfernt.',
    [DigitalBurnbagStrings.Joule_RsDisplayText]:
      'RS({rsK},{rsM}) · {overhead} Überhang · toleriert {rsM} Knotenausfall{failureSuffix}',
    [DigitalBurnbagStrings.Joule_RsDisplayAriaLabel]:
      'Reed-Solomon RS({rsK},{rsM}), {overhead} Überhang, toleriert {rsM} Knotenausfall{failureSuffix}',
    [DigitalBurnbagStrings.Joule_StorageCostPreviewRegion]:
      'Speicherkostenvorschau',
    [DigitalBurnbagStrings.Joule_UpfrontLabel]:
      'Vorauszahlung ({durationDays} Tag{daySuffix})',
    [DigitalBurnbagStrings.Joule_UpfrontAriaLabel]: 'Vorauszahlung: {amount}',
    [DigitalBurnbagStrings.Joule_DailyCharge]: 'Tägliche Gebühr',
    [DigitalBurnbagStrings.Joule_DailyAriaLabel]:
      'Tägliche Gebühr: {amount} pro Tag',
    [DigitalBurnbagStrings.Joule_DailyPerDay]: '{amount} / Tag',
    [DigitalBurnbagStrings.Joule_InsufficientBalance]:
      'Guthaben unzureichend — verfügbar: {balance}',
    [DigitalBurnbagStrings.Joule_UnableToCalculateCost]:
      'Kosten können nicht berechnet werden',
    [DigitalBurnbagStrings.Joule_StorageDurationTitle]: 'Speicherdauer',
    [DigitalBurnbagStrings.Joule_DurationPresetsAriaLabel]:
      'Vorgaben für Dauer',
    [DigitalBurnbagStrings.Joule_DurationPresetDays]: '{count} Tage',
    [DigitalBurnbagStrings.Joule_DurationPreset1Year]: '1 Jahr',
    [DigitalBurnbagStrings.Joule_DurationPresetAriaLabel]: '{count} Tage',
    [DigitalBurnbagStrings.Joule_DurationCustomLabel]:
      'Benutzerdefiniert (Tage)',
    [DigitalBurnbagStrings.Joule_DurationCustomAriaLabel]:
      'Benutzerdefinierte Dauer in Tagen',
    [DigitalBurnbagStrings.Joule_StorageTierTitle]: 'Speicherstufe',
    [DigitalBurnbagStrings.Joule_StorageTierAriaLabel]:
      'Auswahl der Speicherstufe',
    [DigitalBurnbagStrings.Joule_TierCostVsStandard]:
      '{multiplier} der Standardkosten',
    [DigitalBurnbagStrings.Joule_Tier_Performance]: 'Performance',
    [DigitalBurnbagStrings.Joule_Tier_Standard]: 'Standard',
    [DigitalBurnbagStrings.Joule_Tier_Archive]: 'Archiv',
    [DigitalBurnbagStrings.Joule_Tier_PendingBurn]: 'Vernichtung ausstehend',
    [DigitalBurnbagStrings.Joule_Tier_None]: 'Ohne Redundanz',
    [DigitalBurnbagStrings.Joule_FormAriaLabel]:
      'Upload-Konfigurationsformular',
    [DigitalBurnbagStrings.Joule_BurnDateCheckboxLabel]:
      'Vernichtungsdatum festlegen',
    [DigitalBurnbagStrings.Joule_BurnDateCheckboxAriaLabel]:
      'Vernichtungsdatum aktivieren',
    [DigitalBurnbagStrings.Joule_ContinueButton]: 'Weiter',
    [DigitalBurnbagStrings.Joule_ContinueButtonAriaLabel]:
      'Weiter zur Upload-Kostenprüfung',
    [DigitalBurnbagStrings.Joule_InitUploadFailed]:
      'Upload-Sitzung konnte nicht initialisiert werden.',
    [DigitalBurnbagStrings.Joule_ModalTitle]: 'Speichergebühren bestätigen',
    [DigitalBurnbagStrings.Joule_LoadingAriaLabel]:
      'Kostenvoranschlag wird geladen',
    [DigitalBurnbagStrings.Joule_QuoteExpired]:
      'Angebot abgelaufen — bitte erneut hochladen, um einen neuen Kostenvoranschlag zu erstellen.',
    [DigitalBurnbagStrings.Joule_ModalInsufficientBalance]:
      'Guthaben unzureichend — Vorauszahlung übersteigt Ihr verfügbares Joule-Guthaben ({balance}).',
    [DigitalBurnbagStrings.Joule_ErasureCodingLabel]: 'Löschen-Codierung',
    [DigitalBurnbagStrings.Joule_ErasureCodingValue]:
      'RS({rsK},{rsM}) · {overheadDisplay} Überhang',
    [DigitalBurnbagStrings.Joule_QuoteExpiresIn]: 'Angebot läuft ab in',
    [DigitalBurnbagStrings.Joule_QuoteExpiresInAriaLabel]:
      'Angebot läuft in {seconds} Sekunden ab',
    [DigitalBurnbagStrings.Joule_QuoteSeconds]: '{seconds}s',
    [DigitalBurnbagStrings.Joule_QuoteProgressAriaLabel]:
      'Verbleibende Zeit bis zum Ablauf des Angebots',
    [DigitalBurnbagStrings.Joule_CancelButton]: 'Abbrechen',
    [DigitalBurnbagStrings.Joule_CancelButtonAriaLabel]:
      'Upload abbrechen und Sitzung verwerfen',
    [DigitalBurnbagStrings.Joule_ConfirmButton]: 'Upload bestätigen',
    [DigitalBurnbagStrings.Joule_ConfirmButtonAriaLabel]:
      'Upload bestätigen und Joule-Guthaben abziehen',
    [DigitalBurnbagStrings.Joule_FetchQuoteFailed]:
      'Angebot konnte nicht abgerufen werden.',
    [DigitalBurnbagStrings.Joule_CommitFailed]:
      'Bestätigung fehlgeschlagen. Bitte erneut versuchen.',

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
