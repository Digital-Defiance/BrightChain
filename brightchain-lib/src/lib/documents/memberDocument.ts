import { Member, PlatformID } from '@digitaldefiance/ecies-lib';
import { IMemberStorageData } from '../interfaces/member/storage';
import { Document } from './base/document';
import { MemberDocument as ConcreteMemberDocument } from './member/memberDocument';
import { BaseMemberDocument } from './member/baseMemberDocument';

/**
 * Type alias for member data
 */
export type MemberData = IMemberStorageData;

/**
 * Main MemberDocument class that extends the concrete implementation
 * and adds static methods for JSON serialization
 */
export class MemberDocument<TID extends PlatformID = Uint8Array> extends ConcreteMemberDocument<TID> {
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