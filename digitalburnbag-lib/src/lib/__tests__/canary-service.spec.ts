import { CanaryCondition } from '../enumerations/canary-condition';
import { CanaryProvider } from '../enumerations/canary-provider';
import { FileAuditOperationType } from '../enumerations/file-audit-operation-type';
import { ProtocolAction } from '../enumerations/protocol-action';
import { CanaryBindingNotFoundError } from '../errors';
import type { ICanaryBindingBase } from '../interfaces/bases/canary-binding';
import type { IRecipientListBase } from '../interfaces/bases/recipient-list';
import type { ICanaryRepository } from '../interfaces/services/canary-repository';
import { CanaryService, ICanaryServiceDeps } from '../services/canary-service';

// ── Helpers ─────────────────────────────────────────────────────────

let idCounter = 0;
function generateId(): string {
  return `id-${++idCounter}`;
}

function makeMockRepository(): jest.Mocked<ICanaryRepository<string>> {
  return {
    getBinding: jest.fn(),
    createBinding: jest.fn(),
    updateBinding: jest.fn(),
    deleteBinding: jest.fn(),
    getBindingsByUser: jest.fn(),
    getBindingsByCondition: jest.fn(),
    getRecipientList: jest.fn(),
    createRecipientList: jest.fn(),
    updateRecipientList: jest.fn(),
    getFilesInFolders: jest.fn(),
  };
}

function makeMockDeps(): jest.Mocked<ICanaryServiceDeps<string>> {
  return {
    destroyFile: jest
      .fn()
      .mockResolvedValue({ destructionHash: new Uint8Array([10, 20, 30]) }),
    getFileContent: jest.fn().mockResolvedValue({
      content: new Uint8Array([1, 2, 3]),
      fileName: 'test.txt',
      mimeType: 'text/plain',
    }),
    sendEmailWithAttachments: jest.fn().mockResolvedValue(2),
    sendEmailWithLinks: jest.fn().mockResolvedValue(2),
    releaseToPublic: jest.fn().mockResolvedValue(1),
    scheduleDelayedAction: jest.fn().mockReturnValue('scheduled-1'),
    cancelDelayedAction: jest.fn(),
    onAuditLog: jest.fn().mockResolvedValue(undefined),
  };
}

