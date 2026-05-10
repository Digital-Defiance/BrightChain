import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { PostType } from '../enumerations/post-type';

export type PostTypeLanguageTranslation = EnumLanguageTranslation<PostType>;

export const PostTypeTranslations: PostTypeLanguageTranslation =
  i18nEngine.registerEnum(
    PostType,
    {
      [LanguageCodes.DE]: {
        [PostType.Original]: 'Original',
        [PostType.Repost]: 'Repost',
        [PostType.Quote]: 'Zitat',
        [PostType.Reply]: 'Antwort',
      },
      [LanguageCodes.EN_GB]: {
        [PostType.Original]: 'Original',
        [PostType.Repost]: 'Repost',
        [PostType.Quote]: 'Quote',
        [PostType.Reply]: 'Reply',
      },
      [LanguageCodes.EN_US]: {
        [PostType.Original]: 'Original',
        [PostType.Repost]: 'Repost',
        [PostType.Quote]: 'Quote',
        [PostType.Reply]: 'Reply',
      },
      [LanguageCodes.ES]: {
        [PostType.Original]: 'Original',
        [PostType.Repost]: 'Republicación',
        [PostType.Quote]: 'Cita',
        [PostType.Reply]: 'Respuesta',
      },
      [LanguageCodes.FR]: {
        [PostType.Original]: 'Original',
        [PostType.Repost]: 'Republication',
        [PostType.Quote]: 'Citation',
        [PostType.Reply]: 'Réponse',
      },
      [LanguageCodes.JA]: {
        [PostType.Original]: 'オリジナル',
        [PostType.Repost]: 'リポスト',
        [PostType.Quote]: '引用',
        [PostType.Reply]: '返信',
      },
      [LanguageCodes.UK]: {
        [PostType.Original]: 'Оригінал',
        [PostType.Repost]: 'Репост',
        [PostType.Quote]: 'Цитата',
        [PostType.Reply]: 'Відповідь',
      },
      [LanguageCodes.ZH_CN]: {
        [PostType.Original]: '原创',
        [PostType.Repost]: '转发',
        [PostType.Quote]: '引用',
        [PostType.Reply]: '回复',
      },
    },
    'PostType',
  );
