/**
 * @fileoverview WriteAclManager - Manages Write ACL state for a BrightDB instance.
 *
 * Loads ACL documents, caches them in memory, and provides query/verification
 * operations used by AuthorizedHeadRegistry to enforce write authorization.
 *
 * ACL scope resolution: collection-level ACLs override database-level ACLs.
 * If no ACL exists for a scope, the effective write mode is Open_Mode.
 *
 * @see BrightDB Write ACLs design, WriteAclManager section
 * @see Requirements 1.3, 1.4, 3.2, 3.3, 6.3, 6.4, 6.5
 */

import {
  AclAdminRequiredError,
  AclVersionConflictError,
  CapabilityTokenInvalidError,
  EncryptionMode,
  type IAclDocument,
  type IBlockStore,
  type ICapabilityToken,
  type INodeAuthenticator,
  type IWriteAclService,
  type IWriteProof,
  LastAdministratorError,
  WriteMode,
  WriterNotInPoolError,
  createWriteProofPayload,
} from '@brightchain/brightchain-lib';
import { sha256 } from '@noble/hashes/sha256';

/**
 * Event types emitted by WriteAclManager on ACL mutations.
 * @see Requirement 4.7
 */
export enum AclChangeEventType {
  AclSet = 'acl:set',
  WriterAdded = 'acl:writer_added',
  WriterRemoved = 'acl:writer_removed',
  AdminAdded = 'acl:admin_added',
  AdminRemoved = 'acl:admin_removed',
}

/**
 * Payload for ACL change events.
 */
export interface IAclChangeEvent {
  type: AclChangeEventType;
  dbName: string;
  collectionName?: string;
  adminPublicKey: Uint8Array;
  affectedPublicKey?: Uint8Array;
  newVersion: number;
}

/**
 * Listener callback for ACL change events.
 */
export type AclChangeListener = (event: IAclChangeEvent) => void;

/**
 * Manages Write ACL state for a BrightDB database instance.
 *
 * Implements the read/query and verification side of IWriteAclService.
 * ACL documents are cached in memory keyed by scope ("dbName" or "dbName:collName").
 * Collection-level ACLs override database-level ACLs; if no ACL exists,
 * the effective write mode defaults to Open_Mode.
 *
 * @see Requirements 1.3, 1.4, 3.2, 3.3, 6.3, 6.4, 6.5
 */
export class WriteAclManager implements IWriteAclService {
  private readonly aclCache = new Map<string, IAclDocument>();
  private readonly changeListeners: AclChangeListener[] = [];

  /** Pool encryption mode — when PoolShared, writers must be pool members. */
  private poolEncryptionMode: EncryptionMode = EncryptionMode.None;

  /** Pool member public keys (only relevant when poolEncryptionMode is PoolShared). */
  private poolMemberKeys: Uint8Array[] = [];

  constructor(
    private readonly blockStore: IBlockStore,
    private readonly authenticator: INodeAuthenticator,
  ) {}

  /**
   * Build the cache key for a given ACL scope.
   * Database-level: "dbName"
   * Collection-level: "dbName:collName"
   */
  private static cacheKey(dbName: string, collectionName?: string): string {
    return collectionName ? `${dbName}:${collectionName}` : dbName;
  }

  // ─── Read / Query Methods ───────────────────────────────────────────

  /**
   * Get the effective write mode for a database or collection.
   *
   * Resolves the ACL scope hierarchy: collection-level overrides
   * database-level. Returns Open_Mode if no ACL is configured.
   *
   * @see Requirements 1.3, 1.4
   */
  getWriteMode(dbName: string, collectionName?: string): WriteMode {
    const acl = this.resolveAcl(dbName, collectionName);
    return acl ? acl.writeMode : WriteMode.Open;
  }

  /**
   * Retrieve the active ACL document for a database or collection.
   *
   * Returns undefined if no ACL document exists for the given scope,
   * which implies Open_Mode.
   */
  getAclDocument(
    dbName: string,
    collectionName?: string,
  ): IAclDocument | undefined {
    return this.resolveAcl(dbName, collectionName);
  }

