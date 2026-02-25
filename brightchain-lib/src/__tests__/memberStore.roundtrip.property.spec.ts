/**
 * @fileoverview Property-based tests for MemberStore round-trip operations
 *
 * **Feature: brightchain-user-management**
 *
 * Properties tested:
 * - Property 17: Member creation round-trip
 * - Property 18: Profile update round-trip
 * - Property 19: Password hash storage round-trip
 */

import {
  EmailString,
  GuidV4Uint8Array,
  MemberType,
} from '@digitaldefiance/ecies-lib';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import * as fc from 'fast-check';
import { BlockSize } from '../lib/enumerations/blockSize';
import { BlockStoreFactory } from '../lib/factories/blockStoreFactory';
import { INewMemberData } from '../lib/interfaces/member/memberData';
import { MemberStore } from '../lib/services/memberStore';
import { ServiceProvider } from '../lib/services/service.provider';

describe('MemberStore Round-Trip Property Tests', () => {
  let blockStore: ReturnType<typeof BlockStoreFactory.createMemoryStore>;
  let memberStore: MemberStore<GuidV4Uint8Array>;

  beforeEach(() => {
    ServiceProvider.getInstance<GuidV4Uint8Array>();
    blockStore = BlockStoreFactory.createMemoryStore({
      blockSize: BlockSize.Small,
    });
    memberStore = new MemberStore<GuidV4Uint8Array>(blockStore);
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  /**
   * Feature: brightchain-user-management, Property 17: Member creation round-trip
   *
   * **Validates: Requirements 9.1**
   *
   * For any valid member creation input (name, email, type), creating a member
   * via MemberStore.createMember then retrieving via MemberStore.getMember
   * should produce a member whose name, email, type, and publicKey match
   * the original input.
   */
  describe('Property 17: Member creation round-trip', () => {
    // Generator for valid member names: alphanumeric, 3-30 chars, no leading/trailing whitespace
    const validNameArb = fc
      .tuple(
        fc.stringMatching(/^[a-z][a-z0-9]{2,29}$/),
        fc.integer({ min: 0, max: 999999 }),
      )
      .map(([base, suffix]) => `${base}${suffix}`);

    // Generator for valid email local parts
    const validEmailArb = fc
      .tuple(
        fc.stringMatching(/^[a-z][a-z0-9]{2,10}$/),
        fc.integer({ min: 0, max: 999999 }),
      )
      .map(([local, suffix]) => `${local}${suffix}@test.example.com`);

    // Generator for member types (excluding Anonymous which may have restrictions)
    const memberTypeArb = fc.constantFrom(
      MemberType.User,
      MemberType.Admin,
      MemberType.System,
    );

    it('should preserve name, email, type, and publicKey through createMember → getMember', async () => {
      let counter = 0;
      await fc.assert(
        fc.asyncProperty(
          validNameArb,
          validEmailArb,
          memberTypeArb,
          async (nameBase, emailBase, memberType) => {
            // Ensure uniqueness across iterations
            counter++;
            const name = `${nameBase}r${counter}`;
            const email = `r${counter}${emailBase}`;

            const memberData: INewMemberData = {
              type: memberType,
              name,
              contactEmail: new EmailString(email),
            };

            // Create member
            const { reference } = await memberStore.createMember(memberData);

            // Retrieve member
            const retrieved = await memberStore.getMember(reference.id);

            // Verify round-trip preserves fields
            expect(retrieved.name).toBe(name);
            expect(retrieved.email.toString()).toBe(email);
            expect(retrieved.type).toBe(memberType);
            expect(retrieved.publicKey).toBeDefined();
            expect(retrieved.publicKey.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Feature: brightchain-user-management, Property 18: Profile update round-trip
   *
   * **Validates: Requirements 9.2**
   *
   * For any valid profile update input (settings changes), updating a member
   * profile via MemberStore.updateMember then retrieving via
   * MemberStore.getMemberProfile should produce a profile whose updated
   * fields match the input.
   */
  describe('Property 18: Profile update round-trip', () => {
    const settingsArb = fc.record({
      autoReplication: fc.boolean(),
      minRedundancy: fc.integer({ min: 1, max: 10 }),
      preferredRegions: fc.array(fc.stringMatching(/^[a-z]{2}-[a-z]{2,10}$/), {
        minLength: 0,
        maxLength: 5,
      }),
    });

    it('should preserve updated settings through updateMember → getMemberProfile', async () => {
      let counter = 0;
      await fc.assert(
        fc.asyncProperty(settingsArb, async (newSettings) => {
          counter++;
          const name = `profupd${counter}`;
          const email = `profupd${counter}@test.example.com`;

          // Create member first
          const memberData: INewMemberData = {
            type: MemberType.User,
            name,
            contactEmail: new EmailString(email),
          };
          const { reference } = await memberStore.createMember(memberData);

          // Update with new settings
          await memberStore.updateMember(reference.id, {
            id: reference.id,
            privateChanges: {
              settings: newSettings,
            },
          });

          // Retrieve profile
          const profile = await memberStore.getMemberProfile(reference.id);

          // Verify settings were persisted
          expect(profile.privateProfile).not.toBeNull();
          expect(profile.privateProfile!.settings.autoReplication).toBe(
            newSettings.autoReplication,
          );
          expect(profile.privateProfile!.settings.minRedundancy).toBe(
            newSettings.minRedundancy,
          );
          expect(profile.privateProfile!.settings.preferredRegions).toEqual(
            newSettings.preferredRegions,
          );
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Feature: brightchain-user-management, Property 19: Password hash storage round-trip
   *
   * **Validates: Requirements 9.3**
   *
   * For any valid bcrypt hash string, storing it via updateMember with
   * privateChanges.passwordHash then retrieving via getMemberProfile
   * should return the identical hash string in privateProfile.passwordHash.
   */
  describe('Property 19: Password hash storage round-trip', () => {
    // Generator for bcrypt-like hash strings: $2b$10$ followed by 53 base64 chars
    const bcryptHashArb = fc
      .tuple(
        fc.constantFrom('$2a$', '$2b$', '$2y$'),
        fc.integer({ min: 4, max: 31 }),
        fc.stringMatching(/^[A-Za-z0-9./]{53}$/),
      )
      .map(
        ([prefix, rounds, body]) =>
          `${prefix}${rounds.toString().padStart(2, '0')}$${body}`,
      );

    it('should preserve passwordHash through updateMember → getMemberProfile', async () => {
      let counter = 0;
      await fc.assert(
        fc.asyncProperty(bcryptHashArb, async (hash) => {
          counter++;
          const name = `pwhash${counter}`;
          const email = `pwhash${counter}@test.example.com`;

          // Create member first
          const memberData: INewMemberData = {
            type: MemberType.User,
            name,
            contactEmail: new EmailString(email),
          };
          const { reference } = await memberStore.createMember(memberData);

          // Store password hash via updateMember (same as AuthService.storePasswordHash)
          await memberStore.updateMember(reference.id, {
            id: reference.id,
            privateChanges: { passwordHash: hash },
          });

          // Retrieve via getMemberProfile (same as AuthService.getPasswordHash)
          const profile = await memberStore.getMemberProfile(reference.id);

          // Verify hash is preserved exactly
          expect(profile.privateProfile).not.toBeNull();
          expect(profile.privateProfile!.passwordHash).toBe(hash);
        }),
        { numRuns: 100 },
      );
    });
  });
});
