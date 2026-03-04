import { StringsCollection } from '@digitaldefiance/i18n-lib';
import {
  BrightHubStringKey,
  BrightHubStrings,
} from '../../../enumerations/brightHubStrings';

export const BrightHubGermanStrings: StringsCollection<BrightHubStringKey> = {
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
  [BrightHubStrings.PostComposer_MembersTemplate]: '{COUNT} Mitglieder',
  [BrightHubStrings.PostComposer_SubmitPost]: 'Beitrag absenden',
  [BrightHubStrings.PostComposer_Post]: 'Posten',
  [BrightHubStrings.PostComposer_Reply]: 'Antworten',

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
  [BrightHubStrings.UserProfileCard_StrongConnection]: 'Starke Verbindung',
  [BrightHubStrings.UserProfileCard_ModerateConnection]: 'Moderate Verbindung',
  [BrightHubStrings.UserProfileCard_WeakConnection]: 'Schwache Verbindung',
  [BrightHubStrings.UserProfileCard_DormantConnection]: 'Ruhende Verbindung',
  [BrightHubStrings.UserProfileCard_MutualConnectionSingular]:
    '1 gemeinsame Verbindung',
  [BrightHubStrings.UserProfileCard_MutualConnectionPluralTemplate]:
    '{COUNT} gemeinsame Verbindungen',

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
};
