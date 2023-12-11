import { Member, PlatformID } from '@digitaldefiance/ecies-lib';
import { ConstituentBlockListBlock } from '../../blocks/cbl';
import { EncryptedBlock } from '../../blocks/encrypted';
import { Checksum } from '../../types';

/**
 * Interface for CBL (Constituent Block List) storage.
 * Implementations can use different storage backends (memory, disk, database, etc.)
 */
export interface ICBLStore<TID extends PlatformID = Uint8Array> {
  /**
   * Set the active user for encryption/decryption operations
   */
  setActiveUser(user: Member<TID>): void;

  /**
   * Check if data is encrypted
   */
  isEncrypted(data: Uint8Array): boolean;

  /**
   * Store a CBL block
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
    hydrateFunction: (id: TID) => Promise<Member<TID>>,
  ): Promise<Checksum[]>;
}
