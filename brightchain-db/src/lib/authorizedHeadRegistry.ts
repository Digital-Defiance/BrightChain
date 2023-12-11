/**
 * @fileoverview AuthorizedHeadRegistry — decorator for IHeadRegistry
 * that enforces write authorization based on Write ACLs.
 *
 * Wraps any IHeadRegistry with write authorization checks:
 * - Open_Mode: delegates directly (no auth check)
 * - Restricted_Mode: verifies Write_Proof against active Write_ACL
 * - Owner_Only_Mode: verifies Write_Proof is from the creator
 *
 * When a localSigner is configured, local writes (those without an explicit
 * writeProof) are auto-signed. Remote writes (gossip head updates) must
 * provide their own writeProof which is verified against the ACL.
 *
 * Read operations pass through unchanged.
 *
 * @see BrightDB Write ACLs design, AuthorizedHeadRegistry section
 * @see Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 3.1, 3.4, 3.5, 3.6
 */

import type {
  DeferredHeadUpdate,
  IHeadRegistry,
  INodeAuthenticator,
  IWriteAclAuditLogger,
  IWriteAclService,
  IWriteProof,
} from '@brightchain/brightchain-lib';
import {
  createWriteProofPayload,
  WriteAuthorizationError,
  WriteMode,
} from '@brightchain/brightchain-lib';

/**
 * Local signer configuration for auto-signing writes.
 * When provided, the AuthorizedHeadRegistry will automatically produce
 * write proofs for local writes that don't include an explicit proof.
 */
export interface ILocalSigner {
  /** The local node's ECDSA public key (used as signer identity) */
  publicKey: Uint8Array;
  /** The local node's ECDSA private key (used to sign write proofs) */
  privateKey: Uint8Array;
}

export class AuthorizedHeadRegistry implements IHeadRegistry {
  private localSigner?: ILocalSigner;
  private onWriteCallback?: (
    operation: string,
    collectionName: string,
    documentId: string,
    headBlockId?: string,
  ) => void | Promise<void>;
  /** Monotonic nonce counter for write proof replay protection */
  private nonceCounter = 0;

  constructor(
    private readonly inner: IHeadRegistry,
    private readonly aclService: IWriteAclService,
    private readonly authenticator: INodeAuthenticator,
    private readonly auditLogger?: IWriteAclAuditLogger,
  ) {}

  /**
   * Configure a local signer for auto-signing writes.
   * When set, local writes (without an explicit writeProof) are automatically
   * signed with this key pair. This avoids threading write proofs through
   * every Collection/Model method.
   *
   * Remote writes (gossip head updates) must still provide their own writeProof.
   */
  setLocalSigner(signer: ILocalSigner): void {
    // Copy key bytes so the caller can safely zero their source arrays
    // without invalidating the signer used for auto-signing local writes.
    this.localSigner = {
      publicKey: new Uint8Array(signer.publicKey),
      privateKey: new Uint8Array(signer.privateKey),
    };
  }

  /**
   * Check if a local signer is configured.
   */
  hasLocalSigner(): boolean {
    return !!this.localSigner;
  }

  /**
   * Set a callback to be invoked after each successful write.
   * Used by the audit ledger to record writes without modifying Collection internals.
   */
  setOnWriteCallback(
    callback: (
      operation: string,
      collectionName: string,
      documentId: string,
      headBlockId?: string,
    ) => void | Promise<void>,
  ): void {
    this.onWriteCallback = callback;
  }

  // ─── Read operations: pass through ───────────────────────────────

  getHead(dbName: string, collectionName: string): string | undefined {
    return this.inner.getHead(dbName, collectionName);
  }

  getAllHeads(): Map<string, string> {
    return this.inner.getAllHeads();
  }

  getHeadTimestamp(dbName: string, collectionName: string): Date | undefined {
    return this.inner.getHeadTimestamp(dbName, collectionName);
  }

  // ─── Write operations: authorize then delegate ───────────────────

