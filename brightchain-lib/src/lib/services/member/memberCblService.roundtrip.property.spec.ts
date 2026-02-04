/**
 * @fileoverview Property-based tests for MemberCblService member CBL round-trip
 *
 * **Feature: member-storage-audit, Property 2: Member CBL Round-Trip**
 * **Validates: Requirements 2.1, 2.2, 2.5**
 *
 * This test suite verifies that:
 * - For any valid Member object, creating a CBL via MemberCblService.createMemberCbl()
 *   then hydrating via MemberCblService.hydrateMember() SHALL produce an equivalent
 *   Member object with matching id, name, email, type, and publicKey.
 */

import {
  EmailString,
  GuidV4Uint8Array,
  Member,
  MemberType,
  IIdProvider,
} from '@digitaldefiance/ecies-lib';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import * as fc from 'fast-check';
import { BlockSize } from '../../enumerations/blockSize';
import { BlockStoreFactory } from '../../factories/blockStoreFactory';
import { ServiceProvider } from '../service.provider';
import { MemberCblService } from './memberCblService';

describe('MemberCblService Member CBL Round-Trip Property Tests', () => {
  let blockStore: ReturnType<typeof BlockStoreFactory.createMemoryStore>;
  let memberCblService: MemberCblService<GuidV4Uint8Array>;
  let idProvider: IIdProvider<GuidV4Uint8Array>;

  beforeEach(() => {
    // Initialize service provider
    ServiceProvider.getInstance<GuidV4Uint8Array>();

    // Create member store with memory block store
    blockStore = BlockStoreFactory.createMemoryStore({
      blockSize: BlockSize.Small,
    });
    memberCblService = new MemberCblService<GuidV4Uint8Array>(blockStore);
    idProvider = ServiceProvider.getInstance<GuidV4Uint8Array>().idProvider;
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  /**
   * Helper to create a test member with given parameters
   */
  function createTestMember(
    memberType: MemberType,
    name: string,
    email: string,
  ): Member<GuidV4Uint8Array> {
    const eciesService =
      ServiceProvider.getInstance<GuidV4Uint8Array>().eciesService;
    const { member } = Member.newMember<GuidV4Uint8Array>(
      eciesService,
      memberType,
      name,
      new EmailString(email),
    );
    return member;
  }

  /**
   * **Feature: member-storage-audit, Property 2: Member CBL Round-Trip**
   *
   * **Validates: Requirements 2.1, 2.2, 2.5**
   *
   * *For any* valid Member object, creating a CBL via MemberCblService.createMemberCbl()
   * then hydrating via MemberCblService.hydrateMember() SHALL produce an equivalent
   * Member object with matching id, name, email, type, and publicKey.
   */
  describe('Property 2: Member CBL Round-Trip', () => {
    /**
     * Property: Member round-trip through CBL should preserve all essential fields.
     */
    it('should round-trip member through CBL with all fields preserved', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate member type
          fc.constantFrom(MemberType.User, MemberType.System, MemberType.Admin),
          // Generate unique suffix for name/email
          fc.integer({ min: 1, max: 999999 }),
          async (memberType, suffix) => {
            const name = `TestMember${suffix}`;
            const email = `test${suffix}@example.com`;

            // Create original member
            const originalMember = createTestMember(memberType, name, email);

            // Create CBL from member
            const cbl = await memberCblService.createMemberCbl(
              originalMember,
              originalMember,
            );

            // Hydrate member from CBL
            const hydratedMember = await memberCblService.hydrateMember(cbl);

            // Verify all essential fields match
            expect(idProvider.equals(hydratedMember.id, originalMember.id)).toBe(true);
            expect(hydratedMember.name).toBe(originalMember.name);
            expect(hydratedMember.email).toEqual(originalMember.email);
            expect(hydratedMember.type).toBe(originalMember.type);
            expect(hydratedMember.publicKey).toEqual(originalMember.publicKey);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property: Different member types should all round-trip correctly.
     */
    it('should round-trip all member types correctly', async () => {
      const memberTypes = [
        MemberType.User,
        MemberType.System,
        MemberType.Admin,
      ];

      for (const memberType of memberTypes) {
        const originalMember = createTestMember(
          memberType,
          `TypeTest${memberType}${Date.now()}`,
          `typetest${memberType}${Date.now()}@example.com`,
        );

        const cbl = await memberCblService.createMemberCbl(
          originalMember,
          originalMember,
        );
        const hydratedMember = await memberCblService.hydrateMember(cbl);

        expect(hydratedMember.type).toBe(memberType);
        expect(idProvider.equals(hydratedMember.id, originalMember.id)).toBe(true);
      }
    });

    /**
     * Property: Members with varying name lengths should round-trip correctly.
     */
    it('should round-trip members with varying name lengths', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate alphanumeric name with varying length (valid member names)
          fc.string({ minLength: 3, maxLength: 50 }).map(s => s.replace(/[^a-zA-Z0-9]/g, 'x')),
          fc.integer({ min: 1, max: 999999 }),
          async (nameBase, suffix) => {
            const name = nameBase + suffix;
            const email = `varname${suffix}@example.com`;

            const originalMember = createTestMember(
              MemberType.User,
              name,
              email,
            );

            const cbl = await memberCblService.createMemberCbl(
              originalMember,
              originalMember,
            );
            const hydratedMember = await memberCblService.hydrateMember(cbl);

            expect(hydratedMember.name).toBe(originalMember.name);
            expect(idProvider.equals(hydratedMember.id, originalMember.id)).toBe(true);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property: Hydrated member should have all required fields.
     */
    it('should hydrate member with all required fields present', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 999999 }),
          async (suffix) => {
            const originalMember = createTestMember(
              MemberType.User,
              `FieldsTest${suffix}`,
              `fields${suffix}@example.com`,
            );

            const cbl = await memberCblService.createMemberCbl(
              originalMember,
              originalMember,
            );
            const hydratedMember = await memberCblService.hydrateMember(cbl);

            // Verify all required fields are present
            expect(hydratedMember.id).toBeDefined();
            expect(hydratedMember.name).toBeDefined();
            expect(hydratedMember.email).toBeDefined();
            expect(hydratedMember.type).toBeDefined();
            expect(hydratedMember.publicKey).toBeDefined();

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
