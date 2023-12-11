/* eslint-disable @typescript-eslint/no-explicit-any */
import { Member, PlatformID } from '@digitaldefiance/ecies-lib';
import { BlockSize } from '../enumerations/blockSize';
import { IMemberStorageData } from '../interfaces/member/storage';
import { Checksum } from '../types';
import { Document } from './base/document';
import { MemberDocument as ConcreteMemberDocument } from './member/memberDocument';

/**
 * Type alias for member data
 */
export type MemberData = IMemberStorageData;

/**
 * Main MemberDocument class that provides a convenient alias for the concrete implementation
 * and adds static methods for JSON serialization.
 *
 * @remarks
 * This class uses the factory pattern to ensure proper initialization.
 * Use the static `create()` method to instantiate.
 *
 * @example
 * ```typescript
 * // Correct usage - use factory method
 * const doc = MemberDocument.create(publicMember, privateMember);
 *
 * // Create from JSON
 * const jsonDoc = MemberDocument.fromJson<MemberData>(jsonData);
 * ```
 *
 * @see Requirements 2.1, 2.2, 2.3, 2.4
 */
export class MemberDocument<
  TID extends PlatformID = Uint8Array,
> extends ConcreteMemberDocument<TID> {
  /**
   * Factory method to create a new MemberDocument instance.
   *
   * This is the only supported way to create MemberDocument instances.
   *
   * @param publicMember - The public member data
   * @param privateMember - The private member data
   * @param publicCBLId - Optional public CBL ID
   * @param privateCBLId - Optional private CBL ID
   * @param config - Optional configuration
   *
   * @returns A new MemberDocument instance
   *
   * @example
   * ```typescript
   * const doc = MemberDocument.create(publicMember, privateMember);
   * ```
   *
   * @see Requirements 2.1, 2.2, 2.3, 2.4, 2.5
   */
  public static override create<TID extends PlatformID = Uint8Array>(
    publicMember: Member<TID>,
    privateMember: Member<TID>,
    publicCBLId?: Checksum,
    privateCBLId?: Checksum,
    config?: { blockSize?: BlockSize },
  ): MemberDocument<TID> {
    // Use the parent's create method which handles factory token properly
    // The returned instance is compatible with MemberDocument since this class
    // doesn't add any new instance members
    return ConcreteMemberDocument.create<TID>(
      publicMember,
      privateMember,
      publicCBLId,
      privateCBLId,
      config,
    ) as MemberDocument<TID>;
  }

  /**
   * Create MemberDocument from JSON data
   * Note: This creates a basic Document, not a full MemberDocument with CBL functionality
   */
  public static fromJson<T>(jsonData: any): Document<T> {
    return Document.fromJson<T>(JSON.stringify(jsonData));
  }
}

// Re-export everything from the member module
export * from './member';
