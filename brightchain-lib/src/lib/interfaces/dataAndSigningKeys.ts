import { ISimpleKeyPair } from '@digitaldefiance/ecies-lib';
import { ec } from 'elliptic';

export interface IDataAndSigningKeys {
  signing: ec.KeyPair;
  data: ISimpleKeyPair;
}
