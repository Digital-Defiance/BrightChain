import { VaultContainerState } from '../enumerations/vault-container-state';
import { VaultState } from '../enumerations/vault-state';
import {
  DuplicateVaultContainerNameError,
  VaultContainerDestroyedError,
  VaultContainerNotFoundError,
} from '../errors';
import type { IFileMetadataBase } from '../interfaces/bases/file-metadata';
import type { IFolderMetadataBase } from '../interfaces/bases/folder-metadata';
import type { IVaultContainerBase } from '../interfaces/bases/vault-container';
import type { IVaultContainerRepository } from '../interfaces/services/vault-container-repository';
import {
  IVaultContainerServiceDeps,
  VaultContainerService,
} from '../services/vault-container-service';

// ── Helpers ─────────────────────────────────────────────────────────

let idCounter = 0;
function generateId(): string {
  return `id-${++idCounter}`;
}

function _makeContainer(
  overrides: Partial<IVaultContainerBase<string>> = {},
): IVaultContainerBase<string> {
  const now = new Date().toISOString();
  return {
    id: 'vc-1',
    ownerId: 'user-1',
    name: 'Test Vault',
    rootFolderId: 'root-folder-1',
    approvalGoverned: false,
    state: VaultContainerState.Active,
    usedBytes: 0,
    createdAt: now,
    updatedAt: now,
    createdBy: 'user-1',
    updatedBy: 'user-1',
    ...overrides,
  };
}

function makeFileMetadata(
  id: string,
  vaultContainerId: string,
): IFileMetadataBase<string> {
  const now = new Date().toISOString();
  return {
    id,
    ownerId: 'user-1',
    vaultContainerId,
    folderId: 'folder-1',
    fileName: `file-${id}.txt`,
    mimeType: 'text/plain',
    sizeBytes: 100,
    tags: [],
    currentVersionId: `ver-${id}`,
    vaultCreationLedgerEntryHash: new Uint8Array(64),
    approvalGoverned: false,
    visibleWatermark: false,
    invisibleWatermark: false,
    createdAt: now,
    updatedAt: now,
    createdBy: 'user-1',
    updatedBy: 'user-1',
  };
}

class InMemoryVaultContainerRepository
  implements IVaultContainerRepository<string>
{
  public containers = new Map<string, IVaultContainerBase<string>>();
  public files = new Map<string, IFileMetadataBase<string>>();
  public folderCount = 0;

  async getContainerById(
    containerId: string,
  ): Promise<IVaultContainerBase<string> | null> {
    return this.containers.get(containerId) ?? null;
  }

  async getContainersByOwner(
    ownerId: string,
  ): Promise<IVaultContainerBase<string>[]> {
    return [...this.containers.values()].filter((c) => c.ownerId === ownerId);
  }

  async createContainer(
    container: IVaultContainerBase<string>,
  ): Promise<IVaultContainerBase<string>> {
    this.containers.set(container.id, { ...container });
    return { ...container };
  }

  async updateContainer(
    containerId: string,
    updates: Partial<IVaultContainerBase<string>>,
  ): Promise<IVaultContainerBase<string>> {
    const existing = this.containers.get(containerId);
    if (!existing) throw new Error('not found');
    const updated = { ...existing, ...updates };
    this.containers.set(containerId, updated);
    return { ...updated };
  }

  async containerNameExists(name: string, ownerId: string): Promise<boolean> {
    for (const c of this.containers.values()) {
      if (c.name === name && c.ownerId === ownerId) return true;
    }
    return false;
  }

  async getAllFileIdsInContainer(containerId: string): Promise<string[]> {
    return [...this.files.values()]
      .filter((f) => f.vaultContainerId === containerId)
      .map((f) => f.id);
  }

  async getAllFilesInContainer(
    containerId: string,
  ): Promise<IFileMetadataBase<string>[]> {
    return [...this.files.values()].filter(
      (f) => f.vaultContainerId === containerId,
    );
  }

  async getFileCount(containerId: string): Promise<number> {
    return [...this.files.values()].filter(
      (f) => f.vaultContainerId === containerId,
    ).length;
  }

  async getFolderCount(_containerId: string): Promise<number> {
    return this.folderCount;
  }
}

