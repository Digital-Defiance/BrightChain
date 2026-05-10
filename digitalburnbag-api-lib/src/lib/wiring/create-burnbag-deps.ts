/**
 * Factory that creates the full IAllBurnbagControllerDeps from a BrightDb instance.
 *
 * Wires all BrightDB-backed repositories into service instances with
 * cross-service dependencies, returning the deps object expected by
 * registerRoutes / registerBurnbagRoutesOnRouter.
 */
import type { Collection } from '@brightchain/db';
import type {
  IACLDocumentBase,
  IWcapConfig,
} from '@brightchain/digitalburnbag-lib';
import {
  ACLService,
  ApprovalService,
  AuditService,
  KeyWrappingService as BurnbagKeyWrappingService,
  CanaryService,
  DeletionService,
  DestructionService,
  FileService,
  FolderExportService,
  FolderService,
  NotificationService,
  PermissionFlag,
  ShareService,
  StorageQuotaService,
  UploadService,
  VaultContainerService,
  VaultContainerState,
  VaultState,
  WCAP_DEFAULTS,
} from '@brightchain/digitalburnbag-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import crypto from 'crypto';
import type { RequestHandler } from 'express';
import {
  BrightDBACLRepository,
  BrightDBApprovalRepository,
  BrightDBAuditRepository,
  BrightDBCanaryRepository,
  BrightDBCertificateRepository,
  BrightDBDestructionRepository,
  BrightDBFileRepository,
  BrightDBFolderExportRepository,
  BrightDBFolderRepository,
  BrightDBKeyWrappingRepository,
  BrightDBNotificationRepository,
  BrightDBProviderConnectionRepository,
  BrightDBShareRepository,
  BrightDBStatusHistoryRepository,
  BrightDBStorageContractRepository,
  BrightDBStorageQuotaRepository,
  BrightDBUploadRepository,
  BrightDBVaultContainerRepository,
  type IdSerializer,
} from '../collections';
import {
  isBurnbagJouleEnabled,
  validateBurnbagConfig,
} from '../config/burnbagConfig';
import { validateDeletionConfig } from '../config/deletionConfig';
import type { IAllBurnbagControllerDeps } from '../controllers/register-routes';
import { createWcapSigningMiddleware } from '../middleware/wcap-signing-middleware';
import { signCertificate } from '../services/certificate-signing-service';
import { BurnbagUploadService } from '../services/uploadService';

/** Minimal interface for the collection provider. */
export interface ICollectionProvider {
  collection(name: string): Collection;
}

