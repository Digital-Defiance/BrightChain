import { SerializableBuffer } from '../serializableBuffer';
import { BrightChainMember } from '../brightChainMember';
import { GuidV4 } from '../guid';

export interface QuorumDocument {
  checksum: SerializableBuffer;
  creator: BrightChainMember;
  signature: SerializableBuffer;
  memberIDs: GuidV4[];
  sharesRequired: number;
  dateCreated: Date;
  dateUpdated: Date;
}

