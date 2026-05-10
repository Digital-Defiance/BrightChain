import type { BsonDocument, FilterQuery } from '@brightchain/db';
import { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * ID serialization functions that each repository needs to correctly
 * round-trip TID values through BrightDB's JSON-based storage.
 */
export interface IdSerializer<TID extends PlatformID> {
  /** Convert a TID to a hex string for storage. */
  idToString: (id: TID) => string;
  /** Reconstruct a TID from a hex string. */
  parseId: (idString: string) => TID;
}

/**
 * Known field names that hold TID values across burnbag domain objects.
 * Used by `fromDoc` to automatically deserialize hex strings back to TID.
 */
const ID_FIELDS = new Set([
  'id',
  '_id',
  'ownerId',
  'parentFolderId',
  'folderId',
  'fileId',
  'aclId',
  'createdBy',
  'updatedBy',
  'userId',
  'targetId',
  'actorId',
  'requesterId',
  'recipientUserId',
  'shareLinkId',
  'fileVersionId',
  'principalId',
  'organizationId',
  'sharedBy',
  'itemId',
  'bindingId',
  'listId',
  'sessionId',
  'entryId',
  'policyId',
  'requestId',
  'versionId',
  'currentVersionId',
]);

/**
 * Cross-realm safe check for Uint8Array/Buffer values.
 * `instanceof Uint8Array` fails when the value comes from a different
 * module realm (e.g. tsconfig-paths resolution). We use
 * Object.prototype.toString which returns the internal [[Class]] tag
 * and works reliably across realms.
 */
function isBufferLike(value: unknown): value is Uint8Array {
  if (value instanceof Uint8Array) return true;
  if (typeof value !== 'object' || value === null) return false;
  const tag = Object.prototype.toString.call(value);
  return tag === '[object Uint8Array]' || tag === '[object Buffer]';
}

/**
 * Recursively serialize any TID (Buffer/Uint8Array) values in an object to hex strings.
 * Only serializes values that are Buffer or Uint8Array instances.
 */
function serializeValue<TID extends PlatformID>(
  value: unknown,
  idToString: (id: TID) => string,
): unknown {
  if (value === null || value === undefined) return value;
  if (isBufferLike(value)) {
    return idToString(value as TID);
  }
  if (Array.isArray(value)) {
    return value.map((v) => serializeValue(v, idToString));
  }
  if (typeof value === 'object' && !(value instanceof Date)) {
    return serializeObject(value as Record<string, unknown>, idToString);
  }
  return value;
}

function serializeObject<TID extends PlatformID>(
  obj: Record<string, unknown>,
  idToString: (id: TID) => string,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = serializeValue(value, idToString);
  }
  return result;
}

/**
 * Cast a plain filter object to BrightDB's FilterQuery type,
 * serializing any Buffer/Uint8Array values to hex strings so
 * they match the stored (JSON-serialized) documents.
 */
export function filter<TID extends PlatformID>(
  obj: Record<string, unknown>,
  ids?: IdSerializer<TID>,
): FilterQuery<BsonDocument> {
  if (!ids) {
    return obj as FilterQuery<BsonDocument>;
  }
  return serializeObject(obj, ids.idToString) as FilterQuery<BsonDocument>;
}

/**
 * Convert a domain object with `id` to a BrightDB document with `_id`,
 * serializing all Buffer/Uint8Array values to hex strings.
 */
export function toDoc<TID extends PlatformID, T extends { id: unknown }>(
  entity: T,
  ids?: IdSerializer<TID>,
): Record<string, unknown> {
  const { id, ...rest } = entity;
  if (!ids) {
    return { _id: id as string, ...rest };
  }
  const serializedId = isBufferLike(id) ? ids.idToString(id as TID) : id;
  return {
    _id: serializedId as string,
    ...serializeObject(rest as Record<string, unknown>, ids.idToString),
  };
}

/**
 * Convert a BrightDB document with `_id` back to a domain object with `id`,
 * deserializing known ID fields from hex strings back to TID.
 */
export function fromDoc<TID extends PlatformID, TResult>(
  doc: unknown,
  ids?: IdSerializer<TID>,
): TResult {
  const d = doc as Record<string, unknown>;
  const { _id, ...rest } = d;
  if (!ids) {
    return { id: _id, ...rest } as TResult;
  }
  const result: Record<string, unknown> = {
    id: typeof _id === 'string' ? tryParse(_id, ids.parseId) : _id,
  };
  for (const [key, value] of Object.entries(rest)) {
    result[key] = deserializeField(key, value, ids.parseId);
  }
  return result as TResult;
}

function deserializeField<TID extends PlatformID>(
  key: string,
  value: unknown,
  parseId: (s: string) => TID,
): unknown {
  if (value === null || value === undefined) return value;
  if (ID_FIELDS.has(key) && typeof value === 'string') {
    return tryParse(value, parseId);
  }
  if (Array.isArray(value)) {
    // Arrays of IDs (e.g. memberIds, approverIds)
    if (key.endsWith('Ids') && value.every((v) => typeof v === 'string')) {
      return value.map((v) => tryParse(v as string, parseId));
    }
    // Arrays of objects (e.g. ACL entries)
    return value.map((item) => {
      if (
        typeof item === 'object' &&
        item !== null &&
        !(item instanceof Date)
      ) {
        const result: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
          result[k] = deserializeField(k, v, parseId);
        }
        return result;
      }
      return item;
    });
  }
  // Nested objects (but not Dates)
  if (typeof value === 'object' && !(value instanceof Date)) {
    // Check if this looks like a serialized Buffer: {type:"Buffer",data:[...]}
    const obj = value as Record<string, unknown>;
    if (obj['type'] === 'Buffer' && Array.isArray(obj['data'])) {
      // This is a Buffer that was JSON.stringified — reconstruct it
      return Buffer.from(obj['data'] as number[]);
    }
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = deserializeField(k, v, parseId);
    }
    return result;
  }
  return value;
}

/** Try to parse a hex string as a TID; return the original string on failure. */
function tryParse<TID>(
  value: string,
  parseId: (s: string) => TID,
): TID | string {
  try {
    return parseId(value);
  } catch {
    return value;
  }
}
