/**
 * Integration: Vault Deletion endpoints
 *
 * Tests the full request/response cycle through VaultContainerController
 * with mocked DeletionService. Verifies HTTP status codes and response
 * body shapes for all deletion-related endpoints.
 *
 * Requirements: 1, 4, 5, 6, 9
 */
import {
  DeletionAlreadyScheduledError,
  DisownRequiresPublicVisibilityError,
  VaultAlreadyDisownedError,
  VaultContainerDestroyedError,
} from '@brightchain/digitalburnbag-lib';
import { authenticatedAgent, createTestUser } from './helpers';
import { createTestServer } from './test-server';

describe('Integration: Vault Deletion Endpoints', () => {
  const owner = createTestUser({ id: 'owner-1', username: 'owner' });

  describe('DELETE /vaults/:id', () => {
    it('should return 200 with destruction result for private vault', async () => {
      const { app, deps } = createTestServer();
      const agent = authenticatedAgent(app, owner);

      deps.deletionService.deleteVaultContainer.mockResolvedValueOnce({
        type: 'immediate',
        destructionResult: {
          containerId: 'vault-1',
          succeeded: [
            { fileId: 'file-1', proof: { hash: 'abc', ledgerEntry: 'e1' } },
            { fileId: 'file-2', proof: { hash: 'def', ledgerEntry: 'e2' } },
          ],
          failed: [],
          containerLedgerEntryHash: new Uint8Array(32),
          timestamp: new Date(),
        },
        certificateOmittedReason: 'NOT_SEALED',
      });

      const res = await agent.delete('/vaults/vault-1').expect(200);

      expect(res.body).toHaveProperty('succeeded', 2);
      expect(res.body).toHaveProperty('failed', 0);
      expect(res.body).toHaveProperty('certificateOmittedReason', 'NOT_SEALED');
      expect(res.body).not.toHaveProperty('certificate');
      expect(deps.deletionService.deleteVaultContainer).toHaveBeenCalledWith(
        'vault-1',
        owner.id,
      );
    });

    it('should return 200 with destruction result and certificate for sealed vault', async () => {
      const { app, deps } = createTestServer();
      const agent = authenticatedAgent(app, owner);

      const mockCertificate = {
        version: 1,
        containerId: 'vault-1',
        containerName: 'My Sealed Vault',
        sealHash: 'abcdef1234567890',
        sealedAt: '2024-01-01T00:00:00.000Z',
        destroyedAt: '2024-06-01T00:00:00.000Z',
        nonAccessVerification: {
          containerId: 'vault-1',
          nonAccessConfirmed: true,
          accessedFileIds: [],
          inconsistentFileIds: [],
          totalFilesChecked: 2,
        },
        fileDestructionProofs: [
          {
            fileId: 'file-1',
            destructionHash: 'hash1',
            ledgerEntryHash: 'ledger1',
            timestamp: '2024-06-01T00:00:00.000Z',
          },
        ],
        containerLedgerEntryHash: 'containerledger1',
        operatorPublicKey: '02abcdef',
        signature: 'c2lnbmF0dXJl',
      };

      deps.deletionService.deleteVaultContainer.mockResolvedValueOnce({
        type: 'immediate',
        destructionResult: {
          containerId: 'vault-1',
          succeeded: [
            { fileId: 'file-1', proof: { hash: 'abc', ledgerEntry: 'e1' } },
          ],
          failed: [],
          containerLedgerEntryHash: new Uint8Array(32),
          timestamp: new Date(),
        },
        certificate: mockCertificate,
      });

      const res = await agent.delete('/vaults/vault-1').expect(200);

      expect(res.body).toHaveProperty('succeeded', 1);
      expect(res.body).toHaveProperty('failed', 0);
      expect(res.body).toHaveProperty('certificate');
      expect(res.body.certificate).toHaveProperty('version', 1);
      expect(res.body.certificate).toHaveProperty('containerId', 'vault-1');
      expect(res.body.certificate).toHaveProperty('signature');
      expect(res.body).not.toHaveProperty('certificateOmittedReason');
    });

    it('should return 202 with pendingDeletionAt for public vault', async () => {
      const { app, deps } = createTestServer();
      const agent = authenticatedAgent(app, owner);

      const pendingAt = '2024-07-01T00:00:00.000Z';
      deps.deletionService.deleteVaultContainer.mockResolvedValueOnce({
        type: 'pending',
        pendingDeletionAt: pendingAt,
      });

      const res = await agent.delete('/vaults/vault-1').expect(202);

      expect(res.body).toHaveProperty('pendingDeletionAt', pendingAt);
      expect(res.body).toHaveProperty('message', 'Deletion scheduled');
    });

    it('should return 207 with partial result when some files fail', async () => {
      const { app, deps } = createTestServer();
      const agent = authenticatedAgent(app, owner);

      deps.deletionService.deleteVaultContainer.mockResolvedValueOnce({
        type: 'immediate',
        destructionResult: {
          containerId: 'vault-1',
          succeeded: [
            { fileId: 'file-1', proof: { hash: 'abc', ledgerEntry: 'e1' } },
          ],
          failed: [{ fileId: 'file-2', error: 'Storage unavailable' }],
          containerLedgerEntryHash: new Uint8Array(32),
          timestamp: new Date(),
        },
        certificateOmittedReason: 'NOT_SEALED',
      });

      const res = await agent.delete('/vaults/vault-1').expect(207);

      expect(res.body).toHaveProperty('succeeded', 1);
      expect(res.body).toHaveProperty('failed', 1);
      expect(res.body).toHaveProperty('failedFileIds');
      expect(res.body.failedFileIds).toContain('file-2');
    });

    it('should return 410 when vault is already destroyed', async () => {
      const { app, deps } = createTestServer();
      const agent = authenticatedAgent(app, owner);

      deps.deletionService.deleteVaultContainer.mockRejectedValueOnce(
        new VaultContainerDestroyedError('vault-1'),
      );

      const res = await agent.delete('/vaults/vault-1').expect(410);

      expect(res.body).toHaveProperty('error', 'Gone');
    });

    it('should return 403 when requester is unauthorized', async () => {
      const { app, deps } = createTestServer();
      const agent = authenticatedAgent(app, owner);

      const forbiddenError = new Error('Forbidden');
      (forbiddenError as unknown as { code: string }).code = 'FORBIDDEN';
      deps.deletionService.deleteVaultContainer.mockRejectedValueOnce(
        forbiddenError,
      );

      const res = await agent.delete('/vaults/vault-1').expect(403);

      expect(res.body).toHaveProperty('message');
    });
  });

  describe('POST /vaults/:id/disown', () => {
    it('should return 200 on successful disown of public vault', async () => {
      const { app, deps } = createTestServer();
      const agent = authenticatedAgent(app, owner);

      deps.deletionService.disownVaultContainer.mockResolvedValueOnce({
        id: 'vault-1',
        state: 'disowned',
        disownedAt: '2024-06-01T00:00:00.000Z',
      });

      const res = await agent.post('/vaults/vault-1/disown').expect(200);

      expect(res.body).toHaveProperty('id', 'vault-1');
      expect(res.body).toHaveProperty('state', 'disowned');
      expect(res.body).toHaveProperty('disownedAt');
      expect(deps.deletionService.disownVaultContainer).toHaveBeenCalledWith(
        'vault-1',
        owner.id,
      );
    });

    it('should return 409 when vault is not public', async () => {
      const { app, deps } = createTestServer();
      const agent = authenticatedAgent(app, owner);

      deps.deletionService.disownVaultContainer.mockRejectedValueOnce(
        new DisownRequiresPublicVisibilityError('vault-1'),
      );

      const res = await agent.post('/vaults/vault-1/disown').expect(409);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('DISOWN_REQUIRES_PUBLIC_VISIBILITY');
    });

    it('should return 409 when vault is already disowned', async () => {
      const { app, deps } = createTestServer();
      const agent = authenticatedAgent(app, owner);

      deps.deletionService.disownVaultContainer.mockRejectedValueOnce(
        new VaultAlreadyDisownedError('vault-1'),
      );

      const res = await agent.post('/vaults/vault-1/disown').expect(409);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('VAULT_ALREADY_DISOWNED');
    });
  });

  describe('POST /vaults/:id/cancel-deletion', () => {
    it('should return 200 on successful cancellation', async () => {
      const { app, deps } = createTestServer();
      const agent = authenticatedAgent(app, owner);

      deps.deletionService.cancelPendingDeletion.mockResolvedValueOnce({
        id: 'vault-1',
        state: 'active',
      });

      const res = await agent
        .post('/vaults/vault-1/cancel-deletion')
        .expect(200);

      expect(res.body).toHaveProperty('id', 'vault-1');
      expect(res.body).toHaveProperty('state', 'active');
      expect(deps.deletionService.cancelPendingDeletion).toHaveBeenCalledWith(
        'vault-1',
        owner.id,
      );
    });

    it('should return 409 when no pending deletion exists', async () => {
      const { app, deps } = createTestServer();
      const agent = authenticatedAgent(app, owner);

      deps.deletionService.cancelPendingDeletion.mockRejectedValueOnce(
        new DeletionAlreadyScheduledError(
          'vault-1',
          '2024-07-01T00:00:00.000Z',
        ),
      );

      const res = await agent
        .post('/vaults/vault-1/cancel-deletion')
        .expect(409);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('DELETION_ALREADY_SCHEDULED');
    });
  });

  describe('GET /vaults/:id/certificate', () => {
    it('should return 200 with certificate when found', async () => {
      const { app, deps } = createTestServer();
      const agent = authenticatedAgent(app, owner);

      const mockCertificate = {
        version: 1,
        containerId: 'vault-1',
        containerName: 'My Vault',
        sealHash: 'abcdef1234567890',
        sealedAt: '2024-01-01T00:00:00.000Z',
        destroyedAt: '2024-06-01T00:00:00.000Z',
        nonAccessVerification: {
          containerId: 'vault-1',
          nonAccessConfirmed: true,
          accessedFileIds: [],
          inconsistentFileIds: [],
          totalFilesChecked: 3,
        },
        fileDestructionProofs: [
          {
            fileId: 'file-1',
            destructionHash: 'hash1',
            ledgerEntryHash: 'ledger1',
            timestamp: '2024-06-01T00:00:00.000Z',
          },
        ],
        containerLedgerEntryHash: 'containerledger1',
        operatorPublicKey: '02abcdef',
        signature: 'c2lnbmF0dXJl',
      };

      deps.deletionService.getCertificate.mockResolvedValueOnce(
        mockCertificate,
      );

      const res = await agent
        .get('/vaults/vault-1/certificate')
        .expect(200);

      expect(res.body).toHaveProperty('version', 1);
      expect(res.body).toHaveProperty('containerId', 'vault-1');
      expect(res.body).toHaveProperty('containerName', 'My Vault');
      expect(res.body).toHaveProperty('sealHash');
      expect(res.body).toHaveProperty('signature');
      expect(res.body).toHaveProperty('nonAccessVerification');
      expect(res.body).toHaveProperty('fileDestructionProofs');
      expect(deps.deletionService.getCertificate).toHaveBeenCalledWith(
        'vault-1',
        owner.id,
      );
    });

    it('should return 404 when no certificate exists', async () => {
      const { app, deps } = createTestServer();
      const agent = authenticatedAgent(app, owner);

      deps.deletionService.getCertificate.mockResolvedValueOnce(null);

      const res = await agent
        .get('/vaults/vault-1/certificate')
        .expect(404);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 403 when requester is unauthorized', async () => {
      const { app, deps } = createTestServer();
      const agent = authenticatedAgent(app, owner);

      const forbiddenError = new Error('Forbidden');
      (forbiddenError as unknown as { code: string }).code = 'FORBIDDEN';
      deps.deletionService.getCertificate.mockRejectedValueOnce(
        forbiddenError,
      );

      const res = await agent
        .get('/vaults/vault-1/certificate')
        .expect(403);

      expect(res.body).toHaveProperty('message');
    });
  });
});
