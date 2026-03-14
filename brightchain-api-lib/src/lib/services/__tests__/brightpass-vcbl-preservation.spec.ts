/**
 * Preservation Property Tests — Non-VCBL Vault Metadata Fields Unchanged
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 *
 * These tests verify that vault behaviors UNRELATED to VCBL injection
 * work correctly on the UNFIXED code. They capture baseline behavior
 * that must be preserved after the bugfix is applied.
 *
 * All tests use `new BrightPassService()` (no args) — the current
 * unfixed construction path — to confirm these behaviors are independent
 * of VCBLService/Member injection.
 *
 * EXPECTED OUTCOME: All tests PASS on unfixed code.
 */
import fc from 'fast-check';
import {
  BrightPassService,
  VaultAuthenticationError,
  VaultConflictError,
} from '../brightpass';

// UUID v4 regex pattern
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Longer timeout for property-based tests (bcrypt is slow)
jest.setTimeout(120000);

/**
 * Arbitraries for vault name and master password.
 * Vault names must be non-empty after trimming.
 * Master passwords must be non-empty.
 */
const vaultNameArb = fc
  .string({ minLength: 1, maxLength: 40 })
  .filter((s) => s.trim().length > 0);

const masterPasswordArb = fc.string({ minLength: 1, maxLength: 60 });

describe('Preservation: Non-VCBL Vault Metadata Fields Unchanged', () => {
  /**
   * Property 2a: Vault Metadata Correctness
   *
   * **Validates: Requirements 3.1**
   *
   * For all valid vault name/password pairs, createVault() returns metadata
   * where: id is a valid UUID v4, name matches input, ownerId matches input,
   * entryCount === 0, sharedWith is empty, and createdAt/updatedAt are valid dates.
   */
  describe('Property 2a: createVault returns correct non-VCBL metadata', () => {
    it('for all valid vault name/password pairs, metadata fields are correct', async () => {
      await fc.assert(
        fc.asyncProperty(
          vaultNameArb,
          masterPasswordArb,
          async (vaultName, masterPassword) => {
            // Each iteration gets a fresh service to avoid duplicate-name conflicts
            const service = new BrightPassService();
            const memberId = 'test-member-1';

            const metadata = await service.createVault(
              memberId,
              vaultName,
              masterPassword,
            );

            // id is a valid UUID v4
            expect(metadata.id).toMatch(UUID_V4_REGEX);

            // name matches input exactly
            expect(metadata.name).toBe(vaultName);

            // ownerId matches input
            expect(metadata.ownerId).toBe(memberId);

            // entryCount starts at 0
            expect(metadata.entryCount).toBe(0);

            // sharedWith starts empty
            expect(metadata.sharedWith).toEqual([]);

            // createdAt and updatedAt are valid Date objects
            expect(metadata.createdAt).toBeInstanceOf(Date);
            expect(metadata.updatedAt).toBeInstanceOf(Date);
            expect(metadata.createdAt.getTime()).not.toBeNaN();
            expect(metadata.updatedAt.getTime()).not.toBeNaN();

            // createdAt and updatedAt should be equal at creation time
            expect(metadata.createdAt.getTime()).toBe(
              metadata.updatedAt.getTime(),
            );
          },
        ),
        { numRuns: 10 },
      );
    });

    it('duplicate vault name for same member throws VaultConflictError', async () => {
      const service = new BrightPassService();
      const memberId = 'conflict-member';
      const vaultName = 'DuplicateVault';

      await service.createVault(memberId, vaultName, 'password1');

      await expect(
        service.createVault(memberId, vaultName, 'password2'),
      ).rejects.toThrow(VaultConflictError);
    });
  });

  /**
   * Property 2b: Member Isolation in listVaults
   *
   * **Validates: Requirements 3.2**
   *
   * For all members, listVaults() returns only vaults belonging to that
   * member (no cross-member leakage). Vaults created by member A are not
   * visible to member B.
   */
  describe('Property 2b: listVaults returns only vaults for the requesting member', () => {
    it('for all member pairs, vaults are isolated per member', async () => {
      await fc.assert(
        fc.asyncProperty(
          vaultNameArb,
          masterPasswordArb,
          async (vaultName, masterPassword) => {
            const service = new BrightPassService();
            const memberA = 'member-a';
            const memberB = 'member-b';

            // Member A creates a vault
            await service.createVault(memberA, vaultName, masterPassword);

            // Member A sees their vault
            const vaultsA = await service.listVaults(memberA);
            expect(vaultsA.length).toBe(1);
            expect(vaultsA[0].ownerId).toBe(memberA);
            expect(vaultsA[0].name).toBe(vaultName);

            // Member B sees no vaults (no cross-member leakage)
            const vaultsB = await service.listVaults(memberB);
            expect(vaultsB.length).toBe(0);
          },
        ),
        { numRuns: 10 },
      );
    });
  });

  /**
   * Property 2c: Master Password Verification via openVault
   *
   * **Validates: Requirements 3.1, 3.3**
   *
   * Vault creation generates a unique BIP39 mnemonic, derives a vault key,
   * and bcrypt-hashes the master password. This is verified by:
   * - openVault succeeding with the correct password
   * - openVault failing with a wrong password (VaultAuthenticationError)
   */
  describe('Property 2c: openVault succeeds with correct password, fails with wrong password', () => {
    it('for all vault name/password pairs, correct password opens vault and wrong password fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          vaultNameArb,
          masterPasswordArb,
          async (vaultName, masterPassword) => {
            const service = new BrightPassService();
            const memberId = 'pw-test-member';

            const metadata = await service.createVault(
              memberId,
              vaultName,
              masterPassword,
            );

            // Correct password succeeds
            const decrypted = await service.openVault(
              memberId,
              metadata.id,
              masterPassword,
            );
            expect(decrypted.metadata.id).toBe(metadata.id);
            expect(decrypted.metadata.name).toBe(vaultName);

            // Wrong password fails with VaultAuthenticationError
            const wrongPassword = masterPassword + '_wrong';
            await expect(
              service.openVault(memberId, metadata.id, wrongPassword),
            ).rejects.toThrow(VaultAuthenticationError);
          },
        ),
        { numRuns: 5 },
      );
    });
  });
});
