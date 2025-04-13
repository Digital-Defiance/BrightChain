import { LanguageCode } from '@digitaldefiance/i18n-lib';
import { IRole } from './role';

export interface IRequestUser {
  id: string;
  email: string;
  emailVerified: boolean;
  roles: Array<IRole>;
  username: string;
  siteLanguage: LanguageCode;
  timezone: string;
  lastLogin?: Date;
}
