import { StringLanguages } from '../enumerations/stringLanguages';
import { IRole } from './role';

export interface IRequestUser {
  id: string;
  email: string;
  emailVerified: boolean;
  roles: Array<IRole>;
  username: string;
  siteLanguage: StringLanguages;
  timezone: string;
  lastLogin?: Date;
}
