import { IEphemeralBlockMetadata } from './ephemeralBlockMetadata';

export interface IEncryptedBlockMetadata extends IEphemeralBlockMetadata {
  get encryptedLength(): number;
  recipientCount?: number;
}