  async setHead(
    dbName: string,
    collectionName: string,
    blockId: string,
    writeProof?: IWriteProof,
  ): Promise<void> {
    await this.authorizeWrite(dbName, collectionName, blockId, writeProof);
    await this.inner.setHead(dbName, collectionName, blockId);

    // Fire onWrite callback if registered (for audit ledger integration)
    if (this.onWriteCallback) {
      try {
        await this.onWriteCallback('insert', collectionName, blockId, blockId);
      } catch {
        // Don't let ledger errors block writes
      }
    }
  }

  async removeHead(
    dbName: string,
    collectionName: string,
    writeProof?: IWriteProof,
  ): Promise<void> {
    // For removeHead, blockId is empty since we're removing
    const blockId = writeProof?.blockId ?? '';
    await this.authorizeWrite(dbName, collectionName, blockId, writeProof);
    await this.inner.removeHead(dbName, collectionName);
  }

  async mergeHeadUpdate(
    dbName: string,
    collectionName: string,
    blockId: string,
    timestamp: Date,
    writeProof?: IWriteProof,
  ): Promise<boolean> {
    await this.authorizeWrite(dbName, collectionName, blockId, writeProof);
    return this.inner.mergeHeadUpdate(
      dbName,
      collectionName,
      blockId,
      timestamp,
    );
  }

  // ─── Remaining methods: delegate directly ────────────────────────

  async clear(): Promise<void> {
    return this.inner.clear();
  }

  async load(): Promise<void> {
    return this.inner.load();
  }

  async deferHeadUpdate(
    dbName: string,
    collectionName: string,
    blockId: string,
    timestamp: Date,
  ): Promise<void> {
    return this.inner.deferHeadUpdate(
      dbName,
      collectionName,
      blockId,
      timestamp,
    );
  }

  async applyDeferredUpdates(blockId: string): Promise<number> {
    return this.inner.applyDeferredUpdates(blockId);
  }

  getDeferredUpdates(): DeferredHeadUpdate[] {
    return this.inner.getDeferredUpdates();
  }

  // ─── Private authorization logic ─────────────────────────────────

  /**
   * Check write authorization based on the effective write mode.
   * If no writeProof is provided but a localSigner is configured,
   * auto-produces a write proof for the local node.
   * Throws WriteAuthorizationError on failure.
   */
  private async authorizeWrite(
    dbName: string,
    collectionName: string,
    blockId: string,
    writeProof?: IWriteProof,
  ): Promise<void> {
    const writeMode = this.aclService.getWriteMode(dbName, collectionName);

    switch (writeMode) {
      case WriteMode.Open:
        // Open mode: no authorization required
        this.logAuthorized(writeProof, dbName, collectionName, blockId);
        return;

      case WriteMode.Restricted: {
        // Auto-sign if no proof provided and local signer is available
        const proof =
          writeProof ?? (await this.autoSign(dbName, collectionName, blockId));
        await this.authorizeRestricted(dbName, collectionName, blockId, proof);
        return;
      }

      case WriteMode.OwnerOnly: {
        const proof =
          writeProof ?? (await this.autoSign(dbName, collectionName, blockId));
        await this.authorizeOwnerOnly(dbName, collectionName, blockId, proof);
        return;
      }
    }
  }

  /**
   * Auto-produce a write proof using the local signer.
   * Returns undefined if no local signer is configured.
   */
  private async autoSign(
    dbName: string,
    collectionName: string,
    blockId: string,
  ): Promise<IWriteProof | undefined> {
    if (!this.localSigner) {
      return undefined;
    }
    const nonce = ++this.nonceCounter;
    const payload = createWriteProofPayload(
      dbName,
      collectionName,
      blockId,
      nonce,
    );
    const signature = await this.authenticator.signChallenge(
      payload,
      this.localSigner.privateKey,
    );
    return {
      signerPublicKey: this.localSigner.publicKey,
      signature,
      dbName,
      collectionName,
      blockId,
      nonce,
    };
  }

