/**
 * Attachments (spec section 8): files stored as 1 MiB chunk blocks plus a blob
 * manifest, referenced from documents through the reserved `_files` property.
 */
import {
  blobChildSpan,
  BLOB_CHUNK_BYTES,
  decodeMetadata,
  digestPayload,
  encodeMetadata,
  MAX_BLOB_CHUNKS,
  type Digest,
} from './codec';
import type { BrightDbV2DiskWriter, BrightDbV2Storage } from './storage';

const DIGEST = /^[0-9a-f]{128}$/u;

/** A stored file. Put it under `_files` in a document to attach it. */
export interface AttachmentRef {
  /** Digest of the blob manifest. */
  digest: string;
  size: number;
  type?: string;
}

export class V2AttachmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'V2AttachmentError';
  }
}

/** Re-cut an input into chunks of exactly BLOB_CHUNK_BYTES, except the last. */
async function* chunked(input: Uint8Array | AsyncIterable<Uint8Array>): AsyncGenerator<Uint8Array> {
  if (input instanceof Uint8Array) {
    for (let offset = 0; offset < input.length; offset += BLOB_CHUNK_BYTES) {
      yield input.subarray(offset, offset + BLOB_CHUNK_BYTES);
    }
    return;
  }
  let pending: Buffer[] = [];
  let length = 0;
  for await (const part of input) {
    pending.push(Buffer.from(part));
    length += part.length;
    while (length >= BLOB_CHUNK_BYTES) {
      const joined = Buffer.concat(pending);
      yield joined.subarray(0, BLOB_CHUNK_BYTES);
      const rest = joined.subarray(BLOB_CHUNK_BYTES);
      pending = rest.length > 0 ? [Buffer.from(rest)] : [];
      length = rest.length;
    }
  }
  if (length > 0) yield Buffer.concat(pending);
}

/**
 * Write a file of any size as 1 MiB chunks under a tree of manifests (like a
 * super block list), and return its reference. The blocks are durable but
 * unreachable until a document references them. A stream is written as it is
 * read, so the file never has to fit in memory.
 */
export async function writeAttachment(
  writer: BrightDbV2DiskWriter,
  input: Uint8Array | AsyncIterable<Uint8Array>,
  type?: string,
): Promise<AttachmentRef> {
  if (type !== undefined && Buffer.byteLength(type, 'utf8') > 255) {
    throw new V2AttachmentError('An attachment type can be at most 255 bytes');
  }
  let level: Array<{ digest: Digest; size: bigint }> = [];
  for await (const chunk of chunked(input)) {
    level.push({ digest: await writer.writeBlock(chunk), size: BigInt(chunk.length) });
  }
  const total = level.reduce((sum, entry) => sum + entry.size, 0n);
  let depth = 0;
  while (level.length > MAX_BLOB_CHUNKS) {
    const next: typeof level = [];
    for (let start = 0; start < level.length; start += MAX_BLOB_CHUNKS) {
      const run = level.slice(start, start + MAX_BLOB_CHUNKS);
      const size = run.reduce((sum, entry) => sum + entry.size, 0n);
      const digest = await writer.writeBlock(
        encodeMetadata({ kind: 'blob', size, depth, entries: run.map((e) => e.digest) }),
      );
      next.push({ digest, size });
    }
    level = next;
    depth++;
  }
  const digest = await writer.writeBlock(
    encodeMetadata({ kind: 'blob', size: total, depth, entries: level.map((e) => e.digest) }),
  );
  await writer.syncBlocks();
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new V2AttachmentError('An attachment can be at most 2^53 - 1 bytes');
  }
  return { digest, size: Number(total), ...(type === undefined ? {} : { type }) };
}

async function readManifest(store: BrightDbV2Storage, digest: string) {
  if (!DIGEST.test(digest)) throw new V2AttachmentError('Invalid attachment digest');
  const block = decodeMetadata(await store.readBlock(digest), digest);
  if (block.kind !== 'blob') {
    throw new V2AttachmentError('Digest does not identify an attachment manifest');
  }
  return block;
}

