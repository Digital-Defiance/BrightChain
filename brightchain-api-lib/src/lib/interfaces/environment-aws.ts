import { SecureString } from '@brightchain/brightchain-lib';

export interface IEnvironmentAws {
  accessKeyId: SecureString;
  secretAccessKey: SecureString;
  region: string;
}
