import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ConstituentBlockListBlock } from '../blocks/cbl';
import { EncryptedConstituentBlockListBlock } from '../blocks/encryptedCbl';
import { RawDataBlock } from '../blocks/rawData';
import { CblBlockMetadata } from '../cblBlockMetadata';
import { TUPLE } from '../constants';
import { EncryptedBlockMetadata } from '../encryptedBlockMetadata';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { StoreErrorType } from '../enumerations/storeErrorType';
import { TranslatableEnumType } from '../enumerations/translatableEnum';
import { StoreError } from '../errors/storeError';
import { GuidV4 } from '../guid';
import { translateEnum } from '../i18n';
import { ICBLIndexEntry } from '../interfaces/cblIndexEntry';
import { ISimpleStoreAsync } from '../interfaces/simpleStoreAsync';
import { BlockService } from '../services/blockService';
import { ServiceProvider } from '../services/service.provider';
import { ChecksumBuffer, RawGuidBuffer } from '../types';
import { DiskBlockAsyncStore } from './diskBlockAsyncStore';

/**
 * CBLStore provides storage for Constituent Block Lists (CBLs).
 * It maintains an index of CBL addresses and their associated block tuples.
 * Supports both encrypted and plain CBLs.
 */
export class CBLStore
  implements
    ISimpleStoreAsync<
      ChecksumBuffer,
      ConstituentBlockListBlock | EncryptedConstituentBlockListBlock
    >
{
  private readonly _storePath: string;
  private readonly _cblPath: string;
  private readonly _indexPath: string;
  private readonly _blockStore: DiskBlockAsyncStore;
  private readonly _blockSize: BlockSize;
  private readonly checksumService = ServiceProvider.getChecksumService();

  constructor(config: { storePath: string; blockSize: BlockSize }) {
    if (!config.storePath) {
      throw new StoreError(StoreErrorType.StorePathRequired);
    }
    if (!config.blockSize) {
      throw new StoreError(StoreErrorType.BlockSizeRequired);
    }

    this._blockSize = config.blockSize;
    this._storePath = config.storePath;
    this._cblPath = join(
      this._storePath,
      translateEnum({
        type: TranslatableEnumType.BlockSize,
        value: this._blockSize,
      }),
    );
    this._indexPath = join(
      config.storePath,
      translateEnum({
        type: TranslatableEnumType.BlockSize,
        value: config.blockSize,
      }),
      'index',
    );
    this._blockStore = new DiskBlockAsyncStore(config);
    BlockService.initialize(this._blockStore);

    // Ensure store directories exist
    if (!existsSync(config.storePath)) {
      throw new StoreError(StoreErrorType.StorePathNotFound);
    }

    // Create index directory if it doesn't exist
    if (!existsSync(this._indexPath)) {
      mkdirSync(this._indexPath, { recursive: true });
    }

    // create cbl directory if it doesn't exist
    if (!existsSync(this._cblPath)) {
      mkdirSync(this._cblPath, { recursive: true });
    }
  }

  /**
   * Store a CBL and its block tuple addresses
   */
  public async set(
    key: ChecksumBuffer,
    value: ConstituentBlockListBlock | EncryptedConstituentBlockListBlock,
  ): Promise<void> {
    if (!key.equals(value.idChecksum)) {
      throw new StoreError(StoreErrorType.BlockIdMismatch);
    }
    const now = new Date();
    const cblPath = this.getCBLPath(value.idChecksum);
    const indexPath = this.getIndexPath(value.idChecksum);
    if (existsSync(cblPath) || existsSync(indexPath)) {
      throw new StoreError(StoreErrorType.BlockPathAlreadyExists);
    }

    // Generate whiteners for OFFS
    const whiteners = await BlockService.gatherWhiteners(
      value.blockSize,
      TUPLE.SIZE - 1, // One less than tuple size since we have the main block
    );

    const resultBuffer = BlockService.xorBlockWithWhiteners(
      value.data,
      whiteners,
    );
    const resultBlock = new RawDataBlock(
      value.blockSize,
      resultBuffer,
      now,
      this.checksumService.calculateChecksum(resultBuffer),
      BlockType.RawData,
      BlockDataType.RawData,
      true, // canRead
      true, // canPersist
    );

    // Store main block
    if (!(await this._blockStore.has(resultBlock.idChecksum))) {
      await this._blockStore.setData(resultBlock);
    }
    // Store whitener blocks and collect all addresses
    const blockAddresses: ChecksumBuffer[] = [resultBlock.idChecksum];
    for (const whitener of whiteners) {
      if (!(await this._blockStore.has(whitener.idChecksum))) {
        await this._blockStore.setData(whitener);
      }
      blockAddresses.push(whitener.idChecksum);
    }

    // Store index entry
    const indexEntry: ICBLIndexEntry = {
      encrypted: value instanceof EncryptedConstituentBlockListBlock,
      blockType: value.blockType,
      dataType: value.blockDataType,
      addresses: blockAddresses.map((address: ChecksumBuffer) =>
        address.toString('hex'),
      ),
      dateCreated: value.dateCreated.toISOString(),
      creatorId:
        value.creatorId?.asRawGuidBuffer.toString('base64') ??
        GuidV4.new().asRawGuidBuffer.toString('base64'),
      fileDataLength:
        value instanceof ConstituentBlockListBlock
          ? (value.metadata as CblBlockMetadata).fileDataLength.toString()
          : undefined,
      blockDataLength: value.lengthBeforeEncryption,
    };

    writeFileSync(indexPath, JSON.stringify(indexEntry, null, 2));
  }

  /**
   * Get a CBL by its checksum
   */
  public async get(
    checksum: ChecksumBuffer,
  ): Promise<ConstituentBlockListBlock | EncryptedConstituentBlockListBlock> {
    const indexPath = this.getIndexPath(checksum);
    if (!existsSync(indexPath)) {
      throw new StoreError(StoreErrorType.KeyNotFound);
    }

    // Read index entry
    const indexEntry: ICBLIndexEntry = JSON.parse(
      readFileSync(indexPath, 'utf8'),
    ) as ICBLIndexEntry;
    const addresses = indexEntry.addresses.map(
      (address: string) => Buffer.from(address, 'hex') as ChecksumBuffer,
    );

    // Read all blocks
    const blocks = await Promise.all(
      addresses.map((address) => this._blockStore.get(address)),
    );

    // First block is the XORed result, rest are whiteners
    // To recover original data, XOR the stored result with all whiteners again
    // since XOR is its own inverse when applied twice
    const xorData = Buffer.from(blocks[0].fullData);
    for (let i = 1; i < blocks.length; i++) {
      const whitener = blocks[i].fullData;
      for (let j = 0; j < xorData.length; j++) {
        xorData[j] ^= whitener[j];
      }
    }
    if (!xorData) {
      throw new StoreError(StoreErrorType.KeyNotFound);
    }
    const resultChecksum = this.checksumService.calculateChecksum(xorData);
    if (!resultChecksum.equals(checksum)) {
      throw new StoreError(StoreErrorType.BlockIdMismatch);
    }
    return indexEntry.encrypted
      ? new EncryptedConstituentBlockListBlock(
          indexEntry.blockType,
          indexEntry.dataType,
          xorData,
          checksum,
          new EncryptedBlockMetadata(
            this._blockSize,
            indexEntry.blockType,
            indexEntry.dataType,
            indexEntry.blockDataLength,
            new GuidV4(
              Buffer.from(indexEntry.creatorId, 'base64') as RawGuidBuffer,
            ),
            new Date(indexEntry.dateCreated),
          ),
          ServiceProvider.getECIESService(),
          true,
        )
      : new ConstituentBlockListBlock(
          xorData,
          new GuidV4(
            Buffer.from(indexEntry.creatorId, 'base64') as RawGuidBuffer,
          ),
        );
  }

  /**
   * Check if a CBL exists
   */
  public has(checksum: ChecksumBuffer): boolean {
    const indexPath = this.getIndexPath(checksum);
    return existsSync(indexPath);
  }

  /**
   * Get the addresses for a CBL
   */
  public getCBLAddresses(checksum: ChecksumBuffer): ChecksumBuffer[] {
    const indexPath = this.getIndexPath(checksum);
    if (!existsSync(indexPath)) {
      throw new StoreError(StoreErrorType.KeyNotFound);
    }

    const indexEntry = JSON.parse(readFileSync(indexPath, 'utf8'));
    return indexEntry.addresses.map(
      (address: string) => Buffer.from(address, 'hex') as ChecksumBuffer,
    );
  }

  /**
   * Get path for CBL data file
   */
  private getCBLPath(checksum: ChecksumBuffer): string {
    return join(this._cblPath, checksum.toString('hex'));
  }

  /**
   * Get path for CBL index entry
   */
  private getIndexPath(checksum: ChecksumBuffer): string {
    return join(this._indexPath, `${checksum.toString('hex')}.json`);
  }
}
