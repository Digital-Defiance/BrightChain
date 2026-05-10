import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightHubStringKey,
  BrightHubStrings,
} from '../../enumerations/brightHubStrings';

export const BrightHubSpanishStrings: ComponentStrings<BrightHubStringKey> = {
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
  [BrightHubStrings.PostComposer_VisibilityPublic]: 'Público',
  [BrightHubStrings.PostComposer_VisibilityFollowersOnly]: 'Solo seguidores',
  [BrightHubStrings.PostComposer_VisibilityFriendsOnly]: 'Solo amigos',
  [BrightHubStrings.PostComposer_VisibilityHubOnly]: 'Solo miembros del hub',
  [BrightHubStrings.PostComposer_MembersTemplate]: '{COUNT} miembros',
  [BrightHubStrings.PostComposer_SubmitPost]: 'Enviar publicación',
  [BrightHubStrings.PostComposer_Post]: 'Publicar',
  [BrightHubStrings.PostComposer_Reply]: 'Responder',
  [BrightHubStrings.PostComposer_Preview]: 'Vista previa',
  [BrightHubStrings.PostComposer_PreviewAriaLabel]:
    'Vista previa del contenido de la publicación',
  [BrightHubStrings.PostComposer_MarkupHelp]: 'Ayuda de formato',
  [BrightHubStrings.PostComposer_MarkupHelpAriaLabel]:
    'Referencia de formato y marcado de publicaciones',
  [BrightHubStrings.PostComposer_MarkupHelpClose]: 'Cerrar',
  [BrightHubStrings.PostComposer_MarkupHelpTabPost]: 'Formato de publicación',
  [BrightHubStrings.PostComposer_MarkupHelpTabIcons]: 'Marcado de iconos',
  [BrightHubStrings.PostComposer_ImageLimitReached]:
    'Máximo 20 imágenes por publicación',
  [BrightHubStrings.PostComposer_ImageUploadFailed]: 'Error al subir la imagen',
  [BrightHubStrings.PostComposer_Uploading]: 'Subiendo...',
  [BrightHubStrings.PostComposer_InsertImage]: 'Insertar imagen',
  [BrightHubStrings.PostComposer_RemoveAttachment]: 'Quitar adjunto',
  [BrightHubStrings.PostComposer_AttachmentLimitReached]:
    'Máximo 4 adjuntos por publicación',
  [BrightHubStrings.PostComposer_EditAltText]: 'Editar texto alternativo',
  [BrightHubStrings.PostComposer_AltText]: 'Texto alternativo',
  [BrightHubStrings.PostComposer_Save]: 'Guardar',
  [BrightHubStrings.PostComposer_Cancel]: 'Cancelar',
  [BrightHubStrings.PostComposer_InsertIcon]: 'Insertar icono',
  [BrightHubStrings.PostComposer_IconSearchPlaceholder]: 'Buscar iconos...',
  [BrightHubStrings.PostComposer_IconNoMatchTemplate]:
    'Ningún icono coincide con \u201c{0}\u201d',
  [BrightHubStrings.PostComposer_IconStyleOptions]: 'Opciones de estilo',
  [BrightHubStrings.PostComposer_IconColor]: 'Color',
  [BrightHubStrings.PostComposer_IconColorNone]: 'Ninguno',
  [BrightHubStrings.PostComposer_IconAnimation]: 'Animación',
  [BrightHubStrings.PostComposer_IconAnimationNone]: 'Ninguna',
  [BrightHubStrings.PostComposer_IconRotation]: 'Rotación',
  [BrightHubStrings.PostComposer_IconRotationNone]: 'Ninguna',
  [BrightHubStrings.PostComposer_IconSize]: 'Tamaño',
  [BrightHubStrings.PostComposer_IconSizeDefault]: 'Predeterminado',
  [BrightHubStrings.PostComposer_IconPreview]: 'Vista previa',

  // ImageCropDialog
  [BrightHubStrings.ImageCropDialog_Title]: 'Recortar imagen',
  [BrightHubStrings.ImageCropDialog_Crop]: 'Recortar',
  [BrightHubStrings.ImageCropDialog_Skip]: 'Usar original',
  [BrightHubStrings.ImageCropDialog_Cancel]: 'Cancelar',
  [BrightHubStrings.ImageCropDialog_ZoomLabel]: 'Zoom',
  [BrightHubStrings.ImageCropDialog_PreviewAlt]: 'Vista previa del recorte',

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
  [BrightHubStrings.UserProfileCard_Friends]: 'Amigos',
  [BrightHubStrings.UserProfileCard_FriendsTab]: 'Amigos',
  [BrightHubStrings.UserProfileCard_FriendsHidden]:
    'Este usuario ha ocultado su lista de amigos',
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

  // ConnectionListManager
  [BrightHubStrings.ConnectionListManager_Title]: 'Listas de conexiones',
  [BrightHubStrings.ConnectionListManager_CreateList]: 'Crear lista',
  [BrightHubStrings.ConnectionListManager_EditList]: 'Editar lista',
  [BrightHubStrings.ConnectionListManager_DeleteList]: 'Eliminar lista',
  [BrightHubStrings.ConnectionListManager_DeleteConfirmTemplate]:
    '¿Estás seguro de que deseas eliminar "{NAME}"? Se eliminarán todos los miembros.',
  [BrightHubStrings.ConnectionListManager_DeleteConfirmAction]: 'Eliminar',
  [BrightHubStrings.ConnectionListManager_Cancel]: 'Cancelar',
  [BrightHubStrings.ConnectionListManager_Save]: 'Guardar',
  [BrightHubStrings.ConnectionListManager_ListName]: 'Nombre de la lista',
  [BrightHubStrings.ConnectionListManager_ListDescription]: 'Descripción',
  [BrightHubStrings.ConnectionListManager_Visibility]: 'Visibilidad',
  [BrightHubStrings.ConnectionListManager_VisibilityPrivate]: 'Privada',
  [BrightHubStrings.ConnectionListManager_VisibilityFollowersOnly]:
    'Solo seguidores',
  [BrightHubStrings.ConnectionListManager_VisibilityPublic]: 'Pública',
  [BrightHubStrings.ConnectionListManager_MembersTemplate]: '{COUNT} miembros',
  [BrightHubStrings.ConnectionListManager_FollowersTemplate]:
    '{COUNT} seguidores',
  [BrightHubStrings.ConnectionListManager_EmptyState]:
    'Aún no hay listas de conexiones',
  [BrightHubStrings.ConnectionListManager_EmptyStateHint]:
    'Crea una lista para organizar tus conexiones.',
  [BrightHubStrings.ConnectionListManager_AddMembers]: 'Agregar miembros',
  [BrightHubStrings.ConnectionListManager_RemoveMembers]: 'Eliminar miembros',
  [BrightHubStrings.ConnectionListManager_AddMembersTitle]:
    'Agregar miembros a la lista',
  [BrightHubStrings.ConnectionListManager_RemoveMembersTitle]:
    'Eliminar miembros de la lista',
  [BrightHubStrings.ConnectionListManager_UserIdsPlaceholder]:
    'Ingresa IDs de usuario, uno por línea',
  [BrightHubStrings.ConnectionListManager_Loading]: 'Cargando listas…',
  [BrightHubStrings.ConnectionListManager_AriaLabel]:
    'Gestor de listas de conexiones',

  // ConnectionListCard
  [BrightHubStrings.ConnectionListCard_AriaLabel]:
    'Lista de conexiones: {NAME}',
  [BrightHubStrings.ConnectionListCard_MembersTemplate]: '{COUNT} miembros',
  [BrightHubStrings.ConnectionListCard_FollowersTemplate]: '{COUNT} seguidores',
  [BrightHubStrings.ConnectionListCard_VisibilityPrivate]: 'Privada',
  [BrightHubStrings.ConnectionListCard_VisibilityFollowersOnly]:
    'Solo seguidores',
  [BrightHubStrings.ConnectionListCard_VisibilityPublic]: 'Pública',
  [BrightHubStrings.ConnectionListCard_CreatedAtTemplate]: 'Creada {DATE}',

  // ConnectionCategorySelector
  [BrightHubStrings.ConnectionCategorySelector_Title]: 'Categorías',
  [BrightHubStrings.ConnectionCategorySelector_AriaLabel]:
    'Selector de categoría de conexión',
  [BrightHubStrings.ConnectionCategorySelector_DefaultIndicator]:
    'Predeterminada',
  [BrightHubStrings.ConnectionCategorySelector_NoneAvailable]:
    'No hay categorías disponibles',

  // ConnectionNoteEditor
  [BrightHubStrings.ConnectionNoteEditor_Title]: 'Nota',
  [BrightHubStrings.ConnectionNoteEditor_AriaLabel]: 'Nota de conexión',
  [BrightHubStrings.ConnectionNoteEditor_Placeholder]:
    'Agrega una nota privada sobre esta conexión…',
  [BrightHubStrings.ConnectionNoteEditor_EmptyState]:
    'Aún no hay nota. Agrega una nota privada para recordar el contexto de esta conexión.',
  [BrightHubStrings.ConnectionNoteEditor_Save]: 'Guardar',
  [BrightHubStrings.ConnectionNoteEditor_Delete]: 'Eliminar',
  [BrightHubStrings.ConnectionNoteEditor_Cancel]: 'Cancelar',
  [BrightHubStrings.ConnectionNoteEditor_DeleteConfirmTitle]: '¿Eliminar nota?',
  [BrightHubStrings.ConnectionNoteEditor_DeleteConfirmMessage]:
    '¿Estás seguro de que deseas eliminar esta nota? Esta acción no se puede deshacer.',
  [BrightHubStrings.ConnectionNoteEditor_DeleteConfirmAction]: 'Eliminar',

  // ConnectionSuggestions
  [BrightHubStrings.ConnectionSuggestions_Title]: 'Conexiones sugeridas',
  [BrightHubStrings.ConnectionSuggestions_AriaLabel]:
    'Sugerencias de conexiones',
  [BrightHubStrings.ConnectionSuggestions_EmptyState]:
    'No hay sugerencias por ahora. ¡Vuelve más tarde!',
  [BrightHubStrings.ConnectionSuggestions_Loading]: 'Cargando sugerencias…',
  [BrightHubStrings.ConnectionSuggestions_Follow]: 'Seguir',
  [BrightHubStrings.ConnectionSuggestions_Dismiss]: 'Descartar',
  [BrightHubStrings.ConnectionSuggestions_MutualCountSingular]:
    '1 conexión mutua',
  [BrightHubStrings.ConnectionSuggestions_MutualCountPluralTemplate]:
    '{COUNT} conexiones mutuas',
  [BrightHubStrings.ConnectionSuggestions_ReasonMutualConnections]:
    'Basado en conexiones mutuas',
  [BrightHubStrings.ConnectionSuggestions_ReasonSimilarInterests]:
    'Basado en intereses similares',
  [BrightHubStrings.ConnectionSuggestions_ReasonSimilarToUser]:
    'Similar a personas que sigues',
  [BrightHubStrings.ConnectionSuggestions_ReasonMutualFriends]:
    'Amigos en común',

  // MutualConnections
  [BrightHubStrings.MutualConnections_Title]: 'Conexiones mutuas',
  [BrightHubStrings.MutualConnections_AriaLabel]: 'Conexiones mutuas',
  [BrightHubStrings.MutualConnections_Loading]: 'Cargando conexiones mutuas…',
  [BrightHubStrings.MutualConnections_EmptyState]: 'No hay conexiones mutuas',
  [BrightHubStrings.MutualConnections_CountSingular]: '1 conexión mutua',
  [BrightHubStrings.MutualConnections_CountPluralTemplate]:
    '{COUNT} conexiones mutuas',
  [BrightHubStrings.MutualConnections_LoadMore]: 'Cargar más',

  // ConnectionStrengthIndicator
  [BrightHubStrings.ConnectionStrengthIndicator_Title]: 'Fuerza de la conexión',
  [BrightHubStrings.ConnectionStrengthIndicator_AriaLabel]:
    'Indicador de fuerza de conexión',
  [BrightHubStrings.ConnectionStrengthIndicator_Strong]: 'Fuerte',
  [BrightHubStrings.ConnectionStrengthIndicator_Moderate]: 'Moderada',
  [BrightHubStrings.ConnectionStrengthIndicator_Weak]: 'Débil',
  [BrightHubStrings.ConnectionStrengthIndicator_Dormant]: 'Inactiva',

  // HubManager
  [BrightHubStrings.HubManager_Title]: 'Hubs',
  [BrightHubStrings.HubManager_AriaLabel]: 'Gestor de hubs',
  [BrightHubStrings.HubManager_CreateHub]: 'Crear Hub',
  [BrightHubStrings.HubManager_EditHub]: 'Editar Hub',
  [BrightHubStrings.HubManager_DeleteHub]: 'Eliminar Hub',
  [BrightHubStrings.HubManager_HubName]: 'Nombre del hub',
  [BrightHubStrings.HubManager_HubDescription]: 'Descripción',
  [BrightHubStrings.HubManager_MembersTemplate]: '{COUNT} miembros',
  [BrightHubStrings.HubManager_EmptyState]: 'Aún no hay hubs.',
  [BrightHubStrings.HubManager_EmptyStateHint]:
    'Crea un hub para compartir contenido con un grupo selecto de conexiones.',
  [BrightHubStrings.HubManager_Save]: 'Guardar',
  [BrightHubStrings.HubManager_Cancel]: 'Cancelar',
  [BrightHubStrings.HubManager_DeleteConfirmTemplate]:
    '¿Estás seguro de que deseas eliminar "{NAME}"? Se eliminarán todos los miembros.',
  [BrightHubStrings.HubManager_DeleteConfirmAction]: 'Eliminar',
  [BrightHubStrings.HubManager_AddMembers]: 'Agregar miembros',
  [BrightHubStrings.HubManager_AddMembersTitle]: 'Agregar miembros al hub',
  [BrightHubStrings.HubManager_RemoveMembers]: 'Eliminar miembros',
  [BrightHubStrings.HubManager_RemoveMembersTitle]: 'Eliminar miembros del hub',
  [BrightHubStrings.HubManager_UserIdsPlaceholder]:
    'Ingresa IDs de usuario, uno por línea',
  [BrightHubStrings.HubManager_Loading]: 'Cargando hubs…',
  [BrightHubStrings.HubManager_DefaultBadge]: 'Predeterminado',

  // HubSelector
  [BrightHubStrings.HubSelector_Title]: 'Visibilidad de la publicación',
  [BrightHubStrings.HubSelector_AriaLabel]:
    'Selector de hub para visibilidad de publicación',
  [BrightHubStrings.HubSelector_MembersTemplate]: '{COUNT} miembros',
  [BrightHubStrings.HubSelector_NoneAvailable]: 'No hay hubs disponibles.',
  [BrightHubStrings.HubSelector_NoneSelected]:
    'Visible para todos los seguidores',
  [BrightHubStrings.HubSelector_SelectedCountTemplate]:
    '{COUNT} hubs seleccionados',
  [BrightHubStrings.HubSelector_DefaultBadge]: 'Predeterminado',

  // FollowRequestList
  [BrightHubStrings.FollowRequestList_Title]: 'Solicitudes de seguimiento',
  [BrightHubStrings.FollowRequestList_AriaLabel]:
    'Solicitudes de seguimiento pendientes',
  [BrightHubStrings.FollowRequestList_Loading]:
    'Cargando solicitudes de seguimiento…',
  [BrightHubStrings.FollowRequestList_EmptyState]:
    'No hay solicitudes de seguimiento pendientes',
  [BrightHubStrings.FollowRequestList_Approve]: 'Aprobar',
  [BrightHubStrings.FollowRequestList_Reject]: 'Rechazar',
  [BrightHubStrings.FollowRequestList_PendingCountTemplate]:
    '{COUNT} solicitudes pendientes',
  [BrightHubStrings.FollowRequestList_PendingCountSingular]:
    '1 solicitud pendiente',
  [BrightHubStrings.FollowRequestList_CustomMessage]: 'Mensaje',

  // ConnectionPrivacySettings
  [BrightHubStrings.ConnectionPrivacySettings_Title]:
    'Configuración de privacidad',
  [BrightHubStrings.ConnectionPrivacySettings_AriaLabel]:
    'Configuración de privacidad de conexiones',
  [BrightHubStrings.ConnectionPrivacySettings_HideFollowerCount]:
    'Ocultar cantidad de seguidores',
  [BrightHubStrings.ConnectionPrivacySettings_HideFollowingCount]:
    'Ocultar cantidad de seguidos',
  [BrightHubStrings.ConnectionPrivacySettings_HideFollowersFromNonFollowers]:
    'Ocultar seguidores a quienes no te siguen',
  [BrightHubStrings.ConnectionPrivacySettings_HideFollowingFromNonFollowers]:
    'Ocultar seguidos a quienes no te siguen',
  [BrightHubStrings.ConnectionPrivacySettings_AllowDmsFromNonFollowers]:
    'Permitir mensajes directos de quienes no te siguen',
  [BrightHubStrings.ConnectionPrivacySettings_ShowOnlineStatus]:
    'Mostrar estado en línea',
  [BrightHubStrings.ConnectionPrivacySettings_ShowReadReceipts]:
    'Mostrar confirmaciones de lectura',
  [BrightHubStrings.ConnectionPrivacySettings_HideFriendsFromNonFriends]:
    'Ocultar lista de amigos a no amigos',
  [BrightHubStrings.ConnectionPrivacySettings_ApproveFollowersMode]:
    'Modo de aprobación de seguidores',
  [BrightHubStrings.ConnectionPrivacySettings_ApproveNone]:
    'Aprobar todos automáticamente',
  [BrightHubStrings.ConnectionPrivacySettings_ApproveAll]:
    'Requerir aprobación para todos',
  [BrightHubStrings.ConnectionPrivacySettings_ApproveNonMutuals]:
    'Requerir aprobación para no mutuos',
  [BrightHubStrings.ConnectionPrivacySettings_Save]: 'Guardar',

  // TemporaryMuteDialog
  [BrightHubStrings.TemporaryMuteDialog_Title]: 'Silenciar usuario',
  [BrightHubStrings.TemporaryMuteDialog_AriaLabel]:
    'Diálogo de silencio temporal',
  [BrightHubStrings.TemporaryMuteDialog_MuteUserTemplate]:
    'Silenciar a {USERNAME}',
  [BrightHubStrings.TemporaryMuteDialog_Duration1h]: '1 hora',
  [BrightHubStrings.TemporaryMuteDialog_Duration8h]: '8 horas',
  [BrightHubStrings.TemporaryMuteDialog_Duration24h]: '24 horas',
  [BrightHubStrings.TemporaryMuteDialog_Duration7d]: '7 días',
  [BrightHubStrings.TemporaryMuteDialog_Duration30d]: '30 días',
  [BrightHubStrings.TemporaryMuteDialog_Permanent]: 'Silenciar permanentemente',
  [BrightHubStrings.TemporaryMuteDialog_Mute]: 'Silenciar',
  [BrightHubStrings.TemporaryMuteDialog_Cancel]: 'Cancelar',

  // ConnectionInsights
  [BrightHubStrings.ConnectionInsights_Title]: 'Estadísticas de conexión',
  [BrightHubStrings.ConnectionInsights_AriaLabel]: 'Estadísticas de conexión',
  [BrightHubStrings.ConnectionInsights_Period7d]: '7 días',
  [BrightHubStrings.ConnectionInsights_Period30d]: '30 días',
  [BrightHubStrings.ConnectionInsights_Period90d]: '90 días',
  [BrightHubStrings.ConnectionInsights_PeriodAllTime]: 'Todo el tiempo',
  [BrightHubStrings.ConnectionInsights_Interactions]: 'Interacciones',
  [BrightHubStrings.ConnectionInsights_Messages]: 'Mensajes',
  [BrightHubStrings.ConnectionInsights_Likes]: 'Me gusta',
  [BrightHubStrings.ConnectionInsights_Reposts]: 'Republicaciones',
  [BrightHubStrings.ConnectionInsights_Replies]: 'Respuestas',
  [BrightHubStrings.ConnectionInsights_EmptyState]:
    'No hay datos de interacción disponibles',
  [BrightHubStrings.ConnectionInsights_Loading]:
    'Cargando estadísticas de conexión…',

  // ListTimelineFilter
  [BrightHubStrings.ListTimelineFilter_Title]: 'Filtrar por lista',
  [BrightHubStrings.ListTimelineFilter_AriaLabel]:
    'Filtrar línea de tiempo por lista de conexiones',
  [BrightHubStrings.ListTimelineFilter_AllConnections]: 'Todas las conexiones',
  [BrightHubStrings.ListTimelineFilter_SelectList]: 'Seleccionar una lista',
  [BrightHubStrings.ListTimelineFilter_MembersTemplate]: '({COUNT} miembros)',
  [BrightHubStrings.ListTimelineFilter_ClearFilter]: 'Borrar filtro',

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

  // Navigation / Sidebar
  [BrightHubStrings.Nav_Home]: 'Inicio',
  [BrightHubStrings.Nav_Explore]: 'Explorar',
  [BrightHubStrings.Nav_Notifications]: 'Notificaciones',
  [BrightHubStrings.Nav_Messages]: 'Mensajes',
  [BrightHubStrings.Nav_Profile]: 'Perfil',
  [BrightHubStrings.Nav_Connections]: 'Conexiones',
  [BrightHubStrings.Nav_Settings]: 'Configuración',
  [BrightHubStrings.Nav_SidebarLabel]: 'Navegación de BrightHub',
  [BrightHubStrings.Nav_SubscribedHubs]: 'Tus Hubs',
  [BrightHubStrings.Nav_CreateHub]: 'Crear Hub',
  [BrightHubStrings.HubDetail_MembersTemplate]: '{COUNT} miembros',
  [BrightHubStrings.HubDetail_PostsTemplate]: '{COUNT} publicaciones',
  [BrightHubStrings.HubDetail_Join]: 'Unirse',
  [BrightHubStrings.HubDetail_Leave]: 'Salir',
  [BrightHubStrings.HubDetail_Joined]: 'Unido',
  [BrightHubStrings.HubDetail_TrustOpen]: 'Abierto',
  [BrightHubStrings.HubDetail_TrustVerified]: 'Verificado',
  [BrightHubStrings.HubDetail_TrustEncrypted]: 'Cifrado',
  [BrightHubStrings.HubDetail_About]: 'Acerca de',
  [BrightHubStrings.HubDetail_Rules]: 'Reglas',
  [BrightHubStrings.HubDetail_SortHot]: 'Popular',
  [BrightHubStrings.HubDetail_SortNew]: 'Nuevo',
  [BrightHubStrings.HubDetail_SortTop]: 'Mejor',
  [BrightHubStrings.HubDetail_EmptyState]:
    '¡Aún no hay publicaciones. Sé el primero en iniciar una discusión!',
  [BrightHubStrings.HubDetail_SubHubs]: 'Sub-hubs',
  [BrightHubStrings.Explore_Title]: 'Explorar Hubs',
  [BrightHubStrings.Explore_SearchPlaceholder]: 'Buscar hubs…',
  [BrightHubStrings.Explore_Trending]: 'Tendencia',
  [BrightHubStrings.Explore_New]: 'Nuevo',
  [BrightHubStrings.Explore_EmptyState]:
    '¡Aún no hay hubs. Crea uno para empezar!',
  [BrightHubStrings.Explore_NoResults]: 'Ningún hub coincide con tu búsqueda.',
  [BrightHubStrings.Home_TrendingHubs]: 'Hubs en tendencia',
  [BrightHubStrings.Home_RecentActivity]: 'Actividad reciente',
  [BrightHubStrings.Home_YourHubs]: 'Tus Hubs',
  [BrightHubStrings.Home_SuggestedHubs]: 'Hubs sugeridos',
  [BrightHubStrings.Home_ViewAll]: 'Ver todo',
  [BrightHubStrings.Home_Welcome]: 'Bienvenido a BrightHub',
  [BrightHubStrings.Home_WelcomeSubtitle]:
    'Únete a hubs para ver discusiones de comunidades que te interesan.',
  [BrightHubStrings.Home_NoHubsYet]: 'Aún no te has unido a ningún hub',
  [BrightHubStrings.Home_NoHubsHint]:
    'Explora hubs para encontrar comunidades que te interesen.',
  [BrightHubStrings.CreateHub_Title]: 'Crear un Hub',
  [BrightHubStrings.CreateHub_NameLabel]: 'Nombre del hub',
  [BrightHubStrings.CreateHub_NamePlaceholder]: 'ej. Programación',
  [BrightHubStrings.CreateHub_SlugLabel]: 'Slug de URL',
  [BrightHubStrings.CreateHub_SlugPlaceholder]: 'ej. programacion',
  [BrightHubStrings.CreateHub_DescriptionLabel]: 'Descripción',
  [BrightHubStrings.CreateHub_DescriptionPlaceholder]:
    '¿De qué trata este hub?',
  [BrightHubStrings.CreateHub_TrustTierLabel]: 'Nivel de confianza',
  [BrightHubStrings.CreateHub_ParentHubLabel]: 'Hub padre (opcional)',
  [BrightHubStrings.CreateHub_ParentHubNone]: 'Ninguno (hub principal)',
  [BrightHubStrings.CreateHub_Submit]: 'Crear Hub',
  [BrightHubStrings.CreateHub_Cancel]: 'Cancelar',
  [BrightHubStrings.Nav_CreatePost]: 'Nueva publicación',
  [BrightHubStrings.Nav_Trending]: 'Tendencia',

  // PinnedPostSection
  [BrightHubStrings.PinnedPostSection_Pinned]: 'Fijado',
  [BrightHubStrings.PinnedPostSection_Unpin]: 'Desfijar',
  [BrightHubStrings.PinnedPostSection_AriaLabel]: 'Publicación fijada',

  // EditProfileDialog
  [BrightHubStrings.EditProfileDialog_Title]: 'Editar perfil',
  [BrightHubStrings.EditProfileDialog_DisplayName]: 'Nombre para mostrar',
  [BrightHubStrings.EditProfileDialog_Bio]: 'Biografía',
  [BrightHubStrings.EditProfileDialog_BioPlaceholder]: 'Cuéntale a la gente sobre ti. Se admiten Markdown e iconos.',
  [BrightHubStrings.EditProfileDialog_BioCharCountTemplate]: '{CURRENT}/{MAX}',
  [BrightHubStrings.EditProfileDialog_BioPreview]: 'Vista previa',
  [BrightHubStrings.EditProfileDialog_Location]: 'Ubicación',
  [BrightHubStrings.EditProfileDialog_WebsiteUrl]: 'Sitio web',
  [BrightHubStrings.EditProfileDialog_Save]: 'Guardar',
  [BrightHubStrings.EditProfileDialog_Cancel]: 'Cancelar',
  [BrightHubStrings.EditProfileDialog_Saving]: 'Guardando\u2026',
  [BrightHubStrings.EditProfileDialog_ErrorBioTooLong]: 'La biografía supera la longitud máxima de {MAX} caracteres.',
  [BrightHubStrings.EditProfileDialog_ErrorBioContainsImage]: 'La biografía no puede contener sintaxis Markdown de imágenes.',

  // UserProfileCard
  [BrightHubStrings.UserProfileCard_EditProfile]: 'Editar perfil',
};
