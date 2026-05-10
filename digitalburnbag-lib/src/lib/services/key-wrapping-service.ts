import { PlatformID } from '@digitaldefiance/ecies-lib';
import { FileAuditOperationType } from '../enumerations/file-audit-operation-type';
import type { IKeyWrappingEntryBase } from '../interfaces/bases/key-wrapping-entry';
import type { IAuditEntryParams } from '../interfaces/params/audit-service-params';
import type { IKeyWrappingRepository } from '../interfaces/services/key-wrapping-repository';
import type { IKeyWrappingService } from '../interfaces/services/key-wrapping-service';

/**
 * Dependencies injected into KeyWrappingService that come from other services.
 */
export interface IKeyWrappingServiceDeps<TID extends PlatformID> {
  /** Encrypt symmetric key under a public key (ECIES) */
  eciesEncrypt: (
    publicKey: Uint8Array,
    plaintext: Uint8Array,
  ) => Promise<Uint8Array>;
  /** Generate an ECIES key pair */
  generateEciesKeyPair: () => Promise<{
    publicKey: Uint8Array;
    privateKey: Uint8Array;
  }>;
  /** Get a user's public key for key wrapping */
  getUserPublicKey: (userId: TID) => Promise<Uint8Array>;
  /** Record key wrapping event on ledger */
  recordOnLedger: (metadata: Record<string, unknown>) => Promise<Uint8Array>; // returns ledger entry hash
  /** Log an audit entry */
  onAuditLog?: (entry: IAuditEntryParams<TID>) => Promise<void>;
}

/**
 * Manages per-recipient key wrapping for file symmetric keys.
 *
 * Each file is encrypted once with AES-256-GCM; the symmetric key is then
 * wrapped (encrypted) per-recipient under their public key via ECIES.
 * Delegates persistence to an `IKeyWrappingRepository`, which is implemented
 * in `digitalburnbag-api-lib` backed by BrightDB.
 *
 * Validates: Requirements 44.1, 44.2, 44.3, 44.4, 44.5, 44.6, 44.7
 */
