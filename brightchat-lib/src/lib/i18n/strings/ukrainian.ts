import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightChatStringKey,
  BrightChatStrings,
} from '../../enumerations/brightChatStrings';

export const BrightChatUkrainianStrings: ComponentStrings<BrightChatStringKey> =
  {
    // Menu
    [BrightChatStrings.MenuLabel]: 'BrightChat',
    [BrightChatStrings.ChatSectionsLabel]: 'Розділи чату',
    [BrightChatStrings.Nav_Conversations]: 'Розмови',
    [BrightChatStrings.Nav_Groups]: 'Групи',
    [BrightChatStrings.Nav_Channels]: 'Канали',
    [BrightChatStrings.Nav_DirectMessages]: 'Прямі повідомлення',

    // Server Rail
    [BrightChatStrings.Server_Rail]: 'Сервери',
    [BrightChatStrings.Server_Rail_Home]: 'Головна',
    [BrightChatStrings.Server_Rail_CreateServer]: 'Створити сервер',

    // Create Server Dialog
    [BrightChatStrings.Create_Server]: 'Створити сервер',
    [BrightChatStrings.Create_Server_Title]: 'Створити сервер',
    [BrightChatStrings.Create_Server_NameLabel]: 'Назва сервера',
    [BrightChatStrings.Create_Server_NamePlaceholder]: 'Введіть назву сервера',
    [BrightChatStrings.Create_Server_IconLabel]: 'Іконка сервера',
    [BrightChatStrings.Create_Server_Submit]: 'Створити',
    [BrightChatStrings.Create_Server_Cancel]: 'Скасувати',

    // Channel Sidebar
    [BrightChatStrings.Channel_Sidebar]: 'Канали',
    [BrightChatStrings.Channel_Sidebar_CreateChannel]: 'Створити канал',

    // Create Channel Dialog
    [BrightChatStrings.Create_Channel]: 'Створити канал',
    [BrightChatStrings.Create_Channel_Title]: 'Створити канал',
    [BrightChatStrings.Create_Channel_NameLabel]: 'Назва каналу',
    [BrightChatStrings.Create_Channel_TopicLabel]: 'Тема',
    [BrightChatStrings.Create_Channel_CategoryLabel]: 'Категорія',
    [BrightChatStrings.Create_Channel_Submit]: 'Створити',
    [BrightChatStrings.Create_Channel_Cancel]: 'Скасувати',

    // Create DM Dialog
    [BrightChatStrings.Create_DM]: 'Нове повідомлення',
    [BrightChatStrings.Create_DM_Title]: 'Нове пряме повідомлення',
    [BrightChatStrings.Create_DM_SearchPlaceholder]: 'Пошук користувача',
    [BrightChatStrings.Create_DM_Submit]: 'Надіслати',
    [BrightChatStrings.Create_DM_Cancel]: 'Скасувати',
    [BrightChatStrings.Create_DM_NewMessage]: 'Нове повідомлення',

    // Server Settings Panel
    [BrightChatStrings.Server_Settings]: 'Налаштування сервера',
    [BrightChatStrings.Server_Settings_Title]: 'Налаштування сервера',
    [BrightChatStrings.Server_Settings_Overview]: 'Огляд',
    [BrightChatStrings.Server_Settings_Members]: 'Учасники',
    [BrightChatStrings.Server_Settings_Categories]: 'Категорії',
    [BrightChatStrings.Server_Settings_Invites]: 'Запрошення',
    [BrightChatStrings.Server_Settings_Save]: 'Зберегти зміни',

    // Channel Context Menu
    [BrightChatStrings.Channel_Edit]: 'Редагувати канал',
    [BrightChatStrings.Channel_Delete]: 'Видалити канал',
    [BrightChatStrings.Channel_Mute]: 'Вимкнути звук каналу',

    // Edit Channel Dialog
    [BrightChatStrings.Edit_Channel_Title]: 'Редагувати канал',
    [BrightChatStrings.Edit_Channel_NameLabel]: 'Назва каналу',
    [BrightChatStrings.Edit_Channel_TopicLabel]: 'Тема',
    [BrightChatStrings.Edit_Channel_Save]: 'Зберегти',
    [BrightChatStrings.Edit_Channel_Cancel]: 'Скасувати',
    [BrightChatStrings.Edit_Channel_Saving]: 'Збереження…',
    [BrightChatStrings.Edit_Channel_Failed]: 'Не вдалося оновити канал',
    [BrightChatStrings.Edit_Channel_NameRequired]: "Назва каналу обов'язкова",
    [BrightChatStrings.Edit_Channel_NameLength]:
      'Назва каналу повинна містити від 2 до 100 символів',

    // Delete Channel Confirmation
    [BrightChatStrings.Delete_Channel_Title]: 'Видалити канал',
    [BrightChatStrings.Delete_Channel_Confirm]: 'Видалити',
    [BrightChatStrings.Delete_Channel_Cancel]: 'Скасувати',
    [BrightChatStrings.Delete_Channel_Deleting]: 'Видалення…',
    [BrightChatStrings.Delete_Channel_Failed]: 'Не вдалося видалити канал',

    // Presence Status Labels
    [BrightChatStrings.Presence_Online]: 'Онлайн',
    [BrightChatStrings.Presence_Idle]: 'Неактивний',
    [BrightChatStrings.Presence_DoNotDisturb]: 'Не турбувати',
    [BrightChatStrings.Presence_Offline]: 'Офлайн',
    [BrightChatStrings.Presence_SetStatus]: 'Встановити статус',

    // Breadcrumb Navigation
    [BrightChatStrings.Breadcrumb_BrightChat]: 'BrightChat',
    [BrightChatStrings.Breadcrumb_Conversation]: 'Розмова',
    [BrightChatStrings.Breadcrumb_Group]: 'Група',
    [BrightChatStrings.Breadcrumb_Channel]: 'Канал',

    // Channel Permissions (Discord-style)
    [BrightChatStrings.Channel_Permissions]: 'Дозволи',
    [BrightChatStrings.Channel_Permissions_Title]: 'Дозволи каналу',
    [BrightChatStrings.Channel_Permissions_Role]: 'Роль',
    [BrightChatStrings.Channel_Permissions_SendMessages]:
      'Надсилати повідомлення',
    [BrightChatStrings.Channel_Permissions_ManageChannel]: 'Керувати каналом',
    [BrightChatStrings.Channel_Permissions_ManageMembers]:
      'Керувати учасниками',
    [BrightChatStrings.Channel_Permissions_CreateInvites]:
      'Створювати запрошення',
    [BrightChatStrings.Channel_Permissions_PinMessages]:
      'Закріплювати повідомлення',
    [BrightChatStrings.Channel_Permissions_MuteMembers]:
      'Вимикати звук учасників',
    [BrightChatStrings.Channel_Permissions_KickMembers]: 'Видаляти учасників',
    [BrightChatStrings.Channel_Permissions_DeleteMessages]:
      'Видаляти повідомлення',

    // Channel Visibility
    [BrightChatStrings.Channel_Visibility_Public]: 'Публічний',
    [BrightChatStrings.Channel_Visibility_Private]: 'Приватний',
    [BrightChatStrings.Channel_Visibility_Secret]: 'Секретний',
    [BrightChatStrings.Channel_Visibility_Public_Desc]:
      'Будь-хто може бачити та приєднатися',
    [BrightChatStrings.Channel_Visibility_Private_Desc]: 'Лише за запрошенням',
    [BrightChatStrings.Channel_Visibility_Secret_Desc]:
      'Прихований від не-учасників',
    [BrightChatStrings.Compose_Placeholder]:
      'Введіть зашифроване повідомлення...',
    [BrightChatStrings.Compose_SendLabel]: 'Надіслати повідомлення',
    [BrightChatStrings.Compose_MessageNotDelivered]:
      'Повідомлення не вдалося доставити',
    [BrightChatStrings.Compose_SendFailed]: 'Не вдалося надіслати повідомлення',
    [BrightChatStrings.ConversationList_Title]: 'Розмови',
    [BrightChatStrings.ConversationList_NewMessage]: 'Нове повідомлення',
    [BrightChatStrings.ConversationList_Empty]: 'Ще немає прямих повідомлень.',
    [BrightChatStrings.ConversationList_RecentChannels]: 'Останні канали',
    [BrightChatStrings.MessageThread_Empty]:
      'Ще немає повідомлень. Почніть розмову!',
    [BrightChatStrings.Create_Channel_NamePlaceholder]: 'напр. загальний',
    [BrightChatStrings.Create_Channel_TopicPlaceholder]: 'Про що цей канал?',
    [BrightChatStrings.Create_Channel_VisibilityLabel]: 'Видимість',
    [BrightChatStrings.Create_Channel_NameRequired]: "Назва каналу обов'язкова",
    [BrightChatStrings.Create_Channel_NameLength]:
      'Назва каналу повинна містити від 2 до 100 символів',
    [BrightChatStrings.Create_Channel_Creating]: 'Створення...',
    [BrightChatStrings.Create_Channel_Failed]: 'Не вдалося створити канал',
    [BrightChatStrings.Create_Channel_CategoryNone]: 'Немає',
    [BrightChatStrings.Server_Settings_ServerNameLabel]: 'Назва сервера',
    [BrightChatStrings.Server_Settings_IconUrlLabel]: 'URL іконки',
    [BrightChatStrings.Server_Settings_Saving]: 'Збереження…',
    [BrightChatStrings.Server_Settings_GenerateInvite]: 'Створити запрошення',
    [BrightChatStrings.Server_Settings_CopyToken]: 'Копіювати токен',
    [BrightChatStrings.Server_Settings_Uses]: 'Використання',
    [BrightChatStrings.Server_Settings_NewCategory]: 'Нова категорія',
    [BrightChatStrings.Server_Settings_AddCategory]: 'Додати',
    [BrightChatStrings.Server_Settings_ChannelCount]: 'каналів',
    [BrightChatStrings.Server_Settings_RemoveMember]: 'Видалити учасника',
    [BrightChatStrings.Server_Settings_DeleteCategory]: 'Видалити категорію',
    [BrightChatStrings.Server_Settings_DeleteServer]: 'Видалити сервер',
    [BrightChatStrings.Server_Settings_DeleteServerConfirm]: 'Ви впевнені, що хочете видалити цей сервер? Усі канали та повідомлення будуть втрачені назавжди.',
    [BrightChatStrings.Server_Settings_DeleteServerConfirmTitle]: 'Видалити сервер',
    [BrightChatStrings.DMSidebar_NoConversations]: 'Ще немає розмов',
    [BrightChatStrings.DMSidebar_NoGroups]: 'Ще немає групових чатів',

    // Encryption
    [BrightChatStrings.Encryption_E2E]: 'Наскрізне шифрування',
    [BrightChatStrings.Encryption_E2E_AriaLabel]:
      'Ця розмова захищена наскрізним шифруванням',
    [BrightChatStrings.Encryption_EncryptedServer]: 'Зашифрований сервер',
    [BrightChatStrings.Encryption_ServerEncrypted]: 'Зашифровано',

    // Key Rotation
    [BrightChatStrings.KeyRotation_MemberJoined]:
      'Ключ шифрування оновлено — учасник приєднався',
    [BrightChatStrings.KeyRotation_MemberLeft]:
      'Ключ шифрування оновлено — учасник вийшов',
    [BrightChatStrings.KeyRotation_MemberRemoved]:
      'Ключ шифрування оновлено — учасника було видалено',

    // Channel List View
    [BrightChatStrings.ChannelList_Title]: 'Канали',
    [BrightChatStrings.ChannelList_Empty]: 'Ще немає каналів.',
    [BrightChatStrings.ChannelList_Join]: 'Приєднатися',
    [BrightChatStrings.ChannelList_Joining]: 'Приєднання…',
    [BrightChatStrings.ChannelList_MemberCount]: 'учасник',

    // Group List View
    [BrightChatStrings.GroupList_Title]: 'Групи',
    [BrightChatStrings.GroupList_Empty]: 'Ще немає груп.',
    [BrightChatStrings.GroupList_MemberCount]: 'учасник',

    // Create Server Dialog extras
    [BrightChatStrings.Create_Server_IconLabelOptional]:
      "URL іконки (необов'язково)",
    [BrightChatStrings.Create_Server_Creating]: 'Створення…',
    [BrightChatStrings.Create_Server_NameRequired]: "Назва сервера обов'язкова",
    [BrightChatStrings.Create_Server_NameTooLong]:
      'Назва сервера повинна містити не більше 100 символів',
    [BrightChatStrings.Create_Server_Failed]: 'Не вдалося створити сервер',

    // Create DM Dialog extras
    [BrightChatStrings.Create_DM_SearchLabel]: 'Пошук користувачів',
    [BrightChatStrings.Create_DM_SearchHint]: "Введіть ім'я…",
    [BrightChatStrings.Create_DM_NoUsersFound]: 'Користувачів не знайдено',
    [BrightChatStrings.Create_DM_SelectUser]: 'Будь ласка, оберіть користувача',
    [BrightChatStrings.Create_DM_Starting]: 'Запуск…',
    [BrightChatStrings.Create_DM_StartConversation]: 'Почати розмову',
    [BrightChatStrings.Create_DM_Failed]: 'Не вдалося почати розмову',

    // Channel Permissions Panel
    [BrightChatStrings.Permissions_SelectChannel]:
      'Оберіть канал для перегляду дозволів.',
    [BrightChatStrings.Permissions_PermissionsFor]: 'Дозволи для',
    [BrightChatStrings.Permissions_MembersWith]: 'Учасники з',
    [BrightChatStrings.Permissions_NoMembers]: 'Немає учасників з цією роллю',
    [BrightChatStrings.Permissions_Joined]: 'Приєднався',
    [BrightChatStrings.Permissions_DeleteOwnMessages]:
      'Видалити власні повідомлення',
    [BrightChatStrings.Permissions_DeleteAnyMessage]:
      'Видалити будь-яке повідомлення',
    [BrightChatStrings.Permissions_ManageRoles]: 'Керувати ролями',

    // Roles
    [BrightChatStrings.Role_Owner]: 'Власник',
    [BrightChatStrings.Role_Admin]: 'Адміністратор',
    [BrightChatStrings.Role_Moderator]: 'Модератор',
    [BrightChatStrings.Role_Member]: 'Учасник',

    // Channel Sidebar extras
    [BrightChatStrings.Channel_Sidebar_Uncategorized]: 'Без категорії',

    // Message Thread extras
    [BrightChatStrings.MessageThread_Pinned]: 'Закріплене повідомлення',
    [BrightChatStrings.MessageThread_Edited]: '(відредаговано)',
    [BrightChatStrings.MessageThread_TypingSingle]: 'друкує…',
    [BrightChatStrings.MessageThread_TypingMultiple]: 'друкують…',

    // Layout
    [BrightChatStrings.Layout_BreadcrumbLabel]: 'Навігація BrightChat',
    [BrightChatStrings.Layout_UserProfile]: 'Профіль користувача',
    [BrightChatStrings.Layout_OpenNavigation]: 'Відкрити навігацію',

    // Friends Suggestion Section
    [BrightChatStrings.Friends_SectionTitle]: 'Друзі',

    // Server Icon Upload
    [BrightChatStrings.Server_Icon_Upload]: 'Завантажити іконку',
    [BrightChatStrings.Server_Icon_Change]: 'Змінити іконку',
    [BrightChatStrings.Server_Icon_Remove]: 'Видалити іконку',
    [BrightChatStrings.Server_Icon_RemoveConfirm]:
      'Ви впевнені, що хочете видалити іконку сервера?',
    [BrightChatStrings.Server_Icon_RemoveConfirmTitle]:
      'Видалити іконку сервера',
    [BrightChatStrings.Server_Icon_Uploading]: 'Завантаження…',
    [BrightChatStrings.Server_Icon_UploadFailed]:
      'Не вдалося завантажити іконку',
    [BrightChatStrings.Server_Icon_UploadSuccess]: 'Іконку успішно завантажено',
    [BrightChatStrings.Server_Icon_FileTooLarge]:
      'Файл занадто великий. Максимальний розмір — 5 МБ.',
    [BrightChatStrings.Server_Icon_InvalidType]:
      'Недійсний тип файлу. Дозволені типи: PNG, JPEG, GIF, WebP.',
    [BrightChatStrings.Server_Icon_CropTitle]: 'Обрізати іконку сервера',
    [BrightChatStrings.Server_Icon_CropConfirm]: 'Застосувати',
    [BrightChatStrings.Server_Icon_CropCancel]: 'Скасувати',
    [BrightChatStrings.Server_Icon_ZoomLabel]: 'Масштаб',
    [BrightChatStrings.Server_Icon_PreviewAlt]:
      'Попередній перегляд іконки сервера',
    [BrightChatStrings.Server_Icon_UploadLabel]: 'Завантажити іконку сервера',
    [BrightChatStrings.Server_Icon_DropOrBrowse]:
      'Перетягніть зображення або натисніть для вибору',
    [BrightChatStrings.Server_Icon_StagingFailed]:
      'Не вдалося підготувати файл для завантаження',
    [BrightChatStrings.Server_Icon_StagingExpired]:
      'Підготовлений файл закінчився. Будь ласка, виберіть зображення знову.',

    // FontAwesome Icon Picker
    [BrightChatStrings.IconPicker_Title]: 'Обрати іконку',
    [BrightChatStrings.IconPicker_SearchPlaceholder]: 'Пошук іконок...',
    [BrightChatStrings.IconPicker_NoMatchTemplate]:
      'Жодна іконка не відповідає «{0}»',
    [BrightChatStrings.IconPicker_Cancel]: 'Скасувати',
    [BrightChatStrings.IconPicker_RemoveIcon]: 'Видалити іконку',
    [BrightChatStrings.IconPicker_CurrentLabel]: 'Поточна:',
  };
