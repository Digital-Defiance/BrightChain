/**
 * Order-preserving, prefix-free key encoding for secondary indexes
 * (spec section 7). An entry key is the encoded indexed values followed by the
 * encoded document _id, so bytewise order is index order and keys are unique.
 */
import { MAX_INDEX_KEY_BYTES } from './codec';

export class V2IndexError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'V2IndexError';
  }
}

export type IndexScalar = null | boolean | number | string;

const TAG_ABSENT = 0x08;
const TAG_NULL = 0x10;
const TAG_FALSE = 0x20;
const TAG_TRUE = 0x21;
const TAG_NUMBER = 0x30;
const TAG_STRING = 0x40;
const MAX_COMBINATIONS = 1024;
const UNPAIRED_SURROGATE = /[\uD800-\uDFFF]/u;

function escapeString(value: string): Buffer {
  if (UNPAIRED_SURROGATE.test(value)) {
    throw new V2IndexError('An indexed string must be well-formed Unicode');
  }
  const bytes = Buffer.from(value, 'utf8');
  const out: number[] = [];
  for (const byte of bytes) {
    out.push(byte);
    if (byte === 0x00) out.push(0xff);
  }
  return Buffer.from(out);
}

/** Encode one value. `undefined` is an absent field. */
export function encodeIndexValue(value: IndexScalar | undefined): Buffer {
  if (value === undefined) return Buffer.from([TAG_ABSENT]);
  if (value === null) return Buffer.from([TAG_NULL]);
  if (typeof value === 'boolean') {
    return Buffer.from([value ? TAG_TRUE : TAG_FALSE]);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new V2IndexError('An indexed number must be finite');
    }
    const out = Buffer.alloc(9);
    out[0] = TAG_NUMBER;
    out.writeDoubleBE(value === 0 ? 0 : value, 1); // -0 sorts with 0
    if ((out[1] & 0x80) !== 0) {
      for (let i = 1; i < 9; i++) out[i] ^= 0xff; // negative: reverse the order
    } else {
      out[1] ^= 0x80; // positive: above every negative
    }
    return out;
  }
  if (typeof value === 'string') {
    return Buffer.concat([
      Buffer.from([TAG_STRING]),
      escapeString(value),
      Buffer.from([0x00]),
    ]);
  }
  throw new V2IndexError('Only scalar values can be indexed');
}

/** The smallest byte string greater than every string with this prefix, or null. */
export function prefixSuccessor(prefix: Uint8Array): Buffer | null {
  const bytes = Buffer.from(prefix);
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0xff) end--;
  if (end === 0) return null;
  const out = Buffer.from(bytes.subarray(0, end));
  out[end - 1]++;
  return out;
}

/** Length of the component starting at `offset`, which must be a whole component. */
function componentLength(key: Buffer, offset: number): number {
  const tag = key[offset];
  switch (tag) {
    case TAG_ABSENT:
    case TAG_NULL:
    case TAG_FALSE:
    case TAG_TRUE:
      return 1;
    case TAG_NUMBER:
      return 9;
    case TAG_STRING: {
      let i = offset + 1;
      while (i < key.length) {
        if (key[i] === 0x00) {
          if (key[i + 1] === 0xff) {
            i += 2;
            continue;
          }
          return i + 1 - offset;
        }
        i++;
      }
      throw new V2IndexError('Unterminated string in an index key');
    }
    default:
      throw new V2IndexError('Unknown value tag in an index key');
  }
}

/** The document _id at the end of an entry for an index with `fieldCount` fields. */
export function decodeIndexId(key: Buffer, fieldCount: number): string {
  let offset = 0;
  for (let i = 0; i < fieldCount; i++) offset += componentLength(key, offset);
  if (key[offset] !== TAG_STRING) {
    throw new V2IndexError('An index key must end with a document _id');
  }
  const end = offset + componentLength(key, offset);
  if (end !== key.length) throw new V2IndexError('Trailing bytes in an index key');
  const raw = key.subarray(offset + 1, end - 1);
  const bytes: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    bytes.push(raw[i]);
    if (raw[i] === 0x00) i++; // skip the 0xff escape
  }
  return Buffer.from(bytes).toString('utf8');
}

function fieldValues(document: unknown, path: string): IndexScalar[] {
  let current: unknown = document;
  for (const part of path.split('.')) {
    if (
      current === null ||
      typeof current !== 'object' ||
      Array.isArray(current) ||
      !Object.prototype.hasOwnProperty.call(current, part)
    ) {
      return [undefined as unknown as IndexScalar];
    }
    current = (current as Record<string, unknown>)[part];
  }
  if (Array.isArray(current)) {
    if (current.length === 0) return [undefined as unknown as IndexScalar];
    for (const element of current) {
      if (element !== null && typeof element === 'object') {
        throw new V2IndexError(
          `Field ${path} holds an array element that cannot be indexed`,
        );
      }
    }
    return current as IndexScalar[];
  }
  if (current !== null && typeof current === 'object') {
    throw new V2IndexError(`Field ${path} holds an object that cannot be indexed`);
  }
  return [current as IndexScalar];
}

