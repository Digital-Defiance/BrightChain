import {
  EnumLanguageTranslation,
  i18nEngine,
} from '@brightchain/brightchain-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { ConnectionVisibility } from '../enumerations/connection-visibility';

export type ConnectionVisibilityLanguageTranslation =
  EnumLanguageTranslation<ConnectionVisibility>;

export const ConnectionVisibilityTranslations: ConnectionVisibilityLanguageTranslation =
  i18nEngine.registerEnum(
    ConnectionVisibility,
    {
      [LanguageCodes.DE]: {
        [ConnectionVisibility.Private]: 'Privat',
        [ConnectionVisibility.FollowersOnly]: 'Nur Follower',
        [ConnectionVisibility.Public]: 'Öffentlich',
      },
      [LanguageCodes.EN_GB]: {
        [ConnectionVisibility.Private]: 'Private',
        [ConnectionVisibility.FollowersOnly]: 'Followers Only',
        [ConnectionVisibility.Public]: 'Public',
      },
      [LanguageCodes.EN_US]: {
        [ConnectionVisibility.Private]: 'Private',
        [ConnectionVisibility.FollowersOnly]: 'Followers Only',
        [ConnectionVisibility.Public]: 'Public',
      },
      [LanguageCodes.ES]: {
        [ConnectionVisibility.Private]: 'Privado',
        [ConnectionVisibility.FollowersOnly]: 'Solo seguidores',
        [ConnectionVisibility.Public]: 'Público',
      },
      [LanguageCodes.FR]: {
        [ConnectionVisibility.Private]: 'Privé',
        [ConnectionVisibility.FollowersOnly]: 'Abonnés uniquement',
        [ConnectionVisibility.Public]: 'Public',
      },
      [LanguageCodes.JA]: {
        [ConnectionVisibility.Private]: 'プライベート',
        [ConnectionVisibility.FollowersOnly]: 'フォロワーのみ',
        [ConnectionVisibility.Public]: '公開',
      },
      [LanguageCodes.UK]: {
        [ConnectionVisibility.Private]: 'Приватний',
        [ConnectionVisibility.FollowersOnly]: 'Лише підписники',
        [ConnectionVisibility.Public]: 'Публічний',
      },
      [LanguageCodes.ZH_CN]: {
        [ConnectionVisibility.Private]: '私密',
        [ConnectionVisibility.FollowersOnly]: '仅关注者',
        [ConnectionVisibility.Public]: '公开',
      },
    },
    'ConnectionVisibility',
  );
