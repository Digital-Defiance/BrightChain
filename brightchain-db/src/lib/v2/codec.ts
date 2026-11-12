import { createHash } from 'node:crypto';

export const MAX_U64 = (1n << 64n) - 1n;
export const MAX_METADATA_BYTES = 4096;
export const MAX_DOCUMENT_BYTES = 1_048_576;
const MAX_KEY_BYTES = 1024;
const DIGEST_BYTES = 64;
const ID_BYTES = 16;
const LEAF_HEADER_BYTES = 7;
const RECORD_HEADER_BYTES = 2 + 8 + ID_BYTES + 1;
const MAGIC = Buffer.from('BDB2', 'ascii');
const ZERO_WRITER_ID = '0'.repeat(32);
const ID_PATTERN = /^[0-9a-f]{32}$/u;
const DIGEST_PATTERN = /^[0-9a-f]{128}$/u;
const UNPAIRED_SURROGATE = /[\uD800-\uDFFF]/u;
const UTF8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

/** Lowercase SHA3-512 hex string, validated at serialization boundaries. */
export type Digest = string;

export interface V2Version {
  counter: bigint;
  writerId: string;
}

export interface V2Record {
  key: string;
  version: V2Version;
  /** Null denotes a tombstone. */
  target: Digest | null;
}

export interface V2DatabaseRoot {
  kind: 'database';
  databaseId: string;
  clock: bigint;
  catalog: Digest | null;
}

export interface V2CollectionRoot {
  kind: 'collection';
  generation: V2Version;
  primary: Digest | null;
}

export interface V2BranchChild {
  nibble: number;
  recordBytes: bigint;
  digest: Digest;
}

export interface V2Branch {
  kind: 'branch';
  children: readonly V2BranchChild[];
}

export interface V2Leaf {
  kind: 'primary' | 'catalog';
  records: readonly V2Record[];
}

export type V2Metadata = V2DatabaseRoot | V2CollectionRoot | V2Branch | V2Leaf;

export type V2JsonValue =
  | null
  | boolean
  | number
  | string
  | V2JsonValue[]
  | { [key: string]: V2JsonValue };

export type V2Document = { [key: string]: V2JsonValue; _id: string };

export class V2CodecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'V2CodecError';
  }
}

export function digestPayload(bytes: Uint8Array): Digest {
  return createHash('sha3-512').update(bytes).digest('hex');
}

/** Encode raw key bytes, without the length prefix used inside a page. */
export function encodeKey(key: string): Buffer {
  if (typeof key !== 'string' || UNPAIRED_SURROGATE.test(key)) {
    throw new V2CodecError('A key must be a well-formed Unicode string');
  }
  const bytes = Buffer.from(key, 'utf8');
  if (bytes.length < 1 || bytes.length > MAX_KEY_BYTES) {
    throw new V2CodecError('A key must occupy 1–1024 UTF-8 bytes');
  }
  return bytes;
}

export function compareKeys(left: string, right: string): number {
  return Buffer.compare(encodeKey(left), encodeKey(right));
}

export function compareVersions(left: V2Version, right: V2Version): number {
  if (left.counter !== right.counter) {
    return left.counter < right.counter ? -1 : 1;
  }
  if (left.writerId === right.writerId) return 0;
  return left.writerId < right.writerId ? -1 : 1;
}

export function recordByteLength(record: V2Record): number {
  return (
    RECORD_HEADER_BYTES +
    encodeKey(record.key).length +
    (record.target === null ? 0 : DIGEST_BYTES)
  );
}

function readUtf8(bytes: Uint8Array): string {
  try {
    return UTF8.decode(bytes);
  } catch {
    throw new V2CodecError('Malformed UTF-8');
  }
}

function verifyDigest(bytes: Uint8Array, expected: Digest | undefined): void {
  if (expected !== undefined && digestPayload(bytes) !== expected) {
    throw new V2CodecError('Block digest mismatch');
  }
}

class MetadataWriter {
  private readonly buffer = Buffer.alloc(MAX_METADATA_BYTES);
  private offset = 0;

