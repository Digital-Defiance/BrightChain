/**
 * Pack files for the BrightDB v2 disk profile (optional "packed" extension).
 *
 * A pack holds many stored blocks in one file so a commit costs one fsync
 * instead of one per block. An entry is keyed by the block's on-disk file name
 * (the digest, or the keyed name when encrypted) and holds exactly the bytes
 * that a loose block file with that name would hold, so a block means the same
 * thing wherever it lives and every read still verifies the digest.
 *
 * Layout (all integers big-endian):
 *   "BrightDB pack 1\n"                       16 bytes
 *   entry bytes, concatenated
 *   index: per entry  name(64 raw) offset(u64) length(u32)   76 bytes each
 *   trailer: count(u32) indexOffset(u64) "BDBPEND\n"          20 bytes
 */
import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { BrightDbV2StorageError } from './storage';

export const PACK_HEADER = Buffer.from('BrightDB pack 1\n', 'latin1');
export const PACKS_MARKER = 'BrightDB packs 1\n';
const PACK_END = Buffer.from('BDBPEND\n', 'latin1');
const NAME_BYTES = 64;
const INDEX_ENTRY_BYTES = NAME_BYTES + 8 + 4;
const TRAILER_BYTES = 4 + 8 + PACK_END.length;

export interface PackEntryLocation {
  offset: number;
  length: number;
}

export interface PackIndex {
  entries: Map<string, PackEntryLocation>;
  bytes: number;
}

/** Serialize entries into a pack. Returns the file bytes. */
export function encodePack(entries: ReadonlyArray<{ name: string; bytes: Uint8Array }>): Buffer {
  const parts: Buffer[] = [PACK_HEADER];
  const index: Buffer[] = [];
  let offset = PACK_HEADER.length;
  for (const { name, bytes } of entries) {
    if (!/^[0-9a-f]{128}$/u.test(name)) throw new BrightDbV2StorageError('Invalid block name for a pack');
    const body = Buffer.from(bytes);
    const row = Buffer.alloc(INDEX_ENTRY_BYTES);
    Buffer.from(name, 'hex').copy(row, 0);
    row.writeBigUInt64BE(BigInt(offset), NAME_BYTES);
    row.writeUInt32BE(body.length, NAME_BYTES + 8);
    index.push(row);
    parts.push(body);
    offset += body.length;
  }
  const trailer = Buffer.alloc(TRAILER_BYTES);
  trailer.writeUInt32BE(entries.length, 0);
  trailer.writeBigUInt64BE(BigInt(offset), 4);
  PACK_END.copy(trailer, 12);
  return Buffer.concat([...parts, ...index, trailer]);
}

/** Read and validate a pack's index without reading its entries. */
export async function readPackIndex(path: string): Promise<PackIndex> {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await file.stat();
    const bad = (why: string) => new BrightDbV2StorageError(`Invalid BrightDB v2 pack ${path}: ${why}`);
    if (!stat.isFile() || stat.size < PACK_HEADER.length + TRAILER_BYTES) throw bad('too small');
    const header = Buffer.alloc(PACK_HEADER.length);
    await file.read(header, 0, header.length, 0);
    if (!header.equals(PACK_HEADER)) throw bad('bad header');
    const trailer = Buffer.alloc(TRAILER_BYTES);
    await file.read(trailer, 0, TRAILER_BYTES, stat.size - TRAILER_BYTES);
    if (!trailer.subarray(12).equals(PACK_END)) throw bad('bad trailer (incomplete write?)');
    const count = trailer.readUInt32BE(0);
    const indexOffset = Number(trailer.readBigUInt64BE(4));
    if (indexOffset < PACK_HEADER.length || indexOffset + count * INDEX_ENTRY_BYTES + TRAILER_BYTES !== stat.size) {
      throw bad('index does not fit the file');
    }
    const raw = Buffer.alloc(count * INDEX_ENTRY_BYTES);
    if (count > 0) await file.read(raw, 0, raw.length, indexOffset);
    const entries = new Map<string, PackEntryLocation>();
    for (let i = 0; i < count; i++) {
      const row = raw.subarray(i * INDEX_ENTRY_BYTES, (i + 1) * INDEX_ENTRY_BYTES);
      const name = row.subarray(0, NAME_BYTES).toString('hex');
      const offset = Number(row.readBigUInt64BE(NAME_BYTES));
      const length = row.readUInt32BE(NAME_BYTES + 8);
      if (offset < PACK_HEADER.length || length < 1 || offset + length > indexOffset) throw bad('entry out of range');
      entries.set(name, { offset, length });
    }
    return { entries, bytes: stat.size };
  } finally {
    await file.close();
  }
}

/** Read one entry's stored bytes. */
export async function readPackEntry(path: string, location: PackEntryLocation, maximum: number): Promise<Buffer> {
  if (location.length > maximum) throw new BrightDbV2StorageError(`Invalid BrightDB v2 pack entry in ${path}`);
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const out = Buffer.alloc(location.length);
    const { bytesRead } = await file.read(out, 0, location.length, location.offset);
    if (bytesRead !== location.length) throw new BrightDbV2StorageError(`Short read in BrightDB v2 pack ${path}`);
    return out;
  } finally {
    await file.close();
  }
}
