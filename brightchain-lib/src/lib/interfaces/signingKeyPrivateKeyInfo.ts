import { ec } from 'elliptic';
import { IKeyPairBufferWithUnEncryptedPrivateKey } from './keyPairBufferWithUnEncryptedPrivateKey';

export interface ISigningKeyPrivateKeyInfo
  extends IKeyPairBufferWithUnEncryptedPrivateKey {
  keyPair: ec.KeyPair;
  publicKey: Buffer;
  privateKey: Buffer;
  seedHex: string;
  entropy: string;
  mnemonic: string;
}
