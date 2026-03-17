/**
 * @fileoverview Ledger — append-only blockchain ledger persisted as
 * RawDataBlock instances within any IBlockStore implementation.
 *
 * Each entry is serialized, padded to BlockSize, and stored as a RawDataBlock.
 * A metadata block tracks the chain head, length, ledger ID, and the full
 * sequenceNumber → blockChecksum index for cold-start reconstruction.
 *
 * The metadata block is stored at a deterministic Checksum derived from the
 * ledgerId so that `Ledger.load()` can locate it without external state.
 * Because the metadata content changes on each append while the storage key
 * stays fixed, the metadata block uses a validation-exempt RawDataBlock
 * subclass that allows a caller-specified checksum to differ from the
 * content hash.
 *
 * @see Design: Block Chain Ledger — Ledger
 * @see Requirements 5.1–5.6, 6.1–6.6, 7.1–7.5, 10.1–10.4, 11.2–11.4
 */

import { RawDataBlock } from '../blocks/rawData';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { LedgerError, LedgerErrorType } from '../errors/ledgerError';
import { ILedgerEntry } from '../interfaces/ledger/ledgerEntry';
import { ILedgerSigner } from '../interfaces/ledger/ledgerSigner';
import { IBlockStore } from '../interfaces/storage/blockStore';
import { ChecksumService } from '../services/checksum.service';
import { Checksum } from '../types/checksum';
import { padToBlockSize, unpadCblData } from '../utils/xorUtils';
import { LedgerEntrySerializer } from './ledgerEntrySerializer';

/** Magic bytes identifying a ledger metadata block: "LMET" in ASCII. */
const METADATA_MAGIC = 0x4c4d4554;
/** Current metadata format version. */
const METADATA_VERSION = 0x0001;
/** SHA3-512 hash length in bytes. */
const HASH_LENGTH = 64;

/**
 * A RawDataBlock subclass that skips checksum validation.
 *
 * Used exclusively for the ledger metadata block, which is stored at a
 * deterministic checksum (derived from the ledgerId) that intentionally
 * differs from the SHA3-512 of its content. The MemoryBlockStore calls
 * `block.validate()` during `setData()`; this subclass makes that a no-op
 * so the block can be stored under the deterministic key.
 *
 * @internal
 */
class LedgerMetadataBlock extends RawDataBlock {
  constructor(blockSize: BlockSize, data: Uint8Array, checksum: Checksum) {
    super(
      blockSize,
      data,
      undefined,
      checksum,
      BlockType.RawData,
      BlockDataType.RawData,
      true,
      true,
    );
  }

  public override validateSync(): void {
    // No-op: metadata block uses a deterministic key, not a content hash.
  }

  public override async validateAsync(): Promise<void> {
    // No-op
  }

  public override validate(): void {
    // No-op
  }
}

/**
 * Append-only blockchain ledger backed by an IBlockStore.
 *
 * Maintains an in-memory index (sequenceNumber → block Checksum) for O(1)
 * lookups and persists a metadata block after each append for cold-start
 * reconstruction via `Ledger.load()`.
 */
export class Ledger {
  private readonly index: Map<number, Checksum> = new Map();
  private readonly checksumService: ChecksumService = new ChecksumService();
  private _length = 0;
  private _head: Checksum | null = null;
  private _headEntryHash: Checksum | null = null;

  constructor(
    private readonly store: IBlockStore,
    private readonly blockSize: BlockSize,
    private readonly serializer: LedgerEntrySerializer,
    private readonly ledgerId: string,
  ) {}

  // ── Public getters ────────────────────────────────────────────────

  /** Current chain length. */
  get length(): number {
    return this._length;
  }

  /** Head block Checksum (block storage key), or null if empty. */
  get head(): Checksum | null {
    return this._head;
  }

  // ── Append ────────────────────────────────────────────────────────

