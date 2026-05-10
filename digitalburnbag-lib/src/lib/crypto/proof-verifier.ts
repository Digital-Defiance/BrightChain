import type {
  ECIESService,
  SignatureUint8Array,
} from '@digitaldefiance/ecies-lib';
import type {
  IDestructionProof,
  IProofVerificationResult,
  IVerificationBundle,
  IVerificationOptions,
} from '../interfaces';
import { AccessSeal } from './access-seal';
import { MerkleCommitmentTree } from './merkle-commitment-tree';

const DEFAULT_TOLERANCE_SECONDS = 300;

/**
 * Verifies destruction proofs: signature + Merkle root + timestamp + seal status.
 *
 * Validates: Requirements 6.1–6.6, 19.1, 19.4
 */
export class ProofVerifier {
  constructor(private readonly eciesService: ECIESService) {}

  verify(
    proof: IDestructionProof,
    bundle: IVerificationBundle,
    options?: IVerificationOptions,
  ): IProofVerificationResult {
    const tolerance =
      (options?.timestampToleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS) * 1000;

    // 1. Reconstruct message: treeSeed || nonce || bigEndian64(timestamp)
    const message = new Uint8Array(32 + 32 + 8);
    message.set(proof.treeSeed, 0);
    message.set(proof.nonce, 32);
    const tsView = new DataView(message.buffer, 64, 8);
    tsView.setUint32(0, Math.floor(proof.timestamp / 0x100000000), false);
    tsView.setUint32(4, proof.timestamp >>> 0, false);

    // 2. Verify signature
    let signatureValid = false;
    try {
      signatureValid = this.eciesService.verifyMessage(
        bundle.creatorPublicKey,
        message,
        proof.signature as SignatureUint8Array,
      );
    } catch {
      signatureValid = false;
    }

    // 3. Verify Merkle tree
    const treeResult = MerkleCommitmentTree.verify(
      proof.treeSeed,
      bundle.merkleRoot,
      bundle.treeDepth,
    );
    const chainValid = treeResult.valid;

    // 4. Validate timestamp: proof.timestamp <= now + tolerance
    const now = Date.now();
    const timestampValid = proof.timestamp <= now + tolerance;

    // 5. Check seal status
    let sealStatus: 'pristine' | 'accessed' | 'unknown' = 'unknown';
    if (AccessSeal.verifyPristine(proof.treeSeed, bundle.accessSeal)) {
      sealStatus = 'pristine';
    } else if (AccessSeal.verifyAccessed(proof.treeSeed, bundle.accessSeal)) {
      sealStatus = 'accessed';
    }

    // 6. Composite result
    const valid = signatureValid && chainValid && timestampValid;
    const errors: string[] = [];
    if (!signatureValid) errors.push('invalid signature');
    if (!chainValid) errors.push(treeResult.error ?? 'Merkle root mismatch');
    if (!timestampValid) errors.push('timestamp in the future');

    return {
      valid,
      signatureValid,
      chainValid,
      timestampValid,
      sealStatus,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  }
}
