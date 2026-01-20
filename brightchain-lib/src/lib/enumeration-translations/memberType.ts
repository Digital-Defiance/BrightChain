import { MemberType } from '@digitaldefiance/ecies-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import { registerTranslation } from '../i18n';
import { createTranslations, EnumLanguageTranslation } from '../types';

export type MemberTypeLanguageTranslation = EnumLanguageTranslation<MemberType>;

export const MemberTypeTranslations: MemberTypeLanguageTranslation =
  registerTranslation(
    MemberType,
    createTranslations({
      [LanguageCodes.EN_US]: {
        [MemberType.Admin]: 'Admin',
        [MemberType.System]: 'System',
        [MemberType.User]: 'User',
        [MemberType.Anonymous]: 'Anonymous',
      },
    }),
  );
