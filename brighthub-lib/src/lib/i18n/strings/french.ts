import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightHubStringKey,
  BrightHubStrings,
} from '../../enumerations/brightHubStrings';

export const BrightHubFrenchStrings: ComponentStrings<BrightHubStringKey> = {
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
  [BrightHubStrings.PostComposer_VisibilityPublic]: 'Public',
  [BrightHubStrings.PostComposer_VisibilityFollowersOnly]: 'Abonnés uniquement',
  [BrightHubStrings.PostComposer_VisibilityFriendsOnly]: 'Amis uniquement',
  [BrightHubStrings.PostComposer_VisibilityHubOnly]:
    'Membres du hub uniquement',
  [BrightHubStrings.PostComposer_MembersTemplate]: '{COUNT} membres',
  [BrightHubStrings.PostComposer_SubmitPost]: 'Publier',
  [BrightHubStrings.PostComposer_Post]: 'Publier',
  [BrightHubStrings.PostComposer_Reply]: 'Répondre',
  [BrightHubStrings.PostComposer_Preview]: 'Aperçu',
  [BrightHubStrings.PostComposer_PreviewAriaLabel]:
    'Aperçu du contenu de la publication',
  [BrightHubStrings.PostComposer_MarkupHelp]: 'Aide au formatage',
  [BrightHubStrings.PostComposer_MarkupHelpAriaLabel]:
    'Référence de formatage et de balisage des publications',
  [BrightHubStrings.PostComposer_MarkupHelpClose]: 'Fermer',
  [BrightHubStrings.PostComposer_MarkupHelpTabPost]:
    'Formatage des publications',
  [BrightHubStrings.PostComposer_MarkupHelpTabIcons]: 'Balisage des icônes',
  [BrightHubStrings.PostComposer_ImageLimitReached]:
    'Maximum 20 images par publication',
  [BrightHubStrings.PostComposer_ImageUploadFailed]:
    "Échec du téléchargement de l'image",
  [BrightHubStrings.PostComposer_Uploading]: 'Téléchargement...',
  [BrightHubStrings.PostComposer_InsertImage]: 'Insérer une image',
  [BrightHubStrings.PostComposer_RemoveAttachment]: 'Supprimer la pièce jointe',
  [BrightHubStrings.PostComposer_AttachmentLimitReached]:
    'Maximum 4 pièces jointes par publication',
  [BrightHubStrings.PostComposer_EditAltText]: 'Modifier le texte alternatif',
  [BrightHubStrings.PostComposer_AltText]: 'Texte alternatif',
  [BrightHubStrings.PostComposer_Save]: 'Enregistrer',
  [BrightHubStrings.PostComposer_Cancel]: 'Annuler',
  [BrightHubStrings.PostComposer_InsertIcon]: 'Insérer une icône',
  [BrightHubStrings.PostComposer_IconSearchPlaceholder]: 'Rechercher des icônes...',
  [BrightHubStrings.PostComposer_IconNoMatchTemplate]:
    'Aucune icône ne correspond à \u00ab {0} \u00bb',
  [BrightHubStrings.PostComposer_IconStyleOptions]: 'Options de style',
  [BrightHubStrings.PostComposer_IconColor]: 'Couleur',
  [BrightHubStrings.PostComposer_IconColorNone]: 'Aucune',
  [BrightHubStrings.PostComposer_IconAnimation]: 'Animation',
  [BrightHubStrings.PostComposer_IconAnimationNone]: 'Aucune',
  [BrightHubStrings.PostComposer_IconRotation]: 'Rotation',
  [BrightHubStrings.PostComposer_IconRotationNone]: 'Aucune',
  [BrightHubStrings.PostComposer_IconSize]: 'Taille',
  [BrightHubStrings.PostComposer_IconSizeDefault]: 'Par défaut',
  [BrightHubStrings.PostComposer_IconPreview]: 'Aperçu',

  // ImageCropDialog
  [BrightHubStrings.ImageCropDialog_Title]: "Recadrer l'image",
  [BrightHubStrings.ImageCropDialog_Crop]: 'Recadrer',
  [BrightHubStrings.ImageCropDialog_Skip]: "Utiliser l'original",
  [BrightHubStrings.ImageCropDialog_Cancel]: 'Annuler',
  [BrightHubStrings.ImageCropDialog_ZoomLabel]: 'Zoom',
  [BrightHubStrings.ImageCropDialog_PreviewAlt]: 'Aperçu du recadrage',

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
  [BrightHubStrings.UserProfileCard_Friends]: 'Amis',
  [BrightHubStrings.UserProfileCard_FriendsTab]: 'Amis',
  [BrightHubStrings.UserProfileCard_FriendsHidden]:
    "Cet utilisateur a masqué sa liste d'amis",
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

  // ConnectionListManager
  [BrightHubStrings.ConnectionListManager_Title]: 'Listes de connexions',
  [BrightHubStrings.ConnectionListManager_CreateList]: 'Créer une liste',
  [BrightHubStrings.ConnectionListManager_EditList]: 'Modifier la liste',
  [BrightHubStrings.ConnectionListManager_DeleteList]: 'Supprimer la liste',
  [BrightHubStrings.ConnectionListManager_DeleteConfirmTemplate]:
    'Voulez-vous vraiment supprimer « {NAME} » ? Tous les membres seront retirés.',
  [BrightHubStrings.ConnectionListManager_DeleteConfirmAction]: 'Supprimer',
  [BrightHubStrings.ConnectionListManager_Cancel]: 'Annuler',
  [BrightHubStrings.ConnectionListManager_Save]: 'Enregistrer',
  [BrightHubStrings.ConnectionListManager_ListName]: 'Nom de la liste',
  [BrightHubStrings.ConnectionListManager_ListDescription]: 'Description',
  [BrightHubStrings.ConnectionListManager_Visibility]: 'Visibilité',
  [BrightHubStrings.ConnectionListManager_VisibilityPrivate]: 'Privée',
  [BrightHubStrings.ConnectionListManager_VisibilityFollowersOnly]:
    'Abonnés uniquement',
  [BrightHubStrings.ConnectionListManager_VisibilityPublic]: 'Publique',
  [BrightHubStrings.ConnectionListManager_MembersTemplate]: '{COUNT} membres',
  [BrightHubStrings.ConnectionListManager_FollowersTemplate]: '{COUNT} abonnés',
  [BrightHubStrings.ConnectionListManager_EmptyState]:
    'Aucune liste de connexions',
  [BrightHubStrings.ConnectionListManager_EmptyStateHint]:
    'Créez une liste pour organiser vos connexions.',
  [BrightHubStrings.ConnectionListManager_AddMembers]: 'Ajouter des membres',
  [BrightHubStrings.ConnectionListManager_RemoveMembers]: 'Retirer des membres',
  [BrightHubStrings.ConnectionListManager_AddMembersTitle]:
    'Ajouter des membres à la liste',
  [BrightHubStrings.ConnectionListManager_RemoveMembersTitle]:
    'Retirer des membres de la liste',
  [BrightHubStrings.ConnectionListManager_UserIdsPlaceholder]:
    'Saisissez les identifiants, un par ligne',
  [BrightHubStrings.ConnectionListManager_Loading]: 'Chargement des listes…',
  [BrightHubStrings.ConnectionListManager_AriaLabel]:
    'Gestionnaire de listes de connexions',

  // ConnectionListCard
  [BrightHubStrings.ConnectionListCard_AriaLabel]:
    'Liste de connexions : {NAME}',
  [BrightHubStrings.ConnectionListCard_MembersTemplate]: '{COUNT} membres',
  [BrightHubStrings.ConnectionListCard_FollowersTemplate]: '{COUNT} abonnés',
  [BrightHubStrings.ConnectionListCard_VisibilityPrivate]: 'Privée',
  [BrightHubStrings.ConnectionListCard_VisibilityFollowersOnly]:
    'Abonnés uniquement',
  [BrightHubStrings.ConnectionListCard_VisibilityPublic]: 'Publique',
  [BrightHubStrings.ConnectionListCard_CreatedAtTemplate]: 'Créée le {DATE}',

  // ConnectionCategorySelector
  [BrightHubStrings.ConnectionCategorySelector_Title]: 'Catégories',
  [BrightHubStrings.ConnectionCategorySelector_AriaLabel]:
    'Sélecteur de catégorie de connexion',
  [BrightHubStrings.ConnectionCategorySelector_DefaultIndicator]: 'Par défaut',
  [BrightHubStrings.ConnectionCategorySelector_NoneAvailable]:
    'Aucune catégorie disponible',

  // ConnectionNoteEditor
  [BrightHubStrings.ConnectionNoteEditor_Title]: 'Note',
  [BrightHubStrings.ConnectionNoteEditor_AriaLabel]: 'Note de connexion',
  [BrightHubStrings.ConnectionNoteEditor_Placeholder]:
    'Ajoutez une note privée à propos de cette connexion…',
  [BrightHubStrings.ConnectionNoteEditor_EmptyState]:
    'Aucune note. Ajoutez une note privée pour garder le contexte de cette connexion.',
  [BrightHubStrings.ConnectionNoteEditor_Save]: 'Enregistrer',
  [BrightHubStrings.ConnectionNoteEditor_Delete]: 'Supprimer',
  [BrightHubStrings.ConnectionNoteEditor_Cancel]: 'Annuler',
  [BrightHubStrings.ConnectionNoteEditor_DeleteConfirmTitle]:
    'Supprimer la note ?',
  [BrightHubStrings.ConnectionNoteEditor_DeleteConfirmMessage]:
    'Voulez-vous vraiment supprimer cette note ? Cette action est irréversible.',
  [BrightHubStrings.ConnectionNoteEditor_DeleteConfirmAction]: 'Supprimer',

  // ConnectionSuggestions
  [BrightHubStrings.ConnectionSuggestions_Title]: 'Connexions suggérées',
  [BrightHubStrings.ConnectionSuggestions_AriaLabel]:
    'Suggestions de connexions',
  [BrightHubStrings.ConnectionSuggestions_EmptyState]:
    'Aucune suggestion pour le moment. Revenez plus tard !',
  [BrightHubStrings.ConnectionSuggestions_Loading]:
    'Chargement des suggestions…',
  [BrightHubStrings.ConnectionSuggestions_Follow]: 'Suivre',
  [BrightHubStrings.ConnectionSuggestions_Dismiss]: 'Ignorer',
  [BrightHubStrings.ConnectionSuggestions_MutualCountSingular]:
    '1 connexion mutuelle',
  [BrightHubStrings.ConnectionSuggestions_MutualCountPluralTemplate]:
    '{COUNT} connexions mutuelles',
  [BrightHubStrings.ConnectionSuggestions_ReasonMutualConnections]:
    'Basé sur les connexions mutuelles',
  [BrightHubStrings.ConnectionSuggestions_ReasonSimilarInterests]:
    'Basé sur des intérêts similaires',
  [BrightHubStrings.ConnectionSuggestions_ReasonSimilarToUser]:
    'Similaire aux personnes que vous suivez',
  [BrightHubStrings.ConnectionSuggestions_ReasonMutualFriends]:
    'Amis en commun',

  // MutualConnections
  [BrightHubStrings.MutualConnections_Title]: 'Connexions mutuelles',
  [BrightHubStrings.MutualConnections_AriaLabel]: 'Connexions mutuelles',
  [BrightHubStrings.MutualConnections_Loading]:
    'Chargement des connexions mutuelles…',
  [BrightHubStrings.MutualConnections_EmptyState]: 'Aucune connexion mutuelle',
  [BrightHubStrings.MutualConnections_CountSingular]: '1 connexion mutuelle',
  [BrightHubStrings.MutualConnections_CountPluralTemplate]:
    '{COUNT} connexions mutuelles',
  [BrightHubStrings.MutualConnections_LoadMore]: 'Charger plus',

  // ConnectionStrengthIndicator
  [BrightHubStrings.ConnectionStrengthIndicator_Title]: 'Force de la connexion',
  [BrightHubStrings.ConnectionStrengthIndicator_AriaLabel]:
    'Indicateur de force de connexion',
  [BrightHubStrings.ConnectionStrengthIndicator_Strong]: 'Forte',
  [BrightHubStrings.ConnectionStrengthIndicator_Moderate]: 'Modérée',
  [BrightHubStrings.ConnectionStrengthIndicator_Weak]: 'Faible',
  [BrightHubStrings.ConnectionStrengthIndicator_Dormant]: 'Dormante',

  // HubManager
  [BrightHubStrings.HubManager_Title]: 'Hubs',
  [BrightHubStrings.HubManager_AriaLabel]: 'Gestionnaire de hubs',
  [BrightHubStrings.HubManager_CreateHub]: 'Créer un hub',
  [BrightHubStrings.HubManager_EditHub]: 'Modifier le hub',
  [BrightHubStrings.HubManager_DeleteHub]: 'Supprimer le hub',
  [BrightHubStrings.HubManager_HubName]: 'Nom du hub',
  [BrightHubStrings.HubManager_HubDescription]: 'Description',
  [BrightHubStrings.HubManager_MembersTemplate]: '{COUNT} membres',
  [BrightHubStrings.HubManager_EmptyState]: 'Aucun hub.',
  [BrightHubStrings.HubManager_EmptyStateHint]:
    'Créez un hub pour partager du contenu avec un groupe restreint de connexions.',
  [BrightHubStrings.HubManager_Save]: 'Enregistrer',
  [BrightHubStrings.HubManager_Cancel]: 'Annuler',
  [BrightHubStrings.HubManager_DeleteConfirmTemplate]:
    'Voulez-vous vraiment supprimer « {NAME} » ? Tous les membres seront retirés.',
  [BrightHubStrings.HubManager_DeleteConfirmAction]: 'Supprimer',
  [BrightHubStrings.HubManager_AddMembers]: 'Ajouter des membres',
  [BrightHubStrings.HubManager_AddMembersTitle]: 'Ajouter des membres au hub',
  [BrightHubStrings.HubManager_RemoveMembers]: 'Retirer des membres',
  [BrightHubStrings.HubManager_RemoveMembersTitle]:
    'Retirer des membres du hub',
  [BrightHubStrings.HubManager_UserIdsPlaceholder]:
    'Saisissez les identifiants, un par ligne',
  [BrightHubStrings.HubManager_Loading]: 'Chargement des hubs…',
  [BrightHubStrings.HubManager_DefaultBadge]: 'Par défaut',

  // HubSelector
  [BrightHubStrings.HubSelector_Title]: 'Visibilité de la publication',
  [BrightHubStrings.HubSelector_AriaLabel]:
    'Sélecteur de hub pour la visibilité de la publication',
  [BrightHubStrings.HubSelector_MembersTemplate]: '{COUNT} membres',
  [BrightHubStrings.HubSelector_NoneAvailable]: 'Aucun hub disponible.',
  [BrightHubStrings.HubSelector_NoneSelected]: 'Visible par tous les abonnés',
  [BrightHubStrings.HubSelector_SelectedCountTemplate]:
    '{COUNT} hubs sélectionnés',
  [BrightHubStrings.HubSelector_DefaultBadge]: 'Par défaut',

  // FollowRequestList
  [BrightHubStrings.FollowRequestList_Title]: "Demandes d'abonnement",
  [BrightHubStrings.FollowRequestList_AriaLabel]:
    "Demandes d'abonnement en attente",
  [BrightHubStrings.FollowRequestList_Loading]:
    "Chargement des demandes d'abonnement…",
  [BrightHubStrings.FollowRequestList_EmptyState]:
    "Aucune demande d'abonnement en attente",
  [BrightHubStrings.FollowRequestList_Approve]: 'Approuver',
  [BrightHubStrings.FollowRequestList_Reject]: 'Rejeter',
  [BrightHubStrings.FollowRequestList_PendingCountTemplate]:
    '{COUNT} demandes en attente',
  [BrightHubStrings.FollowRequestList_PendingCountSingular]:
    '1 demande en attente',
  [BrightHubStrings.FollowRequestList_CustomMessage]: 'Message',

  // ConnectionPrivacySettings
  [BrightHubStrings.ConnectionPrivacySettings_Title]:
    'Paramètres de confidentialité',
  [BrightHubStrings.ConnectionPrivacySettings_AriaLabel]:
    'Paramètres de confidentialité des connexions',
  [BrightHubStrings.ConnectionPrivacySettings_HideFollowerCount]:
    "Masquer le nombre d'abonnés",
  [BrightHubStrings.ConnectionPrivacySettings_HideFollowingCount]:
    "Masquer le nombre d'abonnements",
  [BrightHubStrings.ConnectionPrivacySettings_HideFollowersFromNonFollowers]:
    'Masquer les abonnés aux non-abonnés',
  [BrightHubStrings.ConnectionPrivacySettings_HideFollowingFromNonFollowers]:
    'Masquer les abonnements aux non-abonnés',
  [BrightHubStrings.ConnectionPrivacySettings_AllowDmsFromNonFollowers]:
    'Autoriser les messages privés des non-abonnés',
  [BrightHubStrings.ConnectionPrivacySettings_ShowOnlineStatus]:
    'Afficher le statut en ligne',
  [BrightHubStrings.ConnectionPrivacySettings_ShowReadReceipts]:
    'Afficher les accusés de lecture',
  [BrightHubStrings.ConnectionPrivacySettings_HideFriendsFromNonFriends]:
    "Masquer la liste d'amis aux non-amis",
  [BrightHubStrings.ConnectionPrivacySettings_ApproveFollowersMode]:
    "Mode d'approbation des abonnés",
  [BrightHubStrings.ConnectionPrivacySettings_ApproveNone]:
    'Approuver automatiquement tout le monde',
  [BrightHubStrings.ConnectionPrivacySettings_ApproveAll]:
    'Exiger une approbation pour tous',
  [BrightHubStrings.ConnectionPrivacySettings_ApproveNonMutuals]:
    'Exiger une approbation pour les non-mutuels',
  [BrightHubStrings.ConnectionPrivacySettings_Save]: 'Enregistrer',

  // TemporaryMuteDialog
  [BrightHubStrings.TemporaryMuteDialog_Title]: 'Mettre en sourdine',
  [BrightHubStrings.TemporaryMuteDialog_AriaLabel]:
    'Boîte de dialogue de mise en sourdine temporaire',
  [BrightHubStrings.TemporaryMuteDialog_MuteUserTemplate]:
    'Mettre {USERNAME} en sourdine',
  [BrightHubStrings.TemporaryMuteDialog_Duration1h]: '1 heure',
  [BrightHubStrings.TemporaryMuteDialog_Duration8h]: '8 heures',
  [BrightHubStrings.TemporaryMuteDialog_Duration24h]: '24 heures',
  [BrightHubStrings.TemporaryMuteDialog_Duration7d]: '7 jours',
  [BrightHubStrings.TemporaryMuteDialog_Duration30d]: '30 jours',
  [BrightHubStrings.TemporaryMuteDialog_Permanent]:
    'Mettre en sourdine définitivement',
  [BrightHubStrings.TemporaryMuteDialog_Mute]: 'Mettre en sourdine',
  [BrightHubStrings.TemporaryMuteDialog_Cancel]: 'Annuler',

  // ConnectionInsights
  [BrightHubStrings.ConnectionInsights_Title]: 'Statistiques de connexion',
  [BrightHubStrings.ConnectionInsights_AriaLabel]: 'Statistiques de connexion',
  [BrightHubStrings.ConnectionInsights_Period7d]: '7 jours',
  [BrightHubStrings.ConnectionInsights_Period30d]: '30 jours',
  [BrightHubStrings.ConnectionInsights_Period90d]: '90 jours',
  [BrightHubStrings.ConnectionInsights_PeriodAllTime]: 'Depuis toujours',
  [BrightHubStrings.ConnectionInsights_Interactions]: 'Interactions',
  [BrightHubStrings.ConnectionInsights_Messages]: 'Messages',
  [BrightHubStrings.ConnectionInsights_Likes]: "Mentions J'aime",
  [BrightHubStrings.ConnectionInsights_Reposts]: 'Republications',
  [BrightHubStrings.ConnectionInsights_Replies]: 'Réponses',
  [BrightHubStrings.ConnectionInsights_EmptyState]:
    "Aucune donnée d'interaction disponible",
  [BrightHubStrings.ConnectionInsights_Loading]:
    'Chargement des statistiques de connexion…',

  // ListTimelineFilter
  [BrightHubStrings.ListTimelineFilter_Title]: 'Filtrer par liste',
  [BrightHubStrings.ListTimelineFilter_AriaLabel]:
    "Filtrer le fil d'actualité par liste de connexions",
  [BrightHubStrings.ListTimelineFilter_AllConnections]: 'Toutes les connexions',
  [BrightHubStrings.ListTimelineFilter_SelectList]: 'Sélectionner une liste',
  [BrightHubStrings.ListTimelineFilter_MembersTemplate]: '({COUNT} membres)',
  [BrightHubStrings.ListTimelineFilter_ClearFilter]: 'Effacer le filtre',

  // MessagingInbox
  [BrightHubStrings.MessagingInbox_Title]: 'Messages',
  [BrightHubStrings.MessagingInbox_AriaLabel]: 'Boîte de réception',
  [BrightHubStrings.MessagingInbox_Loading]: 'Chargement des conversations',
  [BrightHubStrings.MessagingInbox_EmptyState]: 'Aucune conversation.',
  [BrightHubStrings.MessagingInbox_EmptyStateHint]:
    'Lancez une nouvelle conversation pour commencer.',
  [BrightHubStrings.MessagingInbox_Pinned]: 'Épinglée',
  [BrightHubStrings.MessagingInbox_UnreadTemplate]: '{COUNT} non lus',
  [BrightHubStrings.MessagingInbox_NewConversation]: 'Nouvelle conversation',
  [BrightHubStrings.MessagingInbox_GroupBadge]: 'Groupe',

  // ConversationView
  [BrightHubStrings.ConversationView_AriaLabel]: 'Vue de la conversation',
  [BrightHubStrings.ConversationView_Loading]: 'Chargement des messages',
  [BrightHubStrings.ConversationView_EmptyState]:
    'Aucun message. Envoyez le premier !',
  [BrightHubStrings.ConversationView_LoadMore]: 'Charger plus',

  // MessageComposer
  [BrightHubStrings.MessageComposer_Placeholder]: 'Saisissez un message…',
  [BrightHubStrings.MessageComposer_AriaLabel]: 'Rédaction de message',
  [BrightHubStrings.MessageComposer_Send]: 'Envoyer',
  [BrightHubStrings.MessageComposer_AttachFile]: 'Joindre un fichier',
  [BrightHubStrings.MessageComposer_ReplyingTo]: 'En réponse à',
  [BrightHubStrings.MessageComposer_CancelReply]: 'Annuler la réponse',

  // MessageRequestsList
  [BrightHubStrings.MessageRequestsList_Title]: 'Demandes de message',
  [BrightHubStrings.MessageRequestsList_AriaLabel]:
    'Liste des demandes de message',
  [BrightHubStrings.MessageRequestsList_Loading]: 'Chargement des demandes',
  [BrightHubStrings.MessageRequestsList_EmptyState]:
    'Aucune demande en attente.',
  [BrightHubStrings.MessageRequestsList_Accept]: 'Accepter',
  [BrightHubStrings.MessageRequestsList_Decline]: 'Refuser',
  [BrightHubStrings.MessageRequestsList_PendingCountTemplate]:
    '{COUNT} en attente',

  // MessageBubble
  [BrightHubStrings.MessageBubble_AriaLabel]: 'Message',
  [BrightHubStrings.MessageBubble_Edited]: 'Modifié',
  [BrightHubStrings.MessageBubble_Forwarded]: 'Transféré',
  [BrightHubStrings.MessageBubble_Deleted]: 'Ce message a été supprimé.',
  [BrightHubStrings.MessageBubble_ReplyTo]: 'En réponse à',

  // TypingIndicator
  [BrightHubStrings.TypingIndicator_AriaLabel]: 'Indicateur de saisie',
  [BrightHubStrings.TypingIndicator_SingleTemplate]:
    "{NAME} est en train d'écrire…",
  [BrightHubStrings.TypingIndicator_MultipleTemplate]:
    "{COUNT} personnes sont en train d'écrire…",

  // ReadReceipt
  [BrightHubStrings.ReadReceipt_AriaLabel]: 'Accusé de lecture',
  [BrightHubStrings.ReadReceipt_Sent]: 'Envoyé',
  [BrightHubStrings.ReadReceipt_Delivered]: 'Remis',
  [BrightHubStrings.ReadReceipt_SeenTemplate]: 'Vu {TIMESTAMP}',

  // MessageReactions
  [BrightHubStrings.MessageReactions_AriaLabel]: 'Réactions au message',
  [BrightHubStrings.MessageReactions_AddReaction]: 'Ajouter une réaction',
  [BrightHubStrings.MessageReactions_CountTemplate]: '{COUNT}',
  [BrightHubStrings.MessageReactions_RemoveReaction]: 'Retirer la réaction',

  // GroupConversationSettings
  [BrightHubStrings.GroupConversationSettings_Title]: 'Paramètres du groupe',
  [BrightHubStrings.GroupConversationSettings_AriaLabel]:
    'Paramètres de la conversation de groupe',
  [BrightHubStrings.GroupConversationSettings_GroupName]: 'Nom du groupe',
  [BrightHubStrings.GroupConversationSettings_GroupAvatar]: 'Avatar du groupe',
  [BrightHubStrings.GroupConversationSettings_Participants]: 'Participants',
  [BrightHubStrings.GroupConversationSettings_ParticipantCountTemplate]:
    '{COUNT} participants',
  [BrightHubStrings.GroupConversationSettings_AddParticipant]:
    'Ajouter un participant',
  [BrightHubStrings.GroupConversationSettings_RemoveParticipant]:
    'Retirer un participant',
  [BrightHubStrings.GroupConversationSettings_PromoteToAdmin]:
    'Promouvoir administrateur',
  [BrightHubStrings.GroupConversationSettings_DemoteFromAdmin]:
    'Rétrograder administrateur',
  [BrightHubStrings.GroupConversationSettings_AdminBadge]: 'Admin',
  [BrightHubStrings.GroupConversationSettings_Save]: 'Enregistrer',
  [BrightHubStrings.GroupConversationSettings_Cancel]: 'Annuler',
  [BrightHubStrings.GroupConversationSettings_LeaveGroup]: 'Quitter le groupe',

  // NewConversationDialog
  [BrightHubStrings.NewConversationDialog_Title]: 'Nouvelle conversation',
  [BrightHubStrings.NewConversationDialog_AriaLabel]:
    'Boîte de dialogue de nouvelle conversation',
  [BrightHubStrings.NewConversationDialog_SearchPlaceholder]:
    'Rechercher des utilisateurs…',
  [BrightHubStrings.NewConversationDialog_CreateGroup]: 'Créer un groupe',
  [BrightHubStrings.NewConversationDialog_GroupNamePlaceholder]:
    'Nom du groupe',
  [BrightHubStrings.NewConversationDialog_SelectedTemplate]:
    '{COUNT} sélectionnés',
  [BrightHubStrings.NewConversationDialog_Start]: 'Démarrer',
  [BrightHubStrings.NewConversationDialog_Cancel]: 'Annuler',
  [BrightHubStrings.NewConversationDialog_NoResults]:
    'Aucun utilisateur trouvé',

  // ConversationSearch
  [BrightHubStrings.ConversationSearch_Placeholder]:
    'Rechercher dans la conversation…',
  [BrightHubStrings.ConversationSearch_AriaLabel]:
    'Rechercher dans la conversation',
  [BrightHubStrings.ConversationSearch_NoResults]: 'Aucun message trouvé',
  [BrightHubStrings.ConversationSearch_ResultCountTemplate]:
    '{COUNT} résultats',
  [BrightHubStrings.ConversationSearch_Clear]: 'Effacer la recherche',

  // MessagingMenuBadge
  [BrightHubStrings.MessagingMenuBadge_AriaLabel]: 'Messages',
  [BrightHubStrings.MessagingMenuBadge_UnreadTemplate]:
    '{COUNT} messages non lus',
  [BrightHubStrings.MessagingMenuBadge_NoUnread]: 'Aucun message non lu',

  // NotificationProvider
  [BrightHubStrings.NotificationProvider_Error]:
    'Échec du chargement des notifications',

  // NotificationBell
  [BrightHubStrings.NotificationBell_AriaLabel]: 'Notifications',
  [BrightHubStrings.NotificationBell_UnreadTemplate]:
    '{COUNT} notifications non lues',
  [BrightHubStrings.NotificationBell_NoUnread]: 'Aucune notification non lue',
  [BrightHubStrings.NotificationBell_Overflow]: '99+',

  // NotificationDropdown
  [BrightHubStrings.NotificationDropdown_Title]: 'Notifications',
  [BrightHubStrings.NotificationDropdown_AriaLabel]:
    'Menu déroulant des notifications',
  [BrightHubStrings.NotificationDropdown_ViewAll]: 'Tout afficher',
  [BrightHubStrings.NotificationDropdown_MarkAllRead]: 'Tout marquer comme lu',
  [BrightHubStrings.NotificationDropdown_EmptyState]: 'Aucune notification',
  [BrightHubStrings.NotificationDropdown_Loading]:
    'Chargement des notifications',

  // NotificationItem
  [BrightHubStrings.NotificationItem_AriaLabel]: 'Notification',
  [BrightHubStrings.NotificationItem_MarkRead]: 'Marquer comme lu',
  [BrightHubStrings.NotificationItem_Delete]: 'Supprimer',
  [BrightHubStrings.NotificationItem_GroupExpandTemplate]:
    'Afficher {COUNT} de plus',
  [BrightHubStrings.NotificationItem_GroupCollapseTemplate]: 'Afficher moins',

  // NotificationList
  [BrightHubStrings.NotificationList_Title]: 'Notifications',
  [BrightHubStrings.NotificationList_AriaLabel]: 'Liste des notifications',
  [BrightHubStrings.NotificationList_Loading]: 'Chargement des notifications',
  [BrightHubStrings.NotificationList_EmptyState]: 'Aucune notification',
  [BrightHubStrings.NotificationList_FilterAll]: 'Toutes',
  [BrightHubStrings.NotificationList_FilterUnread]: 'Non lues',
  [BrightHubStrings.NotificationList_FilterRead]: 'Lues',
  [BrightHubStrings.NotificationList_LoadMore]: 'Charger plus',
  [BrightHubStrings.NotificationList_EndOfList]: 'Plus de notifications',

  // NotificationPreferences
  [BrightHubStrings.NotificationPreferences_Title]:
    'Préférences de notification',
  [BrightHubStrings.NotificationPreferences_AriaLabel]:
    'Préférences de notification',
  [BrightHubStrings.NotificationPreferences_CategorySettings]:
    'Paramètres par catégorie',
  [BrightHubStrings.NotificationPreferences_ChannelSettings]:
    'Paramètres par canal',
  [BrightHubStrings.NotificationPreferences_QuietHours]: 'Heures calmes',
  [BrightHubStrings.NotificationPreferences_QuietHoursEnabled]:
    'Activer les heures calmes',
  [BrightHubStrings.NotificationPreferences_QuietHoursStart]: 'Heure de début',
  [BrightHubStrings.NotificationPreferences_QuietHoursEnd]: 'Heure de fin',
  [BrightHubStrings.NotificationPreferences_QuietHoursTimezone]:
    'Fuseau horaire',
  [BrightHubStrings.NotificationPreferences_DoNotDisturb]: 'Ne pas déranger',
  [BrightHubStrings.NotificationPreferences_DndEnabled]:
    'Activer Ne pas déranger',
  [BrightHubStrings.NotificationPreferences_DndDuration]: 'Durée',
  [BrightHubStrings.NotificationPreferences_SoundEnabled]:
    'Sons de notification',
  [BrightHubStrings.NotificationPreferences_Save]: 'Enregistrer',
  [BrightHubStrings.NotificationPreferences_CategorySocial]: 'Social',
  [BrightHubStrings.NotificationPreferences_CategoryMessages]: 'Messages',
  [BrightHubStrings.NotificationPreferences_CategoryConnections]: 'Connexions',
  [BrightHubStrings.NotificationPreferences_CategorySystem]: 'Système',
  [BrightHubStrings.NotificationPreferences_ChannelInApp]: "Dans l'application",
  [BrightHubStrings.NotificationPreferences_ChannelEmail]: 'E-mail',
  [BrightHubStrings.NotificationPreferences_ChannelPush]: 'Push',

  // NotificationCategoryFilter
  [BrightHubStrings.NotificationCategoryFilter_Title]: 'Filtrer par catégorie',
  [BrightHubStrings.NotificationCategoryFilter_AriaLabel]:
    'Filtre de catégorie de notification',
  [BrightHubStrings.NotificationCategoryFilter_All]: 'Toutes',
  [BrightHubStrings.NotificationCategoryFilter_Social]: 'Social',
  [BrightHubStrings.NotificationCategoryFilter_Messages]: 'Messages',
  [BrightHubStrings.NotificationCategoryFilter_Connections]: 'Connexions',
  [BrightHubStrings.NotificationCategoryFilter_System]: 'Système',

  // Navigation / Sidebar
  [BrightHubStrings.Nav_Home]: 'Accueil',
  [BrightHubStrings.Nav_Explore]: 'Explorer',
  [BrightHubStrings.Nav_Notifications]: 'Notifications',
  [BrightHubStrings.Nav_Messages]: 'Messages',
  [BrightHubStrings.Nav_Profile]: 'Profil',
  [BrightHubStrings.Nav_Connections]: 'Connexions',
  [BrightHubStrings.Nav_Settings]: 'Paramètres',
  [BrightHubStrings.Nav_SidebarLabel]: 'Navigation BrightHub',
  [BrightHubStrings.Nav_SubscribedHubs]: 'Vos Hubs',
  [BrightHubStrings.Nav_CreateHub]: 'Créer un Hub',

  // Hub Detail Page
  [BrightHubStrings.HubDetail_MembersTemplate]: '{COUNT} membres',
  [BrightHubStrings.HubDetail_PostsTemplate]: '{COUNT} publications',
  [BrightHubStrings.HubDetail_Join]: 'Rejoindre',
  [BrightHubStrings.HubDetail_Leave]: 'Quitter',
  [BrightHubStrings.HubDetail_Joined]: 'Rejoint',
  [BrightHubStrings.HubDetail_TrustOpen]: 'Ouvert',
  [BrightHubStrings.HubDetail_TrustVerified]: 'Vérifié',
  [BrightHubStrings.HubDetail_TrustEncrypted]: 'Chiffré',
  [BrightHubStrings.HubDetail_About]: 'À propos',
  [BrightHubStrings.HubDetail_Rules]: 'Règles',
  [BrightHubStrings.HubDetail_SortHot]: 'Populaire',
  [BrightHubStrings.HubDetail_SortNew]: 'Nouveau',
  [BrightHubStrings.HubDetail_SortTop]: 'Meilleur',
  [BrightHubStrings.HubDetail_EmptyState]:
    'Pas encore de publications. Soyez le premier à lancer une discussion !',
  [BrightHubStrings.HubDetail_SubHubs]: 'Sous-hubs',

  // Explore Hubs Page
  [BrightHubStrings.Explore_Title]: 'Explorer les Hubs',
  [BrightHubStrings.Explore_SearchPlaceholder]: 'Rechercher des hubs…',
  [BrightHubStrings.Explore_Trending]: 'Tendance',
  [BrightHubStrings.Explore_New]: 'Nouveau',
  [BrightHubStrings.Explore_EmptyState]:
    'Pas encore de hubs. Créez-en un pour commencer !',
  [BrightHubStrings.Explore_NoResults]:
    'Aucun hub ne correspond à votre recherche.',

  // Home Page Sections
  [BrightHubStrings.Home_TrendingHubs]: 'Hubs tendance',
  [BrightHubStrings.Home_RecentActivity]: 'Activité récente',
  [BrightHubStrings.Home_YourHubs]: 'Vos Hubs',
  [BrightHubStrings.Home_SuggestedHubs]: 'Hubs suggérés',
  [BrightHubStrings.Home_ViewAll]: 'Voir tout',
  [BrightHubStrings.Home_Welcome]: 'Bienvenue sur BrightHub',
  [BrightHubStrings.Home_WelcomeSubtitle]:
    'Rejoignez des hubs pour voir les discussions des communautés qui vous intéressent.',
  [BrightHubStrings.Home_NoHubsYet]: "Vous n'avez rejoint aucun hub",
  [BrightHubStrings.Home_NoHubsHint]:
    'Explorez les hubs pour trouver des communautés qui vous intéressent.',

  // Create Hub Page
  [BrightHubStrings.CreateHub_Title]: 'Créer un Hub',
  [BrightHubStrings.CreateHub_NameLabel]: 'Nom du hub',
  [BrightHubStrings.CreateHub_NamePlaceholder]: 'ex. Programmation',
  [BrightHubStrings.CreateHub_SlugLabel]: 'Slug URL',
  [BrightHubStrings.CreateHub_SlugPlaceholder]: 'ex. programmation',
  [BrightHubStrings.CreateHub_DescriptionLabel]: 'Description',
  [BrightHubStrings.CreateHub_DescriptionPlaceholder]: 'De quoi parle ce hub ?',
  [BrightHubStrings.CreateHub_TrustTierLabel]: 'Niveau de confiance',
  [BrightHubStrings.CreateHub_ParentHubLabel]: 'Hub parent (optionnel)',
  [BrightHubStrings.CreateHub_ParentHubNone]: 'Aucun (hub principal)',
  [BrightHubStrings.CreateHub_Submit]: 'Créer le Hub',
  [BrightHubStrings.CreateHub_Cancel]: 'Annuler',

  // Sidebar extras
  [BrightHubStrings.Nav_CreatePost]: 'Nouvelle publication',
  [BrightHubStrings.Nav_Trending]: 'Tendance',

  // PinnedPostSection
  [BrightHubStrings.PinnedPostSection_Pinned]: 'Épinglé',
  [BrightHubStrings.PinnedPostSection_Unpin]: 'Désépingler',
  [BrightHubStrings.PinnedPostSection_AriaLabel]: 'Publication épinglée',

  // EditProfileDialog
  [BrightHubStrings.EditProfileDialog_Title]: 'Modifier le profil',
  [BrightHubStrings.EditProfileDialog_DisplayName]: "Nom d'affichage",
  [BrightHubStrings.EditProfileDialog_Bio]: 'Bio',
  [BrightHubStrings.EditProfileDialog_BioPlaceholder]: 'Parlez de vous. Markdown et icônes pris en charge.',
  [BrightHubStrings.EditProfileDialog_BioCharCountTemplate]: '{CURRENT}/{MAX}',
  [BrightHubStrings.EditProfileDialog_BioPreview]: 'Aperçu',
  [BrightHubStrings.EditProfileDialog_Location]: 'Lieu',
  [BrightHubStrings.EditProfileDialog_WebsiteUrl]: 'Site web',
  [BrightHubStrings.EditProfileDialog_Save]: 'Enregistrer',
  [BrightHubStrings.EditProfileDialog_Cancel]: 'Annuler',
  [BrightHubStrings.EditProfileDialog_Saving]: 'Enregistrement\u2026',
  [BrightHubStrings.EditProfileDialog_ErrorBioTooLong]: 'La bio dépasse la longueur maximale de {MAX} caractères.',
  [BrightHubStrings.EditProfileDialog_ErrorBioContainsImage]: 'La bio ne peut pas contenir de syntaxe Markdown pour les images.',

  // UserProfileCard
  [BrightHubStrings.UserProfileCard_EditProfile]: 'Modifier le profil',
};
