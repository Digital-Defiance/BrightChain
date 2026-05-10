import { RequiredBrandedStringsCollection } from '@digitaldefiance/i18n-lib';
import { BrightMailStrings } from '../../enumerations/brightMailStrings';

export const BrightMailSpanishStrings: RequiredBrandedStringsCollection<
  typeof BrightMailStrings
> = {
  // Menu
  [BrightMailStrings.MenuLabel]: 'BrightMail',

  // Inbox
  [BrightMailStrings.Inbox_Title]: 'Bandeja de entrada',
  [BrightMailStrings.Inbox_Empty]: 'Aún no hay correos electrónicos',
  [BrightMailStrings.Inbox_Error]: 'Error al cargar la bandeja de entrada',
  [BrightMailStrings.Inbox_Retry]: 'Reintentar',
  [BrightMailStrings.Inbox_UnreadCountTemplate]: '{COUNT} sin leer',

  // Compose
  [BrightMailStrings.Compose_Title]: 'Redactar',
  [BrightMailStrings.Compose_To]: 'Para',
  [BrightMailStrings.Compose_Cc]: 'Cc',
  [BrightMailStrings.Compose_Bcc]: 'Cco',
  [BrightMailStrings.Compose_Subject]: 'Asunto',
  [BrightMailStrings.Compose_Body]: 'Mensaje',
  [BrightMailStrings.Compose_Send]: 'Enviar',
  [BrightMailStrings.Compose_SendSuccess]:
    'Correo electrónico enviado con éxito',
  [BrightMailStrings.Compose_SendError]:
    'Error al enviar el correo electrónico',
  [BrightMailStrings.Compose_InvalidRecipient]:
    'Por favor, añada al menos un destinatario válido',
  [BrightMailStrings.Compose_Attachments]: 'Archivos adjuntos',
  [BrightMailStrings.Compose_ExternalRecipientsWarning]:
    'El cifrado ECIES no está disponible para destinatarios externos. El envío está deshabilitado mientras haya direcciones externas con el cifrado activado.',
  [BrightMailStrings.Compose_ExternalRecipientsWarningTemplate]:
    'Los destinatarios externos ({ADDRESSES}) están fuera del dominio local y no pueden recibir mensajes cifrados con ECIES.',
  [BrightMailStrings.Compose_BounceWarningTitle]:
    'Destinatarios no verificados',
  [BrightMailStrings.Compose_BounceWarningMessage]:
    'No se encontraron los siguientes destinatarios y su mensaje podría rebotar: {ADDRESSES}. ¿Enviar de todos modos?',
  [BrightMailStrings.Compose_BounceWarningSendAnyway]: 'Enviar de todos modos',

  // Thread
  [BrightMailStrings.Thread_Error]: 'Error al cargar el hilo de conversación',
  [BrightMailStrings.Thread_BackToInbox]: 'Volver a la bandeja de entrada',
  [BrightMailStrings.Thread_Reply]: 'Responder',
  [BrightMailStrings.Thread_ReplyAll]: 'Responder a todos',
  [BrightMailStrings.Thread_Forward]: 'Reenviar',

  // Delete
  [BrightMailStrings.Delete_Confirm]: '¿Está seguro de que desea eliminar?',
  [BrightMailStrings.Delete_ConfirmBulkTemplate]:
    '¿Eliminar {COUNT} correos seleccionados?',
  [BrightMailStrings.Delete_Success]: 'Correo electrónico eliminado',
  [BrightMailStrings.Delete_ErrorTemplate]:
    'Error al eliminar el correo electrónico: {MESSAGE_ID}',

  // Sidebar / Navigation
  [BrightMailStrings.Nav_Inbox]: 'Bandeja de entrada',
  [BrightMailStrings.Nav_Sent]: 'Enviados',
  [BrightMailStrings.Nav_Drafts]: 'Borradores',
  [BrightMailStrings.Nav_Trash]: 'Papelera',
  [BrightMailStrings.Nav_Spam]: 'Spam',
  [BrightMailStrings.Nav_Labels]: 'Etiquetas',
  [BrightMailStrings.Nav_Calendar]: 'Calendario',
  [BrightMailStrings.Nav_Compose]: 'Redactar',
  [BrightMailStrings.Nav_MailFolders]: 'Carpetas de correo',

  // Actions
  [BrightMailStrings.Action_Delete]: 'Eliminar',
  [BrightMailStrings.Action_MarkAsRead]: 'Marcar como leído',
  [BrightMailStrings.Action_Cancel]: 'Cancelar',
  [BrightMailStrings.Action_Discard]: 'Descartar',
  [BrightMailStrings.Action_Submit]: 'Enviar',
  [BrightMailStrings.Action_Generate]: 'Generar',
  [BrightMailStrings.Action_Search]: 'Buscar',
  [BrightMailStrings.Action_Import]: 'Importar',

  // General
  [BrightMailStrings.Loading]: 'Cargando...',
  [BrightMailStrings.NewMessage]: 'Nuevo mensaje',
  [BrightMailStrings.DiscardDraftTitle]: '¿Descartar borrador?',
  [BrightMailStrings.DiscardDraftMessage]:
    'Su mensaje tiene contenido sin guardar. ¿Descartarlo?',

  // Attachment
  [BrightMailStrings.Attachment_AttachFiles]: 'Adjuntar archivos',
  [BrightMailStrings.Attachment_FileSizeExceededTemplate]:
    'El archivo "{FILENAME}" supera el límite de {LIMIT}',
  [BrightMailStrings.Attachment_TotalSizeExceeded]:
    'El total de archivos adjuntos supera el límite de {LIMIT}',
  [BrightMailStrings.Attachment_RemoveTemplate]: 'Eliminar {FILENAME}',

  // Email List
  [BrightMailStrings.EmailList_SelectAll]:
    'Seleccionar todos los correos electrónicos',
  [BrightMailStrings.EmailList_AriaLabel]: 'Lista de correos electrónicos',
  [BrightMailStrings.EmailList_SelectEmailTemplate]:
    'Seleccionar correo de {SENDER}',
  [BrightMailStrings.EmailList_Header_Sender]: 'Remitente',
  [BrightMailStrings.EmailList_Header_Subject]: 'Asunto',
  [BrightMailStrings.EmailList_Header_Date]: 'Fecha',
  [BrightMailStrings.EmailList_Header_Status]: 'Estado',
  [BrightMailStrings.EmailList_Status_Read]: 'Leído',
  [BrightMailStrings.EmailList_Status_Unread]: 'No leído',
  [BrightMailStrings.EmailList_Star]: 'Destacar',
  [BrightMailStrings.EmailList_Unstar]: 'Quitar destacado',

  // Encryption
  [BrightMailStrings.Encryption_Label]: 'Cifrado',
  [BrightMailStrings.Encryption_None]: 'Sin cifrado',
  [BrightMailStrings.Encryption_ECIES]: 'ECIES',
  [BrightMailStrings.Encryption_GPG]: 'GPG',
  [BrightMailStrings.Encryption_SMIME]: 'S/MIME',
  [BrightMailStrings.Encryption_MissingKeysTemplate]:
    'Los siguientes destinatarios carecen de claves públicas: {RECIPIENTS}',
  [BrightMailStrings.Encryption_SmimeCertRequired]:
    'La firma S/MIME requiere un certificado configurado en Ajustes',
  [BrightMailStrings.Encryption_GpgKeyRequired]:
    'La firma GPG requiere un par de claves configurado en Ajustes',
  [BrightMailStrings.Encryption_DefaultPreference]:
    'Preferencia de cifrado predeterminada',
  [BrightMailStrings.Encryption_DefaultLabel]: 'Cifrado predeterminado',

  // Key Management
  [BrightMailStrings.KeyMgmt_GpgKeypair]: 'Par de claves GPG',
  [BrightMailStrings.KeyMgmt_SmimeCertificate]: 'Certificado S/MIME',
  [BrightMailStrings.KeyMgmt_NoGpgKeypair]:
    'No hay par de claves GPG configurado. Genere un nuevo par de claves o importe una clave pública.',
  [BrightMailStrings.KeyMgmt_NoSmimeCert]:
    'No hay certificado S/MIME configurado. Importe un certificado para habilitar el cifrado S/MIME.',
  [BrightMailStrings.KeyMgmt_ExportPublicKey]: 'Exportar clave pública',
  [BrightMailStrings.KeyMgmt_PublishToKeyserver]:
    'Publicar en servidor de claves',
  [BrightMailStrings.KeyMgmt_GenerateKeypair]: 'Generar par de claves',
  [BrightMailStrings.KeyMgmt_ImportPublicKey]: 'Importar clave pública',
  [BrightMailStrings.KeyMgmt_ReplaceKey]: 'Reemplazar clave',
  [BrightMailStrings.KeyMgmt_ImportByEmail]: 'Importar por correo electrónico',
  [BrightMailStrings.KeyMgmt_ImportCertPem]: 'Importar certificado (PEM)',
  [BrightMailStrings.KeyMgmt_ReplaceCertificate]: 'Reemplazar certificado',
  [BrightMailStrings.KeyMgmt_ImportPkcs12]: 'Importar PKCS#12',
  [BrightMailStrings.KeyMgmt_Passphrase]: 'Frase de contraseña',
  [BrightMailStrings.KeyMgmt_Pkcs12Password]: 'Contraseña PKCS#12',
  [BrightMailStrings.KeyMgmt_EmailAddress]: 'Dirección de correo electrónico',
  [BrightMailStrings.KeyMgmt_DeleteGpgKeypair]: 'Eliminar par de claves GPG',
  [BrightMailStrings.KeyMgmt_DeleteGpgPublicKey]: 'Eliminar clave pública GPG',
  [BrightMailStrings.KeyMgmt_DeleteSmimeCert]: 'Eliminar certificado S/MIME',
  [BrightMailStrings.KeyMgmt_CertExpired]: 'Este certificado ha expirado',
  [BrightMailStrings.KeyMgmt_ErrorInvalidCert]:
    'Archivo de certificado X.509 no válido',
  [BrightMailStrings.KeyMgmt_ErrorInvalidKey]:
    'Archivo de clave pública PGP no válido',
  [BrightMailStrings.KeyMgmt_ErrorUploadCert]: 'Error al cargar el certificado',
  [BrightMailStrings.KeyMgmt_ErrorUploadKey]: 'Error al cargar la clave',
  [BrightMailStrings.KeyMgmt_ErrorDeleteCert]:
    'Error al eliminar el certificado',
  [BrightMailStrings.KeyMgmt_ErrorDeleteKey]: 'Error al eliminar la clave',
  [BrightMailStrings.KeyMgmt_ErrorGenerateKeypair]:
    'Error al generar el par de claves GPG',
  [BrightMailStrings.KeyMgmt_ErrorExportKey]:
    'Error al exportar la clave pública GPG',
  [BrightMailStrings.KeyMgmt_ErrorPublishKey]:
    'Error al publicar la clave GPG en el servidor de claves',
  [BrightMailStrings.KeyMgmt_ErrorImportByEmail]:
    'Error al importar la clave GPG por correo electrónico',
  [BrightMailStrings.KeyMgmt_ErrorImportPkcs12]:
    'Error al importar el certificado PKCS#12',

  // Passphrase Dialog
  [BrightMailStrings.Passphrase_Title]: 'Introducir frase de contraseña GPG',
  [BrightMailStrings.Passphrase_Label]: 'Frase de contraseña',

  // Reading Pane
  [BrightMailStrings.ReadingPane_Placeholder]:
    'Seleccione un correo electrónico para leer',

  // Recipient Chip Input
  [BrightMailStrings.Recipient_AddedOneTemplate]:
    'Destinatario añadido: {EMAIL}',
  [BrightMailStrings.Recipient_AddedManyTemplate]:
    'Destinatarios añadidos: {EMAILS}',
  [BrightMailStrings.Recipient_RemovedTemplate]:
    'Destinatario eliminado: {EMAIL}',
  [BrightMailStrings.Recipient_NotFoundTemplate]:
    '{LOCAL} no encontrado en {DOMAIN}',

  // Rich Text Editor
  [BrightMailStrings.RichText_Placeholder]: 'Redacte su mensaje...',
  [BrightMailStrings.RichText_Bold]: 'Negrita',
  [BrightMailStrings.RichText_Italic]: 'Cursiva',
  [BrightMailStrings.RichText_Underline]: 'Subrayado',
  [BrightMailStrings.RichText_OrderedList]: 'Lista ordenada',
  [BrightMailStrings.RichText_UnorderedList]: 'Lista sin ordenar',
  [BrightMailStrings.RichText_Link]: 'Enlace',
  [BrightMailStrings.RichText_EnterUrl]: 'Introducir URL:',
  [BrightMailStrings.RichText_ToolbarLabel]: 'Formato de texto',

  // Compose Modal
  [BrightMailStrings.ComposeModal_Restore]: 'Restaurar redacción',
  [BrightMailStrings.ComposeModal_Minimize]: 'Minimizar redacción',
  [BrightMailStrings.ComposeModal_Maximize]: 'Maximizar redacción',
  [BrightMailStrings.ComposeModal_RestoreDown]: 'Restaurar tamaño de redacción',
  [BrightMailStrings.ComposeModal_Close]: 'Cerrar redacción',

  // GPG Setup Wizard
  [BrightMailStrings.GpgWizard_Title]: 'Configurar cifrado GPG',
  [BrightMailStrings.GpgWizard_WelcomeHeading]: 'Proteja su correo con GPG',
  [BrightMailStrings.GpgWizard_WelcomeBody]:
    'GPG (GNU Privacy Guard) le permite cifrar y firmar correos electrónicos para que solo el destinatario previsto pueda leerlos. La configuración toma menos de un minuto.',
  [BrightMailStrings.GpgWizard_EciesNote]:
    'Los miembros de BrightChain también obtienen cifrado ECIES automáticamente para mensajes dentro de la red.',
  [BrightMailStrings.GpgWizard_OptionGenerate]: 'Crear un nuevo par de claves',
  [BrightMailStrings.GpgWizard_OptionGenerateDesc]:
    'Recomendado. Generamos un par de claves seguro para usted.',
  [BrightMailStrings.GpgWizard_OptionImport]: 'Ya tengo una clave GPG',
  [BrightMailStrings.GpgWizard_OptionImportDesc]:
    'Importe una clave pública existente desde un archivo, el portapapeles o un servidor de claves.',
  [BrightMailStrings.GpgWizard_GenerateHeading]:
    'Elija una frase de contraseña',
  [BrightMailStrings.GpgWizard_GenerateBody]:
    'Su frase de contraseña protege su clave privada. Elija algo memorable pero difícil de adivinar.',
  [BrightMailStrings.GpgWizard_PassphraseLabel]: 'Frase de contraseña',
  [BrightMailStrings.GpgWizard_PassphraseConfirmLabel]:
    'Confirmar frase de contraseña',
  [BrightMailStrings.GpgWizard_PassphraseMismatch]:
    'Las frases de contraseña no coinciden',
  [BrightMailStrings.GpgWizard_PassphraseStrengthWeak]: 'Débil',
  [BrightMailStrings.GpgWizard_PassphraseStrengthFair]: 'Aceptable',
  [BrightMailStrings.GpgWizard_PassphraseStrengthGood]: 'Buena',
  [BrightMailStrings.GpgWizard_PassphraseStrengthStrong]: 'Fuerte',
  [BrightMailStrings.GpgWizard_GenerateButton]: 'Generar mis claves',
  [BrightMailStrings.GpgWizard_Generating]: 'Generando su par de claves…',
  [BrightMailStrings.GpgWizard_ImportHeading]: 'Importar su clave GPG',
  [BrightMailStrings.GpgWizard_ImportTabFile]: 'Subir archivo',
  [BrightMailStrings.GpgWizard_ImportTabPaste]: 'Pegar clave',
  [BrightMailStrings.GpgWizard_ImportTabKeyserver]:
    'Buscar en servidor de claves',
  [BrightMailStrings.GpgWizard_ImportFilePrompt]:
    'Seleccione un archivo .asc, .gpg o .pub',
  [BrightMailStrings.GpgWizard_ImportPasteLabel]:
    'Pegue su clave pública en formato ASCII-armored',
  [BrightMailStrings.GpgWizard_ImportKeyserverLabel]:
    'Dirección de correo electrónico',
  [BrightMailStrings.GpgWizard_ImportKeyserverHint]:
    'Buscaremos en servidores de claves públicos una clave que coincida con este correo.',
  [BrightMailStrings.GpgWizard_ImportButton]: 'Importar clave',
  [BrightMailStrings.GpgWizard_Searching]: 'Buscando en servidores de claves…',
  [BrightMailStrings.GpgWizard_SuccessHeading]: '¡Todo listo!',
  [BrightMailStrings.GpgWizard_SuccessBody]:
    'Su clave GPG está lista. Ahora puede enviar y recibir correo cifrado con GPG.',
  [BrightMailStrings.GpgWizard_SuccessFingerprint]:
    'Huella digital de la clave',
  [BrightMailStrings.GpgWizard_PublishPrompt]:
    'Publique su clave pública para que otros puedan encontrarla y enviarle correo cifrado.',
  [BrightMailStrings.GpgWizard_PublishButton]: 'Publicar en servidor de claves',
  [BrightMailStrings.GpgWizard_SetDefaultPrompt]:
    '¿Establecer GPG como cifrado predeterminado para nuevos mensajes?',
  [BrightMailStrings.GpgWizard_SetDefaultButton]:
    'Establecer GPG como predeterminado',
  [BrightMailStrings.GpgWizard_Done]: 'Listo',
  [BrightMailStrings.GpgWizard_Back]: 'Atrás',
  [BrightMailStrings.GpgWizard_Next]: 'Siguiente',
  [BrightMailStrings.GpgWizard_ErrorGenerate]:
    'No se pudo generar el par de claves. Inténtelo de nuevo.',
  [BrightMailStrings.GpgWizard_ErrorImport]:
    'No se pudo importar la clave. Verifique el archivo o los datos e inténtelo de nuevo.',
  [BrightMailStrings.GpgWizard_ErrorPublish]:
    'No se pudo publicar la clave en el servidor de claves.',

  // Calendar Invite Card
  [BrightMailStrings.CalInvite_Title]: 'Invitación de calendario',
  [BrightMailStrings.CalInvite_Organizer]: 'Organizador',
  [BrightMailStrings.CalInvite_WhenTemplate]: '{START} – {END}',
  [BrightMailStrings.CalInvite_AllDay]: 'Todo el día',
  [BrightMailStrings.CalInvite_Location]: 'Ubicación',
  [BrightMailStrings.CalInvite_Description]: 'Descripción',
  [BrightMailStrings.CalInvite_AttendeesTemplate]: '{COUNT} asistente(s)',
  [BrightMailStrings.CalInvite_Accept]: 'Aceptar',
  [BrightMailStrings.CalInvite_Decline]: 'Rechazar',
  [BrightMailStrings.CalInvite_Tentative]: 'Provisional',
  [BrightMailStrings.CalInvite_AddToCalendar]: 'Agregar al calendario',
  [BrightMailStrings.CalInvite_ViewInCalendar]: 'Ver en el calendario',
  [BrightMailStrings.CalInvite_AlreadyResponded]: 'Ya ha respondido',
  [BrightMailStrings.CalInvite_ResponseTemplate]:
    'Su respuesta: {RESPONSE}',
  [BrightMailStrings.CalInvite_Cancelled]: 'Evento cancelado',
  [BrightMailStrings.CalInvite_CancelledBody]:
    'El organizador ha cancelado este evento.',
  [BrightMailStrings.CalInvite_Updated]: 'Evento actualizado',
  [BrightMailStrings.CalInvite_UpdatedBody]:
    'El organizador ha actualizado este evento.',
  [BrightMailStrings.CalInvite_Counter]: 'Contrapropuesta',
  [BrightMailStrings.CalInvite_CounterBody]:
    'Un asistente ha propuesto un nuevo horario.',
  [BrightMailStrings.CalInvite_ErrorRsvp]:
    'No se pudo enviar la confirmación',
  [BrightMailStrings.CalInvite_ErrorImport]:
    'No se pudo importar el evento al calendario',
  [BrightMailStrings.CalInvite_SuccessAccepted]: 'Invitación aceptada',
  [BrightMailStrings.CalInvite_SuccessDeclined]: 'Invitación rechazada',
  [BrightMailStrings.CalInvite_SuccessTentative]:
    'Invitación aceptada provisionalmente',
};
