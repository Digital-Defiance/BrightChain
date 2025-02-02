import { BrightChainMember } from '../brightChainMember';
import { IEncryptedBlock } from './encryptedBlock';

export interface IMultiEncryptedBlock extends IEncryptedBlock {
  get recipients(): BrightChainMember[];
  get encryptedKeys(): Buffer[];
  get encryptedData(): Buffer;
}
