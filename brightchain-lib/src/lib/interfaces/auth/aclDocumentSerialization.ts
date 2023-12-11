/**
 * @fileoverview ACL Document serialization/deserialization helpers
 *
 * Converts IAclDocument instances to/from JSON strings, handling:
 * - Uint8Array fields ↔ hex string encoding
 * - Date fields ↔ ISO 8601 string encoding
 * - All other fields pass through as-is
 *
 * Follows the locationRecordToJSON/locationRecordFromJSON pattern
 * used elsewhere in brightchain-lib.
 *
 * @see BrightDB Write ACLs design, ACL Document JSON Schema
 * @see Requirements 2.7
 */

import { WriteMode } from '../../enumerations/writeMode';
import { IAclDocument } from './aclDocument';
import { IAclScope } from './writeAcl';

/**
 * JSON-serializable representation of IAclDocument.
 *
 * Uint8Array fields are hex-encoded strings.
 * Date fields are ISO 8601 strings.
 */
export interface SerializedAclDocument {
  documentId: string;
  writeMode: WriteMode;
  authorizedWriters: string[];
  aclAdministrators: string[];
  scope: IAclScope;
  version: number;
  createdAt: string;
  updatedAt: string;
  creatorPublicKey: string;
  creatorSignature: string;
  previousVersionBlockId?: string;
}

/**
 * Convert a Uint8Array to a hex-encoded string.
 */
function uint8ArrayToHex(arr: Uint8Array): string {
  return Buffer.from(arr).toString('hex');
}

/**
 * Convert a hex-encoded string to a Uint8Array.
 */
function hexToUint8Array(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(hex, 'hex'));
}

/**
 * Serialize an IAclDocument to a JSON string.
 *
 * - Uint8Array fields (authorizedWriters, aclAdministrators,
 *   creatorPublicKey, creatorSignature) are hex-encoded.
 * - Date fields (createdAt, updatedAt) are ISO 8601 strings.
 * - All other fields pass through unchanged.
 *
 * @param doc - The ACL document to serialize
 * @returns JSON string representation
 * @see Requirements 2.7
 */
export function serializeAclDocument(doc: IAclDocument): string {
  const serialized: SerializedAclDocument = {
    documentId: doc.documentId,
    writeMode: doc.writeMode,
    authorizedWriters: doc.authorizedWriters.map(uint8ArrayToHex),
    aclAdministrators: doc.aclAdministrators.map(uint8ArrayToHex),
    scope: { ...doc.scope },
    version: doc.version,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    creatorPublicKey: uint8ArrayToHex(doc.creatorPublicKey),
    creatorSignature: uint8ArrayToHex(doc.creatorSignature),
    ...(doc.previousVersionBlockId !== undefined && {
      previousVersionBlockId: doc.previousVersionBlockId,
    }),
  };
  return JSON.stringify(serialized);
}

/**
 * Deserialize a JSON string into an IAclDocument.
 *
 * - Hex-encoded strings are converted back to Uint8Array.
 * - ISO 8601 strings are converted back to Date objects.
 * - All other fields pass through unchanged.
 *
 * @param json - JSON string to deserialize
 * @returns The deserialized ACL document
 * @throws Error if the JSON is malformed or contains invalid data
 * @see Requirements 2.7
 */
export function deserializeAclDocument(json: string): IAclDocument {
  const parsed: SerializedAclDocument = JSON.parse(json);

  const createdAt = new Date(parsed.createdAt);
  const updatedAt = new Date(parsed.updatedAt);

  if (isNaN(createdAt.getTime())) {
    throw new Error('Invalid createdAt date in ACL document');
  }
  if (isNaN(updatedAt.getTime())) {
    throw new Error('Invalid updatedAt date in ACL document');
  }

  return {
    documentId: parsed.documentId,
    writeMode: parsed.writeMode,
    authorizedWriters: parsed.authorizedWriters.map(hexToUint8Array),
    aclAdministrators: parsed.aclAdministrators.map(hexToUint8Array),
    scope: { ...parsed.scope },
    version: parsed.version,
    createdAt,
    updatedAt,
    creatorPublicKey: hexToUint8Array(parsed.creatorPublicKey),
    creatorSignature: hexToUint8Array(parsed.creatorSignature),
    ...(parsed.previousVersionBlockId !== undefined && {
      previousVersionBlockId: parsed.previousVersionBlockId,
    }),
  };
}
