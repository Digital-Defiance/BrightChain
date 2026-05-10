import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightChatStringKey,
  BrightChatStrings,
} from '../../enumerations/brightChatStrings';

export const BrightChatGermanStrings: ComponentStrings<BrightChatStringKey> = {
  // Menu
  [BrightChatStrings.MenuLabel]: 'BrightChat',
  [BrightChatStrings.ChatSectionsLabel]: 'Chat-Bereiche',
  [BrightChatStrings.Nav_Conversations]: 'Unterhaltungen',
  [BrightChatStrings.Nav_Groups]: 'Gruppen',
  [BrightChatStrings.Nav_Channels]: 'Kanäle',
  [BrightChatStrings.Nav_DirectMessages]: 'Direktnachrichten',

  // Server Rail
  [BrightChatStrings.Server_Rail]: 'Server',
  [BrightChatStrings.Server_Rail_Home]: 'Startseite',
  [BrightChatStrings.Server_Rail_CreateServer]: 'Server erstellen',

  // Create Server Dialog
  [BrightChatStrings.Create_Server]: 'Server erstellen',
  [BrightChatStrings.Create_Server_Title]: 'Server erstellen',
  [BrightChatStrings.Create_Server_NameLabel]: 'Servername',
  [BrightChatStrings.Create_Server_NamePlaceholder]: 'Servername eingeben',
  [BrightChatStrings.Create_Server_IconLabel]: 'Server-Symbol',
  [BrightChatStrings.Create_Server_Submit]: 'Erstellen',
  [BrightChatStrings.Create_Server_Cancel]: 'Abbrechen',

  // Channel Sidebar
  [BrightChatStrings.Channel_Sidebar]: 'Kanäle',
  [BrightChatStrings.Channel_Sidebar_CreateChannel]: 'Kanal erstellen',

  // Create Channel Dialog
  [BrightChatStrings.Create_Channel]: 'Kanal erstellen',
  [BrightChatStrings.Create_Channel_Title]: 'Kanal erstellen',
  [BrightChatStrings.Create_Channel_NameLabel]: 'Kanalname',
  [BrightChatStrings.Create_Channel_TopicLabel]: 'Thema',
  [BrightChatStrings.Create_Channel_CategoryLabel]: 'Kategorie',
  [BrightChatStrings.Create_Channel_Submit]: 'Erstellen',
  [BrightChatStrings.Create_Channel_Cancel]: 'Abbrechen',

  // Create DM Dialog
  [BrightChatStrings.Create_DM]: 'Neue Nachricht',
  [BrightChatStrings.Create_DM_Title]: 'Neue Direktnachricht',
  [BrightChatStrings.Create_DM_SearchPlaceholder]: 'Benutzer suchen',
  [BrightChatStrings.Create_DM_Submit]: 'Senden',
  [BrightChatStrings.Create_DM_Cancel]: 'Abbrechen',
  [BrightChatStrings.Create_DM_NewMessage]: 'Neue Nachricht',

  // Server Settings Panel
  [BrightChatStrings.Server_Settings]: 'Servereinstellungen',
  [BrightChatStrings.Server_Settings_Title]: 'Servereinstellungen',
  [BrightChatStrings.Server_Settings_Overview]: 'Übersicht',
  [BrightChatStrings.Server_Settings_Members]: 'Mitglieder',
  [BrightChatStrings.Server_Settings_Categories]: 'Kategorien',
  [BrightChatStrings.Server_Settings_Invites]: 'Einladungen',
  [BrightChatStrings.Server_Settings_Save]: 'Änderungen speichern',

  // Channel Context Menu
  [BrightChatStrings.Channel_Edit]: 'Kanal bearbeiten',
  [BrightChatStrings.Channel_Delete]: 'Kanal löschen',
  [BrightChatStrings.Channel_Mute]: 'Kanal stummschalten',

  // Edit Channel Dialog
  [BrightChatStrings.Edit_Channel_Title]: 'Kanal bearbeiten',
  [BrightChatStrings.Edit_Channel_NameLabel]: 'Kanalname',
  [BrightChatStrings.Edit_Channel_TopicLabel]: 'Thema',
  [BrightChatStrings.Edit_Channel_Save]: 'Speichern',
  [BrightChatStrings.Edit_Channel_Cancel]: 'Abbrechen',
  [BrightChatStrings.Edit_Channel_Saving]: 'Speichern…',
  [BrightChatStrings.Edit_Channel_Failed]:
    'Kanal konnte nicht aktualisiert werden',
  [BrightChatStrings.Edit_Channel_NameRequired]: 'Kanalname ist erforderlich',
  [BrightChatStrings.Edit_Channel_NameLength]:
    'Kanalname muss zwischen 2 und 100 Zeichen lang sein',

  // Delete Channel Confirmation
  [BrightChatStrings.Delete_Channel_Title]: 'Kanal löschen',
  [BrightChatStrings.Delete_Channel_Confirm]: 'Löschen',
  [BrightChatStrings.Delete_Channel_Cancel]: 'Abbrechen',
  [BrightChatStrings.Delete_Channel_Deleting]: 'Löschen…',
  [BrightChatStrings.Delete_Channel_Failed]:
    'Kanal konnte nicht gelöscht werden',

  // Presence Status Labels
  [BrightChatStrings.Presence_Online]: 'Online',
  [BrightChatStrings.Presence_Idle]: 'Abwesend',
  [BrightChatStrings.Presence_DoNotDisturb]: 'Nicht stören',
  [BrightChatStrings.Presence_Offline]: 'Offline',
  [BrightChatStrings.Presence_SetStatus]: 'Status festlegen',

  // Breadcrumb Navigation
  [BrightChatStrings.Breadcrumb_BrightChat]: 'BrightChat',
  [BrightChatStrings.Breadcrumb_Conversation]: 'Unterhaltung',
  [BrightChatStrings.Breadcrumb_Group]: 'Gruppe',
  [BrightChatStrings.Breadcrumb_Channel]: 'Kanal',

  // Channel Permissions (Discord-style)
  [BrightChatStrings.Channel_Permissions]: 'Berechtigungen',
  [BrightChatStrings.Channel_Permissions_Title]: 'Kanalberechtigungen',
  [BrightChatStrings.Channel_Permissions_Role]: 'Rolle',
  [BrightChatStrings.Channel_Permissions_SendMessages]: 'Nachrichten senden',
  [BrightChatStrings.Channel_Permissions_ManageChannel]: 'Kanal verwalten',
  [BrightChatStrings.Channel_Permissions_ManageMembers]: 'Mitglieder verwalten',
  [BrightChatStrings.Channel_Permissions_CreateInvites]:
    'Einladungen erstellen',
  [BrightChatStrings.Channel_Permissions_PinMessages]: 'Nachrichten anheften',
  [BrightChatStrings.Channel_Permissions_MuteMembers]:
    'Mitglieder stummschalten',
  [BrightChatStrings.Channel_Permissions_KickMembers]: 'Mitglieder entfernen',
  [BrightChatStrings.Channel_Permissions_DeleteMessages]: 'Nachrichten löschen',

  // Channel Visibility
  [BrightChatStrings.Channel_Visibility_Public]: 'Öffentlich',
  [BrightChatStrings.Channel_Visibility_Private]: 'Privat',
  [BrightChatStrings.Channel_Visibility_Secret]: 'Geheim',
  [BrightChatStrings.Channel_Visibility_Public_Desc]:
    'Jeder kann sehen und beitreten',
  [BrightChatStrings.Channel_Visibility_Private_Desc]: 'Nur mit Einladung',
  [BrightChatStrings.Channel_Visibility_Secret_Desc]:
    'Für Nicht-Mitglieder verborgen',
  [BrightChatStrings.Compose_Placeholder]:
    'Verschlüsselte Nachricht eingeben...',
  [BrightChatStrings.Compose_SendLabel]: 'Nachricht senden',
  [BrightChatStrings.Compose_MessageNotDelivered]:
    'Nachricht konnte nicht zugestellt werden',
  [BrightChatStrings.Compose_SendFailed]:
    'Nachricht konnte nicht gesendet werden',
  [BrightChatStrings.ConversationList_Title]: 'Unterhaltungen',
  [BrightChatStrings.ConversationList_NewMessage]: 'Neue Nachricht',
  [BrightChatStrings.ConversationList_Empty]: 'Noch keine Direktnachrichten.',
  [BrightChatStrings.ConversationList_RecentChannels]: 'Letzte Kanäle',
  [BrightChatStrings.MessageThread_Empty]:
    'Noch keine Nachrichten. Starte die Unterhaltung!',
  [BrightChatStrings.Create_Channel_NamePlaceholder]: 'z.B. allgemein',
  [BrightChatStrings.Create_Channel_TopicPlaceholder]:
    'Worum geht es in diesem Kanal?',
  [BrightChatStrings.Create_Channel_VisibilityLabel]: 'Sichtbarkeit',
  [BrightChatStrings.Create_Channel_NameRequired]: 'Kanalname ist erforderlich',
  [BrightChatStrings.Create_Channel_NameLength]:
    'Kanalname muss zwischen 2 und 100 Zeichen lang sein',
  [BrightChatStrings.Create_Channel_Creating]: 'Erstellen...',
  [BrightChatStrings.Create_Channel_Failed]:
    'Kanal konnte nicht erstellt werden',
  [BrightChatStrings.Create_Channel_CategoryNone]: 'Keine',
  [BrightChatStrings.Server_Settings_ServerNameLabel]: 'Servername',
  [BrightChatStrings.Server_Settings_IconUrlLabel]: 'Symbol-URL',
  [BrightChatStrings.Server_Settings_Saving]: 'Speichern…',
  [BrightChatStrings.Server_Settings_GenerateInvite]: 'Einladung erstellen',
  [BrightChatStrings.Server_Settings_CopyToken]: 'Token kopieren',
  [BrightChatStrings.Server_Settings_Uses]: 'Verwendungen',
  [BrightChatStrings.Server_Settings_NewCategory]: 'Neue Kategorie',
  [BrightChatStrings.Server_Settings_AddCategory]: 'Hinzufügen',
  [BrightChatStrings.Server_Settings_ChannelCount]: 'Kanäle',
  [BrightChatStrings.Server_Settings_RemoveMember]: 'Mitglied entfernen',
  [BrightChatStrings.Server_Settings_DeleteCategory]: 'Kategorie löschen',
  [BrightChatStrings.Server_Settings_DeleteServer]: 'Server löschen',
  [BrightChatStrings.Server_Settings_DeleteServerConfirm]: 'Sind Sie sicher, dass Sie diesen Server löschen möchten? Alle Kanäle und Nachrichten gehen dauerhaft verloren.',
  [BrightChatStrings.Server_Settings_DeleteServerConfirmTitle]: 'Server löschen',
  [BrightChatStrings.DMSidebar_NoConversations]: 'Noch keine Unterhaltungen',
  [BrightChatStrings.DMSidebar_NoGroups]: 'Noch keine Gruppenchats',

  // Encryption
  [BrightChatStrings.Encryption_E2E]: 'Ende-zu-Ende-verschlüsselt',
  [BrightChatStrings.Encryption_E2E_AriaLabel]:
    'Diese Unterhaltung ist Ende-zu-Ende-verschlüsselt',
  [BrightChatStrings.Encryption_EncryptedServer]: 'Verschlüsselter Server',
  [BrightChatStrings.Encryption_ServerEncrypted]: 'Verschlüsselt',

  // Key Rotation
  [BrightChatStrings.KeyRotation_MemberJoined]:
    'Verschlüsselungsschlüssel aktualisiert — ein Mitglied ist beigetreten',
  [BrightChatStrings.KeyRotation_MemberLeft]:
    'Verschlüsselungsschlüssel aktualisiert — ein Mitglied hat die Gruppe verlassen',
  [BrightChatStrings.KeyRotation_MemberRemoved]:
    'Verschlüsselungsschlüssel aktualisiert — ein Mitglied wurde entfernt',

  // Channel List View
  [BrightChatStrings.ChannelList_Title]: 'Kanäle',
  [BrightChatStrings.ChannelList_Empty]: 'Noch keine Kanäle.',
  [BrightChatStrings.ChannelList_Join]: 'Beitreten',
  [BrightChatStrings.ChannelList_Joining]: 'Beitritt…',
  [BrightChatStrings.ChannelList_MemberCount]: 'Mitglied',

  // Group List View
  [BrightChatStrings.GroupList_Title]: 'Gruppen',
  [BrightChatStrings.GroupList_Empty]: 'Noch keine Gruppen.',
  [BrightChatStrings.GroupList_MemberCount]: 'Mitglied',

  // Create Server Dialog extras
  [BrightChatStrings.Create_Server_IconLabelOptional]: 'Symbol-URL (optional)',
  [BrightChatStrings.Create_Server_Creating]: 'Erstellen…',
  [BrightChatStrings.Create_Server_NameRequired]: 'Servername ist erforderlich',
  [BrightChatStrings.Create_Server_NameTooLong]:
    'Servername darf maximal 100 Zeichen lang sein',
  [BrightChatStrings.Create_Server_Failed]:
    'Server konnte nicht erstellt werden',

  // Create DM Dialog extras
  [BrightChatStrings.Create_DM_SearchLabel]: 'Benutzer suchen',
  [BrightChatStrings.Create_DM_SearchHint]: 'Namen eingeben…',
  [BrightChatStrings.Create_DM_NoUsersFound]: 'Keine Benutzer gefunden',
  [BrightChatStrings.Create_DM_SelectUser]:
    'Bitte wählen Sie einen Benutzer aus',
  [BrightChatStrings.Create_DM_Starting]: 'Starten…',
  [BrightChatStrings.Create_DM_StartConversation]: 'Unterhaltung starten',
  [BrightChatStrings.Create_DM_Failed]:
    'Unterhaltung konnte nicht gestartet werden',

  // Channel Permissions Panel
  [BrightChatStrings.Permissions_SelectChannel]:
    'Wählen Sie einen Kanal aus, um Berechtigungen anzuzeigen.',
  [BrightChatStrings.Permissions_PermissionsFor]: 'Berechtigungen für',
  [BrightChatStrings.Permissions_MembersWith]: 'Mitglieder mit',
  [BrightChatStrings.Permissions_NoMembers]:
    'Keine Mitglieder mit dieser Rolle',
  [BrightChatStrings.Permissions_Joined]: 'Beigetreten',
  [BrightChatStrings.Permissions_DeleteOwnMessages]:
    'Eigene Nachrichten löschen',
  [BrightChatStrings.Permissions_DeleteAnyMessage]:
    'Beliebige Nachricht löschen',
  [BrightChatStrings.Permissions_ManageRoles]: 'Rollen verwalten',

  // Roles
  [BrightChatStrings.Role_Owner]: 'Eigentümer',
  [BrightChatStrings.Role_Admin]: 'Administrator',
  [BrightChatStrings.Role_Moderator]: 'Moderator',
  [BrightChatStrings.Role_Member]: 'Mitglied',

  // Channel Sidebar extras
  [BrightChatStrings.Channel_Sidebar_Uncategorized]: 'Unkategorisiert',

  // Message Thread extras
  [BrightChatStrings.MessageThread_Pinned]: 'Angeheftete Nachricht',
  [BrightChatStrings.MessageThread_Edited]: '(bearbeitet)',
  [BrightChatStrings.MessageThread_TypingSingle]: 'tippt…',
  [BrightChatStrings.MessageThread_TypingMultiple]: 'tippen…',

  // Layout
  [BrightChatStrings.Layout_BreadcrumbLabel]: 'BrightChat-Brotkrümelnavigation',
  [BrightChatStrings.Layout_UserProfile]: 'Benutzerprofil',
  [BrightChatStrings.Layout_OpenNavigation]: 'Navigation öffnen',

  // Friends Suggestion Section
  [BrightChatStrings.Friends_SectionTitle]: 'Freunde',

  // Server Icon Upload
  [BrightChatStrings.Server_Icon_Upload]: 'Symbol hochladen',
  [BrightChatStrings.Server_Icon_Change]: 'Symbol ändern',
  [BrightChatStrings.Server_Icon_Remove]: 'Symbol entfernen',
  [BrightChatStrings.Server_Icon_RemoveConfirm]:
    'Möchten Sie das Server-Symbol wirklich entfernen?',
  [BrightChatStrings.Server_Icon_RemoveConfirmTitle]: 'Server-Symbol entfernen',
  [BrightChatStrings.Server_Icon_Uploading]: 'Hochladen…',
  [BrightChatStrings.Server_Icon_UploadFailed]:
    'Symbol konnte nicht hochgeladen werden',
  [BrightChatStrings.Server_Icon_UploadSuccess]:
    'Symbol erfolgreich hochgeladen',
  [BrightChatStrings.Server_Icon_FileTooLarge]:
    'Die Datei ist zu groß. Maximale Größe ist 5 MB.',
  [BrightChatStrings.Server_Icon_InvalidType]:
    'Ungültiger Dateityp. Erlaubte Typen: PNG, JPEG, GIF, WebP.',
  [BrightChatStrings.Server_Icon_CropTitle]: 'Server-Symbol zuschneiden',
  [BrightChatStrings.Server_Icon_CropConfirm]: 'Anwenden',
  [BrightChatStrings.Server_Icon_CropCancel]: 'Abbrechen',
  [BrightChatStrings.Server_Icon_ZoomLabel]: 'Zoom',
  [BrightChatStrings.Server_Icon_PreviewAlt]: 'Vorschau des Server-Symbols',
  [BrightChatStrings.Server_Icon_UploadLabel]: 'Server-Symbol hochladen',
  [BrightChatStrings.Server_Icon_DropOrBrowse]:
    'Bild ablegen oder klicken zum Durchsuchen',
  [BrightChatStrings.Server_Icon_StagingFailed]:
    'Datei konnte nicht für den Upload vorbereitet werden',
  [BrightChatStrings.Server_Icon_StagingExpired]:
    'Die vorbereitete Datei ist abgelaufen. Bitte wählen Sie das Bild erneut aus.',

  // FontAwesome Icon Picker
  [BrightChatStrings.IconPicker_Title]: 'Symbol auswählen',
  [BrightChatStrings.IconPicker_SearchPlaceholder]: 'Symbole suchen...',
  [BrightChatStrings.IconPicker_NoMatchTemplate]:
    'Kein Symbol stimmt mit „{0}" überein',
  [BrightChatStrings.IconPicker_Cancel]: 'Abbrechen',
  [BrightChatStrings.IconPicker_RemoveIcon]: 'Symbol entfernen',
  [BrightChatStrings.IconPicker_CurrentLabel]: 'Aktuell:',
};
