import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import {
  BrightHubStringKey,
  BrightHubStrings,
} from '../../enumerations/brightHubStrings';

export const BrightHubUkrainianStrings: ComponentStrings<BrightHubStringKey> = {
  // PostCard
  [BrightHubStrings.PostCard_Reposted]: 'Поширено',
  [BrightHubStrings.PostCard_Edited]: 'Відредаговано',
  [BrightHubStrings.PostCard_HubRestricted]: 'Видимий лише для учасників хабу',
  [BrightHubStrings.PostCard_Deleted]: 'Цей допис було видалено.',
  [BrightHubStrings.PostCard_ReplyAriaTemplate]:
    'Відповісти, {COUNT} відповідей',
  [BrightHubStrings.PostCard_RepostAriaTemplate]: 'Поширити, {COUNT} поширень',
  [BrightHubStrings.PostCard_LikeAriaTemplate]: 'Вподобати, {COUNT} вподобань',
  [BrightHubStrings.PostCard_UnlikeAriaTemplate]:
    'Прибрати вподобання, {COUNT} вподобань',
  [BrightHubStrings.PostCard_PostByAriaTemplate]: 'Допис від {NAME}',

  // PostComposer
  [BrightHubStrings.PostComposer_Placeholder]: 'Що нового?',
  [BrightHubStrings.PostComposer_ReplyPlaceholder]:
    'Опублікуйте вашу відповідь',
  [BrightHubStrings.PostComposer_ReplyingTo]: 'Відповідь для',
  [BrightHubStrings.PostComposer_CancelReply]: 'Скасувати відповідь',
  [BrightHubStrings.PostComposer_Bold]: 'Жирний',
  [BrightHubStrings.PostComposer_Italic]: 'Курсив',
  [BrightHubStrings.PostComposer_Code]: 'Код',
  [BrightHubStrings.PostComposer_Emoji]: 'Вставити емодзі',
  [BrightHubStrings.PostComposer_AttachImage]: 'Прикріпити зображення',
  [BrightHubStrings.PostComposer_RemoveAttachmentTemplate]:
    'Видалити вкладення {INDEX}',
  [BrightHubStrings.PostComposer_AttachmentAltTemplate]: 'Вкладення {INDEX}',
  [BrightHubStrings.PostComposer_VisibleTo]: 'Видимий для',
  [BrightHubStrings.PostComposer_VisibilityPublic]: 'Публічний',
  [BrightHubStrings.PostComposer_VisibilityFollowersOnly]: 'Тільки підписники',
  [BrightHubStrings.PostComposer_VisibilityFriendsOnly]: 'Тільки друзі',
  [BrightHubStrings.PostComposer_VisibilityHubOnly]: 'Тільки учасники хабу',
  [BrightHubStrings.PostComposer_MembersTemplate]: '{COUNT} учасників',
  [BrightHubStrings.PostComposer_SubmitPost]: 'Надіслати допис',
  [BrightHubStrings.PostComposer_Post]: 'Опублікувати',
  [BrightHubStrings.PostComposer_Reply]: 'Відповісти',
  [BrightHubStrings.PostComposer_Preview]: 'Попередній перегляд',
  [BrightHubStrings.PostComposer_PreviewAriaLabel]:
    'Попередній перегляд вмісту допису',
  [BrightHubStrings.PostComposer_MarkupHelp]: 'Довідка з форматування',
  [BrightHubStrings.PostComposer_MarkupHelpAriaLabel]:
    'Довідка з форматування та розмітки дописів',
  [BrightHubStrings.PostComposer_MarkupHelpClose]: 'Закрити',
  [BrightHubStrings.PostComposer_MarkupHelpTabPost]: 'Форматування дописів',
  [BrightHubStrings.PostComposer_MarkupHelpTabIcons]: 'Розмітка іконок',
  [BrightHubStrings.PostComposer_ImageLimitReached]:
    'Максимум 20 зображень на допис',
  [BrightHubStrings.PostComposer_ImageUploadFailed]:
    'Не вдалося завантажити зображення',
  [BrightHubStrings.PostComposer_Uploading]: 'Завантаження...',
  [BrightHubStrings.PostComposer_InsertImage]: 'Вставити зображення',
  [BrightHubStrings.PostComposer_RemoveAttachment]: 'Видалити вкладення',
  [BrightHubStrings.PostComposer_AttachmentLimitReached]:
    'Максимум 4 вкладення на допис',
  [BrightHubStrings.PostComposer_EditAltText]:
    'Редагувати альтернативний текст',
  [BrightHubStrings.PostComposer_AltText]: 'Альтернативний текст',
  [BrightHubStrings.PostComposer_Save]: 'Зберегти',
  [BrightHubStrings.PostComposer_Cancel]: 'Скасувати',
  [BrightHubStrings.PostComposer_InsertIcon]: 'Вставити іконку',
  [BrightHubStrings.PostComposer_IconSearchPlaceholder]: 'Пошук іконок...',
  [BrightHubStrings.PostComposer_IconNoMatchTemplate]:
    'Жодна іконка не відповідає «{0}»',
  [BrightHubStrings.PostComposer_IconStyleOptions]: 'Параметри стилю',
  [BrightHubStrings.PostComposer_IconColor]: 'Колір',
  [BrightHubStrings.PostComposer_IconColorNone]: 'Немає',
  [BrightHubStrings.PostComposer_IconAnimation]: 'Анімація',
  [BrightHubStrings.PostComposer_IconAnimationNone]: 'Немає',
  [BrightHubStrings.PostComposer_IconRotation]: 'Обертання',
  [BrightHubStrings.PostComposer_IconRotationNone]: 'Немає',
  [BrightHubStrings.PostComposer_IconSize]: 'Розмір',
  [BrightHubStrings.PostComposer_IconSizeDefault]: 'За замовчуванням',
  [BrightHubStrings.PostComposer_IconPreview]: 'Попередній перегляд',

  // ImageCropDialog
  [BrightHubStrings.ImageCropDialog_Title]: 'Обрізати зображення',
  [BrightHubStrings.ImageCropDialog_Crop]: 'Обрізати',
  [BrightHubStrings.ImageCropDialog_Skip]: 'Використати оригінал',
  [BrightHubStrings.ImageCropDialog_Cancel]: 'Скасувати',
  [BrightHubStrings.ImageCropDialog_ZoomLabel]: 'Масштаб',
  [BrightHubStrings.ImageCropDialog_PreviewAlt]: 'Попередній перегляд обрізки',

  // Timeline
  [BrightHubStrings.Timeline_AriaLabel]: 'Стрічка',
  [BrightHubStrings.Timeline_FilteredByTemplate]: 'Фільтр: {LABEL}',
  [BrightHubStrings.Timeline_ClearFilter]: 'Очистити',
  [BrightHubStrings.Timeline_EmptyDefault]:
    'Ще немає дописів. Підпишіться на когось, щоб бачити їхні дописи тут.',
  [BrightHubStrings.Timeline_LoadingPosts]: 'Завантаження дописів',
  [BrightHubStrings.Timeline_AllCaughtUp]: 'Ви все переглянули',

  // ThreadView
  [BrightHubStrings.ThreadView_AriaLabel]: 'Гілка обговорення',
  [BrightHubStrings.ThreadView_ParentDeleted]:
    'Батьківський допис було видалено',
  [BrightHubStrings.ThreadView_ReplyCountSingular]: '1 відповідь',
  [BrightHubStrings.ThreadView_ReplyCountPluralTemplate]: '{COUNT} відповідей',
  [BrightHubStrings.ThreadView_ParticipantCountSingular]: '1 учасник',
  [BrightHubStrings.ThreadView_ParticipantCountPluralTemplate]:
    '{COUNT} учасників',
  [BrightHubStrings.ThreadView_NoReplies]:
    'Ще немає відповідей. Будьте першим!',

  // FollowButton
  [BrightHubStrings.FollowButton_Follow]: 'Підписатися',
  [BrightHubStrings.FollowButton_Following]: 'Підписаний',
  [BrightHubStrings.FollowButton_Unfollow]: 'Відписатися',

  // LikeButton
  [BrightHubStrings.LikeButton_LikeAriaTemplate]:
    'Вподобати, {COUNT} вподобань',
  [BrightHubStrings.LikeButton_UnlikeAriaTemplate]:
    'Прибрати вподобання, {COUNT} вподобань',

  // RepostButton
  [BrightHubStrings.RepostButton_RepostAriaTemplate]:
    'Поширити, {COUNT} поширень',
  [BrightHubStrings.RepostButton_UndoRepostAriaTemplate]:
    'Скасувати поширення, {COUNT} поширень',

  // UserProfileCard
  [BrightHubStrings.UserProfileCard_Verified]: 'Підтверджений',
  [BrightHubStrings.UserProfileCard_ProtectedAccount]:
    'Захищений обліковий запис',
  [BrightHubStrings.UserProfileCard_ProfileOfTemplate]: 'Профіль {NAME}',
  [BrightHubStrings.UserProfileCard_Following]: 'Підписки',
  [BrightHubStrings.UserProfileCard_Followers]: 'Підписники',
  [BrightHubStrings.UserProfileCard_Friends]: 'Друзі',
  [BrightHubStrings.UserProfileCard_FriendsTab]: 'Друзі',
  [BrightHubStrings.UserProfileCard_FriendsHidden]:
    'Цей користувач приховав свій список друзів',
  [BrightHubStrings.UserProfileCard_StrongConnection]: "Сильний зв'язок",
  [BrightHubStrings.UserProfileCard_ModerateConnection]: "Помірний зв'язок",
  [BrightHubStrings.UserProfileCard_WeakConnection]: "Слабкий зв'язок",
  [BrightHubStrings.UserProfileCard_DormantConnection]: "Неактивний зв'язок",
  [BrightHubStrings.UserProfileCard_MutualConnectionSingular]:
    '1 спільний контакт',
  [BrightHubStrings.UserProfileCard_MutualConnectionPluralTemplate]:
    '{COUNT} спільних контактів',

  // ConnectionListManager
  [BrightHubStrings.ConnectionListManager_Title]: 'Списки контактів',
  [BrightHubStrings.ConnectionListManager_CreateList]: 'Створити список',
  [BrightHubStrings.ConnectionListManager_EditList]: 'Редагувати список',
  [BrightHubStrings.ConnectionListManager_DeleteList]: 'Видалити список',
  [BrightHubStrings.ConnectionListManager_DeleteConfirmTemplate]:
    'Ви впевнені, що хочете видалити «{NAME}»? Усіх учасників буде вилучено.',
  [BrightHubStrings.ConnectionListManager_DeleteConfirmAction]: 'Видалити',
  [BrightHubStrings.ConnectionListManager_Cancel]: 'Скасувати',
  [BrightHubStrings.ConnectionListManager_Save]: 'Зберегти',
  [BrightHubStrings.ConnectionListManager_ListName]: 'Назва списку',
  [BrightHubStrings.ConnectionListManager_ListDescription]: 'Опис',
  [BrightHubStrings.ConnectionListManager_Visibility]: 'Видимість',
  [BrightHubStrings.ConnectionListManager_VisibilityPrivate]: 'Приватний',
  [BrightHubStrings.ConnectionListManager_VisibilityFollowersOnly]:
    'Лише для підписників',
  [BrightHubStrings.ConnectionListManager_VisibilityPublic]: 'Публічний',
  [BrightHubStrings.ConnectionListManager_MembersTemplate]: '{COUNT} учасників',
  [BrightHubStrings.ConnectionListManager_FollowersTemplate]:
    '{COUNT} підписників',
  [BrightHubStrings.ConnectionListManager_EmptyState]:
    'Ще немає списків контактів',
  [BrightHubStrings.ConnectionListManager_EmptyStateHint]:
    'Створіть список, щоб упорядкувати свої контакти.',
  [BrightHubStrings.ConnectionListManager_AddMembers]: 'Додати учасників',
  [BrightHubStrings.ConnectionListManager_RemoveMembers]: 'Вилучити учасників',
  [BrightHubStrings.ConnectionListManager_AddMembersTitle]:
    'Додати учасників до списку',
  [BrightHubStrings.ConnectionListManager_RemoveMembersTitle]:
    'Вилучити учасників зі списку',
  [BrightHubStrings.ConnectionListManager_UserIdsPlaceholder]:
    'Введіть ідентифікатори користувачів, по одному на рядок',
  [BrightHubStrings.ConnectionListManager_Loading]: 'Завантаження списків…',
  [BrightHubStrings.ConnectionListManager_AriaLabel]:
    'Менеджер списків контактів',

  // ConnectionListCard
  [BrightHubStrings.ConnectionListCard_AriaLabel]: 'Список контактів: {NAME}',
  [BrightHubStrings.ConnectionListCard_MembersTemplate]: '{COUNT} учасників',
  [BrightHubStrings.ConnectionListCard_FollowersTemplate]:
    '{COUNT} підписників',
  [BrightHubStrings.ConnectionListCard_VisibilityPrivate]: 'Приватний',
  [BrightHubStrings.ConnectionListCard_VisibilityFollowersOnly]:
    'Лише для підписників',
  [BrightHubStrings.ConnectionListCard_VisibilityPublic]: 'Публічний',
  [BrightHubStrings.ConnectionListCard_CreatedAtTemplate]: 'Створено {DATE}',

  // ConnectionCategorySelector
  [BrightHubStrings.ConnectionCategorySelector_Title]: 'Категорії',
  [BrightHubStrings.ConnectionCategorySelector_AriaLabel]:
    'Вибір категорії контактів',
  [BrightHubStrings.ConnectionCategorySelector_DefaultIndicator]:
    'За замовчуванням',
  [BrightHubStrings.ConnectionCategorySelector_NoneAvailable]:
    'Немає доступних категорій',

  // ConnectionNoteEditor
  [BrightHubStrings.ConnectionNoteEditor_Title]: 'Нотатка',
  [BrightHubStrings.ConnectionNoteEditor_AriaLabel]: 'Нотатка про контакт',
  [BrightHubStrings.ConnectionNoteEditor_Placeholder]:
    'Додайте приватну нотатку про цей контакт…',
  [BrightHubStrings.ConnectionNoteEditor_EmptyState]:
    'Ще немає нотатки. Додайте приватну нотатку, щоб запам\u0027ятати контекст цього контакту.',
  [BrightHubStrings.ConnectionNoteEditor_Save]: 'Зберегти',
  [BrightHubStrings.ConnectionNoteEditor_Delete]: 'Видалити',
  [BrightHubStrings.ConnectionNoteEditor_Cancel]: 'Скасувати',
  [BrightHubStrings.ConnectionNoteEditor_DeleteConfirmTitle]:
    'Видалити нотатку?',
  [BrightHubStrings.ConnectionNoteEditor_DeleteConfirmMessage]:
    'Ви впевнені, що хочете видалити цю нотатку? Цю дію неможливо скасувати.',
  [BrightHubStrings.ConnectionNoteEditor_DeleteConfirmAction]: 'Видалити',

  // ConnectionSuggestions
  [BrightHubStrings.ConnectionSuggestions_Title]: 'Рекомендовані контакти',
  [BrightHubStrings.ConnectionSuggestions_AriaLabel]: 'Рекомендації контактів',
  [BrightHubStrings.ConnectionSuggestions_EmptyState]:
    'Наразі немає рекомендацій. Перевірте пізніше!',
  [BrightHubStrings.ConnectionSuggestions_Loading]:
    'Завантаження рекомендацій…',
  [BrightHubStrings.ConnectionSuggestions_Follow]: 'Підписатися',
  [BrightHubStrings.ConnectionSuggestions_Dismiss]: 'Приховати',
  [BrightHubStrings.ConnectionSuggestions_MutualCountSingular]:
    '1 спільний контакт',
  [BrightHubStrings.ConnectionSuggestions_MutualCountPluralTemplate]:
    '{COUNT} спільних контактів',
  [BrightHubStrings.ConnectionSuggestions_ReasonMutualConnections]:
    'На основі спільних контактів',
  [BrightHubStrings.ConnectionSuggestions_ReasonSimilarInterests]:
    'На основі схожих інтересів',
  [BrightHubStrings.ConnectionSuggestions_ReasonSimilarToUser]:
    'Схожі на людей, на яких ви підписані',
  [BrightHubStrings.ConnectionSuggestions_ReasonMutualFriends]: 'Спільні друзі',

  // MutualConnections
  [BrightHubStrings.MutualConnections_Title]: 'Спільні контакти',
  [BrightHubStrings.MutualConnections_AriaLabel]: 'Спільні контакти',
  [BrightHubStrings.MutualConnections_Loading]:
    'Завантаження спільних контактів…',
  [BrightHubStrings.MutualConnections_EmptyState]: 'Немає спільних контактів',
  [BrightHubStrings.MutualConnections_CountSingular]: '1 спільний контакт',
  [BrightHubStrings.MutualConnections_CountPluralTemplate]:
    '{COUNT} спільних контактів',
  [BrightHubStrings.MutualConnections_LoadMore]: 'Завантажити ще',

  // ConnectionStrengthIndicator
  [BrightHubStrings.ConnectionStrengthIndicator_Title]: "Міцність зв'язку",
  [BrightHubStrings.ConnectionStrengthIndicator_AriaLabel]:
    "Індикатор міцності зв'язку",
  [BrightHubStrings.ConnectionStrengthIndicator_Strong]: 'Сильний',
  [BrightHubStrings.ConnectionStrengthIndicator_Moderate]: 'Помірний',
  [BrightHubStrings.ConnectionStrengthIndicator_Weak]: 'Слабкий',
  [BrightHubStrings.ConnectionStrengthIndicator_Dormant]: 'Неактивний',

  // HubManager
  [BrightHubStrings.HubManager_Title]: 'Хаби',
  [BrightHubStrings.HubManager_AriaLabel]: 'Менеджер хабів',
  [BrightHubStrings.HubManager_CreateHub]: 'Створити хаб',
  [BrightHubStrings.HubManager_EditHub]: 'Редагувати хаб',
  [BrightHubStrings.HubManager_DeleteHub]: 'Видалити хаб',
  [BrightHubStrings.HubManager_HubName]: 'Назва хабу',
  [BrightHubStrings.HubManager_HubDescription]: 'Опис',
  [BrightHubStrings.HubManager_MembersTemplate]: '{COUNT} учасників',
  [BrightHubStrings.HubManager_EmptyState]: 'Ще немає хабів.',
  [BrightHubStrings.HubManager_EmptyStateHint]:
    'Створіть хаб, щоб ділитися вмістом з обраною групою контактів.',
  [BrightHubStrings.HubManager_Save]: 'Зберегти',
  [BrightHubStrings.HubManager_Cancel]: 'Скасувати',
  [BrightHubStrings.HubManager_DeleteConfirmTemplate]:
    'Ви впевнені, що хочете видалити «{NAME}»? Усіх учасників буде вилучено.',
  [BrightHubStrings.HubManager_DeleteConfirmAction]: 'Видалити',
  [BrightHubStrings.HubManager_AddMembers]: 'Додати учасників',
  [BrightHubStrings.HubManager_AddMembersTitle]: 'Додати учасників до хабу',
  [BrightHubStrings.HubManager_RemoveMembers]: 'Вилучити учасників',
  [BrightHubStrings.HubManager_RemoveMembersTitle]: 'Вилучити учасників з хабу',
  [BrightHubStrings.HubManager_UserIdsPlaceholder]:
    'Введіть ідентифікатори користувачів, по одному на рядок',
  [BrightHubStrings.HubManager_Loading]: 'Завантаження хабів…',
  [BrightHubStrings.HubManager_DefaultBadge]: 'За замовчуванням',

  // HubSelector
  [BrightHubStrings.HubSelector_Title]: 'Видимість допису',
  [BrightHubStrings.HubSelector_AriaLabel]: 'Вибір хабу для видимості допису',
  [BrightHubStrings.HubSelector_MembersTemplate]: '{COUNT} учасників',
  [BrightHubStrings.HubSelector_NoneAvailable]: 'Немає доступних хабів.',
  [BrightHubStrings.HubSelector_NoneSelected]: 'Видимий для всіх підписників',
  [BrightHubStrings.HubSelector_SelectedCountTemplate]: '{COUNT} хабів обрано',
  [BrightHubStrings.HubSelector_DefaultBadge]: 'За замовчуванням',

  // FollowRequestList
  [BrightHubStrings.FollowRequestList_Title]: 'Запити на підписку',
  [BrightHubStrings.FollowRequestList_AriaLabel]:
    'Очікувані запити на підписку',
  [BrightHubStrings.FollowRequestList_Loading]:
    'Завантаження запитів на підписку…',
  [BrightHubStrings.FollowRequestList_EmptyState]:
    'Немає очікуваних запитів на підписку',
  [BrightHubStrings.FollowRequestList_Approve]: 'Схвалити',
  [BrightHubStrings.FollowRequestList_Reject]: 'Відхилити',
  [BrightHubStrings.FollowRequestList_PendingCountTemplate]:
    '{COUNT} очікуваних запитів',
  [BrightHubStrings.FollowRequestList_PendingCountSingular]:
    '1 очікуваний запит',
  [BrightHubStrings.FollowRequestList_CustomMessage]: 'Повідомлення',

  // SearchResults
  [BrightHubStrings.SearchResults_AriaTemplate]:
    'Результати пошуку для «{QUERY}»',
  [BrightHubStrings.SearchResults_TabAll]: 'Усе',
  [BrightHubStrings.SearchResults_TabPosts]: 'Дописи',
  [BrightHubStrings.SearchResults_TabPostsTemplate]: 'Дописи ({COUNT})',
  [BrightHubStrings.SearchResults_TabUsers]: 'Користувачі',
  [BrightHubStrings.SearchResults_TabUsersTemplate]: 'Користувачі ({COUNT})',
  [BrightHubStrings.SearchResults_NoResultsTemplate]:
    'Не знайдено результатів для «{QUERY}»',
  [BrightHubStrings.SearchResults_EnterSearchTerm]:
    'Введіть пошуковий запит, щоб знайти дописи та людей',
  [BrightHubStrings.SearchResults_SectionPeople]: 'Люди',
  [BrightHubStrings.SearchResults_SectionPosts]: 'Дописи',
  [BrightHubStrings.SearchResults_Loading]: 'Завантаження результатів пошуку',
  [BrightHubStrings.SearchResults_EndOfResults]: 'Кінець результатів',

  // ConnectionPrivacySettings
  [BrightHubStrings.ConnectionPrivacySettings_Title]:
    'Налаштування конфіденційності',
  [BrightHubStrings.ConnectionPrivacySettings_AriaLabel]:
    'Налаштування конфіденційності контактів',
  [BrightHubStrings.ConnectionPrivacySettings_HideFollowerCount]:
    'Приховати кількість підписників',
  [BrightHubStrings.ConnectionPrivacySettings_HideFollowingCount]:
    'Приховати кількість підписок',
  [BrightHubStrings.ConnectionPrivacySettings_HideFollowersFromNonFollowers]:
    'Приховати підписників від не-підписників',
  [BrightHubStrings.ConnectionPrivacySettings_HideFollowingFromNonFollowers]:
    'Приховати підписки від не-підписників',
  [BrightHubStrings.ConnectionPrivacySettings_AllowDmsFromNonFollowers]:
    'Дозволити повідомлення від не-підписників',
  [BrightHubStrings.ConnectionPrivacySettings_ShowOnlineStatus]:
    'Показувати статус онлайн',
  [BrightHubStrings.ConnectionPrivacySettings_ShowReadReceipts]:
    'Показувати підтвердження прочитання',
  [BrightHubStrings.ConnectionPrivacySettings_HideFriendsFromNonFriends]:
    'Приховати список друзів від не-друзів',
  [BrightHubStrings.ConnectionPrivacySettings_ApproveFollowersMode]:
    'Режим схвалення підписників',
  [BrightHubStrings.ConnectionPrivacySettings_ApproveNone]:
    'Автоматично схвалювати всіх',
  [BrightHubStrings.ConnectionPrivacySettings_ApproveAll]:
    'Вимагати схвалення для всіх',
  [BrightHubStrings.ConnectionPrivacySettings_ApproveNonMutuals]:
    'Вимагати схвалення для невзаємних',
  [BrightHubStrings.ConnectionPrivacySettings_Save]: 'Зберегти',

  // TemporaryMuteDialog
  [BrightHubStrings.TemporaryMuteDialog_Title]:
    'Вимкнути сповіщення від користувача',
  [BrightHubStrings.TemporaryMuteDialog_AriaLabel]:
    'Діалог тимчасового вимкнення сповіщень',
  [BrightHubStrings.TemporaryMuteDialog_MuteUserTemplate]:
    'Вимкнути сповіщення від {USERNAME}',
  [BrightHubStrings.TemporaryMuteDialog_Duration1h]: '1 година',
  [BrightHubStrings.TemporaryMuteDialog_Duration8h]: '8 годин',
  [BrightHubStrings.TemporaryMuteDialog_Duration24h]: '24 години',
  [BrightHubStrings.TemporaryMuteDialog_Duration7d]: '7 днів',
  [BrightHubStrings.TemporaryMuteDialog_Duration30d]: '30 днів',
  [BrightHubStrings.TemporaryMuteDialog_Permanent]: 'Вимкнути назавжди',
  [BrightHubStrings.TemporaryMuteDialog_Mute]: 'Вимкнути',
  [BrightHubStrings.TemporaryMuteDialog_Cancel]: 'Скасувати',

  // ConnectionInsights
  [BrightHubStrings.ConnectionInsights_Title]: 'Аналітика контактів',
  [BrightHubStrings.ConnectionInsights_AriaLabel]: 'Аналітика контактів',
  [BrightHubStrings.ConnectionInsights_Period7d]: '7 днів',
  [BrightHubStrings.ConnectionInsights_Period30d]: '30 днів',
  [BrightHubStrings.ConnectionInsights_Period90d]: '90 днів',
  [BrightHubStrings.ConnectionInsights_PeriodAllTime]: 'Увесь час',
  [BrightHubStrings.ConnectionInsights_Interactions]: 'Взаємодії',
  [BrightHubStrings.ConnectionInsights_Messages]: 'Повідомлення',
  [BrightHubStrings.ConnectionInsights_Likes]: 'Вподобання',
  [BrightHubStrings.ConnectionInsights_Reposts]: 'Поширення',
  [BrightHubStrings.ConnectionInsights_Replies]: 'Відповіді',
  [BrightHubStrings.ConnectionInsights_EmptyState]: 'Немає даних про взаємодії',
  [BrightHubStrings.ConnectionInsights_Loading]:
    'Завантаження аналітики контактів…',

  // ListTimelineFilter
  [BrightHubStrings.ListTimelineFilter_Title]: 'Фільтр за списком',
  [BrightHubStrings.ListTimelineFilter_AriaLabel]:
    'Фільтрувати стрічку за списком контактів',
  [BrightHubStrings.ListTimelineFilter_AllConnections]: 'Усі контакти',
  [BrightHubStrings.ListTimelineFilter_SelectList]: 'Оберіть список',
  [BrightHubStrings.ListTimelineFilter_MembersTemplate]: '({COUNT} учасників)',
  [BrightHubStrings.ListTimelineFilter_ClearFilter]: 'Очистити фільтр',

  // MessagingInbox
  [BrightHubStrings.MessagingInbox_Title]: 'Повідомлення',
  [BrightHubStrings.MessagingInbox_AriaLabel]: 'Вхідні повідомлення',
  [BrightHubStrings.MessagingInbox_Loading]: 'Завантаження розмов',
  [BrightHubStrings.MessagingInbox_EmptyState]: 'Ще немає розмов.',
  [BrightHubStrings.MessagingInbox_EmptyStateHint]: 'Розпочніть нову розмову.',
  [BrightHubStrings.MessagingInbox_Pinned]: 'Закріплені',
  [BrightHubStrings.MessagingInbox_UnreadTemplate]: '{COUNT} непрочитаних',
  [BrightHubStrings.MessagingInbox_NewConversation]: 'Нова розмова',
  [BrightHubStrings.MessagingInbox_GroupBadge]: 'Група',

  // ConversationView
  [BrightHubStrings.ConversationView_AriaLabel]: 'Перегляд розмови',
  [BrightHubStrings.ConversationView_Loading]: 'Завантаження повідомлень',
  [BrightHubStrings.ConversationView_EmptyState]:
    'Ще немає повідомлень. Надішліть перше!',
  [BrightHubStrings.ConversationView_LoadMore]: 'Завантажити ще',

  // MessageComposer
  [BrightHubStrings.MessageComposer_Placeholder]: 'Введіть повідомлення…',
  [BrightHubStrings.MessageComposer_AriaLabel]: 'Редактор повідомлень',
  [BrightHubStrings.MessageComposer_Send]: 'Надіслати',
  [BrightHubStrings.MessageComposer_AttachFile]: 'Прикріпити файл',
  [BrightHubStrings.MessageComposer_ReplyingTo]: 'Відповідь на',
  [BrightHubStrings.MessageComposer_CancelReply]: 'Скасувати відповідь',

  // MessageRequestsList
  [BrightHubStrings.MessageRequestsList_Title]: 'Запити на повідомлення',
  [BrightHubStrings.MessageRequestsList_AriaLabel]:
    'Список запитів на повідомлення',
  [BrightHubStrings.MessageRequestsList_Loading]: 'Завантаження запитів',
  [BrightHubStrings.MessageRequestsList_EmptyState]:
    'Немає очікуваних запитів.',
  [BrightHubStrings.MessageRequestsList_Accept]: 'Прийняти',
  [BrightHubStrings.MessageRequestsList_Decline]: 'Відхилити',
  [BrightHubStrings.MessageRequestsList_PendingCountTemplate]:
    '{COUNT} очікуваних',

  // MessageBubble
  [BrightHubStrings.MessageBubble_AriaLabel]: 'Повідомлення',
  [BrightHubStrings.MessageBubble_Edited]: 'Відредаговано',
  [BrightHubStrings.MessageBubble_Forwarded]: 'Переслано',
  [BrightHubStrings.MessageBubble_Deleted]: 'Це повідомлення було видалено.',
  [BrightHubStrings.MessageBubble_ReplyTo]: 'Відповідь на',

  // TypingIndicator
  [BrightHubStrings.TypingIndicator_AriaLabel]: 'Індикатор набору тексту',
  [BrightHubStrings.TypingIndicator_SingleTemplate]: '{NAME} набирає текст…',
  [BrightHubStrings.TypingIndicator_MultipleTemplate]:
    '{COUNT} людей набирають текст…',

  // ReadReceipt
  [BrightHubStrings.ReadReceipt_AriaLabel]: 'Підтвердження прочитання',
  [BrightHubStrings.ReadReceipt_Sent]: 'Надіслано',
  [BrightHubStrings.ReadReceipt_Delivered]: 'Доставлено',
  [BrightHubStrings.ReadReceipt_SeenTemplate]: 'Переглянуто {TIMESTAMP}',

  // MessageReactions
  [BrightHubStrings.MessageReactions_AriaLabel]: 'Реакції на повідомлення',
  [BrightHubStrings.MessageReactions_AddReaction]: 'Додати реакцію',
  [BrightHubStrings.MessageReactions_CountTemplate]: '{COUNT}',
  [BrightHubStrings.MessageReactions_RemoveReaction]: 'Прибрати реакцію',

  // GroupConversationSettings
  [BrightHubStrings.GroupConversationSettings_Title]: 'Налаштування групи',
  [BrightHubStrings.GroupConversationSettings_AriaLabel]:
    'Налаштування групової розмови',
  [BrightHubStrings.GroupConversationSettings_GroupName]: 'Назва групи',
  [BrightHubStrings.GroupConversationSettings_GroupAvatar]: 'Аватар групи',
  [BrightHubStrings.GroupConversationSettings_Participants]: 'Учасники',
  [BrightHubStrings.GroupConversationSettings_ParticipantCountTemplate]:
    '{COUNT} учасників',
  [BrightHubStrings.GroupConversationSettings_AddParticipant]:
    'Додати учасника',
  [BrightHubStrings.GroupConversationSettings_RemoveParticipant]:
    'Вилучити учасника',
  [BrightHubStrings.GroupConversationSettings_PromoteToAdmin]:
    'Підвищити до адміністратора',
  [BrightHubStrings.GroupConversationSettings_DemoteFromAdmin]:
    'Зняти права адміністратора',
  [BrightHubStrings.GroupConversationSettings_AdminBadge]: 'Адмін',
  [BrightHubStrings.GroupConversationSettings_Save]: 'Зберегти',
  [BrightHubStrings.GroupConversationSettings_Cancel]: 'Скасувати',
  [BrightHubStrings.GroupConversationSettings_LeaveGroup]: 'Покинути групу',

  // NewConversationDialog
  [BrightHubStrings.NewConversationDialog_Title]: 'Нова розмова',
  [BrightHubStrings.NewConversationDialog_AriaLabel]: 'Діалог нової розмови',
  [BrightHubStrings.NewConversationDialog_SearchPlaceholder]:
    'Шукати користувачів…',
  [BrightHubStrings.NewConversationDialog_CreateGroup]: 'Створити групу',
  [BrightHubStrings.NewConversationDialog_GroupNamePlaceholder]: 'Назва групи',
  [BrightHubStrings.NewConversationDialog_SelectedTemplate]: '{COUNT} обрано',
  [BrightHubStrings.NewConversationDialog_Start]: 'Розпочати',
  [BrightHubStrings.NewConversationDialog_Cancel]: 'Скасувати',
  [BrightHubStrings.NewConversationDialog_NoResults]:
    'Користувачів не знайдено',

  // ConversationSearch
  [BrightHubStrings.ConversationSearch_Placeholder]: 'Шукати в розмові…',
  [BrightHubStrings.ConversationSearch_AriaLabel]: 'Пошук у розмові',
  [BrightHubStrings.ConversationSearch_NoResults]: 'Повідомлень не знайдено',
  [BrightHubStrings.ConversationSearch_ResultCountTemplate]:
    '{COUNT} результатів',
  [BrightHubStrings.ConversationSearch_Clear]: 'Очистити пошук',

  // MessagingMenuBadge
  [BrightHubStrings.MessagingMenuBadge_AriaLabel]: 'Повідомлення',
  [BrightHubStrings.MessagingMenuBadge_UnreadTemplate]:
    '{COUNT} непрочитаних повідомлень',
  [BrightHubStrings.MessagingMenuBadge_NoUnread]:
    'Немає непрочитаних повідомлень',

  // NotificationProvider
  [BrightHubStrings.NotificationProvider_Error]:
    'Не вдалося завантажити сповіщення',

  // NotificationBell
  [BrightHubStrings.NotificationBell_AriaLabel]: 'Сповіщення',
  [BrightHubStrings.NotificationBell_UnreadTemplate]:
    '{COUNT} непрочитаних сповіщень',
  [BrightHubStrings.NotificationBell_NoUnread]: 'Немає непрочитаних сповіщень',
  [BrightHubStrings.NotificationBell_Overflow]: '99+',

  // NotificationDropdown
  [BrightHubStrings.NotificationDropdown_Title]: 'Сповіщення',
  [BrightHubStrings.NotificationDropdown_AriaLabel]:
    'Випадний список сповіщень',
  [BrightHubStrings.NotificationDropdown_ViewAll]: 'Переглянути всі',
  [BrightHubStrings.NotificationDropdown_MarkAllRead]:
    'Позначити всі як прочитані',
  [BrightHubStrings.NotificationDropdown_EmptyState]: 'Ще немає сповіщень',
  [BrightHubStrings.NotificationDropdown_Loading]: 'Завантаження сповіщень',

  // NotificationItem
  [BrightHubStrings.NotificationItem_AriaLabel]: 'Сповіщення',
  [BrightHubStrings.NotificationItem_MarkRead]: 'Позначити як прочитане',
  [BrightHubStrings.NotificationItem_Delete]: 'Видалити',
  [BrightHubStrings.NotificationItem_GroupExpandTemplate]:
    'Показати ще {COUNT}',
  [BrightHubStrings.NotificationItem_GroupCollapseTemplate]: 'Згорнути',

  // NotificationList
  [BrightHubStrings.NotificationList_Title]: 'Сповіщення',
  [BrightHubStrings.NotificationList_AriaLabel]: 'Список сповіщень',
  [BrightHubStrings.NotificationList_Loading]: 'Завантаження сповіщень',
  [BrightHubStrings.NotificationList_EmptyState]: 'Немає сповіщень',
  [BrightHubStrings.NotificationList_FilterAll]: 'Усі',
  [BrightHubStrings.NotificationList_FilterUnread]: 'Непрочитані',
  [BrightHubStrings.NotificationList_FilterRead]: 'Прочитані',
  [BrightHubStrings.NotificationList_LoadMore]: 'Завантажити ще',
  [BrightHubStrings.NotificationList_EndOfList]: 'Більше немає сповіщень',

  // NotificationPreferences
  [BrightHubStrings.NotificationPreferences_Title]: 'Налаштування сповіщень',
  [BrightHubStrings.NotificationPreferences_AriaLabel]:
    'Налаштування сповіщень',
  [BrightHubStrings.NotificationPreferences_CategorySettings]:
    'Налаштування категорій',
  [BrightHubStrings.NotificationPreferences_ChannelSettings]:
    'Налаштування каналів',
  [BrightHubStrings.NotificationPreferences_QuietHours]: 'Тихі години',
  [BrightHubStrings.NotificationPreferences_QuietHoursEnabled]:
    'Увімкнути тихі години',
  [BrightHubStrings.NotificationPreferences_QuietHoursStart]: 'Час початку',
  [BrightHubStrings.NotificationPreferences_QuietHoursEnd]: 'Час завершення',
  [BrightHubStrings.NotificationPreferences_QuietHoursTimezone]: 'Часовий пояс',
  [BrightHubStrings.NotificationPreferences_DoNotDisturb]: 'Не турбувати',
  [BrightHubStrings.NotificationPreferences_DndEnabled]:
    'Увімкнути режим «Не турбувати»',
  [BrightHubStrings.NotificationPreferences_DndDuration]: 'Тривалість',
  [BrightHubStrings.NotificationPreferences_SoundEnabled]: 'Звуки сповіщень',
  [BrightHubStrings.NotificationPreferences_Save]: 'Зберегти',
  [BrightHubStrings.NotificationPreferences_CategorySocial]: 'Соціальне',
  [BrightHubStrings.NotificationPreferences_CategoryMessages]: 'Повідомлення',
  [BrightHubStrings.NotificationPreferences_CategoryConnections]: 'Контакти',
  [BrightHubStrings.NotificationPreferences_CategorySystem]: 'Система',
  [BrightHubStrings.NotificationPreferences_ChannelInApp]: 'У застосунку',
  [BrightHubStrings.NotificationPreferences_ChannelEmail]: 'Електронна пошта',
  [BrightHubStrings.NotificationPreferences_ChannelPush]: 'Push-сповіщення',

  // NotificationCategoryFilter
  [BrightHubStrings.NotificationCategoryFilter_Title]: 'Фільтр за категорією',
  [BrightHubStrings.NotificationCategoryFilter_AriaLabel]:
    'Фільтр категорій сповіщень',
  [BrightHubStrings.NotificationCategoryFilter_All]: 'Усі',
  [BrightHubStrings.NotificationCategoryFilter_Social]: 'Соціальне',
  [BrightHubStrings.NotificationCategoryFilter_Messages]: 'Повідомлення',
  [BrightHubStrings.NotificationCategoryFilter_Connections]: 'Контакти',
  [BrightHubStrings.NotificationCategoryFilter_System]: 'Система',

  // Navigation / Sidebar
  [BrightHubStrings.Nav_Home]: 'Головна',
  [BrightHubStrings.Nav_Explore]: 'Огляд',
  [BrightHubStrings.Nav_Notifications]: 'Сповіщення',
  [BrightHubStrings.Nav_Messages]: 'Повідомлення',
  [BrightHubStrings.Nav_Profile]: 'Профіль',
  [BrightHubStrings.Nav_Connections]: "Зв'язки",
  [BrightHubStrings.Nav_Settings]: 'Налаштування',
  [BrightHubStrings.Nav_SidebarLabel]: 'Навігація BrightHub',
  [BrightHubStrings.Nav_SubscribedHubs]: 'Ваші Hubs',
  [BrightHubStrings.Nav_CreateHub]: 'Створити Hub',
  [BrightHubStrings.HubDetail_MembersTemplate]: '{COUNT} учасників',
  [BrightHubStrings.HubDetail_PostsTemplate]: '{COUNT} публікацій',
  [BrightHubStrings.HubDetail_Join]: 'Приєднатися',
  [BrightHubStrings.HubDetail_Leave]: 'Вийти',
  [BrightHubStrings.HubDetail_Joined]: 'Приєднано',
  [BrightHubStrings.HubDetail_TrustOpen]: 'Відкритий',
  [BrightHubStrings.HubDetail_TrustVerified]: 'Верифікований',
  [BrightHubStrings.HubDetail_TrustEncrypted]: 'Зашифрований',
  [BrightHubStrings.HubDetail_About]: 'Про',
  [BrightHubStrings.HubDetail_Rules]: 'Правила',
  [BrightHubStrings.HubDetail_SortHot]: 'Популярне',
  [BrightHubStrings.HubDetail_SortNew]: 'Нове',
  [BrightHubStrings.HubDetail_SortTop]: 'Найкраще',
  [BrightHubStrings.HubDetail_EmptyState]:
    'Ще немає публікацій. Будьте першим, хто розпочне обговорення!',
  [BrightHubStrings.HubDetail_SubHubs]: 'Під-хаби',
  [BrightHubStrings.Explore_Title]: 'Огляд Hubs',
  [BrightHubStrings.Explore_SearchPlaceholder]: 'Шукати hubs…',
  [BrightHubStrings.Explore_Trending]: 'Тренди',
  [BrightHubStrings.Explore_New]: 'Нове',
  [BrightHubStrings.Explore_EmptyState]:
    'Ще немає hubs. Створіть один, щоб почати!',
  [BrightHubStrings.Explore_NoResults]:
    'Жоден hub не відповідає вашому пошуку.',
  [BrightHubStrings.Home_TrendingHubs]: 'Популярні Hubs',
  [BrightHubStrings.Home_RecentActivity]: 'Остання активність',
  [BrightHubStrings.Home_YourHubs]: 'Ваші Hubs',
  [BrightHubStrings.Home_SuggestedHubs]: 'Рекомендовані Hubs',
  [BrightHubStrings.Home_ViewAll]: 'Переглянути все',
  [BrightHubStrings.Home_Welcome]: 'Ласкаво просимо до BrightHub',
  [BrightHubStrings.Home_WelcomeSubtitle]:
    'Приєднуйтесь до hubs, щоб бачити обговорення спільнот, які вас цікавлять.',
  [BrightHubStrings.Home_NoHubsYet]: 'Ви ще не приєдналися до жодного hub',
  [BrightHubStrings.Home_NoHubsHint]:
    'Досліджуйте hubs, щоб знайти спільноти, які вас цікавлять.',
  [BrightHubStrings.CreateHub_Title]: 'Створити Hub',
  [BrightHubStrings.CreateHub_NameLabel]: 'Назва hub',
  [BrightHubStrings.CreateHub_NamePlaceholder]: 'напр. Програмування',
  [BrightHubStrings.CreateHub_SlugLabel]: 'URL-ідентифікатор',
  [BrightHubStrings.CreateHub_SlugPlaceholder]: 'напр. programming',
  [BrightHubStrings.CreateHub_DescriptionLabel]: 'Опис',
  [BrightHubStrings.CreateHub_DescriptionPlaceholder]: 'Про що цей hub?',
  [BrightHubStrings.CreateHub_TrustTierLabel]: 'Рівень довіри',
  [BrightHubStrings.CreateHub_ParentHubLabel]: 'Батьківський hub (необов.)',
  [BrightHubStrings.CreateHub_ParentHubNone]: 'Немає (hub верхнього рівня)',
  [BrightHubStrings.CreateHub_Submit]: 'Створити Hub',
  [BrightHubStrings.CreateHub_Cancel]: 'Скасувати',
  [BrightHubStrings.Nav_CreatePost]: 'Новий допис',
  [BrightHubStrings.Nav_Trending]: 'Тренди',

  // PinnedPostSection
  [BrightHubStrings.PinnedPostSection_Pinned]: 'Закріплено',
  [BrightHubStrings.PinnedPostSection_Unpin]: 'Відкріпити',
  [BrightHubStrings.PinnedPostSection_AriaLabel]: 'Закріплена публікація',

  // EditProfileDialog
  [BrightHubStrings.EditProfileDialog_Title]: 'Редагувати профіль',
  [BrightHubStrings.EditProfileDialog_DisplayName]: "Ім'я для відображення",
  [BrightHubStrings.EditProfileDialog_Bio]: 'Біографія',
  [BrightHubStrings.EditProfileDialog_BioPlaceholder]: 'Розкажіть людям про себе. Підтримуються Markdown та іконки.',
  [BrightHubStrings.EditProfileDialog_BioCharCountTemplate]: '{CURRENT}/{MAX}',
  [BrightHubStrings.EditProfileDialog_BioPreview]: 'Попередній перегляд',
  [BrightHubStrings.EditProfileDialog_Location]: 'Місцезнаходження',
  [BrightHubStrings.EditProfileDialog_WebsiteUrl]: 'Веб-сайт',
  [BrightHubStrings.EditProfileDialog_Save]: 'Зберегти',
  [BrightHubStrings.EditProfileDialog_Cancel]: 'Скасувати',
  [BrightHubStrings.EditProfileDialog_Saving]: 'Збереження\u2026',
  [BrightHubStrings.EditProfileDialog_ErrorBioTooLong]: 'Біографія перевищує максимальну довжину {MAX} символів.',
  [BrightHubStrings.EditProfileDialog_ErrorBioContainsImage]: 'Біографія не може містити синтаксис Markdown для зображень.',

  // UserProfileCard
  [BrightHubStrings.UserProfileCard_EditProfile]: 'Редагувати профіль',
};
