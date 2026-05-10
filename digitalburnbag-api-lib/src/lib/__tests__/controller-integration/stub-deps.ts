/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Stub dependency factory for CONTROLLER INTEGRATION tests.
 *
 * NOTE: These are NOT e2e tests. They test controller routing and request/response
 * shapes with mocked services. Real e2e tests are in brightchain-api-e2e/ and hit
 * the actual running server with real database and real GuidV4Buffer IDs.
 *
 * Each service method is a jest.fn() returning sensible defaults.
 */

export function createStubDeps() {
  return {
    // UploadService + StorageQuotaService
    uploadService: {
      createSession: jest.fn().mockResolvedValue({
        id: 'session-1',
        chunkSizeBytes: 1024 * 1024,
        totalChunks: 1,
      }),
      receiveChunk: jest.fn().mockResolvedValue({
        chunkIndex: 0,
        progressPercent: 100,
      }),
      finalize: jest.fn().mockResolvedValue({
        id: 'file-1',
        fileName: 'test.txt',
        mimeType: 'text/plain',
        sizeBytes: 1024,
      }),
      getSessionStatus: jest.fn().mockResolvedValue({
        receivedChunks: [0],
        totalChunks: 1,
        isComplete: false,
      }),
      purgeExpiredSessions: jest.fn().mockResolvedValue(undefined),
    },
    storageQuotaService: {
      checkQuota: jest.fn().mockResolvedValue({ allowed: true }),
      getUsage: jest
        .fn()
        .mockResolvedValue({ usedBytes: 0, quotaBytes: 1073741824 }),
      setQuota: jest.fn().mockResolvedValue(undefined),
      recalculateUsage: jest.fn().mockResolvedValue(undefined),
    },
    // FileService
    fileService: {
      createFile: jest.fn().mockResolvedValue({ id: 'file-1' }),
      getFileContent: jest.fn().mockResolvedValue(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('file content'));
            controller.close();
          },
        }),
      ),
      getFileMetadata: jest.fn().mockResolvedValue({
        id: 'file-1',
        fileName: 'test.txt',
        mimeType: 'text/plain',
        sizeBytes: 1024,
        tags: [],
      }),
      updateFileMetadata: jest
        .fn()
        .mockImplementation(async (_id: string, updates: any) => ({
          id: 'file-1',
          fileName: updates.fileName ?? 'test.txt',
          ...updates,
        })),
      softDelete: jest.fn().mockResolvedValue(undefined),
      restoreFromTrash: jest.fn().mockResolvedValue(undefined),
      getVersionHistory: jest.fn().mockResolvedValue([
        {
          id: 'v1',
          versionNumber: 1,
          sizeBytes: 1024,
          createdAt: new Date().toISOString(),
        },
      ]),
      restoreVersion: jest
        .fn()
        .mockResolvedValue({ id: 'file-1', currentVersion: 'v1' }),
      search: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      getNonAccessProof: jest
        .fn()
        .mockResolvedValue({ pristine: true, ledgerEntries: [] }),
    },
    // FolderService
    folderService: {
      createFolder: jest
        .fn()
        .mockResolvedValue({ id: 'folder-1', name: 'New Folder' }),
      getFolderContents: jest
        .fn()
        .mockResolvedValue({ files: [], folders: [] }),
      move: jest.fn().mockResolvedValue(undefined),
      getRootFolder: jest.fn().mockResolvedValue({ id: 'root', name: 'Root' }),
      getFolderPath: jest
        .fn()
        .mockResolvedValue([{ id: 'root', name: 'Root' }]),
      resolvePath: jest.fn().mockResolvedValue({
        folders: [{ id: 'root', name: 'Root' }],
        file: null,
      }),
    },
    // ACLService
    aclService: {
      getACL: jest.fn().mockResolvedValue({ entries: [], source: 'explicit' }),
      setACL: jest.fn().mockResolvedValue(undefined),
      getEffectivePermission: jest
        .fn()
        .mockResolvedValue({ flags: ['Read'], source: 'explicit' }),
      createPermissionSet: jest
        .fn()
        .mockResolvedValue({ id: 'ps-1', name: 'Custom' }),
      listPermissionSets: jest.fn().mockResolvedValue([]),
    },
    // ShareService
    shareService: {
      shareWithUser: jest.fn().mockResolvedValue(undefined),
      createShareLink: jest.fn().mockResolvedValue({
        id: 'link-1',
        token: 'abc123',
        url: 'https://digitalburnbag.com/share/abc123',
      }),
      revokeShareLink: jest.fn().mockResolvedValue(undefined),
      accessShareLink: jest
        .fn()
        .mockResolvedValue({ fileId: 'file-1', accessGranted: true }),
      getSharedWithMe: jest.fn().mockResolvedValue([]),
      getShareAuditTrail: jest.fn().mockResolvedValue([]),
      getMagnetUrl: jest.fn().mockResolvedValue({
        magnetUrl: 'magnet:?xt=urn:brightchain:abc123',
        irrevocable: true,
      }),
    },
    // DestructionService
    destructionService: {
      destroyFile: jest
        .fn()
        .mockResolvedValue({ proof: { hash: 'abc', ledgerEntry: 'entry-1' } }),
      batchDestroy: jest.fn().mockResolvedValue({
        results: [{ fileId: 'file-1', proof: { hash: 'abc' } }],
      }),
      scheduleDestruction: jest.fn().mockResolvedValue(undefined),
      cancelScheduledDestruction: jest.fn().mockResolvedValue(undefined),
      verifyDestruction: jest.fn().mockReturnValue({ valid: true }),
      purgeExpiredTrash: jest.fn().mockResolvedValue(undefined),
      executeScheduledDestructions: jest.fn().mockResolvedValue(undefined),
    },
    // CanaryService
    canaryService: {
      createBinding: jest.fn().mockResolvedValue({ id: 'binding-1' }),
      updateBinding: jest.fn().mockResolvedValue({ id: 'binding-1' }),
      deleteBinding: jest.fn().mockResolvedValue(undefined),
      dryRun: jest.fn().mockResolvedValue({ actions: [], filesAffected: 0 }),
      createRecipientList: jest.fn().mockResolvedValue({ id: 'rlist-1' }),
      updateRecipientList: jest.fn().mockResolvedValue({ id: 'rlist-1' }),
      getBindings: jest.fn().mockResolvedValue([]),
      getRecipientLists: jest.fn().mockResolvedValue([]),
    },
    // ApprovalService
    approvalService: {
      requestApproval: jest
        .fn()
        .mockResolvedValue({ requestId: 'qr-1', status: 'pending' }),
      approve: jest.fn().mockResolvedValue({ status: 'approved' }),
      reject: jest.fn().mockResolvedValue({ status: 'rejected' }),
      requiresApproval: jest.fn().mockResolvedValue(false),
      expireStaleRequests: jest.fn().mockResolvedValue(undefined),
    },
    // AuditService
    auditService: {
      queryAuditLog: jest.fn().mockResolvedValue({ entries: [], total: 0 }),
      exportAuditLog: jest.fn().mockResolvedValue({ entries: [], proofs: [] }),
      generateComplianceReport: jest.fn().mockResolvedValue({ summary: {} }),
      logOperation: jest.fn().mockResolvedValue(undefined),
    },
    // FolderExportService
    folderExportService: {
      exportFolderToTCBL: jest.fn().mockResolvedValue({
        tcblHandle: 'handle-1',
        recipe: {},
        manifestSummary: { entryCount: 5, totalSizeBytes: 10240 },
        skippedFiles: [],
      }),
    },
    // NotificationService
    notificationService: {
      notifyUser: jest.fn().mockResolvedValue(undefined),
      queueNotification: jest.fn().mockResolvedValue(undefined),
      getQueuedNotifications: jest.fn().mockResolvedValue([]),
      getUnreadCount: jest.fn().mockResolvedValue(0),
      getRecentNotifications: jest.fn().mockResolvedValue([]),
      markDelivered: jest.fn().mockResolvedValue(undefined),
      markRead: jest.fn().mockResolvedValue(undefined),
      getPreferences: jest.fn().mockResolvedValue({}),
      setPreferences: jest.fn().mockResolvedValue(undefined),
    },
    // ACL check for folder export
    checkPermissionFlag: jest.fn().mockResolvedValue(true),
    // Folder existence check for folder export
    folderExists: jest.fn().mockResolvedValue(true),
    // VaultContainerService
    vaultContainerService: {
      createContainer: jest.fn().mockResolvedValue({
        id: 'vault-1',
        name: 'Default',
        state: 'active',
        rootFolderId: 'root',
        ownerId: 'user-1',
        approvalGoverned: false,
        usedBytes: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user-1',
        updatedBy: 'user-1',
      }),
      getContainer: jest.fn().mockResolvedValue({
        id: 'vault-1',
        name: 'Default',
        state: 'active',
        rootFolderId: 'root',
        ownerId: 'user-1',
        approvalGoverned: false,
        usedBytes: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user-1',
        updatedBy: 'user-1',
      }),
      listContainers: jest.fn().mockResolvedValue([]),
      listPublicContainers: jest
        .fn()
        .mockResolvedValue({ summaries: [], total: 0 }),
      updateContainer: jest.fn().mockResolvedValue({}),
      lockContainer: jest
        .fn()
        .mockResolvedValue({ id: 'vault-1', state: 'locked' }),
      destroyContainer: jest.fn().mockResolvedValue({
        succeeded: [],
        failed: [],
        containerLedgerEntryHash: new Uint8Array(32),
        timestamp: new Date(),
      }),
      getSealStatus: jest.fn().mockResolvedValue({
        allPristine: true,
        sealedCount: 0,
        accessedCount: 0,
        totalFiles: 0,
      }),
      verifyNonAccess: jest.fn().mockResolvedValue({
        nonAccessConfirmed: true,
        accessedFileIds: [],
        inconsistentFileIds: [],
        totalFilesChecked: 0,
      }),
      checkFileAccessStatus: jest
        .fn()
        .mockResolvedValue({ requiresSealBreakConfirmation: false }),
    },
    // DeletionService
    deletionService: {
      deleteVaultContainer: jest.fn().mockResolvedValue({
        type: 'immediate',
        destructionResult: {
          containerId: 'vault-1',
          succeeded: [],
          failed: [],
          containerLedgerEntryHash: new Uint8Array(32),
          timestamp: new Date(),
        },
      }),
      disownVaultContainer: jest.fn().mockResolvedValue({
        id: 'vault-1',
        state: 'disowned',
        disownedAt: new Date().toISOString(),
      }),
      cancelPendingDeletion: jest.fn().mockResolvedValue({
        id: 'vault-1',
        state: 'active',
      }),
      executePendingDeletions: jest.fn().mockResolvedValue({
        vaultsDestroyed: 0,
        certificatesGenerated: 0,
        failures: 0,
      }),
      getCertificate: jest.fn().mockResolvedValue(null),
    },
    // ID parsing for URL params (hex string -> TID)
    parseId: jest.fn().mockImplementation((id: string) => id),
    parseSafeId: jest.fn().mockImplementation((id: string) => id),
  };
}
