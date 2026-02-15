/**
 * BrightPass Vault CRUD property tests (Properties 1-4).
 * Split from brightpass.property.spec.ts to avoid ts-jest compilation hang.
 *
 * Feature: brightpass-password-manager
 */
import fc from 'fast-check';
import {
  BrightPassService,
  VaultAuthenticationError,
  VaultNotFoundError,
} from './brightpass';
import {
  arbitraryLoginEntry,
  masterPasswordArb,
  memberIdArb,
  vaultNameArb,
} from './brightpass.property.helpers';

describe('BrightPassService – Vault CRUD', () => {
  describe('Property 1: Vault create-open round-trip', () => {
    /**
     * For any valid vault name, master password, and Member,
     * creating a vault and then opening it with the same master password
     * should return a vault with matching metadata and an empty property record array.
     *
     * **Validates: Requirements 1.1, 1.2**
     */
    it('create then open returns matching metadata and empty entries', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          vaultNameArb,
          masterPasswordArb,
          async (memberId, vaultName, masterPassword) => {
            const service = new BrightPassService();

            const metadata = await service.createVault(
              memberId,
              vaultName,
              masterPassword,
            );

            expect(metadata.name).toBe(vaultName);
            expect(metadata.ownerId).toBe(memberId);
            expect(metadata.entryCount).toBe(0);
            expect(metadata.sharedWith).toEqual([]);
            expect(metadata.id).toBeDefined();
            expect(metadata.createdAt).toBeInstanceOf(Date);
            expect(metadata.updatedAt).toBeInstanceOf(Date);

            const opened = await service.openVault(
              memberId,
              metadata.id,
              masterPassword,
            );

            expect(opened.metadata.name).toBe(vaultName);
            expect(opened.metadata.ownerId).toBe(memberId);
            expect(opened.metadata.id).toBe(metadata.id);
            expect(opened.metadata.entryCount).toBe(0);
            expect(opened.propertyRecords).toEqual([]);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('Property 2: Wrong master password rejection', () => {
    /**
     * For any existing vault and any master password that differs from the one
     * used at creation, attempting to open the vault should fail with an
     * authentication error.
     *
     * **Validates: Requirements 1.3**
     */
    it('rejects open with wrong master password', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          vaultNameArb,
          masterPasswordArb,
          masterPasswordArb,
          async (memberId, vaultName, correctPassword, wrongPassword) => {
            fc.pre(correctPassword !== wrongPassword);

            const service = new BrightPassService();
            const metadata = await service.createVault(
              memberId,
              vaultName,
              correctPassword,
            );

            await expect(
              service.openVault(memberId, metadata.id, wrongPassword),
            ).rejects.toThrow(VaultAuthenticationError);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('Property 3: Vault listing returns metadata for all owned vaults', () => {
    /**
     * For any Member who has created N vaults, listing vaults should return
     * exactly N metadata entries, each containing the correct identifier,
     * name, creation date, and entry count.
     *
     * **Validates: Requirements 1.4**
     */
    it('listing returns exactly N vaults with correct metadata', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          fc.array(vaultNameArb, { minLength: 1, maxLength: 5 }),
          masterPasswordArb,
          async (memberId, vaultNames, password) => {
            const uniqueVaultNames = [...new Set(vaultNames)];
            fc.pre(uniqueVaultNames.length > 0);

            const service = new BrightPassService();

            const createdMetadata = [];
            for (const name of uniqueVaultNames) {
              const meta = await service.createVault(memberId, name, password);
              createdMetadata.push(meta);
            }

            const listed = await service.listVaults(memberId);

            expect(listed.length).toBe(uniqueVaultNames.length);

            for (const created of createdMetadata) {
              const found = listed.find((v) => v.id === created.id);
              expect(found).toBeDefined();
              expect(found!.name).toBe(created.name);
              expect(found!.ownerId).toBe(memberId);
              expect(found!.entryCount).toBe(0);
              expect(found!.createdAt).toBeInstanceOf(Date);
              expect(found!.updatedAt).toBeInstanceOf(Date);
            }
          },
        ),
        { numRuns: 30 },
      );
    });

    it('listing reflects entry count after adding entries', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          vaultNameArb,
          masterPasswordArb,
          fc.array(arbitraryLoginEntry(), { minLength: 1, maxLength: 4 }),
          async (memberId, vaultName, password, entries) => {
            const service = new BrightPassService();
            const metadata = await service.createVault(
              memberId,
              vaultName,
              password,
            );

            for (const entry of entries) {
              await service.addEntry(metadata.id, entry);
            }

            const listed = await service.listVaults(memberId);
            const found = listed.find((v) => v.id === metadata.id);
            expect(found).toBeDefined();
            expect(found!.entryCount).toBe(entries.length);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('different members see only their own vaults', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          memberIdArb,
          vaultNameArb,
          vaultNameArb,
          masterPasswordArb,
          async (memberA, memberB, nameA, nameB, password) => {
            fc.pre(memberA !== memberB);

            const service = new BrightPassService();
            const vaultA = await service.createVault(memberA, nameA, password);
            const vaultB = await service.createVault(memberB, nameB, password);

            const listA = await service.listVaults(memberA);
            const listB = await service.listVaults(memberB);

            expect(listA.length).toBe(1);
            expect(listA[0].id).toBe(vaultA.id);
            expect(listA.some((v) => v.id === vaultB.id)).toBe(false);

            expect(listB.length).toBe(1);
            expect(listB[0].id).toBe(vaultB.id);
            expect(listB.some((v) => v.id === vaultA.id)).toBe(false);
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('Property 4: Vault deletion removes all access', () => {
    /**
     * For any vault, after deletion, attempting to open or list entries
     * for that vault should fail with a not-found error.
     *
     * **Validates: Requirements 1.5**
     */
    it('deleted vault cannot be opened or found in listing', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          vaultNameArb,
          masterPasswordArb,
          async (memberId, vaultName, masterPassword) => {
            const service = new BrightPassService();

            const metadata = await service.createVault(
              memberId,
              vaultName,
              masterPassword,
            );

            const beforeList = await service.listVaults(memberId);
            expect(beforeList.some((v) => v.id === metadata.id)).toBe(true);

            await service.deleteVault(memberId, metadata.id, masterPassword);

            const afterList = await service.listVaults(memberId);
            expect(afterList.some((v) => v.id === metadata.id)).toBe(false);

            await expect(
              service.openVault(memberId, metadata.id, masterPassword),
            ).rejects.toThrow(VaultAuthenticationError);

            await expect(service.getAuditLog(metadata.id)).rejects.toThrow(
              VaultNotFoundError,
            );
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
