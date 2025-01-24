import { BrightChainMember } from '../brightChainMember';
import { IBlock } from './blockBase';

export interface IMultiEncryptedBlock extends Omit<IBlock, 'encryptedLength'> {
  get encryptedLength(): bigint;
  get recipients(): BrightChainMember[];
  get encryptedKeys(): Buffer[];
  get creator(): BrightChainMember;
  get encryptedData(): Buffer;
}
