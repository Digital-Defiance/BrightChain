/**
 * @fileoverview AuthorizedHeadRegistry — decorator for IHeadRegistry
 * that enforces write authorization based on Write ACLs.
 *
 * Wraps any IHeadRegistry with write authorization checks:
 * - Open_Mode: delegates directly (no auth check)
 * - Restricted_Mode: verifies Write_Proof against active Write_ACL
 * - Owner_Only_Mode: verifies Write_Proof is from the creator
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

export class AuthorizedHeadRegistry implements IHeadRegistry {
  constructor(
    private readonly inner: IHeadRegistry,
    private readonly aclService: IWriteAclService,
    private readonly authenticator: INodeAuthenticator,
    private readonly auditLogger?: IWriteAclAuditLogger,
  ) {}

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

      case WriteMode.Restricted:
        await this.authorizeRestricted(
          dbName,
          collectionName,
          blockId,
          writeProof,
        );
        return;

      case WriteMode.OwnerOnly:
        await this.authorizeOwnerOnly(
          dbName,
          collectionName,
          blockId,
          writeProof,
        );
        return;
    }
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
    const payload = createWriteProofPayload(dbName, collectionName, blockId);
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
