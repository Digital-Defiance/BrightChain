/**
 * @fileoverview LedgerChainValidator — validates chain integrity by walking
 * entries and checking hashes, signatures, authorization, and governance
 * constraints.
 *
 * Validation does not throw — it returns an IValidationResult with error
 * descriptors. All errors are collected (validation does not stop at the
 * first error).
 *
 * @see Design: Block Chain Ledger — LedgerChainValidator
 * @see Requirements 3.2, 3.3, 4.3–4.6, 8.1–8.4, 12.6–12.7, 13.6–13.7,
 *      14.5, 15.6, 16.1–16.6
 */

import { IAuthorizedSigner } from '../interfaces/ledger/authorizedSigner';
import { ILedgerEntry } from '../interfaces/ledger/ledgerEntry';
import { ILedgerSignatureVerifier } from '../interfaces/ledger/ledgerSignatureVerifier';
import { IMerkleProof } from '../interfaces/ledger/merkleProof';
import {
  ILedgerValidationError,
  IValidationResult,
} from '../interfaces/ledger/validationResult';
import { ChecksumService } from '../services/checksum.service';
import { Checksum } from '../types/checksum';
import { AuthorizedSignerSet } from './authorizedSignerSet';
import { GovernancePayloadSerializer } from './governancePayloadSerializer';
import { IncrementalMerkleTree } from './incrementalMerkleTree';
import { Ledger } from './ledger';
import { LedgerEntrySerializer } from './ledgerEntrySerializer';

/**
 * Validates ledger chain integrity by walking entries and verifying:
 * - Contiguous sequence numbers
 * - Genesis entry correctness
 * - Hash-chain links (previousEntryHash)
 * - EntryHash recomputation
 * - Signature verification
 * - Authorization (signer is in the authorized set)
 * - Governance constraints (admin role, quorum, safety)
 */
export class LedgerChainValidator {
  constructor(
    private readonly serializer: LedgerEntrySerializer,
    private readonly signatureVerifier: ILedgerSignatureVerifier,
    private readonly governanceSerializer?: GovernancePayloadSerializer,
  ) {}

  /**
   * Validate the entire chain from genesis to head.
   *
   * Expects entries ordered by sequenceNumber starting from 0.
   * Returns { isValid: true, entriesChecked: 0, errors: [] } for an empty chain.
   *
   * When a governanceSerializer is provided, also validates:
   * - Genesis entry initializes the signer set
   * - Each entry's signer is authorized at that chain position
   * - Governance entries have admin role and satisfy quorum
   * - Governance actions pass safety constraints
   *
   * When a merkleRoot is provided, also validates:
   * - Reconstructs the Merkle tree from entry hashes
   * - Verifies the computed root matches the provided Merkle root
   *
   * @param entries - The chain entries to validate
   * @param merkleRoot - Optional Merkle root to verify against. When provided,
   *   the validator reconstructs the Merkle tree from entry hashes and compares
   *   the computed root to this value.
   *
   * @see Requirements 11.1, 11.3, 11.4
   */
  validateAll(entries: ILedgerEntry[], merkleRoot?: Checksum): IValidationResult {
    if (entries.length === 0) {
      return { isValid: true, entriesChecked: 0, errors: [] };
    }

    const errors: ILedgerValidationError[] = [];
    let signerSet: AuthorizedSignerSet | null = null;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const expectedSeq = i;

      // Verify contiguous sequence numbers starting from 0
      if (entry.sequenceNumber !== expectedSeq) {
        errors.push({
          sequenceNumber: entry.sequenceNumber,
          errorType: 'sequence_gap',
          message: `Expected sequenceNumber ${expectedSeq}, got ${entry.sequenceNumber}`,
        });
      }

      if (i === 0) {
        // Genesis entry: previousEntryHash must be null
        if (entry.previousEntryHash !== null) {
          errors.push({
            sequenceNumber: entry.sequenceNumber,
            errorType: 'genesis_invalid',
            message:
              'Genesis entry (sequenceNumber 0) must have null previousEntryHash',
          });
        }

        // Initialize signer set from genesis if governance is enabled
        if (this.governanceSerializer) {
          signerSet = this.initSignerSetFromGenesis(entry, errors);
        }
      } else {
        // Non-genesis: previousEntryHash must equal preceding entry's entryHash
        const prev = entries[i - 1];
        if (
          entry.previousEntryHash === null ||
          !entry.previousEntryHash.equals(prev.entryHash)
        ) {
          errors.push({
            sequenceNumber: entry.sequenceNumber,
            errorType: 'previous_hash_mismatch',
            message: `previousEntryHash does not match preceding entry's entryHash at sequenceNumber ${entry.sequenceNumber}`,
          });
        }

        // Validate authorization and governance for non-genesis entries
        if (signerSet && this.governanceSerializer) {
          this.validateEntryAuthorization(entry, signerSet, errors);
        }
      }

      // Recompute entryHash and verify
      this.verifyEntryHash(entry, errors);

      // Verify signature
      this.verifySignature(entry, errors);
    }

