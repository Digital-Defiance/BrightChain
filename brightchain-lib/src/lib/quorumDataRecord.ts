import { BrightChainMember } from './brightChainMember';
import { GuidV4 } from './guid';
import { QuorumDataRecordDto } from './quorumDataRecordDto';
import { ChecksumService } from './services/checksum.service';
import { ECIESService } from './services/ecies.service';
import { ServiceProvider } from './services/service.provider';
import {
  ChecksumBuffer,
  HexString,
  ShortHexGuid,
  SignatureBuffer,
  SignatureString,
} from './types';

export class QuorumDataRecord {
  private static eciesService: ECIESService;
  private static checksumService: ChecksumService;

  private static initialize() {
    if (!QuorumDataRecord.eciesService) {
      QuorumDataRecord.eciesService = ServiceProvider.getECIESService();
    }
    if (!QuorumDataRecord.checksumService) {
      QuorumDataRecord.checksumService = ServiceProvider.getChecksumService();
    }
  }

  public readonly id: GuidV4;
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
    dateUpdated?: Date,
  ) {
    if (id !== undefined) {
      this.id = new GuidV4(id);
    } else {
      this.id = GuidV4.new();
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
    QuorumDataRecord.initialize();
    const calculatedChecksum =
      QuorumDataRecord.checksumService.calculateChecksum(encryptedData);
    if (checksum && checksum.compare(calculatedChecksum) != 0) {
      throw new Error('Invalid checksum');
    }
    this.checksum = calculatedChecksum;
    this.creator = creator;
    this.signature = signature ?? creator.sign(this.checksum);
    if (
      !QuorumDataRecord.eciesService.verifyMessage(
        creator.publicKey,
        this.checksum,
        this.signature,
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
      id: this.id.asShortHexGuid,
      creatorId: this.creator.id.asShortHexGuid,
      encryptedData: this.encryptedData.toString('hex') as HexString,
      encryptedSharesByMemberId,
      checksum: QuorumDataRecord.checksumService.checksumToHexString(
        this.checksum,
      ),
      signature: QuorumDataRecord.eciesService.signatureBufferToSignatureString(
        this.signature,
      ) as SignatureString,
      memberIDs: this.memberIDs,
      sharesRequired: this.sharesRequired,
      dateCreated: this.dateCreated.toISOString(),
      dateUpdated: this.dateUpdated.toISOString(),
    };
  }
  public static fromDto(
    dto: QuorumDataRecordDto,
    fetchMember: (memberId: ShortHexGuid) => BrightChainMember,
  ): QuorumDataRecord {
    const encryptedSharesByMemberId = new Map<ShortHexGuid, Buffer>();
    Object.keys(dto.encryptedSharesByMemberId).forEach((k) => {
      encryptedSharesByMemberId.set(
        k as ShortHexGuid,
        Buffer.from(dto.encryptedSharesByMemberId[k], 'hex'),
      );
    });
    return new QuorumDataRecord(
      fetchMember(dto.creatorId),
      dto.memberIDs,
      dto.sharesRequired,
      Buffer.from(dto.encryptedData, 'hex'),
      encryptedSharesByMemberId,
      QuorumDataRecord.checksumService.hexStringToChecksum(dto.checksum),
      QuorumDataRecord.eciesService.signatureStringToSignatureBuffer(
        dto.signature,
      ),
      dto.id,
      new Date(dto.dateCreated),
      new Date(dto.dateUpdated),
    );
  }
  public toJson(): string {
    return JSON.stringify(this.toDto());
  }
  public static fromJson(
    json: string,
    fetchMember: (memberId: ShortHexGuid) => BrightChainMember,
  ): QuorumDataRecord {
    const parsed = JSON.parse(json);
    const dto = {
      ...parsed,
      dateCreated: new Date(parsed.dateCreated),
      dateUpdated: new Date(parsed.dateUpdated),
    } as QuorumDataRecordDto;
    return QuorumDataRecord.fromDto(dto, fetchMember);
  }
}
