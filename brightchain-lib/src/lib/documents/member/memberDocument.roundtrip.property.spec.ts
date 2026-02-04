/**
 * @fileoverview Property-based tests for MemberDocument round-trip
 *
 * **Feature: member-storage-audit, Property 3: MemberDocument Round-Trip**
 * **Validates: Requirements 4.1, 4.4**
 *
 * This test suite verifies that:
 * - For any valid Member object, creating a MemberDocument, calling generateCBLs(),
 *   and then calling toMember() SHALL produce an equivalent Member object.
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
import { MemberErrorType } from '../../enumerations/memberErrorType';
import { MemberError } from '../../errors/memberError';
import { ServiceProvider } from '../../services/service.provider';
import { MemberDocument } from './memberDocument';

describe('MemberDocument Round-Trip Property Tests', () => {
  let idProvider: IIdProvider<GuidV4Uint8Array>;

  beforeEach(() => {
    // Initialize service provider
    ServiceProvider.getInstance<GuidV4Uint8Array>();
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
   * **Feature: member-storage-audit, Property 3: MemberDocument Round-Trip**
   *
   * **Validates: Requirements 4.1, 4.4**
   *
   * *For any* valid Member object, creating a MemberDocument, calling generateCBLs(),
   * and then calling toMember() SHALL produce an equivalent Member object.
   */
  describe('Property 3: MemberDocument Round-Trip', () => {
    /**
     * Property: MemberDocument round-trip should preserve all essential member fields.
     */
    it('should round-trip member through MemberDocument with all fields preserved', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate member type
          fc.constantFrom(MemberType.User, MemberType.System, MemberType.Admin),
          // Generate unique suffix for name/email
          fc.integer({ min: 1, max: 999999 }),
          async (memberType, suffix) => {
            const name = `DocTestMember${suffix}`;
            const email = `doctest${suffix}@example.com`;

            // Create original member
            const originalMember = createTestMember(memberType, name, email);

            // Create MemberDocument
            const doc = MemberDocument.create<GuidV4Uint8Array>(
              originalMember,
              originalMember, // Use same member for both public and private
            );

            // Generate CBLs
            await doc.generateCBLs();

            // Reconstruct member from CBL via toMember()
            const reconstructedMember = await doc.toMember(false);

            // Verify all essential fields match
            expect(idProvider.equals(reconstructedMember.id, originalMember.id)).toBe(true);
            expect(reconstructedMember.name).toBe(originalMember.name);
            expect(reconstructedMember.email).toEqual(originalMember.email);
            expect(reconstructedMember.type).toBe(originalMember.type);
            expect(reconstructedMember.publicKey).toEqual(originalMember.publicKey);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property: Different member types should all round-trip correctly through MemberDocument.
     */
    it('should round-trip all member types correctly through MemberDocument', async () => {
      const memberTypes = [
        MemberType.User,
        MemberType.System,
        MemberType.Admin,
      ];

      for (const memberType of memberTypes) {
        const originalMember = createTestMember(
          memberType,
          `DocTypeTest${memberType}${Date.now()}`,
          `doctypetest${memberType}${Date.now()}@example.com`,
        );

        const doc = MemberDocument.create<GuidV4Uint8Array>(
          originalMember,
          originalMember,
        );
        await doc.generateCBLs();
        const reconstructedMember = await doc.toMember(false);

        expect(reconstructedMember.type).toBe(memberType);
        expect(idProvider.equals(reconstructedMember.id, originalMember.id)).toBe(true);
      }
    });

    /**
     * Property: Members with varying name lengths should round-trip correctly through MemberDocument.
     */
    it('should round-trip members with varying name lengths through MemberDocument', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate alphanumeric name with varying length (valid member names)
          fc.string({ minLength: 3, maxLength: 50 }).map(s => s.replace(/[^a-zA-Z0-9]/g, 'x')),
          fc.integer({ min: 1, max: 999999 }),
          async (nameBase, suffix) => {
            const name = nameBase + suffix;
            const email = `docvarname${suffix}@example.com`;

            const originalMember = createTestMember(
              MemberType.User,
              name,
              email,
            );

            const doc = MemberDocument.create<GuidV4Uint8Array>(
              originalMember,
              originalMember,
            );
            await doc.generateCBLs();
            const reconstructedMember = await doc.toMember(false);

            expect(reconstructedMember.name).toBe(originalMember.name);
            expect(idProvider.equals(reconstructedMember.id, originalMember.id)).toBe(true);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property: Reconstructed member should have all required fields present.
     */
    it('should reconstruct member with all required fields present', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 999999 }),
          async (suffix) => {
            const originalMember = createTestMember(
              MemberType.User,
              `DocFieldsTest${suffix}`,
              `docfields${suffix}@example.com`,
            );

            const doc = MemberDocument.create<GuidV4Uint8Array>(
              originalMember,
              originalMember,
            );
            await doc.generateCBLs();
            const reconstructedMember = await doc.toMember(false);

            // Verify all required fields are present
            expect(reconstructedMember.id).toBeDefined();
            expect(reconstructedMember.name).toBeDefined();
            expect(reconstructedMember.email).toBeDefined();
            expect(reconstructedMember.type).toBeDefined();
            expect(reconstructedMember.publicKey).toBeDefined();

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property: toMember() should throw CBLNotGenerated error if CBLs have not been generated.
     */
    it('should throw CBLNotGenerated error when toMember() called before generateCBLs()', async () => {
      const originalMember = createTestMember(
        MemberType.User,
        'NoCBLTest',
        'nocbl@example.com',
      );

      const doc = MemberDocument.create<GuidV4Uint8Array>(
        originalMember,
        originalMember,
      );

      // toMember() should throw because CBLs have not been generated
      await expect(doc.toMember(false)).rejects.toThrow(MemberError);
      
      try {
        await doc.toMember(false);
      } catch (error) {
        expect(error).toBeInstanceOf(MemberError);
        expect((error as MemberError).type).toBe(MemberErrorType.CBLNotGenerated);
      }
    });

    /**
     * Property: Private member round-trip should also work correctly.
     */
    it('should round-trip private member correctly through MemberDocument', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(MemberType.User, MemberType.System, MemberType.Admin),
          fc.integer({ min: 1, max: 999999 }),
          async (memberType, suffix) => {
            const publicName = `DocPublic${suffix}`;
            const privateName = `DocPrivate${suffix}`;
            const publicEmail = `docpublic${suffix}@example.com`;
            const privateEmail = `docprivate${suffix}@example.com`;

            const publicMember = createTestMember(memberType, publicName, publicEmail);
            const privateMember = createTestMember(memberType, privateName, privateEmail);

            const doc = MemberDocument.create<GuidV4Uint8Array>(
              publicMember,
              privateMember,
            );
            await doc.generateCBLs();

            // Test private member round-trip
            const reconstructedPrivate = await doc.toMember(true);

            expect(idProvider.equals(reconstructedPrivate.id, privateMember.id)).toBe(true);
            expect(reconstructedPrivate.name).toBe(privateMember.name);
            expect(reconstructedPrivate.email).toEqual(privateMember.email);
            expect(reconstructedPrivate.type).toBe(privateMember.type);

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
