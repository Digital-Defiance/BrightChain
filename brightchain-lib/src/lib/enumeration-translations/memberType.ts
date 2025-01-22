import MemberType from '../enumerations/memberType';
import { StringLanguages } from '../enumerations/stringLanguages';

export type MemberTypeTranslation = {
  [key in MemberType]: string;
};
export type MemberTypeLanguageTranslation = {
  [key in StringLanguages]: MemberTypeTranslation;
};

export const MemberTypeTranslations: MemberTypeLanguageTranslation = {
  [StringLanguages.EnglishUS]: {
    [MemberType.Admin]: 'Admin',
    [MemberType.System]: 'System',
    [MemberType.User]: 'User',
    [MemberType.Anonymous]: 'Anonymous',
  },
};
