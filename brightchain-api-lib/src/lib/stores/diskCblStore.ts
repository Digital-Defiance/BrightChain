import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  arraysEqual,
  GuidV4,
  Member,
  PlatformID,
} from '@digitaldefiance/ecies-lib';
import {
  ConstituentBlockListBlock,
  EncryptedBlock,
  EncryptedBlockMetadata,
  IEncryptedBlockMetadata,
  BlockDataType,
  BlockEncryptionType,
  BlockSize,
  BlockType,
  CblErrorType,
  StoreErrorType,
  CblError,
  StoreError,
  ICBLStore,
  BlockService,
  CBLService,
  ChecksumService,
  ServiceLocator,
  Checksum,
} from '@brightchain/brightchain-lib';

/**
 * Disk-based CBLStore for Constituent Block Lists (CBLs).
 * Maintains an index of CBL addresses and their associated block tuples.
 * Supports both encrypted and plain CBLs.
 */
export class DiskCBLStore<TID extends PlatformID = Uint8Array>
  implements ICBLStore<TID>
{
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

    if (!existsSync(config.storePath)) {
      throw new StoreError(StoreErrorType.StorePathNotFound);
    }

    if (!existsSync(this._indexPath)) {
      mkdirSync(this._indexPath, { recursive: true });
    }

    if (!existsSync(this._cblPath)) {
      mkdirSync(this._cblPath, { recursive: true });
    }

    this._blockService = ServiceLocator.getServiceProvider<TID>().blockService;
    this._cblService = ServiceLocator.getServiceProvider<TID>().cblService;
    this._checksumService =
      ServiceLocator.getServiceProvider<TID>().checksumService;
  }

  public isEncrypted(data: Uint8Array): boolean {
    return (
      ServiceLocator.getServiceProvider<TID>().blockService.isSingleRecipientEncrypted(
        data,
      ) ||
      ServiceLocator.getServiceProvider<TID>().blockService.isMultiRecipientEncrypted(
        data,
      )
    );
  }

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

    if (value instanceof EncryptedBlock) {
      this.ensureBlockPath(value.idChecksum);
      writeFileSync(blockPath, value.data);
      return;
    }

    this._cblService.validateSignature(value.data, userForvalidation);
    this.ensureBlockPath(value.idChecksum);
    writeFileSync(blockPath, value.data);
  }

  public async get(
    checksum: Checksum,
    hydrateGuid: (id: TID) => Promise<Member<TID>>,
  ): Promise<ConstituentBlockListBlock<TID>> {
    const blockPath = this.getBlockPath(checksum);
    if (!existsSync(blockPath)) {
      throw new StoreError(StoreErrorType.KeyNotFound);
    }

    const cblData = readFileSync(blockPath);

    if (this._cblService.isEncrypted(cblData)) {
      if (this._activeUser === undefined) {
        throw new CblError(CblErrorType.UserRequiredForDecryption);
      }

      const fileStat = statSync(blockPath);
      const dateCreated = fileStat.mtime;

      if (
        ServiceLocator.getServiceProvider<TID>().blockService.isMultiRecipientEncrypted(
          cblData,
        )
      ) {
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
            await ServiceLocator.getServiceProvider<TID>().blockService.decryptMultiple(
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
            await ServiceLocator.getServiceProvider<TID>().blockService.decrypt(
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

    const cblInfo = this._cblService.parseHeader(cblData);
    const idProvider =
      ServiceLocator.getServiceProvider<TID>().eciesService.constants
        .idProvider;
    const creator =
      this._activeUser &&
      arraysEqual(
        idProvider.toBytes(this._activeUser.id),
        idProvider.toBytes(cblInfo.creatorId),
      )
        ? this._activeUser
        : await hydrateGuid(cblInfo.creatorId);

    const cbl = new ConstituentBlockListBlock<TID>(cblData, creator);
    if (!cbl.validateSignature()) {
      throw new CblError(CblErrorType.InvalidSignature);
    }
    return Promise.resolve(cbl);
  }

  public has(checksum: Checksum): boolean {
    const blockPath = this.getBlockPath(checksum);
    return existsSync(blockPath);
  }

  public async getCBLAddresses(
    checksum: Checksum,
    hydrateFunction: (guid: GuidV4) => Promise<Member>,
  ): Promise<Checksum[]> {
    const blockPath = this.getBlockPath(checksum);
    if (!existsSync(blockPath)) {
      throw new StoreError(StoreErrorType.KeyNotFound);
    }
    if (!this.has(checksum)) {
      throw new StoreError(StoreErrorType.KeyNotFound);
    }
    const cbl = await this.get(
      checksum,
      hydrateFunction as unknown as (id: TID) => Promise<Member<TID>>,
    );

    return cbl.addresses;
  }

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