  private reserve(size: number): number {
    const start = this.offset;
    this.offset += size;
    if (this.offset > MAX_METADATA_BYTES) {
      throw new V2CodecError('Metadata block exceeds 4096 bytes');
    }
    return start;
  }

  bytes(value: Uint8Array): void {
    this.buffer.set(value, this.reserve(value.length));
  }

  u8(value: number): void {
    this.buffer.writeUInt8(value, this.reserve(1));
  }

  u16(value: number): void {
    this.buffer.writeUInt16BE(value, this.reserve(2));
  }

  u64(value: bigint): void {
    if (typeof value !== 'bigint' || value < 0n || value > MAX_U64) {
      throw new V2CodecError('Value is outside the unsigned 64-bit range');
    }
    this.buffer.writeBigUInt64BE(value, this.reserve(8));
  }

  id(value: string): void {
    if (typeof value !== 'string' || !ID_PATTERN.test(value)) {
      throw new V2CodecError('An ID must be 32 lowercase hexadecimal digits');
    }
    this.bytes(Buffer.from(value, 'hex'));
  }

  digest(value: Digest): void {
    if (typeof value !== 'string' || !DIGEST_PATTERN.test(value)) {
      throw new V2CodecError(
        'A digest must be 128 lowercase hexadecimal digits',
      );
    }
    this.bytes(Buffer.from(value, 'hex'));
  }

  ref(value: Digest | null): void {
    this.u8(value === null ? 0 : 1);
    if (value !== null) this.digest(value);
  }

  version(value: V2Version): void {
    if (value.counter === 0n || value.writerId === ZERO_WRITER_ID) {
      throw new V2CodecError(
        'A version requires a positive counter and a nonzero writer ID',
      );
    }
    this.u64(value.counter);
    this.id(value.writerId);
  }

  finish(): Buffer {
    return Buffer.from(this.buffer.subarray(0, this.offset));
  }
}

class MetadataReader {
  private readonly buffer: Buffer;
  private offset = 0;

  constructor(bytes: Uint8Array) {
    this.buffer = Buffer.from(bytes);
  }

  private take(size: number): number {
    const start = this.offset;
    this.offset += size;
    if (this.offset > this.buffer.length) {
      throw new V2CodecError('Truncated metadata block');
    }
    return start;
  }

  bytes(size: number): Buffer {
    const start = this.take(size);
    return this.buffer.subarray(start, this.offset);
  }

  u8(): number {
    return this.buffer.readUInt8(this.take(1));
  }

  u16(): number {
    return this.buffer.readUInt16BE(this.take(2));
  }

  u64(): bigint {
    return this.buffer.readBigUInt64BE(this.take(8));
  }

  id(): string {
    return this.bytes(ID_BYTES).toString('hex');
  }

  digest(): Digest {
    return this.bytes(DIGEST_BYTES).toString('hex');
  }

  ref(): Digest | null {
    const tag = this.u8();
    if (tag === 0) return null;
    if (tag === 1) return this.digest();
    throw new V2CodecError('Invalid reference or record-state tag');
  }

  version(): V2Version {
    const counter = this.u64();
    const writerId = this.id();
    if (counter === 0n || writerId === ZERO_WRITER_ID) {
      throw new V2CodecError(
        'A version requires a positive counter and a nonzero writer ID',
      );
    }
    return { counter, writerId };
  }

  key(): Buffer {
    const length = this.u16();
    if (length < 1 || length > MAX_KEY_BYTES) {
      throw new V2CodecError('A key must occupy 1–1024 UTF-8 bytes');
    }
    return this.bytes(length);
  }

  finish(): void {
    if (this.offset !== this.buffer.length) {
      throw new V2CodecError('Trailing bytes after metadata block');
    }
  }
}