  /**
   * Check whether a public key belongs to an authorized writer
   * for the given database or collection scope.
   *
   * In Open_Mode (no ACL), everyone is implicitly authorized,
   * so this returns true. In Restricted/OwnerOnly modes, the key
   * must appear in the authorizedWriters list or be the creator.
   */
  isAuthorizedWriter(
    publicKey: Uint8Array,
    dbName: string,
    collectionName?: string,
  ): boolean {
    const acl = this.resolveAcl(dbName, collectionName);
    if (!acl) {
      // Open_Mode — everyone is authorized
      return true;
    }
    if (acl.writeMode === WriteMode.Open) {
      return true;
    }
    if (acl.writeMode === WriteMode.OwnerOnly) {
      return this.keysEqual(publicKey, acl.creatorPublicKey);
    }
    // Restricted_Mode — check authorizedWriters list
    return acl.authorizedWriters.some((writer) =>
      this.keysEqual(publicKey, writer),
    );
  }

  /**
   * Check whether a public key belongs to an ACL administrator
   * for the given database or collection scope.
   */
  isAclAdministrator(
    publicKey: Uint8Array,
    dbName: string,
    collectionName?: string,
  ): boolean {
    const acl = this.resolveAcl(dbName, collectionName);
    if (!acl) {
      return false;
    }
    return acl.aclAdministrators.some((admin) =>
      this.keysEqual(publicKey, admin),
    );
  }

  // ─── ACL Scope Resolution ──────────────────────────────────────────

  /**
   * Resolve the effective ACL for a given scope.
   *
   * 1. Look up collection-level ACL: cache.get("dbName:collectionName")
   * 2. If found → return it
   * 3. Look up database-level ACL: cache.get("dbName")
   * 4. If found → return it
   * 5. Return undefined (implies Open_Mode)
   *
   * @see Requirements 1.3, 1.4
   */
  private resolveAcl(
    dbName: string,
    collectionName?: string,
  ): IAclDocument | undefined {
    // Step 1-2: Check collection-level ACL if a collection name is provided
    if (collectionName) {
      const collKey = WriteAclManager.cacheKey(dbName, collectionName);
      const collAcl = this.aclCache.get(collKey);
      if (collAcl) {
        return collAcl;
      }
    }

    // Step 3-4: Fall back to database-level ACL
    const dbKey = WriteAclManager.cacheKey(dbName);
    const dbAcl = this.aclCache.get(dbKey);
    if (dbAcl) {
      return dbAcl;
    }

    // Step 5: No ACL found — implies Open_Mode
    return undefined;
  }

  // ─── Write Proof Verification ──────────────────────────────────────

  /**
   * Verify a write proof against the active ACL.
   *
   * 1. Compute the expected payload: SHA-256(dbName + ":" + collectionName + ":" + blockId)
   * 2. Verify the ECDSA signature using the authenticator
   * 3. Check that the signer's public key is in the authorized writers list
   *
   * @see Requirements 3.2, 3.3
   */
  async verifyWriteProof(
    proof: IWriteProof,
    dbName: string,
    collectionName: string,
    blockId: string,
  ): Promise<boolean> {
    // Compute the expected payload
    const payload = createWriteProofPayload(dbName, collectionName, blockId);

    // Verify the ECDSA signature
    const signatureValid = await this.authenticator.verifySignature(
      payload,
      proof.signature,
      proof.signerPublicKey,
    );

    if (!signatureValid) {
      return false;
    }

    // Check that the signer is an authorized writer
    return this.isAuthorizedWriter(
      proof.signerPublicKey,
      dbName,
      collectionName,
    );
  }

  // ─── Capability Token Verification ─────────────────────────────────