  private async authorizeRestricted(
    dbName: string,
    collectionName: string,
    blockId: string,
    writeProof?: IWriteProof,
  ): Promise<void> {
    if (!writeProof) {
      this.logRejected(
        'unknown',
        dbName,
        collectionName,
        'Write proof required in Restricted mode',
      );
      throw new WriteAuthorizationError(
        dbName,
        collectionName,
        'Write proof required in Restricted mode',
      );
    }

    const signerHex = Buffer.from(writeProof.signerPublicKey).toString('hex');

    // Verify the write proof signature and authorized writer status
    const isValid = await this.aclService.verifyWriteProof(
      writeProof,
      dbName,
      collectionName,
      blockId,
    );

    if (isValid) {
      this.logAuthorized(writeProof, dbName, collectionName, blockId);
      return;
    }

    // If write proof failed, try capability token verification
    // (capability tokens are not passed through writeProof, so this path
    // is for future extension — for now, reject)
    this.logRejected(
      signerHex,
      dbName,
      collectionName,
      'Invalid write proof or signer not authorized',
    );
    throw new WriteAuthorizationError(
      dbName,
      collectionName,
      'Invalid write proof or signer not authorized',
      signerHex,
    );
  }

  private async authorizeOwnerOnly(
    dbName: string,
    collectionName: string,
    blockId: string,
    writeProof?: IWriteProof,
  ): Promise<void> {
    if (!writeProof) {
      this.logRejected(
        'unknown',
        dbName,
        collectionName,
        'Write proof required in OwnerOnly mode',
      );
      throw new WriteAuthorizationError(
        dbName,
        collectionName,
        'Write proof required in OwnerOnly mode',
      );
    }

    const signerHex = Buffer.from(writeProof.signerPublicKey).toString('hex');

    // Verify the signature is valid
    const payload = createWriteProofPayload(
      dbName,
      collectionName,
      blockId,
      writeProof.nonce,
    );
    const signatureValid = await this.authenticator.verifySignature(
      payload,
      writeProof.signature,
      writeProof.signerPublicKey,
    );

    if (!signatureValid) {
      this.logRejected(
        signerHex,
        dbName,
        collectionName,
        'Invalid signature in OwnerOnly mode',
      );
      throw new WriteAuthorizationError(
        dbName,
        collectionName,
        'Invalid signature in OwnerOnly mode',
        signerHex,
      );
    }

    // Check that the signer is the creator
    const aclDoc = this.aclService.getAclDocument(dbName, collectionName);
    if (!aclDoc) {
      // No ACL doc means we can't determine the creator — reject
      this.logRejected(
        signerHex,
        dbName,
        collectionName,
        'No ACL document found for OwnerOnly mode',
      );
      throw new WriteAuthorizationError(
        dbName,
        collectionName,
        'No ACL document found for OwnerOnly mode',
        signerHex,
      );
    }

    const creatorHex = Buffer.from(aclDoc.creatorPublicKey).toString('hex');
    if (signerHex !== creatorHex) {
      this.logRejected(
        signerHex,
        dbName,
        collectionName,
        'Signer is not the creator',
      );
      throw new WriteAuthorizationError(
        dbName,
        collectionName,
        'Signer is not the creator',
        signerHex,
      );
    }

    this.logAuthorized(writeProof, dbName, collectionName, blockId);
  }

  // ─── Audit logging helpers ───────────────────────────────────────

  private logAuthorized(
    writeProof: IWriteProof | undefined,
    dbName: string,
    collectionName: string,
    blockId: string,
  ): void {
    if (this.auditLogger && writeProof) {
      const signerHex = Buffer.from(writeProof.signerPublicKey).toString('hex');
      this.auditLogger.logAuthorizedWrite(
        signerHex,
        dbName,
        collectionName,
        blockId,
      );
    }
  }

  private logRejected(
    signerHex: string,
    dbName: string,
    collectionName: string,
    reason: string,
  ): void {
    if (this.auditLogger) {
      this.auditLogger.logRejectedWrite(
        signerHex,
        dbName,
        collectionName,
        reason,
      );
    }
  }
}
