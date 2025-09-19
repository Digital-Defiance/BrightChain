import { ISimplePublicKeyOnlyBuffer } from './simplePublicKeyOnlyBuffer';

export interface ISimpleKeyPairBuffer extends ISimplePublicKeyOnlyBuffer {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}