  /**
   * Verify a capability token for temporary write access.
   *
   * 1. Check expiration: current time < expiresAt
   * 2. Verify grantor signature over
   *    SHA-256(granteePublicKey + ":" + dbName + ":" + collectionName + ":" + expiresAt.toISOString())
   * 3. Check grantor is a current ACL administrator
   *
   * @see Requirements 6.3, 6.4, 6.5
   */
  async verifyCapabilityToken(token: ICapabilityToken): Promise<boolean> {
    // Step 1: Check expiration
    if (new Date() >= token.expiresAt) {
      return false;
    }

    // Step 2: Verify grantor signature
    const payload = this.createCapabilityTokenPayload(token);
    const signatureValid = await this.authenticator.verifySignature(
      payload,
      token.grantorSignature,
      token.grantorPublicKey,
    );

    if (!signatureValid) {
      return false;
    }

    // Step 3: Check grantor is a current ACL administrator
    const { dbName, collectionName } = token.scope;
    return this.isAclAdministrator(
      token.grantorPublicKey,
      dbName,
      collectionName,
    );
  }

  // ─── Capability Token Issuance ─────────────────────────────────────

  /**
   * Issue a capability token after verifying the grantor is a current ACL administrator.
   *
   * 1. Verify the grantor (token.grantorPublicKey) is a current admin for the token's scope
   * 2. Verify the admin signature over the token payload
   * 3. Return the token (already constructed by the caller with the grantor's signature)
   *
   * @param token The capability token to issue (pre-constructed with grantorSignature)
   * @param adminSignature The admin's signature over the capability token payload
   * @returns The validated capability token
   * @throws AclAdminRequiredError if the grantor is not a current ACL administrator
   * @throws CapabilityTokenInvalidError if the admin signature over the token payload is invalid
   * @see Requirements 6.1, 6.2
   */
  async issueCapabilityToken(
    token: ICapabilityToken,
    adminSignature: Uint8Array,
  ): Promise<ICapabilityToken> {
    const { dbName, collectionName } = token.scope;

    // Step 1: Verify the grantor is a current ACL administrator
    if (
      !this.isAclAdministrator(token.grantorPublicKey, dbName, collectionName)
    ) {
      throw new AclAdminRequiredError(
        dbName,
        collectionName,
        'issueCapabilityToken',
      );
    }

    // Step 2: Verify the admin signature over the token payload
    const payload = this.createCapabilityTokenPayload(token);
    const signatureValid = await this.authenticator.verifySignature(
      payload,
      adminSignature,
      token.grantorPublicKey,
    );

    if (!signatureValid) {
      throw new CapabilityTokenInvalidError(
        'Admin signature verification failed for capability token issuance',
      );
    }

    // Step 3: Return the validated token
    return token;
  }

  // ─── Cache Management (for use by mutation methods in Task 4.2) ────

  /**
   * Set an ACL document in the cache.
   * Used internally by mutation methods and during ACL loading.
   */
  setCachedAcl(acl: IAclDocument): void {
    const key = WriteAclManager.cacheKey(
      acl.scope.dbName,
      acl.scope.collectionName,
    );
    this.aclCache.set(key, acl);
  }

  /**
   * Remove an ACL document from the cache.
   */
  removeCachedAcl(dbName: string, collectionName?: string): boolean {
    const key = WriteAclManager.cacheKey(dbName, collectionName);
    return this.aclCache.delete(key);
  }

  /**
   * Get the number of cached ACL documents.
   */
  get cacheSize(): number {
    return this.aclCache.size;
  }

  // ─── Pool Encryption Integration ───────────────────────────────────

  /**
   * Configure pool encryption mode and member list.
   *
   * When mode is PoolShared, all authorizedWriters in Write_ACLs must be
   * a subset of the pool member list. When mode is None, no pool member
   * constraints apply.
   *
   * @see Requirements 8.1, 8.2, 8.3
   */
  setPoolEncryptionConfig(
    mode: EncryptionMode,
    memberKeys: Uint8Array[],
  ): void {
    this.poolEncryptionMode = mode;
    this.poolMemberKeys = [...memberKeys];
  }

  /**
   * Get the current pool encryption mode.
   */
  getPoolEncryptionMode(): EncryptionMode {
    return this.poolEncryptionMode;
  }

