import { ISimplePublicKeyOnlyBuffer } from "./simplePublicKeyOnlyBuffer";

export interface ISimpleKeyPairBuffer extends ISimplePublicKeyOnlyBuffer {
  publicKey: Buffer;
  privateKey: Buffer;
}