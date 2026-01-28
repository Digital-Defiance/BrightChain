import { MemberType } from '@digitaldefiance/ecies-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { registerTranslation } from '../i18n';
import { createTranslations, EnumLanguageTranslation } from '../types';

export type MemberTypeLanguageTranslation = EnumLanguageTranslation<MemberType>;

export const MemberTypeTranslations: MemberTypeLanguageTranslation =
  registerTranslation(
    MemberType,
    createTranslations({
      [LanguageCodes.DE]: {
        [MemberType.Admin]: 'Administrator',
        [MemberType.System]: 'System',
        [MemberType.User]: 'Benutzer',
        [MemberType.Anonymous]: 'Anonym',
      },
      [LanguageCodes.EN_GB]: {
        [MemberType.Admin]: 'Admin',
        [MemberType.System]: 'System',
        [MemberType.User]: 'User',
        [MemberType.Anonymous]: 'Anonymous',
      },
      [LanguageCodes.EN_US]: {
        [MemberType.Admin]: 'Admin',
        [MemberType.System]: 'System',
        [MemberType.User]: 'User',
        [MemberType.Anonymous]: 'Anonymous',
      },
      [LanguageCodes.ES]: {
        [MemberType.Admin]: 'Administrador',
        [MemberType.System]: 'Sistema',
        [MemberType.User]: 'Usuario',
        [MemberType.Anonymous]: 'Anónimo',
      },
      [LanguageCodes.FR]: {
        [MemberType.Admin]: 'Administrateur',
        [MemberType.System]: 'Système',
        [MemberType.User]: 'Utilisateur',
        [MemberType.Anonymous]: 'Anonyme',
      },
      [LanguageCodes.JA]: {
        [MemberType.Admin]: '管理者',
        [MemberType.System]: 'システム',
        [MemberType.User]: 'ユーザー',
        [MemberType.Anonymous]: '匿名',
      },
      [LanguageCodes.UK]: {
        [MemberType.Admin]: 'Адміністратор',
        [MemberType.System]: 'Система',
        [MemberType.User]: 'Користувач',
        [MemberType.Anonymous]: 'Анонімний',
      },
      [LanguageCodes.ZH_CN]: {
        [MemberType.Admin]: '管理员',
        [MemberType.System]: '系统',
        [MemberType.User]: '用户',
        [MemberType.Anonymous]: '匿名',
      },
    }),
  );
