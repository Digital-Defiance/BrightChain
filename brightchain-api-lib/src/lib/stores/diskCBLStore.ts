import {
  BlockDataType,
  BlockEncryptionType,
  BlockService,
  BlockSize,
  BlockType,
  CblError,
  CblErrorType,
  CBLService,
  Checksum,
  ChecksumService,
  ConstituentBlockListBlock,
  EncryptedBlock,
  EncryptedBlockMetadata,
  getGlobalServiceProvider,
  ICBLStore,
  StoreError,
  StoreErrorType,
} from '@brightchain/brightchain-lib';
import { arraysEqual, Member, PlatformID } from '@digitaldefiance/ecies-lib';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';

/**
 * Disk-based CBL store implementation.
 * Stores Constituent Block Lists (CBLs) on the filesystem.
 * Maintains an index of CBL addresses and their associated block tuples.
 * Supports both encrypted and plain CBLs.
 */
export class DiskCBLStore<
  TID extends PlatformID = Uint8Array,
> implements ICBLStore<TID> {
  private readonly _storePath: string;
  private readonly _cblPath: string;
  private readonly _indexPath: string;
  private readonly _blockSize: BlockSize;
  private readonly _blockService: BlockService<TID>;
  private readonly _cblService: CBLService<TID>;
  private readonly _checksumService: ChecksumService;
  private _activeUser?: Member<TID>;

  public setActiveUser(user: Member<TID>) {
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
    this._cblPath = join(this._storePath, this._blockSize.toString());
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

    this._blockService = getGlobalServiceProvider<TID>().blockService;
    this._cblService = getGlobalServiceProvider<TID>().cblService;
    this._checksumService =
      getGlobalServiceProvider<TID>().checksumService;
  }

  /**
   * Check if the data is encrypted
   * @param data The data to check
   * @returns True if the data is encrypted, false otherwise
   */
  public isEncrypted(data: Uint8Array): boolean {
    return (
      getGlobalServiceProvider<TID>().blockService.isSingleRecipientEncrypted(
        data,
      ) ||
      getGlobalServiceProvider<TID>().blockService.isMultiRecipientEncrypted(
        data,
      )
    );
  }

  /**
   * Store a CBL block
   */
  public async set(
    key: Checksum,
    value: ConstituentBlockListBlock<TID> | EncryptedBlock<TID>,
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
    if (value instanceof EncryptedBlock) {
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
    checksum: Checksum,
    hydrateGuid: (id: TID) => Promise<Member<TID>>,
  ): Promise<ConstituentBlockListBlock<TID>> {
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
      if (
        getGlobalServiceProvider<TID>().blockService.isMultiRecipientEncrypted(
          cblData,
        )
      ) {
        // Handle multi-encrypted CBL
        const multiEncryptedCbl = new EncryptedBlock<TID>(
          BlockType.EncryptedConstituentBlockListBlock,
          BlockDataType.EncryptedData,
          cblData,
          checksum,
          new EncryptedBlockMetadata<TID>(
            this._blockSize,
            BlockType.EncryptedConstituentBlockListBlock,
            BlockDataType.EncryptedData,
            cblData.length,
            this._activeUser,
            BlockEncryptionType.MultiRecipient,
            2,
            dateCreated,
          ),
          this._activeUser,
          true,
          true,
        );

        const decryptedCbl = new ConstituentBlockListBlock(
          (
            await getGlobalServiceProvider<TID>().blockService.decryptMultiple(
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
        const encryptedCbl = new EncryptedBlock<TID>(
          BlockType.EncryptedConstituentBlockListBlock,
          BlockDataType.EncryptedData,
          cblData,
          checksum,
          new EncryptedBlockMetadata<TID>(
            this._blockSize,
            BlockType.EncryptedConstituentBlockListBlock,
            BlockDataType.EncryptedData,
            cblData.length,
            this._activeUser,
            BlockEncryptionType.SingleRecipient,
            1,
            dateCreated,
          ),
          this._activeUser,
        );

        const decryptedCbl = new ConstituentBlockListBlock<TID>(
          (
            await getGlobalServiceProvider<TID>().blockService.decrypt(
              this._activeUser,
              encryptedCbl,
              BlockType.ConstituentBlockList,
            )
          ).data,
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
    const idProvider =
      getGlobalServiceProvider<TID>().eciesService.constants
        .idProvider;
    const creator: Member<TID> =
      this._activeUser &&
      arraysEqual(
        idProvider.toBytes(this._activeUser.id),
        idProvider.toBytes(cblInfo.creatorId),
      )
        ? this._activeUser
        : await hydrateGuid(cblInfo.creatorId);

    // Create the appropriate CBL type
    const cbl = new ConstituentBlockListBlock<TID>(cblData, creator);
    if (!cbl.validateSignature()) {
      throw new CblError(CblErrorType.InvalidSignature);
    }
    return Promise.resolve(cbl);
  }

  /**
   * Check if a CBL exists
   */
  public has(checksum: Checksum): boolean {
    const blockPath = this.getBlockPath(checksum);
    return existsSync(blockPath);
  }

  /**
   * Get the addresses for a CBL
   */
  public async getCBLAddresses(
    checksum: Checksum,
    hydrateFunction: (id: TID) => Promise<Member<TID>>,
  ): Promise<Checksum[]> {
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
  private getBlockPath(checksum: Checksum): string {
    const checksumHex = checksum.toHex();
    const firstDir = checksumHex.substring(0, 2);
    const secondDir = checksumHex.substring(2, 4);
    return join(
      this._storePath,
      this._blockSize.toString(),
      firstDir,
      secondDir,
      checksumHex,
    );
  }

  /**
   * Ensure the block path exists
   */
  private ensureBlockPath(checksum: Checksum): void {
    const checksumHex = checksum.toHex();
    const firstDir = checksumHex.substring(0, 2);
    const secondDir = checksumHex.substring(2, 4);
    const blockDir = join(
      this._storePath,
      this._blockSize.toString(),
      firstDir,
      secondDir,
    );
    mkdirSync(blockDir, { recursive: true });
  }
}