    // Merkle root verification: reconstruct tree from entry hashes and compare
    if (merkleRoot !== undefined) {
      const checksumService = new ChecksumService();
      const entryHashes = entries.map((e) => e.entryHash);
      const computedTree = IncrementalMerkleTree.fromLeaves(entryHashes, checksumService);
      const computedRoot = computedTree.root;

      if (!computedRoot.equals(merkleRoot)) {
        errors.push({
          sequenceNumber: entries[entries.length - 1].sequenceNumber,
          errorType: 'merkle_root_mismatch',
          message: 'Reconstructed Merkle root does not match the stored Merkle root',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      entriesChecked: entries.length,
      errors,
    };
  }

  /**
   * Validate a sub-range of entries, including the link to the predecessor.
   *
   * @param entries - The sub-range of entries to validate (ordered by sequenceNumber).
   * @param predecessor - The entry immediately before the sub-range, or null if
   *   the sub-range starts at genesis.
   * @param signerSetAtPredecessor - Optional AuthorizedSignerSet state at the predecessor
   *   for governance validation of the sub-range.
   * @param merkleRoot - Optional Merkle root to verify entry hashes against.
   *   When provided along with merkleProofs, each entry's entryHash is verified
   *   against its corresponding Merkle proof.
   * @param merkleProofs - Optional array of Merkle proofs corresponding 1:1 with
   *   the entries array. Required for Merkle validation when merkleRoot is provided.
   *
   * @see Requirements 11.2
   */
  validateRange(
    entries: ILedgerEntry[],
    predecessor: ILedgerEntry | null,
    signerSetAtPredecessor?: AuthorizedSignerSet,
    merkleRoot?: Checksum,
    merkleProofs?: IMerkleProof[],
  ): IValidationResult {
    if (entries.length === 0) {
      return { isValid: true, entriesChecked: 0, errors: [] };
    }

    const errors: ILedgerValidationError[] = [];
    const startSeq = predecessor !== null ? predecessor.sequenceNumber + 1 : 0;
    let signerSet = signerSetAtPredecessor?.clone() ?? null;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const expectedSeq = startSeq + i;

      // Verify contiguous sequence numbers
      if (entry.sequenceNumber !== expectedSeq) {
        errors.push({
          sequenceNumber: entry.sequenceNumber,
          errorType: 'sequence_gap',
          message: `Expected sequenceNumber ${expectedSeq}, got ${entry.sequenceNumber}`,
        });
      }

      if (i === 0) {
        if (predecessor !== null) {
          // First entry in range must link to predecessor
          if (
            entry.previousEntryHash === null ||
            !entry.previousEntryHash.equals(predecessor.entryHash)
          ) {
            errors.push({
              sequenceNumber: entry.sequenceNumber,
              errorType: 'previous_hash_mismatch',
              message: `previousEntryHash does not match predecessor's entryHash at sequenceNumber ${entry.sequenceNumber}`,
            });
          }
        } else {
          // No predecessor means this should be genesis
          if (entry.previousEntryHash !== null) {
            errors.push({
              sequenceNumber: entry.sequenceNumber,
              errorType: 'genesis_invalid',
              message:
                'Genesis entry (sequenceNumber 0) must have null previousEntryHash',
            });
          }

          // Initialize signer set from genesis if governance is enabled
          if (this.governanceSerializer && !signerSet) {
            signerSet = this.initSignerSetFromGenesis(entry, errors);
          }
        }
      } else {
        // Subsequent entries link to the previous entry in the range
        const prev = entries[i - 1];
        if (
          entry.previousEntryHash === null ||
          !entry.previousEntryHash.equals(prev.entryHash)
        ) {
          errors.push({
            sequenceNumber: entry.sequenceNumber,
            errorType: 'previous_hash_mismatch',
            message: `previousEntryHash does not match preceding entry's entryHash at sequenceNumber ${entry.sequenceNumber}`,
          });
        }
      }

      // Validate authorization for non-genesis entries
      if (i > 0 || predecessor !== null) {
        if (signerSet && this.governanceSerializer) {
          this.validateEntryAuthorization(entry, signerSet, errors);
        }
      }

      // Recompute entryHash and verify
      this.verifyEntryHash(entry, errors);

      // Verify signature
      this.verifySignature(entry, errors);
    }

    // Merkle proof verification: when both merkleRoot and merkleProofs are provided,
    // verify each entry's entryHash is consistent with its Merkle proof.
    if (merkleRoot !== undefined && merkleProofs !== undefined) {
      for (let i = 0; i < entries.length; i++) {
        if (i < merkleProofs.length) {
          const result = Ledger.verifyInclusionProof(merkleProofs[i], merkleRoot);
          if (!result.isValid) {
            errors.push({
              sequenceNumber: entries[i].sequenceNumber,
              errorType: 'merkle_root_mismatch',
              message: `Merkle proof verification failed for entry at sequenceNumber ${entries[i].sequenceNumber}: ${result.error ?? 'unknown error'}`,
            });
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      entriesChecked: entries.length,
      errors,
    };
  }

  /**
   * Validate the entire chain in parallel by splitting into chunks and
   * verifying each chunk concurrently via Promise.all.
   *
   * Produces the same validation result as sequential `validateAll()`:
   * same `isValid`, same `entriesChecked`, same error types (though error
   * ordering may differ).
   *
   * Hash verification and signature verification — the expensive operations —
   * run in parallel across chunks. Governance validation is run as a separate
   * sequential pass since it requires tracking the AuthorizedSignerSet state
   * across the chain.
   *
   * @param entries - The chain entries to validate (ordered by sequenceNumber from 0)
   * @param merkleRoot - Optional Merkle root to verify against
   * @returns Promise resolving to the same IValidationResult as validateAll()
   *
   * @see Requirements 17.1, 17.2, 17.3
   */
  async validateAllParallel(
    entries: ILedgerEntry[],
    merkleRoot?: Checksum,
  ): Promise<IValidationResult> {
    if (entries.length === 0) {
      return { isValid: true, entriesChecked: 0, errors: [] };
    }

    // Determine chunk count: 2-4 chunks based on entry count
    const chunkCount = Math.min(
      entries.length,
      entries.length <= 4 ? entries.length : Math.min(4, Math.max(2, Math.ceil(entries.length / 4))),
    );
    const chunkSize = Math.ceil(entries.length / chunkCount);

    // Build chunk descriptors: each chunk has its entries and predecessor
    const chunkTasks: Array<{
      chunk: ILedgerEntry[];
      predecessor: ILedgerEntry | null;
    }> = [];

    for (let i = 0; i < entries.length; i += chunkSize) {
      const chunk = entries.slice(i, Math.min(i + chunkSize, entries.length));
      const predecessor = i === 0 ? null : entries[i - 1];
      chunkTasks.push({ chunk, predecessor });
    }

    // Run all chunk validations concurrently (without governance — that's sequential)
    // Create a temporary validator without governance for the parallel pass
    const noGovValidator = new LedgerChainValidator(
      this.serializer,
      this.signatureVerifier,
      // No governance serializer — governance is validated separately below
    );

    const chunkResults = await Promise.all(
      chunkTasks.map(({ chunk, predecessor }) =>
        Promise.resolve(noGovValidator.validateRange(chunk, predecessor)),
      ),
    );

    // Merge chunk results
    const allErrors: ILedgerValidationError[] = [];
    let totalChecked = 0;

    for (const result of chunkResults) {
      allErrors.push(...result.errors);
      totalChecked += result.entriesChecked;
    }

    // Governance validation: run sequentially if a governance serializer is present
    if (this.governanceSerializer) {
      const govResult = this.validateGovernanceSequential(entries);
      allErrors.push(...govResult.errors);
    }

    // Merkle root verification: reconstruct tree from entry hashes and compare
    if (merkleRoot !== undefined) {
      const checksumService = new ChecksumService();
      const entryHashes = entries.map((e) => e.entryHash);
      const computedTree = IncrementalMerkleTree.fromLeaves(
        entryHashes,
        checksumService,
      );
      const computedRoot = computedTree.root;

      if (!computedRoot.equals(merkleRoot)) {
        allErrors.push({
          sequenceNumber: entries[entries.length - 1].sequenceNumber,
          errorType: 'merkle_root_mismatch',
          message:
            'Reconstructed Merkle root does not match the stored Merkle root',
        });
      }
    }

    return {
      isValid: allErrors.length === 0,
      entriesChecked: totalChecked,
      errors: allErrors,
    };
  }

  // ── private helpers ──────────────────────────────────────────────────

  /**
   * Run governance validation sequentially across the full chain.
   * This is separated from the parallel chunk validation because governance
   * requires tracking the AuthorizedSignerSet state across entries.
   */
  private validateGovernanceSequential(
    entries: ILedgerEntry[],
  ): { errors: ILedgerValidationError[] } {
    const errors: ILedgerValidationError[] = [];
    let signerSet: AuthorizedSignerSet | null = null;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      if (i === 0) {
        // Initialize signer set from genesis
        signerSet = this.initSignerSetFromGenesis(entry, errors);
      } else {
        // Validate authorization for non-genesis entries
        if (signerSet && this.governanceSerializer) {
          this.validateEntryAuthorization(entry, signerSet, errors);
        }
      }
    }

    return { errors };
  }

  /**
   * Initialize the AuthorizedSignerSet from a genesis entry.
   * Returns the signer set, or null if the genesis is not a valid governance payload.
   */
  private initSignerSetFromGenesis(
    entry: ILedgerEntry,
    errors: ILedgerValidationError[],
  ): AuthorizedSignerSet | null {
    if (!this.governanceSerializer) return null;

    if (!GovernancePayloadSerializer.isGovernancePayload(entry.payload)) {
      errors.push({
        sequenceNumber: entry.sequenceNumber,
        errorType: 'invalid_governance_payload',
        message: 'Genesis entry must be a governance genesis payload',
      });
      return null;
    }

    try {
      const parsed = this.governanceSerializer.deserialize(entry.payload);
      if (!parsed.genesis) {
        errors.push({
          sequenceNumber: entry.sequenceNumber,
          errorType: 'invalid_governance_payload',
          message: 'Genesis entry must use genesis subtype',
        });
        return null;
      }

      const signerSet = new AuthorizedSignerSet(
        parsed.genesis.signers as IAuthorizedSigner[],
        parsed.genesis.quorumPolicy,
      );

      // Verify genesis signer is authorized
      if (!signerSet.canAppend(entry.signerPublicKey)) {
        errors.push({
          sequenceNumber: entry.sequenceNumber,
          errorType: 'unauthorized_signer',
          message: 'Genesis entry signer is not in the initial authorized set',
        });
      }

      return signerSet;
    } catch {
      errors.push({
        sequenceNumber: entry.sequenceNumber,
        errorType: 'invalid_governance_payload',
        message: 'Failed to deserialize genesis governance payload',
      });
      return null;
    }
  }

  /**
   * Validate authorization and governance constraints for a non-genesis entry.
   * If the entry is a governance payload, also validates admin role, quorum,
   * and applies actions to the signer set.
   */
  private validateEntryAuthorization(
    entry: ILedgerEntry,
    signerSet: AuthorizedSignerSet,
    errors: ILedgerValidationError[],
  ): void {
    const isGovernance =
      this.governanceSerializer &&
      GovernancePayloadSerializer.isGovernancePayload(entry.payload);

    if (isGovernance) {
      // Governance entries require active admin
      if (!signerSet.isActiveAdmin(entry.signerPublicKey)) {
        errors.push({
          sequenceNumber: entry.sequenceNumber,
          errorType: 'unauthorized_governance',
          message: 'Governance entry signer is not an active admin',
        });
        return;
      }

      // Parse and validate governance payload
      try {
        const parsed = this.governanceSerializer!.deserialize(entry.payload);

        // Verify quorum from cosignatures + primary signer
        const signerKeys = [
          entry.signerPublicKey,
          ...parsed.cosignatures.map((c) => c.signerPublicKey),
        ];
        if (!signerSet.verifyQuorum(signerKeys)) {
          errors.push({
            sequenceNumber: entry.sequenceNumber,
            errorType: 'quorum_not_met',
            message: `Quorum not met for governance entry at sequenceNumber ${entry.sequenceNumber}`,
          });
        }

        // Apply actions to signer set (validates safety constraints)
        for (const action of parsed.actions) {
          try {
            signerSet.applyAction(action);
          } catch (e) {
            errors.push({
              sequenceNumber: entry.sequenceNumber,
              errorType: 'governance_safety_violation',
              message: `Governance action failed: ${e instanceof Error ? e.message : String(e)}`,
            });
          }
        }
      } catch (e) {
        // Only push if not already a LedgerValidationError we added
        if (
          !(e instanceof Error) ||
          !e.message.includes('Governance action failed')
        ) {
          errors.push({
            sequenceNumber: entry.sequenceNumber,
            errorType: 'invalid_governance_payload',
            message: `Failed to parse governance payload: ${e instanceof Error ? e.message : String(e)}`,
          });
        }
      }
    } else {
      // Regular entry: signer must be authorized to append
      if (!signerSet.canAppend(entry.signerPublicKey)) {
        errors.push({
          sequenceNumber: entry.sequenceNumber,
          errorType: 'unauthorized_signer',
          message: `Signer is not authorized to append at sequenceNumber ${entry.sequenceNumber}`,
        });
      }
    }
  }

  /**
   * Recompute the entryHash for the given entry and compare it to the
   * stored entryHash. Pushes an error if they don't match.
   */
  private verifyEntryHash(
    entry: ILedgerEntry,
    errors: ILedgerValidationError[],
  ): void {
    const recomputed = this.serializer.computeEntryHash(entry);
    if (!recomputed.equals(entry.entryHash)) {
      errors.push({
        sequenceNumber: entry.sequenceNumber,
        errorType: 'hash_mismatch',
        message: `Recomputed entryHash does not match stored entryHash at sequenceNumber ${entry.sequenceNumber}`,
      });
    }
  }

  /**
   * Verify the entry's signature against its signerPublicKey and entryHash.
   * Pushes an error if verification fails.
   */
  private verifySignature(
    entry: ILedgerEntry,
    errors: ILedgerValidationError[],
  ): void {
    const entryHashBytes = entry.entryHash.toUint8Array();
    const isValid = this.signatureVerifier.verify(
      entry.signerPublicKey,
      entryHashBytes,
      entry.signature,
    );
    if (!isValid) {
      errors.push({
        sequenceNumber: entry.sequenceNumber,
        errorType: 'signature_invalid',
        message: `Signature verification failed at sequenceNumber ${entry.sequenceNumber}`,
      });
    }
  }
}