/**
 * Entry keys for one document. Array fields produce one entry per element
 * (a multikey index); absent fields index as a distinct "absent" value.
 */
export function extractIndexKeys(
  document: unknown,
  fields: readonly string[],
  id: string,
): Buffer[] {
  const idBytes = encodeIndexValue(id);
  let combinations: Buffer[][] = [[]];
  for (const field of fields) {
    const encoded = [
      ...new Set(
        fieldValues(document, field).map((value) =>
          encodeIndexValue(value === undefined ? undefined : value).toString('hex'),
        ),
      ),
    ].map((hex) => Buffer.from(hex, 'hex'));
    const next: Buffer[][] = [];
    for (const prefix of combinations) {
      for (const value of encoded) next.push([...prefix, value]);
    }
    if (next.length > MAX_COMBINATIONS) {
      throw new V2IndexError('A document produces too many index entries');
    }
    combinations = next;
  }
  const keys = combinations.map((parts) => Buffer.concat([...parts, idBytes]));
  for (const key of keys) {
    if (key.length > MAX_INDEX_KEY_BYTES) {
      throw new V2IndexError(`An index key exceeds ${MAX_INDEX_KEY_BYTES} bytes`);
    }
  }
  return keys;
}

export interface IndexQuery {
  /** Exact values for the leading fields. */
  equals?: readonly IndexScalar[];
  /** Bounds on the field after `equals`. Mixing types never matches across types. */
  gt?: IndexScalar;
  gte?: IndexScalar;
  lt?: IndexScalar;
  lte?: IndexScalar;
  /** Strings starting with this value, on the field after `equals`. */
  prefix?: string;
  descending?: boolean;
  limit?: number;
}

/** The key range [lo, hi) for a query; `hi` null is unbounded. */
export function indexRange(
  fieldCount: number,
  query: IndexQuery,
): { lo: Buffer; hi: Buffer | null } {
  const equals = query.equals ?? [];
  if (equals.length > fieldCount) {
    throw new V2IndexError('More equality values than index fields');
  }
  const bounds = [query.gt, query.gte, query.lt, query.lte].filter(
    (value) => value !== undefined,
  );
  const hasBounds = bounds.length > 0 || query.prefix !== undefined;
  if (hasBounds && equals.length >= fieldCount) {
    throw new V2IndexError('No index field is left for a range bound');
  }
  if (query.prefix !== undefined && bounds.length > 0) {
    throw new V2IndexError('prefix cannot be combined with other bounds');
  }
  if (query.gt !== undefined && query.gte !== undefined) {
    throw new V2IndexError('Use either gt or gte');
  }
  if (query.lt !== undefined && query.lte !== undefined) {
    throw new V2IndexError('Use either lt or lte');
  }
  const encoded = equals.map((value) => encodeIndexValue(value));
  const base = Buffer.concat(encoded);
  // Keys that start with `base` but continue with 0xff belong to longer strings.
  const baseEnd = (): Buffer | null =>
    equals.length > 0 && typeof equals[equals.length - 1] === 'string'
      ? Buffer.concat([base, Buffer.from([0xff])])
      : prefixSuccessor(base);

  if (query.prefix !== undefined) {
    const lo = Buffer.concat([base, Buffer.from([TAG_STRING]), escapeString(query.prefix)]);
    return { lo, hi: prefixSuccessor(lo) };
  }
  if (!hasBounds) return { lo: base, hi: baseEnd() };

  const afterValue = (value: IndexScalar): Buffer => {
    const bytes = Buffer.concat([base, encodeIndexValue(value)]);
    return typeof value === 'string'
      ? Buffer.concat([bytes, Buffer.from([0xff])])
      : (prefixSuccessor(bytes) as Buffer);
  };
  const withValue = (value: IndexScalar): Buffer =>
    Buffer.concat([base, encodeIndexValue(value)]);
  const tagOf = (value: IndexScalar): Buffer =>
    Buffer.concat([base, encodeIndexValue(value).subarray(0, 1)]);

  let lo: Buffer | undefined;
  let hi: Buffer | null | undefined;
  if (query.gte !== undefined) lo = withValue(query.gte);
  if (query.gt !== undefined) lo = afterValue(query.gt);
  if (query.lte !== undefined) hi = afterValue(query.lte);
  if (query.lt !== undefined) hi = withValue(query.lt);
  const lowerSource = query.gte !== undefined ? query.gte : query.gt;
  const upperSource = query.lte !== undefined ? query.lte : query.lt;
  if (lo === undefined) lo = tagOf(upperSource as IndexScalar);
  if (hi === undefined) {
    hi = prefixSuccessor(tagOf(lowerSource as IndexScalar));
  }
  return { lo, hi };
}