export class KeyWrappingService<TID extends PlatformID>
  implements IKeyWrappingService<TID>
{
  constructor(
    private readonly repository: IKeyWrappingRepository<TID>,
    private readonly deps: IKeyWrappingServiceDeps<TID>,
    private readonly generateId: () => TID,
  ) {}

  /**
   * Wrap a symmetric key for an internal member.
   * Fetches the recipient's public key, encrypts the symmetric key under it
   * via ECIES, records the event on the ledger, and stores the entry.
   *
   * Validates: Requirements 44.1, 44.2
   */
  async wrapKeyForMember(
    fileVersionId: TID,
    symmetricKey: Uint8Array,
    recipientUserId: TID,
    requesterId: TID,
  ): Promise<IKeyWrappingEntryBase<TID>> {
    const publicKey = await this.deps.getUserPublicKey(recipientUserId);
    const encryptedSymmetricKey = await this.deps.eciesEncrypt(
      publicKey,
      symmetricKey,
    );

    const ledgerEntryHash = await this.deps.recordOnLedger({
      operation: 'key_wrap',
      fileVersionId: String(fileVersionId),
      recipientType: 'internal_member',
      recipientUserId: String(recipientUserId),
      createdBy: String(requesterId),
    });

    const now = new Date().toISOString();
    const entry: IKeyWrappingEntryBase<TID> = {
      id: this.generateId(),
      fileVersionId,
      recipientType: 'internal_member',
      recipientUserId,
      wrappingPublicKey: publicKey,
      encryptedSymmetricKey,
      keyType: 'ecies_secp256k1',
      createdBy: requesterId,
      ledgerEntryHash,
      createdAt: now,
    };

    const storedEntry = await this.repository.createEntry(entry);

    if (this.deps.onAuditLog) {
      await this.deps.onAuditLog({
        operationType: FileAuditOperationType.ShareCreated,
        actorId: requesterId,
        targetId: fileVersionId,
        targetType: 'file',
        metadata: {
          recipientType: 'internal_member',
          recipientUserId: String(recipientUserId),
        },
      });
    }

    return storedEntry;
  }

  /**
   * Wrap a symmetric key for an ephemeral share link.
   * Generates a fresh ECIES key pair, encrypts the symmetric key under the
   * ephemeral public key, and returns the private key to the caller.
   * The server NEVER stores the ephemeral private key.
   *
   * Validates: Requirements 44.3, 44.4
   */
  async wrapKeyForEphemeralShare(
    fileVersionId: TID,
    symmetricKey: Uint8Array,
    shareLinkId: TID,
    requesterId: TID,
  ): Promise<{
    entry: IKeyWrappingEntryBase<TID>;
    ephemeralPrivateKey: Uint8Array;
  }> {
    const { publicKey, privateKey } = await this.deps.generateEciesKeyPair();
    const encryptedSymmetricKey = await this.deps.eciesEncrypt(
      publicKey,
      symmetricKey,
    );

    const ledgerEntryHash = await this.deps.recordOnLedger({
      operation: 'key_wrap',
      fileVersionId: String(fileVersionId),
      recipientType: 'ephemeral_share',
      shareLinkId: String(shareLinkId),
      createdBy: String(requesterId),
    });

    const now = new Date().toISOString();
    const entry: IKeyWrappingEntryBase<TID> = {
      id: this.generateId(),
      fileVersionId,
      recipientType: 'ephemeral_share',
      shareLinkId,
      wrappingPublicKey: publicKey,
      encryptedSymmetricKey,
      keyType: 'ecies_secp256k1',
      createdBy: requesterId,
      ledgerEntryHash,
      createdAt: now,
    };

    const storedEntry = await this.repository.createEntry(entry);

    if (this.deps.onAuditLog) {
      await this.deps.onAuditLog({
        operationType: FileAuditOperationType.ShareCreated,
        actorId: requesterId,
        targetId: fileVersionId,
        targetType: 'file',
        metadata: {
          recipientType: 'ephemeral_share',
          shareLinkId: String(shareLinkId),
        },
      });
    }

    return { entry: storedEntry, ephemeralPrivateKey: privateKey };
  }

  /**
   * Wrap a symmetric key under a caller-provided recipient public key.
   * Used when the recipient supplies their own key (e.g. PGP or external ECIES).
   *
   * Validates: Requirements 44.5, 44.6
   */
  async wrapKeyForRecipientKey(
    fileVersionId: TID,
    symmetricKey: Uint8Array,
    recipientPublicKey: Uint8Array,
    keyType: 'ecies_secp256k1' | 'pgp',
    shareLinkId: TID,
    requesterId: TID,
  ): Promise<IKeyWrappingEntryBase<TID>> {
    const encryptedSymmetricKey = await this.deps.eciesEncrypt(
      recipientPublicKey,
      symmetricKey,
    );

    const ledgerEntryHash = await this.deps.recordOnLedger({
      operation: 'key_wrap',
      fileVersionId: String(fileVersionId),
      recipientType: 'recipient_key',
      keyType,
      shareLinkId: String(shareLinkId),
      createdBy: String(requesterId),
    });

    const now = new Date().toISOString();
    const entry: IKeyWrappingEntryBase<TID> = {
      id: this.generateId(),
      fileVersionId,
      recipientType: 'recipient_key',
      shareLinkId,
      wrappingPublicKey: recipientPublicKey,
      encryptedSymmetricKey,
      keyType,
      createdBy: requesterId,
      ledgerEntryHash,
      createdAt: now,
    };

    const storedEntry = await this.repository.createEntry(entry);

    if (this.deps.onAuditLog) {
      await this.deps.onAuditLog({
        operationType: FileAuditOperationType.ShareCreated,
        actorId: requesterId,
        targetId: fileVersionId,
        targetType: 'file',
        metadata: {
          recipientType: 'recipient_key',
          keyType,
          shareLinkId: String(shareLinkId),
        },
      });
    }

    return storedEntry;
  }

  /**
   * Get a wrapped key entry for a file version.
   * Looks up by recipientUserId (for internal members) or shareLinkId
   * (for ephemeral/recipient-key shares).
   *
   * Validates: Requirement 44.7
   */
  async getWrappedKey(
    fileVersionId: TID,
    recipientUserId?: TID,
    shareLinkId?: TID,
  ): Promise<IKeyWrappingEntryBase<TID> | null> {
    if (recipientUserId !== undefined) {
      return this.repository.getEntryByRecipient(
        fileVersionId,
        recipientUserId,
      );
    }
    if (shareLinkId !== undefined) {
      return this.repository.getEntryByShareLink(fileVersionId, shareLinkId);
    }
    return null;
  }

  /**
   * Revoke a single key wrapping entry by deleting it.
   */
  async revokeWrapping(entryId: TID, requesterId: TID): Promise<void> {
    await this.repository.deleteEntry(entryId);

    if (this.deps.onAuditLog) {
      await this.deps.onAuditLog({
        operationType: FileAuditOperationType.ShareRevoked,
        actorId: requesterId,
        targetId: entryId,
        targetType: 'file',
        metadata: {
          entryId: String(entryId),
        },
      });
    }
  }

  /**
   * Revoke all key wrapping entries for a file version.
   * Returns the number of entries deleted.
   */
  async revokeAllWrappings(
    fileVersionId: TID,
    requesterId: TID,
  ): Promise<number> {
    const count = await this.repository.deleteAllForFileVersion(fileVersionId);

    if (this.deps.onAuditLog) {
      await this.deps.onAuditLog({
        operationType: FileAuditOperationType.ShareRevoked,
        actorId: requesterId,
        targetId: fileVersionId,
        targetType: 'file',
        metadata: {
          fileVersionId: String(fileVersionId),
          revokedCount: count,
        },
      });
    }

    return count;
  }

  /**
   * Store a pre-wrapped (client-encrypted) symmetric key for an internal member.
   *
   * Used in the E2EE upload path where the client has already encrypted the
   * symmetric key with the recipient's public key.  No server-side ECIES
   * encryption is performed; the provided `encryptedSymmetricKey` is stored
   * verbatim.  The recipient's public key is still fetched so the
   * `wrappingPublicKey` field in the key-wrapping record is accurate.
   *
   * Validates: Requirements 44.1, 44.2 (E2EE variant)
   */
  async storePreWrappedKeyForMember(
    fileVersionId: TID,
    encryptedSymmetricKey: Uint8Array,
    recipientUserId: TID,
    requesterId: TID,
  ): Promise<IKeyWrappingEntryBase<TID>> {
    const publicKey = await this.deps.getUserPublicKey(recipientUserId);

    const ledgerEntryHash = await this.deps.recordOnLedger({
      operation: 'key_wrap_pre_wrapped',
      fileVersionId: String(fileVersionId),
      recipientType: 'internal_member',
      recipientUserId: String(recipientUserId),
      createdBy: String(requesterId),
    });

    const now = new Date().toISOString();
    const entry: IKeyWrappingEntryBase<TID> = {
      id: this.generateId(),
      fileVersionId,
      recipientType: 'internal_member',
      recipientUserId,
      wrappingPublicKey: publicKey,
      encryptedSymmetricKey,
      keyType: 'ecies_secp256k1',
      createdBy: requesterId,
      ledgerEntryHash,
      createdAt: now,
    };

    const storedEntry = await this.repository.createEntry(entry);

    if (this.deps.onAuditLog) {
      await this.deps.onAuditLog({
        operationType: FileAuditOperationType.ShareCreated,
        actorId: requesterId,
        targetId: fileVersionId,
        targetType: 'file',
        metadata: {
          recipientType: 'internal_member',
          recipientUserId: String(recipientUserId),
          preWrapped: true,
        },
      });
    }

    return storedEntry;
  }
}