function validateBranch(children: readonly V2BranchChild[]): void {
  if (children.length === 0 || children.length > 16) {
    throw new V2CodecError('A branch must contain 1–16 children');
  }
  let total = 0n;
  let previousNibble = -1;
  for (const { nibble, recordBytes } of children) {
    if (!Number.isInteger(nibble) || nibble <= previousNibble || nibble > 15) {
      throw new V2CodecError('Invalid or duplicate branch nibble');
    }
    previousNibble = nibble;
    if (typeof recordBytes !== 'bigint' || recordBytes <= 0n) {
      throw new V2CodecError('Branch child record bytes must be positive');
    }
    total += recordBytes;
    if (total > MAX_U64) {
      throw new V2CodecError(
        'Branch record byte total exceeds the unsigned 64-bit range',
      );
    }
  }
  if (total <= BigInt(MAX_METADATA_BYTES - LEAF_HEADER_BYTES)) {
    throw new V2CodecError(
      'A branch must collapse when its records fit in a leaf',
    );
  }
}

function encodeLeaf(writer: MetadataWriter, leaf: V2Leaf): void {
  if (leaf.records.length === 0) {
    throw new V2CodecError('A leaf must contain at least one record');
  }
  if (
    LEAF_HEADER_BYTES + leaf.records.length * (RECORD_HEADER_BYTES + 1) >
    MAX_METADATA_BYTES
  ) {
    throw new V2CodecError('Metadata block exceeds 4096 bytes');
  }
  const records = leaf.records
    .map((record) => ({ record, key: encodeKey(record.key) }))
    .sort((left, right) => Buffer.compare(left.key, right.key));
  writer.u16(records.length);
  let previousKey: Buffer | undefined;
  for (const { record, key } of records) {
    if (previousKey?.equals(key)) {
      throw new V2CodecError('Duplicate leaf key');
    }
    previousKey = key;
    writer.u16(key.length);
    writer.bytes(key);
    writer.version(record.version);
    writer.ref(record.target);
  }
}

export function encodeMetadata(block: V2Metadata): Buffer {
  const writer = new MetadataWriter();
  writer.bytes(MAGIC);
  switch (block.kind) {
    case 'database':
      writer.u8(0x01);
      writer.id(block.databaseId);
      writer.u64(block.clock);
      writer.ref(block.catalog);
      break;
    case 'collection':
      writer.u8(0x02);
      writer.version(block.generation);
      writer.ref(block.primary);
      break;
    case 'branch': {
      writer.u8(0x03);
      const children = [...block.children].sort((a, b) => a.nibble - b.nibble);
      validateBranch(children);
      let bitmap = 0;
      for (const { nibble } of children) bitmap |= 1 << nibble;
      writer.u16(bitmap);
      for (const { recordBytes, digest } of children) {
        writer.u64(recordBytes);
        writer.digest(digest);
      }
      break;
    }
    case 'primary':
    case 'catalog':
      writer.u8(block.kind === 'primary' ? 0x04 : 0x05);
      encodeLeaf(writer, block);
      break;
    default:
      throw new V2CodecError('Unknown metadata block kind');
  }
  return writer.finish();
}

function decodeLeaf(reader: MetadataReader, kind: V2Leaf['kind']): V2Leaf {
  const count = reader.u16();
  if (count === 0)
    throw new V2CodecError('A leaf must contain at least one record');
  const records: V2Record[] = [];
  let previousKey: Buffer | undefined;
  for (let index = 0; index < count; index++) {
    const keyBytes = reader.key();
    if (previousKey && Buffer.compare(previousKey, keyBytes) >= 0) {
      throw new V2CodecError('Leaf keys must be unique and in ascending order');
    }
    previousKey = keyBytes;
    records.push({
      key: readUtf8(keyBytes),
      version: reader.version(),
      target: reader.ref(),
    });
  }
  return { kind, records };
}

