import {
  ChecksumString,
  ECIESService,
  HexString,
  hexToUint8Array,
  Member,
  PlatformID,
  ShortHexGuid,
  SignatureUint8Array,
  TypedIdProviderWrapper,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { createECIESService } from './browserConfig';
import { getBrightChainIdProvider } from './init';
import { QuorumDataRecordDto } from './quorumDataRecordDto';
import { ChecksumService } from './services/checksum.service';
import { Checksum } from './types/checksum';

export class QuorumDataRecord<TID extends PlatformID = Uint8Array> {
  public readonly checksumService: ChecksumService = new ChecksumService();
  public readonly eciesService: ECIESService<TID> = createECIESService<TID>();
  public readonly enhancedProvider: TypedIdProviderWrapper<TID>;

  public readonly id: TID;
  public readonly encryptedData: Uint8Array;
  public readonly encryptedSharesByMemberId: Map<ShortHexGuid, Uint8Array>;
  /**
   * sha-3 hash of the encrypted data
   */
  public readonly checksum: Checksum;
  public readonly creator: Member<TID>;
  public readonly signature: SignatureUint8Array;
  public readonly memberIDs: TID[];
  public readonly sharesRequired: number;
  public readonly dateCreated: Date;
  public readonly dateUpdated: Date;

  constructor(
    creator: Member<TID>,
    memberIDs: TID[],
    sharesRequired: number,
    encryptedData: Uint8Array,
    encryptedSharesByMemberId: Map<ShortHexGuid, Uint8Array>,
    checksum?: Checksum,
    signature?: SignatureUint8Array,
    id?: TID,
    dateCreated?: Date,
    dateUpdated?: Date,
    enhancedProvider?: TypedIdProviderWrapper<TID>,
    eciesService?: ECIESService<TID>,
  ) {
    this.enhancedProvider = enhancedProvider ?? getBrightChainIdProvider<TID>();
    this.eciesService = eciesService ?? createECIESService<TID>();
    if (id !== undefined) {
      this.id = id;
    } else {
      this.id = this.enhancedProvider.generateTyped();
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
    this.checksumService = new ChecksumService();
    this.sharesRequired = sharesRequired;
    this.encryptedData = encryptedData;
    this.encryptedSharesByMemberId = encryptedSharesByMemberId;
    const calculatedChecksum =
      this.checksumService.calculateChecksum(encryptedData);
    if (checksum && !checksum.equals(calculatedChecksum)) {
      throw new Error('Invalid checksum');
    }
    this.checksum = calculatedChecksum;
    this.creator = creator;
    this.signature =
      signature ??
      (creator.sign(this.checksum.toUint8Array()) as SignatureUint8Array);
    if (
      !this.eciesService.verifyMessage(
        creator.publicKey,
        this.checksum.toUint8Array(),
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
      encryptedSharesByMemberId[k] = uint8ArrayToHex(v) as HexString;
    });
    return {
      id: uint8ArrayToHex(
        this.enhancedProvider.toBytes(this.id),
      ) as ShortHexGuid,
      creatorId: uint8ArrayToHex(
        this.enhancedProvider.toBytes(this.creator.id),
      ) as ShortHexGuid,
      encryptedData: uint8ArrayToHex(this.encryptedData) as HexString,
      encryptedSharesByMemberId,
      checksum: this.checksum.toHex() as ChecksumString,
      signature: this.eciesService.signatureBufferToSignatureString(
        this.signature,
      ),
      memberIDs: this.memberIDs.map(
        (id) =>
          uint8ArrayToHex(this.enhancedProvider.toBytes(id)) as ShortHexGuid,
      ),
      sharesRequired: this.sharesRequired,
      dateCreated: this.dateCreated,
      dateUpdated: this.dateUpdated,
    };
  }
  public static fromDto<TID extends PlatformID = Uint8Array>(
    dto: QuorumDataRecordDto,
    fetchMember: (memberId: TID) => Member<TID>,
    enhancedProvider?: TypedIdProviderWrapper<TID>,
    eciesService?: ECIESService<TID>,
  ): QuorumDataRecord<TID> {
    const enhancedProviderToUse =
      enhancedProvider ?? getBrightChainIdProvider<TID>();
    const eciesServiceToUse = eciesService ?? createECIESService<TID>();
    const checksumService = new ChecksumService();

    const encryptedSharesByMemberId = new Map<ShortHexGuid, Uint8Array>();
    Object.keys(dto.encryptedSharesByMemberId).forEach((k) => {
      encryptedSharesByMemberId.set(
        k as ShortHexGuid,
        hexToUint8Array(dto.encryptedSharesByMemberId[k]),
      );
    });
    return new QuorumDataRecord<TID>(
      fetchMember(
        enhancedProviderToUse.fromBytes(hexToUint8Array(dto.creatorId)),
      ),
      dto.memberIDs.map(
        (id) => enhancedProviderToUse.fromBytes(hexToUint8Array(id)) as TID,
      ),
      dto.sharesRequired,
      hexToUint8Array(dto.encryptedData),
      encryptedSharesByMemberId,
      checksumService.hexStringToChecksum(dto.checksum) as Checksum,
      eciesServiceToUse.signatureStringToSignatureBuffer(dto.signature),
      enhancedProviderToUse.fromBytes(hexToUint8Array(dto.id)),
      dto.dateCreated,
      dto.dateUpdated,
    );
  }
  public toJson(): string {
    return JSON.stringify(this.toDto());
  }
  public static fromJson<TID extends PlatformID = Uint8Array>(
    json: string,
    fetchMember: (memberId: TID) => Member<TID>,
    enhancedProvider?: TypedIdProviderWrapper<TID>,
    eciesService?: ECIESService<TID>,
  ): QuorumDataRecord<TID> {
    const dto = JSON.parse(json) as QuorumDataRecordDto;
    return QuorumDataRecord.fromDto<TID>(
      dto,
      fetchMember,
      enhancedProvider,
      eciesService,
    );
  }
}
