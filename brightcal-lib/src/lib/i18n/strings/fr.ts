import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightCalStringKey,
  BrightCalStrings,
} from '../../enumerations/brightCalStrings';

export const FrenchStrings: ComponentStrings<BrightCalStringKey> = {
  // ── Common ──
  [BrightCalStrings.Common_Calendar]: 'Calendrier',
  [BrightCalStrings.Common_Event]: 'Événement',
  [BrightCalStrings.Common_Booking]: 'Réservation',
  [BrightCalStrings.Common_Schedule]: 'Planning',
  [BrightCalStrings.Common_Invitation]: 'Invitation',

  // ── View modes ──
  [BrightCalStrings.View_Month]: 'Mois',
  [BrightCalStrings.View_Week]: 'Semaine',
  [BrightCalStrings.View_Day]: 'Jour',
  [BrightCalStrings.View_Agenda]: 'Agenda',

  // ── Actions ──
  [BrightCalStrings.Action_Create]: 'Créer',
  [BrightCalStrings.Action_Save]: 'Enregistrer',
  [BrightCalStrings.Action_Cancel]: 'Annuler',
  [BrightCalStrings.Action_Delete]: 'Supprimer',
  [BrightCalStrings.Action_Edit]: 'Modifier',
  [BrightCalStrings.Action_Retry]: 'Réessayer',
  [BrightCalStrings.Action_Accept]: 'Accepter',
  [BrightCalStrings.Action_Decline]: 'Refuser',
  [BrightCalStrings.Action_Tentative]: 'Sous réserve',
  [BrightCalStrings.Action_AddEvent]: 'Ajouter un événement',
  [BrightCalStrings.Action_ConfirmBooking]: 'Confirmer la réservation',
  [BrightCalStrings.Action_GoToToday]: "Aujourd'hui",
  [BrightCalStrings.Action_PreviousMonth]: 'Mois précédent',
  [BrightCalStrings.Action_NextMonth]: 'Mois suivant',
  [BrightCalStrings.Action_PreviousDay]: 'Jour précédent',
  [BrightCalStrings.Action_NextDay]: 'Jour suivant',
  [BrightCalStrings.Action_Close]: 'Fermer',

  // ── Labels ──
  [BrightCalStrings.Label_Title]: 'Titre',
  [BrightCalStrings.Label_Start]: 'Début',
  [BrightCalStrings.Label_End]: 'Fin',
  [BrightCalStrings.Label_Location]: 'Lieu',
  [BrightCalStrings.Label_Description]: 'Description',
  [BrightCalStrings.Label_Attendees]: 'Participants',
  [BrightCalStrings.Label_When]: 'Quand',
  [BrightCalStrings.Label_Where]: 'Où',
  [BrightCalStrings.Label_Name]: 'Nom',
  [BrightCalStrings.Label_Email]: 'E-mail',
  [BrightCalStrings.Label_Upcoming]: 'À venir',
  [BrightCalStrings.Label_Loading]: 'Chargement du calendrier',
  [BrightCalStrings.Label_RsvpActions]: 'Actions RSVP',
  [BrightCalStrings.Label_BookingPage]: 'Page de réservation',
  [BrightCalStrings.Label_BookingForm]: 'Formulaire de réservation',
  [BrightCalStrings.Label_AvailableSlots]: 'Créneaux disponibles',
  [BrightCalStrings.Label_DateNavigation]: 'Navigation par date',
  [BrightCalStrings.Label_CalendarSidebar]: 'Barre latérale du calendrier',
  [BrightCalStrings.Label_CreateEvent]: 'Créer un événement',
  [BrightCalStrings.Label_EditEvent]: 'Modifier un événement',
  [BrightCalStrings.Label_AddCalendarEvent]:
    'Ajouter un événement au calendrier',
  [BrightCalStrings.Label_AllDay]: 'Toute la journée',
  [BrightCalStrings.Label_Visibility]: 'Visibilité',
  [BrightCalStrings.Label_Calendar]: 'Calendrier',

  // ── Status ──
  [BrightCalStrings.Status_Updated]: 'Mis à jour',
  [BrightCalStrings.Status_NoUpcomingEvents]: 'Aucun événement à venir',
  [BrightCalStrings.Status_NoAvailableSlots]:
    'Aucun créneau disponible pour cette date',

  // ── Validation errors (controllers) ──
  [BrightCalStrings.Error_MissingField_Template]:
    'Champ obligatoire manquant ou invalide : {field}',
  [BrightCalStrings.Error_InvalidField_Template]:
    'Valeur invalide pour le champ : {field}',
  [BrightCalStrings.Error_FieldTooLong_Template]:
    '{field} doit contenir {max} caractères ou moins',
  [BrightCalStrings.Error_InvalidHexColor]:
    'color doit être un code couleur hex valide (ex. : « #FF5733 »)',
  [BrightCalStrings.Error_InvalidISODate_Template]:
    '{field} doit être une date/heure ISO 8601 valide',
  [BrightCalStrings.Error_EndBeforeStart]:
    'dtend doit être postérieur à dtstart',
  [BrightCalStrings.Error_InvalidVisibility]:
    'visibility doit être l\u2019une des valeurs suivantes : {values}',
  [BrightCalStrings.Error_InvalidTransparency]:
    'transparency doit être l\u2019une des valeurs suivantes : {values}',
  [BrightCalStrings.Error_MissingCalendarId]:
    'Paramètre de requête obligatoire manquant : calendarId',
  [BrightCalStrings.Error_MissingId]: 'Paramètre obligatoire manquant : id',
  [BrightCalStrings.Error_MissingSearchQuery]:
    'Paramètre de requête obligatoire manquant ou vide : q',
  [BrightCalStrings.Error_EmptySummary]:
    'summary doit être une chaîne non vide',
  [BrightCalStrings.Error_NoUpdateFields]:
    'Au moins un champ (displayName, color, description) doit être fourni',
  [BrightCalStrings.Error_InvalidRsvpResponse]:
    'response doit être l\u2019une des valeurs suivantes : ACCEPTED, DECLINED, TENTATIVE',
  [BrightCalStrings.Error_InvalidDuplicateMode]:
    'duplicateMode doit être l\u2019une des valeurs suivantes : skip, overwrite, create-new',
  [BrightCalStrings.Error_MissingIcsData]:
    'Champ obligatoire manquant ou invalide : icsData',
  [BrightCalStrings.Error_EmptyUserIds]:
    'userIds doit être un tableau non vide d\u2019identifiants utilisateur',
  [BrightCalStrings.Error_InvalidUserId]:
    'Chaque userId doit être une chaîne non vide',
  [BrightCalStrings.Error_InvalidDuration]:
    'durationMinutes doit être un nombre positif',
  [BrightCalStrings.Error_NoAttendees]:
    'Au moins un participant obligatoire ou facultatif doit être spécifié',
  [BrightCalStrings.Error_EmptyAppointmentTypes]:
    'appointmentTypes doit être un tableau non vide',
  [BrightCalStrings.Error_MissingSlug]:
    'Champ obligatoire manquant ou invalide : slug',
  [BrightCalStrings.Error_MissingTitle]:
    'Champ obligatoire manquant ou invalide : title',
  [BrightCalStrings.Error_MissingDate]:
    'Paramètre de requête obligatoire manquant ou invalide : date',
  [BrightCalStrings.Error_MissingAppointmentType]:
    'Paramètre de requête obligatoire manquant ou invalide : appointmentType',
  [BrightCalStrings.Error_MissingStartTime]:
    'Champ obligatoire manquant ou invalide : startTime',
  [BrightCalStrings.Error_MissingBookerName]:
    'Champ obligatoire manquant ou invalide : bookerName',
  [BrightCalStrings.Error_MissingBookerEmail]:
    'Champ obligatoire manquant ou invalide : bookerEmail',
  [BrightCalStrings.Error_InvalidComment]:
    'comment doit être une chaîne de caractères',
  [BrightCalStrings.Error_MissingCounterProposalId]:
    'Champ obligatoire manquant ou invalide : counterProposalId',
  [BrightCalStrings.Error_MissingEventId]:
    'Champ obligatoire manquant ou invalide : eventId',
  [BrightCalStrings.Error_MissingProposedStart]:
    'Champ obligatoire manquant ou invalide : proposedStart',
  [BrightCalStrings.Error_MissingProposedEnd]:
    'Champ obligatoire manquant ou invalide : proposedEnd',
  [BrightCalStrings.Error_MissingCalendarIdParam]:
    'Paramètre obligatoire manquant : calendarId',
  [BrightCalStrings.Error_DescriptionMustBeString]:
    'description doit être une chaîne de caractères',
  [BrightCalStrings.Error_InvalidStartDate]:
    'start doit être une date/heure ISO 8601 valide',
  [BrightCalStrings.Error_InvalidEndDate]:
    'end doit être une date/heure ISO 8601 valide',

  // ── Permission errors ──
  [BrightCalStrings.Error_Forbidden_CalendarUpdate]:
    'Seul le propriétaire du calendrier peut le modifier',
  [BrightCalStrings.Error_Forbidden_CalendarDelete]:
    'Seul le propriétaire du calendrier peut le supprimer',
  [BrightCalStrings.Error_Forbidden_EventUpdate]:
    'Permissions insuffisantes pour modifier cet événement',
  [BrightCalStrings.Error_Forbidden_EventDelete]:
    'Permissions insuffisantes pour supprimer cet événement',
  [BrightCalStrings.Error_Forbidden_Export]:
    'Permissions insuffisantes pour exporter ce calendrier',
  [BrightCalStrings.Error_Forbidden_Import]:
    'Permissions insuffisantes pour importer dans ce calendrier',

  // ── Service errors ──
  [BrightCalStrings.Error_ServiceUnavailable_Calendar]:
    'Le service de calendrier n\u2019est pas disponible',
  [BrightCalStrings.Error_ServiceUnavailable_Event]:
    'Le service d\u2019événements n\u2019est pas disponible',
  [BrightCalStrings.Error_ServiceUnavailable_Scheduling]:
    'Le service de planification n\u2019est pas disponible',
  [BrightCalStrings.Error_ServiceUnavailable_Invitation]:
    'Le service d\u2019invitations n\u2019est pas disponible',
  [BrightCalStrings.Error_ServiceUnavailable_Booking]:
    'Le service de réservation n\u2019est pas disponible',
  [BrightCalStrings.Error_ServiceUnavailable_Search]:
    'Le service de recherche n\u2019est pas disponible',
  [BrightCalStrings.Error_ServiceUnavailable_ExportImport]:
    'Le service d\u2019export/import n\u2019est pas disponible',

  // ── Not found ──
  [BrightCalStrings.Error_NotFound_BookingPage]:
    'Page de réservation introuvable',
  [BrightCalStrings.Error_SlotUnavailable]:
    'Le créneau demandé n\u2019est plus disponible',
  [BrightCalStrings.Error_NotFound_AppointmentType]:
    'Page de réservation ou type de rendez-vous introuvable',

  // ── Friends ──
  [BrightCalStrings.Friends_SectionTitle]: 'Amis',

  // ── Barre latérale du calendrier ──
  [BrightCalStrings.Label_MyCalendars]: 'Mes calendriers',
  [BrightCalStrings.Label_OtherCalendars]: 'Autres calendriers',
  [BrightCalStrings.Label_CalendarName]: 'Nom du calendrier',
  [BrightCalStrings.Label_CalendarUrl]: 'URL du calendrier',
  [BrightCalStrings.Label_NewName]: 'Nouveau nom',
  [BrightCalStrings.Label_CalendarColor]: 'Couleur du calendrier',
  [BrightCalStrings.Label_CalendarOptions]: 'Options du calendrier',
  [BrightCalStrings.Label_ConfirmDelete]: 'Confirmer la suppression',
  [BrightCalStrings.Label_DismissError]: "Fermer l'erreur",
  [BrightCalStrings.Label_AddCalendarForm]: "Formulaire d'ajout de calendrier",
  [BrightCalStrings.Label_SubscribeToCalendarForm]:
    "Formulaire d'abonnement au calendrier",
  [BrightCalStrings.Label_RenameCalendarForm]:
    'Formulaire de renommage du calendrier',
  [BrightCalStrings.Label_ChangeCalendarColorForm]:
    'Formulaire de changement de couleur',
  [BrightCalStrings.Label_NewCalendarName]: 'Nouveau nom du calendrier',
  [BrightCalStrings.Label_CalendarControls]: 'Contrôles du calendrier',
  [BrightCalStrings.Label_CalendarApplication]: 'Application calendrier',
  [BrightCalStrings.Label_CalendarNavigation]: 'Navigation du calendrier',
  [BrightCalStrings.Label_CalendarContent]: 'Contenu du calendrier',
  [BrightCalStrings.Label_WeekView]: 'Vue de la semaine',
  [BrightCalStrings.Label_DayViewTemplate]: 'Vue du jour pour {DATE}',
  [BrightCalStrings.Label_AttendeeAvailability]:
    'Disponibilité des participants',
  [BrightCalStrings.Label_Attendee]: 'Participant',
  [BrightCalStrings.Label_MiniCalendar]: 'Mini calendrier',
  [BrightCalStrings.Label_AgendaView]: 'Vue agenda',
  [BrightCalStrings.Action_AddCalendar]: 'Ajouter un calendrier',
  [BrightCalStrings.Action_SubscribeToCalendar]: "S'abonner au calendrier",
  [BrightCalStrings.Action_BrowseHolidayCalendars]:
    'Parcourir les calendriers de jours fériés',
  [BrightCalStrings.Action_Subscribe]: "S'abonner",
  [BrightCalStrings.Action_Rename]: 'Renommer',
  [BrightCalStrings.Action_ChangeColor]: 'Changer la couleur',
  [BrightCalStrings.Action_Share]: 'Partager',
  [BrightCalStrings.Action_Revoke]: 'Révoquer',
  [BrightCalStrings.Action_CopyPublicLink]: 'Copier le lien public',
  [BrightCalStrings.Action_RevokePublicLink]: 'Révoquer le lien public',
  [BrightCalStrings.Sidebar_CannotDeleteDefault]:
    'Impossible de supprimer le calendrier par défaut',
  [BrightCalStrings.Sidebar_ConfirmDeleteMessage]:
    'Êtes-vous sûr de vouloir supprimer ce calendrier ? Cette action est irréversible.',
  [BrightCalStrings.Sharing_DialogTitleTemplate]: 'Partager "{NAME}"',
  [BrightCalStrings.Sharing_CurrentShares]: 'Partages actuels',
  [BrightCalStrings.Sharing_NoShares]:
    'Aucun partage. Ajoutez un utilisateur ci-dessous.',
  [BrightCalStrings.Sharing_AddShare]: 'Ajouter un partage',
  [BrightCalStrings.Sharing_LinkCopied]: 'Lien copié dans le presse-papiers',
  [BrightCalStrings.Sharing_SelectAndCopy]:
    'Sélectionnez et copiez le lien ci-dessus',
  [BrightCalStrings.Label_CloseSharingDialog]: 'Fermer le dialogue de partage',
  [BrightCalStrings.Label_SharedUsers]: 'Utilisateurs partagés',
  [BrightCalStrings.Label_ShareCalendarForm]:
    'Formulaire de partage du calendrier',
  [BrightCalStrings.Label_UserId]: 'ID utilisateur',
  [BrightCalStrings.Label_PermissionLevel]: 'Niveau de permission',
  [BrightCalStrings.Label_PublicLink]: 'Lien public',
  [BrightCalStrings.Label_PublicLinkUrl]: 'URL du lien public',
  [BrightCalStrings.Permission_Owner]: 'Propriétaire',
  [BrightCalStrings.Permission_Editor]: 'Éditeur',
  [BrightCalStrings.Permission_Viewer]: 'Lecteur',
  [BrightCalStrings.Permission_FreeBusyOnly]: 'Libre/Occupé uniquement',
  [BrightCalStrings.Visibility_Public]: 'Publique',
  [BrightCalStrings.Visibility_Private]: 'Privée',
  [BrightCalStrings.Visibility_Confidential]: 'Confidentielle',
  [BrightCalStrings.Weekday_Sun]: 'Dim',
  [BrightCalStrings.Weekday_Mon]: 'Lun',
  [BrightCalStrings.Weekday_Tue]: 'Mar',
  [BrightCalStrings.Weekday_Wed]: 'Mer',
  [BrightCalStrings.Weekday_Thu]: 'Jeu',
  [BrightCalStrings.Weekday_Fri]: 'Ven',
  [BrightCalStrings.Weekday_Sat]: 'Sam',
  [BrightCalStrings.Label_HolidayCalendars]: 'Calendriers de jours fériés',
  [BrightCalStrings.Label_SearchHolidayCalendars]:
    'Rechercher des calendriers de jours fériés',
  [BrightCalStrings.Label_CloseHolidayCatalog]:
    'Fermer le catalogue de jours fériés',
  [BrightCalStrings.Holiday_SearchPlaceholder]:
    'Rechercher par nom ou région...',
  [BrightCalStrings.Holiday_NoCalendarsFound]:
    'Aucun calendrier de jours fériés trouvé.',
  [BrightCalStrings.Holiday_UnableToLoad]:
    'Impossible de charger les calendriers de jours fériés',
  [BrightCalStrings.Status_Subscribed]: 'Abonné',
  [BrightCalStrings.Tooltip_AddEvent]:
    'Créer un événement avec ces destinataires',
};
