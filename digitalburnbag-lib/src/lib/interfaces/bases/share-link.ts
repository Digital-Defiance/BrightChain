import { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * External share link stored in BrightDB.
 * Supports three encryption modes: server-proxied, ephemeral key pair,
 * and recipient public key.
 */
export interface IShareLinkBase<TID extends PlatformID> {
  id: TID;
  /** File being shared (for file-level shares) */
  fileId?: TID;
  /** Vault container being shared (for container-level shares) */
  vaultContainerId?: TID;
  /** Unique URL token */
  token: string;
  createdBy: TID;
  /** Bcrypt hash of password (if password-protected) */
  passwordHash?: string;
  expiresAt?: Date | string;
  maxAccessCount?: number;
  currentAccessCount: number;
  revokedAt?: Date | string;
  /** Permission level or custom permission set ID */
  permissionLevel: string;
  /** Link scope */
  scope: 'specific_people' | 'organization' | 'anonymous';
  /** Organization ID (required for organization-scoped links) */
  organizationId?: TID;
  /** Block download — if true, only server-rendered previews */
  blockDownload: boolean;
  /** Whether this share includes the magnet URL for direct P2P reconstruction */
  includeMagnetUrl: boolean;
  /** External sharing encryption mode */
  encryptionMode:
    | 'server_proxied'
    | 'ephemeral_key_pair'
    | 'recipient_public_key';
  /** Ephemeral public key (stored on server; private key is in URL fragment) */
  ephemeralPublicKey?: Uint8Array;
  /** Reference to the key wrapping entry for this share */
  keyWrappingEntryId?: TID;
  /** Recipient's public key (for recipient_public_key mode) */
  recipientPublicKey?: Uint8Array;
  /** Recipient public key type */
  recipientKeyType?: 'ecies_secp256k1' | 'pgp';
  createdAt: Date | string;
}
