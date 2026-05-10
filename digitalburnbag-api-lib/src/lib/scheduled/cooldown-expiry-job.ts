/**
 * Cool-down expiry background job — processes public vault containers
 * whose pending-deletion cool-down period has elapsed.
 *
 * Runs on a configurable interval (default: 1 hour). For each expired vault,
 * executes the destruction cascade and generates a Certificate of Destruction
 * if the vault was sealed and pristine.
 *
 * Individual vault failures do not halt processing of remaining vaults.
 */
import type { ICooldownExpiryResult } from '@brightchain/digitalburnbag-lib';
import type { IScheduledJob } from './job-runner';

export interface ICooldownExpiryJobDeps {
  executePendingDeletions: () => Promise<ICooldownExpiryResult>;
}

/**
 * Factory function that creates the cool-down expiry scheduled job.
 *
 * @param deps - Service dependencies (executePendingDeletions from DeletionService)
 * @param intervalMs - How often the job runs in milliseconds
 * @returns An IScheduledJob ready to be registered with the JobRunner
 */
export function createCooldownExpiryJob(
  deps: ICooldownExpiryJobDeps,
  intervalMs: number,
): IScheduledJob {
  return {
    name: 'cooldown-expiry',
    intervalMs,
    execute: async () => {
      const result = await deps.executePendingDeletions();
      // Emit metrics: result.vaultsDestroyed, result.certificatesGenerated, result.failures
      if (result.vaultsDestroyed > 0 || result.failures > 0) {
        console.log(
          `[cooldown-expiry] vaultsDestroyed=${result.vaultsDestroyed}, ` +
            `certificatesGenerated=${result.certificatesGenerated}, ` +
            `failures=${result.failures}`,
        );
      }
    },
  };
}
