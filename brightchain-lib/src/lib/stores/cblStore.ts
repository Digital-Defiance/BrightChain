import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import { ConstituentBlockListBlock } from '../blocks/cbl';
import { EncryptedBlock } from '../blocks/encrypted';
import { MultiEncryptedBlock } from '../blocks/multiEncrypted';
import { BrightChainMember } from '../brightChainMember';
import { EncryptedBlockMetadata } from '../encryptedBlockMetadata';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { CblErrorType } from '../enumerations/cblErrorType';
import { StoreErrorType } from '../enumerations/storeErrorType';
import { TranslatableEnumType } from '../enumerations/translatableEnum';
import { CblError } from '../errors/cblError';
import { StoreError } from '../errors/storeError';
import { GuidV4 } from '../guid';
import { translateEnum } from '../i18n';
import { ISimpleStoreAsync } from '../interfaces/simpleStoreAsync';
import { BlockService } from '../services/blockService';
import { CBLService } from '../services/cblService';
import { ChecksumService } from '../services/checksum.service';
import { ServiceLocator } from '../services/serviceLocator';
import { ChecksumBuffer } from '../types';

/**
 * CBLStore provides storage for Constituent Block Lists (CBLs).
 * It maintains an index of CBL addresses and their associated block tuples.
 * Supports both encrypted and plain CBLs.
 */
