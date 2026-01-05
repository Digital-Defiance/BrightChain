import { ISimpleKeyPairBuffer } from '@digitaldefiance/node-ecies-lib';
import { ec } from 'elliptic';

export interface IDataAndSigningKeys {
  signing: ec.KeyPair;
  data: ISimpleKeyPairBuffer;
}
