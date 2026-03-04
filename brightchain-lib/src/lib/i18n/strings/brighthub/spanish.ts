import { StringsCollection } from '@digitaldefiance/i18n-lib';
import {
  BrightHubStringKey,
  BrightHubStrings,
} from '../../../enumerations/brightHubStrings';

export const BrightHubSpanishStrings: StringsCollection<BrightHubStringKey> = {
  // PostCard
  [BrightHubStrings.PostCard_Reposted]: 'Republicado',
  [BrightHubStrings.PostCard_Edited]: 'Editado',
  [BrightHubStrings.PostCard_HubRestricted]:
    'Visible solo para miembros del hub',
  [BrightHubStrings.PostCard_Deleted]: 'Esta publicación ha sido eliminada.',
  [BrightHubStrings.PostCard_ReplyAriaTemplate]:
    'Responder, {COUNT} respuestas',
  [BrightHubStrings.PostCard_RepostAriaTemplate]:
    'Republicar, {COUNT} republicaciones',
  [BrightHubStrings.PostCard_LikeAriaTemplate]: 'Me gusta, {COUNT} me gusta',
  [BrightHubStrings.PostCard_UnlikeAriaTemplate]:
    'Ya no me gusta, {COUNT} me gusta',
  [BrightHubStrings.PostCard_PostByAriaTemplate]: 'Publicación de {NAME}',

  // PostComposer
  [BrightHubStrings.PostComposer_Placeholder]: '¿Qué está pasando?',
  [BrightHubStrings.PostComposer_ReplyPlaceholder]: 'Publica tu respuesta',
  [BrightHubStrings.PostComposer_ReplyingTo]: 'Respondiendo a',
  [BrightHubStrings.PostComposer_CancelReply]: 'Cancelar respuesta',
  [BrightHubStrings.PostComposer_Bold]: 'Negrita',
  [BrightHubStrings.PostComposer_Italic]: 'Cursiva',
  [BrightHubStrings.PostComposer_Code]: 'Código',
  [BrightHubStrings.PostComposer_Emoji]: 'Insertar emoji',
  [BrightHubStrings.PostComposer_AttachImage]: 'Adjuntar imagen',
  [BrightHubStrings.PostComposer_RemoveAttachmentTemplate]:
    'Eliminar adjunto {INDEX}',
  [BrightHubStrings.PostComposer_AttachmentAltTemplate]: 'Adjunto {INDEX}',
  [BrightHubStrings.PostComposer_VisibleTo]: 'Visible para',
  [BrightHubStrings.PostComposer_MembersTemplate]: '{COUNT} miembros',
  [BrightHubStrings.PostComposer_SubmitPost]: 'Enviar publicación',
  [BrightHubStrings.PostComposer_Post]: 'Publicar',
  [BrightHubStrings.PostComposer_Reply]: 'Responder',

  // Timeline
  [BrightHubStrings.Timeline_AriaLabel]: 'Línea de tiempo',
  [BrightHubStrings.Timeline_FilteredByTemplate]: 'Filtrado por: {LABEL}',
  [BrightHubStrings.Timeline_ClearFilter]: 'Borrar',
  [BrightHubStrings.Timeline_EmptyDefault]:
    'Aún no hay publicaciones. Sigue a personas para ver sus publicaciones aquí.',
  [BrightHubStrings.Timeline_LoadingPosts]: 'Cargando publicaciones',
  [BrightHubStrings.Timeline_AllCaughtUp]: 'Estás al día',

  // ThreadView
  [BrightHubStrings.ThreadView_AriaLabel]: 'Hilo de conversación',
  [BrightHubStrings.ThreadView_ParentDeleted]:
    'La publicación original fue eliminada',
  [BrightHubStrings.ThreadView_ReplyCountSingular]: '1 respuesta',
  [BrightHubStrings.ThreadView_ReplyCountPluralTemplate]: '{COUNT} respuestas',
  [BrightHubStrings.ThreadView_ParticipantCountSingular]: '1 participante',
  [BrightHubStrings.ThreadView_ParticipantCountPluralTemplate]:
    '{COUNT} participantes',
  [BrightHubStrings.ThreadView_NoReplies]:
    'Aún no hay respuestas. ¡Sé el primero en responder!',

  // FollowButton
  [BrightHubStrings.FollowButton_Follow]: 'Seguir',
  [BrightHubStrings.FollowButton_Following]: 'Siguiendo',
  [BrightHubStrings.FollowButton_Unfollow]: 'Dejar de seguir',

  // LikeButton
  [BrightHubStrings.LikeButton_LikeAriaTemplate]: 'Me gusta, {COUNT} me gusta',
  [BrightHubStrings.LikeButton_UnlikeAriaTemplate]:
    'Ya no me gusta, {COUNT} me gusta',

  // RepostButton
  [BrightHubStrings.RepostButton_RepostAriaTemplate]:
    'Republicar, {COUNT} republicaciones',
  [BrightHubStrings.RepostButton_UndoRepostAriaTemplate]:
    'Deshacer republicación, {COUNT} republicaciones',

  // UserProfileCard
  [BrightHubStrings.UserProfileCard_Verified]: 'Verificado',
  [BrightHubStrings.UserProfileCard_ProtectedAccount]: 'Cuenta protegida',
  [BrightHubStrings.UserProfileCard_ProfileOfTemplate]: 'Perfil de {NAME}',
  [BrightHubStrings.UserProfileCard_Following]: 'Siguiendo',
  [BrightHubStrings.UserProfileCard_Followers]: 'Seguidores',
  [BrightHubStrings.UserProfileCard_StrongConnection]: 'Conexión fuerte',
  [BrightHubStrings.UserProfileCard_ModerateConnection]: 'Conexión moderada',
  [BrightHubStrings.UserProfileCard_WeakConnection]: 'Conexión débil',
  [BrightHubStrings.UserProfileCard_DormantConnection]: 'Conexión inactiva',
  [BrightHubStrings.UserProfileCard_MutualConnectionSingular]:
    '1 conexión mutua',
  [BrightHubStrings.UserProfileCard_MutualConnectionPluralTemplate]:
    '{COUNT} conexiones mutuas',

  // SearchResults
  [BrightHubStrings.SearchResults_AriaTemplate]:
    'Resultados de búsqueda para "{QUERY}"',
  [BrightHubStrings.SearchResults_TabAll]: 'Todo',
  [BrightHubStrings.SearchResults_TabPosts]: 'Publicaciones',
  [BrightHubStrings.SearchResults_TabPostsTemplate]: 'Publicaciones ({COUNT})',
  [BrightHubStrings.SearchResults_TabUsers]: 'Usuarios',
  [BrightHubStrings.SearchResults_TabUsersTemplate]: 'Usuarios ({COUNT})',
  [BrightHubStrings.SearchResults_NoResultsTemplate]:
    'No se encontraron resultados para "{QUERY}"',
  [BrightHubStrings.SearchResults_EnterSearchTerm]:
    'Ingresa un término de búsqueda para encontrar publicaciones y personas',
  [BrightHubStrings.SearchResults_SectionPeople]: 'Personas',
  [BrightHubStrings.SearchResults_SectionPosts]: 'Publicaciones',
  [BrightHubStrings.SearchResults_Loading]: 'Cargando resultados de búsqueda',
  [BrightHubStrings.SearchResults_EndOfResults]: 'Fin de los resultados',

  // MessagingInbox
  [BrightHubStrings.MessagingInbox_Title]: 'Mensajes',
  [BrightHubStrings.MessagingInbox_AriaLabel]: 'Bandeja de mensajes',
  [BrightHubStrings.MessagingInbox_Loading]: 'Cargando conversaciones',
  [BrightHubStrings.MessagingInbox_EmptyState]: 'No hay conversaciones aún.',
  [BrightHubStrings.MessagingInbox_EmptyStateHint]:
    'Inicia una nueva conversación para empezar.',
  [BrightHubStrings.MessagingInbox_Pinned]: 'Fijada',
  [BrightHubStrings.MessagingInbox_UnreadTemplate]: '{COUNT} sin leer',
  [BrightHubStrings.MessagingInbox_NewConversation]: 'Nueva conversación',
  [BrightHubStrings.MessagingInbox_GroupBadge]: 'Grupo',

  // ConversationView
  [BrightHubStrings.ConversationView_AriaLabel]: 'Vista de conversación',
  [BrightHubStrings.ConversationView_Loading]: 'Cargando mensajes',
  [BrightHubStrings.ConversationView_EmptyState]:
    'No hay mensajes aún. Envía el primero.',
  [BrightHubStrings.ConversationView_LoadMore]: 'Cargar más',

  // MessageComposer
  [BrightHubStrings.MessageComposer_Placeholder]: 'Escribe un mensaje…',
  [BrightHubStrings.MessageComposer_AriaLabel]: 'Redactar mensaje',
  [BrightHubStrings.MessageComposer_Send]: 'Enviar',
  [BrightHubStrings.MessageComposer_AttachFile]: 'Adjuntar archivo',
  [BrightHubStrings.MessageComposer_ReplyingTo]: 'Respondiendo a',
  [BrightHubStrings.MessageComposer_CancelReply]: 'Cancelar respuesta',

  // MessageRequestsList
  [BrightHubStrings.MessageRequestsList_Title]: 'Solicitudes de mensaje',
  [BrightHubStrings.MessageRequestsList_AriaLabel]:
    'Lista de solicitudes de mensaje',
  [BrightHubStrings.MessageRequestsList_Loading]: 'Cargando solicitudes',
  [BrightHubStrings.MessageRequestsList_EmptyState]:
    'No hay solicitudes pendientes.',
  [BrightHubStrings.MessageRequestsList_Accept]: 'Aceptar',
  [BrightHubStrings.MessageRequestsList_Decline]: 'Rechazar',
  [BrightHubStrings.MessageRequestsList_PendingCountTemplate]:
    '{COUNT} pendientes',

  // MessageBubble
  [BrightHubStrings.MessageBubble_AriaLabel]: 'Mensaje',
  [BrightHubStrings.MessageBubble_Edited]: 'Editado',
  [BrightHubStrings.MessageBubble_Forwarded]: 'Reenviado',
  [BrightHubStrings.MessageBubble_Deleted]: 'Este mensaje fue eliminado.',
  [BrightHubStrings.MessageBubble_ReplyTo]: 'Respuesta a',

  // TypingIndicator
  [BrightHubStrings.TypingIndicator_AriaLabel]: 'Indicador de escritura',
  [BrightHubStrings.TypingIndicator_SingleTemplate]: '{NAME} está escribiendo…',
  [BrightHubStrings.TypingIndicator_MultipleTemplate]:
    '{COUNT} personas están escribiendo…',

  // ReadReceipt
  [BrightHubStrings.ReadReceipt_AriaLabel]: 'Confirmación de lectura',
  [BrightHubStrings.ReadReceipt_Sent]: 'Enviado',
  [BrightHubStrings.ReadReceipt_Delivered]: 'Entregado',
  [BrightHubStrings.ReadReceipt_SeenTemplate]: 'Visto {TIMESTAMP}',

  // MessageReactions
  [BrightHubStrings.MessageReactions_AriaLabel]: 'Reacciones al mensaje',
  [BrightHubStrings.MessageReactions_AddReaction]: 'Agregar reacción',
  [BrightHubStrings.MessageReactions_CountTemplate]: '{COUNT}',
  [BrightHubStrings.MessageReactions_RemoveReaction]: 'Quitar reacción',

  // GroupConversationSettings
  [BrightHubStrings.GroupConversationSettings_Title]: 'Configuración del grupo',
  [BrightHubStrings.GroupConversationSettings_AriaLabel]:
    'Configuración de conversación grupal',
  [BrightHubStrings.GroupConversationSettings_GroupName]: 'Nombre del grupo',
  [BrightHubStrings.GroupConversationSettings_GroupAvatar]: 'Avatar del grupo',
  [BrightHubStrings.GroupConversationSettings_Participants]: 'Participantes',
  [BrightHubStrings.GroupConversationSettings_ParticipantCountTemplate]:
    '{COUNT} participantes',
  [BrightHubStrings.GroupConversationSettings_AddParticipant]:
    'Agregar participante',
  [BrightHubStrings.GroupConversationSettings_RemoveParticipant]:
    'Eliminar participante',
  [BrightHubStrings.GroupConversationSettings_PromoteToAdmin]:
    'Promover a administrador',
  [BrightHubStrings.GroupConversationSettings_DemoteFromAdmin]:
    'Quitar administrador',
  [BrightHubStrings.GroupConversationSettings_AdminBadge]: 'Admin',
  [BrightHubStrings.GroupConversationSettings_Save]: 'Guardar',
  [BrightHubStrings.GroupConversationSettings_Cancel]: 'Cancelar',
  [BrightHubStrings.GroupConversationSettings_LeaveGroup]: 'Salir del grupo',

  // NewConversationDialog
  [BrightHubStrings.NewConversationDialog_Title]: 'Nueva conversación',
  [BrightHubStrings.NewConversationDialog_AriaLabel]:
    'Diálogo de nueva conversación',
  [BrightHubStrings.NewConversationDialog_SearchPlaceholder]:
    'Buscar usuarios…',
  [BrightHubStrings.NewConversationDialog_CreateGroup]: 'Crear grupo',
  [BrightHubStrings.NewConversationDialog_GroupNamePlaceholder]:
    'Nombre del grupo',
  [BrightHubStrings.NewConversationDialog_SelectedTemplate]:
    '{COUNT} seleccionados',
  [BrightHubStrings.NewConversationDialog_Start]: 'Iniciar',
  [BrightHubStrings.NewConversationDialog_Cancel]: 'Cancelar',
  [BrightHubStrings.NewConversationDialog_NoResults]:
    'No se encontraron usuarios',

  // ConversationSearch
  [BrightHubStrings.ConversationSearch_Placeholder]:
    'Buscar en la conversación…',
  [BrightHubStrings.ConversationSearch_AriaLabel]: 'Buscar en conversación',
  [BrightHubStrings.ConversationSearch_NoResults]: 'No se encontraron mensajes',
  [BrightHubStrings.ConversationSearch_ResultCountTemplate]:
    '{COUNT} resultados',
  [BrightHubStrings.ConversationSearch_Clear]: 'Borrar búsqueda',

  // MessagingMenuBadge
  [BrightHubStrings.MessagingMenuBadge_AriaLabel]: 'Mensajes',
  [BrightHubStrings.MessagingMenuBadge_UnreadTemplate]:
    '{COUNT} mensajes sin leer',
  [BrightHubStrings.MessagingMenuBadge_NoUnread]: 'No hay mensajes sin leer',

  // NotificationProvider
  [BrightHubStrings.NotificationProvider_Error]:
    'Error al cargar notificaciones',

  // NotificationBell
  [BrightHubStrings.NotificationBell_AriaLabel]: 'Notificaciones',
  [BrightHubStrings.NotificationBell_UnreadTemplate]:
    '{COUNT} notificaciones sin leer',
  [BrightHubStrings.NotificationBell_NoUnread]: 'Sin notificaciones nuevas',
  [BrightHubStrings.NotificationBell_Overflow]: '99+',

  // NotificationDropdown
  [BrightHubStrings.NotificationDropdown_Title]: 'Notificaciones',
  [BrightHubStrings.NotificationDropdown_AriaLabel]: 'Panel de notificaciones',
  [BrightHubStrings.NotificationDropdown_ViewAll]: 'Ver todas',
  [BrightHubStrings.NotificationDropdown_MarkAllRead]:
    'Marcar todas como leídas',
  [BrightHubStrings.NotificationDropdown_EmptyState]: 'Sin notificaciones',
  [BrightHubStrings.NotificationDropdown_Loading]: 'Cargando notificaciones',

  // NotificationItem
  [BrightHubStrings.NotificationItem_AriaLabel]: 'Notificación',
  [BrightHubStrings.NotificationItem_MarkRead]: 'Marcar como leída',
  [BrightHubStrings.NotificationItem_Delete]: 'Eliminar',
  [BrightHubStrings.NotificationItem_GroupExpandTemplate]:
    'Mostrar {COUNT} más',
  [BrightHubStrings.NotificationItem_GroupCollapseTemplate]: 'Mostrar menos',

  // NotificationList
  [BrightHubStrings.NotificationList_Title]: 'Notificaciones',
  [BrightHubStrings.NotificationList_AriaLabel]: 'Lista de notificaciones',
  [BrightHubStrings.NotificationList_Loading]: 'Cargando notificaciones',
  [BrightHubStrings.NotificationList_EmptyState]: 'Sin notificaciones',
  [BrightHubStrings.NotificationList_FilterAll]: 'Todas',
  [BrightHubStrings.NotificationList_FilterUnread]: 'No leídas',
  [BrightHubStrings.NotificationList_FilterRead]: 'Leídas',
  [BrightHubStrings.NotificationList_LoadMore]: 'Cargar más',
  [BrightHubStrings.NotificationList_EndOfList]: 'No hay más notificaciones',

  // NotificationPreferences
  [BrightHubStrings.NotificationPreferences_Title]:
    'Preferencias de notificación',
  [BrightHubStrings.NotificationPreferences_AriaLabel]:
    'Preferencias de notificación',
  [BrightHubStrings.NotificationPreferences_CategorySettings]:
    'Configuración por categoría',
  [BrightHubStrings.NotificationPreferences_ChannelSettings]:
    'Configuración de canales',
  [BrightHubStrings.NotificationPreferences_QuietHours]: 'Horas de silencio',
  [BrightHubStrings.NotificationPreferences_QuietHoursEnabled]:
    'Activar horas de silencio',
  [BrightHubStrings.NotificationPreferences_QuietHoursStart]: 'Hora de inicio',
  [BrightHubStrings.NotificationPreferences_QuietHoursEnd]: 'Hora de fin',
  [BrightHubStrings.NotificationPreferences_QuietHoursTimezone]: 'Zona horaria',
  [BrightHubStrings.NotificationPreferences_DoNotDisturb]: 'No molestar',
  [BrightHubStrings.NotificationPreferences_DndEnabled]: 'Activar No molestar',
  [BrightHubStrings.NotificationPreferences_DndDuration]: 'Duración',
  [BrightHubStrings.NotificationPreferences_SoundEnabled]:
    'Sonidos de notificación',
  [BrightHubStrings.NotificationPreferences_Save]: 'Guardar',
  [BrightHubStrings.NotificationPreferences_CategorySocial]: 'Social',
  [BrightHubStrings.NotificationPreferences_CategoryMessages]: 'Mensajes',
  [BrightHubStrings.NotificationPreferences_CategoryConnections]: 'Conexiones',
  [BrightHubStrings.NotificationPreferences_CategorySystem]: 'Sistema',
  [BrightHubStrings.NotificationPreferences_ChannelInApp]: 'En la app',
  [BrightHubStrings.NotificationPreferences_ChannelEmail]: 'Correo',
  [BrightHubStrings.NotificationPreferences_ChannelPush]: 'Push',

  // NotificationCategoryFilter
  [BrightHubStrings.NotificationCategoryFilter_Title]: 'Filtrar por categoría',
  [BrightHubStrings.NotificationCategoryFilter_AriaLabel]:
    'Filtro de categoría de notificación',
  [BrightHubStrings.NotificationCategoryFilter_All]: 'Todas',
  [BrightHubStrings.NotificationCategoryFilter_Social]: 'Social',
  [BrightHubStrings.NotificationCategoryFilter_Messages]: 'Mensajes',
  [BrightHubStrings.NotificationCategoryFilter_Connections]: 'Conexiones',
  [BrightHubStrings.NotificationCategoryFilter_System]: 'Sistema',
};
