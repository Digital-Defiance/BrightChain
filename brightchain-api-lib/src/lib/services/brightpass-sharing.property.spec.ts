/**
 * BrightPass Sharing, Quorum, and Password Change property tests (Properties 12, 14-16).
 * Split from brightpass.property.spec.ts to avoid ts-jest compilation hang.
 *
 * Feature: brightpass-password-manager
 */
import { LoginEntry } from '@brightchain/brightchain-lib';
import fc from 'fast-check';
import { BrightPassService, VaultAuthenticationError } from './brightpass';
import {
  arbitraryLoginEntry,
  masterPasswordArb,
  memberIdArb,
  vaultNameArb,
} from './brightpass.property.helpers';

describe('BrightPassService – Sharing & Password Change', () => {
  describe('Property 14: Shared vault recipient access', () => {
    /**
     * **Validates: Requirements 4.1, 4.2**
     */
    it('shared recipients can open vault and see same property records', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          vaultNameArb,
          masterPasswordArb,
          fc.array(memberIdArb, { minLength: 1, maxLength: 3 }),
          async (ownerId, vaultName, password, recipientIds) => {
            const uniqueRecipients = [...new Set(recipientIds)].filter(
              (id) => id !== ownerId,
            );
            fc.pre(uniqueRecipients.length > 0);

            const service = new BrightPassService();
            const metadata = await service.createVault(
              ownerId,
              vaultName,
              password,
            );

            const entry: LoginEntry = {
              id: 'test-entry-1',
              type: 'login',
              title: 'Test Login',
              siteUrl: 'https://example.com',
              username: 'user',
              password: 'pass1234',
              favorite: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            await service.addEntry(metadata.id, entry);
            await service.shareVault(metadata.id, uniqueRecipients);

            const ownerView = await service.openVault(
              ownerId,
              metadata.id,
              password,
            );
            expect(ownerView.propertyRecords.length).toBe(1);

            for (const recipientId of uniqueRecipients) {
              const recipientView = await service.openVault(
                recipientId,
                metadata.id,
                password,
              );
              expect(recipientView.propertyRecords.length).toBe(
                ownerView.propertyRecords.length,
              );
              expect(recipientView.metadata.sharedWith).toContain(recipientId);
            }

            for (const recipientId of uniqueRecipients) {
              const list = await service.listVaults(recipientId);
              expect(list.some((v) => v.id === metadata.id)).toBe(true);
            }
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('Property 15: Share revocation denies access', () => {
    /**
     * **Validates: Requirements 4.3**
     */
    it('revoked member cannot open vault, remaining members can', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          vaultNameArb,
          masterPasswordArb,
          memberIdArb,
          memberIdArb,
          async (ownerId, vaultName, password, recipientA, recipientB) => {
            fc.pre(
              ownerId !== recipientA &&
                ownerId !== recipientB &&
                recipientA !== recipientB,
            );

            const service = new BrightPassService();
            const metadata = await service.createVault(
              ownerId,
              vaultName,
              password,
            );

            await service.shareVault(metadata.id, [recipientA, recipientB]);

            await service.openVault(recipientA, metadata.id, password);
            await service.openVault(recipientB, metadata.id, password);

            await service.revokeShare(metadata.id, recipientA);

            await expect(
              service.openVault(recipientA, metadata.id, password),
            ).rejects.toThrow(VaultAuthenticationError);

            const listA = await service.listVaults(recipientA);
            expect(listA.some((v) => v.id === metadata.id)).toBe(false);

            const viewB = await service.openVault(
              recipientB,
              metadata.id,
              password,
            );
            expect(viewB.metadata.sharedWith).not.toContain(recipientA);
            expect(viewB.metadata.sharedWith).toContain(recipientB);

            await service.openVault(ownerId, metadata.id, password);
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('Property 16: Quorum threshold enforcement', () => {
    /**
     * **Validates: Requirements 4.4**
     */
    it('access denied when fewer than T approvals, granted when T or more', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          vaultNameArb,
          masterPasswordArb,
          fc.array(memberIdArb, { minLength: 2, maxLength: 4 }),
          async (ownerId, vaultName, password, recipientIds) => {
            const uniqueRecipients = [...new Set(recipientIds)].filter(
              (id) => id !== ownerId,
            );
            fc.pre(uniqueRecipients.length >= 2);

            const service = new BrightPassService();
            const metadata = await service.createVault(
              ownerId,
              vaultName,
              password,
            );

            await service.shareVault(metadata.id, uniqueRecipients);

            const threshold = 2;
            await service.configureQuorumGovernance(metadata.id, threshold);

            await expect(
              service.openVault(ownerId, metadata.id, password),
            ).rejects.toThrow(VaultAuthenticationError);

            service.approveQuorumAccess(metadata.id, ownerId);
            await expect(
              service.openVault(ownerId, metadata.id, password),
            ).rejects.toThrow(VaultAuthenticationError);

            service.approveQuorumAccess(metadata.id, uniqueRecipients[0]);
            const opened = await service.openVault(
              ownerId,
              metadata.id,
              password,
            );
            expect(opened.metadata.id).toBe(metadata.id);

            service.resetQuorumApprovals(metadata.id);
            await expect(
              service.openVault(ownerId, metadata.id, password),
            ).rejects.toThrow(VaultAuthenticationError);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('non-member cannot approve quorum access', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          memberIdArb,
          vaultNameArb,
          masterPasswordArb,
          async (ownerId, nonMemberId, vaultName, password) => {
            fc.pre(ownerId !== nonMemberId);

            const service = new BrightPassService();
            const metadata = await service.createVault(
              ownerId,
              vaultName,
              password,
            );
            await service.configureQuorumGovernance(metadata.id, 1);

            expect(() =>
              service.approveQuorumAccess(metadata.id, nonMemberId),
            ).toThrow(VaultAuthenticationError);
          },
        ),
        { numRuns: 20 },
      );
    });

    it('vault without quorum governance opens normally', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          vaultNameArb,
          masterPasswordArb,
          async (memberId, vaultName, password) => {
            const service = new BrightPassService();
            const metadata = await service.createVault(
              memberId,
              vaultName,
              password,
            );

            const opened = await service.openVault(
              memberId,
              metadata.id,
              password,
            );
            expect(opened.metadata.id).toBe(metadata.id);
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('Property 12: Master password change re-keys vault', () => {
    /**
     * **Validates: Requirements 3.4**
     */
    it('new password works, old password rejected, entries preserved', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          vaultNameArb,
          masterPasswordArb,
          masterPasswordArb,
          arbitraryLoginEntry(),
          async (memberId, vaultName, oldPassword, newPassword, entry) => {
            fc.pre(oldPassword !== newPassword);

            const service = new BrightPassService();
            const metadata = await service.createVault(
              memberId,
              vaultName,
              oldPassword,
            );

            const added = await service.addEntry(metadata.id, entry);

            await service.changeMasterPassword(
              memberId,
              metadata.id,
              oldPassword,
              newPassword,
            );

            await expect(
              service.openVault(memberId, metadata.id, oldPassword),
            ).rejects.toThrow(VaultAuthenticationError);

            const opened = await service.openVault(
              memberId,
              metadata.id,
              newPassword,
            );
            expect(opened.metadata.entryCount).toBe(1);
            expect(opened.propertyRecords.length).toBe(1);

            const retrieved = await service.getEntry(metadata.id, added.id);
            expect(retrieved.title).toBe(entry.title);
            expect(retrieved.type).toBe(entry.type);
          },
        ),
        { numRuns: 30 },
      );
    });
  });
});
