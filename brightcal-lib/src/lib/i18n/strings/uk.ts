import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightCalStringKey,
  BrightCalStrings,
} from '../../enumerations/brightCalStrings';

export const UkrainianStrings: ComponentStrings<BrightCalStringKey> = {
  // ── Common ──
  [BrightCalStrings.Common_Calendar]: 'Календар',
  [BrightCalStrings.Common_Event]: 'Подія',
  [BrightCalStrings.Common_Booking]: 'Бронювання',
  [BrightCalStrings.Common_Schedule]: 'Розклад',
  [BrightCalStrings.Common_Invitation]: 'Запрошення',

  // ── View modes ──
  [BrightCalStrings.View_Month]: 'Місяць',
  [BrightCalStrings.View_Week]: 'Тиждень',
  [BrightCalStrings.View_Day]: 'День',
  [BrightCalStrings.View_Agenda]: 'Порядок денний',

  // ── Actions ──
  [BrightCalStrings.Action_Create]: 'Створити',
  [BrightCalStrings.Action_Save]: 'Зберегти',
  [BrightCalStrings.Action_Cancel]: 'Скасувати',
  [BrightCalStrings.Action_Delete]: 'Видалити',
  [BrightCalStrings.Action_Edit]: 'Редагувати',
  [BrightCalStrings.Action_Retry]: 'Повторити',
  [BrightCalStrings.Action_Accept]: 'Прийняти',
  [BrightCalStrings.Action_Decline]: 'Відхилити',
  [BrightCalStrings.Action_Tentative]: 'Попередньо',
  [BrightCalStrings.Action_AddEvent]: 'Додати подію',
  [BrightCalStrings.Action_ConfirmBooking]: 'Підтвердити бронювання',
  [BrightCalStrings.Action_GoToToday]: 'Сьогодні',
  [BrightCalStrings.Action_PreviousMonth]: 'Попередній місяць',
  [BrightCalStrings.Action_NextMonth]: 'Наступний місяць',
  [BrightCalStrings.Action_PreviousDay]: 'Попередній день',
  [BrightCalStrings.Action_NextDay]: 'Наступний день',
  [BrightCalStrings.Action_Close]: 'Закрити',

  // ── Labels ──
  [BrightCalStrings.Label_Title]: 'Назва',
  [BrightCalStrings.Label_Start]: 'Початок',
  [BrightCalStrings.Label_End]: 'Кінець',
  [BrightCalStrings.Label_Location]: 'Місце',
  [BrightCalStrings.Label_Description]: 'Опис',
  [BrightCalStrings.Label_Attendees]: 'Учасники',
  [BrightCalStrings.Label_When]: 'Коли',
  [BrightCalStrings.Label_Where]: 'Де',
  [BrightCalStrings.Label_Name]: "Ім'я",
  [BrightCalStrings.Label_Email]: 'Електронна пошта',
  [BrightCalStrings.Label_Upcoming]: 'Найближчі',
  [BrightCalStrings.Label_Loading]: 'Завантаження календаря',
  [BrightCalStrings.Label_RsvpActions]: 'Дії RSVP',
  [BrightCalStrings.Label_BookingPage]: 'Сторінка бронювання',
  [BrightCalStrings.Label_BookingForm]: 'Форма бронювання',
  [BrightCalStrings.Label_AvailableSlots]: 'Доступні часові слоти',
  [BrightCalStrings.Label_DateNavigation]: 'Навігація за датою',
  [BrightCalStrings.Label_CalendarSidebar]: 'Бічна панель календаря',
  [BrightCalStrings.Label_CreateEvent]: 'Створити подію',
  [BrightCalStrings.Label_EditEvent]: 'Редагувати подію',
  [BrightCalStrings.Label_AddCalendarEvent]: 'Додати подію до календаря',
  [BrightCalStrings.Label_AllDay]: 'Весь день',
  [BrightCalStrings.Label_Visibility]: 'Видимість',
  [BrightCalStrings.Label_Calendar]: 'Календар',

  // ── Status ──
  [BrightCalStrings.Status_Updated]: 'Оновлено',
  [BrightCalStrings.Status_NoUpcomingEvents]: 'Немає найближчих подій',
  [BrightCalStrings.Status_NoAvailableSlots]:
    'Немає доступних слотів на цю дату',

  // ── Validation errors (controllers) ──
  [BrightCalStrings.Error_MissingField_Template]:
    "Обов'язкове поле відсутнє або недійсне: {field}",
  [BrightCalStrings.Error_InvalidField_Template]:
    'Недійсне значення для поля: {field}',
  [BrightCalStrings.Error_FieldTooLong_Template]:
    '{field} має містити не більше {max} символів',
  [BrightCalStrings.Error_InvalidHexColor]:
    'color має бути дійсним hex кодом кольору (наприклад, "#FF5733")',
  [BrightCalStrings.Error_InvalidISODate_Template]:
    '{field} має бути дійсною датою/часом ISO 8601',
  [BrightCalStrings.Error_EndBeforeStart]: 'dtend має бути пізніше за dtstart',
  [BrightCalStrings.Error_InvalidVisibility]:
    'visibility має бути одним із: {values}',
  [BrightCalStrings.Error_InvalidTransparency]:
    'transparency має бути одним із: {values}',
  [BrightCalStrings.Error_MissingCalendarId]:
    "Відсутній обов'язковий параметр запиту: calendarId",
  [BrightCalStrings.Error_MissingId]: "Відсутній обов'язковий параметр: id",
  [BrightCalStrings.Error_MissingSearchQuery]:
    "Відсутній або порожній обов'язковий параметр запиту: q",
  [BrightCalStrings.Error_EmptySummary]: 'summary має бути непорожнім рядком',
  [BrightCalStrings.Error_NoUpdateFields]:
    'Необхідно вказати принаймні одне поле (displayName, color, description)',
  [BrightCalStrings.Error_InvalidRsvpResponse]:
    'response має бути одним із: ACCEPTED, DECLINED, TENTATIVE',
  [BrightCalStrings.Error_InvalidDuplicateMode]:
    'duplicateMode має бути одним із: skip, overwrite, create-new',
  [BrightCalStrings.Error_MissingIcsData]:
    "Обов'язкове поле відсутнє або недійсне: icsData",
  [BrightCalStrings.Error_EmptyUserIds]:
    'userIds має бути непорожнім масивом ідентифікаторів користувачів',
  [BrightCalStrings.Error_InvalidUserId]:
    'Кожен userId має бути непорожнім рядком',
  [BrightCalStrings.Error_InvalidDuration]:
    'durationMinutes має бути додатним числом',
  [BrightCalStrings.Error_NoAttendees]:
    "Необхідно вказати принаймні одного обов'язкового або необов'язкового учасника",
  [BrightCalStrings.Error_EmptyAppointmentTypes]:
    'appointmentTypes має бути непорожнім масивом',
  [BrightCalStrings.Error_MissingSlug]:
    "Обов'язкове поле відсутнє або недійсне: slug",
  [BrightCalStrings.Error_MissingTitle]:
    "Обов'язкове поле відсутнє або недійсне: title",
  [BrightCalStrings.Error_MissingDate]:
    "Обов'язковий параметр запиту відсутній або недійсний: date",
  [BrightCalStrings.Error_MissingAppointmentType]:
    "Обов'язковий параметр запиту відсутній або недійсний: appointmentType",
  [BrightCalStrings.Error_MissingStartTime]:
    "Обов'язкове поле відсутнє або недійсне: startTime",
  [BrightCalStrings.Error_MissingBookerName]:
    "Обов'язкове поле відсутнє або недійсне: bookerName",
  [BrightCalStrings.Error_MissingBookerEmail]:
    "Обов'язкове поле відсутнє або недійсне: bookerEmail",
  [BrightCalStrings.Error_InvalidComment]: 'comment має бути рядком',
  [BrightCalStrings.Error_MissingCounterProposalId]:
    "Обов'язкове поле відсутнє або недійсне: counterProposalId",
  [BrightCalStrings.Error_MissingEventId]:
    "Обов'язкове поле відсутнє або недійсне: eventId",
  [BrightCalStrings.Error_MissingProposedStart]:
    "Обов'язкове поле відсутнє або недійсне: proposedStart",
  [BrightCalStrings.Error_MissingProposedEnd]:
    "Обов'язкове поле відсутнє або недійсне: proposedEnd",
  [BrightCalStrings.Error_MissingCalendarIdParam]:
    "Відсутній обов'язковий параметр: calendarId",
  [BrightCalStrings.Error_DescriptionMustBeString]:
    'description має бути рядком',
  [BrightCalStrings.Error_InvalidStartDate]:
    'start має бути дійсною датою/часом ISO 8601',
  [BrightCalStrings.Error_InvalidEndDate]:
    'end має бути дійсною датою/часом ISO 8601',

  // ── Permission errors ──
  [BrightCalStrings.Error_Forbidden_CalendarUpdate]:
    'Лише власник календаря може його оновлювати',
  [BrightCalStrings.Error_Forbidden_CalendarDelete]:
    'Лише власник календаря може його видалити',
  [BrightCalStrings.Error_Forbidden_EventUpdate]:
    'Недостатньо прав для оновлення цієї події',
  [BrightCalStrings.Error_Forbidden_EventDelete]:
    'Недостатньо прав для видалення цієї події',
  [BrightCalStrings.Error_Forbidden_Export]:
    'Недостатньо прав для експорту цього календаря',
  [BrightCalStrings.Error_Forbidden_Import]:
    'Недостатньо прав для імпорту до цього календаря',

  // ── Service errors ──
  [BrightCalStrings.Error_ServiceUnavailable_Calendar]:
    'Сервіс календаря недоступний',
  [BrightCalStrings.Error_ServiceUnavailable_Event]: 'Сервіс подій недоступний',
  [BrightCalStrings.Error_ServiceUnavailable_Scheduling]:
    'Сервіс планування недоступний',
  [BrightCalStrings.Error_ServiceUnavailable_Invitation]:
    'Сервіс запрошень недоступний',
  [BrightCalStrings.Error_ServiceUnavailable_Booking]:
    'Сервіс бронювання недоступний',
  [BrightCalStrings.Error_ServiceUnavailable_Search]:
    'Сервіс пошуку недоступний',
  [BrightCalStrings.Error_ServiceUnavailable_ExportImport]:
    'Сервіс експорту/імпорту недоступний',

  // ── Not found ──
  [BrightCalStrings.Error_NotFound_BookingPage]:
    'Сторінку бронювання не знайдено',
  [BrightCalStrings.Error_SlotUnavailable]:
    'Запитаний часовий слот більше недоступний',
  [BrightCalStrings.Error_NotFound_AppointmentType]:
    'Сторінку бронювання або тип зустрічі не знайдено',

  // ── Friends ──
  [BrightCalStrings.Friends_SectionTitle]: 'Друзі',

  // ── Calendar Sidebar ──
  [BrightCalStrings.Label_MyCalendars]: 'Мої календарі',
  [BrightCalStrings.Label_OtherCalendars]: 'Інші календарі',
  [BrightCalStrings.Label_CalendarName]: 'Назва календаря',
  [BrightCalStrings.Label_CalendarUrl]: 'URL календаря',
  [BrightCalStrings.Label_NewName]: 'Нова назва',
  [BrightCalStrings.Label_CalendarColor]: 'Колір календаря',
  [BrightCalStrings.Label_CalendarOptions]: 'Параметри календаря',
  [BrightCalStrings.Label_ConfirmDelete]: 'Підтвердити видалення',
  [BrightCalStrings.Label_DismissError]: 'Закрити помилку',
  [BrightCalStrings.Label_AddCalendarForm]: 'Форма додавання календаря',
  [BrightCalStrings.Label_SubscribeToCalendarForm]:
    'Форма підписки на календар',
  [BrightCalStrings.Label_RenameCalendarForm]: 'Форма перейменування календаря',
  [BrightCalStrings.Label_ChangeCalendarColorForm]:
    'Форма зміни кольору календаря',
  [BrightCalStrings.Label_NewCalendarName]: 'Нова назва календаря',
  [BrightCalStrings.Label_CalendarControls]: 'Елементи керування календарем',
  [BrightCalStrings.Label_CalendarApplication]: 'Додаток календаря',
  [BrightCalStrings.Label_CalendarNavigation]: 'Навігація календаря',
  [BrightCalStrings.Label_CalendarContent]: 'Вміст календаря',
  [BrightCalStrings.Label_WeekView]: 'Перегляд тижня',
  [BrightCalStrings.Label_DayViewTemplate]: 'Перегляд дня для {DATE}',
  [BrightCalStrings.Label_AttendeeAvailability]: 'Доступність учасників',
  [BrightCalStrings.Label_Attendee]: 'Учасник',
  [BrightCalStrings.Label_MiniCalendar]: 'Міні-календар',
  [BrightCalStrings.Label_AgendaView]: 'Перегляд порядку денного',
  [BrightCalStrings.Action_AddCalendar]: 'Додати календар',
  [BrightCalStrings.Action_SubscribeToCalendar]: 'Підписатися на календар',
  [BrightCalStrings.Action_BrowseHolidayCalendars]:
    'Переглянути святкові календарі',
  [BrightCalStrings.Action_Subscribe]: 'Підписатися',
  [BrightCalStrings.Action_Rename]: 'Перейменувати',
  [BrightCalStrings.Action_ChangeColor]: 'Змінити колір',
  [BrightCalStrings.Action_Share]: 'Поділитися',
  [BrightCalStrings.Action_Revoke]: 'Відкликати',
  [BrightCalStrings.Action_CopyPublicLink]: 'Копіювати публічне посилання',
  [BrightCalStrings.Action_RevokePublicLink]: 'Відкликати публічне посилання',
  [BrightCalStrings.Sidebar_CannotDeleteDefault]:
    'Неможливо видалити календар за замовчуванням',
  [BrightCalStrings.Sidebar_ConfirmDeleteMessage]:
    'Ви впевнені, що хочете видалити цей календар? Цю дію неможливо скасувати.',
  [BrightCalStrings.Sharing_DialogTitleTemplate]: 'Поділитися "{NAME}"',
  [BrightCalStrings.Sharing_CurrentShares]: 'Поточні спільні доступи',
  [BrightCalStrings.Sharing_NoShares]:
    'Спільних доступів ще немає. Додайте користувача нижче.',
  [BrightCalStrings.Sharing_AddShare]: 'Додати спільний доступ',
  [BrightCalStrings.Sharing_LinkCopied]: 'Посилання скопійовано',
  [BrightCalStrings.Sharing_SelectAndCopy]:
    'Виділіть і скопіюйте посилання вище',
  [BrightCalStrings.Label_CloseSharingDialog]:
    'Закрити діалог спільного доступу',
  [BrightCalStrings.Label_SharedUsers]: 'Користувачі зі спільним доступом',
  [BrightCalStrings.Label_ShareCalendarForm]:
    'Форма спільного доступу до календаря',
  [BrightCalStrings.Label_UserId]: 'ID користувача',
  [BrightCalStrings.Label_PermissionLevel]: 'Рівень дозволу',
  [BrightCalStrings.Label_PublicLink]: 'Публічне посилання',
  [BrightCalStrings.Label_PublicLinkUrl]: 'URL публічного посилання',
  [BrightCalStrings.Permission_Owner]: 'Власник',
  [BrightCalStrings.Permission_Editor]: 'Редактор',
  [BrightCalStrings.Permission_Viewer]: 'Переглядач',
  [BrightCalStrings.Permission_FreeBusyOnly]: 'Лише вільний/зайнятий',
  [BrightCalStrings.Visibility_Public]: 'Публічна',
  [BrightCalStrings.Visibility_Private]: 'Приватна',
  [BrightCalStrings.Visibility_Confidential]: 'Конфіденційна',
  [BrightCalStrings.Weekday_Sun]: 'Нд',
  [BrightCalStrings.Weekday_Mon]: 'Пн',
  [BrightCalStrings.Weekday_Tue]: 'Вт',
  [BrightCalStrings.Weekday_Wed]: 'Ср',
  [BrightCalStrings.Weekday_Thu]: 'Чт',
  [BrightCalStrings.Weekday_Fri]: 'Пт',
  [BrightCalStrings.Weekday_Sat]: 'Сб',
  [BrightCalStrings.Label_HolidayCalendars]: 'Святкові календарі',
  [BrightCalStrings.Label_SearchHolidayCalendars]: 'Пошук святкових календарів',
  [BrightCalStrings.Label_CloseHolidayCatalog]: 'Закрити каталог свят',
  [BrightCalStrings.Holiday_SearchPlaceholder]:
    'Пошук за назвою або регіоном...',
  [BrightCalStrings.Holiday_NoCalendarsFound]:
    'Святкових календарів не знайдено.',
  [BrightCalStrings.Holiday_UnableToLoad]:
    'Не вдалося завантажити святкові календарі',
  [BrightCalStrings.Status_Subscribed]: 'Підписано',
  [BrightCalStrings.Tooltip_AddEvent]: 'Створити подію з цими одержувачами',
};
