import { PlatformID } from '@digitaldefiance/ecies-lib';
import { PermissionLevel } from '../../enumerations/permission-level';
import type { IShareLinkBase } from '../bases/share-link';

/**
 * Parameters for sharing a file/folder with an internal user.
 */
export interface IInternalShareParams<TID extends PlatformID> {
  fileId?: TID;
  folderId?: TID;
  targetType: 'file' | 'folder';
  recipientId: TID;
  permissionLevel: PermissionLevel;
  canReshare?: boolean;
}

/**
 * Parameters for creating an external share link.
 */
export interface ICreateShareLinkParams<TID extends PlatformID> {
  fileId: TID;
  scope: 'specific_people' | 'organization' | 'anonymous';
  encryptionMode:
    | 'server_proxied'
    | 'ephemeral_key_pair'
    | 'recipient_public_key';
  password?: string;
  expiresAt?: Date | string;
  maxAccessCount?: number;
  blockDownload?: boolean;
  includeMagnetUrl?: boolean;
  recipientPublicKey?: Uint8Array;
  recipientKeyType?: 'ecies_secp256k1' | 'pgp';
  permissionLevel?: string;
}

/**
 * Result of accessing a share link.
 */
export interface IShareLinkAccess<TID extends PlatformID> {
  shareLink: IShareLinkBase<TID>;
  encryptedSymmetricKey?: Uint8Array;
  encryptedBlocks?: Uint8Array[];
  decryptedStream?: ReadableStream;
}

/**
 * An item shared with a user.
 */
export interface ISharedItem<TID extends PlatformID> {
  itemId: TID;
  itemType: 'file' | 'folder';
  sharedBy: TID;
  permissionLevel: PermissionLevel;
  sharedAt: Date | string;
}

/**
 * Result of requesting a magnet URL — includes the URL and a warning.
 */
export interface IMagnetUrlResult {
  magnetUrl: string;
  warning: string;
}
