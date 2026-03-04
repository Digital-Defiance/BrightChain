import { StringsCollection } from '@digitaldefiance/i18n-lib';
import {
  BrightHubStringKey,
  BrightHubStrings,
} from '../../../enumerations/brightHubStrings';

export const BrightHubUkrainianStrings: StringsCollection<BrightHubStringKey> =
  {
    // PostCard
    [BrightHubStrings.PostCard_Reposted]: 'Поширено',
    [BrightHubStrings.PostCard_Edited]: 'Відредаговано',
    [BrightHubStrings.PostCard_HubRestricted]:
      'Видимий лише для учасників хабу',
    [BrightHubStrings.PostCard_Deleted]: 'Цей допис було видалено.',
    [BrightHubStrings.PostCard_ReplyAriaTemplate]:
      'Відповісти, {COUNT} відповідей',
    [BrightHubStrings.PostCard_RepostAriaTemplate]:
      'Поширити, {COUNT} поширень',
    [BrightHubStrings.PostCard_LikeAriaTemplate]:
      'Вподобати, {COUNT} вподобань',
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
    [BrightHubStrings.PostComposer_MembersTemplate]: '{COUNT} учасників',
    [BrightHubStrings.PostComposer_SubmitPost]: 'Надіслати допис',
    [BrightHubStrings.PostComposer_Post]: 'Опублікувати',
    [BrightHubStrings.PostComposer_Reply]: 'Відповісти',

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
    [BrightHubStrings.ThreadView_ReplyCountPluralTemplate]:
      '{COUNT} відповідей',
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
    [BrightHubStrings.UserProfileCard_StrongConnection]: "Сильний зв'язок",
    [BrightHubStrings.UserProfileCard_ModerateConnection]: "Помірний зв'язок",
    [BrightHubStrings.UserProfileCard_WeakConnection]: "Слабкий зв'язок",
    [BrightHubStrings.UserProfileCard_DormantConnection]: "Неактивний зв'язок",
    [BrightHubStrings.UserProfileCard_MutualConnectionSingular]:
      '1 спільний контакт',
    [BrightHubStrings.UserProfileCard_MutualConnectionPluralTemplate]:
      '{COUNT} спільних контактів',

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
  };