/** External dependencies the burnbag platform needs from the host app. */
export interface IBurnbagExternalDeps<TID extends PlatformID> {
  generateId: () => TID;
  /** Convert a TID to a hex string for storage. */
  idToString: (id: TID) => string;
  /** Parse a hex string ID back to the typed TID (inverse of serialization). Throws on invalid input. */
  parseId: (idString: string) => TID;
  /** Safely parse a hex string ID, returning undefined if invalid (no throw). */
  parseSafeId?: (idString: string) => TID | undefined;
  recordOnLedger?: (metadata: Record<string, unknown>) => Promise<Uint8Array>;
  generateMerkleProof?: (ledgerEntryHash: Uint8Array) => Promise<Uint8Array[]>;
  encrypt?: (
    plaintext: Uint8Array,
  ) => Promise<{ ciphertext: Uint8Array; key: Uint8Array; iv: Uint8Array }>;
  storeBlocks?: (encrypted: Uint8Array) => Promise<{
    blockRefs: unknown;
    vaultCreationLedgerEntryHash: Uint8Array;
  }>;
  readVault?: (
    hash: Uint8Array,
  ) => Promise<{ symmetricKey: Uint8Array; recipe: unknown }>;
  reconstructAndDecrypt?: (
    recipe: unknown,
    key: Uint8Array,
  ) => Promise<ReadableStream<Uint8Array>>;
  /**
   * Optional: return raw encrypted bytes + IV + auth tag without decrypting.
   * Used by the E2EE download path (`GET /:id/encrypted`).
   */
  readVaultEncrypted?: (hash: Uint8Array) => Promise<{
    encryptedContent: Uint8Array;
    iv: Uint8Array;
    authTag: Uint8Array;
  }>;
  destroyVault?: (hash: Uint8Array) => Promise<{ destructionHash: Uint8Array }>;
  verifyProof?: (proof: unknown, bundle: unknown) => unknown;
  verifyNonAccess?: (hash: Uint8Array) => Promise<unknown>;
  eciesEncrypt?: (
    publicKey: Uint8Array,
    plaintext: Uint8Array,
  ) => Promise<Uint8Array>;
  generateEciesKeyPair?: () => Promise<{
    publicKey: Uint8Array;
    privateKey: Uint8Array;
  }>;
  getUserPublicKey?: (userId: TID) => Promise<Uint8Array>;
  isAdmin?: (userId: TID) => Promise<boolean>;
  sendWebSocket?: (userId: TID, notification: unknown) => Promise<boolean>;
  sendEmailWithAttachments?: (
    recipients: Array<{ email: string; pgpPublicKey?: string }>,
    files: Array<{ content: Uint8Array; fileName: string; mimeType: string }>,
  ) => Promise<number>;
  sendEmailWithLinks?: (
    recipients: Array<{ email: string }>,
    links: string[],
  ) => Promise<number>;
  releaseToPublic?: (
    files: Array<{ content: Uint8Array; fileName: string; mimeType: string }>,
  ) => Promise<number>;
  buildTCBL?: (
    entries: Array<{ fileName: string; mimeType: string; content: Uint8Array }>,
  ) => Promise<{ tcblHandle: unknown; recipe: unknown }>;
  readVaultSymmetricKey?: (
    fileId: TID,
  ) => Promise<{ symmetricKey: Uint8Array; currentVersionId: TID }>;
  hashPassword?: (password: string) => Promise<string>;
  verifyPassword?: (password: string, hash: string) => Promise<boolean>;
  /**
   * Optional provider that returns the operator's secp256k1 private key bytes,
   * or `undefined` when the key is not available.
   * Used by the WCAP signing middleware to sign file-serving responses.
   * Validates: Requirements 5.1, 5.2
   */
  wcapOperatorPrivateKey?: () => Uint8Array | undefined;
  /**
   * Optional provider that returns the operator's 33-byte compressed
   * secp256k1 public key, or `undefined` when the key is not available.
   * Served at the WCAP public key endpoint for verifier key retrieval.
   * Validates: Requirements 5.2, 10.2
   */
  wcapOperatorPublicKey?: () => Uint8Array | undefined;
  /**
   * Optional Joule debit-authorization service.
   * Required when `BURNBAG_JOULE_ENABLED=true` — wired from brightchain-api-lib.
   */
  debitAuth?: import('../services/uploadService').IDebitAuthorizationService;
  /**
   * Converts a string user-ID into the `Checksum` type required by debitAuth.
   * Required when `BURNBAG_JOULE_ENABLED=true`.
   */
  resolveChecksum?: (
    userId: string,
  ) => import('@brightchain/brightchain-lib').Checksum;
  /**
   * Block sizes (bytes) the receiving node supports.
   * Used by `BurnbagUploadService` to minimise padding waste.
   * Defaults to the BRIGHTCHAIN_BLOCKSIZE_BYTES env var or a standard set.
   */
  availableBlockSizes?: readonly number[];
}

const stubLedger = async (): Promise<Uint8Array> => new Uint8Array(32);
const stubMerkleProof = async (): Promise<Uint8Array[]> => [new Uint8Array(32)];

