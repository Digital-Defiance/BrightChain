import { IRole } from '../role';

export interface IRequestUserDTO {
  id: string;
  roles: Array<IRole>;
  username: string;
  email: string;
  expireMemoryMnemonicSeconds?: number;
  expireMemoryWalletSeconds?: number;
  timezone: string;
  siteLanguage: string;
  lastLogin?: string;
  emailVerified: boolean;
}
