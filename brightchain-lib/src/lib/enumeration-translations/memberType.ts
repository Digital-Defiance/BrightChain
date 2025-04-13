import MemberType from '../enumerations/memberType';
import { StringLanguages } from '../enumerations/stringLanguages';
import { registerTranslation } from '../i18n';
import { createTranslations, EnumLanguageTranslation } from '../types';

export type MemberTypeLanguageTranslation = EnumLanguageTranslation<MemberType>;

export const MemberTypeTranslations: MemberTypeLanguageTranslation =
  registerTranslation(
    MemberType,
    createTranslations({
      [StringLanguages.EnglishUS]: {
        [MemberType.Admin]: 'Admin',
        [MemberType.System]: 'System',
        [MemberType.User]: 'User',
      },
    }),
  );
