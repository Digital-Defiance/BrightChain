/**
 * @fileoverview BurnbagSettlementCron — daily Joule settlement for storage contracts.
 *
 * For each active contract not settled within the configured interval:
 *   1. Compute `due = min(dailyMicroJoules, remainingCreditMicroJoules)`
 *   2. Debit owner's L1 account by `due` (non-optional; suspend on failure)
 *   3. Reduce `remainingCreditMicroJoules` and update `lastSettledAt`
 *   4. Expire contracts with zero credit and `autoRenew=false`
 *   5. Optionally award provider earnings (wired in task 4.2)
 *
 * Configured via `BURNBAG_SETTLEMENT_INTERVAL_MS` (default: 86 400 000 ms).
 *
 * Requirements: 3.3
 */
import {
  AssetAccountStore,
  Checksum,
  InsufficientAvailableBalanceError,
  JOULE_ASSET_ID,
} from '@brightchain/brightchain-lib';
import type { IBurnbagStorageContractRepository } from '@brightchain/digitalburnbag-lib';
import { isBurnbagJouleEnabled } from '../config/burnbagConfig';
import type { IScheduledJob } from '../scheduled/job-runner';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_SETTLEMENT_INTERVAL_MS = 86_400_000; // 24 hours
/** Short TTL for the reserve → settle round-trip during settlement. */
const SETTLE_TTL_MS = 30_000; // 30 seconds

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IBurnbagSettlementResult {
  settled: number;
  expired: number;
  suspended: number;
}

export interface IBurnbagSettlementJobDeps {
  /** Repository for reading/updating storage contracts. */
  repository: IBurnbagStorageContractRepository;
  /** In-memory L1 Joule account store. */
  assetAccountStore: AssetAccountStore;
  /**
   * Converts a `ownerId` string (as stored in the contract) into the
   * `Checksum` type required by `AssetAccountStore`.
   */
  resolveChecksum: (ownerId: string) => Checksum;
  /**
   * Optional: called after each successful daily settlement.
   * Receives the contractId and the settled amount in µJ.
   * Wired to `ProviderCreditPipeline.awardProviderEarning` in task 4.2.
   */
  awardProviderEarning?: (
    contractId: string,
    amountMicroJoules: bigint,
    periodEndMs: number,
  ) => Promise<void>;
  /**
   * Optional: emit a resource_event for storage metering.
   * Params: type, fileId, bytes, amountMicroJoules
   */
  onResourceEvent?: (
    eventType: 'storage',
    fileId: string,
    bytes: bigint,
    amountMicroJoules: bigint,
  ) => Promise<void>;
  /**
   * Override the settlement interval in milliseconds.
   * Defaults to `BURNBAG_SETTLEMENT_INTERVAL_MS` env var or 86 400 000.
   */
  intervalMs?: number;
  /**
   * Optional: revenue share fractions (integer percentages summing to 100).
   * When provided, a conservation assertion is run after each settlement:
   * `providerShare + ownerShare + networkShare + protocolShare === due ± 1n`.
   * Violations are logged at ERROR level and the contract is skipped.
   *
   * Requirement: 5.6
   */
  shareConfig?: {
    providerShareFraction: number;
    ownerShareFraction: number;
    networkShareFraction: number;
    protocolShareFraction: number;
  };
}

// ---------------------------------------------------------------------------
// Settlement logic
// ---------------------------------------------------------------------------

/**
 * Execute one settlement pass.
 *
 * Exported separately so it can be unit-tested without a full job wrapper.
 */
