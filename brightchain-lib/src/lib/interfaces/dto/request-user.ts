import { IRoleDTO } from '../dto/role';

export interface IRequestUserDTO {
  id: string;
  roles: Array<IRoleDTO>;
  username: string;
  email: string;
  expireMemoryMnemonicSeconds?: number;
  expireMemoryWalletSeconds?: number;
  timezone: string;
  siteLanguage: string;
  lastLogin?: string;
  emailVerified: boolean;
}
