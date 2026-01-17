/**
 * @fileoverview Property-based tests for QuorumDataRecord serialization
 *
 * **Feature: backend-blockstore-quorum, Property 28: QuorumDataRecord Serialization Round-Trip**
 * **Validates: Requirements 16.1**
 *
 * This test suite verifies that:
 * - QuorumDataRecord can be serialized to DTO and back without data loss
 * - QuorumDataRecord can be serialized to JSON and back without data loss
 * - All fields are preserved through serialization round-trips
 */

import fc from 'fast-check';
import {
  EmailString,
  GuidV4,
  IMemberWithMnemonic,
  Member,
  ShortHexGuid,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { MemberType } from './enumerations/memberType';
import { initializeBrightChain } from './init';
import { QuorumDataRecord } from './quorumDataRecord';
import { SealingService } from './services/sealing.service';
import { ServiceLocator } from './services/serviceLocator';
import { ServiceProvider } from './services/service.provider';

// Set a longer timeout for all tests in this file
jest.setTimeout(60000);

describe('QuorumDataRecord Serialization Property Tests', () => {
  beforeAll(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance<GuidV4>());
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  /**
   * Helper to create a test member with random data
   */
  function createTestMember(
    name: string,
    email: string,
  ): IMemberWithMnemonic<GuidV4> {
    const eciesService = ServiceProvider.getInstance<GuidV4>().eciesService;
    return Member.newMember<GuidV4>(
      eciesService,
      MemberType.User,
      name,
      new EmailString(email),
    );
  }

  /**
   * Helper to create a QuorumDataRecord by sealing a document
   */
  async function createQuorumDataRecord(
    document: unknown,
    memberCount: number,
    sharesRequired: number,
  ): Promise<{
    record: QuorumDataRecord<GuidV4>;
    members: IMemberWithMnemonic<GuidV4>[];
  }> {
    const serviceProvider = ServiceProvider.getInstance<GuidV4>();
    const sealingService = new SealingService<GuidV4>(
      serviceProvider.eciesService,
      serviceProvider.idProvider,
    );

    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);

    // Create members
    const members: IMemberWithMnemonic<GuidV4>[] = [];
    for (let i = 0; i < memberCount; i++) {
      const uniqueSuffix = `${timestamp}${random}${i}`;
      const memberWithMnemonic = createTestMember(
        `Member${i}`,
        `member${uniqueSuffix}@example.com`,
      );
      members.push(memberWithMnemonic);
    }

    // Seal the document
    const record = await sealingService.quorumSeal(
      members[0].member,
      document,
      members.map((m) => m.member),
      sharesRequired,
    );

    return { record, members };
  }

  describe('Property 28: QuorumDataRecord Serialization Round-Trip', () => {
    /**
     * Property: For any valid QuorumDataRecord, serializing to DTO and back
     * SHALL preserve all data fields.
     *
     * **Validates: Requirements 16.1**
     */
    it('should preserve all fields through DTO round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a simple document object
          fc.record({
            title: fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,29}$/),
            content: fc.stringMatching(/^[A-Za-z0-9 ]{0,100}$/),
            value: fc.integer({ min: 0, max: 1000000 }),
          }),
          async (document) => {
            const { record, members } = await createQuorumDataRecord(
              document,
              3,
              2,
            );

            // Create a member lookup function for deserialization
            const memberMap = new Map<string, Member<GuidV4>>();
            for (const m of members) {
              const hexId = uint8ArrayToHex(m.member.idBytes) as ShortHexGuid;
              memberMap.set(hexId, m.member);
            }

            const fetchMember = (memberId: GuidV4): Member<GuidV4> => {
              const serviceProvider = ServiceProvider.getInstance<GuidV4>();
              const hexId = uint8ArrayToHex(
                serviceProvider.idProvider.toBytes(memberId),
              ) as ShortHexGuid;
              const member = memberMap.get(hexId);
              if (!member) {
                throw new Error(`Member not found: ${hexId}`);
              }
              return member;
            };

            // Serialize to DTO
            const dto = record.toDto();

            // Deserialize from DTO
            const serviceProvider = ServiceProvider.getInstance<GuidV4>();
            const restored = QuorumDataRecord.fromDto<GuidV4>(
              dto,
              fetchMember,
              serviceProvider.idProvider,
              serviceProvider.eciesService,
            );

            // Verify all fields match (using hex comparison for Uint8Arrays)
            expect(
              uint8ArrayToHex(serviceProvider.idProvider.toBytes(restored.id)),
            ).toBe(
              uint8ArrayToHex(serviceProvider.idProvider.toBytes(record.id)),
            );
            expect(uint8ArrayToHex(restored.encryptedData)).toBe(
              uint8ArrayToHex(record.encryptedData),
            );
            expect(uint8ArrayToHex(restored.checksum)).toBe(
              uint8ArrayToHex(record.checksum),
            );
            expect(uint8ArrayToHex(restored.signature)).toBe(
              uint8ArrayToHex(record.signature),
            );
            expect(restored.sharesRequired).toBe(record.sharesRequired);
            expect(restored.memberIDs.length).toBe(record.memberIDs.length);

            // Verify encrypted shares match
            expect(restored.encryptedSharesByMemberId.size).toBe(
              record.encryptedSharesByMemberId.size,
            );
            for (const [key, value] of record.encryptedSharesByMemberId) {
              expect(restored.encryptedSharesByMemberId.has(key)).toBe(true);
              expect(
                uint8ArrayToHex(restored.encryptedSharesByMemberId.get(key)!),
              ).toBe(uint8ArrayToHex(value));
            }
          },
        ),
        { numRuns: 10 },
      );
    });

    /**
     * Property: For any valid QuorumDataRecord, serializing to JSON and back
     * SHALL preserve all data fields.
     *
     * **Validates: Requirements 16.1**
     */
    it('should preserve all fields through JSON round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            data: fc.stringMatching(/^[A-Za-z0-9]{1,50}$/),
            count: fc.integer({ min: 1, max: 100 }),
          }),
          async (document) => {
            const { record, members } = await createQuorumDataRecord(
              document,
              4,
              3,
            );

            // Create a member lookup function for deserialization
            const memberMap = new Map<string, Member<GuidV4>>();
            for (const m of members) {
              const hexId = uint8ArrayToHex(m.member.idBytes) as ShortHexGuid;
              memberMap.set(hexId, m.member);
            }

            const fetchMember = (memberId: GuidV4): Member<GuidV4> => {
              const serviceProvider = ServiceProvider.getInstance<GuidV4>();
              const hexId = uint8ArrayToHex(
                serviceProvider.idProvider.toBytes(memberId),
              ) as ShortHexGuid;
              const member = memberMap.get(hexId);
              if (!member) {
                throw new Error(`Member not found: ${hexId}`);
              }
              return member;
            };

            // Serialize to JSON
            const json = record.toJson();

            // Verify JSON is valid
            expect(() => JSON.parse(json)).not.toThrow();

            // Deserialize from JSON
            const serviceProvider = ServiceProvider.getInstance<GuidV4>();
            const restored = QuorumDataRecord.fromJson<GuidV4>(
              json,
              fetchMember,
              serviceProvider.idProvider,
              serviceProvider.eciesService,
            );

            // Verify all fields match (using hex comparison for Uint8Arrays)
            expect(
              uint8ArrayToHex(serviceProvider.idProvider.toBytes(restored.id)),
            ).toBe(
              uint8ArrayToHex(serviceProvider.idProvider.toBytes(record.id)),
            );
            expect(uint8ArrayToHex(restored.encryptedData)).toBe(
              uint8ArrayToHex(record.encryptedData),
            );
            expect(uint8ArrayToHex(restored.checksum)).toBe(
              uint8ArrayToHex(record.checksum),
            );
            expect(uint8ArrayToHex(restored.signature)).toBe(
              uint8ArrayToHex(record.signature),
            );
            expect(restored.sharesRequired).toBe(record.sharesRequired);
            expect(restored.memberIDs.length).toBe(record.memberIDs.length);
          },
        ),
        { numRuns: 10 },
      );
    });

    /**
     * Property: The DTO format should be JSON-serializable.
     *
     * **Validates: Requirements 16.1**
     */
    it('should produce JSON-serializable DTOs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            message: fc.stringMatching(/^[A-Za-z0-9 ]{1,30}$/),
          }),
          async (document) => {
            const { record } = await createQuorumDataRecord(document, 2, 2);

            // Serialize to DTO
            const dto = record.toDto();

            // Verify DTO can be JSON serialized and deserialized
            const jsonString = JSON.stringify(dto);
            const parsed = JSON.parse(jsonString);

            // Verify structure is preserved
            expect(parsed.id).toBe(dto.id);
            expect(parsed.creatorId).toBe(dto.creatorId);
            expect(parsed.encryptedData).toBe(dto.encryptedData);
            expect(parsed.checksum).toBe(dto.checksum);
            expect(parsed.signature).toBe(dto.signature);
            expect(parsed.sharesRequired).toBe(dto.sharesRequired);
            expect(parsed.memberIDs).toEqual(dto.memberIDs);
            expect(Object.keys(parsed.encryptedSharesByMemberId)).toEqual(
              Object.keys(dto.encryptedSharesByMemberId),
            );
          },
        ),
        { numRuns: 15 },
      );
    });

    /**
     * Property: Serialization should preserve member ID ordering.
     *
     * **Validates: Requirements 16.1**
     */
    it('should preserve member ID ordering through serialization', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            secret: fc.stringMatching(/^[A-Za-z0-9]{1,20}$/),
          }),
          async (document) => {
            const { record, members } = await createQuorumDataRecord(
              document,
              5,
              3,
            );

            // Create a member lookup function for deserialization
            const memberMap = new Map<string, Member<GuidV4>>();
            for (const m of members) {
              const hexId = uint8ArrayToHex(m.member.idBytes) as ShortHexGuid;
              memberMap.set(hexId, m.member);
            }

            const fetchMember = (memberId: GuidV4): Member<GuidV4> => {
              const serviceProvider = ServiceProvider.getInstance<GuidV4>();
              const hexId = uint8ArrayToHex(
                serviceProvider.idProvider.toBytes(memberId),
              ) as ShortHexGuid;
              const member = memberMap.get(hexId);
              if (!member) {
                throw new Error(`Member not found: ${hexId}`);
              }
              return member;
            };

            // Serialize and deserialize
            const dto = record.toDto();
            const serviceProvider = ServiceProvider.getInstance<GuidV4>();
            const restored = QuorumDataRecord.fromDto<GuidV4>(
              dto,
              fetchMember,
              serviceProvider.idProvider,
              serviceProvider.eciesService,
            );

            // Verify member IDs are in the same order
            expect(restored.memberIDs.length).toBe(record.memberIDs.length);
            for (let i = 0; i < record.memberIDs.length; i++) {
              const originalHex = uint8ArrayToHex(
                serviceProvider.idProvider.toBytes(record.memberIDs[i]),
              );
              const restoredHex = uint8ArrayToHex(
                serviceProvider.idProvider.toBytes(restored.memberIDs[i]),
              );
              expect(restoredHex).toBe(originalHex);
            }
          },
        ),
        { numRuns: 10 },
      );
    });
  });
});
