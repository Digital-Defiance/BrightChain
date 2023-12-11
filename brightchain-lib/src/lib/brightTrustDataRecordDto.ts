import {
  ChecksumString,
  HexString,
  SignatureString,
} from '@digitaldefiance/ecies-lib';

export interface BrightTrustDataRecordDto {
  id: HexString;
  creatorId: HexString;
  encryptedData: HexString;
  encryptedSharesByMemberId: { [key: string]: HexString };
  /**
   * sha-3 hash of the encrypted data
   */
  checksum: ChecksumString;
  signature: SignatureString;
  memberIDs: HexString[];
  sharesRequired: number;
  dateCreated: Date;
  dateUpdated: Date;
  /** Epoch number at sealing time */
  epochNumber: number;
  /** True if the document was sealed in bootstrap mode */
  sealedUnderBootstrap: boolean;
  /** Link to identity recovery record if applicable */
  identityRecoveryRecordId?: HexString;
}
