import { ec } from 'elliptic';
import { ISimpleKeyPairBuffer } from '@digitaldefiance/node-ecies-lib';

export interface IDataAndSigningKeys {
  signing: ec.KeyPair;
  data: ISimpleKeyPairBuffer;
}
