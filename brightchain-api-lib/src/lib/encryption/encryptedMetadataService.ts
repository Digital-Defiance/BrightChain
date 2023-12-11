/**
 * Encrypted Metadata Service — handles metadata encryption/decryption
 * for CBL Index entries in encrypted pools.
 *
 * Controls which metadata fields remain searchable (unencrypted) based
 * on pool configuration, encrypts the rest, and enforces query restrictions
 * on encrypted fields.
 *
 * @see Requirements 16.1, 16.2, 16.3, 16.4, 16.5
 */

import type {
  ICBLIndexEntry,
  IPoolEncryptionConfig,
} from '@brightchain/brightchain-lib';
import { EncryptionMode } from '@brightchain/brightchain-lib';
import { EncryptedFieldError } from './errors';
import { PoolEncryptionService } from './poolEncryptionService';

/**
 * Fields that are always unencrypted regardless of pool configuration.
 * These are structural fields required for block lookups, pool scoping,
 * and basic index operations.
 *
 * Block IDs (checksums) are always unencrypted because they are content
 * hashes of the encrypted data (Requirement 16.2).
 */
const ALWAYS_UNENCRYPTED_FIELDS: readonly string[] = [
  '_id',
  'magnetUrl',
  'blockId1',
  'blockId2',
  'blockSize',
  'poolId',
  'createdAt',
  'sequenceNumber',
  'visibility',
  'createdBy',
] as const;

/**
 * Fields that may be encrypted unless explicitly listed as searchable
 * in the pool configuration (Requirement 16.3).
 */
const ENCRYPTABLE_FIELDS: readonly string[] = [
  'metadata.fileName',
  'metadata.mimeType',
  'metadata.originalSize',
  'metadata.tags',
  'userCollection',
  'fileId',
  'versionNumber',
  'previousVersion',
] as const;

export class EncryptedMetadataService {
  private readonly encryptionService: PoolEncryptionService;
  private readonly config: IPoolEncryptionConfig;

  constructor(
    encryptionService: PoolEncryptionService,
    config: IPoolEncryptionConfig,
  ) {
    this.encryptionService = encryptionService;
    this.config = config;
  }

  /**
   * Encrypt non-searchable metadata fields on a CBL index entry.
   *
   * Fields listed in ALWAYS_UNENCRYPTED_FIELDS are never encrypted.
   * Fields listed in ENCRYPTABLE_FIELDS are encrypted unless they appear
   * in the pool config's searchableMetadataFields.
   *
   * Encrypted values are stored as base64 strings in the entry's
   * `encryptedFields` map, and the original fields are set to undefined.
   *
   * @param entry - The CBL index entry to encrypt
   * @param poolKey - The 32-byte symmetric pool key for AES-256-GCM encryption
   * @returns A new entry with non-searchable fields encrypted
   * @see Requirements 16.1, 16.3
   */
  async encryptMetadata(
    entry: ICBLIndexEntry,
    poolKey: Uint8Array,
  ): Promise<ICBLIndexEntry> {
    if (this.config.mode === EncryptionMode.None) {
      return { ...entry };
    }

    const result: ICBLIndexEntry = { ...entry };
    if (result.metadata) {
      result.metadata = { ...result.metadata };
    }
    const encryptedFields: Record<string, string> = {
      ...(result.encryptedFields ?? {}),
    };

    for (const fieldPath of ENCRYPTABLE_FIELDS) {
      if (this.isSearchable(fieldPath)) {
        continue;
      }

      const value = this.getFieldValue(result, fieldPath);
      if (value === undefined) {
        continue;
      }

      const serialized = JSON.stringify(value);
      const plaintext = new TextEncoder().encode(serialized);
      const ciphertext = await this.encryptionService.encryptPoolShared(
        plaintext,
        poolKey,
      );
      encryptedFields[fieldPath] = this.uint8ArrayToBase64(ciphertext);

      this.clearFieldValue(result, fieldPath);
    }

    result.encryptedFields = encryptedFields;
    return result;
  }

