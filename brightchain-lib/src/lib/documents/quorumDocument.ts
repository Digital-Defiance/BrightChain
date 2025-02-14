import { BrightChainMember } from '../brightChainMember';
import { GuidV4 } from '../guid';
import { ChecksumBuffer, SignatureBuffer } from '../types';

export interface QuorumDocument {
  checksum: ChecksumBuffer;
  creator: BrightChainMember;
  signature: SignatureBuffer;
  memberIDs: GuidV4[];
  sharesRequired: number;
  dateCreated: Date;
  dateUpdated: Date;
}
