import { ISimplePublicKeyOnlyBuffer } from './simplePublicKeyOnlyBuffer';

export interface IKeyPairBufferWithUnEncryptedPrivateKey
  extends ISimplePublicKeyOnlyBuffer {
  publicKey: Buffer;
  privateKey: Buffer;
}
