import { VaultContainerState } from '../enumerations/vault-container-state';
import { VaultVisibility } from '../enumerations/vault-visibility';
import { DISOWNED_OWNER_SENTINEL } from '../constants';
import {
  DeletionAlreadyScheduledError,
  DisownRequiresPublicVisibilityError,
  InvalidStateTransitionError,
  VaultAlreadyDisownedError,
} from '../errors';
import type { ICertificateOfDestruction } from '../interfaces/bases/certificate-of-destruction';
import type { IVaultContainerBase } from '../interfaces/bases/vault-container';
import type { ICertificateRepository } from '../interfaces/services/certificate-repository';
import type {
  IContainerDestructionResult,
  IContainerNonAccessResult,
} from '../interfaces/params/vault-container-params';
import type { IVaultContainerService } from '../interfaces/services/vault-container-service';
import {
  DeletionService,
  IDeletionServiceDeps,
} from '../services/deletion-service';

// ── Helpers ─────────────────────────────────────────────────────────

function makeContainer(
  overrides: Partial<IVaultContainerBase<string>> = {},
): IVaultContainerBase<string> {
  return {
    id: 'container-1',
    ownerId: 'owner-1',
    name: 'Test Vault',
    rootFolderId: 'root-folder-1',
    visibility: VaultVisibility.Private,
    approvalGoverned: false,
    state: VaultContainerState.Active,
    usedBytes: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    createdBy: 'owner-1',
    updatedBy: 'owner-1',
    ...overrides,
  };
}

function makeDestructionResult(
  containerId = 'container-1',
): IContainerDestructionResult<string> {
  return {
    containerId,
    succeeded: [
      {
        fileId: 'file-1',
        proof: {
          fileId: 'file-1',
          destructionHash: new Uint8Array([10, 20, 30]),
          ledgerEntryHash: new Uint8Array([40, 50, 60]),
          timestamp: new Date('2024-06-01T00:00:00Z'),
        },
      },
    ],
    failed: [],
    containerLedgerEntryHash: new Uint8Array([70, 80, 90]),
    timestamp: new Date('2024-06-01T00:00:00Z'),
  };
}

function makeNonAccessResult(
  containerId = 'container-1',
  confirmed = true,
): IContainerNonAccessResult<string> {
  return {
    containerId,
    nonAccessConfirmed: confirmed,
    accessedFileIds: confirmed ? [] : ['file-accessed-1'],
    inconsistentFileIds: [],
    totalFilesChecked: 3,
  };
}

function makeCertificate(
  containerId = 'container-1',
): ICertificateOfDestruction {
  return {
    version: 1,
    containerId,
    containerName: 'Test Vault',
    sealHash: 'abc123',
    sealedAt: '2024-01-01T00:00:00Z',
    destroyedAt: '2024-06-01T00:00:00Z',
    nonAccessVerification: {
      containerId,
      nonAccessConfirmed: true,
      accessedFileIds: [],
      inconsistentFileIds: [],
      totalFilesChecked: 3,
    },
    fileDestructionProofs: [
      {
        fileId: 'file-1',
        destructionHash: '0a141e',
        ledgerEntryHash: '28323c',
        timestamp: '2024-06-01T00:00:00.000Z',
      },
    ],
    containerLedgerEntryHash: '46505a',
    operatorPublicKey: '02abcdef',
    signature: 'dGVzdC1zaWduYXR1cmU=',
  };
}

function makeMockVaultContainerService(): jest.Mocked<
  Pick<
    IVaultContainerService<string>,
    'getContainer' | 'destroyContainer' | 'verifyNonAccess'
  >
> &
  IVaultContainerService<string> {
  return {
    getContainer: jest.fn(),
    destroyContainer: jest.fn(),
    verifyNonAccess: jest.fn(),
    createContainer: jest.fn(),
    listContainers: jest.fn(),
    listPublicContainers: jest.fn(),
    updateContainer: jest.fn(),
    lockContainer: jest.fn(),
    sealContainer: jest.fn(),
    getSealStatus: jest.fn(),
    checkFileAccessStatus: jest.fn(),
  } as jest.Mocked<IVaultContainerService<string>>;
}

function makeMockCertificateRepository(): jest.Mocked<ICertificateRepository> {
  return {
    storeCertificate: jest.fn().mockResolvedValue(undefined),
    getCertificateByContainerId: jest.fn().mockResolvedValue(null),
  };
}

