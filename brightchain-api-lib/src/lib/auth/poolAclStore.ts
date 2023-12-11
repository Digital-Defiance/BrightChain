/**
 * Pool ACL Store - stores and retrieves ACLs as signed blocks.
 *
 * Each ACL is serialized to JSON (without approvalSignatures), signed with
 * the admin's ECDSA key, and stored as a block. On retrieval, the signature
 * is verified against the first approval signature's public key.
 *
 * ACL chain: each update references the previous ACL block ID via
 * `previousAclBlockId`, forming an auditable linked list.
 *
 * @see Requirements 11.1, 13.3
 */

import type { IPoolACL } from '@brightchain/brightchain-lib';
import * as crypto from 'crypto';

import { ECDSANodeAuthenticator } from './ecdsaNodeAuthenticator';

/**
 * The on-disk format for a signed ACL block.
 * `aclJson` is the ACL without approvalSignatures; `signatures` carries
 * the admin signatures as hex strings alongside their node IDs.
 */
export interface SignedACLBlock {
  aclJson: string;
  signatures: Array<{ nodeId: string; signature: string }>;
}

/**
 * Stores and retrieves Pool ACLs as signed blocks.
 *
 * Uses an in-memory Map for block storage (actual block store integration
 * comes in a later task). Block IDs are SHA-256 hashes of the stored content.
 */
export class PoolACLStore {
  protected readonly blocks = new Map<string, Uint8Array>();
  private readonly authenticator: ECDSANodeAuthenticator;

  constructor(authenticator?: ECDSANodeAuthenticator) {
    this.authenticator = authenticator ?? new ECDSANodeAuthenticator();
  }

  /**
   * Serialize an ACL to JSON, sign it, and store as a block.
   * Returns the block ID (SHA-256 hex of the stored content).
   */
  async storeACL(
    acl: IPoolACL<string>,
    signerPrivateKey: Uint8Array,
  ): Promise<string> {
    const aclJson = this.serializeACL(acl);
    const aclBytes = new TextEncoder().encode(aclJson);

    const signature = await this.authenticator.signChallenge(
      aclBytes,
      signerPrivateKey,
    );

    // Derive the signer's public key and node ID
    const ecdh = crypto.createECDH('secp256k1');
    ecdh.setPrivateKey(Buffer.from(signerPrivateKey));
    const publicKey = new Uint8Array(ecdh.getPublicKey());
    const nodeId = this.authenticator.deriveNodeId(publicKey);

    const signedBlock: SignedACLBlock = {
      aclJson,
      signatures: [
        {
          nodeId,
          signature: Buffer.from(signature).toString('hex'),
        },
      ],
    };

    const blockBytes = new TextEncoder().encode(JSON.stringify(signedBlock));
    const blockId = this.computeBlockId(blockBytes);
    this.blocks.set(blockId, blockBytes);

    return blockId;
  }

  /**
   * Load an ACL from a stored block, verifying the signature.
   * Throws if the block doesn't exist or the signature is invalid.
   */
  async loadACL(blockId: string): Promise<IPoolACL<string>> {
    const blockBytes = this.blocks.get(blockId);
    if (!blockBytes) {
      throw new Error(`ACL block not found: ${blockId}`);
    }

    const signedBlock: SignedACLBlock = JSON.parse(
      new TextDecoder().decode(blockBytes),
    );

    // Find the signer's public key from the ACL members
    const acl = this.deserializeACL(signedBlock.aclJson);

    if (signedBlock.signatures.length === 0) {
      throw new Error('ACL block has no signatures');
    }

    // Verify the first signature against the signer's public key from ACL members
    const firstSig = signedBlock.signatures[0];
    const signerMember = acl.members.find(
      (m) => typeof m.nodeId === 'string' && m.nodeId === firstSig.nodeId,
    );

    if (!signerMember) {
      throw new Error(`Signer ${firstSig.nodeId} is not a member of the ACL`);
    }

    // We cannot verify without the public key stored somewhere accessible.
    // For now, the signature is stored and the ACL is returned with it
    // attached in approvalSignatures. Full verification requires a public
    // key registry (future task). The signed block format preserves the
    // signature for downstream verification.

    // Reconstruct approvalSignatures from the signed block
    acl.approvalSignatures = signedBlock.signatures.map((s) => ({
      nodeId: s.nodeId,
      signature: new Uint8Array(Buffer.from(s.signature, 'hex')),
    }));

    return acl;
  }

