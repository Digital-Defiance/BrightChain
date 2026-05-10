import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightChatStringKey,
  BrightChatStrings,
} from '../../enumerations/brightChatStrings';

export const BrightChatSpanishStrings: ComponentStrings<BrightChatStringKey> = {
  // Menu
  [BrightChatStrings.MenuLabel]: 'BrightChat',
  [BrightChatStrings.ChatSectionsLabel]: 'Secciones de chat',
  [BrightChatStrings.Nav_Conversations]: 'Conversaciones',
  [BrightChatStrings.Nav_Groups]: 'Grupos',
  [BrightChatStrings.Nav_Channels]: 'Canales',
  [BrightChatStrings.Nav_DirectMessages]: 'Mensajes directos',

  // Server Rail
  [BrightChatStrings.Server_Rail]: 'Servidores',
  [BrightChatStrings.Server_Rail_Home]: 'Inicio',
  [BrightChatStrings.Server_Rail_CreateServer]: 'Crear servidor',

  // Create Server Dialog
  [BrightChatStrings.Create_Server]: 'Crear servidor',
  [BrightChatStrings.Create_Server_Title]: 'Crear un servidor',
  [BrightChatStrings.Create_Server_NameLabel]: 'Nombre del servidor',
  [BrightChatStrings.Create_Server_NamePlaceholder]:
    'Ingrese el nombre del servidor',
  [BrightChatStrings.Create_Server_IconLabel]: 'Icono del servidor',
  [BrightChatStrings.Create_Server_Submit]: 'Crear',
  [BrightChatStrings.Create_Server_Cancel]: 'Cancelar',

  // Channel Sidebar
  [BrightChatStrings.Channel_Sidebar]: 'Canales',
  [BrightChatStrings.Channel_Sidebar_CreateChannel]: 'Crear canal',

  // Create Channel Dialog
  [BrightChatStrings.Create_Channel]: 'Crear canal',
  [BrightChatStrings.Create_Channel_Title]: 'Crear un canal',
  [BrightChatStrings.Create_Channel_NameLabel]: 'Nombre del canal',
  [BrightChatStrings.Create_Channel_TopicLabel]: 'Tema',
  [BrightChatStrings.Create_Channel_CategoryLabel]: 'Categoría',
  [BrightChatStrings.Create_Channel_Submit]: 'Crear',
  [BrightChatStrings.Create_Channel_Cancel]: 'Cancelar',

  // Create DM Dialog
  [BrightChatStrings.Create_DM]: 'Nuevo mensaje',
  [BrightChatStrings.Create_DM_Title]: 'Nuevo mensaje directo',
  [BrightChatStrings.Create_DM_SearchPlaceholder]: 'Buscar un usuario',
  [BrightChatStrings.Create_DM_Submit]: 'Enviar',
  [BrightChatStrings.Create_DM_Cancel]: 'Cancelar',
  [BrightChatStrings.Create_DM_NewMessage]: 'Nuevo mensaje',

  // Server Settings Panel
  [BrightChatStrings.Server_Settings]: 'Configuración del servidor',
  [BrightChatStrings.Server_Settings_Title]: 'Configuración del servidor',
  [BrightChatStrings.Server_Settings_Overview]: 'Resumen',
  [BrightChatStrings.Server_Settings_Members]: 'Miembros',
  [BrightChatStrings.Server_Settings_Categories]: 'Categorías',
  [BrightChatStrings.Server_Settings_Invites]: 'Invitaciones',
  [BrightChatStrings.Server_Settings_Save]: 'Guardar cambios',

  // Channel Context Menu
  [BrightChatStrings.Channel_Edit]: 'Editar canal',
  [BrightChatStrings.Channel_Delete]: 'Eliminar canal',
  [BrightChatStrings.Channel_Mute]: 'Silenciar canal',

  // Edit Channel Dialog
  [BrightChatStrings.Edit_Channel_Title]: 'Editar canal',
  [BrightChatStrings.Edit_Channel_NameLabel]: 'Nombre del canal',
  [BrightChatStrings.Edit_Channel_TopicLabel]: 'Tema',
  [BrightChatStrings.Edit_Channel_Save]: 'Guardar',
  [BrightChatStrings.Edit_Channel_Cancel]: 'Cancelar',
  [BrightChatStrings.Edit_Channel_Saving]: 'Guardando…',
  [BrightChatStrings.Edit_Channel_Failed]: 'Error al actualizar el canal',
  [BrightChatStrings.Edit_Channel_NameRequired]:
    'El nombre del canal es obligatorio',
  [BrightChatStrings.Edit_Channel_NameLength]:
    'El nombre del canal debe tener entre 2 y 100 caracteres',

  // Delete Channel Confirmation
  [BrightChatStrings.Delete_Channel_Title]: 'Eliminar canal',
  [BrightChatStrings.Delete_Channel_Confirm]: 'Eliminar',
  [BrightChatStrings.Delete_Channel_Cancel]: 'Cancelar',
  [BrightChatStrings.Delete_Channel_Deleting]: 'Eliminando…',
  [BrightChatStrings.Delete_Channel_Failed]: 'Error al eliminar el canal',

  // Presence Status Labels
  [BrightChatStrings.Presence_Online]: 'En línea',
  [BrightChatStrings.Presence_Idle]: 'Ausente',
  [BrightChatStrings.Presence_DoNotDisturb]: 'No molestar',
  [BrightChatStrings.Presence_Offline]: 'Desconectado',
  [BrightChatStrings.Presence_SetStatus]: 'Establecer estado',

  // Breadcrumb Navigation
  [BrightChatStrings.Breadcrumb_BrightChat]: 'BrightChat',
  [BrightChatStrings.Breadcrumb_Conversation]: 'Conversación',
  [BrightChatStrings.Breadcrumb_Group]: 'Grupo',
  [BrightChatStrings.Breadcrumb_Channel]: 'Canal',

  // Channel Permissions (Discord-style)
  [BrightChatStrings.Channel_Permissions]: 'Permisos',
  [BrightChatStrings.Channel_Permissions_Title]: 'Permisos del canal',
  [BrightChatStrings.Channel_Permissions_Role]: 'Rol',
  [BrightChatStrings.Channel_Permissions_SendMessages]: 'Enviar mensajes',
  [BrightChatStrings.Channel_Permissions_ManageChannel]: 'Gestionar canal',
  [BrightChatStrings.Channel_Permissions_ManageMembers]: 'Gestionar miembros',
  [BrightChatStrings.Channel_Permissions_CreateInvites]: 'Crear invitaciones',
  [BrightChatStrings.Channel_Permissions_PinMessages]: 'Fijar mensajes',
  [BrightChatStrings.Channel_Permissions_MuteMembers]: 'Silenciar miembros',
  [BrightChatStrings.Channel_Permissions_KickMembers]: 'Expulsar miembros',
  [BrightChatStrings.Channel_Permissions_DeleteMessages]: 'Eliminar mensajes',

  // Channel Visibility
  [BrightChatStrings.Channel_Visibility_Public]: 'Público',
  [BrightChatStrings.Channel_Visibility_Private]: 'Privado',
  [BrightChatStrings.Channel_Visibility_Secret]: 'Secreto',
  [BrightChatStrings.Channel_Visibility_Public_Desc]:
    'Cualquiera puede ver y unirse',
  [BrightChatStrings.Channel_Visibility_Private_Desc]: 'Solo con invitación',
  [BrightChatStrings.Channel_Visibility_Secret_Desc]: 'Oculto para no miembros',
  [BrightChatStrings.Compose_Placeholder]: 'Escribe un mensaje cifrado...',
  [BrightChatStrings.Compose_SendLabel]: 'Enviar mensaje',
  [BrightChatStrings.Compose_MessageNotDelivered]:
    'No se pudo entregar el mensaje',
  [BrightChatStrings.Compose_SendFailed]: 'Error al enviar el mensaje',
  [BrightChatStrings.ConversationList_Title]: 'Conversaciones',
  [BrightChatStrings.ConversationList_NewMessage]: 'Nuevo mensaje',
  [BrightChatStrings.ConversationList_Empty]: 'Aún no hay mensajes directos.',
  [BrightChatStrings.ConversationList_RecentChannels]: 'Canales recientes',
  [BrightChatStrings.MessageThread_Empty]:
    '¡Aún no hay mensajes. Inicia la conversación!',
  [BrightChatStrings.Create_Channel_NamePlaceholder]: 'ej. general',
  [BrightChatStrings.Create_Channel_TopicPlaceholder]:
    '¿De qué trata este canal?',
  [BrightChatStrings.Create_Channel_VisibilityLabel]: 'Visibilidad',
  [BrightChatStrings.Create_Channel_NameRequired]:
    'El nombre del canal es obligatorio',
  [BrightChatStrings.Create_Channel_NameLength]:
    'El nombre del canal debe tener entre 2 y 100 caracteres',
  [BrightChatStrings.Create_Channel_Creating]: 'Creando...',
  [BrightChatStrings.Create_Channel_Failed]: 'Error al crear el canal',
  [BrightChatStrings.Create_Channel_CategoryNone]: 'Ninguna',
  [BrightChatStrings.Server_Settings_ServerNameLabel]: 'Nombre del servidor',
  [BrightChatStrings.Server_Settings_IconUrlLabel]: 'URL del icono',
  [BrightChatStrings.Server_Settings_Saving]: 'Guardando…',
  [BrightChatStrings.Server_Settings_GenerateInvite]: 'Generar invitación',
  [BrightChatStrings.Server_Settings_CopyToken]: 'Copiar token',
  [BrightChatStrings.Server_Settings_Uses]: 'Usos',
  [BrightChatStrings.Server_Settings_NewCategory]: 'Nueva categoría',
  [BrightChatStrings.Server_Settings_AddCategory]: 'Añadir',
  [BrightChatStrings.Server_Settings_ChannelCount]: 'canales',
  [BrightChatStrings.Server_Settings_RemoveMember]: 'Eliminar miembro',
  [BrightChatStrings.Server_Settings_DeleteCategory]: 'Eliminar categoría',
  [BrightChatStrings.Server_Settings_DeleteServer]: 'Eliminar servidor',
  [BrightChatStrings.Server_Settings_DeleteServerConfirm]: 'Estás seguro de que quieres eliminar este servidor? Todos los canales y mensajes se perderán permanentemente.',
  [BrightChatStrings.Server_Settings_DeleteServerConfirmTitle]: 'Eliminar servidor',
  [BrightChatStrings.DMSidebar_NoConversations]: 'Aún no hay conversaciones',
  [BrightChatStrings.DMSidebar_NoGroups]: 'Aún no hay chats de grupo',

  // Encryption
  [BrightChatStrings.Encryption_E2E]: 'Cifrado de extremo a extremo',
  [BrightChatStrings.Encryption_E2E_AriaLabel]:
    'Esta conversación está cifrada de extremo a extremo',
  [BrightChatStrings.Encryption_EncryptedServer]: 'Servidor cifrado',
  [BrightChatStrings.Encryption_ServerEncrypted]: 'Cifrado',

  // Key Rotation
  [BrightChatStrings.KeyRotation_MemberJoined]:
    'Clave de cifrado actualizada — un miembro se unió',
  [BrightChatStrings.KeyRotation_MemberLeft]:
    'Clave de cifrado actualizada — un miembro se fue',
  [BrightChatStrings.KeyRotation_MemberRemoved]:
    'Clave de cifrado actualizada — un miembro fue eliminado',

  // Channel List View
  [BrightChatStrings.ChannelList_Title]: 'Canales',
  [BrightChatStrings.ChannelList_Empty]: 'Aún no hay canales.',
  [BrightChatStrings.ChannelList_Join]: 'Unirse',
  [BrightChatStrings.ChannelList_Joining]: 'Uniéndose…',
  [BrightChatStrings.ChannelList_MemberCount]: 'miembro',

  // Group List View
  [BrightChatStrings.GroupList_Title]: 'Grupos',
  [BrightChatStrings.GroupList_Empty]: 'Aún no hay grupos.',
  [BrightChatStrings.GroupList_MemberCount]: 'miembro',

  // Create Server Dialog extras
  [BrightChatStrings.Create_Server_IconLabelOptional]:
    'URL del icono (opcional)',
  [BrightChatStrings.Create_Server_Creating]: 'Creando…',
  [BrightChatStrings.Create_Server_NameRequired]:
    'El nombre del servidor es obligatorio',
  [BrightChatStrings.Create_Server_NameTooLong]:
    'El nombre del servidor debe tener 100 caracteres o menos',
  [BrightChatStrings.Create_Server_Failed]: 'Error al crear el servidor',

  // Create DM Dialog extras
  [BrightChatStrings.Create_DM_SearchLabel]: 'Buscar usuarios',
  [BrightChatStrings.Create_DM_SearchHint]: 'Escribe un nombre…',
  [BrightChatStrings.Create_DM_NoUsersFound]: 'No se encontraron usuarios',
  [BrightChatStrings.Create_DM_SelectUser]: 'Por favor seleccione un usuario',
  [BrightChatStrings.Create_DM_Starting]: 'Iniciando…',
  [BrightChatStrings.Create_DM_StartConversation]: 'Iniciar conversación',
  [BrightChatStrings.Create_DM_Failed]: 'Error al iniciar la conversación',

  // Channel Permissions Panel
  [BrightChatStrings.Permissions_SelectChannel]:
    'Seleccione un canal para ver los permisos.',
  [BrightChatStrings.Permissions_PermissionsFor]: 'Permisos para',
  [BrightChatStrings.Permissions_MembersWith]: 'Miembros con',
  [BrightChatStrings.Permissions_NoMembers]: 'No hay miembros con este rol',
  [BrightChatStrings.Permissions_Joined]: 'Se unió',
  [BrightChatStrings.Permissions_DeleteOwnMessages]:
    'Eliminar mensajes propios',
  [BrightChatStrings.Permissions_DeleteAnyMessage]:
    'Eliminar cualquier mensaje',
  [BrightChatStrings.Permissions_ManageRoles]: 'Gestionar roles',

  // Roles
  [BrightChatStrings.Role_Owner]: 'Propietario',
  [BrightChatStrings.Role_Admin]: 'Administrador',
  [BrightChatStrings.Role_Moderator]: 'Moderador',
  [BrightChatStrings.Role_Member]: 'Miembro',

  // Channel Sidebar extras
  [BrightChatStrings.Channel_Sidebar_Uncategorized]: 'Sin categoría',

  // Message Thread extras
  [BrightChatStrings.MessageThread_Pinned]: 'Mensaje fijado',
  [BrightChatStrings.MessageThread_Edited]: '(editado)',
  [BrightChatStrings.MessageThread_TypingSingle]: 'está escribiendo…',
  [BrightChatStrings.MessageThread_TypingMultiple]: 'están escribiendo…',

  // Layout
  [BrightChatStrings.Layout_BreadcrumbLabel]:
    'Ruta de navegación de BrightChat',
  [BrightChatStrings.Layout_UserProfile]: 'Perfil de usuario',
  [BrightChatStrings.Layout_OpenNavigation]: 'Abrir navegación',

  // Friends Suggestion Section
  [BrightChatStrings.Friends_SectionTitle]: 'Amigos',

  // Server Icon Upload
  [BrightChatStrings.Server_Icon_Upload]: 'Subir icono',
  [BrightChatStrings.Server_Icon_Change]: 'Cambiar icono',
  [BrightChatStrings.Server_Icon_Remove]: 'Eliminar icono',
  [BrightChatStrings.Server_Icon_RemoveConfirm]:
    '¿Estás seguro de que deseas eliminar el icono del servidor?',
  [BrightChatStrings.Server_Icon_RemoveConfirmTitle]:
    'Eliminar icono del servidor',
  [BrightChatStrings.Server_Icon_Uploading]: 'Subiendo…',
  [BrightChatStrings.Server_Icon_UploadFailed]: 'Error al subir el icono',
  [BrightChatStrings.Server_Icon_UploadSuccess]: 'Icono subido correctamente',
  [BrightChatStrings.Server_Icon_FileTooLarge]:
    'El archivo es demasiado grande. El tamaño máximo es 5MB.',
  [BrightChatStrings.Server_Icon_InvalidType]:
    'Tipo de archivo no válido. Tipos permitidos: PNG, JPEG, GIF, WebP.',
  [BrightChatStrings.Server_Icon_CropTitle]: 'Recortar icono del servidor',
  [BrightChatStrings.Server_Icon_CropConfirm]: 'Aplicar',
  [BrightChatStrings.Server_Icon_CropCancel]: 'Cancelar',
  [BrightChatStrings.Server_Icon_ZoomLabel]: 'Zoom',
  [BrightChatStrings.Server_Icon_PreviewAlt]:
    'Vista previa del icono del servidor',
  [BrightChatStrings.Server_Icon_UploadLabel]: 'Subir icono del servidor',
  [BrightChatStrings.Server_Icon_DropOrBrowse]:
    'Arrastra una imagen o haz clic para buscar',
  [BrightChatStrings.Server_Icon_StagingFailed]:
    'Error al preparar el archivo para la subida',
  [BrightChatStrings.Server_Icon_StagingExpired]:
    'El archivo preparado ha expirado. Por favor, selecciona la imagen de nuevo.',

  // FontAwesome Icon Picker
  [BrightChatStrings.IconPicker_Title]: 'Elegir un icono',
  [BrightChatStrings.IconPicker_SearchPlaceholder]: 'Buscar iconos...',
  [BrightChatStrings.IconPicker_NoMatchTemplate]:
    'Ningún icono coincide con "{0}"',
  [BrightChatStrings.IconPicker_Cancel]: 'Cancelar',
  [BrightChatStrings.IconPicker_RemoveIcon]: 'Eliminar icono',
  [BrightChatStrings.IconPicker_CurrentLabel]: 'Actual:',
};
