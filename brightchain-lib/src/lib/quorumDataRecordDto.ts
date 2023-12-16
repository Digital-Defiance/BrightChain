import { ChecksumString, HexString, ShortHexGuid } from "./types";

export interface QuorumDataRecordDto {
  id: ShortHexGuid;
  creatorId: ShortHexGuid;
  encryptedData: HexString;
  encryptedSharesByMemberId: { [key: string]: HexString };
  /**
   * sha-3 hash of the encrypted data
   */
  checksum: ChecksumString;
  signature: HexString;
  memberIDs: ShortHexGuid[];
  sharesRequired: number;
  dateCreated: Date;
  dateUpdated: Date;
}