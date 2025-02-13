import { randomBytes } from 'crypto';
import { BrightChainMember } from './brightChainMember';
import { EmailString } from './emailString';
import MemberType from './enumerations/memberType';
import { QuorumDataRecord } from './quorumDataRecord';
import { ChecksumService } from './services/checksum.service';
import { ECIESService } from './services/ecies.service';
import { ServiceProvider } from './services/service.provider';
import { ChecksumBuffer, ShortHexGuid } from './types';

describe('QuorumDataRecord', () => {
  let creator: BrightChainMember;
  let member1: BrightChainMember;
  let member2: BrightChainMember;
  let checksumService: ChecksumService;
  let eciesService: ECIESService;

  beforeAll(() => {
    checksumService = ServiceProvider.getChecksumService();
    eciesService = ServiceProvider.getECIESService();

    // Create test members
    creator = BrightChainMember.newMember(
      MemberType.User,
      'Creator',
      new EmailString('creator@example.com'),
    ).member;

    member1 = BrightChainMember.newMember(
      MemberType.User,
      'Member 1',
      new EmailString('member1@example.com'),
    ).member;

    member2 = BrightChainMember.newMember(
      MemberType.User,
      'Member 2',
      new EmailString('member2@example.com'),
    ).member;
  });

  describe('constructor', () => {
    it('should create record with valid data', () => {
      const encryptedData = randomBytes(32);
      const encryptedShares = new Map<ShortHexGuid, Buffer>([
        [member1.id.asShortHexGuid, randomBytes(32)],
        [member2.id.asShortHexGuid, randomBytes(32)],
      ]);

      const record = new QuorumDataRecord(
        creator,
        [member1.id.asShortHexGuid, member2.id.asShortHexGuid],
        2,
        encryptedData,
        encryptedShares,
      );

      expect(record.creator).toBe(creator);
      expect(record.memberIDs).toHaveLength(2);
      expect(record.sharesRequired).toBe(2);
      expect(record.encryptedData).toEqual(encryptedData);
      expect(record.encryptedSharesByMemberId).toEqual(encryptedShares);
      expect(record.checksum).toEqual(
        checksumService.calculateChecksum(encryptedData),
      );
      expect(
        eciesService.verifyMessage(
          creator.publicKey,
          record.checksum,
          record.signature,
        ),
      ).toBe(true);
    });

    it('should validate minimum members', () => {
      const encryptedData = randomBytes(32);
      const encryptedShares = new Map<ShortHexGuid, Buffer>([
        [member1.id.asShortHexGuid, randomBytes(32)],
      ]);

      expect(
        () =>
          new QuorumDataRecord(
            creator,
            [member1.id.asShortHexGuid],
            1,
            encryptedData,
            encryptedShares,
          ),
      ).toThrow('Must share with at least 2 members');
    });

    it('should validate shares required', () => {
      const encryptedData = randomBytes(32);
      const encryptedShares = new Map<ShortHexGuid, Buffer>([
        [member1.id.asShortHexGuid, randomBytes(32)],
        [member2.id.asShortHexGuid, randomBytes(32)],
      ]);

      expect(
        () =>
          new QuorumDataRecord(
            creator,
            [member1.id.asShortHexGuid, member2.id.asShortHexGuid],
            3,
            encryptedData,
            encryptedShares,
          ),
      ).toThrow('Shares required exceeds number of members');

      expect(
        () =>
          new QuorumDataRecord(
            creator,
            [member1.id.asShortHexGuid, member2.id.asShortHexGuid],
            1,
            encryptedData,
            encryptedShares,
          ),
      ).toThrow('Shares required must be at least 2');
    });

    it('should validate checksum', () => {
      const encryptedData = randomBytes(32);
      const encryptedShares = new Map<ShortHexGuid, Buffer>([
        [member1.id.asShortHexGuid, randomBytes(32)],
        [member2.id.asShortHexGuid, randomBytes(32)],
      ]);
      const invalidChecksum = randomBytes(
        checksumService.checksumBufferLength,
      ) as ChecksumBuffer;

      expect(
        () =>
          new QuorumDataRecord(
            creator,
            [member1.id.asShortHexGuid, member2.id.asShortHexGuid],
            2,
            encryptedData,
            encryptedShares,
            invalidChecksum,
          ),
      ).toThrow('Invalid checksum');
    });
  });

  describe('DTO conversion', () => {
    it('should convert to and from DTO', () => {
      const encryptedData = randomBytes(32);
      const encryptedShares = new Map<ShortHexGuid, Buffer>([
        [member1.id.asShortHexGuid, randomBytes(32)],
        [member2.id.asShortHexGuid, randomBytes(32)],
      ]);

      const record = new QuorumDataRecord(
        creator,
        [member1.id.asShortHexGuid, member2.id.asShortHexGuid],
        2,
        encryptedData,
        encryptedShares,
      );

      const dto = record.toDto();
      const fetchMember = (id: ShortHexGuid) => {
        if (id === creator.id.asShortHexGuid) return creator;
        if (id === member1.id.asShortHexGuid) return member1;
        if (id === member2.id.asShortHexGuid) return member2;
        throw new Error('Member not found');
      };

      const reconstructed = QuorumDataRecord.fromDto(dto, fetchMember);

      expect(reconstructed.id.equals(record.id)).toBe(true);
      expect(reconstructed.creator).toBe(creator);
      expect(reconstructed.memberIDs).toEqual(record.memberIDs);
      expect(reconstructed.sharesRequired).toBe(record.sharesRequired);
      expect(reconstructed.encryptedData).toEqual(record.encryptedData);
      expect(reconstructed.checksum).toEqual(record.checksum);
      expect(reconstructed.signature).toEqual(record.signature);
      expect(reconstructed.dateCreated).toEqual(record.dateCreated);
      expect(reconstructed.dateUpdated).toEqual(record.dateUpdated);

      // Compare encrypted shares
      expect(reconstructed.encryptedSharesByMemberId.size).toBe(
        record.encryptedSharesByMemberId.size,
      );
      record.encryptedSharesByMemberId.forEach((value, key) => {
        expect(reconstructed.encryptedSharesByMemberId.get(key)).toEqual(value);
      });
    });

    it('should handle JSON serialization', () => {
      const encryptedData = randomBytes(32);
      const encryptedShares = new Map<ShortHexGuid, Buffer>([
        [member1.id.asShortHexGuid, randomBytes(32)],
        [member2.id.asShortHexGuid, randomBytes(32)],
      ]);

      const record = new QuorumDataRecord(
        creator,
        [member1.id.asShortHexGuid, member2.id.asShortHexGuid],
        2,
        encryptedData,
        encryptedShares,
      );

      const json = record.toJson();
      const fetchMember = (id: ShortHexGuid) => {
        if (id === creator.id.asShortHexGuid) return creator;
        if (id === member1.id.asShortHexGuid) return member1;
        if (id === member2.id.asShortHexGuid) return member2;
        throw new Error('Member not found');
      };

      const reconstructed = QuorumDataRecord.fromJson(json, fetchMember);

      expect(reconstructed.id.equals(record.id)).toBe(true);
      expect(reconstructed.creator).toBe(creator);
      expect(reconstructed.memberIDs).toEqual(record.memberIDs);
      expect(reconstructed.sharesRequired).toBe(record.sharesRequired);
      expect(reconstructed.encryptedData).toEqual(record.encryptedData);
      expect(reconstructed.checksum).toEqual(record.checksum);
      expect(reconstructed.signature).toEqual(record.signature);
      expect(reconstructed.dateCreated).toEqual(record.dateCreated);
      expect(reconstructed.dateUpdated).toEqual(record.dateUpdated);

      // Compare encrypted shares
      expect(reconstructed.encryptedSharesByMemberId.size).toBe(
        record.encryptedSharesByMemberId.size,
      );
      record.encryptedSharesByMemberId.forEach((value, key) => {
        expect(reconstructed.encryptedSharesByMemberId.get(key)).toEqual(value);
      });
    });
  });
});