  /**
   * Append a new entry to the ledger.
   * Returns the Checksum of the stored block.
   */
  async append(payload: Uint8Array, signer: ILedgerSigner): Promise<Checksum> {
    const sequenceNumber = this._length;
    const previousEntryHash = this._headEntryHash;
    const timestamp = new Date();

    // 1. Compute entryHash
    const partial = {
      sequenceNumber,
      timestamp,
      previousEntryHash,
      signerPublicKey: signer.publicKey,
      payload,
    };
    const entryHash = this.serializer.computeEntryHash(partial);

    // 2. Sign the entryHash
    const signature = signer.sign(entryHash.toUint8Array());

    // 3. Build full entry
    const entry: ILedgerEntry = { ...partial, entryHash, signature };

    // 4. Serialize and pad
    const serialized = this.serializer.serialize(entry);
    const padded = padToBlockSize(serialized, this.blockSize);

    // 5. Create RawDataBlock and store
    const block = new RawDataBlock(
      this.blockSize,
      padded,
      undefined,
      undefined,
      undefined,
      undefined,
      true,
      true,
      this.checksumService,
    );
    const blockChecksum = block.idChecksum;

    // Req 5.5: On BlockStore failure, do not update chain head or index.
    // If setData throws, we propagate the error before updating state.
    await this.store.setData(block);

    // 6. Update in-memory state (only after successful store)
    this.index.set(sequenceNumber, blockChecksum);
    this._length = sequenceNumber + 1;
    this._head = blockChecksum;
    this._headEntryHash = entryHash;

    // 7. Persist metadata block
    try {
      await this.persistMetadata();
    } catch {
      // Metadata persistence failure is non-fatal for the append itself;
      // the entry is already stored.
    }

    return blockChecksum;
  }

  // ── Read operations ───────────────────────────────────────────────

  /**
   * Get entry by sequence number.
   * @throws LedgerError if not found
   */
  async getEntry(sequenceNumber: number): Promise<ILedgerEntry> {
    const blockChecksum = this.index.get(sequenceNumber);
    if (blockChecksum === undefined) {
      throw new LedgerError(
        LedgerErrorType.EntryNotFound,
        `Entry with sequenceNumber ${sequenceNumber} not found`,
      );
    }

    const block = await this.store.getData(blockChecksum);
    const unpadded = unpadCblData(block.data);
    return this.serializer.deserialize(unpadded);
  }

  /**
   * Get entries in range [start, end] inclusive.
   * @throws LedgerError for invalid range
   */
  async getEntries(start: number, end: number): Promise<ILedgerEntry[]> {
    if (start > end) {
      throw new LedgerError(
        LedgerErrorType.InvalidRange,
        `Invalid range: start (${start}) > end (${end})`,
      );
    }
    if (start < 0 || end >= this._length) {
      throw new LedgerError(
        LedgerErrorType.InvalidRange,
        `Range [${start}, ${end}] out of bounds for ledger of length ${this._length}`,
      );
    }

    const entries: ILedgerEntry[] = [];
    for (let i = start; i <= end; i++) {
      entries.push(await this.getEntry(i));
    }
    return entries;
  }

  /**
   * Get the most recent entry, or null if empty.
   */
  async getLatestEntry(): Promise<ILedgerEntry | null> {
    if (this._length === 0) {
      return null;
    }
    return this.getEntry(this._length - 1);
  }

  // ── Metadata persistence ──────────────────────────────────────────

  /**
   * Compute the deterministic storage key for this ledger's metadata block.
   * The key is SHA3-512("ledger-meta:" + ledgerId).
   */
  private computeMetadataKey(): Checksum {
    return this.checksumService.calculateChecksumForString(
      `ledger-meta:${this.ledgerId}`,
    );
  }

