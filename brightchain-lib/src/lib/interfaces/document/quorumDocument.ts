import {
  Member,
  PlatformID,
  SignatureUint8Array,
} from '@digitaldefiance/ecies-lib';
import type { QuorumDataRecord } from '../../quorumDataRecord';
import type { Checksum } from '../../types';

export interface IQuorumDocument<TID extends PlatformID = Uint8Array> {
  checksum: Checksum;
  creatorId: Checksum;
  creator: Member<TID>;
  signature: SignatureUint8Array;
  memberIDs: TID[];
  sharesRequired: number;
  dateCreated: Date;
  dateUpdated: Date;
  encryptedData?: QuorumDataRecord<TID>;
}
