import { ISimplePublicKeyOnlyBuffer } from './simple-public-key-only-buffer';

export interface ISimpleKeyPairBuffer extends ISimplePublicKeyOnlyBuffer {
  publicKey: Buffer;
  privateKey: Buffer;
}
