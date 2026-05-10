/**
 * Pre-configured scheduled jobs for the Digital Burnbag platform.
 *
 * Each factory function accepts the relevant service dependency and returns
 * an IScheduledJob ready to be registered with the JobRunner.
 */
import type { IBurnbagSettlementJobDeps } from '../cron/burnbagSettlementCron';
import { createBurnbagSettlementJob } from '../cron/burnbagSettlementCron';
import type { IProviderCreditPipeline } from '../services/providerCreditPipeline';
import type { ICooldownExpiryJobDeps } from './cooldown-expiry-job';
import { createCooldownExpiryJob } from './cooldown-expiry-job';
import type { IScheduledJob } from './job-runner';

const ONE_MINUTE = 60_000;
const FIVE_MINUTES = 5 * ONE_MINUTE;
const FIFTEEN_MINUTES = 15 * ONE_MINUTE;

export interface IPlatformJobDeps {
  purgeExpiredSessions: () => Promise<void>;
  purgeExpiredTrash: () => Promise<void>;
  executeScheduledDestructions: () => Promise<void>;
  expireStaleRequests: () => Promise<void>;
  executePendingCascades?: () => Promise<void>;
  /** When present, a Joule storage-settlement job is registered. */
  burnbagSettlementJobDeps?: IBurnbagSettlementJobDeps;
  /**
   * When present, provider earnings are distributed after each successful
   * daily settlement via `ProviderCreditPipeline.awardProviderEarning`.
   * Requires `burnbagSettlementJobDeps` to be set.
   */
  providerCreditPipeline?: IProviderCreditPipeline;
  /**
   * When present, a cool-down expiry job is registered to process
   * public vault containers whose pending-deletion period has elapsed.
   */
  cooldownExpiryJobDeps?: ICooldownExpiryJobDeps & {
    /** Job interval in milliseconds. Default: 3600000 (1 hour). */
    intervalMs?: number;
  };
}

/**
 * Upload session expiration cleanup — runs every 5 minutes.
 */
export function createSessionCleanupJob(
  deps: Pick<IPlatformJobDeps, 'purgeExpiredSessions'>,
): IScheduledJob {
  return {
    name: 'upload-session-cleanup',
    intervalMs: FIVE_MINUTES,
    execute: () => deps.purgeExpiredSessions(),
  };
}

/**
 * Trash auto-purge — runs every 15 minutes.
 */
export function createTrashPurgeJob(
  deps: Pick<IPlatformJobDeps, 'purgeExpiredTrash'>,
): IScheduledJob {
  return {
    name: 'trash-auto-purge',
    intervalMs: FIFTEEN_MINUTES,
    execute: () => deps.purgeExpiredTrash(),
  };
}

/**
 * Scheduled destruction execution — runs every minute.
 */
export function createScheduledDestructionJob(
  deps: Pick<IPlatformJobDeps, 'executeScheduledDestructions'>,
): IScheduledJob {
  return {
    name: 'scheduled-destruction',
    intervalMs: ONE_MINUTE,
    execute: () => deps.executeScheduledDestructions(),
  };
}

/**
 * Approval request expiration — runs every 5 minutes.
 */
export function createApprovalExpirationJob(
  deps: Pick<IPlatformJobDeps, 'expireStaleRequests'>,
): IScheduledJob {
  return {
    name: 'approval-expiration',
    intervalMs: FIVE_MINUTES,
    execute: () => deps.expireStaleRequests(),
  };
}

/**
 * Cascading protocol delay execution — runs every minute.
 */
export function createCascadeExecutionJob(
  deps: Pick<IPlatformJobDeps, 'executePendingCascades'>,
): IScheduledJob | null {
  if (!deps.executePendingCascades) return null;
  return {
    name: 'cascade-execution',
    intervalMs: ONE_MINUTE,
    execute: () => deps.executePendingCascades!(),
  };
}

/**
 * Register all platform jobs with a JobRunner.
 */
export function registerAllPlatformJobs(
  runner: { start: (job: IScheduledJob) => void },
  deps: IPlatformJobDeps,
): void {
  runner.start(createSessionCleanupJob(deps));
  runner.start(createTrashPurgeJob(deps));
  runner.start(createScheduledDestructionJob(deps));
  runner.start(createApprovalExpirationJob(deps));

  const cascadeJob = createCascadeExecutionJob(deps);
  if (cascadeJob) {
    runner.start(cascadeJob);
  }

  if (deps.burnbagSettlementJobDeps) {
    const settlementDeps: IBurnbagSettlementJobDeps = {
      ...deps.burnbagSettlementJobDeps,
      ...(deps.providerCreditPipeline
        ? {
            awardProviderEarning: (contractId, amount, periodEndMs) =>
              deps.providerCreditPipeline!.awardProviderEarning(
                contractId,
                amount,
                periodEndMs,
              ),
          }
        : {}),
    };
    runner.start(createBurnbagSettlementJob(settlementDeps));
  }

  if (deps.cooldownExpiryJobDeps) {
    const ONE_HOUR = 3_600_000;
    const intervalMs = deps.cooldownExpiryJobDeps.intervalMs ?? ONE_HOUR;
    runner.start(createCooldownExpiryJob(deps.cooldownExpiryJobDeps, intervalMs));
  }
}
