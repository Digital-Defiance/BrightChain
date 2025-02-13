import {
  ChecksumString,
  HexString,
  ShortHexGuid,
  SignatureString,
} from './types';

export interface QuorumDataRecordDto {
  id: ShortHexGuid;
  creatorId: ShortHexGuid;
  encryptedData: HexString;
  encryptedSharesByMemberId: { [key: string]: HexString };
  /**
   * sha-3 hash of the encrypted data
   */
  checksum: ChecksumString;
  signature: SignatureString;
  memberIDs: ShortHexGuid[];
  sharesRequired: number;
  dateCreated: string;
  dateUpdated: string;
}