export function decodeMetadata(
  bytes: Uint8Array,
  expectedDigest?: Digest,
): V2Metadata {
  if (bytes.length > MAX_METADATA_BYTES) {
    throw new V2CodecError('Metadata block exceeds 4096 bytes');
  }
  verifyDigest(bytes, expectedDigest);
  const reader = new MetadataReader(bytes);
  if (!reader.bytes(MAGIC.length).equals(MAGIC)) {
    throw new V2CodecError('Invalid metadata block header');
  }
  const kind = reader.u8();
  let block: V2Metadata;
  switch (kind) {
    case 0x01:
      block = {
        kind: 'database',
        databaseId: reader.id(),
        clock: reader.u64(),
        catalog: reader.ref(),
      };
      break;
    case 0x02:
      block = {
        kind: 'collection',
        generation: reader.version(),
        primary: reader.ref(),
      };
      break;
    case 0x03: {
      const bitmap = reader.u16();
      const children: V2BranchChild[] = [];
      for (let nibble = 0; nibble < 16; nibble++) {
        if ((bitmap & (1 << nibble)) !== 0) {
          children.push({
            nibble,
            recordBytes: reader.u64(),
            digest: reader.digest(),
          });
        }
      }
      validateBranch(children);
      block = { kind: 'branch', children };
      break;
    }
    case 0x04:
    case 0x05:
      block = decodeLeaf(reader, kind === 0x04 ? 'primary' : 'catalog');
      break;
    default:
      throw new V2CodecError('Unknown metadata block kind');
  }
  reader.finish();
  return block;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}

function enumerableDataValue(
  descriptor: PropertyDescriptor | undefined,
): unknown {
  if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
    throw new V2CodecError(
      'Document values must be enumerable data properties',
    );
  }
  return descriptor.value;
}

function propertyValue(object: object, key: string): unknown {
  return enumerableDataValue(Object.getOwnPropertyDescriptor(object, key));
}

function encodeJsonString(value: string): string {
  if (UNPAIRED_SURROGATE.test(value)) {
    throw new V2CodecError('Document strings must be well-formed Unicode');
  }
  return JSON.stringify(value);
}

type JsonTask =
  | { kind: 'value'; value: unknown }
  | { kind: 'text'; text: string }
  | { kind: 'close'; value: object; text: string }
  | { kind: 'root-key' };

function validateDocumentKey(id: unknown, expectedKey?: string): string {
  if (typeof id !== 'string') {
    throw new V2CodecError('A document must have a string _id');
  }
  encodeKey(id);
  if (expectedKey !== undefined && id !== expectedKey) {
    throw new V2CodecError('Document _id does not match its primary key');
  }
  return id;
}

/** Encode a JSON document using ECMAScript primitives and JCS property ordering. */
export function encodeDocument(value: unknown, expectedKey?: string): Buffer {
  if (!isJsonObject(value)) {
    throw new V2CodecError('A document must be a JSON object');
  }
  const key = validateDocumentKey(propertyValue(value, '_id'), expectedKey);
  return encodeDocumentPayload(value, () => key).payload;
}

/** Validate the original object and supply an _id when it has none. */
export function encodeDocumentForWrite(
  value: unknown,
  defaultKey: () => string,
  expectedKey?: string,
): { key: string; payload: Buffer } {
  if (!isJsonObject(value)) {
    throw new V2CodecError('A document must be a JSON object');
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, '_id');
  const supplied = descriptor ? enumerableDataValue(descriptor) : undefined;
  const key =
    supplied === undefined
      ? undefined
      : validateDocumentKey(supplied, expectedKey);
  return encodeDocumentPayload(
    value,
    () => key ?? validateDocumentKey(expectedKey ?? defaultKey()),
  );
}