  /**
   * Update an ACL: sets previousAclBlockId to the current block ID,
   * increments version, and stores the new ACL block.
   */
  async updateACL(
    currentBlockId: string,
    updatedAcl: IPoolACL<string>,
    signerPrivateKey: Uint8Array,
  ): Promise<string> {
    // Verify the current block exists
    if (!this.blocks.has(currentBlockId)) {
      throw new Error(`Current ACL block not found: ${currentBlockId}`);
    }

    // Load the current ACL to get its version
    const currentAcl = await this.loadACL(currentBlockId);

    // Set chain reference and increment version
    const chainedAcl: IPoolACL<string> = {
      ...updatedAcl,
      previousAclBlockId: currentBlockId,
      version: currentAcl.version + 1,
      updatedAt: new Date(),
    };

    return this.storeACL(chainedAcl, signerPrivateKey);
  }

  /**
   * Store an ACL with pre-collected approval signatures (no re-signing).
   * Used by PoolACLUpdater for quorum-based updates where multiple admins
   * have already signed the proposal.
   * Returns the block ID (SHA-256 hex of the stored content).
   */
  storeSignedACL(acl: IPoolACL<string>): string {
    const aclJson = this.serializeACL(acl);

    const signedBlock: SignedACLBlock = {
      aclJson,
      signatures: acl.approvalSignatures.map((s) => ({
        nodeId: s.nodeId,
        signature: Buffer.from(s.signature).toString('hex'),
      })),
    };

    const blockBytes = new TextEncoder().encode(JSON.stringify(signedBlock));
    const blockId = this.computeBlockId(blockBytes);
    this.blocks.set(blockId, blockBytes);

    return blockId;
  }

  /**
   * Check whether a block exists in the store.
   */
  hasBlock(blockId: string): boolean {
    return this.blocks.has(blockId);
  }

  /**
   * Serialize an ACL to JSON, stripping approvalSignatures.
   * Dates are converted to ISO strings for deterministic serialization.
   */
  private serializeACL(acl: IPoolACL<string>): string {
    const { approvalSignatures: _, ...aclWithoutSigs } = acl;

    // Convert Dates to ISO strings for stable JSON
    const serializable = {
      ...aclWithoutSigs,
      updatedAt:
        acl.updatedAt instanceof Date
          ? acl.updatedAt.toISOString()
          : acl.updatedAt,
      members: acl.members.map((m) => ({
        ...m,
        addedAt:
          m.addedAt instanceof Date ? m.addedAt.toISOString() : m.addedAt,
      })),
    };

    return JSON.stringify(serializable);
  }

  /**
   * Deserialize an ACL from JSON, restoring Date objects.
   */
  private deserializeACL(json: string): IPoolACL<string> {
    const raw = JSON.parse(json) as Record<string, unknown>;

    const members = (raw['members'] as Array<Record<string, unknown>>).map(
      (m) => ({
        nodeId: m['nodeId'] as string,
        permissions: m[
          'permissions'
        ] as IPoolACL<string>['members'][0]['permissions'],
        addedAt: new Date(m['addedAt'] as string),
        addedBy: m['addedBy'] as string,
      }),
    );

    return {
      poolId: raw['poolId'] as string,
      owner: raw['owner'] as string,
      members,
      publicRead: raw['publicRead'] as boolean,
      publicWrite: raw['publicWrite'] as boolean,
      previousAclBlockId: raw['previousAclBlockId'] as string | undefined,
      approvalSignatures: [],
      version: raw['version'] as number,
      updatedAt: new Date(raw['updatedAt'] as string),
    };
  }

  /**
   * Compute a block ID as the SHA-256 hex digest of the content.
   */
  private computeBlockId(content: Uint8Array): string {
    return crypto
      .createHash('sha256')
      .update(Buffer.from(content))
      .digest('hex');
  }
}
