/**
 * Unit tests for FailurePolicyManager.
 *
 * Feature: canary-provider-system
 * Requirements: 4.1, 4.5, 4.6
 */
import type { IProviderConnectionExtended } from '@brightchain/digitalburnbag-lib';
import {
  DEFAULT_FAILURE_THRESHOLD,
  FailurePolicyManager,
  PolicyNotificationCallback,
} from '../../services/failure-policy-manager';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConnection(
  overrides?: Partial<IProviderConnectionExtended<string>>,
): IProviderConnectionExtended<string> {
  return {
    id: 'conn-1',
    userId: 'user-1',
    providerId: 'provider-1',
    status: 'connected',
    isEnabled: true,
    consecutiveFailures: 0,
    failurePolicyConfig: {
      failureThreshold: DEFAULT_FAILURE_THRESHOLD,
      failurePolicy: 'pause_and_notify',
    },
    isPaused: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FailurePolicyManager', () => {
  // Req 4.1: Default threshold is 5
  describe('default threshold (Req 4.1)', () => {
    it('should have a default failure threshold of 5', () => {
      expect(DEFAULT_FAILURE_THRESHOLD).toBe(5);
    });

    it('should not escalate at 4 failures with default threshold', async () => {
      const manager = new FailurePolicyManager();
      const conn = makeConnection();
      const result = await manager.evaluateFailure(conn, 4);
      expect(result.shouldEscalate).toBe(false);
    });

    it('should escalate at 5 failures with default threshold', async () => {
      const manager = new FailurePolicyManager();
      const conn = makeConnection();
      const result = await manager.evaluateFailure(conn, 5);
      expect(result.shouldEscalate).toBe(true);
      expect(result.action).toBe('pause_and_notify');
    });
  });

  // Req 4.5: pause_and_notify sets isPaused=true and pauseReason
  describe('pause_and_notify policy (Req 4.5)', () => {
    it('should set isPaused=true and record pauseReason', async () => {
      const notifications: Array<{ id: string; msg: string }> = [];
      const notify: PolicyNotificationCallback = (id, msg) => {
        notifications.push({ id, msg });
      };

      const manager = new FailurePolicyManager(notify);
      const conn = makeConnection({
        failurePolicyConfig: {
          failureThreshold: 3,
          failurePolicy: 'pause_and_notify',
        },
      });

      await manager.executePolicy(conn, 'pause_and_notify');

      expect(conn.isPaused).toBe(true);
      expect(conn.pauseReason).toBeDefined();
      expect(conn.pauseReason).toContain('Failure policy');
      expect(notifications).toHaveLength(1);
      expect(notifications[0].msg).toContain('paused');
    });
  });

  // Req 4.6: trigger_protocol evaluates bindings as ABSENCE
  describe('trigger_protocol policy (Req 4.6)', () => {
    it('should notify with treatAs=absence when trigger_protocol is executed', async () => {
      const notifications: Array<{
        id: string;
        msg: string;
        details?: Record<string, unknown>;
      }> = [];
      const notify: PolicyNotificationCallback = (id, msg, details) => {
        notifications.push({ id, msg, details });
      };

      const manager = new FailurePolicyManager(notify);
      const conn = makeConnection({
        failurePolicyConfig: {
          failureThreshold: 5,
          failurePolicy: 'trigger_protocol',
        },
      });

      await manager.executePolicy(conn, 'trigger_protocol');

      expect(notifications).toHaveLength(1);
      expect(notifications[0].msg).toContain('ABSENCE');
      expect(notifications[0].details?.treatAs).toBe('absence');
    });
  });

  // notify_only continues checks and sends notification
  describe('notify_only policy', () => {
    it('should send notification without pausing', async () => {
      const notifications: Array<{ id: string; msg: string }> = [];
      const notify: PolicyNotificationCallback = (id, msg) => {
        notifications.push({ id, msg });
      };

      const manager = new FailurePolicyManager(notify);
      const conn = makeConnection();

      await manager.executePolicy(conn, 'notify_only');

      expect(conn.isPaused).toBe(false);
      expect(notifications).toHaveLength(1);
    });
  });

  // ignore logs only
  describe('ignore policy', () => {
    it('should not pause or notify', async () => {
      const notifications: Array<{ id: string; msg: string }> = [];
      const notify: PolicyNotificationCallback = (id, msg) => {
        notifications.push({ id, msg });
      };

      const manager = new FailurePolicyManager(notify);
      const conn = makeConnection();

      await manager.executePolicy(conn, 'ignore');

      expect(conn.isPaused).toBe(false);
      expect(notifications).toHaveLength(0);
    });
  });
});