  /**
   * Serialize the current metadata into binary.
   *
   * Format:
   *   magic           4 bytes  0x4C4D4554 ("LMET")
   *   version         2 bytes  0x0001
   *   ledgerIdLength  4 bytes  uint32 BE
   *   ledgerId        var      UTF-8
   *   length          4 bytes  uint32 BE
   *   hasHead         1 byte   0x00 or 0x01
   *   headChecksum    0|64     SHA3-512 bytes (block checksum of head)
   *   index entries   var      seqNum (uint32 BE) + blockChecksum (64 bytes)
   */
  private serializeMetadata(): Uint8Array {
    const encoder = new TextEncoder();
    const ledgerIdBytes = encoder.encode(this.ledgerId);
    const headBytes = this._head ? this._head.toUint8Array() : null;

    const indexEntrySize = 4 + HASH_LENGTH;
    const indexSize = this._length * indexEntrySize;

    const size =
      4 +
      2 +
      4 +
      ledgerIdBytes.length +
      4 +
      1 +
      (headBytes ? HASH_LENGTH : 0) +
      indexSize;

    const buf = new Uint8Array(size);
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    let offset = 0;

    view.setUint32(offset, METADATA_MAGIC, false);
    offset += 4;
    view.setUint16(offset, METADATA_VERSION, false);
    offset += 2;
    view.setUint32(offset, ledgerIdBytes.length, false);
    offset += 4;
    buf.set(ledgerIdBytes, offset);
    offset += ledgerIdBytes.length;
    view.setUint32(offset, this._length, false);
    offset += 4;

    if (headBytes) {
      buf[offset] = 0x01;
      offset += 1;
      buf.set(headBytes, offset);
      offset += HASH_LENGTH;
    } else {
      buf[offset] = 0x00;
      offset += 1;
    }

    for (let i = 0; i < this._length; i++) {
      const checksum = this.index.get(i);
      if (checksum) {
        view.setUint32(offset, i, false);
        offset += 4;
        buf.set(checksum.toUint8Array(), offset);
        offset += HASH_LENGTH;
      }
    }

    return buf;
  }

  /**
   * Persist the metadata block to the store under a deterministic key.
   *
   * Uses a LedgerMetadataBlock (validation-exempt RawDataBlock subclass)
   * so the block can be stored at the deterministic checksum derived from
   * the ledgerId, even though the content hash differs.
   */
  private async persistMetadata(): Promise<void> {
    const metadataBytes = this.serializeMetadata();
    const padded = padToBlockSize(metadataBytes, this.blockSize);
    const metadataKey = this.computeMetadataKey();

    // Delete old metadata block first (same key, different content)
    try {
      await this.store.deleteData(metadataKey);
    } catch {
      // May not exist yet — that's fine
    }

    const block = new LedgerMetadataBlock(this.blockSize, padded, metadataKey);
    await this.store.setData(block);
  }

  // ── Static load ───────────────────────────────────────────────────

  /**
   * Load ledger state from the block store.
   *
   * 1. Compute metadata block key from ledgerId
   * 2. Try to retrieve metadata block from store
   * 3. If not found, return empty ledger
   * 4. Parse metadata to get head checksum, length, and index
   * 5. Restore headEntryHash by reading the head entry
   * 6. Return populated ledger
   */
  static async load(
    store: IBlockStore,
    blockSize: BlockSize,
    serializer: LedgerEntrySerializer,
    ledgerId: string,
  ): Promise<Ledger> {
    const ledger = new Ledger(store, blockSize, serializer, ledgerId);
    const metadataKey = ledger.computeMetadataKey();

    const hasMetadata = await store.has(metadataKey);
    if (!hasMetadata) {
      return ledger; // Empty ledger (Req 7.5)
    }

    let metadataBlock: RawDataBlock;
    try {
      metadataBlock = await store.getData(metadataKey);
    } catch {
      return ledger; // Treat as empty if unreadable
    }

    const metadataBytes = unpadCblData(metadataBlock.data);
    const parsed = Ledger.parseMetadata(metadataBytes);

    if (parsed.length === 0 || parsed.headChecksum === null) {
      return ledger;
    }

    // Populate ledger state
    ledger._length = parsed.length;
    ledger._head = parsed.headChecksum;

    for (const [seqNum, blockChecksum] of parsed.index) {
      ledger.index.set(seqNum, blockChecksum);
    }

    // Restore headEntryHash by reading the head entry
    try {
      const headBlock = await store.getData(parsed.headChecksum);
      const unpadded = unpadCblData(headBlock.data);
      const headEntry = serializer.deserialize(unpadded);
      ledger._headEntryHash = headEntry.entryHash;
    } catch {
      // Degraded state — reads still work via index
    }

    return ledger;
  }

