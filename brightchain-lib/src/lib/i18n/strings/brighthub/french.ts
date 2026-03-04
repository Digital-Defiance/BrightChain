import { StringsCollection } from '@digitaldefiance/i18n-lib';
import {
  BrightHubStringKey,
  BrightHubStrings,
} from '../../../enumerations/brightHubStrings';

export const BrightHubFrenchStrings: StringsCollection<BrightHubStringKey> = {
  // PostCard
  [BrightHubStrings.PostCard_Reposted]: 'Republié',
  [BrightHubStrings.PostCard_Edited]: 'Modifié',
  [BrightHubStrings.PostCard_HubRestricted]:
    'Visible uniquement par les membres du hub',
  [BrightHubStrings.PostCard_Deleted]: 'Cette publication a été supprimée.',
  [BrightHubStrings.PostCard_ReplyAriaTemplate]: 'Répondre, {COUNT} réponses',
  [BrightHubStrings.PostCard_RepostAriaTemplate]:
    'Republier, {COUNT} republications',
  [BrightHubStrings.PostCard_LikeAriaTemplate]:
    "Aimer, {COUNT} mentions J'aime",
  [BrightHubStrings.PostCard_UnlikeAriaTemplate]:
    "Ne plus aimer, {COUNT} mentions J'aime",
  [BrightHubStrings.PostCard_PostByAriaTemplate]: 'Publication de {NAME}',

  // PostComposer
  [BrightHubStrings.PostComposer_Placeholder]: 'Quoi de neuf ?',
  [BrightHubStrings.PostComposer_ReplyPlaceholder]: 'Publier votre réponse',
  [BrightHubStrings.PostComposer_ReplyingTo]: 'En réponse à',
  [BrightHubStrings.PostComposer_CancelReply]: 'Annuler la réponse',
  [BrightHubStrings.PostComposer_Bold]: 'Gras',
  [BrightHubStrings.PostComposer_Italic]: 'Italique',
  [BrightHubStrings.PostComposer_Code]: 'Code',
  [BrightHubStrings.PostComposer_Emoji]: 'Insérer un émoji',
  [BrightHubStrings.PostComposer_AttachImage]: 'Joindre une image',
  [BrightHubStrings.PostComposer_RemoveAttachmentTemplate]:
    'Supprimer la pièce jointe {INDEX}',
  [BrightHubStrings.PostComposer_AttachmentAltTemplate]: 'Pièce jointe {INDEX}',
  [BrightHubStrings.PostComposer_VisibleTo]: 'Visible par',
  [BrightHubStrings.PostComposer_MembersTemplate]: '{COUNT} membres',
  [BrightHubStrings.PostComposer_SubmitPost]: 'Publier',
  [BrightHubStrings.PostComposer_Post]: 'Publier',
  [BrightHubStrings.PostComposer_Reply]: 'Répondre',

  // Timeline
  [BrightHubStrings.Timeline_AriaLabel]: "Fil d'actualité",
  [BrightHubStrings.Timeline_FilteredByTemplate]: 'Filtré par : {LABEL}',
  [BrightHubStrings.Timeline_ClearFilter]: 'Effacer',
  [BrightHubStrings.Timeline_EmptyDefault]:
    'Aucune publication. Suivez des personnes pour voir leurs publications ici.',
  [BrightHubStrings.Timeline_LoadingPosts]: 'Chargement des publications',
  [BrightHubStrings.Timeline_AllCaughtUp]: 'Vous êtes à jour',

  // ThreadView
  [BrightHubStrings.ThreadView_AriaLabel]: 'Fil de discussion',
  [BrightHubStrings.ThreadView_ParentDeleted]:
    'La publication parente a été supprimée',
  [BrightHubStrings.ThreadView_ReplyCountSingular]: '1 réponse',
  [BrightHubStrings.ThreadView_ReplyCountPluralTemplate]: '{COUNT} réponses',
  [BrightHubStrings.ThreadView_ParticipantCountSingular]: '1 participant',
  [BrightHubStrings.ThreadView_ParticipantCountPluralTemplate]:
    '{COUNT} participants',
  [BrightHubStrings.ThreadView_NoReplies]:
    'Aucune réponse. Soyez le premier à répondre !',

  // FollowButton
  [BrightHubStrings.FollowButton_Follow]: 'Suivre',
  [BrightHubStrings.FollowButton_Following]: 'Abonné',
  [BrightHubStrings.FollowButton_Unfollow]: 'Se désabonner',

  // LikeButton
  [BrightHubStrings.LikeButton_LikeAriaTemplate]:
    "Aimer, {COUNT} mentions J'aime",
  [BrightHubStrings.LikeButton_UnlikeAriaTemplate]:
    "Ne plus aimer, {COUNT} mentions J'aime",

  // RepostButton
  [BrightHubStrings.RepostButton_RepostAriaTemplate]:
    'Republier, {COUNT} republications',
  [BrightHubStrings.RepostButton_UndoRepostAriaTemplate]:
    'Annuler la republication, {COUNT} republications',

  // UserProfileCard
  [BrightHubStrings.UserProfileCard_Verified]: 'Vérifié',
  [BrightHubStrings.UserProfileCard_ProtectedAccount]: 'Compte protégé',
  [BrightHubStrings.UserProfileCard_ProfileOfTemplate]: 'Profil de {NAME}',
  [BrightHubStrings.UserProfileCard_Following]: 'Abonnements',
  [BrightHubStrings.UserProfileCard_Followers]: 'Abonnés',
  [BrightHubStrings.UserProfileCard_StrongConnection]: 'Connexion forte',
  [BrightHubStrings.UserProfileCard_ModerateConnection]: 'Connexion modérée',
  [BrightHubStrings.UserProfileCard_WeakConnection]: 'Connexion faible',
  [BrightHubStrings.UserProfileCard_DormantConnection]: 'Connexion dormante',
  [BrightHubStrings.UserProfileCard_MutualConnectionSingular]:
    '1 connexion mutuelle',
  [BrightHubStrings.UserProfileCard_MutualConnectionPluralTemplate]:
    '{COUNT} connexions mutuelles',

  // SearchResults
  [BrightHubStrings.SearchResults_AriaTemplate]:
    'Résultats de recherche pour « {QUERY} »',
  [BrightHubStrings.SearchResults_TabAll]: 'Tout',
  [BrightHubStrings.SearchResults_TabPosts]: 'Publications',
  [BrightHubStrings.SearchResults_TabPostsTemplate]: 'Publications ({COUNT})',
  [BrightHubStrings.SearchResults_TabUsers]: 'Utilisateurs',
  [BrightHubStrings.SearchResults_TabUsersTemplate]: 'Utilisateurs ({COUNT})',
  [BrightHubStrings.SearchResults_NoResultsTemplate]:
    'Aucun résultat pour « {QUERY} »',
  [BrightHubStrings.SearchResults_EnterSearchTerm]:
    'Saisissez un terme de recherche pour trouver des publications et des personnes',
  [BrightHubStrings.SearchResults_SectionPeople]: 'Personnes',
  [BrightHubStrings.SearchResults_SectionPosts]: 'Publications',
  [BrightHubStrings.SearchResults_Loading]:
    'Chargement des résultats de recherche',
  [BrightHubStrings.SearchResults_EndOfResults]: 'Fin des résultats',
};
