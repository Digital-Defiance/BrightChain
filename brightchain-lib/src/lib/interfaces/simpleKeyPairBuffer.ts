import { ISimplePublicKeyOnlyBuffer } from './simplePublicKeyOnlyBuffer';
import { SerializableBuffer } from '../serializableBuffer';

export interface ISimpleKeyPairBuffer extends ISimplePublicKeyOnlyBuffer {
  publicKey: SerializableBuffer;
  privateKey: SerializableBuffer;
}