export class CBLStore
  implements ISimpleStoreAsync<ChecksumBuffer, ConstituentBlockListBlock>
{
  private readonly _storePath: string;
  private readonly _cblPath: string;
  private readonly _indexPath: string;
  private readonly _blockSize: BlockSize;
  private readonly _blockService: BlockService;
  private readonly _cblService: CBLService;
  private readonly _checksumService: ChecksumService;
  private _activeUser?: BrightChainMember;

  public setActiveUser(user: BrightChainMember) {
    this._activeUser = user;
  }

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
      }).toLowerCase(),
    );
    this._indexPath = join(this._cblPath, 'index');

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

    this._blockService = ServiceLocator.getServiceProvider().blockService;
    this._cblService = ServiceLocator.getServiceProvider().cblService;
    this._checksumService = ServiceLocator.getServiceProvider().checksumService;
  }

  /**
   * Check if the data is encrypted
   * @param data The data to check
   * @returns True if the data is encrypted, false otherwise
   */
  public isEncrypted(data: Buffer): boolean {
    return (
      BlockService.isSingleRecipientEncrypted(data) ||
      BlockService.isMultiRecipientEncrypted(data)
    );
  }

  /**
   * Store a CBL block
   */
  public async set(
    key: ChecksumBuffer,
    value: ConstituentBlockListBlock | EncryptedBlock | MultiEncryptedBlock,
  ): Promise<void> {
    const userForvalidation = value.creator ?? this._activeUser;
    if (userForvalidation === undefined) {
      throw new CblError(CblErrorType.CreatorRequiredForSignature);
    }

    if (!key.equals(value.idChecksum)) {
      throw new StoreError(StoreErrorType.BlockIdMismatch);
    }

    const blockPath = this.getBlockPath(value.idChecksum);
    if (existsSync(blockPath)) {
      throw new StoreError(StoreErrorType.BlockPathAlreadyExists);
    }

    // For encrypted blocks, we can't validate the signature directly
    // We'll validate after decryption during the get operation
    if (
      value instanceof EncryptedBlock ||
      value instanceof MultiEncryptedBlock
    ) {
      // Store the encrypted block directly
      this.ensureBlockPath(value.idChecksum);
      writeFileSync(blockPath, value.data);
      return;
    }

    // For unencrypted blocks, validate signature before writing
    this._cblService.validateSignature(value.data, userForvalidation);

    // Store the CBL block directly
    this.ensureBlockPath(value.idChecksum);
    writeFileSync(blockPath, value.data);
  }

  /**
   * Get a CBL by its checksum
   */
  public async get(
    checksum: ChecksumBuffer,
    hydrateGuid: (guid: GuidV4) => Promise<BrightChainMember>,
  ): Promise<ConstituentBlockListBlock> {
    const blockPath = this.getBlockPath(checksum);
    if (!existsSync(blockPath)) {
      throw new StoreError(StoreErrorType.KeyNotFound);
    }

    // Read the CBL block directly
    const cblData = readFileSync(blockPath);

    // Check if the data is encrypted
    if (this._cblService.isEncrypted(cblData)) {
      // Must decrypt block using creator key before we can do anything
      if (this._activeUser === undefined) {
        throw new CblError(CblErrorType.UserRequiredForDecryption);
      }

      const fileStat = statSync(blockPath);
      const dateCreated = fileStat.mtime;

      // Check if it's multi-encrypted
      if (BlockService.isMultiRecipientEncrypted(cblData)) {
        // Handle multi-encrypted CBL
        const multiEncryptedCbl = new MultiEncryptedBlock(
          BlockType.MultiEncryptedConstituentBlockListBlock,
          BlockDataType.EncryptedData,
          cblData,
          checksum,
          new EncryptedBlockMetadata(
            this._blockSize,
            BlockType.MultiEncryptedConstituentBlockListBlock,
            BlockDataType.EncryptedData,
            cblData.length,
            this._activeUser,
            dateCreated,
          ),
          true,
          true,
          new Map([[this._activeUser.id, this._activeUser]]),
        );

        const decryptedCbl = new ConstituentBlockListBlock(
          (
            await BlockService.decryptMultiple(
              this._activeUser,
              multiEncryptedCbl,
            )
          ).data,
          this._activeUser,
        );

        if (!decryptedCbl.validateSignature()) {
          throw new CblError(CblErrorType.InvalidSignature);
        }

        return Promise.resolve(decryptedCbl);
      } else {
        // Handle single-recipient encrypted CBL
        const encryptedCbl = new EncryptedBlock(
          BlockType.EncryptedConstituentBlockListBlock,
          BlockDataType.EncryptedData,
          cblData,
          checksum,
          new EncryptedBlockMetadata(
            this._blockSize,
            BlockType.EncryptedConstituentBlockListBlock,
            BlockDataType.EncryptedData,
            cblData.length,
            this._activeUser,
            dateCreated,
          ),
          true,
        );

        const decryptedCbl = new ConstituentBlockListBlock(
          (await BlockService.decrypt(this._activeUser, encryptedCbl)).data,
          this._activeUser,
        );

        if (!decryptedCbl.validateSignature()) {
          throw new CblError(CblErrorType.InvalidSignature);
        }

        return Promise.resolve(decryptedCbl);
      }
    }

    // Handle unencrypted CBL
    const cblInfo = this._cblService.parseHeader(cblData);

    // Hydrate the creator
    const creator =
      this._activeUser && this._activeUser.id.equals(cblInfo.creatorId)
        ? this._activeUser
        : await hydrateGuid(cblInfo.creatorId);

    // Create the appropriate CBL type
    const cbl = new ConstituentBlockListBlock(cblData, creator);
    if (!cbl.validateSignature()) {
      throw new CblError(CblErrorType.InvalidSignature);
    }
    return Promise.resolve(cbl);
  }

  /**
   * Check if a CBL exists
   */
  public has(checksum: ChecksumBuffer): boolean {
    const blockPath = this.getBlockPath(checksum);
    return existsSync(blockPath);
  }

  /**
   * Get the addresses for a CBL
   */
  public async getCBLAddresses(
    checksum: ChecksumBuffer,
    hydrateFunction: (guid: GuidV4) => Promise<BrightChainMember>,
  ): Promise<ChecksumBuffer[]> {
    const blockPath = this.getBlockPath(checksum);
    if (!existsSync(blockPath)) {
      throw new StoreError(StoreErrorType.KeyNotFound);
    }
    if (!this.has(checksum)) {
      throw new StoreError(StoreErrorType.KeyNotFound);
    }
    const cbl = await this.get(checksum, hydrateFunction);

    return cbl.addresses;
  }

  /**
   * Get path for CBL data file
   */
  private getBlockPath(checksum: ChecksumBuffer): string {
    const checksumHex = checksum.toString('hex');
    const firstDir = checksumHex.substring(0, 2);
    const secondDir = checksumHex.substring(2, 4);
    return join(
      this._storePath,
      translateEnum({
        type: TranslatableEnumType.BlockSize,
        value: this._blockSize,
      }),
      firstDir,
      secondDir,
      checksumHex,
    );
  }

  /**
   * Ensure the block path exists
   */
  private ensureBlockPath(checksum: ChecksumBuffer): void {
    const checksumHex = checksum.toString('hex');
    const firstDir = checksumHex.substring(0, 2);
    const secondDir = checksumHex.substring(2, 4);
    const blockDir = join(
      this._storePath,
      translateEnum({
        type: TranslatableEnumType.BlockSize,
        value: this._blockSize,
      }),
      firstDir,
      secondDir,
    );
    mkdirSync(blockDir, { recursive: true });
  }
}
