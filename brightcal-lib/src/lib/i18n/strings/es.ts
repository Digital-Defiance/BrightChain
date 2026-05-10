import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightCalStringKey,
  BrightCalStrings,
} from '../../enumerations/brightCalStrings';

export const SpanishStrings: ComponentStrings<BrightCalStringKey> = {
  // ── Common ──
  [BrightCalStrings.Common_Calendar]: 'Calendario',
  [BrightCalStrings.Common_Event]: 'Evento',
  [BrightCalStrings.Common_Booking]: 'Reserva',
  [BrightCalStrings.Common_Schedule]: 'Horario',
  [BrightCalStrings.Common_Invitation]: 'Invitación',

  // ── View modes ──
  [BrightCalStrings.View_Month]: 'Mes',
  [BrightCalStrings.View_Week]: 'Semana',
  [BrightCalStrings.View_Day]: 'Día',
  [BrightCalStrings.View_Agenda]: 'Agenda',

  // ── Actions ──
  [BrightCalStrings.Action_Create]: 'Crear',
  [BrightCalStrings.Action_Save]: 'Guardar',
  [BrightCalStrings.Action_Cancel]: 'Cancelar',
  [BrightCalStrings.Action_Delete]: 'Eliminar',
  [BrightCalStrings.Action_Edit]: 'Editar',
  [BrightCalStrings.Action_Retry]: 'Reintentar',
  [BrightCalStrings.Action_Accept]: 'Aceptar',
  [BrightCalStrings.Action_Decline]: 'Rechazar',
  [BrightCalStrings.Action_Tentative]: 'Provisional',
  [BrightCalStrings.Action_AddEvent]: 'Añadir evento',
  [BrightCalStrings.Action_ConfirmBooking]: 'Confirmar reserva',
  [BrightCalStrings.Action_GoToToday]: 'Hoy',
  [BrightCalStrings.Action_PreviousMonth]: 'Mes anterior',
  [BrightCalStrings.Action_NextMonth]: 'Mes siguiente',
  [BrightCalStrings.Action_PreviousDay]: 'Día anterior',
  [BrightCalStrings.Action_NextDay]: 'Día siguiente',
  [BrightCalStrings.Action_Close]: 'Cerrar',

  // ── Labels ──
  [BrightCalStrings.Label_Title]: 'Título',
  [BrightCalStrings.Label_Start]: 'Inicio',
  [BrightCalStrings.Label_End]: 'Fin',
  [BrightCalStrings.Label_Location]: 'Ubicación',
  [BrightCalStrings.Label_Description]: 'Descripción',
  [BrightCalStrings.Label_Attendees]: 'Asistentes',
  [BrightCalStrings.Label_When]: 'Cuándo',
  [BrightCalStrings.Label_Where]: 'Dónde',
  [BrightCalStrings.Label_Name]: 'Nombre',
  [BrightCalStrings.Label_Email]: 'Correo electrónico',
  [BrightCalStrings.Label_Upcoming]: 'Próximos',
  [BrightCalStrings.Label_Loading]: 'Cargando calendario',
  [BrightCalStrings.Label_RsvpActions]: 'Acciones de RSVP',
  [BrightCalStrings.Label_BookingPage]: 'Página de reserva',
  [BrightCalStrings.Label_BookingForm]: 'Formulario de reserva',
  [BrightCalStrings.Label_AvailableSlots]: 'Horarios disponibles',
  [BrightCalStrings.Label_DateNavigation]: 'Navegación por fecha',
  [BrightCalStrings.Label_CalendarSidebar]: 'Barra lateral del calendario',
  [BrightCalStrings.Label_CreateEvent]: 'Crear evento',
  [BrightCalStrings.Label_EditEvent]: 'Editar evento',
  [BrightCalStrings.Label_AddCalendarEvent]: 'Añadir evento al calendario',
  [BrightCalStrings.Label_AllDay]: 'Todo el día',
  [BrightCalStrings.Label_Visibility]: 'Visibilidad',
  [BrightCalStrings.Label_Calendar]: 'Calendario',

  // ── Status ──
  [BrightCalStrings.Status_Updated]: 'Actualizado',
  [BrightCalStrings.Status_NoUpcomingEvents]: 'No hay eventos próximos',
  [BrightCalStrings.Status_NoAvailableSlots]:
    'No hay horarios disponibles para esta fecha',

  // ── Validation errors (controllers) ──
  [BrightCalStrings.Error_MissingField_Template]:
    'Campo obligatorio faltante o no válido: {field}',
  [BrightCalStrings.Error_InvalidField_Template]:
    'Valor no válido para el campo: {field}',
  [BrightCalStrings.Error_FieldTooLong_Template]:
    '{field} debe tener {max} caracteres o menos',
  [BrightCalStrings.Error_InvalidHexColor]:
    'color debe ser un código de color hex válido (ej.: "#FF5733")',
  [BrightCalStrings.Error_InvalidISODate_Template]:
    '{field} debe ser una fecha/hora ISO 8601 válida',
  [BrightCalStrings.Error_EndBeforeStart]: 'dtend debe ser posterior a dtstart',
  [BrightCalStrings.Error_InvalidVisibility]:
    'visibility debe ser uno de: {values}',
  [BrightCalStrings.Error_InvalidTransparency]:
    'transparency debe ser uno de: {values}',
  [BrightCalStrings.Error_MissingCalendarId]:
    'Falta el parámetro de consulta obligatorio: calendarId',
  [BrightCalStrings.Error_MissingId]: 'Falta el parámetro obligatorio: id',
  [BrightCalStrings.Error_MissingSearchQuery]:
    'Parámetro de consulta obligatorio faltante o vacío: q',
  [BrightCalStrings.Error_EmptySummary]: 'summary debe ser una cadena no vacía',
  [BrightCalStrings.Error_NoUpdateFields]:
    'Se debe proporcionar al menos un campo (displayName, color, description)',
  [BrightCalStrings.Error_InvalidRsvpResponse]:
    'response debe ser uno de: ACCEPTED, DECLINED, TENTATIVE',
  [BrightCalStrings.Error_InvalidDuplicateMode]:
    'duplicateMode debe ser uno de: skip, overwrite, create-new',
  [BrightCalStrings.Error_MissingIcsData]:
    'Campo obligatorio faltante o no válido: icsData',
  [BrightCalStrings.Error_EmptyUserIds]:
    'userIds debe ser un arreglo no vacío de IDs de usuario',
  [BrightCalStrings.Error_InvalidUserId]:
    'Cada userId debe ser una cadena no vacía',
  [BrightCalStrings.Error_InvalidDuration]:
    'durationMinutes debe ser un número positivo',
  [BrightCalStrings.Error_NoAttendees]:
    'Se debe especificar al menos un asistente obligatorio u opcional',
  [BrightCalStrings.Error_EmptyAppointmentTypes]:
    'appointmentTypes debe ser un arreglo no vacío',
  [BrightCalStrings.Error_MissingSlug]:
    'Campo obligatorio faltante o no válido: slug',
  [BrightCalStrings.Error_MissingTitle]:
    'Campo obligatorio faltante o no válido: title',
  [BrightCalStrings.Error_MissingDate]:
    'Parámetro de consulta obligatorio faltante o no válido: date',
  [BrightCalStrings.Error_MissingAppointmentType]:
    'Parámetro de consulta obligatorio faltante o no válido: appointmentType',
  [BrightCalStrings.Error_MissingStartTime]:
    'Campo obligatorio faltante o no válido: startTime',
  [BrightCalStrings.Error_MissingBookerName]:
    'Campo obligatorio faltante o no válido: bookerName',
  [BrightCalStrings.Error_MissingBookerEmail]:
    'Campo obligatorio faltante o no válido: bookerEmail',
  [BrightCalStrings.Error_InvalidComment]:
    'comment debe ser una cadena de caracteres',
  [BrightCalStrings.Error_MissingCounterProposalId]:
    'Campo obligatorio faltante o no válido: counterProposalId',
  [BrightCalStrings.Error_MissingEventId]:
    'Campo obligatorio faltante o no válido: eventId',
  [BrightCalStrings.Error_MissingProposedStart]:
    'Campo obligatorio faltante o no válido: proposedStart',
  [BrightCalStrings.Error_MissingProposedEnd]:
    'Campo obligatorio faltante o no válido: proposedEnd',
  [BrightCalStrings.Error_MissingCalendarIdParam]:
    'Falta el parámetro obligatorio: calendarId',
  [BrightCalStrings.Error_DescriptionMustBeString]:
    'description debe ser una cadena de caracteres',
  [BrightCalStrings.Error_InvalidStartDate]:
    'start debe ser una fecha/hora ISO 8601 válida',
  [BrightCalStrings.Error_InvalidEndDate]:
    'end debe ser una fecha/hora ISO 8601 válida',

  // ── Permission errors ──
  [BrightCalStrings.Error_Forbidden_CalendarUpdate]:
    'Solo el propietario del calendario puede actualizarlo',
  [BrightCalStrings.Error_Forbidden_CalendarDelete]:
    'Solo el propietario del calendario puede eliminarlo',
  [BrightCalStrings.Error_Forbidden_EventUpdate]:
    'Permisos insuficientes para actualizar este evento',
  [BrightCalStrings.Error_Forbidden_EventDelete]:
    'Permisos insuficientes para eliminar este evento',
  [BrightCalStrings.Error_Forbidden_Export]:
    'Permisos insuficientes para exportar este calendario',
  [BrightCalStrings.Error_Forbidden_Import]:
    'Permisos insuficientes para importar a este calendario',

  // ── Service errors ──
  [BrightCalStrings.Error_ServiceUnavailable_Calendar]:
    'El servicio de calendario no está disponible',
  [BrightCalStrings.Error_ServiceUnavailable_Event]:
    'El servicio de eventos no está disponible',
  [BrightCalStrings.Error_ServiceUnavailable_Scheduling]:
    'El servicio de programación no está disponible',
  [BrightCalStrings.Error_ServiceUnavailable_Invitation]:
    'El servicio de invitaciones no está disponible',
  [BrightCalStrings.Error_ServiceUnavailable_Booking]:
    'El servicio de reservas no está disponible',
  [BrightCalStrings.Error_ServiceUnavailable_Search]:
    'El servicio de búsqueda no está disponible',
  [BrightCalStrings.Error_ServiceUnavailable_ExportImport]:
    'El servicio de exportación/importación no está disponible',

  // ── Not found ──
  [BrightCalStrings.Error_NotFound_BookingPage]:
    'Página de reserva no encontrada',
  [BrightCalStrings.Error_SlotUnavailable]:
    'El horario solicitado ya no está disponible',
  [BrightCalStrings.Error_NotFound_AppointmentType]:
    'Página de reserva o tipo de cita no encontrado',

  // ── Friends ──
  [BrightCalStrings.Friends_SectionTitle]: 'Amigos',

  // ── Barra lateral del calendario ──
  [BrightCalStrings.Label_MyCalendars]: 'Mis calendarios',
  [BrightCalStrings.Label_OtherCalendars]: 'Otros calendarios',
  [BrightCalStrings.Label_CalendarName]: 'Nombre del calendario',
  [BrightCalStrings.Label_CalendarUrl]: 'URL del calendario',
  [BrightCalStrings.Label_NewName]: 'Nuevo nombre',
  [BrightCalStrings.Label_CalendarColor]: 'Color del calendario',
  [BrightCalStrings.Label_CalendarOptions]: 'Opciones del calendario',
  [BrightCalStrings.Label_ConfirmDelete]: 'Confirmar eliminación',
  [BrightCalStrings.Label_DismissError]: 'Cerrar error',
  [BrightCalStrings.Label_AddCalendarForm]:
    'Formulario para agregar calendario',
  [BrightCalStrings.Label_SubscribeToCalendarForm]:
    'Formulario de suscripción al calendario',
  [BrightCalStrings.Label_RenameCalendarForm]:
    'Formulario para renombrar calendario',
  [BrightCalStrings.Label_ChangeCalendarColorForm]:
    'Formulario para cambiar color del calendario',
  [BrightCalStrings.Label_NewCalendarName]: 'Nuevo nombre del calendario',
  [BrightCalStrings.Label_CalendarControls]: 'Controles del calendario',
  [BrightCalStrings.Label_CalendarApplication]: 'Aplicación de calendario',
  [BrightCalStrings.Label_CalendarNavigation]: 'Navegación del calendario',
  [BrightCalStrings.Label_CalendarContent]: 'Contenido del calendario',
  [BrightCalStrings.Label_WeekView]: 'Vista semanal',
  [BrightCalStrings.Label_DayViewTemplate]: 'Vista del día para {DATE}',
  [BrightCalStrings.Label_AttendeeAvailability]: 'Disponibilidad de asistentes',
  [BrightCalStrings.Label_Attendee]: 'Asistente',
  [BrightCalStrings.Label_MiniCalendar]: 'Mini calendario',
  [BrightCalStrings.Label_AgendaView]: 'Vista de agenda',
  [BrightCalStrings.Action_AddCalendar]: 'Agregar calendario',
  [BrightCalStrings.Action_SubscribeToCalendar]: 'Suscribirse al calendario',
  [BrightCalStrings.Action_BrowseHolidayCalendars]:
    'Explorar calendarios de festivos',
  [BrightCalStrings.Action_Subscribe]: 'Suscribirse',
  [BrightCalStrings.Action_Rename]: 'Renombrar',
  [BrightCalStrings.Action_ChangeColor]: 'Cambiar color',
  [BrightCalStrings.Action_Share]: 'Compartir',
  [BrightCalStrings.Action_Revoke]: 'Revocar',
  [BrightCalStrings.Action_CopyPublicLink]: 'Copiar enlace público',
  [BrightCalStrings.Action_RevokePublicLink]: 'Revocar enlace público',
  [BrightCalStrings.Sidebar_CannotDeleteDefault]:
    'No se puede eliminar el calendario predeterminado',
  [BrightCalStrings.Sidebar_ConfirmDeleteMessage]:
    '¿Está seguro de que desea eliminar este calendario? Esta acción no se puede deshacer.',
  [BrightCalStrings.Sharing_DialogTitleTemplate]: 'Compartir "{NAME}"',
  [BrightCalStrings.Sharing_CurrentShares]: 'Compartidos actuales',
  [BrightCalStrings.Sharing_NoShares]:
    'Aún no hay compartidos. Agregue un usuario a continuación.',
  [BrightCalStrings.Sharing_AddShare]: 'Agregar compartido',
  [BrightCalStrings.Sharing_LinkCopied]: 'Enlace copiado al portapapeles',
  [BrightCalStrings.Sharing_SelectAndCopy]:
    'Seleccione y copie el enlace de arriba',
  [BrightCalStrings.Label_CloseSharingDialog]: 'Cerrar diálogo de compartir',
  [BrightCalStrings.Label_SharedUsers]: 'Usuarios compartidos',
  [BrightCalStrings.Label_ShareCalendarForm]:
    'Formulario para compartir calendario',
  [BrightCalStrings.Label_UserId]: 'ID de usuario',
  [BrightCalStrings.Label_PermissionLevel]: 'Nivel de permiso',
  [BrightCalStrings.Label_PublicLink]: 'Enlace público',
  [BrightCalStrings.Label_PublicLinkUrl]: 'URL del enlace público',
  [BrightCalStrings.Permission_Owner]: 'Propietario',
  [BrightCalStrings.Permission_Editor]: 'Editor',
  [BrightCalStrings.Permission_Viewer]: 'Lector',
  [BrightCalStrings.Permission_FreeBusyOnly]: 'Solo libre/ocupado',
  [BrightCalStrings.Visibility_Public]: 'Pública',
  [BrightCalStrings.Visibility_Private]: 'Privada',
  [BrightCalStrings.Visibility_Confidential]: 'Confidencial',
  [BrightCalStrings.Weekday_Sun]: 'Dom',
  [BrightCalStrings.Weekday_Mon]: 'Lun',
  [BrightCalStrings.Weekday_Tue]: 'Mar',
  [BrightCalStrings.Weekday_Wed]: 'Mié',
  [BrightCalStrings.Weekday_Thu]: 'Jue',
  [BrightCalStrings.Weekday_Fri]: 'Vie',
  [BrightCalStrings.Weekday_Sat]: 'Sáb',
  [BrightCalStrings.Label_HolidayCalendars]: 'Calendarios de festivos',
  [BrightCalStrings.Label_SearchHolidayCalendars]:
    'Buscar calendarios de festivos',
  [BrightCalStrings.Label_CloseHolidayCatalog]: 'Cerrar catálogo de festivos',
  [BrightCalStrings.Holiday_SearchPlaceholder]: 'Buscar por nombre o región...',
  [BrightCalStrings.Holiday_NoCalendarsFound]:
    'No se encontraron calendarios de festivos.',
  [BrightCalStrings.Holiday_UnableToLoad]:
    'No se pudieron cargar los calendarios de festivos',
  [BrightCalStrings.Status_Subscribed]: 'Suscrito',
  [BrightCalStrings.Tooltip_AddEvent]:
    'Crear un evento con estos destinatarios',
};