  /**
   * Parse a metadata block's binary content.
   */
  private static parseMetadata(data: Uint8Array): {
    ledgerId: string;
    length: number;
    headChecksum: Checksum | null;
    index: Map<number, Checksum>;
  } {
    if (data.length < 11) {
      throw new LedgerError(
        LedgerErrorType.MetadataCorrupted,
        'Metadata block too short',
      );
    }

    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let offset = 0;

    // magic
    const magic = view.getUint32(offset, false);
    offset += 4;
    if (magic !== METADATA_MAGIC) {
      throw new LedgerError(
        LedgerErrorType.MetadataCorrupted,
        `Invalid metadata magic: expected 0x${METADATA_MAGIC.toString(16)}, got 0x${magic.toString(16)}`,
      );
    }

    // version
    const version = view.getUint16(offset, false);
    offset += 2;
    if (version !== METADATA_VERSION) {
      throw new LedgerError(
        LedgerErrorType.MetadataCorrupted,
        `Unsupported metadata version: ${version}`,
      );
    }

    // ledgerIdLength + ledgerId
    if (offset + 4 > data.length) {
      throw new LedgerError(
        LedgerErrorType.MetadataCorrupted,
        'Metadata ledgerIdLength overflows',
      );
    }
    const ledgerIdLength = view.getUint32(offset, false);
    offset += 4;
    if (offset + ledgerIdLength > data.length) {
      throw new LedgerError(
        LedgerErrorType.MetadataCorrupted,
        'Metadata ledgerId overflows',
      );
    }
    const decoder = new TextDecoder();
    const ledgerId = decoder.decode(
      data.slice(offset, offset + ledgerIdLength),
    );
    offset += ledgerIdLength;

    // length
    if (offset + 4 > data.length) {
      throw new LedgerError(
        LedgerErrorType.MetadataCorrupted,
        'Metadata length field overflows',
      );
    }
    const length = view.getUint32(offset, false);
    offset += 4;

    // hasHead
    if (offset + 1 > data.length) {
      throw new LedgerError(
        LedgerErrorType.MetadataCorrupted,
        'Metadata hasHead field overflows',
      );
    }
    const hasHead = data[offset];
    offset += 1;

    let headChecksum: Checksum | null = null;
    if (hasHead === 0x01) {
      if (offset + HASH_LENGTH > data.length) {
        throw new LedgerError(
          LedgerErrorType.MetadataCorrupted,
          'Metadata headChecksum overflows',
        );
      }
      headChecksum = Checksum.fromUint8Array(
        data.slice(offset, offset + HASH_LENGTH),
      );
      offset += HASH_LENGTH;
    }

    // Parse index entries: each is seqNum (4) + checksum (64) = 68 bytes
    const index = new Map<number, Checksum>();
    const indexEntrySize = 4 + HASH_LENGTH;
    while (offset + indexEntrySize <= data.length) {
      const seqNum = view.getUint32(offset, false);
      offset += 4;
      const blockChecksum = Checksum.fromUint8Array(
        data.slice(offset, offset + HASH_LENGTH),
      );
      offset += HASH_LENGTH;
      index.set(seqNum, blockChecksum);
    }

    return { ledgerId, length, headChecksum, index };
  }
}
