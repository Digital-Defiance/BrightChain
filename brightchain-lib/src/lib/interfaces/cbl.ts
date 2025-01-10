import { BrightChainMember } from '../brightChainMember';
import { GuidV4 } from '../guid';
import { ChecksumBuffer, SignatureBuffer } from '../types';
import { IDataBlock } from './dataBlock';

export interface IConstituentBlockListBlock extends IDataBlock {
  get addressData(): Buffer;
  get addresses(): Array<ChecksumBuffer>;
  get cblAddressCount(): number;
  get creatorId(): GuidV4;
  get creatorSignature(): SignatureBuffer;
  get originalDataLength(): bigint;
  get tupleSize(): number;
  validateSignature(creator: BrightChainMember): boolean;
}
