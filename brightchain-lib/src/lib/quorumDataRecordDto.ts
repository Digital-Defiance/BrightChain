import {
  ChecksumString,
  HexString,
  ShortHexGuid,
  SignatureString,
} from '@digitaldefiance/ecies-lib';

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
  dateCreated: Date;
  dateUpdated: Date;
  /** Epoch number at sealing time */
  epochNumber: number;
  /** True if the document was sealed in bootstrap mode */
  sealedUnderBootstrap: boolean;
  /** Link to identity recovery record if applicable */
  identityRecoveryRecordId?: ShortHexGuid;
}
