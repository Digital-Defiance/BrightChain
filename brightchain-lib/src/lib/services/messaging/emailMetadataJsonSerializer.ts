/**
 * JSON serialization helpers for IEmailMetadata.
 *
 * Maps in IEmailMetadata (customHeaders, deliveryReceipts, readReceipts,
 * encryptedKeys) do not survive JSON.stringify/parse. These helpers convert
 * Map fields to/from plain objects so the data round-trips through REST APIs.
 *
 * Server-side: call serializeEmailMetadataForJson before sending responses.
 * Client-side: call deserializeEmailMetadataFromJson after receiving responses.
 */

import type { IDeliveryReceipt } from '../../interfaces/messaging/emailDelivery';
import type { IEmailMetadata } from '../../interfaces/messaging/emailMetadata';

// ─── Serialized (JSON-safe) shape ───────────────────────────────────────────

/**
 * JSON-safe representation of IEmailMetadata where Map fields are plain objects.
 * TID defaults to string for frontend DTO usage.
 */
export type IEmailMetadataJson<TID extends string = string> = Omit<
  IEmailMetadata<TID>,
  | 'customHeaders'
  | 'deliveryReceipts'
  | 'readReceipts'
  | 'encryptedKeys'
  | 'date'
> & {
  customHeaders: Record<string, string[]>;
  deliveryReceipts: Record<string, IDeliveryReceipt<TID>>;
  readReceipts: Record<string, string>; // ISO date strings
  encryptedKeys?: Record<string, string>; // base64-encoded Uint8Array
  date: string; // ISO date string
};

// ─── Serialize (Map → plain object) ─────────────────────────────────────────

/**
 * Converts an IEmailMetadata into a JSON-safe plain object.
 * Call this server-side before sending API responses.
 */
export function serializeEmailMetadataForJson<TID extends string = string>(
  email: IEmailMetadata<TID>,
): IEmailMetadataJson<TID> {
  const result: Record<string, unknown> = { ...email };

  // customHeaders: Map<string, string[]> → Record<string, string[]>
  result['customHeaders'] = mapToRecord(email.customHeaders);

  // deliveryReceipts: Map<TID, IDeliveryReceipt<TID>> → Record<string, ...>
  result['deliveryReceipts'] = mapToRecord(email.deliveryReceipts);

  // readReceipts: Map<TID, Date> → Record<string, string>
  const readObj: Record<string, string> = {};
  if (email.readReceipts) {
    for (const [key, val] of email.readReceipts) {
      readObj[String(key)] =
        val instanceof Date ? val.toISOString() : String(val);
    }
  }
  result['readReceipts'] = readObj;

  // encryptedKeys: Map<string, Uint8Array> → Record<string, string> (base64)
  if (email.encryptedKeys) {
    const encObj: Record<string, string> = {};
    for (const [key, val] of email.encryptedKeys) {
      encObj[key] = Buffer.from(val).toString('base64');
    }
    result['encryptedKeys'] = encObj;
  }

  // date: Date → ISO string
  result['date'] =
    email.date instanceof Date ? email.date.toISOString() : String(email.date);

  return result as IEmailMetadataJson<TID>;
}

/**
 * Converts a batch of IEmailMetadata objects for JSON serialization.
 */
export function serializeEmailMetadataArrayForJson<TID extends string = string>(
  emails: IEmailMetadata<TID>[],
): IEmailMetadataJson<TID>[] {
  return emails.map(serializeEmailMetadataForJson);
}

// ─── Deserialize (plain object → Map) ───────────────────────────────────────

/**
 * Reconstructs an IEmailMetadata from a JSON-parsed plain object.
 * Call this client-side after receiving API responses.
 */
export function deserializeEmailMetadataFromJson<TID extends string = string>(
  json: IEmailMetadataJson<TID>,
): IEmailMetadata<TID> {
  const result: Record<string, unknown> = { ...json };

  // customHeaders: Record → Map
  result['customHeaders'] = recordToMap<string[]>(json.customHeaders ?? {});

  // deliveryReceipts: Record → Map
  result['deliveryReceipts'] = recordToMap<IDeliveryReceipt<TID>>(
    json.deliveryReceipts ?? {},
  );

  // readReceipts: Record<string, string> → Map<TID, Date>
  const readMap = new Map<TID, Date>();
  if (json.readReceipts) {
    for (const [key, val] of Object.entries(json.readReceipts)) {
      readMap.set(key as TID, new Date(val));
    }
  }
  result['readReceipts'] = readMap;

  // encryptedKeys: Record<string, string> → Map<string, Uint8Array>
  if (json.encryptedKeys) {
    const encMap = new Map<string, Uint8Array>();
    for (const [key, val] of Object.entries(json.encryptedKeys)) {
      encMap.set(key, Buffer.from(val, 'base64'));
    }
    result['encryptedKeys'] = encMap;
  }

  // date: string → Date
  result['date'] = new Date(json.date);

  return result as unknown as IEmailMetadata<TID>;
}

/**
 * Reconstructs a batch of IEmailMetadata objects from JSON.
 */
export function deserializeEmailMetadataArrayFromJson<
  TID extends string = string,
>(jsons: IEmailMetadataJson<TID>[]): IEmailMetadata<TID>[] {
  return jsons.map(deserializeEmailMetadataFromJson);
}

// ─── Internal helpers ───────────────────────────────────────────────────────

function mapToRecord<V>(
  map: Map<string, V> | undefined | null,
): Record<string, V> {
  const obj: Record<string, V> = {};
  if (map && typeof map.forEach === 'function') {
    map.forEach((val, key) => {
      obj[String(key)] = val;
    });
  }
  return obj;
}

function recordToMap<V>(record: Record<string, V>): Map<string, V> {
  const map = new Map<string, V>();
  for (const [key, val] of Object.entries(record)) {
    map.set(key, val);
  }
  return map;
}