  /**
   * Decrypt encrypted metadata fields on a CBL index entry,
   * restoring original field values from the `encryptedFields` map.
   *
   * @param entry - The CBL index entry with encrypted fields
   * @param poolKey - The 32-byte symmetric pool key for AES-256-GCM decryption
   * @returns A new entry with all fields decrypted and restored
   */
  async decryptMetadata(
    entry: ICBLIndexEntry,
    poolKey: Uint8Array,
  ): Promise<ICBLIndexEntry> {
    if (
      !entry.encryptedFields ||
      Object.keys(entry.encryptedFields).length === 0
    ) {
      return { ...entry };
    }

    const result: ICBLIndexEntry = { ...entry };
    if (result.metadata) {
      result.metadata = { ...result.metadata };
    }

    for (const [fieldPath, base64Ciphertext] of Object.entries(
      entry.encryptedFields,
    )) {
      const ciphertext = this.base64ToUint8Array(base64Ciphertext);
      const plaintext = await this.encryptionService.decryptPoolShared(
        ciphertext,
        poolKey,
      );
      const serialized = new TextDecoder().decode(plaintext);
      const value: unknown = JSON.parse(serialized);

      this.setFieldValue(result, fieldPath, value);
    }

    // Remove the encryptedFields map after decryption
    delete result.encryptedFields;
    return result;
  }

  /**
   * Validate that queried fields are searchable (not encrypted).
   * Throws EncryptedFieldError if any queried field is encrypted.
   *
   * @param queryFields - Field names being queried
   * @throws EncryptedFieldError if a queried field is encrypted
   * @see Requirement 16.5
   */
  validateQuery(queryFields: string[]): void {
    const searchable = this.getSearchableFields();
    for (const field of queryFields) {
      if (!searchable.includes(field)) {
        throw new EncryptedFieldError(field, searchable);
      }
    }
  }

  /**
   * Returns false if the pool has any encryption mode other than None.
   * Content-based indexing and CBL address extraction are not possible
   * on encrypted blocks because the block content is opaque.
   *
   * @returns Whether content-based indexing is allowed
   * @see Requirement 16.4
   */
  isContentIndexingAllowed(): boolean {
    return this.config.mode === EncryptionMode.None;
  }

  /**
   * Returns the list of always-unencrypted fields plus the configured
   * searchable metadata fields.
   *
   * @returns All searchable (unencrypted) field names
   * @see Requirement 16.1
   */
  getSearchableFields(): string[] {
    return [
      ...ALWAYS_UNENCRYPTED_FIELDS,
      ...this.config.searchableMetadataFields,
    ];
  }

  // ─── Private Helpers ────────────────────────────────────────────────

  /**
   * Check if a field path is searchable (always unencrypted or in config).
   */
  private isSearchable(fieldPath: string): boolean {
    return (
      ALWAYS_UNENCRYPTED_FIELDS.includes(fieldPath) ||
      this.config.searchableMetadataFields.includes(fieldPath)
    );
  }

  /**
   * Get a field value from an entry by dot-notation path.
   */
  private getFieldValue(entry: ICBLIndexEntry, fieldPath: string): unknown {
    const parts = fieldPath.split('.');
    if (parts.length === 1) {
      return entry[fieldPath as keyof ICBLIndexEntry];
    }
    if (parts.length === 2 && parts[0] === 'metadata' && entry.metadata) {
      return entry.metadata[parts[1] as keyof typeof entry.metadata];
    }
    return undefined;
  }

  /**
   * Clear a field value on an entry by dot-notation path (set to undefined).
   */
  private clearFieldValue(entry: ICBLIndexEntry, fieldPath: string): void {
    const parts = fieldPath.split('.');
    if (parts.length === 1) {
      Reflect.deleteProperty(entry, fieldPath);
    } else if (
      parts.length === 2 &&
      parts[0] === 'metadata' &&
      entry.metadata
    ) {
      Reflect.deleteProperty(entry.metadata, parts[1]);
    }
  }

  /**
   * Set a field value on an entry by dot-notation path.
   */
  private setFieldValue(
    entry: ICBLIndexEntry,
    fieldPath: string,
    value: unknown,
  ): void {
    const parts = fieldPath.split('.');
    if (parts.length === 1) {
      Reflect.set(entry, fieldPath, value);
    } else if (parts.length === 2 && parts[0] === 'metadata') {
      if (!entry.metadata) {
        entry.metadata = {};
      }
      Reflect.set(entry.metadata, parts[1], value);
    }
  }

  private uint8ArrayToBase64(data: Uint8Array): string {
    return Buffer.from(data).toString('base64');
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
}
