import { BrightChainMember } from './brightChainMember';
import { StaticHelpersChecksum } from './staticHelpers.checksum';
import { GuidV4 } from './guid';
import { ChecksumBuffer, HexString, ShortHexGuid, SignatureBuffer } from './types';
import { EthereumECIES } from './ethereumECIES';
import { QuorumDataRecordDto } from './quorumDataRecordDto';

export class QuorumDataRecord {
  public readonly id: ShortHexGuid;
  public readonly encryptedData: Buffer;
  public readonly encryptedSharesByMemberId: Map<ShortHexGuid, Buffer>;
  /**
   * sha-3 hash of the encrypted data
   */
  public readonly checksum: ChecksumBuffer;
  public readonly creator: BrightChainMember;
  public readonly signature: SignatureBuffer;
  public readonly memberIDs: ShortHexGuid[];
  public readonly sharesRequired: number;
  public readonly dateCreated: Date;
  public readonly dateUpdated: Date;

  constructor(
    creator: BrightChainMember,
    memberIDs: ShortHexGuid[],
    sharesRequired: number,
    encryptedData: Buffer,
    encryptedSharesByMemberId: Map<ShortHexGuid, Buffer>,
    checksum?: ChecksumBuffer,
    signature?: SignatureBuffer,
    id?: ShortHexGuid,
    dateCreated?: Date,
    dateUpdated?: Date
  ) {
    if (id !== undefined) {
      this.id = new GuidV4(id).asShortHexGuid;
    } else {
      this.id = GuidV4.new().asShortHexGuid;
    }

    if (memberIDs.length != 0 && memberIDs.length < 2) {
      throw new Error('Must share with at least 2 members');
    }
    this.memberIDs = memberIDs;
    if (sharesRequired != -1 && sharesRequired > memberIDs.length) {
      throw new Error('Shares required exceeds number of members');
    }
    if (sharesRequired != -1 && sharesRequired < 2) {
      throw new Error('Shares required must be at least 2');
    }
    this.sharesRequired = sharesRequired;
    this.encryptedData = encryptedData;
    this.encryptedSharesByMemberId = encryptedSharesByMemberId;
    const calculatedChecksum =
      StaticHelpersChecksum.calculateChecksum(encryptedData);
    if (checksum && checksum.compare(calculatedChecksum) != 0) {
      throw new Error('Invalid checksum');
    }
    this.checksum = calculatedChecksum;
    this.creator = creator;
    this.signature = signature ?? creator.sign(this.checksum);
    if (
      !EthereumECIES.verifyMessage(
        creator.publicKey,
        this.checksum,
        this.signature
      )
    ) {
      throw new Error('Invalid signature');
    }

    // don't create a new date object with nearly identical values to the existing one
    let _now: null | Date = null;
    const now = function () {
      if (!_now) {
        _now = new Date();
      }
      return _now;
    };
    this.dateCreated = dateCreated ?? now();
    this.dateUpdated = dateUpdated ?? now();
  }
  public toDto(): QuorumDataRecordDto {
    const encryptedSharesByMemberId: { [key: string]: HexString } = {};
    this.encryptedSharesByMemberId.forEach((v, k) => {
      encryptedSharesByMemberId[k] = v.toString('hex') as HexString;
    });
    return {
      id: this.id,
      creatorId: this.creator.id,
      encryptedData: this.encryptedData.toString('hex') as HexString,
      encryptedSharesByMemberId,
      checksum: StaticHelpersChecksum.checksumBufferToChecksumString(
        this.checksum
      ),
      signature: EthereumECIES.signatureBufferToSignatureString(this.signature),
      memberIDs: this.memberIDs,
      sharesRequired: this.sharesRequired,
      dateCreated: this.dateCreated,
      dateUpdated: this.dateUpdated,
    };
  }
  public static fromDto(dto: QuorumDataRecordDto, fetchMember: (memberId: ShortHexGuid) => BrightChainMember): QuorumDataRecord {
    const encryptedSharesByMemberId = new Map<ShortHexGuid, Buffer>();
    Object.keys(dto.encryptedSharesByMemberId).forEach((k) => {
      encryptedSharesByMemberId.set(
        k as ShortHexGuid,
        Buffer.from(dto.encryptedSharesByMemberId[k], 'hex')
      );
    });
    return new QuorumDataRecord(
      fetchMember(dto.creatorId),
      dto.memberIDs,
      dto.sharesRequired,
      Buffer.from(dto.encryptedData, 'hex'),
      encryptedSharesByMemberId,
      StaticHelpersChecksum.checksumStringToChecksumBuffer(dto.checksum),
      EthereumECIES.signatureStringToSignatureBuffer(dto.signature),
      dto.id,
      dto.dateCreated,
      dto.dateUpdated
    );
  }
  public toJson(): string {
    return JSON.stringify(this.toDto());
  }
  public static fromJson(json: string, fetchMember: (memberId: ShortHexGuid) => BrightChainMember): QuorumDataRecord {
    const dto = JSON.parse(json) as QuorumDataRecordDto;
    return QuorumDataRecord.fromDto(dto, fetchMember);
  }
}
