/**
 * Pool ACL Updater - quorum-based ACL update workflow.
 *
 * Provides a propose → collect signatures → apply workflow for ACL changes.
 * Uses `hasQuorum()` from brightchain-lib to verify majority approval.
 *
 * @see Requirements 13.1, 13.2, 13.5, 13.6
 */

import type { IPoolACL } from '@brightchain/brightchain-lib';
import { hasQuorum, PoolPermission } from '@brightchain/brightchain-lib';
import * as crypto from 'crypto';

import { ECDSANodeAuthenticator } from './ecdsaNodeAuthenticator';
import { PoolACLStore } from './poolAclStore';

/**
 * Error thrown when an ACL update would remove the last Admin.
 * @see Requirement 13.6
 */
export class LastAdminError extends Error {
  constructor() {
    super('Cannot remove the last Admin from the ACL');
    this.name = 'LastAdminError';
  }
}

/**
 * Error thrown when an ACL update does not have sufficient signatures.
 * @see Requirement 13.5
 */
export class InsufficientQuorumError extends Error {
  public readonly required: number;
  public readonly actual: number;

  constructor(required: number, actual: number) {
    super(
      `Insufficient quorum: ${actual} signature(s) provided, more than ${required} required`,
    );
    this.name = 'InsufficientQuorumError';
    this.required = required;
    this.actual = actual;
  }
}

/**
 * A proposal for an ACL update that collects admin signatures.
 */
export interface ACLUpdateProposal {
  currentBlockId: string;
  proposedAcl: IPoolACL<string>;
  signatures: Array<{ nodeId: string; signature: Uint8Array }>;
}

export class PoolACLUpdater {
  private readonly store: PoolACLStore;
  private readonly authenticator: ECDSANodeAuthenticator;

  constructor(store: PoolACLStore, authenticator?: ECDSANodeAuthenticator) {
    this.store = store;
    this.authenticator = authenticator ?? new ECDSANodeAuthenticator();
  }

  /**
   * Propose an ACL update. Validates that at least one Admin remains.
   * Returns a proposal object that can collect signatures before applying.
   *
   * @see Requirements 13.1, 13.6
   */
  async proposeUpdate(
    currentBlockId: string,
    proposedAcl: IPoolACL<string>,
  ): Promise<ACLUpdateProposal> {
    this.validateMinAdmin(proposedAcl);

    return {
      currentBlockId,
      proposedAcl,
      signatures: [],
    };
  }

  /**
   * Sign a proposal with an admin's private key and add the signature.
   * Derives the node ID from the private key and signs the serialized
   * proposed ACL.
   *
   * @see Requirement 13.1
   */
  async addSignature(
    proposal: ACLUpdateProposal,
    signerPrivateKey: Uint8Array,
  ): Promise<void> {
    const ecdh = crypto.createECDH('secp256k1');
    ecdh.setPrivateKey(Buffer.from(signerPrivateKey));
    const publicKey = new Uint8Array(ecdh.getPublicKey());
    const nodeId = this.authenticator.deriveNodeId(publicKey);

    // Sign the serialized proposed ACL (without signatures)
    const aclBytes = new TextEncoder().encode(
      this.serializeForSigning(proposal.proposedAcl),
    );
    const signature = await this.authenticator.signChallenge(
      aclBytes,
      signerPrivateKey,
    );

    proposal.signatures.push({ nodeId, signature });
  }

  /**
   * Apply a proposed ACL update if quorum is met.
   * Attaches collected signatures to the ACL, checks quorum via
   * `hasQuorum()`, and stores the updated ACL via `PoolACLStore.updateACL()`.
   *
   * @returns The new ACL block ID
   * @throws InsufficientQuorumError if quorum is not met
   * @see Requirements 13.1, 13.2, 13.5
   */
  async applyUpdate(proposal: ACLUpdateProposal): Promise<string> {
    // Load current ACL to check quorum against current admin count
    const currentAcl = await this.store.loadACL(proposal.currentBlockId);

    // Build a quorum-check ACL using current members + collected signatures
    const quorumCheckAcl: IPoolACL<string> = {
      ...currentAcl,
      approvalSignatures: proposal.signatures.map((s) => ({
        nodeId: s.nodeId,
        signature: s.signature,
      })),
    };

    if (!hasQuorum(quorumCheckAcl)) {
      const adminCount = currentAcl.members.filter((m) =>
        m.permissions.includes(PoolPermission.Admin),
      ).length;
      const required = Math.floor(adminCount / 2);
      throw new InsufficientQuorumError(required, proposal.signatures.length);
    }

    // Attach collected signatures to the proposed ACL
    const chainedAcl: IPoolACL<string> = {
      ...proposal.proposedAcl,
      approvalSignatures: proposal.signatures.map((s) => ({
        nodeId: s.nodeId,
        signature: s.signature,
      })),
      previousAclBlockId: proposal.currentBlockId,
      version: currentAcl.version + 1,
      updatedAt: new Date(),
    };

    return this.store.storeSignedACL(chainedAcl);
  }

  /**
   * Validate that the proposed ACL has at least one Admin member.
   * @throws LastAdminError if no Admin members remain
   * @see Requirement 13.6
   */
  validateMinAdmin(acl: IPoolACL<string>): void {
    const adminCount = acl.members.filter((m) =>
      m.permissions.includes(PoolPermission.Admin),
    ).length;
    if (adminCount === 0) {
      throw new LastAdminError();
    }
  }

  /**
   * Serialize an ACL for signing (deterministic JSON without signatures).
   */
  private serializeForSigning(acl: IPoolACL<string>): string {
    const { approvalSignatures: _, ...aclWithoutSigs } = acl;
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
}
