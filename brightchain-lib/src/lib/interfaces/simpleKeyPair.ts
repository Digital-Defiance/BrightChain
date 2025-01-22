import { ISimplePublicKeyOnly } from './simplePublicKeyOnly';

export interface ISimpleKeyPair extends ISimplePublicKeyOnly {
  publicKey: string;
  privateKey: Buffer;
}
