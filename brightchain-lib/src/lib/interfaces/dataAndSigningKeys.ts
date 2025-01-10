import { ec } from 'elliptic';
import { ISimpleKeyPairBuffer } from './simpleKeyPairBuffer';

export interface IDataAndSigningKeys {
  signing: ec.KeyPair;
  data: ISimpleKeyPairBuffer;
}
