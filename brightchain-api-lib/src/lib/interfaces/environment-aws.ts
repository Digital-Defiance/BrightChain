import { SecureString } from '@digitaldefiance/ecies-lib';

export interface IEnvironmentAws {
  accessKeyId: SecureString;
  secretAccessKey: SecureString;
  region: string;
}