function makeMockDeps(): IVaultContainerServiceDeps<string> {
  return {
    createRootFolder: jest.fn().mockImplementation(
      async (
        ownerId: string,
        _vaultContainerId: string,
      ): Promise<IFolderMetadataBase<string>> => ({
        id: generateId(),
        ownerId,
        vaultContainerId: _vaultContainerId,
        name: 'Root',
        approvalGoverned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: ownerId,
        updatedBy: ownerId,
      }),
    ),
    destroyFile: jest.fn().mockResolvedValue({
      destructionHash: new Uint8Array([1, 2, 3]),
      ledgerEntryHash: new Uint8Array([4, 5, 6]),
      timestamp: new Date(),
    }),
    recordOnLedger: jest.fn().mockResolvedValue(new Uint8Array([7, 8, 9])),
    getFileVaultState: jest.fn().mockResolvedValue(VaultState.Sealed),
    verifyFileNonAccess: jest
      .fn()
      .mockResolvedValue({ nonAccessConfirmed: true, consistent: true }),
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('VaultContainerService', () => {
  let repo: InMemoryVaultContainerRepository;
  let deps: ReturnType<typeof makeMockDeps>;
  let service: VaultContainerService<string>;

  beforeEach(() => {
    idCounter = 0;
    repo = new InMemoryVaultContainerRepository();
    deps = makeMockDeps();
    service = new VaultContainerService(repo, deps, generateId);
  });

  // ── createContainer ─────────────────────────────────────────────

  describe('createContainer', () => {
    it('creates a container with a root folder', async () => {
      const container = await service.createContainer({
        name: 'Source Protection',
        ownerId: 'user-1',
      });

      expect(container.name).toBe('Source Protection');
      expect(container.ownerId).toBe('user-1');
      expect(container.state).toBe(VaultContainerState.Active);
      expect(container.usedBytes).toBe(0);
      expect(container.rootFolderId).toBeDefined();
      expect(deps.createRootFolder).toHaveBeenCalledTimes(1);
      expect(repo.containers.size).toBe(1);
    });

    it('rejects duplicate container name for same owner', async () => {
      await service.createContainer({
        name: 'My Vault',
        ownerId: 'user-1',
      });

      await expect(
        service.createContainer({
          name: 'My Vault',
          ownerId: 'user-1',
        }),
      ).rejects.toThrow(DuplicateVaultContainerNameError);
    });

    it('allows same name for different owners', async () => {
      const c1 = await service.createContainer({
        name: 'Shared Name',
        ownerId: 'user-1',
      });
      const c2 = await service.createContainer({
        name: 'Shared Name',
        ownerId: 'user-2',
      });

      expect(c1.id).not.toBe(c2.id);
    });

    it('sets approvalGoverned when specified', async () => {
      const container = await service.createContainer({
        name: 'Governed',
        ownerId: 'user-1',
        approvalGoverned: true,
      });

      expect(container.approvalGoverned).toBe(true);
    });

    it('sets quotaBytes when specified', async () => {
      const container = await service.createContainer({
        name: 'Limited',
        ownerId: 'user-1',
        quotaBytes: 1024 * 1024,
      });

      expect(container.quotaBytes).toBe(1024 * 1024);
    });
  });

  // ── getContainer ────────────────────────────────────────────────

  describe('getContainer', () => {
    it('returns existing container', async () => {
      const created = await service.createContainer({
        name: 'Test',
        ownerId: 'user-1',
      });

      const fetched = await service.getContainer(created.id, 'user-1');
      expect(fetched.id).toBe(created.id);
      expect(fetched.name).toBe('Test');
    });

    it('throws VaultContainerNotFoundError for nonexistent ID', async () => {
      await expect(
        service.getContainer('nonexistent', 'user-1'),
      ).rejects.toThrow(VaultContainerNotFoundError);
    });
  });

  // ── listContainers ──────────────────────────────────────────────

  describe('listContainers', () => {
    it('returns summaries for all user containers', async () => {
      await service.createContainer({ name: 'A', ownerId: 'user-1' });
      await service.createContainer({ name: 'B', ownerId: 'user-1' });

      const summaries = await service.listContainers('user-1');
      expect(summaries).toHaveLength(2);
      expect(summaries[0].container.name).toBe('A');
      expect(summaries[1].container.name).toBe('B');
    });

    it('returns empty array for user with no containers', async () => {
      const summaries = await service.listContainers('user-1');
      expect(summaries).toHaveLength(0);
    });

    it('includes seal status in summaries', async () => {
      const container = await service.createContainer({
        name: 'Test',
        ownerId: 'user-1',
      });
      repo.files.set('f1', makeFileMetadata('f1', container.id));

      const summaries = await service.listContainers('user-1');
      expect(summaries[0].sealStatus.totalFiles).toBe(1);
      expect(summaries[0].sealStatus.sealedCount).toBe(1);
      expect(summaries[0].sealStatus.allPristine).toBe(true);
    });
  });

  // ── updateContainer ─────────────────────────────────────────────

  describe('updateContainer', () => {
    it('updates name and description', async () => {
      const container = await service.createContainer({
        name: 'Old Name',
        ownerId: 'user-1',
      });

      const updated = await service.updateContainer(
        container.id,
        { name: 'New Name', description: 'Updated' },
        'user-1',
      );

      expect(updated.name).toBe('New Name');
      expect(updated.description).toBe('Updated');
    });

    it('rejects update on destroyed container', async () => {
      const container = await service.createContainer({
        name: 'Doomed',
        ownerId: 'user-1',
      });
      await repo.updateContainer(container.id, {
        state: VaultContainerState.Destroyed,
      });

      await expect(
        service.updateContainer(container.id, { name: 'Nope' }, 'user-1'),
      ).rejects.toThrow(VaultContainerDestroyedError);
    });

    it('rejects duplicate name on update', async () => {
      await service.createContainer({ name: 'A', ownerId: 'user-1' });
      const b = await service.createContainer({
        name: 'B',
        ownerId: 'user-1',
      });

      await expect(
        service.updateContainer(b.id, { name: 'A' }, 'user-1'),
      ).rejects.toThrow(DuplicateVaultContainerNameError);
    });
  });

  // ── lockContainer ───────────────────────────────────────────────

  describe('lockContainer', () => {
    it('transitions Active to Locked', async () => {
      const container = await service.createContainer({
        name: 'Lockable',
        ownerId: 'user-1',
      });

      const locked = await service.lockContainer(container.id, 'user-1');
      expect(locked.state).toBe(VaultContainerState.Locked);
    });

    it('is idempotent on already-locked container', async () => {
      const container = await service.createContainer({
        name: 'Lockable',
        ownerId: 'user-1',
      });
      await service.lockContainer(container.id, 'user-1');
      const locked = await service.lockContainer(container.id, 'user-1');
      expect(locked.state).toBe(VaultContainerState.Locked);
    });

    it('rejects lock on destroyed container', async () => {
      const container = await service.createContainer({
        name: 'Doomed',
        ownerId: 'user-1',
      });
      await repo.updateContainer(container.id, {
        state: VaultContainerState.Destroyed,
      });

      await expect(
        service.lockContainer(container.id, 'user-1'),
      ).rejects.toThrow(VaultContainerDestroyedError);
    });
  });

  // ── destroyContainer ────────────────────────────────────────────

  describe('destroyContainer', () => {
    it('cascade-destroys all files and marks container destroyed', async () => {
      const container = await service.createContainer({
        name: 'Destructible',
        ownerId: 'user-1',
      });
      repo.files.set('f1', makeFileMetadata('f1', container.id));
      repo.files.set('f2', makeFileMetadata('f2', container.id));

      const result = await service.destroyContainer(container.id, 'user-1');

      expect(result.succeeded).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(result.containerLedgerEntryHash).toBeDefined();
      expect(deps.destroyFile).toHaveBeenCalledTimes(2);
      expect(deps.recordOnLedger).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'vault_container_destroyed',
          filesDestroyed: 2,
          filesFailed: 0,
        }),
      );

      // Container should be marked destroyed
      const updated = await repo.getContainerById(container.id);
      expect(updated?.state).toBe(VaultContainerState.Destroyed);
    });

    it('collects failures without aborting (best-effort)', async () => {
      const container = await service.createContainer({
        name: 'Partial',
        ownerId: 'user-1',
      });
      repo.files.set('f1', makeFileMetadata('f1', container.id));
      repo.files.set('f2', makeFileMetadata('f2', container.id));

      // First file succeeds, second fails
      deps.destroyFile
        .mockResolvedValueOnce({
          destructionHash: new Uint8Array([1]),
          ledgerEntryHash: new Uint8Array([2]),
          timestamp: new Date(),
        })
        .mockRejectedValueOnce(new Error('Vault already destroyed'));

      const result = await service.destroyContainer(container.id, 'user-1');

      expect(result.succeeded).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toBe('Vault already destroyed');
    });

    it('rejects destruction of already-destroyed container', async () => {
      const container = await service.createContainer({
        name: 'Gone',
        ownerId: 'user-1',
      });
      await repo.updateContainer(container.id, {
        state: VaultContainerState.Destroyed,
      });

      await expect(
        service.destroyContainer(container.id, 'user-1'),
      ).rejects.toThrow(VaultContainerDestroyedError);
    });

    it('handles empty container (no files)', async () => {
      const container = await service.createContainer({
        name: 'Empty',
        ownerId: 'user-1',
      });

      const result = await service.destroyContainer(container.id, 'user-1');

      expect(result.succeeded).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
      expect(deps.destroyFile).not.toHaveBeenCalled();
    });
  });

  // ── getSealStatus ───────────────────────────────────────────────

  describe('getSealStatus', () => {
    it('reports all pristine when all files are sealed', async () => {
      const container = await service.createContainer({
        name: 'Pristine',
        ownerId: 'user-1',
      });
      repo.files.set('f1', makeFileMetadata('f1', container.id));
      repo.files.set('f2', makeFileMetadata('f2', container.id));
      deps.getFileVaultState.mockResolvedValue(VaultState.Sealed);

      const status = await service.getSealStatus(container.id, 'user-1');

      expect(status.totalFiles).toBe(2);
      expect(status.sealedCount).toBe(2);
      expect(status.accessedCount).toBe(0);
      expect(status.destroyedCount).toBe(0);
      expect(status.allPristine).toBe(true);
    });

    it('reports not pristine when any file is accessed', async () => {
      const container = await service.createContainer({
        name: 'Mixed',
        ownerId: 'user-1',
      });
      repo.files.set('f1', makeFileMetadata('f1', container.id));
      repo.files.set('f2', makeFileMetadata('f2', container.id));
      deps.getFileVaultState
        .mockResolvedValueOnce(VaultState.Sealed)
        .mockResolvedValueOnce(VaultState.Accessed);

      const status = await service.getSealStatus(container.id, 'user-1');

      expect(status.sealedCount).toBe(1);
      expect(status.accessedCount).toBe(1);
      expect(status.allPristine).toBe(false);
    });

    it('reports empty container as not pristine', async () => {
      const container = await service.createContainer({
        name: 'Empty',
        ownerId: 'user-1',
      });

      const status = await service.getSealStatus(container.id, 'user-1');

      expect(status.totalFiles).toBe(0);
      expect(status.allPristine).toBe(false);
    });
  });

  // ── verifyNonAccess ─────────────────────────────────────────────

  describe('verifyNonAccess', () => {
    it('confirms non-access when all files are pristine', async () => {
      const container = await service.createContainer({
        name: 'Untouched',
        ownerId: 'user-1',
      });
      repo.files.set('f1', makeFileMetadata('f1', container.id));
      repo.files.set('f2', makeFileMetadata('f2', container.id));

      const result = await service.verifyNonAccess(container.id, 'user-1');

      expect(result.nonAccessConfirmed).toBe(true);
      expect(result.accessedFileIds).toHaveLength(0);
      expect(result.inconsistentFileIds).toHaveLength(0);
      expect(result.totalFilesChecked).toBe(2);
    });

    it('reports accessed files', async () => {
      const container = await service.createContainer({
        name: 'Accessed',
        ownerId: 'user-1',
      });
      repo.files.set('f1', makeFileMetadata('f1', container.id));
      repo.files.set('f2', makeFileMetadata('f2', container.id));
      deps.verifyFileNonAccess
        .mockResolvedValueOnce({ nonAccessConfirmed: true, consistent: true })
        .mockResolvedValueOnce({ nonAccessConfirmed: false, consistent: true });

      const result = await service.verifyNonAccess(container.id, 'user-1');

      expect(result.nonAccessConfirmed).toBe(false);
      expect(result.accessedFileIds).toHaveLength(1);
    });

    it('reports inconsistent files (snapshot-restore detection)', async () => {
      const container = await service.createContainer({
        name: 'Tampered',
        ownerId: 'user-1',
      });
      repo.files.set('f1', makeFileMetadata('f1', container.id));
      deps.verifyFileNonAccess.mockResolvedValueOnce({
        nonAccessConfirmed: false,
        consistent: false,
      });

      const result = await service.verifyNonAccess(container.id, 'user-1');

      expect(result.nonAccessConfirmed).toBe(false);
      expect(result.inconsistentFileIds).toHaveLength(1);
    });

    it('handles verification errors as inconsistencies', async () => {
      const container = await service.createContainer({
        name: 'Error',
        ownerId: 'user-1',
      });
      repo.files.set('f1', makeFileMetadata('f1', container.id));
      deps.verifyFileNonAccess.mockRejectedValueOnce(
        new Error('SealLedgerInconsistencyError'),
      );

      const result = await service.verifyNonAccess(container.id, 'user-1');

      expect(result.nonAccessConfirmed).toBe(false);
      expect(result.inconsistentFileIds).toHaveLength(1);
    });
  });

  // ── checkFileAccessStatus (seal break warning) ──────────────────

  describe('checkFileAccessStatus', () => {
    it('returns seal break warning for sealed file', async () => {
      deps.getFileVaultState.mockResolvedValue(VaultState.Sealed);

      const status = await service.checkFileAccessStatus('f1', 'user-1');

      expect(status.requiresSealBreakConfirmation).toBe(true);
      expect(status.warningMessage).toContain('permanently break');
      expect(status.warningMessage).toContain('cryptographic seal');
      expect(status.vaultState).toBe(VaultState.Sealed);
    });

    it('returns no warning for already-accessed file', async () => {
      deps.getFileVaultState.mockResolvedValue(VaultState.Accessed);

      const status = await service.checkFileAccessStatus('f1', 'user-1');

      expect(status.requiresSealBreakConfirmation).toBe(false);
      expect(status.warningMessage).toBeUndefined();
      expect(status.vaultState).toBe(VaultState.Accessed);
    });

    it('returns no warning for destroyed file', async () => {
      deps.getFileVaultState.mockResolvedValue(VaultState.Destroyed);

      const status = await service.checkFileAccessStatus('f1', 'user-1');

      expect(status.requiresSealBreakConfirmation).toBe(false);
      expect(status.warningMessage).toBeUndefined();
    });
  });
});
