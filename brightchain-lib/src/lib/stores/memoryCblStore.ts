import {
  arraysEqual,
  GuidV4,
  Member,
  PlatformID,
} from '@digitaldefiance/ecies-lib';
import { ConstituentBlockListBlock } from '../blocks/cbl';
import { EncryptedBlock } from '../blocks/encrypted';
import { EncryptedBlockMetadata } from '../encryptedBlockMetadata';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockEncryptionType } from '../enumerations/blockEncryptionType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { CblErrorType } from '../enumerations/cblErrorType';
import { StoreErrorType } from '../enumerations/storeErrorType';
import { CblError } from '../errors/cblError';
import { StoreError } from '../errors/storeError';
import { ICBLStore } from '../interfaces/storage/cblStore';
import { ServiceLocator } from '../services/serviceLocator';
import { Checksum } from '../types';

/**
 * Memory-based CBLStore for Constituent Block Lists (CBLs).
 * Supports both encrypted and plain CBLs.
 */
export class MemoryCBLStore<TID extends PlatformID = Uint8Array>
  implements ICBLStore<TID>
{
  private readonly _storage = new Map<string, Uint8Array>();
  private readonly _blockSize: BlockSize;
  private _activeUser?: Member<TID>;

  public setActiveUser(user: Member<TID>) {
    this._activeUser = user;
  }

  constructor(config: { blockSize: BlockSize }) {
    if (!config.blockSize) {
      throw new StoreError(StoreErrorType.BlockSizeRequired);
    }
    this._blockSize = config.blockSize;
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

    const keyHex = key.toHex();
    if (this._storage.has(keyHex)) {
      throw new StoreError(StoreErrorType.BlockPathAlreadyExists);
    }

    if (!(value instanceof EncryptedBlock)) {
      ServiceLocator.getServiceProvider<TID>().cblService.validateSignature(
        value.data,
        userForvalidation
      );
    }

    this._storage.set(keyHex, value.data);
  }

  public async get(
    checksum: Checksum,
    hydrateGuid: (id: TID) => Promise<Member<TID>>,
  ): Promise<ConstituentBlockListBlock<TID>> {
    const keyHex = checksum.toHex();
    const cblData = this._storage.get(keyHex);
    
    if (!cblData) {
      throw new StoreError(StoreErrorType.KeyNotFound);
    }

    const cblService = ServiceLocator.getServiceProvider<TID>().cblService;

    if (cblService.isEncrypted(cblData)) {
      if (this._activeUser === undefined) {
        throw new CblError(CblErrorType.UserRequiredForDecryption);
      }

      const blockService = ServiceLocator.getServiceProvider<TID>().blockService;

      if (blockService.isMultiRecipientEncrypted(cblData)) {
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
            new Date(),
          ),
          this._activeUser,
          true,
          true,
        );

        const decryptedCbl = new ConstituentBlockListBlock(
          (await blockService.decryptMultiple(this._activeUser, multiEncryptedCbl)).data,
          this._activeUser,
        );

        if (!decryptedCbl.validateSignature()) {
          throw new CblError(CblErrorType.InvalidSignature);
        }

        return decryptedCbl;
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
            new Date(),
          ),
          this._activeUser,
        );

        const decryptedCbl = new ConstituentBlockListBlock<TID>(
          (
            await blockService.decrypt(
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

        return decryptedCbl;
      }
    }

    const cblInfo = cblService.parseHeader(cblData);
    const idProvider = ServiceLocator.getServiceProvider<TID>().eciesService.constants.idProvider;
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
    return cbl;
  }

  public has(checksum: Checksum): boolean {
    return this._storage.has(checksum.toHex());
  }

  public async getCBLAddresses(
    checksum: Checksum,
    hydrateFunction: (guid: GuidV4) => Promise<Member>,
  ): Promise<Checksum[]> {
    if (!this.has(checksum)) {
      throw new StoreError(StoreErrorType.KeyNotFound);
    }
    const cbl = await this.get(
      checksum,
      hydrateFunction as unknown as (id: TID) => Promise<Member<TID>>,
    );
    return cbl.addresses;
  }
}