  /**
   * Get the current pool member keys.
   */
  getPoolMemberKeys(): ReadonlyArray<Uint8Array> {
    return this.poolMemberKeys;
  }

  /**
   * Check whether a public key is in the pool member list.
   */
  isPoolMember(publicKey: Uint8Array): boolean {
    return this.poolMemberKeys.some((member) =>
      this.keysEqual(publicKey, member),
    );
  }

  /**
   * Handle removal of a member from the pool encryption member list.
   *
   * When a member is removed from the pool, they are automatically removed
   * from all Write_ACL authorizedWriters lists. This ensures the subset
   * invariant is maintained.
   *
   * @returns Array of cache keys for ACLs that were modified
   * @see Requirement 8.4
   */
  onPoolMemberRemoved(removedMemberKey: Uint8Array): string[] {
    // Remove from pool member list
    this.poolMemberKeys = this.poolMemberKeys.filter(
      (member) => !this.keysEqual(member, removedMemberKey),
    );

    // Only auto-remove from ACLs when pool encryption is active
    if (this.poolEncryptionMode !== EncryptionMode.PoolShared) {
      return [];
    }

    const modifiedKeys: string[] = [];

    // Iterate all cached ACLs and remove the member from authorizedWriters
    for (const [key, acl] of this.aclCache.entries()) {
      const writerIndex = acl.authorizedWriters.findIndex((w) =>
        this.keysEqual(w, removedMemberKey),
      );

      if (writerIndex >= 0) {
        const updatedAcl: IAclDocument = {
          ...acl,
          authorizedWriters: acl.authorizedWriters.filter(
            (w) => !this.keysEqual(w, removedMemberKey),
          ),
          version: acl.version + 1,
          updatedAt: new Date(),
        };
        this.aclCache.set(key, updatedAcl);
        modifiedKeys.push(key);

        this.emitChange({
          type: AclChangeEventType.WriterRemoved,
          dbName: acl.scope.dbName,
          collectionName: acl.scope.collectionName,
          adminPublicKey: acl.creatorPublicKey, // system-initiated removal
          affectedPublicKey: removedMemberKey,
          newVersion: updatedAcl.version,
        });
      }
    }

    return modifiedKeys;
  }

  /**
   * Validate that all writers in an ACL are pool members.
   * Only enforced when poolEncryptionMode is PoolShared.
   *
   * @throws WriterNotInPoolError if any writer is not a pool member
   * @see Requirements 8.2
   */
  private validateWritersArePoolMembers(
    writers: Uint8Array[],
    dbName: string,
    collectionName?: string,
  ): void {
    if (this.poolEncryptionMode !== EncryptionMode.PoolShared) {
      return; // No pool member constraints when not PoolShared
    }

    for (const writer of writers) {
      if (!this.isPoolMember(writer)) {
        const writerHex = Buffer.from(writer).toString('hex');
        throw new WriterNotInPoolError(writerHex, dbName, collectionName);
      }
    }
  }

  // ─── Event Listener Management ─────────────────────────────────────

  /**
   * Register a listener for ACL change events.
   * @see Requirement 4.7
   */
  on(listener: AclChangeListener): void {
    this.changeListeners.push(listener);
  }

  /**
   * Remove a previously registered ACL change listener.
   */
  off(listener: AclChangeListener): void {
    const idx = this.changeListeners.indexOf(listener);
    if (idx >= 0) {
      this.changeListeners.splice(idx, 1);
    }
  }

  /**
   * Emit an ACL change event to all registered listeners.
   */
  private emitChange(event: IAclChangeEvent): void {
    for (const listener of this.changeListeners) {
      listener(event);
    }
  }

  // ─── ACL Mutation Methods ──────────────────────────────────────────

