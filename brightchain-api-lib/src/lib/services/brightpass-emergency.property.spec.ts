/**
 * BrightPass Emergency Access property tests (Properties 24-26).
 * Split from brightpass.property.spec.ts to avoid ts-jest compilation hang.
 *
 * Feature: brightpass-password-manager
 */
import { LoginEntry } from '@brightchain/brightchain-lib';
import fc from 'fast-check';
import { BrightPassService, EmergencyAccessError } from './brightpass';
import {
  masterPasswordArb,
  memberIdArb,
  vaultNameArb,
} from './brightpass.property.helpers';

describe('BrightPassService – Emergency Access', () => {
  describe('Property 24: Shamir split-reconstruct round-trip', () => {
    /**
     * **Validates: Requirements 10.1, 10.2, 10.3**
     */
    it('configure then recover with threshold shares succeeds', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          vaultNameArb,
          masterPasswordArb,
          fc.array(memberIdArb, { minLength: 2, maxLength: 5 }),
          async (ownerId, vaultName, password, trusteeIds) => {
            const uniqueTrustees = [...new Set(trusteeIds)].filter(
              (id) => id !== ownerId,
            );
            fc.pre(uniqueTrustees.length >= 2);

            const threshold = Math.min(2, uniqueTrustees.length);
            const service = new BrightPassService();
            const metadata = await service.createVault(
              ownerId,
              vaultName,
              password,
            );

            const entry: LoginEntry = {
              id: 'emergency-test-entry',
              type: 'login',
              title: 'Emergency Test',
              siteUrl: 'https://emergency.example.com',
              username: 'user',
              password: 'pass1234',
              favorite: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            await service.addEntry(metadata.id, entry);

            const config = await service.configureEmergencyAccess(
              metadata.id,
              threshold,
              uniqueTrustees,
            );

            expect(config.threshold).toBe(threshold);
            expect(config.totalShares).toBe(uniqueTrustees.length);
            expect(config.trustees).toEqual(uniqueTrustees);

            const allShares = service.getEmergencyShares(metadata.id);
            expect(allShares.length).toBe(uniqueTrustees.length);

            const thresholdShares = allShares.slice(0, threshold);
            const recovered = await service.recoverWithShares(
              metadata.id,
              thresholdShares,
            );

            expect(recovered.metadata.id).toBe(metadata.id);
            expect(recovered.metadata.name).toBe(vaultName);
            expect(recovered.metadata.ownerId).toBe(ownerId);

            expect(recovered.propertyRecords.length).toBe(1);
            expect(recovered.propertyRecords[0].title).toBe('Emergency Test');
            expect(recovered.propertyRecords[0].entryType).toBe('login');
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('Property 25: Sub-threshold reconstruction rejection', () => {
    /**
     * **Validates: Requirements 10.4**
     */
    it('fewer than threshold shares are rejected', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          vaultNameArb,
          masterPasswordArb,
          async (ownerId, vaultName, password) => {
            const service = new BrightPassService();
            const metadata = await service.createVault(
              ownerId,
              vaultName,
              password,
            );

            const trustees = ['trustee-1', 'trustee-2', 'trustee-3'];
            const threshold = 2;

            await service.configureEmergencyAccess(
              metadata.id,
              threshold,
              trustees,
            );

            const allShares = service.getEmergencyShares(metadata.id);

            await expect(
              service.recoverWithShares(metadata.id, []),
            ).rejects.toThrow(EmergencyAccessError);

            await expect(
              service.recoverWithShares(metadata.id, allShares.slice(0, 1)),
            ).rejects.toThrow(EmergencyAccessError);

            const recovered = await service.recoverWithShares(
              metadata.id,
              allShares.slice(0, threshold),
            );
            expect(recovered.metadata.id).toBe(metadata.id);
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('Property 26: Emergency access revocation invalidates shares', () => {
    /**
     * **Validates: Requirements 10.5**
     */
    it('revoked emergency access rejects recovery attempts', async () => {
      await fc.assert(
        fc.asyncProperty(
          memberIdArb,
          vaultNameArb,
          masterPasswordArb,
          async (ownerId, vaultName, password) => {
            const service = new BrightPassService();
            const metadata = await service.createVault(
              ownerId,
              vaultName,
              password,
            );

            const trustees = ['trustee-a', 'trustee-b'];
            const threshold = 2;
            await service.configureEmergencyAccess(
              metadata.id,
              threshold,
              trustees,
            );

            const validShares = service.getEmergencyShares(metadata.id);

            const beforeRevoke = await service.recoverWithShares(
              metadata.id,
              validShares,
            );
            expect(beforeRevoke.metadata.id).toBe(metadata.id);

            await service.revokeEmergencyAccess(metadata.id);

            await expect(
              service.recoverWithShares(metadata.id, validShares),
            ).rejects.toThrow(EmergencyAccessError);

            expect(() => service.getEmergencyShares(metadata.id)).toThrow(
              EmergencyAccessError,
            );
          },
        ),
        { numRuns: 20 },
      );
    });
  });
});
