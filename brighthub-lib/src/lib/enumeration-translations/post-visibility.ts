import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { PostVisibility } from '../enumerations/post-visibility';

export type PostVisibilityLanguageTranslation =
  EnumLanguageTranslation<PostVisibility>;

export const PostVisibilityTranslations: PostVisibilityLanguageTranslation =
  i18nEngine.registerEnum(
    PostVisibility,
    {
      [LanguageCodes.DE]: {
        [PostVisibility.Public]: 'Öffentlich',
        [PostVisibility.FollowersOnly]: 'Nur Follower',
        [PostVisibility.FriendsOnly]: 'Nur Freunde',
        [PostVisibility.HubOnly]: 'Nur Hub-Mitglieder',
      },
      [LanguageCodes.EN_GB]: {
        [PostVisibility.Public]: 'Public',
        [PostVisibility.FollowersOnly]: 'Followers Only',
        [PostVisibility.FriendsOnly]: 'Friends Only',
        [PostVisibility.HubOnly]: 'Hub Members Only',
      },
      [LanguageCodes.EN_US]: {
        [PostVisibility.Public]: 'Public',
        [PostVisibility.FollowersOnly]: 'Followers Only',
        [PostVisibility.FriendsOnly]: 'Friends Only',
        [PostVisibility.HubOnly]: 'Hub Members Only',
      },
      [LanguageCodes.ES]: {
        [PostVisibility.Public]: 'Público',
        [PostVisibility.FollowersOnly]: 'Solo seguidores',
        [PostVisibility.FriendsOnly]: 'Solo amigos',
        [PostVisibility.HubOnly]: 'Solo miembros del hub',
      },
      [LanguageCodes.FR]: {
        [PostVisibility.Public]: 'Public',
        [PostVisibility.FollowersOnly]: 'Abonnés uniquement',
        [PostVisibility.FriendsOnly]: 'Amis uniquement',
        [PostVisibility.HubOnly]: 'Membres du hub uniquement',
      },
      [LanguageCodes.JA]: {
        [PostVisibility.Public]: '公開',
        [PostVisibility.FollowersOnly]: 'フォロワーのみ',
        [PostVisibility.FriendsOnly]: '友達のみ',
        [PostVisibility.HubOnly]: 'ハブメンバーのみ',
      },
      [LanguageCodes.UK]: {
        [PostVisibility.Public]: 'Публічний',
        [PostVisibility.FollowersOnly]: 'Тільки підписники',
        [PostVisibility.FriendsOnly]: 'Тільки друзі',
        [PostVisibility.HubOnly]: 'Тільки учасники хабу',
      },
      [LanguageCodes.ZH_CN]: {
        [PostVisibility.Public]: '公开',
        [PostVisibility.FollowersOnly]: '仅关注者',
        [PostVisibility.FriendsOnly]: '仅朋友',
        [PostVisibility.HubOnly]: '仅中心成员',
      },
    },
    'PostVisibility',
  );
