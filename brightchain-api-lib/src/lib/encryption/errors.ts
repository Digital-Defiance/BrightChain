/**
 * Custom error types for pool encryption operations.
 *
 * @see Requirements 14.2, 14.3, 14.5
 */

/**
 * Thrown when an encryption operation fails.
 */
export class EncryptionError extends Error {
  readonly cause?: Error;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'EncryptionError';
    if (cause instanceof Error) {
      this.cause = cause;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a decryption operation fails (wrong key, corrupted data, etc.).
 */
export class DecryptionError extends Error {
  readonly cause?: Error;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'DecryptionError';
    if (cause instanceof Error) {
      this.cause = cause;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a requested key version does not exist in the key history.
 */
export class KeyVersionNotFoundError extends Error {
  constructor(version: number) {
    super(`Key version ${version} not found in key history`);
    this.name = 'KeyVersionNotFoundError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a query targets an encrypted (non-searchable) metadata field.
 *
 * @see Requirement 16.5
 */
export class EncryptedFieldError extends Error {
  /** The field name that was queried but is encrypted */
  readonly fieldName: string;
  /** The pool's searchable metadata fields for reference */
  readonly searchableFields: string[];

  constructor(fieldName: string, searchableFields: string[]) {
    super(
      `Field "${fieldName}" is encrypted and not searchable in the current pool configuration. ` +
        `Searchable fields: ${searchableFields.join(', ')}`,
    );
    this.name = 'EncryptedFieldError';
    this.fieldName = fieldName;
    this.searchableFields = searchableFields;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when replication is attempted on a pool with node-specific encryption,
 * which does not support replication because other nodes cannot decrypt the data.
 *
 * @see Requirement 17.1
 */
export class ReplicationNotAllowedError extends Error {
  /** The pool ID where replication was attempted */
  readonly poolId: string;

  constructor(poolId: string) {
    super(
      `Replication is not allowed for pool "${poolId}" because it uses node-specific encryption. ` +
        `Other nodes cannot decrypt node-specific encrypted blocks.`,
    );
    this.name = 'ReplicationNotAllowedError';
    this.poolId = poolId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
