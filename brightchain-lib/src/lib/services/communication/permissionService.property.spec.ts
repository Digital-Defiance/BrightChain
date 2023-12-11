/**
 * Property-based tests for Permission Service
 * Feature: api-lib-to-lib-migration
 *
 * These tests validate universal properties of the permission service
 * using fast-check for property-based testing.
 *
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
 */

import fc from 'fast-check';
import {
  DEFAULT_ROLE_PERMISSIONS,
  DefaultRole,
  Permission,
} from '../../enumerations/communication';
import { PermissionService } from './permissionService';

/**
 * Arbitrary for DefaultRole values
 */
const roleArb = fc.constantFrom(
  DefaultRole.OWNER,
  DefaultRole.ADMIN,
  DefaultRole.MODERATOR,
  DefaultRole.MEMBER,
);

/**
 * Arbitrary for Permission values
 */
const permissionArb = fc.constantFrom(...Object.values(Permission));

/**
 * Arbitrary for non-empty alphanumeric IDs (member and context IDs)
 */
const idArb = fc.stringMatching(/^[a-zA-Z0-9]{1,36}$/);

/**
 * Arbitrary for mute durations in milliseconds (1ms to 10 minutes)
 */
const durationArb = fc.integer({ min: 1, max: 600_000 });

describe('Feature: api-lib-to-lib-migration, Property 14: Permission Service Role Assignment', () => {
  /**
   * Property 14: Permission Service Role Assignment
   *
   * *For any* member ID, context ID, and role, after calling assignRole,
   * getMemberRole SHALL return that role, and hasPermission SHALL return
   * true for permissions included in DEFAULT_ROLE_PERMISSIONS[role].
   *
   * **Validates: Requirements 7.1, 7.2**
   */
  it('assignRole then getMemberRole returns the assigned role', () => {
    fc.assert(
      fc.property(idArb, idArb, roleArb, (memberId, contextId, role) => {
        const service = new PermissionService();
        service.assignRole(memberId, contextId, role);

        expect(service.getMemberRole(memberId, contextId)).toBe(role);
      }),
      { numRuns: 100 },
    );
  });

  it('hasPermission returns true for all permissions granted by the assigned role', () => {
    fc.assert(
      fc.property(idArb, idArb, roleArb, (memberId, contextId, role) => {
        const service = new PermissionService();
        service.assignRole(memberId, contextId, role);

        const grantedPermissions = DEFAULT_ROLE_PERMISSIONS[role];
        for (const perm of grantedPermissions) {
          expect(service.hasPermission(memberId, contextId, perm)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('hasPermission returns false for permissions NOT granted by the assigned role', () => {
    fc.assert(
      fc.property(idArb, idArb, roleArb, (memberId, contextId, role) => {
        const service = new PermissionService();
        service.assignRole(memberId, contextId, role);

        const grantedPermissions = DEFAULT_ROLE_PERMISSIONS[role];
        const allPermissions = Object.values(Permission);
        const deniedPermissions = allPermissions.filter(
          (p) => !grantedPermissions.includes(p),
        );

        for (const perm of deniedPermissions) {
          expect(service.hasPermission(memberId, contextId, perm)).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('hasPermission returns false when no role is assigned', () => {
    fc.assert(
      fc.property(idArb, idArb, permissionArb, (memberId, contextId, perm) => {
        const service = new PermissionService();

        expect(service.hasPermission(memberId, contextId, perm)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('roles are scoped per context — assigning in one context does not affect another', () => {
    fc.assert(
      fc.property(
        idArb,
        idArb,
        idArb,
        roleArb,
        (memberId, contextA, contextB, role) => {
          // Use deterministic different context IDs
          const ctxA = contextA + '_A';
          const ctxB = contextB + '_B';

          const service = new PermissionService();
          service.assignRole(memberId, ctxA, role);

          expect(service.getMemberRole(memberId, ctxA)).toBe(role);
          expect(service.getMemberRole(memberId, ctxB)).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('reassigning a role overwrites the previous role', () => {
    fc.assert(
      fc.property(
        idArb,
        idArb,
        roleArb,
        roleArb,
        (memberId, contextId, firstRole, secondRole) => {
          const service = new PermissionService();
          service.assignRole(memberId, contextId, firstRole);
          service.assignRole(memberId, contextId, secondRole);

          expect(service.getMemberRole(memberId, contextId)).toBe(secondRole);

          // Permissions should match the second (latest) role
          const grantedPermissions = DEFAULT_ROLE_PERMISSIONS[secondRole];
          for (const perm of grantedPermissions) {
            expect(service.hasPermission(memberId, contextId, perm)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Feature: api-lib-to-lib-migration, Property 15: Permission Service Mute Expiration', () => {
  /**
   * Property 15: Permission Service Mute Expiration
   *
   * *For any* member muted for duration D, isMuted SHALL return true
   * before D milliseconds elapse and false after D milliseconds elapse.
   *
   * **Validates: Requirements 7.3, 7.4**
   */
  it('isMuted returns true before duration elapses and false after', () => {
    fc.assert(
      fc.property(
        idArb,
        idArb,
        durationArb,
        (memberId, contextId, durationMs) => {
          jest.useFakeTimers();
          try {
            const service = new PermissionService();
            service.muteMember(memberId, contextId, durationMs);

            // Before expiration: should be muted
            expect(service.isMuted(memberId, contextId)).toBe(true);

            // Advance to just before expiration (1ms before)
            if (durationMs > 1) {
              jest.advanceTimersByTime(durationMs - 1);
              expect(service.isMuted(memberId, contextId)).toBe(true);
            }

            // Advance past expiration
            jest.advanceTimersByTime(1);
            expect(service.isMuted(memberId, contextId)).toBe(false);
          } finally {
            jest.useRealTimers();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('isMuted returns false for members that were never muted', () => {
    fc.assert(
      fc.property(idArb, idArb, (memberId, contextId) => {
        const service = new PermissionService();
        expect(service.isMuted(memberId, contextId)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('mutes are scoped per context', () => {
    fc.assert(
      fc.property(
        idArb,
        idArb,
        idArb,
        durationArb,
        (memberId, contextA, contextB, durationMs) => {
          const ctxA = contextA + '_A';
          const ctxB = contextB + '_B';

          jest.useFakeTimers();
          try {
            const service = new PermissionService();
            service.muteMember(memberId, ctxA, durationMs);

            expect(service.isMuted(memberId, ctxA)).toBe(true);
            expect(service.isMuted(memberId, ctxB)).toBe(false);
          } finally {
            jest.useRealTimers();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('expired mute is auto-cleared on check (map entry removed)', () => {
    fc.assert(
      fc.property(
        idArb,
        idArb,
        durationArb,
        (memberId, contextId, durationMs) => {
          jest.useFakeTimers();
          try {
            const service = new PermissionService();
            service.muteMember(memberId, contextId, durationMs);

            // Advance past expiration
            jest.advanceTimersByTime(durationMs);

            // First check clears the mute
            expect(service.isMuted(memberId, contextId)).toBe(false);
            // Second check also returns false (entry was removed)
            expect(service.isMuted(memberId, contextId)).toBe(false);
          } finally {
            jest.useRealTimers();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
