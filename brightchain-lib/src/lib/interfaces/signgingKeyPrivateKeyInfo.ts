import { IKeyPairBufferWithUnEncryptedPrivateKey } from "./keyPairBufferWithUnEncryptedPrivateKey";
import { ec } from "elliptic";

export interface ISigningKeyPrivateKeyInfo extends IKeyPairBufferWithUnEncryptedPrivateKey {
  keyPair: ec.KeyPair;
  publicKey: Buffer;
  privateKey: Buffer;
  seedHex: string;
  entropy: string;
  mnemonic: string;
}
