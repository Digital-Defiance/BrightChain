/**
 * Attachments (spec section 8): files stored as 1 MiB chunk blocks plus a blob
 * manifest, referenced from documents through the reserved `_files` property.
 */
import {
  BLOB_CHUNK_BYTES,
  decodeMetadata,
  digestPayload,
  encodeMetadata,
  MAX_BLOB_CHUNKS,
  type Digest,
} from './codec';
import type { BrightDbV2DiskStore, BrightDbV2DiskWriter } from './disk-store';

export const MAX_ATTACHMENT_BYTES = BLOB_CHUNK_BYTES * MAX_BLOB_CHUNKS;
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

/** Write a file's chunks and manifest. The blocks are durable but unreachable until a document references them. */
export async function writeAttachment(
  writer: BrightDbV2DiskWriter,
  bytes: Uint8Array,
  type?: string,
): Promise<AttachmentRef> {
  if (bytes.length > MAX_ATTACHMENT_BYTES) {
    throw new V2AttachmentError(
      `An attachment can be at most ${MAX_ATTACHMENT_BYTES} bytes`,
    );
  }
  if (type !== undefined && Buffer.byteLength(type, 'utf8') > 255) {
    throw new V2AttachmentError('An attachment type can be at most 255 bytes');
  }
  const chunks: Digest[] = [];
  for (let offset = 0; offset < bytes.length; offset += BLOB_CHUNK_BYTES) {
    const chunk = bytes.subarray(offset, offset + BLOB_CHUNK_BYTES);
    chunks.push(await writer.writeBlock(chunk));
  }
  const digest = await writer.writeBlock(
    encodeMetadata({ kind: 'blob', size: BigInt(bytes.length), chunks }),
  );
  await writer.syncBlocks();
  return { digest, size: bytes.length, ...(type === undefined ? {} : { type }) };
}

async function readManifest(store: BrightDbV2DiskStore, digest: string) {
  if (!DIGEST.test(digest)) throw new V2AttachmentError('Invalid attachment digest');
  const block = decodeMetadata(await store.readBlock(digest), digest);
  if (block.kind !== 'blob') {
    throw new V2AttachmentError('Digest does not identify an attachment manifest');
  }
  return block;
}

/** Stream a file's chunks in order, verifying every digest. */
export async function* streamAttachment(
  store: BrightDbV2DiskStore,
  digest: string,
): AsyncGenerator<Buffer> {
  const manifest = await readManifest(store, digest);
  let remaining = manifest.size;
  for (const chunk of manifest.chunks) {
    const bytes = Buffer.from(await store.readBlock(chunk));
    const expected =
      remaining < BigInt(BLOB_CHUNK_BYTES) ? Number(remaining) : BLOB_CHUNK_BYTES;
    if (bytes.length !== expected) {
      throw new V2AttachmentError('Attachment chunk has the wrong length');
    }
    remaining -= BigInt(bytes.length);
    yield bytes;
  }
}

export async function readAttachment(
  store: BrightDbV2DiskStore,
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
  store: BrightDbV2DiskStore,
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
    if (manifest.size !== BigInt(size as number)) {
      throw new V2AttachmentError(`_files.${name}.size does not match its attachment`);
    }
    for (const chunk of manifest.chunks) {
      if (!(await store.hasBlock(chunk))) {
        throw new V2AttachmentError(`_files.${name} is missing a chunk`);
      }
    }
  }
}

export { digestPayload as attachmentDigest };