  /**
   * Set or replace the ACL document for a scope.
   *
   * Validates:
   * - Admin signature is from a current administrator (or creator for first ACL)
   * - Version is strictly greater than current version (monotonically increasing)
   *
   * @returns The cache key for the stored ACL
   * @throws AclAdminRequiredError if admin signature is invalid
   * @throws AclVersionConflictError if version <= current version
   * @see Requirements 4.1, 2.6
   */
  async setAcl(
    aclDoc: IAclDocument,
    adminSignature: Uint8Array,
    adminPublicKey: Uint8Array,
  ): Promise<string> {
    const { dbName, collectionName } = aclDoc.scope;

    // Verify admin signature over the ACL document content
    await this.verifyAdminSignature(
      aclDoc,
      adminSignature,
      adminPublicKey,
      dbName,
      collectionName,
      'setAcl',
    );

    // Enforce monotonically increasing version
    const currentAcl = this.resolveAcl(dbName, collectionName);
    if (currentAcl && aclDoc.version <= currentAcl.version) {
      throw new AclVersionConflictError(
        currentAcl.version,
        aclDoc.version,
        dbName,
        collectionName,
      );
    }

    // Validate writers are pool members when PoolShared encryption is active
    this.validateWritersArePoolMembers(
      aclDoc.authorizedWriters,
      dbName,
      collectionName,
    );

    // Update cache
    const key = WriteAclManager.cacheKey(dbName, collectionName);
    this.aclCache.set(key, aclDoc);

    // Emit change event
    this.emitChange({
      type: AclChangeEventType.AclSet,
      dbName,
      collectionName,
      adminPublicKey,
      newVersion: aclDoc.version,
    });

    return key;
  }

  /**
   * Add an authorized writer to the ACL for a scope.
   *
   * Creates a new ACL version with the writer added to authorizedWriters.
   *
   * @returns The cache key for the updated ACL
   * @throws AclAdminRequiredError if admin signature is invalid
   * @see Requirements 4.1, 4.7
   */
  async addWriter(
    dbName: string,
    collectionName: string | undefined,
    writerPublicKey: Uint8Array,
    adminSignature: Uint8Array,
    adminPublicKey: Uint8Array,
  ): Promise<string> {
    const currentAcl = this.getOrCreateAcl(
      dbName,
      collectionName,
      adminPublicKey,
    );

    // Verify admin signature
    await this.verifyAdminSignature(
      currentAcl,
      adminSignature,
      adminPublicKey,
      dbName,
      collectionName,
      'addWriter',
    );

    // Validate writer is a pool member when PoolShared encryption is active
    this.validateWritersArePoolMembers(
      [writerPublicKey],
      dbName,
      collectionName,
    );

    // Check if writer already exists
    const alreadyExists = currentAcl.authorizedWriters.some((w) =>
      this.keysEqual(w, writerPublicKey),
    );

    const newVersion = currentAcl.version + 1;
    const now = new Date();
    const updatedAcl: IAclDocument = {
      ...currentAcl,
      authorizedWriters: alreadyExists
        ? currentAcl.authorizedWriters
        : [...currentAcl.authorizedWriters, writerPublicKey],
      version: newVersion,
      updatedAt: now,
    };

    const key = WriteAclManager.cacheKey(dbName, collectionName);
    this.aclCache.set(key, updatedAcl);

    this.emitChange({
      type: AclChangeEventType.WriterAdded,
      dbName,
      collectionName,
      adminPublicKey,
      affectedPublicKey: writerPublicKey,
      newVersion,
    });

    return key;
  }

