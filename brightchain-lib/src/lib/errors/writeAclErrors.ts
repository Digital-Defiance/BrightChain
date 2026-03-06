/**
 * @fileoverview Write ACL Error Types
 *
 * Error hierarchy for Write ACL authorization and management operations.
 * These errors are thrown by the WriteAclManager, AuthorizedHeadRegistry,
 * and related components when write authorization checks fail.
 *
 * @see Requirements 3.4, 4.5, 6.4, 6.5
 */

/**
 * Thrown when a write operation is rejected due to missing or invalid Write_Proof
 * in Restricted_Mode or Owner_Only_Mode.
 *
 * @see Requirement 3.4
 */
export class WriteAuthorizationError extends Error {
  constructor(
    public readonly dbName: string,
    public readonly collectionName: string,
    public readonly reason: string,
    public readonly signerPublicKey?: string,
  ) {
    super(
      `Write authorization failed for ${dbName}/${collectionName}: ${reason}`,
    );
    this.name = 'WriteAuthorizationError';
  }
}

/**
 * Thrown when an ACL mutation is attempted without a valid administrator signature.
 *
 * @see Requirement 4.1, 4.2, 4.3, 4.4
 */
export class AclAdminRequiredError extends Error {
  constructor(
    public readonly dbName: string,
    public readonly collectionName?: string,
    public readonly operation?: string,
  ) {
    const scope = collectionName ? `${dbName}/${collectionName}` : dbName;
    super(
      `ACL administrator signature required for ${operation ?? 'ACL mutation'} on ${scope}`,
    );
    this.name = 'AclAdminRequiredError';
  }
}

/**
 * Thrown when a capability token has expired.
 *
 * @see Requirement 6.4
 */
export class CapabilityTokenExpiredError extends Error {
  constructor(
    public readonly expiresAt: Date,
    public readonly currentTime: Date,
  ) {
    super(
      `Capability token expired at ${expiresAt.toISOString()} (current time: ${currentTime.toISOString()})`,
    );
    this.name = 'CapabilityTokenExpiredError';
  }
}

/**
 * Thrown when a capability token's signature does not match any current ACL administrator.
 *
 * @see Requirement 6.5
 */
export class CapabilityTokenInvalidError extends Error {
  constructor(
    public readonly reason: string,
    public readonly grantorPublicKey?: string,
  ) {
    super(`Capability token invalid: ${reason}`);
    this.name = 'CapabilityTokenInvalidError';
  }
}

/**
 * Thrown when an attempt is made to remove the last ACL administrator.
 *
 * @see Requirement 4.5
 */
export class LastAdministratorError extends Error {
  constructor(
    public readonly dbName: string,
    public readonly collectionName?: string,
  ) {
    const scope = collectionName ? `${dbName}/${collectionName}` : dbName;
    super(`Cannot remove the last ACL administrator for ${scope}`);
    this.name = 'LastAdministratorError';
  }
}

/**
 * Thrown when an ACL document update has a version number less than or equal
 * to the current version.
 *
 * @see Requirement 2.6
 */
export class AclVersionConflictError extends Error {
  constructor(
    public readonly currentVersion: number,
    public readonly incomingVersion: number,
    public readonly dbName: string,
    public readonly collectionName?: string,
  ) {
    const scope = collectionName ? `${dbName}/${collectionName}` : dbName;
    super(
      `ACL version conflict for ${scope}: incoming version ${incomingVersion} <= current version ${currentVersion}`,
    );
    this.name = 'AclVersionConflictError';
  }
}

/**
 * Thrown when an ACL document's signature fails verification on load.
 *
 * @see Requirement 2.3, 2.4
 */
export class AclSignatureVerificationError extends Error {
  constructor(
    public readonly documentId: string,
    public readonly reason: string,
  ) {
    super(
      `ACL document signature verification failed for ${documentId}: ${reason}`,
    );
    this.name = 'AclSignatureVerificationError';
  }
}

/**
 * Thrown when attempting to add a writer who is not in the pool encryption member list.
 *
 * @see Requirement 8.2
 */
export class WriterNotInPoolError extends Error {
  constructor(
    public readonly writerPublicKey: string,
    public readonly dbName: string,
    public readonly collectionName?: string,
  ) {
    const scope = collectionName ? `${dbName}/${collectionName}` : dbName;
    super(
      `Writer ${writerPublicKey} is not in the pool encryption member list for ${scope}`,
    );
    this.name = 'WriterNotInPoolError';
  }
}