export function createBurnbagDeps<TID extends PlatformID>(
  db: ICollectionProvider,
  ext: IBurnbagExternalDeps<TID>,
): IAllBurnbagControllerDeps<TID> {
  const { generateId, idToString, parseId, parseSafeId } = ext;
  const recordOnLedger = ext.recordOnLedger ?? stubLedger;
  const generateMerkleProof = ext.generateMerkleProof ?? stubMerkleProof;

  // ── ID serializer shared by all repositories ─────────────────────
  const ids: IdSerializer<TID> = { idToString, parseId };

  // ── Collections ──────────────────────────────────────────────────
  const fileMetadata = db.collection('burnbag_file_metadata');
  const fileVersions = db.collection('burnbag_file_versions');
  const folders = db.collection('burnbag_folders');
  const aclDocuments = db.collection('burnbag_acl');
  const shareLinks = db.collection('burnbag_share_links');
  const keyWrappingEntries = db.collection('burnbag_key_wrapping');
  const uploadSessions = db.collection('burnbag_upload_sessions');
  const chunkData = db.collection('burnbag_chunk_data');
  const uploadEscrow = db.collection('burnbag_upload_escrow');
  const approvalRequests = db.collection('burnbag_quorum_requests');
  const approvalPolicies = db.collection('burnbag_quorum_policies');
  const auditEntries = db.collection('burnbag_audit_entries');
  const storageQuotas = db.collection('burnbag_storage_quotas');
  const canaryBindings = db.collection('burnbag_canary_bindings');
  const recipientLists = db.collection('burnbag_recipient_lists');
  const notifications = db.collection('burnbag_notifications');
  const notificationPreferences = db.collection('burnbag_notification_prefs');
  const vaultContainers = db.collection('burnbag_vault_containers');
  const statusHistory = db.collection('burnbag_status_history');
  const providerConnections = db.collection('burnbag_provider_connections');
  const storageContracts = db.collection('burnbag_storage_contracts');
  const destructionCertificates = db.collection(
    'burnbag_destruction_certificates',
  );

  // ── Repositories ─────────────────────────────────────────────────
  const fileRepo = new BrightDBFileRepository<TID>(
    fileMetadata,
    fileVersions,
    ids,
  );
  const folderRepo = new BrightDBFolderRepository<TID>(
    folders,
    fileMetadata,
    ids,
  );
  const aclRepo = new BrightDBACLRepository<TID>(
    aclDocuments,
    fileMetadata,
    folders,
    db.collection('burnbag_permission_sets'),
    ids,
  );
  const shareRepo = new BrightDBShareRepository<TID>(
    shareLinks,
    aclDocuments,
    fileMetadata,
    folders,
    ids,
  );
  const keyWrappingRepo = new BrightDBKeyWrappingRepository<TID>(
    keyWrappingEntries,
    ids,
  );
  const uploadRepo = new BrightDBUploadRepository<TID>(
    uploadSessions,
    chunkData,
    fileMetadata,
    ids,
    uploadEscrow,
  );
  const approvalRepo = new BrightDBApprovalRepository<TID>(
    approvalRequests,
    approvalPolicies,
    ids,
  );
  const auditRepo = new BrightDBAuditRepository<TID>(auditEntries, ids);
  const storageQuotaRepo = new BrightDBStorageQuotaRepository<TID>(
    storageQuotas,
    fileVersions,
    fileMetadata,
    ids,
  );
  const destructionRepo = new BrightDBDestructionRepository<TID>(
    fileMetadata,
    fileVersions,
    ids,
  );
  const canaryRepo = new BrightDBCanaryRepository<TID>(
    canaryBindings,
    recipientLists,
    fileMetadata,
    ids,
  );
  const notificationRepo = new BrightDBNotificationRepository<TID>(
    notifications,
    notificationPreferences,
    ids,
  );
  const folderExportRepo = new BrightDBFolderExportRepository<TID>(
    fileMetadata,
    folders,
    ids,
  );
  const vaultContainerRepo = new BrightDBVaultContainerRepository<TID>(
    vaultContainers,
    folders,
    fileMetadata,
    ids,
  );
  const statusHistoryRepo = new BrightDBStatusHistoryRepository<TID>(
    statusHistory,
    ids,
  );
  const connectionRepo = new BrightDBProviderConnectionRepository<TID>(
    providerConnections,
    ids,
  );
  const storageContractRepo = new BrightDBStorageContractRepository(
    storageContracts,
  );
  const certificateRepo = new BrightDBCertificateRepository(
    destructionCertificates,
  );

  // ── Services ─────────────────────────────────────────────────────

  // Audit (needed by many others for onAuditLog)
  const auditService = new AuditService<TID>(
    auditRepo,
    { recordOnLedger, generateMerkleProof },
    generateId,
  );
  const onAuditLog = auditService.logOperation.bind(auditService);

  // ACL
  const aclService = new ACLService<TID>(aclRepo, onAuditLog);

  /** Normalize a TID or string to its hex representation for safe comparison. */
  const toHex = (v: unknown): string => {
    if (v instanceof Uint8Array || Buffer.isBuffer(v)) {
      return idToString(v as TID);
    }
    return String(v);
  };

  const checkPermissionFlag = async (
    targetId: TID,
    targetType: 'file' | 'folder',
    principalId: TID,
    requiredFlag: PermissionFlag,
    _context: unknown,
  ): Promise<boolean> => {
    // Owner bypass: file/folder owners implicitly have all permissions.
    try {
      if (targetType === 'file') {
        const file = await fileRepo.getFileById(targetId);
        if (file && toHex(file.ownerId) === toHex(principalId)) return true;
      } else {
        const folder = await folderRepo.getFolderById(targetId);
        if (folder && toHex(folder.ownerId) === toHex(principalId)) return true;
      }
    } catch {
      // Fall through to ACL check if lookup fails
    }

    const effective = await aclService.getEffectivePermission(
      targetId,
      targetType,
      principalId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
    );
    return effective.flags.includes(requiredFlag);
  };

  // Key wrapping
  const keyWrappingService = new BurnbagKeyWrappingService<TID>(
    keyWrappingRepo,
    {
      eciesEncrypt: ext.eciesEncrypt ?? (async () => new Uint8Array(0)),
      generateEciesKeyPair:
        ext.generateEciesKeyPair ??
        (async () => ({
          publicKey: new Uint8Array(0),
          privateKey: new Uint8Array(0),
        })),
      getUserPublicKey: ext.getUserPublicKey ?? (async () => new Uint8Array(0)),
      recordOnLedger,
      onAuditLog,
    },
    generateId,
  );

  // Storage quota
  const storageQuotaService = new StorageQuotaService<TID>(
    storageQuotaRepo,
    ext.isAdmin ?? (async () => false),
  );

  // Notification
  const notificationService = new NotificationService<TID>(notificationRepo, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendWebSocket: (ext.sendWebSocket as any) ?? (async () => false),
    onAuditLog,
  });

  // ── In-memory content store for dev mode ──────────────────────
  // When no real block store / encryption is wired, keep uploaded
  // file content in memory so preview and download work.
  const devContentStore = new Map<string, Uint8Array>();

  // Stores IV and authTag from client-side E2EE uploads keyed by the same
  // hex key used in devContentStore so readVaultEncrypted can return real values.
  const devEncryptionMetaStore = new Map<
    string,
    { iv: Uint8Array; authTag: Uint8Array }
  >();

  // Upload
  const DEFAULT_BLOCK_SIZES = [
    512, 1024, 4096, 1_048_576, 67_108_864, 268_435_456,
  ] as const;
  const availableBlockSizes: readonly number[] =
    ext.availableBlockSizes ??
    (process.env['BRIGHTCHAIN_BLOCKSIZE_BYTES']
      ? process.env['BRIGHTCHAIN_BLOCKSIZE_BYTES'].split(',').map(Number)
      : DEFAULT_BLOCK_SIZES);

  // Shared base deps used by both UploadService and BurnbagUploadService.
  const baseUploadDeps = {
    checkQuota: async (userId: TID, additionalBytes: number) =>
      storageQuotaService.checkQuota(userId, additionalBytes),
    encrypt:
      ext.encrypt ??
      (async (plaintext: Uint8Array) => ({
        ciphertext: plaintext,
        key: new Uint8Array(32),
        iv: new Uint8Array(12),
      })),
    storeBlocks:
      ext.storeBlocks ??
      (async (ciphertext: Uint8Array) => {
        const hexKey = crypto.randomBytes(32).toString('hex');
        devContentStore.set(hexKey, new Uint8Array(ciphertext));
        return {
          blockRefs: {},
          vaultCreationLedgerEntryHash: hexKey as unknown as Uint8Array,
        };
      }),
    wrapKeyForOwner: async (
      fileVersionId: TID,
      symmetricKey: Uint8Array,
      ownerId: TID,
    ) => {
      await keyWrappingService.wrapKeyForMember(
        fileVersionId,
        symmetricKey,
        ownerId,
        ownerId,
      );
    },
    storePreWrappedKeyForOwner: async (
      fileVersionId: TID,
      encryptedSymmetricKey: Uint8Array,
      ownerId: TID,
    ) => {
      await keyWrappingService.storePreWrappedKeyForMember(
        fileVersionId,
        encryptedSymmetricKey,
        ownerId,
        ownerId,
      );
    },
    storeEncryptionMetadata: async (
      vaultCreationLedgerEntryHash: Uint8Array,
      iv: Uint8Array,
      authTag: Uint8Array,
    ) => {
      let hexKey: string;
      if (typeof vaultCreationLedgerEntryHash === 'string') {
        hexKey = vaultCreationLedgerEntryHash;
      } else {
        hexKey = Buffer.from(vaultCreationLedgerEntryHash).toString('hex');
      }
      devEncryptionMetaStore.set(hexKey, { iv, authTag });
    },
    onAuditLog,
  };

  let uploadService: UploadService<TID>;

  if (isBurnbagJouleEnabled() && ext.debitAuth && ext.resolveChecksum) {
    const jouleConfig = validateBurnbagConfig();
    uploadService = new BurnbagUploadService<TID>(
      uploadRepo,
      baseUploadDeps,
      generateId,
      ext.debitAuth,
      jouleConfig.quoteTtlMs,
      ext.resolveChecksum,
      {
        availableBlockSizes,
        createFileMetadata: async (
          session,
          blockRefs,
          vaultCreationLedgerEntryHash,
        ) => {
          const now = new Date().toISOString();
          const fileId = generateId();
          const versionId = generateId();
          const metadata = {
            id: fileId,
            ownerId: session.userId,
            vaultContainerId: session.vaultContainerId,
            folderId: session.targetFolderId,
            fileName: session.fileName,
            mimeType: session.mimeType,
            sizeBytes: session.totalSizeBytes,
            tags: [],
            currentVersionId: versionId,
            vaultCreationLedgerEntryHash,
            approvalGoverned: false,
            visibleWatermark: false,
            invisibleWatermark: false,
            createdAt: now,
            updatedAt: now,
            createdBy: session.userId,
            updatedBy: session.userId,
          };
          return uploadRepo.createFileMetadata(metadata);
        },
      },
      idToString,
    );
  } else {
    uploadService = new UploadService<TID>(
      uploadRepo,
      baseUploadDeps,
      generateId,
    );
  }

  // File
  const fileService = new FileService<TID>(
    fileRepo,
    {
      checkPermissionFlag,
      readVault:
        ext.readVault ??
        (async (vaultHash: Uint8Array) => {
          let hexKey: string;
          if (typeof vaultHash === 'string') {
            hexKey = vaultHash;
          } else if (
            vaultHash instanceof Uint8Array ||
            Buffer.isBuffer(vaultHash)
          ) {
            hexKey = Buffer.from(vaultHash).toString('hex');
          } else {
            hexKey = '';
          }
          return {
            symmetricKey: new Uint8Array(32),
            recipe: { devKey: hexKey },
          };
        }),
      reconstructAndDecrypt:
        ext.reconstructAndDecrypt ??
        (async (recipe: unknown) => {
          const key = (recipe as { devKey?: string })?.devKey ?? '';
          const data = devContentStore.get(key);
          return new ReadableStream<Uint8Array>({
            start(controller) {
              if (data && data.length > 0) {
                controller.enqueue(data);
              }
              controller.close();
            },
          });
        }),
      readVaultEncrypted:
        ext.readVaultEncrypted ??
        (async (vaultHash: Uint8Array) => {
          let hexKey: string;
          if (typeof vaultHash === 'string') {
            hexKey = vaultHash;
          } else if (
            vaultHash instanceof Uint8Array ||
            Buffer.isBuffer(vaultHash)
          ) {
            hexKey = Buffer.from(vaultHash).toString('hex');
          } else {
            hexKey = '';
          }
          const data = devContentStore.get(hexKey) ?? new Uint8Array(0);
          const meta = devEncryptionMetaStore.get(hexKey);
          return {
            encryptedContent: data,
            iv: meta?.iv ?? new Uint8Array(12),
            authTag: meta?.authTag ?? new Uint8Array(16),
          };
        }),
      getWrappedKey: async (fileVersionId: TID, requesterId: TID) => {
        const entry = await keyWrappingService.getWrappedKey(
          fileVersionId,
          requesterId,
        );
        return entry?.encryptedSymmetricKey ?? null;
      },
      onAuditLog,
      verifyNonAccess: ext.verifyNonAccess,
    },
    generateId,
  );

  // Folder
  const folderService = new FolderService<TID>(folderRepo, generateId);

  // Vault Container
  const vaultContainerService = new VaultContainerService<TID>(
    vaultContainerRepo,
    {
      createRootFolder: async (ownerId: TID, containerId: TID) =>
        folderService.getRootFolder(ownerId, containerId),
      destroyFile: async (fileId: TID, requesterId: TID) => {
        const result = await destructionService.destroyFile(
          fileId,
          requesterId,
        );
        return {
          destructionHash: result.destructionHash ?? new Uint8Array(32),
          ledgerEntryHash: result.ledgerEntryHash ?? new Uint8Array(32),
          timestamp: result.timestamp ?? new Date(),
        };
      },
      recordOnLedger,
      getFileVaultState: async () => VaultState.Sealed,
      verifyFileNonAccess: async () => ({
        nonAccessConfirmed: true,
        consistent: true,
      }),
    },
    generateId,
  );

  // Destruction
  const destructionService = new DestructionService<TID>(
    destructionRepo,
    {
      destroyVault:
        ext.destroyVault ??
        (async () => ({ destructionHash: new Uint8Array(32) })),
      revokeAllWrappings: async (fileVersionId: TID, requesterId: TID) =>
        keyWrappingService.revokeAllWrappings(fileVersionId, requesterId),
      recordOnLedger,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      verifyProof: (ext.verifyProof as any) ?? (() => ({ valid: true })),
      onAuditLog,
    },
    generateId,
  );

  // Deletion (orchestrates vault container deletion, certificates, disown/cool-down)
  const deletionConfig = validateDeletionConfig();
  const deletionService = new DeletionService<TID>(
    vaultContainerService,
    certificateRepo,
    {
      recordOnLedger,
      signCertificate: (certificate) => {
        const privateKey = ext.wcapOperatorPrivateKey?.();
        if (!privateKey) {
          throw new Error(
            'Operator private key not available for certificate signing',
          );
        }
        return signCertificate(certificate, privateKey);
      },
      operatorPublicKey: ext.wcapOperatorPublicKey
        ? Buffer.from(
            ext.wcapOperatorPublicKey() ?? new Uint8Array(0),
          ).toString('hex')
        : '',
      cooldownDays: deletionConfig.cooldownDays,
      getExpiredPendingDeletions: async () => {
        const now = new Date().toISOString();
        const results = await vaultContainers.find({
          state: VaultContainerState.PendingDeletion,
          pendingDeletionAt: { $lte: now },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return results as any;
      },
      systemRequesterId: generateId(),
      updateContainerRaw: async (containerId, updates) => {
        await vaultContainers.updateOne(
          { id: idToString(containerId) },
          { $set: updates },
        );
        const updated = await vaultContainerService.getContainer(
          containerId,
          containerId,
        );
        return updated;
      },
    },
  );

  // Share
  const shareService = new ShareService<TID>(
    shareRepo,
    {
      checkPermissionFlag,
      setACLEntry: async (targetId, targetType, entry, requesterId) => {
        const now = new Date().toISOString();
        const aclDoc: IACLDocumentBase<TID> = {
          id: generateId(),
          entries: [entry],
          createdAt: now,
          updatedAt: now,
          updatedBy: requesterId,
        };
        await aclService.setACL(targetId, targetType, aclDoc, requesterId);
      },
      wrapKeyForMember: async (
        fileVersionId,
        symmetricKey,
        recipientUserId,
        requesterId,
      ) =>
        keyWrappingService.wrapKeyForMember(
          fileVersionId,
          symmetricKey,
          recipientUserId,
          requesterId,
        ),
      wrapKeyForEphemeralShare: async (
        fileVersionId,
        symmetricKey,
        shareLinkId,
        requesterId,
      ) =>
        keyWrappingService.wrapKeyForEphemeralShare(
          fileVersionId,
          symmetricKey,
          shareLinkId,
          requesterId,
        ),
      wrapKeyForRecipientKey: async (
        fileVersionId,
        symmetricKey,
        recipientPublicKey,
        keyType,
        shareLinkId,
        requesterId,
      ) =>
        keyWrappingService.wrapKeyForRecipientKey(
          fileVersionId,
          symmetricKey,
          recipientPublicKey,
          keyType,
          shareLinkId,
          requesterId,
        ),
      revokeWrapping: async (entryId, requesterId) =>
        keyWrappingService.revokeWrapping(entryId, requesterId),
      readVaultSymmetricKey:
        ext.readVaultSymmetricKey ??
        (async () => ({
          symmetricKey: new Uint8Array(32),
          currentVersionId: generateId(),
        })),

      getFileContent: async (fileId, requesterId, context) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fileService as any).getFileContent(fileId, requesterId, context),
      hashPassword: ext.hashPassword ?? (async (password: string) => password),
      verifyPassword:
        ext.verifyPassword ??
        (async (password: string, hash: string) => password === hash),
      generateToken: () => {
        const bytes = new Uint8Array(32);
        if (
          typeof globalThis.crypto !== 'undefined' &&
          globalThis.crypto.getRandomValues
        ) {
          globalThis.crypto.getRandomValues(bytes);
        } else {
          for (let i = 0; i < bytes.length; i++)
            bytes[i] = Math.floor(Math.random() * 256);
        }
        return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(
          '',
        );
      },
      onAuditLog,
    },
    generateId,
  );

  // Approval
  const approvalService = new ApprovalService<TID>(
    approvalRepo,
    {
      notifyApprovers: async (approverIds, request) => {
        for (const approverId of approverIds) {
          await notificationService.notifyUser(approverId, {
            id: generateId(),
            type: 'approval_request',
            targetId: request.targetId,
            targetType: 'file',
            message: `Approval requested for ${request.operationType}`,
            createdAt: new Date(),
            read: false,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any);
        }
      },
      executeOperation: async () => {
        /* handled by caller after quorum met */
      },
      recordOnLedger,
      onAuditLog,
    },
    generateId,
  );

  // Canary
  const scheduledActions = new Map<string, ReturnType<typeof setTimeout>>();
  const canaryService = new CanaryService<TID>(
    canaryRepo,
    {
      destroyFile: async (fileId, requesterId) => {
        await destructionService.destroyFile(fileId, requesterId);
        return { destructionHash: new Uint8Array(32) };
      },
      getFileContent: async () => ({
        content: new Uint8Array(0),
        fileName: 'unknown',
        mimeType: 'application/octet-stream',
      }),
      sendEmailWithAttachments: ext.sendEmailWithAttachments ?? (async () => 0),
      sendEmailWithLinks: ext.sendEmailWithLinks ?? (async () => 0),
      releaseToPublic: ext.releaseToPublic ?? (async () => 0),
      scheduleDelayedAction: (delayMs: number, action: () => Promise<void>) => {
        const actionId = generateId();
        const timer = setTimeout(() => void action(), delayMs);
        scheduledActions.set(String(actionId), timer);
        return actionId;
      },
      cancelDelayedAction: (actionId: TID) => {
        const timer = scheduledActions.get(String(actionId));
        if (timer) {
          clearTimeout(timer);
          scheduledActions.delete(String(actionId));
        }
      },
      onAuditLog,
      // Key wrapping deps for prepareBindingKeys
      readVaultSymmetricKey:
        ext.readVaultSymmetricKey ??
        (async () => ({
          symmetricKey: new Uint8Array(32),
          currentVersionId: generateId(),
        })),
      wrapKeyForMember: async (
        fileVersionId,
        symmetricKey,
        recipientUserId,
        requesterId,
      ) => {
        const entry = await keyWrappingService.wrapKeyForMember(
          fileVersionId,
          symmetricKey,
          recipientUserId,
          requesterId,
        );
        return { id: entry.id };
      },
      wrapKeyForEphemeralShare: async (
        fileVersionId,
        symmetricKey,
        shareLinkId,
        requesterId,
      ) => {
        const result = await keyWrappingService.wrapKeyForEphemeralShare(
          fileVersionId,
          symmetricKey,
          shareLinkId,
          requesterId,
        );
        return {
          entry: { id: result.entry.id },
          ephemeralPrivateKey: result.ephemeralPrivateKey,
        };
      },
      buildShareUrl: async (_fileId, _shareLinkId, ephemeralPrivateKey) => {
        // Encode the ephemeral private key as a hex passphrase.
        // In production this would build a full URL with the key in the
        // fragment; for now we return a placeholder URL + hex passphrase.
        const passphrase = Buffer.from(ephemeralPrivateKey).toString('hex');
        return {
          shareUrl: `https://app.brightchain.com/share/${String(_shareLinkId)}`,
          passphrase,
        };
      },
    },
    generateId,
  );

  // Folder export
  const folderExportService = new FolderExportService<TID>(folderExportRepo, {
    checkFilePermission: async (fileId, requesterId) =>
      checkPermissionFlag(fileId, 'file', requesterId, PermissionFlag.Read, {}),
    getFileContent: async () => new Uint8Array(0),
    buildTCBL: ext.buildTCBL ?? (async () => ({ tcblHandle: {}, recipe: {} })),
    onAuditLog,
  });

  const folderExists = async (folderId: TID): Promise<boolean> => {
    const folder = await folderRepo.getFolderById(folderId);
    return folder !== null;
  };

  // ── WCAP signing middleware (operator context) ───────────────────
  // When the host app provides operator key providers, construct the
  // WCAP signing middleware and public key accessor so that
  // registerBurnbagRoutesOnRouter can wire them into the file-serving
  // routes and the /.well-known endpoint.
  // Validates: Requirements 2.4, 5.1, 5.2, 10.2, 10.3, 12.2, 12.3, 12.4
  let wcapMiddleware: RequestHandler | undefined;
  let getWcapPublicKey: (() => Uint8Array | undefined) | undefined;

  if (ext.wcapOperatorPrivateKey && ext.wcapOperatorPublicKey) {
    const wcapConfig: IWcapConfig = {
      ...WCAP_DEFAULTS,
      policy: 'decryption-verified',
    };

    wcapMiddleware = createWcapSigningMiddleware({
      getPrivateKey: (_req) => ext.wcapOperatorPrivateKey!(),
      config: wcapConfig,
    });

    getWcapPublicKey = ext.wcapOperatorPublicKey;
  }

  return {
    uploadService,
    storageQuotaService,
    fileService,
    folderService,
    aclService,
    shareService,
    destructionService,
    canaryService,
    approvalService,
    auditService,
    folderExportService,
    notificationService,
    vaultContainerService,
    deletionService,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    checkPermissionFlag: checkPermissionFlag as any,
    folderExists,
    parseId,
    parseSafeId,
    statusHistoryRepo,
    connectionRepo,
    storageContractRepository: storageContractRepo,
    ...(wcapMiddleware !== undefined ? { wcapMiddleware } : {}),
    ...(getWcapPublicKey !== undefined ? { getWcapPublicKey } : {}),
  };
}