function makeBinding(
  overrides: Partial<ICanaryBindingBase<string>> = {},
): ICanaryBindingBase<string> {
  return {
    id: 'binding-1',
    protocolId: 'protocol-1',
    vaultContainerIds: [],
    fileIds: ['file-1'],
    folderIds: [],
    protocolAction: ProtocolAction.DeleteFiles,
    canaryCondition: CanaryCondition.ABSENCE,
    canaryProvider: CanaryProvider.GITHUB,
    createdBy: 'owner-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeRecipientList(
  overrides: Partial<IRecipientListBase<string>> = {},
): IRecipientListBase<string> {
  return {
    id: 'list-1',
    name: 'Test Recipients',
    ownerId: 'owner-1',
    recipients: [
      { email: 'alice@example.com', label: 'Alice' },
      { email: 'bob@example.com', label: 'Bob' },
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

const triggerContext = { triggeredAt: new Date(), triggeredBy: 'system' };

// ── Tests ───────────────────────────────────────────────────────────

describe('CanaryService', () => {
  let mockRepo: jest.Mocked<ICanaryRepository<string>>;
  let mockDeps: jest.Mocked<ICanaryServiceDeps<string>>;
  let service: CanaryService<string>;

  beforeEach(() => {
    idCounter = 0;
    mockRepo = makeMockRepository();
    mockDeps = makeMockDeps();
    service = new CanaryService(mockRepo, mockDeps, generateId);
  });

  // ── createBinding ───────────────────────────────────────────────

  describe('createBinding', () => {
    it('should store binding and log audit', async () => {
      mockRepo.createBinding.mockResolvedValue(undefined);

      const result = await service.createBinding(
        {
          protocolId: 'protocol-1',
          fileIds: ['file-1'],
          folderIds: [],
          protocolAction: ProtocolAction.DeleteFiles,
          canaryCondition: CanaryCondition.ABSENCE,
          canaryProvider: CanaryProvider.GITHUB,
        },
        'owner-1',
      );

      expect(mockRepo.createBinding).toHaveBeenCalledTimes(1);
      expect(result.id).toBe('id-1');
      expect(result.protocolId).toBe('protocol-1');
      expect(result.createdBy).toBe('owner-1');
      expect(mockDeps.onAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: FileAuditOperationType.CanaryBindingCreated,
          actorId: 'owner-1',
          targetId: 'id-1',
          targetType: 'file',
        }),
      );
    });
  });

  // ── updateBinding ───────────────────────────────────────────────

  describe('updateBinding', () => {
    it('should apply updates and log audit', async () => {
      mockRepo.getBinding.mockResolvedValue(makeBinding());
      mockRepo.updateBinding.mockResolvedValue(undefined);

      const result = await service.updateBinding(
        'binding-1',
        { fileIds: ['file-1', 'file-2'] },
        'owner-1',
      );

      expect(mockRepo.updateBinding).toHaveBeenCalledWith(
        'binding-1',
        expect.objectContaining({ fileIds: ['file-1', 'file-2'] }),
      );
      expect(result.fileIds).toEqual(['file-1', 'file-2']);
      expect(mockDeps.onAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: FileAuditOperationType.CanaryBindingModified,
          actorId: 'owner-1',
          targetId: 'binding-1',
        }),
      );
    });
  });

  // ── deleteBinding ───────────────────────────────────────────────

  describe('deleteBinding', () => {
    it('should remove binding and log audit', async () => {
      mockRepo.getBinding.mockResolvedValue(makeBinding());
      mockRepo.deleteBinding.mockResolvedValue(undefined);

      await service.deleteBinding('binding-1', 'owner-1');

      expect(mockRepo.deleteBinding).toHaveBeenCalledWith('binding-1');
      expect(mockDeps.onAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: FileAuditOperationType.CanaryBindingDeleted,
          actorId: 'owner-1',
          targetId: 'binding-1',
        }),
      );
    });
  });

  // ── createRecipientList ─────────────────────────────────────────

  describe('createRecipientList', () => {
    it('should store list', async () => {
      mockRepo.createRecipientList.mockResolvedValue(undefined);

      const result = await service.createRecipientList(
        {
          name: 'My List',
          recipients: [{ email: 'alice@example.com', label: 'Alice' }],
        },
        'owner-1',
      );

      expect(mockRepo.createRecipientList).toHaveBeenCalledTimes(1);
      expect(result.id).toBe('id-1');
      expect(result.name).toBe('My List');
      expect(result.ownerId).toBe('owner-1');
      expect(result.recipients).toHaveLength(1);
    });
  });

  // ── updateRecipientList ─────────────────────────────────────────

  describe('updateRecipientList', () => {
    it('should add and remove recipients correctly', async () => {
      mockRepo.getRecipientList.mockResolvedValue(
        makeRecipientList({
          recipients: [
            { email: 'alice@example.com', label: 'Alice' },
            { email: 'bob@example.com', label: 'Bob' },
          ],
        }),
      );
      mockRepo.updateRecipientList.mockResolvedValue(undefined);

      const result = await service.updateRecipientList(
        'list-1',
        {
          recipientsToRemove: ['bob@example.com'],
          recipientsToAdd: [{ email: 'carol@example.com', label: 'Carol' }],
        },
        'owner-1',
      );

      expect(result.recipients).toHaveLength(2);
      expect(result.recipients.map((r) => r.email)).toEqual(
        expect.arrayContaining(['alice@example.com', 'carol@example.com']),
      );
      expect(result.recipients.map((r) => r.email)).not.toContain(
        'bob@example.com',
      );
    });
  });

  // ── executeProtocolAction ───────────────────────────────────────

  describe('executeProtocolAction', () => {
    it('DeleteFiles action invokes DestructionService for each bound file', async () => {
      const binding = makeBinding({
        protocolAction: ProtocolAction.DeleteFiles,
        fileIds: ['file-1', 'file-2'],
      });
      mockRepo.getBinding.mockResolvedValue(binding);
      mockRepo.getFilesInFolders.mockResolvedValue([]);

      const result = await service.executeProtocolAction(
        'binding-1',
        triggerContext,
      );

      expect(mockDeps.destroyFile).toHaveBeenCalledTimes(2);
      expect(mockDeps.destroyFile).toHaveBeenCalledWith('file-1', 'owner-1');
      expect(mockDeps.destroyFile).toHaveBeenCalledWith('file-2', 'owner-1');
      expect(result.filesAffected).toBe(2);
    });

    it('EmailFilesAsAttachments sends to all recipients', async () => {
      const binding = makeBinding({
        protocolAction: ProtocolAction.EmailFilesAsAttachments,
        fileIds: ['file-1'],
        recipientListId: 'list-1',
      });
      mockRepo.getBinding.mockResolvedValue(binding);
      mockRepo.getFilesInFolders.mockResolvedValue([]);
      mockRepo.getRecipientList.mockResolvedValue(makeRecipientList());

      const result = await service.executeProtocolAction(
        'binding-1',
        triggerContext,
      );

      expect(mockDeps.getFileContent).toHaveBeenCalledWith('file-1');
      expect(mockDeps.sendEmailWithAttachments).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ email: 'alice@example.com' }),
          expect.objectContaining({ email: 'bob@example.com' }),
        ]),
        expect.any(Array),
      );
      expect(result.recipientsContacted).toBe(2);
    });

    it('ReleaseToPublic releases files', async () => {
      const binding = makeBinding({
        protocolAction: ProtocolAction.ReleaseToPublic,
        fileIds: ['file-1'],
      });
      mockRepo.getBinding.mockResolvedValue(binding);
      mockRepo.getFilesInFolders.mockResolvedValue([]);

      const result = await service.executeProtocolAction(
        'binding-1',
        triggerContext,
      );

      expect(mockDeps.getFileContent).toHaveBeenCalledWith('file-1');
      expect(mockDeps.releaseToPublic).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ fileName: 'test.txt' }),
        ]),
      );
      expect(result.filesAffected).toBe(1);
    });

    it('should throw CanaryBindingNotFoundError when binding not found', async () => {
      mockRepo.getBinding.mockResolvedValue(null);

      await expect(
        service.executeProtocolAction('nonexistent', triggerContext),
      ).rejects.toThrow(CanaryBindingNotFoundError);
    });

    it('should resolve folder files via getFilesInFolders', async () => {
      const binding = makeBinding({
        protocolAction: ProtocolAction.DeleteFiles,
        fileIds: ['file-1'],
        folderIds: ['folder-1'],
      });
      mockRepo.getBinding.mockResolvedValue(binding);
      mockRepo.getFilesInFolders.mockResolvedValue(['file-2', 'file-3']);

      const result = await service.executeProtocolAction(
        'binding-1',
        triggerContext,
      );

      expect(mockRepo.getFilesInFolders).toHaveBeenCalledWith(['folder-1']);
      expect(mockDeps.destroyFile).toHaveBeenCalledTimes(3);
      expect(result.filesAffected).toBe(3);
    });
  });

  // ── dryRun ──────────────────────────────────────────────────────

  describe('dryRun', () => {
    it('should produce report without side effects', async () => {
      const binding = makeBinding({
        fileIds: ['file-1', 'file-2'],
        folderIds: ['folder-1'],
        recipientListId: 'list-1',
      });
      mockRepo.getBinding.mockResolvedValue(binding);
      mockRepo.getRecipientList.mockResolvedValue(makeRecipientList());
      mockRepo.getFilesInFolders.mockResolvedValue(['file-3']);

      const result = await service.dryRun('binding-1', 'owner-1');

      expect(result.filesAffected).toEqual(['file-1', 'file-2', 'file-3']);
      expect(result.foldersAffected).toEqual(['folder-1']);
      expect(result.recipientsToContact).toEqual([
        'alice@example.com',
        'bob@example.com',
      ]);
      expect(mockDeps.destroyFile).not.toHaveBeenCalled();
      expect(mockDeps.sendEmailWithAttachments).not.toHaveBeenCalled();
      expect(mockDeps.releaseToPublic).not.toHaveBeenCalled();
    });

    it('should throw CanaryBindingNotFoundError when binding not found', async () => {
      mockRepo.getBinding.mockResolvedValue(null);

      await expect(service.dryRun('nonexistent', 'owner-1')).rejects.toThrow(
        CanaryBindingNotFoundError,
      );
    });
  });

  // ── executeCascade ──────────────────────────────────────────────

  describe('executeCascade', () => {
    it('primary executes immediately, secondary scheduled after delay', async () => {
      const primaryBinding = makeBinding({
        id: 'primary-1',
        protocolAction: ProtocolAction.DeleteFiles,
        fileIds: ['file-1'],
        cascadeBindingIds: ['cascade-1'],
        cascadeDelayMs: [5000],
      });
      mockRepo.getBinding.mockResolvedValue(primaryBinding);
      mockRepo.getFilesInFolders.mockResolvedValue([]);
      mockDeps.scheduleDelayedAction.mockReturnValue('scheduled-1');

      const result = await service.executeCascade('primary-1', triggerContext);

      // Primary action executed (destroyFile called for file-1)
      expect(mockDeps.destroyFile).toHaveBeenCalledWith('file-1', 'owner-1');
      // Secondary scheduled with correct delay
      expect(mockDeps.scheduleDelayedAction).toHaveBeenCalledWith(
        5000,
        expect.any(Function),
      );
      expect(result.scheduledSecondaryIds).toHaveLength(1);
      expect(result.scheduledSecondaryIds[0]).toBe('scheduled-1');
      expect(result.primaryResult.filesAffected).toBe(1);
    });
  });

  // ── cancelCascade ───────────────────────────────────────────────

  describe('cancelCascade', () => {
    it('should stop pending secondary actions', async () => {
      await service.cancelCascade('cascade-1', 'owner-1');

      expect(mockDeps.cancelDelayedAction).toHaveBeenCalledWith('cascade-1');
      expect(mockDeps.onAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: FileAuditOperationType.DestructionCancelled,
          actorId: 'owner-1',
          targetId: 'cascade-1',
        }),
      );
    });
  });

  // ── handleDuressTrigger ─────────────────────────────────────────

  describe('handleDuressTrigger', () => {
    it('should evaluate all DURESS bindings for user', async () => {
      const duressBinding1 = makeBinding({
        id: 'duress-1',
        canaryCondition: CanaryCondition.DURESS,
        fileIds: ['file-1'],
      });
      const duressBinding2 = makeBinding({
        id: 'duress-2',
        canaryCondition: CanaryCondition.DURESS,
        fileIds: ['file-2'],
      });
      mockRepo.getBindingsByCondition.mockResolvedValue([
        duressBinding1,
        duressBinding2,
      ]);
      // getBinding is called by executeProtocolAction for each binding
      mockRepo.getBinding
        .mockResolvedValueOnce(duressBinding1)
        .mockResolvedValueOnce(duressBinding2);
      mockRepo.getFilesInFolders.mockResolvedValue([]);

      await service.handleDuressTrigger('user-1');

      expect(mockRepo.getBindingsByCondition).toHaveBeenCalledWith(
        CanaryCondition.DURESS,
      );
      // destroyFile called once per binding (each has 1 file)
      expect(mockDeps.destroyFile).toHaveBeenCalledTimes(2);
      expect(mockDeps.destroyFile).toHaveBeenCalledWith('file-1', 'owner-1');
      expect(mockDeps.destroyFile).toHaveBeenCalledWith('file-2', 'owner-1');
      // DuressTriggered audit logged
      expect(mockDeps.onAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: FileAuditOperationType.DuressTriggered,
          actorId: 'user-1',
          metadata: expect.objectContaining({
            bindingsExecuted: 2,
          }),
        }),
      );
    });
  });

  // ── prepareBindingKeys ──────────────────────────────────────────

  describe('prepareBindingKeys', () => {
    it('should wrap keys for platform recipients and create ephemeral shares for external', async () => {
      const binding = makeBinding({
        recipientListId: 'list-1',
        fileIds: ['file-1'],
      });
      mockRepo.getBinding.mockResolvedValue(binding);
      mockRepo.getFilesInFolders.mockResolvedValue([]);
      mockRepo.getRecipientList.mockResolvedValue(
        makeRecipientList({
          recipients: [
            {
              email: 'alice@example.com',
              label: 'Alice',
              platformUserId: 'alice-id',
            },
            { email: 'bob@external.com', label: 'Bob' },
          ],
        }),
      );
      mockRepo.updateBinding.mockResolvedValue(undefined);

      // Wire up key wrapping deps
      const depsWithKeys: ICanaryServiceDeps<string> = {
        ...mockDeps,
        readVaultSymmetricKey: jest.fn().mockResolvedValue({
          symmetricKey: new Uint8Array(32),
          currentVersionId: 'version-1',
        }),
        wrapKeyForMember: jest.fn().mockResolvedValue({ id: 'wrap-entry-1' }),
        wrapKeyForEphemeralShare: jest.fn().mockResolvedValue({
          entry: { id: 'wrap-entry-2' },
          ephemeralPrivateKey: new Uint8Array(32),
        }),
        buildShareUrl: jest.fn().mockResolvedValue({
          shareUrl: 'https://app.brightchain.com/share/link-1',
          passphrase: 'abc123',
        }),
      };

      const keyService = new CanaryService(mockRepo, depsWithKeys, generateId);

      const result = await keyService.prepareBindingKeys(
        'binding-1',
        'owner-1',
      );

      expect(result.keyWrappingEntryIds).toEqual([
        'wrap-entry-1',
        'wrap-entry-2',
      ]);
      expect(result.ephemeralShares).toHaveLength(1);
      expect(result.ephemeralShares[0]).toEqual(
        expect.objectContaining({
          recipientEmail: 'bob@external.com',
          shareUrl: 'https://app.brightchain.com/share/link-1',
          passphrase: 'abc123',
        }),
      );
      // Should auto-update the binding with the entry IDs
      expect(mockRepo.updateBinding).toHaveBeenCalledWith(
        'binding-1',
        expect.objectContaining({
          prePositionedKeyWrappingEntryIds: ['wrap-entry-1', 'wrap-entry-2'],
        }),
      );
    });

    it('should throw when key wrapping deps are not configured', async () => {
      const binding = makeBinding({
        recipientListId: 'list-1',
        fileIds: ['file-1'],
      });
      mockRepo.getBinding.mockResolvedValue(binding);
      mockRepo.getRecipientList.mockResolvedValue(makeRecipientList());
      mockRepo.getFilesInFolders.mockResolvedValue([]);

      await expect(
        service.prepareBindingKeys('binding-1', 'owner-1'),
      ).rejects.toThrow('Key wrapping dependencies are not configured');
    });

    it('should return empty results when no recipient list', async () => {
      const binding = makeBinding({ recipientListId: undefined });
      mockRepo.getBinding.mockResolvedValue(binding);

      const result = await service.prepareBindingKeys('binding-1', 'owner-1');

      expect(result.keyWrappingEntryIds).toEqual([]);
      expect(result.ephemeralShares).toEqual([]);
    });
  });

  // ── executeProtocolAction with pre-positioned keys ──────────────

  describe('executeProtocolAction with pre-positioned keys', () => {
    it('EmailFilesAsAttachments uses share links when pre-positioned keys exist', async () => {
      const binding = makeBinding({
        protocolAction: ProtocolAction.EmailFilesAsAttachments,
        fileIds: ['file-1'],
        recipientListId: 'list-1',
        prePositionedKeyWrappingEntryIds: ['wrap-1', 'wrap-2'],
      });
      mockRepo.getBinding.mockResolvedValue(binding);
      mockRepo.getFilesInFolders.mockResolvedValue([]);
      mockRepo.getRecipientList.mockResolvedValue(makeRecipientList());

      const depsWithShareLink: ICanaryServiceDeps<string> = {
        ...mockDeps,
        createEphemeralShareLink: jest.fn().mockResolvedValue({
          shareUrl: 'https://app.brightchain.com/share/link-1',
          passphrase: 'secret',
        }),
      };

      const svc = new CanaryService(mockRepo, depsWithShareLink, generateId);
      const result = await svc.executeProtocolAction(
        'binding-1',
        triggerContext,
      );

      // Should use share links, NOT getFileContent + sendEmailWithAttachments
      expect(depsWithShareLink.createEphemeralShareLink).toHaveBeenCalledWith(
        'file-1',
        'owner-1',
      );
      expect(mockDeps.getFileContent).not.toHaveBeenCalled();
      expect(mockDeps.sendEmailWithAttachments).not.toHaveBeenCalled();
      expect(result.filesAffected).toBe(1);
      expect(result.recipientsContacted).toBe(2);
    });

    it('EmailFilesAsAttachments falls back to custodial decrypt without pre-positioned keys', async () => {
      const binding = makeBinding({
        protocolAction: ProtocolAction.EmailFilesAsAttachments,
        fileIds: ['file-1'],
        recipientListId: 'list-1',
        // No prePositionedKeyWrappingEntryIds
      });
      mockRepo.getBinding.mockResolvedValue(binding);
      mockRepo.getFilesInFolders.mockResolvedValue([]);
      mockRepo.getRecipientList.mockResolvedValue(makeRecipientList());

      const result = await service.executeProtocolAction(
        'binding-1',
        triggerContext,
      );

      // Should use the custodial path
      expect(mockDeps.getFileContent).toHaveBeenCalledWith('file-1');
      expect(mockDeps.sendEmailWithAttachments).toHaveBeenCalled();
      expect(result.filesAffected).toBe(1);
      expect(result.recipientsContacted).toBe(2);
    });
  });
});
