import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightChatStringKey,
  BrightChatStrings,
} from '../../enumerations/brightChatStrings';

export const BrightChatFrenchStrings: ComponentStrings<BrightChatStringKey> = {
  // Menu
  [BrightChatStrings.MenuLabel]: 'BrightChat',
  [BrightChatStrings.ChatSectionsLabel]: 'Sections de chat',
  [BrightChatStrings.Nav_Conversations]: 'Conversations',
  [BrightChatStrings.Nav_Groups]: 'Groupes',
  [BrightChatStrings.Nav_Channels]: 'Canaux',
  [BrightChatStrings.Nav_DirectMessages]: 'Messages directs',

  // Server Rail
  [BrightChatStrings.Server_Rail]: 'Serveurs',
  [BrightChatStrings.Server_Rail_Home]: 'Accueil',
  [BrightChatStrings.Server_Rail_CreateServer]: 'Créer un serveur',

  // Create Server Dialog
  [BrightChatStrings.Create_Server]: 'Créer un serveur',
  [BrightChatStrings.Create_Server_Title]: 'Créer un serveur',
  [BrightChatStrings.Create_Server_NameLabel]: 'Nom du serveur',
  [BrightChatStrings.Create_Server_NamePlaceholder]: 'Entrez le nom du serveur',
  [BrightChatStrings.Create_Server_IconLabel]: 'Icône du serveur',
  [BrightChatStrings.Create_Server_Submit]: 'Créer',
  [BrightChatStrings.Create_Server_Cancel]: 'Annuler',

  // Channel Sidebar
  [BrightChatStrings.Channel_Sidebar]: 'Canaux',
  [BrightChatStrings.Channel_Sidebar_CreateChannel]: 'Créer un canal',

  // Create Channel Dialog
  [BrightChatStrings.Create_Channel]: 'Créer un canal',
  [BrightChatStrings.Create_Channel_Title]: 'Créer un canal',
  [BrightChatStrings.Create_Channel_NameLabel]: 'Nom du canal',
  [BrightChatStrings.Create_Channel_TopicLabel]: 'Sujet',
  [BrightChatStrings.Create_Channel_CategoryLabel]: 'Catégorie',
  [BrightChatStrings.Create_Channel_Submit]: 'Créer',
  [BrightChatStrings.Create_Channel_Cancel]: 'Annuler',

  // Create DM Dialog
  [BrightChatStrings.Create_DM]: 'Nouveau message',
  [BrightChatStrings.Create_DM_Title]: 'Nouveau message direct',
  [BrightChatStrings.Create_DM_SearchPlaceholder]: 'Rechercher un utilisateur',
  [BrightChatStrings.Create_DM_Submit]: 'Envoyer',
  [BrightChatStrings.Create_DM_Cancel]: 'Annuler',
  [BrightChatStrings.Create_DM_NewMessage]: 'Nouveau message',

  // Server Settings Panel
  [BrightChatStrings.Server_Settings]: 'Paramètres du serveur',
  [BrightChatStrings.Server_Settings_Title]: 'Paramètres du serveur',
  [BrightChatStrings.Server_Settings_Overview]: 'Aperçu',
  [BrightChatStrings.Server_Settings_Members]: 'Membres',
  [BrightChatStrings.Server_Settings_Categories]: 'Catégories',
  [BrightChatStrings.Server_Settings_Invites]: 'Invitations',
  [BrightChatStrings.Server_Settings_Save]: 'Enregistrer',

  // Channel Context Menu
  [BrightChatStrings.Channel_Edit]: 'Modifier le canal',
  [BrightChatStrings.Channel_Delete]: 'Supprimer le canal',
  [BrightChatStrings.Channel_Mute]: 'Couper le canal',

  // Edit Channel Dialog
  [BrightChatStrings.Edit_Channel_Title]: 'Modifier le canal',
  [BrightChatStrings.Edit_Channel_NameLabel]: 'Nom du canal',
  [BrightChatStrings.Edit_Channel_TopicLabel]: 'Sujet',
  [BrightChatStrings.Edit_Channel_Save]: 'Enregistrer',
  [BrightChatStrings.Edit_Channel_Cancel]: 'Annuler',
  [BrightChatStrings.Edit_Channel_Saving]: 'Enregistrement…',
  [BrightChatStrings.Edit_Channel_Failed]: 'Échec de la mise à jour du canal',
  [BrightChatStrings.Edit_Channel_NameRequired]: 'Le nom du canal est requis',
  [BrightChatStrings.Edit_Channel_NameLength]:
    'Le nom du canal doit contenir entre 2 et 100 caractères',

  // Delete Channel Confirmation
  [BrightChatStrings.Delete_Channel_Title]: 'Supprimer le canal',
  [BrightChatStrings.Delete_Channel_Confirm]: 'Supprimer',
  [BrightChatStrings.Delete_Channel_Cancel]: 'Annuler',
  [BrightChatStrings.Delete_Channel_Deleting]: 'Suppression…',
  [BrightChatStrings.Delete_Channel_Failed]: 'Échec de la suppression du canal',

  // Presence Status Labels
  [BrightChatStrings.Presence_Online]: 'En ligne',
  [BrightChatStrings.Presence_Idle]: 'Inactif',
  [BrightChatStrings.Presence_DoNotDisturb]: 'Ne pas déranger',
  [BrightChatStrings.Presence_Offline]: 'Hors ligne',
  [BrightChatStrings.Presence_SetStatus]: 'Définir le statut',

  // Breadcrumb Navigation
  [BrightChatStrings.Breadcrumb_BrightChat]: 'BrightChat',
  [BrightChatStrings.Breadcrumb_Conversation]: 'Conversation',
  [BrightChatStrings.Breadcrumb_Group]: 'Groupe',
  [BrightChatStrings.Breadcrumb_Channel]: 'Canal',

  // Channel Permissions (Discord-style)
  [BrightChatStrings.Channel_Permissions]: 'Permissions',
  [BrightChatStrings.Channel_Permissions_Title]: 'Permissions du canal',
  [BrightChatStrings.Channel_Permissions_Role]: 'Rôle',
  [BrightChatStrings.Channel_Permissions_SendMessages]: 'Envoyer des messages',
  [BrightChatStrings.Channel_Permissions_ManageChannel]: 'Gérer le canal',
  [BrightChatStrings.Channel_Permissions_ManageMembers]: 'Gérer les membres',
  [BrightChatStrings.Channel_Permissions_CreateInvites]:
    'Créer des invitations',
  [BrightChatStrings.Channel_Permissions_PinMessages]: 'Épingler des messages',
  [BrightChatStrings.Channel_Permissions_MuteMembers]: 'Couper les membres',
  [BrightChatStrings.Channel_Permissions_KickMembers]: 'Expulser les membres',
  [BrightChatStrings.Channel_Permissions_DeleteMessages]:
    'Supprimer des messages',

  // Channel Visibility
  [BrightChatStrings.Channel_Visibility_Public]: 'Public',
  [BrightChatStrings.Channel_Visibility_Private]: 'Privé',
  [BrightChatStrings.Channel_Visibility_Secret]: 'Secret',
  [BrightChatStrings.Channel_Visibility_Public_Desc]:
    'Tout le monde peut voir et rejoindre',
  [BrightChatStrings.Channel_Visibility_Private_Desc]:
    'Sur invitation uniquement',
  [BrightChatStrings.Channel_Visibility_Secret_Desc]: 'Caché aux non-membres',
  [BrightChatStrings.Compose_Placeholder]: 'Tapez un message chiffré...',
  [BrightChatStrings.Compose_SendLabel]: 'Envoyer le message',
  [BrightChatStrings.Compose_MessageNotDelivered]:
    "Le message n'a pas pu être livré",
  [BrightChatStrings.Compose_SendFailed]: "Échec de l'envoi du message",
  [BrightChatStrings.ConversationList_Title]: 'Conversations',
  [BrightChatStrings.ConversationList_NewMessage]: 'Nouveau message',
  [BrightChatStrings.ConversationList_Empty]: 'Pas encore de messages directs.',
  [BrightChatStrings.ConversationList_RecentChannels]: 'Canaux récents',
  [BrightChatStrings.MessageThread_Empty]:
    'Pas encore de messages. Lancez la conversation !',
  [BrightChatStrings.Create_Channel_NamePlaceholder]: 'ex. général',
  [BrightChatStrings.Create_Channel_TopicPlaceholder]:
    'De quoi parle ce canal ?',
  [BrightChatStrings.Create_Channel_VisibilityLabel]: 'Visibilité',
  [BrightChatStrings.Create_Channel_NameRequired]: 'Le nom du canal est requis',
  [BrightChatStrings.Create_Channel_NameLength]:
    'Le nom du canal doit contenir entre 2 et 100 caractères',
  [BrightChatStrings.Create_Channel_Creating]: 'Création...',
  [BrightChatStrings.Create_Channel_Failed]: 'Échec de la création du canal',
  [BrightChatStrings.Create_Channel_CategoryNone]: 'Aucune',
  [BrightChatStrings.Server_Settings_ServerNameLabel]: 'Nom du serveur',
  [BrightChatStrings.Server_Settings_IconUrlLabel]: "URL de l'icône",
  [BrightChatStrings.Server_Settings_Saving]: 'Enregistrement…',
  [BrightChatStrings.Server_Settings_GenerateInvite]: 'Générer une invitation',
  [BrightChatStrings.Server_Settings_CopyToken]: 'Copier le jeton',
  [BrightChatStrings.Server_Settings_Uses]: 'Utilisations',
  [BrightChatStrings.Server_Settings_NewCategory]: 'Nouvelle catégorie',
  [BrightChatStrings.Server_Settings_AddCategory]: 'Ajouter',
  [BrightChatStrings.Server_Settings_ChannelCount]: 'canaux',
  [BrightChatStrings.Server_Settings_RemoveMember]: 'Retirer le membre',
  [BrightChatStrings.Server_Settings_DeleteCategory]: 'Supprimer la catégorie',
  [BrightChatStrings.Server_Settings_DeleteServer]: 'Supprimer le serveur',
  [BrightChatStrings.Server_Settings_DeleteServerConfirm]: 'Êtes-vous sûr de vouloir supprimer ce serveur ? Tous les canaux et messages seront définitivement perdus.',
  [BrightChatStrings.Server_Settings_DeleteServerConfirmTitle]: 'Supprimer le serveur',
  [BrightChatStrings.DMSidebar_NoConversations]: 'Pas encore de conversations',
  [BrightChatStrings.DMSidebar_NoGroups]: 'Pas encore de discussions de groupe',

  // Encryption
  [BrightChatStrings.Encryption_E2E]: 'Chiffré de bout en bout',
  [BrightChatStrings.Encryption_E2E_AriaLabel]:
    'Cette conversation est chiffrée de bout en bout',
  [BrightChatStrings.Encryption_EncryptedServer]: 'Serveur chiffré',
  [BrightChatStrings.Encryption_ServerEncrypted]: 'Chiffré',

  // Key Rotation
  [BrightChatStrings.KeyRotation_MemberJoined]:
    'Clé de chiffrement mise à jour — un membre a rejoint',
  [BrightChatStrings.KeyRotation_MemberLeft]:
    'Clé de chiffrement mise à jour — un membre est parti',
  [BrightChatStrings.KeyRotation_MemberRemoved]:
    'Clé de chiffrement mise à jour — un membre a été retiré',

  // Channel List View
  [BrightChatStrings.ChannelList_Title]: 'Canaux',
  [BrightChatStrings.ChannelList_Empty]: 'Pas encore de canaux.',
  [BrightChatStrings.ChannelList_Join]: 'Rejoindre',
  [BrightChatStrings.ChannelList_Joining]: 'Connexion…',
  [BrightChatStrings.ChannelList_MemberCount]: 'membre',

  // Group List View
  [BrightChatStrings.GroupList_Title]: 'Groupes',
  [BrightChatStrings.GroupList_Empty]: 'Pas encore de groupes.',
  [BrightChatStrings.GroupList_MemberCount]: 'membre',

  // Create Server Dialog extras
  [BrightChatStrings.Create_Server_IconLabelOptional]:
    "URL de l'icône (optionnel)",
  [BrightChatStrings.Create_Server_Creating]: 'Création…',
  [BrightChatStrings.Create_Server_NameRequired]:
    'Le nom du serveur est requis',
  [BrightChatStrings.Create_Server_NameTooLong]:
    'Le nom du serveur doit contenir 100 caractères ou moins',
  [BrightChatStrings.Create_Server_Failed]: 'Échec de la création du serveur',

  // Create DM Dialog extras
  [BrightChatStrings.Create_DM_SearchLabel]: 'Rechercher des utilisateurs',
  [BrightChatStrings.Create_DM_SearchHint]: 'Saisissez un nom…',
  [BrightChatStrings.Create_DM_NoUsersFound]: 'Aucun utilisateur trouvé',
  [BrightChatStrings.Create_DM_SelectUser]:
    'Veuillez sélectionner un utilisateur',
  [BrightChatStrings.Create_DM_Starting]: 'Démarrage…',
  [BrightChatStrings.Create_DM_StartConversation]: 'Démarrer la conversation',
  [BrightChatStrings.Create_DM_Failed]: 'Échec du démarrage de la conversation',

  // Channel Permissions Panel
  [BrightChatStrings.Permissions_SelectChannel]:
    'Sélectionnez un canal pour afficher les permissions.',
  [BrightChatStrings.Permissions_PermissionsFor]: 'Permissions pour',
  [BrightChatStrings.Permissions_MembersWith]: 'Membres avec',
  [BrightChatStrings.Permissions_NoMembers]: 'Aucun membre avec ce rôle',
  [BrightChatStrings.Permissions_Joined]: 'Rejoint',
  [BrightChatStrings.Permissions_DeleteOwnMessages]:
    'Supprimer ses propres messages',
  [BrightChatStrings.Permissions_DeleteAnyMessage]:
    "Supprimer n'importe quel message",
  [BrightChatStrings.Permissions_ManageRoles]: 'Gérer les rôles',

  // Roles
  [BrightChatStrings.Role_Owner]: 'Propriétaire',
  [BrightChatStrings.Role_Admin]: 'Administrateur',
  [BrightChatStrings.Role_Moderator]: 'Modérateur',
  [BrightChatStrings.Role_Member]: 'Membre',

  // Channel Sidebar extras
  [BrightChatStrings.Channel_Sidebar_Uncategorized]: 'Non catégorisé',

  // Message Thread extras
  [BrightChatStrings.MessageThread_Pinned]: 'Message épinglé',
  [BrightChatStrings.MessageThread_Edited]: '(modifié)',
  [BrightChatStrings.MessageThread_TypingSingle]: "est en train d'écrire…",
  [BrightChatStrings.MessageThread_TypingMultiple]: "sont en train d'écrire…",

  // Layout
  [BrightChatStrings.Layout_BreadcrumbLabel]: "Fil d'Ariane BrightChat",
  [BrightChatStrings.Layout_UserProfile]: 'Profil utilisateur',
  [BrightChatStrings.Layout_OpenNavigation]: 'Ouvrir la navigation',

  // Friends Suggestion Section
  [BrightChatStrings.Friends_SectionTitle]: 'Amis',

  // Server Icon Upload
  [BrightChatStrings.Server_Icon_Upload]: "Télécharger l'icône",
  [BrightChatStrings.Server_Icon_Change]: "Changer l'icône",
  [BrightChatStrings.Server_Icon_Remove]: "Supprimer l'icône",
  [BrightChatStrings.Server_Icon_RemoveConfirm]:
    "Êtes-vous sûr de vouloir supprimer l'icône du serveur ?",
  [BrightChatStrings.Server_Icon_RemoveConfirmTitle]:
    "Supprimer l'icône du serveur",
  [BrightChatStrings.Server_Icon_Uploading]: 'Téléchargement…',
  [BrightChatStrings.Server_Icon_UploadFailed]:
    "Échec du téléchargement de l'icône",
  [BrightChatStrings.Server_Icon_UploadSuccess]:
    'Icône téléchargée avec succès',
  [BrightChatStrings.Server_Icon_FileTooLarge]:
    'Le fichier est trop volumineux. La taille maximale est de 5 Mo.',
  [BrightChatStrings.Server_Icon_InvalidType]:
    'Type de fichier non valide. Types autorisés : PNG, JPEG, GIF, WebP.',
  [BrightChatStrings.Server_Icon_CropTitle]: "Recadrer l'icône du serveur",
  [BrightChatStrings.Server_Icon_CropConfirm]: 'Appliquer',
  [BrightChatStrings.Server_Icon_CropCancel]: 'Annuler',
  [BrightChatStrings.Server_Icon_ZoomLabel]: 'Zoom',
  [BrightChatStrings.Server_Icon_PreviewAlt]: "Aperçu de l'icône du serveur",
  [BrightChatStrings.Server_Icon_UploadLabel]: "Télécharger l'icône du serveur",
  [BrightChatStrings.Server_Icon_DropOrBrowse]:
    'Déposez une image ou cliquez pour parcourir',
  [BrightChatStrings.Server_Icon_StagingFailed]:
    'Échec de la préparation du fichier pour le téléchargement',
  [BrightChatStrings.Server_Icon_StagingExpired]:
    "Le fichier préparé a expiré. Veuillez sélectionner l'image à nouveau.",

  // FontAwesome Icon Picker
  [BrightChatStrings.IconPicker_Title]: 'Choisir une icône',
  [BrightChatStrings.IconPicker_SearchPlaceholder]: 'Rechercher des icônes...',
  [BrightChatStrings.IconPicker_NoMatchTemplate]:
    'Aucune icône ne correspond à « {0} »',
  [BrightChatStrings.IconPicker_Cancel]: 'Annuler',
  [BrightChatStrings.IconPicker_RemoveIcon]: "Supprimer l'icône",
  [BrightChatStrings.IconPicker_CurrentLabel]: 'Actuel :',
};
