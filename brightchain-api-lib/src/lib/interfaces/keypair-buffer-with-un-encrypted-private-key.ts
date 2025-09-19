import { ISimplePublicKeyOnlyBuffer } from './simple-public-key-only-buffer';

export interface IKeyPairBufferWithUnEncryptedPrivateKey
  extends ISimplePublicKeyOnlyBuffer {
  publicKey: Buffer;
  privateKey: Buffer;
}
