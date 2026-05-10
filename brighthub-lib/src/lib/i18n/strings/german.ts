import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightHubStringKey,
  BrightHubStrings,
} from '../../enumerations/brightHubStrings';

export const BrightHubGermanStrings: ComponentStrings<BrightHubStringKey> = {
  // PostCard
  [BrightHubStrings.PostCard_Reposted]: 'Geteilt',
  [BrightHubStrings.PostCard_Edited]: 'Bearbeitet',
  [BrightHubStrings.PostCard_HubRestricted]: 'Nur für Hub-Mitglieder sichtbar',
  [BrightHubStrings.PostCard_Deleted]: 'Dieser Beitrag wurde gelöscht.',
  [BrightHubStrings.PostCard_ReplyAriaTemplate]: 'Antworten, {COUNT} Antworten',
  [BrightHubStrings.PostCard_RepostAriaTemplate]: 'Teilen, {COUNT} Teilungen',
  [BrightHubStrings.PostCard_LikeAriaTemplate]: 'Gefällt mir, {COUNT} Likes',
  [BrightHubStrings.PostCard_UnlikeAriaTemplate]:
    'Gefällt mir nicht mehr, {COUNT} Likes',
  [BrightHubStrings.PostCard_PostByAriaTemplate]: 'Beitrag von {NAME}',

  // PostComposer
  [BrightHubStrings.PostComposer_Placeholder]: 'Was gibt es Neues?',
  [BrightHubStrings.PostComposer_ReplyPlaceholder]: 'Ihre Antwort posten',
  [BrightHubStrings.PostComposer_ReplyingTo]: 'Antwort an',
  [BrightHubStrings.PostComposer_CancelReply]: 'Antwort abbrechen',
  [BrightHubStrings.PostComposer_Bold]: 'Fett',
  [BrightHubStrings.PostComposer_Italic]: 'Kursiv',
  [BrightHubStrings.PostComposer_Code]: 'Code',
  [BrightHubStrings.PostComposer_Emoji]: 'Emoji einfügen',
  [BrightHubStrings.PostComposer_AttachImage]: 'Bild anhängen',
  [BrightHubStrings.PostComposer_RemoveAttachmentTemplate]:
    'Anhang {INDEX} entfernen',
  [BrightHubStrings.PostComposer_AttachmentAltTemplate]: 'Anhang {INDEX}',
  [BrightHubStrings.PostComposer_VisibleTo]: 'Sichtbar für',
  [BrightHubStrings.PostComposer_VisibilityPublic]: 'Öffentlich',
  [BrightHubStrings.PostComposer_VisibilityFollowersOnly]: 'Nur Follower',
  [BrightHubStrings.PostComposer_VisibilityFriendsOnly]: 'Nur Freunde',
  [BrightHubStrings.PostComposer_VisibilityHubOnly]: 'Nur Hub-Mitglieder',
  [BrightHubStrings.PostComposer_MembersTemplate]: '{COUNT} Mitglieder',
  [BrightHubStrings.PostComposer_SubmitPost]: 'Beitrag absenden',
  [BrightHubStrings.PostComposer_Post]: 'Posten',
  [BrightHubStrings.PostComposer_Reply]: 'Antworten',
  [BrightHubStrings.PostComposer_Preview]: 'Vorschau',
  [BrightHubStrings.PostComposer_PreviewAriaLabel]: 'Beitragsvorschau',
  [BrightHubStrings.PostComposer_MarkupHelp]: 'Formatierungshilfe',
  [BrightHubStrings.PostComposer_MarkupHelpAriaLabel]:
    'Formatierungs- und Markup-Referenz für Beiträge',
  [BrightHubStrings.PostComposer_MarkupHelpClose]: 'Schließen',
  [BrightHubStrings.PostComposer_MarkupHelpTabPost]: 'Beitragsformatierung',
  [BrightHubStrings.PostComposer_MarkupHelpTabIcons]: 'Icon-Markup',
  [BrightHubStrings.PostComposer_ImageLimitReached]:
    'Maximal 20 Bilder pro Beitrag',
  [BrightHubStrings.PostComposer_ImageUploadFailed]:
    'Bild-Upload fehlgeschlagen',
  [BrightHubStrings.PostComposer_Uploading]: 'Wird hochgeladen...',
  [BrightHubStrings.PostComposer_InsertImage]: 'Bild einfügen',
  [BrightHubStrings.PostComposer_RemoveAttachment]: 'Anhang entfernen',
  [BrightHubStrings.PostComposer_AttachmentLimitReached]:
    'Maximal 4 Anhänge pro Beitrag',
  [BrightHubStrings.PostComposer_EditAltText]: 'Alternativtext bearbeiten',
  [BrightHubStrings.PostComposer_AltText]: 'Alternativtext',
  [BrightHubStrings.PostComposer_Save]: 'Speichern',
  [BrightHubStrings.PostComposer_Cancel]: 'Abbrechen',
  [BrightHubStrings.PostComposer_InsertIcon]: 'Symbol einfügen',
  [BrightHubStrings.PostComposer_IconSearchPlaceholder]: 'Symbole suchen...',
  [BrightHubStrings.PostComposer_IconNoMatchTemplate]:
    'Kein Symbol stimmt mit \u201e{0}\u201c überein',
  [BrightHubStrings.PostComposer_IconStyleOptions]: 'Stiloptionen',
  [BrightHubStrings.PostComposer_IconColor]: 'Farbe',
  [BrightHubStrings.PostComposer_IconColorNone]: 'Keine',
  [BrightHubStrings.PostComposer_IconAnimation]: 'Animation',
  [BrightHubStrings.PostComposer_IconAnimationNone]: 'Keine',
  [BrightHubStrings.PostComposer_IconRotation]: 'Drehung',
  [BrightHubStrings.PostComposer_IconRotationNone]: 'Keine',
  [BrightHubStrings.PostComposer_IconSize]: 'Größe',
  [BrightHubStrings.PostComposer_IconSizeDefault]: 'Standard',
  [BrightHubStrings.PostComposer_IconPreview]: 'Vorschau',

  // ImageCropDialog
  [BrightHubStrings.ImageCropDialog_Title]: 'Bild zuschneiden',
  [BrightHubStrings.ImageCropDialog_Crop]: 'Zuschneiden',
  [BrightHubStrings.ImageCropDialog_Skip]: 'Original verwenden',
  [BrightHubStrings.ImageCropDialog_Cancel]: 'Abbrechen',
  [BrightHubStrings.ImageCropDialog_ZoomLabel]: 'Zoom',
  [BrightHubStrings.ImageCropDialog_PreviewAlt]: 'Zuschneidevorschau',

  // Timeline
  [BrightHubStrings.Timeline_AriaLabel]: 'Zeitleiste',
  [BrightHubStrings.Timeline_FilteredByTemplate]: 'Gefiltert nach: {LABEL}',
  [BrightHubStrings.Timeline_ClearFilter]: 'Löschen',
  [BrightHubStrings.Timeline_EmptyDefault]:
    'Noch keine Beiträge. Folgen Sie Personen, um deren Beiträge hier zu sehen.',
  [BrightHubStrings.Timeline_LoadingPosts]: 'Beiträge werden geladen',
  [BrightHubStrings.Timeline_AllCaughtUp]: 'Sie sind auf dem neuesten Stand',

  // ThreadView
  [BrightHubStrings.ThreadView_AriaLabel]: 'Diskussionsfaden',
  [BrightHubStrings.ThreadView_ParentDeleted]:
    'Der übergeordnete Beitrag wurde gelöscht',
  [BrightHubStrings.ThreadView_ReplyCountSingular]: '1 Antwort',
  [BrightHubStrings.ThreadView_ReplyCountPluralTemplate]: '{COUNT} Antworten',
  [BrightHubStrings.ThreadView_ParticipantCountSingular]: '1 Teilnehmer',
  [BrightHubStrings.ThreadView_ParticipantCountPluralTemplate]:
    '{COUNT} Teilnehmer',
  [BrightHubStrings.ThreadView_NoReplies]:
    'Noch keine Antworten. Seien Sie der Erste!',

  // FollowButton
  [BrightHubStrings.FollowButton_Follow]: 'Folgen',
  [BrightHubStrings.FollowButton_Following]: 'Folge ich',
  [BrightHubStrings.FollowButton_Unfollow]: 'Entfolgen',

  // LikeButton
  [BrightHubStrings.LikeButton_LikeAriaTemplate]: 'Gefällt mir, {COUNT} Likes',
  [BrightHubStrings.LikeButton_UnlikeAriaTemplate]:
    'Gefällt mir nicht mehr, {COUNT} Likes',

  // RepostButton
  [BrightHubStrings.RepostButton_RepostAriaTemplate]:
    'Teilen, {COUNT} Teilungen',
  [BrightHubStrings.RepostButton_UndoRepostAriaTemplate]:
    'Teilung rückgängig, {COUNT} Teilungen',

  // UserProfileCard
  [BrightHubStrings.UserProfileCard_Verified]: 'Verifiziert',
  [BrightHubStrings.UserProfileCard_ProtectedAccount]: 'Geschütztes Konto',
  [BrightHubStrings.UserProfileCard_ProfileOfTemplate]: 'Profil von {NAME}',
  [BrightHubStrings.UserProfileCard_Following]: 'Folge ich',
  [BrightHubStrings.UserProfileCard_Followers]: 'Follower',
  [BrightHubStrings.UserProfileCard_Friends]: 'Freunde',
  [BrightHubStrings.UserProfileCard_FriendsTab]: 'Freunde',
  [BrightHubStrings.UserProfileCard_FriendsHidden]:
    'Dieser Benutzer hat seine Freundesliste verborgen',
  [BrightHubStrings.UserProfileCard_StrongConnection]: 'Starke Verbindung',
  [BrightHubStrings.UserProfileCard_ModerateConnection]: 'Moderate Verbindung',
  [BrightHubStrings.UserProfileCard_WeakConnection]: 'Schwache Verbindung',
  [BrightHubStrings.UserProfileCard_DormantConnection]: 'Ruhende Verbindung',
  [BrightHubStrings.UserProfileCard_MutualConnectionSingular]:
    '1 gemeinsame Verbindung',
  [BrightHubStrings.UserProfileCard_MutualConnectionPluralTemplate]:
    '{COUNT} gemeinsame Verbindungen',

  // ConnectionListManager
  [BrightHubStrings.ConnectionListManager_Title]: 'Verbindungslisten',
  [BrightHubStrings.ConnectionListManager_CreateList]: 'Liste erstellen',
  [BrightHubStrings.ConnectionListManager_EditList]: 'Liste bearbeiten',
  [BrightHubStrings.ConnectionListManager_DeleteList]: 'Liste löschen',
  [BrightHubStrings.ConnectionListManager_DeleteConfirmTemplate]:
    'Möchten Sie „{NAME}" wirklich löschen? Alle Mitglieder werden entfernt.',
  [BrightHubStrings.ConnectionListManager_DeleteConfirmAction]: 'Löschen',
  [BrightHubStrings.ConnectionListManager_Cancel]: 'Abbrechen',
  [BrightHubStrings.ConnectionListManager_Save]: 'Speichern',
  [BrightHubStrings.ConnectionListManager_ListName]: 'Listenname',
  [BrightHubStrings.ConnectionListManager_ListDescription]: 'Beschreibung',
  [BrightHubStrings.ConnectionListManager_Visibility]: 'Sichtbarkeit',
  [BrightHubStrings.ConnectionListManager_VisibilityPrivate]: 'Privat',
  [BrightHubStrings.ConnectionListManager_VisibilityFollowersOnly]:
    'Nur Follower',
  [BrightHubStrings.ConnectionListManager_VisibilityPublic]: 'Öffentlich',
  [BrightHubStrings.ConnectionListManager_MembersTemplate]:
    '{COUNT} Mitglieder',
  [BrightHubStrings.ConnectionListManager_FollowersTemplate]:
    '{COUNT} Follower',
  [BrightHubStrings.ConnectionListManager_EmptyState]:
    'Noch keine Verbindungslisten',
  [BrightHubStrings.ConnectionListManager_EmptyStateHint]:
    'Erstellen Sie eine Liste, um Ihre Verbindungen zu organisieren.',
  [BrightHubStrings.ConnectionListManager_AddMembers]: 'Mitglieder hinzufügen',
  [BrightHubStrings.ConnectionListManager_RemoveMembers]:
    'Mitglieder entfernen',
  [BrightHubStrings.ConnectionListManager_AddMembersTitle]:
    'Mitglieder zur Liste hinzufügen',
  [BrightHubStrings.ConnectionListManager_RemoveMembersTitle]:
    'Mitglieder aus Liste entfernen',
  [BrightHubStrings.ConnectionListManager_UserIdsPlaceholder]:
    'Benutzer-IDs eingeben, eine pro Zeile',
  [BrightHubStrings.ConnectionListManager_Loading]: 'Listen werden geladen…',
  [BrightHubStrings.ConnectionListManager_AriaLabel]:
    'Verbindungslisten-Verwaltung',

  // ConnectionListCard
  [BrightHubStrings.ConnectionListCard_AriaLabel]: 'Verbindungsliste: {NAME}',
  [BrightHubStrings.ConnectionListCard_MembersTemplate]: '{COUNT} Mitglieder',
  [BrightHubStrings.ConnectionListCard_FollowersTemplate]: '{COUNT} Follower',
  [BrightHubStrings.ConnectionListCard_VisibilityPrivate]: 'Privat',
  [BrightHubStrings.ConnectionListCard_VisibilityFollowersOnly]: 'Nur Follower',
  [BrightHubStrings.ConnectionListCard_VisibilityPublic]: 'Öffentlich',
  [BrightHubStrings.ConnectionListCard_CreatedAtTemplate]: 'Erstellt am {DATE}',

  // ConnectionCategorySelector
  [BrightHubStrings.ConnectionCategorySelector_Title]: 'Kategorien',
  [BrightHubStrings.ConnectionCategorySelector_AriaLabel]:
    'Verbindungskategorie-Auswahl',
  [BrightHubStrings.ConnectionCategorySelector_DefaultIndicator]: 'Standard',
  [BrightHubStrings.ConnectionCategorySelector_NoneAvailable]:
    'Keine Kategorien verfügbar',

  // ConnectionNoteEditor
  [BrightHubStrings.ConnectionNoteEditor_Title]: 'Notiz',
  [BrightHubStrings.ConnectionNoteEditor_AriaLabel]: 'Verbindungsnotiz',
  [BrightHubStrings.ConnectionNoteEditor_Placeholder]:
    'Private Notiz zu dieser Verbindung hinzufügen…',
  [BrightHubStrings.ConnectionNoteEditor_EmptyState]:
    'Noch keine Notiz. Fügen Sie eine private Notiz hinzu, um sich an den Kontext dieser Verbindung zu erinnern.',
  [BrightHubStrings.ConnectionNoteEditor_Save]: 'Speichern',
  [BrightHubStrings.ConnectionNoteEditor_Delete]: 'Löschen',
  [BrightHubStrings.ConnectionNoteEditor_Cancel]: 'Abbrechen',
  [BrightHubStrings.ConnectionNoteEditor_DeleteConfirmTitle]: 'Notiz löschen?',
  [BrightHubStrings.ConnectionNoteEditor_DeleteConfirmMessage]:
    'Möchten Sie diese Notiz wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
  [BrightHubStrings.ConnectionNoteEditor_DeleteConfirmAction]: 'Löschen',

  // ConnectionSuggestions
  [BrightHubStrings.ConnectionSuggestions_Title]: 'Vorgeschlagene Verbindungen',
  [BrightHubStrings.ConnectionSuggestions_AriaLabel]: 'Verbindungsvorschläge',
  [BrightHubStrings.ConnectionSuggestions_EmptyState]:
    'Momentan keine Vorschläge. Schauen Sie später wieder vorbei!',
  [BrightHubStrings.ConnectionSuggestions_Loading]:
    'Vorschläge werden geladen…',
  [BrightHubStrings.ConnectionSuggestions_Follow]: 'Folgen',
  [BrightHubStrings.ConnectionSuggestions_Dismiss]: 'Ausblenden',
  [BrightHubStrings.ConnectionSuggestions_MutualCountSingular]:
    '1 gemeinsame Verbindung',
  [BrightHubStrings.ConnectionSuggestions_MutualCountPluralTemplate]:
    '{COUNT} gemeinsame Verbindungen',
  [BrightHubStrings.ConnectionSuggestions_ReasonMutualConnections]:
    'Basierend auf gemeinsamen Verbindungen',
  [BrightHubStrings.ConnectionSuggestions_ReasonSimilarInterests]:
    'Basierend auf ähnlichen Interessen',
  [BrightHubStrings.ConnectionSuggestions_ReasonSimilarToUser]:
    'Ähnlich wie Personen, denen Sie folgen',
  [BrightHubStrings.ConnectionSuggestions_ReasonMutualFriends]:
    'Gemeinsame Freunde',

  // MutualConnections
  [BrightHubStrings.MutualConnections_Title]: 'Gemeinsame Verbindungen',
  [BrightHubStrings.MutualConnections_AriaLabel]: 'Gemeinsame Verbindungen',
  [BrightHubStrings.MutualConnections_Loading]:
    'Gemeinsame Verbindungen werden geladen…',
  [BrightHubStrings.MutualConnections_EmptyState]:
    'Keine gemeinsamen Verbindungen',
  [BrightHubStrings.MutualConnections_CountSingular]: '1 gemeinsame Verbindung',
  [BrightHubStrings.MutualConnections_CountPluralTemplate]:
    '{COUNT} gemeinsame Verbindungen',
  [BrightHubStrings.MutualConnections_LoadMore]: 'Mehr laden',

  // ConnectionStrengthIndicator
  [BrightHubStrings.ConnectionStrengthIndicator_Title]: 'Verbindungsstärke',
  [BrightHubStrings.ConnectionStrengthIndicator_AriaLabel]:
    'Verbindungsstärke-Anzeige',
  [BrightHubStrings.ConnectionStrengthIndicator_Strong]: 'Stark',
  [BrightHubStrings.ConnectionStrengthIndicator_Moderate]: 'Moderat',
  [BrightHubStrings.ConnectionStrengthIndicator_Weak]: 'Schwach',
  [BrightHubStrings.ConnectionStrengthIndicator_Dormant]: 'Ruhend',

  // HubManager
  [BrightHubStrings.HubManager_Title]: 'Hubs',
  [BrightHubStrings.HubManager_AriaLabel]: 'Hub-Verwaltung',
  [BrightHubStrings.HubManager_CreateHub]: 'Hub erstellen',
  [BrightHubStrings.HubManager_EditHub]: 'Hub bearbeiten',
  [BrightHubStrings.HubManager_DeleteHub]: 'Hub löschen',
  [BrightHubStrings.HubManager_HubName]: 'Hub-Name',
  [BrightHubStrings.HubManager_HubDescription]: 'Beschreibung',
  [BrightHubStrings.HubManager_MembersTemplate]: '{COUNT} Mitglieder',
  [BrightHubStrings.HubManager_EmptyState]: 'Noch keine Hubs.',
  [BrightHubStrings.HubManager_EmptyStateHint]:
    'Erstellen Sie einen Hub, um Inhalte mit einer ausgewählten Gruppe von Verbindungen zu teilen.',
  [BrightHubStrings.HubManager_Save]: 'Speichern',
  [BrightHubStrings.HubManager_Cancel]: 'Abbrechen',
  [BrightHubStrings.HubManager_DeleteConfirmTemplate]:
    'Möchten Sie „{NAME}" wirklich löschen? Alle Mitglieder werden entfernt.',
  [BrightHubStrings.HubManager_DeleteConfirmAction]: 'Löschen',
  [BrightHubStrings.HubManager_AddMembers]: 'Mitglieder hinzufügen',
  [BrightHubStrings.HubManager_AddMembersTitle]:
    'Mitglieder zum Hub hinzufügen',
  [BrightHubStrings.HubManager_RemoveMembers]: 'Mitglieder entfernen',
  [BrightHubStrings.HubManager_RemoveMembersTitle]:
    'Mitglieder aus Hub entfernen',
  [BrightHubStrings.HubManager_UserIdsPlaceholder]:
    'Benutzer-IDs eingeben, eine pro Zeile',
  [BrightHubStrings.HubManager_Loading]: 'Hubs werden geladen…',
  [BrightHubStrings.HubManager_DefaultBadge]: 'Standard',

  // HubSelector
  [BrightHubStrings.HubSelector_Title]: 'Beitragssichtbarkeit',
  [BrightHubStrings.HubSelector_AriaLabel]:
    'Hub-Auswahl für Beitragssichtbarkeit',
  [BrightHubStrings.HubSelector_MembersTemplate]: '{COUNT} Mitglieder',
  [BrightHubStrings.HubSelector_NoneAvailable]: 'Keine Hubs verfügbar.',
  [BrightHubStrings.HubSelector_NoneSelected]: 'Für alle Follower sichtbar',
  [BrightHubStrings.HubSelector_SelectedCountTemplate]:
    '{COUNT} Hubs ausgewählt',
  [BrightHubStrings.HubSelector_DefaultBadge]: 'Standard',

  // FollowRequestList
  [BrightHubStrings.FollowRequestList_Title]: 'Folgeanfragen',
  [BrightHubStrings.FollowRequestList_AriaLabel]: 'Ausstehende Folgeanfragen',
  [BrightHubStrings.FollowRequestList_Loading]: 'Folgeanfragen werden geladen…',
  [BrightHubStrings.FollowRequestList_EmptyState]:
    'Keine ausstehenden Folgeanfragen',
  [BrightHubStrings.FollowRequestList_Approve]: 'Genehmigen',
  [BrightHubStrings.FollowRequestList_Reject]: 'Ablehnen',
  [BrightHubStrings.FollowRequestList_PendingCountTemplate]:
    '{COUNT} ausstehende Anfragen',
  [BrightHubStrings.FollowRequestList_PendingCountSingular]:
    '1 ausstehende Anfrage',
  [BrightHubStrings.FollowRequestList_CustomMessage]: 'Nachricht',

  // SearchResults
  [BrightHubStrings.SearchResults_AriaTemplate]: 'Suchergebnisse für „{QUERY}"',
  [BrightHubStrings.SearchResults_TabAll]: 'Alle',
  [BrightHubStrings.SearchResults_TabPosts]: 'Beiträge',
  [BrightHubStrings.SearchResults_TabPostsTemplate]: 'Beiträge ({COUNT})',
  [BrightHubStrings.SearchResults_TabUsers]: 'Benutzer',
  [BrightHubStrings.SearchResults_TabUsersTemplate]: 'Benutzer ({COUNT})',
  [BrightHubStrings.SearchResults_NoResultsTemplate]:
    'Keine Ergebnisse für „{QUERY}"',
  [BrightHubStrings.SearchResults_EnterSearchTerm]:
    'Geben Sie einen Suchbegriff ein, um Beiträge und Personen zu finden',
  [BrightHubStrings.SearchResults_SectionPeople]: 'Personen',
  [BrightHubStrings.SearchResults_SectionPosts]: 'Beiträge',
  [BrightHubStrings.SearchResults_Loading]: 'Suchergebnisse werden geladen',
  [BrightHubStrings.SearchResults_EndOfResults]: 'Ende der Ergebnisse',

  // ConnectionPrivacySettings
  [BrightHubStrings.ConnectionPrivacySettings_Title]:
    'Datenschutzeinstellungen',
  [BrightHubStrings.ConnectionPrivacySettings_AriaLabel]:
    'Datenschutzeinstellungen für Verbindungen',
  [BrightHubStrings.ConnectionPrivacySettings_HideFollowerCount]:
    'Follower-Anzahl verbergen',
  [BrightHubStrings.ConnectionPrivacySettings_HideFollowingCount]:
    'Folge-ich-Anzahl verbergen',
  [BrightHubStrings.ConnectionPrivacySettings_HideFollowersFromNonFollowers]:
    'Follower vor Nicht-Followern verbergen',
  [BrightHubStrings.ConnectionPrivacySettings_HideFollowingFromNonFollowers]:
    'Folge-ich-Liste vor Nicht-Followern verbergen',
  [BrightHubStrings.ConnectionPrivacySettings_AllowDmsFromNonFollowers]:
    'Direktnachrichten von Nicht-Followern erlauben',
  [BrightHubStrings.ConnectionPrivacySettings_ShowOnlineStatus]:
    'Online-Status anzeigen',
  [BrightHubStrings.ConnectionPrivacySettings_ShowReadReceipts]:
    'Lesebestätigungen anzeigen',
  [BrightHubStrings.ConnectionPrivacySettings_HideFriendsFromNonFriends]:
    'Freundesliste vor Nicht-Freunden verbergen',
  [BrightHubStrings.ConnectionPrivacySettings_ApproveFollowersMode]:
    'Follower-Genehmigungsmodus',
  [BrightHubStrings.ConnectionPrivacySettings_ApproveNone]:
    'Alle automatisch genehmigen',
  [BrightHubStrings.ConnectionPrivacySettings_ApproveAll]:
    'Genehmigung für alle erforderlich',
  [BrightHubStrings.ConnectionPrivacySettings_ApproveNonMutuals]:
    'Genehmigung für Nicht-Gegenseitige erforderlich',
  [BrightHubStrings.ConnectionPrivacySettings_Save]: 'Speichern',

  // TemporaryMuteDialog
  [BrightHubStrings.TemporaryMuteDialog_Title]: 'Benutzer stummschalten',
  [BrightHubStrings.TemporaryMuteDialog_AriaLabel]:
    'Dialog zum vorübergehenden Stummschalten',
  [BrightHubStrings.TemporaryMuteDialog_MuteUserTemplate]:
    '{USERNAME} stummschalten',
  [BrightHubStrings.TemporaryMuteDialog_Duration1h]: '1 Stunde',
  [BrightHubStrings.TemporaryMuteDialog_Duration8h]: '8 Stunden',
  [BrightHubStrings.TemporaryMuteDialog_Duration24h]: '24 Stunden',
  [BrightHubStrings.TemporaryMuteDialog_Duration7d]: '7 Tage',
  [BrightHubStrings.TemporaryMuteDialog_Duration30d]: '30 Tage',
  [BrightHubStrings.TemporaryMuteDialog_Permanent]: 'Dauerhaft stummschalten',
  [BrightHubStrings.TemporaryMuteDialog_Mute]: 'Stummschalten',
  [BrightHubStrings.TemporaryMuteDialog_Cancel]: 'Abbrechen',

  // ConnectionInsights
  [BrightHubStrings.ConnectionInsights_Title]: 'Verbindungseinblicke',
  [BrightHubStrings.ConnectionInsights_AriaLabel]: 'Verbindungseinblicke',
  [BrightHubStrings.ConnectionInsights_Period7d]: '7 Tage',
  [BrightHubStrings.ConnectionInsights_Period30d]: '30 Tage',
  [BrightHubStrings.ConnectionInsights_Period90d]: '90 Tage',
  [BrightHubStrings.ConnectionInsights_PeriodAllTime]: 'Gesamter Zeitraum',
  [BrightHubStrings.ConnectionInsights_Interactions]: 'Interaktionen',
  [BrightHubStrings.ConnectionInsights_Messages]: 'Nachrichten',
  [BrightHubStrings.ConnectionInsights_Likes]: 'Likes',
  [BrightHubStrings.ConnectionInsights_Reposts]: 'Teilungen',
  [BrightHubStrings.ConnectionInsights_Replies]: 'Antworten',
  [BrightHubStrings.ConnectionInsights_EmptyState]:
    'Keine Interaktionsdaten verfügbar',
  [BrightHubStrings.ConnectionInsights_Loading]:
    'Verbindungseinblicke werden geladen…',

  // ListTimelineFilter
  [BrightHubStrings.ListTimelineFilter_Title]: 'Nach Liste filtern',
  [BrightHubStrings.ListTimelineFilter_AriaLabel]:
    'Zeitleiste nach Verbindungsliste filtern',
  [BrightHubStrings.ListTimelineFilter_AllConnections]: 'Alle Verbindungen',
  [BrightHubStrings.ListTimelineFilter_SelectList]: 'Liste auswählen',
  [BrightHubStrings.ListTimelineFilter_MembersTemplate]: '({COUNT} Mitglieder)',
  [BrightHubStrings.ListTimelineFilter_ClearFilter]: 'Filter löschen',

  // MessagingInbox
  [BrightHubStrings.MessagingInbox_Title]: 'Nachrichten',
  [BrightHubStrings.MessagingInbox_AriaLabel]: 'Nachrichteneingang',
  [BrightHubStrings.MessagingInbox_Loading]: 'Unterhaltungen werden geladen',
  [BrightHubStrings.MessagingInbox_EmptyState]: 'Noch keine Unterhaltungen.',
  [BrightHubStrings.MessagingInbox_EmptyStateHint]:
    'Starten Sie eine neue Unterhaltung.',
  [BrightHubStrings.MessagingInbox_Pinned]: 'Angepinnt',
  [BrightHubStrings.MessagingInbox_UnreadTemplate]: '{COUNT} ungelesen',
  [BrightHubStrings.MessagingInbox_NewConversation]: 'Neue Unterhaltung',
  [BrightHubStrings.MessagingInbox_GroupBadge]: 'Gruppe',

  // ConversationView
  [BrightHubStrings.ConversationView_AriaLabel]: 'Unterhaltungsansicht',
  [BrightHubStrings.ConversationView_Loading]: 'Nachrichten werden geladen',
  [BrightHubStrings.ConversationView_EmptyState]:
    'Noch keine Nachrichten. Senden Sie die erste!',
  [BrightHubStrings.ConversationView_LoadMore]: 'Mehr laden',

  // MessageComposer
  [BrightHubStrings.MessageComposer_Placeholder]: 'Nachricht eingeben…',
  [BrightHubStrings.MessageComposer_AriaLabel]: 'Nachrichteneditor',
  [BrightHubStrings.MessageComposer_Send]: 'Senden',
  [BrightHubStrings.MessageComposer_AttachFile]: 'Datei anhängen',
  [BrightHubStrings.MessageComposer_ReplyingTo]: 'Antwort an',
  [BrightHubStrings.MessageComposer_CancelReply]: 'Antwort abbrechen',

  // MessageRequestsList
  [BrightHubStrings.MessageRequestsList_Title]: 'Nachrichtenanfragen',
  [BrightHubStrings.MessageRequestsList_AriaLabel]: 'Nachrichtenanfragen-Liste',
  [BrightHubStrings.MessageRequestsList_Loading]: 'Anfragen werden geladen',
  [BrightHubStrings.MessageRequestsList_EmptyState]:
    'Keine ausstehenden Anfragen.',
  [BrightHubStrings.MessageRequestsList_Accept]: 'Annehmen',
  [BrightHubStrings.MessageRequestsList_Decline]: 'Ablehnen',
  [BrightHubStrings.MessageRequestsList_PendingCountTemplate]:
    '{COUNT} ausstehend',

  // MessageBubble
  [BrightHubStrings.MessageBubble_AriaLabel]: 'Nachricht',
  [BrightHubStrings.MessageBubble_Edited]: 'Bearbeitet',
  [BrightHubStrings.MessageBubble_Forwarded]: 'Weitergeleitet',
  [BrightHubStrings.MessageBubble_Deleted]: 'Diese Nachricht wurde gelöscht.',
  [BrightHubStrings.MessageBubble_ReplyTo]: 'Antwort an',

  // TypingIndicator
  [BrightHubStrings.TypingIndicator_AriaLabel]: 'Tippanzeige',
  [BrightHubStrings.TypingIndicator_SingleTemplate]: '{NAME} tippt…',
  [BrightHubStrings.TypingIndicator_MultipleTemplate]:
    '{COUNT} Personen tippen…',

  // ReadReceipt
  [BrightHubStrings.ReadReceipt_AriaLabel]: 'Lesebestätigung',
  [BrightHubStrings.ReadReceipt_Sent]: 'Gesendet',
  [BrightHubStrings.ReadReceipt_Delivered]: 'Zugestellt',
  [BrightHubStrings.ReadReceipt_SeenTemplate]: 'Gesehen {TIMESTAMP}',

  // MessageReactions
  [BrightHubStrings.MessageReactions_AriaLabel]: 'Nachrichtenreaktionen',
  [BrightHubStrings.MessageReactions_AddReaction]: 'Reaktion hinzufügen',
  [BrightHubStrings.MessageReactions_CountTemplate]: '{COUNT}',
  [BrightHubStrings.MessageReactions_RemoveReaction]: 'Reaktion entfernen',

  // GroupConversationSettings
  [BrightHubStrings.GroupConversationSettings_Title]: 'Gruppeneinstellungen',
  [BrightHubStrings.GroupConversationSettings_AriaLabel]:
    'Gruppenunterhaltungs-Einstellungen',
  [BrightHubStrings.GroupConversationSettings_GroupName]: 'Gruppenname',
  [BrightHubStrings.GroupConversationSettings_GroupAvatar]: 'Gruppenbild',
  [BrightHubStrings.GroupConversationSettings_Participants]: 'Teilnehmer',
  [BrightHubStrings.GroupConversationSettings_ParticipantCountTemplate]:
    '{COUNT} Teilnehmer',
  [BrightHubStrings.GroupConversationSettings_AddParticipant]:
    'Teilnehmer hinzufügen',
  [BrightHubStrings.GroupConversationSettings_RemoveParticipant]:
    'Teilnehmer entfernen',
  [BrightHubStrings.GroupConversationSettings_PromoteToAdmin]:
    'Zum Admin befördern',
  [BrightHubStrings.GroupConversationSettings_DemoteFromAdmin]:
    'Admin-Rechte entziehen',
  [BrightHubStrings.GroupConversationSettings_AdminBadge]: 'Admin',
  [BrightHubStrings.GroupConversationSettings_Save]: 'Speichern',
  [BrightHubStrings.GroupConversationSettings_Cancel]: 'Abbrechen',
  [BrightHubStrings.GroupConversationSettings_LeaveGroup]: 'Gruppe verlassen',

  // NewConversationDialog
  [BrightHubStrings.NewConversationDialog_Title]: 'Neue Unterhaltung',
  [BrightHubStrings.NewConversationDialog_AriaLabel]:
    'Dialog für neue Unterhaltung',
  [BrightHubStrings.NewConversationDialog_SearchPlaceholder]:
    'Benutzer suchen…',
  [BrightHubStrings.NewConversationDialog_CreateGroup]: 'Gruppe erstellen',
  [BrightHubStrings.NewConversationDialog_GroupNamePlaceholder]: 'Gruppenname',
  [BrightHubStrings.NewConversationDialog_SelectedTemplate]:
    '{COUNT} ausgewählt',
  [BrightHubStrings.NewConversationDialog_Start]: 'Starten',
  [BrightHubStrings.NewConversationDialog_Cancel]: 'Abbrechen',
  [BrightHubStrings.NewConversationDialog_NoResults]: 'Keine Benutzer gefunden',

  // ConversationSearch
  [BrightHubStrings.ConversationSearch_Placeholder]: 'In Unterhaltung suchen…',
  [BrightHubStrings.ConversationSearch_AriaLabel]: 'In Unterhaltung suchen',
  [BrightHubStrings.ConversationSearch_NoResults]: 'Keine Nachrichten gefunden',
  [BrightHubStrings.ConversationSearch_ResultCountTemplate]:
    '{COUNT} Ergebnisse',
  [BrightHubStrings.ConversationSearch_Clear]: 'Suche löschen',

  // MessagingMenuBadge
  [BrightHubStrings.MessagingMenuBadge_AriaLabel]: 'Nachrichten',
  [BrightHubStrings.MessagingMenuBadge_UnreadTemplate]:
    '{COUNT} ungelesene Nachrichten',
  [BrightHubStrings.MessagingMenuBadge_NoUnread]:
    'Keine ungelesenen Nachrichten',

  // NotificationProvider
  [BrightHubStrings.NotificationProvider_Error]:
    'Benachrichtigungen konnten nicht geladen werden',

  // NotificationBell
  [BrightHubStrings.NotificationBell_AriaLabel]: 'Benachrichtigungen',
  [BrightHubStrings.NotificationBell_UnreadTemplate]:
    '{COUNT} ungelesene Benachrichtigungen',
  [BrightHubStrings.NotificationBell_NoUnread]:
    'Keine ungelesenen Benachrichtigungen',
  [BrightHubStrings.NotificationBell_Overflow]: '99+',

  // NotificationDropdown
  [BrightHubStrings.NotificationDropdown_Title]: 'Benachrichtigungen',
  [BrightHubStrings.NotificationDropdown_AriaLabel]:
    'Benachrichtigungs-Dropdown',
  [BrightHubStrings.NotificationDropdown_ViewAll]: 'Alle anzeigen',
  [BrightHubStrings.NotificationDropdown_MarkAllRead]:
    'Alle als gelesen markieren',
  [BrightHubStrings.NotificationDropdown_EmptyState]:
    'Noch keine Benachrichtigungen',
  [BrightHubStrings.NotificationDropdown_Loading]:
    'Benachrichtigungen werden geladen',

  // NotificationItem
  [BrightHubStrings.NotificationItem_AriaLabel]: 'Benachrichtigung',
  [BrightHubStrings.NotificationItem_MarkRead]: 'Als gelesen markieren',
  [BrightHubStrings.NotificationItem_Delete]: 'Löschen',
  [BrightHubStrings.NotificationItem_GroupExpandTemplate]:
    '{COUNT} weitere anzeigen',
  [BrightHubStrings.NotificationItem_GroupCollapseTemplate]: 'Weniger anzeigen',

  // NotificationList
  [BrightHubStrings.NotificationList_Title]: 'Benachrichtigungen',
  [BrightHubStrings.NotificationList_AriaLabel]: 'Benachrichtigungsliste',
  [BrightHubStrings.NotificationList_Loading]:
    'Benachrichtigungen werden geladen',
  [BrightHubStrings.NotificationList_EmptyState]: 'Keine Benachrichtigungen',
  [BrightHubStrings.NotificationList_FilterAll]: 'Alle',
  [BrightHubStrings.NotificationList_FilterUnread]: 'Ungelesen',
  [BrightHubStrings.NotificationList_FilterRead]: 'Gelesen',
  [BrightHubStrings.NotificationList_LoadMore]: 'Mehr laden',
  [BrightHubStrings.NotificationList_EndOfList]:
    'Keine weiteren Benachrichtigungen',

  // NotificationPreferences
  [BrightHubStrings.NotificationPreferences_Title]:
    'Benachrichtigungseinstellungen',
  [BrightHubStrings.NotificationPreferences_AriaLabel]:
    'Benachrichtigungseinstellungen',
  [BrightHubStrings.NotificationPreferences_CategorySettings]:
    'Kategorieeinstellungen',
  [BrightHubStrings.NotificationPreferences_ChannelSettings]:
    'Kanaleinstellungen',
  [BrightHubStrings.NotificationPreferences_QuietHours]: 'Ruhezeiten',
  [BrightHubStrings.NotificationPreferences_QuietHoursEnabled]:
    'Ruhezeiten aktivieren',
  [BrightHubStrings.NotificationPreferences_QuietHoursStart]: 'Startzeit',
  [BrightHubStrings.NotificationPreferences_QuietHoursEnd]: 'Endzeit',
  [BrightHubStrings.NotificationPreferences_QuietHoursTimezone]: 'Zeitzone',
  [BrightHubStrings.NotificationPreferences_DoNotDisturb]: 'Nicht stören',
  [BrightHubStrings.NotificationPreferences_DndEnabled]:
    'Nicht stören aktivieren',
  [BrightHubStrings.NotificationPreferences_DndDuration]: 'Dauer',
  [BrightHubStrings.NotificationPreferences_SoundEnabled]:
    'Benachrichtigungstöne',
  [BrightHubStrings.NotificationPreferences_Save]: 'Speichern',
  [BrightHubStrings.NotificationPreferences_CategorySocial]: 'Soziales',
  [BrightHubStrings.NotificationPreferences_CategoryMessages]: 'Nachrichten',
  [BrightHubStrings.NotificationPreferences_CategoryConnections]:
    'Verbindungen',
  [BrightHubStrings.NotificationPreferences_CategorySystem]: 'System',
  [BrightHubStrings.NotificationPreferences_ChannelInApp]: 'In-App',
  [BrightHubStrings.NotificationPreferences_ChannelEmail]: 'E-Mail',
  [BrightHubStrings.NotificationPreferences_ChannelPush]: 'Push',

  // NotificationCategoryFilter
  [BrightHubStrings.NotificationCategoryFilter_Title]: 'Nach Kategorie filtern',
  [BrightHubStrings.NotificationCategoryFilter_AriaLabel]:
    'Benachrichtigungskategorie-Filter',
  [BrightHubStrings.NotificationCategoryFilter_All]: 'Alle',
  [BrightHubStrings.NotificationCategoryFilter_Social]: 'Soziales',
  [BrightHubStrings.NotificationCategoryFilter_Messages]: 'Nachrichten',
  [BrightHubStrings.NotificationCategoryFilter_Connections]: 'Verbindungen',
  [BrightHubStrings.NotificationCategoryFilter_System]: 'System',

  // Navigation / Sidebar
  [BrightHubStrings.Nav_Home]: 'Startseite',
  [BrightHubStrings.Nav_Explore]: 'Entdecken',
  [BrightHubStrings.Nav_Notifications]: 'Benachrichtigungen',
  [BrightHubStrings.Nav_Messages]: 'Nachrichten',
  [BrightHubStrings.Nav_Profile]: 'Profil',
  [BrightHubStrings.Nav_Connections]: 'Verbindungen',
  [BrightHubStrings.Nav_Settings]: 'Einstellungen',
  [BrightHubStrings.Nav_SidebarLabel]: 'BrightHub-Navigation',
  [BrightHubStrings.Nav_SubscribedHubs]: 'Ihre Hubs',
  [BrightHubStrings.Nav_CreateHub]: 'Hub erstellen',

  // Hub Detail Page
  [BrightHubStrings.HubDetail_MembersTemplate]: '{COUNT} Mitglieder',
  [BrightHubStrings.HubDetail_PostsTemplate]: '{COUNT} Beiträge',
  [BrightHubStrings.HubDetail_Join]: 'Beitreten',
  [BrightHubStrings.HubDetail_Leave]: 'Verlassen',
  [BrightHubStrings.HubDetail_Joined]: 'Beigetreten',
  [BrightHubStrings.HubDetail_TrustOpen]: 'Offen',
  [BrightHubStrings.HubDetail_TrustVerified]: 'Verifiziert',
  [BrightHubStrings.HubDetail_TrustEncrypted]: 'Verschlüsselt',
  [BrightHubStrings.HubDetail_About]: 'Über',
  [BrightHubStrings.HubDetail_Rules]: 'Regeln',
  [BrightHubStrings.HubDetail_SortHot]: 'Beliebt',
  [BrightHubStrings.HubDetail_SortNew]: 'Neu',
  [BrightHubStrings.HubDetail_SortTop]: 'Top',
  [BrightHubStrings.HubDetail_EmptyState]:
    'Noch keine Beiträge. Starten Sie die erste Diskussion!',
  [BrightHubStrings.HubDetail_SubHubs]: 'Unter-Hubs',

  // Explore Hubs Page
  [BrightHubStrings.Explore_Title]: 'Hubs entdecken',
  [BrightHubStrings.Explore_SearchPlaceholder]: 'Hubs suchen…',
  [BrightHubStrings.Explore_Trending]: 'Im Trend',
  [BrightHubStrings.Explore_New]: 'Neu',
  [BrightHubStrings.Explore_EmptyState]:
    'Noch keine Hubs. Erstellen Sie einen, um loszulegen!',
  [BrightHubStrings.Explore_NoResults]: 'Keine Hubs entsprechen Ihrer Suche.',

  // Home Page Sections
  [BrightHubStrings.Home_TrendingHubs]: 'Hubs im Trend',
  [BrightHubStrings.Home_RecentActivity]: 'Letzte Aktivität',
  [BrightHubStrings.Home_YourHubs]: 'Ihre Hubs',
  [BrightHubStrings.Home_SuggestedHubs]: 'Vorgeschlagene Hubs',
  [BrightHubStrings.Home_ViewAll]: 'Alle anzeigen',
  [BrightHubStrings.Home_Welcome]: 'Willkommen bei BrightHub',
  [BrightHubStrings.Home_WelcomeSubtitle]:
    'Treten Sie Hubs bei, um Diskussionen aus Communitys zu sehen, die Sie interessieren.',
  [BrightHubStrings.Home_NoHubsYet]: 'Sie sind noch keinem Hub beigetreten',
  [BrightHubStrings.Home_NoHubsHint]:
    'Entdecken Sie Hubs, um Communitys zu finden, die Sie interessieren.',

  // Create Hub Page
  [BrightHubStrings.CreateHub_Title]: 'Hub erstellen',
  [BrightHubStrings.CreateHub_NameLabel]: 'Hub-Name',
  [BrightHubStrings.CreateHub_NamePlaceholder]: 'z.\u00A0B. Programmierung',
  [BrightHubStrings.CreateHub_SlugLabel]: 'URL-Slug',
  [BrightHubStrings.CreateHub_SlugPlaceholder]: 'z.\u00A0B. programmierung',
  [BrightHubStrings.CreateHub_DescriptionLabel]: 'Beschreibung',
  [BrightHubStrings.CreateHub_DescriptionPlaceholder]:
    'Worum geht es in diesem Hub?',
  [BrightHubStrings.CreateHub_TrustTierLabel]: 'Vertrauensstufe',
  [BrightHubStrings.CreateHub_ParentHubLabel]: 'Übergeordneter Hub (optional)',
  [BrightHubStrings.CreateHub_ParentHubNone]: 'Keiner (Hub der obersten Ebene)',
  [BrightHubStrings.CreateHub_Submit]: 'Hub erstellen',
  [BrightHubStrings.CreateHub_Cancel]: 'Abbrechen',

  // Sidebar extras
  [BrightHubStrings.Nav_CreatePost]: 'Neuer Beitrag',
  [BrightHubStrings.Nav_Trending]: 'Im Trend',

  // PinnedPostSection
  [BrightHubStrings.PinnedPostSection_Pinned]: 'Angeheftet',
  [BrightHubStrings.PinnedPostSection_Unpin]: 'Loslösen',
  [BrightHubStrings.PinnedPostSection_AriaLabel]: 'Angehefteter Beitrag',

  // EditProfileDialog
  [BrightHubStrings.EditProfileDialog_Title]: 'Profil bearbeiten',
  [BrightHubStrings.EditProfileDialog_DisplayName]: 'Anzeigename',
  [BrightHubStrings.EditProfileDialog_Bio]: 'Bio',
  [BrightHubStrings.EditProfileDialog_BioPlaceholder]: 'Erzählen Sie den Leuten von sich. Markdown und Icons werden unterstützt.',
  [BrightHubStrings.EditProfileDialog_BioCharCountTemplate]: '{CURRENT}/{MAX}',
  [BrightHubStrings.EditProfileDialog_BioPreview]: 'Vorschau',
  [BrightHubStrings.EditProfileDialog_Location]: 'Ort',
  [BrightHubStrings.EditProfileDialog_WebsiteUrl]: 'Website',
  [BrightHubStrings.EditProfileDialog_Save]: 'Speichern',
  [BrightHubStrings.EditProfileDialog_Cancel]: 'Abbrechen',
  [BrightHubStrings.EditProfileDialog_Saving]: 'Speichern\u2026',
  [BrightHubStrings.EditProfileDialog_ErrorBioTooLong]: 'Die Bio überschreitet die maximale Länge von {MAX} Zeichen.',
  [BrightHubStrings.EditProfileDialog_ErrorBioContainsImage]: 'Die Bio darf keine Markdown-Bildsyntax enthalten.',

  // UserProfileCard
  [BrightHubStrings.UserProfileCard_EditProfile]: 'Profil bearbeiten',
};