  /**
   * Remove an authorized writer from the ACL for a scope.
   *
   * @returns The cache key for the updated ACL
   * @throws AclAdminRequiredError if admin signature is invalid
   * @see Requirements 4.2, 4.6, 4.7
   */
  async removeWriter(
    dbName: string,
    collectionName: string | undefined,
    writerPublicKey: Uint8Array,
    adminSignature: Uint8Array,
    adminPublicKey: Uint8Array,
  ): Promise<string> {
    const currentAcl = this.getOrCreateAcl(
      dbName,
      collectionName,
      adminPublicKey,
    );

    // Verify admin signature
    await this.verifyAdminSignature(
      currentAcl,
      adminSignature,
      adminPublicKey,
      dbName,
      collectionName,
      'removeWriter',
    );

    const newVersion = currentAcl.version + 1;
    const now = new Date();
    const updatedAcl: IAclDocument = {
      ...currentAcl,
      authorizedWriters: currentAcl.authorizedWriters.filter(
        (w) => !this.keysEqual(w, writerPublicKey),
      ),
      version: newVersion,
      updatedAt: now,
    };

    const key = WriteAclManager.cacheKey(dbName, collectionName);
    this.aclCache.set(key, updatedAcl);

    this.emitChange({
      type: AclChangeEventType.WriterRemoved,
      dbName,
      collectionName,
      adminPublicKey,
      affectedPublicKey: writerPublicKey,
      newVersion,
    });

    return key;
  }

  /**
   * Add an ACL administrator to the ACL for a scope.
   *
   * @returns The cache key for the updated ACL
   * @throws AclAdminRequiredError if existing admin signature is invalid
   * @see Requirements 4.3, 4.7
   */
  async addAdmin(
    dbName: string,
    collectionName: string | undefined,
    adminPublicKey: Uint8Array,
    existingAdminSignature: Uint8Array,
    existingAdminPublicKey: Uint8Array,
  ): Promise<string> {
    const currentAcl = this.getOrCreateAcl(
      dbName,
      collectionName,
      existingAdminPublicKey,
    );

    // Verify existing admin signature
    await this.verifyAdminSignature(
      currentAcl,
      existingAdminSignature,
      existingAdminPublicKey,
      dbName,
      collectionName,
      'addAdmin',
    );

    // Check if admin already exists
    const alreadyExists = currentAcl.aclAdministrators.some((a) =>
      this.keysEqual(a, adminPublicKey),
    );

    const newVersion = currentAcl.version + 1;
    const now = new Date();
    const updatedAcl: IAclDocument = {
      ...currentAcl,
      aclAdministrators: alreadyExists
        ? currentAcl.aclAdministrators
        : [...currentAcl.aclAdministrators, adminPublicKey],
      version: newVersion,
      updatedAt: now,
    };

    const key = WriteAclManager.cacheKey(dbName, collectionName);
    this.aclCache.set(key, updatedAcl);

    this.emitChange({
      type: AclChangeEventType.AdminAdded,
      dbName,
      collectionName,
      adminPublicKey: existingAdminPublicKey,
      affectedPublicKey: adminPublicKey,
      newVersion,
    });

    return key;
  }

  /**
   * Remove an ACL administrator from the ACL for a scope.
   *
   * Enforces last-administrator protection: rejects removal if only 1 admin remains.
   *
   * @returns The cache key for the updated ACL
   * @throws AclAdminRequiredError if existing admin signature is invalid
   * @throws LastAdministratorError if removing the last admin
   * @see Requirements 4.4, 4.5, 4.7
   */
  async removeAdmin(
    dbName: string,
    collectionName: string | undefined,
    adminPublicKey: Uint8Array,
    existingAdminSignature: Uint8Array,
    existingAdminPublicKey: Uint8Array,
  ): Promise<string> {
    const currentAcl = this.getOrCreateAcl(
      dbName,
      collectionName,
      existingAdminPublicKey,
    );

    // Verify existing admin signature
    await this.verifyAdminSignature(
      currentAcl,
      existingAdminSignature,
      existingAdminPublicKey,
      dbName,
      collectionName,
      'removeAdmin',
    );

    // Last-administrator protection
    if (currentAcl.aclAdministrators.length <= 1) {
      throw new LastAdministratorError(dbName, collectionName);
    }

    const newVersion = currentAcl.version + 1;
    const now = new Date();
    const updatedAcl: IAclDocument = {
      ...currentAcl,
      aclAdministrators: currentAcl.aclAdministrators.filter(
        (a) => !this.keysEqual(a, adminPublicKey),
      ),
      version: newVersion,
      updatedAt: now,
    };

    const key = WriteAclManager.cacheKey(dbName, collectionName);
    this.aclCache.set(key, updatedAcl);

    this.emitChange({
      type: AclChangeEventType.AdminRemoved,
      dbName,
      collectionName,
      adminPublicKey: existingAdminPublicKey,
      affectedPublicKey: adminPublicKey,
      newVersion,
    });

    return key;
  }