export async function runSettlement(
  deps: IBurnbagSettlementJobDeps,
): Promise<IBurnbagSettlementResult> {
  if (!isBurnbagJouleEnabled()) {
    return { settled: 0, expired: 0, suspended: 0 };
  }

  const intervalMs =
    deps.intervalMs ??
    Number(
      process.env['BURNBAG_SETTLEMENT_INTERVAL_MS'] ??
        DEFAULT_SETTLEMENT_INTERVAL_MS,
    );

  const cutoff = new Date(Date.now() - intervalMs);
  const contracts = await deps.repository.findDueForSettlement(cutoff);

  let settled = 0;
  let expired = 0;
  let suspended = 0;
  const now = new Date();

  for (const contract of contracts) {
    const due =
      contract.dailyMicroJoules < contract.remainingCreditMicroJoules
        ? contract.dailyMicroJoules
        : contract.remainingCreditMicroJoules;

    if (due <= 0n) {
      // Nothing to charge — just update the timestamp to avoid re-queuing.
      await deps.repository.updateContract(contract.contractId, {
        lastSettledAt: now,
      });
      settled++;
      continue;
    }

    // Attempt to debit the owner's L1 account.
    let debitSucceeded = false;
    try {
      const ownerChecksum = deps.resolveChecksum(contract.ownerId);
      const handle = deps.assetAccountStore.reserve(
        ownerChecksum,
        JOULE_ASSET_ID,
        due,
        SETTLE_TTL_MS,
      );
      deps.assetAccountStore.settle(handle, due);
      debitSucceeded = true;
    } catch (err) {
      if (err instanceof InsufficientAvailableBalanceError) {
        // Owner lacks funds → suspend the contract.
        await deps.repository.updateContract(contract.contractId, {
          status: 'suspended',
        });
        suspended++;
        continue;
      }
      throw err;
    }

    if (!debitSucceeded) continue;

    const newRemaining = contract.remainingCreditMicroJoules - due;
    const isExhausted = newRemaining === 0n && !contract.autoRenew;

    await deps.repository.updateContract(contract.contractId, {
      remainingCreditMicroJoules: newRemaining,
      lastSettledAt: now,
      ...(isExhausted ? { status: 'expired' as const } : {}),
    });

    settled++;
    if (isExhausted) expired++;

    // Fire optional side-effects (non-throwing).
    const periodEndMs = now.getTime();

    // Task 4.3: revenue share conservation assertion.
    if (deps.shareConfig) {
      const sc = deps.shareConfig;
      const providerShare = (due * BigInt(sc.providerShareFraction)) / 100n;
      const ownerShare = (due * BigInt(sc.ownerShareFraction)) / 100n;
      const networkShare = (due * BigInt(sc.networkShareFraction)) / 100n;
      const protocolShare = (due * BigInt(sc.protocolShareFraction)) / 100n;
      const totalShares =
        providerShare + ownerShare + networkShare + protocolShare;
      const diff = totalShares > due ? totalShares - due : due - totalShares;
      if (diff > 1n) {
        console.error(
          `[burnbagSettlement] CONSERVATION_VIOLATION contractId=${contract.contractId}` +
            ` due=${due} totalShares=${totalShares} diff=${diff}`,
        );
        continue;
      }
    }

    if (deps.onResourceEvent) {
      await deps.onResourceEvent(
        'storage',
        contract.fileId,
        contract.bytes,
        due,
      );
    }
    if (deps.awardProviderEarning) {
      await deps.awardProviderEarning(contract.contractId, due, periodEndMs);
    }
  }

  return { settled, expired, suspended };
}

// ---------------------------------------------------------------------------
// IScheduledJob factory
// ---------------------------------------------------------------------------

/**
 * Build an `IScheduledJob` that runs the settlement cron on the configured
 * interval. Register it with `JobRunner.start()` at application startup.
 *
 * @example
 * ```ts
 * runner.start(createBurnbagSettlementJob({ repository, assetAccountStore, resolveChecksum }));
 * ```
 */
export function createBurnbagSettlementJob(
  deps: IBurnbagSettlementJobDeps,
): IScheduledJob {
  const intervalMs =
    deps.intervalMs ??
    Number(
      process.env['BURNBAG_SETTLEMENT_INTERVAL_MS'] ??
        DEFAULT_SETTLEMENT_INTERVAL_MS,
    );

  return {
    name: 'burnbag-storage-settlement',
    intervalMs,
    execute: () => runSettlement(deps).then(() => undefined),
  };
}
