/**
 * @fileoverview Property-based tests for QuorumService member management
 *
 * **Feature: backend-blockstore-quorum, Property 6: Member Management Round-Trip**
 * **Validates: Requirements 7.1, 7.3, 7.4**
 *
 * This test suite verifies that:
 * - Adding a member and retrieving by ID returns the same public key and metadata
 * - The member list contains all added active members
 * - Removed members are marked inactive but still retrievable
 */

import fc from 'fast-check';
import {
  EmailString,
  GuidV4,
  Member,
  ShortHexGuid,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { MemberType } from '../enumerations/memberType';
import { initializeBrightChain } from '../init';
import { QuorumMemberMetadata } from '../interfaces/services/quorumService';
import { QuorumService } from './quorumService';
import { ServiceProvider } from './service.provider';
import { ServiceLocator } from './serviceLocator';

describe('QuorumService Member Management Property Tests', () => {
  let quorumService: QuorumService<GuidV4>;

  beforeAll(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance<GuidV4>());
  });

  beforeEach(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance<GuidV4>());
    quorumService = new QuorumService<GuidV4>();
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  /**
   * Helper to create a test member with random data
   */
  function createTestMember(name: string, email: string) {
    const eciesService = ServiceProvider.getInstance<GuidV4>().eciesService;
    return Member.newMember<GuidV4>(
      eciesService,
      MemberType.User,
      name,
      new EmailString(email),
    );
  }

  describe('Property 6: Member Management Round-Trip', () => {
    /**
     * Property: For any valid member public key and metadata, adding the member
     * and then retrieving the member by ID SHALL return the same public key and metadata.
     *
     * **Validates: Requirements 7.1, 7.3**
     */
    it('should return same public key and metadata after add and retrieve', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid names: alphanumeric starting with letter, no leading/trailing spaces
          fc.stringMatching(/^[A-Za-z][A-Za-z0-9]{0,49}$/),
          fc.integer({ min: 1, max: 10000 }),
          fc.option(fc.stringMatching(/^[A-Za-z][A-Za-z0-9]{0,19}$/)),
          async (name, emailSuffix, role) => {
            const testService = new QuorumService<GuidV4>();
            const email = `test${emailSuffix}@example.com`;

            // Create a member
            const memberWithMnemonic = createTestMember(name, email);
            const member = memberWithMnemonic.member;

            const metadata: QuorumMemberMetadata = {
              name,
              email,
              role: role ?? undefined,
            };

            // Add member to quorum
            const addedMember = await testService.addMember(member, metadata);

            // Retrieve member by ID
            const retrievedMember = await testService.getMember(addedMember.id);

            // Verify member was retrieved
            expect(retrievedMember).not.toBeNull();

            // Verify public key matches
            expect(retrievedMember!.publicKey).toEqual(member.publicKey);

            // Verify metadata matches
            expect(retrievedMember!.metadata.name).toBe(name);
            expect(retrievedMember!.metadata.email).toBe(email);
            if (role) {
              expect(retrievedMember!.metadata.role).toBe(role);
            }

            // Verify member is active
            expect(retrievedMember!.isActive).toBe(true);
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property: The member list SHALL contain all added active members.
     *
     * **Validates: Requirements 7.4**
     */
    it('should list all added active members', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }),
          async (memberCount) => {
            const testService = new QuorumService<GuidV4>();
            const addedMemberIds: ShortHexGuid[] = [];

            // Add multiple members with unique emails using timestamp + index + random
            const timestamp = Date.now();
            const random = Math.floor(Math.random() * 1000000);
            for (let i = 0; i < memberCount; i++) {
              const uniqueSuffix = `${timestamp}${random}${i}`;
              const memberWithMnemonic = createTestMember(
                `Member${i}`,
                `member${uniqueSuffix}@example.com`,
              );
              const metadata: QuorumMemberMetadata = {
                name: `Member${i}`,
                email: `member${uniqueSuffix}@example.com`,
              };

              const addedMember = await testService.addMember(
                memberWithMnemonic.member,
                metadata,
              );
              addedMemberIds.push(addedMember.id);
            }

            // List all members
            const listedMembers = await testService.listMembers();

            // Verify count matches
            expect(listedMembers.length).toBe(memberCount);

            // Verify all added members are in the list
            for (const memberId of addedMemberIds) {
              const found = listedMembers.find((m) => m.id === memberId);
              expect(found).toBeDefined();
              expect(found!.isActive).toBe(true);
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    /**
     * Property: Removed members should be marked inactive but still retrievable.
     *
     * **Validates: Requirements 7.2**
     */
    it('should mark removed members as inactive but keep them retrievable', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid names: alphanumeric starting with letter
          fc.stringMatching(/^[A-Za-z][A-Za-z0-9]{0,49}$/),
          async (name) => {
            const testService = new QuorumService<GuidV4>();
            const timestamp = Date.now();

            // Create and add a member
            const memberWithMnemonic = createTestMember(
              name,
              `test${timestamp}@example.com`,
            );
            const metadata: QuorumMemberMetadata = {
              name,
              email: `test${timestamp}@example.com`,
            };

            const addedMember = await testService.addMember(
              memberWithMnemonic.member,
              metadata,
            );

            // Remove the member
            await testService.removeMember(addedMember.id);

            // Member should still be retrievable
            const retrievedMember = await testService.getMember(addedMember.id);
            expect(retrievedMember).not.toBeNull();

            // Member should be marked inactive
            expect(retrievedMember!.isActive).toBe(false);

            // Member should not appear in active list
            const listedMembers = await testService.listMembers();
            const found = listedMembers.find((m) => m.id === addedMember.id);
            expect(found).toBeUndefined();
          },
        ),
        { numRuns: 30 },
      );
    });

    /**
     * Property: Getting a non-existent member should return null.
     */
    it('should return null for non-existent member', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 32, maxLength: 64 }),
          async (randomId) => {
            const testService = new QuorumService<GuidV4>();

            const member = await testService.getMember(
              randomId as ShortHexGuid,
            );
            expect(member).toBeNull();
          },
        ),
        { numRuns: 20 },
      );
    });
  });
});
