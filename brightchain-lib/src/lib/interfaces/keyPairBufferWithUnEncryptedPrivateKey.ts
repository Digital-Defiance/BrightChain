import { ISimplePublicKeyOnlyBuffer } from './simplePublicKeyOnlyBuffer';
import { SerializableBuffer } from '../serializableBuffer';

export interface IKeyPairBufferWithUnEncryptedPrivateKey
  extends ISimplePublicKeyOnlyBuffer {
  publicKey: SerializableBuffer;
  privateKey: SerializableBuffer;
}
