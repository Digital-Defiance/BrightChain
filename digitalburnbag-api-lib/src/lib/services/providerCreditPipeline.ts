/**
 * @fileoverview ProviderCreditPipeline — distributes the provider share of each
 * settled daily fee to the hosting provider nodes.
 *
 * ## Revenue split
 *
 * When a storage contract is settled, `dailyDue` µJ is debited from the owner.
 * This pipeline computes the provider's share of that fee:
 *
 *   `earns = floor(dailyDue × providerShareFraction / 100n)`
 *
 * …and credits it evenly across `contract.providerNodeIds`, with any integer
 * remainder (dust) credited to the first node.
 *
 * ## Conservation guarantee
 *
 * `sum of all per-node grants === earns` (exact).  The pipeline asserts this
 * internally and throws `ProviderCreditConservationError` if violated.
 *
 * Requirements: 5.1–5.5
 */
import type { IBurnbagStorageContractRepository } from '@brightchain/digitalburnbag-lib';

// ---------------------------------------------------------------------------
// Duck-typed grant issuer
// ---------------------------------------------------------------------------

/**
 * Minimal interface for issuing Joule grants to provider nodes.
 *
 * Production code wires this to `JouleEarnService.grant()`; tests supply a
 * lightweight stub.
 *
 * @param nodeId            String identifier for the recipient node.
 * @param amountMicroJoules Amount to credit in µJ.
 * @param reason            Ledger-stored reason string.
 */
export interface IJouleGrantIssuer {
  grant(
    nodeId: string,
    amountMicroJoules: bigint,
    reason: string,
  ): Promise<void>;
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface IProviderCreditPipeline {
  /**
   * Award the provider share of `dailyDue` µJ to the nodes hosting
   * the contract identified by `contractId`.
   *
   * @param contractId   Contract identifier (used for ledger reason tagging).
   * @param dailyDue     Settled µJ amount for the period.
   * @param periodEndMs  Unix epoch ms of the settlement period end.
   */
  awardProviderEarning(
    contractId: string,
    dailyDue: bigint,
    periodEndMs: number,
  ): Promise<void>;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * Thrown when the sum of all per-node grants does not equal the computed
 * provider earnings — indicating a programming bug in the distribution logic.
 */
export class ProviderCreditConservationError extends Error {
  constructor(
    public readonly contractId: string,
    public readonly earns: bigint,
    public readonly totalGranted: bigint,
  ) {
    super(
      `ProviderCreditConservationError: contractId=${contractId} earns=${earns} totalGranted=${totalGranted}`,
    );
    this.name = 'ProviderCreditConservationError';
  }
}

// ---------------------------------------------------------------------------
// Deps
// ---------------------------------------------------------------------------

export interface IProviderCreditPipelineDeps {
  /** Contract repository — used to look up providerNodeIds. */
  repository: IBurnbagStorageContractRepository;
  /** Grant issuer for crediting nodes (wraps JouleEarnService in production). */
  grantIssuer: IJouleGrantIssuer;
  /**
   * Provider share fraction as an integer percentage [0, 100].
   * Typically read from `IBurnbagJouleConfig.providerShareFraction`.
   */
  providerShareFraction: number;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Concrete implementation of `IProviderCreditPipeline`.
 *
 * @example
 * ```ts
 * const pipeline = new ProviderCreditPipeline({
 *   repository,
 *   grantIssuer: jouleEarnAdapter,
 *   providerShareFraction: config.providerShareFraction,
 * });
 * ```
 */
export class ProviderCreditPipeline implements IProviderCreditPipeline {
  constructor(private readonly deps: IProviderCreditPipelineDeps) {}

  async awardProviderEarning(
    contractId: string,
    dailyDue: bigint,
    periodEndMs: number,
  ): Promise<void> {
    if (dailyDue <= 0n) return;

    const contract = await this.deps.repository.findByContractId(contractId);
    if (!contract || contract.providerNodeIds.length === 0) {
      // Nothing to distribute — no provider nodes registered.
      return;
    }

    const nodeIds = contract.providerNodeIds;
    const sharePercent = BigInt(this.deps.providerShareFraction);

    // Step 2: earns = floor(dailyDue × providerShareFraction / 100n)
    const earns = (dailyDue * sharePercent) / 100n;
    if (earns === 0n) return;

    // Step 3: perNode = floor(earns / nodeCount)
    const nodeCount = BigInt(nodeIds.length);
    const perNode = earns / nodeCount;

    // Step 4: remainder goes to first node (dust)
    const remainder = earns - perNode * nodeCount;

    // Step 5: issue grants
    const reason = `storage-pop:${contractId}:${periodEndMs}`;
    let totalGranted = 0n;

    for (let i = 0; i < nodeIds.length; i++) {
      const amount = i === 0 ? perNode + remainder : perNode;
      if (amount === 0n) continue;
      await this.deps.grantIssuer.grant(nodeIds[i], amount, reason);
      totalGranted += amount;
    }

    // Step 6: conservation assertion — sum of grants must equal earns exactly.
    if (totalGranted !== earns) {
      throw new ProviderCreditConservationError(
        contractId,
        earns,
        totalGranted,
      );
    }
  }
}