function makeMockDeps(): jest.Mocked<IDeletionServiceDeps<string>> {
  return {
    recordOnLedger: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    signCertificate: jest.fn().mockImplementation((payload) => ({
      ...payload,
      signature: 'dGVzdC1zaWduYXR1cmU=',
    })),
    operatorPublicKey: '02abcdef',
    cooldownDays: 30,
    getExpiredPendingDeletions: jest.fn().mockResolvedValue([]),
    systemRequesterId: 'system-user',
    updateContainerRaw: jest.fn().mockImplementation((_id, updates) =>
      Promise.resolve(makeContainer(updates)),
    ),
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('DeletionService', () => {
  let mockVCS: jest.Mocked<IVaultContainerService<string>>;
  let mockCertRepo: jest.Mocked<ICertificateRepository>;
  let mockDeps: jest.Mocked<IDeletionServiceDeps<string>>;
  let service: DeletionService<string>;

  beforeEach(() => {
    mockVCS = makeMockVaultContainerService();
    mockCertRepo = makeMockCertificateRepository();
    mockDeps = makeMockDeps();
    service = new DeletionService(mockVCS, mockCertRepo, mockDeps);
  });

  // ── deleteVaultContainer: private/unlisted immediate deletion ───

  describe('deleteVaultContainer — private/unlisted immediate deletion', () => {
    it('should immediately destroy a private vault', async () => {
      const container = makeContainer({
        visibility: VaultVisibility.Private,
        state: VaultContainerState.Active,
      });
      mockVCS.getContainer.mockResolvedValue(container);
      mockVCS.destroyContainer.mockResolvedValue(makeDestructionResult());

      const result = await service.deleteVaultContainer(
        'container-1',
        'owner-1',
      );

      expect(result.type).toBe('immediate');
      if (result.type === 'immediate') {
        expect(result.destructionResult).toBeDefined();
        expect(result.certificateOmittedReason).toBe('NOT_SEALED');
        expect(result.certificate).toBeUndefined();
      }
      expect(mockVCS.destroyContainer).toHaveBeenCalledWith(
        'container-1',
        'owner-1',
      );
    });

    it('should immediately destroy an unlisted vault', async () => {
      const container = makeContainer({
        visibility: VaultVisibility.Unlisted,
        state: VaultContainerState.Active,
      });
      mockVCS.getContainer.mockResolvedValue(container);
      mockVCS.destroyContainer.mockResolvedValue(makeDestructionResult());

      const result = await service.deleteVaultContainer(
        'container-1',
        'owner-1',
      );

      expect(result.type).toBe('immediate');
      if (result.type === 'immediate') {
        expect(result.certificateOmittedReason).toBe('NOT_SEALED');
      }
    });

    it('should set certificateOmittedReason to NOT_SEALED for active vaults', async () => {
      const container = makeContainer({
        state: VaultContainerState.Active,
      });
      mockVCS.getContainer.mockResolvedValue(container);
      mockVCS.destroyContainer.mockResolvedValue(makeDestructionResult());

      const result = await service.deleteVaultContainer(
        'container-1',
        'owner-1',
      );

      expect(result.type).toBe('immediate');
      if (result.type === 'immediate') {
        expect(result.certificateOmittedReason).toBe('NOT_SEALED');
        expect(result.certificate).toBeUndefined();
      }
    });
  });

  // ── deleteVaultContainer: sealed vault with certificate ─────────

  describe('deleteVaultContainer — sealed vault with certificate', () => {
    it('should generate certificate when sealed vault has confirmed non-access', async () => {
      const container = makeContainer({
        state: VaultContainerState.Sealed,
        sealHash: 'abc123',
        sealedAt: '2024-01-01T00:00:00Z',
      });
      mockVCS.getContainer.mockResolvedValue(container);
      mockVCS.verifyNonAccess.mockResolvedValue(makeNonAccessResult());
      mockVCS.destroyContainer.mockResolvedValue(makeDestructionResult());

      const result = await service.deleteVaultContainer(
        'container-1',
        'owner-1',
      );

      expect(result.type).toBe('immediate');
      if (result.type === 'immediate') {
        expect(result.certificate).toBeDefined();
        expect(result.certificate?.version).toBe(1);
        expect(result.certificate?.containerId).toBe('container-1');
        expect(result.certificate?.signature).toBeDefined();
        expect(result.certificateOmittedReason).toBeUndefined();
      }

      // Verify non-access was called
      expect(mockVCS.verifyNonAccess).toHaveBeenCalledWith(
        'container-1',
        'owner-1',
      );

      // Certificate was signed
      expect(mockDeps.signCertificate).toHaveBeenCalled();

      // Certificate was persisted
      expect(mockCertRepo.storeCertificate).toHaveBeenCalled();
    });

    it('should omit certificate with SEAL_BROKEN when non-access fails', async () => {
      const container = makeContainer({
        state: VaultContainerState.Sealed,
        sealHash: 'abc123',
        sealedAt: '2024-01-01T00:00:00Z',
      });
      mockVCS.getContainer.mockResolvedValue(container);
      mockVCS.verifyNonAccess.mockResolvedValue(
        makeNonAccessResult('container-1', false),
      );
      mockVCS.destroyContainer.mockResolvedValue(makeDestructionResult());

      const result = await service.deleteVaultContainer(
        'container-1',
        'owner-1',
      );

      expect(result.type).toBe('immediate');
      if (result.type === 'immediate') {
        expect(result.certificate).toBeUndefined();
        expect(result.certificateOmittedReason).toBe('SEAL_BROKEN');
        expect(result.accessedFileIds).toContain('file-accessed-1');
      }

      // Certificate should NOT be signed or persisted
      expect(mockDeps.signCertificate).not.toHaveBeenCalled();
      expect(mockCertRepo.storeCertificate).not.toHaveBeenCalled();
    });

    it('should still destroy vault even when seal is broken', async () => {
      const container = makeContainer({
        state: VaultContainerState.Sealed,
      });
      mockVCS.getContainer.mockResolvedValue(container);
      mockVCS.verifyNonAccess.mockResolvedValue(
        makeNonAccessResult('container-1', false),
      );
      mockVCS.destroyContainer.mockResolvedValue(makeDestructionResult());

      await service.deleteVaultContainer('container-1', 'owner-1');

      expect(mockVCS.destroyContainer).toHaveBeenCalledWith(
        'container-1',
        'owner-1',
      );
    });
  });

  // ── deleteVaultContainer: public vault cool-down scheduling ─────

  describe('deleteVaultContainer — public vault cool-down scheduling', () => {
    it('should schedule cool-down for public vault', async () => {
      const container = makeContainer({
        visibility: VaultVisibility.Public,
        state: VaultContainerState.Active,
      });
      mockVCS.getContainer.mockResolvedValue(container);

      const result = await service.deleteVaultContainer(
        'container-1',
        'owner-1',
      );

      expect(result.type).toBe('pending');
      if (result.type === 'pending') {
        expect(result.pendingDeletionAt).toBeDefined();
        // Should be approximately 30 days from now
        const pendingDate = new Date(result.pendingDeletionAt);
        const now = new Date();
        const diffDays =
          (pendingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        expect(diffDays).toBeGreaterThan(29);
        expect(diffDays).toBeLessThanOrEqual(30.01);
      }

      // Should NOT destroy immediately
      expect(mockVCS.destroyContainer).not.toHaveBeenCalled();

      // Should record ledger entry
      expect(mockDeps.recordOnLedger).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'vault_container_deletion_scheduled',
          containerId: 'container-1',
        }),
      );

      // Should update container state
      expect(mockDeps.updateContainerRaw).toHaveBeenCalledWith(
        'container-1',
        expect.objectContaining({
          state: VaultContainerState.PendingDeletion,
          previousState: VaultContainerState.Active,
        }),
      );
    });

    it('should throw DeletionAlreadyScheduledError for vault already pending', async () => {
      const container = makeContainer({
        visibility: VaultVisibility.Public,
        state: VaultContainerState.PendingDeletion,
        pendingDeletionAt: '2025-07-01T00:00:00Z',
      });
      mockVCS.getContainer.mockResolvedValue(container);

      await expect(
        service.deleteVaultContainer('container-1', 'owner-1'),
      ).rejects.toThrow(DeletionAlreadyScheduledError);
    });
  });

  // ── disownVaultContainer ────────────────────────────────────────

  describe('disownVaultContainer', () => {
    it('should disown a public vault', async () => {
      const container = makeContainer({
        visibility: VaultVisibility.Public,
        state: VaultContainerState.Active,
      });
      mockVCS.getContainer.mockResolvedValue(container);

      await service.disownVaultContainer('container-1', 'owner-1');

      // Should record ledger entry
      expect(mockDeps.recordOnLedger).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'vault_container_disowned',
          containerId: 'container-1',
          disownedBy: 'owner-1',
        }),
      );

      // Should update container with disowned state and sentinel owner
      expect(mockDeps.updateContainerRaw).toHaveBeenCalledWith(
        'container-1',
        expect.objectContaining({
          state: VaultContainerState.Disowned,
          ownerId: DISOWNED_OWNER_SENTINEL,
        }),
      );
    });

    it('should throw DisownRequiresPublicVisibilityError for private vault', async () => {
      const container = makeContainer({
        visibility: VaultVisibility.Private,
        state: VaultContainerState.Active,
      });
      mockVCS.getContainer.mockResolvedValue(container);

      await expect(
        service.disownVaultContainer('container-1', 'owner-1'),
      ).rejects.toThrow(DisownRequiresPublicVisibilityError);
    });

    it('should throw DisownRequiresPublicVisibilityError for unlisted vault', async () => {
      const container = makeContainer({
        visibility: VaultVisibility.Unlisted,
        state: VaultContainerState.Active,
      });
      mockVCS.getContainer.mockResolvedValue(container);

      await expect(
        service.disownVaultContainer('container-1', 'owner-1'),
      ).rejects.toThrow(DisownRequiresPublicVisibilityError);
    });

    it('should throw VaultAlreadyDisownedError for already disowned vault', async () => {
      const container = makeContainer({
        visibility: VaultVisibility.Public,
        state: VaultContainerState.Disowned,
      });
      mockVCS.getContainer.mockResolvedValue(container);

      await expect(
        service.disownVaultContainer('container-1', 'owner-1'),
      ).rejects.toThrow(VaultAlreadyDisownedError);
    });

    it('should set disownedAt and disownedBy fields', async () => {
      const container = makeContainer({
        visibility: VaultVisibility.Public,
        state: VaultContainerState.Active,
      });
      mockVCS.getContainer.mockResolvedValue(container);

      await service.disownVaultContainer('container-1', 'owner-1');

      expect(mockDeps.updateContainerRaw).toHaveBeenCalledWith(
        'container-1',
        expect.objectContaining({
          disownedBy: 'owner-1',
          disownedAt: expect.any(String),
        }),
      );
    });
  });

  // ── cancelPendingDeletion ───────────────────────────────────────

  describe('cancelPendingDeletion', () => {
    it('should restore previous state and clear pending fields', async () => {
      const container = makeContainer({
        state: VaultContainerState.PendingDeletion,
        previousState: VaultContainerState.Active,
        pendingDeletionAt: '2025-07-01T00:00:00Z',
      });
      mockVCS.getContainer.mockResolvedValue(container);

      await service.cancelPendingDeletion('container-1', 'owner-1');

      expect(mockDeps.updateContainerRaw).toHaveBeenCalledWith(
        'container-1',
        expect.objectContaining({
          state: VaultContainerState.Active,
          pendingDeletionAt: undefined,
          previousState: undefined,
        }),
      );
    });

    it('should restore Sealed state when previousState was Sealed', async () => {
      const container = makeContainer({
        state: VaultContainerState.PendingDeletion,
        previousState: VaultContainerState.Sealed,
        pendingDeletionAt: '2025-07-01T00:00:00Z',
      });
      mockVCS.getContainer.mockResolvedValue(container);

      await service.cancelPendingDeletion('container-1', 'owner-1');

      expect(mockDeps.updateContainerRaw).toHaveBeenCalledWith(
        'container-1',
        expect.objectContaining({
          state: VaultContainerState.Sealed,
        }),
      );
    });

    it('should record ledger entry for cancellation', async () => {
      const container = makeContainer({
        state: VaultContainerState.PendingDeletion,
        previousState: VaultContainerState.Active,
        pendingDeletionAt: '2025-07-01T00:00:00Z',
      });
      mockVCS.getContainer.mockResolvedValue(container);

      await service.cancelPendingDeletion('container-1', 'owner-1');

      expect(mockDeps.recordOnLedger).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'vault_container_deletion_cancelled',
          containerId: 'container-1',
          cancelledBy: 'owner-1',
          restoredState: VaultContainerState.Active,
        }),
      );
    });

    it('should throw when vault is not in PendingDeletion state', async () => {
      const container = makeContainer({
        state: VaultContainerState.Active,
      });
      mockVCS.getContainer.mockResolvedValue(container);

      await expect(
        service.cancelPendingDeletion('container-1', 'owner-1'),
      ).rejects.toThrow(InvalidStateTransitionError);
    });

    it('should default to Active when previousState is not set', async () => {
      const container = makeContainer({
        state: VaultContainerState.PendingDeletion,
        previousState: undefined,
        pendingDeletionAt: '2025-07-01T00:00:00Z',
      });
      mockVCS.getContainer.mockResolvedValue(container);

      await service.cancelPendingDeletion('container-1', 'owner-1');

      expect(mockDeps.updateContainerRaw).toHaveBeenCalledWith(
        'container-1',
        expect.objectContaining({
          state: VaultContainerState.Active,
        }),
      );
    });
  });

  // ── executePendingDeletions ─────────────────────────────────────

  describe('executePendingDeletions', () => {
    it('should return zero counts when no expired containers', async () => {
      mockDeps.getExpiredPendingDeletions.mockResolvedValue([]);

      const result = await service.executePendingDeletions();

      expect(result).toEqual({
        vaultsDestroyed: 0,
        certificatesGenerated: 0,
        failures: 0,
      });
    });

    it('should destroy expired pending containers', async () => {
      const container = makeContainer({
        state: VaultContainerState.PendingDeletion,
        visibility: VaultVisibility.Public,
        pendingDeletionAt: '2024-01-01T00:00:00Z',
      });
      mockDeps.getExpiredPendingDeletions.mockResolvedValue([container]);
      mockVCS.getContainer.mockResolvedValue(container);
      mockVCS.destroyContainer.mockResolvedValue(makeDestructionResult());

      const result = await service.executePendingDeletions();

      expect(result.vaultsDestroyed).toBe(1);
      expect(result.failures).toBe(0);
      expect(mockVCS.destroyContainer).toHaveBeenCalledWith(
        'container-1',
        'system-user',
      );
    });

    it('should count certificates generated for sealed vaults', async () => {
      const container = makeContainer({
        state: VaultContainerState.Sealed,
        visibility: VaultVisibility.Public,
        sealHash: 'abc123',
        sealedAt: '2024-01-01T00:00:00Z',
        pendingDeletionAt: '2024-01-01T00:00:00Z',
      });
      mockDeps.getExpiredPendingDeletions.mockResolvedValue([container]);
      mockVCS.getContainer.mockResolvedValue(container);
      mockVCS.verifyNonAccess.mockResolvedValue(makeNonAccessResult());
      mockVCS.destroyContainer.mockResolvedValue(makeDestructionResult());

      const result = await service.executePendingDeletions();

      expect(result.vaultsDestroyed).toBe(1);
      expect(result.certificatesGenerated).toBe(1);
    });

    it('should continue processing on individual failures', async () => {
      const container1 = makeContainer({
        id: 'container-1',
        state: VaultContainerState.PendingDeletion,
      });
      const container2 = makeContainer({
        id: 'container-2',
        state: VaultContainerState.PendingDeletion,
      });
      mockDeps.getExpiredPendingDeletions.mockResolvedValue([
        container1,
        container2,
      ]);

      // First container fails, second succeeds
      mockVCS.getContainer
        .mockResolvedValueOnce(container1)
        .mockResolvedValueOnce(container2);
      mockVCS.destroyContainer
        .mockRejectedValueOnce(new Error('destruction failed'))
        .mockResolvedValueOnce(makeDestructionResult('container-2'));

      const result = await service.executePendingDeletions();

      expect(result.vaultsDestroyed).toBe(1);
      expect(result.failures).toBe(1);
    });
  });

  // ── getCertificate ──────────────────────────────────────────────

  describe('getCertificate', () => {
    it('should return certificate from repository', async () => {
      const cert = makeCertificate();
      mockCertRepo.getCertificateByContainerId.mockResolvedValue(cert);

      const result = await service.getCertificate('container-1', 'owner-1');

      expect(result).toEqual(cert);
      expect(mockCertRepo.getCertificateByContainerId).toHaveBeenCalledWith(
        'container-1',
      );
    });

    it('should return null when no certificate exists', async () => {
      mockCertRepo.getCertificateByContainerId.mockResolvedValue(null);

      const result = await service.getCertificate('container-1', 'owner-1');

      expect(result).toBeNull();
    });
  });
});
