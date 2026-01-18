import { GuidV4, Member, PlatformID } from '@digitaldefiance/ecies-lib';
import { ConstituentBlockListBlock } from '../../blocks/cbl';
import { EncryptedBlock } from '../../blocks/encrypted';
import { Checksum } from '../../types';
import { ISimpleStoreAsync } from '../simpleStoreAsync';

/**
 * Interface for CBL (Constituent Block List) storage operations.
 * Supports both encrypted and plain CBLs.
 */
export interface ICBLStore<TID extends PlatformID = Uint8Array>
  extends ISimpleStoreAsync<Checksum, ConstituentBlockListBlock<TID>, TID> {
  /**
   * Set the active user for encryption/decryption operations
   */
  setActiveUser(user: Member<TID>): void;

  /**
   * Check if the data is encrypted
   */
  isEncrypted(data: Uint8Array): boolean;

  /**
   * Store a CBL block (encrypted or unencrypted)
   */
  set(
    key: Checksum,
    value: ConstituentBlockListBlock<TID> | EncryptedBlock<TID>,
  ): Promise<void>;

  /**
   * Get a CBL by its checksum
   */
  get(
    checksum: Checksum,
    hydrateGuid: (id: TID) => Promise<Member<TID>>,
  ): Promise<ConstituentBlockListBlock<TID>>;

  /**
   * Check if a CBL exists
   */
  has(checksum: Checksum): boolean;

  /**
   * Get the addresses for a CBL
   */
  getCBLAddresses(
    checksum: Checksum,
    hydrateFunction: (guid: GuidV4) => Promise<Member>,
  ): Promise<Checksum[]>;
}
