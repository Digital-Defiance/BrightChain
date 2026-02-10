/**
 * Property-based tests for Group Service
 * Feature: api-lib-to-lib-migration
 *
 * These tests validate universal properties of the group service
 * using fast-check for property-based testing.
 *
 * **Validates: Requirements 10.2**
 */

import fc from 'fast-check';
import { extractKeyFromDefault, GroupService } from './groupService';
import { PermissionService } from './permissionService';

/**
 * Arbitrary for non-empty alphanumeric IDs
 */
const idArb = fc.stringMatching(/^[a-zA-Z0-9]{1,36}$/);

/**
 * Deterministic random bytes provider for testing.
 * Uses a counter-based approach to produce unique but deterministic keys.
 */
function createDeterministicRandomProvider(): (length: number) => Uint8Array {
  let counter = 0;
  return (length: number): Uint8Array => {
    const bytes = new Uint8Array(length);
    counter++;
    for (let i = 0; i < length; i++) {
      // Mix counter and position to get unique bytes per call
      bytes[i] = (counter * 31 + i * 7) % 256;
    }
    return bytes;
  };
}

describe('Feature: api-lib-to-lib-migration, Property 23: Group Service Key Rotation', () => {
  /**
   * Property 23: Group Service Key Rotation
   *
   * *For any* group, removing a member SHALL rotate the symmetric key
   * (new key differs from old) and update encryptedSharedKey for remaining members.
   *
   * **Validates: Requirements 10.2**
   */

  it('removeMember rotates the symmetric key to a different value', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        async (baseCreator, baseMember1, baseMember2) => {
          const creatorId = baseCreator + '_creator';
          const member1Id = baseMember1 + '_member1';
          const member2Id = baseMember2 + '_member2';

          const permissionService = new PermissionService();
          const groupService = new GroupService(
            permissionService,
            undefined,
            undefined,
            undefined,
            createDeterministicRandomProvider(),
          );

          const group = await groupService.createGroup(
            'Test Group',
            creatorId,
            [member1Id, member2Id],
          );

          // Capture the key before removal
          const keyBefore = groupService.getSymmetricKey(group.id);
          expect(keyBefore).toBeDefined();
          const keyBeforeCopy = new Uint8Array(keyBefore!);

          // Remove member2 (creator has OWNER role with MANAGE_MEMBERS permission)
          await groupService.removeMember(group.id, creatorId, member2Id);

          // Key should have rotated
          const keyAfter = groupService.getSymmetricKey(group.id);
          expect(keyAfter).toBeDefined();

          // New key must differ from old key
          const keysAreEqual =
            keyBeforeCopy.length === keyAfter!.length &&
            keyBeforeCopy.every((byte, i) => byte === keyAfter![i]);
          expect(keysAreEqual).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('removeMember updates encryptedSharedKey for remaining members only', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        async (baseCreator, baseMember1, baseMember2) => {
          const creatorId = baseCreator + '_creator';
          const member1Id = baseMember1 + '_member1';
          const member2Id = baseMember2 + '_member2';

          const permissionService = new PermissionService();
          const groupService = new GroupService(
            permissionService,
            undefined,
            undefined,
            undefined,
            createDeterministicRandomProvider(),
          );

          const group = await groupService.createGroup(
            'Test Group',
            creatorId,
            [member1Id, member2Id],
          );

          await groupService.removeMember(group.id, creatorId, member2Id);

          const updatedGroup = groupService.getGroupById(group.id);
          expect(updatedGroup).toBeDefined();

          // Removed member should NOT have an encrypted key
          expect(updatedGroup!.encryptedSharedKey.has(member2Id)).toBe(false);

          // Remaining members should have encrypted keys
          expect(updatedGroup!.encryptedSharedKey.has(creatorId)).toBe(true);
          expect(updatedGroup!.encryptedSharedKey.has(member1Id)).toBe(true);

          // Remaining members' encrypted keys should decrypt to the new symmetric key
          const newKey = groupService.getSymmetricKey(group.id)!;
          for (const remainingId of [creatorId, member1Id]) {
            const encryptedKey =
              updatedGroup!.encryptedSharedKey.get(remainingId)!;
            const decryptedKey = extractKeyFromDefault(encryptedKey);
            const keysMatch =
              decryptedKey.length === newKey.length &&
              decryptedKey.every((byte, i) => byte === newKey[i]);
            expect(keysMatch).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('leaveGroup rotates the symmetric key to a different value', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        async (baseCreator, baseMember1, baseMember2) => {
          const creatorId = baseCreator + '_creator';
          const member1Id = baseMember1 + '_member1';
          const member2Id = baseMember2 + '_member2';

          const permissionService = new PermissionService();
          const groupService = new GroupService(
            permissionService,
            undefined,
            undefined,
            undefined,
            createDeterministicRandomProvider(),
          );

          const group = await groupService.createGroup(
            'Test Group',
            creatorId,
            [member1Id, member2Id],
          );

          const keyBefore = groupService.getSymmetricKey(group.id);
          expect(keyBefore).toBeDefined();
          const keyBeforeCopy = new Uint8Array(keyBefore!);

          // member2 leaves voluntarily
          await groupService.leaveGroup(group.id, member2Id);

          const keyAfter = groupService.getSymmetricKey(group.id);
          expect(keyAfter).toBeDefined();

          const keysAreEqual =
            keyBeforeCopy.length === keyAfter!.length &&
            keyBeforeCopy.every((byte, i) => byte === keyAfter![i]);
          expect(keysAreEqual).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('leaveGroup updates encryptedSharedKey for remaining members only', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        async (baseCreator, baseMember1, baseMember2) => {
          const creatorId = baseCreator + '_creator';
          const member1Id = baseMember1 + '_member1';
          const member2Id = baseMember2 + '_member2';

          const permissionService = new PermissionService();
          const groupService = new GroupService(
            permissionService,
            undefined,
            undefined,
            undefined,
            createDeterministicRandomProvider(),
          );

          const group = await groupService.createGroup(
            'Test Group',
            creatorId,
            [member1Id, member2Id],
          );

          await groupService.leaveGroup(group.id, member2Id);

          const updatedGroup = groupService.getGroupById(group.id);
          expect(updatedGroup).toBeDefined();

          // Departed member should NOT have an encrypted key
          expect(updatedGroup!.encryptedSharedKey.has(member2Id)).toBe(false);

          // Remaining members should have encrypted keys matching the new symmetric key
          const newKey = groupService.getSymmetricKey(group.id)!;
          for (const remainingId of [creatorId, member1Id]) {
            expect(updatedGroup!.encryptedSharedKey.has(remainingId)).toBe(
              true,
            );
            const encryptedKey =
              updatedGroup!.encryptedSharedKey.get(remainingId)!;
            const decryptedKey = extractKeyFromDefault(encryptedKey);
            const keysMatch =
              decryptedKey.length === newKey.length &&
              decryptedKey.every((byte, i) => byte === newKey[i]);
            expect(keysMatch).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('removed member is no longer in the group members list', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        async (baseCreator, baseMember1, baseMember2) => {
          const creatorId = baseCreator + '_creator';
          const member1Id = baseMember1 + '_member1';
          const member2Id = baseMember2 + '_member2';

          const permissionService = new PermissionService();
          const groupService = new GroupService(
            permissionService,
            undefined,
            undefined,
            undefined,
            createDeterministicRandomProvider(),
          );

          const group = await groupService.createGroup(
            'Test Group',
            creatorId,
            [member1Id, member2Id],
          );

          // Verify member2 is initially present
          expect(group.members.some((m) => m.memberId === member2Id)).toBe(
            true,
          );

          await groupService.removeMember(group.id, creatorId, member2Id);

          const updatedGroup = groupService.getGroupById(group.id);
          expect(updatedGroup).toBeDefined();
          expect(
            updatedGroup!.members.some((m) => m.memberId === member2Id),
          ).toBe(false);
          expect(updatedGroup!.members.length).toBe(2); // creator + member1
        },
      ),
      { numRuns: 100 },
    );
  });

  it('key rotation produces unique keys across multiple removals', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        idArb,
        async (baseCreator, baseMember1, baseMember2, baseMember3) => {
          const creatorId = baseCreator + '_creator';
          const member1Id = baseMember1 + '_member1';
          const member2Id = baseMember2 + '_member2';
          const member3Id = baseMember3 + '_member3';

          const permissionService = new PermissionService();
          const groupService = new GroupService(
            permissionService,
            undefined,
            undefined,
            undefined,
            createDeterministicRandomProvider(),
          );

          const group = await groupService.createGroup(
            'Test Group',
            creatorId,
            [member1Id, member2Id, member3Id],
          );

          const key0 = new Uint8Array(groupService.getSymmetricKey(group.id)!);

          // First removal
          await groupService.removeMember(group.id, creatorId, member3Id);
          const key1 = new Uint8Array(groupService.getSymmetricKey(group.id)!);

          // Second removal
          await groupService.removeMember(group.id, creatorId, member2Id);
          const key2 = new Uint8Array(groupService.getSymmetricKey(group.id)!);

          // All three keys should be distinct
          const arraysEqual = (a: Uint8Array, b: Uint8Array): boolean =>
            a.length === b.length && a.every((v, i) => v === b[i]);

          expect(arraysEqual(key0, key1)).toBe(false);
          expect(arraysEqual(key1, key2)).toBe(false);
          expect(arraysEqual(key0, key2)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('encryptedSharedKey count matches remaining member count after removal', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        idArb,
        idArb,
        async (baseCreator, baseMember1, baseMember2, baseMember3) => {
          const creatorId = baseCreator + '_creator';
          const member1Id = baseMember1 + '_member1';
          const member2Id = baseMember2 + '_member2';
          const member3Id = baseMember3 + '_member3';

          const permissionService = new PermissionService();
          const groupService = new GroupService(
            permissionService,
            undefined,
            undefined,
            undefined,
            createDeterministicRandomProvider(),
          );

          const group = await groupService.createGroup(
            'Test Group',
            creatorId,
            [member1Id, member2Id, member3Id],
          );

          // Initially: 4 members, 4 encrypted keys
          expect(group.encryptedSharedKey.size).toBe(4);
          expect(group.members.length).toBe(4);

          await groupService.removeMember(group.id, creatorId, member3Id);

          const afterFirst = groupService.getGroupById(group.id)!;
          expect(afterFirst.encryptedSharedKey.size).toBe(3);
          expect(afterFirst.members.length).toBe(3);

          await groupService.removeMember(group.id, creatorId, member2Id);

          const afterSecond = groupService.getGroupById(group.id)!;
          expect(afterSecond.encryptedSharedKey.size).toBe(2);
          expect(afterSecond.members.length).toBe(2);
        },
      ),
      { numRuns: 100 },
    );
  });
});