function encodeDocumentPayload(
  value: Record<string, unknown>,
  resolveKey: () => string,
): { key: string; payload: Buffer } {
  const pieces: string[] = [];
  const openObjects = new Set<object>();
  const tasks: JsonTask[] = [{ kind: 'value', value }];
  let keyPosition = 0;
  let size = 0;
  function count(text: string): void {
    size += Buffer.byteLength(text, 'utf8');
    if (size > MAX_DOCUMENT_BYTES) {
      throw new V2CodecError('Document payload exceeds 1,048,576 bytes');
    }
  }
  function append(text: string): void {
    count(text);
    pieces.push(text);
  }
  while (tasks.length > 0) {
    const task = tasks.pop();
    if (!task) break;
    if (task.kind === 'root-key') {
      keyPosition = pieces.length;
      pieces.push('');
      continue;
    }
    if (task.kind !== 'value') {
      append(task.text);
      if (task.kind === 'close') openObjects.delete(task.value);
      continue;
    }

    const item = task.value;
    if (item === null || typeof item === 'boolean') {
      append(JSON.stringify(item));
    } else if (typeof item === 'string') {
      append(encodeJsonString(item));
    } else if (typeof item === 'number') {
      if (
        !Number.isFinite(item) ||
        (Number.isInteger(item) && !Number.isSafeInteger(item))
      ) {
        throw new V2CodecError(
          'Document number is outside the supported range',
        );
      }
      append(JSON.stringify(item));
    } else if (Array.isArray(item) || isJsonObject(item)) {
      if (openObjects.has(item)) {
        throw new V2CodecError('A document cannot contain a cycle');
      }
      openObjects.add(item);
      if (Array.isArray(item)) {
        append('[');
        if (item.length > MAX_DOCUMENT_BYTES) {
          throw new V2CodecError('Document payload exceeds 1,048,576 bytes');
        }
        tasks.push({ kind: 'close', value: item, text: ']' });
        for (let index = item.length - 1; index >= 0; index--) {
          tasks.push({
            kind: 'value',
            value: propertyValue(item, String(index)),
          });
          if (index > 0) tasks.push({ kind: 'text', text: ',' });
        }
      } else {
        append('{');
        tasks.push({ kind: 'close', value: item, text: '}' });
        // JCS sorts object property names by UTF-16 code units. Tree keys use UTF-8.
        const keys = Object.keys(item);
        if (item === value && !keys.includes('_id')) keys.push('_id');
        keys.sort();
        for (let index = keys.length - 1; index >= 0; index--) {
          const key = keys[index];
          tasks.push(
            item === value && key === '_id'
              ? { kind: 'root-key' }
              : { kind: 'value', value: propertyValue(item, key) },
          );
          tasks.push({ kind: 'text', text: `${encodeJsonString(key)}:` });
          if (index > 0) tasks.push({ kind: 'text', text: ',' });
        }
      }
    } else {
      throw new V2CodecError('A document may contain only JSON values');
    }
  }
  // A generated key is only allocated after the other values have been checked.
  const key = resolveKey();
  const serializedKey = encodeJsonString(key);
  count(serializedKey);
  pieces[keyPosition] = serializedKey;
  return { key, payload: Buffer.from(pieces.join(''), 'utf8') };
}

/** Check source digits before JSON.parse can round an out-of-range integer. */
function validateNumberTokens(text: string): void {
  const token = /-?(0|[1-9][0-9]*)(?:\.([0-9]+))?(?:[eE]([+-]?[0-9]+))?/y;
  const maxInteger = String(Number.MAX_SAFE_INTEGER);
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"') {
      while (++index < text.length && text[index] !== '"') {
        if (text[index] === '\\') index++;
      }
    } else if (char === '-' || (char >= '0' && char <= '9')) {
      token.lastIndex = index;
      const match = token.exec(text);
      if (!match) continue;
      const [, whole, fraction = '', exponent = '0'] = match;
      index = token.lastIndex - 1;
      const digits = (whole + fraction).replace(/^0+/u, '');
      if (digits.length === 0) continue;
      const integerDigits = digits.length - fraction.length + Number(exponent);
      if (
        integerDigits > maxInteger.length ||
        (integerDigits === maxInteger.length &&
          digits.slice(0, maxInteger.length).padEnd(maxInteger.length, '0') >
            maxInteger)
      ) {
        throw new V2CodecError(
          'Document number is outside the supported range',
        );
      }
    }
  }
}

export function decodeDocument(
  bytes: Uint8Array,
  expectedKey?: string,
  expectedDigest?: Digest,
): V2Document {
  if (bytes.length > MAX_DOCUMENT_BYTES) {
    throw new V2CodecError('Document payload exceeds 1,048,576 bytes');
  }
  verifyDigest(bytes, expectedDigest);
  const text = readUtf8(bytes);
  validateNumberTokens(text);
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new V2CodecError('Invalid document JSON');
  }
  if (!encodeDocument(value, expectedKey).equals(bytes)) {
    throw new V2CodecError('Document JSON is not canonical');
  }
  // encodeDocument validates every value and requires a string _id.
  return value as V2Document;
}