/** A file's root must be as shallow as possible. Interior manifests may hold a small tail. */
function checkRoot(manifest: { depth: number; size: bigint }): void {
  if (manifest.depth > 0 && manifest.size <= blobChildSpan(manifest.depth)) {
    throw new V2AttachmentError('Attachment root manifest is deeper than its size needs');
  }
}

/** Every chunk of a file, in order, with the length it must have. Checks manifest sizes on the way. */
async function* blobChunks(
  store: BrightDbV2Storage,
  digest: string,
  expectedSize?: bigint,
): AsyncGenerator<{ digest: string; length: number }> {
  const manifest = await readManifest(store, digest);
  if (expectedSize !== undefined && manifest.size !== expectedSize) {
    throw new V2AttachmentError('Attachment manifest has the wrong size');
  }
  if (expectedSize === undefined) checkRoot(manifest);
  const span = blobChildSpan(manifest.depth);
  let remaining = manifest.size;
  for (const entry of manifest.entries) {
    const size = remaining < span ? remaining : span;
    if (manifest.depth === 0) yield { digest: entry, length: Number(size) };
    else yield* blobChunks(store, entry, size);
    remaining -= size;
  }
}

/** Stream a file's chunks in order, verifying every digest and length. */
export async function* streamAttachment(
  store: BrightDbV2Storage,
  digest: string,
): AsyncGenerator<Buffer> {
  for await (const chunk of blobChunks(store, digest)) {
    const bytes = Buffer.from(await store.readBlock(chunk.digest));
    if (bytes.length !== chunk.length) {
      throw new V2AttachmentError('Attachment chunk has the wrong length');
    }
    yield bytes;
  }
}

export async function readAttachment(
  store: BrightDbV2Storage,
  digest: string,
): Promise<Buffer> {
  const parts: Buffer[] = [];
  for await (const part of streamAttachment(store, digest)) parts.push(part);
  return Buffer.concat(parts);
}

/**
 * Check a document's `_files` before it is written: the property must be an
 * object of well-formed references whose manifests and chunks already exist.
 */
export async function validateFileReferences(
  store: BrightDbV2Storage,
  document: unknown,
): Promise<void> {
  if (document === null || typeof document !== 'object') return;
  if (!Object.prototype.hasOwnProperty.call(document, '_files')) return;
  const files = (document as Record<string, unknown>)['_files'];
  if (files === null || typeof files !== 'object' || Array.isArray(files)) {
    throw new V2AttachmentError('_files must be an object');
  }
  for (const [name, entry] of Object.entries(files)) {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new V2AttachmentError(`_files.${name} must be an object`);
    }
    const { digest, size, type, ...extra } = entry as Record<string, unknown>;
    if (Object.keys(extra).length > 0) {
      throw new V2AttachmentError(`_files.${name} has unknown properties`);
    }
    if (typeof digest !== 'string' || !DIGEST.test(digest)) {
      throw new V2AttachmentError(`_files.${name}.digest must be a manifest digest`);
    }
    if (!Number.isSafeInteger(size) || (size as number) < 0) {
      throw new V2AttachmentError(`_files.${name}.size must be a non-negative integer`);
    }
    if (type !== undefined && (typeof type !== 'string' || Buffer.byteLength(type, 'utf8') > 255)) {
      throw new V2AttachmentError(`_files.${name}.type must be a string of up to 255 bytes`);
    }
    if (!(await store.hasBlock(digest))) {
      throw new V2AttachmentError(`_files.${name} references a missing attachment`);
    }
    const manifest = await readManifest(store, digest);
    checkRoot(manifest);
    if (manifest.size !== BigInt(size as number)) {
      throw new V2AttachmentError(`_files.${name}.size does not match its attachment`);
    }
    for await (const chunk of blobChunks(store, digest, manifest.size)) {
      if (!(await store.hasBlock(chunk.digest))) {
        throw new V2AttachmentError(`_files.${name} is missing a chunk`);
      }
    }
  }
}

export { digestPayload as attachmentDigest };
