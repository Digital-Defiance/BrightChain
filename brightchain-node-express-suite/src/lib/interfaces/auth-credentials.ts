import { SecureString } from '@digitaldefiance/ecies-lib';

export interface IAuthCredentials {
  username: string;
  password: SecureString;
}
