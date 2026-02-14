/**
 * Pool ACL Bootstrap - creates the initial ACL when a new pool is created.
 *
 * Derives the creator's public key and node ID from their private key,
 * creates an ACL with the creator as sole Admin, signs it, and stores it
 * via PoolACLStore.
 *
 * @see Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 */

import type { IPoolACL } from '@brightchain/brightchain-lib';
import { PoolPermission } from '@brightchain/brightchain-lib';
import * as crypto from 'crypto';

import { ECDSANodeAuthenticator } from './ecdsaNodeAuthenticator';
import { PoolACLStore } from './poolAclStore';

export interface BootstrapPoolOptions {
  publicRead?: boolean;
  publicWrite?: boolean;
}

export interface BootstrapPoolResult {
  aclBlockId: string;
  acl: IPoolACL<string>;
}

export class PoolACLBootstrap {
  private readonly store: PoolACLStore;
  private readonly authenticator: ECDSANodeAuthenticator;

  constructor(store: PoolACLStore, authenticator?: ECDSANodeAuthenticator) {
    this.store = store;
    this.authenticator = authenticator ?? new ECDSANodeAuthenticator();
  }

  /**
   * Bootstrap a new pool by creating and signing the initial ACL.
   *
   * - Derives the creator's public key and node ID from the private key
   * - Creates an ACL with the creator as sole Admin member
   * - Sets publicRead/publicWrite from options (default false)
   * - Signs the ACL with the creator's key via PoolACLStore.storeACL()
   * - Returns the block ID and the created ACL
   */
  async bootstrapPool(
    poolId: string,
    creatorPrivateKey: Uint8Array,
    options?: BootstrapPoolOptions,
  ): Promise<BootstrapPoolResult> {
    // Derive creator's public key and node ID
    const ecdh = crypto.createECDH('secp256k1');
    ecdh.setPrivateKey(Buffer.from(creatorPrivateKey));
    const publicKey = new Uint8Array(ecdh.getPublicKey());
    const creatorNodeId = this.authenticator.deriveNodeId(publicKey);

    const now = new Date();

    // Create the initial ACL with creator as sole Admin
    const acl: IPoolACL<string> = {
      poolId,
      owner: creatorNodeId,
      members: [
        {
          nodeId: creatorNodeId,
          permissions: [PoolPermission.Admin],
          addedAt: now,
          addedBy: creatorNodeId,
        },
      ],
      publicRead: options?.publicRead ?? false,
      publicWrite: options?.publicWrite ?? false,
      approvalSignatures: [],
      version: 1,
      updatedAt: now,
    };

    // Sign and store the ACL
    const aclBlockId = await this.store.storeACL(acl, creatorPrivateKey);

    // Load back the stored ACL (includes the approval signature)
    const storedAcl = await this.store.loadACL(aclBlockId);

    return { aclBlockId, acl: storedAcl };
  }
}
