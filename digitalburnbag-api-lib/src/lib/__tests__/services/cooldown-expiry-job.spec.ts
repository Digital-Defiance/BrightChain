/**
 * Unit tests for the cool-down expiry background job.
 *
 * Feature: vault-deletion-certificate
 * Requirements: 11
 */
import type { ICooldownExpiryResult } from '@brightchain/digitalburnbag-lib';
import {
  createCooldownExpiryJob,
  type ICooldownExpiryJobDeps,
} from '../../scheduled/cooldown-expiry-job';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockDeps(
  result?: ICooldownExpiryResult,
): ICooldownExpiryJobDeps & { calls: number } {
  const mock = {
    calls: 0,
    executePendingDeletions: jest.fn(async () => {
      mock.calls++;
      return result ?? { vaultsDestroyed: 0, certificatesGenerated: 0, failures: 0 };
    }),
  };
  return mock;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createCooldownExpiryJob', () => {
  it('should have the correct job name', () => {
    const deps = createMockDeps();
    const job = createCooldownExpiryJob(deps, 3_600_000);

    expect(job.name).toBe('cooldown-expiry');
  });

  it('should have the correct interval', () => {
    const deps = createMockDeps();
    const intervalMs = 1_800_000; // 30 minutes
    const job = createCooldownExpiryJob(deps, intervalMs);

    expect(job.intervalMs).toBe(intervalMs);
  });

  it('should call executePendingDeletions when executed', async () => {
    const deps = createMockDeps();
    const job = createCooldownExpiryJob(deps, 3_600_000);

    await job.execute();

    expect(deps.executePendingDeletions).toHaveBeenCalledTimes(1);
  });

  it('should propagate errors from executePendingDeletions', async () => {
    const error = new Error('Database connection failed');
    const deps: ICooldownExpiryJobDeps = {
      executePendingDeletions: jest.fn(async () => {
        throw error;
      }),
    };
    const job = createCooldownExpiryJob(deps, 3_600_000);

    await expect(job.execute()).rejects.toThrow('Database connection failed');
  });

  it('should log metrics when vaults are destroyed', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const deps = createMockDeps({
      vaultsDestroyed: 3,
      certificatesGenerated: 2,
      failures: 1,
    });
    const job = createCooldownExpiryJob(deps, 3_600_000);

    await job.execute();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('vaultsDestroyed=3'),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('certificatesGenerated=2'),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('failures=1'),
    );

    consoleSpy.mockRestore();
  });

  it('should not log when no vaults are processed and no failures', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const deps = createMockDeps({
      vaultsDestroyed: 0,
      certificatesGenerated: 0,
      failures: 0,
    });
    const job = createCooldownExpiryJob(deps, 3_600_000);

    await job.execute();

    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
