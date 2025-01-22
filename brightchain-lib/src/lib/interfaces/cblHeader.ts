import { GuidV4 } from '../guid';
import { SignatureBuffer } from '../types';

export interface IConstituentBlockListBlockHeader {
  creatorId: GuidV4;
  dateCreated: Date;
  cblAddressCount: number;
  originalDataLength: bigint;
  tupleSize: number;
  creatorSignature: SignatureBuffer;
}