  // ─── Private Helpers ───────────────────────────────────────────────

  /**
   * Verify that the provided signature is from a current ACL administrator.
   *
   * For the first ACL on a scope (no existing ACL), the admin is accepted
   * if the signature verifies (they become the initial admin).
   *
   * @throws AclAdminRequiredError if signature verification fails or signer is not an admin
   */
  private async verifyAdminSignature(
    aclDoc: IAclDocument,
    adminSignature: Uint8Array,
    adminPublicKey: Uint8Array,
    dbName: string,
    collectionName: string | undefined,
    operation: string,
  ): Promise<void> {
    // Compute a payload from the ACL document content for signature verification
    const payload = this.createAclMutationPayload(aclDoc);

    const signatureValid = await this.authenticator.verifySignature(
      payload,
      adminSignature,
      adminPublicKey,
    );

    if (!signatureValid) {
      throw new AclAdminRequiredError(dbName, collectionName, operation);
    }

    // Check that the signer is a current admin (if an ACL already exists)
    const existingAcl = this.resolveAcl(dbName, collectionName);
    if (existingAcl) {
      const isAdmin = existingAcl.aclAdministrators.some((a) =>
        this.keysEqual(a, adminPublicKey),
      );
      if (!isAdmin) {
        throw new AclAdminRequiredError(dbName, collectionName, operation);
      }
    }
  }

  /**
   * Get the current ACL for a scope, or create a default one if none exists.
   * Used by addWriter/removeWriter/addAdmin/removeAdmin when no ACL is set yet.
   */
  private getOrCreateAcl(
    dbName: string,
    collectionName: string | undefined,
    adminPublicKey: Uint8Array,
  ): IAclDocument {
    const existing = this.resolveAcl(dbName, collectionName);
    if (existing) {
      return existing;
    }

    // Create a default Restricted ACL with the requesting admin as sole admin
    const now = new Date();
    const defaultAcl: IAclDocument = {
      documentId: '',
      writeMode: WriteMode.Restricted,
      authorizedWriters: [],
      aclAdministrators: [adminPublicKey],
      scope: { dbName, collectionName },
      version: 0,
      createdAt: now,
      updatedAt: now,
      creatorPublicKey: adminPublicKey,
      creatorSignature: new Uint8Array(0),
    };

    // Cache it so subsequent operations find it
    const key = WriteAclManager.cacheKey(dbName, collectionName);
    this.aclCache.set(key, defaultAcl);

    return defaultAcl;
  }

  /**
   * Create a payload for ACL mutation signature verification.
   * Uses SHA-256 of the ACL document's scope + version + writeMode.
   */
  private createAclMutationPayload(aclDoc: IAclDocument): Uint8Array {
    const collName = aclDoc.scope.collectionName ?? '';
    const message = `acl:${aclDoc.scope.dbName}:${collName}:${aclDoc.version}:${aclDoc.writeMode}`;
    const encoded = new TextEncoder().encode(message);
    return sha256(encoded);
  }

  /**
   * Compute the capability token signature payload:
   * SHA-256(granteePublicKey(hex) + ":" + dbName + ":" + collectionName + ":" + expiresAt.toISOString())
   */
  private createCapabilityTokenPayload(token: ICapabilityToken): Uint8Array {
    const granteeHex = Buffer.from(token.granteePublicKey).toString('hex');
    const collName = token.scope.collectionName ?? '';
    const message = `${granteeHex}:${token.scope.dbName}:${collName}:${token.expiresAt.toISOString()}`;
    const encoded = new TextEncoder().encode(message);
    return sha256(encoded);
  }

  /**
   * Compare two public keys for equality (constant-time-ish byte comparison).
   */
  private keysEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  }
}
